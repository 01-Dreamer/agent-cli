import { Tool } from '../types';

export interface WebFetchArgs {
    url: string;
    maxChars?: number;
}

export class WebFetchTool extends Tool<WebFetchArgs> {
    readonly name = "web_fetch";
    readonly description = "WebFetch: Fetches an http/https URL and returns readable text content. Does not require a special API key.";
    readonly parameters = {
        type: "object",
        properties: {
            url: { type: "string", description: "The http or https URL to fetch." },
            maxChars: { type: "number", description: "Maximum characters to return. Defaults to 20000." },
        },
        required: ["url"],
    };

    async execute(args: WebFetchArgs): Promise<string> {
        try {
            const url = new URL(args.url);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                return JSON.stringify({ error: "Only http and https URLs are supported." });
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(url.href, {
                signal: controller.signal,
                headers: {
                    "user-agent": "agent-cli/1.0",
                    "accept": "text/html,text/plain,application/json,*/*",
                },
            });
            clearTimeout(timeout);

            const raw = await response.text();
            const contentType = response.headers.get('content-type') || '';
            const text = contentType.includes('text/html')
                ? raw
                    .replace(/<script[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                : raw;
            const maxChars = Math.max(1, args.maxChars ?? 20000);

            return JSON.stringify({
                url: url.href,
                status: response.status,
                contentType,
                truncated: text.length > maxChars,
                content: text.slice(0, maxChars),
            }, null, 2);
        } catch (error: any) {
            return JSON.stringify({ error: `WebFetch failed: ${error.message}` });
        }
    }
}
