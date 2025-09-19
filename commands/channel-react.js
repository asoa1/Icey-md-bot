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

let ownerId = null;

export const command = 'chr';

export async function execute(sock, m) {
    const jid = m.key.remoteJid;
    const sender = m.sender || m.key.participant || m.key.remoteJid;
    
    // Debug: Log the sender and ownerId
    console.log('Sender:', sender);
    console.log('Owner ID:', ownerId);
    
    // Set owner if not set (same pattern as vv command)
    if (!ownerId) {
        ownerId = sock.user?.id;
        console.log(`👑 Chr Command - Owner set to: ${ownerId}`);
    }
    
    // Check if user is bot owner (same pattern as vv command)
    if (sender !== ownerId) {
        console.log('Permission denied: Sender is not owner');
        await sock.sendMessage(jid, {
            text: '❌ Owner only command'
        });
        return;
    }
    
    try {
        // Get message text
        let text = '';
        if (m.message.conversation) {
            text = m.message.conversation;
        } else if (m.message.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        } else if (m.message.imageMessage?.caption) {
            text = m.message.imageMessage.caption;
        } else if (m.message.videoMessage?.caption) {
            text = m.message.videoMessage.caption;
        }
        
        // Extract arguments
        const args = text.split(' ').slice(1); // Remove the command part
        if (args.length < 2) {
            await sock.sendMessage(jid, {
                text: '⚠️ Usage: .chr <channel-link> <text>\n\nExample: .chr https://whatsapp.com/channel/1234567890ABCDEFGHIJ hello'
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
        
        // For now, just show the result since newsletter API might not be available
        await sock.sendMessage(jid, {
            text: `🎨 *STYLIZED TEXT GENERATED*\n\nInput: ${inputText}\nOutput: ${styledText}\n\nNote: This is a text conversion demo. Channel reaction API might not be available.`
        });
        
    } catch (err) {
        console.error('Error in chr command:', err);
        await sock.sendMessage(jid, {
            text: `❎ Error: ${err.message || 'Failed to process command'}`
        });
    }
}

// Monitor to set owner when bot starts (same pattern as vv command)
export const monitor = (sock) => {
    ownerId = sock.user?.id;
    console.log(`👑 Chr Command - Owner set to: ${ownerId}`);
};
