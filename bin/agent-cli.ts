#!/usr/bin/env node
import { program } from 'commander';
import { runAgent } from '../src/commands/run';

program
  .name('agent-cli')
  .description('An interactive terminal agent for local software work')
  .version('1.0.0');

program
  .command('run')
  .description('Start an Agent CLI workspace session')
  .action(() => {
    runAgent();
  });

program.parse(process.argv);
