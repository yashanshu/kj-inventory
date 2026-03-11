PRAGMA foreign_keys = OFF;

DROP TRIGGER IF EXISTS update_users_updated_at;
DROP INDEX IF EXISTS idx_users_organization;
DROP INDEX IF EXISTS idx_users_default_store;

ALTER TABLE users RENAME TO users_old;

CREATE TABLE users (
    id TEXT PRIMARY KEY,
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

INSERT INTO users (
    id, organization_id, default_store_id, user_id, email, password_hash,
    first_name, last_name, role, is_active, created_at, updated_at
)
WITH ranked_users AS (
    SELECT
        id,
        organization_id,
        default_store_id,
        lower(substr(email, 1, instr(email, '@') - 1)) AS base_user_id,
        email,
        password_hash,
        first_name,
        last_name,
        role,
        is_active,
        created_at,
        updated_at,
        row_number() OVER (
            PARTITION BY lower(substr(email, 1, instr(email, '@') - 1))
            ORDER BY created_at, id
        ) AS sequence_no
    FROM users_old
)
SELECT
    id,
    organization_id,
    default_store_id,
    CASE
        WHEN COALESCE(base_user_id, '') = '' THEN 'user' || sequence_no
        WHEN sequence_no = 1 THEN base_user_id
        ELSE base_user_id || sequence_no
    END AS user_id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
FROM ranked_users;

DROP TABLE users_old;

CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_default_store ON users(default_store_id);

CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

PRAGMA foreign_keys = ON;
