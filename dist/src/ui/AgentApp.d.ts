import React from 'react';
import OpenAI from 'openai';
import { SkillDefinition } from '../skills/skillLoader';
type ToolImplementation = (args: any) => Promise<string> | string;
interface AgentAppProps {
    model: string;
    systemPrompt: string;
    skills: SkillDefinition[];
    toolNames: string[];
    definitions: OpenAI.Chat.ChatCompletionTool[];
    implementations: Record<string, ToolImplementation>;
}
export declare function AgentApp({ model, systemPrompt, skills, toolNames, definitions, implementations, }: AgentAppProps): React.JSX.Element;
export {};
