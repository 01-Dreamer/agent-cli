#!/usr/bin/env ts-node

/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Skill Packager - Creates a distributable .skill file of a skill folder.
 *
 * Usage:
 *     npx ts-node package_skill.ts <path/to/skill-folder> [output-directory]
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { validateSkill } from './validate_skill';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log(
      'Usage: npx ts-node package_skill.ts <path/to/skill-folder> [output-directory]',
    );
    process.exit(1);
  }

  const skillPathArg = args[0] ?? '';
  const outputDirArg = args[1];

  if (
    skillPathArg.includes('..') ||
    (outputDirArg && outputDirArg.includes('..'))
  ) {
    console.error('Error: Path traversal detected in arguments.');
    process.exit(1);
  }

  const skillPath = path.resolve(skillPathArg);
  const outputDir = outputDirArg ? path.resolve(outputDirArg) : process.cwd();
  const skillName = path.basename(skillPath);

  console.log('Validating skill...');
  const result = validateSkill(skillPath);
  if (!result.valid) {
    console.error(`Validation failed: ${result.message}`);
    process.exit(1);
  }

  if (result.warning) {
    console.warn(`Warning: ${result.warning}`);
    console.log('Resolve all TODOs before packaging.');
    process.exit(1);
  }
  console.log('Skill is valid.');

  const outputFilename = path.join(outputDir, `${skillName}.skill`);

  try {
    let zipProcess = spawnSync('zip', ['-r', outputFilename, '.'], {
      cwd: skillPath,
      stdio: 'inherit',
    });

    if (zipProcess.error || zipProcess.status !== 0) {
      if (process.platform === 'win32') {
        console.log('zip command not found, falling back to PowerShell...');
        const tempZip = outputFilename + '.zip';
        const safeTempZip = tempZip.replace(/'/g, "''");
        zipProcess = spawnSync(
          'powershell.exe',
          [
            '-NoProfile',
            '-Command',
            `Compress-Archive -Path .\\* -DestinationPath '${safeTempZip}' -Force`,
          ],
          {
            cwd: skillPath,
            stdio: 'inherit',
          },
        );

        if (zipProcess.status === 0 && fs.existsSync(tempZip)) {
          fs.renameSync(tempZip, outputFilename);
        }
      } else {
        console.log('zip command not found, falling back to tar...');
        zipProcess = spawnSync(
          'tar',
          ['-a', '-c', '--format=zip', '-f', outputFilename, '.'],
          {
            cwd: skillPath,
            stdio: 'inherit',
          },
        );
      }
    }

    if (zipProcess.error) {
      throw zipProcess.error;
    }

    if (zipProcess.status !== 0) {
      throw new Error(
        `Packaging command failed with exit code ${zipProcess.status}`,
      );
    }

    console.log(`Successfully packaged skill to: ${outputFilename}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error packaging: ${message}`);
    process.exit(1);
  }
}

void main();
