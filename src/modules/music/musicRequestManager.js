const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");
const { formatTime, buildNowPlayingComponents } = require("../../utils/musicManager");
const { StarryAudioEngine } = require("../../utils/nativeAudioEngine");

/**
 * Build the Embed for the Music Request Desk
 */
function buildMusicDeskEmbed(guild, client) {
  const kPlayer = client?.manager?.getPlayer(guild.id);
  const nPlayer = StarryAudioEngine.getPlayer(guild.id, client);

  const track = nPlayer?.currentTrack || kPlayer?.queue?.current;
  const isPaused = nPlayer ? nPlayer.paused : Boolean(kPlayer?.paused);
  const loopMode = nPlayer ? (nPlayer.loop || "none") : (kPlayer?.loop || "none");
  const volume = nPlayer ? nPlayer.volume : (kPlayer ? kPlayer.volume : 100);

  const embed = new EmbedBuilder().setColor(config.theme?.primary || 0x5865f2);

  if (track) {
    const title = track.title || "Unknown Track";
    const author = track.author || "Unknown Artist";
    const url = track.url || track.uri || "https://discord.gg";
    const duration = track.duration
      ? formatTime(track.duration)
      : track.length
      ? formatTime(track.length)
      : "Live Stream";
    const queueSize = (nPlayer?.queue?.length || kPlayer?.queue?.length || 0);

    embed
      .setTitle(`🎵 Now Playing: ${title.length > 60 ? title.substring(0, 57) + "..." : title}`)
      .setURL(url)
      .setDescription(
        `👤 **Artist:** \`${author}\`\n⏱️ **Duration:** \`${duration}\` • 🔊 **Volume:** \`${volume}%\`\n🔁 **Loop:** \`${loopMode.toUpperCase()}\` • 📑 **In Queue:** \`${queueSize} tracks\`\n\n*Type any song name or link below to add to queue!*`
      )
      .setFooter({ text: "Mina Hi-Fi Music Desk • Zero-prefix instant request" })
      .setTimestamp();

    const artwork = track.artworkUrl || track.thumbnail || track.displayThumbnail?.("maxresdefault");
    if (artwork) embed.setThumbnail(artwork);
  } else {
    embed
      .setTitle("🎧 Mina Hi-Fi Music Desk")
      .setDescription(
        "**No song is currently playing.**\n\n📌 **How to use:**\n1. Join a voice channel\n2. Send any song title, artist, or URL in this channel\n3. Mina will automatically join and play it for you!\n\n✨ Supports Spotify, SoundCloud, YouTube, Apple Music, and direct MP3 streams."
      )
      .setImage("https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80")
      .setFooter({ text: "Zero-Prefix Channel • Just type a song title to play" })
      .setTimestamp();
  }

  return embed;
}

/**
 * Refresh the persistent Music Desk message in a guild
 */
async function updateMusicDesk(guildId, client) {
  try {
    const deskConfig = db.getMusicRequestChannel(guildId);
    if (!deskConfig || !deskConfig.channelId || !deskConfig.messageId) return;

    const channel = await client.channels.fetch(deskConfig.channelId).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(deskConfig.messageId).catch(() => null);
    if (!message) return;

    const kPlayer = client?.manager?.getPlayer(guildId);
    const nPlayer = StarryAudioEngine.getPlayer(guildId, client);
    const isAutoplay = nPlayer ? nPlayer.autoplay : Boolean(kPlayer?.data?.get("autoplay") || kPlayer?.autoplay);
    const isPaused = nPlayer ? nPlayer.paused : Boolean(kPlayer?.paused);
    const loopMode = nPlayer ? (nPlayer.loop || "none") : (kPlayer?.loop || "none");

    const embed = buildMusicDeskEmbed(channel.guild, client);
    const components = buildNowPlayingComponents(isAutoplay, isPaused, loopMode);

    await message.edit({ embeds: [embed], components }).catch(() => null);
  } catch (err) {
    // Non-blocking catch
  }
}

/**
 * Setup or reset the dedicated music request channel
 */
async function setupMusicRequestChannel(guild, client) {
  const me = guild.members.me;
  if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error("I need the **Manage Channels** permission to create the music request channel!");
  }

  let channel = null;
  const existingConfig = db.getMusicRequestChannel(guild.id);
  if (existingConfig?.channelId) {
    channel = await guild.channels.fetch(existingConfig.channelId).catch(() => null);
  }

  if (!channel) {
    channel = await guild.channels.create({
      name: "mina-song-requests",
      type: ChannelType.GuildText,
      topic: "🎧 Zero-prefix song request channel! Just send any song title or link here to play.",
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: me.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ],
    });
  }

  // Clear previous bot messages if any to keep clean
  try {
    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    if (messages && messages.size > 0) {
      await channel.bulkDelete(messages).catch(() => null);
    }
  } catch (_) {}

  const embed = buildMusicDeskEmbed(guild, client);
  const components = buildNowPlayingComponents(false, false, "none");

  const deskMsg = await channel.send({ embeds: [embed], components });

  db.setMusicRequestChannel(guild.id, {
    channelId: channel.id,
    messageId: deskMsg.id,
    guildId: guild.id,
  });

  return { channel, deskMsg };
}

/**
 * Handle incoming message in the music request channel
 */
async function handleMusicRequestMessage(message, client) {
  if (!message.guild || message.author.bot) return;

  const reqConfig = db.getMusicRequestChannel(message.guild.id);
  if (!reqConfig || reqConfig.channelId !== message.channel.id) return;

  // Immediately delete user's message to maintain clean channel appearance
  if (message.deletable) {
    message.delete().catch(() => null);
  }

  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) {
    const alert = await message.channel.send({
      content: `❌ <@${message.author.id}>, you must connect to a voice channel first to request music!`,
    }).catch(() => null);
    if (alert) setTimeout(() => alert.delete().catch(() => null), 5000);
    return;
  }

  const query = message.content.trim();
  if (!query) return;

  const playCommand = client.commands.get("play");
  if (!playCommand) return;

  try {
    await playCommand.execute(message, query.split(/\s+/), client);
    // Update the music desk embed after queueing
    setTimeout(() => {
      updateMusicDesk(message.guild.id, client);
    }, 1500);
  } catch (err) {
    console.error("[MusicRequestDesk] Error queueing track:", err.message);
  }
}

module.exports = {
  buildMusicDeskEmbed,
  updateMusicDesk,
  setupMusicRequestChannel,
  handleMusicRequestMessage,
};
