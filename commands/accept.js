// commands/groupRequests.js
export const command = ['requestlist', 'acceptall', 'rejectall'];

export async function execute(sock, m, args) {
  const jid = m.key.remoteJid;

  // ✅ Check if in a group
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: "❌ This command can only be used in groups." }, { quoted: m });
  }

  // ✅ Get group metadata
  const metadata = await sock.groupMetadata(jid);
  const participants = metadata.participants || [];

  // ✅ Check if user is admin
  const isAdmin = participants.some(p => p.id === m.sender && (p.admin === 'admin' || p.admin === 'superadmin'));
  if (!isAdmin) {
    return sock.sendMessage(jid, { text: "❌ Only group admins can use this command." }, { quoted: m });
  }

  // ✅ Check if bot is admin
  const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
  const isBotAdmin = participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
  if (!isBotAdmin) {
    return sock.sendMessage(jid, { text: "❌ I need to be an admin to manage join requests." }, { quoted: m });
  }

  try {
    const subcommand = m.body.split(" ")[0].replace(".", "").toLowerCase();
    const requests = await sock.groupRequestParticipantsList(jid);

    if (subcommand === "requestlist") {
      if (!requests || requests.length === 0) {
        return sock.sendMessage(jid, { text: "ℹ️ No pending join requests." }, { quoted: m });
      }

      let listText = "📋 Pending Join Requests:\n\n";
      requests.forEach((req, i) => {
        listText += `${i + 1}. @${req.jid.split("@")[0]}\n`;
      });

      await sock.sendMessage(jid, { text: listText, mentions: requests.map(r => r.jid) }, { quoted: m });

    } else if (subcommand === "acceptall") {
      if (!requests || requests.length === 0) {
        return sock.sendMessage(jid, { text: "ℹ️ No pending join requests." }, { quoted: m });
      }

      for (const req of requests) {
        await sock.groupRequestParticipantsUpdate(jid, [req.jid], "approve");
        await new Promise(r => setTimeout(r, 1200));
      }

      await sock.sendMessage(jid, { text: `✅ Approved ${requests.length} join requests.` }, { quoted: m });

    } else if (subcommand === "rejectall") {
      if (!requests || requests.length === 0) {
        return sock.sendMessage(jid, { text: "ℹ️ No pending join requests." }, { quoted: m });
      }

      for (const req of requests) {
        await sock.groupRequestParticipantsUpdate(jid, [req.jid], "reject");
        await new Promise(r => setTimeout(r, 1200));
      }

      await sock.sendMessage(jid, { text: `❌ Rejected ${requests.length} join requests.` }, { quoted: m });
    }

  } catch (err) {
    console.error("Group Request Error:", err);
    await sock.sendMessage(jid, { text: `❌ Error: ${err.message}` }, { quoted: m });
  }
}

export const monitor = (sock) => {
  console.log("✅ Group request manager loaded successfully");
};
