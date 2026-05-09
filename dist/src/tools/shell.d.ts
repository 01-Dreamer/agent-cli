import { Tool } from './tool';
import OpenAI from 'openai';
export declare class ShellTool implements Tool<any> {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            command: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    get definition(): OpenAI.Chat.ChatCompletionTool;
    private get workspaceDir();
    execute(args: any): Promise<string>;
}
