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
exports.GrepTool = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const tool_1 = require("./tool");
const utils_1 = require("./utils");
class GrepTool extends tool_1.Tool {
    name = "grep";
    description = "Grep: Searches file contents in the workspace using a regular expression.";
    parameters = {
        type: "object",
        properties: {
            pattern: { type: "string", description: "The string or regex pattern to search for." },
            dirPath: {
                type: "string",
                description: "Directory to search in, relative to current working directory. Defaults to workspace root.",
            },
            includePattern: { type: "string", description: "Optional glob for files to include, e.g. \"**/*.ts\"." },
            excludePattern: { type: "string", description: "Optional glob for files to exclude, e.g. \"dist/**\"." },
            caseSensitive: { type: "boolean", description: "Whether search is case-sensitive. Defaults to false." },
            namesOnly: { type: "boolean", description: "Return only file names containing matches." },
            maxMatches: { type: "number", description: "Maximum number of matches to return. Defaults to 100." },
        },
        required: ["pattern"],
    };
    async execute(args) {
        try {
            const { absolutePath, workspaceDir, error } = (0, utils_1.resolveWorkspacePath)(args.dirPath || '.');
            if (error)
                return JSON.stringify({ error });
            const regex = new RegExp(args.pattern, args.caseSensitive ? '' : 'i');
            const files = await (0, utils_1.walkFiles)(absolutePath);
            const maxMatches = Math.max(1, args.maxMatches ?? 100);
            const matches = [];
            const matchedFiles = new Set();
            for (const file of files) {
                const relativeToWorkspace = (0, utils_1.toPosixPath)(path.relative(workspaceDir, file));
                const relativeToSearchDir = (0, utils_1.toPosixPath)(path.relative(absolutePath, file));
                if (args.includePattern && !(0, utils_1.matchesAnyGlob)(relativeToSearchDir, [args.includePattern]))
                    continue;
                if (args.excludePattern && (0, utils_1.matchesAnyGlob)(relativeToSearchDir, [args.excludePattern]))
                    continue;
                let content;
                try {
                    content = await fs.readFile(file, 'utf-8');
                }
                catch {
                    continue;
                }
                const lines = content.split(/\r?\n/);
                for (let index = 0; index < lines.length; index++) {
                    if (!regex.test(lines[index]))
                        continue;
                    regex.lastIndex = 0;
                    matchedFiles.add(relativeToWorkspace);
                    if (!args.namesOnly) {
                        matches.push({
                            filePath: relativeToWorkspace,
                            lineNumber: index + 1,
                            line: lines[index],
                        });
                    }
                    if (!args.namesOnly && matches.length >= maxMatches)
                        break;
                }
                if (!args.namesOnly && matches.length >= maxMatches)
                    break;
            }
            return JSON.stringify(args.namesOnly ? {
                pattern: args.pattern,
                count: matchedFiles.size,
                files: Array.from(matchedFiles).sort(),
            } : {
                pattern: args.pattern,
                count: matches.length,
                truncated: matches.length >= maxMatches,
                matches,
            }, null, 2);
        }
        catch (error) {
            return JSON.stringify({ error: `Grep failed: ${error.message}` });
        }
    }
}
exports.GrepTool = GrepTool;
