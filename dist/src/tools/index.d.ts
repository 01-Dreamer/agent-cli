import OpenAI from 'openai';
import { Tool } from './tool';
import { SkillManager } from '../skills/skillManager';
export declare function createToolRegistry(skillManager?: SkillManager): {
    definitions: OpenAI.Chat.Completions.ChatCompletionTool[];
    implementations: Record<string, (args: any) => Promise<string> | string>;
    registeredTools: Tool<any>[];
};
export declare const definitions: OpenAI.Chat.Completions.ChatCompletionTool[];
export declare const implementations: Record<string, (args: any) => Promise<string> | string>;
