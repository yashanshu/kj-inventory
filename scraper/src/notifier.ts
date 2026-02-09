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
    totalAmount: number; // Subtotal
    discount: number;
    netAmount: number; // Final Bill
    customerName?: string;
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

    async notifyNewOrder(order: OrderNotification): Promise<void> {
        const message = this.formatOrderMessage(order);
        const waMessage = this.formatWhatsAppMessage(order);

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
                        title: `New ${order.platform.toUpperCase()} Order! (${order.status})`,
                        body: `Rs.${order.netAmount} - ${order.items.length} item(s)`,
                    },
                    data: {
                        orderId: order.orderId,
                        platform: order.platform,
                        restaurantId: String(order.restaurantId),
                        totalAmount: String(order.netAmount),
                        status: order.status
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

    async notifySessionExpired(): Promise<void> {
        const message = '<b>Session Expired!</b>\n\nYour Swiggy session has expired. Please run:\n<code>pnpm run login</code>';
        const plainMessage = '⚠️ Session Expired!\n\nYour Swiggy session has expired. Please run: pnpm run login';

        const promises: Promise<void>[] = [];

        if (this.telegramBot && config.telegramChatId) {
            promises.push(this.telegramBot.sendMessage(config.telegramChatId, message, { parse_mode: 'HTML' }).then(() => { }));
        }

        if (this.whatsApp) {
            promises.push(this.whatsApp.sendMessage(plainMessage).then(() => { }));
        }

        if (this.fcmInitialized && config.firebaseFcmToken) {
            promises.push(admin.messaging().send({
                token: config.firebaseFcmToken,
                notification: {
                    title: 'Session Expired',
                    body: 'Please re-login to continue receiving order notifications',
                },
                android: { priority: 'high' },
            }).then(() => { }));
        }

        await Promise.allSettled(promises);
    }

    private formatOrderMessage(order: OrderNotification): string {
        const itemsList = order.items
            .map(item => `  • ${item.quantity}x ${item.name} (₹${item.price})`)
            .join('\n');

        const prepTime = order.prepTime ? `${order.prepTime} mins` : 'N/A';
        const discountRow = order.discount > 0 ? `<b>Discount:</b> -Rs.${order.discount}\n` : '';

        return `
<b>New ${order.platform.toUpperCase()} Order!</b>

<b>Order ID:</b> ${order.orderId}
<b>Status:</b> ${order.status.toUpperCase()}
<b>Restaurant:</b> ${order.restaurantName || order.restaurantId}
<b>Customer:</b> ${order.customerName || 'Unknown'}
<b>Time:</b> ${new Date(order.orderDate).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
<b>Prep Time:</b> ${prepTime}

<b>Items:</b>
${itemsList || '  (items not available)'}

<b>Subtotal:</b> Rs.${order.totalAmount}
${discountRow}<b>Net Total:</b> Rs.${order.netAmount}
`.trim();
    }

    private formatWhatsAppMessage(order: OrderNotification): string {
        const itemsList = order.items
            .map(item => `  • ${item.quantity}x ${item.name} (₹${item.price})`)
            .join('\n');

        const prepTime = order.prepTime ? `${order.prepTime} mins` : 'N/A';
        const discountRow = order.discount > 0 ? `Discount: -Rs.${order.discount}\n` : '';

        return `
*New ${order.platform.toUpperCase()} Order!*

*Order ID:* ${order.orderId}
*Status:* ${order.status.toUpperCase()}
*Restaurant:* ${order.restaurantName || order.restaurantId}
*Customer:* ${order.customerName || 'Unknown'}
*Time:* ${new Date(order.orderDate).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
*Prep Time:* ${prepTime}

*Items:*
${itemsList || '  (items not available)'}

*Subtotal:* Rs.${order.totalAmount}
${discountRow}*Net Total:* Rs.${order.netAmount}
`.trim();
    }
}
