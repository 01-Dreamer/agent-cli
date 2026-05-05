"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebFetchTool = void 0;
const types_1 = require("../types");
class WebFetchTool extends types_1.Tool {
    name = "web_fetch";
    description = "WebFetch: Fetch the contents of a specific URL web page.";
    parameters = {
        type: "object",
        properties: {
            url: {
                type: "string",
                description: "The full URL to fetch, e.g. 'https://github.com/'",
            },
        },
        required: ["url"],
    };
    async execute(args) {
        try {
            const response = await fetch(args.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Agent-CLI Bot;)',
                }
            });
            if (!response.ok) {
                return JSON.stringify({ error: `Fetch failed with status ${response.status}` });
            }
            const text = await response.text();
            // 简单截断避免把模型脑子塞爆 (最大约返回 20000 字符)
            const limit = 20000;
            if (text.length > limit) {
                return JSON.stringify({
                    warning: "Response was too large and has been truncated.",
                    content: text.slice(0, limit) + "... [TRUNCATED]"
                });
            }
            return text;
        }
        catch (error) {
            return JSON.stringify({ error: `WebFetch failed: ${error.message}` });
        }
    }
}
exports.WebFetchTool = WebFetchTool;
