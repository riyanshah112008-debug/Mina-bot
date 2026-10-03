const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const db = require("../../utils/database");

let reminderInterval = null;

function initReminders(client) {
  if (reminderInterval) clearInterval(reminderInterval);

  reminderInterval = setInterval(async () => {
    try {
      const now = Date.now();
      const allReminders = db.getReminders();
      const due = allReminders.filter((r) => r.remindAt <= now);

      for (const rem of due) {
        db.removeReminder(rem.id);

        try {
          const channel = client.channels.cache.get(rem.channelId) || (await client.channels.fetch(rem.channelId).catch(() => null));
          const embed = new EmbedBuilder()
            .setColor(config.theme.primary)
            .setTitle("⏰ Reminder Alert!")
            .setDescription(`🔔 <@${rem.userId}>, here is your reminder:\n\n**${rem.reason}**`)
            .setFooter({ text: `Set <t:${Math.floor(rem.createdAt / 1000)}:R>` })
            .setTimestamp();

          if (channel && channel.isTextBased()) {
            await channel.send({ content: `<@${rem.userId}>`, embeds: [embed] }).catch(() => {});
          } else {
            // Fallback to DM if channel no longer accessible
            const user = await client.users.fetch(rem.userId).catch(() => null);
            if (user) {
              await user.send({ embeds: [embed] }).catch(() => {});
            }
          }
        } catch (e) {
          console.warn("[Reminder Dispatch Warning]:", e.message);
        }
      }
    } catch (err) {
      console.error("[Reminder Polling Error]:", err.message);
    }
  }, 5000);
}

module.exports = { initReminders };
