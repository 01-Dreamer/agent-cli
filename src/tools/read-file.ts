import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../types';

export interface ReadFileArgs {
    filePath: string;
}

export class ReadFileTool extends Tool<ReadFileArgs> {
    readonly name = "read_file";
    readonly description = "ReadFile: Reads the contents of a file in the workspace.";
    readonly parameters = {
        type: "object",
        properties: {
            filePath: {
                type: "string",
                description: "The path to the file to read (relative to the workspace root).",
            },
        },
        required: ["filePath"],
    };

    /**
     * 临时硬编码的安全沙箱目录，防止模型随意读取系统文件。
     */
    private readonly workspaceDir = path.resolve(process.cwd(), 'workspace_test');

    async execute(args: ReadFileArgs): Promise<string> {
        try {
            // 解析绝对路径，确保文件在 workspace_test 范围内
            const absolutePath = path.resolve(this.workspaceDir, args.filePath);
            
            // 安全检查：防止目录穿越 (e.g. "../../../etc/passwd")
            if (!absolutePath.startsWith(this.workspaceDir)) {
                return JSON.stringify({ error: `Permission denied: Cannot read outside of workspace_test directory.` });
            }

            const content = await fs.readFile(absolutePath, 'utf-8');
            return content;
        } catch (error: any) {
            return JSON.stringify({ error: `Failed to read file: ${error.message}` });
        }
    }
}
