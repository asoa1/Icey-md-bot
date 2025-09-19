export const command = 'acceptall';

export async function execute(sock, m) {
    const jid = m.key.remoteJid;
    
    // Only works in groups
    if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(jid, {
            text: '❌ *GROUP COMMAND ONLY*\nThis command only works in groups.'
        });
        return;
    }
    
    try {
        // Check if user is admin
        const groupMetadata = await sock.groupMetadata(jid);
        const participant = m.sender || m.key.participant;
        const isAdmin = groupMetadata.participants.find(p => p.id === participant)?.admin;
        
        if (!isAdmin) {
            await sock.sendMessage(jid, {
                text: '❌ *ADMIN REQUIRED*\nOnly group admins can use this command.'
            });
            return;
        }
        
        // Check if bot is admin
        const botId = sock.user.id;
        const isBotAdmin = groupMetadata.participants.find(p => p.id === botId)?.admin;
        
        if (!isBotAdmin) {
            await sock.sendMessage(jid, {
                text: '❌ *BOT NEEDS ADMIN*\nI need to be a group admin to manage requests.'
            });
            return;
        }
        
        // Get pending requests using Baileys function
        const requests = await sock.groupRequestParticipantsList(jid);
        
        if (!requests || requests.length === 0) {
            await sock.sendMessage(jid, {
                text: 'ℹ️ *NO PENDING REQUESTS*\nThere are no pending join requests.'
            });
            return;
        }
        
        // Accept all requests
        for (const req of requests) {
            await sock.groupRequestParticipantsUpdate(jid, [req.jid], "approve");
            await new Promise(resolve => setTimeout(resolve, 1000)); // Delay to avoid rate limiting
        }
        
        await sock.sendMessage(jid, {
            text: `✅ *REQUESTS APPROVED*\n\nApproved ${requests.length} join requests!\n\nGroup: ${groupMetadata.subject}\nMembers: ${groupMetadata.participants.length}\nApproved by: Admin`
        });
        
    } catch (error) {
        console.error('Acceptall error:', error);
        await sock.sendMessage(jid, {
            text: '❌ *Failed to accept requests!*\nThis feature may not be supported in your Baileys version.'
        });
    }
}

// Reject all command
export const rejectCommand = 'rejectall';

export async function rejectExecute(sock, m) {
    const jid = m.key.remoteJid;
    
    if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(jid, {
            text: '❌ *GROUP COMMAND ONLY*\nThis command only works in groups.'
        });
        return;
    }
    
    try {
        const groupMetadata = await sock.groupMetadata(jid);
        const participant = m.sender || m.key.participant;
        const isAdmin = groupMetadata.participants.find(p => p.id === participant)?.admin;
        
        if (!isAdmin) {
            await sock.sendMessage(jid, {
                text: '❌ *ADMIN REQUIRED*\nOnly group admins can use this command.'
            });
            return;
        }
        
        const botId = sock.user.id;
        const isBotAdmin = groupMetadata.participants.find(p => p.id === botId)?.admin;
        
        if (!isBotAdmin) {
            await sock.sendMessage(jid, {
                text: '❌ *BOT NEEDS ADMIN*\nI need to be a group admin to manage requests.'
            });
            return;
        }
        
        const requests = await sock.groupRequestParticipantsList(jid);
        
        if (!requests || requests.length === 0) {
            await sock.sendMessage(jid, {
                text: 'ℹ️ *NO PENDING REQUESTS*\nThere are no pending join requests.'
            });
            return;
        }
        
        // Reject all requests
        for (const req of requests) {
            await sock.groupRequestParticipantsUpdate(jid, [req.jid], "reject");
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        await sock.sendMessage(jid, {
            text: `❌ *REQUESTS REJECTED*\n\nRejected ${requests.length} join requests!\n\nGroup: ${groupMetadata.subject}\nMembers: ${groupMetadata.participants.length}\nAction by: Admin`
        });
        
    } catch (error) {
        console.error('Rejectall error:', error);
        await sock.sendMessage(jid, {
            text: '❌ *Failed to reject requests!*\nThis feature may not be supported in your Baileys version.'
        });
    }
}

// Request list command
export const requestListCommand = 'requestlist';

export async function requestListExecute(sock, m) {
    const jid = m.key.remoteJid;
    
    if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(jid, {
            text: '❌ *GROUP COMMAND ONLY*\nThis command only works in groups.'
        });
        return;
    }
    
    try {
        const groupMetadata = await sock.groupMetadata(jid);
        const participant = m.sender || m.key.participant;
        const isAdmin = groupMetadata.participants.find(p => p.id === participant)?.admin;
        
        if (!isAdmin) {
            await sock.sendMessage(jid, {
                text: '❌ *ADMIN REQUIRED*\nOnly group admins can use this command.'
            });
            return;
        }
        
        const botId = sock.user.id;
        const isBotAdmin = groupMetadata.participants.find(p => p.id === botId)?.admin;
        
        if (!isBotAdmin) {
            await sock.sendMessage(jid, {
                text: '❌ *BOT NEEDS ADMIN*\nI need to be a group admin to view requests.'
            });
            return;
        }
        
        const requests = await sock.groupRequestParticipantsList(jid);
        
        if (!requests || requests.length === 0) {
            await sock.sendMessage(jid, {
                text: 'ℹ️ *NO PENDING REQUESTS*\nThere are no pending join requests.'
            });
            return;
        }
        
        let listText = `📋 *PENDING JOIN REQUESTS*\n\nGroup: ${groupMetadata.subject}\nTotal Requests: ${requests.length}\n\n`;
        
        requests.forEach((req, index) => {
            const number = req.jid.split('@')[0];
            listText += `${index + 1}. @${number}\n`;
        });
        
        listText += '\nUse .acceptall or .rejectall to manage these requests.';
        
        await sock.sendMessage(jid, {
            text: listText,
            mentions: requests.map(req => req.jid)
        });
        
    } catch (error) {
        console.error('Requestlist error:', error);
        await sock.sendMessage(jid, {
            text: '❌ *Failed to fetch requests!*\nThis feature may not be supported in your Baileys version.'
        });
    }
}

export const monitor = (sock) => {
    console.log('🛡️ Group request commands loaded: .acceptall, .rejectall, .requestlist');
};
