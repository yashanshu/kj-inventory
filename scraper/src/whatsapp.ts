import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import path from 'path';
import { config } from './config.js';

const SEND_TIMEOUT_MS = 15_000; // 15s max for sendMessage
const MAX_CONSECUTIVE_FAILURES = 3;

export class WhatsAppService {
    private client: Client | null = null;
    private isReady = false;
    private consecutiveFailures = 0;
    private restarting = false;

    async initialize(): Promise<void> {
        if (!config.enableWhatsApp) {
            console.log('WhatsApp notifications disabled (ENABLE_WHATSAPP != true)');
            return;
        }

        console.log('Initializing WhatsApp Service...');

        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: path.join(process.cwd(), 'data', 'wwebjs_auth')
            }),
            puppeteer: {
                headless: config.puppeteerHeadless,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--disable-extensions',
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                ],
                timeout: 60000 // 60 seconds timeout
            }
        });

        this.client.on('qr', (qr) => {
            console.log('\n=============================================================');
            console.log('WHATSAPP QR CODE RECEIVED');
            console.log('Scan this code with WhatsApp (Linked Devices) to login:');
            console.log('=============================================================\n');
            qrcode.generate(qr, { small: true });
        });

        this.client.on('ready', async () => {
            console.log('WhatsApp Client is ready!');
            // Small delay to ensure complete initialization
            await new Promise(resolve => setTimeout(resolve, 2000));
            this.isReady = true;
        });

        this.client.on('authenticated', () => {
            console.log('WhatsApp Authenticated!');
        });

        this.client.on('auth_failure', (msg) => {
            console.error('WhatsApp Authentication Failure:', msg);
            this.isReady = false;
        });

        this.client.on('disconnected', (reason) => {
            console.warn('WhatsApp Disconnected:', reason);
            this.isReady = false;
            // Client usually destroys itself on disconnect, logic to re-init might be needed 
            // but whatsapp-web.js often handles some reconnection or we just let the process restart if crucial
            // For now, let's just log it. 
        });

        try {
            await this.client.initialize();

            // Wait for ready state with timeout
            console.log('Waiting for WhatsApp to be ready (this may take up to 2 minutes)...');
            const maxWaitTime = 120000; // 2 minutes
            const startTime = Date.now();
            let lastLogTime = startTime;

            while (!this.isReady && (Date.now() - startTime) < maxWaitTime) {
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Log progress every 15 seconds
                const elapsed = Date.now() - lastLogTime;
                if (elapsed >= 15000) {
                    const totalElapsed = Math.floor((Date.now() - startTime) / 1000);
                    console.log(`   Still waiting... (${totalElapsed}s elapsed)`);
                    lastLogTime = Date.now();
                }
            }

            if (!this.isReady) {
                console.warn('WhatsApp client initialized but not ready after timeout');
                console.warn('Messages will NOT be sent via WhatsApp');
            } else {
                console.log('WhatsApp is ready and will send notifications');
            }
        } catch (error) {
            console.error('Failed to initialize WhatsApp client:', error);
            // Don't throw - let the service continue without WhatsApp
            this.client = null;
            this.isReady = false;
        }
    }

    async sendMessage(text: string): Promise<void> {
        if (!config.enableWhatsApp || !this.client || !this.isReady) {
            return;
        }

        const to = config.whatsAppToNumber;
        if (!to) {
            console.warn('WhatsApp enabled but WHATSAPP_TO_NUMBER not set.');
            return;
        }

        try {
            // Ensure number is in correct format
            let formattedTo = to.replace('+', '').replace(/\s/g, '');

            // If it doesn't have a suffix, default to individual contact (@c.us)
            // Groups always end in @g.us
            if (!formattedTo.endsWith('@c.us') && !formattedTo.endsWith('@g.us')) {
                formattedTo += '@c.us';
            }

            // Race against timeout to prevent blocking the poll cycle
            const sendPromise = this.client.sendMessage(formattedTo, text);
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('WhatsApp send timed out after 15s')), SEND_TIMEOUT_MS)
            );

            await Promise.race([sendPromise, timeoutPromise]);
            console.log(`WhatsApp message sent to ${to}`);
            this.consecutiveFailures = 0;
        } catch (error) {
            this.consecutiveFailures++;
            console.error('Failed to send WhatsApp message:', error);

            if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                console.warn(`WhatsApp failed ${this.consecutiveFailures} times in a row, restarting client...`);
                await this.restart();
            }
        }
    }

    private async restart(): Promise<void> {
        if (this.restarting) return;
        this.restarting = true;

        try {
            this.isReady = false;
            if (this.client) {
                try { await this.client.destroy(); } catch {}
            }
            this.client = null;
            this.consecutiveFailures = 0;

            // Re-initialize after a brief pause
            await new Promise(resolve => setTimeout(resolve, 5000));
            await this.initialize();
        } finally {
            this.restarting = false;
        }
    }

    isClientReady(): boolean {
        return this.isReady;
    }

    async destroy(): Promise<void> {
        if (this.client) {
            try {
                await this.client.destroy();
                console.log('WhatsApp client destroyed');
            } catch (error) {
                console.error('Error destroying WhatsApp client:', error);
            }
            this.client = null;
            this.isReady = false;
        }
    }
}
