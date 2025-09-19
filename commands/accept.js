module.exports = {
  requestlist: {
    command: [".requestlist"],
    description: "Show pending join requests for the group",
    category: "group",
    async execute(message, { conn }) {
      const chatId = message.chat;

      if (!message.isGroup) return message.reply("❌ This command can only be used in groups.");
      if (!message.isAdmin) return message.reply("❌ Only group admins can use this command.");
      if (!message.isBotAdmin) return message.reply("❌ I need to be an admin to see join requests.");

      try {
        const requests = await conn.groupRequestParticipantsList(chatId);

        if (!requests || requests.length === 0) {
          return message.reply("ℹ️ No pending join requests.");
        }

        let listText = "📋 Pending Join Requests:\n\n";
        requests.forEach((req, i) => {
          listText += `${i + 1}. @${req.jid.split("@")[0]}\n`;
        });

        await conn.sendMessage(chatId, { text: listText }, { mentions: requests.map(r => r.jid) });
      } catch (err) {
        console.error(err);
        message.reply("❌ Error fetching join requests.");
      }
    }
  },

  acceptall: {
    command: [".acceptall"],
    description: "Approve all pending join requests",
    category: "group",
    async execute(message, { conn }) {
      const chatId = message.chat;

      if (!message.isGroup) return message.reply("❌ This command can only be used in groups.");
      if (!message.isAdmin) return message.reply("❌ Only group admins can use this command.");
      if (!message.isBotAdmin) return message.reply("❌ I need to be an admin to approve requests.");

      try {
        const requests = await conn.groupRequestParticipantsList(chatId);

        if (!requests || requests.length === 0) {
          return message.reply("ℹ️ No pending join requests.");
        }

        for (const req of requests) {
          await conn.groupRequestParticipantsUpdate(chatId, [req.jid], "approve");
          await new Promise(r => setTimeout(r, 1500)); // delay to avoid spam
        }

        await message.reply(`✅ Approved ${requests.length} join requests.`);
      } catch (err) {
        console.error(err);
        message.reply("❌ Error approving requests.");
      }
    }
  },

  rejectall: {
    command: [".rejectall"],
    description: "Reject all pending join requests",
    category: "group",
    async execute(message, { conn }) {
      const chatId = message.chat;

      if (!message.isGroup) return message.reply("❌ This command can only be used in groups.");
      if (!message.isAdmin) return message.reply("❌ Only group admins can use this command.");
      if (!message.isBotAdmin) return message.reply("❌ I need to be an admin to reject requests.");

      try {
        const requests = await conn.groupRequestParticipantsList(chatId);

        if (!requests || requests.length === 0) {
          return message.reply("ℹ️ No pending join requests.");
        }

        for (const req of requests) {
          await conn.groupRequestParticipantsUpdate(chatId, [req.jid], "reject");
          await new Promise(r => setTimeout(r, 1500)); // delay to avoid spam
        }

        await message.reply(`❌ Rejected ${requests.length} join requests.`);
      } catch (err) {
        console.error(err);
        message.reply("❌ Error rejecting requests.");
      }
    }
  }
};
