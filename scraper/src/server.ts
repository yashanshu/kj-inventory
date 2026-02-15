import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { config, Shift } from './config.js';
import type { NotificationService } from './notifier.js';
import type { SwiggyClient } from './swiggy-client.js';
import type { KJApiClient } from './kj-api-client.js';

interface ServerDeps {
    notifier: NotificationService;
    swiggy: SwiggyClient;
    kjApi: KJApiClient;
    runPollCycle: () => Promise<void>;
    forceMenuFetch: () => Promise<void>;
    getPollingState: () => { running: boolean; consecutiveErrors: number };
    restartPolling: () => void;
}

const startTime = Date.now();

export function createServer(deps: ServerDeps) {
    const app = new Hono();

    app.get('/health', (c) => {
        const state = deps.getPollingState();
        return c.json({
            status: 'ok',
            uptime: Math.floor((Date.now() - startTime) / 1000),
            polling: state.running,
            consecutiveErrors: state.consecutiveErrors,
        });
    });

    app.get('/config', (c) => {
        return c.json({
            pollInterval: config.pollInterval,
            shifts: config.shifts,
            restaurantMap: config.restaurantMap,
            menuFetchHour: config.menuFetchHour,
            enableWhatsApp: config.enableWhatsApp,
            enableTelegram: config.enableTelegram,
            enableFCM: config.enableFCM,
        });
    });

    app.post('/poll-now', async (c) => {
        deps.runPollCycle();
        return c.json({ message: 'Poll cycle triggered' });
    });

    app.put('/config/shifts', async (c) => {
        const body = await c.req.json<{ shifts: Shift[] }>();
        if (!Array.isArray(body.shifts) || body.shifts.length === 0) {
            return c.json({ error: 'shifts must be a non-empty array of {open, close}' }, 400);
        }
        for (const s of body.shifts) {
            if (typeof s.open !== 'number' || typeof s.close !== 'number' ||
                s.open < 0 || s.open > 23 || s.close < 0 || s.close > 23) {
                return c.json({ error: 'Each shift must have open/close as 0-23' }, 400);
            }
        }
        config.shifts = body.shifts;
        console.log('Shifts updated via API:', JSON.stringify(config.shifts));
        return c.json({ shifts: config.shifts });
    });

    app.put('/config/interval', async (c) => {
        const body = await c.req.json<{ intervalMs: number }>();
        if (typeof body.intervalMs !== 'number' || body.intervalMs < 5000) {
            return c.json({ error: 'intervalMs must be a number >= 5000' }, 400);
        }
        config.pollInterval = body.intervalMs;
        deps.restartPolling();
        console.log(`Poll interval updated via API: ${config.pollInterval}ms`);
        return c.json({ pollInterval: config.pollInterval });
    });

    app.post('/test-notification', async (c) => {
        await deps.notifier.sendTestNotification();
        return c.json({ message: 'Test notification sent' });
    });

    app.post('/fetch-menu', async (c) => {
        deps.forceMenuFetch();
        return c.json({ message: 'Menu fetch triggered' });
    });

    serve({ fetch: app.fetch, port: config.apiPort }, () => {
        console.log(`Scraper API listening on port ${config.apiPort}`);
    });
}
