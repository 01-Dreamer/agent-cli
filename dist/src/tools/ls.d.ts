import { Tool } from '../types';
import OpenAI from 'openai';
export declare class ListDirectoryTool implements Tool<any> {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            path: {
                type: string;
                description: string;
            };
        };
        required: never[];
    };
    get definition(): OpenAI.Chat.ChatCompletionTool;
    private get workspaceDir();
    execute(args: any): Promise<string>;
}
