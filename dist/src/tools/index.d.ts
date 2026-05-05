import OpenAI from 'openai';
export declare const definitions: OpenAI.Chat.ChatCompletionTool[];
export declare const implementations: Record<string, (args: any) => Promise<string> | string>;
