#!/usr/bin/env node
/**
 * Lightweight secret scanner (refined).
 * Scans tracked files for risky patterns, excluding allowlisted paths.
 */
const { execSync } = require('child_process');
const fs = require('fs');

// Refined patterns (avoid generic occurrences in docs)
const PATTERNS = [
  /AIRTABLE_API_KEY=(?:pat[a-zA-Z0-9]{20,}|\w{24,})/, // Airtable PAT format
  /JWT_SECRET=[A-Za-z0-9]{32,}/,
  /AWS_ACCESS_KEY_ID=AKIA[0-9A-Z]{16}/,
  /AWS_SECRET_ACCESS_KEY=[0-9A-Za-z\/+=]{40}/,
  /-----BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY-----/,
  /DATABASE_URL=postgres:\/\//,
];

// Paths to skip (exact or prefix). Adjust as needed.
const SKIP_PREFIXES = [
  'node_modules/',
  'backend/node_modules/',
];
const SKIP_FILES = new Set([
  'README.md',
  'backend/.env.example', // example placeholders
]);

function listFiles() {
  const out = execSync('git ls-files', { encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

function shouldSkip(path) {
  if (SKIP_FILES.has(path)) return true;
  return SKIP_PREFIXES.some(p => path.startsWith(p));
}

function scanFile(path) {
  let content;
  try { content = fs.readFileSync(path, 'utf8'); } catch { return []; }
  const hits = [];
  PATTERNS.forEach(p => { if (p.test(content)) hits.push(p); });
  return hits;
}

function main() {
  const files = listFiles();
  const found = [];
  files.forEach(f => {
    if (shouldSkip(f)) return;
    const hits = scanFile(f);
    if (hits.length) {
      found.push({ file: f, patterns: hits.map(h => h.toString()) });
    }
  });
  if (found.length) {
    console.error('\u001b[31mSecret scan FAILED. Potential secrets detected:\u001b[0m');
    found.forEach(r => {
      console.error(`- ${r.file}`);
      r.patterns.forEach(p => console.error(`    pattern: ${p}`));
    });
    process.exit(1);
  }
  console.log('\u001b[32mSecret scan passed.\u001b[0m');
}

if (require.main === module) {
  main();
}
