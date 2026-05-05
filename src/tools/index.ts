import OpenAI from 'openai';
import { Tool } from '../types';
import { ReadFileTool } from './read-file';
import { WriteFileTool } from './write-file';
import { ListDirectoryTool } from './ls';
import { ShellTool } from './shell';
import { WebSearchTool } from './web-search';
import { GlobTool } from './glob';
import { GrepTool } from './grep';
import { ReadManyFilesTool } from './read-many-files';
import { ReplaceInFileTool } from './replace-in-file';
import { WebFetchTool } from './web-fetch';

// 在这里实例化所有的工具类
const registeredTools: Tool[] = [
    new ReadFileTool(),
    new WriteFileTool(),
    new ListDirectoryTool(),
    new ShellTool(),
    new WebSearchTool(),
    new GlobTool(),
    new GrepTool(),
    new ReadManyFilesTool(),
    new ReplaceInFileTool(),
    new WebFetchTool()
];

// 组装传给大模型的 tools 定义
export const definitions: OpenAI.Chat.ChatCompletionTool[] = registeredTools.map(t => t.definition);

// 一个注册表，用来通过 functionName 映射到实际要执行的方法
export const implementations: Record<string, (args: any) => Promise<string> | string> = {};
for (const tool of registeredTools) {
    implementations[tool.name] = tool.execute.bind(tool);
}
