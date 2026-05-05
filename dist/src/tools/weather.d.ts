import { Tool } from '../types';
export interface WeatherArgs {
    location: string;
}
export declare class WeatherTool extends Tool<WeatherArgs> {
    readonly name = "get_weather";
    readonly description = "\u83B7\u53D6\u6307\u5B9A\u57CE\u5E02\u6216\u5730\u70B9\u7684\u5F53\u524D\u5929\u6C14\u60C5\u51B5";
    readonly parameters: {
        type: string;
        properties: {
            location: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    execute(args: WeatherArgs): Promise<string>;
}
