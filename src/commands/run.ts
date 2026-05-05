import * as readline from 'readline/promises';
import { openai, DEFAULT_MODEL } from '../api/openai';
import { definitions, implementations } from '../tools/index';
import { SkillManager } from '../skills/skillManager';
import { loadSkillsFromDir } from '../skills/skillLoader';
import OpenAI from 'openai';
import * as path from 'path';

async function loadSkillsFromDirs(skillManager: SkillManager, dirPaths: string[]) {
    const visitedDirs = new Set<string>();

    for (const dirPath of dirPaths) {
        const absoluteDir = path.resolve(dirPath);
        if (visitedDirs.has(absoluteDir)) continue;
        visitedDirs.add(absoluteDir);

        const skills = await loadSkillsFromDir(absoluteDir);
        skillManager.addSkills(skills);
    }
}

export async function runAgent() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log(`\nWelcome to the Agent CLI using model: ${DEFAULT_MODEL}`);
    console.log("Type 'exit' or 'quit' to end the conversation.\n");

    const skillManager = new SkillManager();

    await loadSkillsFromDirs(skillManager, [
        // Built-in skills after compilation, e.g. dist/src/skills/builtin.
        path.join(__dirname, '..', 'skills', 'builtin'),
        // Built-in skills while running from the TypeScript source tree.
        path.join(process.cwd(), 'src', 'skills', 'builtin'),
        // Workspace skills shared by agent tools for this project.
        path.join(process.cwd(), '.agents', 'skills'),
    ]);

    const allDiscoveredSkills = skillManager.getAllSkills();
    if (allDiscoveredSkills.length > 0) {
        console.log(`Loaded ${allDiscoveredSkills.length} skills: ${skillManager.getSkillNames().join(', ')}`);
    }

    const availableSkills = skillManager.getAllSkills();
    let skillsPrompt = "";
    if (availableSkills.length > 0) {
        skillsPrompt = `\n\n- **Available Skills:** You have access to the following skills. If a user asks you to perform a task and a skill exists for it, use the provided instructions in the skill body to complete it.\n`;
        for (const skill of availableSkills) {
            skillsPrompt += `\n### Skill: ${skill.name}\n**Description**: ${skill.description}\n**Instructions**:\n${skill.body}\n`;
        }
    }

    const systemPrompt = `You are Gemini CLI, an interactive CLI agent specializing in software engineering tasks. You are currently operating in **Default** mode. Your primary goal is to help users safely and effectively.

- **System Context & Awareness:** You are running directly on the user's system via Node.js. For system facts (e.g. current date, OS architecture), you MUST use the \`shell\` tool to execute standard bash commands (like \`date\`, \`uname\`) rather than guessing, hallucinating, or searching the web.
- **Tool Efficiency:** Minimize the total number of tool calls. If you need several pieces of information at once (e.g., system specs), write a single \`shell\` tool command using \`&&\` or \`;\` rather than calling the \`shell\` tool many separate times. 
- **Non-Interactive Execution:** Do your best to complete the task at hand autonomously. Explain your thought process briefly, gather the information efficiently, and synthesize the result for the user.${skillsPrompt}`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt }
    ];

    while (true) {
        const userInput = await rl.question("You: ");

        if (userInput.trim().toLowerCase() === 'exit' || userInput.trim().toLowerCase() === 'quit') {
            console.log("Goodbye!");
            rl.close();
            break;
        }

        if (!userInput.trim()) continue;

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
                } else {
                    process.stdout.write(" [代理正在思考...]\r");
                }

                const chatCompletion = await openai.chat.completions.create({
                    messages: messages,
                    model: DEFAULT_MODEL,
                    tools: definitions.length > 0 ? definitions : undefined,
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
                            if (implementations[functionName]) {
                                try {
                                    functionResponse = await implementations[functionName](functionArgs);
                                    console.log(` └─ [结果] ${functionResponse.slice(0, 100)}${functionResponse.length > 100 ? '...' : ''}`);
                                } catch (err: any) {
                                    functionResponse = JSON.stringify({ error: err.message || "执行期间发生错误" });
                                    console.log(` └─ [错误] ${functionResponse}`);
                                }
                            } else {
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
                } else {
                    // 没有发现工具调用行为，说明代理已经决定向用户输出最终答案文本
                    console.log(`\nAI: ${responseMessage.content}\n`);
                    isAgentFinished = true;
                }
            }

            if (stepCount >= MAX_STEPS) {
                console.log(`\n[系统警告] 代理推理步数达到最大阈值 (${MAX_STEPS})，被强制终止。\n`);
            }
        } catch (error: any) {
            console.error("\nError calling OpenAI API:", error.message || error);
        }
    }
}
