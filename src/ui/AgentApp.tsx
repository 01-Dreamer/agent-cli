import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useApp, useInput, useStdin } from 'ink';
import OpenAI from 'openai';
import { openai } from '../api/openai';
import { SkillDefinition } from '../skills/skillLoader';
import { MarkdownDisplay } from './MarkdownDisplay';
import stringWidth from 'string-width';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync, statSync } from 'fs';

const execAsync = promisify(exec);

type ToolImplementation = (args: any) => Promise<string> | string;

interface AgentAppProps {
    model: string;
    systemPrompt: string;
    skills: SkillDefinition[];
    toolNames: string[];
    definitions: OpenAI.Chat.ChatCompletionTool[];
    implementations: Record<string, ToolImplementation>;
}

type LogEntry =
    | { type: 'user'; text: string }
    | { type: 'assistant'; text: string }
    | { type: 'tool'; name: string; args: string; result?: string; isError?: boolean }
    | { type: 'system'; text: string; tone?: 'normal' | 'success' | 'warning' | 'error'; hidePrefix?: boolean };

const MAX_STEPS = 30;
// MAX_VISIBLE_LOGS 决定了屏幕上（Ink框架的UI上）最大能够同时渲染/记忆的历史日志条数。
// 当日志超过这个数量时，最旧的日志会被移出屏幕（不在界面上显示），以防止终端占用过大内存卡顿。
const MAX_VISIBLE_LOGS = 80;

function truncate(value: string, maxLength: number): string {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function compact(value: string, maxLength = 220): string {
    return truncate(value.replace(/\s+/g, ' ').trim(), maxLength);
}

function formatLocation(location: string): string {
    const cwd = process.cwd();
    return location.startsWith(cwd) ? `.${location.slice(cwd.length)}` : location;
}

function renderHelp(): string {
    return [
        '/help   show this command list',
        '/skills list discovered Agent skills',
        '/tools  list tools exposed to the model',
        '/clear  clear the screen',
        '/cd     change current working directory (e.g., /cd ../some-folder)',
        '/pwd    show current working directory',
        '/exit   close the session',
    ].join('\n');
}

function renderSkills(skills: SkillDefinition[]): string {
    if (skills.length === 0) return 'No skills discovered.';

    return skills
        .map((skill, index) => `[${index + 1}] ${skill.name} - ${skill.description}\n    ${formatLocation(skill.location)}`)
        .join('\n');
}

function renderTools(toolNames: string[]): string {
    return toolNames
        .map((name, index) => `[${index + 1}] ${name}`)
        .join('\n');
}

function normalizeAssistantContent(content: OpenAI.Chat.ChatCompletionMessage['content']): string {
    if (typeof content === 'string') return content;
    if (!content) return '';

    return JSON.stringify(content);
}

function tryParseToolArguments(rawArguments: string): unknown {
    try {
        return JSON.parse(rawArguments || '{}');
    } catch {
        return {};
    }
}

function stringToChars(value: string): string[] {
    return Array.from(value);
}

function sliceChars(value: string, start: number, end?: number): string {
    return stringToChars(value).slice(start, end).join('');
}

function clampCursor(cursor: number, value: string): number {
    return Math.max(0, Math.min(cursor, stringToChars(value).length));
}

function insertAtCursor(value: string, cursor: number, insertValue: string): { text: string; cursor: number } {
    const chars = stringToChars(value);
    const safeCursor = Math.max(0, Math.min(cursor, chars.length));
    const insertChars = stringToChars(insertValue);
    return {
        text: [...chars.slice(0, safeCursor), ...insertChars, ...chars.slice(safeCursor)].join(''),
        cursor: safeCursor + insertChars.length,
    };
}

function deleteBeforeCursor(value: string, cursor: number): { text: string; cursor: number } {
    const chars = stringToChars(value);
    const safeCursor = Math.max(0, Math.min(cursor, chars.length));
    if (safeCursor === 0) return { text: value, cursor: safeCursor };

    return {
        text: [...chars.slice(0, safeCursor - 1), ...chars.slice(safeCursor)].join(''),
        cursor: safeCursor - 1,
    };
}

function deleteAtCursor(value: string, cursor: number): { text: string; cursor: number } {
    const chars = stringToChars(value);
    const safeCursor = Math.max(0, Math.min(cursor, chars.length));
    if (safeCursor >= chars.length) return { text: value, cursor: safeCursor };

    return {
        text: [...chars.slice(0, safeCursor), ...chars.slice(safeCursor + 1)].join(''),
        cursor: safeCursor,
    };
}

function estimateTokensFromMessages(messages: unknown[]): number {
    const text = messages
        .map((message) => {
            if (typeof message === 'string') return message;
            try {
                return JSON.stringify(message);
            } catch {
                return '';
            }
        })
        .join(' ');

    // Conservative heuristic if the API doesn't return usage. This avoids
    // underreporting for CJK text and code-heavy messages.
    return Math.ceil(text.length / 2.5);
}

function formatTokenCount(tokens: number): string {
    if (tokens > 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens > 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return `${tokens}`;
}

export function AgentApp({
    model,
    systemPrompt,
    skills,
    toolNames,
    definitions,
    implementations,
}: AgentAppProps) {
    const { exit } = useApp();
    const { isRawModeSupported } = useStdin();
    const [terminalWidth, setTerminalWidth] = useState(process.stdout.columns || 80);
    const [input, setInput] = useState('');
    const [inputCursor, setInputCursor] = useState(0);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [queue, setQueue] = useState<string[]>([]);
    const [currentTask, setCurrentTask] = useState<string | null>(null);
    const [usageTokens, setUsageTokens] = useState(0);
    const [busy, setBusy] = useState(false);
    const [activity, setActivity] = useState('ready');
    const [currentCwd, setCurrentCwd] = useState(process.cwd());
    const [inputMode, setInputMode] = useState<'chat' | 'command'>('chat');

    const messagesRef = useRef<OpenAI.Chat.ChatCompletionMessageParam[]>([
        { role: 'system', content: systemPrompt },
    ]);
    const processingRef = useRef(false);

    useEffect(() => {
        const handleResize = () => setTerminalWidth(process.stdout.columns || 80);
        process.stdout.on('resize', handleResize);
        return () => {
            process.stdout.off('resize', handleResize);
        };
    }, []);

    const coreToolCount = useMemo(
        () => toolNames.filter((name) => name !== 'activate_skill').length,
        [toolNames],
    );

    const addLog = useCallback((entry: LogEntry) => {
        setLogs((current) => [...current, entry].slice(-MAX_VISIBLE_LOGS));
    }, []);

    const handleCommand = useCallback((value: string): boolean => {
        const trimmed = value.trim();
        const normalized = trimmed.toLowerCase();

        if (normalized === '/exit' || normalized === '/quit') {
            addLog({ type: 'system', text: 'Agent CLI session closed.', tone: 'success' });
            exit();
            return true;
        }

        if (normalized === '/help') {
            addLog({ type: 'system', text: renderHelp() });
            return true;
        }

        if (normalized === '/skills') {
            addLog({ type: 'system', text: renderSkills(skills) });
            return true;
        }

        if (normalized === '/tools') {
            addLog({ type: 'system', text: renderTools(toolNames) });
            return true;
        }

        if (normalized === '/clear') {
            setLogs([]);
            return true;
        }

        if (normalized === '/pwd') {
            addLog({ type: 'system', text: `Current directory: ${process.cwd()}`, tone: 'normal' });
            return true;
        }

        if (normalized.startsWith('/cd')) {
            const parts = trimmed.split(/\s+/);
            if (parts.length < 2) {
                addLog({ type: 'system', text: `Usage: /cd <path>\nCurrent directory: ${process.cwd()}`, tone: 'warning' });
                return true;
            }
            
            const targetPath = parts.slice(1).join(' ');
            try {
                process.chdir(targetPath);
                setCurrentCwd(process.cwd());
                addLog({ type: 'system', text: `Changed directory to: ${process.cwd()}`, tone: 'success' });
                
                // You may want to update the system prompt context internally in the future
                // or just let tools resolve process.cwd() dynamically as we have refactored them to do.
            } catch (err: any) {
                addLog({ type: 'system', text: `cd failed: ${err.message}`, tone: 'error' });
            }
            return true;
        }

        return false;
    }, [addLog, exit, skills, toolNames]);

    const handleLocalCommand = useCallback(async (cmd: string) => {
        if (!cmd.trim()) return;
        addLog({ type: 'system', text: `! ${cmd}`, tone: 'warning', hidePrefix: true });
        setBusy(true);

        if (cmd.trim().startsWith('cd ')) {
            const targetPath = cmd.trim().substring(3).trim();
            try {
                process.chdir(path.resolve(currentCwd, targetPath));
                setCurrentCwd(process.cwd());
            } catch (err: any) {
                addLog({ type: 'system', text: `cd failed: ${err.message}`, tone: 'error', hidePrefix: true });
            }
            setBusy(false);
            return;
        }

        try {
            const { stdout, stderr } = await execAsync(cmd, { cwd: currentCwd, shell: '/bin/bash' });
            if (stdout) addLog({ type: 'system', text: stdout.trimEnd(), tone: 'normal', hidePrefix: true });
            if (stderr) addLog({ type: 'system', text: stderr.trimEnd(), tone: 'warning', hidePrefix: true });
            if (!stdout && !stderr) addLog({ type: 'system', text: 'Command executed successfully.', tone: 'success', hidePrefix: true });
        } catch (error: any) {
            addLog({ type: 'system', text: `Error: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`.trimEnd(), tone: 'error', hidePrefix: true });
        } finally {
            setBusy(false);
        }
    }, [addLog, currentCwd]);

    const submitInput = useCallback((value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return;

        if (handleCommand(trimmed)) return;

        setQueue((current) => [...current, trimmed]);
        if (busy || processingRef.current) {
            addLog({ type: 'system', text: `queued: ${trimmed}`, tone: 'warning' });
        }
    }, [addLog, busy, handleCommand]);

    useInput((value, key) => {
        if (key.ctrl && value === 'c') {
            exit();
            return;
        }

        if (key.escape) {
            if (inputMode === 'command') {
                setInputMode('chat');
                return;
            }
            return;
        }

        if (inputMode === 'chat' && input === '' && (value === '!' || value === '！')) {
            setInputMode('command');
            setInputCursor(0);
            return;
        }

        if (key.return || value === '\r' || value === '\n') {
            if (inputMode === 'command') {
                handleLocalCommand(input);
                setInput('');
                setInputCursor(0);
                return;
            }
            submitInput(input);
            setInput('');
            setInputCursor(0);
            return;
        }

        if (value.includes('\r') || value.includes('\n')) {
            const normalizedValue = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const parts = normalizedValue.split('\n');
            const insertedFirstLine = insertAtCursor(input, inputCursor, parts[0]);
            const firstSubmission = insertedFirstLine.text;
            
            if (inputMode === 'command') {
                handleLocalCommand(firstSubmission);
                for (const queuedSubmission of parts.slice(1, -1)) {
                    handleLocalCommand(queuedSubmission);
                }
            } else {
                submitInput(firstSubmission);
                for (const queuedSubmission of parts.slice(1, -1)) {
                    submitInput(queuedSubmission);
                }
            }

            const nextInput = parts.at(-1) ?? '';
            setInput(nextInput);
            setInputCursor(stringToChars(nextInput).length);
            return;
        }

        if (key.backspace || (key.delete && !key.meta)) {
            const next = deleteBeforeCursor(input, inputCursor);
            setInput(next.text);
            setInputCursor(next.cursor);
            return;
        }

        if (key.delete && key.meta) {
            const next = deleteAtCursor(input, inputCursor);
            setInput(next.text);
            setInputCursor(next.cursor);
            return;
        }

        if (key.tab) {
            // 如果处于输入路径状态下，尝试使用简单的 Tab 补全目录
            if (input.startsWith('/cd ') || inputMode === 'command') {
                const inputBeforeCursor = sliceChars(input, 0, inputCursor);
                const parts = inputBeforeCursor.split(' ');
                const lastParam = parts[parts.length - 1];

                try {
                    let searchDir = currentCwd;
                    let filePrefix = lastParam;

                    if (lastParam.startsWith('/')) {
                        searchDir = path.dirname(lastParam) || '/';
                        filePrefix = path.basename(lastParam);
                    } else if (lastParam.includes('/')) {
                        searchDir = path.resolve(currentCwd, path.dirname(lastParam));
                        filePrefix = path.basename(lastParam);
                    } else if (lastParam === '.' || lastParam === '..') {
                        return;
                    }

                    // Shell 模式下补全如果没有前缀就是空串寻找整个目录
                    filePrefix = filePrefix || '';

                    if (!existsSync(searchDir)) return;

                    const files = require('fs').readdirSync(searchDir);
                    const matches = files.filter((f: string) => f.startsWith(filePrefix));
                    
                    if (matches.length === 1) {
                        const match = matches[0];
                        const fullMatchPath = path.join(searchDir, match);
                        const isDir = statSync(fullMatchPath).isDirectory();
                        const suffix = isDir ? '/' : '';

                        const completedSuffix = match.slice(filePrefix.length) + suffix;
                        const next = insertAtCursor(input, inputCursor, completedSuffix);
                        setInput(next.text);
                        setInputCursor(next.cursor);
                    } else if (matches.length > 1) {
                        addLog({
                            type: 'system',
                            text: matches.map((m: string) => {
                                try {
                                    return statSync(path.join(searchDir, m)).isDirectory() ? `${m}/` : m;
                                } catch(e) {
                                    return m;
                                }
                            }).join('  '),
                            tone: 'normal',
                            hidePrefix: true
                        });
                    }
                } catch(e) {
                }
            }
            return;
        }

        if (key.leftArrow) {
            setInputCursor((current) => Math.max(0, current - 1));
            return;
        }

        if (key.rightArrow) {
            setInputCursor((current) => clampCursor(current + 1, input));
            return;
        }

        if (key.upArrow || key.downArrow || key.escape) {
            return;
        }

        if (value) {
            const next = insertAtCursor(input, inputCursor, value);
            setInput(next.text);
            setInputCursor(next.cursor);
        }
    }, { isActive: isRawModeSupported });

    const runTurn = useCallback(async (userInput: string) => {
        processingRef.current = true;
        setBusy(true);
        setActivity('thinking');

        addLog({ type: 'user', text: userInput });
        messagesRef.current.push({ role: 'user', content: userInput });

        let stepCount = 0;
        let isAgentFinished = false;

        try {
            while (!isAgentFinished && stepCount < MAX_STEPS) {
                stepCount++;
                setActivity('thinking');

                const requestMessages = [...messagesRef.current];
                const chatCompletion = await openai.chat.completions.create({
                    model: model,
                    messages: requestMessages,
                    tools: definitions.length > 0 ? definitions : undefined,
                    tool_choice: definitions.length > 0 ? 'auto' : undefined,
                });

                const responseMessage = chatCompletion.choices[0].message;

                if (!responseMessage) {
                    addLog({ type: 'system', text: 'Empty response from OpenAI.', tone: 'error' });
                    isAgentFinished = true;
                    break;
                }

                const tokenUsage = chatCompletion.usage?.total_tokens
                    ?? estimateTokensFromMessages([...requestMessages, responseMessage]);
                setUsageTokens((current) => current + tokenUsage);

                messagesRef.current.push(responseMessage);

                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    for (const toolCall of responseMessage.tool_calls) {
                        if (toolCall.type !== 'function') continue;

                        const functionName = toolCall.function.name;
                        const functionArgs = tryParseToolArguments(toolCall.function.arguments);
                        const argsText = JSON.stringify(functionArgs, null, 2);

                        setActivity(`running ${functionName}`);

                        let functionResponse = '';
                        let isError = false;
                        if (implementations[functionName]) {
                            try {
                                functionResponse = await implementations[functionName](functionArgs);
                            } catch (error: any) {
                                isError = true;
                                functionResponse = JSON.stringify({ error: error.message || 'Tool execution failed' });
                            }
                        } else {
                            isError = true;
                            functionResponse = JSON.stringify({ error: 'Tool not found' });
                        }

                        addLog({
                            type: 'tool',
                            name: functionName,
                            args: argsText,
                            result: functionResponse,
                            isError,
                        });

                        messagesRef.current.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: functionResponse,
                        });
                    }
                } else {
                    addLog({ type: 'assistant', text: normalizeAssistantContent(responseMessage.content) });
                    isAgentFinished = true;
                }
            }

            if (stepCount >= MAX_STEPS) {
                addLog({
                    type: 'system',
                    text: `agent reached max reasoning steps (${MAX_STEPS}).`,
                    tone: 'warning',
                });
            }
        } catch (error: any) {
            addLog({
                type: 'system',
                text: `OpenAI API call failed: ${error.message || error}`,
                tone: 'error',
            });
        } finally {
            processingRef.current = false;
            setBusy(false);
            setActivity('ready');
        }
    }, [addLog, definitions, implementations, model]);

    useEffect(() => {
        if (busy || processingRef.current || queue.length === 0) return;

        const [next, ...rest] = queue;
        setQueue(rest);
        setCurrentTask(next);
        void runTurn(next).then(() => {
            setCurrentTask((current) => current === next ? null : current);
        });
    }, [busy, queue, runTurn]);

    const roughTokenEstimate = useMemo(() => formatTokenCount(usageTokens), [usageTokens]);

    const rightStatusText = `context: ${roughTokenEstimate} tokens`;
    const inputChars = stringToChars(input);
    const safeInputCursor = clampCursor(inputCursor, input);
    const inputBeforeCursor = inputChars.slice(0, safeInputCursor).join('');
    const inputCursorChar = inputChars[safeInputCursor] ?? '';
    const inputAfterCursor = inputChars.slice(safeInputCursor + 1).join('');
    const cursorColor = inputMode === 'command' ? 'yellow' : 'green';
    
    return (
        <Box flexDirection="column">
            <Box flexDirection="column" marginBottom={1}>
                <Text color="cyan" bold>Agent CLI</Text>
                <Text>
                    <Text color="gray">model </Text>
                    <Text>{model}</Text>
                </Text>
                <Text>
                    <Text color="gray">cwd </Text>
                    <Text>{currentCwd}</Text>
                </Text>
                <Box marginTop={1}>
                    <Text color="green">
                        Welcome to Agent CLI! Type your question to start or enter <Text bold>/help</Text> to view available commands.
                    </Text>
                </Box>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                {logs.map((entry, index) => <LogLine key={index} entry={entry} terminalWidth={terminalWidth} />)}
            </Box>

            <Box flexDirection="column">
                {currentTask ? (
                    <Box marginBottom={0} width={terminalWidth}>
                        <Text color="cyan" wrap="truncate">
                            task: {currentTask}
                        </Text>
                    </Box>
                ) : null}
                <Box justifyContent="space-between">
                    <Text>
                        <Text color={busy ? 'yellow' : 'green'}>{busy ? 'working' : 'ready'}</Text>
                        {busy && <Text color="gray"> {activity}</Text>}
                        {queue.length > 0 && <Text color="yellow"> | queued: {queue.length}</Text>}
                    </Text>
                    <Text color="gray">{rightStatusText}</Text>
                </Box>
                <Text>
                    <Text color="gray">{'─'.repeat(terminalWidth)}</Text>
                </Text>
                <Text>
                    <Text color={inputMode === 'command' ? 'yellow' : 'green'} bold>
                        {inputMode === 'command' ? '! ' : '❯ '}
                    </Text>
                    <Text>{inputBeforeCursor}</Text>
                    {inputCursorChar ? (
                        <Text backgroundColor={cursorColor} color="black">{inputCursorChar}</Text>
                    ) : (
                        <Text color={cursorColor}>
                            {inputMode === 'command' ? '_' : '█'}
                        </Text>
                    )}
                    <Text>{inputAfterCursor}</Text>
                </Text>
                <Text>
                    <Text color="gray">{'─'.repeat(terminalWidth)}</Text>
                </Text>
            </Box>
        </Box>
    );
}

function LogLine({ entry, terminalWidth }: { entry: LogEntry, terminalWidth: number }) {
    if (entry.type === 'user') {
        const prefix = '❯ ';
        const textWithSpaces = ` ${entry.text} `;
        const visibleWidth = stringWidth(textWithSpaces);
        const paddingLength = Math.max(0, terminalWidth - stringWidth(prefix) - visibleWidth);
        const paddedText = textWithSpaces + ' '.repeat(paddingLength);
        
        return (
            <Box flexDirection="column" marginBottom={1}>
                <Text>
                    <Text color="green" bold>{prefix}</Text>
                    <Text backgroundColor="gray" color="white">{paddedText}</Text>
                </Text>
            </Box>
        );
    }
    if (entry.type === 'assistant') {
        return (
            <Box flexDirection="column" marginBottom={1}>
                <Text>
                    <Text color="magenta" bold>● </Text>
                    <Text color="magenta" bold>Agent</Text>
                </Text>
                <MarkdownDisplay text={entry.text} />
            </Box>
        );
    }
    if (entry.type === 'tool') {
        const isError = entry.isError === true;
        const tone = isError ? 'error' : 'normal';
        const status = isError ? '✖' : '✔';
        const color = isError ? 'red' : 'green';

        return (
            <Box flexDirection="column" marginBottom={1}>
                <Text>
                    <Text color={color} bold>{status} </Text>
                    <Text color="cyan" bold>{entry.name}</Text>
                </Text>
                <Text>
                    <Text color="gray">args: </Text>
                    <Text>{truncate(entry.args, 300)}</Text>
                </Text>
                {entry.result ? (
                    <Text>
                        <Text color="gray">result: </Text>
                        <Text>{truncate(entry.result, 500)}</Text>
                    </Text>
                ) : null}
            </Box>
        );
    }
    if (entry.type === 'system') {
        let color: 'green' | 'yellow' | 'red' = 'green';
        if (entry.tone === 'warning') color = 'yellow';
        if (entry.tone === 'error') color = 'red';

        const textColor = entry.tone === 'error'
            ? 'red'
            : entry.tone === 'warning'
                ? 'yellow'
                : entry.tone === 'success'
                    ? 'green'
                    : 'gray';
                    
        // 对于 'queued:' 开头的警告信息，不显示 Agent 头部，直接显示文本内容
        if (entry.text.startsWith('queued:') || entry.hidePrefix) {
            return (
                <Box flexDirection="column" marginBottom={1}>
                    <Text color={textColor}>{entry.text}</Text>
                </Box>
            );
        }

        return (
            <Box flexDirection="column" marginBottom={1}>
                <Text>
                    <Text color="cyan" bold>● </Text>
                    <Text color={textColor} bold>Agent</Text>
                </Text>
                <Text color={textColor}>{entry.text}</Text>
            </Box>
        );
    }

    return null;
}
