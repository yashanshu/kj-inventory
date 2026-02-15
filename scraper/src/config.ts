import 'dotenv/config';

export interface Shift {
    open: number;
    close: number;
}

const DEFAULT_SHIFTS: Shift[] = [
    { open: 12, close: 15 },
    { open: 19, close: 3 },
];

function parseShifts(): Shift[] {
    const shiftsEnv = process.env.RESTAURANT_SHIFTS;
    if (shiftsEnv) {
        try {
            return JSON.parse(shiftsEnv);
        } catch (e) {
            console.error('Invalid RESTAURANT_SHIFTS format, using defaults');
        }
    }
    return DEFAULT_SHIFTS;
}

function parseRestaurantMap(): Record<string, string> {
    const mapEnv = process.env.RESTAURANT_MAP_JSON;
    if (mapEnv) {
        try {
            return JSON.parse(mapEnv);
        } catch (e) {
            console.error('Invalid RESTAURANT_MAP_JSON format, using empty map');
        }
    }
    return {};
}

export const config = {
    // Toggles
    enableWhatsApp: process.env.ENABLE_WHATSAPP === 'true',
    enableTelegram: process.env.ENABLE_TELEGRAM !== 'false', // Default true
    enableFCM: process.env.ENABLE_FCM !== 'false',           // Default true

    // Puppeteer / Browser
    puppeteerHeadless: process.env.PUPPETEER_HEADLESS !== 'false', // Default true

    // General
    pollInterval: parseInt(process.env.POLL_INTERVAL_MS || '30000', 10),
    shifts: parseShifts(),
    restaurantMap: parseRestaurantMap(),

    // Swiggy
    swiggyMobile: process.env.SWIGGY_MOBILE,

    // WhatsApp
    whatsAppToNumber: process.env.WHATSAPP_TO_NUMBER, // e.g. 919999999999@c.us

    // Telegram
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,

    // Firebase
    firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    firebaseFcmToken: process.env.FIREBASE_FCM_TOKEN,

    // KJ API
    kjApiUrl: process.env.KJ_API_URL,
    kjApiToken: process.env.KJ_API_TOKEN,

    // Test notification on startup
    testNotificationOnStartup: process.env.TEST_NOTIFICATION_ON_STARTUP === 'true',

    // API server
    apiPort: parseInt(process.env.API_PORT || '3001', 10),

    // Menu fetch settings
    menuFetchHour: parseInt(process.env.MENU_FETCH_HOUR || '18', 10),
    menuRestaurantLat: parseFloat(process.env.MENU_RESTAURANT_LAT || '0'),
    menuRestaurantLng: parseFloat(process.env.MENU_RESTAURANT_LNG || '0'),
};
