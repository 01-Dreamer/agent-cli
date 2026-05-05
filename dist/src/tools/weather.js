"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherTool = void 0;
const types_1 = require("../types");
class WeatherTool extends types_1.Tool {
    name = "get_weather";
    description = "获取指定城市或地点的当前天气情况";
    parameters = {
        type: "object",
        properties: {
            location: {
                type: "string",
                description: "城市名称，例如：北京、上海、杭州等",
            },
        },
        required: ["location"],
    };
    async execute(args) {
        // Mock weather data
        return JSON.stringify({ location: args.location, temperature: "25°C", condition: "Cloudy(多云)", notes: "气温适宜，建议带把伞" });
    }
}
exports.WeatherTool = WeatherTool;
