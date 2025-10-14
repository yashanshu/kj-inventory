// TODO: replace with viper
package config

// import (
//
//	"log"
//
//	"github.com/spf13/viper"
//
// )
//
//	type Config struct {
//		Server      ServerConfig   `mapstructure:"server"`
//		Database    DatabaseConfig `mapstructure:"database"`
//		JWT         JWTConfig      `mapstructure:"jwt"`
//		CORS        CORSConfig     `mapstructure:"cors"`
//		LogLevel    string         `mapstructure:"log_level"`
//		ServeStatic bool           `mapstructure:"serve_static"`
//	}
//
//	type ServerConfig struct {
//		Port         string `mapstructure:"port"`
//		ReadTimeout  int    `mapstructure:"read_timeout"`
//		WriteTimeout int    `mapstructure:"write_timeout"`
//	}
//
//	type DatabaseConfig struct {
//		Driver      string `mapstructure:"driver"`
//		URL         string `mapstructure:"url"`
//		MaxOpenConn int    `mapstructure:"max_open_conn"`
//		MaxIdleConn int    `mapstructure:"max_idle_conn"`
//	}
//
//	type JWTConfig struct {
//		Secret         string `mapstructure:"secret"`
//		ExpirationTime int    `mapstructure:"expiration_time"`
//	}
//
//	type CORSConfig struct {
//		AllowedOrigins []string `mapstructure:"allowed_origins"`
//	}
//
//	func Load() *Config {
//		viper.SetConfigName("config")
//		viper.SetConfigType("yaml")
//		viper.AddConfigPath(".")
//		viper.AddConfigPath("./config")
//
//		// Set defaults
//		setDefaults()
//
//		// Enable environment variables
//		viper.AutomaticEnv()
//
//		if err := viper.ReadInConfig(); err != nil {
//			log.Printf("No config file found, using defaults and environment variables")
//		}
//
//		var cfg Config
//		if err := viper.Unmarshal(&cfg); err != nil {
//			log.Fatal("Failed to unmarshal config: ", err)
//		}
//
//		return &cfg
//	}
//
//	func setDefaults() {
//		// Server defaults
//		viper.SetDefault("server.port", "8080")
//		viper.SetDefault("server.read_timeout", 10)
//		viper.SetDefault("server.write_timeout", 10)
//
//		// Database defaults
//		viper.SetDefault("database.driver", "sqlite3")
//		viper.SetDefault("database.url", "./inventory.db")
//		viper.SetDefault("database.max_open_conn", 25)
//		viper.SetDefault("database.max_idle_conn", 25)
//
//		// JWT defaults
//		viper.SetDefault("jwt.secret", "your-secret-key-change-in-production")
//		viper.SetDefault("jwt.expiration_time", 24) // hours
//
//		// CORS defaults
//		viper.SetDefault("cors.allowed_origins", []string{"http://localhost:3000", "http://localhost:5173"})
//
//		// Other defaults
//		viper.SetDefault("log_level", "info")
//		viper.SetDefault("serve_static", true)
//	}
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
	return Config{
		Server: ServerCfg{
			Port: "8080", ReadTimeout: 15, WriteTimeout: 15,
		},
		Database: DBCfg{
			Driver: "sqlite",
			DSN:    "file:./data/inventory.db?_fk=1",
		},
		JWT:         JWTCfg{Secret: "change-me"},
		CORS:        CORS{AllowedOrigins: []string{"http://localhost:5173"}},
		ServeStatic: true,
		LogLevel:    "info",
	}
}
