// commands/ytplay.js
import yts from "youtube-yts";
import axios from "axios";

export const command = "ytplay";
export const alias = ["play", "song", "music"];
export const description = "Search and play a song from YouTube as audio";
export const category = "Downloader";

export async function execute(sock, m) {
  try {
    const text =
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      "";

    if (!text.trim()) {
      return await sock.sendMessage(m.key.remoteJid, {
        text: "❌ Please provide a song name.\nExample: `.play Believer`"
      });
    }

    // 🔎 Search YouTube
    const search = await yts(text.trim());
    const video = search.all?.[0];
    if (!video) {
      return await sock.sendMessage(m.key.remoteJid, {
        text: "❌ No video found for: " + text
      });
    }

    const videoUrl = video.url;
    const title = video.title || text;

    await sock.sendMessage(m.key.remoteJid, {
      text: `📥 Downloading...\n\n▶️ *${title}*`
    });

    // 🔗 Fetch audio from downloader API
    const apiUrl =
      "https://izumiiiiiiii.dpdns.org/downloader/youtube?url=" +
      encodeURIComponent(videoUrl) +
      "&format=mp3";

    const { data } = await axios.get(apiUrl);

    if (!data?.status || !data.result?.download) {
      return await sock.sendMessage(m.key.remoteJid, {
        text: "❌ Failed to fetch audio."
      });
    }

    const audioUrl = data.result.download;

    // 🎵 Send audio file
    await sock.sendMessage(
      m.key.remoteJid,
      {
        audio: { url: audioUrl },
        mimetype: "audio/mpeg",
        fileName: title + ".mp3",
        ptt: false
      },
      { quoted: m }
    );
  } catch (err) {
    console.error("ytplay error:", err);
    await sock.sendMessage(m.key.remoteJid, {
      text: "⚠️ Error: " + (err.message || err)
    });
  }
}

export const monitor = () => {
  console.log("✅ ytplay command loaded");
};
