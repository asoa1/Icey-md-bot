import { downloadMediaMessage } from "@whiskeysockets/baileys";

export const command = 'statusdl';

export async function execute(sock, m) {
  try {
    const jid = m.key.remoteJid;
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      await sock.sendMessage(jid, { text: `❌ Reply to a *status image/video* with .statusdl` });
      return;
    }

    // Download status media (image/video)
    const buffer = await downloadMediaMessage(
      { message: quoted },
      "buffer",
      {},
      { logger: sock.logger }
    );

    // Send back as image or video
    if (quoted.imageMessage) {
      await sock.sendMessage(jid, { image: buffer, caption: "✅ Status Downloaded" }, { quoted: m });
    } else if (quoted.videoMessage) {
      await sock.sendMessage(jid, { video: buffer, caption: "✅ Status Downloaded" }, { quoted: m });
    } else {
      await sock.sendMessage(jid, { text: `❌ That’s not a status image/video.` });
    }

  } catch (err) {
    console.error("StatusDL Error:", err);
    await sock.sendMessage(m.key.remoteJid, { text: `❌ Error: ${err.message}` });
  }
}
