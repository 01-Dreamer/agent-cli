---
name: Text Stats
description: Counts words, characters, lines, and sentences in user-provided text by running a local script.
---
# Instructions

Use this skill when the user asks to count, summarize, or analyze basic text statistics such as words, characters, lines, or sentences.

Always use the `shell` tool to run the bundled script. Do not estimate the counts yourself.

Run the script from the tool workspace with this command shape:

```bash
node ../.agent-cli/skills/text-stats/scripts/text-stats.js "TEXT_TO_ANALYZE"
```

Replace `TEXT_TO_ANALYZE` with the exact text from the user. After the script returns JSON, explain the counts briefly in the user's language.
