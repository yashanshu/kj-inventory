import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import path from 'path';
import { config } from './config.js';

export class WhatsAppService {
    private client: Client | null = null;
    private isReady = false;

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
                    '--disable-renderer-backgrounding'
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

            await this.client.sendMessage(formattedTo, text);
            console.log(`WhatsApp message sent to ${to}`);
        } catch (error) {
            console.error('Failed to send WhatsApp message:', error);
        }
    }

    isClientReady(): boolean {
        return this.isReady;
    }
}
