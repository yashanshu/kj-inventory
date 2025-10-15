package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/services"
	"hasufel.kj/pkg/logger"
	"hasufel.kj/pkg/utils"
)

type MovementHandler struct {
	inventoryService *services.InventoryService
	log              *logger.Logger
}

func NewMovementHandler(inventoryService *services.InventoryService, log *logger.Logger) *MovementHandler {
	return &MovementHandler{
		inventoryService: inventoryService,
		log:              log,
	}
}

func (h *MovementHandler) CreateMovement(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID", nil)
		return
	}

	var req domain.CreateMovementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	movement, err := h.inventoryService.CreateMovement(r.Context(), &req, userUUID)
	if err != nil {
		if err == services.ErrItemNotFound {
			utils.RespondError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "Item not found", nil)
			return
		}
		if err == services.ErrInsufficientStock {
			utils.RespondError(w, http.StatusBadRequest, "INSUFFICIENT_STOCK", "Insufficient stock", nil)
			return
		}
		if err == services.ErrInvalidQuantity {
			utils.RespondError(w, http.StatusBadRequest, "INVALID_QUANTITY", "Invalid quantity", nil)
			return
		}
		h.log.Error("Failed to create movement", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusCreated, movement)
}

func (h *MovementHandler) GetMovements(w http.ResponseWriter, r *http.Request) {
	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 {
		limit = 50
	}

	movements, err := h.inventoryService.ListMovements(r.Context(), orgUUID, limit, offset)
	if err != nil {
		h.log.Error("Failed to list movements", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, movements)
}

func (h *MovementHandler) GetItemMovements(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "id")
	id, err := uuid.Parse(itemID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ITEM_ID", "Invalid item ID", nil)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 {
		limit = 50
	}

	movements, err := h.inventoryService.ListMovementsByItem(r.Context(), id, limit, offset)
	if err != nil {
		h.log.Error("Failed to list item movements", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, movements)
}
