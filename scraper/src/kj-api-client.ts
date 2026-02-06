/**
 * KJ Inventory API Client
 * 
 * Posts captured orders to the KJ Inventory backend
 */

import axios, { type AxiosInstance } from 'axios';

interface OrderPayload {
    platform: 'swiggy' | 'zomato';
    externalOrderId: string;
    orderDate: string;
    customerName?: string;
    totalAmount: number;
    status: string;
    itemsJson: string;
    rawData: string;
}

export class KJApiClient {
    private client: AxiosInstance;
    private enabled: boolean = false;

    constructor() {
        const baseURL = process.env.KJ_API_URL;
        const token = process.env.KJ_API_TOKEN;

        if (!baseURL) {
            console.log('KJ API disabled (KJ_API_URL not set)');
            this.client = axios.create();
            return;
        }

        this.client = axios.create({
            baseURL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
        });

        this.enabled = true;
        console.log(`KJ API client configured: ${baseURL}`);
    }

    async ingestOrder(order: OrderPayload): Promise<boolean> {
        if (!this.enabled) {
            return true; // Silently skip if not configured
        }

        try {
            await this.client.post('/orders/ingest', order);
            console.log(`Order ${order.externalOrderId} sent to KJ Inventory`);
            return true;
        } catch (error: any) {
            console.error(`Failed to send order to KJ:`, error.message);
            return false;
        }
    }
}
