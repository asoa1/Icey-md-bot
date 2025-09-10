import { exec, spawn } from "child_process";

// Reference to the bot child process
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

// 🚀 Start the bot
function startBot() {
  console.log("🚀 Starting bot...");
  botProcess = spawn("node", ["start.js"], { stdio: "inherit" });

  // Restart automatically if the bot exits
  botProcess.on("close", (code) => {
    console.log(`⚠️ Bot process exited with code ${code}`);
    console.log("♻️ Restarting bot...");
    startBot();
  });
}

// 🔄 Update bot from GitHub and restart
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
        botProcess.kill("SIGTERM"); // Stop old bot
      }
      startBot(); // Restart bot
    });
  });
}

// 🔐 Listen to terminal input for `.update`
process.stdin.on("data", (data) => {
  const input = data.toString().trim();
  if (input === ".update") {
    updateBot();
  }
});

// ▶️ First run: install dependencies then start the bot
installDependencies()
  .then(startBot)
  .catch(() => console.log("⚠️ Skipping start due to install error"));

// ✅ Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping bot...");
  if (botProcess) botProcess.kill("SIGTERM");
  process.exit(0);
});
