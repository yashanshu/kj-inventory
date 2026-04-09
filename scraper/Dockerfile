# KJ Order Scraper
FROM node:20-alpine

RUN apk add --no-cache git && \
    corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json ./
RUN pnpm install --config.production=false

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN pnpm run build

# Create data directory
RUN mkdir -p /app/data

# Install su-exec for clean privilege dropping
RUN apk add --no-cache su-exec

# Run as non-root
RUN addgroup -g 1001 scraper && \
    adduser -u 1001 -G scraper -s /bin/sh -D scraper && \
    chown -R scraper:scraper /app

# Entrypoint runs as root to fix volume permissions, then drops to scraper
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
