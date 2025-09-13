import simpleGit from "simple-git";
import { spawn } from "child_process";
import fs from "fs-extra";

export const command = "update";

const git = simpleGit();
let lastRemoteHash = null;

/**
 * .update command – manually pull and restart
 */
export async function execute(sock, m) {
  const jid = m.key.remoteJid;

  try {
    await sock.sendMessage(jid, { text: "⏳ Pulling latest changes from GitHub..." });

    // Pull latest code
    await git.pull("origin", "main");

    // Keep auth_info safe
    if (!fs.existsSync("./auth_info")) {
      fs.mkdirSync("./auth_info");
    }

    await sock.sendMessage(jid, { text: "✅ Update successful! Restarting bot..." });

    // Restart bot
    spawn("node", ["index.js"], { stdio: "inherit" });
    process.exit(0);
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Update failed: ${err.message}` });
  }
}

/**
 * Auto-checker – runs every 10 seconds and notifies owner if update is available
 */
export function startAutoUpdateChecker(sock) {
  setInterval(async () => {
    try {
      await git.fetch("origin", "main");

      const localHash = await git.revparse(["HEAD"]);
      const remoteHash = await git.revparse(["origin/main"]);

      if (!lastRemoteHash) lastRemoteHash = remoteHash;

      if (localHash !== remoteHash) {
        await sock.sendMessage(sock.user.id, {
          text: `🔔 *Update Available!*\n\n📌 Local: ${localHash.slice(0, 7)}\n📌 Remote: ${remoteHash.slice(0, 7)}\n\n💡 Run *.update* to pull and restart.`,
        });
        console.log("🔔 Update available — notified owner");
      }
    } catch (err) {
      console.error("⚠️ Update check failed:", err.message);
    }
  }, 60 * 60 * 1000); // every 10 seconds
}
