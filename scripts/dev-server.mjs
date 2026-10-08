// Static file server for local development.
//
// The project has no dependencies and no build step (DEC-002), so this is a
// plain Node http server rather than a bundler or a dev-server package. It
// exists because ES modules do not load over file://.
//
//   node scripts/dev-server.mjs        # http://localhost:5173
//   PORT=8080 node scripts/dev-server.mjs

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT ?? 5173);
const HOST = process.env.HOST ?? '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/** Resolve a URL path to a file inside ROOT, or null if it escapes the root. */
async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const relative = normalize(decoded).replace(/^([/\\])+/, '');
  const target = resolve(join(ROOT, relative));

  // Path traversal guard: never serve anything outside the project folder.
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null;

  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      const index = join(target, 'index.html');
      await stat(index);
      return index;
    }
    return target;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end('Method Not Allowed');
    return;
  }

  const file = await resolveFile(req.url ?? '/');
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  res.writeHead(200, {
    'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    // `no-store`, not `no-cache`. A dev server that lets the browser keep a copy of
    // a module produces the worst kind of bug report: "I fixed it and nothing
    // changed". `no-cache` still permits storing, and with no ETag or Last-Modified
    // to revalidate against, whether a stale copy is reused is left to the
    // browser's discretion. `no-store` means every reload is the file on disk,
    // which is the only contract a dev server can honestly offer.
    'Cache-Control': 'no-store',
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  createReadStream(file).on('error', () => res.end()).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`Forecast Farm dev server → http://${HOST}:${PORT}/`);
  console.log(`  login  http://${HOST}:${PORT}/login.html`);
  console.log(`  game   http://${HOST}:${PORT}/index.html`);
  console.log(`  shop   http://${HOST}:${PORT}/shop.html`);
  console.log(`  settings http://${HOST}:${PORT}/settings.html`);
});