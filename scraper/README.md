# KJ Order Scraper

Swiggy/Zomato order scraper with real-time notifications.

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
pnpm exec playwright install chromium
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Login (Interactive)
```bash
pnpm run login
```
This opens a browser window. Log in with your Swiggy partner credentials (mobile + OTP).
After login, session is saved to `data/session.json`.

### 4. Start Polling
```bash
pnpm start
```

## Notifications

### Telegram
1. Create a bot via [@BotFather](https://t.me/botfather)
2. Get your chat ID (message [@userinfobot](https://t.me/userinfobot))
3. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`

### Android FCM
1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Download service account JSON → save to `config/firebase-service-account.json`
3. Get FCM token from your Android app
4. Set `FIREBASE_FCM_TOKEN` in `.env`

## Session Expiry

Swiggy sessions typically last days/weeks. If session expires:
1. You'll get a notification
2. Run `pnpm run login` again (< 1 min)

