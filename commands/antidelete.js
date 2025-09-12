// commands/antidelete.js
import { downloadMediaMessage } from "@whiskeysockets/baileys";

const messageCache = new Map();
let antiDeleteEnabled = false;

export const command = "antidelete";

export async function execute(sock, m) {
    const jid = m.key.remoteJid;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const args = text.split(" ");

    if (args.length < 2) {
        const status = antiDeleteEnabled ? "🟢 ON" : "🔴 OFF";
        await sock.sendMessage(jid, {
            text: `⚙️ *ANTI-DELETE SETTINGS*\n\nCurrent status: ${status}\n\nUsage:\n• .antidelete on - Enable globally\n• .antidelete off - Disable globally\n\n📨 All deleted messages (text, images, videos, audios, stickers) will be captured and sent to you.`
        });
        return;
    }

    const action = args[1].toLowerCase();

    if (action === "on") {
        antiDeleteEnabled = true;
        await sock.sendMessage(jid, {
            text: "✅ *ANTI-DELETE ENABLED*\n\nI will now capture all deleted messages (text, stickers, audios, videos, images) and send them to you."
        });
        console.log("✅ Anti-delete enabled globally");
    } else if (action === "off") {
        antiDeleteEnabled = false;
        await sock.sendMessage(jid, {
            text: "❌ *ANTI-DELETE DISABLED*\n\nDeleted messages will no longer be captured."
        });
        console.log("❌ Anti-delete disabled globally");
    } else {
        await sock.sendMessage(jid, { text: "❌ Use: .antidelete on/off" });
    }
}

export const monitor = (sock) => {
    console.log("🔍 Anti-delete monitor loaded");

    // Cache all incoming messages
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;

        for (const m of messages) {
            try {
                if (!m.message) continue;
                if (m.key.fromMe) continue;

                const key = m.key;
                const jid = key.remoteJid;

                let mediaBuffer = null;
                const messageType = Object.keys(m.message)[0];

                // ✅ use correct download function
                if (["imageMessage", "videoMessage", "audioMessage", "stickerMessage", "documentMessage"].includes(messageType)) {
                    try {
                        mediaBuffer = await downloadMediaMessage(m, "buffer", {}, { logger: console });
                    } catch (e) {
                        console.error("⚠️ Failed to download media:", e);
                    }
                }

                messageCache.set(key.id, {
                    message: m.message,
                    jid,
                    sender: key.participant || jid,
                    timestamp: new Date(),
                    pushName: m.pushName || "Unknown",
                    buffer: mediaBuffer,
                    type: messageType
                });

                console.log(`💾 Cached message ${key.id} (${messageType}) from ${jid}`);
            } catch (error) {
                console.error("Error caching message:", error);
            }
        }
    });

    // Handle message deletions
    sock.ev.on("messages.update", async (updates) => {
        if (!antiDeleteEnabled) return;

        for (const update of updates) {
            try {
                if (!update.key) continue;
                const isDeletion =
                    update.update?.message === null ||
                    (update.update && Object.keys(update.update).length === 0) ||
                    update.messageStubType === 8;

                if (isDeletion) {
                    const cached = messageCache.get(update.key.id);
                    if (cached) {
                        await handleDeletedMessage(sock, cached);
                        messageCache.delete(update.key.id);
                    }
                }
            } catch (error) {
                console.error("Error handling message update:", error);
            }
        }
    });

    // Also handle messages.delete
    sock.ev.on("messages.delete", async (item) => {
        if (!antiDeleteEnabled || !item.keys) return;

        for (const key of item.keys) {
            try {
                const cached = messageCache.get(key.id);
                if (cached) {
                    await handleDeletedMessage(sock, cached);
                    messageCache.delete(key.id);
                }
            } catch (error) {
                console.error("Error handling messages.delete:", error);
            }
        }
    });
};

async function handleDeletedMessage(sock, cached) {
    try {
        const { message, jid, sender, timestamp, pushName, buffer, type } = cached;

        const senderName = pushName || sender.split("@")[0];
        const chatType = jid.endsWith("@g.us") ? "Group" : "DM";

        const alert = `
🚨 *DELETED MESSAGE ALERT* 🚨

👤 *From:* ${senderName}
💬 *Chat:* ${chatType}
⏰ *Time:* ${timestamp.toLocaleString()}
📝 *Type:* ${type}
        `;

        await sock.sendMessage(sock.user.id, { text: alert });

        if (buffer) {
            let mediaType;
            if (type === "imageMessage") mediaType = "image";
            else if (type === "videoMessage") mediaType = "video";
            else if (type === "audioMessage") mediaType = "audio";
            else if (type === "stickerMessage") mediaType = "sticker";
            else if (type === "documentMessage") mediaType = "document";

            await sock.sendMessage(sock.user.id, { [mediaType]: buffer });
        } else if (message.conversation) {
            await sock.sendMessage(sock.user.id, { text: `📝 Deleted text: ${message.conversation}` });
        }
    } catch (error) {
        console.error("Error sending deletion alert:", error);
    }
}
