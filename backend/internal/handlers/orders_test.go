package handlers_test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	_ "modernc.org/sqlite"

	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/handlers"
	"hasufel.kj/internal/repository"
	"hasufel.kj/pkg/logger"
)

func setupOrderTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}

	// Create schema
	schema := `
	CREATE TABLE IF NOT EXISTS external_orders (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		platform TEXT NOT NULL,
		external_order_id TEXT NOT NULL,
		order_date DATETIME NOT NULL,
		customer_name TEXT,
		total_amount REAL NOT NULL,
		status TEXT NOT NULL,
		items_json TEXT,
		raw_data TEXT,
		notified_at DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE UNIQUE INDEX IF NOT EXISTS idx_external_orders_platform_id ON external_orders(platform, external_order_id);
	`
	if _, err := db.Exec(schema); err != nil {
		t.Fatalf("create schema: %v", err)
	}

	return db
}

func setupOrderHandler(t *testing.T, db *sql.DB) *handlers.OrderHandler {
	t.Helper()
	repo := repository.NewOrderRepository(db)
	log := logger.New("error") // Use error level to reduce noise
	return handlers.NewOrderHandler(repo, log)
}

func TestOrderHandler_IngestOrder(t *testing.T) {
	db := setupOrderTestDB(t)
	defer db.Close()

	handler := setupOrderHandler(t, db)

	tests := []struct {
		name           string
		requestBody    interface{}
		expectedStatus int
		checkResponse  func(t *testing.T, body map[string]interface{})
	}{
		{
			name: "successful ingest swiggy",
			requestBody: domain.CreateOrderRequest{
				Platform:        "swiggy",
				ExternalOrderID: "123456",
				OrderDate:       time.Now().Format(time.RFC3339),
				TotalAmount:     100.50,
				Status:          "delivered",
			},
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, body map[string]interface{}) {
				if body["status"] != "created" {
					t.Errorf("expected status created, got %v", body["status"])
				}
				if body["orderId"] == nil {
					t.Error("expected orderId in response")
				}
			},
		},
		{
			name: "successful ingest zomato",
			requestBody: domain.CreateOrderRequest{
				Platform:        "zomato",
				ExternalOrderID: "ZOM123",
				OrderDate:       time.Now().Format(time.RFC3339),
				TotalAmount:     250.00,
				Status:          "delivered",
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "duplicate order (idempotency)",
			requestBody: domain.CreateOrderRequest{
				Platform:        "swiggy",
				ExternalOrderID: "123456", // Same as first test
				OrderDate:       time.Now().Format(time.RFC3339),
				TotalAmount:     100.50,
				Status:          "delivered",
			},
			expectedStatus: http.StatusOK, // Should verify it exists and return OK
			checkResponse: func(t *testing.T, body map[string]interface{}) {
				if body["status"] != "exists" {
					t.Errorf("expected status exists, got %v", body["status"])
				}
			},
		},
		{
			name: "invalid platform",
			requestBody: domain.CreateOrderRequest{
				Platform:        "", // Empty
				ExternalOrderID: "999",
				OrderDate:       time.Now().Format(time.RFC3339),
				TotalAmount:     50,
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "missing external ID",
			requestBody: domain.CreateOrderRequest{
				Platform:    "swiggy",
				OrderDate:   time.Now().Format(time.RFC3339),
				TotalAmount: 50,
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, err := json.Marshal(tt.requestBody)
			if err != nil {
				t.Fatalf("marshal request: %v", err)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/v1/orders/ingest", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			handler.IngestOrder(w, req)

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
		})
	}
}

func TestOrderHandler_ListOrders(t *testing.T) {
	db := setupOrderTestDB(t)
	defer db.Close()

	// Seed data
	repo := repository.NewOrderRepository(db)
	order1 := &domain.ExternalOrder{
		Platform:        "swiggy",
		ExternalOrderID: "S1",
		OrderDate:       time.Now().Add(-1 * time.Hour),
		TotalAmount:     100,
		Status:          "delivered",
	}
	order2 := &domain.ExternalOrder{
		Platform:        "zomato",
		ExternalOrderID: "Z1",
		OrderDate:       time.Now(),
		TotalAmount:     200,
		Status:          "delivered",
	}
	_ = repo.Create(order1)
	_ = repo.Create(order2)

	handler := setupOrderHandler(t, db)

	tests := []struct {
		name           string
		url            string
		expectedCount  int
		expectedStatus int
	}{
		{
			name:           "list all",
			url:            "/api/v1/orders",
			expectedCount:  2,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "filter by platform swiggy",
			url:            "/api/v1/orders?platform=swiggy",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "filter by platform zomato",
			url:            "/api/v1/orders?platform=zomato",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "pagination",
			url:            "/api/v1/orders?limit=1",
			expectedCount:  1,
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()

			handler.ListOrders(w, req)

			resp := w.Result()
			defer resp.Body.Close()

			if resp.StatusCode != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, resp.StatusCode)
			}

			var orders []domain.ExternalOrder
			if err := json.NewDecoder(resp.Body).Decode(&orders); err != nil {
				t.Fatalf("decode response: %v", err)
			}

			if len(orders) != tt.expectedCount {
				t.Errorf("expected %d orders, got %d", tt.expectedCount, len(orders))
			}
		})
	}
}

func TestOrderHandler_GetOrderStats(t *testing.T) {
	db := setupOrderTestDB(t)
	defer db.Close()

	// Seed data with specific dates
	repo := repository.NewOrderRepository(db)
	now := time.Now()

	// Create orders for testing stats
	orders := []*domain.ExternalOrder{
		{
			Platform:        "swiggy",
			ExternalOrderID: "STATS1",
			OrderDate:       now.Add(-1 * time.Hour),
			TotalAmount:     100.50,
			Status:          "delivered",
		},
		{
			Platform:        "swiggy",
			ExternalOrderID: "STATS2",
			OrderDate:       now.Add(-2 * time.Hour),
			TotalAmount:     200.00,
			Status:          "delivered",
		},
		{
			Platform:        "zomato",
			ExternalOrderID: "STATS3",
			OrderDate:       now.Add(-3 * time.Hour),
			TotalAmount:     150.75,
			Status:          "delivered",
		},
	}

	for _, order := range orders {
		if err := repo.Create(order); err != nil {
			t.Fatalf("create order: %v", err)
		}
	}

	handler := setupOrderHandler(t, db)

	tests := []struct {
		name           string
		url            string
		expectedStatus int
		checkResponse  func(t *testing.T, stats domain.OrderStats)
	}{
		{
			name:           "default stats (last 30 days)",
			url:            "/api/v1/orders/stats",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, stats domain.OrderStats) {
				if stats.TotalOrders != 3 {
					t.Errorf("expected 3 total orders, got %d", stats.TotalOrders)
				}
				// Total: 100.50 + 200 + 150.75 = 451.25
				expectedRevenue := 451.25
				if stats.TotalRevenue != expectedRevenue {
					t.Errorf("expected revenue %.2f, got %.2f", expectedRevenue, stats.TotalRevenue)
				}
				if stats.SwiggyOrders != 2 {
					t.Errorf("expected 2 swiggy orders, got %d", stats.SwiggyOrders)
				}
				if stats.ZomatoOrders != 1 {
					t.Errorf("expected 1 zomato order, got %d", stats.ZomatoOrders)
				}
			},
		},
		{
			name:           "stats with custom date range",
			url:            "/api/v1/orders/stats?startDate=" + now.Add(-48*time.Hour).Format("2006-01-02") + "&endDate=" + now.Add(24*time.Hour).Format("2006-01-02"),
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, stats domain.OrderStats) {
				if stats.TotalOrders != 3 {
					t.Errorf("expected 3 orders in date range, got %d", stats.TotalOrders)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()

			handler.GetOrderStats(w, req)

			resp := w.Result()
			defer resp.Body.Close()

			if resp.StatusCode != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, resp.StatusCode)
			}

			if tt.checkResponse != nil {
				var stats domain.OrderStats
				if err := json.NewDecoder(resp.Body).Decode(&stats); err != nil {
					t.Fatalf("decode response: %v", err)
				}
				tt.checkResponse(t, stats)
			}
		})
	}
}

func TestOrderHandler_IngestOrderWithItems(t *testing.T) {
	db := setupOrderTestDB(t)
	defer db.Close()

	handler := setupOrderHandler(t, db)

	// Test order with items JSON
	itemsJSON := `[{"name":"Butter Chicken","quantity":2,"price":350},{"name":"Naan","quantity":4,"price":40}]`
	customerName := "Test Customer"

	request := domain.CreateOrderRequest{
		Platform:        "swiggy",
		ExternalOrderID: "ITEMS123",
		OrderDate:       time.Now().Format(time.RFC3339),
		CustomerName:    &customerName,
		TotalAmount:     860,
		Status:          "ordered",
		ItemsJSON:       &itemsJSON,
	}

	body, _ := json.Marshal(request)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/orders/ingest", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.IngestOrder(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		t.Errorf("expected status 201, got %d", resp.StatusCode)
	}

	// Verify order was saved with items
	repo := repository.NewOrderRepository(db)
	saved, err := repo.GetByExternalID("swiggy", "ITEMS123")
	if err != nil {
		t.Fatalf("get order: %v", err)
	}
	if saved == nil {
		t.Fatal("expected order to be saved")
	}
	if saved.ItemsJSON == nil || *saved.ItemsJSON != itemsJSON {
		t.Errorf("items not saved correctly")
	}
	if saved.CustomerName == nil || *saved.CustomerName != customerName {
		t.Errorf("customer name not saved correctly")
	}
}
