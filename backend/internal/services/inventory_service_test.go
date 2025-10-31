package services_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/services"
)

// Mock repository for testing
type mockItemRepo struct {
	items []*domain.Item
}

func (m *mockItemRepo) Create(ctx context.Context, item *domain.Item) (uuid.UUID, error) {
	return uuid.New(), nil
}

func (m *mockItemRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Item, error) {
	return nil, nil
}

func (m *mockItemRepo) List(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*domain.Item, error) {
	return m.items, nil
}

func (m *mockItemRepo) ListWithFilters(ctx context.Context, orgID uuid.UUID, search string, categoryID *uuid.UUID, lowStockOnly bool, limit, offset int) ([]*domain.Item, error) {
	// Simulate pagination by slicing the items
	start := offset
	end := offset + limit
	if start > len(m.items) {
		return []*domain.Item{}, nil
	}
	if end > len(m.items) {
		end = len(m.items)
	}
	return m.items[start:end], nil
}

func (m *mockItemRepo) CountWithFilters(ctx context.Context, orgID uuid.UUID, search string, categoryID *uuid.UUID, lowStockOnly bool) (int, error) {
	return len(m.items), nil
}

func (m *mockItemRepo) Update(ctx context.Context, item *domain.Item) error {
	return nil
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

func (m *mockItemRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

type mockCategoryRepo struct{}

func (m *mockCategoryRepo) Create(ctx context.Context, category *domain.Category) (uuid.UUID, error) {
	return uuid.New(), nil
}

func (m *mockCategoryRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Category, error) {
	return &domain.Category{ID: id}, nil
}

func (m *mockCategoryRepo) List(ctx context.Context, orgID uuid.UUID) ([]*domain.Category, error) {
	return []*domain.Category{}, nil
}

func (m *mockCategoryRepo) Update(ctx context.Context, category *domain.Category) error {
	return nil
}

func (m *mockCategoryRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

type mockMovementRepo struct{}

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
	return []*domain.StockMovement{}, nil
}

type mockAlertRepo struct{}

func (m *mockAlertRepo) Create(ctx context.Context, alert *domain.Alert) (uuid.UUID, error) {
	return uuid.New(), nil
}

func (m *mockAlertRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Alert, error) {
	return nil, nil
}

func (m *mockAlertRepo) ListUnread(ctx context.Context, orgID uuid.UUID, limit int) ([]*domain.Alert, error) {
	return []*domain.Alert{}, nil
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

func TestInventoryService_ListItemsWithFiltersPaginated(t *testing.T) {
	ctx := context.Background()
	orgID := uuid.New()

	// Create mock items
	items := make([]*domain.Item, 25)
	for i := 0; i < 25; i++ {
		items[i] = &domain.Item{
			ID:                uuid.New(),
			OrganizationID:    orgID,
			Name:              "Item",
			UnitOfMeasurement: "pcs",
			MinimumThreshold:  5,
			CurrentStock:      10,
		}
	}

	mockRepo := &mockItemRepo{items: items}
	service := services.NewInventoryService(
		mockRepo,
		&mockCategoryRepo{},
		&mockMovementRepo{},
		&mockAlertRepo{},
		nil,
	)

	tests := []struct {
		name           string
		limit          int
		offset         int
		expectedItems  int
		expectedTotal  int
		description    string
	}{
		{"first page", 10, 0, 10, 25, "should return 10 items with total 25"},
		{"second page", 10, 10, 10, 25, "should return 10 items with total 25"},
		{"third page", 10, 20, 5, 25, "should return 5 items with total 25"},
		{"large page", 50, 0, 25, 25, "should return all 25 items"},
		{"offset beyond total", 10, 30, 0, 25, "should return 0 items with total 25"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := service.ListItemsWithFiltersPaginated(
				ctx, orgID, "", nil, false, tt.limit, tt.offset,
			)
			if err != nil {
				t.Fatalf("ListItemsWithFiltersPaginated: %v", err)
			}

			if result == nil {
				t.Fatal("expected non-nil result")
			}

			if len(result.Items) != tt.expectedItems {
				t.Errorf("%s: expected %d items, got %d", tt.description, tt.expectedItems, len(result.Items))
			}

			if result.Total != tt.expectedTotal {
				t.Errorf("%s: expected total %d, got %d", tt.description, tt.expectedTotal, result.Total)
			}
		})
	}
}

func TestInventoryService_ListItemsWithFiltersPaginated_EmptyResults(t *testing.T) {
	ctx := context.Background()
	orgID := uuid.New()

	// Empty mock repo
	mockRepo := &mockItemRepo{items: []*domain.Item{}}
	service := services.NewInventoryService(
		mockRepo,
		&mockCategoryRepo{},
		&mockMovementRepo{},
		&mockAlertRepo{},
		nil,
	)

	result, err := service.ListItemsWithFiltersPaginated(
		ctx, orgID, "", nil, false, 10, 0,
	)
	if err != nil {
		t.Fatalf("ListItemsWithFiltersPaginated: %v", err)
	}

	if result == nil {
		t.Fatal("expected non-nil result")
	}

	if len(result.Items) != 0 {
		t.Errorf("expected 0 items, got %d", len(result.Items))
	}

	if result.Total != 0 {
		t.Errorf("expected total 0, got %d", result.Total)
	}
}
