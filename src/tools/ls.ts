import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../types';

export interface ListDirectoryArgs {
    dirPath?: string;
}

export class ListDirectoryTool extends Tool<ListDirectoryArgs> {
    readonly name = "list_directory";
    readonly description = "ListDirectory: Lists the files and folders in a workspace directory.";
    readonly parameters = {
        type: "object",
        properties: {
            dirPath: {
                type: "string",
                description: "The path of the directory to list (relative to the workspace root). Defaults to the root directory if empty.",
            },
        }
        // no required parameters since we allow empty dirPath
    };

    /**
     * 临时硬编码的安全沙箱目录
     */
    private readonly workspaceDir = path.resolve(process.cwd(), 'workspace_test');

    async execute(args: ListDirectoryArgs): Promise<string> {
        try {
            const targetPath = args.dirPath ? path.resolve(this.workspaceDir, args.dirPath) : this.workspaceDir;
            
            // 安全检查
            if (!targetPath.startsWith(this.workspaceDir)) {
                return JSON.stringify({ error: `Permission denied: Cannot list outside of workspace_test directory.` });
            }

            const entries = await fs.readdir(targetPath, { withFileTypes: true });
            
            const filesAndDirs = entries.map(entry => ({
                name: entry.name,
                isDirectory: entry.isDirectory()
            }));

            return JSON.stringify({ path: args.dirPath || ".", items: filesAndDirs });
        } catch (error: any) {
            return JSON.stringify({ error: `Failed to list directory: ${error.message}` });
        }
    }
}
