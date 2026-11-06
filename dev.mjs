import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.GUIDE_PORT || 4317);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8'};
http.createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filename = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!filename.startsWith(root + path.sep) || pathname.split('/').some(part=>part.startsWith('.'))) { res.writeHead(403); res.end('Forbidden'); return; }
    const content = await readFile(filename);
    res.writeHead(200, {'Content-Type':mime[path.extname(filename)] || 'application/octet-stream','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});
    res.end(content);
  } catch { res.writeHead(404, {'Content-Type':'text/plain'}); res.end('Not found'); }
}).listen(port,'127.0.0.1',()=>process.stdout.write(`Preview: http://127.0.0.1:${port}\n`));
