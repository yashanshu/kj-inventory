package services

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/repository"
)

type DashboardMetrics struct {
	TotalItems           int     `json:"total_items"`
	TotalValue           float64 `json:"total_value"`
	LowStockItems        int     `json:"low_stock_items"`
	OutOfStockItems      int     `json:"out_of_stock_items"`
	RecentMovementsCount int     `json:"recent_movements_count"`
}

type StockTrend struct {
	Date string `json:"date"`
	In   int    `json:"in"`
	Out  int    `json:"out"`
}

type CategoryBreakdown struct {
	CategoryID   uuid.UUID `json:"category_id"`
	CategoryName string    `json:"category_name"`
	ItemCount    int       `json:"item_count"`
	TotalValue   float64   `json:"total_value"`
}

type DashboardService struct {
	itemRepo     repository.ItemRepository
	movementRepo repository.MovementRepository
	alertRepo    repository.AlertRepository
	db           *sql.DB
}

func NewDashboardService(
	itemRepo repository.ItemRepository,
	movementRepo repository.MovementRepository,
	alertRepo repository.AlertRepository,
	db *sql.DB,
) *DashboardService {
	return &DashboardService{
		itemRepo:     itemRepo,
		movementRepo: movementRepo,
		alertRepo:    alertRepo,
		db:           db,
	}
}

// GetMetrics retrieves dashboard metrics for an organization
func (s *DashboardService) GetMetrics(ctx context.Context, orgID uuid.UUID) (*DashboardMetrics, error) {
	metrics := &DashboardMetrics{}

	// Get total items and value
	query := `
		SELECT
			COUNT(*) as total_items,
			COALESCE(SUM(current_stock * COALESCE(unit_cost, 0)), 0) as total_value,
			SUM(CASE WHEN track_stock = 1 AND current_stock < minimum_threshold AND current_stock > 0 THEN 1 ELSE 0 END) as low_stock,
			SUM(CASE WHEN track_stock = 1 AND current_stock = 0 THEN 1 ELSE 0 END) as out_of_stock
		FROM items
		WHERE organization_id = ? AND is_active = 1
	`

	err := s.db.QueryRowContext(ctx, query, orgID.String()).Scan(
		&metrics.TotalItems,
		&metrics.TotalValue,
		&metrics.LowStockItems,
		&metrics.OutOfStockItems,
	)
	if err != nil {
		return nil, err
	}

	// Get recent movements count (last 7 days)
	movementQuery := `
		SELECT COUNT(*)
		FROM stock_movements sm
		JOIN items i ON sm.item_id = i.id
		WHERE i.organization_id = ?
		AND sm.created_at >= datetime('now', '-7 days')
	`

	err = s.db.QueryRowContext(ctx, movementQuery, orgID.String()).Scan(&metrics.RecentMovementsCount)
	if err != nil {
		return nil, err
	}

	return metrics, nil
}

// GetRecentMovements retrieves recent stock movements
func (s *DashboardService) GetRecentMovements(ctx context.Context, orgID uuid.UUID, limit int) ([]*domain.StockMovement, error) {
	return s.movementRepo.ListRecent(ctx, orgID, limit)
}

// GetStockTrends retrieves stock movement trends for the last N days
func (s *DashboardService) GetStockTrends(ctx context.Context, orgID uuid.UUID, days int) ([]StockTrend, error) {
	query := `
		SELECT
			DATE(sm.created_at) as date,
			SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE 0 END) as in_count,
			SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END) as out_count
		FROM stock_movements sm
		JOIN items i ON sm.item_id = i.id
		WHERE i.organization_id = ?
		AND sm.created_at >= datetime('now', '-' || ? || ' days')
		GROUP BY DATE(sm.created_at)
		ORDER BY date DESC
	`

	rows, err := s.db.QueryContext(ctx, query, orgID.String(), days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trends []StockTrend
	for rows.Next() {
		var trend StockTrend
		if err := rows.Scan(&trend.Date, &trend.In, &trend.Out); err != nil {
			return nil, err
		}
		trends = append(trends, trend)
	}

	return trends, rows.Err()
}

// GetCategoryBreakdown retrieves item count and value by category
func (s *DashboardService) GetCategoryBreakdown(ctx context.Context, orgID uuid.UUID) ([]CategoryBreakdown, error) {
	query := `
		SELECT
			c.id as category_id,
			c.name as category_name,
			COUNT(i.id) as item_count,
			COALESCE(SUM(i.current_stock * COALESCE(i.unit_cost, 0)), 0) as total_value
		FROM categories c
		LEFT JOIN items i ON c.id = i.category_id AND i.is_active = 1
		WHERE c.organization_id = ?
		GROUP BY c.id, c.name
		ORDER BY total_value DESC
	`

	rows, err := s.db.QueryContext(ctx, query, orgID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var breakdown []CategoryBreakdown
	for rows.Next() {
		var cat CategoryBreakdown
		var categoryIDStr string
		if err := rows.Scan(&categoryIDStr, &cat.CategoryName, &cat.ItemCount, &cat.TotalValue); err != nil {
			return nil, err
		}
		cat.CategoryID, _ = uuid.Parse(categoryIDStr)
		breakdown = append(breakdown, cat)
	}

	return breakdown, rows.Err()
}

// GetLowStockItems retrieves items below their minimum threshold
func (s *DashboardService) GetLowStockItems(ctx context.Context, orgID uuid.UUID, limit int) ([]*domain.Item, error) {
	query := `
		SELECT id, organization_id, category_id, name, sku, unit_of_measurement,
		       minimum_threshold, current_stock, unit_cost, is_active, track_stock, created_at, updated_at
		FROM items
		WHERE organization_id = ?
		AND is_active = 1
		AND track_stock = 1
		AND current_stock < minimum_threshold
		AND current_stock > 0
		ORDER BY (minimum_threshold - current_stock) DESC
		LIMIT ?
	`

	rows, err := s.db.QueryContext(ctx, query, orgID.String(), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*domain.Item
	for rows.Next() {
		var item domain.Item
		var idStr, orgIDStr, catIDStr string
		if err := rows.Scan(
			&idStr, &orgIDStr, &catIDStr, &item.Name, &item.SKU, &item.UnitOfMeasurement,
			&item.MinimumThreshold, &item.CurrentStock, &item.UnitCost, &item.IsActive,
			&item.TrackStock, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		item.ID, _ = uuid.Parse(idStr)
		item.OrganizationID, _ = uuid.Parse(orgIDStr)
		item.CategoryID, _ = uuid.Parse(catIDStr)
		items = append(items, &item)
	}

	return items, rows.Err()
}

// GetAlerts retrieves unread alerts
func (s *DashboardService) GetAlerts(ctx context.Context, orgID uuid.UUID, limit int) ([]*domain.Alert, error) {
	return s.alertRepo.ListUnread(ctx, orgID, limit)
}

// MarkAlertAsRead marks an alert as read
func (s *DashboardService) MarkAlertAsRead(ctx context.Context, alertID uuid.UUID) error {
	return s.alertRepo.MarkAsRead(ctx, alertID)
}
