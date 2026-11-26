/**
 * Assembles the Python package: builds the JS, emits the TypeScript
 * declarations, copies everything under python/urban_bpmn/static and
 * aligns the Python version on package.json.
 *
 * Usage: node scripts/build-python-package.mjs
 */

import { execSync } from 'node:child_process';
import {
  cpSync, mkdirSync, readFileSync, rmSync, writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const run = (command) =>
  execSync(command, { cwd: ROOT, stdio: 'inherit' });

run('npx vite build');
run('npx tsc -p tsconfig.build.json');

const staticDir = join(ROOT, 'python/urban_bpmn/static');
rmSync(staticDir, { recursive: true, force: true });
mkdirSync(staticDir, { recursive: true });

// built JS (+ sourcemap)
cpSync(join(ROOT, 'dist/urban-bpmn.js'), join(staticDir, 'urban-bpmn.js'));
try {
  cpSync(
    join(ROOT, 'dist/urban-bpmn.js.map'),
    join(staticDir, 'urban-bpmn.js.map'));
} catch {
  // sourcemap optional
}

// TypeScript types of the contract, for the host front
cpSync(join(ROOT, 'dist/types'), join(staticDir, 'types'), { recursive: true });

// align the Python version on package.json
const version = JSON.parse(
  readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

const initFile = join(ROOT, 'python/urban_bpmn/__init__.py');
const init = readFileSync(initFile, 'utf8')
  .replace(/__version__ = "[^"]+"/, `__version__ = "${ version }"`);
writeFileSync(initFile, init);

console.log(`paquet python assemblé (version ${ version })`);
