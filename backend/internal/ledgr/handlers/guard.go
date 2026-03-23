package handlers

import (
	"context"
	"net/http"
)

// OrgFeatureChecker is the minimal interface the feature guard needs.
type OrgFeatureChecker interface {
	IsLedgrEnabled(ctx context.Context, orgID string) (bool, error)
}

// LedgrFeatureGuard is a middleware that checks the ledgr_enabled flag for the
// requesting org at request time, returning 403 if the feature is disabled.
// This allows hot-toggling without a server restart.
func LedgrFeatureGuard(orgRepo OrgFeatureChecker) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			orgID := orgIDFromContext(r.Context())
			if orgID == "" {
				respondError(w, http.StatusUnauthorized, "missing organization context")
				return
			}
			enabled, err := orgRepo.IsLedgrEnabled(r.Context(), orgID)
			if err != nil || !enabled {
				respondError(w, http.StatusForbidden, "ledgr module not enabled for this organization")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
