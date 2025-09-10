// commands/play.js
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { fileURLToPath } from "url";
import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ytSearch from "yt-search";

const unlinkAsync = promisify(fs.unlink);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const command = "play";

export async function execute(sock, m) {
  const jid = m.key.remoteJid;

  // Extract raw text from the message
  const raw =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    m.message?.documentMessage?.caption ||
    "";

  // Get query (remove ".play")
  let query = raw;
  if (query.toLowerCase().startsWith(".play")) {
    query = query.slice(5).trim();
  }

  if (!query) {
    await sock.sendMessage(jid, {
      text: "❌ Please provide a song name. Example: `.play despacito`",
    });
    return;
  }

  try {
    await sock.sendMessage(jid, {
      text: `⏳ Searching YouTube for *${query}*...`,
    });

    // 🔍 Search YouTube
    const search = await ytSearch(query);
    if (!search || !search.videos || search.videos.length === 0) {
      await sock.sendMessage(jid, { text: "❌ No YouTube results found." });
      return;
    }

    const video = search.videos[0];
    await sock.sendMessage(jid, {
      text: `🎵 Found: *${video.title}*\n⏳ Downloading & converting to MP3...`,
    });

    // Temp output file
    const outFile = path.join(__dirname, `../temp-${Date.now()}.mp3`);

    // Download + convert
    await new Promise((resolve, reject) => {
      const stream = ytdl(video.url, {
        filter: "audioonly",
        quality: "highestaudio",
      });

      ffmpeg(stream)
        .setFfmpegPath(ffmpegPath)
        .audioBitrate(128)
        .format("mp3")
        .on("error", (err) => reject(err))
        .on("end", () => resolve())
        .save(outFile);
    });

    // ✅ FIXED: Use Buffer instead of createReadStream
    const audioBuffer = fs.readFileSync(outFile);

    await sock.sendMessage(jid, {
      audio: audioBuffer,
      mimetype: "audio/mp4", // WhatsApp prefers this
      ptt: false, // true if you want it as a voice note
    });

    await unlinkAsync(outFile).catch(() => {});
  } catch (err) {
    console.error("Play command error:", err);
    await sock.sendMessage(jid, { text: `❌ Error: ${err?.message || err}` });
  }
}
