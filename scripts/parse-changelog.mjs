#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const targetVersion = (process.argv[2] || '').replace(/^v/, '').trim();
if (!targetVersion) {
  console.error('Usage: node parse-changelog.mjs <version> [--output <file>]');
  process.exit(1);
}

const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');
if (!fs.existsSync(changelogPath)) {
  console.error(`CHANGELOG.md not found at ${changelogPath}`);
  process.exit(1);
}

const content = fs.readFileSync(changelogPath, 'utf8');
const lines = content.split(/\r?\n/);

let inTarget = false;
const targetLines = [];

const versionHeaderRegex = /^##\s+\[?v?([0-9]+\.[0-9]+\.[0-9]+[^\]\s]*)\]?/;

for (const line of lines) {
  const match = line.match(versionHeaderRegex);
  if (match) {
    const versionFound = match[1];
    if (versionFound === targetVersion) {
      inTarget = true;
      continue;
    } else if (inTarget) {
      // Reached next version section
      break;
    }
  }

  if (inTarget) {
    targetLines.push(line);
  }
}

const result = targetLines.join('\n').trim();
if (!result) {
  console.warn(`⚠️ Warning: No changelog entries found for version [${targetVersion}] in CHANGELOG.md`);
}

const outputArgIdx = process.argv.indexOf('--output');
if (outputArgIdx !== -1 && process.argv[outputArgIdx + 1]) {
  const outPath = path.resolve(process.cwd(), process.argv[outputArgIdx + 1]);
  fs.writeFileSync(outPath, result || `Release ${targetVersion}`, 'utf8');
  console.log(`Saved release notes to ${outPath}`);
} else {
  console.log(result || `Release ${targetVersion}`);
}
