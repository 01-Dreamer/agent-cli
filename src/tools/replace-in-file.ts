import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from './tool';
import { resolveWorkspacePath } from './utils';

export interface ReplaceInFileArgs {
    filePath: string;
    oldString: string;
    newString: string;
    allowMultiple?: boolean;
}

export class ReplaceInFileTool extends Tool<ReplaceInFileArgs> {
    readonly name = "replace_in_file";
    readonly description = "ReplaceInFile: Replaces an exact string in a workspace file. Useful for precise edits without rewriting the whole file.";
    readonly parameters = {
        type: "object",
        properties: {
            filePath: {
                type: "string",
                description: "File to edit, relative to current working directory.",
            },
            searchString: { type: "string", description: "Exact string to replace." },
            replaceString: { type: "string", description: "Replacement string." },
            allowMultiple: { type: "boolean", description: "Allow replacing multiple occurrences. Defaults to false." },
        },
        required: ["filePath", "searchString", "replaceString"],
    };

    async execute(args: ReplaceInFileArgs): Promise<string> {
        try {
            const { absolutePath, error } = resolveWorkspacePath(args.filePath);
            if (error) return JSON.stringify({ error });
            if (args.oldString.length === 0) {
                return JSON.stringify({ error: "`oldString` cannot be empty." });
            }

            const content = await fs.readFile(absolutePath, 'utf-8');
            const occurrences = content.split(args.oldString).length - 1;
            if (occurrences === 0) {
                return JSON.stringify({ error: "No exact match found for oldString." });
            }
            if (!args.allowMultiple && occurrences > 1) {
                return JSON.stringify({ error: `Found ${occurrences} matches. Set allowMultiple=true to replace all of them.` });
            }

            const updated = content.split(args.oldString).join(args.newString);
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });
            await fs.writeFile(absolutePath, updated, 'utf-8');

            return JSON.stringify({
                success: true,
                filePath: args.filePath,
                replacements: occurrences,
            });
        } catch (error: any) {
            return JSON.stringify({ error: `ReplaceInFile failed: ${error.message}` });
        }
    }
}
