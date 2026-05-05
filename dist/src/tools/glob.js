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
exports.GlobTool = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const utils_1 = require("./utils");
class GlobTool extends types_1.Tool {
    name = "glob";
    description = "Glob: Finds files in the workspace by glob pattern, similar to Gemini CLI's glob tool.";
    parameters = {
        type: "object",
        properties: {
            pattern: {
                type: "string",
                description: "Glob pattern to match, e.g. \"**/*.ts\" or \"src/**/*.md\".",
            },
            dirPath: {
                type: "string",
                description: "Optional directory to search in, relative to workspace_test. Defaults to workspace root.",
            },
            limit: {
                type: "number",
                description: "Maximum number of matched files to return. Defaults to 200.",
            },
        },
        required: ["pattern"],
    };
    async execute(args) {
        try {
            const { absolutePath, workspaceDir, error } = (0, utils_1.resolveWorkspacePath)(args.dirPath || '.');
            if (error)
                return JSON.stringify({ error });
            const stats = await fs.stat(absolutePath);
            if (!stats.isDirectory()) {
                return JSON.stringify({ error: `Path is not a directory: ${args.dirPath || '.'}` });
            }
            const regex = (0, utils_1.globToRegExp)(args.pattern);
            const files = await (0, utils_1.walkFiles)(absolutePath);
            const matches = files
                .map((file) => path.relative(workspaceDir, file))
                .filter((relativePath) => regex.test((0, utils_1.toPosixPath)(path.relative(absolutePath, path.resolve(workspaceDir, relativePath)))))
                .sort();
            const limit = Math.max(1, args.limit ?? 200);
            return JSON.stringify({
                pattern: args.pattern,
                dirPath: args.dirPath || ".",
                count: matches.length,
                truncated: matches.length > limit,
                files: matches.slice(0, limit),
            }, null, 2);
        }
        catch (error) {
            return JSON.stringify({ error: `Glob failed: ${error.message}` });
        }
    }
}
exports.GlobTool = GlobTool;
