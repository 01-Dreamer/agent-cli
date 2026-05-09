"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSearchTool = void 0;
const tool_1 = require("./tool");
function compactText(value, maxLength) {
    const compacted = value.replace(/\s+/g, ' ').trim();
    return compacted.length > maxLength ? `${compacted.slice(0, maxLength)}...` : compacted;
}
function normalizeUrl(value) {
    try {
        const url = new URL(value);
        url.hash = '';
        for (const key of Array.from(url.searchParams.keys())) {
            if (key.startsWith('utm_')) {
                url.searchParams.delete(key);
            }
        }
        return url.toString();
    }
    catch {
        return value;
    }
}
class WebSearchTool extends tool_1.Tool {
    name = "web_search";
    description = "WebSearch: Search the internet when information is current, niche, uncertain, or needs sources. Do not use for stable facts you already know.";
    parameters = {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The search query, e.g. '天气 昆明' or 'latest nodejs version'.",
            },
            maxResults: {
                type: "number",
                description: "Maximum results to return. Defaults to 3.",
            },
        },
        required: ["query"],
    };
    async execute(args) {
        try {
            const apiKey = process.env.TAVILY_API_KEY;
            if (!apiKey) {
                return JSON.stringify({ error: "Missing TAVILY_API_KEY environment variable." });
            }
            const maxResults = Math.max(1, Math.min(args.maxResults ?? 3, 8));
            const response = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: args.query,
                    search_depth: "basic",
                    include_answer: true,
                    include_raw_content: false,
                    max_results: maxResults,
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
            const seenUrls = new Set();
            const formattedResults = data.results
                .map((result) => ({
                title: compactText(result.title || "Untitled", 120),
                url: normalizeUrl(result.url || ""),
                content: compactText(result.content || "", 700),
            }))
                .filter((result) => {
                if (!result.url || seenUrls.has(result.url))
                    return false;
                seenUrls.add(result.url);
                return true;
            });
            return JSON.stringify({
                query: args.query,
                answer: data.answer ? compactText(data.answer, 900) : undefined,
                results: formattedResults
            }, null, 2);
        }
        catch (error) {
            return JSON.stringify({ error: `WebSearch failed: ${error.message}` });
        }
    }
}
exports.WebSearchTool = WebSearchTool;
