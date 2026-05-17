#!/bin/sh
set -e

# Read the actual DNS server from the container's resolv.conf
RESOLVER=$(grep nameserver /etc/resolv.conf | head -1 | awk '{print $2}')

if [ -z "$RESOLVER" ]; then
  echo "WARNING: could not detect DNS resolver, keeping default"
else
  echo "Using DNS resolver: $RESOLVER"
  sed -i "s|resolver [0-9.]* |resolver $RESOLVER |g" /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'
