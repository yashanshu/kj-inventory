package repository

import (
	"database/sql"

	"hasufel.kj/internal/domain"
)

type MenuRepository struct {
	db *sql.DB
}

func NewMenuRepository(db *sql.DB) *MenuRepository {
	return &MenuRepository{db: db}
}

// Upsert inserts or replaces menu data for a restaurant
func (r *MenuRepository) Upsert(m *domain.RestaurantMenu) error {
	query := `
		INSERT INTO restaurant_menus (
			organization_id, store_id, platform_binding_id, platform,
			restaurant_id, restaurant_name, offers_json, categories_json, fetched_at
		) VALUES (
			(SELECT organization_id FROM platform_store_bindings WHERE platform = ? AND restaurant_id = ? LIMIT 1),
			(SELECT store_id FROM platform_store_bindings WHERE platform = ? AND restaurant_id = ? LIMIT 1),
			(SELECT id FROM platform_store_bindings WHERE platform = ? AND restaurant_id = ? LIMIT 1),
			?, ?, ?, ?, ?, ?
		)
		ON CONFLICT(platform, restaurant_id) DO UPDATE SET
			restaurant_name = excluded.restaurant_name,
			offers_json = excluded.offers_json,
			categories_json = excluded.categories_json,
			fetched_at = excluded.fetched_at
	`

	result, err := r.db.Exec(query,
		m.Platform, m.RestaurantID,
		m.Platform, m.RestaurantID,
		m.Platform, m.RestaurantID,
		m.Platform,
		m.RestaurantID,
		m.RestaurantName,
		m.OffersJSON,
		m.CategoriesJSON,
		m.FetchedAt,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	if id > 0 {
		m.ID = id
	}
	return nil
}

// GetByRestaurantID returns menu data for a specific restaurant
func (r *MenuRepository) GetByRestaurantID(restaurantID string) (*domain.RestaurantMenu, error) {
	var m domain.RestaurantMenu
	query := `
		SELECT id, platform, restaurant_id, restaurant_name, offers_json, categories_json, fetched_at, created_at
		FROM restaurant_menus
		WHERE platform = ? AND restaurant_id = ?
	`
	row := r.db.QueryRow(query, "swiggy", restaurantID)
	err := row.Scan(&m.ID, &m.Platform, &m.RestaurantID, &m.RestaurantName, &m.OffersJSON, &m.CategoriesJSON, &m.FetchedAt, &m.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

// ListAll returns all stored restaurant menus
func (r *MenuRepository) ListAll() ([]domain.RestaurantMenu, error) {
	query := `
		SELECT id, store_id, platform, restaurant_id, restaurant_name, offers_json, categories_json, fetched_at, created_at
		FROM restaurant_menus
		ORDER BY platform, restaurant_name
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var menus []domain.RestaurantMenu
	for rows.Next() {
		var m domain.RestaurantMenu
		err := rows.Scan(&m.ID, &m.StoreID, &m.Platform, &m.RestaurantID, &m.RestaurantName, &m.OffersJSON, &m.CategoriesJSON, &m.FetchedAt, &m.CreatedAt)
		if err != nil {
			return nil, err
		}
		menus = append(menus, m)
	}
	return menus, rows.Err()
}
