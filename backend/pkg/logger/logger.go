// TODO: replace with zap/logrus later
package logger

import (
	"context"
	"log"
	"log/slog"
	"os"
	"time"
)

// Logger wraps slog.Logger with a few convenience methods and level control.
type Logger struct {
	l     *slog.Logger
	level *slog.LevelVar
}

// New creates a new logger with the given level string.
// Supported levels (case-insensitive): "debug", "info", "warn", "error".
// Default is "info" if the input is unrecognized.
func New(level string) *Logger {
	lv := &slog.LevelVar{}
	lv.Set(parseLevel(level))

	h := slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{
		Level:     lv,
		AddSource: true,
		ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
			// Force RFC3339 in UTC for the time attribute.
			if a.Key == slog.TimeKey && a.Value.Kind() == slog.KindTime {
				t := a.Value.Time()
				a.Value = slog.StringValue(t.UTC().Format(time.RFC3339))
			}
			return a
		},
	})

	base := slog.New(h)
	return &Logger{l: base, level: lv}
}

// parseLevel converts a string to a slog.Level.
func parseLevel(s string) slog.Level {
	switch normalize(s) {
	case "debug":
		return slog.LevelDebug
	case "info":
		return slog.LevelInfo
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// normalize makes a string lowercase without allocations for small strings.
func normalize(s string) string {
	b := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if 'A' <= c && c <= 'Z' {
			c = c + 32
		}
		b[i] = c
	}
	return string(b)
}

// With returns a child logger with additional structured attributes attached.
func (lg *Logger) With(args ...any) *Logger {
	return &Logger{l: lg.l.With(args...), level: lg.level}
}

// WithGroup returns a child logger that groups subsequent attributes under name.
func (lg *Logger) WithGroup(name string) *Logger {
	return &Logger{l: lg.l.WithGroup(name), level: lg.level}
}

// SetLevel changes the current logging level at runtime.
func (lg *Logger) SetLevel(level string) {
	lg.level.Set(parseLevel(level))
}

// Level returns the current logging level.
func (lg *Logger) Level() slog.Level {
	return lg.level.Level()
}

// StandardLibraryLogger exposes a *log.Logger that writes through this logger at Info.
func (lg *Logger) StandardLibraryLogger() *log.Logger {
	return slog.NewLogLogger(lg.l.Handler(), slog.LevelInfo)
}

// Handler exposes the underlying slog.Handler (advanced use).
func (lg *Logger) Handler() slog.Handler {
	return lg.l.Handler()
}

// ---- Leveled methods ----

func (lg *Logger) Debug(msg string, args ...any) {
	lg.l.Debug(msg, args...)
}

func (lg *Logger) Info(msg string, args ...any) {
	lg.l.Info(msg, args...)
}

func (lg *Logger) Warn(msg string, args ...any) {
	lg.l.Warn(msg, args...)
}

func (lg *Logger) Error(msg string, args ...any) {
	lg.l.Error(msg, args...)
}

// Fatal logs the message at Error level and exits the process with code 1.
func (lg *Logger) Fatal(msg string, args ...any) {
	lg.l.Error(msg, args...)
	os.Exit(1)
}

// ---- Context helpers (optional) ----

// WithContextAttrs attaches contextual attributes (e.g., request IDs) to a child logger.
// Example: lg.WithContextAttrs(ctx, "request_id", rid)
func (lg *Logger) WithContextAttrs(_ context.Context, args ...any) *Logger {
	// Stub kept for future ctx-based enrichment if you adopt a convention.
	return lg.With(args...)
}
