/**
 * Swiggy Order Scraper - Main Entry Point
 *
 * Polls the Swiggy partner API for new orders and sends notifications
 *
 * Usage:
 *   1. First run: pnpm run login (to authenticate)
 *   2. Then: pnpm start (to start polling)
 */

import 'dotenv/config';
import { SwiggyClient } from './swiggy-client.js';
import { NotificationService } from './notifier.js';
import { Deduplicator } from './deduplicator.js';
import { KJApiClient } from './kj-api-client.js';
import { config } from './config.js';
import { createServer } from './server.js';

interface Shift {
    open: number;  // 0-23
    close: number; // 0-23 (if < open, means next day)
}

/**
 * Get current hour in IST
 */
function getISTHour(): number {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(now.getTime() + istOffset);
    return ist.getUTCHours();
}

/**
 * Check if a given hour falls within a shift
 * Handles overnight shifts (e.g., 19-3 means 7PM to 3AM)
 */
function isWithinShift(hour: number, shift: Shift): boolean {
    if (shift.close > shift.open) {
        // Normal shift (e.g., 12-15)
        return hour >= shift.open && hour < shift.close;
    } else {
        // Overnight shift (e.g., 19-3)
        return hour >= shift.open || hour < shift.close;
    }
}

/**
 * Check if we're within any restaurant operating shift
 */
function isRestaurantOpen(): boolean {
    const hour = getISTHour();
    return config.shifts.some(shift => isWithinShift(hour, shift));
}

/**
 * Get the next shift and time until it opens (in ms)
 */
function getNextShiftInfo(): { shift: Shift; minutesUntil: number } {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(now.getTime() + istOffset);
    const currentHour = ist.getUTCHours();
    const currentMinute = ist.getUTCMinutes();

    // Find next opening shift
    let minMinutesUntil = Infinity;
    let nextShift = config.shifts[0];

    for (const shift of config.shifts) {
        let hoursUntil: number;

        if (currentHour < shift.open) {
            // Shift opens later today
            hoursUntil = shift.open - currentHour;
        } else {
            // Shift opens tomorrow
            hoursUntil = (24 - currentHour) + shift.open;
        }

        const minutesUntil = hoursUntil * 60 - currentMinute;
        if (minutesUntil > 0 && minutesUntil < minMinutesUntil) {
            minMinutesUntil = minutesUntil;
            nextShift = shift;
        }
    }

    return { shift: nextShift, minutesUntil: minMinutesUntil };
}


/**
 * Daily order counter — resets at midnight IST
 */
let dailyOrderCount = 0;
let lastCountDate = '';

function getISTDateString(): string {
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    return ist.toISOString().slice(0, 10); // "2026-02-15"
}

function getNextOrderNumber(): number {
    const today = getISTDateString();
    if (today !== lastCountDate) {
        dailyOrderCount = 0;
        lastCountDate = today;
    }
    dailyOrderCount++;
    return dailyOrderCount;
}

async function main(): Promise<void> {
    console.log('Starting Swiggy Order Scraper...\n');

    // Initialize services
    const swiggy = new SwiggyClient();
    const notifier = new NotificationService();
    const deduplicator = new Deduplicator();
    const kjApi = new KJApiClient();

    // Load saved state
    const sessionLoaded = await swiggy.loadSession();
    if (!sessionLoaded) {
        console.error('\nCannot start without a valid session.');
        console.error('   Run: pnpm run login');
        process.exit(1);
    }

    await notifier.initialize();
    await deduplicator.load();

    // Send test notification if enabled
    if (config.testNotificationOnStartup) {
        await notifier.sendTestNotification();
    }

    // Initialize date for daily counter
    lastCountDate = getISTDateString();

    console.log(`\nPolling every ${config.pollInterval / 1000}s\n`);
    console.log('-'.repeat(50));

    // Main polling loop
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let pollInProgress = false;

    // Prep-time overdue tracking
    // Maps orderId -> { dueAt: timestamp, notification: OrderNotification, fired: boolean }
    const prepTimerMap = new Map<string, { dueAt: number; notification: any; fired: boolean }>();

    async function poll(): Promise<void> {
        // Check if restaurant is open
        if (!isRestaurantOpen()) {
            const { shift, minutesUntil } = getNextShiftInfo();
            const hoursUntil = Math.floor(minutesUntil / 60);
            const minsUntil = minutesUntil % 60;
            console.log(`\nOutside operating hours. Next shift: ${shift.open}:00-${shift.close}:00 IST`);
            console.log(`Sleeping... Opens in ${hoursUntil}h ${minsUntil}m`);
            return;
        }

        try {
            const { orders, sessionExpired } = await swiggy.fetchOrders();

            if (sessionExpired) {
                consecutiveErrors++;
                console.error(`\nSession expired (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})`);

                if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                    await notifier.notifySessionExpired();
                    console.error('\nSession expired after 3 attempts. Stopping to avoid spamming server.');
                    console.error('   Run: pnpm run login');
                    if (pollTimer) clearInterval(pollTimer);
                    await deduplicator.save();
                    process.exit(1);
                }
                return;
            }

            // Reset error counter on success
            consecutiveErrors = 0;

            if (orders.length === 0) {
                process.stdout.write('.');
                return;
            }

            console.log(`\nReceived ${orders.length} order(s)`);
            // Process each order
            for (const orderData of orders) {
                const order: any = orderData;
                const orderId = order.orderId || order.order_id || String(order.id);
                const currentStatus = order.status?.order_status || order.orderStatus || 'unknown';

                // Check if status changed
                if (!deduplicator.hasStatusChanged(orderId, currentStatus)) {
                    continue; // Skip if no change
                }

                console.log(`   Processing order: ${orderId} (${currentStatus})`);

                // Mark as seen immediately to prevent re-processing if notifications block
                deduplicator.markSeen(orderId, currentStatus);

                const items = extractItems(order);

                // Financials extraction
                // bill = Order Value (item totals + packing)
                let orderValue = order.bill || 0;
                if (!orderValue && order.bill && typeof order.bill === 'object') {
                    orderValue = order.bill.total || 0;
                }
                // Fallback: sum from items MRP
                if (!orderValue || orderValue === 0) {
                    orderValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                }

                // Subtotal = sum of item MRPs (sub_total before any discount)
                const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

                // Packing charge
                const packingCharge = order.cart?.charges?.packing_charge || 0;

                // Restaurant discount (what you're absorbing)
                const restaurantDiscount = order.total_restaurant_discount || order.restaurant_trade_discount || 0;

                // Net earnings = Order Value - Restaurant Discount
                const netEarnings = orderValue - restaurantDiscount;

                // Offer/Discount description (e.g., "60% off + 50% off")
                const offerDescription = order.offer_description ||
                    (order.discount_descriptions?.length ? order.discount_descriptions.join(' + ') : undefined);

                // Customer & Delivery
                const customerName = order.customer?.customer_name || order.customerName || 'Unknown';
                const customerArea = order.customer_area || order.customer?.area || '';
                const specialInstructions = order.customer?.special_instructions?.si_cx_instruction?.trim() || undefined;

                // Use placed_time for when order was actually placed
                const orderDate = order.status?.placed_time || order.status?.ordered_time || order.ordered_time || order.orderDate || new Date().toISOString();
                const prepTime = order.prep_time_details?.predicted_prep_time || order.prep_time_predicted || 0;

                // Restaurant Mapping — from env config, fallback to hardcoded
                const RESTAURANT_MAP = config.restaurantMap;
                const restaurantNameFromMap = RESTAURANT_MAP[String(order.restaurantId)] || RESTAURANT_MAP[String(order.restaurant_id)];

                // Extract order details
                const orderNotification = {
                    orderId,
                    restaurantId: order.restaurantId || order.restaurant_id || 0,
                    restaurantName: restaurantNameFromMap || order.restaurantName || order.restaurant_name,
                    items,
                    orderValue,
                    subtotal,
                    packingCharge,
                    restaurantDiscount,
                    netEarnings,
                    offerDescription,
                    customerName,
                    customerArea,
                    specialInstructions,
                    platform: 'swiggy' as const,
                    status: currentStatus,
                    orderDate,
                    prepTime
                };

                // Notify for new orders and cancellations
                const notifyStatuses = ['ordered', 'placed'];
                const cancelStatuses = ['cancelled', 'canceled'];

                if (notifyStatuses.includes(currentStatus.toLowerCase())) {
                    const orderNumber = getNextOrderNumber();
                    await notifier.notifyNewOrder(orderNotification, orderNumber);

                    // Register prep-time overdue tracker if prepTime is set
                    if (orderNotification.prepTime && orderNotification.prepTime > 0) {
                        prepTimerMap.set(orderId, {
                            dueAt: Date.now() + orderNotification.prepTime * 60 * 1000,
                            notification: orderNotification,
                            fired: false,
                        });
                    }
                } else if (cancelStatuses.includes(currentStatus.toLowerCase())) {
                    await notifier.notifyCancelledOrder(orderNotification);
                    prepTimerMap.delete(orderId); // No longer relevant
                } else {
                    // Clear prep timer if order reached a terminal/ready state
                    const terminalStatuses = ['delivered', 'ready', 'picked_up', 'pickedup', 'dispatched'];
                    if (terminalStatuses.includes(currentStatus.toLowerCase())) {
                        prepTimerMap.delete(orderId);
                    }
                    console.log(`   Skipping notification for status: ${currentStatus}`);
                }

                // Send to KJ Inventory (Ingest ALL statuses)
                await kjApi.ingestOrder({
                    platform: 'swiggy',
                    externalOrderId: orderId,
                    orderDate,
                    customerName,
                    totalAmount: orderValue,
                    status: currentStatus,
                    itemsJson: JSON.stringify(orderNotification.items),
                    rawData: JSON.stringify(order),
                });
            }

            await deduplicator.save();

        } catch (error: any) {
            consecutiveErrors++;
            console.error(`\nPoll error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error.message);

            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                console.error('\n3 consecutive errors. Sending notification and stopping.');
                await notifier.notifyError(error.message);
                if (pollTimer) clearInterval(pollTimer);
                await deduplicator.save();
                process.exit(1);
            }
        }
    }

    async function checkDailySummary(): Promise<void> {
        const istOffset = 5.5 * 60 * 60 * 1000;
        const now = new Date(new Date().getTime() + istOffset);
        const currentHour = now.getUTCHours();
        const todayStr = now.toISOString().split('T')[0];

        // Trigger at 7 AM IST
        if (currentHour !== 7) return;
        if (swiggy.lastSummaryDate === todayStr) return; // Already sent today

        console.log('\nGenerating Daily Summary...');

        const msPerDay = 24 * 60 * 60 * 1000;

        // Get IST midnight as UTC timestamp
        const getISTMidnight = (dateObj: Date) => {
            const utcNow = dateObj.getTime();
            const istNow = utcNow + istOffset;
            const istMidnight = Math.floor(istNow / msPerDay) * msPerDay;
            return istMidnight - istOffset;
        };

        const todayMidnightUTC = getISTMidnight(new Date());
        const yesterdayMidnightUTC = todayMidnightUTC - msPerDay;
        const yesterdayEndUTC = yesterdayMidnightUTC + msPerDay - 1000;

        const metrics = await swiggy.getBusinessMetrics(yesterdayMidnightUTC, yesterdayEndUTC);

        if (metrics) {
            await notifier.sendDailySummary(metrics);
            swiggy.lastSummaryDate = todayStr;
        }
    }

    async function fetchMenus(): Promise<void> {
        console.log('\nFetching restaurant menu data...');

        const restaurantIds = Object.keys(config.restaurantMap);
        if (restaurantIds.length === 0) {
            console.log('No restaurant IDs configured for menu fetch.');
            return;
        }

        for (const ridStr of restaurantIds) {
            const rid = parseInt(ridStr, 10);
            if (isNaN(rid)) continue;

            const menuData = await swiggy.fetchMenu(rid, config.menuRestaurantLat, config.menuRestaurantLng);
            if (menuData) {
                await kjApi.upsertMenu({
                    restaurantId: ridStr,
                    restaurantName: menuData.restaurantName,
                    offersJson: JSON.stringify(menuData.offers),
                    categoriesJson: JSON.stringify(menuData.categories),
                    fetchedAt: new Date().toISOString(),
                });
            }
        }

        console.log('Menu fetch completed.');
    }

    async function checkMenuFetch(): Promise<void> {
        // Skip if lat/lng not configured
        if (config.menuRestaurantLat === 0 && config.menuRestaurantLng === 0) {
            return;
        }

        const istOffset = 5.5 * 60 * 60 * 1000;
        const now = new Date(new Date().getTime() + istOffset);
        const currentHour = now.getUTCHours();
        const todayStr = now.toISOString().split('T')[0];

        if (currentHour < config.menuFetchHour) return;
        if (swiggy.lastMenuFetchDate === todayStr) return; // Already fetched today

        await fetchMenus();
        swiggy.lastMenuFetchDate = todayStr;
    }

    async function checkPrepTimeOverdue(): Promise<void> {
        const now = Date.now();
        for (const [orderId, entry] of prepTimerMap) {
            if (!entry.fired && now >= entry.dueAt) {
                entry.fired = true;
                console.log(`\n   Prep time overdue for order ${orderId}`);
                await notifier.notifyPrepTimeOverdue(entry.notification);
            }
        }
        // Prune fired entries older than 30 minutes to avoid unbounded growth
        for (const [orderId, entry] of prepTimerMap) {
            if (entry.fired && now - entry.dueAt > 30 * 60 * 1000) {
                prepTimerMap.delete(orderId);
            }
        }
    }

    async function runPollCycle(): Promise<void> {
        if (pollInProgress) {
            return; // Skip if previous cycle is still running
        }
        pollInProgress = true;
        try {
            await poll();
        } catch (error) {
            console.error('Unexpected error in poll():', error);
        }
        try {
            await checkPrepTimeOverdue();
        } catch (error) {
            console.error('Error in checkPrepTimeOverdue():', error);
        }
        try {
            await checkDailySummary();
        } catch (error) {
            console.error('Error in checkDailySummary():', error);
        }
        try {
            await checkMenuFetch();
        } catch (error) {
            console.error('Error in checkMenuFetch():', error);
        } finally {
            pollInProgress = false;
        }
    }

    function restartPolling() {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(runPollCycle, config.pollInterval);
        console.log(`Polling restarted with interval ${config.pollInterval}ms`);
    }

    // Start API server
    createServer({
        notifier,
        swiggy,
        kjApi,
        runPollCycle,
        forceMenuFetch: fetchMenus,
        getPollingState: () => ({ running: pollTimer !== null, consecutiveErrors }),
        restartPolling,
    });

    // Run first poll immediately
    await runPollCycle();

    // Start polling loop
    pollTimer = setInterval(runPollCycle, config.pollInterval);

    // Handle graceful shutdown
    async function shutdown(): Promise<void> {
        console.log('\n\nShutting down...');
        if (pollTimer) clearInterval(pollTimer);
        await deduplicator.save();
        await notifier.shutdown();
        process.exit(0);
    }

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

/**
 * Extract items from order (handle various Swiggy response formats)
 */
function extractItems(order: any): { name: string; quantity: number; price: number; finalPrice: number; variant?: string; addons?: string[] }[] {
    // Try common field names
    const items = order.items || order.order_items || order.cart?.items || [];

    return items.map((item: any) => {
        const name = item.name || item.item_name || item.dish_name || 'Unknown';
        const quantity = item.quantity || item.qty || 1;

        // MRP unit price (sub_total is line MRP)
        let price = item.price || 0;
        if (!price && item.sub_total) {
            price = item.sub_total / quantity;
        } else if (!price && item.total) {
            price = item.total / quantity;
        } else if (!price && item.item_total) {
            price = item.item_total / quantity;
        }

        // Final unit price after per-item discount
        let finalPrice = 0;
        if (item.final_sub_total) {
            finalPrice = item.final_sub_total / quantity;
        } else {
            finalPrice = price;
        }

        // Variant: prefer newVariants, fall back to addons, then variants string
        let variant: string | undefined;
        if (item.newVariants && item.newVariants.length > 0) {
            variant = item.newVariants.map((v: any) => v.name).filter(Boolean).join(', ') || undefined;
        } else if (typeof item.variants === 'string' && item.variants.trim()) {
            variant = item.variants.trim();
        }

        // Addons (named add-ons, price > 0 or explicitly listed)
        const addons: string[] = [];
        if (item.newAddons && item.newAddons.length > 0) {
            for (const a of item.newAddons) {
                if (a.name) addons.push(a.name);
            }
        } else if (item.addons && item.addons.length > 0) {
            for (const a of item.addons) {
                // Only include addons that are not already captured as variant
                if (a.name && a.name !== variant) addons.push(a.name);
            }
        }

        return {
            name,
            quantity,
            price: Number(price.toFixed(2)),
            finalPrice: Number(finalPrice.toFixed(2)),
            variant,
            addons: addons.length > 0 ? addons : undefined,
        };
    });
}

// Start the application
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
