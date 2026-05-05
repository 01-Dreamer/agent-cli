import * as fs from 'fs/promises';
import * as path from 'path';

export function getWorkspaceDir(): string {
    return path.resolve(process.cwd(), 'workspace_test');
}

export function resolveWorkspacePath(inputPath = '.'): { absolutePath: string; workspaceDir: string; error?: string } {
    const workspaceDir = getWorkspaceDir();
    const absolutePath = path.resolve(workspaceDir, inputPath);
    const relative = path.relative(workspaceDir, absolutePath);

    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        return {
            absolutePath,
            workspaceDir,
            error: `Permission denied: Cannot access outside of workspace_test directory.`,
        };
    }

    return { absolutePath, workspaceDir };
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

export async function walkFiles(rootDir: string, options?: { ignoreDirs?: string[] }): Promise<string[]> {
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

    await walk(rootDir);
    return files;
}
