"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.implementations = exports.definitions = void 0;
const read_file_1 = require("./read-file");
const write_file_1 = require("./write-file");
const ls_1 = require("./ls");
const shell_1 = require("./shell");
const web_search_1 = require("./web-search");
const glob_1 = require("./glob");
const grep_1 = require("./grep");
const read_many_files_1 = require("./read-many-files");
const replace_in_file_1 = require("./replace-in-file");
const web_fetch_1 = require("./web-fetch");
// 在这里实例化所有的工具类
const registeredTools = [
    new read_file_1.ReadFileTool(),
    new write_file_1.WriteFileTool(),
    new ls_1.ListDirectoryTool(),
    new shell_1.ShellTool(),
    new web_search_1.WebSearchTool(),
    new glob_1.GlobTool(),
    new grep_1.GrepTool(),
    new read_many_files_1.ReadManyFilesTool(),
    new replace_in_file_1.ReplaceInFileTool(),
    new web_fetch_1.WebFetchTool()
];
// 组装传给大模型的 tools 定义
exports.definitions = registeredTools.map(t => t.definition);
// 一个注册表，用来通过 functionName 映射到实际要执行的方法
exports.implementations = {};
for (const tool of registeredTools) {
    exports.implementations[tool.name] = tool.execute.bind(tool);
}
