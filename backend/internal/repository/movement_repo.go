package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
)

func NewMovementRepository(db *sql.DB) MovementRepository {
	return &movementRepoSQLite{db: db}
}

type movementRepoSQLite struct {
	db *sql.DB
}

func (r *movementRepoSQLite) Create(ctx context.Context, movement *domain.StockMovement) (uuid.UUID, error) {
	if movement == nil {
		return uuid.Nil, errors.New("movement is nil")
	}

	if movement.ID == uuid.Nil {
		movement.ID = uuid.New()
	}
	if movement.CreatedAt.IsZero() {
		movement.CreatedAt = time.Now().UTC()
	}

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO stock_movements (
			id, item_id, movement_type, quantity,
			previous_stock, new_stock, reference, notes,
			created_by, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		movement.ID.String(), movement.ItemID.String(),
		movement.MovementType, movement.Quantity,
		movement.PreviousStock, movement.NewStock,
		movement.Reference, movement.Notes,
		movement.CreatedBy.String(), movement.CreatedAt,
	)
	if err != nil {
		return uuid.Nil, err
	}
	return movement.ID, nil
}

func (r *movementRepoSQLite) GetByID(ctx context.Context, id uuid.UUID) (*domain.StockMovement, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, item_id, movement_type, quantity,
		       previous_stock, new_stock, reference, notes,
		       created_by, created_at
		FROM stock_movements WHERE id = ?
	`, id.String())

	var mv domain.StockMovement
	var (
		idStr, itemStr, createdByStr string
		reference, notes             sql.NullString
	)

	if err := row.Scan(
		&idStr, &itemStr, &mv.MovementType, &mv.Quantity,
		&mv.PreviousStock, &mv.NewStock, &reference, &notes,
		&createdByStr, &mv.CreatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	mv.ID, _ = uuid.Parse(idStr)
	mv.ItemID, _ = uuid.Parse(itemStr)
	mv.CreatedBy, _ = uuid.Parse(createdByStr)
	if reference.Valid {
		mv.Reference = &reference.String
	}
	if notes.Valid {
		mv.Notes = &notes.String
	}

	return &mv, nil
}

func (r *movementRepoSQLite) ListByItem(ctx context.Context, itemID uuid.UUID, limit, offset int) ([]*domain.StockMovement, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, item_id, movement_type, quantity,
		       previous_stock, new_stock, reference, notes,
		       created_by, created_at
		FROM stock_movements
		WHERE item_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, itemID.String(), limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanMovements(rows)
}

func (r *movementRepoSQLite) ListByOrganization(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*domain.StockMovement, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT sm.id, sm.item_id, sm.movement_type, sm.quantity,
		       sm.previous_stock, sm.new_stock, sm.reference, sm.notes,
		       sm.created_by, sm.created_at
		FROM stock_movements sm
		JOIN items i ON sm.item_id = i.id
		WHERE i.organization_id = ?
		ORDER BY sm.created_at DESC
		LIMIT ? OFFSET ?
	`, orgID.String(), limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanMovements(rows)
}

func (r *movementRepoSQLite) ListRecent(ctx context.Context, orgID uuid.UUID, limit int) ([]*domain.StockMovement, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT sm.id, sm.item_id, sm.movement_type, sm.quantity,
		       sm.previous_stock, sm.new_stock, sm.reference, sm.notes,
		       sm.created_by, sm.created_at,
		       i.id, i.organization_id, i.category_id, i.name, i.sku,
		       i.unit_of_measurement, i.minimum_threshold, i.current_stock,
		       i.unit_cost, i.is_active, i.track_stock, i.created_at, i.updated_at
		FROM stock_movements sm
		JOIN items i ON sm.item_id = i.id
		WHERE i.organization_id = ?
		ORDER BY sm.created_at DESC
		LIMIT ?
	`, orgID.String(), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanMovementsWithItems(rows)
}

// scanMovements is a helper function to scan multiple movement rows
func (r *movementRepoSQLite) scanMovements(rows *sql.Rows) ([]*domain.StockMovement, error) {
	var movements []*domain.StockMovement
	for rows.Next() {
		var mv domain.StockMovement
		var (
			idStr, itemStr, createdByStr string
			reference, notes             sql.NullString
		)

		if err := rows.Scan(
			&idStr, &itemStr, &mv.MovementType, &mv.Quantity,
			&mv.PreviousStock, &mv.NewStock, &reference, &notes,
			&createdByStr, &mv.CreatedAt,
		); err != nil {
			return nil, err
		}

		mv.ID, _ = uuid.Parse(idStr)
		mv.ItemID, _ = uuid.Parse(itemStr)
		mv.CreatedBy, _ = uuid.Parse(createdByStr)
		if reference.Valid {
			mv.Reference = &reference.String
		}
		if notes.Valid {
			mv.Notes = &notes.String
		}
		movements = append(movements, &mv)
	}

	return movements, rows.Err()
}

// scanMovementsWithItems is a helper function to scan movement rows with joined item data
func (r *movementRepoSQLite) scanMovementsWithItems(rows *sql.Rows) ([]*domain.StockMovement, error) {
	var movements []*domain.StockMovement
	for rows.Next() {
		var mv domain.StockMovement
		var item domain.Item
		var (
			mvIDStr, itemIDStr, createdByStr                     string
			itemOrgIDStr, itemCatIDStr                           string
			reference, notes, itemSKU                            sql.NullString
			itemUnitCost                                         sql.NullFloat64
			itemIsActive, itemTrackStock                         bool
		)

		if err := rows.Scan(
			&mvIDStr, &itemIDStr, &mv.MovementType, &mv.Quantity,
			&mv.PreviousStock, &mv.NewStock, &reference, &notes,
			&createdByStr, &mv.CreatedAt,
			&itemIDStr, &itemOrgIDStr, &itemCatIDStr, &item.Name, &itemSKU,
			&item.UnitOfMeasurement, &item.MinimumThreshold, &item.CurrentStock,
			&itemUnitCost, &itemIsActive, &itemTrackStock, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}

		mv.ID, _ = uuid.Parse(mvIDStr)
		mv.ItemID, _ = uuid.Parse(itemIDStr)
		mv.CreatedBy, _ = uuid.Parse(createdByStr)
		if reference.Valid {
			mv.Reference = &reference.String
		}
		if notes.Valid {
			mv.Notes = &notes.String
		}

		// Parse item fields
		item.ID, _ = uuid.Parse(itemIDStr)
		item.OrganizationID, _ = uuid.Parse(itemOrgIDStr)
		item.CategoryID, _ = uuid.Parse(itemCatIDStr)
		if itemSKU.Valid {
			item.SKU = &itemSKU.String
		}
		if itemUnitCost.Valid {
			item.UnitCost = &itemUnitCost.Float64
		}
		item.IsActive = itemIsActive
		item.TrackStock = itemTrackStock

		mv.Item = &item
		movements = append(movements, &mv)
	}

	return movements, rows.Err()
}
