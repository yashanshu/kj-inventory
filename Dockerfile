# Dockerfile
# Multi-stage build for minimal production image

# Stage 1: Build Go backend
FROM golang:1.21-alpine AS backend-builder

RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app/backend

# Copy go mod files
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy source code
COPY backend/ .

# Build the binary
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -ldflags="-s -w" -o server cmd/server/main.go

# Stage 2: Build React frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy source code
COPY frontend/ .

# Build the app
RUN npm run build

# Stage 3: Final runtime image
FROM alpine:3.18

RUN apk --no-cache add ca-certificates sqlite && \
    addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

# Copy built backend
COPY --from=backend-builder /app/backend/server .
COPY --from=backend-builder /app/backend/internal/database/migrations ./migrations

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

CMD ["./server"]