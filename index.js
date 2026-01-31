const http = require('node:http');

// Default to QUANT_APP_PORT (3001) for proxy compatibility
// Apps should listen on this internal port; proxy handles external :3000
const PORT = process.env.PORT || process.env.QUANT_APP_PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', node: process.version }));
    return;
  }

  // Show request headers for debugging proxy behavior
  if (req.url === '/_headers') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(req.headers, null, 2));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html>
<html>
<head>
  <title>Quant Node.js Base Image</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .header { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Quant Node.js Base Image</h1>
  <p>Node.js <strong>${process.version}</strong> is running on port ${PORT}.</p>

  <h2>Request Info</h2>
  <p class="header"><strong>Host:</strong> ${req.headers.host || 'not set'}</p>
  <p class="header"><strong>X-Forwarded-Proto:</strong> ${req.headers['x-forwarded-proto'] || 'not set'}</p>
  <p class="header"><strong>X-Forwarded-For:</strong> ${req.headers['x-forwarded-for'] || 'not set'}</p>

  <h2>Usage</h2>
  <p>To use this base image, extend it in your Dockerfile:</p>
  <pre>FROM ghcr.io/quantcdn-templates/app-node:22

COPY --chown=node:node . .
RUN npm ci --omit=dev

# App listens on internal port 3001; proxy handles external :3000
ENV PORT=3001
CMD ["node", "your-app.js"]</pre>

  <h2>Proxy Architecture</h2>
  <p>The built-in proxy handles header translation:</p>
  <pre>Internet → Edge → :3000 (proxy) → :3001 (your app)</pre>
  <p>Your app sees the correct <code>Host</code> header automatically.</p>

  <h2>Endpoints</h2>
  <ul>
    <li><code>GET /health</code> - Health check</li>
    <li><code>GET /_headers</code> - Show request headers (debug)</li>
  </ul>
</body>
</html>`);
});

server.listen(PORT, HOST, () => {
  console.log(`Quant Node.js base image running at http://${HOST}:${PORT}`);
  console.log(`Node.js ${process.version}`);
});
