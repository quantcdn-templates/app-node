#!/bin/bash
# Entrypoint for Node.js - runs platform initialization scripts
set -e

# Run entrypoint scripts (SMTP config, etc.)
if [ -d "/quant-entrypoint.d" ]; then
    for script in /quant-entrypoint.d/*.sh; do
        [ -f "$script" ] && [ -x "$script" ] && "$script"
    done
fi

# Drop to node user if running as root
if [ "$(id -u)" = "0" ]; then
    exec gosu node "$@"
fi

exec "$@"
