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
exports.ListDirectoryTool = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const types_1 = require("../types");
class ListDirectoryTool extends types_1.Tool {
    name = "list_directory";
    description = "ListDirectory: Lists the files and folders in a workspace directory.";
    parameters = {
        type: "object",
        properties: {
            dirPath: {
                type: "string",
                description: "The path of the directory to list (relative to the workspace root). Defaults to the root directory if empty.",
            },
        }
        // no required parameters since we allow empty dirPath
    };
    /**
     * 临时硬编码的安全沙箱目录
     */
    workspaceDir = path.resolve(process.cwd(), 'workspace_test');
    async execute(args) {
        try {
            const targetPath = args.dirPath ? path.resolve(this.workspaceDir, args.dirPath) : this.workspaceDir;
            // 安全检查
            if (!targetPath.startsWith(this.workspaceDir)) {
                return JSON.stringify({ error: `Permission denied: Cannot list outside of workspace_test directory.` });
            }
            const entries = await fs.readdir(targetPath, { withFileTypes: true });
            const filesAndDirs = entries.map(entry => ({
                name: entry.name,
                isDirectory: entry.isDirectory()
            }));
            return JSON.stringify({ path: args.dirPath || ".", items: filesAndDirs });
        }
        catch (error) {
            return JSON.stringify({ error: `Failed to list directory: ${error.message}` });
        }
    }
}
exports.ListDirectoryTool = ListDirectoryTool;
