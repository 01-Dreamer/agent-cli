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
exports.loadSkillsFromDir = loadSkillsFromDir;
exports.loadSkillFromFile = loadSkillFromFile;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?/;
async function loadSkillsFromDir(dirPath) {
    const skills = [];
    try {
        const stats = await fs.stat(dirPath);
        if (!stats.isDirectory())
            return skills;
        const files = await searchForSkillFiles(dirPath);
        for (const file of files) {
            const skill = await loadSkillFromFile(file);
            if (skill)
                skills.push(skill);
        }
    }
    catch (e) {
        // directory doesn't exist or is inaccessible
    }
    return skills;
}
async function searchForSkillFiles(dir) {
    const result = [];
    async function scan(currentDir) {
        try {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name === 'node_modules' || entry.name === '.git')
                    continue;
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    await scan(fullPath);
                }
                else if (entry.name === 'SKILL.md') {
                    result.push(fullPath);
                }
            }
        }
        catch (e) {
            // ignore permission errors
        }
    }
    await scan(dir);
    return result;
}
async function loadSkillFromFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const match = content.match(FRONTMATTER_REGEX);
        if (!match)
            return null;
        const frontmatterStr = match[1];
        const body = match[2]?.trim() ?? '';
        const nameMatch = frontmatterStr.match(/name:\s*(.*)/);
        const descMatch = frontmatterStr.match(/description:\s*(.*)/);
        if (nameMatch && descMatch) {
            return {
                name: nameMatch[1].trim(),
                description: descMatch[1].trim(),
                location: filePath,
                body
            };
        }
    }
    catch (e) {
        // Failed to parse
    }
    return null;
}
