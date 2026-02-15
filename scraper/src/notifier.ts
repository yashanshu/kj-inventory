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

interface OrderNotification {
    orderId: string;
    restaurantId: number;
    restaurantName?: string;
    items: { name: string; quantity: number; price: number }[];
    orderValue: number; // Bill (item totals + packing + GST)
    restaurantDiscount: number; // Discount restaurant is giving
    netEarnings: number; // orderValue - restaurantDiscount
    offerDescription?: string; // e.g. "60% off + 50% off"
    customerName?: string;
    customerArea?: string; // Delivery zone
    platform: 'swiggy' | 'zomato';
    status: string;
    orderDate: string;
    prepTime?: number;
}

export class NotificationService {
    private telegramBot: TelegramBot | null = null;
    private whatsApp: WhatsAppService | null = null;
    private fcmInitialized = false;

    async initialize(): Promise<void> {
        // Initialize Telegram
        if (config.enableTelegram && config.telegramToken && config.telegramChatId) {
            this.telegramBot = new TelegramBot(config.telegramToken, { polling: false });
            console.log('Telegram notifications enabled');
        } else {
            console.log('Telegram notifications disabled or missing credentials');
        }

        // Initialize WhatsApp
        if (config.enableWhatsApp) {
            this.whatsApp = new WhatsAppService();
            await this.whatsApp.initialize();
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
                console.log('Firebase FCM notifications enabled');
            } catch (error) {
                console.warn('Failed to initialize Firebase:', error);
            }
        } else {
            console.log('FCM notifications disabled or missing config');
        }
    }

    async notifyNewOrder(order: OrderNotification, orderNumber: number): Promise<void> {
        const message = this.formatOrderMessage(order, orderNumber);
        const waMessage = this.formatWhatsAppMessage(order, orderNumber);

        const promises: Promise<void>[] = [];

        // Send Telegram notification
        if (this.telegramBot && config.telegramChatId) {
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

        // Send WhatsApp notification
        if (this.whatsApp) {
            promises.push(
                this.whatsApp.sendMessage(waMessage).catch(err => {
                    console.error('WhatsApp notification failed:', err.message);
                })
            );
        }

        // Send FCM notification
        if (this.fcmInitialized && config.firebaseFcmToken) {
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

        const htmlMessage = `<b>Order Cancelled</b>\n\n<b>Order ID:</b> <code>${order.orderId}</code>\n<b>Customer:</b> ${order.customerName || 'Unknown'}\n<b>Amount:</b> ₹${order.orderValue.toFixed(0)}`;
        const plainMessage = `Order Cancelled\n\nOrder ID: ${order.orderId}\nCustomer: ${order.customerName || 'Unknown'}\nAmount: ₹${order.orderValue.toFixed(0)}`;

        const promises: Promise<void>[] = [];

        if (this.telegramBot && config.telegramChatId) {
            promises.push(this.telegramBot.sendMessage(config.telegramChatId, htmlMessage, { parse_mode: 'HTML' }).then(() => { }));
        }

        if (this.whatsApp) {
            promises.push(this.whatsApp.sendMessage(plainMessage).catch(err => {
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
                this.whatsApp.sendMessage(waMessage)
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

    async sendDailySummary(data: any): Promise<void> {
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
• Cart Builds: <b>${cartBuilds}</b>`;

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
• Cart Builds: *${cartBuilds}*`;

        const promises: Promise<void>[] = [];

        if (this.telegramBot && config.telegramChatId) {
            promises.push(
                this.telegramBot.sendMessage(config.telegramChatId, message, { parse_mode: 'HTML' })
                    .then(() => console.log('Daily summary sent to Telegram'))
                    .catch(err => console.error('Telegram summary failed:', err.message))
            );
        }

        if (this.whatsApp) {
            promises.push(
                this.whatsApp.sendMessage(waMessage)
                    .then(() => console.log('Daily summary sent to WhatsApp'))
                    .catch(err => console.error('WhatsApp summary failed:', err.message))
            );
        }

        await Promise.allSettled(promises);
    }

    private async sendAlertToAll(htmlMessage: string, plainMessage: string, fcmTitle: string, fcmBody: string): Promise<void> {
        const promises: Promise<void>[] = [];

        if (this.telegramBot && config.telegramChatId) {
            promises.push(this.telegramBot.sendMessage(config.telegramChatId, htmlMessage, { parse_mode: 'HTML' }).then(() => { }));
        }

        if (this.whatsApp) {
            promises.push(this.whatsApp.sendMessage(plainMessage).then(() => { }));
        }

        if (this.fcmInitialized && config.firebaseFcmToken) {
            promises.push(admin.messaging().send({
                token: config.firebaseFcmToken,
                notification: { title: fcmTitle, body: fcmBody },
                android: { priority: 'high' },
            }).then(() => { }));
        }

        await Promise.allSettled(promises);
    }

    private formatISTDateTime(isoString: string): string {
        try {
            const date = new Date(isoString);
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
        const itemsList = order.items
            .map(item => `  • ${item.quantity}x ${item.name} (₹${item.price.toFixed(0)})`)
            .join('\n');

        const prepTime = order.prepTime ? `${order.prepTime} mins` : 'N/A';

        let discountRow = '';
        if (order.restaurantDiscount > 0) {
            const offerText = order.offerDescription ? ` (${order.offerDescription})` : '';
            discountRow = `<b>Restaurant Discount:</b> -₹${order.restaurantDiscount.toFixed(0)}${offerText}\n`;
        }

        const areaRow = order.customerArea ? `<b>Area:</b> ${order.customerArea}\n` : '';
        const orderTime = this.formatISTDateTime(order.orderDate);

        return `
<b>New Swiggy Order #${orderNumber}</b>

<b>Order ID:</b> <code>${order.orderId}</code>
<b>Customer:</b> ${order.customerName || 'Unknown'}
${areaRow}<b>Time:</b> ${orderTime}
<b>Prep Time:</b> ${prepTime}

<b>Items:</b>
${itemsList || '  (items not available)'}

<b>Order Value:</b> ₹${order.orderValue.toFixed(0)}
${discountRow}<b>Net Earnings:</b> ₹${order.netEarnings.toFixed(0)}
`.trim();
    }

    private formatWhatsAppMessage(order: OrderNotification, orderNumber: number): string {
        const itemsList = order.items
            .map(item => `  • ${item.quantity}x ${item.name} (₹${item.price.toFixed(0)})`)
            .join('\n');

        const prepTime = order.prepTime ? `${order.prepTime} mins` : 'N/A';

        let discountRow = '';
        if (order.restaurantDiscount > 0) {
            const offerText = order.offerDescription ? ` (${order.offerDescription})` : '';
            discountRow = `Restaurant Discount: -₹${order.restaurantDiscount.toFixed(0)}${offerText}\n`;
        }

        const areaRow = order.customerArea ? `Area: ${order.customerArea}\n` : '';
        const orderTime = this.formatISTDateTime(order.orderDate);

        return `
*New Swiggy Order #${orderNumber}*

*Order ID:* ${order.orderId}
*Customer:* ${order.customerName || 'Unknown'}
${areaRow}*Time:* ${orderTime}
*Prep Time:* ${prepTime}

*Items:*
${itemsList || '  (items not available)'}

*Order Value:* ₹${order.orderValue.toFixed(0)}
${discountRow}*Net Earnings:* ₹${order.netEarnings.toFixed(0)}
`.trim();
    }

    async shutdown(): Promise<void> {
        if (this.whatsApp) {
            await this.whatsApp.destroy();
        }
    }
}
