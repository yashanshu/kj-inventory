package domain

import (
	"time"

	"github.com/google/uuid"
)

type PlatformBinding struct {
	ID             uuid.UUID `json:"id" db:"id"`
	OrganizationID uuid.UUID `json:"organizationId" db:"organization_id"`
	StoreID        uuid.UUID `json:"storeId" db:"store_id"`
	Platform       string    `json:"platform" db:"platform"` // "swiggy" | "zomato"
	RestaurantID   string    `json:"restaurantId" db:"restaurant_id"`
	RestaurantName *string   `json:"restaurantName,omitempty" db:"restaurant_name"`
	IsActive       bool      `json:"isActive" db:"is_active"`
	CreatedAt      time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time `json:"updatedAt" db:"updated_at"`
}

type CreatePlatformBindingRequest struct {
	StoreID        uuid.UUID `json:"storeId" validate:"required"`
	Platform       string    `json:"platform" validate:"required,oneof=swiggy zomato"`
	RestaurantID   string    `json:"restaurantId" validate:"required"`
	RestaurantName *string   `json:"restaurantName"`
}

type UpdatePlatformBindingRequest struct {
	RestaurantName *string `json:"restaurantName"`
	IsActive       *bool   `json:"isActive"`
}
