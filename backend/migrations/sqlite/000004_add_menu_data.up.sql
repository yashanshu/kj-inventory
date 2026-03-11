CREATE TABLE IF NOT EXISTS restaurant_menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT,
    store_id TEXT,
    platform_binding_id TEXT,
    platform TEXT NOT NULL CHECK(platform IN ('swiggy', 'zomato')),
    restaurant_id TEXT NOT NULL,
    restaurant_name TEXT,
    offers_json TEXT,
    categories_json TEXT,
    fetched_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL,
    FOREIGN KEY (platform_binding_id) REFERENCES platform_store_bindings(id) ON DELETE SET NULL,
    UNIQUE(platform, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_menus_platform_rid ON restaurant_menus(platform, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_menus_store_fetched ON restaurant_menus(store_id, fetched_at DESC);

CREATE TRIGGER IF NOT EXISTS update_restaurant_menus_updated_at
    AFTER UPDATE ON restaurant_menus
    BEGIN
        UPDATE restaurant_menus SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
