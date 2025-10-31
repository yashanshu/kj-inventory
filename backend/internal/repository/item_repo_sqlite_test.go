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
	track_stock BOOLEAN NOT NULL,
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
		TrackStock:        true,
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
		TrackStock:        true,
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

func TestItemRepository_ListWithFilters_Pagination(t *testing.T) {
	db := openInMemoryDB(t)
	defer db.Close()

	ctx := context.Background()
	repo := repository.NewItemRepository(db)

	orgID := uuid.New()
	catID := uuid.New()

	// Create 25 items for pagination testing
	for i := 1; i <= 25; i++ {
		item := &domain.Item{
			OrganizationID:    orgID,
			CategoryID:        catID,
			Name:              "Item " + string(rune('A'+i-1)),
			UnitOfMeasurement: "pcs",
			MinimumThreshold:  5,
			CurrentStock:      10,
			IsActive:          true,
			TrackStock:        true,
		}
		_, err := repo.Create(ctx, item)
		if err != nil {
			t.Fatalf("create item %d: %v", i, err)
		}
	}

	tests := []struct {
		name        string
		limit       int
		offset      int
		wantCount   int
		description string
	}{
		{"first page", 10, 0, 10, "should return first 10 items"},
		{"second page", 10, 10, 10, "should return next 10 items"},
		{"third page", 10, 20, 5, "should return remaining 5 items"},
		{"large page", 50, 0, 25, "should return all 25 items"},
		{"offset beyond total", 10, 30, 0, "should return no items"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			items, err := repo.ListWithFilters(ctx, orgID, "", nil, false, tt.limit, tt.offset)
			if err != nil {
				t.Fatalf("ListWithFilters: %v", err)
			}
			if len(items) != tt.wantCount {
				t.Errorf("%s: expected %d items, got %d", tt.description, tt.wantCount, len(items))
			}
		})
	}
}

func TestItemRepository_CountWithFilters(t *testing.T) {
	db := openInMemoryDB(t)
	defer db.Close()

	ctx := context.Background()
	repo := repository.NewItemRepository(db)

	orgID := uuid.New()
	catID1 := uuid.New()
	catID2 := uuid.New()

	// Create items with different properties
	items := []*domain.Item{
		{
			OrganizationID:    orgID,
			CategoryID:        catID1,
			Name:              "Apple",
			UnitOfMeasurement: "kg",
			MinimumThreshold:  10,
			CurrentStock:      5, // low stock
			IsActive:          true,
			TrackStock:        true,
		},
		{
			OrganizationID:    orgID,
			CategoryID:        catID1,
			Name:              "Banana",
			UnitOfMeasurement: "kg",
			MinimumThreshold:  5,
			CurrentStock:      20, // normal stock
			IsActive:          true,
			TrackStock:        true,
		},
		{
			OrganizationID:    orgID,
			CategoryID:        catID2,
			Name:              "Orange",
			UnitOfMeasurement: "kg",
			MinimumThreshold:  10,
			CurrentStock:      3, // low stock
			IsActive:          true,
			TrackStock:        true,
		},
		{
			OrganizationID:    orgID,
			CategoryID:        catID2,
			Name:              "Grape",
			UnitOfMeasurement: "kg",
			MinimumThreshold:  5,
			CurrentStock:      15,
			IsActive:          true,
			TrackStock:        true,
		},
	}

	for _, item := range items {
		_, err := repo.Create(ctx, item)
		if err != nil {
			t.Fatalf("create: %v", err)
		}
	}

	tests := []struct {
		name         string
		search       string
		categoryID   *uuid.UUID
		lowStockOnly bool
		wantCount    int
	}{
		{"no filters", "", nil, false, 4},
		{"search by name", "Apple", nil, false, 1},
		{"search partial", "an", nil, false, 2}, // Banana, Orange
		{"filter by category 1", "", &catID1, false, 2},
		{"filter by category 2", "", &catID2, false, 2},
		{"low stock only", "", nil, true, 2},
		{"category 1 low stock", "", &catID1, true, 1},
		{"search + low stock", "Apple", nil, true, 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			count, err := repo.CountWithFilters(ctx, orgID, tt.search, tt.categoryID, tt.lowStockOnly)
			if err != nil {
				t.Fatalf("CountWithFilters: %v", err)
			}
			if count != tt.wantCount {
				t.Errorf("expected count %d, got %d", tt.wantCount, count)
			}

			// Verify that CountWithFilters matches ListWithFilters
			items, err := repo.ListWithFilters(ctx, orgID, tt.search, tt.categoryID, tt.lowStockOnly, 100, 0)
			if err != nil {
				t.Fatalf("ListWithFilters: %v", err)
			}
			if len(items) != count {
				t.Errorf("CountWithFilters returned %d but ListWithFilters returned %d items", count, len(items))
			}
		})
	}
}
