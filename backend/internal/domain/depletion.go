package domain

import (
    "time"

    "github.com/google/uuid"
)

type DepletionMode string

const (
    DepletionModeDisabled DepletionMode = "disabled"
    DepletionModeShadow   DepletionMode = "shadow"
    DepletionModeLive     DepletionMode = "live"
)

type RestaurantBinding struct {
    ID             uuid.UUID `json:"id"`
    OrganizationID uuid.UUID `json:"organizationId"`
    Platform       string    `json:"platform"`
    RestaurantID   string    `json:"restaurantId"`
    RestaurantName *string   `json:"restaurantName,omitempty"`
    IsActive       bool      `json:"isActive"`
    CreatedAt      time.Time `json:"createdAt"`
    UpdatedAt      time.Time `json:"updatedAt"`
}

type DepletionConfig struct {
    OrganizationID     uuid.UUID      `json:"organizationId"`
    Mode               DepletionMode  `json:"mode"`
    CoverageThreshold  int            `json:"coverageThreshold"`
    LiveSince          *time.Time     `json:"liveSince,omitempty"`
    Notes              *string        `json:"notes,omitempty"`
    CreatedAt          time.Time      `json:"createdAt"`
    UpdatedAt          time.Time      `json:"updatedAt"`
}

type DepletionMapping struct {
    ID                   uuid.UUID `json:"id"`
    OrganizationID       uuid.UUID `json:"organizationId"`
    Platform             string    `json:"platform"`
    RestaurantID         string    `json:"restaurantId"`
    MenuItemName         string    `json:"menuItemName"`
    MenuItemKey          string    `json:"menuItemKey"`
    VariantName          string    `json:"variantName"`
    VariantKey           string    `json:"variantKey"`
    InventoryItemID      uuid.UUID `json:"inventoryItemId"`
    QuantityPerOrderUnit int       `json:"quantityPerOrderUnit"`
    IsActive             bool      `json:"isActive"`
    CreatedAt            time.Time `json:"createdAt"`
    UpdatedAt            time.Time `json:"updatedAt"`

    InventoryItem *Item `json:"inventoryItem,omitempty"`
}

type DepletionConsumption struct {
    InventoryItemID   uuid.UUID `json:"inventoryItemId"`
    InventoryItemName string    `json:"inventoryItemName"`
    Quantity          int       `json:"quantity"`
    MenuItemName      string    `json:"menuItemName"`
    VariantName       string    `json:"variantName,omitempty"`
    OrderedQuantity   int       `json:"orderedQuantity"`
}

type UnmappedOrderItem struct {
    MenuItemName string `json:"menuItemName"`
    VariantName  string `json:"variantName,omitempty"`
    Quantity     int    `json:"quantity"`
}

type DepletionOrderEvent struct {
    ID                      uuid.UUID              `json:"id"`
    OrganizationID          uuid.UUID              `json:"organizationId"`
    Platform                string                 `json:"platform"`
    ExternalOrderID         string                 `json:"externalOrderId"`
    RestaurantID            string                 `json:"restaurantId"`
    OrderStatus             string                 `json:"orderStatus"`
    AppliedMode             DepletionMode          `json:"appliedMode"`
    StockApplied            bool                   `json:"stockApplied"`
    StockReversed           bool                   `json:"stockReversed"`
    MappedQuantity          int                    `json:"mappedQuantity"`
    UnmappedQuantity        int                    `json:"unmappedQuantity"`
    EstimatedConsumption    []DepletionConsumption `json:"estimatedConsumption"`
    UnmappedItems           []UnmappedOrderItem    `json:"unmappedItems"`
    LastError               *string                `json:"lastError,omitempty"`
    LastProcessedAt         time.Time              `json:"lastProcessedAt"`
    CreatedAt               time.Time              `json:"createdAt"`
    UpdatedAt               time.Time              `json:"updatedAt"`
}

type DepletionStatus struct {
    Config             *DepletionConfig          `json:"config"`
    BoundRestaurants   []RestaurantBinding       `json:"boundRestaurants"`
    MappingCount       int                       `json:"mappingCount"`
    RecentOrderItems   int                       `json:"recentOrderItems"`
    MappedOrderItems   int                       `json:"mappedOrderItems"`
    CoveragePercent    float64                   `json:"coveragePercent"`
    Readiness          string                    `json:"readiness"`
    CanEnableLive      bool                      `json:"canEnableLive"`
    TopUnmappedItems   []UnmappedOrderItem       `json:"topUnmappedItems"`
}

type DepletionInsights struct {
    RecentEvents      []DepletionOrderEvent `json:"recentEvents"`
    TopUnmappedItems  []UnmappedOrderItem   `json:"topUnmappedItems"`
}

type UpsertRestaurantBindingRequest struct {
    Platform       string  `json:"platform"`
    RestaurantID   string  `json:"restaurantId"`
    RestaurantName *string `json:"restaurantName"`
}

type UpsertDepletionMappingRequest struct {
    Platform             string `json:"platform"`
    RestaurantID         string `json:"restaurantId"`
    MenuItemName         string `json:"menuItemName"`
    VariantName          string `json:"variantName"`
    InventoryItemID      string `json:"inventoryItemId"`
    QuantityPerOrderUnit int    `json:"quantityPerOrderUnit"`
}

type SetDepletionModeRequest struct {
    Mode  DepletionMode `json:"mode"`
    Notes *string       `json:"notes"`
}
