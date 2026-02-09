import 'dotenv/config';
import { NotificationService } from '../notifier.js';
import { config } from '../config.js';

async function testNotifs() {
    console.log('Testing Notifications...');
    console.log('Config:', JSON.stringify({
        whatsApp: config.enableWhatsApp,
        telegram: config.enableTelegram,
        fcm: config.enableFCM,
        whatsAppTo: config.whatsAppToNumber
    }, null, 2));

    const notifier = new NotificationService();
    await notifier.initialize();

    const testOrder = {
        orderId: `TEST-${Date.now()}`,
        restaurantId: 101,
        restaurantName: 'Test Restaurant',
        items: [
            { name: 'Butter Chicken', quantity: 1, price: 350 },
            { name: 'Naan', quantity: 2, price: 60 }
        ],
        totalAmount: 470,
        discount: 0,
        netAmount: 470,
        customerName: 'Test User',
        platform: 'swiggy' as const,
        status: 'ordered',
        orderDate: new Date().toISOString(),
        prepTime: 25
    };

    console.log('\nSending Test Order...');
    await notifier.notifyNewOrder(testOrder);

    console.log('\nWaiting 5 seconds before exit...');
    await new Promise(r => setTimeout(r, 5000));
    console.log('Done.');
    process.exit(0);
}

testNotifs().catch(console.error);
