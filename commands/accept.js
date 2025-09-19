// Group Join Requests Manager
// Commands: .requestlist, .acceptall, .rejectall

module.exports = async (sock, m, args, command) => {
  try {
    // Ensure this is a group
    if (!m.isGroup) {
      return sock.sendMessage(m.chat, { text: "❌ This command only works in groups." }, { quoted: m });
    }

    const metadata = await sock.groupMetadata(m.chat);

    // Find all group admins
    const groupAdmins = metadata.participants
      .filter(p => p.admin !== null)
      .map(p => p.id);

    const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";

    // Check if user is an admin
    if (!groupAdmins.includes(m.sender)) {
      return sock.sendMessage(m.chat, { text: "❌ You must be an admin to use this command." }, { quoted: m });
    }

    // Check if bot is an admin
    if (!groupAdmins.includes(botNumber)) {
      return sock.sendMessage(m.chat, { text: "❌ I need to be an admin to manage join requests." }, { quoted: m });
    }

    // Fetch pending join requests
    const requests = await sock.groupRequestParticipantsList(m.chat);

    if (command === "requestlist") {
      if (!requests || requests.length === 0) {
        return sock.sendMessage(m.chat, { text: "✅ No pending join requests." }, { quoted: m });
      }

      let text = "📋 *Pending Join Requests:*\n\n";
      requests.forEach((u, i) => {
        text += `${i + 1}. @${u.jid.split("@")[0]}\n`;
      });

      await sock.sendMessage(
        m.chat,
        { text, mentions: requests.map(u => u.jid) },
        { quoted: m }
      );
    }

    if (command === "acceptall") {
      if (!requests || requests.length === 0) {
        return sock.sendMessage(m.chat, { text: "✅ No pending requests to accept." }, { quoted: m });
      }

      await sock.groupRequestParticipantsUpdate(
        m.chat,
        requests.map(u => u.jid),
        "approve"
      );

      return sock.sendMessage(
        m.chat,
        { text: `✅ Approved ${requests.length} pending requests.` },
        { quoted: m }
      );
    }

    if (command === "rejectall") {
      if (!requests || requests.length === 0) {
        return sock.sendMessage(m.chat, { text: "✅ No pending requests to reject." }, { quoted: m });
      }

      await sock.groupRequestParticipantsUpdate(
        m.chat,
        requests.map(u => u.jid),
        "reject"
      );

      return sock.sendMessage(
        m.chat,
        { text: `❌ Rejected ${requests.length} pending requests.` },
        { quoted: m }
      );
    }
  } catch (err) {
    console.error(err);
    sock.sendMessage(m.chat, { text: "⚠️ Error while processing request." }, { quoted: m });
  }
};
