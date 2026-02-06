-- External orders table for Swiggy/Zomato integration
CREATE TABLE IF NOT EXISTS external_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL CHECK(platform IN ('swiggy', 'zomato')),
    external_order_id TEXT NOT NULL,
    order_date DATETIME NOT NULL,
    customer_name TEXT,
    total_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'new',
    items_json TEXT,
    raw_data TEXT,
    notified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, external_order_id)
);

CREATE INDEX IF NOT EXISTS idx_external_orders_platform ON external_orders(platform);
CREATE INDEX IF NOT EXISTS idx_external_orders_date ON external_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_external_orders_platform_date ON external_orders(platform, order_date);
