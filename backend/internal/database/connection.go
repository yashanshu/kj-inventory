package database

import (
	"database/sql"

	_ "modernc.org/sqlite" // pure-Go sqlite driver
)

// New creates a new database connection
func New(cfgDSN string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", cfgDSN)
	if err != nil {
		return nil, err
	}

	// Enable foreign keys support for SQLite
	if _, err := db.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		db.Close()
		return nil, err
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	// Verify connection
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}

	return db, nil
}
