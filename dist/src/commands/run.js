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
exports.runAgent = runAgent;
const readline = __importStar(require("readline/promises"));
const openai_1 = require("../api/openai");
const index_1 = require("../tools/index");
const skillManager_1 = require("../skills/skillManager");
const path = __importStar(require("path"));
const color = {
    reset: "\x1b[0m",
    dim: "\x1b[2m",
    bold: "\x1b[1m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    gray: "\x1b[90m",
};
function paint(value, ...ansi) {
    return process.stdout.isTTY ? `${ansi.join('')}${value}${color.reset}` : value;
}
function truncate(value, maxLength) {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}
function clearStatusLine() {
    if (process.stdout.isTTY) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
    }
    else {
        process.stdout.write("\n");
    }
}
function writeStatus(message) {
    process.stdout.write(`${paint("...", color.gray)} ${message}\r`);
}
function printHeader(model) {
    console.log();
    console.log(`${paint("agent-cli", color.cyan, color.bold)} ${paint("workspace agent", color.gray)}`);
    console.log(paint(`model ${model}`, color.gray));
}
function printSessionSummary(skillCount, toolCount) {
    console.log(paint(`${skillCount} skills loaded | ${toolCount} tools available | type exit to quit`, color.gray));
    console.log();
}
function printToolCall(name, args) {
    console.log();
    console.log(`${paint("tool", color.yellow)} ${paint(name, color.bold)} ${paint(JSON.stringify(args), color.gray)}`);
}
function printToolResult(result, isError = false) {
    const label = isError ? paint("x", color.red) : paint("ok", color.green);
    console.log(`${paint("  ", color.gray)}${label} ${paint(truncate(result.replace(/\s+/g, ' ').trim(), 160), color.gray)}`);
}
function printAssistant(content) {
    console.log();
    console.log(paint("agent-cli", color.cyan, color.bold));
    console.log(content ?? "");
    console.log();
}
async function runAgent() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    printHeader(openai_1.DEFAULT_MODEL);
    const skillManager = new skillManager_1.SkillManager();
    await skillManager.discoverSkills({
        isTrusted: true,
        builtinSkillsDir: path.join(__dirname, '..', 'skills', 'builtin'),
    });
    const { definitions, implementations } = (0, index_1.createToolRegistry)(skillManager);
    const allDiscoveredSkills = skillManager.getAllSkills();
    const toolNames = definitions
        .filter((definition) => definition.type === "function")
        .map((definition) => definition.function.name);
    printSessionSummary(allDiscoveredSkills.length, toolNames.length);
    const availableSkills = skillManager.getSkills();
    let skillsPrompt = "";
    if (availableSkills.length > 0) {
        skillsPrompt = `\n\n# Available Agent Skills\n\nYou have access to the following specialized skills. To activate a skill and receive its detailed instructions, call the \`activate_skill\` tool with the skill's name.\n\n<available_skills>\n`;
        for (const skill of availableSkills) {
            skillsPrompt += `  <skill>\n    <name>${skill.name}</name>\n    <description>${skill.description}</description>\n    <location>${skill.location}</location>\n  </skill>\n`;
        }
        skillsPrompt += `</available_skills>`;
    }
    const systemPrompt = `You are agent-cli, an interactive CLI agent specializing in software engineering tasks. You are currently operating in **Default** mode. Your primary goal is to help users safely and effectively.

- **System Context & Awareness:** You are running directly on the user's system via Node.js. For system facts (e.g. current date, OS architecture), you MUST use the \`shell\` tool to execute standard bash commands (like \`date\`, \`uname\`) rather than guessing, hallucinating, or searching the web.
- **Tool Efficiency:** Minimize the total number of tool calls. If you need several pieces of information at once (e.g., system specs), write a single \`shell\` tool command using \`&&\` or \`;\` rather than calling the \`shell\` tool many separate times. 
- **Non-Interactive Execution:** Do your best to complete the task at hand autonomously. Explain your thought process briefly, gather the information efficiently, and synthesize the result for the user.
- **Skill Guidance:** Once a skill is activated via \`activate_skill\`, its instructions and resources are returned wrapped in \`<activated_skill>\` tags. You MUST treat the content within \`<instructions>\` as expert procedural guidance for the duration of the task.${skillsPrompt}`;
    const messages = [
        { role: "system", content: systemPrompt }
    ];
    while (true) {
        let userInput;
        try {
            userInput = await rl.question(paint("> ", color.cyan, color.bold));
        }
        catch (error) {
            if (error?.code === 'ERR_USE_AFTER_CLOSE') {
                break;
            }
            throw error;
        }
        if (userInput.trim().toLowerCase() === 'exit' || userInput.trim().toLowerCase() === 'quit') {
            console.log(paint("agent-cli session closed.", color.gray));
            rl.close();
            break;
        }
        if (!userInput.trim())
            continue;
        messages.push({ role: "user", content: userInput });
        try {
            let isAgentFinished = false;
            let stepCount = 0;
            const MAX_STEPS = 10; // 防止陷入无限死循环调用
            while (!isAgentFinished && stepCount < MAX_STEPS) {
                stepCount++;
                // 给用户一点正在思考的反馈提示
                if (stepCount > 1) {
                    writeStatus("thinking with tool results...");
                }
                else {
                    writeStatus("thinking...");
                }
                const chatCompletion = await openai_1.openai.chat.completions.create({
                    messages: messages,
                    model: openai_1.DEFAULT_MODEL,
                    tools: definitions.length > 0 ? definitions : undefined,
                    tool_choice: "auto",
                    stream: false,
                });
                // 清除思考提示
                clearStatusLine();
                const responseMessage = chatCompletion.choices[0].message;
                messages.push(responseMessage);
                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    // 如果代理决定调用工具，则逐个执行，并在本轮循环中把由于加入 messages，进行下一轮 API 交互
                    for (const toolCall of responseMessage.tool_calls) {
                        if (toolCall.type === "function") {
                            const functionName = toolCall.function.name;
                            const functionArgs = JSON.parse(toolCall.function.arguments);
                            printToolCall(functionName, functionArgs);
                            let functionResponse = "";
                            if (implementations[functionName]) {
                                try {
                                    functionResponse = await implementations[functionName](functionArgs);
                                    printToolResult(functionResponse);
                                }
                                catch (err) {
                                    functionResponse = JSON.stringify({ error: err.message || "执行期间发生错误" });
                                    printToolResult(functionResponse, true);
                                }
                            }
                            else {
                                functionResponse = JSON.stringify({ error: "Tool not found" });
                                printToolResult(functionResponse, true);
                            }
                            // 必须把工具请求的结果还给大模型
                            messages.push({
                                role: "tool",
                                tool_call_id: toolCall.id,
                                content: functionResponse,
                            });
                        }
                    }
                    // 不将 isAgentFinished 设为 true，这样 while 循环会带着新 messages 再次去请求 LLM
                }
                else {
                    // 没有发现工具调用行为，说明代理已经决定向用户输出最终答案文本
                    printAssistant(responseMessage.content);
                    isAgentFinished = true;
                }
            }
            if (stepCount >= MAX_STEPS) {
                console.log(`${paint("warning", color.yellow)} agent reached max reasoning steps (${MAX_STEPS}).`);
            }
        }
        catch (error) {
            clearStatusLine();
            console.error(`${paint("error", color.red)} OpenAI API call failed:`, error.message || error);
        }
    }
}
