import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../types';
import OpenAI from 'openai';

export class ReadFileTool implements Tool<any> {
    name = 'read_file';
    description = 'Read the contents of a file.';
    parameters = {
        type: "object",
        properties: {
            filePath: {
                type: "string",
                description: "File to read, relative to current working directory.",
            },
        },
        required: ["filePath"],
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
            // 解析绝对路径，确保文件在当前工作目录范围内
            const absolutePath = path.resolve(this.workspaceDir, args.filePath);
            if (!absolutePath.startsWith(this.workspaceDir)) {
                return JSON.stringify({ error: `Permission denied: Cannot read outside of workspace directory.` });
            }
            
            const fileContent = await fs.readFile(absolutePath, 'utf-8');
            return JSON.stringify({ content: fileContent });
        } catch (error: any) {
            return JSON.stringify({ error: `Failed to read file: ${error.message}` });
        }
    }
}
