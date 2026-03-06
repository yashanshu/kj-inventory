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
            { name: 'Butter Chicken', quantity: 1, price: 350, finalPrice: 280, variant: 'Quarter (2 pcs)' },
            { name: 'Naan', quantity: 2, price: 60, finalPrice: 60, variant: 'Plain' }
        ],
        orderValue: 470,
        subtotal: 470,
        packingCharge: 10,
        restaurantDiscount: 94,
        netEarnings: 376,
        offerDescription: '20% off',
        customerName: 'Test User',
        customerArea: 'Sector 54, Gurgaon',
        specialInstructions: 'Less spicy please',
        platform: 'swiggy' as const,
        status: 'ordered',
        orderDate: new Date().toISOString(),
        prepTime: 25,
        orderNumber: 5
    };

    console.log('\nSending Test Order...');
    await notifier.notifyNewOrder(testOrder, testOrder.orderNumber);

    console.log('\nWaiting 5 seconds before exit...');
    await new Promise(r => setTimeout(r, 5000));
    console.log('Done.');
    process.exit(0);
}

testNotifs().catch(console.error);
