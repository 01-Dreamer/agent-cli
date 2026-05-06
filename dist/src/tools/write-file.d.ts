import { Tool } from '../types';
import OpenAI from 'openai';
export declare class WriteFileTool implements Tool<any> {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            filePath: {
                type: string;
                description: string;
            };
            content: {
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
