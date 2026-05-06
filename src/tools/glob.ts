import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../types';
import { globToRegExp, resolveWorkspacePath, toPosixPath, walkFiles } from './utils';

export interface GlobArgs {
    pattern: string;
    dirPath?: string;
    limit?: number;
}

export class GlobTool extends Tool<GlobArgs> {
    readonly name = "glob";
    readonly description = "Glob: Finds files in the workspace by glob pattern.";
    readonly parameters = {
        type: "object",
        properties: {
            pattern: {
                type: "string",
                description: "Glob pattern to match, e.g. \"**/*.ts\" or \"src/**/*.md\".",
            },
            dirPath: {
                type: "string",
                description: "Optional directory to search in, relative to workspace_test. Defaults to workspace root.",
            },
            limit: {
                type: "number",
                description: "Maximum number of matched files to return. Defaults to 200.",
            },
        },
        required: ["pattern"],
    };

    async execute(args: GlobArgs): Promise<string> {
        try {
            const { absolutePath, workspaceDir, error } = resolveWorkspacePath(args.dirPath || '.');
            if (error) return JSON.stringify({ error });

            const stats = await fs.stat(absolutePath);
            if (!stats.isDirectory()) {
                return JSON.stringify({ error: `Path is not a directory: ${args.dirPath || '.'}` });
            }

            const regex = globToRegExp(args.pattern);
            const files = await walkFiles(absolutePath);
            const matches = files
                .map((file) => path.relative(workspaceDir, file))
                .filter((relativePath) => regex.test(toPosixPath(path.relative(absolutePath, path.resolve(workspaceDir, relativePath)))))
                .sort();

            const limit = Math.max(1, args.limit ?? 200);
            return JSON.stringify({
                pattern: args.pattern,
                dirPath: args.dirPath || ".",
                count: matches.length,
                truncated: matches.length > limit,
                files: matches.slice(0, limit),
            }, null, 2);
        } catch (error: any) {
            return JSON.stringify({ error: `Glob failed: ${error.message}` });
        }
    }
}
