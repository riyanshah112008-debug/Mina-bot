const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const config = require("../../config");
const { formatTime } = require("../../utils/musicManager");
const { StarryAudioEngine } = require("../../utils/nativeAudioEngine");

const EPHEMERAL_FLAG = MessageFlags && MessageFlags.Ephemeral ? MessageFlags.Ephemeral : 64;

module.exports = {
  name: "play",
  aliases: ["p"],
  category: "Music",
  description: "Play high-fidelity audio from SoundCloud, Spotify, YouTube, or direct URLs.",
  usage: "play <song title or URL>",
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play high-fidelity audio in your voice channel.")
    .addStringOption((opt) =>
      opt.setName("song").setDescription("Song title, Spotify URL, or audio link").setRequired(true).setAutocomplete(true)
    ),

  async autocomplete(interaction, client) {
    try {
      const { getSongAutocomplete } = require("../../utils/musicSearchHelper");
      const focused = interaction.options.getFocused();
      const choices = await getSongAutocomplete(focused, client.manager);
      return interaction.respond(choices).catch(() => {});
    } catch (_) {}
  },

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const user = isSlash ? context.user : context.author;
    const member = context.member;
    const guild = context.guild;

    const voiceChannel = member?.voice?.channel;
    if (!voiceChannel) {
      return context.reply({
        content: "❌ You must be connected to a voice channel first to play music!",
        flags: [EPHEMERAL_FLAG],
      });
    }

    const botMember = guild?.members?.me;
    if (botMember?.voice?.channelId && botMember.voice.channelId !== voiceChannel.id) {
      return context.reply({
        content: `❌ I am already playing music in <#${botMember.voice.channelId}>! Join my channel or wait for the queue to finish.`,
        flags: [EPHEMERAL_FLAG],
      });
    }

    const perms = voiceChannel.permissionsFor(botMember);
    if (perms && (!perms.has(PermissionFlagsBits.Connect) || !perms.has(PermissionFlagsBits.Speak))) {
      return context.reply({
        content: "❌ I lack permissions to **Connect** or **Speak** in your voice channel!",
        flags: [EPHEMERAL_FLAG],
      });
    }

    let query;
    if (isSlash) {
      query = context.options.getString("song")?.trim();
    } else {
      if (!args || !args[0]) {
        const prefix = config.prefix || "?";
        return context.reply({ content: `❌ **Usage:** \`${prefix}play <song title or URL>\`` });
      }
      query = args.join(" ").trim();
    }

    if (isSlash && typeof context.deferReply === "function") {
      await context.deferReply().catch(() => {});
    }

    const replyFunc = isSlash
      ? (payload) => context.editReply(payload)
      : (payload) => context.reply(payload);

    let loadingMsg = null;
    if (!isSlash && typeof context.reply === "function") {
      loadingMsg = await context.reply(
        `🔍 **Searching:** \`${query.length > 50 ? query.substring(0, 47) + "..." : query}\` • *Connecting to voice...*`
      ).catch(() => null);
    }

    try {
      // 1. Primary High-Fidelity Native Audio Engine (100% Host-Anywhere • Termux Compatible)
      const player = StarryAudioEngine.getOrCreatePlayer(client, guild.id, voiceChannel, context.channel);
      if (loadingMsg) player.loadingMessage = loadingMsg;

      const connectPromise = player.connect().catch(() => {});
      const searchPromise = StarryAudioEngine.search(query, user);

      const [_, result] = await Promise.race([
        Promise.all([connectPromise, searchPromise]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Audio search or voice connect timed out")), 20000)
        ),
      ]);

      if (!result || !result.tracks || result.tracks.length === 0) {
        if (loadingMsg) loadingMsg.delete().catch(() => {});
        return replyFunc({ content: `❌ No results found for: \`${query}\`` });
      }

      if (result.type === "PLAYLIST") {
        for (const track of result.tracks) {
          player.queue.push(track);
        }
        if (!player.currentTrack && !player.isPlaying) {
          await player.playNext();
        }

        if (loadingMsg) {
          loadingMsg.delete().catch(() => {});
          player.loadingMessage = null;
        }

        const totalDurationMs = result.tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
        const totalDurationStr = formatTime(totalDurationMs);

        const previewTracks = result.tracks.slice(0, 3).map((t, idx) => {
          return `\`${idx + 1}.\` **[${(t.title || "Track").substring(0, 45)}](${t.url || "https://discord.gg"})** • \`${t.author || "Artist"}\` (\`${formatTime(t.duration)}\`)`;
        }).join("\n");
        const remainingCount = result.tracks.length > 3 ? `\n*... and **${result.tracks.length - 3}** more tracks*` : "";

        const embed = new EmbedBuilder()
          .setColor(config.theme.primary || 0x5865f2)
          .setAuthor({
            name: `📚 Playlist Enqueued • ${result.source || "Online Stream"}`,
            iconURL: user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : undefined,
          })
          .setTitle(result.playlistName ? result.playlistName.substring(0, 95) : "Loaded Playlist")
          .setThumbnail(result.thumbnail || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80")
          .setDescription(
            `✅ Added **${result.tracks.length}** tracks to the server queue!\n\n` +
            `👤 **Curator / Artist:** \`${result.author || "Featured Artist"}\`\n` +
            `🕒 **Total Estimated Playtime:** \`${totalDurationStr}\`\n` +
            `🔠 **Queue Status:** Currently playing • \`${player.queue.length}\` songs in queue\n` +
            `🔊 **Mastering:** \`Empowering Hi-Fi Dynamic EQ Active\`\n\n` +
            `📝 **Upcoming Tracks Preview:**\n` +
            `${previewTracks}${remainingCount}`
          )
          .setFooter({ text: `Requested by ${user.tag || user.username}` })
          .setTimestamp();

        return replyFunc({ embeds: [embed] });
      } else {
        const track = result.tracks[0];
        if (!player.currentTrack && !player.isPlaying) {
          player.queue.push(track);
          await player.playNext();
          // sendNowPlayingPanel is called by player.playTrack() automatically
          if (isSlash) {
            return replyFunc({ content: `▶️ **Playing:** \`${track.title}\``, ephemeral: true });
          }
        } else {
          player.queue.push(track);
          if (loadingMsg) {
            loadingMsg.delete().catch(() => {});
            player.loadingMessage = null;
          }

          const embed = new EmbedBuilder()
            .setColor(config.theme.primary || 0x5865f2)
            .setAuthor({
              name: "Track Queued • Empowering Sound Active",
              iconURL: user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : undefined,
            })
            .setTitle(track.title ? track.title.substring(0, 90) : "Track")
            .setURL(track.url || "https://discord.gg")
            .setThumbnail(track.thumbnail || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80")
            .setDescription(
              `👤 **Artist:** \`${track.author || "Artist"}\`\n` +
              `🕒 **Duration:** \`${formatTime(track.duration)}\`\n` +
              `🔢 **Queue Position:** \`#${player.queue.length}\`\n` +
              `🌐 **Source:** \`${track.source || "Studio Hi-Fi"}\`\n` +
              `🔊 **Sound Profile:** \`Empowering Master Dynamic EQ\``
            )
            .setFooter({ text: `Requested by ${user.tag || user.username}` })
            .setTimestamp();

          return replyFunc({ embeds: [embed] });
        }
      }
    } catch (err) {
      console.error("[play.js error]:", err);
      if (loadingMsg) loadingMsg.delete().catch(() => {});
      return replyFunc({ content: `❌ Could not play track: ${err.message}` });
    }
  },
};
