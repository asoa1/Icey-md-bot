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
        // Get group metadata
        const groupMetadata = await sock.groupMetadata(jid);
        const participant = m.sender || m.key.participant || m.key.remoteJid;
        
        // Check if user is admin
        const userParticipant = groupMetadata.participants.find(p => p.id === participant);
        if (!userParticipant || !['admin', 'superadmin'].includes(userParticipant.admin)) {
            await sock.sendMessage(jid, {
                text: '❌ *ADMIN REQUIRED*\nOnly group admins can use this command.'
            });
            return;
        }
        
        // Check if bot is admin
        const botId = sock.user.id;
        const botParticipant = groupMetadata.participants.find(p => p.id === botId);
        if (!botParticipant || !['admin', 'superadmin'].includes(botParticipant.admin)) {
            await sock.sendMessage(jid, {
                text: '❌ *BOT NEEDS ADMIN*\nI need to be a group admin to manage requests.'
            });
            return;
        }
        
        // Try to get pending requests
        try {
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
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            await sock.sendMessage(jid, {
                text: `✅ *REQUESTS APPROVED*\n\nApproved ${requests.length} join requests!\n\nGroup: ${groupMetadata.subject}\nAction by: Admin`
            });
            
        } catch (apiError) {
            console.error('API error:', apiError);
            // If the API isn't available, show a message
            await sock.sendMessage(jid, {
                text: '⚠️ *GROUP REQUEST API NOT AVAILABLE*\n\nThis feature requires a newer version of Baileys that supports group join requests.\n\nPlease update your Baileys library to use this feature.'
            });
        }
        
    } catch (error) {
        console.error('Acceptall error:', error);
        await sock.sendMessage(jid, {
            text: '❌ *Failed to accept requests!*'
        });
    }
}

// Reject all command - we need to export it differently
export const rejectAllCommand = {
    command: 'rejectall',
    execute: async (sock, m) => {
        const jid = m.key.remoteJid;
        
        if (!jid.endsWith('@g.us')) {
            await sock.sendMessage(jid, {
                text: '❌ *GROUP COMMAND ONLY*\nThis command only works in groups.'
            });
            return;
        }
        
        try {
            const groupMetadata = await sock.groupMetadata(jid);
            const participant = m.sender || m.key.participant || m.key.remoteJid;
            
            // Check if user is admin
            const userParticipant = groupMetadata.participants.find(p => p.id === participant);
            if (!userParticipant || !['admin', 'superadmin'].includes(userParticipant.admin)) {
                await sock.sendMessage(jid, {
                    text: '❌ *ADMIN REQUIRED*\nOnly group admins can use this command.'
                });
                return;
            }
            
            // Check if bot is admin
            const botId = sock.user.id;
            const botParticipant = groupMetadata.participants.find(p => p.id === botId);
            if (!botParticipant || !['admin', 'superadmin'].includes(botParticipant.admin)) {
                await sock.sendMessage(jid, {
                    text: '❌ *BOT NEEDS ADMIN*\nI need to be a group admin to manage requests.'
                });
                return;
            }
            
            // Try to get pending requests
            try {
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
                    text: `❌ *REQUESTS REJECTED*\n\nRejected ${requests.length} join requests!\n\nGroup: ${groupMetadata.subject}\nAction by: Admin`
                });
                
            } catch (apiError) {
                console.error('API error:', apiError);
                await sock.sendMessage(jid, {
                    text: '⚠️ *GROUP REQUEST API NOT AVAILABLE*\n\nThis feature requires a newer version of Baileys.'
                });
            }
            
        } catch (error) {
            console.error('Rejectall error:', error);
            await sock.sendMessage(jid, {
                text: '❌ *Failed to reject requests!*'
            });
        }
    }
};

// Request list command - we need to export it differently
export const requestListCommand = {
    command: 'requestlist',
    execute: async (sock, m) => {
        const jid = m.key.remoteJid;
        
        if (!jid.endsWith('@g.us')) {
            await sock.sendMessage(jid, {
                text: '❌ *GROUP COMMAND ONLY*\nThis command only works in groups.'
            });
            return;
        }
        
        try {
            const groupMetadata = await sock.groupMetadata(jid);
            const participant = m.sender || m.key.participant || m.key.remoteJid;
            
            // Check if user is admin
            const userParticipant = groupMetadata.participants.find(p => p.id === participant);
            if (!userParticipant || !['admin', 'superadmin'].includes(userParticipant.admin)) {
                await sock.sendMessage(jid, {
                    text: '❌ *ADMIN REQUIRED*\nOnly group admins can use this command.'
                });
                return;
            }
            
            // Check if bot is admin
            const botId = sock.user.id;
            const botParticipant = groupMetadata.participants.find(p => p.id === botId);
            if (!botParticipant || !['admin', 'superadmin'].includes(botParticipant.admin)) {
                await sock.sendMessage(jid, {
                    text: '❌ *BOT NEEDS ADMIN*\nI need to be a group admin to view requests.'
                });
                return;
            }
            
            // Try to get pending requests
            try {
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
                
            } catch (apiError) {
                console.error('API error:', apiError);
                await sock.sendMessage(jid, {
                    text: '⚠️ *GROUP REQUEST API NOT AVAILABLE*\n\nThis feature requires a newer version of Baileys.'
                });
            }
            
        } catch (error) {
            console.error('Requestlist error:', error);
            await sock.sendMessage(jid, {
                text: '❌ *Failed to fetch requests!*'
            });
        }
    }
};

// Monitor function to log loaded commands
export const monitor = (sock) => {
    console.log('🛡️ Group request commands loaded: .acceptall, .rejectall, .requestlist');
};
