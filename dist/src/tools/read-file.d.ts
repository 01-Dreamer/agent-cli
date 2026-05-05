import { Tool } from '../types';
export interface ReadFileArgs {
    filePath: string;
}
export declare class ReadFileTool extends Tool<ReadFileArgs> {
    readonly name = "read_file";
    readonly description = "ReadFile: Reads the contents of a file in the workspace.";
    readonly parameters: {
        type: string;
        properties: {
            filePath: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    /**
     * 临时硬编码的安全沙箱目录，防止模型随意读取系统文件。
     */
    private readonly workspaceDir;
    execute(args: ReadFileArgs): Promise<string>;
}
