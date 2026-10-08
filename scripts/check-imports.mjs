// Layering check.
//
// The rules in docs/architecture.md are worth nothing if four people drift from
// them within a week, so this script enforces them and runs in `npm run check`.
//
//   node scripts/check-imports.mjs
//
// It greps `import ... from` lines, `fetch(` and `document.`. It is a grep, not
// a parser: it is right about the rule and occasionally wrong about a line, and
// a failing check is a conversation, not a verdict.

import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const JS_ROOT = join(ROOT, 'js');

/** Which folders each layer may import from. See docs/architecture.md. */
const ALLOWED = {
  config: [],
  utils: ['config'],
  state: ['config', 'utils'],
  domain: ['config', 'utils', 'state/types'],
  services: ['config', 'utils'],
  ui: ['config', 'utils', 'domain', 'state'],
  debug: ['config', 'utils', 'state', 'domain', 'services', 'ui'],
};

/**
 * main.js and the page entry scripts may import anything, and may touch the DOM.
 *
 * One entry per HTML page: index.html -> main.js, login.html -> auth-main.js,
 * almanac.html -> almanac-main.js, shop.html -> shop-main.js,
 * settings.html -> settings-main.js. A page that needs its own boot sequence needs
 * its own entry — the alternative is growing a module that boots four different
 * pages, which is how `auth-main.js` ended up imported by the game page and needing
 * the `#auth-root` guard.
 */
const WILD_CARD = new Set(['main.js', 'auth-main.js', 'almanac-main.js', 'shop-main.js', 'settings-main.js']);

/** Files allowed to touch the DOM outside js/ui/ (ISS-010). */
const DOM_WHITELIST = new Set(['utils/dom.js']);

/** Files allowed to call fetch. Everything else in js/ must not. */
const FETCH_OWNER = 'services';

/** Modules that are not part of a layer, and so have no rules. */
const UNLAYERED = new Set(['utils/dom.js', 'utils/iso.js', 'utils/log.js']);

/**
 * Violations that already exist and are scheduled for removal. They do not fail
 * the check yet, but they print as a reminder and the list must not grow -- an
 * entry that no longer applies means the fix landed, so delete it in the same
 * commit.
 *
 *   map.js        gone. DEC-012 deleted it; it had been sitting on disk.
 *   weatherApi    rewritten in T-04 (DEC-004)
 *   timeApi       rewritten in T-04 (DEC-003)
 */
const KNOWN = new Set([
  'services/timeApi.js:7  document. outside js/ui/ (utils/dom.js is whitelisted)',
  'services/timeApi.js:13  document. outside js/ui/ (utils/dom.js is whitelisted)',
  'services/weatherApi.js:2  document. outside js/ui/ (utils/dom.js is whitelisted)',
  'services/weatherApi.js:11  document. outside js/ui/ (utils/dom.js is whitelisted)',
  'services/weatherApi.js:19  document. outside js/ui/ (utils/dom.js is whitelisted)',
]);

const problems = [];

/** Recursively list .js files under a directory. */
async function jsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const found = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await jsFiles(path)));
    else if (entry.name.endsWith('.js')) found.push(path);
  }

  return found;
}

/** "utils/log.js" for an absolute path inside js/. */
function layerPath(absolute) {
  return relative(JS_ROOT, absolute).split('\\').join('/');
}

/** The layer name for a path, e.g. "utils". Null when it has no layer. */
function layerOf(relativePath) {
  if (WILD_CARD.has(relativePath)) return null;
  if (UNLAYERED.has(relativePath)) return null;
  const [folder] = relativePath.split('/');
  return ALLOWED[folder] ? folder : null;
}

/** The layer a relative import points at, or null when it is not a js/ import. */
function importedLayer(specifier) {
  if (!specifier.startsWith('.')) return null; // a bare specifier, not ours

  const target = specifier.replace(/^\.\.\//, '');
  const [folder] = target.split('/');
  return ALLOWED[folder] ? folder : null;
}

function report(absolute, line, message) {
  problems.push(`${layerPath(absolute)}:${line}  ${message}`);
}

for (const file of await jsFiles(JS_ROOT)) {
  const rel = layerPath(file);
  const layer = layerOf(rel);
  const source = await readFile(file, 'utf8');
  const lines = source.split(/\r?\n/);

  lines.forEach((text, index) => {
    const lineNo = index + 1;
    const importMatch = text.match(/^\s*import\s.*?\sfrom\s+['"]([^'"]+)['"]/);

    if (importMatch) {
      const target = importedLayer(importMatch[1]);
      // `domain` reaching into `state` is only allowed for state/types.
      const typesOnly = importMatch[1].endsWith('state/types.js');

      if (layer && target && !typesOnly && !ALLOWED[layer].includes(target)) {
        report(file, lineNo, `${layer} must not import from ${target} (allowed: ${ALLOWED[layer].join(', ') || 'nothing'})`);
      }
      if (layer && target && target === 'services' && !typesOnly && layer !== 'debug') {
        report(file, lineNo, `${layer} must not import a service directly; main.js injects callbacks`);
      }
    }

    if (/\bfetch\s*\(/.test(text) && !rel.startsWith(FETCH_OWNER)) {
      report(file, lineNo, 'fetch() outside js/services/');
    }

    if (/\bdocument\s*\./.test(text) && !rel.startsWith('ui/') && !WILD_CARD.has(rel) && !DOM_WHITELIST.has(rel)) {
      report(file, lineNo, 'document. outside js/ui/ (utils/dom.js is whitelisted)');
    }

    if (/\balert\s*\(/.test(text)) {
      report(file, lineNo, 'alert() is banned; show a toast instead');
    }

    if (/^\s*<[^!].*\son\w+\s*=/.test(text)) {
      report(file, lineNo, 'inline event handler in markup; attach it in JS');
    }
  });

  // A declaration that shadows one of this file's own imports.
  //
  // Cost: nothing to notice. Consequence: `js/settings-main.js` imported
  // `deleteAccount` from the account service and also declared a local function of
  // that name, so the call inside it resolved to *itself* and recursed until the stack
  // blew. The RangeError was caught and reported as "your account could not be
  // deleted" — with the server working, the password correct, and nothing on screen
  // pointing at the real cause. Every test passed, because the tests that exercise the
  // service import it directly and never load the entry point.
  //
  // It is a grep, like everything else here, and it cannot see a shadowing that is not
  // a plain top-level declaration. That is enough: it is the shape that actually
  // happened, and it is cheap to keep.
  const imported = new Set();
  for (const line of lines) {
    const match = line.match(/^\s*import\s+(?:\{([^}]*)\}|(\w+))/);
    if (!match) continue;
    const named = match[1] ? match[1].split(',') : [match[2]];
    for (const raw of named) {
      const name = (raw.split(/\s+as\s+/).pop() ?? '').trim();
      if (name) imported.add(name);
    }
  }

  if (imported.size > 0) {
    lines.forEach((text, index) => {
      // Any *named* function binding — including one returned from a factory, which is
      // exactly the shape that hid here. `function (\w+)(` only matches a name, so an
      // anonymous callback is not a match.
      const named = text.match(/\bfunction\s+(\w+)\s*\(/)
        ?? text.match(/^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=/);
      if (!named) return;
      const name = named[1];
      if (imported.has(name)) {
        report(file, index + 1, `'${name}' shadows an import of the same name; a call inside it will resolve to itself`);
      }
    });
  }
}

if (problems.length > 0) {
  const fresh = problems.filter((problem) => !KNOWN.has(problem));
  const stale = [...KNOWN].filter((known) => !problems.includes(known));

  for (const problem of fresh) console.error(`  ${problem}`);

  if (stale.length > 0) {
    console.error('\nThese entries in KNOWN no longer match the code. The fix probably landed —');
    console.error('delete them from scripts/check-imports.mjs in the same commit.\n');
    for (const known of stale) console.error(`  ${known}`);
  }

  if (fresh.length > 0) {
    console.error(`\ncheck-imports: ${fresh.length} new violation(s).`);
    process.exit(1);
  }

  console.log(`check-imports: no new violations. ${KNOWN.size} known, awaiting T-04.`);
  process.exit(0);
}

console.log('check-imports: layering rules pass.');