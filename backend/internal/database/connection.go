package database

import (
	"database/sql"

	_ "modernc.org/sqlite" // pure-Go sqlite driver
)

func New(cfgDSN string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", cfgDSN)
	if err != nil {
		return nil, err
	}
	// set connection pool as needed
	if _, err := db.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		return nil, err
	}
	return db, nil
}
