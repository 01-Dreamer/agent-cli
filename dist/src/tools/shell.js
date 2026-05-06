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
exports.ShellTool = void 0;
const child_process = __importStar(require("child_process"));
const util = __importStar(require("util"));
const execAsync = util.promisify(child_process.exec);
class ShellTool {
    name = 'shell';
    description = 'Execute a shell command. Use carefully.';
    parameters = {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'The shell command to execute.',
            },
        },
        required: ['command'],
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
            // 在当前工作目录下执行命令
            const { stdout, stderr } = await execAsync(args.command, {
                cwd: this.workspaceDir,
                shell: '/bin/bash',
                timeout: 30000, // 30秒超时防止卡死
            });
            let result = '';
            if (stdout)
                result += `STDOUT:\n${stdout}\n`;
            if (stderr)
                result += `STDERR:\n${stderr}\n`;
            return (result ||
                JSON.stringify({
                    success: true,
                    message: 'Command executed successfully with no output.',
                }));
        }
        catch (error) {
            return JSON.stringify({
                error: `Command failed: ${error.message}`,
                stdout: error.stdout,
                stderr: error.stderr,
            });
        }
    }
}
exports.ShellTool = ShellTool;
