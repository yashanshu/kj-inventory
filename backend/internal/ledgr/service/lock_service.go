package service

import (
	"context"
	"errors"

	"hasufel.kj/internal/ledgr/domain"
	"hasufel.kj/internal/ledgr/repository"
)

// LockService manages the day-level state machine transitions.
type LockService struct {
	daylogs repository.DaylogRepository
}

// NewLockService creates a LockService with the required repository.
func NewLockService(daylogs repository.DaylogRepository) *LockService {
	return &LockService{daylogs: daylogs}
}

// GetOrCreate returns the DayLog for the given date, creating a draft row if absent.
func (s *LockService) GetOrCreate(ctx context.Context, orgID, date string) (*domain.DayLog, error) {
	return s.daylogs.GetOrCreate(ctx, orgID, date)
}

// Get returns the DayLog for the date, or nil if it does not exist yet.
func (s *LockService) Get(ctx context.Context, orgID, date string) (*domain.DayLog, error) {
	return s.daylogs.Get(ctx, orgID, date)
}

// Submit marks a day as pending_review (entries done).
// Caller must NOT be locked to call this.
func (s *LockService) Submit(ctx context.Context, orgID, date, userID string) (*domain.DayLog, error) {
	return s.transition(ctx, orgID, date, userID, domain.DayStatePendingReview, false)
}

// Lock approves and locks a day (admin only).
func (s *LockService) Lock(ctx context.Context, orgID, date, userID string) (*domain.DayLog, error) {
	return s.transition(ctx, orgID, date, userID, domain.DayStateLocked, true)
}

// Unlock re-opens a locked day (admin only).
func (s *LockService) Unlock(ctx context.Context, orgID, date, userID string) (*domain.DayLog, error) {
	return s.transition(ctx, orgID, date, userID, domain.DayStateDraft, true)
}

// ---- internal ----

func (s *LockService) transition(ctx context.Context, orgID, date, userID string, to domain.DayState, isAdmin bool) (*domain.DayLog, error) {
	dl, err := s.daylogs.GetOrCreate(ctx, orgID, date)
	if err != nil {
		return nil, err
	}

	if !dl.State.CanTransitionTo(to, isAdmin) {
		return nil, errors.New("invalid state transition from " + string(dl.State) + " to " + string(to))
	}

	fromState := dl.State
	if err := s.daylogs.Transition(ctx, orgID, date, to, userID); err != nil {
		return nil, err
	}

	// Append audit log.
	audit := &domain.DayLogAudit{
		DayLogID:  dl.ID,
		FromState: fromState,
		ToState:   to,
		ChangedBy: userID,
	}
	_ = s.daylogs.AppendAudit(ctx, audit) // non-fatal audit failure

	dl.State = to
	return dl, nil
}
