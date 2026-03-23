package domain

import "time"

// DayState represents the lifecycle state of a calendar day's entries.
type DayState string

const (
	DayStateDraft         DayState = "draft"
	DayStatePendingReview DayState = "pending_review"
	DayStateLocked        DayState = "locked"
)

// validTransitions defines the allowed state machine transitions.
// Key: current state, Value: states it may transition to.
var validTransitions = map[DayState][]DayState{
	DayStateDraft:         {DayStatePendingReview},
	DayStatePendingReview: {DayStateLocked, DayStateDraft},
	DayStateLocked:        {DayStateDraft}, // admin-only unlock
}

// CanTransitionTo returns true if transitioning from d to next is allowed.
// Unlocking a locked day requires isAdmin = true.
func (d DayState) CanTransitionTo(next DayState, isAdmin bool) bool {
	if d == DayStateLocked && !isAdmin {
		return false
	}
	for _, allowed := range validTransitions[d] {
		if allowed == next {
			return true
		}
	}
	return false
}

// DayLog records the completion/lock state for a specific calendar date within an org.
type DayLog struct {
	ID        string    `json:"id"`
	OrgID     string    `json:"org_id"`
	Date      string    `json:"date"` // YYYY-MM-DD
	State     DayState  `json:"state"`
	LockedBy  *string   `json:"locked_by,omitempty"`
	LockedAt  *time.Time `json:"locked_at,omitempty"`
	Notes     *string   `json:"notes,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// DayLogAudit is an immutable record of a state transition on a DayLog.
type DayLogAudit struct {
	ID        string    `json:"id"`
	DayLogID  string    `json:"daylog_id"`
	FromState DayState  `json:"from_state"`
	ToState   DayState  `json:"to_state"`
	ChangedBy string    `json:"changed_by"`
	ChangedAt time.Time `json:"changed_at"`
}
