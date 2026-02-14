-- Restaurant menu data table for Swiggy menu integration
CREATE TABLE IF NOT EXISTS restaurant_menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id TEXT NOT NULL,
    restaurant_name TEXT,
    offers_json TEXT,       -- JSON array of offers/discounts
    categories_json TEXT,   -- JSON array of {name, items[]}
    fetched_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_menus_rid ON restaurant_menus(restaurant_id);
