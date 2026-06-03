import { createServer } from 'node:http';
import { readFile, watch } from 'node:fs/promises';
import { extname } from 'node:path';

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const root = process.cwd();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

const liveReloadScript = `<script>
  new EventSource('/__reload').onmessage = () => location.reload();
</script>`;

const clients = new Set();

// Watch for file changes and notify all SSE clients
(async () => {
  const watcher = watch(root, { recursive: true });
  for await (const event of watcher) {
    if (event.filename?.startsWith('node_modules')) continue;
    for (const res of clients) {
      res.write('data: reload\n\n');
    }
  }
})();

const server = createServer(async (req, res) => {
  if (req.url === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const filePath = new URL(`.${pathname}`, `file://${root}/`).pathname;
    let content = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    if (ext === '.html') {
      content = Buffer.from(content.toString().replace('</body>', `${liveReloadScript}</body>`));
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});
