import * as child_process from 'child_process';
import * as util from 'util';
import * as path from 'path';
import { Tool } from './tool';
import OpenAI from 'openai';

const execAsync = util.promisify(child_process.exec);

export class ShellTool implements Tool<any> {
    name = 'shell';
    description = 'Execute a shell command. Use carefully.';
    parameters = {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'The shell command to execute.',
            },
        },
        required: ['command'],
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
            // 在当前工作目录下执行命令
            const { stdout, stderr } = await execAsync(args.command, {
                cwd: this.workspaceDir,
                shell: '/bin/bash',
                timeout: 30000, // 30秒超时防止卡死
            });

            let result = '';
            if (stdout) result += `STDOUT:\n${stdout}\n`;
            if (stderr) result += `STDERR:\n${stderr}\n`;

            return (
                result ||
                JSON.stringify({
                    success: true,
                    message: 'Command executed successfully with no output.',
                })
            );
        } catch (error: any) {
            return JSON.stringify({
                error: `Command failed: ${error.message}`,
                stdout: error.stdout,
                stderr: error.stderr,
            });
        }
    }
}
