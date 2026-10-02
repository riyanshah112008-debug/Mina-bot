const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const config = require("../../config");

module.exports = {
  name: "serverinfo",
  aliases: ["guildinfo", "sinfo"],
  category: "Utility",
  description: "Display detailed statistics and information about the current server.",
  usage: "serverinfo",
  data: new SlashCommandBuilder().setName("serverinfo").setDescription("Display server information."),

  async execute(context, args, client) {
    const guild = context.guild;
    if (!guild) return;

    // Fetch members count if not fully cached
    const totalMembers = guild.memberCount;
    const humans = guild.members.cache.filter((m) => !m.user.bot).size || totalMembers;
    const bots = guild.members.cache.filter((m) => m.user.bot).size || 0;

    const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
    const categories = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size;

    const owner = await guild.fetchOwner().catch(() => null);
    const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle(`🏰 Server Information | ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      .addFields(
        { name: "Server Owner", value: owner ? `<@${owner.id}> (\`${owner.user.tag || owner.user.username}\`)` : "`Unknown`", inline: true },
        { name: "Server ID", value: `\`${guild.id}\``, inline: true },
        { name: "Created On", value: `<t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)`, inline: false },
        { name: "👥 Members", value: `**Total:** ${totalMembers}\n**Humans:** ${humans}\n**Bots:** ${bots}`, inline: true },
        { name: "💬 Channels", value: `**Text:** ${textChannels}\n**Voice:** ${voiceChannels}\n**Categories:** ${categories}`, inline: true },
        { name: "✨ Boost Status", value: `**Tier:** ${guild.premiumTier}\n**Boosts:** ${guild.premiumSubscriptionCount || 0}`, inline: true },
        { name: "🛡️ Verification Level", value: `\`${guild.verificationLevel}\``, inline: true },
        { name: "🎭 Roles Count", value: `\`${guild.roles.cache.size}\` roles`, inline: true }
      )
      .setFooter({ text: "Mina Bot Utility" })
      .setTimestamp();

    if (guild.bannerURL()) {
      embed.setImage(guild.bannerURL({ size: 1024 }));
    }

    return context.reply({ embeds: [embed] });
  },
};
