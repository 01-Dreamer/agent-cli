#!/usr/bin/env node
import { program } from 'commander';
import { runAgent } from '../src/commands/run';

program
  .name('agent-cli')
  .description('A simple CLI Agent powered by SiliconFlow / OpenAI API')
  .version('1.0.0');

program
  .command('run')
  .description('Start the autonomous Agent loop')
  .action(() => {
    runAgent();
  });

program.parse(process.argv);
