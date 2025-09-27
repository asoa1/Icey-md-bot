import { 
    execute as groupinfoExecute, 
    setRulesExecute, 
    clearRulesExecute, 
    rulesExecute 
} from './commands/groupinfo.js';

import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys';

import { Boom } from '@hapi/boom';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

import { 
    execute as msgExecute, 
    loadScheduledMessages, 
    listExecute as listScheduleExecute,
    cancelExecute as cancelScheduleExecute,
    listCommand as listScheduleCommand,
    cancelCommand as cancelScheduleCommand
} from './commands/msg-command.js';

import { 
    execute as welcomeExecute, 
    goodbyeExecute, 
    settingsExecute,
    monitor as welcomeMonitor,
    goodbyeCommand,
    settingsCommand
} from './commands/welcome.js';

import axios from 'axios';
import AdmZip from 'adm-zip';


import { startAutoUpdateChecker } from "./commands/update.js";

const SESSION_NAME = process.env.SESSION_NAME || 'edit this'; // change manually or set in env
const SERVER_URL = process.env.SERVER_URL || 'https://iceymd.onrender.com/api/auth-folder';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

// Commands will be loaded from external folder
const commands = new Map();

async function fetchAndExtractAuth(sessionName) {
  const url = `${SERVER_URL}/${sessionName}`;
  console.log(`🔄 Fetching auth folder from: ${url}`);

  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const zip = new AdmZip(response.data);
    zip.extractAllTo(`./auth_info_${sessionName}`, true);
    console.log(`✅ Auth folder extracted: ./auth_info_${sessionName}`);
  } catch (err) {
    console.error('❌ Failed to fetch or extract auth folder:', err.message);
    process.exit(1);
  }
}



async function startBot() {
  console.log(chalk.blue('🚀 Starting WhatsApp bot...'));
  
  
  await fetchAndExtractAuth(SESSION_NAME);
const { state, saveCreds } = await useMultiFileAuthState(`./auth_info_${SESSION_NAME}`);


  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '22.04'],
    shouldIgnoreJid: () => false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect } = update;
  
  console.log(chalk.yellow('Connection update:'), connection);
  
  if (connection === 'open') {
    console.log(chalk.green('✅ Connected to WhatsApp server!'));

    // update autochecker
    startAutoUpdateChecker(sock);

    // Store bot owner automatically (the bot itself)
    globalThis.botOwner = sock.user.id;
    console.log(chalk.blue('👑 Bot owner set to:'), globalThis.botOwner);

    // Now load commands after successful connection
    await loadCommands();

    const welcomeCaption = `
✨ *CONNECTION SUCCESSFUL* ✨

👋 Hello! Your WhatsApp bot is now connected and ready.

🔹 Your bot is online and functioning properly.
🔹 Commands have been loaded from the commands folder.

🚀 Enjoy using your WhatsApp bot!

💫 Powered by *Baileys* library.
`;

    // Load scheduled messages
    loadScheduledMessages(sock);

    try {
      await sock.sendMessage(sock.user.id, {
        image: { url: "./media/icey.jpg" }, // replace with your own banner/logo path
        caption: welcomeCaption
      });
      console.log(chalk.green('✅ Welcome message with image sent!'));
    } catch (e) {
      console.error('Failed to send welcome message:', e);
    }
  }

  if (connection === 'close') {
    const reason = lastDisconnect?.error?.output?.statusCode;
    console.log(chalk.yellow('Disconnect reason:'), reason);
    
    if (reason !== DisconnectReason.loggedOut) {
      console.log(chalk.yellow('⚠️ Reconnecting...'));
      setTimeout(() => startBot(), 2000);
    } else {
      console.log(chalk.red('❌ Logged out.'));
    }
  }
  
  // Request pairing code if not registered
  if (connection === 'connecting' && !sock.authState.creds.registered) {
    console.log(chalk.blue('🔐 Authentication required...'));
    setTimeout(async () => {
      try {
        const number = await ask('📱 Enter your number with country code (e.g., 1234567890): ');
        const code = await sock.requestPairingCode(number.trim());
        console.log(chalk.magenta('🔑 Pairing Code:'), chalk.bold(code));
      } catch (error) {
        console.error('Error requesting pairing code:', error);
      }
    }, 1000);
  }
});


  welcomeMonitor(sock);

  // Load commands function
  async function loadCommands() {
    console.log(chalk.blue('📂 Loading commands...'));
    const commandsDir = path.join(__dirname, 'commands');
    
    if (fs.existsSync(commandsDir)) {
      for (let file of fs.readdirSync(commandsDir)) {
        if (file.endsWith('.js')) {
          try {
            const cmdModule = await import(`./commands/${file}`);
            
            if (cmdModule.command && cmdModule.execute) {
              commands.set(cmdModule.command, cmdModule.execute);
              console.log(chalk.green(`✅ Loaded command: .${cmdModule.command}`));
            }
            
            if (cmdModule.monitor) {
              cmdModule.monitor(sock);
            }
          } catch (error) {
            console.error(chalk.red(`❌ Error loading command ${file}:`), error);
          }
        }
      }
    }
    console.log(chalk.green(`✅ Total commands loaded: ${commands.size}`));
  }
  // 🔥 Make reload available everywhere
  globalThis.reloadCommands = loadCommands;

  // ✅ ADD THIS MISSING EVENT HANDLER FOR MESSAGE UPDATES (DELETIONS)
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      try {
        if (!update.key) continue;
        
        // Check if this is a message deletion
        const isDeletion = 
          update.update?.message === null ||
          (update.update && Object.keys(update.update).length === 0) ||
          update.messageStubType === 8; // 8 = message deletion
        
        if (isDeletion) {
          console.log(chalk.yellow(`🗑️ Message deletion detected: ${update.key.id}`));
          
          // You can add custom deletion handling logic here
          // For example, if you want to notify when messages are deleted:
          /*
          await sock.sendMessage(sock.user.id, {
            text: `🗑️ Message was deleted\nID: ${update.key.id}\nChat: ${update.key.remoteJid}`
          });
          */
        }
      } catch (error) {
        console.error('Error handling message update:', error);
      }
    }
  });

  // Also handle bulk deletions
  sock.ev.on('messages.delete', async (item) => {
    if (item.keys) {
      console.log(chalk.yellow(`🗑️ Bulk deletion detected: ${item.keys.length} messages`));
      
      // You can add custom bulk deletion handling here
      /*
      for (const key of item.keys) {
        await sock.sendMessage(sock.user.id, {
          text: `🗑️ Message deleted in bulk\nID: ${key.id}\nChat: ${key.remoteJid}`
        });
      }
      */
    }
  });

  // Message processing handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
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

        // Direct commands
        if (text.startsWith('.welcome')) return await welcomeExecute(sock, m);
        if (text.startsWith('.goodbye')) return await goodbyeExecute(sock, m);
        if (text.startsWith('.welcomesettings')) return await settingsExecute(sock, m);
        if (text.startsWith('.groupinfo')) return await groupinfoExecute(sock, m);
        if (text.startsWith('.setrules')) return await setRulesExecute(sock, m);
        if (text.startsWith('.clearrules')) return await clearRulesExecute(sock, m);
        if (text.startsWith('.rules')) return await rulesExecute(sock, m);

        if (!text || !text.startsWith('.')) continue;

        const cmdName = text.slice(1).split(' ')[0].toLowerCase();

        if (text.startsWith('.msg ')) return await msgExecute(sock, m);
        if (text.startsWith('.' + listScheduleCommand)) return await listScheduleExecute(sock, m);
        if (text.startsWith('.' + cancelScheduleCommand)) return await cancelScheduleExecute(sock, m);
        
        if (commands.has(cmdName)) {
          const sender = m.key.participant || m.key.remoteJid;
          
          let publicModule;
          try {
            publicModule = await import('./commands/public.js');
          } catch (e) {
            console.error('❌ Could not load public module:', e);
          }
          
          const isPublic = publicModule?.isPublicMode ? publicModule.isPublicMode() : true;
          const isOwner = publicModule?.isOwner ? publicModule.isOwner(sender) : false;
          const isPublicCommand = publicModule && cmdName === 'public';
          
          if (isPublic || isOwner || isPublicCommand) {
            try {
              await commands.get(cmdName)(sock, m);
              console.log(chalk.blue(`✅ Executed command: .${cmdName}`));
            } catch (e) {
              console.error('❌ Command error:', e);
            }
          } else {
            const privateResponse = `
🔒 *BOT IS IN PRIVATE MODE*

This bot is currently in private mode.
Only the owner can use commands.

👑 Contact the owner for access.
    `;
            await sock.sendMessage(jid, { text: privateResponse });
            console.log(chalk.yellow(`🔒 Command blocked: .${cmdName} from ${sender}`));
          }
        } else {
          console.log(chalk.gray(`❓ Unknown command ignored: .${cmdName}`));
        }
        
      } catch (err) {
        console.error('Error processing message:', err);
      }
    }
  });
}

// Create commands folder if missing
const commandsDir = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsDir)) {
  fs.mkdirSync(commandsDir);
  console.log(chalk.blue('📁 Created commands folder'));
  
  const exampleCommand = `// Example command structure
export const command = 'test';
export const execute = async (sock, m) => {
  const jid = m.key.remoteJid;
  await sock.sendMessage(jid, { text: 'This is a test command from the commands folder!' });
};
export const monitor = (sock) => {
  console.log('Test monitor loaded');
};
`;
  
  fs.writeFileSync(path.join(commandsDir, 'test.js'), exampleCommand);
  console.log(chalk.blue('📝 Created example command: test.js'));
}

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// ✅ Fix for Ctrl+C not working
process.on('SIGINT', () => {
  rl.close(); // close readline to unblock
  console.log('\n🛑 Caught Ctrl+C, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  rl.close();
  console.log('\n🛑 Process terminated, shutting down...');
  process.exit(0);
});

// Start bot
startBot().catch(console.error);
