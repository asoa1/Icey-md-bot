// commands/owner.js
export const command = 'owner';
export const execute = async (sock, m) => {
    const jid = m.key.remoteJid;
    const sender = m.sender || m.key.participant || m.key.remoteJid;
    
    // Check if user is the bot owner
    if (sender !== globalThis.botOwner) {
        await sock.sendMessage(jid, {
            text: '❌ *Permission Denied!*\n\nOnly the bot owner can use this command.'
        });
        return;
    }
    
    await sock.sendMessage(jid, {
        text: `👑 *BOT OWNER*\n\nYour owner ID: ${globalThis.botOwner}\n\nThis ID is automatically detected when the bot starts.`
    });
};

export const monitor = (sock) => {
    console.log('✅ Owner command loaded');
};