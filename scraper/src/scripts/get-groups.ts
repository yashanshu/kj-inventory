import 'dotenv/config';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import path from 'path';

async function listGroups() {
    console.log('Initializing WhatsApp Client to fetch groups...');

    const client = new Client({
        authStrategy: new LocalAuth({
            dataPath: path.join(process.cwd(), 'data', 'wwebjs_auth')
        }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', (qr) => {
        console.log('\nPlease scan the QR code to login:');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', async () => {
        console.log('\nClient is ready! Fetching groups...\n');

        const chats = await client.getChats();
        const groups = chats.filter(chat => chat.isGroup);

        if (groups.length === 0) {
            console.log('No groups found.');
        } else {
            console.log('Found Groups:');
            console.log('---------------------------------------------------');
            groups.forEach(group => {
                console.log(`Name: ${group.name}`);
                console.log(`ID:   ${group.id._serialized}`);
                console.log('---------------------------------------------------');
            });
            console.log('\nCopy the ID of the group you want to start sending messages to.');
            console.log('Then update WHATSAPP_TO_NUMBER in your .env file.');
        }

        console.log('\nDone. Exiting...');
        process.exit(0);
    });

    try {
        await client.initialize();
    } catch (err) {
        console.error('Error:', err);
    }
}

listGroups();
