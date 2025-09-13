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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

// Commands will be loaded from external folder
const commands = new Map();

async function startBot() {
  console.log(chalk.blue('🚀 Starting WhatsApp bot...'));
  
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
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
  const commands = new Map();
  loadScheduledMessages(sock);

  try {
    await sock.sendMessage(sock.user.id, {
      image: { url: "./media/icey.jpg" }, // replace with your own banner/logo URL or local path
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

  // Message processing handler - only handles commands starting with "."
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) {
      try {
        if (!m.message) continue;
        
        const jid = m.key.remoteJid;
        
        // Extract message text
        const msg = m.message;
        let text = '';
        if (msg.conversation) text = msg.conversation;
        else if (msg.extendedTextMessage?.text) text = msg.extendedTextMessage.text;
        else if (msg.imageMessage?.caption) text = msg.imageMessage.caption;
        else if (msg.videoMessage?.caption) text = msg.videoMessage.caption;
        else if (msg.documentMessage?.caption) text = msg.documentMessage.caption;

        // Direct command handlers
        if (text.startsWith('.welcome')) {
            await welcomeExecute(sock, m);
            return;
        }
        if (text.startsWith('.goodbye')) {
            await goodbyeExecute(sock, m);
            return;
        }
        if (text.startsWith('.welcomesettings')) {
            await settingsExecute(sock, m);
            return;
        }
        if (text.startsWith('.groupinfo')) {
            await groupinfoExecute(sock, m);
            return;
        }
        if (text.startsWith('.setrules')) {
            await setRulesExecute(sock, m);
            return;
        }
        if (text.startsWith('.clearrules')) {
            await clearRulesExecute(sock, m);
            return;
        }
        if (text.startsWith('.rules')) {
            await rulesExecute(sock, m);
            return;
        }

        // Skip non-command messages
        if (!text || !text.startsWith('.')) continue;

        const cmdName = text.slice(1).split(' ')[0].toLowerCase();
        
        // Handle scheduling commands directly
        if (text.startsWith('.msg ')) {
          await msgExecute(sock, m);
          return;
        }
        if (text.startsWith('.' + listScheduleCommand)) {
          await listScheduleExecute(sock, m);
          return;
        }
        if (text.startsWith('.' + cancelScheduleCommand)) {
          await cancelScheduleExecute(sock, m);
          return;
        }
        
        // Execute commands from external folder
        if (commands.has(cmdName)) {
          const sender = m.key.participant || m.key.remoteJid;
          
          // Import public module dynamically
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

import simpleGit from "simple-git";

let lastCommit = null;
const git = simpleGit();

async function checkForUpdates(sock, ownerId) {
  try {
    await git.fetch("origin", "main");

    const localHash = await git.revparse(["HEAD"]);
    const remoteHash = await git.revparse(["origin/main"]);

    if (!lastCommit) lastCommit = localHash;

    if (localHash !== remoteHash) {
      await sock.sendMessage(ownerId, {
        text: `🔔 *Update Available!*\n\n📌 Local: ${localHash.slice(0, 7)}\n📌 Remote: ${remoteHash.slice(0, 7)}\n\n💡 Run *.update* to apply changes.`,
      });
      console.log("🔔 Update available — notified owner");
    } else {
      console.log("✅ Bot is up-to-date");
    }
  } catch (err) {
    console.error("⚠️ Failed to check for updates:", err);
  }
}

// 🧪 TEST MODE: check every 10 sec for now
setInterval(() => {
  if (sock?.user?.id) {
    checkForUpdates(sock, sock.user.id);
  }
}, 60 * 1000);  // 10 seconds

// After ~5 minutes, switch to 30 min interval
setTimeout(() => {
  clearInterval(this); // stop the 10s interval
  setInterval(() => {
    if (sock?.user?.id) {
      checkForUpdates(sock, sock.user.id);
    }
  }, 30 * 60 * 1000); // 30 minutes
  console.log("⏳ Switched to 30-minute update checks");
}, 5 * 60 * 1000); // 5 minutes



// Create commands folder if it doesn't exist
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

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the bot
startBot().catch(console.error);
