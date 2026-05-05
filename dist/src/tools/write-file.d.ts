import { Tool } from '../types';
export interface WriteFileArgs {
    filePath: string;
    content: string;
}
export declare class WriteFileTool extends Tool<WriteFileArgs> {
    readonly name = "write_file";
    readonly description = "WriteFile: Writes content to a file in the workspace. Overwrites if it exists, creates if it does not.";
    readonly parameters: {
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
    /**
     * 临时硬编码的安全沙箱目录，防止模型随意写入系统文件。
     */
    private readonly workspaceDir;
    execute(args: WriteFileArgs): Promise<string>;
}
