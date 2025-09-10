export const command = 'gc-confirm-delete';

export async function execute(sock, m) {
  const jid = m.key.remoteJid;
  const user = m.key.participant || jid; // This is YOUR number (the main admin)
  const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
  
  // Extract group name from command
  const groupName = text.split(' ').slice(1).join(' ').trim();
  
  if (!groupName) {
    await sock.sendMessage(jid, {
      text: '❌ Please specify the group name to confirm deletion.'
    });
    return;
  }

  try {
    // Find group by name
    const groups = await sock.groupFetchAllParticipating();
    const group = Object.values(groups).find(g => 
      g.subject.toLowerCase().includes(groupName.toLowerCase())
    );

    if (!group) {
      await sock.sendMessage(jid, {
        text: `❌ Group "${groupName}" not found.`
      });
      return;
    }

    // Get group metadata
    const metadata = await sock.groupMetadata(group.id);
    
    // Check if YOU (the user) are the main admin
    const userParticipant = metadata.participants.find(p => p.id === user);
    
    if (!userParticipant || !userParticipant.admin) {
      await sock.sendMessage(jid, {
        text: `❌ You're not an admin of "${groupName}". Only the main admin can delete groups.`
      });
      return;
    }

    // Send notification to group first
    await sock.sendMessage(group.id, {
      text: `🚨 *GROUP DELETION IN PROGRESS*\n\nThis group is being deleted by the main admin.\n\nAll participants will be removed...`
    });

    // Get all participants (excluding yourself first)
    const allParticipants = metadata.participants.map(p => p.id);
    const participantsToRemove = allParticipants.filter(p => p !== user); // Remove others first
    
    let removedCount = 0;
    let failedRemovals = 0;

    // Remove all other participants using YOUR admin privileges
    for (const participant of participantsToRemove) {
      try {
        // Use the bot to send the removal command on your behalf
        await sock.groupParticipantsUpdate(group.id, [participant], 'remove');
        removedCount++;
        console.log(`✅ Removed participant: ${participant}`);
        
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to remove ${participant}:`, error);
        failedRemovals++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Now remove yourself (the main admin) last
    try {
      await sock.groupParticipantsUpdate(group.id, [user], 'remove');
      removedCount++;
      console.log(`✅ Removed main admin (yourself)`);
    } catch (error) {
      console.error('❌ Failed to remove main admin:', error);
      failedRemovals++;
    }

    // Final result
    const resultResponse = `
✅ *GROUP DELETION COMPLETED*

┌─────────────────────────────┐
│         🗑️ SUMMARY          │
├─────────────────────────────┤
│ 📛 Group: ${groupName}      │
│ ✅ Successfully removed: ${removedCount} │
│ ❌ Failed to remove: ${failedRemovals} │
│ 👑 You were the main admin  │
└─────────────────────────────┘

💡 The group has been effectively deleted by
   removing all participants.

📋 The empty group will be automatically
   archived by WhatsApp.
    `;

    await sock.sendMessage(jid, { text: resultResponse });
    await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });

  } catch (error) {
    console.error('Group deletion error:', error);
    
    let errorMessage = '❌ Deletion failed: ';
    
    if (error.output?.statusCode === 403) {
      errorMessage += 'FORBIDDEN - The bot may not have sufficient admin privileges.';
      errorMessage += '\n\n💡 Make sure:';
      errorMessage += '\n• You are the MAIN admin (group creator)';
      errorMessage += '\n• The bot is using your admin privileges';
      errorMessage += '\n• WhatsApp allows participant removal';
    } else if (error.output?.statusCode === 400) {
      errorMessage += 'BAD REQUEST - Invalid operation.';
    } else {
      errorMessage += error.message;
    }
    
    await sock.sendMessage(jid, { text: errorMessage });
  }
}