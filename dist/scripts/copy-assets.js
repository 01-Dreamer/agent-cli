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
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
async function copyDir(sourceDir, targetDir) {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });
    await fs.mkdir(targetDir, { recursive: true });
    for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name);
        const targetPath = path.join(targetDir, entry.name);
        if (entry.isDirectory()) {
            await copyDir(sourcePath, targetPath);
        }
        else if (entry.isFile()) {
            await fs.copyFile(sourcePath, targetPath);
        }
    }
}
async function main() {
    const builtinSkillsSource = path.join(process.cwd(), 'src', 'skills', 'builtin');
    const builtinSkillsTarget = path.join(process.cwd(), 'dist', 'src', 'skills', 'builtin');
    await fs.rm(builtinSkillsTarget, { recursive: true, force: true });
    await copyDir(builtinSkillsSource, builtinSkillsTarget);
    const cliEntry = path.join(process.cwd(), 'dist', 'bin', 'agent-cli.js');
    await fs.chmod(cliEntry, 0o755);
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
