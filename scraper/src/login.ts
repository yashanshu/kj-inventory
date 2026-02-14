/**
 * Swiggy Partner Login Script
 * 
 * Opens a browser window for manual OTP login.
 * After successful login, saves cookies and headers to data/session.json
 * 
 * Usage:
 *   pnpm run login              - Fresh login with OTP
 *   pnpm run login -- --restore - Open browser with existing session
 *   pnpm run login -- --manual  - Paste cookies from browser DevTools
 */

import { chromium, type Cookie } from 'playwright';
import fs from 'fs-extra';
import path from 'path';
import readline from 'readline';

interface Session {
    cookies: Cookie[];
    accessToken: string;
    userAgent: string;
    headers: Record<string, string>;
    restaurantIds: number[];
    capturedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SESSION_FILE = path.join(DATA_DIR, 'session.json');
const SWIGGY_PARTNER_URL = 'https://partner.swiggy.com';

const isRestore = process.argv.includes('--restore');
const isManual = process.argv.includes('--manual');

async function restoreSession(): Promise<void> {
    console.log('Restoring session from saved data...\n');

    if (!await fs.pathExists(SESSION_FILE)) {
        console.error(`No session file found at ${SESSION_FILE}`);
        console.error('Run "pnpm run login" first to create a session.');
        process.exit(1);
    }

    const session: Session = await fs.readJson(SESSION_FILE);
    console.log(`Session captured at: ${session.capturedAt}`);
    console.log(`Restaurants: ${session.restaurantIds.join(', ') || 'none'}`);

    // Check for obviously expired cookies
    const now = Date.now() / 1000;
    const expiredCount = session.cookies.filter(c => c.expires > 0 && c.expires < now).length;
    if (expiredCount > 0) {
        console.warn(`\n⚠️  ${expiredCount} of ${session.cookies.length} cookies have expired. Session may not work.\n`);
    }

    const browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized'],
    });

    const context = await browser.newContext({
        viewport: null,
        userAgent: session.userAgent,
    });

    // Inject saved cookies
    await context.addCookies(session.cookies);

    const page = await context.newPage();

    // Navigate to orders page directly
    console.log('Opening partner portal with saved session...');
    await page.goto(`${SWIGGY_PARTNER_URL}/food/orders`);

    console.log('\n✅ Browser opened with restored session.');
    console.log('   If you see the login page, the session has expired — run "pnpm run login" for a fresh one.');
    console.log('   Close the browser window when you are done.\n');

    // Periodically snapshot cookies so we can save the latest on exit
    let latestCookies = session.cookies;
    let latestUserAgent = session.userAgent;

    const snapshotInterval = setInterval(async () => {
        try {
            latestCookies = await context.cookies();
            // @ts-ignore
            latestUserAgent = await page.evaluate(() => navigator.userAgent);
        } catch {
            // page/context may already be closing
        }
    }, 10_000);

    // Wait for the browser to be closed by the user
    await new Promise<void>((resolve) => {
        browser.on('disconnected', () => resolve());
    });

    clearInterval(snapshotInterval);

    // Save the last captured session data
    const updatedSession: Session = {
        ...session,
        cookies: latestCookies,
        userAgent: latestUserAgent,
        capturedAt: new Date().toISOString(),
    };

    await fs.writeJson(SESSION_FILE, updatedSession, { spaces: 2 });
    console.log('Session re-saved successfully.');
}

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

    // Track restaurant IDs and access token from API responses
    let restaurantIds: number[] = [];
    let accessToken = '';

    // Intercept API requests/responses to capture access token and restaurant IDs
    page.on('request', (request) => {
        const url = request.url();
        if (url.includes('/orders/') && !accessToken) {
            const token = request.headers()['accesstoken'] || request.headers()['access_token'];
            if (token) {
                accessToken = token;
                console.log(`Captured access token: ${token.substring(0, 8)}...`);
            }
        }
    });

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

    // Wait for the orders page to be opened 2 times before closing the browser.
    // This gives the user time to verify the session and ensures cookies are fully set.
    const REQUIRED_ORDERS_VISITS = 2;
    let ordersVisitCount = 0;

    // Wait for first orders page visit (indicates successful login)
    // The actual URL is /food/orders or /food/#!/orders
    await page.waitForURL('**orders**', { timeout: 300000 }); // 5 min timeout
    ordersVisitCount++;
    console.log(`[Orders tab visit ${ordersVisitCount}/${REQUIRED_ORDERS_VISITS}] Login detected! Orders page loaded.`);

    console.log('Waiting for orders API to be called...');

    // Wait a bit for API calls to complete
    await page.waitForTimeout(5000);

    // If we didn't capture restaurant IDs, try refreshing
    if (restaurantIds.length === 0) {
        console.log('Refreshing page to capture restaurant data...');
        await page.reload();
        await page.waitForTimeout(5000);
    }

    // Wait for the orders page to be visited a second time
    console.log(`\nWaiting for orders tab to be opened again (${ordersVisitCount}/${REQUIRED_ORDERS_VISITS})...`);
    console.log('   Navigate away and come back to /orders, or refresh the page.\n');

    // Listen for subsequent navigations to /orders
    await new Promise<void>((resolve) => {
        const checkUrl = () => {
            const url = page.url();
            if (url.includes('/orders')) {
                ordersVisitCount++;
                console.log(`[Orders tab visit ${ordersVisitCount}/${REQUIRED_ORDERS_VISITS}] Orders page loaded.`);
                if (ordersVisitCount >= REQUIRED_ORDERS_VISITS) {
                    resolve();
                }
            }
        };
        page.on('framenavigated', checkUrl);
    });

    // Wait a moment for any final cookies to settle
    await page.waitForTimeout(2000);

    // Capture session data
    const cookies = await context.cookies();
    // @ts-ignore
    const userAgent = await page.evaluate(() => navigator.userAgent);

    // The access token is the Swiggy_Session-alpha cookie value.
    // If we didn't capture it from request headers, extract it from cookies.
    if (!accessToken) {
        const alphaCookie = cookies.find(c => c.name === 'Swiggy_Session-alpha');
        if (alphaCookie) {
            accessToken = alphaCookie.value;
            console.log(`Extracted access token from Swiggy_Session-alpha cookie: ${accessToken.substring(0, 8)}...`);
        }
    }

    console.log(`\nCaptured ${cookies.length} cookies.`);
    console.log(`Access token: ${accessToken ? accessToken.substring(0, 8) + '...' : 'NOT CAPTURED'}`);
    if (!accessToken) {
        console.warn('⚠️  WARNING: No access token was captured! The session will not work.');
        console.warn('   Try "pnpm run login -- --manual" and paste the token from your browser.');
    }

    const session: Session = {
        cookies,
        accessToken,
        userAgent,
        headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/json',
            'Origin': SWIGGY_PARTNER_URL,
            'Referer': `${SWIGGY_PARTNER_URL}/`,
        },
        restaurantIds,
        capturedAt: new Date().toISOString(),
    };

    await fs.writeJson(SESSION_FILE, session, { spaces: 2 });

    console.log('\nSession saved successfully!');
    console.log(`Session file: ${SESSION_FILE}`);
    console.log(`Access token: ${accessToken ? 'saved' : 'MISSING'}`);
    console.log(`Cookies: ${cookies.length} saved`);
    console.log(`Restaurants: ${restaurantIds.length > 0 ? restaurantIds.join(', ') : 'None captured (will auto-detect on first poll)'}`);
    console.log('\nYou can now close this browser and run: npm start');

    await browser.close();
}

function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function manualEntry(): Promise<void> {
    console.log('Manual session entry mode');
    console.log('=========================\n');
    console.log('Steps to get the access token from your browser:\n');
    console.log('  Option A — Console (easiest):');
    console.log('    1. Open https://partner.swiggy.com/food/orders in Firefox/Chrome');
    console.log('    2. Log in if needed');
    console.log('    3. Open DevTools (F12) → Console tab');
    console.log('    4. Run: document.cookie.match(/Swiggy_Session-alpha=([^;]+)/)?.[1]');
    console.log('    5. Copy the UUID value\n');
    console.log('  Option B — Network tab:');
    console.log('    1. Open DevTools (F12) → Network tab');
    console.log('    2. Look for a request to rms.swiggy.com/orders/v1/fetchOrders');
    console.log('    3. Click it → Headers → copy the "accesstoken" value\n');

    const accessToken = await prompt('Paste access token: ');

    if (!accessToken) {
        console.error('No access token provided. Aborting.');
        process.exit(1);
    }

    // Load existing session to preserve restaurantIds, or start fresh
    await fs.ensureDir(DATA_DIR);
    let restaurantIds: number[] = [];
    let existingCookies: Cookie[] = [];
    if (await fs.pathExists(SESSION_FILE)) {
        const existing: Session = await fs.readJson(SESSION_FILE);
        restaurantIds = existing.restaurantIds || [];
        existingCookies = existing.cookies || [];
        console.log(`Keeping existing restaurant IDs: ${restaurantIds.join(', ') || 'none'}`);
    }

    const session: Session = {
        cookies: existingCookies,
        accessToken: accessToken.trim(),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0',
        headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/json',
            'Origin': SWIGGY_PARTNER_URL,
            'Referer': `${SWIGGY_PARTNER_URL}/`,
        },
        restaurantIds,
        capturedAt: new Date().toISOString(),
    };

    await fs.writeJson(SESSION_FILE, session, { spaces: 2 });

    console.log('\nSession saved successfully!');
    console.log(`Session file: ${SESSION_FILE}`);
    console.log(`Access token: ${accessToken.substring(0, 8)}...`);
    console.log(`Restaurants: ${restaurantIds.length > 0 ? restaurantIds.join(', ') : 'None (will auto-detect on first poll)'}`);
    console.log('\nYou can now run: npm start');
}

const main = isManual ? manualEntry : isRestore ? restoreSession : login;

main().catch((error) => {
    console.error(`${isRestore ? 'Restore' : 'Login'} failed:`, error.message);
    process.exit(1);
});
