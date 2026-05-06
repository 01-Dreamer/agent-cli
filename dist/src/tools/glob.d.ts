import { Tool } from '../types';
export interface GlobArgs {
    pattern: string;
    dirPath?: string;
    limit?: number;
}
export declare class GlobTool extends Tool<GlobArgs> {
    readonly name = "glob";
    readonly description = "Glob: Finds files in the workspace by glob pattern.";
    readonly parameters: {
        type: string;
        properties: {
            pattern: {
                type: string;
                description: string;
            };
            dirPath: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    execute(args: GlobArgs): Promise<string>;
}
