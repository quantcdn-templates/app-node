# Node.js Base Image for Quant Cloud

Base image for Node.js applications with Quant Cloud platform integration. **Not intended to run directly** - use as a base for framework templates.

## Features

- **Multiple versions**: Node 20, 22 (LTS), 23 (Current)
- **SMTP support**: ssmtp or Postfix relay (configured via env vars)
- **Signal handling**: tini init system
- **Non-root**: Runs as `node` user (UID 1000, EFS compatible)

## Using as a Base Image

```dockerfile
FROM ghcr.io/quantcdn-templates/app-node:22

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

CMD ["node", "server.js"]
```

## Available Tags

| Tag | Description |
|-----|-------------|
| `latest` | Node 22 LTS |
| `22` | Node.js 22 LTS |
| `20` | Node.js 20 LTS |
| `23` | Node.js 23 Current |

## SMTP Environment Variables (provided by Quant Cloud)

| Variable | Description |
|----------|-------------|
| `QUANT_SMTP_HOST` | SMTP server hostname |
| `QUANT_SMTP_PORT` | SMTP server port |
| `QUANT_SMTP_USERNAME` | SMTP auth username |
| `QUANT_SMTP_PASSWORD` | SMTP auth password |
| `QUANT_SMTP_FROM` | Default from address |
| `QUANT_SMTP_RELAY_ENABLED` | `true` for Postfix, otherwise ssmtp |

## License

MIT
