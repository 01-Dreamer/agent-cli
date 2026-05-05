import { Tool } from '../types';

export interface WebSearchArgs {
    query: string;
}

export class WebSearchTool extends Tool<WebSearchArgs> {
    readonly name = "web_search";
    readonly description = "WebSearch: Search the internet for information, including current events, weather, specific technical answers, etc.";
    readonly parameters = {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The search query, e.g. '天气 昆明' or 'latest nodejs version'.",
            },
        },
        required: ["query"],
    };

    async execute(args: WebSearchArgs): Promise<string> {
        try {
            // 硬编码您提供的 Tavily API Key
            const apiKey = "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";
            
            const response = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: args.query,
                    search_depth: "basic", // 基础搜索足够用了
                    max_results: 5         // 返回前5条结果
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                return JSON.stringify({ error: `Tavily Search failed with status ${response.status}: ${errorText}` });
            }

            const data = await response.json();
            
            if (!data.results || data.results.length === 0) {
                 return JSON.stringify({ error: "No snippets found for the given query." });
            }

            // 提取并且精简格式，喂给大模型
            const formattedResults = data.results.map((r: any) => ({
                title: r.title,
                url: r.url,
                content: r.content
            }));

            return JSON.stringify({ 
                query: args.query, 
                results: formattedResults 
            });

        } catch (error: any) {
            return JSON.stringify({ error: `WebSearch failed: ${error.message}` });
        }
    }
}
