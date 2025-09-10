export const command = 'ping';
export const execute = async (sock, m) => {
  const jid = m.key.remoteJid;

  const latency = Date.now() - (m.messageTimestamp * 1000);
  const uptime = process.uptime();

  // Pick a random "vibe"
  const vibes = [
    "⚡ Zooming through cyberspace...",
    "🚀 Warp speed engaged!",
    "🌌 The Matrix is stable...",
    "🔥 Power levels OVER 9000!!!",
    "🎯 Laser sharp response!"
  ];
  const vibe = vibes[Math.floor(Math.random() * vibes.length)];

  // Build cooler response
  const pingResponse = `
╭───🏓 PING SYSTEM 🏓───╮
│
│  ⚡ Latency : ${latency}ms
│  💫 Uptime  : ${Math.floor(uptime)}s
│  🌐 Status  : ONLINE ✅
│
╰───────────────────────╯

${vibe}
  `;

  await sock.sendMessage(jid, { text: pingResponse });
};
