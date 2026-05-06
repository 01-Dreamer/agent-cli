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
class ListDirectoryTool {
    name = 'ls';
    description = 'List files and directories in a given path.';
    parameters = {
        type: "object",
        properties: {
            path: {
                type: 'string',
                description: 'The path to list (relative to the current directory). Defaults to the current directory if empty.',
            },
        },
        required: [],
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
            const targetPath = args.path || '.';
            const absolutePath = path.resolve(this.workspaceDir, targetPath);
            if (!absolutePath.startsWith(this.workspaceDir)) {
                return JSON.stringify({ error: `Permission denied: Cannot list outside of workspace directory.` });
            }
            const files = await fs.readdir(absolutePath, { withFileTypes: true });
            const fileDetails = files.map(file => ({
                name: file.name,
                isDirectory: file.isDirectory(),
            }));
            return JSON.stringify({ path: targetPath, items: fileDetails });
        }
        catch (error) {
            return JSON.stringify({ error: `Failed to list directory: ${error.message}` });
        }
    }
}
exports.ListDirectoryTool = ListDirectoryTool;
