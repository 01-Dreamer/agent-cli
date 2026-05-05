import { Tool } from '../types';
export interface WebFetchArgs {
    url: string;
    maxChars?: number;
}
export declare class WebFetchTool extends Tool<WebFetchArgs> {
    readonly name = "web_fetch";
    readonly description = "WebFetch: Fetches an http/https URL and returns readable text content. Does not require a special API key.";
    readonly parameters: {
        type: string;
        properties: {
            url: {
                type: string;
                description: string;
            };
            maxChars: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    execute(args: WebFetchArgs): Promise<string>;
}
