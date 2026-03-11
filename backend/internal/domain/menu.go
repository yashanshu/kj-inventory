package domain

import (
	"time"
)

// RestaurantMenu represents a cached restaurant menu from Swiggy
type RestaurantMenu struct {
	ID             int64     `db:"id" json:"id"`
	StoreID        *string   `db:"store_id" json:"storeId,omitempty"`
	Platform       string    `db:"platform" json:"platform"`
	RestaurantID   string    `db:"restaurant_id" json:"restaurantId"`
	RestaurantName *string   `db:"restaurant_name" json:"restaurantName,omitempty"`
	OffersJSON     *string   `db:"offers_json" json:"offersJson,omitempty"`
	CategoriesJSON *string   `db:"categories_json" json:"categoriesJson,omitempty"`
	FetchedAt      time.Time `db:"fetched_at" json:"fetchedAt"`
	CreatedAt      time.Time `db:"created_at" json:"createdAt"`
}

// UpsertMenuRequest is the request body for menu upsert from scraper
type UpsertMenuRequest struct {
	Platform       string  `json:"platform"`
	RestaurantID   string  `json:"restaurantId" validate:"required"`
	RestaurantName *string `json:"restaurantName"`
	OffersJSON     *string `json:"offersJson"`
	CategoriesJSON *string `json:"categoriesJson"`
	FetchedAt      string  `json:"fetchedAt"`
}
