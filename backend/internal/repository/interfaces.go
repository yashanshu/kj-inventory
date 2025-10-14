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
	UpdateStock(ctx context.Context, id uuid.UUID, newStock int) error
}
