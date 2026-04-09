/**
 * Notification Service
 *
 * Sends notifications via Telegram, Android FCM, and WhatsApp
 */

import TelegramBot from 'node-telegram-bot-api';
import admin from 'firebase-admin';
import fs from 'fs-extra';
import { config } from './config.js';
import { WhatsAppService } from './whatsapp.js';

interface OrderItem {
    name: string;
    quantity: number;
    price: number;       // MRP (sub_total / qty)
    finalPrice: number;  // After per-item discount (final_sub_total / qty)
    variant?: string;    // e.g. "Quarter (2pcs)"
    addons?: string[];   // e.g. ["Extra Sauce"]
}

interface OrderNotification {
    orderId: string;
    restaurantId: number;
    restaurantName?: string;
    items: OrderItem[];
    orderValue: number;        // Bill (item totals + packing)
    subtotal: number;          // Sum of item sub_totals (MRP, before discount)
    packingCharge: number;     // Packing/packaging fee
    restaurantDiscount: number; // Discount restaurant is absorbing
    netEarnings: number;       // orderValue - restaurantDiscount
    offerDescription?: string; // e.g. "60% off + 50% off"
    customerName?: string;
    customerArea?: string;     // Delivery zone
    specialInstructions?: string; // Customer note
    platform: 'swiggy' | 'zomato';
    status: string;
    orderDate: string;
    prepTime?: number;
    customerDistance?: number; // km
    itemComplexity?: number;   // total addon/variant count across all items
}

function formatPromoRow(offer: string, s: { orders: number; totalBill: number; totalNet: number; itemBurn: number }): string {
    const avgNetPct = s.totalBill > 0 ? Math.round(s.totalNet / s.totalBill * 100) : 0;
    const burnStr = s.itemBurn > 0 ? ` · burn ₹${s.itemBurn.toFixed(0)}` : '';
    return `• ${offer} — ${s.orders} orders · avg net ${avgNetPct}%${burnStr}`;
}

export class NotificationService {
    private telegramBot: TelegramBot | null = null;
    private whatsApp: WhatsAppService | null = null;
    private fcmInitialized = false;

    /** Returns true if the given channel is allowed to send the given event type. */
    private allows(channel: 'whatsapp' | 'telegram' | 'fcm', event: string): boolean {
        const lists = { whatsapp: config.whatsappEvents, telegram: config.telegramEvents, fcm: config.fcmEvents };
        const allowed = lists[channel];
        return allowed === null || allowed.has(event);
    }

    async initialize(): Promise<void> {
        const activeChannels: string[] = [];
        const disabledReasons: string[] = [];

        // Initialize Telegram
        if (config.enableTelegram && config.telegramToken && config.telegramChatId) {
            this.telegramBot = new TelegramBot(config.telegramToken, { polling: false });
            activeChannels.push('Telegram');
        } else if (!config.enableTelegram) {
            disabledReasons.push('Telegram (disabled)');
        } else {
            disabledReasons.push(`Telegram (missing: ${!config.telegramToken ? 'TELEGRAM_TOKEN ' : ''}${!config.telegramChatId ? 'TELEGRAM_CHAT_ID' : ''})`);
        }

        // Initialize WhatsApp
        if (config.enableWhatsApp) {
            this.whatsApp = new WhatsAppService();
            await this.whatsApp.initialize();
            activeChannels.push('WhatsApp');
        } else {
            disabledReasons.push('WhatsApp (disabled)');
        }

        // Initialize Firebase Cloud Messaging
        if (config.enableFCM && config.firebaseServiceAccountPath && config.firebaseFcmToken && await fs.pathExists(config.firebaseServiceAccountPath)) {
            try {
                const serviceAccount = await fs.readJson(config.firebaseServiceAccountPath);

                if (!admin.apps.length) {
                    admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount),
                    });
                }

                this.fcmInitialized = true;
                activeChannels.push('FCM');
            } catch (error) {
                console.warn('Failed to initialize Firebase:', error);
                disabledReasons.push('FCM (init error)');
            }
        } else if (!config.enableFCM) {
            disabledReasons.push('FCM (disabled)');
        } else {
            disabledReasons.push(`FCM (missing: ${!config.firebaseServiceAccountPath ? 'FIREBASE_SERVICE_ACCOUNT ' : ''}${!config.firebaseFcmToken ? 'FIREBASE_FCM_TOKEN' : ''})`);
        }

        console.log(`Notification channels active: ${activeChannels.length > 0 ? activeChannels.join(', ') : 'NONE'}`);
        if (disabledReasons.length > 0) {
            console.log(`Channels disabled: ${disabledReasons.join(' | ')}`);
        }
    }

    async notifyNewOrder(order: OrderNotification, orderNumber: number): Promise<void> {
        const message = this.formatOrderMessage(order, orderNumber);
        const waMessage = this.formatWhatsAppMessage(order, orderNumber);

        const promises: Promise<void>[] = [];

        if (this.telegramBot && config.telegramChatId && this.allows('telegram', 'new_order')) {
            promises.push(
                this.telegramBot.sendMessage(config.telegramChatId, message, {
                    parse_mode: 'HTML',
                }).then(() => {
                    console.log(`Telegram notification sent for order ${order.orderId}`);
                }).catch(err => {
                    console.error('Telegram notification failed:', err.message);
                })
            );
        }

        if (this.whatsApp && this.allows('whatsapp', 'new_order')) {
            promises.push(
                this.whatsApp.sendMessage(this.truncateWA(waMessage)).catch(err => {
                    console.error('WhatsApp notification failed:', err.message);
                })
            );
        }

        if (this.fcmInitialized && config.firebaseFcmToken && this.allows('fcm', 'new_order')) {
            promises.push(
                admin.messaging().send({
                    token: config.firebaseFcmToken,
                    notification: {
                        title: `New Swiggy Order #${orderNumber}`,
                        body: `₹${order.orderValue.toFixed(0)} - ${order.items.length} item(s)`,
                    },
                    data: {
                        orderId: order.orderId,
                        platform: order.platform,
                        restaurantId: String(order.restaurantId),
                        totalAmount: String(order.orderValue),
                    },
                    android: {
                        priority: 'high',
                        notification: {
                            channelId: 'orders',
                            priority: 'high',
                            sound: 'default',
                        },
                    },
                }).then(() => {
                    console.log(`FCM notification sent for order ${order.orderId}`);
                }).catch(err => {
                    console.error('FCM notification failed:', err.message);
                })
            );
        }

        await Promise.allSettled(promises);
    }

    async notifyCancelledOrder(order: OrderNotification): Promise<void> {
        const title = `Order Cancelled - ${order.orderId}`;
        const body = `${order.customerName || 'Unknown'} - ₹${order.orderValue.toFixed(0)}`;
        const restaurantLabel = order.restaurantName ? `${order.restaurantName} — ` : '';
        const platformLabel = order.platform === 'zomato' ? 'Zomato' : 'Swiggy';
        const siHtml = order.specialInstructions ? `\n<b>Note:</b> ${order.specialInstructions}` : '';
        const siPlain = order.specialInstructions ? `\nNote: ${order.specialInstructions}` : '';

        const htmlMessage = `<b>${restaurantLabel}${platformLabel} Order Cancelled</b>\n\n<b>Order ID:</b> <code>${order.orderId}</code>\n<b>Customer:</b> ${order.customerName || 'Unknown'}\n<b>Amount:</b> ₹${order.orderValue.toFixed(0)}${siHtml}`;
        const plainMessage = `Order Cancelled\n\nOrder ID: ${order.orderId}\nCustomer: ${order.customerName || 'Unknown'}\nAmount: ₹${order.orderValue.toFixed(0)}${siPlain}`;

        const promises: Promise<void>[] = [];

        if (this.telegramBot && config.telegramChatId) {
            promises.push(this.telegramBot.sendMessage(config.telegramChatId, htmlMessage, { parse_mode: 'HTML' }).then(() => { }));
        }

        if (this.whatsApp && this.allows('whatsapp', 'cancelled_order')) {
            promises.push(this.whatsApp.sendMessage(this.truncateWA(plainMessage)).catch(err => {
                console.error('WhatsApp cancellation notification failed:', err.message);
            }));
        }

        if (this.fcmInitialized && config.firebaseFcmToken) {
            promises.push(admin.messaging().send({
                token: config.firebaseFcmToken,
                notification: { title, body },
                android: { priority: 'high' },
            }).then(() => { }));
        }

        await Promise.allSettled(promises);
    }

    async notifyPrepTimeOverdue(order: OrderNotification, minutesOverdue: number, alertNumber: number, activeOrders?: number): Promise<void> {
        const platformLabel = order.platform === 'zomato' ? 'ZOMATO' : 'SWIGGY';
        const last4 = order.orderId.slice(-4);
        const itemSummary = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
        const overStr = minutesOverdue === 0 ? 'just exceeded' : `+${minutesOverdue} min overdue`;
        const loadStr = activeOrders !== undefined && activeOrders > 1 ? ` · ${activeOrders} active` : '';

        const waMessage = `⚠️ *OVERDUE #${alertNumber} · ...${last4} · ${platformLabel}${loadStr}*\n${overStr}\n${itemSummary || '—'}`;
        const htmlMessage = `⚠️ <b>Prep Overdue #${alertNumber} — ...${last4} (${platformLabel}${loadStr})</b>\n<b>${overStr}</b>\n${itemSummary || '—'}`;

        const promises: Promise<void>[] = [];
        if (this.telegramBot && config.telegramChatId) {
            promises.push(this.telegramBot.sendMessage(config.telegramChatId, htmlMessage, { parse_mode: 'HTML' })
                .then(() => { }).catch(err => console.error('Telegram overdue alert failed:', err.message)));
        }
        if (this.whatsApp && this.allows('whatsapp', 'overdue')) {
            promises.push(this.whatsApp.sendMessage(this.truncateWA(waMessage))
                .catch(err => console.error('WhatsApp overdue alert failed:', err.message)));
        }
        await Promise.allSettled(promises);
    }

    async notifyOrderReady(order: OrderNotification, _orderNumber: number, totalOverrunMinutes: number): Promise<void> {
        const platformLabel = order.platform === 'zomato' ? 'ZOMATO' : 'SWIGGY';
        const last4 = order.orderId.slice(-4);
        const itemSummary = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

        const waMessage = `✅ *READY · ...${last4} · ${platformLabel}*\nWas *${totalOverrunMinutes} min* overdue\n${itemSummary || '—'}`;
        const htmlMessage = `✅ <b>Order Ready — ...${last4} (${platformLabel})</b>\nWas <b>${totalOverrunMinutes} min</b> overdue\n${itemSummary || '—'}`;

        const promises: Promise<void>[] = [];
        if (this.telegramBot && config.telegramChatId) {
            promises.push(this.telegramBot.sendMessage(config.telegramChatId, htmlMessage, { parse_mode: 'HTML' })
                .then(() => { }).catch(err => console.error('Telegram ready notification failed:', err.message)));
        }
        if (this.whatsApp && this.allows('whatsapp', 'order_ready')) {
            promises.push(this.whatsApp.sendMessage(this.truncateWA(waMessage))
                .catch(err => console.error('WhatsApp ready notification failed:', err.message)));
        }
        await Promise.allSettled(promises);
    }

    async notifyHandoverDelay(order: OrderNotification, deWaitMinutes: number): Promise<void> {
        const platformLabel = order.platform === 'zomato' ? 'ZOMATO' : 'SWIGGY';
        const last4 = order.orderId.slice(-4);

        const htmlMessage = `⏳ <b>Handover Delay — ...${last4} (${platformLabel})</b>\nDE waited <b>${deWaitMinutes} min</b> at the door. Swiggy may penalise this delay.`;
        const promises: Promise<void>[] = [];
        if (this.telegramBot && config.telegramChatId) {
            promises.push(this.telegramBot.sendMessage(config.telegramChatId, htmlMessage, { parse_mode: 'HTML' })
                .then(() => { }).catch(err => console.error('Telegram handover delay alert failed:', err.message)));
        }
        await Promise.allSettled(promises);
    }

    async notifyComplaintOutlier(order: OrderNotification): Promise<void> {
        const platformLabel = order.platform === 'zomato' ? 'ZOMATO' : 'SWIGGY';
        const last4 = order.orderId.slice(-4);
        const itemSummary = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

        const waMessage = `🚨 *COMPLAINT OUTLIER · ...${last4} · ${platformLabel}*\nSwiggy has flagged unusual complaint activity on this order.\n${itemSummary || '—'}`;
        const htmlMessage = `🚨 <b>Complaint Outlier — ...${last4} (${platformLabel})</b>\nSwiggy has flagged unusual complaint activity on this order.\n${itemSummary || '—'}`;

        const promises: Promise<void>[] = [];
        if (this.telegramBot && config.telegramChatId) {
            promises.push(this.telegramBot.sendMessage(config.telegramChatId, htmlMessage, { parse_mode: 'HTML' })
                .then(() => { }).catch(err => console.error('Telegram complaint outlier alert failed:', err.message)));
        }
        if (this.whatsApp && this.allows('whatsapp', 'complaint')) {
            promises.push(this.whatsApp.sendMessage(this.truncateWA(waMessage))
                .catch(err => console.error('WhatsApp complaint outlier alert failed:', err.message)));
        }
        if (this.fcmInitialized && config.firebaseFcmToken) {
            promises.push(admin.messaging().send({
                token: config.firebaseFcmToken,
                notification: { title: '🚨 Complaint Outlier', body: `...${last4} (${platformLabel}) — unusual complaint activity` },
                android: { priority: 'high', notification: { channelId: 'orders', sound: 'default' } },
            }).then(() => { }).catch(err => console.error('FCM complaint outlier alert failed:', err.message)));
        }
        await Promise.allSettled(promises);
    }

    async notifyPromoMarginAlert(lowMarginOffers: [string, { orders: number; totalBill: number; totalNet: number; itemBurn: number }][], thresholdPct: number): Promise<void> {
        const lines = lowMarginOffers.map(([offer, s]) => formatPromoRow(offer, s));

        const htmlMessage = `⚠️ <b>Promo Margin Alert</b>\nOffers below ${thresholdPct}% avg net today:\n${lines.join('\n')}`;
        const waMessage = `⚠️ *Promo Margin Alert*\nOffers below ${thresholdPct}% avg net today:\n${lines.join('\n')}`;

        const promises: Promise<void>[] = [];
        if (this.telegramBot && config.telegramChatId) {
            promises.push(this.telegramBot.sendMessage(config.telegramChatId, htmlMessage, { parse_mode: 'HTML' })
                .then(() => { }).catch(err => console.error('Telegram promo alert failed:', err.message)));
        }
        if (this.whatsApp && this.allows('whatsapp', 'promo_alert')) {
            promises.push(this.whatsApp.sendMessage(this.truncateWA(waMessage))
                .catch(err => console.error('WhatsApp promo alert failed:', err.message)));
        }
        await Promise.allSettled(promises);
    }

    async notifyKitchenStress(restaurantName: string): Promise<void> {
        const waMessage = `🔥 *KITCHEN STRESS · ${restaurantName}*\nSwiggy thinks the kitchen is under stress. Consider pausing new orders or increasing prep time.`;
        const htmlMessage = `🔥 <b>Kitchen Stress — ${restaurantName}</b>\nSwiggy thinks the kitchen is under stress. Consider pausing new orders or increasing prep time.`;

        const promises: Promise<void>[] = [];
        if (this.telegramBot && config.telegramChatId) {
            promises.push(this.telegramBot.sendMessage(config.telegramChatId, htmlMessage, { parse_mode: 'HTML' })
                .then(() => { }).catch(err => console.error('Telegram stress alert failed:', err.message)));
        }
        if (this.whatsApp && this.allows('whatsapp', 'kitchen_stress')) {
            promises.push(this.whatsApp.sendMessage(this.truncateWA(waMessage))
                .catch(err => console.error('WhatsApp stress alert failed:', err.message)));
        }
        if (this.fcmInitialized && config.firebaseFcmToken) {
            promises.push(admin.messaging().send({
                token: config.firebaseFcmToken,
                notification: { title: '🔥 Kitchen Stress', body: `${restaurantName} — Swiggy flagged kitchen stress` },
                android: { priority: 'high', notification: { channelId: 'orders', sound: 'default' } },
            }).then(() => { }).catch(err => console.error('FCM stress alert failed:', err.message)));
        }
        await Promise.allSettled(promises);
    }

    async notifySessionExpired(): Promise<void> {
        const message = '<b>Session Expired!</b>\n\nSwiggy session expired after 3 failed attempts. Service stopped.\nRun: <code>pnpm run login</code>';
        const plainMessage = 'Session Expired!\n\nSwiggy session expired after 3 failed attempts. Service stopped.\nRun: pnpm run login';

        await this.sendAlertToAll(message, plainMessage, 'Session Expired', 'Please re-login to continue receiving order notifications');
    }

    async notifyError(errorMessage: string): Promise<void> {
        const message = `<b>Scraper Stopped</b>\n\n3 consecutive errors. Service shut down.\n\n<code>${errorMessage}</code>`;
        const plainMessage = `Scraper Stopped\n\n3 consecutive errors. Service shut down.\n\n${errorMessage}`;

        await this.sendAlertToAll(message, plainMessage, 'Scraper Stopped', '3 consecutive errors - service shut down');
    }

    async sendTestNotification(): Promise<void> {
        const message = '<b>Test Notification</b>\n\nKJ Inventory Scraper started — notification channels verified.';
        const waMessage = '*Test Notification*\n\nKJ Inventory Scraper started — notification channels verified.';

        console.log('Sending test notifications...');
        const promises: Promise<void>[] = [];

        if (this.telegramBot && config.telegramChatId) {
            promises.push(
                this.telegramBot.sendMessage(config.telegramChatId, message, { parse_mode: 'HTML' })
                    .then(() => console.log('Telegram test notification sent'))
                    .catch(err => console.error('Telegram test notification failed:', err.message))
            );
        }

        if (this.whatsApp) {
            promises.push(
                this.whatsApp.sendMessage(this.truncateWA(waMessage))
                    .then(() => console.log('WhatsApp test notification sent'))
                    .catch(err => console.error('WhatsApp test notification failed:', err.message))
            );
        }

        if (this.fcmInitialized && config.firebaseFcmToken) {
            promises.push(
                admin.messaging().send({
                    token: config.firebaseFcmToken,
                    notification: { title: 'Test Notification', body: 'Scraper started — channels verified.' },
                    android: { priority: 'high', notification: { channelId: 'orders' } },
                }).then(() => console.log('FCM test notification sent'))
                    .catch(err => console.error('FCM test notification failed:', err.message))
            );
        }

        await Promise.allSettled(promises);
    }

    async sendDailySummary(data: any, overdueLog: Array<{last4: string; platform: string; itemSummary: string; resolvedOverrunMinutes: number | null}> = [], mfrLog: { hits: number; misses: number } = { hits: 0, misses: 0 }, promoStats: Map<string, { orders: number; totalBill: number; totalNet: number; itemBurn: number }> = new Map()): Promise<void> {
        if (!data || !data.businessMetricsDetailsV3) {
            console.error('Invalid summary data');
            return;
        }

        const metrics = data.businessMetricsDetailsV3.businessMetricsDetails;
        const salesCard = metrics.find((m: any) => m.id === 'SALES_V2');
        const ratingsCard = metrics.find((m: any) => m.id === 'RATINGS');
        const complaintsCard = metrics.find((m: any) => m.id === 'COMPLAINTS_V2');
        const funnelCard = metrics.find((m: any) => m.id === 'CONVERSION_FUNNEL');

        // Extract Sales Data
        const salesMetrics = salesCard?.metrics?.[0]?.subMetrics?.[0]?.cardMetrics || [];
        const getMetricVal = (id: string, arr: any[]) => arr.find((m: any) => m.id === id)?.value || '0';

        const netSales = getMetricVal('NET_SALES', salesMetrics);
        const deliveredOrders = getMetricVal('DELIVERED_ORDERS', salesMetrics);
        const netAov = getMetricVal('NET_AOV', salesMetrics);
        const cancelledOrders = getMetricVal('CANCELLED_ORDER', salesMetrics);

        // Extract Ratings Data
        const ratingMetrics = ratingsCard?.metrics?.[0]?.subMetrics?.[0]?.cardMetrics || [];
        const ratedOrders = getMetricVal('TOTAL_RATED_ORDERS', ratingMetrics);
        const poorRatedOrders = getMetricVal('POOR_RATED_ORDERS', ratingMetrics);

        // Extract Complaints Data
        const complaintMetrics = complaintsCard?.metrics?.[0]?.subMetrics?.[0]?.cardMetrics || [];
        const totalComplaints = getMetricVal('ORDER_WITH_COMPLAINS', complaintMetrics);

        // Extract Funnel Data
        const funnelMetrics = funnelCard?.metrics?.[0]?.current?.metrics || [];
        const getFunnelVal = (label: string) => funnelMetrics.find((m: any) => m.label === label)?.value || '0';
        const impressions = getFunnelVal('IMPRESSIONS');
        const menuOpens = getFunnelVal('MENU OPENS');
        const cartBuilds = getFunnelVal('CART BUILDS');

        // Build MFR section for 7am report
        const mfrTotal = mfrLog.hits + mfrLog.misses;
        const mfrSection = mfrTotal > 0
            ? `<b>MFR (Prep Accuracy)</b>\n• Met: <b>${mfrLog.hits}</b> / Missed: <b>${mfrLog.misses}</b> (${Math.round(mfrLog.hits / mfrTotal * 100)}%)`
            : '<b>MFR (Prep Accuracy)</b> — no data';
        const mfrWaSection = mfrTotal > 0
            ? `*MFR (Prep Accuracy)*\n• Met: *${mfrLog.hits}* / Missed: *${mfrLog.misses}* (${Math.round(mfrLog.hits / mfrTotal * 100)}%)`
            : '*MFR (Prep Accuracy)* — no data';

        // Build overdue section for 7am report
        let overdueSection = '';
        let overdueWaSection = '';
        if (overdueLog.length === 0) {
            overdueSection = '<b>Prep Time</b> ✅ All orders within time';
            overdueWaSection = '*Prep Time* ✅ All orders within time';
        } else {
            const rows = overdueLog.map(e => {
                const resolved = e.resolvedOverrunMinutes !== null ? `+${e.resolvedOverrunMinutes} min` : 'unresolved';
                return `• ...${e.last4} · ${e.platform} · ${resolved} — ${e.itemSummary}`;
            });
            const resolvedEntries = overdueLog.filter(e => e.resolvedOverrunMinutes !== null);
            const avgStr = resolvedEntries.length > 0
                ? ` | Avg: ${Math.round(resolvedEntries.reduce((s, e) => s + (e.resolvedOverrunMinutes ?? 0), 0) / resolvedEntries.length)} min`
                : '';
            const count = overdueLog.length;
            overdueSection = `<b>Prep Time Exceeded (${count} order${count > 1 ? 's' : ''})</b>\n${rows.join('\n')}${avgStr}`;
            overdueWaSection = `*Prep Time Exceeded (${count} order${count > 1 ? 's' : ''})*\n${rows.join('\n')}${avgStr}`;
        }

        // Build promo efficiency section for 7am report
        let promoSection = '';
        let promoWaSection = '';
        if (promoStats.size === 0) {
            promoSection = '<b>Promo Efficiency</b> — no promo orders';
            promoWaSection = '*Promo Efficiency* — no promo orders';
        } else {
            const promoRows = Array.from(promoStats.entries()).map(([offer, s]) => formatPromoRow(offer, s));
            promoSection = `<b>Promo Efficiency</b>\n${promoRows.join('\n')}`;
            promoWaSection = `*Promo Efficiency*\n${promoRows.join('\n')}`;
        }

        // Format Date
        const dateStr = data.businessMetricsDetailsV3.subTitleV2?.value
            ? data.businessMetricsDetailsV3.subTitleV2.value.replace('{{date}}', data.businessMetricsDetailsV3.subTitleV2.attribute_values?.date?.value || '')
            : 'Yesterday';

        const message = `<b>Daily Business Summary</b>
${dateStr}

<b>Sales Performance</b>
• Net Sales: <b>${netSales}</b>
• Delivered Orders: <b>${deliveredOrders}</b>
• Net AOV: <b>${netAov}</b>
• Cancelled: <b>${cancelledOrders}</b>

<b>Ratings & Quality</b>
• Rated Orders: <b>${ratedOrders}</b>
• Poor Ratings: <b>${poorRatedOrders}</b>
• Complaints: <b>${totalComplaints}</b>

<b>Funnel (Conversion)</b>
• Impressions: <b>${impressions}</b>
• Menu Opens: <b>${menuOpens}</b>
• Cart Builds: <b>${cartBuilds}</b>

${mfrSection}

${overdueSection}

${promoSection}`;

        const waMessage = `*Daily Business Summary*
${dateStr}

*Sales Performance*
• Net Sales: *${netSales}*
• Delivered Orders: *${deliveredOrders}*
• Net AOV: *${netAov}*
• Cancelled: *${cancelledOrders}*

*Ratings & Quality*
• Rated Orders: *${ratedOrders}*
• Poor Ratings: *${poorRatedOrders}*
• Complaints: *${totalComplaints}*

*Funnel (Conversion)*
• Impressions: *${impressions}*
• Menu Opens: *${menuOpens}*
• Cart Builds: *${cartBuilds}*

${mfrWaSection}

${overdueWaSection}

${promoWaSection}`;

        const promises: Promise<void>[] = [];

        if (this.telegramBot && config.telegramChatId) {
            promises.push(
                this.telegramBot.sendMessage(config.telegramChatId, message, { parse_mode: 'HTML' })
                    .then(() => console.log('Daily summary sent to Telegram'))
                    .catch(err => console.error('Telegram summary failed:', err.message))
            );
        }

        if (this.whatsApp && this.allows('whatsapp', 'daily_summary')) {
            promises.push(
                this.whatsApp.sendMessage(this.truncateWA(waMessage))
                    .then(() => console.log('Daily summary sent to WhatsApp'))
                    .catch(err => console.error('WhatsApp summary failed:', err.message))
            );
        }

        await Promise.allSettled(promises);
    }

    private async sendAlertToAll(htmlMessage: string, plainMessage: string, fcmTitle: string, fcmBody: string): Promise<void> {
        const channelNames: string[] = [];
        const promises: Promise<void>[] = [];

        if (this.telegramBot && config.telegramChatId) {
            channelNames.push('telegram');
            promises.push(this.telegramBot.sendMessage(config.telegramChatId, htmlMessage, { parse_mode: 'HTML' }).then(() => { }));
        }

        if (this.whatsApp) {
            channelNames.push('whatsapp');
            promises.push(this.whatsApp.sendMessage(this.truncateWA(plainMessage)).then(() => { }));
        }

        if (this.fcmInitialized && config.firebaseFcmToken) {
            channelNames.push('fcm');
            promises.push(admin.messaging().send({
                token: config.firebaseFcmToken,
                notification: { title: fcmTitle, body: fcmBody },
                android: { priority: 'high' },
            }).then(() => { }));
        }

        const results = await Promise.allSettled(promises);
        results.forEach((result, i) => {
            if (result.status === 'rejected') {
                console.error(`Critical alert failed on ${channelNames[i]}:`, result.reason?.message || String(result.reason));
            }
        });
    }

    private computeRiskTag(order: OrderNotification): 'HIGH' | 'MEDIUM' | null {
        if (order.orderValue <= 0) return null;
        const marginPct = (order.netEarnings / order.orderValue) * 100;
        const lowMargin = marginPct < 50;
        const farDistance = (order.customerDistance ?? 0) > config.riskDistanceKm;
        const hasComplexity = (order.itemComplexity ?? 0) > 0;

        if (!lowMargin) return null;
        if (farDistance || hasComplexity) return 'HIGH';
        return 'MEDIUM';
    }

    private formatISTDateTime(isoString: string): string {
        try {
            // Swiggy's placed_time is already in IST but has no timezone suffix.
            // Appending '+05:30' prevents double-conversion (UTC→IST adds another 5h30m).
            const normalized = /[Z+\-]\d{2}:?\d{2}$/.test(isoString)
                ? isoString
                : isoString + '+05:30';
            const date = new Date(normalized);
            return date.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) + ' IST';
        } catch {
            return isoString;
        }
    }

    private formatOrderMessage(order: OrderNotification, orderNumber: number): string {
        const platformLabel = order.platform === 'zomato' ? 'Zomato' : 'Swiggy';
        const restaurantLabel = order.restaurantName ? `${order.restaurantName} — ` : '';

        const itemsList = order.items.map(item => {
            const parts: string[] = [];
            if (item.variant) parts.push(item.variant);
            if (item.addons && item.addons.length > 0) parts.push(...item.addons);
            const suffix = parts.length > 0 ? ` <i>(${parts.join(', ')})</i>` : '';
            return `  • ${item.quantity}x ${item.name}${suffix} — ₹${item.price.toFixed(0)}`;
        }).join('\n');

        const prepTime = order.prepTime ? `${order.prepTime} mins` : 'N/A';
        const areaRow = order.customerArea ? `<b>Area:</b> ${order.customerArea}\n` : '';
        const siRow = order.specialInstructions ? `<b>Note:</b> ${order.specialInstructions}\n` : '';
        const orderTime = this.formatISTDateTime(order.orderDate);

        // Bill breakdown (no tax lines)
        const packingRow = order.packingCharge > 0 ? `<b>Packing:</b> ₹${order.packingCharge.toFixed(0)}\n` : '';
        let discountRow = '';
        if (order.restaurantDiscount > 0) {
            discountRow = `<b>Discount:</b> -₹${order.restaurantDiscount.toFixed(0)}\n`;
        }

        const marginPct = order.orderValue > 0
            ? Math.round(order.netEarnings / order.orderValue * 100)
            : 0;
        const riskTag = this.computeRiskTag(order);
        const riskRow = riskTag
            ? `\n<b>Risk:</b> ${riskTag === 'HIGH' ? '🔴 HIGH' : '🟡 MEDIUM'}`
            : '';

        return `
<b>${restaurantLabel}New ${platformLabel} Order #${orderNumber}</b>

<b>Order ID:</b> <code>${order.orderId}</code>
<b>Customer:</b> ${order.customerName || 'Unknown'}
${areaRow}${siRow}<b>Time:</b> ${orderTime}
<b>Prep Time:</b> ${prepTime}

<b>Items:</b>
${itemsList || '  (items not available)'}

<b>Subtotal:</b> ₹${order.subtotal.toFixed(0)}
${packingRow}<b>Order Value:</b> ₹${order.orderValue.toFixed(0)}
${discountRow}<b>Net Earnings:</b> ₹${order.netEarnings.toFixed(0)} (${marginPct}%)
${riskRow}`.trim();
    }

    private formatWhatsAppMessage(order: OrderNotification, orderNumber: number): string {
        const platformLabel = order.platform === 'zomato' ? 'ZOMATO' : 'SWIGGY';
        const prepTime = order.prepTime ? `${order.prepTime} mins` : 'N/A';
        const orderTime = this.formatISTDateTime(order.orderDate);
        const last4 = order.orderId.slice(-4);

        const itemsList = order.items.map(item => {
            const parts: string[] = [];
            if (item.variant) parts.push(item.variant);
            if (item.addons && item.addons.length > 0) parts.push(...item.addons);
            const suffix = parts.length > 0 ? `\n    _${parts.join(' + ')}_` : '';
            return `*${item.quantity}x* ${item.name}${suffix}`;
        }).join('\n');

        const areaRow = order.customerArea ? `\n*Area:* ${order.customerArea}` : '';
        const siRow = order.specialInstructions ? `\n*Note:* _${order.specialInstructions}_` : '';

        const marginPct = order.orderValue > 0
            ? Math.round(order.netEarnings / order.orderValue * 100)
            : 0;
        let netRow = `\n*Net:* ₹${order.netEarnings.toFixed(0)} (${marginPct}%)`;
        const riskTag = this.computeRiskTag(order);
        if (riskTag) {
            netRow += ` · *${riskTag === 'HIGH' ? '🔴 HIGH RISK' : '🟡 MEDIUM RISK'}*`;
        }

        return `*KOT #${orderNumber} · ...${last4} · ${platformLabel}*
*Prep:* ${prepTime}  |  ${orderTime}

${itemsList || '(items not available)'}${areaRow}${siRow}${netRow}`;
    }

    /** Truncate a WhatsApp message to stay within the 4096-char limit. */
    private truncateWA(message: string, limit = 4000): string {
        if (message.length <= limit) return message;
        const suffix = '\n…(truncated)';
        return message.slice(0, limit - suffix.length) + suffix;
    }

    async shutdown(): Promise<void> {
        if (this.whatsApp) {
            await this.whatsApp.destroy();
        }
    }
}
