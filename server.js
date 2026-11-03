const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon'
};

const liveReloadScript = `
<script>
  (function() {
    const es = new EventSource('/__livereload');
    es.onmessage = function(e) {
      if (e.data === 'reload') {
        console.log('[LiveReload] Dosya güncellendi, sayfa yenileniyor...');
        window.location.reload();
      }
    };
  })();
</script>
`;

let clients = [];

// Watch current directory for changes
let reloadTimeout = null;
fs.watch(__dirname, { recursive: false }, (eventType, filename) => {
  if (filename && (filename.endsWith('.html') || filename.endsWith('.css') || filename.endsWith('.js'))) {
    if (reloadTimeout) clearTimeout(reloadTimeout);
    reloadTimeout = setTimeout(() => {
      clients.forEach(res => res.write('data: reload\n\n'));
    }, 150);
  }
});

const server = http.createServer((req, res) => {
  if (req.url === '/__livereload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    clients.push(res);
    req.on('close', () => {
      clients = clients.filter(c => c !== res);
    });
    return;
  }

  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/code.html';
  }

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(__dirname, safePath);

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    if (ext === '.html') {
      let content = data.toString('utf-8');
      if (content.includes('</body>')) {
        content = content.replace('</body>', `${liveReloadScript}</body>`);
      } else {
        content += liveReloadScript;
      }
      res.end(content);
    } else {
      res.end(data);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`H&A Gümüşçülük yayında: http://localhost:${PORT}`);
});
