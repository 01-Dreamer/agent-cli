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
exports.runAgent = runAgent;
const react_1 = __importDefault(require("react"));
const ink_1 = require("ink");
const path = __importStar(require("path"));
const openai_1 = require("../api/openai");
const skillManager_1 = require("../skills/skillManager");
const index_1 = require("../tools/index");
const AgentApp_1 = require("../ui/AgentApp");
function createSkillsPrompt(skillManager) {
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
function createSystemPrompt(skillsPrompt) {
    return `You are agent-cli, an interactive CLI agent specializing in software engineering tasks. You are currently operating in **Default** mode. Your primary goal is to help users safely and effectively.

- **System Context & Awareness:** You are running directly on the user's system via Node.js. For system facts (e.g. current date, OS architecture), you MUST use the \`shell\` tool to execute standard bash commands (like \`date\`, \`uname\`) rather than guessing, hallucinating, or searching the web.
- **Tool Efficiency:** Minimize the total number of tool calls. If you need several pieces of information at once (e.g., system specs), write a single \`shell\` tool command using \`&&\` or \`;\` rather than calling the \`shell\` tool many separate times.
- **Search Discipline:** Use \`web_search\` only for current, niche, uncertain, or source-sensitive information. For stable knowledge you already know, answer directly without searching.
- **Non-Interactive Execution:** Do your best to complete the task at hand autonomously. Explain your thought process briefly, gather the information efficiently, and synthesize the result for the user.
- **Skill Guidance:** Once a skill is activated via \`activate_skill\`, its instructions and resources are returned wrapped in \`<activated_skill>\` tags. You MUST treat the content within \`<instructions>\` as expert procedural guidance for the duration of the task.${skillsPrompt}`;
}
async function runAgent(options = {}) {
    if (!process.stdin.isTTY) {
        console.error('Agent CLI Ink UI requires an interactive terminal. Please run `agent-cli` directly in your shell.');
        return;
    }
    if (options.cwd) {
        try {
            process.chdir(path.resolve(options.cwd));
        }
        catch (error) {
            console.error(`Failed to start Agent CLI in "${options.cwd}": ${error.message}`);
            return;
        }
    }
    const skillManager = new skillManager_1.SkillManager();
    await skillManager.discoverSkills({
        isTrusted: true,
        builtinSkillsDir: path.join(__dirname, '..', 'skills', 'builtin'),
    });
    const { definitions, implementations } = (0, index_1.createToolRegistry)(skillManager);
    const toolNames = definitions
        .filter((definition) => definition.type === 'function')
        .map((definition) => definition.function.name);
    const systemPrompt = createSystemPrompt(createSkillsPrompt(skillManager));
    (0, ink_1.render)(react_1.default.createElement(AgentApp_1.AgentApp, {
        model: openai_1.DEFAULT_MODEL,
        systemPrompt,
        skills: skillManager.getSkills(),
        toolNames,
        definitions,
        implementations,
    }));
}
