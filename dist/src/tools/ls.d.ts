import { Tool } from '../types';
export interface ListDirectoryArgs {
    dirPath?: string;
}
export declare class ListDirectoryTool extends Tool<ListDirectoryArgs> {
    readonly name = "list_directory";
    readonly description = "ListDirectory: Lists the files and folders in a workspace directory.";
    readonly parameters: {
        type: string;
        properties: {
            dirPath: {
                type: string;
                description: string;
            };
        };
    };
    /**
     * 临时硬编码的安全沙箱目录
     */
    private readonly workspaceDir;
    execute(args: ListDirectoryArgs): Promise<string>;
}
