package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"hasufel.kj/internal/ledgr/domain"
)

// NewDaylogRepository returns a DaylogRepository backed by SQLite.
func NewDaylogRepository(db *sql.DB) DaylogRepository {
	return &daylogRepo{db: db}
}

type daylogRepo struct {
	db *sql.DB
}

func (r *daylogRepo) GetOrCreate(ctx context.Context, orgID, date string) (*domain.DayLog, error) {
	dl, err := r.Get(ctx, orgID, date)
	if err != nil {
		return nil, err
	}
	if dl != nil {
		return dl, nil
	}
	// Create draft row.
	now := time.Now().UTC()
	_, err = r.db.ExecContext(ctx, `
		INSERT OR IGNORE INTO ledgr_daylog (org_id, date, state, created_at, updated_at)
		VALUES (?, ?, 'draft', ?, ?)
	`, orgID, date, now, now)
	if err != nil {
		return nil, err
	}
	return r.Get(ctx, orgID, date)
}

func (r *daylogRepo) Get(ctx context.Context, orgID, date string) (*domain.DayLog, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, org_id, date, state, locked_by, locked_at, notes, created_at, updated_at
		FROM ledgr_daylog
		WHERE org_id = ? AND date = ?
	`, orgID, date)

	var dl domain.DayLog
	var lockedBy, notes sql.NullString
	var lockedAt sql.NullTime
	var state string

	err := row.Scan(&dl.ID, &dl.OrgID, &dl.Date, &state, &lockedBy, &lockedAt, &notes, &dl.CreatedAt, &dl.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	dl.State = domain.DayState(state)
	if lockedBy.Valid {
		dl.LockedBy = &lockedBy.String
	}
	if lockedAt.Valid {
		dl.LockedAt = &lockedAt.Time
	}
	if notes.Valid {
		dl.Notes = &notes.String
	}
	return &dl, nil
}

func (r *daylogRepo) Transition(ctx context.Context, orgID, date string, to domain.DayState, userID string) error {
	now := time.Now().UTC()
	var lockedBy sql.NullString
	var lockedAt sql.NullTime
	if to == domain.DayStateLocked {
		lockedBy = sql.NullString{String: userID, Valid: true}
		lockedAt = sql.NullTime{Time: now, Valid: true}
	}
	_, err := r.db.ExecContext(ctx, `
		UPDATE ledgr_daylog
		SET state = ?, locked_by = ?, locked_at = ?, updated_at = ?
		WHERE org_id = ? AND date = ?
	`, string(to), lockedBy, lockedAt, now, orgID, date)
	return err
}

func (r *daylogRepo) AppendAudit(ctx context.Context, a *domain.DayLogAudit) error {
	a.ChangedAt = time.Now().UTC()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO ledgr_daylog_audit (daylog_id, from_state, to_state, changed_by, changed_at)
		VALUES (?, ?, ?, ?, ?)
	`, a.DayLogID, string(a.FromState), string(a.ToState), a.ChangedBy, a.ChangedAt)
	return err
}
