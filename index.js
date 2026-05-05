require('dotenv').config();
const { OpenAI } = require('openai');
const readline = require('readline/promises');


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// --- 步骤 1：定义本地的天气查询函数（Mock数据） ---
async function getWeather(location) {
    // 这里可以是真实的第三方 API 调用，这里固定返回些假数据用于演示
    return JSON.stringify({ location: location, temperature: "22°C", condition: "Sunny(晴朗)", notes: "适合出行" });
}

// --- 步骤 2：用 JSON Schema 描述这个工具，以便告诉大模型 ---
const tools = [
    {
        type: "function",
        function: {
            name: "get_weather",
            description: "获取指定城市或地点的当前天气情况",
            parameters: {
                type: "object",
                properties: {
                    location: {
                        type: "string",
                        description: "城市名称，例如：北京、上海、杭州等",
                    },
                },
                required: ["location"],
            },
        },
    }
];

async function main() {
    console.log("Welcome to the LLM Chat. Type 'exit' or 'quit' to end the conversation.\n");

    // Array to store the context of the conversation
    const messages = [
        { role: "system", content: "你是一个回复助手，可以按需使用工具来帮助用户解答问题。" }
    ];

    while (true) {
        const userInput = await rl.question("You: ");

        if (userInput.trim().toLowerCase() === 'exit' || userInput.trim().toLowerCase() === 'quit') {
            console.log("Goodbye!");
            rl.close();
            break;
        }

        if (!userInput.trim()) continue;

        // Remember user's input
        messages.push({ role: "user", content: userInput });

        try {
            const chatCompletion = await openai.chat.completions.create({
                messages: messages,
                model: process.env.MODEL_NAME || "Qwen/Qwen2.5-7B-Instruct",
                tools: tools,     // 传递工具描述给模型
                tool_choice: "auto", // 让模型自己决定是否调用工具
                stream: false,    // Function Calling 处理较为复杂，这里暂时关闭流式以简化处理
            });

            const responseMessage = chatCompletion.choices[0].message;
            messages.push(responseMessage); // 把模型的原始回复（可能包含工具调用请求）存入上下文

            // --- 步骤 3：判断模型是否希望调用工具 ---
            if (responseMessage.tool_calls) {
                for (const toolCall of responseMessage.tool_calls) {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);
                    
                    console.log(`\n[系统提示] 正在调用工具: ${functionName}(${JSON.stringify(functionArgs)})`);

                    let functionResponse = "";
                    if (functionName === "get_weather") {
                        // 真的执行本地代码
                        functionResponse = await getWeather(functionArgs.location);
                    }

                    // 将工具执行的结果添加进上下文中
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        name: functionName,
                        content: functionResponse,
                    });
                }

                // --- 步骤 4：再次将带有工具执行结果的上下文发给模型 ---
                const secondResponse = await openai.chat.completions.create({
                    messages: messages,
                    model: process.env.MODEL_NAME || "Qwen/Qwen2.5-7B-Instruct",
                });
                
                const finalReply = secondResponse.choices[0].message.content;
                console.log(`\nAI: ${finalReply}\n`);
                messages.push({ role: "assistant", content: finalReply });
            } else {
                // 模型正常回复文本，没有工具调用
                console.log(`AI: ${responseMessage.content}\n`);
            }
        } catch (error) {
            console.error("\nError calling OpenAI API:", error);
        }
    }
}

main();
