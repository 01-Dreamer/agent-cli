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
exports.ActivateSkillTool = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const types_1 = require("../types");
class ActivateSkillTool extends types_1.Tool {
    skillManager;
    name = 'activate_skill';
    description = 'ActivateSkill: Activates a discovered skill and returns its detailed instructions and available resources.';
    parameters = {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'The name of the skill to activate.',
            },
        },
        required: ['name'],
    };
    constructor(skillManager) {
        super();
        this.skillManager = skillManager;
    }
    async execute(args) {
        const skillName = args.name;
        const skill = this.skillManager.getSkill(skillName);
        if (!skill) {
            const availableSkills = this.skillManager.getSkills().map((item) => item.name).join(', ');
            return JSON.stringify({
                error: `Skill "${skillName}" not found. Available skills are: ${availableSkills}`,
            });
        }
        this.skillManager.activateSkill(skillName);
        const baseDirectory = path.dirname(skill.location);
        const folderStructure = await getFolderStructure(baseDirectory);
        return `<activated_skill name="${skill.name}">
  <base_directory>${baseDirectory}</base_directory>

  <instructions>
${indent(skill.body, 4)}
  </instructions>

  <available_resources>
${indent(folderStructure, 4)}
  </available_resources>
</activated_skill>`;
    }
}
exports.ActivateSkillTool = ActivateSkillTool;
async function getFolderStructure(rootDir) {
    const lines = [];
    const maxEntries = 200;
    async function walk(currentDir, depth) {
        if (lines.length >= maxEntries || depth > 4)
            return;
        let entries;
        try {
            entries = await fs.readdir(currentDir, { withFileTypes: true });
        }
        catch {
            return;
        }
        entries.sort((a, b) => {
            if (a.isDirectory() !== b.isDirectory())
                return a.isDirectory() ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        for (const entry of entries) {
            if (lines.length >= maxEntries)
                break;
            if (entry.name === 'node_modules' || entry.name === '.git')
                continue;
            const fullPath = path.join(currentDir, entry.name);
            const relativePath = path.relative(rootDir, fullPath) || entry.name;
            lines.push(`${'  '.repeat(depth)}${entry.isDirectory() ? `${entry.name}/` : relativePath}`);
            if (entry.isDirectory()) {
                await walk(fullPath, depth + 1);
            }
        }
    }
    await walk(rootDir, 0);
    if (lines.length >= maxEntries) {
        lines.push('...');
    }
    return lines.join('\n');
}
function indent(value, spaces) {
    const prefix = ' '.repeat(spaces);
    return value
        .split(/\r?\n/)
        .map((line) => `${prefix}${line}`)
        .join('\n');
}
