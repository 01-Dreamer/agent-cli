import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Represents the definition of an Agent Skill.
 */
export interface SkillDefinition {
    /** The unique name of the skill. */
    name: string;
    /** A concise description of what the skill does. */
    description: string;
    /** The absolute path to the skill's source file on disk. */
    location: string;
    /** The core logic/instructions of the skill. */
    body: string;
    /** Whether the skill is currently disabled. */
    disabled?: boolean;
    /** Whether the skill is a built-in skill. */
    isBuiltin?: boolean;
    /** The name of the extension that provided this skill, if any. */
    extensionName?: string;
}

export const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?/;

/**
 * Parses frontmatter content using a small YAML-compatible parser.
 *
 * This parser supports the skill fields agent-cli currently uses:
 * `name` and `description`, including indented fields, quoted values,
 * missing spaces after colons, and multi-line descriptions.
 */
export function parseFrontmatter(content: string): { name: string; description: string } | null {
    const simple = parseSimpleFrontmatter(content);
    if (!simple) return null;

    return {
        name: unquote(simple.name),
        description: unquote(simple.description),
    };
}

function parseSimpleFrontmatter(content: string): { name: string; description: string } | null {
    const lines = content.split(/\r?\n/);
    let name: string | undefined;
    let description: string | undefined;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const nameMatch = line.match(/^\s*name:\s*(.*)$/);
        if (nameMatch) {
            name = nameMatch[1].trim();
            continue;
        }

        const descMatch = line.match(/^\s*description:\s*(.*)$/);
        if (descMatch) {
            const descLines = [descMatch[1].trim()];

            while (i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                if (nextLine.match(/^[ \t]+\S/)) {
                    descLines.push(nextLine.trim());
                    i++;
                } else {
                    break;
                }
            }

            description = descLines.filter(Boolean).join(' ');
            continue;
        }
    }

    if (name !== undefined && description !== undefined) {
        return { name, description };
    }
    return null;
}

function unquote(value: string): string {
    const trimmed = value.trim();
    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}

/**
 * Discovers and loads all skills in the provided directory.
 */
export async function loadSkillsFromDir(dir: string): Promise<SkillDefinition[]> {
    const discoveredSkills: SkillDefinition[] = [];

    try {
        const absoluteSearchPath = path.resolve(dir);
        const stats = await fs.stat(absoluteSearchPath).catch(() => null);
        if (!stats || !stats.isDirectory()) {
            return [];
        }

        const skillFiles = await findSkillFiles(absoluteSearchPath);
        for (const skillFile of skillFiles) {
            const metadata = await loadSkillFromFile(skillFile);
            if (metadata) {
                discoveredSkills.push(metadata);
            }
        }

        if (discoveredSkills.length === 0) {
            const files = await fs.readdir(absoluteSearchPath);
            if (files.length > 0) {
                console.debug(
                    `Failed to load skills from ${absoluteSearchPath}. The directory is not empty but no valid skills were discovered. Please ensure SKILL.md files are present in subdirectories and have valid frontmatter.`,
                );
            }
        }
    } catch (error) {
        console.warn(`Error discovering skills in ${dir}:`, error);
    }

    return discoveredSkills;
}

async function findSkillFiles(absoluteSearchPath: string): Promise<string[]> {
    const files: string[] = [];
    const rootSkillFile = path.join(absoluteSearchPath, 'SKILL.md');

    if (await isFile(rootSkillFile)) {
        files.push(rootSkillFile);
    }

    const entries = await fs.readdir(absoluteSearchPath, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === 'node_modules' || entry.name === '.git') continue;

        const skillFile = path.join(absoluteSearchPath, entry.name, 'SKILL.md');
        if (await isFile(skillFile)) {
            files.push(skillFile);
        }
    }

    return files.sort();
}

async function isFile(filePath: string): Promise<boolean> {
    const stats = await fs.stat(filePath).catch(() => null);
    return Boolean(stats?.isFile());
}

/**
 * Loads a single skill from a SKILL.md file.
 */
export async function loadSkillFromFile(filePath: string): Promise<SkillDefinition | null> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const match = content.match(FRONTMATTER_REGEX);
        if (!match) {
            return null;
        }

        const frontmatter = parseFrontmatter(match[1]);
        if (!frontmatter) {
            return null;
        }

        const sanitizedName = frontmatter.name.replace(/[:\\/<>*?"|]/g, '-');

        return {
            name: sanitizedName,
            description: frontmatter.description,
            location: filePath,
            body: match[2]?.trim() ?? '',
        };
    } catch (error) {
        console.debug(`Error parsing skill file ${filePath}:`, error);
        return null;
    }
}
