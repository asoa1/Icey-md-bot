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
    
    // Set owner if not set (same pattern as vv command)
    if (!ownerId) {
        ownerId = sock.user.id;
        console.log(`👑 Chr Command - Owner set to: ${ownerId}`);
    }
    
    try {
        // Check if user is bot owner (same pattern as vv command)
        if (sender !== ownerId) {
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
        
        // Extract channel ID from the link
        const parts = channelLink.split('/');
        const channelId = parts.find(part => part.length === 20 && !part.includes('.')) || parts[4];
        
        if (!channelId) {
            await sock.sendMessage(jid, {
                text: '❌ Invalid link - could not extract channel ID'
            });
            return;
        }
        
        // Try to use the newsletter API if available
        try {
            // Check if the newsletter functions exist
            if (typeof sock.newsletterMetadata === 'function' && 
                typeof sock.newsletterReactMessage === 'function') {
                
                const channelMeta = await sock.newsletterMetadata("invite", channelId);
                
                // For a real implementation, you would need the message ID too
                // This is a simplified version that just shows the capability
                await sock.sendMessage(jid, {
                    text: `✅ *CHANNEL REACTION READY*\n\nChannel: ${channelMeta.name || 'Unknown'}\nReaction: ${styledText}\n\nNote: This is a preview. Full implementation requires message ID.`
                });
            } else {
                // Fallback if newsletter API is not available
                await sock.sendMessage(jid, {
                    text: `🎨 *STYLIZED TEXT GENERATED*\n\nInput: ${inputText}\nOutput: ${styledText}\n\nNote: Newsletter API not available in this Baileys version.`
                });
            }
            
        } catch (error) {
            console.error('Channel API error:', error);
            await sock.sendMessage(jid, {
                text: `✅ *TEXT CONVERSION COMPLETE*\n\nOriginal: ${inputText}\nStyled: ${styledText}\n\nError with channel API: ${error.message || 'Not supported'}`
            });
        }
        
    } catch (err) {
        console.error('Error in chr command:', err);
        await sock.sendMessage(jid, {
            text: `❎ Error: ${err.message || 'Failed to process command'}`
        });
    }
}

// Monitor to set owner when bot starts (same pattern as vv command)
export const monitor = (sock) => {
    ownerId = sock.user.id;
    console.log(`👑 Chr Command - Owner set to: ${ownerId}`);
};
