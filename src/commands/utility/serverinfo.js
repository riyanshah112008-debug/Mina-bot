const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const config = require("../../config");

const verificationLevels = {
  0: "None (Unrestricted)",
  1: "Low (Verified Email)",
  2: "Medium (Registered > 5m)",
  3: "High (Member > 10m)",
  4: "Highest (Verified Phone)"
};

const boostTiers = {
  0: "Level 0 (No Perks)",
  1: "Tier 1 🌟",
  2: "Tier 2 🚀",
  3: "Tier 3 👑"
};

module.exports = {
  name: "serverinfo",
  aliases: ["guildinfo", "sinfo"],
  category: "Utility",
  description: "Display detailed statistics and information about the current server.",
  usage: "serverinfo",
  data: new SlashCommandBuilder().setName("serverinfo").setDescription("Display server information and overview."),

  async execute(context, args, client) {
    const guild = context.guild;
    if (!guild) return;

    const totalMembers = guild.memberCount || guild.members.cache.size;
    const humans = guild.members.cache.filter((m) => !m.user.bot).size || totalMembers;
    const bots = guild.members.cache.filter((m) => m.user.bot).size || 0;

    const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice).size;
    const categories = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size;

    const owner = await guild.fetchOwner().catch(() => null);
    const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);
    const boostTierName = boostTiers[guild.premiumTier] || `Tier ${guild.premiumTier}`;
    const verificationLabel = verificationLevels[guild.verificationLevel] || `Level ${guild.verificationLevel}`;

    const embed = new EmbedBuilder()
      .setColor(config.theme?.primary || config.EMBED_COLORS?.PRIMARY || "#5865F2")
      .setAuthor({
        name: `${guild.name} • Server Overview`,
        iconURL: guild.iconURL({ dynamic: true }) || undefined
      })
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      .setDescription(
        `>>> **Server Identity & Metadata**\n` +
        `• **Owner:** ${owner ? `<@${owner.id}> (\`${owner.user.tag || owner.user.username}\`)` : "`Unknown`"}\n` +
        `• **Server ID:** \`${guild.id}\`\n` +
        `• **Founded:** <t:${createdTimestamp}:D> (<t:${createdTimestamp}:R>)`
      )
      .addFields(
        {
          name: "👥 Membership",
          value: `• **Total:** \`${totalMembers.toLocaleString()}\`\n• **Humans:** \`${humans.toLocaleString()}\`\n• **Bots:** \`${bots.toLocaleString()}\``,
          inline: true
        },
        {
          name: "💬 Channel Directory",
          value: `• **Text:** \`${textChannels}\`\n• **Voice:** \`${voiceChannels}\`\n• **Categories:** \`${categories}\``,
          inline: true
        },
        {
          name: "✨ Boost Standing",
          value: `• **Status:** \`${boostTierName}\`\n• **Boosts:** \`${guild.premiumSubscriptionCount || 0} active\``,
          inline: true
        },
        {
          name: "🛡️ Verification & Security",
          value: `\`${verificationLabel}\``,
          inline: true
        },
        {
          name: "🏷️ Server Assets",
          value: `• **Roles:** \`${guild.roles.cache.size}\`\n• **Emojis:** \`${guild.emojis.cache.size}\``,
          inline: true
        },
        {
          name: "🌐 Region / Locale",
          value: `\`${guild.preferredLocale || "en-US"}\``,
          inline: true
        }
      )
      .setFooter({ text: `${config.BOT_NAME || "Mina"} System • Server Insights` })
      .setTimestamp();

    if (guild.bannerURL()) {
      embed.setImage(guild.bannerURL({ size: 1024 }));
    }

    return context.reply({ embeds: [embed] });
  },
};
