#!/bin/bash
# Entrypoint for Node.js - runs platform initialization scripts and proxy
set -e

# Run entrypoint scripts (SMTP config, etc.)
if [ -d "/quant-entrypoint.d" ]; then
    for script in /quant-entrypoint.d/*.sh; do
        [ -f "$script" ] && [ -x "$script" ] && "$script"
    done
fi

# Start Quant proxy if enabled (default: enabled)
QUANT_PROXY_ENABLED="${QUANT_PROXY_ENABLED:-true}"
QUANT_PROXY_PORT="${QUANT_PROXY_PORT:-3000}"
QUANT_APP_PORT="${QUANT_APP_PORT:-3001}"

if [ "$QUANT_PROXY_ENABLED" = "true" ] && [ -f "/usr/local/bin/quant-proxy.js" ]; then
    echo "[entrypoint] Starting Quant proxy on :${QUANT_PROXY_PORT} -> :${QUANT_APP_PORT}"

    # Start proxy with auto-restart loop in background
    (
        while true; do
            node /usr/local/bin/quant-proxy.js
            EXIT_CODE=$?
            echo "[quant-proxy] Exited with code ${EXIT_CODE}, restarting in 1s..."
            sleep 1
        done
    ) &
    PROXY_PID=$!

    # Wait for proxy to be ready (max 5 seconds)
    for i in $(seq 1 50); do
        if curl -sf "http://127.0.0.1:${QUANT_PROXY_PORT}/__quant_proxy_health" > /dev/null 2>&1; then
            echo "[entrypoint] Proxy ready"
            break
        fi
        sleep 0.1
    done

    # Trap to clean up proxy loop on exit
    trap "kill $PROXY_PID 2>/dev/null" EXIT
fi

# Drop to node user if running as root
if [ "$(id -u)" = "0" ]; then
    exec gosu node "$@"
fi

exec "$@"
