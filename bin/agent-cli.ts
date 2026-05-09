#!/usr/bin/env node
import { program } from 'commander';
import { runAgent } from '../src/commands/run';

program
  .name('agent-cli')
  .description('An interactive terminal agent for local software work')
  .version('1.0.0')
  .argument('[dir]', 'Workspace directory to start in')
  .action((dir?: string) => {
    runAgent({ cwd: dir });
  });

program
  .command('run')
  .argument('[dir]', 'Workspace directory to start in')
  .description('Start an Agent CLI workspace session')
  .action((dir?: string) => {
    runAgent({ cwd: dir });
  });

program.parse(process.argv);
