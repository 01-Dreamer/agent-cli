#!/usr/bin/env ts-node

/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Quick validation logic for skills.
 * Leveraging existing dependencies when possible or providing a zero-dep fallback.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SkillValidationResult {
  valid: boolean;
  message: string;
  warning?: string;
}

export function validateSkill(skillPath: string): SkillValidationResult {
  if (!fs.existsSync(skillPath) || !fs.statSync(skillPath).isDirectory()) {
    return { valid: false, message: `Path is not a directory: ${skillPath}` };
  }

  const skillMdPath = path.join(skillPath, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    return { valid: false, message: 'SKILL.md not found' };
  }

  const content = fs.readFileSync(skillMdPath, 'utf8');
  if (!content.startsWith('---')) {
    return { valid: false, message: 'No YAML frontmatter found' };
  }

  const parts = content.split('---');
  if (parts.length < 3) {
    return { valid: false, message: 'Invalid frontmatter format' };
  }

  const frontmatterText = parts[1] ?? '';

  const nameMatch = frontmatterText.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatterText.match(
    /^description:\s*(?:'([^']*)'|"([^"]*)"|(.+))$/m,
  );

  if (!nameMatch) {
    return { valid: false, message: 'Missing "name" in frontmatter' };
  }
  if (!descMatch) {
    return {
      valid: false,
      message: 'Description must be a single-line string: description: ...',
    };
  }

  const name = nameMatch[1].trim();
  const description = (
    descMatch[1] !== undefined
      ? descMatch[1]
      : descMatch[2] !== undefined
        ? descMatch[2]
        : descMatch[3] || ''
  ).trim();

  if (description.includes('\n')) {
    return {
      valid: false,
      message: 'Description must be a single line (no newlines)',
    };
  }

  if (!/^[a-z0-9-]+$/.test(name)) {
    return { valid: false, message: `Name "${name}" should be hyphen-case` };
  }

  if (description.length > 1024) {
    return { valid: false, message: 'Description is too long (max 1024)' };
  }

  const files = getAllFiles(skillPath);
  for (const file of files) {
    const fileContent = fs.readFileSync(file, 'utf8');
    if (fileContent.includes('TODO:')) {
      return {
        valid: true,
        message: 'Skill has unresolved TODOs',
        warning: `Found unresolved TODO in ${path.relative(skillPath, file)}`,
      };
    }
  }

  return { valid: true, message: 'Skill is valid!' };
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (!['node_modules', '.git', '__pycache__'].includes(file)) {
        getAllFiles(name, fileList);
      }
    } else {
      fileList.push(name);
    }
  });
  return fileList;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.log('Usage: npx ts-node validate_skill.ts <skill_directory>');
    process.exit(1);
  }

  const skillDirArg = args[0] ?? '';
  if (skillDirArg.includes('..')) {
    console.error('Error: Path traversal detected in skill directory path.');
    process.exit(1);
  }

  const result = validateSkill(path.resolve(skillDirArg));
  if (result.warning) {
    console.warn(`Warning: ${result.warning}`);
  }
  if (result.valid) {
    console.log(`Success: ${result.message}`);
  } else {
    console.error(`Failure: ${result.message}`);
    process.exit(1);
  }
}
