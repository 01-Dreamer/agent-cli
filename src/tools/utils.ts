import * as fs from 'fs/promises';
import * as path from 'path';

export function getWorkspaceDir(): string {
    return process.cwd();
}

export function resolveWorkspacePath(targetPath: string): { valid: boolean; absolutePath: string; workspaceDir: string; error?: string } {
    const workspaceDir = getWorkspaceDir();
    const absolutePath = path.resolve(workspaceDir, targetPath);

    if (!absolutePath.startsWith(workspaceDir)) {
        return {
            valid: false,
            absolutePath,
            workspaceDir,
            error: `Permission denied: Cannot access outside of the current working directory.`,
        };
    }

    return { valid: true, absolutePath, workspaceDir };
}

export function toPosixPath(filePath: string): string {
    return filePath.split(path.sep).join('/');
}

export function globToRegExp(pattern: string): RegExp {
    const normalized = toPosixPath(pattern);
    let source = '';

    for (let i = 0; i < normalized.length; i++) {
        const char = normalized[i];
        const next = normalized[i + 1];

        if (char === '*') {
            if (next === '*') {
                const after = normalized[i + 2];
                if (after === '/') {
                    source += '(?:.*\\/)?';
                    i += 2;
                } else {
                    source += '.*';
                    i++;
                }
            } else {
                source += '[^/]*';
            }
            continue;
        }

        if (char === '?') {
            source += '[^/]';
            continue;
        }

        if ('\\^$+?.()|{}[]'.includes(char)) {
            source += `\\${char}`;
        } else {
            source += char;
        }
    }

    return new RegExp(`^${source}$`);
}

export function matchesAnyGlob(relativePath: string, patterns: string[] = []): boolean {
    const normalizedPath = toPosixPath(relativePath);
    return patterns.some((pattern) => globToRegExp(pattern).test(normalizedPath));
}

export async function walkFiles(
    dir: string,
    options?: { ignoreDirs?: string[] }
): Promise<string[]> {
    const ignoreDirs = new Set(options?.ignoreDirs ?? ['.git', 'node_modules']);
    const files: string[] = [];

    async function walk(currentDir: string) {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isDirectory() && ignoreDirs.has(entry.name)) continue;

            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await walk(fullPath);
            } else if (entry.isFile()) {
                files.push(fullPath);
            }
        }
    }

    await walk(dir);
    return files;
}
