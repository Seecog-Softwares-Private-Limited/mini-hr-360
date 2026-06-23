#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viewsDir = path.join(__dirname, '../src/views');

const IGNORE = new Set(['partials', 'layouts', 'employee', 'landing.hbs', 'login.hbs', 'register.hbs']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.hbs')) files.push(full);
  }
  return files;
}

const between = '(?:\\s|<!--[\\s\\S]*?-->|\\{\\{!--[\\s\\S]*?--\\}\\})*';

const openingPattern = new RegExp(
  `<div class="container-fluid">${between}<div class="row">${between}[\\s\\S]*?\\{\\{>\\s*sidebar[\\s\\S]*?\\}\\}${between}</div>${between}<div class="col-md-9[^"]*">${between}<div class="main-content[^"]*">${between}`
);

const closingPattern = /\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*$/;

let changed = 0;
for (const file of walk(viewsDir)) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('{{> sidebar')) continue;

  const original = content;
  content = content.replace(openingPattern, '');
  if (content !== original) {
    content = content.replace(closingPattern, '\n');
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    changed++;
    console.log('Updated:', path.relative(viewsDir, file));
  }
}

console.log(`Done. ${changed} file(s) updated.`);
