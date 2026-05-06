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
exports.FRONTMATTER_REGEX = void 0;
exports.parseFrontmatter = parseFrontmatter;
exports.loadSkillsFromDir = loadSkillsFromDir;
exports.loadSkillFromFile = loadSkillFromFile;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
exports.FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?/;
/**
 * Parses frontmatter content using a small YAML-compatible parser.
 *
 * This follows Gemini CLI's behavior for the skill fields agent-cli supports:
 * `name` and `description`, including indented fields, quoted values,
 * missing spaces after colons, and multi-line descriptions.
 */
function parseFrontmatter(content) {
    const simple = parseSimpleFrontmatter(content);
    if (!simple)
        return null;
    return {
        name: unquote(simple.name),
        description: unquote(simple.description),
    };
}
function parseSimpleFrontmatter(content) {
    const lines = content.split(/\r?\n/);
    let name;
    let description;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const nameMatch = line.match(/^\s*name:\s*(.*)$/);
        if (nameMatch) {
            name = nameMatch[1].trim();
            continue;
        }
        const descMatch = line.match(/^\s*description:\s*(.*)$/);
        if (descMatch) {
            const descLines = [descMatch[1].trim()];
            while (i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                if (nextLine.match(/^[ \t]+\S/)) {
                    descLines.push(nextLine.trim());
                    i++;
                }
                else {
                    break;
                }
            }
            description = descLines.filter(Boolean).join(' ');
            continue;
        }
    }
    if (name !== undefined && description !== undefined) {
        return { name, description };
    }
    return null;
}
function unquote(value) {
    const trimmed = value.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}
/**
 * Discovers and loads all skills in the provided directory.
 */
async function loadSkillsFromDir(dir) {
    const discoveredSkills = [];
    try {
        const absoluteSearchPath = path.resolve(dir);
        const stats = await fs.stat(absoluteSearchPath).catch(() => null);
        if (!stats || !stats.isDirectory()) {
            return [];
        }
        const skillFiles = await findSkillFiles(absoluteSearchPath);
        for (const skillFile of skillFiles) {
            const metadata = await loadSkillFromFile(skillFile);
            if (metadata) {
                discoveredSkills.push(metadata);
            }
        }
        if (discoveredSkills.length === 0) {
            const files = await fs.readdir(absoluteSearchPath);
            if (files.length > 0) {
                console.debug(`Failed to load skills from ${absoluteSearchPath}. The directory is not empty but no valid skills were discovered. Please ensure SKILL.md files are present in subdirectories and have valid frontmatter.`);
            }
        }
    }
    catch (error) {
        console.warn(`Error discovering skills in ${dir}:`, error);
    }
    return discoveredSkills;
}
async function findSkillFiles(absoluteSearchPath) {
    const files = [];
    const rootSkillFile = path.join(absoluteSearchPath, 'SKILL.md');
    if (await isFile(rootSkillFile)) {
        files.push(rootSkillFile);
    }
    const entries = await fs.readdir(absoluteSearchPath, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        if (entry.name === 'node_modules' || entry.name === '.git')
            continue;
        const skillFile = path.join(absoluteSearchPath, entry.name, 'SKILL.md');
        if (await isFile(skillFile)) {
            files.push(skillFile);
        }
    }
    return files.sort();
}
async function isFile(filePath) {
    const stats = await fs.stat(filePath).catch(() => null);
    return Boolean(stats?.isFile());
}
/**
 * Loads a single skill from a SKILL.md file.
 */
async function loadSkillFromFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const match = content.match(exports.FRONTMATTER_REGEX);
        if (!match) {
            return null;
        }
        const frontmatter = parseFrontmatter(match[1]);
        if (!frontmatter) {
            return null;
        }
        const sanitizedName = frontmatter.name.replace(/[:\\/<>*?"|]/g, '-');
        return {
            name: sanitizedName,
            description: frontmatter.description,
            location: filePath,
            body: match[2]?.trim() ?? '',
        };
    }
    catch (error) {
        console.debug(`Error parsing skill file ${filePath}:`, error);
        return null;
    }
}
