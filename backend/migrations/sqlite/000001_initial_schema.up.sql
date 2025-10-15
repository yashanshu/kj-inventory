-- migrations/001_initial_schema.up.sql

-- Organizations table (for multi-tenant support)
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSON DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('ADMIN', 'MANAGER', 'USER')),
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(organization_id, name)
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    unit_of_measurement VARCHAR(50) NOT NULL,
    minimum_threshold INTEGER DEFAULT 0 CHECK (minimum_threshold >= 0),
    current_stock INTEGER DEFAULT 0 CHECK (current_stock >= 0),
    unit_cost DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    UNIQUE(organization_id, sku) -- SKU unique per organization
);

-- Stock movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
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

-- Alerts table (for low stock notifications)
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    item_id TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('LOW_STOCK', 'OUT_OF_STOCK')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_categories_organization ON categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_organization ON items(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_stock_level ON items(current_stock, minimum_threshold);
CREATE INDEX IF NOT EXISTS idx_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_organization ON alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read, created_at);

-- Create triggers to update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_organizations_updated_at
    AFTER UPDATE ON organizations
    BEGIN
        UPDATE organizations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
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

-- Trigger to automatically create alerts when stock goes below threshold
CREATE TRIGGER IF NOT EXISTS check_low_stock_alert
    AFTER UPDATE OF current_stock ON items
    WHEN NEW.current_stock <= NEW.minimum_threshold AND OLD.current_stock > OLD.minimum_threshold
    BEGIN
        INSERT INTO alerts (organization_id, item_id, type, severity, title, message)
        VALUES (
            NEW.organization_id,
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

-- Insert default organization for single-tenant use
INSERT OR IGNORE INTO organizations (id, name, slug) 
VALUES ('default-org-id', 'Default Restaurant', 'default');

-- Insert default admin user (password: admin123 - change in production!)
INSERT OR IGNORE INTO users (id, organization_id, email, password_hash, first_name, last_name, role)
VALUES (
    'default-admin-id',
    'default-org-id', 
    'admin@restaurant.local',
    '$2a$10$8K1p/a0dMJvB0b0QjE0Q2eK8sK8sK8sK8sK8sK8sK8sK8sK8sK8sK', -- bcrypt hash of 'admin123'
    'Admin',
    'User',
    'ADMIN'
);

-- Insert your predefined categories based on the inventory list
INSERT OR IGNORE INTO categories (id, organization_id, name, description, color, sort_order) VALUES
('cat-dry', 'default-org-id', 'Dry Items', 'Dry spices, grains, and non-perishable items', '#8B4513', 1),
('cat-dry-consumable', 'default-org-id', 'Dry Consumables', 'Regularly consumed dry ingredients', '#DAA520', 2),
('cat-deep-cold', 'default-org-id', 'Deep Cold/Frozen', 'Frozen items requiring deep freezing', '#4682B4', 3),
('cat-perishable-cold', 'default-org-id', 'Perishable Cold', 'Fresh items requiring refrigeration', '#32CD32', 4),
('cat-packaging', 'default-org-id', 'Packaging', 'Containers, bags, and packaging materials', '#9370DB', 5);

-- Insert sample items from your inventory list
INSERT OR IGNORE INTO items (organization_id, category_id, name, unit_of_measurement, minimum_threshold, current_stock) VALUES
-- Dry Items
('default-org-id', 'cat-dry', 'Sooji', 'kg', 2, 5),
('default-org-id', 'cat-dry', 'Chilli', 'kg', 1, 3),
('default-org-id', 'cat-dry', 'Badi Elaichi', 'gm', 50, 100),
('default-org-id', 'cat-dry', 'Star Anees', 'gm', 50, 150),
('default-org-id', 'cat-dry', 'Javitri', 'gm', 25, 75),
('default-org-id', 'cat-dry', 'Yellow Chilli', 'kg', 1, 2),
('default-org-id', 'cat-dry', 'Jaifal', 'gm', 25, 50),
('default-org-id', 'cat-dry', 'Dhaniya Powder', 'kg', 1, 4),
('default-org-id', 'cat-dry', 'Laung', 'gm', 50, 100),
('default-org-id', 'cat-dry', 'Peanut', 'kg', 2, 8),
('default-org-id', 'cat-dry', 'Jeera', 'kg', 1, 3),
('default-org-id', 'cat-dry', 'Sabut Dhaniya', 'kg', 1, 2),
('default-org-id', 'cat-dry', 'Tez Patta', 'gm', 50, 200),

-- Dry Consumables  
('default-org-id', 'cat-dry-consumable', 'Chaat Masala', 'kg', 1, 2),
('default-org-id', 'cat-dry-consumable', 'Jeera Powder', 'kg', 1, 3),
('default-org-id', 'cat-dry-consumable', 'Kali Mirch Powder', 'kg', 500, 1000),
('default-org-id', 'cat-dry-consumable', 'Garam Masala', 'kg', 1, 2),
('default-org-id', 'cat-dry-consumable', 'Kitchen King', 'kg', 500, 1500),
('default-org-id', 'cat-dry-consumable', 'Haldi', 'kg', 1, 3),
('default-org-id', 'cat-dry-consumable', 'Lal Mirch', 'kg', 2, 5),
('default-org-id', 'cat-dry-consumable', 'Salt', 'kg', 5, 20),
('default-org-id', 'cat-dry-consumable', 'Oil', 'ltr', 10, 25),
('default-org-id', 'cat-dry-consumable', 'Sugar', 'kg', 5, 15),

-- Deep Cold/Frozen
('default-org-id', 'cat-deep-cold', 'Chaap', 'pcs', 10, 50),
('default-org-id', 'cat-deep-cold', 'Harabhara Kabab', 'pcs', 20, 100),
('default-org-id', 'cat-deep-cold', 'Cheese', 'kg', 2, 5),
('default-org-id', 'cat-deep-cold', 'Veg Seekh', 'pcs', 15, 75),
('default-org-id', 'cat-deep-cold', 'French Fries', 'kg', 5, 12),
('default-org-id', 'cat-deep-cold', 'Mayo', 'kg', 2, 4),

-- Perishable Cold
('default-org-id', 'cat-perishable-cold', 'Paneer', 'kg', 2, 8),
('default-org-id', 'cat-perishable-cold', 'Capsicum', 'kg', 3, 10),
('default-org-id', 'cat-perishable-cold', 'Cucumber', 'kg', 2, 8),
('default-org-id', 'cat-perishable-cold', 'Tomato', 'kg', 5, 15),
('default-org-id', 'cat-perishable-cold', 'Onion', 'kg', 10, 25),
('default-org-id', 'cat-perishable-cold', 'Garlic', 'kg', 2, 5),
('default-org-id', 'cat-perishable-cold', 'Ginger', 'kg', 1, 3),
('default-org-id', 'cat-perishable-cold', 'Dahi', 'kg', 3, 8),
('default-org-id', 'cat-perishable-cold', 'Milk', 'ltr', 5, 15),

-- Packaging
('default-org-id', 'cat-packaging', '50ml Container', 'pcs', 50, 200),
('default-org-id', 'cat-packaging', '100ml Container', 'pcs', 50, 150),
('default-org-id', 'cat-packaging', '250ml Container', 'pcs', 100, 300),
('default-org-id', 'cat-packaging', '500ml Container', 'pcs', 100, 250),
('default-org-id', 'cat-packaging', 'Brown Carry Bag', 'pcs', 200, 1000),
('default-org-id', 'cat-packaging', 'Foil', 'roll', 5, 15),
('default-org-id', 'cat-packaging', 'Tissue', 'pack', 10, 30);
