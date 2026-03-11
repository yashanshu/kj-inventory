CREATE TABLE IF NOT EXISTS depletion_configs (
    store_id TEXT PRIMARY KEY,
    mode TEXT NOT NULL CHECK(mode IN ('disabled', 'shadow', 'live')),
    coverage_threshold INTEGER NOT NULL DEFAULT 90,
    live_since DATETIME,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS depletion_mappings (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    platform_binding_id TEXT NOT NULL,
    menu_item_name TEXT NOT NULL,
    menu_item_key TEXT NOT NULL,
    variant_name TEXT NOT NULL DEFAULT '',
    variant_key TEXT NOT NULL DEFAULT '',
    inventory_item_id TEXT NOT NULL,
    quantity_per_order_unit INTEGER NOT NULL CHECK(quantity_per_order_unit > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (platform_binding_id) REFERENCES platform_store_bindings(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_item_id) REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE(platform_binding_id, menu_item_key, variant_key)
);

CREATE TABLE IF NOT EXISTS depletion_order_events (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    platform_binding_id TEXT,
    platform TEXT NOT NULL CHECK(platform IN ('swiggy', 'zomato')),
    external_order_id TEXT NOT NULL,
    restaurant_id TEXT NOT NULL,
    order_status TEXT NOT NULL,
    applied_mode TEXT NOT NULL CHECK(applied_mode IN ('shadow', 'live')),
    stock_applied BOOLEAN NOT NULL DEFAULT false,
    stock_reversed BOOLEAN NOT NULL DEFAULT false,
    mapped_quantity INTEGER NOT NULL DEFAULT 0,
    unmapped_quantity INTEGER NOT NULL DEFAULT 0,
    estimated_consumption_json TEXT,
    unmapped_items_json TEXT,
    last_error TEXT,
    last_processed_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (platform_binding_id) REFERENCES platform_store_bindings(id) ON DELETE SET NULL,
    UNIQUE(platform, external_order_id)
);

CREATE INDEX IF NOT EXISTS idx_depletion_mappings_store ON depletion_mappings(store_id);
CREATE INDEX IF NOT EXISTS idx_depletion_mappings_lookup ON depletion_mappings(platform_binding_id, menu_item_key, variant_key);
CREATE INDEX IF NOT EXISTS idx_depletion_order_events_store ON depletion_order_events(store_id, updated_at DESC);

CREATE TRIGGER IF NOT EXISTS update_depletion_configs_updated_at
    AFTER UPDATE ON depletion_configs
    BEGIN
        UPDATE depletion_configs SET updated_at = CURRENT_TIMESTAMP WHERE store_id = NEW.store_id;
    END;

CREATE TRIGGER IF NOT EXISTS update_depletion_mappings_updated_at
    AFTER UPDATE ON depletion_mappings
    BEGIN
        UPDATE depletion_mappings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_depletion_order_events_updated_at
    AFTER UPDATE ON depletion_order_events
    BEGIN
        UPDATE depletion_order_events SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
