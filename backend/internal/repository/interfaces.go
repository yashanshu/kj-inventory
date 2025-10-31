package repository

import (
	"context"

	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
)

type ItemRepository interface {
	Create(ctx context.Context, item *domain.Item) (uuid.UUID, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Item, error)
	List(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*domain.Item, error)
	ListWithFilters(ctx context.Context, orgID uuid.UUID, search string, categoryID *uuid.UUID, lowStockOnly bool, limit, offset int) ([]*domain.Item, error)
	CountWithFilters(ctx context.Context, orgID uuid.UUID, search string, categoryID *uuid.UUID, lowStockOnly bool) (int, error)
	Update(ctx context.Context, item *domain.Item) error
	UpdateStock(ctx context.Context, id uuid.UUID, newStock int) error
	CountByCategory(ctx context.Context, categoryID uuid.UUID) (int, error)
	ReassignCategory(ctx context.Context, fromCategoryID, toCategoryID uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type UserRepository interface {
	Create(ctx context.Context, user *domain.User) (uuid.UUID, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	List(ctx context.Context, orgID uuid.UUID) ([]*domain.User, error)
	Update(ctx context.Context, user *domain.User) error
}

type CategoryRepository interface {
	Create(ctx context.Context, category *domain.Category) (uuid.UUID, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Category, error)
	List(ctx context.Context, orgID uuid.UUID) ([]*domain.Category, error)
	Update(ctx context.Context, category *domain.Category) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type MovementRepository interface {
	Create(ctx context.Context, movement *domain.StockMovement) (uuid.UUID, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.StockMovement, error)
	ListByItem(ctx context.Context, itemID uuid.UUID, limit, offset int) ([]*domain.StockMovement, error)
	ListByOrganization(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*domain.StockMovement, error)
	ListRecent(ctx context.Context, orgID uuid.UUID, limit int) ([]*domain.StockMovement, error)
}

type AlertRepository interface {
	Create(ctx context.Context, alert *domain.Alert) (uuid.UUID, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Alert, error)
	ListUnread(ctx context.Context, orgID uuid.UUID, limit int) ([]*domain.Alert, error)
	List(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*domain.Alert, error)
	MarkAsRead(ctx context.Context, id uuid.UUID) error
	DeleteByItemID(ctx context.Context, itemID uuid.UUID) error
}
