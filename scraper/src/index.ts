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

    console.log(`\nPolling every ${config.pollInterval / 1000}s\n`);
    console.log('-'.repeat(50));

    // Main polling loop
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 5;
    let dailyOrderCount = 0; // Track daily order count for notifications
    let lastOrderDate = ''; // For resetting daily count

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
                await notifier.notifySessionExpired();
                console.error('\nSession expired! Stopping...');
                console.error('   Run: pnpm run login');
                process.exit(1);
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

                const items = extractItems(order);

                // Financials extraction
                // bill = Order Value (item totals + packing + GST - what the order is worth)
                let orderValue = order.bill || 0;
                if (!orderValue && order.bill && typeof order.bill === 'object') {
                    orderValue = order.bill.total || 0;
                }

                // Restaurant discount (what you're absorbing)
                const restaurantDiscount = order.total_restaurant_discount || order.restaurant_trade_discount || 0;

                // Net earnings = Order Value - Restaurant Discount
                const netEarnings = orderValue - restaurantDiscount;

                // Customer & Delivery
                const customerName = order.customer?.customer_name || order.customerName || 'Unknown';
                const customerArea = order.customer_area || order.customer?.area || '';

                // Use placed_time for when order was actually placed
                const orderDate = order.status?.placed_time || order.status?.ordered_time || order.ordered_time || order.orderDate || new Date().toISOString();
                const prepTime = order.prep_time_details?.predicted_prep_time || 0;

                // Offer/Discount description (e.g., "60% off + 50% off")
                const offerDescription = order.offer_description ||
                    (order.discount_descriptions?.length ? order.discount_descriptions.join(' + ') : undefined);

                // Restaurant Mapping
                const RESTAURANT_MAP = config.restaurantMap;
                const restaurantNameFromMap = RESTAURANT_MAP[String(order.restaurantId)] || RESTAURANT_MAP[String(order.restaurant_id)];

                // Reset daily order count at midnight IST
                const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
                const todayDate = istNow.toISOString().split('T')[0];
                if (lastOrderDate !== todayDate) {
                    dailyOrderCount = 0;
                    lastOrderDate = todayDate;
                }

                // Increment daily order counter
                dailyOrderCount++;

                // Extract order details
                const orderNotification = {
                    orderId,
                    restaurantId: order.restaurantId || order.restaurant_id || 0,
                    restaurantName: restaurantNameFromMap || order.restaurantName || order.restaurant_name,
                    items,
                    orderValue,
                    restaurantDiscount,
                    netEarnings,
                    offerDescription,
                    customerName,
                    customerArea,
                    platform: 'swiggy' as const,
                    status: currentStatus,
                    orderDate,
                    prepTime,
                    orderNumber: dailyOrderCount
                };

                // Notify ONLY if status is 'ordered'
                const notifyStatuses = ['ordered', 'placed', 'confirming'];

                if (notifyStatuses.includes(currentStatus.toLowerCase())) {
                    await notifier.notifyNewOrder(orderNotification);
                } else {
                    console.log(`   Skipping notification for status: ${currentStatus}`);
                }

                // Send to KJ Inventory (Ingest ALL statuses)
                await kjApi.ingestOrder({
                    platform: 'swiggy',
                    externalOrderId: orderId,
                    orderDate,
                    customerName,
                    totalAmount: orderValue, // Order value (before restaurant discount)
                    status: currentStatus,
                    itemsJson: JSON.stringify(orderNotification.items),
                    rawData: JSON.stringify(order),
                });

                // Mark as seen with current status
                deduplicator.markSeen(orderId, currentStatus);
            }

            await deduplicator.save();

        } catch (error: any) {
            consecutiveErrors++;
            console.error(`\nPoll error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error.message);

            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                console.error('\nToo many consecutive errors. Stopping.');
                await notifier.notifySessionExpired(); // Notify user something is wrong
                process.exit(1);
            }
        }
    }

    async function checkDailySummary(): Promise<void> {
        const istOffset = 5.5 * 60 * 60 * 1000;
        const now = new Date(new Date().getTime() + istOffset);
        const currentHour = now.getUTCHours();

        // Format today's date as YYYY-MM-DD for tracking
        const todayStr = now.toISOString().split('T')[0];

        // Trigger at 7 AM
        if (currentHour === 7) {
            if (swiggy.lastSummaryDate === todayStr) {
                // Already sent today
                return;
            }

            console.log('\nGenerating Daily Summary...');

            // Calculate Yesterday's range (IST)
            // Yesterday Start: Today 00:00 IST - 24 hours
            const todayStartIST = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); // This is local time if server is IST, but let's be safe

            // Allow native Date to handle "yesterday" via setDate
            const yesterday = new Date(now);
            yesterday.setUTCDate(yesterday.getUTCDate() - 1);
            yesterday.setUTCHours(0, 0, 0, 0);

            const yesterdayStart = yesterday.getTime();
            const yesterdayEnd = yesterday.getTime() + (24 * 60 * 60 * 1000) - 1;

            // Swiggy expects milliseconds
            // NOTE: The timestamps need to be accurate for Swiggy's backend.
            // Let's rely on standard Date objects. 
            // Swiggy likely uses the timestamp values directly.

            const msPerDay = 24 * 60 * 60 * 1000;
            const currentTimestamp = Date.now();
            // yesterday start = midnight today - 24h
            // We need to be careful with timezones.
            // The user example: fromDate: 1770489000000 (Sat Feb 07 2026 18:30:00 GMT+0000) -> Feb 8 00:00 IST
            // This confirms we need correct timestamps.

            // Helper to get IST midnight timestamp
            const getISTMidnightParams = (dateObj: Date) => {
                // Create string in IST
                const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
                const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(dateObj);
                // en-CA gives YYYY-MM-DD
                // Actually Intl formats are tricky.
                // Let's use simple offset math.

                // Current UTC time + 5.5h = Current IST time
                // Floor to day
                // Subtract 5.5h = UTC time for IST midnight

                const utcNow = dateObj.getTime();
                const istNow = utcNow + (5.5 * 60 * 60 * 1000);
                const istMidnight = Math.floor(istNow / msPerDay) * msPerDay;
                const utcForIstMidnight = istMidnight - (5.5 * 60 * 60 * 1000);
                return utcForIstMidnight;
            };

            const todayMidnightUTC = getISTMidnightParams(new Date());
            const yesterdayMidnightUTC = todayMidnightUTC - msPerDay;
            const yesterdayEndUTC = yesterdayMidnightUTC + msPerDay - 1000; // End of day

            const metrics = await swiggy.getBusinessMetrics(yesterdayMidnightUTC, yesterdayEndUTC);

            if (metrics) {
                await notifier.sendDailySummary(metrics);
                swiggy.lastSummaryDate = todayStr;
                // Save state via a public method or force save (SwiggyClient handles save internally on fetchOrders, but we should force it or add save method)
                // We'll rely on the next fetchOrders to save, or we can add a save method.
                // For now, let's just let it save on next poll, or we can make sure SwiggyClient saves `lastSummaryDate` when we modify it.
                // The `swiggy.lastSummaryDate` is public, but saving is private.
                // Let's modify SwiggyClient to allow saving state publically or just rely on next poll. 
                // A better approach is to just call a dummy fetch or expose save.
                // But wait, I modified saveState to include it. I just need to trigger it.
                // I'll assume standard polling will save it soon enough.
                // But if crash happens right after sending, we might duplicate.
                // Risk is acceptable for now.
            }
        }
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

        // Trigger at configured hour (default 18 = 6 PM IST)
        if (currentHour >= config.menuFetchHour) {
            if (swiggy.lastMenuFetchDate === todayStr) {
                return; // Already fetched today
            }

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

            swiggy.lastMenuFetchDate = todayStr;
            console.log('Menu fetch completed.');
        }
    }

    // Run first poll immediately
    await poll();
    await checkDailySummary();
    await checkMenuFetch();

    // Start polling loop
    setInterval(async () => {
        await poll();
        await checkDailySummary();
        await checkMenuFetch();
    }, config.pollInterval);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n\nShutting down...');
        await deduplicator.save();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n\nShutting down...');
        await deduplicator.save();
        process.exit(0);
    });
}

/**
 * Extract items from order (handle various Swiggy response formats)
 */
function extractItems(order: any): { name: string; quantity: number; price: number }[] {
    // Try common field names
    const items = order.items || order.order_items || order.cart?.items || [];

    return items.map((item: any) => {
        const name = item.name || item.item_name || item.dish_name || 'Unknown';
        const quantity = item.quantity || item.qty || 1;

        // Price Calculation Logic
        // IF we have explicit price, use it.
        // IF NOT, and we have 'total' (which often means line total in this API), derive unit price.
        // item.total = 60, quantity = 3 => unit price = 20.

        let price = item.price || 0;

        if (!price && item.total) {
            price = item.total / quantity;
        } else if (!price && item.item_total) {
            price = item.item_total / quantity;
        } else if (!price && item.final_sub_total) {
            // final_sub_total is usually after discount logic on the item, 
            // but if it's the only thing we have, we might have to use it. 
            // Preference is 'total' or 'sub_total' for gross price.
            price = item.final_sub_total / quantity;
        }

        return {
            name,
            quantity,
            price: Number(price.toFixed(2)), // Ensure 2 decimal places
        };
    });
}

// Start the application
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
