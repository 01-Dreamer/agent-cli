import { Tool } from '../types';
export interface ShellArgs {
    command: string;
}
export declare class ShellTool extends Tool<ShellArgs> {
    readonly name = "shell";
    readonly description = "Shell: Executes a shell command in the workspace directory. Ideal for running scripts, git commands, npm install, or curl.";
    readonly parameters: {
        type: string;
        properties: {
            command: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    private readonly workspaceDir;
    execute(args: ShellArgs): Promise<string>;
}
