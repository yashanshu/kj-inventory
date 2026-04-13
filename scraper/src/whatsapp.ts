import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    type ConnectionState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import path from 'path';
import { config } from './config.js';

const SEND_TIMEOUT_MS = 15_000;

export class WhatsAppService {
    private sock: ReturnType<typeof makeWASocket> | null = null;
    private isReady = false;
    private shouldReconnect = true;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private waVersion: [number, number, number] | undefined;

    async initialize(): Promise<void> {
        if (!config.enableWhatsApp) {
            console.log('WhatsApp notifications disabled (ENABLE_WHATSAPP != true)');
            return;
        }

        console.log('Initializing WhatsApp Service...');
        this.shouldReconnect = true;

        // Fetch version once — not on every reconnect
        try {
            const { version } = await fetchLatestBaileysVersion();
            this.waVersion = version;
        } catch {
            console.warn('Could not fetch latest Baileys version, using fallback.');
            this.waVersion = [2, 3000, 1015901307] as [number, number, number];
        }

        await this.connect();
    }

    private async connect(): Promise<void> {
        // Tear down any existing socket and its listeners before creating a new one
        if (this.sock) {
            (this.sock.ev as any).removeAllListeners();
            try { this.sock.end(undefined); } catch {}
            this.sock = null;
        }

        const authDir = path.join(process.cwd(), 'data', 'baileys_auth');
        const { state, saveCreds } = await useMultiFileAuthState(authDir);

        const silentLogger = P({ level: 'silent' });

        this.sock = makeWASocket({
            version: this.waVersion,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
            },
            printQRInTerminal: true,
            logger: silentLogger,
            generateHighQualityLinkPreview: false,
            syncFullHistory: false,
        });

        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('connection.update', ({ connection, lastDisconnect }: Partial<ConnectionState>) => {
            if (connection === 'open') {
                console.log('WhatsApp Client is ready!');
                this.isReady = true;
            } else if (connection === 'close') {
                this.isReady = false;
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                const loggedOut = statusCode === DisconnectReason.loggedOut;

                if (loggedOut) {
                    console.error('WhatsApp logged out — delete data/baileys_auth and re-scan QR code.');
                    this.shouldReconnect = false;
                } else if (this.shouldReconnect) {
                    console.warn(`WhatsApp disconnected (code=${statusCode}), reconnecting in 5s...`);
                    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
                }
            }
        });
    }

    async sendMessage(text: string): Promise<void> {
        if (!config.enableWhatsApp || !this.sock || !this.isReady) return;

        const to = config.whatsAppToNumber;
        if (!to) {
            console.warn('WhatsApp enabled but WHATSAPP_TO_NUMBER not set.');
            return;
        }

        let jid = to.replace('+', '').replace(/\s/g, '');
        if (!jid.endsWith('@s.whatsapp.net') && !jid.endsWith('@g.us')) {
            jid += '@s.whatsapp.net';
        }

        const sendPromise = this.sock.sendMessage(jid, { text });
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('WhatsApp send timed out after 15s')), SEND_TIMEOUT_MS)
        );

        await Promise.race([sendPromise, timeoutPromise]);
        console.log(`WhatsApp message sent to ${to}`);
    }

    isClientReady(): boolean {
        return this.isReady;
    }

    async destroy(): Promise<void> {
        this.shouldReconnect = false;

        // Cancel any pending reconnect timer
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.sock) {
            (this.sock.ev as any).removeAllListeners();
            try { this.sock.end(undefined); } catch {}
            this.sock = null;
        }

        this.isReady = false;
        console.log('WhatsApp client destroyed');
    }
}
