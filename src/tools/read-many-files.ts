import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../types';
import { matchesAnyGlob, resolveWorkspacePath, toPosixPath, walkFiles } from './utils';

export interface ReadManyFilesArgs {
    include: string[];
    exclude?: string[];
    maxBytes?: number;
}

export class ReadManyFilesTool extends Tool<ReadManyFilesArgs> {
    readonly name = "read_many_files";
    readonly description = "ReadManyFiles: Reads and concatenates multiple workspace files selected by glob patterns.";
    readonly parameters = {
        type: "object",
        properties: {
            include: {
                type: "array",
                items: { type: "string" },
                description: "Glob patterns to include, e.g. [\"**/*.ts\", \"README.md\"].",
            },
            exclude: {
                type: "array",
                items: { type: "string" },
                description: "Optional glob patterns to exclude.",
            },
            maxBytes: {
                type: "number",
                description: "Maximum total bytes to return. Defaults to 100000.",
            },
        },
        required: ["include"],
    };

    async execute(args: ReadManyFilesArgs): Promise<string> {
        try {
            if (!Array.isArray(args.include) || args.include.length === 0) {
                return JSON.stringify({ error: "`include` must be a non-empty array." });
            }

            const { absolutePath, workspaceDir, error } = resolveWorkspacePath('.');
            if (error) return JSON.stringify({ error });

            const allFiles = await walkFiles(absolutePath);
            const exclude = args.exclude ?? [];
            const selectedFiles = allFiles
                .map((file) => ({ absolute: file, relative: toPosixPath(path.relative(workspaceDir, file)) }))
                .filter(({ relative }) => matchesAnyGlob(relative, args.include))
                .filter(({ relative }) => !matchesAnyGlob(relative, exclude))
                .sort((a, b) => a.relative.localeCompare(b.relative));

            const maxBytes = Math.max(1, args.maxBytes ?? 100000);
            let usedBytes = 0;
            let output = "";
            const skipped: string[] = [];

            for (const file of selectedFiles) {
                let content: string;
                try {
                    content = await fs.readFile(file.absolute, 'utf-8');
                } catch {
                    skipped.push(file.relative);
                    continue;
                }

                const block = `--- ${file.relative} ---\n${content}\n`;
                const blockBytes = Buffer.byteLength(block, 'utf-8');
                if (usedBytes + blockBytes > maxBytes) {
                    skipped.push(file.relative);
                    continue;
                }

                output += block;
                usedBytes += blockBytes;
            }

            return JSON.stringify({
                count: selectedFiles.length,
                returnedBytes: usedBytes,
                skipped,
                content: output,
            }, null, 2);
        } catch (error: any) {
            return JSON.stringify({ error: `ReadManyFiles failed: ${error.message}` });
        }
    }
}
