import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../types';
import { matchesAnyGlob, resolveWorkspacePath, toPosixPath, walkFiles } from './utils';

export interface GrepArgs {
    pattern: string;
    dirPath?: string;
    includePattern?: string;
    excludePattern?: string;
    caseSensitive?: boolean;
    namesOnly?: boolean;
    maxMatches?: number;
}

export class GrepTool extends Tool<GrepArgs> {
    readonly name = "grep";
    readonly description = "Grep: Searches file contents in the workspace using a regular expression.";
    readonly parameters = {
        type: "object",
        properties: {
            pattern: { type: "string", description: "Regular expression to search for." },
            dirPath: { type: "string", description: "Directory to search in, relative to workspace_test. Defaults to workspace root." },
            includePattern: { type: "string", description: "Optional glob for files to include, e.g. \"**/*.ts\"." },
            excludePattern: { type: "string", description: "Optional glob for files to exclude, e.g. \"dist/**\"." },
            caseSensitive: { type: "boolean", description: "Whether search is case-sensitive. Defaults to false." },
            namesOnly: { type: "boolean", description: "Return only file names containing matches." },
            maxMatches: { type: "number", description: "Maximum number of matches to return. Defaults to 100." },
        },
        required: ["pattern"],
    };

    async execute(args: GrepArgs): Promise<string> {
        try {
            const { absolutePath, workspaceDir, error } = resolveWorkspacePath(args.dirPath || '.');
            if (error) return JSON.stringify({ error });

            const regex = new RegExp(args.pattern, args.caseSensitive ? '' : 'i');
            const files = await walkFiles(absolutePath);
            const maxMatches = Math.max(1, args.maxMatches ?? 100);
            const matches: Array<{ filePath: string; lineNumber: number; line: string }> = [];
            const matchedFiles = new Set<string>();

            for (const file of files) {
                const relativeToWorkspace = toPosixPath(path.relative(workspaceDir, file));
                const relativeToSearchDir = toPosixPath(path.relative(absolutePath, file));
                if (args.includePattern && !matchesAnyGlob(relativeToSearchDir, [args.includePattern])) continue;
                if (args.excludePattern && matchesAnyGlob(relativeToSearchDir, [args.excludePattern])) continue;

                let content: string;
                try {
                    content = await fs.readFile(file, 'utf-8');
                } catch {
                    continue;
                }

                const lines = content.split(/\r?\n/);
                for (let index = 0; index < lines.length; index++) {
                    if (!regex.test(lines[index])) continue;
                    regex.lastIndex = 0;
                    matchedFiles.add(relativeToWorkspace);
                    if (!args.namesOnly) {
                        matches.push({
                            filePath: relativeToWorkspace,
                            lineNumber: index + 1,
                            line: lines[index],
                        });
                    }
                    if (!args.namesOnly && matches.length >= maxMatches) break;
                }
                if (!args.namesOnly && matches.length >= maxMatches) break;
            }

            return JSON.stringify(args.namesOnly ? {
                pattern: args.pattern,
                count: matchedFiles.size,
                files: Array.from(matchedFiles).sort(),
            } : {
                pattern: args.pattern,
                count: matches.length,
                truncated: matches.length >= maxMatches,
                matches,
            }, null, 2);
        } catch (error: any) {
            return JSON.stringify({ error: `Grep failed: ${error.message}` });
        }
    }
}
