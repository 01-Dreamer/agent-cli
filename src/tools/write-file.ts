import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../types';

export interface WriteFileArgs {
    filePath: string;
    content: string;
}

export class WriteFileTool extends Tool<WriteFileArgs> {
    readonly name = "write_file";
    readonly description = "WriteFile: Writes content to a file in the workspace. Overwrites if it exists, creates if it does not.";
    readonly parameters = {
        type: "object",
        properties: {
            filePath: {
                type: "string",
                description: "The path to the file to write (relative to the workspace root).",
            },
            content: {
                type: "string",
                description: "The entire content to write into the file.",
            }
        },
        required: ["filePath", "content"],
    };

    /**
     * 临时硬编码的安全沙箱目录，防止模型随意写入系统文件。
     */
    private readonly workspaceDir = path.resolve(process.cwd(), 'workspace_test');

    async execute(args: WriteFileArgs): Promise<string> {
        try {
            // 解析绝对路径
            const absolutePath = path.resolve(this.workspaceDir, args.filePath);
            
            // 安全检查：防止目录穿越
            if (!absolutePath.startsWith(this.workspaceDir)) {
                return JSON.stringify({ error: `Permission denied: Cannot write outside of workspace_test directory.` });
            }

            // 如果该文件在一些多级未被创建的子目录下，我们需要自动帮它创建父目录
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });

            await fs.writeFile(absolutePath, args.content, 'utf-8');
            return JSON.stringify({ success: true, message: `Successfully wrote file to ${args.filePath}` });
        } catch (error: any) {
            return JSON.stringify({ error: `Failed to write file: ${error.message}` });
        }
    }
}
