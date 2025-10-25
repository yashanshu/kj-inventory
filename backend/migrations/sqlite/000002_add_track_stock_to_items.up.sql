-- Add track_stock flag to items for optional stock tracking
ALTER TABLE items
    ADD COLUMN track_stock BOOLEAN NOT NULL DEFAULT 1;
