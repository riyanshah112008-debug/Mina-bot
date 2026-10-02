const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");
const { formatTime } = require("../../utils/musicManager");

module.exports = {
  name: "play",
  aliases: ["p"],
  category: "Music",
  description: "Play music from YouTube, Spotify, SoundCloud, or direct URLs.",
  usage: "play <song title or URL>",
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play high-fidelity audio in your voice channel.")
    .addStringOption((opt) =>
      opt.setName("song").setDescription("Song name, Spotify URL, or audio link").setRequired(true)
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const user = isSlash ? context.user : context.author;
    const member = context.member;
    const guild = context.guild;

    const voiceChannel = member?.voice?.channel;
    if (!voiceChannel) {
      return context.reply({
        content: "❌ You must be connected to a voice channel first to play music!",
        ephemeral: true,
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

    if (!client.manager) {
      return context.reply({
        content: "⚠️ Music Manager is currently initializing. Please try again in a moment.",
        ephemeral: true,
      });
    }

    if (isSlash) {
      await context.deferReply();
    }

    const replyFunc = isSlash
      ? (payload) => context.editReply(payload)
      : (payload) => context.reply(payload);

    try {
      // Create or get Kazagumo player
      let player = client.manager.getPlayer(guild.id);
      if (!player) {
        player = await client.manager.createPlayer({
          guildId: guild.id,
          voiceId: voiceChannel.id,
          textId: context.channel.id,
          deaf: true,
        });
      } else if (player.voiceId !== voiceChannel.id) {
        player.setVoiceChannel(voiceChannel.id);
      }

      // Search for the requested track or playlist
      const res = await client.manager.search(query, { requester: user });

      if (!res || !res.tracks || res.tracks.length === 0 || res.loadType === "empty" || res.loadType === "error") {
        return replyFunc({ content: `❌ No results found for: \`${query}\`` });
      }

      if (res.loadType === "playlist") {
        for (const track of res.tracks) {
          player.queue.add(track);
        }
        if (!player.playing && !player.paused) player.play();

        const totalDuration = res.tracks.reduce((acc, t) => acc + (t.length || 0), 0);
        const embed = new EmbedBuilder()
          .setColor(config.theme.primary || 0x5865f2)
          .setTitle(`📚 Enqueued Playlist: ${res.playlistName || "Loaded Playlist"}`)
          .setDescription(
            `✅ Added **${res.tracks.length}** tracks to the server queue!\n\n` +
              `🕒 **Estimated Playtime:** \`${formatTime(totalDuration)}\`\n` +
              `🔠 **Queue Length:** \`${player.queue.length}\` upcoming songs`
          )
          .setFooter({ text: `Requested by ${user.tag || user.username}` })
          .setTimestamp();

        return replyFunc({ embeds: [embed] });
      } else {
        const track = res.tracks[0];
        player.queue.add(track);

        if (!player.playing && !player.paused && !player.queue.current) {
          player.play();
        }

        const embed = new EmbedBuilder()
          .setColor(config.theme.primary || 0x5865f2)
          .setTitle("🎵 Added to Queue")
          .setDescription(`**[${track.title}](${track.uri})**`)
          .addFields(
            { name: "Artist", value: `\`${track.author || "Unknown"}\``, inline: true },
            { name: "Duration", value: `\`${formatTime(track.length)}\``, inline: true },
            { name: "Queue Position", value: `\`#${player.queue.length}\``, inline: true }
          )
          .setFooter({ text: `Requested by ${user.tag || user.username}` })
          .setTimestamp();

        return replyFunc({ embeds: [embed] });
      }
    } catch (err) {
      console.error("[play command error]:", err);
      return replyFunc({ content: `❌ Could not play track: ${err.message}` });
    }
  },
};
