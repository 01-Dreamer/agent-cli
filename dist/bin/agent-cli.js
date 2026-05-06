#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const run_1 = require("../src/commands/run");
commander_1.program
    .name('agent-cli')
    .description('An interactive terminal agent for local software work')
    .version('1.0.0');
commander_1.program
    .command('run')
    .description('Start an Agent CLI workspace session')
    .action(() => {
    (0, run_1.runAgent)();
});
commander_1.program.parse(process.argv);
