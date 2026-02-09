/**
 * Order Deduplicator
 * 
 * Tracks seen order IDs to prevent duplicate notifications
 */

import fs from 'fs-extra';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SEEN_FILE = path.join(DATA_DIR, 'seen-orders.json');

// Keep last N order IDs to prevent memory bloat
const MAX_SEEN_ORDERS = 1000;

export class Deduplicator {
    private orderStatuses: Map<string, string> = new Map();

    async load(): Promise<void> {
        try {
            await fs.ensureDir(DATA_DIR);

            if (await fs.pathExists(SEEN_FILE)) {
                const data = await fs.readJson(SEEN_FILE);
                if (data.orders && Array.isArray(data.orders)) {
                    // Migration from old array format
                    this.orderStatuses = new Map(data.orders.map((id: string) => [id, 'unknown']));
                } else if (data.orderStatuses) {
                    this.orderStatuses = new Map(Object.entries(data.orderStatuses));
                }
                console.log(`Loaded ${this.orderStatuses.size} seen orders`);
            }
        } catch (error) {
            console.warn('Could not load seen orders:', error);
            this.orderStatuses = new Map();
        }
    }

    /**
     * Check if order is new or has a new status
     */
    hasStatusChanged(orderId: string, currentStatus: string): boolean {
        const lastStatus = this.orderStatuses.get(orderId);
        return lastStatus !== currentStatus;
    }

    /**
     * Mark order as seen with current status
     */
    markSeen(orderId: string, status: string): void {
        this.orderStatuses.set(orderId, status);

        // Trim if too large
        if (this.orderStatuses.size > MAX_SEEN_ORDERS) {
            const keysToDelete = Array.from(this.orderStatuses.keys()).slice(0, this.orderStatuses.size - MAX_SEEN_ORDERS);
            for (const key of keysToDelete) {
                this.orderStatuses.delete(key);
            }
        }
    }

    async save(): Promise<void> {
        try {
            await fs.writeJson(SEEN_FILE, {
                orderStatuses: Object.fromEntries(this.orderStatuses),
                savedAt: new Date().toISOString(),
            }, { spaces: 2 });
        } catch (error) {
            console.error('Failed to save seen orders:', error);
        }
    }
}
