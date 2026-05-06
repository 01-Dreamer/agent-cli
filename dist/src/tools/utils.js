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
exports.getWorkspaceDir = getWorkspaceDir;
exports.resolveWorkspacePath = resolveWorkspacePath;
exports.toPosixPath = toPosixPath;
exports.globToRegExp = globToRegExp;
exports.matchesAnyGlob = matchesAnyGlob;
exports.walkFiles = walkFiles;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
function getWorkspaceDir() {
    return process.cwd();
}
function resolveWorkspacePath(targetPath) {
    const workspaceDir = getWorkspaceDir();
    const absolutePath = path.resolve(workspaceDir, targetPath);
    if (!absolutePath.startsWith(workspaceDir)) {
        return {
            valid: false,
            absolutePath,
            workspaceDir,
            error: `Permission denied: Cannot access outside of the current working directory.`,
        };
    }
    return { valid: true, absolutePath, workspaceDir };
}
function toPosixPath(filePath) {
    return filePath.split(path.sep).join('/');
}
function globToRegExp(pattern) {
    const normalized = toPosixPath(pattern);
    let source = '';
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized[i];
        const next = normalized[i + 1];
        if (char === '*') {
            if (next === '*') {
                const after = normalized[i + 2];
                if (after === '/') {
                    source += '(?:.*\\/)?';
                    i += 2;
                }
                else {
                    source += '.*';
                    i++;
                }
            }
            else {
                source += '[^/]*';
            }
            continue;
        }
        if (char === '?') {
            source += '[^/]';
            continue;
        }
        if ('\\^$+?.()|{}[]'.includes(char)) {
            source += `\\${char}`;
        }
        else {
            source += char;
        }
    }
    return new RegExp(`^${source}$`);
}
function matchesAnyGlob(relativePath, patterns = []) {
    const normalizedPath = toPosixPath(relativePath);
    return patterns.some((pattern) => globToRegExp(pattern).test(normalizedPath));
}
async function walkFiles(dir, options) {
    const ignoreDirs = new Set(options?.ignoreDirs ?? ['.git', 'node_modules']);
    const files = [];
    async function walk(currentDir) {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && ignoreDirs.has(entry.name))
                continue;
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await walk(fullPath);
            }
            else if (entry.isFile()) {
                files.push(fullPath);
            }
        }
    }
    await walk(dir);
    return files;
}
