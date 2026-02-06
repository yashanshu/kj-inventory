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

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '30000', 10);

/**
 * Restaurant operating shifts in IST (24-hour format)
 * Format: Array of {open: hour, close: hour}
 * Handles overnight shifts (e.g., 19-3 means 7PM to 3AM next day)
 * 
 * Example: [{"open":12,"close":15},{"open":19,"close":3}]
 *          = 12PM-3PM and 7PM-3AM
 */
const DEFAULT_SHIFTS = [
    { open: 12, close: 15 },  // Afternoon: 12 PM - 3 PM
    { open: 19, close: 3 },   // Evening: 7 PM - 3 AM (next day)
];

interface Shift {
    open: number;  // 0-23
    close: number; // 0-23 (if < open, means next day)
}

function parseShifts(): Shift[] {
    const shiftsEnv = process.env.RESTAURANT_SHIFTS;
    if (shiftsEnv) {
        try {
            return JSON.parse(shiftsEnv);
        } catch (e) {
            console.error('Invalid RESTAURANT_SHIFTS format, using defaults');
        }
    }
    return DEFAULT_SHIFTS;
}

const SHIFTS = parseShifts();

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
    return SHIFTS.some(shift => isWithinShift(hour, shift));
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
    let nextShift = SHIFTS[0];

    for (const shift of SHIFTS) {
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

    console.log(`\nPolling every ${POLL_INTERVAL / 1000}s\n`);
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
            for (const order of orders) {
                const orderId = order.orderId || order.order_id || String(order.id);

                if (!deduplicator.isNew(orderId)) {
                    console.log(`   Skip ${orderId} (already seen)`);
                    continue;
                }

                console.log(`   New order: ${orderId}`);

                // Extract order details (structure may vary, handle gracefully)
                const orderNotification = {
                    orderId,
                    restaurantId: order.restaurantId || order.restaurant_id || 0,
                    restaurantName: order.restaurantName || order.restaurant_name,
                    items: extractItems(order),
                    totalAmount: order.totalAmount || order.total_amount || order.bill?.total || 0,
                    customerName: order.customerName || order.customer?.name,
                    platform: 'swiggy' as const,
                };

                // Send notifications
                await notifier.notifyNewOrder(orderNotification);

                // Send to KJ Inventory
                await kjApi.ingestOrder({
                    platform: 'swiggy',
                    externalOrderId: orderId,
                    orderDate: order.createdAt || order.created_at || new Date().toISOString(),
                    customerName: orderNotification.customerName,
                    totalAmount: orderNotification.totalAmount,
                    status: order.status || 'new',
                    itemsJson: JSON.stringify(orderNotification.items),
                    rawData: JSON.stringify(order),
                });

                // Mark as seen
                deduplicator.markSeen(orderId);
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
    setInterval(poll, POLL_INTERVAL);

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

    return items.map((item: any) => ({
        name: item.name || item.item_name || item.dish_name || 'Unknown',
        quantity: item.quantity || item.qty || 1,
        price: item.price || item.total || item.item_total || 0,
    }));
}

// Start the application
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
