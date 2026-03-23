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

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

interface Shift {
    open: number;  // 0-23
    close: number; // 0-23 (if < open, means next day)
}

/**
 * Get current hour in IST
 */
function getISTHour(): number {
    const now = new Date();
    const ist = new Date(now.getTime() + IST_OFFSET_MS);
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
    const ist = new Date(now.getTime() + IST_OFFSET_MS);
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
    const ist = new Date(now.getTime() + IST_OFFSET_MS);
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
    const MAX_CONSECUTIVE_ERRORS = config.maxConsecutiveErrors;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let pollInProgress = false;

    // Fibonacci escalation offsets in minutes after prep deadline: 0, 3, 5, 8, 13, 21, 34...
    function fibSequence(count: number): number[] {
        const seq = [0, 3];
        while (seq.length < count) {
            seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
        }
        return seq.slice(0, count);
    }
    const FIB_OFFSETS = fibSequence(10); // [0, 3, 5, 8, 13, 21, 34, 55, 89, 144]

    interface PrepEntry {
        dueAt: number;          // Unix ms when prep time expires
        notification: any;
        orderNumber: number;
        nextAlertIndex: number; // index into FIB_OFFSETS
        alertsFired: number;
        wasOverdue: boolean;    // has at least one alert fired
        currentStatus: string;  // latest known order status; updated every poll cycle
        foodPreparedTime?: string; // set when restaurant marks food ready (vendorData.foodPreparedTime)
        readyNotificationSent: boolean; // guards against double-firing notifyOrderReady
    }

    // Maps orderId -> prep tracking entry
    const prepTimerMap = new Map<string, PrepEntry>();

    // Tracks which restaurants are currently stressed (to detect transitions)
    const stressedRestaurants = new Set<number>();

    // Daily overdue log for 7am report — resets at midnight IST
    interface OverdueLogEntry {
        orderId: string;
        last4: string;
        platform: string;
        itemSummary: string;
        resolvedOverrunMinutes: number | null; // set when order marked ready
    }
    let overdueLog: OverdueLogEntry[] = [];
    let overdueLogDate = getISTDateString();

    // Daily MFR (prep accuracy) counters — resets at midnight IST
    let mfrLog = { hits: 0, misses: 0 };
    let mfrLogDate = getISTDateString();

    // Daily promo efficiency stats — resets at midnight IST
    interface PromoStat {
        orders: number;
        totalBill: number;   // sum of orderValue
        totalNet: number;    // sum of netEarnings
        itemBurn: number;    // sum of restaurant_discount_hit per item (% offers only)
        // Per-order snapshots of what was accumulated, keyed by orderId.
        // Used by cancellation reversal to undo exactly what was added.
        contributions: Map<string, { bill: number; net: number; burn: number }>;
    }
    let promoStats = new Map<string, PromoStat>();
    let promoStatsDate = getISTDateString();

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
            const { orders, sessionExpired, stressedRestaurantIds } = await swiggy.fetchOrders();

            // Detect new stress onsets (false→true transitions only)
            const currentlyStressedSet = new Set(stressedRestaurantIds);
            for (const rid of stressedRestaurantIds) {
                if (!stressedRestaurants.has(rid)) {
                    stressedRestaurants.add(rid);
                    const restaurantName = config.restaurantMap[String(rid)] || `Restaurant ${rid}`;
                    console.log(`\n   Kitchen stress detected for ${restaurantName} (${rid})`);
                    await notifier.notifyKitchenStress(restaurantName);
                }
            }
            // Clear stress for restaurants no longer flagged (O(1) lookup via Set)
            for (const rid of stressedRestaurants) {
                if (!currentlyStressedSet.has(rid)) {
                    stressedRestaurants.delete(rid);
                }
            }

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

            // Refresh foodPreparedTime on every poll for all tracked orders,
            // regardless of whether order_status changed. The restaurant marks food
            // ready by setting vendorData.foodPreparedTime — this doesn't change order_status.
            for (const orderData of orders) {
                const order: any = orderData;
                const orderId = order.orderId || order.order_id || String(order.id);
                const prepEntry = prepTimerMap.get(orderId);
                if (prepEntry && order.vendorData?.foodPreparedTime && !prepEntry.foodPreparedTime) {
                    prepEntry.foodPreparedTime = order.vendorData.foodPreparedTime;
                    console.log(`   Food marked ready for order ${orderId} at ${prepEntry.foodPreparedTime}`);
                }
            }

            // Constants hoisted out of the per-order loop
            const RESTAURANT_MAP = config.restaurantMap;
            const notifyStatuses = new Set(['ordered', 'placed']);
            const cancelStatuses = new Set(['cancelled', 'canceled']);

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

                // Keep PrepEntry status in sync so checkPrepTimeOverdue can self-suppress
                const prepEntry = prepTimerMap.get(orderId);
                if (prepEntry) prepEntry.currentStatus = currentStatus.toLowerCase();

                const items = extractItems(order);

                // Financials extraction
                // Subtotal = sum of item MRPs (sub_total before any discount)
                const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

                // bill = Order Value (item totals + packing); falls back to subtotal when absent
                let orderValue: number;
                if (typeof order.bill === 'number' && order.bill > 0) {
                    orderValue = order.bill;
                } else if (order.bill && typeof order.bill === 'object') {
                    orderValue = order.bill.total || subtotal;
                } else {
                    orderValue = subtotal;
                }

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
                const customerDistance: number = parseFloat(order.customer_distance) || 0;

                // Item complexity: total addon + variant count across all items
                const rawItems = order.items || order.order_items || order.cart?.items || [];
                const itemComplexity: number = rawItems.reduce((sum: number, item: any) => {
                    const addons = item.newAddons?.length || item.addons?.length || 0;
                    const variants = item.newVariants?.length || 0;
                    return sum + addons + variants;
                }, 0);

                // Use placed_time for when order was actually placed
                const orderDate = order.status?.placed_time || order.status?.ordered_time || order.ordered_time || order.orderDate || new Date().toISOString();
                const prepTime = order.prep_time_details?.predicted_prep_time || order.prep_time_predicted || 0;

                // Restaurant Mapping — from env config, fallback to hardcoded
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
                    prepTime,
                    customerDistance,
                    itemComplexity
                };

                // Item-level discount burn (only non-zero for % offers)
                const itemBurnTotal: number = rawItems
                    .reduce((s: number, item: any) => s + (parseFloat(item.restaurant_discount_hit) || 0), 0);

                if (notifyStatuses.has(currentStatus.toLowerCase())) {
                    const orderNumber = getNextOrderNumber();
                    await notifier.notifyNewOrder(orderNotification, orderNumber);

                    // Accumulate promo efficiency stats
                    if (orderNotification.offerDescription) {
                        const today = getISTDateString();
                        if (today !== promoStatsDate) { promoStats = new Map(); promoStatsDate = today; }
                        const key = orderNotification.offerDescription;
                        const existing = promoStats.get(key) ?? { orders: 0, totalBill: 0, totalNet: 0, itemBurn: 0, contributions: new Map() };
                        const contrib = { bill: orderNotification.orderValue, net: orderNotification.netEarnings, burn: itemBurnTotal };
                        existing.contributions.set(orderId, contrib);
                        promoStats.set(key, {
                            orders: existing.orders + 1,
                            totalBill: existing.totalBill + contrib.bill,
                            totalNet: existing.totalNet + contrib.net,
                            itemBurn: existing.itemBurn + contrib.burn,
                            contributions: existing.contributions,
                        });
                    }

                    // Register prep-time overdue tracker if prepTime is set
                    if (orderNotification.prepTime && orderNotification.prepTime > 0) {
                        prepTimerMap.set(orderId, {
                            dueAt: Date.now() + orderNotification.prepTime * 60 * 1000,
                            notification: orderNotification,
                            orderNumber,
                            nextAlertIndex: 0,
                            alertsFired: 0,
                            wasOverdue: false,
                            currentStatus: currentStatus.toLowerCase(),
                            readyNotificationSent: false,
                        });
                    }
                } else if (cancelStatuses.has(currentStatus.toLowerCase())) {
                    await notifier.notifyCancelledOrder(orderNotification);
                    prepTimerMap.delete(orderId); // No longer relevant

                    // Reverse promo stat if this order was previously counted.
                    // Skip if promoStats rolled over at midnight (order was from a prior day).
                    if (orderNotification.offerDescription && getISTDateString() === promoStatsDate) {
                        const key = orderNotification.offerDescription;
                        const existing = promoStats.get(key);
                        const contrib = existing?.contributions.get(orderId);
                        if (existing && contrib) {
                            existing.contributions.delete(orderId);
                            const updated = {
                                orders: existing.orders - 1,
                                totalBill: existing.totalBill - contrib.bill,
                                totalNet: existing.totalNet - contrib.net,
                                itemBurn: existing.itemBurn - contrib.burn,
                                contributions: existing.contributions,
                            };
                            if (updated.orders <= 0) {
                                promoStats.delete(key);
                            } else {
                                promoStats.set(key, updated);
                            }
                        }
                    }
                } else {
                    // Clear prep timer if order reached a terminal/ready state.
                    // notifyOrderReady is only sent via checkPrepTimeOverdue when foodPreparedTime
                    // is set — that is the authoritative "kitchen done" signal. Here we just prune.
                    if (TERMINAL_STATUSES.has(currentStatus.toLowerCase())) {
                        prepTimerMap.delete(orderId);

                        // MFR accuracy tracking (only meaningful on delivered)
                        if (currentStatus.toLowerCase() === 'delivered') {
                            const today = getISTDateString();
                            if (today !== mfrLogDate) { mfrLog = { hits: 0, misses: 0 }; mfrLogDate = today; }

                            if (order.isMFRAccurate === true) {
                                mfrLog.hits++;
                            } else if (order.isMFRAccurate === false) {
                                mfrLog.misses++;
                            }

                            // Handover delay — DE waited at door
                            if (order.status?.hand_over_delayed === true) {
                                const arrivedMs = order.status.arrived_time
                                    ? new Date(order.status.arrived_time + '+05:30').getTime()
                                    : null;
                                const pickedupMs = order.status.pickedup_time
                                    ? new Date(order.status.pickedup_time + '+05:30').getTime()
                                    : null;
                                const deWaitMin = arrivedMs && pickedupMs
                                    ? Math.round((pickedupMs - arrivedMs) / 60000)
                                    : 0;
                                await notifier.notifyHandoverDelay(orderNotification, deWaitMin);
                            }
                        }
                    }

                    // Complaint outlier check (any status where flag is set)
                    if (order.outlier_meta?.has_complaint_outliers === true) {
                        await notifier.notifyComplaintOutlier(orderNotification);
                    }

                    console.log(`   Skipping notification for status: ${currentStatus}`);
                }

                // Send to KJ Inventory (Ingest ALL statuses)
                await kjApi.ingestOrder({
                    platform: 'swiggy',
                    restaurantId: String(orderNotification.restaurantId || ''),
                    restaurantName: orderNotification.restaurantName,
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
            const errMsg = error?.message || String(error);
            const httpInfo = error?.response ? `| HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}` : '';
            const causeInfo = error?.errors?.length ? `| causes: ${error.errors.map((e: any) => e?.message || String(e)).join('; ')}` : '';
            console.error(`\nPoll error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}): ${errMsg} ${httpInfo}${causeInfo}`);

            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                console.error('\n3 consecutive errors. Sending notification and stopping.');
                try {
                    await notifier.notifyError(errMsg + causeInfo);
                } catch (notifyErr: any) {
                    console.error('Failed to send error notification:', notifyErr?.message || String(notifyErr));
                }
                if (pollTimer) clearInterval(pollTimer);
                await deduplicator.save();
                process.exit(1);
            }
        }
    }

    async function checkDailySummary(): Promise<void> {
        const now = new Date(new Date().getTime() + IST_OFFSET_MS);
        const currentHour = now.getUTCHours();
        const todayStr = getISTDateString();

        // Trigger at 7 AM IST
        if (currentHour !== 7) return;
        if (swiggy.lastSummaryDate === todayStr) return; // Already sent today

        console.log('\nGenerating Daily Summary...');

        const msPerDay = 24 * 60 * 60 * 1000;

        // Get IST midnight as UTC timestamp
        const getISTMidnight = (dateObj: Date) => {
            const utcNow = dateObj.getTime();
            const istNow = utcNow + IST_OFFSET_MS;
            const istMidnight = Math.floor(istNow / msPerDay) * msPerDay;
            return istMidnight - IST_OFFSET_MS;
        };

        const todayMidnightUTC = getISTMidnight(new Date());
        const yesterdayMidnightUTC = todayMidnightUTC - msPerDay;
        const yesterdayEndUTC = yesterdayMidnightUTC + msPerDay - 1000;

        const metrics = await swiggy.getBusinessMetrics(yesterdayMidnightUTC, yesterdayEndUTC);

        if (metrics) {
            await notifier.sendDailySummary(metrics, overdueLog, mfrLog, promoStats as Map<string, { orders: number; totalBill: number; totalNet: number; itemBurn: number }>);
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
                    platform: 'swiggy',
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

        const now = new Date(new Date().getTime() + IST_OFFSET_MS);
        const currentHour = now.getUTCHours();
        const todayStr = getISTDateString();

        if (currentHour < config.menuFetchHour) return;
        if (swiggy.lastMenuFetchDate === todayStr) return; // Already fetched today

        await fetchMenus();
        swiggy.lastMenuFetchDate = todayStr;
    }

    // Statuses that mean the order is done/ready — no more overdue alerts should fire.
    // Kept here (not inside checkPrepTimeOverdue) so the terminal-delete path in poll() can
    // reference the same set if needed in future.
    const TERMINAL_STATUSES = new Set([
        'delivered', 'ready', 'food_ready',
        'picked_up', 'pickedup', 'dispatched',
        'rider_assigned', 'out_for_delivery',
    ]);

    async function checkPrepTimeOverdue(): Promise<void> {
        const now = Date.now();
        const today = getISTDateString();
        if (today !== overdueLogDate) { overdueLog = []; overdueLogDate = today; }

        for (const [orderId, entry] of prepTimerMap) {
            // Max-age TTL: remove any entry older than 6h past its due time (catches orders
            // stuck in non-terminal status that never exhausted Fibonacci alerts).
            if (now - entry.dueAt > 6 * 60 * 60 * 1000) {
                console.log(`   prepTimerMap TTL prune: ${orderId}`);
                prepTimerMap.delete(orderId);
                continue;
            }

            // Order already reached a terminal state — suppress further alerts.
            // This guards against the poll() delete being missed (e.g. unknown status string)
            // and against same-cycle races where status was updated before this check runs.
            if (TERMINAL_STATUSES.has(entry.currentStatus)) {
                prepTimerMap.delete(orderId);
                continue;
            }

            // Restaurant has marked food ready — their responsibility ends here.
            // vendorData.foodPreparedTime being set means the kitchen is done,
            // even if order_status hasn't advanced to a terminal string yet.
            // Check this before the dueAt guard so on-time completions are pruned promptly.
            if (entry.foodPreparedTime) {
                if (entry.wasOverdue && !entry.readyNotificationSent) {
                    entry.readyNotificationSent = true;
                    // Calculate overrun relative to when food was actually ready.
                    // Append +05:30 only if the timestamp has no timezone already.
                    const fpt = entry.foodPreparedTime;
                    const fptNormalized = /[Z+\-]\d{2}:?\d{2}$/.test(fpt) ? fpt : fpt + '+05:30';
                    const readyMs = new Date(fptNormalized).getTime();
                    const overrunMs = isNaN(readyMs) ? Math.max(0, now - entry.dueAt) : Math.max(0, readyMs - entry.dueAt);
                    const overrunMin = Math.max(1, Math.round(overrunMs / 60000));
                    console.log(`   Order ${orderId} food ready — overran by ${overrunMin}min`);
                    await notifier.notifyOrderReady(entry.notification, entry.orderNumber, overrunMin);
                    const today = getISTDateString();
                    if (today !== overdueLogDate) { overdueLog = []; overdueLogDate = today; }
                    const existing = overdueLog.find(e => e.orderId === orderId);
                    if (existing) {
                        existing.resolvedOverrunMinutes = overrunMin;
                    } else {
                        overdueLog.push({
                            orderId,
                            last4: orderId.slice(-4),
                            platform: entry.notification.platform.toUpperCase(),
                            itemSummary: entry.notification.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', '),
                            resolvedOverrunMinutes: overrunMin,
                        });
                    }
                }
                prepTimerMap.delete(orderId);
                continue;
            }

            if (now < entry.dueAt) continue; // Not yet overdue — no alert, keep tracking

            // All Fibonacci alerts exhausted — stop firing, prune after 3h
            if (entry.nextAlertIndex >= FIB_OFFSETS.length) {
                if (now - entry.dueAt > 3 * 60 * 60 * 1000) prepTimerMap.delete(orderId);
                continue;
            }

            const minutesSinceDue = (now - entry.dueAt) / 60000;
            const nextOffset = FIB_OFFSETS[entry.nextAlertIndex];

            if (minutesSinceDue >= nextOffset) {
                const minutesOverdue = Math.floor(minutesSinceDue);
                entry.alertsFired++;
                entry.wasOverdue = true;
                entry.nextAlertIndex++; // Advance; when >= FIB_OFFSETS.length, alerts stop

                const activeOrders = prepTimerMap.size;
                console.log(`\n   Prep overdue alert #${entry.alertsFired} for order ${orderId} (+${minutesOverdue}min, ${activeOrders} active)`);
                await notifier.notifyPrepTimeOverdue(entry.notification, minutesOverdue, entry.alertsFired, activeOrders);

                // Upsert into today's overdue log (resolved time filled when order goes terminal)
                if (!overdueLog.find(e => e.orderId === orderId)) {
                    overdueLog.push({
                        orderId,
                        last4: orderId.slice(-4),
                        platform: entry.notification.platform.toUpperCase(),
                        itemSummary: entry.notification.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', '),
                        resolvedOverrunMinutes: null,
                    });
                }
            }
        }
    }

    // Track whether promo alert was sent today at 3am
    let promoAlertDate = '';

    async function checkPromoAlert(): Promise<void> {
        const now = new Date(new Date().getTime() + IST_OFFSET_MS);
        const currentHour = now.getUTCHours();
        const todayStr = getISTDateString();

        if (currentHour !== 3) return;
        if (promoAlertDate === todayStr) return;

        promoAlertDate = todayStr;

        if (promoStats.size === 0) return;

        const lowMarginOffers = Array.from(promoStats.entries()).filter(([, s]) => {
            const avgNetPct = s.totalBill > 0 ? (s.totalNet / s.totalBill) * 100 : 100;
            return avgNetPct < config.promoMarginAlertPct;
        }) as [string, { orders: number; totalBill: number; totalNet: number; itemBurn: number }][];

        if (lowMarginOffers.length > 0) {
            await notifier.notifyPromoMarginAlert(lowMarginOffers, config.promoMarginAlertPct);
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
        }
        try {
            await checkPromoAlert();
        } catch (error) {
            console.error('Error in checkPromoAlert():', error);
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
    if (items.length === 0) {
        const orderId = order.orderId || order.order_id || String(order.id);
        console.warn(`   extractItems: no items found for order ${orderId} — API structure may have changed`);
    }

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
