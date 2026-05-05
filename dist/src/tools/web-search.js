"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSearchTool = void 0;
const types_1 = require("../types");
class WebSearchTool extends types_1.Tool {
    name = "web_search";
    description = "WebSearch: Search the internet for information, including current events, weather, specific technical answers, etc.";
    parameters = {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The search query, e.g. '天气 昆明' or 'latest nodejs version'.",
            },
        },
        required: ["query"],
    };
    async execute(args) {
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
                    max_results: 5 // 返回前5条结果
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
            const formattedResults = data.results.map((r) => ({
                title: r.title,
                url: r.url,
                content: r.content
            }));
            return JSON.stringify({
                query: args.query,
                results: formattedResults
            });
        }
        catch (error) {
            return JSON.stringify({ error: `WebSearch failed: ${error.message}` });
        }
    }
}
exports.WebSearchTool = WebSearchTool;
