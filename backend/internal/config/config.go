// TODO: replace with viper
package config

import (
	"os"
	"strconv"
	"strings"
)

type ServerCfg struct {
	Port         string
	ReadTimeout  int
	WriteTimeout int
}

type DBCfg struct {
	Driver string
	DSN    string
}

type JWTCfg struct {
	Secret string
}

type CORS struct {
	AllowedOrigins []string
}

type Config struct {
	Server      ServerCfg
	Database    DBCfg
	JWT         JWTCfg
	CORS        CORS
	ServeStatic bool
	LogLevel    string
}

func Load() Config {
	port := getEnv("SERVER_PORT", "8800")
	readTimeout := getEnvAsInt("SERVER_READ_TIMEOUT", 15)
	writeTimeout := getEnvAsInt("SERVER_WRITE_TIMEOUT", 15)

	driver := strings.ToLower(getEnv("DATABASE_DRIVER", "sqlite"))
	if driver == "sqlite3" {
		driver = "sqlite"
	}

	defaultDSN := "file:./backend/data/inventory.db?_fk=1"
	dsn := normalizeSQLiteDSN(getEnv("DATABASE_URL", defaultDSN))

	jwtSecret := getEnv("JWT_SECRET", "change-me")
	corsOrigins := splitAndTrim(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173"))
	serveStatic := getEnvAsBool("SERVE_STATIC", true)
	logLevel := getEnv("LOG_LEVEL", "info")

	return Config{
		Server: ServerCfg{
			Port: port, ReadTimeout: readTimeout, WriteTimeout: writeTimeout,
		},
		Database: DBCfg{
			Driver: driver,
			DSN:    dsn,
		},
		JWT:         JWTCfg{Secret: jwtSecret},
		CORS:        CORS{AllowedOrigins: corsOrigins},
		ServeStatic: serveStatic,
		LogLevel:    logLevel,
	}
}

func getEnv(key, defaultValue string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	value := getEnv(key, "")
	if value == "" {
		return defaultValue
	}
	if parsed, err := strconv.Atoi(value); err == nil {
		return parsed
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	value := getEnv(key, "")
	if value == "" {
		return defaultValue
	}
	if parsed, err := strconv.ParseBool(value); err == nil {
		return parsed
	}
	return defaultValue
}

func splitAndTrim(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func normalizeSQLiteDSN(dsn string) string {
	if dsn == "" || strings.HasPrefix(dsn, "file:") || strings.Contains(dsn, "://") {
		return dsn
	}
	return "file:" + dsn
}
