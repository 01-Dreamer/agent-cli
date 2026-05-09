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
exports.ReadManyFilesTool = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const tool_1 = require("./tool");
const utils_1 = require("./utils");
class ReadManyFilesTool extends tool_1.Tool {
    name = "read_many_files";
    description = "ReadManyFiles: Reads and concatenates multiple workspace files selected by glob patterns.";
    parameters = {
        type: "object",
        properties: {
            include: {
                type: "array",
                items: { type: "string" },
                description: "Glob patterns to include, e.g. [\"**/*.ts\", \"README.md\"].",
            },
            exclude: {
                type: "array",
                items: { type: "string" },
                description: "Optional glob patterns to exclude.",
            },
            maxBytes: {
                type: "number",
                description: "Maximum total bytes to return. Defaults to 100000.",
            },
        },
        required: ["include"],
    };
    async execute(args) {
        try {
            if (!Array.isArray(args.include) || args.include.length === 0) {
                return JSON.stringify({ error: "`include` must be a non-empty array." });
            }
            const { absolutePath, workspaceDir, error } = (0, utils_1.resolveWorkspacePath)('.');
            if (error)
                return JSON.stringify({ error });
            const allFiles = await (0, utils_1.walkFiles)(absolutePath);
            const exclude = args.exclude ?? [];
            const selectedFiles = allFiles
                .map((file) => ({ absolute: file, relative: (0, utils_1.toPosixPath)(path.relative(workspaceDir, file)) }))
                .filter(({ relative }) => (0, utils_1.matchesAnyGlob)(relative, args.include))
                .filter(({ relative }) => !(0, utils_1.matchesAnyGlob)(relative, exclude))
                .sort((a, b) => a.relative.localeCompare(b.relative));
            const maxBytes = Math.max(1, args.maxBytes ?? 100000);
            let usedBytes = 0;
            let output = "";
            const skipped = [];
            for (const file of selectedFiles) {
                let content;
                try {
                    content = await fs.readFile(file.absolute, 'utf-8');
                }
                catch {
                    skipped.push(file.relative);
                    continue;
                }
                const block = `--- ${file.relative} ---\n${content}\n`;
                const blockBytes = Buffer.byteLength(block, 'utf-8');
                if (usedBytes + blockBytes > maxBytes) {
                    skipped.push(file.relative);
                    continue;
                }
                output += block;
                usedBytes += blockBytes;
            }
            return JSON.stringify({
                count: selectedFiles.length,
                returnedBytes: usedBytes,
                skipped,
                content: output,
            }, null, 2);
        }
        catch (error) {
            return JSON.stringify({ error: `ReadManyFiles failed: ${error.message}` });
        }
    }
}
exports.ReadManyFilesTool = ReadManyFilesTool;
