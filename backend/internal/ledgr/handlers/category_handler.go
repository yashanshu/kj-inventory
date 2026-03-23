package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"hasufel.kj/internal/ledgr/domain"
	"hasufel.kj/internal/ledgr/repository"
	"hasufel.kj/pkg/logger"
)

// CategoryHandler handles CRUD for ledgr expense categories.
type CategoryHandler struct {
	repo repository.CategoryRepository
	log  *logger.Logger
}

// NewCategoryHandler creates a CategoryHandler.
func NewCategoryHandler(repo repository.CategoryRepository, log *logger.Logger) *CategoryHandler {
	return &CategoryHandler{repo: repo, log: log}
}

// List handles GET /api/v1/ledgr/categories
func (h *CategoryHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	// Ensure system categories are seeded for this org on first access.
	if err := h.repo.Seed(r.Context(), orgID); err != nil {
		h.log.Error("seed categories", "error", err)
	}
	cats, err := h.repo.List(r.Context(), orgID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list categories")
		return
	}
	respondJSON(w, http.StatusOK, cats)
}

// Create handles POST /api/v1/ledgr/categories (admin only)
func (h *CategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	if !isAdmin(r) {
		respondError(w, http.StatusForbidden, "admin access required")
		return
	}
	orgID := orgIDFromContext(r.Context())

	var c domain.Category
	if err := decodeJSON(r, &c); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	c.OrgID = orgID

	if err := h.repo.Create(r.Context(), &c); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, c)
}

// Update handles PUT /api/v1/ledgr/categories/:id (admin only)
func (h *CategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	if !isAdmin(r) {
		respondError(w, http.StatusForbidden, "admin access required")
		return
	}
	orgID := orgIDFromContext(r.Context())
	id := chi.URLParam(r, "id")

	var c domain.Category
	if err := decodeJSON(r, &c); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	c.ID = id
	c.OrgID = orgID

	if err := h.repo.Update(r.Context(), &c); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, c)
}

// Delete handles DELETE /api/v1/ledgr/categories/:id (admin only)
func (h *CategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if !isAdmin(r) {
		respondError(w, http.StatusForbidden, "admin access required")
		return
	}
	orgID := orgIDFromContext(r.Context())
	id := chi.URLParam(r, "id")

	if err := h.repo.Delete(r.Context(), orgID, id); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
