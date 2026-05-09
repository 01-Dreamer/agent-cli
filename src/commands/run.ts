import React from 'react';
import { render } from 'ink';
import OpenAI from 'openai';
import * as path from 'path';
import { DEFAULT_MODEL } from '../api/openai';
import { SkillManager } from '../skills/skillManager';
import { createToolRegistry } from '../tools/index';
import { AgentApp } from '../ui/AgentApp';

export interface RunAgentOptions {
    cwd?: string;
}

function createSkillsPrompt(skillManager: SkillManager): string {
    const availableSkills = skillManager.getSkills();
    if (availableSkills.length === 0) {
        return '';
    }

    let skillsPrompt = `\n\n# Available Agent Skills\n\nYou have access to the following specialized skills. To activate a skill and receive its detailed instructions, call the \`activate_skill\` tool with the skill's name.\n\n<available_skills>\n`;
    for (const skill of availableSkills) {
        skillsPrompt += `  <skill>\n    <name>${skill.name}</name>\n    <description>${skill.description}</description>\n    <location>${skill.location}</location>\n  </skill>\n`;
    }
    skillsPrompt += `</available_skills>`;

    return skillsPrompt;
}

function createSystemPrompt(skillsPrompt: string): string {
    return `You are agent-cli, an interactive CLI agent specializing in software engineering tasks. You are currently operating in **Default** mode. Your primary goal is to help users safely and effectively.

- **System Context & Awareness:** You are running directly on the user's system via Node.js. For system facts (e.g. current date, OS architecture), you MUST use the \`shell\` tool to execute standard bash commands (like \`date\`, \`uname\`) rather than guessing, hallucinating, or searching the web.
- **Tool Efficiency:** Minimize the total number of tool calls. If you need several pieces of information at once (e.g., system specs), write a single \`shell\` tool command using \`&&\` or \`;\` rather than calling the \`shell\` tool many separate times.
- **Search Discipline:** Use \`web_search\` only for current, niche, uncertain, or source-sensitive information. For stable knowledge you already know, answer directly without searching.
- **Non-Interactive Execution:** Do your best to complete the task at hand autonomously. Explain your thought process briefly, gather the information efficiently, and synthesize the result for the user.
- **Skill Guidance:** Once a skill is activated via \`activate_skill\`, its instructions and resources are returned wrapped in \`<activated_skill>\` tags. You MUST treat the content within \`<instructions>\` as expert procedural guidance for the duration of the task.${skillsPrompt}`;
}

export async function runAgent(options: RunAgentOptions = {}) {
    if (!process.stdin.isTTY) {
        console.error('Agent CLI Ink UI requires an interactive terminal. Please run `agent-cli` directly in your shell.');
        return;
    }

    if (options.cwd) {
        try {
            process.chdir(path.resolve(options.cwd));
        } catch (error: any) {
            console.error(`Failed to start Agent CLI in "${options.cwd}": ${error.message}`);
            return;
        }
    }

    const skillManager = new SkillManager();

    await skillManager.discoverSkills({
        isTrusted: true,
        builtinSkillsDir: path.join(__dirname, '..', 'skills', 'builtin'),
    });

    const { definitions, implementations } = createToolRegistry(skillManager);
    const toolNames = definitions
        .filter((definition): definition is OpenAI.Chat.ChatCompletionFunctionTool => definition.type === 'function')
        .map((definition) => definition.function.name);

    const systemPrompt = createSystemPrompt(createSkillsPrompt(skillManager));

    render(React.createElement(AgentApp, {
        model: DEFAULT_MODEL,
        systemPrompt,
        skills: skillManager.getSkills(),
        toolNames,
        definitions,
        implementations,
    }));
}
