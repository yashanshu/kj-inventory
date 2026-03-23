package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"hasufel.kj/internal/ledgr/domain"
	"hasufel.kj/internal/ledgr/repository"
	"hasufel.kj/pkg/logger"
)

// TemplateHandler manages recurring expense templates (admin only for mutations).
type TemplateHandler struct {
	repo repository.TemplateRepository
	log  *logger.Logger
}

// NewTemplateHandler creates a TemplateHandler.
func NewTemplateHandler(repo repository.TemplateRepository, log *logger.Logger) *TemplateHandler {
	return &TemplateHandler{repo: repo, log: log}
}

// List handles GET /api/v1/ledgr/templates
func (h *TemplateHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	templates, err := h.repo.List(r.Context(), orgID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list templates")
		return
	}
	respondJSON(w, http.StatusOK, templates)
}

// Create handles POST /api/v1/ledgr/templates (admin only)
func (h *TemplateHandler) Create(w http.ResponseWriter, r *http.Request) {
	if !isAdmin(r) {
		respondError(w, http.StatusForbidden, "admin access required")
		return
	}
	orgID := orgIDFromContext(r.Context())

	var t domain.Template
	if err := decodeJSON(r, &t); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	t.OrgID = orgID

	if err := h.repo.Create(r.Context(), &t); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, t)
}

// Update handles PUT /api/v1/ledgr/templates/:id (admin only)
func (h *TemplateHandler) Update(w http.ResponseWriter, r *http.Request) {
	if !isAdmin(r) {
		respondError(w, http.StatusForbidden, "admin access required")
		return
	}
	orgID := orgIDFromContext(r.Context())
	id := chi.URLParam(r, "id")

	var t domain.Template
	if err := decodeJSON(r, &t); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	t.ID = id
	t.OrgID = orgID

	if err := h.repo.Update(r.Context(), &t); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, t)
}

// Delete handles DELETE /api/v1/ledgr/templates/:id (admin only)
func (h *TemplateHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if !isAdmin(r) {
		respondError(w, http.StatusForbidden, "admin access required")
		return
	}
	orgID := orgIDFromContext(r.Context())
	id := chi.URLParam(r, "id")

	if err := h.repo.Delete(r.Context(), orgID, id); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
