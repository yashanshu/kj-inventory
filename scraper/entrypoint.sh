#!/bin/sh
# Fix volume ownership so the scraper user can read/write /app/data
chown -R scraper:scraper /app/data

# Clean up stale Chromium lock if present
find /app/data/wwebjs_auth -name 'SingletonLock' -delete 2>/dev/null || true

# Drop privileges and exec the node process
exec su-exec scraper node dist/index.js
