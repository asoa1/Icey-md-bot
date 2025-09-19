import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);

// Map of characters to styled characters
const charMap = {
  a: "🅐", b: "🅑", c: "🅒", d: "🅓", e: "🅔",
  f: "🅕", g: "🅖", h: "🅗", i: "🅘", j: "🅙",
  k: "🅚", l: "🅛", m: "🅜", n: "🅝", o: "🅞",
  p: "🅟", q: "🅠", r: "🅡", s: "🅢", t: "🅣",
  u: "🅤", v: "🅥", w: "🅦", x: "🅧", y: "🅨", z: "🅩",
  0: "⓿", 1: "➊", 2: "➋", 3: "➌", 4: "➍",
  5: "➎", 6: "➏", 7: "➐", 8: "➑", 9: "➒"
};

export const command = 'channel-react';

export async function execute(sock, m) {
    const jid = m.key.remoteJid;
    const sender = m.sender || m.key.participant || m.key.remoteJid;
    
    try {
        // Check if user is bot owner using the same method as your index.js
        let isOwner = false;
        try {
            const publicModule = await import('./public.js');
            isOwner = publicModule?.isOwner ? publicModule.isOwner(sender) : false;
        } catch (e) {
            console.error('Could not load public module:', e);
            // Fallback to global botOwner check
            isOwner = sender === globalThis.botOwner;
        }
        
        if (!isOwner) {
            await sock.sendMessage(jid, {
                text: '❌ Owner only command'
            });
            return;
        }
        
        // Get message text
        let text = '';
        if (m.message.conversation) {
            text = m.message.conversation;
        } else if (m.message.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }
        
        // Extract arguments
        const args = text.split(' ').slice(1); // Remove the command part
        if (args.length < 2) {
            await sock.sendMessage(jid, {
                text: '⚠️ Usage: .channel-react <channel-link> <text>'
            });
            return;
        }
        
        const channelLink = args[0];
        const inputText = args.slice(1).join(' ').toLowerCase();
        
        // Validate channel link
        if (!channelLink.includes("whatsapp.com/channel/")) {
            await sock.sendMessage(jid, {
                text: '❌ Invalid channel link format. Must contain "whatsapp.com/channel/"'
            });
            return;
        }
        
        if (!inputText) {
            await sock.sendMessage(jid, {
                text: '❌ Please provide text to convert'
            });
            return;
        }
        
        // Convert characters to styled versions
        const styledText = inputText
            .split('')
            .map(ch => (ch === ' ' ? '―' : charMap[ch] || ch))
            .join('');
        
        // Extract channel ID from the link
        const parts = channelLink.split('/');
        const channelId = parts.find(part => part.length === 20 && !part.includes('.')) || parts[4];
        
        if (!channelId) {
            await sock.sendMessage(jid, {
                text: '❌ Invalid link - could not extract channel ID'
            });
            return;
        }
        
        // Try to get channel metadata
        try {
            const channelMeta = await sock.newsletterMetadata("invite", channelId);
            
            // For this demo, we'll simulate the reaction since newsletterReactMessage might not be available
            await sock.sendMessage(jid, {
                text: `✅ *REACTION SIMULATED*\n\nChannel: ${channelMeta.name || 'Unknown'}\nReaction: ${styledText}\n\nNote: newsletterReactMessage API might not be available in this Baileys version`
            });
            
            // If the API is available, you would use:
            // await sock.newsletterReactMessage(channelMeta.id, messageId, styledText);
            
        } catch (error) {
            console.error('Channel API error:', error);
            await sock.sendMessage(jid, {
                text: `⚠️ *Channel API Not Available*\n\nSimulated reaction: ${styledText}\n\nError: ${error.message || 'Newsletter API not supported'}`
            });
        }
        
    } catch (err) {
        console.error('Error in channel-react:', err);
        await sock.sendMessage(jid, {
            text: `❎ Error: ${err.message || 'Failed to process channel reaction'}`
        });
    }
}

// Create alias commands
export const chrCommand = 'chr';
export const creactCommand = 'creact';
export const chreactCommand = 'chreact';
export const reactchCommand = 'reactch';

// All aliases use the same execute function
export async function chrExecute(sock, m) { return execute(sock, m); }
export async function creactExecute(sock, m) { return execute(sock, m); }
export async function chreactExecute(sock, m) { return execute(sock, m); }
export async function reactchExecute(sock, m) { return execute(sock, m); }

export const monitor = (sock) => {
    console.log('🎨 Channel react commands loaded: .channel-react, .chr, .creact, .chreact, .reactch');
};
