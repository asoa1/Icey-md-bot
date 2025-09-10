import { exec, spawn } from "child_process";

let botProcess;

// 📦 Install dependencies
function installDependencies() {
  return new Promise((resolve, reject) => {
    console.log("📦 Installing dependencies...");
    exec("npm install", (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Error installing dependencies:", error);
        reject(error);
      } else {
        console.log("✅ Dependencies installed");
        resolve();
      }
    });
  });
}

// 🚀 Start bot (start.js)
function startBot() {
  console.log("🚀 Starting bot...");
  botProcess = spawn("node", ["start.js"], { stdio: "inherit" });

  botProcess.on("close", (code) => {
    console.log(`⚠️ Bot process exited with code ${code}`);
    // Restart if it crashes
    if (code !== 0) {
      console.log("♻️ Restarting bot after crash...");
      startBot();
    }
  });
}

// 🔄 Update bot (pull from GitHub + install + restart)
function updateBot() {
  console.log("🔄 Updating bot from GitHub...");
  exec("git pull origin main", (error, stdout, stderr) => {
    if (error) {
      console.error("❌ Git pull failed:", error);
      return;
    }
    console.log(stdout);

    console.log("📦 Installing updated dependencies...");
    exec("npm install", (err, out, errout) => {
      if (err) {
        console.error("❌ Error installing dependencies:", err);
        return;
      }
      console.log("✅ Update complete. Restarting bot...");

      if (botProcess) {
        botProcess.kill("SIGTERM"); // stop old bot
      }
      startBot(); // restart bot
    });
  });
}

// 🔐 Allow .update from stdin (for testing)
// You can also hook this into your WhatsApp commands
process.stdin.on("data", (data) => {
  const input = data.toString().trim();
  if (input === ".update") {
    updateBot();
  }
});

// ▶️ First run
installDependencies()
  .then(startBot)
  .catch(() => console.log("⚠️ Skipping start due to install error"));
