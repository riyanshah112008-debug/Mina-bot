const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus,
  EndBehaviorType,
  getVoiceConnection,
  VoiceConnectionStatus
} = require('@discordjs/voice');
const prism = require('prism-media');
const { Readable } = require('stream');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('callstarry')
    .setDescription('📞 Call Starry for a private 1-on-1 human-like AI voice call! (Premium Only)'),

  async execute(interaction, client) {
    // ⏱️ 1. DEFER IMMEDIATELY
    await interaction.deferReply({ ephemeral: false }).catch(() => {});

    try {
      // 👑 2. PREMIUM CHECK
      const isPremium = interaction.client.isPremium 
        ? interaction.client.isPremium(interaction.guild?.id, interaction.user.id)
        : false;

      if (!isPremium) {
        const premiumEmbed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('✨ Starry Premium Feature')
          .setDescription(`📞 **\` /callstarry \` Voice AI is an exclusive Starry Premium feature!**`)
          .setFooter({ text: 'Starry Voice AI', iconURL: interaction.client.user.displayAvatarURL() });

        return interaction.editReply({ embeds: [premiumEmbed] });
      }

      // 🎙️ 3. VOICE CHANNEL VALIDATION
      const member = interaction.member;
      const voiceChannel = member?.voice?.channel;

      if (!voiceChannel) {
        return interaction.editReply({ content: "❌ You need to be in a voice channel first to call me!" });
      }

      const permissions = voiceChannel.permissionsFor(interaction.client.user);
      if (!permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
        return interaction.editReply({ content: "❌ I don't have permissions to connect and speak in your voice channel!" });
      }

      const humanMembers = voiceChannel.members.filter(m => !m.user.bot);
      if (humanMembers.size > 1) {
        return interaction.editReply({ content: "🔒 `/callstarry` is for private 1-on-1 calls. Please call me when you are alone in VC!" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return interaction.editReply({ content: "❌ `GEMINI_API_KEY` is missing in Environment Variables on Render!" });
      }

      await interaction.editReply({ content: `📞 **Connecting to ${voiceChannel.name}...** Hey ${member.displayName}, Starry is on the line!` });

      // 4. JOIN VOICE CHANNEL
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });

      const player = createAudioPlayer();
      connection.subscribe(player);

      player.on('error', err => console.error('❌ [CallStarry Player Error]:', err.message));

      let audioQueue = [];
      let isProcessing = false;
      let inactivityTimeout = null;

      const chatHistory = [
        {
          role: "user",
          parts: [{ text: "You are Starry, a warm AI friend in a 1-on-1 Discord call. Keep responses short (1-2 sentences max, under 20 words). Do not use asterisks or emojis." }]
        },
        {
          role: "model",
          parts: [{ text: "Hey there! Starry here. I can hear you clearly now! What is on your mind today?" }]
        }
      ];

      // StreamElements Amazon Polly High-Quality Voice Streamer
      const playTTS = async (text) => {
        try {
          const cleanText = text.replace(/[*_~#`]/g, '').trim();
          const ttsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=Salli&text=${encodeURIComponent(cleanText)}`;
          
          const res = await fetch(ttsUrl);
          if (!res.ok) throw new Error(`TTS Stream Error: ${res.status}`);

          const arrayBuf = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const resource = createAudioResource(Readable.from(buffer));
          player.play(resource);
        } catch (err) {
          console.error('❌ [CallStarry TTS Error]:', err);
        }
      };

      const resetInactivityTimer = () => {
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => cleanupAndDisconnect(), 3 * 60 * 1000);
      };

      const cleanupAndDisconnect = () => {
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
        interaction.client.removeListener('voiceStateUpdate', channelListener);
        player.stop();
        const activeConn = getVoiceConnection(interaction.guild.id);
        if (activeConn && activeConn.state.status !== VoiceConnectionStatus.Destroyed) {
          activeConn.destroy();
        }
      };

      resetInactivityTimer();

      // Play Opening Greeting
      playTTS("Hey! Starry is connected and listening. What is up?");

      // 5. VOICE RECEIVER ENGINE
      const receiver = connection.receiver;

      receiver.speaking.on('start', (speakingUserId) => {
        if (speakingUserId !== member.id) return;

        console.log(`🎙️ [CallStarry] Speaking detected from User ${speakingUserId}`);

        if (player.state.status === AudioPlayerStatus.Playing) {
          player.stop();
        }

        if (isProcessing) return;
        resetInactivityTimer();

        const audioStream = receiver.subscribe(member.id, {
          end: { behavior: EndBehaviorType.AfterSilence, duration: 800 }
        });

        const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
        const pcmChunks = [];

        audioStream.pipe(opusDecoder);
        opusDecoder.on('data', (chunk) => pcmChunks.push(chunk));

        opusDecoder.on('end', async () => {
          const buffer = Buffer.concat(pcmChunks);
          console.log(`🎙️ [CallStarry] Audio Buffer Captured: ${buffer.length} bytes`);

          if (buffer.length < 2500) {
            console.log(`⚠️ [CallStarry] Audio too quiet/short (${buffer.length} bytes), skipping.`);
            return;
          }

          isProcessing = true;

          try {
            const wavBuffer = pcmToWav(buffer, 48000, 2);
            const base64Audio = wavBuffer.toString("base64");

            console.log(`📡 [CallStarry] Sending ${wavBuffer.length} bytes WAV to Gemini API...`);

            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [
                    ...chatHistory,
                    {
                      role: "user",
                      parts: [
                        { inlineData: { mimeType: "audio/wav", data: base64Audio } },
                        { text: "Listen to my speech and reply as Starry in 1 short spoken sentence." }
                      ]
                    }
                  ]
                })
              }
            );

            const data = await geminiRes.json();
            
            if (data.error) {
              console.error("❌ [Gemini API Error]:", JSON.stringify(data.error));
              isProcessing = false;
              return;
            }

            let aiReply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            console.log(`🗣️ [Starry Reply Generated]: "${aiReply}"`);

            if (!aiReply) {
              isProcessing = false;
              return;
            }

            chatHistory.push({ role: "user", parts: [{ text: "[Voice Audio Message]" }] });
            chatHistory.push({ role: "model", parts: [{ text: aiReply }] });
            if (chatHistory.length > 10) chatHistory.splice(1, 2);

            await playTTS(aiReply);

          } catch (error) {
            console.error("❌ [CallStarry Engine Exception]:", error);
          } finally {
            isProcessing = false;
          }
        });
      });

      const channelListener = (oldState, newState) => {
        if (oldState.channelId === voiceChannel.id || newState.channelId === voiceChannel.id) {
          const currentHumans = voiceChannel.members.filter(m => !m.user.bot);
          if (currentHumans.size !== 1) cleanupAndDisconnect();
        }
      };

      interaction.client.on('voiceStateUpdate', channelListener);

    } catch (err) {
      console.error("❌ [CallStarry Execution Error]:", err);
      await interaction.editReply({ content: "❌ An error occurred starting the call!" }).catch(() => {});
    }
  }
};

function pcmToWav(pcmBuffer, sampleRate = 48000, channels = 2) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);
  return Buffer.concat([header, pcmBuffer]);
}
