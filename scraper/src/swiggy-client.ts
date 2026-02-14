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
                this.lastSummaryDate = state.lastSummaryDate || '';
                this.lastMenuFetchDate = state.lastMenuFetchDate || '';
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

    async getBusinessMetrics(fromDate: number, toDate: number): Promise<any> {
        if (!this.session) {
            throw new Error('Session not loaded');
        }

        const restaurantIds = this.session.restaurantIds;
        if (restaurantIds.length === 0) {
            console.warn('No restaurant IDs in session for metrics.');
            return null;
        }

        const query = `
        query {
            businessMetricsDetailsV3(
            input: {
                rids: [${restaurantIds.join(',')}]
                period: CUSTOM
                fromDate: ${fromDate}
                toDate: ${toDate}
                metricsType: LIVE_METRICS
                metricIds: []
            }
            ) {
            title
            subTitleV2
            businessMetricsDetails {
                id
                title
                dataTimeInfo
                metrics {
                id
                cardTitle
                widgetType
                subWidgetType
                subMetrics {
                    id
                    title
                    infoText
                    emptyInfoText
                    cardMetrics {
                    id
                    label
                    value
                    subValue
                    timeComparison
                    arrowType
                    }
                }
                listCell {
                    label
                    emptyInfoText
                    metrics {
                    label
                    value
                    }
                }
                current {
                    title
                    emptyInfoText
                    metrics {
                    label
                    value
                    percent
                    subValue
                    arrowType
                    }
                }
                prev {
                    title
                    emptyInfoText
                    metrics {
                    label
                    value
                    percent
                    subValue
                    arrowType
                    }
                }
                tips {
                    contentID
                    type
                    mediaUrl
                    mediaType
                    iconUrl
                    label
                    title
                    description
                    cta {
                    message
                    deeplink
                    }
                }
                }
            }
            }
        }
        `;

        try {
            // Use a separate axios instance or override baseURL for this request
            // We use the same headers (cookies) as the partner API
            const response = await axios.post(
                'https://vhc-composer.swiggy.com/query',
                { query, variables: {} },
                {
                    headers: this.getHeaders(),
                    params: { query: 'businessMetricsDetailsV3' }
                }
            );

            if (response.data.errors) {
                console.error('GraphQL Errors:', JSON.stringify(response.data.errors, null, 2));
                return null;
            }

            return response.data.data;

        } catch (error: any) {
            console.error('Failed to fetch business metrics:', error.message);
            if (error.response?.data) {
                console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            }
            return null;
        }
    }

    /**
     * Fetch restaurant menu from Swiggy public API
     */
    async fetchMenu(restaurantId: number, lat: number, lng: number): Promise<{
        restaurantName: string;
        offers: any[];
        categories: any[];
    } | null> {
        try {
            const url = `https://www.swiggy.com/dapi/menu/pl`;
            const response = await axios.get(url, {
                params: {
                    'page-type': 'REGULAR_MENU',
                    'complete-menu': 'true',
                    lat: lat.toString(),
                    lng: lng.toString(),
                    restaurantId: restaurantId.toString(),
                },
                headers: {
                    'User-Agent': this.session?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                },
                timeout: 30000,
            });

            const data = response.data?.data;
            if (!data) {
                console.warn(`No menu data returned for restaurant ${restaurantId}`);
                return null;
            }

            // Extract restaurant name
            const restaurantName = data.cards?.find((c: any) =>
                c.card?.card?.info?.name
            )?.card?.card?.info?.name || `Restaurant ${restaurantId}`;

            // Extract offers
            const offers: any[] = [];
            const offerCards = data.cards?.find((c: any) =>
                c.card?.card?.gridElements?.infoWithStyle?.offers
            );
            if (offerCards) {
                const rawOffers = offerCards.card.card.gridElements.infoWithStyle.offers || [];
                for (const offer of rawOffers) {
                    const info = offer.info || {};
                    offers.push({
                        header: info.header || '',
                        couponCode: info.couponCode || '',
                        description: info.description || '',
                        offerType: info.offerType || '',
                    });
                }
            }

            // Extract categories and menu items
            const categories: any[] = [];
            const menuCards = data.cards?.find((c: any) =>
                c.groupedCard?.cardGroupMap?.REGULAR
            );
            if (menuCards) {
                const regularCards = menuCards.groupedCard.cardGroupMap.REGULAR.cards || [];
                for (const card of regularCards) {
                    const cardInfo = card.card?.card;
                    if (!cardInfo) continue;

                    // ItemCategory type contains menu items
                    if (cardInfo['@type']?.includes('ItemCategory') || cardInfo.itemCards) {
                        const items = (cardInfo.itemCards || []).map((ic: any) => {
                            const itemInfo = ic.card?.info || {};
                            return {
                                name: itemInfo.name || '',
                                price: (itemInfo.price || itemInfo.defaultPrice || 0) / 100, // Swiggy stores prices in paisa
                                description: itemInfo.description || '',
                                isVeg: itemInfo.itemAttribute?.vegClassifier === 'VEG',
                                imageId: itemInfo.imageId || '',
                                inStock: itemInfo.inStock !== false,
                                variants: (itemInfo.variantsV2?.variantGroups || []).map((vg: any) => ({
                                    groupName: vg.name || '',
                                    options: (vg.variations || []).map((v: any) => ({
                                        name: v.name || '',
                                        price: (v.price || 0) / 100,
                                    })),
                                })),
                            };
                        });

                        if (items.length > 0) {
                            categories.push({
                                name: cardInfo.title || 'Other',
                                itemCount: items.length,
                                items,
                            });
                        }
                    }
                }
            }

            console.log(`Menu fetched for ${restaurantName}: ${offers.length} offers, ${categories.length} categories`);
            return { restaurantName, offers, categories };

        } catch (error: any) {
            console.error(`Failed to fetch menu for restaurant ${restaurantId}:`, error.message);
            return null;
        }
    }

    public lastSummaryDate: string = '';
    public lastMenuFetchDate: string = '';

    private async saveState(): Promise<void> {
        await fs.writeJson(STATE_FILE, {
            lastUpdatedTimes: Object.fromEntries(this.lastUpdatedTimes),
            lastSummaryDate: this.lastSummaryDate,
            lastMenuFetchDate: this.lastMenuFetchDate,
            savedAt: new Date().toISOString(),
        }, { spaces: 2 });
    }
}
