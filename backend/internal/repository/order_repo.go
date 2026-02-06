package repository

import (
	"database/sql"
	"time"

	"hasufel.kj/internal/domain"
)

type OrderRepository struct {
	db *sql.DB
}

func NewOrderRepository(db *sql.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

// Create inserts a new external order
func (r *OrderRepository) Create(o *domain.ExternalOrder) error {
	query := `
		INSERT INTO external_orders (
			platform, external_order_id, order_date, customer_name,
			total_amount, status, items_json, raw_data, notified_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	result, err := r.db.Exec(query,
		o.Platform,
		o.ExternalOrderID,
		o.OrderDate,
		o.CustomerName,
		o.TotalAmount,
		o.Status,
		o.ItemsJSON,
		o.RawData,
		o.NotifiedAt,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	o.ID = id
	return nil
}

// GetByExternalID finds an order by platform and external ID
func (r *OrderRepository) GetByExternalID(platform, externalID string) (*domain.ExternalOrder, error) {
	var o domain.ExternalOrder
	query := `
		SELECT id, platform, external_order_id, order_date, customer_name,
		       total_amount, status, items_json, raw_data, notified_at, created_at
		FROM external_orders 
		WHERE platform = ? AND external_order_id = ?
	`
	row := r.db.QueryRow(query, platform, externalID)
	err := row.Scan(&o.ID, &o.Platform, &o.ExternalOrderID, &o.OrderDate, &o.CustomerName,
		&o.TotalAmount, &o.Status, &o.ItemsJSON, &o.RawData, &o.NotifiedAt, &o.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &o, nil
}

// List returns orders with optional filters
func (r *OrderRepository) List(filters domain.OrderFilters) ([]domain.ExternalOrder, error) {
	query := `
		SELECT id, platform, external_order_id, order_date, customer_name,
		       total_amount, status, items_json, raw_data, notified_at, created_at
		FROM external_orders
		WHERE 1=1
	`
	args := []interface{}{}

	if filters.Platform != "" {
		query += " AND platform = ?"
		args = append(args, filters.Platform)
	}
	if filters.StartDate != nil {
		query += " AND order_date >= ?"
		args = append(args, filters.StartDate)
	}
	if filters.EndDate != nil {
		query += " AND order_date <= ?"
		args = append(args, filters.EndDate)
	}

	query += " ORDER BY order_date DESC"

	if filters.Limit > 0 {
		query += " LIMIT ?"
		args = append(args, filters.Limit)
	}
	if filters.Offset > 0 {
		query += " OFFSET ?"
		args = append(args, filters.Offset)
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []domain.ExternalOrder
	for rows.Next() {
		var o domain.ExternalOrder
		err := rows.Scan(&o.ID, &o.Platform, &o.ExternalOrderID, &o.OrderDate, &o.CustomerName,
			&o.TotalAmount, &o.Status, &o.ItemsJSON, &o.RawData, &o.NotifiedAt, &o.CreatedAt)
		if err != nil {
			return nil, err
		}
		orders = append(orders, o)
	}
	return orders, rows.Err()
}

// GetStats returns order statistics for a date range
func (r *OrderRepository) GetStats(startDate, endDate time.Time) (*domain.OrderStats, error) {
	query := `
		SELECT 
			COUNT(*) as total_orders,
			COALESCE(SUM(total_amount), 0) as total_revenue,
			COUNT(CASE WHEN platform = 'swiggy' THEN 1 END) as swiggy_orders,
			COALESCE(SUM(CASE WHEN platform = 'swiggy' THEN total_amount END), 0) as swiggy_revenue,
			COUNT(CASE WHEN platform = 'zomato' THEN 1 END) as zomato_orders,
			COALESCE(SUM(CASE WHEN platform = 'zomato' THEN total_amount END), 0) as zomato_revenue
		FROM external_orders
		WHERE order_date BETWEEN ? AND ?
	`

	var stats domain.OrderStats
	row := r.db.QueryRow(query, startDate, endDate)
	err := row.Scan(&stats.TotalOrders, &stats.TotalRevenue, &stats.SwiggyOrders,
		&stats.SwiggyRevenue, &stats.ZomatoOrders, &stats.ZomatoRevenue)
	if err != nil {
		return nil, err
	}

	stats.StartDate = startDate.Format("2006-01-02")
	stats.EndDate = endDate.Format("2006-01-02")

	return &stats, nil
}
