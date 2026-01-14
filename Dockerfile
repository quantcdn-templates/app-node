ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-bookworm-slim

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

# Node image already has 'node' user at UID 1000 (matches EFS access points)
RUN mkdir -p /app && chown node:node /app

WORKDIR /app

# Copy entrypoint scripts (platform helpers like SSMTP)
COPY quant/entrypoints/ /quant-entrypoint.d/
RUN chmod +x /quant-entrypoint.d/*

COPY quant/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy default application (can be overridden by child images)
COPY --chown=node:node index.js /app/index.js

EXPOSE 3000

# Use tini for proper signal handling
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "index.js"]
