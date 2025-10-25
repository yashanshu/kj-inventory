package handlers

import (
	"context"
	"net/http"

	"hasufel.kj/internal/domain"
	"hasufel.kj/pkg/utils"
)

const (
	ctxKeyRole = "role"
)

func getRoleFromContext(ctx context.Context) domain.UserRole {
	if ctx == nil {
		return ""
	}

	if raw := ctx.Value(ctxKeyRole); raw != nil {
		if roleStr, ok := raw.(string); ok && roleStr != "" {
			return domain.UserRole(roleStr)
		}
	}
	return ""
}

func requireAdmin(w http.ResponseWriter, r *http.Request) bool {
	if w == nil || r == nil {
		return false
	}

	if getRoleFromContext(r.Context()) != domain.RoleAdmin {
		utils.RespondError(w, http.StatusForbidden, "FORBIDDEN", "Admin role required", nil)
		return false
	}
	return true
}
