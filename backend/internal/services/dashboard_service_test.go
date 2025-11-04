package services

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"hasufel.kj/internal/domain"
	_ "modernc.org/sqlite"
)

// Mock repositories for testing
type mockItemRepo struct{}

func (m *mockItemRepo) Create(ctx context.Context, item *domain.Item) (uuid.UUID, error) {
	return uuid.New(), nil
}

func (m *mockItemRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Item, error) {
	return nil, nil
}

func (m *mockItemRepo) Update(ctx context.Context, item *domain.Item) error {
	return nil
}

func (m *mockItemRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (m *mockItemRepo) List(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*domain.Item, error) {
	return []*domain.Item{}, nil
}

func (m *mockItemRepo) ListWithFilters(ctx context.Context, orgID uuid.UUID, search string, categoryID *uuid.UUID, lowStockOnly bool, limit, offset int) ([]*domain.Item, error) {
	return []*domain.Item{}, nil
}

func (m *mockItemRepo) CountWithFilters(ctx context.Context, orgID uuid.UUID, search string, categoryID *uuid.UUID, lowStockOnly bool) (int, error) {
	return 0, nil
}

func (m *mockItemRepo) UpdateStock(ctx context.Context, id uuid.UUID, newStock int) error {
	return nil
}

func (m *mockItemRepo) CountByCategory(ctx context.Context, categoryID uuid.UUID) (int, error) {
	return 0, nil
}

func (m *mockItemRepo) ReassignCategory(ctx context.Context, fromCategoryID, toCategoryID uuid.UUID) error {
	return nil
}

type mockMovementRepo struct {
	movements []*domain.StockMovement
}

func (m *mockMovementRepo) Create(ctx context.Context, movement *domain.StockMovement) (uuid.UUID, error) {
	return uuid.New(), nil
}

func (m *mockMovementRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.StockMovement, error) {
	return nil, nil
}

func (m *mockMovementRepo) ListByItem(ctx context.Context, itemID uuid.UUID, limit, offset int) ([]*domain.StockMovement, error) {
	return []*domain.StockMovement{}, nil
}

func (m *mockMovementRepo) ListByOrganization(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*domain.StockMovement, error) {
	return []*domain.StockMovement{}, nil
}

func (m *mockMovementRepo) ListRecent(ctx context.Context, orgID uuid.UUID, limit int) ([]*domain.StockMovement, error) {
	return m.movements, nil
}

type mockAlertRepo struct {
	alerts []*domain.Alert
}

func (m *mockAlertRepo) Create(ctx context.Context, alert *domain.Alert) (uuid.UUID, error) {
	return uuid.New(), nil
}

func (m *mockAlertRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Alert, error) {
	return nil, nil
}

func (m *mockAlertRepo) ListUnread(ctx context.Context, orgID uuid.UUID, limit int) ([]*domain.Alert, error) {
	return m.alerts, nil
}

func (m *mockAlertRepo) List(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*domain.Alert, error) {
	return []*domain.Alert{}, nil
}

func (m *mockAlertRepo) MarkAsRead(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (m *mockAlertRepo) DeleteByItemID(ctx context.Context, itemID uuid.UUID) error {
	return nil
}

// setupTestDB creates an in-memory SQLite database for testing
func setupTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite", ":memory:")
	require.NoError(t, err)

	// Create tables
	schema := `
		CREATE TABLE items (
			id TEXT PRIMARY KEY,
			organization_id TEXT NOT NULL,
			category_id TEXT NOT NULL,
			name TEXT NOT NULL,
			sku TEXT,
			unit_of_measurement TEXT NOT NULL,
			minimum_threshold INTEGER NOT NULL,
			current_stock INTEGER NOT NULL DEFAULT 0,
			unit_cost REAL,
			is_active INTEGER NOT NULL DEFAULT 1,
			track_stock INTEGER NOT NULL DEFAULT 1,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE stock_movements (
			id TEXT PRIMARY KEY,
			item_id TEXT NOT NULL,
			movement_type TEXT NOT NULL,
			quantity INTEGER NOT NULL,
			previous_stock INTEGER NOT NULL,
			new_stock INTEGER NOT NULL,
			reference TEXT,
			notes TEXT,
			created_by TEXT NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (item_id) REFERENCES items(id)
		);

		CREATE TABLE categories (
			id TEXT PRIMARY KEY,
			organization_id TEXT NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`

	_, err = db.Exec(schema)
	require.NoError(t, err)

	return db
}

func TestDashboardService_GetMetrics(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	service := NewDashboardService(&mockItemRepo{}, &mockMovementRepo{}, &mockAlertRepo{}, db)
	orgID := uuid.New()

	// Insert test data
	catID := uuid.New()
	_, err := db.Exec(`
		INSERT INTO categories (id, organization_id, name) VALUES (?, ?, ?)
	`, catID.String(), orgID.String(), "Test Category")
	require.NoError(t, err)

	// Item 1: Normal stock
	item1ID := uuid.New()
	_, err = db.Exec(`
		INSERT INTO items (id, organization_id, category_id, name, unit_of_measurement, minimum_threshold, current_stock, unit_cost, is_active, track_stock)
		VALUES (?, ?, ?, 'Item 1', 'pcs', 10, 50, 100.0, 1, 1)
	`, item1ID.String(), orgID.String(), catID.String())
	require.NoError(t, err)

	// Item 2: Low stock
	item2ID := uuid.New()
	_, err = db.Exec(`
		INSERT INTO items (id, organization_id, category_id, name, unit_of_measurement, minimum_threshold, current_stock, unit_cost, is_active, track_stock)
		VALUES (?, ?, ?, 'Item 2', 'pcs', 20, 5, 50.0, 1, 1)
	`, item2ID.String(), orgID.String(), catID.String())
	require.NoError(t, err)

	// Item 3: Out of stock
	item3ID := uuid.New()
	_, err = db.Exec(`
		INSERT INTO items (id, organization_id, category_id, name, unit_of_measurement, minimum_threshold, current_stock, unit_cost, is_active, track_stock)
		VALUES (?, ?, ?, 'Item 3', 'pcs', 10, 0, 75.0, 1, 1)
	`, item3ID.String(), orgID.String(), catID.String())
	require.NoError(t, err)

	// Add some movements
	userID := uuid.New()
	_, err = db.Exec(`
		INSERT INTO stock_movements (id, item_id, movement_type, quantity, previous_stock, new_stock, created_by, created_at)
		VALUES (?, ?, 'IN', 10, 40, 50, ?, datetime('now'))
	`, uuid.New().String(), item1ID.String(), userID.String())
	require.NoError(t, err)

	// Get metrics
	ctx := context.Background()
	metrics, err := service.GetMetrics(ctx, orgID)

	// Assertions
	require.NoError(t, err)
	assert.NotNil(t, metrics)
	assert.Equal(t, 3, metrics.TotalItems)
	assert.Equal(t, 1, metrics.LowStockCount)
	assert.Equal(t, 1, metrics.OutOfStockCount)
	assert.Equal(t, float64(5250.0), metrics.TotalValue) // (50*100) + (5*50) + (0*75)
	assert.Equal(t, 1, metrics.RecentMovements)
}

func TestDashboardService_GetMetrics_NoItems(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	service := NewDashboardService(&mockItemRepo{}, &mockMovementRepo{}, &mockAlertRepo{}, db)
	orgID := uuid.New()

	ctx := context.Background()
	metrics, err := service.GetMetrics(ctx, orgID)

	require.NoError(t, err)
	assert.NotNil(t, metrics)
	assert.Equal(t, 0, metrics.TotalItems)
	assert.Equal(t, 0, metrics.LowStockCount)
	assert.Equal(t, 0, metrics.OutOfStockCount)
	assert.Equal(t, float64(0), metrics.TotalValue)
	assert.Equal(t, 0, metrics.RecentMovements)
}

func TestDashboardService_GetRecentMovements(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	itemID := uuid.New()
	userID := uuid.New()
	movements := []*domain.StockMovement{
		{
			ID:            uuid.New(),
			ItemID:        itemID,
			MovementType:  domain.MovementTypeIn,
			Quantity:      10,
			PreviousStock: 0,
			NewStock:      10,
			CreatedBy:     userID,
			CreatedAt:     time.Now(),
		},
		{
			ID:            uuid.New(),
			ItemID:        itemID,
			MovementType:  domain.MovementTypeOut,
			Quantity:      5,
			PreviousStock: 10,
			NewStock:      5,
			CreatedBy:     userID,
			CreatedAt:     time.Now(),
		},
	}

	movementRepo := &mockMovementRepo{movements: movements}
	service := NewDashboardService(&mockItemRepo{}, movementRepo, &mockAlertRepo{}, db)
	orgID := uuid.New()

	ctx := context.Background()
	result, err := service.GetRecentMovements(ctx, orgID, 10)

	require.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, domain.MovementTypeIn, result[0].MovementType)
	assert.Equal(t, 10, result[0].Quantity)
	assert.Equal(t, domain.MovementTypeOut, result[1].MovementType)
	assert.Equal(t, 5, result[1].Quantity)
}

func TestDashboardService_GetStockTrends(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	service := NewDashboardService(&mockItemRepo{}, &mockMovementRepo{}, &mockAlertRepo{}, db)
	orgID := uuid.New()

	// Insert test data
	catID := uuid.New()
	_, err := db.Exec(`
		INSERT INTO categories (id, organization_id, name) VALUES (?, ?, ?)
	`, catID.String(), orgID.String(), "Test Category")
	require.NoError(t, err)

	itemID := uuid.New()
	_, err = db.Exec(`
		INSERT INTO items (id, organization_id, category_id, name, unit_of_measurement, minimum_threshold, current_stock, is_active, track_stock)
		VALUES (?, ?, ?, 'Test Item', 'pcs', 10, 50, 1, 1)
	`, itemID.String(), orgID.String(), catID.String())
	require.NoError(t, err)

	userID := uuid.New()
	// Add movements from today
	_, err = db.Exec(`
		INSERT INTO stock_movements (id, item_id, movement_type, quantity, previous_stock, new_stock, created_by, created_at)
		VALUES
			(?, ?, 'IN', 100, 0, 100, ?, datetime('now')),
			(?, ?, 'OUT', 30, 100, 70, ?, datetime('now'))
	`, uuid.New().String(), itemID.String(), userID.String(),
		uuid.New().String(), itemID.String(), userID.String())
	require.NoError(t, err)

	ctx := context.Background()
	trends, err := service.GetStockTrends(ctx, orgID, 7)

	require.NoError(t, err)
	assert.NotEmpty(t, trends)
	assert.Equal(t, 100, trends[0].In)
	assert.Equal(t, 30, trends[0].Out)
}

func TestDashboardService_GetCategoryBreakdown(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	service := NewDashboardService(&mockItemRepo{}, &mockMovementRepo{}, &mockAlertRepo{}, db)
	orgID := uuid.New()

	// Insert categories
	cat1ID := uuid.New()
	_, err := db.Exec(`
		INSERT INTO categories (id, organization_id, name) VALUES (?, ?, 'Electronics')
	`, cat1ID.String(), orgID.String())
	require.NoError(t, err)

	cat2ID := uuid.New()
	_, err = db.Exec(`
		INSERT INTO categories (id, organization_id, name) VALUES (?, ?, 'Furniture')
	`, cat2ID.String(), orgID.String())
	require.NoError(t, err)

	// Insert items in Electronics
	_, err = db.Exec(`
		INSERT INTO items (id, organization_id, category_id, name, unit_of_measurement, minimum_threshold, current_stock, unit_cost, is_active, track_stock)
		VALUES
			(?, ?, ?, 'Laptop', 'pcs', 5, 10, 50000.0, 1, 1),
			(?, ?, ?, 'Mouse', 'pcs', 20, 50, 500.0, 1, 1)
	`, uuid.New().String(), orgID.String(), cat1ID.String(),
		uuid.New().String(), orgID.String(), cat1ID.String())
	require.NoError(t, err)

	// Insert items in Furniture
	_, err = db.Exec(`
		INSERT INTO items (id, organization_id, category_id, name, unit_of_measurement, minimum_threshold, current_stock, unit_cost, is_active, track_stock)
		VALUES (?, ?, ?, 'Chair', 'pcs', 10, 25, 2000.0, 1, 1)
	`, uuid.New().String(), orgID.String(), cat2ID.String())
	require.NoError(t, err)

	ctx := context.Background()
	breakdown, err := service.GetCategoryBreakdown(ctx, orgID)

	require.NoError(t, err)
	assert.Len(t, breakdown, 2)

	// Electronics should be first (higher value)
	assert.Equal(t, "Electronics", breakdown[0].CategoryName)
	assert.Equal(t, 2, breakdown[0].ItemCount)
	assert.Equal(t, float64(525000.0), breakdown[0].TotalValue) // (10*50000) + (50*500)

	assert.Equal(t, "Furniture", breakdown[1].CategoryName)
	assert.Equal(t, 1, breakdown[1].ItemCount)
	assert.Equal(t, float64(50000.0), breakdown[1].TotalValue) // 25*2000
}

func TestDashboardService_GetLowStockItems(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	service := NewDashboardService(&mockItemRepo{}, &mockMovementRepo{}, &mockAlertRepo{}, db)
	orgID := uuid.New()

	catID := uuid.New()
	_, err := db.Exec(`
		INSERT INTO categories (id, organization_id, name) VALUES (?, ?, 'Test')
	`, catID.String(), orgID.String())
	require.NoError(t, err)

	// Low stock item (critical)
	_, err = db.Exec(`
		INSERT INTO items (id, organization_id, category_id, name, unit_of_measurement, minimum_threshold, current_stock, is_active, track_stock)
		VALUES (?, ?, ?, 'Critical Item', 'pcs', 50, 2, 1, 1)
	`, uuid.New().String(), orgID.String(), catID.String())
	require.NoError(t, err)

	// Low stock item (moderate)
	_, err = db.Exec(`
		INSERT INTO items (id, organization_id, category_id, name, unit_of_measurement, minimum_threshold, current_stock, is_active, track_stock)
		VALUES (?, ?, ?, 'Moderate Item', 'pcs', 20, 15, 1, 1)
	`, uuid.New().String(), orgID.String(), catID.String())
	require.NoError(t, err)

	// Normal stock item (should not appear)
	_, err = db.Exec(`
		INSERT INTO items (id, organization_id, category_id, name, unit_of_measurement, minimum_threshold, current_stock, is_active, track_stock)
		VALUES (?, ?, ?, 'Normal Item', 'pcs', 10, 50, 1, 1)
	`, uuid.New().String(), orgID.String(), catID.String())
	require.NoError(t, err)

	ctx := context.Background()
	items, err := service.GetLowStockItems(ctx, orgID, 10)

	require.NoError(t, err)
	assert.Len(t, items, 2)
	// Most critical item should be first
	assert.Equal(t, "Critical Item", items[0].Name)
	assert.Equal(t, 2, items[0].CurrentStock)
	assert.Equal(t, 50, items[0].MinimumThreshold)
}

func TestDashboardService_GetAlerts(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	itemID := uuid.New()
	alerts := []*domain.Alert{
		{
			ID:             uuid.New(),
			OrganizationID: uuid.New(),
			ItemID:         &itemID,
			Type:           domain.AlertTypeLowStock,
			Severity:       domain.AlertSeverityWarning,
			Title:          "Low Stock Alert",
			Message:        "Item is low on stock",
			IsRead:         false,
			CreatedAt:      time.Now(),
		},
	}

	alertRepo := &mockAlertRepo{alerts: alerts}
	service := NewDashboardService(&mockItemRepo{}, &mockMovementRepo{}, alertRepo, db)
	orgID := uuid.New()

	ctx := context.Background()
	result, err := service.GetAlerts(ctx, orgID, 10)

	require.NoError(t, err)
	assert.Len(t, result, 1)
	assert.Equal(t, domain.AlertTypeLowStock, result[0].Type)
	assert.False(t, result[0].IsRead)
}

func TestDashboardService_MarkAlertAsRead(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	service := NewDashboardService(&mockItemRepo{}, &mockMovementRepo{}, &mockAlertRepo{}, db)
	alertID := uuid.New()

	ctx := context.Background()
	err := service.MarkAlertAsRead(ctx, alertID)

	require.NoError(t, err)
}
