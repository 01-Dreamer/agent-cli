"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tool = void 0;
/**
 * 代表一个标准的工具类，分离了信息定义与实际的执行逻辑。
 */
class Tool {
    /**
     * 将本类导出为 OpenAI 的 ChatCompletionTool 格式
     */
    get definition() {
        return {
            type: "function",
            function: {
                name: this.name,
                description: this.description,
                parameters: this.parameters
            }
        };
    }
}
exports.Tool = Tool;
