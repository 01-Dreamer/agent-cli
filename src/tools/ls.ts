import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from './tool';
import OpenAI from 'openai';

export class ListDirectoryTool implements Tool<any> {
    name = 'ls';
    description = 'List files and directories in a given path.';
    parameters = {
        type: "object",
        properties: {
            path: {
                type: 'string',
                description: 'The path to list (relative to the current directory). Defaults to the current directory if empty.',
            },
        },
        required: [],
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
            const targetPath = args.path || '.';
            const absolutePath = path.resolve(this.workspaceDir, targetPath);

            if (!absolutePath.startsWith(this.workspaceDir)) {
                return JSON.stringify({ error: `Permission denied: Cannot list outside of workspace directory.` });
            }

            const files = await fs.readdir(absolutePath, { withFileTypes: true });
            const fileDetails = files.map(file => ({
                name: file.name,
                isDirectory: file.isDirectory(),
            }));

            return JSON.stringify({ path: targetPath, items: fileDetails });
        } catch (error: any) {
            return JSON.stringify({ error: `Failed to list directory: ${error.message}` });
        }
    }
}
