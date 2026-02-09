# KJ Order Scraper
FROM node:20-alpine

# Install Playwright dependencies and pnpm
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont && \
    corepack enable && corepack prepare pnpm@latest --activate

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy package files
COPY package.json ./
# Relax constraints: don't require frozen lockfile, just install what's needed
# Force installation of devDependencies (typescript) for the build step
RUN pnpm install --config.production=false

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN pnpm run build

# Create data directory
RUN mkdir -p /app/data

# Copy data preload
# Copy data preload
# COPY data ./data-preload

# Run as non-root
RUN addgroup -g 1001 scraper && \
    adduser -u 1001 -G scraper -s /bin/sh -D scraper && \
    chown -R scraper:scraper /app

USER scraper

# Copy session from preload to volume if it exists, then start
CMD ["/bin/sh", "-c", "if [ -f /app/data-preload/session.json ]; then cp /app/data-preload/session.json /app/data/session.json; fi && node dist/index.js"]

