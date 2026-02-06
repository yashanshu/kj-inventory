/**
 * Swiggy Partner Login Script
 * 
 * Opens a browser window for manual OTP login.
 * After successful login, saves cookies and headers to data/session.json
 * 
 * Usage: pnpm run login
 */

import { chromium, type Cookie } from 'playwright';
import fs from 'fs-extra';
import path from 'path';

interface Session {
    cookies: Cookie[];
    userAgent: string;
    headers: Record<string, string>;
    restaurantIds: number[];
    capturedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SESSION_FILE = path.join(DATA_DIR, 'session.json');
const SWIGGY_PARTNER_URL = 'https://partner.swiggy.com';

async function login(): Promise<void> {
    console.log('Starting Swiggy Partner login...');
    console.log('A browser window will open. Please log in with your mobile number and OTP.\n');

    await fs.ensureDir(DATA_DIR);

    const browser = await chromium.launch({
        headless: false, // Need visible browser for OTP entry
        args: ['--start-maximized'],
    });

    const context = await browser.newContext({
        viewport: null, // Full screen
    });

    const page = await context.newPage();

    // Track restaurant IDs from API responses
    let restaurantIds: number[] = [];

    // Intercept API calls to capture restaurant IDs
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('/orders/v1/fetch') && response.status() === 200) {
            try {
                const data = await response.json();
                if (data.restaurantData) {
                    restaurantIds = data.restaurantData.map((r: any) => r.restaurantId);
                    console.log(`Captured ${restaurantIds.length} restaurant IDs: ${restaurantIds.join(', ')}`);
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
    });

    // Navigate to partner portal
    await page.goto(SWIGGY_PARTNER_URL);

    console.log('Waiting for you to complete login...');
    console.log('   After login, navigate to the Orders page and wait for it to load.\n');

    // Wait for orders page to load (indicates successful login)
    await page.waitForURL('**/orders**', { timeout: 300000 }); // 5 min timeout

    console.log('Login detected! Waiting for orders API to be called...');

    // Wait a bit for API calls to complete
    await page.waitForTimeout(5000);

    // If we didn't capture restaurant IDs, try refreshing
    if (restaurantIds.length === 0) {
        console.log('Refreshing page to capture restaurant data...');
        await page.reload();
        await page.waitForTimeout(5000);
    }

    // Capture session data
    const cookies = await context.cookies();
    // @ts-ignore
    const userAgent = await page.evaluate(() => navigator.userAgent);

    const session: Session = {
        cookies,
        userAgent,
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/json',
            'Origin': SWIGGY_PARTNER_URL,
            'Referer': `${SWIGGY_PARTNER_URL}/orders`,
        },
        restaurantIds,
        capturedAt: new Date().toISOString(),
    };

    await fs.writeJson(SESSION_FILE, session, { spaces: 2 });

    console.log('\nSession saved successfully!');
    console.log(`Session file: ${SESSION_FILE}`);
    console.log(`Restaurants: ${restaurantIds.length > 0 ? restaurantIds.join(', ') : 'None captured (will auto-detect on first poll)'}`);
    console.log('\nYou can now close this browser and run: npm start');

    await browser.close();
}

login().catch((error) => {
    console.error('Login failed:', error.message);
    process.exit(1);
});
