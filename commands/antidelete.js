// commands/antidelete.js
const messageCache = new Map();
let antiDeleteEnabled = false;

export const command = 'antidelete';

export async function execute(sock, m) {
    const jid = m.key.remoteJid;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
    const args = text.split(' ');

    if (args.length < 2) {
        const status = antiDeleteEnabled ? '🟢 ON' : '🔴 OFF';
        await sock.sendMessage(jid, {
            text: `⚙️ *ANTI-DELETE SETTINGS*\n\nCurrent status: ${status}\n\nUsage:\n• .antidelete on - Enable globally\n• .antidelete off - Disable globally\n\n📨 All deleted messages will be captured and sent to you.`
        });
        return;
    }

    const action = args[1].toLowerCase();

    if (action === 'on') {
        antiDeleteEnabled = true;
        await sock.sendMessage(jid, {
            text: '✅ *ANTI-DELETE ENABLED*\n\nI will now capture all deleted messages from all chats and groups and send them to you.'
        });
        console.log('✅ Anti-delete enabled globally');
    } else if (action === 'off') {
        antiDeleteEnabled = false;
        await sock.sendMessage(jid, {
            text: '❌ *ANTI-DELETE DISABLED*\n\nDeleted messages will no longer be captured.'
        });
        console.log('❌ Anti-delete disabled globally');
    } else {
        await sock.sendMessage(jid, {
            text: '❌ Use: .antidelete on/off'
        });
    }
}

export const monitor = (sock) => {
    console.log('🔍 Anti-delete monitor loaded');

    // Cache all incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        
        for (const m of messages) {
            try {
                if (!m.message) continue;

                const key = m.key;
                const jid = key.remoteJid;
                
                // Don't cache bot's own messages or command messages
                if (key.fromMe) continue;
                
                // Don't cache messages that are commands
                const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
                if (text.startsWith('.')) continue;

                messageCache.set(key.id, {
                    message: m.message,
                    jid: jid,
                    sender: key.participant || jid,
                    timestamp: new Date(),
                    pushName: m.pushName || 'Unknown',
                    key: key
                });

                console.log(`💾 Cached message ${key.id} from ${jid}`);
            } catch (error) {
                console.error('Error caching message:', error);
            }
        }
    });

    // Handle message updates (deletions)
    sock.ev.on('messages.update', async (updates) => {
        if (!antiDeleteEnabled) return;
        
        for (const update of updates) {
            try {
                if (!update.key) continue;

                // Check if this is a deletion (message is null or empty)
                const isDeletion = (
                    update.update?.message === null ||
                    (update.update && Object.keys(update.update).length === 0) ||
                    update.messageStubType === 8
                );

                if (isDeletion) {
                    const messageId = update.key.id;
                    const cached = messageCache.get(messageId);
                    
                    if (cached) {
                        await handleDeletedMessage(sock, cached);
                        messageCache.delete(messageId);
                    }
                }
            } catch (error) {
                console.error('Error handling message update:', error);
            }
        }
    });

    // Also handle messages.delete event (alternative deletion method)
    sock.ev.on('messages.delete', async (item) => {
        if (!antiDeleteEnabled || !item.keys) return;
        
        for (const key of item.keys) {
            try {
                const cached = messageCache.get(key.id);
                if (cached) {
                    await handleDeletedMessage(sock, cached);
                    messageCache.delete(key.id);
                }
            } catch (error) {
                console.error('Error handling messages.delete:', error);
            }
        }
    });

    // Clean up old cache entries every 5 minutes
    setInterval(() => {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [id, data] of messageCache.entries()) {
            if (now - data.timestamp.getTime() > 300000) { // 5 minutes
                messageCache.delete(id);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} old messages from cache`);
        }
    }, 300000);
};

async function handleDeletedMessage(sock, cached) {
    try {
        const { message, jid, sender, timestamp, pushName } = cached;
        
        // Extract message content
        let content = '';
        let messageType = 'Unknown';
        
        if (message.conversation) {
            content = message.conversation;
            messageType = 'Text';
        } else if (message.extendedTextMessage?.text) {
            content = message.extendedTextMessage.text;
            messageType = 'Text';
        } else if (message.imageMessage) {
            content = message.imageMessage.caption || '📷 Image';
            messageType = 'Image';
        } else if (message.videoMessage) {
            content = message.videoMessage.caption || '🎥 Video';
            messageType = 'Video';
        } else if (message.documentMessage) {
            content = message.documentMessage.caption || '📄 Document';
            messageType = 'Document';
        } else if (message.audioMessage) {
            content = '🎵 Audio message';
            messageType = 'Audio';
        } else if (message.stickerMessage) {
            content = '🖼️ Sticker';
            messageType = 'Sticker';
        } else {
            messageType = Object.keys(message)[0];
            content = `[${messageType} message]`;
        }

        const senderName = pushName || sender.split('@')[0];
        const chatType = jid.endsWith('@g.us') ? 'Group' : 'DM';
        
        const alert = `
🚨 *DELETED MESSAGE ALERT* 🚨

👤 *From:* ${senderName}
💬 *Chat:* ${chatType}
⏰ *Time:* ${timestamp.toLocaleString()}
📝 *Type:* ${messageType}
💬 *Message:* ${content}

📍 *Chat ID:* ${jid}
👤 *Sender ID:* ${sender}
        `;

        // Send alert to all connected clients (in case multiple devices)
        // This will send to the user who enabled anti-delete
        await sock.sendMessage(sock.user.id, { text: alert });
        console.log(`✅ Deletion alert sent for message from ${jid}`);
        
    } catch (error) {
        console.error('Error sending deletion alert:', error);
    }
}