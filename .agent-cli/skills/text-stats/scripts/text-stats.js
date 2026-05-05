#!/usr/bin/env node

const input = process.argv.slice(2).join(' ');

if (!input.trim()) {
  console.log(JSON.stringify({
    error: 'No text provided. Pass text as command line arguments.'
  }));
  process.exit(0);
}

const characters = input.length;
const charactersNoSpaces = input.replace(/\s/g, '').length;
const words = input.trim().split(/\s+/).filter(Boolean).length;
const lines = input.split(/\r\n|\r|\n/).length;
const sentences = input
  .split(/[.!?。！？]+/)
  .map((part) => part.trim())
  .filter(Boolean).length;

console.log(JSON.stringify({
  text: input,
  characters,
  charactersNoSpaces,
  words,
  lines,
  sentences
}, null, 2));
