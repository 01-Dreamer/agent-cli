import { Tool } from './tool';
export interface ReadManyFilesArgs {
    include: string[];
    exclude?: string[];
    maxBytes?: number;
}
export declare class ReadManyFilesTool extends Tool<ReadManyFilesArgs> {
    readonly name = "read_many_files";
    readonly description = "ReadManyFiles: Reads and concatenates multiple workspace files selected by glob patterns.";
    readonly parameters: {
        type: string;
        properties: {
            include: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            exclude: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            maxBytes: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    execute(args: ReadManyFilesArgs): Promise<string>;
}
