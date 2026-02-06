/**
 * Swiggy Orders API Client
 * 
 * Polls the Swiggy partner orders API using saved session cookies
 */

import axios, { type AxiosInstance } from 'axios';
import fs from 'fs-extra';
import path from 'path';

interface Session {
    cookies: { name: string; value: string }[];
    userAgent: string;
    headers: Record<string, string>;
    restaurantIds: number[];
    capturedAt: string;
}

interface RestaurantTimeMap {
    rest_rid: number;
    lastUpdatedTime: string;
}

interface SwiggyOrder {
    orderId: string;
    restaurantId: number;
    items: any[];
    totalAmount: number;
    status: string;
    customerName?: string;
    createdAt: string;
    // Add more fields as we discover the structure
    [key: string]: any;
}

interface FetchResponse {
    statusCode: number;
    statusMessage: string;
    restaurantData: {
        restaurantId: number;
        lastUpdatedTime: string;
        orders: SwiggyOrder[];
        popOrders: SwiggyOrder[];
        updatedOrderIds: string[];
    }[];
    config: {
        pollingInterval: string;
    };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SESSION_FILE = path.join(DATA_DIR, 'session.json');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

export class SwiggyClient {
    private client: AxiosInstance;
    private session: Session | null = null;
    private lastUpdatedTimes: Map<number, string> = new Map();

    constructor() {
        this.client = axios.create({
            baseURL: 'https://partner.swiggy.com',
            timeout: 30000,
        });
    }

    async loadSession(): Promise<boolean> {
        try {
            if (!await fs.pathExists(SESSION_FILE)) {
                console.error('No session file found. Run: pnpm run login');
                return false;
            }

            this.session = await fs.readJson(SESSION_FILE);

            // Load last updated times if they exist
            if (await fs.pathExists(STATE_FILE)) {
                const state = await fs.readJson(STATE_FILE);
                const entries = Object.entries(state.lastUpdatedTimes || {});
                this.lastUpdatedTimes = new Map(
                    entries.map(([key, value]) => [Number(key), value as string])
                );
            }

            console.log(`Session loaded (captured: ${this.session?.capturedAt})`);
            console.log(`Restaurants: ${this.session?.restaurantIds.join(', ') || 'Will auto-detect'}`);

            return true;
        } catch (error) {
            console.error('Failed to load session:', error);
            return false;
        }
    }

    private getCookieHeader(): string {
        if (!this.session?.cookies) return '';
        return this.session.cookies
            .map(c => `${c.name}=${c.value}`)
            .join('; ');
    }

    private getHeaders(): Record<string, string> {
        return {
            ...this.session?.headers,
            'User-Agent': this.session?.userAgent || '',
            'Cookie': this.getCookieHeader(),
        };
    }

    private getTimestamp(): string {
        // Format: 2026-02-06T10:51:36
        return new Date().toISOString().replace(/\.\d{3}Z$/, '');
    }

    async fetchOrders(): Promise<{ orders: SwiggyOrder[]; sessionExpired: boolean }> {
        if (!this.session) {
            throw new Error('Session not loaded');
        }

        const restaurantIds = this.session.restaurantIds;
        if (restaurantIds.length === 0) {
            console.warn('No restaurant IDs in session. Run login again.');
            return { orders: [], sessionExpired: false };
        }

        // Build request payload with last updated times
        const now = this.getTimestamp();
        const restaurantTimeMap: RestaurantTimeMap[] = restaurantIds.map(id => ({
            rest_rid: id,
            lastUpdatedTime: this.lastUpdatedTimes.get(id) || now,
        }));

        const payload = {
            restaurantTimeMap,
            sourceMessageIdMap: { source: 'POLLING_SERVICE' },
        };

        try {
            const response = await this.client.post<FetchResponse>(
                '/orders/v1/fetch',
                payload,
                { headers: this.getHeaders() }
            );

            if (response.data.statusCode !== 0) {
                console.warn(`API returned status: ${response.data.statusMessage}`);
                return { orders: [], sessionExpired: false };
            }

            // Collect all new orders
            const allOrders: SwiggyOrder[] = [];

            for (const restaurant of response.data.restaurantData) {
                // Update last updated time for next poll
                this.lastUpdatedTimes.set(restaurant.restaurantId, restaurant.lastUpdatedTime);

                // Collect orders
                if (restaurant.orders?.length > 0) {
                    allOrders.push(...restaurant.orders);
                }
                if (restaurant.popOrders?.length > 0) {
                    allOrders.push(...restaurant.popOrders);
                }
            }

            // Save state for persistence across restarts
            await this.saveState();

            return { orders: allOrders, sessionExpired: false };

        } catch (error: any) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.error('Session expired! Run: pnpm run login');
                return { orders: [], sessionExpired: true };
            }
            throw error;
        }
    }

    private async saveState(): Promise<void> {
        await fs.writeJson(STATE_FILE, {
            lastUpdatedTimes: Object.fromEntries(this.lastUpdatedTimes),
            savedAt: new Date().toISOString(),
        }, { spaces: 2 });
    }
}
