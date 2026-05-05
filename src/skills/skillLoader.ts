import * as fs from 'fs/promises';
import * as path from 'path';

export interface SkillDefinition {
    name: string;
    description: string;
    location: string;
    body: string;
}

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?/;

export async function loadSkillsFromDir(dirPath: string): Promise<SkillDefinition[]> {
    const skills: SkillDefinition[] = [];
    
    try {
        const stats = await fs.stat(dirPath);
        if (!stats.isDirectory()) return skills;

        const files = await searchForSkillFiles(dirPath);
        for (const file of files) {
            const skill = await loadSkillFromFile(file);
            if (skill) skills.push(skill);
        }
    } catch (e) {
        // directory doesn't exist or is inaccessible
    }

    return skills;
}

async function searchForSkillFiles(dir: string): Promise<string[]> {
    const result: string[] = [];
    
    async function scan(currentDir: string) {
        try {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name === 'node_modules' || entry.name === '.git') continue;
                
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    await scan(fullPath);
                } else if (entry.name === 'SKILL.md') {
                    result.push(fullPath);
                }
            }
        } catch (e) {
            // ignore permission errors
        }
    }
    
    await scan(dir);
    return result;
}

export async function loadSkillFromFile(filePath: string): Promise<SkillDefinition | null> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const match = content.match(FRONTMATTER_REGEX);
        
        if (!match) return null;
        
        const frontmatterStr = match[1];
        const body = match[2]?.trim() ?? '';
        
        const nameMatch = frontmatterStr.match(/name:\s*(.*)/);
        const descMatch = frontmatterStr.match(/description:\s*(.*)/);
        
        if (nameMatch && descMatch) {
            return {
                name: nameMatch[1].trim(),
                description: descMatch[1].trim(),
                location: filePath,
                body
            };
        }
    } catch (e) {
        // Failed to parse
    }
    return null;
}
