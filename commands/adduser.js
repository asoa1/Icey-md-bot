import pkg from '@whiskeysockets/baileys';
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = pkg;
import { Boom } from '@hapi/boom';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Store active bot instances for multi-user support
const userBots = new Map();
const activeRegistrations = new Map();
const autoReconnectNumbers = new Set();

export const command = 'adduser';

export async function execute(sock, m) {
    const jid = m.key.remoteJid;
    const user = m.key.participant || jid;
    
    const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
    const args = text.split(' ');
    
    if (args.length < 2) {
        await sock.sendMessage(jid, {
            text: `❌ *USAGE:* .adduser phone_number\n\n📌 *Example:*\n.adduser 2349123456789\n\n💡 Include country code without + or spaces`
        });
        return;
    }

    const phoneNumber = args[1].replace(/[^0-9]/g, '');
    
    if (phoneNumber.length < 10) {
        await sock.sendMessage(jid, {
            text: '❌ Invalid phone number. Please include country code.'
        });
        return;
    }

    if (activeRegistrations.has(phoneNumber)) {
        await sock.sendMessage(jid, {
            text: '⏳ This number is already being registered. Please wait for completion.'
        });
        return;
    }

    try {
        await sock.sendMessage(jid, {
            text: `🔐 *STARTING REGISTRATION*\n\n📞 Number: ${phoneNumber}\n⏳ Generating pairing code...`
        });

        autoReconnectNumbers.add(phoneNumber);
        startUserBot(phoneNumber, jid, sock);
        
        await sock.sendMessage(jid, { react: { text: '⏳', key: m.key } });

    } catch (error) {
        console.error('Adduser command error:', error);
        await sock.sendMessage(jid, {
            text: `❌ Registration failed: ${error.message}`
        });
    }
}

async function startUserBot(phoneNumber, originalJid, originalSock) {
    activeRegistrations.set(phoneNumber, true);
    
    try {
        const authFolder = `./auth_info_${phoneNumber}`;
        
        if (!fs.existsSync(authFolder)) {
            fs.mkdirSync(authFolder, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(authFolder);
        const { version } = await fetchLatestBaileysVersion();

        const userSock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ['Ubuntu', 'Chrome', '22.04'],
            shouldIgnoreJid: () => false
        });

        userSock.ev.on('creds.update', saveCreds);

        // Load commands for this user bot
        const userCommands = await loadUserCommands();
        console.log(chalk.green(`[USER:${phoneNumber}] Loaded ${userCommands.size} commands`));

        userSock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            console.log(chalk.yellow(`[USER:${phoneNumber}] Connection update:`), connection);
            
            if (connection === 'open') {
                console.log(chalk.green(`[USER:${phoneNumber}] ✅ Connected to WhatsApp server!`));
                
                userBots.set(phoneNumber, { sock: userSock, commands: userCommands });
                activeRegistrations.delete(phoneNumber);
                
                await originalSock.sendMessage(originalJid, {
                    text: `✅ *REGISTRATION SUCCESSFUL!*\n\n📞 Number: ${phoneNumber}\n🔗 Now connected and can use ALL bot commands\n💾 Session saved in: auth_info_${phoneNumber}\n\n⚡ Auto-reconnect enabled!`
                });

                // Send welcome message
                const commandList = Array.from(userCommands.keys()).map(cmd => '.' + cmd).join(', ');
                const welcomeText = `
🤖 *BOT CONNECTED SUCCESSFULLY*

Welcome! You can now use ALL bot commands.

🔹 Prefix: . (dot)
🔹 Available commands: ${commandList}
🔹 Your session is saved securely
🔹 Auto-reconnect enabled

Enjoy using the bot! 🚀
                `;
                
                try {
                    await userSock.sendMessage(userSock.user.id, { text: welcomeText });
                } catch (e) {
                    console.error('Failed to send welcome message to user:', e);
                }
            }
            
            if (connection === 'close') {
                const reason = lastDisconnect?.error?.output?.statusCode;
                console.log(chalk.yellow(`[USER:${phoneNumber}] Disconnect reason:`), reason);
                
                if (reason === 401 && !userSock.authState.creds.registered) {
                    console.log(chalk.blue(`[USER:${phoneNumber}] Connection closed during registration`));
                } else if (reason !== DisconnectReason.loggedOut) {
                    console.log(chalk.yellow(`[USER:${phoneNumber}] ⚠️ Reconnecting...`));
                    
                    setTimeout(() => {
                        if (autoReconnectNumbers.has(phoneNumber)) {
                            console.log(chalk.blue(`[USER:${phoneNumber}] 🔄 Attempting auto-reconnect...`));
                            startUserBot(phoneNumber, originalJid, originalSock);
                        }
                    }, 5000);
                } else {
                    console.log(chalk.red(`[USER:${phoneNumber}] ❌ Logged out.`));
                    userBots.delete(phoneNumber);
                    activeRegistrations.delete(phoneNumber);
                    autoReconnectNumbers.delete(phoneNumber);
                }
            }
            
            if (connection === 'connecting' && !userSock.authState.creds.registered) {
                console.log(chalk.blue(`[USER:${phoneNumber}] 🔐 Requesting pairing code...`));
                
                setTimeout(async () => {
                    try {
                        const code = await userSock.requestPairingCode(phoneNumber);
                        console.log(chalk.magenta(`[USER:${phoneNumber}] 🔑 Pairing Code:`), chalk.bold(code));
                        
                        await originalSock.sendMessage(originalJid, {
                            text: `🔑 *WHATSAPP PAIRING CODE*\n\n📞 Number: ${phoneNumber}\n🔢 Code: *${code}*\n\n💡 Enter this code in your WhatsApp to connect`
                        });
                        
                    } catch (error) {
                        console.error(`[USER:${phoneNumber}] Error requesting pairing code:`, error);
                        
                        if (error.message.includes('identity') || error.message.includes('sync')) {
                            console.log(chalk.yellow(`[USER:${phoneNumber}] 🔄 Restarting due to identity error...`));
                            setTimeout(() => startUserBot(phoneNumber, originalJid, originalSock), 3000);
                        } else {
                            await originalSock.sendMessage(originalJid, {
                                text: `❌ *REGISTRATION FAILED*\n\nNumber: ${phoneNumber}\nError: ${error.message}`
                            });
                            activeRegistrations.delete(phoneNumber);
                            autoReconnectNumbers.delete(phoneNumber);
                        }
                    }
                }, 2000);
            }
        });

        // FIXED: Handle messages properly - don't send "unknown command" responses
        userSock.ev.on('messages.upsert', async ({ messages, type }) => {
            for (const m of messages) {
                try {
                    if (!m.message) continue;
                    
                    const jid = m.key.remoteJid;
                    const msg = m.message;
                    let text = '';
                    
                    if (msg.conversation) text = msg.conversation;
                    else if (msg.extendedTextMessage?.text) text = msg.extendedTextMessage.text;
                    else if (msg.imageMessage?.caption) text = msg.imageMessage.caption;
                    else if (msg.videoMessage?.caption) text = msg.videoMessage.caption;
                    else if (msg.documentMessage?.caption) text = msg.documentMessage.caption;

                    // IGNORE messages that don't start with . command
                    if (!text || !text.startsWith('.')) continue;
                    
                    const cmdName = text.slice(1).split(' ')[0].toLowerCase();
                    
                    // ONLY respond if command exists, otherwise IGNORE silently
                    if (userCommands.has(cmdName)) {
                        try {
                            await userCommands.get(cmdName)(userSock, m);
                            console.log(chalk.blue(`[USER:${phoneNumber}] Executed command: .${cmdName}`));
                        } catch (e) {
                            console.error(`[USER:${phoneNumber}] Command error:`, e);
                            // DON'T send error message - ignore silently
                        }
                    } else {
                        // IGNORE unknown commands - don't send any response
                        console.log(chalk.gray(`[USER:${phoneNumber}] Ignoring unknown command: .${cmdName}`));
                    }
                    
                } catch (err) {
                    console.error(`[USER:${phoneNumber}] Message processing error:`, err);
                }
            }
        });

        // Handle connection errors
        userSock.ev.on('connection.update', (update) => {
            if (update.error) {
                console.error(`[USER:${phoneNumber}] Connection error:`, update.error);
                
                if (autoReconnectNumbers.has(phoneNumber)) {
                    console.log(chalk.yellow(`[USER:${phoneNumber}] 🔄 Auto-reconnecting after error...`));
                    setTimeout(() => startUserBot(phoneNumber, originalJid, originalSock), 5000);
                }
            }
        });

    } catch (error) {
        console.error(`[USER:${phoneNumber}] Registration error:`, error);
        
        if (autoReconnectNumbers.has(phoneNumber)) {
            console.log(chalk.yellow(`[USER:${phoneNumber}] 🔄 Retrying after error...`));
            setTimeout(() => startUserBot(phoneNumber, originalJid, originalSock), 5000);
        } else {
            await originalSock.sendMessage(originalJid, {
                text: `❌ *REGISTRATION ERROR*\n\nNumber: ${phoneNumber}\nError: ${error.message}`
            });
            activeRegistrations.delete(phoneNumber);
        }
    }
}

// Load commands from commands folder
async function loadUserCommands() {
    const commands = new Map();
    const commandsDir = path.join(__dirname, '../commands');
    
    if (fs.existsSync(commandsDir)) {
        const files = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js') && file !== 'adduser.js');
        
        for (let file of files) {
            try {
                const cmdModule = await import(`../commands/${file}`);
                
                if (cmdModule.command && cmdModule.execute) {
                    commands.set(cmdModule.command, cmdModule.execute);
                    console.log(chalk.green(`[USER-BOT] Loaded command: .${cmdModule.command}`));
                }
            } catch (error) {
                console.error(chalk.red(`[USER-BOT] Error loading command ${file}:`), error);
            }
        }
    }
    return commands;
}

// Monitor - Auto-reconnect all numbers on startup
export const monitor = (sock) => {
    console.log('🔧 Adduser command monitor loaded');
    
    // Auto-reconnect previously connected numbers
    const authDir = './';
    if (fs.existsSync(authDir)) {
        const files = fs.readdirSync(authDir);
        const authFolders = files.filter(file => file.startsWith('auth_info_'));
        
        for (const folder of authFolders) {
            const phoneNumber = folder.replace('auth_info_', '');
            if (phoneNumber && !userBots.has(phoneNumber)) {
                console.log(chalk.blue(`🔁 Auto-reconnecting: ${phoneNumber}`));
                autoReconnectNumbers.add(phoneNumber);
                startUserBot(phoneNumber, sock.user.id, sock);
            }
        }
    }
};

// Function to stop auto-reconnect
export const stopAutoReconnect = (phoneNumber) => {
    autoReconnectNumbers.delete(phoneNumber);
    console.log(`⏹️ Stopped auto-reconnect for: ${phoneNumber}`);
};