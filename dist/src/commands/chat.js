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
exports.startChat = startChat;
const readline = __importStar(require("readline/promises"));
const openai_1 = require("../api/openai");
const index_1 = require("../tools/index");
async function startChat() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    console.log(`\nWelcome to the Agent CLI using model: ${openai_1.DEFAULT_MODEL}`);
    console.log("Type 'exit' or 'quit' to end the conversation.\n");
    const messages = [
        { role: "system", content: "你是一个智能代理助理。你必须基于思考、观察和工具调用来响应用户。你可以连续多次调用工具来达成最终目的。" }
    ];
    while (true) {
        const userInput = await rl.question("You: ");
        if (userInput.trim().toLowerCase() === 'exit' || userInput.trim().toLowerCase() === 'quit') {
            console.log("Goodbye!");
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
                    process.stdout.write(" [代理正在根据工具结果继续思考...]\r");
                }
                else {
                    process.stdout.write(" [代理正在思考...]\r");
                }
                const chatCompletion = await openai_1.openai.chat.completions.create({
                    messages: messages,
                    model: openai_1.DEFAULT_MODEL,
                    tools: index_1.definitions.length > 0 ? index_1.definitions : undefined,
                    tool_choice: "auto",
                    stream: false,
                });
                // 清除思考提示
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                const responseMessage = chatCompletion.choices[0].message;
                messages.push(responseMessage);
                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    // 如果代理决定调用工具，则逐个执行，并在本轮循环中把由于加入 messages，进行下一轮 API 交互
                    for (const toolCall of responseMessage.tool_calls) {
                        if (toolCall.type === "function") {
                            const functionName = toolCall.function.name;
                            const functionArgs = JSON.parse(toolCall.function.arguments);
                            console.log(` ⚙️  [工具调用] ${functionName}(${JSON.stringify(functionArgs)})`);
                            let functionResponse = "";
                            if (index_1.implementations[functionName]) {
                                try {
                                    functionResponse = await index_1.implementations[functionName](functionArgs);
                                    console.log(` └─ [结果] ${functionResponse.slice(0, 100)}${functionResponse.length > 100 ? '...' : ''}`);
                                }
                                catch (err) {
                                    functionResponse = JSON.stringify({ error: err.message || "执行期间发生错误" });
                                    console.log(` └─ [错误] ${functionResponse}`);
                                }
                            }
                            else {
                                functionResponse = JSON.stringify({ error: "Tool not found" });
                                console.log(` └─ [错误] 工具不存在`);
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
                    console.log(`\nAI: ${responseMessage.content}\n`);
                    isAgentFinished = true;
                }
            }
            if (stepCount >= MAX_STEPS) {
                console.log(`\n[系统警告] 代理推理步数达到最大阈值 (${MAX_STEPS})，被强制终止。\n`);
            }
        }
        catch (error) {
            console.error("\nError calling OpenAI API:", error.message || error);
        }
    }
}
