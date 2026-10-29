ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-bookworm-slim

# Keep automatic patch updates, but reject runtimes predating the Brotli fix.
COPY quant/verify-node-runtime.cjs /usr/local/bin/verify-node-runtime.cjs
RUN node /usr/local/bin/verify-node-runtime.cjs

# Update system packages for security and install common utilities
RUN set -ex; \
    apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gettext \
        git \
        gosu \
        openssl \
        procps \
        tini \
    && \
    rm -rf /var/lib/apt/lists/*

# Same managed-database CA location as the PHP/Drupal base images.
RUN mkdir -p /opt/rds-ca-certs && \
    curl -fsSL --retry 3 https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
      -o /opt/rds-ca-certs/rds-ca-cert-bundle.pem
ENV NODE_EXTRA_CA_CERTS=/opt/rds-ca-certs/rds-ca-cert-bundle.pem

# Node image already has 'node' user at UID 1000 (matches shared filesystem access points)
RUN mkdir -p /app && chown node:node /app

WORKDIR /app

# Copy entrypoint scripts (platform helpers like SSMTP)
COPY quant/entrypoints/ /quant-entrypoint.d/
RUN chmod +x /quant-entrypoint.d/* 2>/dev/null || true

# Copy Quant proxy for header translation
COPY quant/proxy.js /usr/local/bin/quant-proxy.js

COPY quant/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy default application (can be overridden by child images)
COPY --chown=node:node index.js /app/index.js

# Proxy configuration
# QUANT_PROXY_ENABLED: Set to 'false' to disable proxy (for local dev)
# QUANT_PROXY_PORT: External port proxy listens on (default: 3000)
# QUANT_APP_PORT: Internal port app listens on (falls back to PORT env, then 3001)
ENV QUANT_PROXY_ENABLED=true
ENV QUANT_PROXY_PORT=3000
ENV QUANT_APP_PORT=3001

# Expose proxy port (apps should listen on QUANT_APP_PORT internally)
EXPOSE 3000

# Use tini for proper signal handling
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "index.js"]
