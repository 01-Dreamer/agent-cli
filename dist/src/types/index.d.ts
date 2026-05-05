import OpenAI from "openai";
/**
 * 代表一个标准的工具类，分离了信息定义与实际的执行逻辑。
 */
export declare abstract class Tool<TArgs = any> {
    /** 这里必须填写给大模型的固定名称，如 get_weather */
    abstract readonly name: string;
    /** 工具的业务描叙 */
    abstract readonly description: string;
    /** JSON Schema 的 parameters 描述 */
    abstract readonly parameters: Record<string, any>;
    /**
     * 实际的本地执行函数
     * @param args 解析后参数
     */
    abstract execute(args: TArgs): Promise<string> | string;
    /**
     * 将本类导出为 OpenAI 的 ChatCompletionTool 格式
     */
    get definition(): OpenAI.Chat.ChatCompletionTool;
}
