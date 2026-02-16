package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	_ "github.com/go-chi/chi/v5"
	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/repository"
	"hasufel.kj/pkg/logger"
)

type OrderHandler struct {
	repo *repository.OrderRepository
	log  *logger.Logger
}

func NewOrderHandler(repo *repository.OrderRepository, log *logger.Logger) *OrderHandler {
	return &OrderHandler{repo: repo, log: log}
}

// IngestOrder receives orders from the scraper service
// POST /api/v1/orders/ingest
func (h *OrderHandler) IngestOrder(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.log.Error("Invalid request body", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Platform == "" || req.ExternalOrderID == "" {
		http.Error(w, "platform and externalOrderId are required", http.StatusBadRequest)
		return
	}

	// Check if order already exists
	existing, err := h.repo.GetByExternalID(req.Platform, req.ExternalOrderID)
	if err != nil {
		h.log.Error("Database error", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if existing != nil {
		// Order exists — update status if changed
		if existing.Status != req.Status && req.Status != "" {
			if err := h.repo.UpdateStatus(existing.ID, req.Status); err != nil {
				h.log.Error("Failed to update order status", err)
				http.Error(w, "Failed to update order", http.StatusInternalServerError)
				return
			}
			h.log.Info("Order status updated: " + req.ExternalOrderID + " -> " + req.Status)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "exists",
			"orderId": existing.ID,
		})
		return
	}

	// Parse order date
	orderDate, err := time.Parse(time.RFC3339, req.OrderDate)
	if err != nil {
		orderDate = time.Now()
	}

	// Create order
	status := req.Status
	if status == "" {
		status = "new"
	}

	now := time.Now()
	o := &domain.ExternalOrder{
		Platform:        req.Platform,
		ExternalOrderID: req.ExternalOrderID,
		OrderDate:       orderDate,
		CustomerName:    req.CustomerName,
		TotalAmount:     req.TotalAmount,
		Status:          status,
		ItemsJSON:       req.ItemsJSON,
		RawData:         req.RawData,
		NotifiedAt:      &now,
	}

	if err := h.repo.Create(o); err != nil {
		h.log.Error("Failed to create order", err)
		http.Error(w, "Failed to create order", http.StatusInternalServerError)
		return
	}

	h.log.Info("Order ingested: " + req.Platform + "/" + req.ExternalOrderID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "created",
		"orderId": o.ID,
	})
}

// ListOrders returns orders with optional filters
// GET /api/v1/orders
func (h *OrderHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
	filters := domain.OrderFilters{
		Platform: r.URL.Query().Get("platform"),
		Limit:    50,
	}

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			filters.Limit = limit
		}
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
			filters.Offset = offset
		}
	}

	orders, err := h.repo.List(filters)
	if err != nil {
		h.log.Error("Failed to list orders", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}

// GetOrder returns a single order by ID
// GET /api/v1/orders/{id}
func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	// For now, we'll just return not implemented
	// In a full implementation, add GetByID to the repository
	http.Error(w, "Not implemented", http.StatusNotImplemented)
}

// GetOrderStats returns order statistics
// GET /api/v1/orders/stats
func (h *OrderHandler) GetOrderStats(w http.ResponseWriter, r *http.Request) {
	// Default to last 30 days
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -30)

	if start := r.URL.Query().Get("startDate"); start != "" {
		if t, err := time.Parse("2006-01-02", start); err == nil {
			startDate = t
		}
	}

	if end := r.URL.Query().Get("endDate"); end != "" {
		if t, err := time.Parse("2006-01-02", end); err == nil {
			endDate = t
		}
	}

	stats, err := h.repo.GetStats(startDate, endDate)
	if err != nil {
		h.log.Error("Failed to get order stats", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
