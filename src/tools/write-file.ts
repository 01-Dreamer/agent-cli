import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../types';
import OpenAI from 'openai';

export class WriteFileTool implements Tool<any> {
    name = 'write_file';
    description = 'Write contents to a file. Overwrites if it exists, creates if it does not.';
    parameters = {
        type: 'object',
        properties: {
            filePath: {
                type: 'string',
                description: 'The path to the file to write (relative to the workspace root).',
            },
            content: {
                type: 'string',
                description: 'The entire content to write into the file.',
            }
        },
        required: ["filePath", "content"],
    };

    get definition(): OpenAI.Chat.ChatCompletionTool {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: this.parameters,
            },
        };
    }

    private get workspaceDir(): string {
        return process.cwd();
    }

    async execute(args: any): Promise<string> {
        try {
            const absolutePath = path.resolve(this.workspaceDir, args.filePath);
            if (!absolutePath.startsWith(this.workspaceDir)) {
                return JSON.stringify({ error: `Permission denied: Cannot write outside of workspace directory.` });
            }

            const dir = path.dirname(absolutePath);
            await fs.mkdir(dir, { recursive: true });

            await fs.writeFile(absolutePath, args.content, 'utf-8');
            return JSON.stringify({ success: true, message: `Successfully wrote file to ${args.filePath}` });
        } catch (error: any) {
            return JSON.stringify({ error: `Failed to write file: ${error.message}` });
        }
    }
}
