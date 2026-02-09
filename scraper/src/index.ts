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

    console.log(`\nPolling every ${config.pollInterval / 1000}s\n`);
    console.log('-'.repeat(50));

    // Main polling loop
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 5;

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
                // bill = Net Amount (what customer pays)
                let netAmount = order.bill || 0;
                if (!netAmount && order.bill && typeof order.bill === 'object') {
                    netAmount = order.bill.total || 0;
                }

                const discount = order.discount || order.total_restaurant_discount || 0;

                // Calculate subtotal from items
                // Note: extractItems now ensures 'price' is the UNIT price
                let subTotal = order.totalAmount || order.total_amount || 0;
                if (!subTotal || subTotal === 0) {
                    subTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                }

                // Fallback for netAmount if still 0
                if (!netAmount && subTotal > 0) {
                    netAmount = subTotal - discount;
                }

                // Customer & Time
                const customerName = order.customer?.customer_name || order.customerName || 'Unknown';
                // JSON shows ordered_time is nested in status object
                const orderDate = order.status?.ordered_time || order.ordered_time || order.orderDate || new Date().toISOString();
                const prepTime = order.prep_time_details?.predicted_prep_time || 0;

                // Static Restaurant Mapping (User requested to map IDs manually)
                const RESTAURANT_MAP: Record<string, string> = {
                    '1011965': 'Kovilozhiku (Swiggy)', // Example, user to fill
                    '1018118': 'Kovilozhiku (Swiggy)',
                    // Add more mappings here
                };

                const restaurantNameFromMap = RESTAURANT_MAP[String(order.restaurantId)] || RESTAURANT_MAP[String(order.restaurant_id)];

                // Extract order details
                const orderNotification = {
                    orderId,
                    restaurantId: order.restaurantId || order.restaurant_id || 0,
                    restaurantName: restaurantNameFromMap || order.restaurantName || order.restaurant_name,
                    items,
                    totalAmount: subTotal,
                    discount,
                    netAmount,
                    customerName,
                    platform: 'swiggy' as const,
                    status: currentStatus,
                    orderDate,
                    prepTime
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
                    totalAmount: netAmount, // Record net amount as the primary transaction value? Or subtotal? Using net for now.
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

    // Run first poll immediately
    await poll();

    // Start polling loop
    setInterval(poll, config.pollInterval);

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
