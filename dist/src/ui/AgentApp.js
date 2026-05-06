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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentApp = AgentApp;
const react_1 = __importStar(require("react"));
const ink_1 = require("ink");
const openai_1 = require("../api/openai");
const MarkdownDisplay_1 = require("./MarkdownDisplay");
const MAX_STEPS = 10;
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
        'exit    close the session',
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
    const [input, setInput] = (0, react_1.useState)('');
    const [logs, setLogs] = (0, react_1.useState)([]);
    const [queue, setQueue] = (0, react_1.useState)([]);
    const [busy, setBusy] = (0, react_1.useState)(false);
    const [activity, setActivity] = (0, react_1.useState)('ready');
    const [turnCount, setTurnCount] = (0, react_1.useState)(0);
    const messagesRef = (0, react_1.useRef)([
        { role: 'system', content: systemPrompt },
    ]);
    const processingRef = (0, react_1.useRef)(false);
    const coreToolCount = (0, react_1.useMemo)(() => toolNames.filter((name) => name !== 'activate_skill').length, [toolNames]);
    const addLog = (0, react_1.useCallback)((entry) => {
        setLogs((current) => [...current, entry].slice(-MAX_VISIBLE_LOGS));
    }, []);
    const handleCommand = (0, react_1.useCallback)((value) => {
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
    const runTurn = (0, react_1.useCallback)(async (userInput) => {
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
                const chatCompletion = await openai_1.openai.chat.completions.create({
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
                        if (toolCall.type !== 'function')
                            continue;
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
        void runTurn(next);
    }, [busy, queue, runTurn]);
    return (react_1.default.createElement(ink_1.Box, { flexDirection: "column" },
        react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginBottom: 1 },
            react_1.default.createElement(ink_1.Text, { color: "cyan", bold: true }, "Agent CLI"),
            react_1.default.createElement(ink_1.Text, { color: "gray" }, "interactive workspace agent"),
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: "gray" }, "model "),
                react_1.default.createElement(ink_1.Text, null, model)),
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: "gray" }, "cwd "),
                react_1.default.createElement(ink_1.Text, null, formatLocation(process.cwd()))),
            react_1.default.createElement(ink_1.Text, { color: "green" },
                "ready ",
                skills.length,
                " skills | ",
                coreToolCount,
                " tools + activate_skill | /help for commands")),
        react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginBottom: 1 }, logs.length === 0 ? (react_1.default.createElement(ink_1.Text, { color: "gray" }, isRawModeSupported
            ? 'Ask a question. You can keep typing while the agent works.'
            : 'This UI needs an interactive terminal to accept keyboard input.')) : (logs.map((entry, index) => react_1.default.createElement(LogLine, { key: index, entry: entry })))),
        react_1.default.createElement(ink_1.Box, { flexDirection: "column" },
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: busy ? 'yellow' : 'green' }, busy ? 'working' : 'ready'),
                react_1.default.createElement(ink_1.Text, { color: "gray" },
                    " ",
                    activity),
                queue.length > 0 && react_1.default.createElement(ink_1.Text, { color: "yellow" },
                    " | queued ",
                    queue.length),
                turnCount > 0 && react_1.default.createElement(ink_1.Text, { color: "gray" },
                    " | turns ",
                    turnCount)),
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: "cyan", bold: true }, "agent"),
                react_1.default.createElement(ink_1.Text, { color: "gray" }, " > "),
                react_1.default.createElement(ink_1.Text, null, input),
                react_1.default.createElement(ink_1.Text, { color: "cyan" }, "\u2588")))));
}
function LogLine({ entry }) {
    if (entry.type === 'user') {
        return (react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginBottom: 1 },
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: "cyan", bold: true }, "you"),
                react_1.default.createElement(ink_1.Text, { color: "gray" }, " \u2500 "),
                react_1.default.createElement(ink_1.Text, null, entry.text))));
    }
    if (entry.type === 'assistant') {
        return (react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginBottom: 1 },
            react_1.default.createElement(ink_1.Text, { color: "cyan", bold: true }, "agent"),
            react_1.default.createElement(MarkdownDisplay_1.MarkdownDisplay, { text: entry.text })));
    }
    if (entry.type === 'tool') {
        return (react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginBottom: 1 },
            react_1.default.createElement(ink_1.Text, null,
                react_1.default.createElement(ink_1.Text, { color: "yellow" }, "tool "),
                react_1.default.createElement(ink_1.Text, { bold: true }, entry.name)),
            react_1.default.createElement(ink_1.Text, { color: "gray" }, entry.args),
            entry.result !== undefined && (react_1.default.createElement(ink_1.Text, { color: entry.isError ? 'red' : 'green' },
                entry.isError ? 'error ' : 'done ',
                react_1.default.createElement(ink_1.Text, { color: "gray" }, compact(entry.result))))));
    }
    const color = entry.tone === 'error'
        ? 'red'
        : entry.tone === 'warning'
            ? 'yellow'
            : entry.tone === 'success'
                ? 'green'
                : 'gray';
    return (react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginBottom: 1 },
        react_1.default.createElement(ink_1.Text, { color: color }, entry.text)));
}
