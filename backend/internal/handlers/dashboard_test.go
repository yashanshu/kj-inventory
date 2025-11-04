package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/services"
	"hasufel.kj/pkg/logger"
)

// Mock dashboard service
type mockDashboardService struct {
	metrics         *services.DashboardMetrics
	movements       []*domain.StockMovement
	trends          []services.StockTrend
	breakdown       []services.CategoryBreakdown
	lowStockItems   []*domain.Item
	alerts          []*domain.Alert
	shouldError     bool
}

func (m *mockDashboardService) GetMetrics(ctx context.Context, orgID uuid.UUID) (*services.DashboardMetrics, error) {
	if m.shouldError {
		return nil, assert.AnError
	}
	return m.metrics, nil
}

func (m *mockDashboardService) GetRecentMovements(ctx context.Context, orgID uuid.UUID, limit int) ([]*domain.StockMovement, error) {
	if m.shouldError {
		return nil, assert.AnError
	}
	return m.movements, nil
}

func (m *mockDashboardService) GetStockTrends(ctx context.Context, orgID uuid.UUID, days int) ([]services.StockTrend, error) {
	if m.shouldError {
		return nil, assert.AnError
	}
	return m.trends, nil
}

func (m *mockDashboardService) GetCategoryBreakdown(ctx context.Context, orgID uuid.UUID) ([]services.CategoryBreakdown, error) {
	if m.shouldError {
		return nil, assert.AnError
	}
	return m.breakdown, nil
}

func (m *mockDashboardService) GetLowStockItems(ctx context.Context, orgID uuid.UUID, limit int) ([]*domain.Item, error) {
	if m.shouldError {
		return nil, assert.AnError
	}
	return m.lowStockItems, nil
}

func (m *mockDashboardService) GetAlerts(ctx context.Context, orgID uuid.UUID, limit int) ([]*domain.Alert, error) {
	if m.shouldError {
		return nil, assert.AnError
	}
	return m.alerts, nil
}

func (m *mockDashboardService) MarkAlertAsRead(ctx context.Context, alertID uuid.UUID) error {
	if m.shouldError {
		return assert.AnError
	}
	return nil
}

func TestDashboardHandler_GetMetrics(t *testing.T) {
	mockService := &mockDashboardService{
		metrics: &services.DashboardMetrics{
			TotalItems:      100,
			TotalValue:      150000.50,
			LowStockCount:   5,
			OutOfStockCount: 2,
			RecentMovements: 15,
		},
	}

	handler := NewDashboardHandler(mockService, logger.New("info"))
	orgID := uuid.New()

	req := httptest.NewRequest(http.MethodGet, "/dashboard/metrics", nil)
	req = req.WithContext(context.WithValue(req.Context(), "organization_id", orgID.String()))
	w := httptest.NewRecorder()

	handler.GetMetrics(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	data := response["data"].(map[string]interface{})
	assert.Equal(t, float64(100), data["totalItems"])
	assert.Equal(t, 150000.50, data["totalValue"])
	assert.Equal(t, float64(5), data["lowStockCount"])
	assert.Equal(t, float64(2), data["outOfStockCount"])
	assert.Equal(t, float64(15), data["recentMovements"])
}

func TestDashboardHandler_GetMetrics_InvalidOrgID(t *testing.T) {
	mockService := &mockDashboardService{}
	handler := NewDashboardHandler(mockService, logger.New("info"))

	req := httptest.NewRequest(http.MethodGet, "/dashboard/metrics", nil)
	req = req.WithContext(context.WithValue(req.Context(), "organization_id", "invalid-uuid"))
	w := httptest.NewRecorder()

	handler.GetMetrics(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDashboardHandler_GetMetrics_ServiceError(t *testing.T) {
	mockService := &mockDashboardService{shouldError: true}
	handler := NewDashboardHandler(mockService, logger.New("info"))
	orgID := uuid.New()

	req := httptest.NewRequest(http.MethodGet, "/dashboard/metrics", nil)
	req = req.WithContext(context.WithValue(req.Context(), "organization_id", orgID.String()))
	w := httptest.NewRecorder()

	handler.GetMetrics(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDashboardHandler_GetRecentMovements(t *testing.T) {
	itemID := uuid.New()
	userID := uuid.New()
	mockService := &mockDashboardService{
		movements: []*domain.StockMovement{
			{
				ID:            uuid.New(),
				ItemID:        itemID,
				MovementType:  domain.MovementTypeIn,
				Quantity:      100,
				PreviousStock: 0,
				NewStock:      100,
				CreatedBy:     userID,
				CreatedAt:     time.Now(),
				Item: &domain.Item{
					ID:   itemID,
					Name: "Test Item",
				},
			},
		},
	}

	handler := NewDashboardHandler(mockService, logger.New("info"))
	orgID := uuid.New()

	req := httptest.NewRequest(http.MethodGet, "/dashboard/recent-movements?limit=5", nil)
	req = req.WithContext(context.WithValue(req.Context(), "organization_id", orgID.String()))
	w := httptest.NewRecorder()

	handler.GetRecentMovements(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	data := response["data"].([]interface{})
	assert.Len(t, data, 1)

	movement := data[0].(map[string]interface{})
	assert.Equal(t, "IN", movement["movementType"])
	assert.Equal(t, float64(100), movement["quantity"])

	item := movement["item"].(map[string]interface{})
	assert.Equal(t, "Test Item", item["name"])
}

func TestDashboardHandler_GetRecentMovements_DefaultLimit(t *testing.T) {
	mockService := &mockDashboardService{
		movements: []*domain.StockMovement{},
	}

	handler := NewDashboardHandler(mockService, logger.New("info"))
	orgID := uuid.New()

	req := httptest.NewRequest(http.MethodGet, "/dashboard/recent-movements", nil)
	req = req.WithContext(context.WithValue(req.Context(), "organization_id", orgID.String()))
	w := httptest.NewRecorder()

	handler.GetRecentMovements(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDashboardHandler_GetStockTrends(t *testing.T) {
	mockService := &mockDashboardService{
		trends: []services.StockTrend{
			{Date: "2025-01-04", In: 100, Out: 30},
			{Date: "2025-01-03", In: 50, Out: 20},
		},
	}

	handler := NewDashboardHandler(mockService, logger.New("info"))
	orgID := uuid.New()

	req := httptest.NewRequest(http.MethodGet, "/dashboard/stock-trends?days=7", nil)
	req = req.WithContext(context.WithValue(req.Context(), "organization_id", orgID.String()))
	w := httptest.NewRecorder()

	handler.GetStockTrends(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	data := response["data"].([]interface{})
	assert.Len(t, data, 2)

	trend := data[0].(map[string]interface{})
	assert.Equal(t, "2025-01-04", trend["date"])
	assert.Equal(t, float64(100), trend["in"])
	assert.Equal(t, float64(30), trend["out"])
}

func TestDashboardHandler_GetStockTrends_DefaultDays(t *testing.T) {
	mockService := &mockDashboardService{
		trends: []services.StockTrend{},
	}

	handler := NewDashboardHandler(mockService, logger.New("info"))
	orgID := uuid.New()

	req := httptest.NewRequest(http.MethodGet, "/dashboard/stock-trends", nil)
	req = req.WithContext(context.WithValue(req.Context(), "organization_id", orgID.String()))
	w := httptest.NewRecorder()

	handler.GetStockTrends(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDashboardHandler_GetCategoryBreakdown(t *testing.T) {
	catID := uuid.New()
	mockService := &mockDashboardService{
		breakdown: []services.CategoryBreakdown{
			{
				CategoryID:   catID,
				CategoryName: "Electronics",
				ItemCount:    25,
				TotalValue:   500000.0,
			},
		},
	}

	handler := NewDashboardHandler(mockService, logger.New("info"))
	orgID := uuid.New()

	req := httptest.NewRequest(http.MethodGet, "/dashboard/category-breakdown", nil)
	req = req.WithContext(context.WithValue(req.Context(), "organization_id", orgID.String()))
	w := httptest.NewRecorder()

	handler.GetCategoryBreakdown(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	data := response["data"].([]interface{})
	assert.Len(t, data, 1)

	category := data[0].(map[string]interface{})
	assert.Equal(t, "Electronics", category["category_name"])
	assert.Equal(t, float64(25), category["item_count"])
	assert.Equal(t, 500000.0, category["total_value"])
}

func TestDashboardHandler_GetLowStockItems(t *testing.T) {
	itemID := uuid.New()
	sku := "SKU-001"
	mockService := &mockDashboardService{
		lowStockItems: []*domain.Item{
			{
				ID:               itemID,
				Name:             "Low Stock Item",
				SKU:              &sku,
				UnitOfMeasurement: "pcs",
				MinimumThreshold: 50,
				CurrentStock:     5,
			},
		},
	}

	handler := NewDashboardHandler(mockService, logger.New("info"))
	orgID := uuid.New()

	req := httptest.NewRequest(http.MethodGet, "/dashboard/low-stock?limit=10", nil)
	req = req.WithContext(context.WithValue(req.Context(), "organization_id", orgID.String()))
	w := httptest.NewRecorder()

	handler.GetLowStockItems(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	data := response["data"].([]interface{})
	assert.Len(t, data, 1)

	item := data[0].(map[string]interface{})
	assert.Equal(t, "Low Stock Item", item["name"])
	assert.Equal(t, float64(5), item["currentStock"])
	assert.Equal(t, float64(50), item["minimumThreshold"])
}

func TestDashboardHandler_GetAlerts(t *testing.T) {
	itemID := uuid.New()
	alertID := uuid.New()
	mockService := &mockDashboardService{
		alerts: []*domain.Alert{
			{
				ID:        alertID,
				ItemID:    &itemID,
				Type:      domain.AlertTypeLowStock,
				Severity:  domain.AlertSeverityWarning,
				Title:     "Low Stock Alert",
				Message:   "Item is running low",
				IsRead:    false,
				CreatedAt: time.Now(),
			},
		},
	}

	handler := NewDashboardHandler(mockService, logger.New("info"))
	orgID := uuid.New()

	req := httptest.NewRequest(http.MethodGet, "/dashboard/alerts?limit=10", nil)
	req = req.WithContext(context.WithValue(req.Context(), "organization_id", orgID.String()))
	w := httptest.NewRecorder()

	handler.GetAlerts(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	data := response["data"].([]interface{})
	assert.Len(t, data, 1)

	alert := data[0].(map[string]interface{})
	assert.Equal(t, "LOW_STOCK", alert["type"])
	assert.Equal(t, "Item is running low", alert["message"])
	assert.False(t, alert["isRead"].(bool))
}

func TestDashboardHandler_GetAlerts_ServiceError(t *testing.T) {
	mockService := &mockDashboardService{shouldError: true}
	handler := NewDashboardHandler(mockService, logger.New("info"))
	orgID := uuid.New()

	req := httptest.NewRequest(http.MethodGet, "/dashboard/alerts", nil)
	req = req.WithContext(context.WithValue(req.Context(), "organization_id", orgID.String()))
	w := httptest.NewRecorder()

	handler.GetAlerts(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}
