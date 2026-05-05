import { Tool } from '../types';
export interface WebFetchArgs {
    url: string;
}
export declare class WebFetchTool extends Tool<WebFetchArgs> {
    readonly name = "web_fetch";
    readonly description = "WebFetch: Fetch the contents of a specific URL web page.";
    readonly parameters: {
        type: string;
        properties: {
            url: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    execute(args: WebFetchArgs): Promise<string>;
}
