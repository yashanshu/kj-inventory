package handlers_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	_ "modernc.org/sqlite"

	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/handlers"
	"hasufel.kj/internal/repository"
	"hasufel.kj/internal/services"
	"hasufel.kj/pkg/logger"
)

func setupMovementTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}

	// Create schema
	schema := `
	CREATE TABLE IF NOT EXISTS items (
		id TEXT PRIMARY KEY,
		organization_id TEXT NOT NULL,
		store_id TEXT NOT NULL,
		category_id TEXT NOT NULL,
		name TEXT NOT NULL,
		description TEXT,
		sku TEXT,
		barcode TEXT,
		unit_of_measurement TEXT NOT NULL,
		unit_cost REAL,
		minimum_threshold INTEGER DEFAULT 0,
		current_stock INTEGER DEFAULT 0,
		is_active BOOLEAN DEFAULT true,
		track_stock BOOLEAN DEFAULT true,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS stock_movements (
		id TEXT PRIMARY KEY,
		item_id TEXT NOT NULL,
		movement_type TEXT NOT NULL,
		quantity INTEGER NOT NULL,
		previous_stock INTEGER NOT NULL,
		new_stock INTEGER NOT NULL,
		reference TEXT,
		notes TEXT,
		created_by TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	
	CREATE TABLE IF NOT EXISTS categories (
		id TEXT PRIMARY KEY,
		organization_id TEXT NOT NULL,
		name TEXT NOT NULL,
		description TEXT,
		color TEXT,
		icon TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS alerts (
		id TEXT PRIMARY KEY,
		organization_id TEXT NOT NULL,
		store_id TEXT,
		type TEXT NOT NULL,
		severity TEXT NOT NULL,
		title TEXT NOT NULL,
		message TEXT NOT NULL,
		item_id TEXT,
		is_read BOOLEAN DEFAULT false,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	if _, err := db.Exec(schema); err != nil {
		t.Fatalf("create schema: %v", err)
	}

	return db
}

func setupMovementHandler(t *testing.T, db *sql.DB) (*handlers.MovementHandler, repository.ItemRepository) {
	t.Helper()
	itemRepo := repository.NewItemRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	movementRepo := repository.NewMovementRepository(db)
	alertRepo := repository.NewAlertRepository(db)

	service := services.NewInventoryService(itemRepo, categoryRepo, movementRepo, alertRepo, db)
	log := logger.New("error")
	return handlers.NewMovementHandler(service, log), itemRepo
}

func TestMovementHandler_CreateMovement(t *testing.T) {
	db := setupMovementTestDB(t)
	defer db.Close()

	_, itemRepo := setupMovementHandler(t, db)

	orgID := uuid.New()
	categoryID := uuid.New()

	// Create a test item with stock 10
	item := &domain.Item{
		ID:                uuid.New(),
		OrganizationID:    orgID,
		StoreID:           uuid.New(),
		CategoryID:        categoryID,
		Name:              "Test Item",
		UnitOfMeasurement: "pcs",
		CurrentStock:      10,
		TrackStock:        true,
	}
	// We need to insert it manually or via repo to setup state
	if _, err := itemRepo.Create(context.Background(), item); err != nil {
		t.Fatalf("failed to create test item: %v", err)
	}

	userID := uuid.New()

	tests := []struct {
		name           string
		requestBody    interface{}
		userID         string
		expectedStatus int
		checkResponse  func(t *testing.T, body map[string]interface{})
		checkStock     func(t *testing.T, itemID uuid.UUID)
	}{
		{
			name: "add stock (IN)",
			requestBody: domain.CreateMovementRequest{
				ItemID:       item.ID,
				MovementType: domain.MovementTypeIn,
				Quantity:     5,
				Notes:        &[]string{"Refill"}[0],
			},
			userID:         userID.String(),
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, body map[string]interface{}) {
				data := body["data"].(map[string]interface{})
				if data["newStock"].(float64) != 15 {
					t.Errorf("expected newStock 15, got %v", data["newStock"])
				}
			},
			checkStock: func(t *testing.T, itemID uuid.UUID) {
				updatedItem, _ := itemRepo.GetByID(context.Background(), itemID)
				if updatedItem.CurrentStock != 15 {
					t.Errorf("expected db stock 15, got %d", updatedItem.CurrentStock)
				}
			},
		},
		{
			name: "remove stock (OUT) insufficient",
			requestBody: domain.CreateMovementRequest{
				ItemID:       item.ID,
				MovementType: domain.MovementTypeOut,
				Quantity:     20, // Only 15 now (after previous test if run sequentially? No, tests run in parallel or we need to reset DB. Setup per test is safer.)
			},
			userID:         userID.String(),
			expectedStatus: http.StatusBadRequest, // Or whatever error code for insufficient stock
		},
	}

	// Run tests sequentially to manage DB state or create fresh DB for each
	// Since we share the DB setup in the outer scope, let's create fresh DB for each subtest to avoid dependency

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Fresh DB for each test to isolate state
			subDB := setupMovementTestDB(t)
			defer subDB.Close()
			subHandler, subRepo := setupMovementHandler(t, subDB)

			// Re-create initial item in subDB
			// Note: We need to use fixed IDs if we want to rely on the test struct/setup variables
			// Or just create new ones.
			testItem := &domain.Item{
				ID:                uuid.New(),
				OrganizationID:    uuid.New(),
				StoreID:           uuid.New(),
				CategoryID:        uuid.New(),
				Name:              "Test Item",
				UnitOfMeasurement: "pcs",
				CurrentStock:      10,
				TrackStock:        true,
			}
			_, _ = subRepo.Create(context.Background(), testItem)

			// Adjust request body itemID if it was using the outer item
			if req, ok := tt.requestBody.(domain.CreateMovementRequest); ok {
				req.ItemID = testItem.ID
				tt.requestBody = req
			}

			body, err := json.Marshal(tt.requestBody)
			if err != nil {
				t.Fatalf("marshal request: %v", err)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/v1/movements", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			// Mock context with user_id
			ctx := context.WithValue(req.Context(), "user_id", tt.userID)
			req = req.WithContext(ctx)

			w := httptest.NewRecorder()

			subHandler.CreateMovement(w, req)

			resp := w.Result()
			defer resp.Body.Close()

			if resp.StatusCode != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, resp.StatusCode)
			}

			if tt.checkResponse != nil {
				var responseBody map[string]interface{}
				if err := json.NewDecoder(resp.Body).Decode(&responseBody); err != nil {
					t.Fatalf("decode response: %v", err)
				}
				tt.checkResponse(t, responseBody)
			}

			if tt.checkStock != nil {
				tt.checkStock(t, testItem.ID)
			}
		})
	}
}
