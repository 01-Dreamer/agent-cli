"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentApp = AgentApp;
const react_1 = __importStar(require("react"));
const ink_1 = require("ink");
const openai_1 = require("../api/openai");
const MarkdownDisplay_1 = require("./MarkdownDisplay");
const string_width_1 = __importDefault(require("string-width"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const fs_1 = require("fs");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const MAX_STEPS = 30;
// MAX_VISIBLE_LOGS 决定了屏幕上（Ink框架的UI上）最大能够同时渲染/记忆的历史日志条数。
// 当日志超过这个数量时，最旧的日志会被移出屏幕（不在界面上显示），以防止终端占用过大内存卡顿。
const MAX_VISIBLE_LOGS = 80;
function truncate(value, maxLength) {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}
function compact(value, maxLength = 220) {
    return truncate(value.replace(/\s+/g, ' ').trim(), maxLength);
}
function formatLocation(location) {
    const cwd = process.cwd();
    return location.startsWith(cwd) ? `.${location.slice(cwd.length)}` : location;
}
function renderHelp() {
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
function renderSkills(skills) {
    if (skills.length === 0)
        return 'No skills discovered.';
    return skills
        .map((skill) => `${skill.name} - ${skill.description}\n  ${formatLocation(skill.location)}`)
        .join('\n');
}
function renderTools(toolNames) {
    return toolNames
        .map((name) => `${name === 'activate_skill' ? 'skill' : 'tool'} ${name}`)
        .join('\n');
}
function normalizeAssistantContent(content) {
    if (typeof content === 'string')
        return content;
    if (!content)
        return '';
    return JSON.stringify(content);
}
function tryParseToolArguments(rawArguments) {
    try {
        return JSON.parse(rawArguments || '{}');
    }
    catch {
        return {};
    }
}
function AgentApp({ model, systemPrompt, skills, toolNames, definitions, implementations, }) {
    const { exit } = (0, ink_1.useApp)();
    const { isRawModeSupported } = (0, ink_1.useStdin)();
    const [terminalWidth, setTerminalWidth] = (0, react_1.useState)(process.stdout.columns || 80);
    const [input, setInput] = (0, react_1.useState)('');
    const [logs, setLogs] = (0, react_1.useState)([]);
    const [queue, setQueue] = (0, react_1.useState)([]);
    const [currentTask, setCurrentTask] = (0, react_1.useState)(null);
    const [usageTokens, setUsageTokens] = (0, react_1.useState)(null);
    const [busy, setBusy] = (0, react_1.useState)(false);
    const [activity, setActivity] = (0, react_1.useState)('ready');
    const [turnCount, setTurnCount] = (0, react_1.useState)(0);
    const [currentCwd, setCurrentCwd] = (0, react_1.useState)(process.cwd());
    const [inputMode, setInputMode] = (0, react_1.useState)('chat');
    const messagesRef = (0, react_1.useRef)([
        { role: 'system', content: systemPrompt },
    ]);
    const processingRef = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(() => {
        const handleResize = () => setTerminalWidth(process.stdout.columns || 80);
        process.stdout.on('resize', handleResize);
        return () => {
            process.stdout.off('resize', handleResize);
        };
    }, []);
    const coreToolCount = (0, react_1.useMemo)(() => toolNames.filter((name) => name !== 'activate_skill').length, [toolNames]);
    const addLog = (0, react_1.useCallback)((entry) => {
        setLogs((current) => [...current, entry].slice(-MAX_VISIBLE_LOGS));
    }, []);
    const handleCommand = (0, react_1.useCallback)((value) => {
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
            }
            catch (err) {
                addLog({ type: 'system', text: `cd failed: ${err.message}`, tone: 'error' });
            }
            return true;
        }
        return false;
    }, [addLog, exit, skills, toolNames]);
    const handleLocalCommand = (0, react_1.useCallback)(async (cmd) => {
        if (!cmd.trim())
            return;
        addLog({ type: 'system', text: `! ${cmd}`, tone: 'warning', hidePrefix: true });
        setBusy(true);
        if (cmd.trim().startsWith('cd ')) {
            const targetPath = cmd.trim().substring(3).trim();
            try {
                process.chdir(path.resolve(currentCwd, targetPath));
                setCurrentCwd(process.cwd());
            }
            catch (err) {
                addLog({ type: 'system', text: `cd failed: ${err.message}`, tone: 'error', hidePrefix: true });
            }
            setBusy(false);
            return;
        }
        try {
            const { stdout, stderr } = await execAsync(cmd, { cwd: currentCwd, shell: '/bin/bash' });
            if (stdout)
                addLog({ type: 'system', text: stdout.trimEnd(), tone: 'normal', hidePrefix: true });
            if (stderr)
                addLog({ type: 'system', text: stderr.trimEnd(), tone: 'warning', hidePrefix: true });
            if (!stdout && !stderr)
                addLog({ type: 'system', text: 'Command executed successfully.', tone: 'success', hidePrefix: true });
        }
        catch (error) {
            addLog({ type: 'system', text: `Error: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`.trimEnd(), tone: 'error', hidePrefix: true });
        }
        finally {
            setBusy(false);
        }
    }, [addLog, currentCwd]);
    const submitInput = (0, react_1.useCallback)((value) => {
        const trimmed = value.trim();
        if (!trimmed)
            return;
        if (handleCommand(trimmed))
            return;
        setQueue((current) => [...current, trimmed]);
        if (busy || processingRef.current) {
            addLog({ type: 'system', text: `queued: ${trimmed}`, tone: 'warning' });
        }
    }, [addLog, busy, handleCommand]);
    (0, ink_1.useInput)((value, key) => {
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
            return;
        }
        if (key.return || value === '\r' || value === '\n') {
            if (inputMode === 'command') {
                handleLocalCommand(input);
                setInput('');
                return;
            }
            submitInput(input);
            setInput('');
            return;
        }
        if (value.includes('\r') || value.includes('\n')) {
            const normalizedValue = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const parts = normalizedValue.split('\n');
            const firstSubmission = `${input}${parts[0]}`;
            if (inputMode === 'command') {
                handleLocalCommand(firstSubmission);
                for (const queuedSubmission of parts.slice(1, -1)) {
                    handleLocalCommand(queuedSubmission);
                }
            }
            else {
                submitInput(firstSubmission);
                for (const queuedSubmission of parts.slice(1, -1)) {
                    submitInput(queuedSubmission);
                }
            }
            setInput(parts.at(-1) ?? '');
            return;
        }
        if (key.backspace || key.delete) {
            setInput((current) => current.slice(0, -1));
            return;
        }
        if (key.tab) {
            // 如果处于输入路径状态下，尝试使用简单的 Tab 补全目录
            if (input.startsWith('/cd ') || inputMode === 'command') {
                const parts = input.split(' ');
                const lastParam = parts[parts.length - 1];
                try {
                    let searchDir = currentCwd;
                    let filePrefix = lastParam;
                    if (lastParam.startsWith('/')) {
                        searchDir = path.dirname(lastParam) || '/';
                        filePrefix = path.basename(lastParam);
                    }
                    else if (lastParam.includes('/')) {
                        searchDir = path.resolve(currentCwd, path.dirname(lastParam));
                        filePrefix = path.basename(lastParam);
                    }
                    else if (lastParam === '.' || lastParam === '..') {
                        return;
                    }
                    // Shell 模式下补全如果没有前缀就是空串寻找整个目录
                    filePrefix = filePrefix || '';
                    if (!(0, fs_1.existsSync)(searchDir))
                        return;
                    const files = require('fs').readdirSync(searchDir);
                    const matches = files.filter((f) => f.startsWith(filePrefix));
                    if (matches.length === 1) {
                        const match = matches[0];
                        const fullMatchPath = path.join(searchDir, match);
                        const isDir = (0, fs_1.statSync)(fullMatchPath).isDirectory();
                        const suffix = isDir ? '/' : '';
                        const completedSuffix = match.slice(filePrefix.length) + suffix;
                        setInput((current) => current + completedSuffix);
                    }
                    else if (matches.length > 1) {
                        addLog({
                            type: 'system',
                            text: matches.map((m) => {
                                try {
                                    return (0, fs_1.statSync)(path.join(searchDir, m)).isDirectory() ? `${m}/` : m;
                                }
                                catch (e) {
                                    return m;
                                }
                            }).join('  '),
                            tone: 'normal',
                            hidePrefix: true
                        });
                    }
                }
                catch (e) {
                }
            }
            return;
        }
        if (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow || key.escape) {
            return;
        }
        if (value) {
            setInput((current) => `${current}${value}`);
        }
    }, { isActive: isRawModeSupported });
    const runTurn = (0, react_1.useCallback)(async (userInput) => {
        processingRef.current = true;
        setBusy(true);
        setActivity('thinking');
        setTurnCount((count) => count + 1);
        addLog({ type: 'user', text: userInput });
        messagesRef.current.push({ role: 'user', content: userInput });
        let stepCount = 0;
        let isAgentFinished = false;
        try {
            while (!isAgentFinished && stepCount < MAX_STEPS) {
                stepCount++;
                setActivity('thinking');
                const chatCompletion = await openai_1.openai.chat.completions.create({
                    model: model,
                    messages: messagesRef.current,
                    tools: definitions.length > 0 ? definitions : undefined,
                    tool_choice: definitions.length > 0 ? 'auto' : undefined,
                });
                if (chatCompletion.usage?.total_tokens) {
                    setUsageTokens(chatCompletion.usage.total_tokens);
                }
                const responseMessage = chatCompletion.choices[0].message;
                if (!responseMessage) {
                    addLog({ type: 'system', text: 'Empty response from OpenAI.', tone: 'error' });
                    isAgentFinished = true;
                    break;
                }
                messagesRef.current.push(responseMessage);
                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    for (const toolCall of responseMessage.tool_calls) {
                        if (toolCall.type !== 'function')
                            continue;
                        const functionName = toolCall.function.name;
                        const functionArgs = tryParseToolArguments(toolCall.function.arguments);
                        const argsText = JSON.stringify(functionArgs, null, 2);
                        setActivity(`running ${functionName}`);
                        let functionResponse = '';
                        let isError = false;
                        if (implementations[functionName]) {
                            try {
                                functionResponse = await implementations[functionName](functionArgs);
                            }
                            catch (error) {
                                isError = true;
                                functionResponse = JSON.stringify({ error: error.message || 'Tool execution failed' });
                            }
                        }
                        else {
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
                }
                else {
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
        }
        catch (error) {
            addLog({
                type: 'system',
                text: `OpenAI API call failed: ${error.message || error}`,
                tone: 'error',
            });
        }
        finally {
            processingRef.current = false;
            setBusy(false);
            setActivity('ready');
        }
    }, [addLog, definitions, implementations, model]);
    (0, react_1.useEffect)(() => {
        if (busy || processingRef.current || queue.length === 0)
            return;
        const [next, ...rest] = queue;
        setQueue(rest);
        setCurrentTask(next);
        void runTurn(next).then(() => {
            setCurrentTask(null);
        });
    }, [busy, queue, runTurn]);
    // calculate very rough token estimate based on message strings
    const roughTokenEstimate = (0, react_1.useMemo)(() => {
        if (usageTokens !== null) {
            if (usageTokens > 1000000)
                return `${(usageTokens / 1000000).toFixed(1)}M`;
            if (usageTokens > 1000)
                return `${(usageTokens / 1000).toFixed(1)}K`;
            return `${usageTokens}`;
        }
        if (turnCount === 0) {
            return '0';
        }
        // Conservative heuristic estimation if API doesn't return usage.
        // Assumes that tokens can be less dense than 4 chars per token for CJK/code.
        // Using ~2.5 characters per token as a conservative baseline to avoid underreporting.
        const text = messagesRef.current.map(m => m.content ? (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)) : '').join(' ');
        const estimatedTokens = Math.ceil(text.length / 2.5);
        if (estimatedTokens > 1000000)
            return `${(estimatedTokens / 1000000).toFixed(1)}M`;
        if (estimatedTokens > 1000)
            return `${(estimatedTokens / 1000).toFixed(1)}K`;
        return `${estimatedTokens}`;
    }, [usageTokens, turnCount, messagesRef.current.length, busy]);
    const rightStatusText = `context: ${roughTokenEstimate} tokens`;
    return (react_1.default.createElement(ink_1.Box, { flexDirection: "column" },
        react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginBottom: 1 },
            react_1.default.createElement(ink_1.Text, { color: "cyan", bold: true }, "Agent CLI"),
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: "gray" }, "model "),
                react_1.default.createElement(ink_1.Text, null, model)),
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: "gray" }, "cwd "),
                react_1.default.createElement(ink_1.Text, null, currentCwd)),
            react_1.default.createElement(ink_1.Box, { marginTop: 1 },
                react_1.default.createElement(ink_1.Text, { color: "green" },
                    "Welcome to Agent CLI! Type your question to start or enter ",
                    react_1.default.createElement(ink_1.Text, { bold: true }, "/help"),
                    " to view available commands."))),
        react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginBottom: 1 }, logs.map((entry, index) => react_1.default.createElement(LogLine, { key: index, entry: entry, terminalWidth: terminalWidth }))),
        react_1.default.createElement(ink_1.Box, { flexDirection: "column" },
            currentTask ? (react_1.default.createElement(ink_1.Box, { marginBottom: 0, width: terminalWidth },
                react_1.default.createElement(ink_1.Text, { color: "cyan", wrap: "truncate" },
                    "task: ",
                    currentTask))) : null,
            react_1.default.createElement(ink_1.Box, { justifyContent: "space-between" },
                react_1.default.createElement(ink_1.Text, null,
                    react_1.default.createElement(ink_1.Text, { color: busy ? 'yellow' : 'green' }, busy ? 'working' : 'ready'),
                    busy && react_1.default.createElement(ink_1.Text, { color: "gray" },
                        " ",
                        activity),
                    queue.length > 0 && react_1.default.createElement(ink_1.Text, { color: "yellow" },
                        " | queued: ",
                        queue.length)),
                react_1.default.createElement(ink_1.Text, { color: "gray" }, rightStatusText)),
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: "gray" }, '─'.repeat(terminalWidth))),
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: inputMode === 'command' ? 'yellow' : 'green', bold: true }, inputMode === 'command' ? '! ' : '❯ '),
                react_1.default.createElement(ink_1.Text, null, input),
                react_1.default.createElement(ink_1.Text, { color: inputMode === 'command' ? 'yellow' : 'green' }, inputMode === 'command' ? '_' : '█')),
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: "gray" }, '─'.repeat(terminalWidth))))));
}
function LogLine({ entry, terminalWidth }) {
    if (entry.type === 'user') {
        const prefix = '❯ ';
        const textWithSpaces = ` ${entry.text} `;
        const visibleWidth = (0, string_width_1.default)(textWithSpaces);
        const paddingLength = Math.max(0, terminalWidth - (0, string_width_1.default)(prefix) - visibleWidth);
        const paddedText = textWithSpaces + ' '.repeat(paddingLength);
        return (react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginBottom: 1 },
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: "green", bold: true }, prefix),
                react_1.default.createElement(ink_1.Text, { backgroundColor: "gray", color: "white" }, paddedText))));
    }
    if (entry.type === 'assistant') {
        return (react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginBottom: 1 },
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: "magenta", bold: true }, "\u25CF "),
                react_1.default.createElement(ink_1.Text, { color: "magenta", bold: true }, "Agent")),
            react_1.default.createElement(MarkdownDisplay_1.MarkdownDisplay, { text: entry.text })));
    }
    if (entry.type === 'tool') {
        const isError = entry.isError === true;
        const tone = isError ? 'error' : 'normal';
        const status = isError ? '✖' : '✔';
        const color = isError ? 'red' : 'green';
        return (react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginBottom: 1 },
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: color, bold: true },
                    status,
                    " "),
                react_1.default.createElement(ink_1.Text, { color: "cyan", bold: true }, entry.name)),
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: "gray" }, "args: "),
                react_1.default.createElement(ink_1.Text, null, truncate(entry.args, 300))),
            entry.result ? (react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: "gray" }, "result: "),
                react_1.default.createElement(ink_1.Text, null, truncate(entry.result, 500)))) : null));
    }
    if (entry.type === 'system') {
        let color = 'green';
        if (entry.tone === 'warning')
            color = 'yellow';
        if (entry.tone === 'error')
            color = 'red';
        const textColor = entry.tone === 'error'
            ? 'red'
            : entry.tone === 'warning'
                ? 'yellow'
                : entry.tone === 'success'
                    ? 'green'
                    : 'gray';
        // 对于 'queued:' 开头的警告信息，不显示 Agent 头部，直接显示文本内容
        if (entry.text.startsWith('queued:') || entry.hidePrefix) {
            return (react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginBottom: 1 },
                react_1.default.createElement(ink_1.Text, { color: textColor }, entry.text)));
        }
        return (react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginBottom: 1 },
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: "cyan", bold: true }, "\u25CF "),
                react_1.default.createElement(ink_1.Text, { color: textColor, bold: true }, "Agent")),
            react_1.default.createElement(ink_1.Text, { color: textColor }, entry.text)));
    }
    return null;
}
