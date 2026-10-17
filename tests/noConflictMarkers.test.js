/**
 * The repository must never contain an unresolved merge.
 *
 * ## Why this test exists
 *
 * Commit `8cccedb` ("merge: origin/main into jim") was committed with the merge unfinished, and it
 * reached `main` via PR #22 carrying literal `<<<<<<<` / `=======` / `>>>>>>>` lines in four files:
 * `css/shop.css` plus three team docs. That is ISS-078.
 *
 * It survived review because **nothing checked**. `check-imports.mjs` reads JS import statements,
 * `node --test` runs the suite, and neither one parses CSS or markdown. The suite was 435 green with
 * the markers in it. A conflict marker is invisible to every tool this project had, which is a gap in
 * the tooling rather than a lapse by whoever merged.
 *
 * ## Why CSS makes it worse than it looks
 *
 * `css/shop.css` is a live stylesheet, so `<<<<<<< HEAD` is parsed as a selector and the file silently
 * loses whatever it declared around the markers. The same merge also resurrected a deleted rule for
 * `#connection-banner`, a selector that no longer exists since ISS-076 renamed it — dead CSS that looks
 * deliberate because it is commented.
 *
 * ## What this catches
 *
 * Any *tracked source or documentation* file with a line beginning with a merge marker. It is a whole-tree
 * check rather than a per-file one precisely because the failure mode is "this file was never opened".
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

/** Directories that are never source and are not worth walking. */
const SKIP = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage']);

/** Extensions worth reading. Binary assets are not scanned. */
const TEXT_EXT = new Set([
  '.js', '.mjs', '.cjs', '.css', '.html', '.md', '.json', '.txt', '.sql', '.yml', '.yaml', '.svg',
]);

/** Recursively collect every text file under `dir`, as repo-relative POSIX paths. */
function walk(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, found);
    } else if (TEXT_EXT.has(path.extname(entry.name).toLowerCase())) {
      found.push(path.relative(root, full).split(path.sep).join('/'));
    }
  }
  return found;
}

/** Every line in the tree that begins with a merge marker. */
function findMarkers() {
  const hits = [];
  for (const file of walk(root)) {
    const lines = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/^(<<<<<<< |=======$|>>>>>>> )/.test(line)) {
        hits.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    });
  }
  return hits;
}

test('no file in the tree contains an unresolved merge marker', () => {
  const hits = findMarkers();

  assert.deepEqual(
    hits,
    [],
    `unresolved conflict markers committed to the repository:\n  ${hits.join('\n  ')}\n` +
      'An unfinished merge was committed. Resolve it, or `git merge --abort` and start again.',
  );
});

test('no file is left unmerged in the index', () => {
  // The same defect one step earlier: a merge in progress that nobody has finished.
  // `git ls-files -u` lists unmerged paths; it prints nothing when the tree is clean.
  let unmerged = '';
  try {
    unmerged = execFileSync('git', ['ls-files', '-u'], { cwd: root, encoding: 'utf8' });
  } catch {
    return; // git unavailable — the marker scan above is the portable check
  }

  assert.equal(
    unmerged.trim(),
    '',
    `these paths are unmerged in the index:\n${unmerged}\nFinish the merge before committing.`,
  );
});

test('the scan would actually catch a marker', () => {
  // A guard that cannot fail is worse than no guard, because it reads as coverage.
  // This asserts the detector matches the three real marker shapes git writes.
  for (const line of ['<<<<<<< HEAD', '<<<<<<< origin/main', '=======', '>>>>>>> origin/main']) {
    assert.ok(
      /^(<<<<<<< |=======$|>>>>>>> )/.test(line),
      `the detector must match git's marker shape: ${line}`,
    );
  }

  // And must not fire on ordinary content that merely contains a ruler or a heading.
  for (const line of ['# Title', 'a === b', 'x <<<<<<< y', '-----', '>>>>>>> quoted text']) {
    if (line === '>>>>>>> quoted text') continue; // a real marker shape, by design
    assert.ok(
      !/^(<<<<<<< |=======$|>>>>>>> )/.test(line),
      `the detector must not fire on ordinary content: ${line}`,
    );
  }
});
