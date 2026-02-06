package domain

import (
	"time"
)

// ExternalOrder represents an order from Swiggy/Zomato
type ExternalOrder struct {
	ID              int64      `db:"id" json:"id"`
	Platform        string     `db:"platform" json:"platform"` // "swiggy" or "zomato"
	ExternalOrderID string     `db:"external_order_id" json:"externalOrderId"`
	OrderDate       time.Time  `db:"order_date" json:"orderDate"`
	CustomerName    *string    `db:"customer_name" json:"customerName,omitempty"`
	TotalAmount     float64    `db:"total_amount" json:"totalAmount"`
	Status          string     `db:"status" json:"status"`
	ItemsJSON       *string    `db:"items_json" json:"itemsJson,omitempty"`
	RawData         *string    `db:"raw_data" json:"rawData,omitempty"`
	NotifiedAt      *time.Time `db:"notified_at" json:"notifiedAt,omitempty"`
	CreatedAt       time.Time  `db:"created_at" json:"createdAt"`
}

// OrderItem represents an item in an order (parsed from ItemsJSON)
type OrderItem struct {
	Name     string  `json:"name"`
	Quantity int     `json:"quantity"`
	Price    float64 `json:"price"`
}

// CreateOrderRequest is the request body for order ingestion
type CreateOrderRequest struct {
	Platform        string  `json:"platform" validate:"required,oneof=swiggy zomato"`
	ExternalOrderID string  `json:"externalOrderId" validate:"required"`
	OrderDate       string  `json:"orderDate" validate:"required"`
	CustomerName    *string `json:"customerName"`
	TotalAmount     float64 `json:"totalAmount" validate:"required,gte=0"`
	Status          string  `json:"status"`
	ItemsJSON       *string `json:"itemsJson"`
	RawData         *string `json:"rawData"`
}

// OrderFilters for listing orders
type OrderFilters struct {
	Platform  string
	StartDate *time.Time
	EndDate   *time.Time
	Limit     int
	Offset    int
}

// OrderStats for analytics
type OrderStats struct {
	TotalOrders   int     `json:"totalOrders"`
	TotalRevenue  float64 `json:"totalRevenue"`
	SwiggyOrders  int     `json:"swiggyOrders"`
	SwiggyRevenue float64 `json:"swiggyRevenue"`
	ZomatoOrders  int     `json:"zomatoOrders"`
	ZomatoRevenue float64 `json:"zomatoRevenue"`
	StartDate     string  `json:"startDate"`
	EndDate       string  `json:"endDate"`
}
