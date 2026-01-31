#!/usr/bin/env node
/**
 * Quant Cloud Reverse Proxy
 *
 * Transparent proxy that handles header translation for apps running behind
 * Quant's edge network. Rewrites Quant-Orig-Host to Host header so apps
 * see the correct hostname without framework-specific configuration.
 *
 * Features:
 *   - HTTP request proxying with header translation
 *   - WebSocket upgrade support (for HMR, real-time features)
 *   - Request timeout handling
 *   - Auto-restart via entrypoint wrapper
 *
 * Environment variables:
 *   QUANT_PROXY_PORT       - Port proxy listens on (default: 3000)
 *   QUANT_APP_PORT         - Port app listens on (falls back to PORT, then 3001)
 *   QUANT_PROXY_ENABLED    - Set to 'false' to disable (default: true)
 *   QUANT_PROXY_TIMEOUT    - Request timeout in ms (default: 30000)
 *   QUANT_ORIG_HOST_HEADER - Header containing real host (default: quant-orig-host)
 */

const http = require('node:http');
const net = require('node:net');

const PROXY_PORT = parseInt(process.env.QUANT_PROXY_PORT || '3000', 10);
const APP_PORT = parseInt(process.env.QUANT_APP_PORT || process.env.PORT || '3001', 10);
const ORIG_HOST_HEADER = (process.env.QUANT_ORIG_HOST_HEADER || 'quant-orig-host').toLowerCase();
const REQUEST_TIMEOUT = parseInt(process.env.QUANT_PROXY_TIMEOUT || '30000', 10);

// Health check endpoint on proxy itself
const HEALTH_PATH = '/__quant_proxy_health';

const proxy = http.createServer((clientReq, clientRes) => {
  // Proxy health check
  if (clientReq.url === HEALTH_PATH) {
    clientRes.writeHead(200, { 'Content-Type': 'application/json' });
    clientRes.end(JSON.stringify({ status: 'ok', proxy: true }));
    return;
  }

  // Build headers for upstream request
  const headers = { ...clientReq.headers };

  // Rewrite Host header if Quant-Orig-Host is present
  const origHost = headers[ORIG_HOST_HEADER];
  if (origHost) {
    headers['host'] = origHost;
    // Keep original for debugging
    headers['x-quant-original-host'] = origHost;
    delete headers[ORIG_HOST_HEADER];
  }

  // Ensure X-Forwarded headers are set/preserved
  if (!headers['x-forwarded-proto']) {
    headers['x-forwarded-proto'] = 'https';
  }

  // Forward the client IP if not already set
  const clientIp = clientReq.socket.remoteAddress;
  if (clientIp && !headers['x-forwarded-for']) {
    headers['x-forwarded-for'] = clientIp;
  }

  const options = {
    hostname: '127.0.0.1',
    port: APP_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  // Request timeout
  proxyReq.setTimeout(REQUEST_TIMEOUT, () => {
    proxyReq.destroy(new Error('Request timeout'));
  });

  proxyReq.on('error', (err) => {
    console.error(`[quant-proxy] Error forwarding to app: ${err.message}`);

    if (!clientRes.headersSent) {
      if (err.code === 'ECONNREFUSED') {
        clientRes.writeHead(503, { 'Content-Type': 'text/plain' });
        clientRes.end('Service Unavailable - App not ready');
      } else if (err.message === 'Request timeout') {
        clientRes.writeHead(504, { 'Content-Type': 'text/plain' });
        clientRes.end('Gateway Timeout');
      } else {
        clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
        clientRes.end('Bad Gateway');
      }
    }
  });

  // Abort proxy request if client disconnects
  clientReq.on('close', () => {
    if (!clientRes.writableEnded) {
      proxyReq.destroy();
    }
  });

  clientReq.pipe(proxyReq, { end: true });
});

// WebSocket upgrade handling
proxy.on('upgrade', (clientReq, clientSocket, head) => {
  // Build headers with same translation
  const headers = { ...clientReq.headers };
  const origHost = headers[ORIG_HOST_HEADER];
  if (origHost) {
    headers['host'] = origHost;
    delete headers[ORIG_HOST_HEADER];
  }

  // Connect to upstream
  const upstreamSocket = net.connect(APP_PORT, '127.0.0.1', () => {
    // Reconstruct the HTTP upgrade request
    const reqHeaders = Object.entries(headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\r\n');

    upstreamSocket.write(
      `${clientReq.method} ${clientReq.url} HTTP/1.1\r\n${reqHeaders}\r\n\r\n`
    );

    if (head.length > 0) {
      upstreamSocket.write(head);
    }

    // Bi-directional pipe
    upstreamSocket.pipe(clientSocket);
    clientSocket.pipe(upstreamSocket);
  });

  upstreamSocket.on('error', (err) => {
    console.error(`[quant-proxy] WebSocket upgrade error: ${err.message}`);
    clientSocket.destroy();
  });

  clientSocket.on('error', () => {
    upstreamSocket.destroy();
  });
});

proxy.on('error', (err) => {
  console.error(`[quant-proxy] Server error: ${err.message}`);
  process.exit(1);
});

proxy.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`[quant-proxy] Listening on :${PROXY_PORT}, forwarding to :${APP_PORT}`);
  console.log(`[quant-proxy] Header rewrite: ${ORIG_HOST_HEADER} -> Host`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[quant-proxy] Received SIGTERM, shutting down...');
  proxy.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[quant-proxy] Received SIGINT, shutting down...');
  proxy.close(() => process.exit(0));
});
