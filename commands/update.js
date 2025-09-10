import simpleGit from "simple-git";
import { spawn } from "child_process";
import fs from "fs-extra";

export const command = "update";

export async function execute(sock, m) {
  const jid = m.key.remoteJid;

  try {
    const git = simpleGit();

    await sock.sendMessage(jid, { text: "⏳ Pulling latest changes from GitHub..." });

    // Pull latest code
    await git.pull("origin", "main");

    // Keep auth_info folder safe
    if (!fs.existsSync("./auth_info")) {
      fs.mkdirSync("./auth_info");
    }

    await sock.sendMessage(jid, { text: "✅ Update successful! Restarting bot..." });

    // Restart bot
    const restart = spawn("node", ["index.js"], { stdio: "inherit" });
    process.exit(0);

  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Update failed: ${err.message}` });
  }
}
