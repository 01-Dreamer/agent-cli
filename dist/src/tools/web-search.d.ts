import { Tool } from '../types';
export interface WebSearchArgs {
    query: string;
}
export declare class WebSearchTool extends Tool<WebSearchArgs> {
    readonly name = "web_search";
    readonly description = "WebSearch: Search the internet for information, including current events, weather, specific technical answers, etc.";
    readonly parameters: {
        type: string;
        properties: {
            query: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    execute(args: WebSearchArgs): Promise<string>;
}
