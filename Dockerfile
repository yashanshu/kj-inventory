# Dockerfile
# Multi-stage build for minimal production image

# Stage 1: Build Go backend
FROM golang:1.23-alpine AS backend-builder

RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app/backend

# Copy go mod files
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy source code
COPY backend/ .

# Build the binary
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -ldflags="-s -w" -o server ./cmd/server

# Stage 2: Build React frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.12.1 --activate

# Copy package files
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY frontend/ .

# Build the app
RUN pnpm run build

# Stage 3: Final runtime image
FROM alpine:3.20

RUN apk --no-cache add ca-certificates sqlite wget su-exec && \
    addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

# Copy built backend
COPY --from=backend-builder /app/backend/server .

# Copy migrations (fix path)
COPY --from=backend-builder /app/backend/migrations ./migrations

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create data directory for SQLite and logs
RUN mkdir -p /app/data /app/logs && chown -R appuser:appgroup /app
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["./server"]
