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
    private seenOrders: Set<string> = new Set();

    async load(): Promise<void> {
        try {
            await fs.ensureDir(DATA_DIR);

            if (await fs.pathExists(SEEN_FILE)) {
                const data = await fs.readJson(SEEN_FILE);
                this.seenOrders = new Set(data.orders || []);
                console.log(`Loaded ${this.seenOrders.size} seen order IDs`);
            }
        } catch (error) {
            console.warn('Could not load seen orders:', error);
            this.seenOrders = new Set();
        }
    }

    isNew(orderId: string): boolean {
        return !this.seenOrders.has(orderId);
    }

    markSeen(orderId: string): void {
        this.seenOrders.add(orderId);

        // Trim if too large
        if (this.seenOrders.size > MAX_SEEN_ORDERS) {
            const arr = Array.from(this.seenOrders);
            this.seenOrders = new Set(arr.slice(-MAX_SEEN_ORDERS));
        }
    }

    async save(): Promise<void> {
        try {
            await fs.writeJson(SEEN_FILE, {
                orders: Array.from(this.seenOrders),
                savedAt: new Date().toISOString(),
            }, { spaces: 2 });
        } catch (error) {
            console.error('Failed to save seen orders:', error);
        }
    }
}
