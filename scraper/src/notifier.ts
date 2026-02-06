/**
 * Notification Service
 * 
 * Sends notifications via Telegram and Android FCM
 */

import TelegramBot from 'node-telegram-bot-api';
import admin from 'firebase-admin';
import fs from 'fs-extra';
import path from 'path';

interface OrderNotification {
    orderId: string;
    restaurantId: number;
    restaurantName?: string;
    items: { name: string; quantity: number; price: number }[];
    totalAmount: number;
    customerName?: string;
    platform: 'swiggy' | 'zomato';
}

export class NotificationService {
    private telegramBot: TelegramBot | null = null;
    private telegramChatId: string | null = null;
    private fcmToken: string | null = null;
    private fcmInitialized = false;

    async initialize(): Promise<void> {
        // Initialize Telegram
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        this.telegramChatId = process.env.TELEGRAM_CHAT_ID || null;

        if (telegramToken && this.telegramChatId) {
            this.telegramBot = new TelegramBot(telegramToken, { polling: false });
            console.log('Telegram notifications enabled');
        } else {
            console.log('Telegram notifications disabled (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
        }

        // Initialize Firebase Cloud Messaging
        const fcmPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
        this.fcmToken = process.env.FIREBASE_FCM_TOKEN || null;

        if (fcmPath && this.fcmToken && await fs.pathExists(fcmPath)) {
            try {
                const serviceAccount = await fs.readJson(fcmPath);

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
            console.log('FCM notifications disabled (missing config or token)');
        }
    }

    async notifyNewOrder(order: OrderNotification): Promise<void> {
        const message = this.formatOrderMessage(order);

        // Send Telegram notification
        if (this.telegramBot && this.telegramChatId) {
            try {
                await this.telegramBot.sendMessage(this.telegramChatId, message, {
                    parse_mode: 'HTML',
                });
                console.log(`Telegram notification sent for order ${order.orderId}`);
            } catch (error) {
                console.error('Telegram notification failed:', error);
            }
        }

        // Send FCM notification
        if (this.fcmInitialized && this.fcmToken) {
            try {
                await admin.messaging().send({
                    token: this.fcmToken,
                    notification: {
                        title: `New ${order.platform.toUpperCase()} Order!`,
                        body: `Rs.${order.totalAmount} - ${order.items.length} item(s)`,
                    },
                    data: {
                        orderId: order.orderId,
                        platform: order.platform,
                        restaurantId: String(order.restaurantId),
                        totalAmount: String(order.totalAmount),
                    },
                    android: {
                        priority: 'high',
                        notification: {
                            channelId: 'orders',
                            priority: 'high',
                            sound: 'default',
                        },
                    },
                });
                console.log(`FCM notification sent for order ${order.orderId}`);
            } catch (error) {
                console.error('FCM notification failed:', error);
            }
        }
    }

    async notifySessionExpired(): Promise<void> {
        const message = '<b>Session Expired!</b>\n\nYour Swiggy session has expired. Please run:\n<code>pnpm run login</code>';

        if (this.telegramBot && this.telegramChatId) {
            try {
                await this.telegramBot.sendMessage(this.telegramChatId, message, {
                    parse_mode: 'HTML',
                });
            } catch (error) {
                console.error('Telegram notification failed:', error);
            }
        }

        if (this.fcmInitialized && this.fcmToken) {
            try {
                await admin.messaging().send({
                    token: this.fcmToken,
                    notification: {
                        title: 'Session Expired',
                        body: 'Please re-login to continue receiving order notifications',
                    },
                    android: {
                        priority: 'high',
                    },
                });
            } catch (error) {
                console.error('FCM notification failed:', error);
            }
        }
    }

    private formatOrderMessage(order: OrderNotification): string {
        const itemsList = order.items
            .map(item => `  • ${item.quantity}x ${item.name} (₹${item.price})`)
            .join('\n');

        return `
<b>New ${order.platform.toUpperCase()} Order!</b>

<b>Order ID:</b> ${order.orderId}
<b>Restaurant:</b> ${order.restaurantName || order.restaurantId}
${order.customerName ? `<b>Customer:</b> ${order.customerName}\n` : ''}
<b>Items:</b>
${itemsList || '  (items not available)'}

<b>Total:</b> Rs.${order.totalAmount}
`.trim();
    }
}
