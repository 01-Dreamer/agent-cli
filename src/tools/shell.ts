import { exec } from 'child_process';
import * as path from 'path';
import * as util from 'util';
import { Tool } from '../types';

const execAsync = util.promisify(exec);

export interface ShellArgs {
    command: string;
}

export class ShellTool extends Tool<ShellArgs> {
    readonly name = "shell";
    readonly description = "Shell: Executes a shell command in the workspace directory. Ideal for running scripts, git commands, npm install, or curl.";
    readonly parameters = {
        type: "object",
        properties: {
            command: {
                type: "string",
                description: "The shell command to execute.",
            },
        },
        required: ["command"],
    };

    private readonly workspaceDir = path.resolve(process.cwd(), 'workspace_test');

    async execute(args: ShellArgs): Promise<string> {
        try {
            // 在 workspace_test 环境内执行命令
            const { stdout, stderr } = await execAsync(args.command, { 
                cwd: this.workspaceDir,
                timeout: 30000 // 30秒超时防止卡死
            });
            
            let result = "";
            if (stdout) result += `STDOUT:\n${stdout}\n`;
            if (stderr) result += `STDERR:\n${stderr}\n`;
            
            return result || JSON.stringify({ success: true, message: "Command executed successfully with no output." });
        } catch (error: any) {
            return JSON.stringify({ 
                error: `Command failed: ${error.message}`,
                stdout: error.stdout,
                stderr: error.stderr
            });
        }
    }
}
