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

	"hasufel.kj/internal/middleware"
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

	//// Run migrations
	//if err := database.RunMigrations(cfg.Database); err != nil {
	//	log.Fatal("Failed to run migrations", err)
	//}

	// Initialize repositories
	//itemRepo := repository.NewItemRepository(db)
	//categoryRepo := repository.NewCategoryRepository(db)
	//movementRepo := repository.NewMovementRepository(db)
	//userRepo := repository.NewUserRepository(db)

	// Initialize services
	//authService := services.NewAuthService(userRepo, cfg.JWT.Secret)
	//inventoryService := services.NewInventoryService(itemRepo, categoryRepo, movementRepo)
	//dashboardService := services.NewDashboardService(itemRepo, movementRepo)

	// Initialize handlers
	//authHandler := handlers.NewAuthHandler(authService, log)
	//inventoryHandler := handlers.NewInventoryHandler(inventoryService, log)
	//dashboardHandler := handlers.NewDashboardHandler(dashboardService, log)
	//movementHandler := handlers.NewMovementHandler(inventoryService, log)

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

	// Serve static files (React build)
	if cfg.ServeStatic {
		fileServer := http.FileServer(http.Dir("./frontend/dist/"))
		r.Handle("/*", fileServer)
	}

	// API routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public routes
		//r.Post("/auth/login", authHandler.Login)
		//r.Post("/auth/register", authHandler.Register)

		// Protected routes
		//r.Group(func(r chi.Router) {
		//	r.Use(middleware.AuthMiddleware(cfg.JWT.Secret))

		//	// Dashboard
		//	r.Get("/dashboard/metrics", dashboardHandler.GetMetrics)
		//	r.Get("/dashboard/charts", dashboardHandler.GetCharts)

		//	// Categories
		//	r.Get("/categories", inventoryHandler.GetCategories)
		//	r.Post("/categories", inventoryHandler.CreateCategory)

		//	// Items
		//	r.Get("/items", inventoryHandler.GetItems)
		//	r.Post("/items", inventoryHandler.CreateItem)
		//	r.Get("/items/{id}", inventoryHandler.GetItem)
		//	r.Put("/items/{id}", inventoryHandler.UpdateItem)
		//	r.Delete("/items/{id}", inventoryHandler.DeleteItem)

		//	// Stock movements
		//	r.Post("/movements", movementHandler.CreateMovement)
		//	r.Get("/movements", movementHandler.GetMovements)
		//	r.Get("/items/{id}/movements", movementHandler.GetItemMovements)

		//	// Bulk operations
		//	r.Post("/items/bulk-import", inventoryHandler.BulkImport)
		//	r.Post("/movements/bulk-adjust", movementHandler.BulkAdjust)
		//})
	})

	// Health check
	//r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
	//	w.Header().Set("Content-Type", "application/json")
	//	w.WriteHeader(http.StatusOK)
	//	w.Write([]byte(`{"status":"ok"}`))
	//})

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
