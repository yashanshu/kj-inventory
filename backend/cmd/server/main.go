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

	// Initialize services
	authService := services.NewAuthService(userRepo, cfg.JWT.Secret)
	inventoryService := services.NewInventoryService(itemRepo, categoryRepo, movementRepo, alertRepo, db)
	dashboardService := services.NewDashboardService(itemRepo, movementRepo, alertRepo, db)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, log)
	inventoryHandler := handlers.NewInventoryHandler(inventoryService, log)
	dashboardHandler := handlers.NewDashboardHandler(dashboardService, log)
	movementHandler := handlers.NewMovementHandler(inventoryService, log)

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
		})
	})

	// Serve static files (React build) - must be last to not catch API routes
	if cfg.ServeStatic {
		// Custom handler for SPA routing
		spaHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
