---
name: random-number
description: Generates random integers by running a bundled script.
---
# Instructions

Use this skill when the user asks for a random number, dice roll, lottery-style pick, or an integer within a range.

Always use the `shell` tool to run the bundled script. Do not invent the number yourself.

Use the `<base_directory>` value returned by `activate_skill` to build the
script path. Run the script with this command shape:

```bash
node <base_directory>/scripts/random-number.js MIN MAX
```

Replace `MIN` and `MAX` with the requested integer range. If the user does not provide a range, use `1 100`.

After the script returns JSON, tell the user the generated number and mention the range used.
