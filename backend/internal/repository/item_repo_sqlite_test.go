package repository_test

import (
	"context"
	"database/sql"
	"testing"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"

	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/repository"
)

func openInMemoryDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	// minimal schema for test
	schema := `
	CREATE TABLE items (
		id TEXT PRIMARY KEY,
		organization_id TEXT NOT NULL,
		category_id TEXT NOT NULL,
		name TEXT NOT NULL,
		sku TEXT,
		unit_of_measurement TEXT NOT NULL,
		minimum_threshold INTEGER NOT NULL,
		current_stock INTEGER NOT NULL,
		unit_cost REAL,
		is_active BOOLEAN NOT NULL,
		created_at DATETIME NOT NULL,
		updated_at DATETIME NOT NULL
	);
	`
	if _, err := db.Exec(schema); err != nil {
		t.Fatalf("create schema: %v", err)
	}
	return db
}

func TestItemRepository_Create_Get_List(t *testing.T) {
	db := openInMemoryDB(t)
	defer db.Close()

	ctx := context.Background()
	repo := repository.NewItemRepository(db)

	orgID := uuid.New()
	catID := uuid.New()
	item := &domain.Item{
		OrganizationID:    orgID,
		CategoryID:        catID,
		Name:              "Widget",
		UnitOfMeasurement: "pcs",
		MinimumThreshold:  5,
		CurrentStock:      10,
		IsActive:          true,
	}

	id, err := repo.Create(ctx, item)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if id == uuid.Nil {
		t.Fatalf("expected valid UUID")
	}

	got, err := repo.GetByID(ctx, id)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got == nil || got.Name != item.Name {
		t.Fatalf("expected %q, got %+v", item.Name, got)
	}

	list, err := repo.List(ctx, orgID, 10, 0)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 item, got %d", len(list))
	}
}

func TestItemRepository_UpdateStock(t *testing.T) {
	db := openInMemoryDB(t)
	defer db.Close()

	ctx := context.Background()
	repo := repository.NewItemRepository(db)

	item := &domain.Item{
		OrganizationID:    uuid.New(),
		CategoryID:        uuid.New(),
		Name:              "Thing",
		UnitOfMeasurement: "kg",
		MinimumThreshold:  1,
		CurrentStock:      3,
		IsActive:          true,
	}
	id, _ := repo.Create(ctx, item)

	if err := repo.UpdateStock(ctx, id, 20); err != nil {
		t.Fatalf("update: %v", err)
	}
	got, _ := repo.GetByID(ctx, id)
	if got.CurrentStock != 20 {
		t.Fatalf("expected stock 20, got %d", got.CurrentStock)
	}
}
