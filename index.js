const http = require('node:http');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', node: process.version }));
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
  </style>
</head>
<body>
  <h1>Quant Node.js Base Image</h1>
  <p>Node.js <strong>${process.version}</strong> is running.</p>
  <p>This is the default application. To use this base image, extend it in your Dockerfile:</p>
  <pre>FROM ghcr.io/quantcdn-templates/app-node:22

COPY --chown=node:node . .
RUN npm ci --omit=dev

CMD ["node", "your-app.js"]</pre>
  <p>Endpoints:</p>
  <ul>
    <li><code>GET /health</code> - Health check</li>
  </ul>
</body>
</html>`);
});

server.listen(PORT, HOST, () => {
  console.log(`Quant Node.js base image running at http://${HOST}:${PORT}`);
  console.log(`Node.js ${process.version}`);
});
