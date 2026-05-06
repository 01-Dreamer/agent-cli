const fs = require('fs/promises');
const path = require('path');

async function copyDir(sourceDir, targetDir) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  await fs.mkdir(targetDir, { recursive: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDir(sourcePath, targetPath);
    } else if (entry.isFile()) {
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
