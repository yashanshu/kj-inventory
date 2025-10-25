package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/services"
	"hasufel.kj/pkg/logger"
)

func TestInventoryHandler_CreateItem_RequiresAdmin(t *testing.T) {
	itemRepo := &stubItemRepo{}
	categoryRepo := &stubCategoryRepo{}
	movementRepo := &stubMovementRepo{}
	alertRepo := &stubAlertRepo{}

	service := services.NewInventoryService(itemRepo, categoryRepo, movementRepo, alertRepo, nil)
	handler := NewInventoryHandler(service, logger.New("error"))

	body := `{"categoryId":"` + uuid.New().String() + `","name":"Test Item","unit":"pcs","minimumThreshold":1,"currentStock":5}`
	req := httptest.NewRequest(http.MethodPost, "/items", bytes.NewBufferString(body))
	ctx := context.WithValue(req.Context(), "role", string(domain.RoleUser))
	ctx = context.WithValue(ctx, "organization_id", uuid.New().String())
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler.CreateItem(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d", http.StatusForbidden, rr.Code)
	}

	if itemRepo.createCalled {
		t.Fatalf("expected create not to be called for non-admin user")
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	if _, ok := resp["error"]; !ok {
		t.Fatalf("expected error response body, got %v", resp)
	}
}

func TestInventoryHandler_GetItem_RedactsUnitCostForNonAdmin(t *testing.T) {
	cost := 12.34
	item := &domain.Item{
		ID:         uuid.New(),
		Name:       "Costly Item",
		UnitCost:   &cost,
		CategoryID: uuid.New(),
	}

	itemRepo := &stubItemRepo{getByIDItem: item}
	categoryRepo := &stubCategoryRepo{}
	movementRepo := &stubMovementRepo{}
	alertRepo := &stubAlertRepo{}

	service := services.NewInventoryService(itemRepo, categoryRepo, movementRepo, alertRepo, nil)
	handler := NewInventoryHandler(service, logger.New("error"))

	req := httptest.NewRequest(http.MethodGet, "/items/"+item.ID.String(), nil)
	ctx := context.WithValue(req.Context(), "role", string(domain.RoleUser))
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("id", item.ID.String())
	ctx = context.WithValue(ctx, chi.RouteCtxKey, routeCtx)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	handler.GetItem(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
	}

	var resp struct {
		Data domain.Item `json:"data"`
	}

	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp.Data.UnitCost != nil {
		t.Fatalf("expected unitCost to be redacted for non-admin, got %v", *resp.Data.UnitCost)
	}
}

func TestInventoryHandler_GetItems_RedactsUnitCostForNonAdmin(t *testing.T) {
	cost := 55.0
	item := &domain.Item{
		ID:             uuid.New(),
		OrganizationID: uuid.New(),
		CategoryID:     uuid.New(),
		Name:           "Sample",
		UnitCost:       &cost,
	}

	itemRepo := &stubItemRepo{
		listWithFiltersItems: []*domain.Item{item},
	}
	categoryRepo := &stubCategoryRepo{}
	movementRepo := &stubMovementRepo{}
	alertRepo := &stubAlertRepo{}

	service := services.NewInventoryService(itemRepo, categoryRepo, movementRepo, alertRepo, nil)
	handler := NewInventoryHandler(service, logger.New("error"))

	req := httptest.NewRequest(http.MethodGet, "/items", nil)
	ctx := context.WithValue(req.Context(), "role", string(domain.RoleUser))
	ctx = context.WithValue(ctx, "organization_id", item.OrganizationID.String())
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler.GetItems(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
	}

	var resp struct {
		Data []domain.Item `json:"data"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if len(resp.Data) != 1 {
		t.Fatalf("expected one item, got %d", len(resp.Data))
	}
	if resp.Data[0].UnitCost != nil {
		t.Fatalf("expected unitCost to be redacted for non-admin list response")
	}
}

func TestInventoryHandler_CreateCategory_RequiresAdmin(t *testing.T) {
	itemRepo := &stubItemRepo{}
	categoryRepo := &stubCategoryRepo{}
	movementRepo := &stubMovementRepo{}
	alertRepo := &stubAlertRepo{}

	service := services.NewInventoryService(itemRepo, categoryRepo, movementRepo, alertRepo, nil)
	handler := NewInventoryHandler(service, logger.New("error"))

	body := bytes.NewBufferString(`{"name":"Test Category"}`)
	req := httptest.NewRequest(http.MethodPost, "/categories", body)
	ctx := context.WithValue(req.Context(), "role", string(domain.RoleUser))
	ctx = context.WithValue(ctx, "organization_id", uuid.New().String())
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler.CreateCategory(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d", http.StatusForbidden, rr.Code)
	}

	if categoryRepo.createCalled {
		t.Fatalf("expected category create not to be called for non-admin user")
	}
}

// --- test doubles ---------------------------------------------------------

type stubItemRepo struct {
	createCalled         bool
	getByIDItem          *domain.Item
	listWithFiltersItems []*domain.Item
}

func (s *stubItemRepo) Create(ctx context.Context, item *domain.Item) (uuid.UUID, error) {
	s.createCalled = true
	return uuid.New(), nil
}

func (s *stubItemRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Item, error) {
	return s.getByIDItem, nil
}

func (s *stubItemRepo) List(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*domain.Item, error) {
	return s.listWithFiltersItems, nil
}

func (s *stubItemRepo) ListWithFilters(ctx context.Context, orgID uuid.UUID, search string, categoryID *uuid.UUID, lowStockOnly bool, limit, offset int) ([]*domain.Item, error) {
	return s.listWithFiltersItems, nil
}

func (s *stubItemRepo) Update(ctx context.Context, item *domain.Item) error {
	return nil
}

func (s *stubItemRepo) UpdateStock(ctx context.Context, id uuid.UUID, newStock int) error {
	return nil
}

func (s *stubItemRepo) CountByCategory(ctx context.Context, categoryID uuid.UUID) (int, error) {
	return 0, nil
}

func (s *stubItemRepo) ReassignCategory(ctx context.Context, fromCategoryID, toCategoryID uuid.UUID) error {
	return nil
}

func (s *stubItemRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

type stubCategoryRepo struct {
	createCalled bool
}

func (s *stubCategoryRepo) Create(ctx context.Context, category *domain.Category) (uuid.UUID, error) {
	s.createCalled = true
	return uuid.New(), nil
}

func (s *stubCategoryRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Category, error) {
	return &domain.Category{ID: id, OrganizationID: uuid.New()}, nil
}

func (s *stubCategoryRepo) List(ctx context.Context, orgID uuid.UUID) ([]*domain.Category, error) {
	return nil, nil
}

func (s *stubCategoryRepo) Update(ctx context.Context, category *domain.Category) error {
	return nil
}

func (s *stubCategoryRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

type stubMovementRepo struct{}

func (s *stubMovementRepo) Create(ctx context.Context, movement *domain.StockMovement) (uuid.UUID, error) {
	return uuid.New(), nil
}

func (s *stubMovementRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.StockMovement, error) {
	return nil, nil
}

func (s *stubMovementRepo) ListByItem(ctx context.Context, itemID uuid.UUID, limit, offset int) ([]*domain.StockMovement, error) {
	return nil, nil
}

func (s *stubMovementRepo) ListByOrganization(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*domain.StockMovement, error) {
	return nil, nil
}

func (s *stubMovementRepo) ListRecent(ctx context.Context, orgID uuid.UUID, limit int) ([]*domain.StockMovement, error) {
	return nil, nil
}

type stubAlertRepo struct{}

func (s *stubAlertRepo) Create(ctx context.Context, alert *domain.Alert) (uuid.UUID, error) {
	return uuid.New(), nil
}

func (s *stubAlertRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Alert, error) {
	return nil, nil
}

func (s *stubAlertRepo) ListUnread(ctx context.Context, orgID uuid.UUID, limit int) ([]*domain.Alert, error) {
	return nil, nil
}

func (s *stubAlertRepo) List(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*domain.Alert, error) {
	return nil, nil
}

func (s *stubAlertRepo) MarkAsRead(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (s *stubAlertRepo) DeleteByItemID(ctx context.Context, itemID uuid.UUID) error {
	return nil
}
