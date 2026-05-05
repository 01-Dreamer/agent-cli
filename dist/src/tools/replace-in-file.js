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
exports.ReplaceInFileTool = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const utils_1 = require("./utils");
class ReplaceInFileTool extends types_1.Tool {
    name = "replace_in_file";
    description = "ReplaceInFile: Replaces an exact string in a workspace file. Useful for precise edits without rewriting the whole file.";
    parameters = {
        type: "object",
        properties: {
            filePath: { type: "string", description: "File to edit, relative to workspace_test." },
            oldString: { type: "string", description: "Exact string to replace." },
            newString: { type: "string", description: "Replacement string." },
            allowMultiple: { type: "boolean", description: "Allow replacing multiple occurrences. Defaults to false." },
        },
        required: ["filePath", "oldString", "newString"],
    };
    async execute(args) {
        try {
            const { absolutePath, error } = (0, utils_1.resolveWorkspacePath)(args.filePath);
            if (error)
                return JSON.stringify({ error });
            if (args.oldString.length === 0) {
                return JSON.stringify({ error: "`oldString` cannot be empty." });
            }
            const content = await fs.readFile(absolutePath, 'utf-8');
            const occurrences = content.split(args.oldString).length - 1;
            if (occurrences === 0) {
                return JSON.stringify({ error: "No exact match found for oldString." });
            }
            if (!args.allowMultiple && occurrences > 1) {
                return JSON.stringify({ error: `Found ${occurrences} matches. Set allowMultiple=true to replace all of them.` });
            }
            const updated = content.split(args.oldString).join(args.newString);
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });
            await fs.writeFile(absolutePath, updated, 'utf-8');
            return JSON.stringify({
                success: true,
                filePath: args.filePath,
                replacements: occurrences,
            });
        }
        catch (error) {
            return JSON.stringify({ error: `ReplaceInFile failed: ${error.message}` });
        }
    }
}
exports.ReplaceInFileTool = ReplaceInFileTool;
