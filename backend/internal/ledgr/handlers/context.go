// Package handlers contains the HTTP handler layer for the Ledgr module.
// It depends only on the service layer and standard library — no other internal imports.
package handlers

import (
	"context"
	"net/http"
)

// These key names must match what backend/internal/middleware/auth.go stores.
// They are string constants, not imported symbols — intentionally no package dependency.
const (
	ctxKeyUserID = "user_id"
	ctxKeyOrgID  = "organization_id"
	ctxKeyRole   = "role"
)

func orgIDFromContext(ctx context.Context) string {
	v, _ := ctx.Value(ctxKeyOrgID).(string)
	return v
}

func userIDFromContext(ctx context.Context) string {
	v, _ := ctx.Value(ctxKeyUserID).(string)
	return v
}

func roleFromContext(ctx context.Context) string {
	v, _ := ctx.Value(ctxKeyRole).(string)
	return v
}

func isAdmin(r *http.Request) bool {
	return roleFromContext(r.Context()) == "admin"
}
