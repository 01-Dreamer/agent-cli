import { Tool } from '../types';
export interface ReplaceInFileArgs {
    filePath: string;
    oldString: string;
    newString: string;
    allowMultiple?: boolean;
}
export declare class ReplaceInFileTool extends Tool<ReplaceInFileArgs> {
    readonly name = "replace_in_file";
    readonly description = "ReplaceInFile: Replaces an exact string in a workspace file. Useful for precise edits without rewriting the whole file.";
    readonly parameters: {
        type: string;
        properties: {
            filePath: {
                type: string;
                description: string;
            };
            searchString: {
                type: string;
                description: string;
            };
            replaceString: {
                type: string;
                description: string;
            };
            allowMultiple: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    execute(args: ReplaceInFileArgs): Promise<string>;
}
