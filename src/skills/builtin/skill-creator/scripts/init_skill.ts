#!/usr/bin/env ts-node

/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Skill Initializer - Creates a new skill from template.
 *
 * Usage:
 *     npx ts-node init_skill.ts <skill-name> --path <path>
 */

import * as fs from 'fs';
import * as path from 'path';

const SKILL_TEMPLATE = `---
name: {skill_name}
description: TODO: Complete and informative explanation of what the skill does and when to use it. Include WHEN to use this skill - specific scenarios, file types, or tasks that trigger it.
---

# {skill_title}

## Overview

[TODO: 1-2 sentences explaining what this skill enables]

## Structuring This Skill

[TODO: Choose the structure that best fits this skill's purpose. Common patterns:

**1. Workflow-Based** (best for sequential processes)
- Works well when there are clear step-by-step procedures
- Example: CSV-Processor skill with "Workflow Decision Tree" -> "Ingestion" -> "Cleaning" -> "Analysis"
- Structure: ## Overview -> ## Workflow Decision Tree -> ## Step 1 -> ## Step 2...

**2. Task-Based** (best for tool collections)
- Works well when the skill offers different operations/capabilities
- Example: PDF skill with "Quick Start" -> "Merge PDFs" -> "Split PDFs" -> "Extract Text"
- Structure: ## Overview -> ## Quick Start -> ## Task Category 1 -> ## Task Category 2...

**3. Reference/Guidelines** (best for standards or specifications)
- Works well for brand guidelines, coding standards, or requirements
- Example: Brand styling with "Brand Guidelines" -> "Colors" -> "Typography" -> "Features"
- Structure: ## Overview -> ## Guidelines -> ## Specifications -> ## Usage...

**4. Capabilities-Based** (best for integrated systems)
- Works well when the skill provides multiple interrelated features
- Example: Product Management with "Core Capabilities" -> numbered capability list
- Structure: ## Overview -> ## Core Capabilities -> ### 1. Feature -> ### 2. Feature...

Patterns can be mixed and matched as needed. Most skills combine patterns.

Delete this entire "Structuring This Skill" section when done - it's just guidance.]

## [TODO: Replace with the first main section based on chosen structure]

[TODO: Add content here. See examples in existing skills:
- Code samples for technical skills
- Decision trees for complex workflows
- Concrete examples with realistic user requests
- References to scripts/templates/references as needed]

## Resources

This skill includes example resource directories that demonstrate how to organize different types of bundled resources:

### scripts/
Executable code that can be run directly to perform specific operations.

**Appropriate for:** TypeScript, shell scripts, or any executable code that performs automation, data processing, or specific operations.

**Note:** Scripts may be executed without loading into context, but can still be read by agent-cli for patching or environment adjustments.

### references/
Documentation and reference material intended to be loaded into context to inform agent-cli's process and thinking.

**Appropriate for:** In-depth documentation, API references, database schemas, comprehensive guides, or any detailed information that agent-cli should reference while working.

### assets/
Files not intended to be loaded into context, but rather used within the output agent-cli produces.

**Appropriate for:** Templates, boilerplate code, document templates, images, icons, fonts, or any files meant to be copied or used in the final output.

---

**Any unneeded directories can be deleted.** Not every skill requires all three types of resources.
`;

const EXAMPLE_SCRIPT = `#!/usr/bin/env ts-node

/**
 * Example helper script for {skill_name}.
 *
 * Replace with actual implementation or delete if not needed.
 */

async function main(): Promise<void> {
  try {
    process.stdout.write("Success: Processed the task.\\n");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(\`Failure: \${message}\\n\`);
    process.exit(1);
  }
}

void main();
`;

const EXAMPLE_REFERENCE = `# Reference Documentation for {skill_title}

This is a placeholder for detailed reference documentation.
Replace with actual reference content or delete if not needed.

## Structure Suggestions

### API Reference Example
- Overview
- Authentication
- Endpoints with examples
- Error codes

### Workflow Guide Example
- Prerequisites
- Step-by-step instructions
- Best practices
`;

function titleCase(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 3 || args[1] !== '--path') {
    console.log('Usage: npx ts-node init_skill.ts <skill-name> --path <path>');
    process.exit(1);
  }

  const skillName = args[0] ?? '';
  const basePath = path.resolve(args[2] ?? '');

  if (
    skillName.includes(path.sep) ||
    skillName.includes('/') ||
    skillName.includes('\\')
  ) {
    console.error('Error: Skill name cannot contain path separators.');
    process.exit(1);
  }

  const skillDir = path.join(basePath, skillName);

  if (!skillDir.startsWith(basePath)) {
    console.error('Error: Invalid skill name or path.');
    process.exit(1);
  }

  if (fs.existsSync(skillDir)) {
    console.error(`Error: Skill directory already exists: ${skillDir}`);
    process.exit(1);
  }

  const skillTitle = titleCase(skillName);

  try {
    fs.mkdirSync(skillDir, { recursive: true });
    fs.mkdirSync(path.join(skillDir, 'scripts'));
    fs.mkdirSync(path.join(skillDir, 'references'));
    fs.mkdirSync(path.join(skillDir, 'assets'));

    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      SKILL_TEMPLATE.replace(/{skill_name}/g, skillName).replace(
        /{skill_title}/g,
        skillTitle,
      ),
    );
    fs.writeFileSync(
      path.join(skillDir, 'scripts/example_script.ts'),
      EXAMPLE_SCRIPT.replace(/{skill_name}/g, skillName),
      { mode: 0o755 },
    );
    fs.writeFileSync(
      path.join(skillDir, 'references/example_reference.md'),
      EXAMPLE_REFERENCE.replace(/{skill_title}/g, skillTitle),
    );
    fs.writeFileSync(
      path.join(skillDir, 'assets/example_asset.txt'),
      'Placeholder for assets.',
    );

    console.log(`Success: Skill '${skillName}' initialized at ${skillDir}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

void main();
