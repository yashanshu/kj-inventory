-- migrations/001_initial_schema.up.sql

-- Organizations table (for multi-tenant support)
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY DEFAULT (
        lower(
            printf(
            '%s-%s-4%s-%s%s-%s',
            hex(randomblob(4)),                     -- 8 hex
            hex(randomblob(2)),                     -- 4 hex
            substr(hex(randomblob(2)), 2),          -- 3 hex (version nibble fixed to '4' above)
            substr('89ab', 1 + abs(random()) % 4, 1), -- variant nibble: 8,9,a,b
            substr(hex(randomblob(2)), 2),          -- 3 hex
            hex(randomblob(6))                      -- 12 hex
            )
       )
    ),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSON DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (
        lower(
            printf(
            '%s-%s-4%s-%s%s-%s',
            hex(randomblob(4)),                     -- 8 hex
            hex(randomblob(2)),                     -- 4 hex
            substr(hex(randomblob(2)), 2),          -- 3 hex (version nibble fixed to '4' above)
            substr('89ab', 1 + abs(random()) % 4, 1), -- variant nibble: 8,9,a,b
            substr(hex(randomblob(2)), 2),          -- 3 hex
            hex(randomblob(6))                      -- 12 hex
            )
       )
    ),
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
    id TEXT PRIMARY KEY DEFAULT (
        lower(
            printf(
            '%s-%s-4%s-%s%s-%s',
            hex(randomblob(4)),                     -- 8 hex
            hex(randomblob(2)),                     -- 4 hex
            substr(hex(randomblob(2)), 2),          -- 3 hex (version nibble fixed to '4' above)
            substr('89ab', 1 + abs(random()) % 4, 1), -- variant nibble: 8,9,a,b
            substr(hex(randomblob(2)), 2),          -- 3 hex
            hex(randomblob(6))                      -- 12 hex
            )
       )
    ),
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
    id TEXT PRIMARY KEY DEFAULT (
        lower(
            printf(
            '%s-%s-4%s-%s%s-%s',
            hex(randomblob(4)),                     -- 8 hex
            hex(randomblob(2)),                     -- 4 hex
            substr(hex(randomblob(2)), 2),          -- 3 hex (version nibble fixed to '4' above)
            substr('89ab', 1 + abs(random()) % 4, 1), -- variant nibble: 8,9,a,b
            substr(hex(randomblob(2)), 2),          -- 3 hex
            hex(randomblob(6))                      -- 12 hex
            )
       )
    ),
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
    id TEXT PRIMARY KEY DEFAULT (
        lower(
            printf(
            '%s-%s-4%s-%s%s-%s',
            hex(randomblob(4)),                     -- 8 hex
            hex(randomblob(2)),                     -- 4 hex
            substr(hex(randomblob(2)), 2),          -- 3 hex (version nibble fixed to '4' above)
            substr('89ab', 1 + abs(random()) % 4, 1), -- variant nibble: 8,9,a,b
            substr(hex(randomblob(2)), 2),          -- 3 hex
            hex(randomblob(6))                      -- 12 hex
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

-- Alerts table (for low stock notifications)
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY DEFAULT (
        lower(
            printf(
            '%s-%s-4%s-%s%s-%s',
            hex(randomblob(4)),                     -- 8 hex
            hex(randomblob(2)),                     -- 4 hex
            substr(hex(randomblob(2)), 2),          -- 3 hex (version nibble fixed to '4' above)
            substr('89ab', 1 + abs(random()) % 4, 1), -- variant nibble: 8,9,a,b
            substr(hex(randomblob(2)), 2),          -- 3 hex
            hex(randomblob(6))                      -- 12 hex
            )
       )
    ),
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
VALUES ('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'Default Restaurant', 'default');

-- Insert default admin user (password: admin123 - change in production!)
INSERT OR IGNORE INTO users (id, organization_id, email, password_hash, first_name, last_name, role)
VALUES (
    'default-admin-id',
    '928a9b9f-dd35-4145-a480-9b1be3d7e52e', 
    'admin@restaurant.local',
    '$2a$10$KDy0HPA5BEwamJTPu6wI8ORVt44x54ke9AJEn1/tc1KlaQajUG1gO', -- bcrypt hash of 'admin123'
    'Admin',
    'User',
    'ADMIN'
);

-- Insert default staff user (shares admin123 password for local testing)
INSERT OR IGNORE INTO users (id, organization_id, email, password_hash, first_name, last_name, role)
VALUES (
    'default-staff-id',
    '928a9b9f-dd35-4145-a480-9b1be3d7e52e',
    'staff@restaurant.local',
    '$2a$10$KDy0HPA5BEwamJTPu6wI8ORVt44x54ke9AJEn1/tc1KlaQajUG1gO',
    'Floor',
    'Staff',
    'USER'
);

-- Insert your predefined categories based on the inventory list
INSERT OR IGNORE INTO categories (id, organization_id, name, description, color, sort_order) VALUES
('0c911b65-9b57-4d00-b0a6-b7167e79548c', '928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'Dry Items', 'Dry spices, grains, and non-perishable items', '#8B4513', 1),
('c1a65591-298d-4039-a2b6-8c246a4be5e2', '928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'Dry Consumables', 'Regularly consumed dry ingredients', '#DAA520', 2),
('149573da-3d1c-4360-9b32-d9f953cfc3b9', '928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'Deep Cold/Frozen', 'Frozen items requiring deep freezing', '#4682B4', 3),
('81b44775-0dc2-4689-9b01-84bec98e4010', '928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'Perishable Cold', 'Fresh items requiring refrigeration', '#32CD32', 4),
('e52dcbef-6b0b-40b3-a135-c5af768957e5', '928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'Packaging', 'Containers, bags, and packaging materials', '#9370DB', 5);

-- Insert sample items from your inventory list
INSERT OR IGNORE INTO items (organization_id, category_id, name, unit_of_measurement, minimum_threshold, current_stock) VALUES
-- Dry Items
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '0c911b65-9b57-4d00-b0a6-b7167e79548c', 'Sooji', 'kg', 2, 5),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '0c911b65-9b57-4d00-b0a6-b7167e79548c', 'Chilli', 'kg', 1, 3),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '0c911b65-9b57-4d00-b0a6-b7167e79548c', 'Badi Elaichi', 'gm', 50, 100),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '0c911b65-9b57-4d00-b0a6-b7167e79548c', 'Star Anees', 'gm', 50, 150),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '0c911b65-9b57-4d00-b0a6-b7167e79548c', 'Javitri', 'gm', 25, 75),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '0c911b65-9b57-4d00-b0a6-b7167e79548c', 'Yellow Chilli', 'kg', 1, 2),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '0c911b65-9b57-4d00-b0a6-b7167e79548c', 'Jaifal', 'gm', 25, 50),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '0c911b65-9b57-4d00-b0a6-b7167e79548c', 'Dhaniya Powder', 'kg', 1, 4),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '0c911b65-9b57-4d00-b0a6-b7167e79548c', 'Laung', 'gm', 50, 100),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '0c911b65-9b57-4d00-b0a6-b7167e79548c', 'Peanut', 'kg', 2, 8),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '0c911b65-9b57-4d00-b0a6-b7167e79548c', 'Jeera', 'kg', 1, 3),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '0c911b65-9b57-4d00-b0a6-b7167e79548c', 'Sabut Dhaniya', 'kg', 1, 2),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '0c911b65-9b57-4d00-b0a6-b7167e79548c', 'Tez Patta', 'gm', 50, 200),

-- Dry Consumables  
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'c1a65591-298d-4039-a2b6-8c246a4be5e2', 'Chaat Masala', 'kg', 1, 2),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'c1a65591-298d-4039-a2b6-8c246a4be5e2', 'Jeera Powder', 'kg', 1, 3),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'c1a65591-298d-4039-a2b6-8c246a4be5e2', 'Kali Mirch Powder', 'kg', 500, 1000),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'c1a65591-298d-4039-a2b6-8c246a4be5e2', 'Garam Masala', 'kg', 1, 2),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'c1a65591-298d-4039-a2b6-8c246a4be5e2', 'Kitchen King', 'kg', 500, 1500),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'c1a65591-298d-4039-a2b6-8c246a4be5e2', 'Haldi', 'kg', 1, 3),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'c1a65591-298d-4039-a2b6-8c246a4be5e2', 'Lal Mirch', 'kg', 2, 5),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'c1a65591-298d-4039-a2b6-8c246a4be5e2', 'Salt', 'kg', 5, 20),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'c1a65591-298d-4039-a2b6-8c246a4be5e2', 'Oil', 'ltr', 10, 25),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'c1a65591-298d-4039-a2b6-8c246a4be5e2', 'Sugar', 'kg', 5, 15),

-- Deep Cold/Frozen
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '149573da-3d1c-4360-9b32-d9f953cfc3b9', 'Chaap', 'pcs', 10, 50),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '149573da-3d1c-4360-9b32-d9f953cfc3b9', 'Harabhara Kabab', 'pcs', 20, 100),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '149573da-3d1c-4360-9b32-d9f953cfc3b9', 'Cheese', 'kg', 2, 5),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '149573da-3d1c-4360-9b32-d9f953cfc3b9', 'Veg Seekh', 'pcs', 15, 75),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '149573da-3d1c-4360-9b32-d9f953cfc3b9', 'French Fries', 'kg', 5, 12),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '149573da-3d1c-4360-9b32-d9f953cfc3b9', 'Mayo', 'kg', 2, 4),

-- Perishable Cold
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '81b44775-0dc2-4689-9b01-84bec98e4010', 'Paneer', 'kg', 2, 8),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '81b44775-0dc2-4689-9b01-84bec98e4010', 'Capsicum', 'kg', 3, 10),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '81b44775-0dc2-4689-9b01-84bec98e4010', 'Cucumber', 'kg', 2, 8),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '81b44775-0dc2-4689-9b01-84bec98e4010', 'Tomato', 'kg', 5, 15),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '81b44775-0dc2-4689-9b01-84bec98e4010', 'Onion', 'kg', 10, 25),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '81b44775-0dc2-4689-9b01-84bec98e4010', 'Garlic', 'kg', 2, 5),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '81b44775-0dc2-4689-9b01-84bec98e4010', 'Ginger', 'kg', 1, 3),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '81b44775-0dc2-4689-9b01-84bec98e4010', 'Dahi', 'kg', 3, 8),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', '81b44775-0dc2-4689-9b01-84bec98e4010', 'Milk', 'ltr', 5, 15),

-- Packaging
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'e52dcbef-6b0b-40b3-a135-c5af768957e5', '50ml Container', 'pcs', 50, 200),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'e52dcbef-6b0b-40b3-a135-c5af768957e5', '100ml Container', 'pcs', 50, 150),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'e52dcbef-6b0b-40b3-a135-c5af768957e5', '250ml Container', 'pcs', 100, 300),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'e52dcbef-6b0b-40b3-a135-c5af768957e5', '500ml Container', 'pcs', 100, 250),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'e52dcbef-6b0b-40b3-a135-c5af768957e5', 'Brown Carry Bag', 'pcs', 200, 1000),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'e52dcbef-6b0b-40b3-a135-c5af768957e5', 'Foil', 'roll', 5, 15),
('928a9b9f-dd35-4145-a480-9b1be3d7e52e', 'e52dcbef-6b0b-40b3-a135-c5af768957e5', 'Tissue', 'pack', 10, 30);
