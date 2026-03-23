package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"hasufel.kj/internal/ledgr/service"
	"hasufel.kj/pkg/logger"
)

// AttachmentHandler manages receipt file uploads and metadata retrieval.
type AttachmentHandler struct {
	svc *service.AttachmentService
	log *logger.Logger
}

// NewAttachmentHandler creates an AttachmentHandler.
func NewAttachmentHandler(svc *service.AttachmentService, log *logger.Logger) *AttachmentHandler {
	return &AttachmentHandler{svc: svc, log: log}
}

// Upload handles POST /api/v1/ledgr/attachments (multipart/form-data)
// Form fields: file (binary), expense_id (string)
func (h *AttachmentHandler) Upload(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromContext(r.Context())

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		respondError(w, http.StatusBadRequest, "failed to parse multipart form")
		return
	}
	expenseID := r.FormValue("expense_id")
	if expenseID == "" {
		respondError(w, http.StatusBadRequest, "expense_id is required")
		return
	}

	file, fh, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	attachment, err := h.svc.Upload(r.Context(), expenseID, userID, fh)
	if err != nil {
		h.log.Error("upload attachment", "error", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, attachment)
}

// Get handles GET /api/v1/ledgr/attachments/:id
func (h *AttachmentHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	attachment, err := h.svc.Get(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, attachment)
}

// Delete handles DELETE /api/v1/ledgr/attachments/:id
func (h *AttachmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
