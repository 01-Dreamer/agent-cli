"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.implementations = exports.definitions = void 0;
const read_file_1 = require("./read-file");
const write_file_1 = require("./write-file");
const ls_1 = require("./ls");
const shell_1 = require("./shell");
const web_search_1 = require("./web-search");
// 在这里实例化所有的工具类
const registeredTools = [
    new read_file_1.ReadFileTool(),
    new write_file_1.WriteFileTool(),
    new ls_1.ListDirectoryTool(),
    new shell_1.ShellTool(),
    new web_search_1.WebSearchTool()
];
// 组装传给大模型的 tools 定义
exports.definitions = registeredTools.map(t => t.definition);
// 一个注册表，用来通过 functionName 映射到实际要执行的方法
exports.implementations = {};
for (const tool of registeredTools) {
    exports.implementations[tool.name] = tool.execute.bind(tool);
}
