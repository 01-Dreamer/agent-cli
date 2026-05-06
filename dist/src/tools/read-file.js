"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadFileTool = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class ReadFileTool {
    name = 'read_file';
    description = 'Read the contents of a file.';
    parameters = {
        type: "object",
        properties: {
            filePath: {
                type: "string",
                description: "File to read, relative to current working directory.",
            },
        },
        required: ["filePath"],
    };
    get definition() {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: this.parameters,
            },
        };
    }
    get workspaceDir() {
        return process.cwd();
    }
    async execute(args) {
        try {
            // 解析绝对路径，确保文件在当前工作目录范围内
            const absolutePath = path.resolve(this.workspaceDir, args.filePath);
            if (!absolutePath.startsWith(this.workspaceDir)) {
                return JSON.stringify({ error: `Permission denied: Cannot read outside of workspace directory.` });
            }
            const fileContent = await fs.readFile(absolutePath, 'utf-8');
            return JSON.stringify({ content: fileContent });
        }
        catch (error) {
            return JSON.stringify({ error: `Failed to read file: ${error.message}` });
        }
    }
}
exports.ReadFileTool = ReadFileTool;
