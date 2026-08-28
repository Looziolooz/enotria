import http from 'http';
import fs from 'fs';
import path from 'path';

const D = 'dist';
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  const fp = path.join(D, url);
  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
    res.setHeader('Content-Type', MIME[path.extname(fp)] || 'application/octet-stream');
    fs.createReadStream(fp).pipe(res);
  } else {
    res.statusCode = 404;
    res.end('404');
  }
}).listen(4321, () => console.log('listening on 4321'));
