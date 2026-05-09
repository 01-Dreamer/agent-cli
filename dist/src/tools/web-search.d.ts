import { Tool } from './tool';
export interface WebSearchArgs {
    query: string;
    maxResults?: number;
}
export declare class WebSearchTool extends Tool<WebSearchArgs> {
    readonly name = "web_search";
    readonly description = "WebSearch: Search the internet when information is current, niche, uncertain, or needs sources. Do not use for stable facts you already know.";
    readonly parameters: {
        type: string;
        properties: {
            query: {
                type: string;
                description: string;
            };
            maxResults: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    execute(args: WebSearchArgs): Promise<string>;
}
