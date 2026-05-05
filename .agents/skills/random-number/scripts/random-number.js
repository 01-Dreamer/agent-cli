#!/usr/bin/env node

const [minArg = '1', maxArg = '100'] = process.argv.slice(2);
const min = Number.parseInt(minArg, 10);
const max = Number.parseInt(maxArg, 10);

if (!Number.isInteger(min) || !Number.isInteger(max)) {
  console.log(JSON.stringify({
    error: 'MIN and MAX must be integers.'
  }));
  process.exit(0);
}

const lower = Math.min(min, max);
const upper = Math.max(min, max);
const value = Math.floor(Math.random() * (upper - lower + 1)) + lower;

console.log(JSON.stringify({
  min: lower,
  max: upper,
  value
}, null, 2));
