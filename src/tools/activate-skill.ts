import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../types';
import { SkillManager } from '../skills/skillManager';

export interface ActivateSkillArgs {
    name: string;
}

export class ActivateSkillTool extends Tool<ActivateSkillArgs> {
    readonly name = 'activate_skill';
    readonly description = 'ActivateSkill: Activates a discovered skill and returns its detailed instructions and available resources.';
    readonly parameters = {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'The name of the skill to activate.',
            },
        },
        required: ['name'],
    };

    constructor(private readonly skillManager: SkillManager) {
        super();
    }

    async execute(args: ActivateSkillArgs): Promise<string> {
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

async function getFolderStructure(rootDir: string): Promise<string> {
    const lines: string[] = [];
    const maxEntries = 200;

    async function walk(currentDir: string, depth: number) {
        if (lines.length >= maxEntries || depth > 4) return;

        let entries;
        try {
            entries = await fs.readdir(currentDir, { withFileTypes: true });
        } catch {
            return;
        }

        entries.sort((a, b) => {
            if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        for (const entry of entries) {
            if (lines.length >= maxEntries) break;
            if (entry.name === 'node_modules' || entry.name === '.git') continue;

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

function indent(value: string, spaces: number): string {
    const prefix = ' '.repeat(spaces);
    return value
        .split(/\r?\n/)
        .map((line) => `${prefix}${line}`)
        .join('\n');
}
