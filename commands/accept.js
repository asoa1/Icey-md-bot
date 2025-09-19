module.exports = {
  commands: ["requestlist", "acceptall", "rejectall"],
  description: "Manage group join requests (list, accept all, reject all)",
  category: "group",

  async execute(message, { conn, command }) {
    const chatId = message.chat;

    // ✅ Check group context
    if (!message.isGroup) {
      return message.reply("❌ This command can only be used in groups.");
    }

    // ✅ Check if user is admin
    if (!message.isAdmin) {
      return message.reply("❌ Only group admins can use this command.");
    }

    // ✅ Check if bot is admin
    if (!message.isBotAdmin) {
      return message.reply("❌ I need to be an admin to manage join requests.");
    }

    try {
      const requests = await conn.groupRequestParticipantsList(chatId);

      if (!requests || requests.length === 0) {
        return message.reply("ℹ️ No pending join requests.");
      }

      if (command === "requestlist") {
        // 📋 Show pending requests
        let listText = "📋 Pending Join Requests:\n\n";
        requests.forEach((req, index) => {
          listText += `${index + 1}. @${req.jid.split("@")[0]}\n`;
        });

        return conn.sendMessage(
          chatId,
          { text: listText },
          { mentions: requests.map(r => r.jid) }
        );
      }

      if (command === "acceptall") {
        // ✅ Accept all requests
        for (const req of requests) {
          await conn.groupRequestParticipantsUpdate(chatId, [req.jid], "approve");
          await new Promise(r => setTimeout(r, 1500)); // prevent flooding
        }
        return message.reply(`✅ Approved ${requests.length} join requests.`);
      }

      if (command === "rejectall") {
        // ❌ Reject all requests
        for (const req of requests) {
          await conn.groupRequestParticipantsUpdate(chatId, [req.jid], "reject");
          await new Promise(r => setTimeout(r, 1500)); // prevent flooding
        }
        return message.reply(`❌ Rejected ${requests.length} join requests.`);
      }
    } catch (err) {
      console.error(err);
      return message.reply("❌ Error handling join requests. (Check Baileys version)");
    }
  }
};
