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

  botProcess.on("close", (code, signal) => {
    if (signal === "SIGTERM" || signal === "SIGINT") {
      console.log("🛑 Bot stopped manually.");
      process.exit(0);
    }
    if (code === 0) {
      console.log("✅ Bot exited normally.");
      process.exit(0);
    } else {
      console.log("⚠️ Bot crashed. Restarting...");
      startBot();
    }
  });
}

// 🔄 Update bot (git pull + install + restart)
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

      if (botProcess) botProcess.kill("SIGTERM");
      startBot();
    });
  });
}

// Listen for `.update` typed in terminal
process.stdin.on("data", (data) => {
  const input = data.toString().trim();
  if (input === ".update") {
    updateBot();
  }
});

// 🔐 Handle Ctrl+C (SIGINT)
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping bot (Ctrl+C pressed)...");
  if (botProcess) botProcess.kill("SIGTERM");
  process.exit(0);
});

// ▶️ First run
installDependencies()
  .then(startBot)
  .catch(() => console.log("⚠️ Skipping start due to install error"));
