-- Core tenancy and inventory schema.
-- Ownership is organization -> store. Inventory lives at the store level.

CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY DEFAULT (
        lower(
            printf(
                '%s-%s-4%s-%s%s-%s',
                hex(randomblob(4)),
                hex(randomblob(2)),
                substr(hex(randomblob(2)), 2),
                substr('89ab', 1 + abs(random()) % 4, 1),
                substr(hex(randomblob(2)), 2),
                hex(randomblob(6))
            )
        )
    ),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSON DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY DEFAULT (
        lower(
            printf(
                '%s-%s-4%s-%s%s-%s',
                hex(randomblob(4)),
                hex(randomblob(2)),
                substr(hex(randomblob(2)), 2),
                substr('89ab', 1 + abs(random()) % 4, 1),
                substr(hex(randomblob(2)), 2),
                hex(randomblob(6))
            )
        )
    ),
    organization_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    metadata_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (
        lower(
            printf(
                '%s-%s-4%s-%s%s-%s',
                hex(randomblob(4)),
                hex(randomblob(2)),
                substr(hex(randomblob(2)), 2),
                substr('89ab', 1 + abs(random()) % 4, 1),
                substr(hex(randomblob(2)), 2),
                hex(randomblob(6))
            )
        )
    ),
    organization_id TEXT NOT NULL,
    default_store_id TEXT,
    user_id VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('ADMIN', 'MANAGER', 'USER')),
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (default_store_id) REFERENCES stores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT (
        lower(
            printf(
                '%s-%s-4%s-%s%s-%s',
                hex(randomblob(4)),
                hex(randomblob(2)),
                substr(hex(randomblob(2)), 2),
                substr('89ab', 1 + abs(random()) % 4, 1),
                substr(hex(randomblob(2)), 2),
                hex(randomblob(6))
            )
        )
    ),
    organization_id TEXT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7),
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY DEFAULT (
        lower(
            printf(
                '%s-%s-4%s-%s%s-%s',
                hex(randomblob(4)),
                hex(randomblob(2)),
                substr(hex(randomblob(2)), 2),
                substr('89ab', 1 + abs(random()) % 4, 1),
                substr(hex(randomblob(2)), 2),
                hex(randomblob(6))
            )
        )
    ),
    organization_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    unit_of_measurement VARCHAR(50) NOT NULL,
    minimum_threshold INTEGER DEFAULT 0 CHECK (minimum_threshold >= 0),
    current_stock INTEGER DEFAULT 0 CHECK (current_stock >= 0),
    unit_cost DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    track_stock BOOLEAN NOT NULL DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    UNIQUE(store_id, sku)
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY DEFAULT (
        lower(
            printf(
                '%s-%s-4%s-%s%s-%s',
                hex(randomblob(4)),
                hex(randomblob(2)),
                substr(hex(randomblob(2)), 2),
                substr('89ab', 1 + abs(random()) % 4, 1),
                substr(hex(randomblob(2)), 2),
                hex(randomblob(6))
            )
        )
    ),
    item_id TEXT NOT NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reference VARCHAR(255),
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY DEFAULT (
        lower(
            printf(
                '%s-%s-4%s-%s%s-%s',
                hex(randomblob(4)),
                hex(randomblob(2)),
                substr(hex(randomblob(2)), 2),
                substr('89ab', 1 + abs(random()) % 4, 1),
                substr(hex(randomblob(2)), 2),
                hex(randomblob(6))
            )
        )
    ),
    organization_id TEXT NOT NULL,
    store_id TEXT,
    item_id TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('LOW_STOCK', 'OUT_OF_STOCK')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_default_store ON users(default_store_id);
CREATE INDEX IF NOT EXISTS idx_stores_organization ON stores(organization_id);
CREATE INDEX IF NOT EXISTS idx_categories_organization ON categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_organization ON items(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_store ON items(store_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_stock_level ON items(current_stock, minimum_threshold);
CREATE INDEX IF NOT EXISTS idx_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_organization ON alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_store ON alerts(store_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read, created_at);

CREATE TRIGGER IF NOT EXISTS update_organizations_updated_at
    AFTER UPDATE ON organizations
    BEGIN
        UPDATE organizations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_stores_updated_at
    AFTER UPDATE ON stores
    BEGIN
        UPDATE stores SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_categories_updated_at
    AFTER UPDATE ON categories
    BEGIN
        UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_items_updated_at
    AFTER UPDATE ON items
    BEGIN
        UPDATE items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS check_low_stock_alert
    AFTER UPDATE OF current_stock ON items
    WHEN NEW.track_stock = 1 AND NEW.current_stock <= NEW.minimum_threshold AND OLD.current_stock > OLD.minimum_threshold
    BEGIN
        INSERT INTO alerts (organization_id, store_id, item_id, type, severity, title, message)
        VALUES (
            NEW.organization_id,
            NEW.store_id,
            NEW.id,
            CASE WHEN NEW.current_stock = 0 THEN 'OUT_OF_STOCK' ELSE 'LOW_STOCK' END,
            CASE WHEN NEW.current_stock = 0 THEN 'CRITICAL' ELSE 'WARNING' END,
            CASE
                WHEN NEW.current_stock = 0 THEN 'Out of Stock: ' || NEW.name
                ELSE 'Low Stock: ' || NEW.name
            END,
            CASE
                WHEN NEW.current_stock = 0 THEN 'Item "' || NEW.name || '" is out of stock!'
                ELSE 'Item "' || NEW.name || '" is running low (Current: ' || NEW.current_stock || ', Minimum: ' || NEW.minimum_threshold || ')'
            END
        );
    END;

INSERT OR IGNORE INTO organizations (id, name, slug)
VALUES ('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'Default Restaurant', 'default');

INSERT OR IGNORE INTO stores (id, organization_id, name, code, is_primary)
VALUES ('6b38ab24-a6cc-4f44-9c77-16cb92c6dfb4', '928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'Main Store', 'main', true);

INSERT OR IGNORE INTO users (id, organization_id, default_store_id, user_id, email, password_hash, first_name, last_name, role)
VALUES (
    'default-admin-id',
    '928a9b9f-dd35-4145-a480-9b1be3d7e52e',
    '6b38ab24-a6cc-4f44-9c77-16cb92c6dfb4',
    'admin',
    'admin@restaurant.local',
    '$2a$10$KDy0HPA5BEwamJTPu6wI8ORVt44x54ke9AJEn1/tc1KlaQajUG1gO',
    'Admin',
    'User',
    'ADMIN'
);

INSERT OR IGNORE INTO users (id, organization_id, default_store_id, user_id, email, password_hash, first_name, last_name, role)
VALUES (
    'default-staff-id',
    '928a9b9f-dd35-4145-a480-9b1be3d7e52e',
    '6b38ab24-a6cc-4f44-9c77-16cb92c6dfb4',
    'staff',
    'staff@restaurant.local',
    '$2a$10$KDy0HPA5BEwamJTPu6wI8ORVt44x54ke9AJEn1/tc1KlaQajUG1gO',
    'Floor',
    'Staff',
    'USER'
);

INSERT OR IGNORE INTO categories (id, organization_id, name, description, color, sort_order) VALUES
('0c911b65-9b57-4d00-b0a6-b7167e79548c', '928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'Dry Items', 'Dry spices, grains, and non-perishable items', '#8B4513', 1),
('c1a65591-298d-4039-a2b6-8c246a4be5e2', '928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'Dry Consumables', 'Regularly consumed dry ingredients', '#DAA520', 2),
('149573da-3d1c-4360-9b32-d9f953cfc3b9', '928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'Deep Cold/Frozen', 'Frozen items requiring deep freezing', '#4682B4', 3),
('81b44775-0dc2-4689-9b01-84bec98e4010', '928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'Perishable Cold', 'Fresh items requiring refrigeration', '#32CD32', 4),
('e52dcbef-6b0b-40b3-a135-c5af768957e5', '928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'Packaging', 'Containers, bags, and packaging materials', '#9370DB', 5);

INSERT OR IGNORE INTO items (organization_id, store_id, category_id, name, unit_of_measurement, minimum_threshold, current_stock, track_stock) VALUES
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '6b38ab24-a6cc-4f44-9c77-16cb92c6dfb4', '0c911b65-9b57-4d00-b0a6-b7167e79548c', 'Sooji', 'kg', 2, 5, true),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '6b38ab24-a6cc-4f44-9c77-16cb92c6dfb4', '0c911b65-9b57-4d00-b0a6-b7167e79548c', 'Dhaniya Powder', 'kg', 1, 4, true),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '6b38ab24-a6cc-4f44-9c77-16cb92c6dfb4', 'c1a65591-298d-4039-a2b6-8c246a4be5e2', 'Oil', 'ltr', 10, 25, true),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '6b38ab24-a6cc-4f44-9c77-16cb92c6dfb4', 'c1a65591-298d-4039-a2b6-8c246a4be5e2', 'Salt', 'kg', 5, 20, true),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '6b38ab24-a6cc-4f44-9c77-16cb92c6dfb4', '149573da-3d1c-4360-9b32-d9f953cfc3b9', 'French Fries', 'kg', 5, 12, true),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '6b38ab24-a6cc-4f44-9c77-16cb92c6dfb4', '149573da-3d1c-4360-9b32-d9f953cfc3b9', 'Cheese', 'kg', 2, 5, true),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '6b38ab24-a6cc-4f44-9c77-16cb92c6dfb4', '81b44775-0dc2-4689-9b01-84bec98e4010', 'Paneer', 'kg', 2, 8, true),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '6b38ab24-a6cc-4f44-9c77-16cb92c6dfb4', '81b44775-0dc2-4689-9b01-84bec98e4010', 'Tomato', 'kg', 5, 15, true),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '6b38ab24-a6cc-4f44-9c77-16cb92c6dfb4', 'e52dcbef-6b0b-40b3-a135-c5af768957e5', '250ml Container', 'pcs', 100, 300, true),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '6b38ab24-a6cc-4f44-9c77-16cb92c6dfb4', 'e52dcbef-6b0b-40b3-a135-c5af768957e5', 'Brown Carry Bag', 'pcs', 200, 1000, true);
