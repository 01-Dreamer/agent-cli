import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useApp, useInput, useStdin } from 'ink';
import OpenAI from 'openai';
import { openai } from '../api/openai';
import { SkillDefinition } from '../skills/skillLoader';
import { MarkdownDisplay } from './MarkdownDisplay';

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
    | { type: 'system'; text: string; tone?: 'normal' | 'success' | 'warning' | 'error' };

const MAX_STEPS = 10;
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
        'exit    close the session',
    ].join('\n');
}

function renderSkills(skills: SkillDefinition[]): string {
    if (skills.length === 0) return 'No skills discovered.';

    return skills
        .map((skill) => `${skill.name} - ${skill.description}\n  ${formatLocation(skill.location)}`)
        .join('\n');
}

function renderTools(toolNames: string[]): string {
    return toolNames
        .map((name) => `${name === 'activate_skill' ? 'skill' : 'tool'} ${name}`)
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
    const [input, setInput] = useState('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [queue, setQueue] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [activity, setActivity] = useState('ready');
    const [turnCount, setTurnCount] = useState(0);

    const messagesRef = useRef<OpenAI.Chat.ChatCompletionMessageParam[]>([
        { role: 'system', content: systemPrompt },
    ]);
    const processingRef = useRef(false);

    const coreToolCount = useMemo(
        () => toolNames.filter((name) => name !== 'activate_skill').length,
        [toolNames],
    );

    const addLog = useCallback((entry: LogEntry) => {
        setLogs((current) => [...current, entry].slice(-MAX_VISIBLE_LOGS));
    }, []);

    const handleCommand = useCallback((value: string): boolean => {
        const normalized = value.trim().toLowerCase();

        if (normalized === 'exit' || normalized === 'quit') {
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

        return false;
    }, [addLog, exit, skills, toolNames]);

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

        if (key.return || value === '\r' || value === '\n') {
            submitInput(input);
            setInput('');
            return;
        }

        if (value.includes('\r') || value.includes('\n')) {
            const normalizedValue = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const parts = normalizedValue.split('\n');
            const firstSubmission = `${input}${parts[0]}`;
            submitInput(firstSubmission);

            for (const queuedSubmission of parts.slice(1, -1)) {
                submitInput(queuedSubmission);
            }

            setInput(parts.at(-1) ?? '');
            return;
        }

        if (key.backspace || key.delete) {
            setInput((current) => current.slice(0, -1));
            return;
        }

        if (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow || key.tab || key.escape) {
            return;
        }

        if (value) {
            setInput((current) => `${current}${value}`);
        }
    }, { isActive: isRawModeSupported });

    const runTurn = useCallback(async (userInput: string) => {
        processingRef.current = true;
        setBusy(true);
        setActivity('thinking');
        setTurnCount((count) => count + 1);

        addLog({ type: 'user', text: userInput });
        messagesRef.current.push({ role: 'user', content: userInput });

        try {
            let isAgentFinished = false;
            let stepCount = 0;

            while (!isAgentFinished && stepCount < MAX_STEPS) {
                stepCount += 1;
                setActivity(stepCount > 1 ? 'thinking with tool results' : 'thinking');

                const chatCompletion = await openai.chat.completions.create({
                    messages: messagesRef.current,
                    model,
                    tools: definitions.length > 0 ? definitions : undefined,
                    tool_choice: 'auto',
                    stream: false,
                });

                const responseMessage = chatCompletion.choices[0].message;
                messagesRef.current.push(responseMessage);

                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    for (const toolCall of responseMessage.tool_calls) {
                        if (toolCall.type !== 'function') continue;

                        const functionName = toolCall.function.name;
                        const functionArgs = tryParseToolArguments(toolCall.function.arguments);
                        const argsText = JSON.stringify(functionArgs, null, 2);

                        addLog({ type: 'tool', name: functionName, args: argsText });
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
        void runTurn(next);
    }, [busy, queue, runTurn]);

    return (
        <Box flexDirection="column">
            <Box flexDirection="column" marginBottom={1}>
                <Text color="cyan" bold>Agent CLI</Text>
                <Text color="gray">interactive workspace agent</Text>
                <Text>
                    <Text color="gray">model </Text>
                    <Text>{model}</Text>
                </Text>
                <Text>
                    <Text color="gray">cwd </Text>
                    <Text>{formatLocation(process.cwd())}</Text>
                </Text>
                <Text color="green">
                    ready {skills.length} skills | {coreToolCount} tools + activate_skill | /help for commands
                </Text>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                {logs.length === 0 ? (
                    <Text color="gray">
                        {isRawModeSupported
                            ? 'Ask a question. You can keep typing while the agent works.'
                            : 'This UI needs an interactive terminal to accept keyboard input.'}
                    </Text>
                ) : (
                    logs.map((entry, index) => <LogLine key={index} entry={entry} />)
                )}
            </Box>

            <Box flexDirection="column">
                <Text>
                    <Text color={busy ? 'yellow' : 'green'}>{busy ? 'working' : 'ready'}</Text>
                    <Text color="gray"> {activity}</Text>
                    {queue.length > 0 && <Text color="yellow"> | queued {queue.length}</Text>}
                    {turnCount > 0 && <Text color="gray"> | turns {turnCount}</Text>}
                </Text>
                <Text>
                    <Text color="cyan" bold>agent</Text>
                    <Text color="gray"> &gt; </Text>
                    <Text>{input}</Text>
                    <Text color="cyan">█</Text>
                </Text>
            </Box>
        </Box>
    );
}

function LogLine({ entry }: { entry: LogEntry }) {
    if (entry.type === 'user') {
        return (
            <Box flexDirection="column" marginBottom={1}>
                <Text>
                    <Text color="cyan" bold>you</Text>
                    <Text color="gray"> ─ </Text>
                    <Text>{entry.text}</Text>
                </Text>
            </Box>
        );
    }

    if (entry.type === 'assistant') {
        return (
            <Box flexDirection="column" marginBottom={1}>
                <Text color="cyan" bold>agent</Text>
                <MarkdownDisplay text={entry.text} />
            </Box>
        );
    }

    if (entry.type === 'tool') {
        return (
            <Box flexDirection="column" marginBottom={1}>
                <Text>
                    <Text color="yellow">tool </Text>
                    <Text bold>{entry.name}</Text>
                </Text>
                <Text color="gray">{entry.args}</Text>
                {entry.result !== undefined && (
                    <Text color={entry.isError ? 'red' : 'green'}>
                        {entry.isError ? 'error ' : 'done '}
                        <Text color="gray">{compact(entry.result)}</Text>
                    </Text>
                )}
            </Box>
        );
    }

    const color = entry.tone === 'error'
        ? 'red'
        : entry.tone === 'warning'
            ? 'yellow'
            : entry.tone === 'success'
                ? 'green'
                : 'gray';

    return (
        <Box flexDirection="column" marginBottom={1}>
            <Text color={color}>{entry.text}</Text>
        </Box>
    );
}
