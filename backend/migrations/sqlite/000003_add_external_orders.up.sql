CREATE TABLE IF NOT EXISTS platform_store_bindings (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK(platform IN ('swiggy', 'zomato')),
    restaurant_id TEXT NOT NULL,
    restaurant_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    UNIQUE(platform, restaurant_id)
);

CREATE TABLE IF NOT EXISTS external_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT,
    store_id TEXT,
    platform_binding_id TEXT,
    platform TEXT NOT NULL CHECK(platform IN ('swiggy', 'zomato')),
    restaurant_id TEXT NOT NULL DEFAULT '',
    restaurant_name TEXT,
    external_order_id TEXT NOT NULL,
    order_date DATETIME NOT NULL,
    customer_name TEXT,
    total_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'new',
    items_json TEXT,
    raw_data TEXT,
    notified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL,
    FOREIGN KEY (platform_binding_id) REFERENCES platform_store_bindings(id) ON DELETE SET NULL,
    UNIQUE(platform, external_order_id)
);

CREATE TABLE IF NOT EXISTS external_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_order_row_id INTEGER NOT NULL,
    line_number INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    variant_name TEXT,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price REAL,
    final_price REAL,
    raw_payload_json TEXT,
    FOREIGN KEY (external_order_row_id) REFERENCES external_orders(id) ON DELETE CASCADE,
    UNIQUE(external_order_row_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_platform_store_bindings_store ON platform_store_bindings(store_id);
CREATE INDEX IF NOT EXISTS idx_external_orders_platform ON external_orders(platform);
CREATE INDEX IF NOT EXISTS idx_external_orders_restaurant ON external_orders(platform, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_external_orders_date ON external_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_external_orders_store_date ON external_orders(store_id, order_date);
CREATE INDEX IF NOT EXISTS idx_external_order_items_order ON external_order_items(external_order_row_id);

CREATE TRIGGER IF NOT EXISTS update_platform_store_bindings_updated_at
    AFTER UPDATE ON platform_store_bindings
    BEGIN
        UPDATE platform_store_bindings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_external_orders_updated_at
    AFTER UPDATE ON external_orders
    BEGIN
        UPDATE external_orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
