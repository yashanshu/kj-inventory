package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"hasufel.kj/pkg/logger"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

type ctxKey string

const (
	ctxKeyLogger ctxKey = "logger"
)

// responseWriter wraps http.ResponseWriter to capture status and size.
type responseWriter struct {
	http.ResponseWriter
	status int
	size   int
}

func (rw *responseWriter) WriteHeader(status int) {
	rw.status = status
	rw.ResponseWriter.WriteHeader(status)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if rw.status == 0 {
		// default status
		rw.status = http.StatusOK
	}
	n, err := rw.ResponseWriter.Write(b)
	rw.size += n
	return n, err
}

// LoggingMiddleware returns a chi middleware that logs requests using your structured logger.
func LoggingMiddleware(l *logger.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rw := &responseWriter{ResponseWriter: w}

			// Try to obtain route pattern (e.g. "/items/{id}") for better grouping.
			routePattern := chi.RouteContext(r.Context()).RoutePattern()
			if routePattern == "" {
				// fallback to the raw URL path
				routePattern = r.URL.Path
			}

			// Extract request-id if chi's RequestID middleware was used.
			var reqID string
			if v := r.Context().Value(chimiddleware.RequestIDKey); v != nil {
				if s, ok := v.(string); ok {
					reqID = s
				}
			}

			// Try common context keys for user/org (your auth middleware should set one of these).
			userID := pickFirstStringFromContext(r.Context(), "user_id", "userID", "sub")
			orgID := pickFirstStringFromContext(r.Context(), "org_id", "orgID", "org")

			// Create a child logger with structured fields for this request
			reqLogger := l.With(
				"ts", time.Now().UTC().Format(time.RFC3339),
				"method", r.Method,
				"path", r.URL.Path,
				"route", routePattern,
				"remote_addr", r.RemoteAddr,
			)
			if reqID != "" {
				reqLogger = reqLogger.With("request_id", reqID)
			}
			if userID != "" {
				reqLogger = reqLogger.With("user_id", userID)
			}
			if orgID != "" {
				reqLogger = reqLogger.With("org_id", orgID)
			}

			// Put the request-scoped logger into context for handlers to use.
			ctxWithLogger := context.WithValue(r.Context(), ctxKeyLogger, reqLogger)
			r = r.WithContext(ctxWithLogger)

			// Call next handler
			next.ServeHTTP(rw, r)

			// compute duration
			elapsed := time.Since(start)
			durationMs := float64(elapsed.Microseconds()) / 1000.0

			// Add response info
			reqLogger = reqLogger.With(
				"status", rw.status,
				"duration_ms", fmt.Sprintf("%.3f", durationMs),
				"response_size", rw.size,
			)

			// Log at appropriate level
			// 500+ -> Error, 400-499 -> Warn, else Info
			msg := fmt.Sprintf("%s %s", r.Method, routePattern)
			switch {
			case rw.status >= 500:
				reqLogger.Error(msg)
			case rw.status >= 400:
				reqLogger.Warn(msg)
			default:
				reqLogger.Info(msg)
			}
		})
	}
}

// FromContext retrieves the request-scoped logger (if any).
// Falls back to the provided base logger if no scoped logger exists.
func FromContext(ctx context.Context, base *logger.Logger) *logger.Logger {
	if v := ctx.Value(ctxKeyLogger); v != nil {
		if lg, ok := v.(*logger.Logger); ok {
			return lg
		}
	}
	return base
}

// pickFirstStringFromContext looks through candidate keys and returns the first string value found.
func pickFirstStringFromContext(ctx context.Context, keys ...string) string {
	for _, k := range keys {
		if v := ctx.Value(k); v != nil {
			switch t := v.(type) {
			case string:
				if strings.TrimSpace(t) != "" {
					return t
				}
			}
		}
	}
	return ""
}
