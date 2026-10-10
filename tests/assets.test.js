/**
 * Asset registry enforcement test.
 *
 * Scans the assets/ directory on disk and compares against the ASSETS
 * array in js/config/assets.js. Fails if:
 *   - A file exists on disk but is not in the registry
 *   - A registry entry points to a missing file
 *   - A file's size on disk does not match the registry
 *
 * This means: drop a new sprite into assets/, run npm test, and it will
 * tell you to add it to js/config/assets.js. No one has to remember.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ASSETS } from '../js/config/assets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'assets');

/** Recursively collect all files under dir, returning {path, size} objects. */
function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else {
      const stat = fs.statSync(full);
      results.push({
        path: full.replace(root + path.sep, '').replace(/\\/g, '/'),
        size: stat.size,
      });
    }
  }
  return results;
}

test('every file in assets/ has an entry in ASSETS', () => {
  const diskFiles = walk(assetsDir);
  const registryPaths = new Set(ASSETS.map((a) => a.path));

  for (const file of diskFiles) {
    assert.ok(
      registryPaths.has(file.path),
      `${file.path} exists on disk but is not listed in js/config/assets.js — add it to the ASSETS array`
    );
  }
});

test('every entry in ASSETS points to a real file', () => {
  for (const asset of ASSETS) {
    const fullPath = path.join(root, asset.path);
    assert.ok(
      fs.existsSync(fullPath),
      `${asset.path} is in the registry but does not exist on disk`
    );
  }
});

test('file sizes match between disk and registry', () => {
  const diskFiles = walk(assetsDir);
  const diskMap = new Map(diskFiles.map((f) => [f.path, f.size]));

  for (const asset of ASSETS) {
    const diskSize = diskMap.get(asset.path);
    if (diskSize !== undefined) {
      assert.equal(
        asset.size,
        diskSize,
        `${asset.path} size mismatch: registry says ${asset.size}, disk says ${diskSize} — update the size field`
      );
    }
  }
});
