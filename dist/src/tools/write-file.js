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
exports.WriteFileTool = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const types_1 = require("../types");
class WriteFileTool extends types_1.Tool {
    name = "write_file";
    description = "WriteFile: Writes content to a file in the workspace. Overwrites if it exists, creates if it does not.";
    parameters = {
        type: "object",
        properties: {
            filePath: {
                type: "string",
                description: "The path to the file to write (relative to the workspace root).",
            },
            content: {
                type: "string",
                description: "The entire content to write into the file.",
            }
        },
        required: ["filePath", "content"],
    };
    /**
     * 临时硬编码的安全沙箱目录，防止模型随意写入系统文件。
     */
    workspaceDir = path.resolve(process.cwd(), 'workspace_test');
    async execute(args) {
        try {
            // 解析绝对路径
            const absolutePath = path.resolve(this.workspaceDir, args.filePath);
            // 安全检查：防止目录穿越
            if (!absolutePath.startsWith(this.workspaceDir)) {
                return JSON.stringify({ error: `Permission denied: Cannot write outside of workspace_test directory.` });
            }
            // 如果该文件在一些多级未被创建的子目录下，我们需要自动帮它创建父目录
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });
            await fs.writeFile(absolutePath, args.content, 'utf-8');
            return JSON.stringify({ success: true, message: `Successfully wrote file to ${args.filePath}` });
        }
        catch (error) {
            return JSON.stringify({ error: `Failed to write file: ${error.message}` });
        }
    }
}
exports.WriteFileTool = WriteFileTool;
