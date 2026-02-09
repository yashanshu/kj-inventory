
import 'dotenv/config';
import { SwiggyClient } from './swiggy-client.js';
import { NotificationService } from './notifier.js';

async function verifySummary() {
    console.log('Starting Daily Summary Verification...');

    const swiggy = new SwiggyClient();
    const notifier = new NotificationService();

    // Load session
    const sessionLoaded = await swiggy.loadSession();
    if (!sessionLoaded) {
        console.error('Session not loaded. Please run pnpm run login first.');
        return;
    }

    await notifier.initialize();

    // Calculate Yesterday's range (IST)
    // Same logic as index.ts
    const istOffset = 5.5 * 60 * 60 * 1000;
    const now = new Date(new Date().getTime() + istOffset);

    // Check what "yesterday" means relative to now
    const todayStr = now.toISOString().split('T')[0];
    console.log(`Current IST Date: ${todayStr}`);

    const msPerDay = 24 * 60 * 60 * 1000;

    const getISTMidnightParams = (dateObj: Date) => {
        const utcNow = dateObj.getTime();
        const istNow = utcNow + (5.5 * 60 * 60 * 1000);
        const istMidnight = Math.floor(istNow / msPerDay) * msPerDay;
        const utcForIstMidnight = istMidnight - (5.5 * 60 * 60 * 1000);
        return utcForIstMidnight;
    };

    const todayMidnightUTC = getISTMidnightParams(new Date());
    const yesterdayMidnightUTC = todayMidnightUTC - msPerDay;
    const yesterdayEndUTC = yesterdayMidnightUTC + msPerDay - 1000;

    console.log(`Requesting metrics for:`);
    console.log(`From (UTC): ${new Date(yesterdayMidnightUTC).toISOString()}`);
    console.log(`To   (UTC): ${new Date(yesterdayEndUTC).toISOString()}`);
    console.log(`From (TS): ${yesterdayMidnightUTC}`);
    console.log(`To   (TS): ${yesterdayEndUTC}`);

    try {
        const metrics = await swiggy.getBusinessMetrics(yesterdayMidnightUTC, yesterdayEndUTC);

        if (metrics) {
            console.log('Metrics received successfully!');
            console.log('Sending notifications...');
            await notifier.sendDailySummary(metrics);
            console.log('Notifications sent.');
        } else {
            console.error('No metrics received (null).');
        }
    } catch (error: any) {
        console.error('Error during verification:', error.message);
    }
}

verifySummary().catch(console.error);
