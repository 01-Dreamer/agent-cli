#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const run_1 = require("../src/commands/run");
commander_1.program
    .name('agent-cli')
    .description('A simple CLI Agent powered by SiliconFlow / OpenAI API')
    .version('1.0.0');
commander_1.program
    .command('run')
    .description('Start the autonomous Agent loop')
    .action(() => {
    (0, run_1.runAgent)();
});
commander_1.program.parse(process.argv);
