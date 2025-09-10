import { exec, spawn } from "child_process";
import fs from "fs";
import path from "path";
import axios from "axios";
import AdmZip from "adm-zip";

const BOT_DIR = path.resolve("./"); 
const TEMP_ZIP = path.join(BOT_DIR, "update.zip");
const GITHUB_ZIP_URL = "https://github.com/USERNAME/REPO/archive/refs/heads/main.zip"; // replace with your repo

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

// 🚀 Start bot
function startBot() {
  console.log("🚀 Starting bot...");
  botProcess = spawn("node", ["start.js"], { stdio: "inherit" });

  botProcess.on("exit", (code, signal) => {
    if (signal === "SIGTERM") return; // normal restart
    console.log(`⚠️ Bot exited unexpectedly with code ${code}. Restarting...`);
    startBot();
  });
}

// 🔄 Update using Git
function updateWithGit() {
  return new Promise((resolve, reject) => {
    console.log("🔄 Pulling update from Git...");
    exec("git pull origin main", (error, stdout, stderr) => {
      if (error) return reject(error);
      console.log(stdout);
      resolve();
    });
  });
}

// 🔄 Update using ZIP
async function updateWithZip() {
  console.log("🔄 Downloading update ZIP from GitHub...");
  const response = await axios({ url: GITHUB_ZIP_URL, method: "GET", responseType: "arraybuffer" });
  fs.writeFileSync(TEMP_ZIP, response.data);

  console.log("📦 Extracting update...");
  const zip = new AdmZip(TEMP_ZIP);
  const zipEntries = zip.getEntries();

  zipEntries.forEach(entry => {
    const filePath = path.join(BOT_DIR, entry.entryName.split("/").slice(1).join("/"));
    if (entry.isDirectory) {
      if (!fs.existsSync(filePath)) fs.mkdirSync(filePath, { recursive: true });
    } else {
      if (!filePath.includes("auth_info")) fs.writeFileSync(filePath, entry.getData());
    }
  });

  fs.unlinkSync(TEMP_ZIP);
  console.log("✅ ZIP update applied");
}

// 🔄 Main update function
async function updateBot() {
  try {
    await updateWithGit();
  } catch (gitError) {
    console.warn("⚠️ Git update failed, using ZIP fallback:", gitError.message);
    await updateWithZip();
  }

  await installDependencies();

  console.log("♻️ Restarting bot...");
  if (botProcess) botProcess.kill("SIGTERM");
  startBot();
}

// 🔐 Listen for .update from stdin
process.stdin.on("data", data => {
  const input = data.toString().trim();
  if (input === ".update") updateBot();
});

// ▶️ First run
installDependencies().then(startBot).catch(() => console.log("⚠️ Skipping start due to install error"));

// Graceful exit on Ctrl+C
process.on("SIGINT", () => {
  console.log("\n🛑 Exiting...");
  if (botProcess) botProcess.kill("SIGTERM");
  process.exit();
});
