package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/repository"
	"hasufel.kj/pkg/logger"
)

type MenuHandler struct {
	repo *repository.MenuRepository
	log  *logger.Logger
}

func NewMenuHandler(repo *repository.MenuRepository, log *logger.Logger) *MenuHandler {
	return &MenuHandler{repo: repo, log: log}
}

// UpsertMenu receives menu data from the scraper service
// POST /api/v1/menu/update
func (h *MenuHandler) UpsertMenu(w http.ResponseWriter, r *http.Request) {
	var req domain.UpsertMenuRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.log.Error("Invalid request body", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.RestaurantID == "" {
		http.Error(w, "restaurantId is required", http.StatusBadRequest)
		return
	}
	if req.Platform == "" {
		req.Platform = "swiggy"
	}

	fetchedAt := time.Now()
	if req.FetchedAt != "" {
		if t, err := time.Parse(time.RFC3339, req.FetchedAt); err == nil {
			fetchedAt = t
		}
	}

	m := &domain.RestaurantMenu{
		Platform:       req.Platform,
		RestaurantID:   req.RestaurantID,
		RestaurantName: req.RestaurantName,
		OffersJSON:     req.OffersJSON,
		CategoriesJSON: req.CategoriesJSON,
		FetchedAt:      fetchedAt,
	}

	if err := h.repo.Upsert(m); err != nil {
		h.log.Error("Failed to upsert menu", err)
		http.Error(w, "Failed to save menu data", http.StatusInternalServerError)
		return
	}

	h.log.Info("Menu upserted for restaurant: " + req.RestaurantID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":       "ok",
		"restaurantId": req.RestaurantID,
	})
}

// ListMenus returns all stored restaurant menus
// GET /api/v1/menu
func (h *MenuHandler) ListMenus(w http.ResponseWriter, r *http.Request) {
	menus, err := h.repo.ListAll()
	if err != nil {
		h.log.Error("Failed to list menus", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(menus)
}

// GetMenu returns menu for a specific restaurant
// GET /api/v1/menu/{restaurantId}
func (h *MenuHandler) GetMenu(w http.ResponseWriter, r *http.Request) {
	restaurantID := chi.URLParam(r, "restaurantId")
	if restaurantID == "" {
		http.Error(w, "restaurantId is required", http.StatusBadRequest)
		return
	}

	menu, err := h.repo.GetByRestaurantID(restaurantID)
	if err != nil {
		h.log.Error("Failed to get menu", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if menu == nil {
		http.Error(w, "Menu not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(menu)
}
