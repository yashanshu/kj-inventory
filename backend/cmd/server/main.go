package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"hasufel.kj/internal/config"
	"hasufel.kj/internal/database"
	"hasufel.kj/internal/handlers"
	ledgr_handlers "hasufel.kj/internal/ledgr/handlers"
	ledgr_repo "hasufel.kj/internal/ledgr/repository"
	ledgr_service "hasufel.kj/internal/ledgr/service"
	"hasufel.kj/internal/middleware"
	"hasufel.kj/internal/repository"
	"hasufel.kj/internal/services"
	"hasufel.kj/pkg/logger"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	// Initialize configuration
	cfg := config.Load()

	// Initialize logger
	log := logger.New(cfg.LogLevel)

	// Initialize database
	db, err := database.New(cfg.Database.DSN)
	if err != nil {
		log.Fatal("Failed to connect to database", err)
	}
	defer db.Close()

	log.Info("Database connection established")

	// Initialize repositories
	itemRepo := repository.NewItemRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	movementRepo := repository.NewMovementRepository(db)
	alertRepo := repository.NewAlertRepository(db)
	userRepo := repository.NewUserRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	menuRepo := repository.NewMenuRepository(db)
	storeRepo := repository.NewStoreRepository(db)
	bindingRepo := repository.NewPlatformBindingRepository(db)

	// Initialize services
	authService := services.NewAuthService(userRepo, cfg.JWT.Secret)
	inventoryService := services.NewInventoryService(itemRepo, categoryRepo, movementRepo, alertRepo, db)
	dashboardService := services.NewDashboardService(itemRepo, movementRepo, alertRepo, db)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, log)
	inventoryHandler := handlers.NewInventoryHandler(inventoryService, log)
	dashboardHandler := handlers.NewDashboardHandler(dashboardService, log)
	movementHandler := handlers.NewMovementHandler(inventoryService, log)
	orderHandler := handlers.NewOrderHandler(orderRepo, log)
	menuHandler := handlers.NewMenuHandler(menuRepo, log)
	storeHandler := handlers.NewStoreHandler(storeRepo, log)
	bindingHandler := handlers.NewPlatformBindingHandler(bindingRepo, log)

	// ---- Ledgr module ----
	// Ensure ledgr_enabled column exists (idempotent; safe for combined deployment).
	ledgrOrgRepo := ledgr_repo.NewOrgRepository(db)
	if err := ledgrOrgRepo.EnsureLedgrColumn(); err != nil {
		log.Fatal("Failed to ensure ledgr_enabled column", "error", err)
	}

	ledgrExpenseRepo    := ledgr_repo.NewExpenseRepository(db)
	ledgrCategoryRepo   := ledgr_repo.NewCategoryRepository(db)
	ledgrDaylogRepo     := ledgr_repo.NewDaylogRepository(db)
	ledgrTemplateRepo   := ledgr_repo.NewTemplateRepository(db)
	ledgrPartnerRepo    := ledgr_repo.NewPartnerRepository(db)
	ledgrStoreRepo      := ledgr_repo.NewStoreRepository(db)
	ledgrAttachmentRepo := ledgr_repo.NewAttachmentRepository(db)

	ledgrExpenseService    := ledgr_service.NewExpenseService(ledgrExpenseRepo, ledgrCategoryRepo, ledgrDaylogRepo)
	ledgrLockService       := ledgr_service.NewLockService(ledgrDaylogRepo)
	ledgrReportService     := ledgr_service.NewReportService(ledgrExpenseRepo)
	ledgrExportService     := ledgr_service.NewExportService(ledgrExpenseRepo)
	ledgrAttachmentService := ledgr_service.NewAttachmentService(ledgrAttachmentRepo, cfg.Ledgr.AttachmentDir, cfg.Ledgr.AttachmentMaxSize)

	ledgrExpenseHandler    := ledgr_handlers.NewExpenseHandler(ledgrExpenseService, log)
	ledgrCategoryHandler   := ledgr_handlers.NewCategoryHandler(ledgrCategoryRepo, log)
	ledgrDaylogHandler     := ledgr_handlers.NewDaylogHandler(ledgrLockService, log)
	ledgrTemplateHandler   := ledgr_handlers.NewTemplateHandler(ledgrTemplateRepo, log)
	ledgrPartnerHandler    := ledgr_handlers.NewPartnerHandler(ledgrPartnerRepo, ledgrExpenseService, log)
	ledgrReportHandler     := ledgr_handlers.NewReportHandler(ledgrReportService, log)
	ledgrExportHandler     := ledgr_handlers.NewExportHandler(ledgrExportService, log)
	ledgrStoreHandler      := ledgr_handlers.NewStoreHandler(ledgrStoreRepo, log)
	ledgrAttachmentHandler := ledgr_handlers.NewAttachmentHandler(ledgrAttachmentService, log)
	// ---- end Ledgr module ----

	// Initialize router
	r := chi.NewRouter()

	// Middleware
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.LoggingMiddleware(log))

	// CORS configuration
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORS.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check (must be before static file handler)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// API routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public routes
		r.Post("/auth/login", authHandler.Login)
		r.Post("/auth/register", authHandler.Register)

		// Order ingestion (authenticated via token, not JWT)
		r.Post("/orders/ingest", orderHandler.IngestOrder)

		// Menu data ingestion (authenticated via token, not JWT)
		r.Post("/menu/update", menuHandler.UpsertMenu)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(cfg.JWT.Secret))

			// User profile
			r.Get("/auth/profile", authHandler.GetProfile)
			r.Post("/auth/change-password", authHandler.ChangePassword)

			// Dashboard
			r.Get("/dashboard/metrics", dashboardHandler.GetMetrics)
			r.Get("/dashboard/recent-movements", dashboardHandler.GetRecentMovements)
			r.Get("/dashboard/stock-trends", dashboardHandler.GetStockTrends)
			r.Get("/dashboard/category-breakdown", dashboardHandler.GetCategoryBreakdown)
			r.Get("/dashboard/low-stock", dashboardHandler.GetLowStockItems)
			r.Get("/dashboard/alerts", dashboardHandler.GetAlerts)

			// Categories
			r.Get("/categories", inventoryHandler.GetCategories)
			r.Post("/categories", inventoryHandler.CreateCategory)
			r.Put("/categories/{id}", inventoryHandler.UpdateCategory)
			r.Delete("/categories/{id}", inventoryHandler.DeleteCategory)

			// Items
			r.Get("/items", inventoryHandler.GetItems)
			r.Post("/items", inventoryHandler.CreateItem)
			r.Get("/items/{id}", inventoryHandler.GetItem)
			r.Put("/items/{id}", inventoryHandler.UpdateItem)
			r.Delete("/items/{id}", inventoryHandler.DeleteItem)

			// Stock movements
			r.Post("/movements", movementHandler.CreateMovement)
			r.Get("/movements", movementHandler.GetMovements)
			r.Get("/items/{id}/movements", movementHandler.GetItemMovements)

			// Orders (viewing)
			r.Get("/orders", orderHandler.ListOrders)
			r.Get("/orders/stats", orderHandler.GetOrderStats)
			r.Get("/orders/{id}", orderHandler.GetOrder)

			// Menu (viewing)
			r.Get("/menu", menuHandler.ListMenus)
			r.Get("/menu/{restaurantId}", menuHandler.GetMenu)

			// Stores
			r.Get("/stores", storeHandler.List)
			r.Post("/stores", storeHandler.Create)
			r.Put("/stores/{id}", storeHandler.Update)
			r.Delete("/stores/{id}", storeHandler.Deactivate)

			// Platform bindings
			r.Get("/platform-bindings", bindingHandler.List)
			r.Post("/platform-bindings", bindingHandler.Create)
			r.Put("/platform-bindings/{id}", bindingHandler.Update)
			r.Delete("/platform-bindings/{id}", bindingHandler.Delete)
		})

		// Ledgr module routes (JWT auth + feature flag guard applied inside)
		r.Route("/ledgr", func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(cfg.JWT.Secret))
			r.Use(ledgr_handlers.LedgrFeatureGuard(ledgrOrgRepo))

			r.Get("/stores", ledgrStoreHandler.List)

			r.Post("/expenses", ledgrExpenseHandler.Create)
			r.Get("/expenses", ledgrExpenseHandler.List)
			r.Get("/expenses/calendar/{year}/{month}", ledgrExpenseHandler.CalendarSummary)
			r.Get("/expenses/{id}", ledgrExpenseHandler.Get)
			r.Put("/expenses/{id}", ledgrExpenseHandler.Update)
			r.Delete("/expenses/{id}", ledgrExpenseHandler.Delete)

			r.Post("/categories", ledgrCategoryHandler.Create)
			r.Get("/categories", ledgrCategoryHandler.List)
			r.Put("/categories/{id}", ledgrCategoryHandler.Update)
			r.Delete("/categories/{id}", ledgrCategoryHandler.Delete)

			r.Get("/daylog/{date}", ledgrDaylogHandler.Get)
			r.Post("/daylog/{date}/submit", ledgrDaylogHandler.Submit)
			r.Post("/daylog/{date}/lock", ledgrDaylogHandler.Lock)
			r.Post("/daylog/{date}/unlock", ledgrDaylogHandler.Unlock)

			r.Get("/templates", ledgrTemplateHandler.List)
			r.Post("/templates", ledgrTemplateHandler.Create)
			r.Put("/templates/{id}", ledgrTemplateHandler.Update)
			r.Delete("/templates/{id}", ledgrTemplateHandler.Delete)

			r.Get("/partners/balances", ledgrPartnerHandler.Balances)
			r.Post("/settlements", ledgrPartnerHandler.CreateSettlement)

			r.Get("/reports/pl", ledgrReportHandler.PL)
			r.Get("/reports/gst", ledgrReportHandler.GST)
			r.Get("/reports/partners", ledgrReportHandler.Partners)

			r.Get("/exports/csv", ledgrExportHandler.CSV)
			r.Get("/exports/pdf", ledgrExportHandler.PDF)

			r.Post("/attachments", ledgrAttachmentHandler.Upload)
			r.Get("/attachments/{id}", ledgrAttachmentHandler.Get)
			r.Delete("/attachments/{id}", ledgrAttachmentHandler.Delete)
		})
	})

	// Serve static files (React build) - must be last to not catch API routes
	if cfg.ServeStatic {
		// Custom handler for SPA routing
		spaHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Never intercept OPTIONS — let the CORS middleware handle preflights.
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			path := "./frontend/dist" + r.URL.Path

			// Check if file exists
			if _, err := os.Stat(path); os.IsNotExist(err) {
				// File doesn't exist, serve index.html for client-side routing
				http.ServeFile(w, r, "./frontend/dist/index.html")
				return
			}

			// File exists, serve it
			http.FileServer(http.Dir("./frontend/dist")).ServeHTTP(w, r)
		})

		r.Handle("/*", spaHandler)
	}

	// Start server
	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      r,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeout) * time.Second,
	}

	// Graceful shutdown
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server failed to start", err)
		}
	}()

	log.Info("Server starting on port " + cfg.Server.Port)

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Server shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown", err)
	}

	log.Info("Server shutdown complete")
}
