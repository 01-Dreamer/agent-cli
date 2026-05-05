import { Tool } from '../types';
export interface GrepArgs {
    pattern: string;
    dirPath?: string;
    includePattern?: string;
    excludePattern?: string;
    caseSensitive?: boolean;
    namesOnly?: boolean;
    maxMatches?: number;
}
export declare class GrepTool extends Tool<GrepArgs> {
    readonly name = "grep";
    readonly description = "Grep: Searches file contents in the workspace using a regular expression.";
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
            includePattern: {
                type: string;
                description: string;
            };
            excludePattern: {
                type: string;
                description: string;
            };
            caseSensitive: {
                type: string;
                description: string;
            };
            namesOnly: {
                type: string;
                description: string;
            };
            maxMatches: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    execute(args: GrepArgs): Promise<string>;
}
