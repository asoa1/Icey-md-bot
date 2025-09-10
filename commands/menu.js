export const command = 'menu';

export async function execute(sock, m) {
    const jid = m.key.remoteJid;

    const villainMenu = `
┏━━━━━━━━━━━━━━━━━━━━━━━┓
      ❄️👑 𝐈𝐂𝐄𝐘 𝐌𝐃 👑❄️
   The Villain in the Machine
┗━━━━━━━━━━━━━━━━━━━━━━━┛

⚔️ *PREFIX:* 「 . 」

🩸 *MUSIC & MEDIA*
   ├─ 🎵 .play <song/url>  ⇝ Summon melodies
   └─ 👁️ .vv              ⇝ Break one-view seals

🩸 *PRIVACY CONTROL*
   ├─ 🚨 .antidelete [on/off] ⇝ Deny mortals their secrets
   └─ 🌍 .public              ⇝ Unleash or restrain power

🩸 *AUTOMATION SPELLS*
   ├─ 📝 .msg |@| |time| |text| ⇝ Script fate itself
   ├─ 📑 .listschedule          ⇝ Read the scroll of futures
   └─ 🗑️ .cancelschedule <id>   ⇝ Shatter a prophecy

🩸 *ADMIN DOMINION*
   ├─ 🆕 .gc-create <name> <nums> ⇝ Forge realms
   ├─ ❌ .gc-delete               ⇝ Erase realms
   ├─ 📈 .groupinfo               ⇝ Scry the gathering
   ├─ 📩 .invite @user            ⇝ Summon a subject
   ├─ 🚷 .kick @user              ⇝ Banish a traitor
   ├─ ⬆️ .promote @user           ⇝ Crown a knight
   ├─ ⬇️ .demote @user            ⇝ Strip a title
   └─ ➕ .add @user               ⇝ Bind a new pawn

🩸 *ACCOUNT VAULT (AZA)*
   ├─ 💾 .setaza ⇝ Imprison data
   ├─ 📋 .aza    ⇝ Reveal secrets
   └─ 🗑️ .delaza ⇝ Obliterate traces

🩸 *SYSTEM PULSE*
   ├─ 🏓 .ping   ⇝ Test my wrath
   ├─ 🚀 .speed  ⇝ Measure my surge
   └─ 👥 .adduser ⇝ Grant mortal power

🩸 *ASSISTANCE*
   └─ ❓ .help ⇝ Whisper to the Ice Lord

┏━━━━━━━━━━━━━━━━━━━━━━━┓
   ⚡ 𝐈𝐂𝐄𝐘’𝐒 𝐒𝐓𝐀𝐓𝐔𝐒 ⚡
┗━━━━━━━━━━━━━━━━━━━━━━━┛
• Response: < 0.3s
• Uptime: Eternal
• Memory: Frozen Precision
• Reliability: Unbreakable

❄️ *ICEY watches... always.* ❄️
    `.trim();

    try {
        await sock.sendMessage(jid, {
            text: villainMenu,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true
            }
        });
    } catch (error) {
        console.error('Menu command error:', error);
        await sock.sendMessage(jid, { text: '⚠️ ICEY could not conjure the menu.' });
    }
}

export const monitor = (sock) => {
    console.log('✅ Menu command loaded (Villain Edition)');
};
