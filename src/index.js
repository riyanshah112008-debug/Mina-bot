'use strict';
require('dotenv').config();
try { process.env.FFMPEG_PATH = require('ffmpeg-static') || 'ffmpeg'; } catch (_) { process.env.FFMPEG_PATH = 'ffmpeg'; }
const http = require('node:http');
const { Client, GatewayIntentBits, Partials, REST, Routes, Events } = require('discord.js');
const store = require('./store');
const security = require('./security');
const commands = require('./commands');
const lilgrave = require('./lilgrave');
const features = require('./features');
const utility = require('./utility');
const music = require('./music');
const { brandInteraction } = require('./utils/embeds');

const token = process.env.DISCORD_TOKEN, clientId = process.env.CLIENT_ID;
if (!token || !clientId) { console.error('Missing DISCORD_TOKEN or CLIENT_ID.'); process.exit(1); }
const client = new Client({ intents: [GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildModeration,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildVoiceStates], partials: [Partials.Channel,Partials.GuildMember,Partials.Message] });
const player = music.createMusicManager(client); client.player = player;
const port = Number(process.env.PORT || 10000);
const healthServer = http.createServer((req,res) => {
  if (req.url === '/health' || req.url === '/ping') { res.writeHead(200,{'content-type':'application/json'}); return res.end(JSON.stringify({status:'ok',bot:client.isReady()?'online':'starting',uptime:process.uptime()})); }
  res.writeHead(404); res.end();
});
healthServer.listen(port,'0.0.0.0',() => {
  console.log('[NovaBot] Health server listening on port '+port);
  // NovaBot-style Render keep-alive: ping the public service URL every 3 minutes.
  // Render supplies RENDER_EXTERNAL_URL automatically; no extra secret is required.
  const externalUrl = process.env.RENDER_EXTERNAL_URL ||
    (process.env.RENDER_EXTERNAL_HOSTNAME ? 'https://' + process.env.RENDER_EXTERNAL_HOSTNAME : null);
  if (externalUrl) {
    console.log('[NovaBot KeepAlive] External self-ping enabled (every 3 minutes).');
  } else {
    console.warn('[NovaBot KeepAlive] Render URL not detected; external keep-alive is inactive.');
  }
  const ping = (target, label) => {
    const clientModule = target.startsWith('https:') ? require('node:https') : http;
    const req = clientModule.get(target, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MinaKeepAlive/1.0)' },
      timeout: 10000
    }, res => {
      res.resume();
      if (res.statusCode >= 400) console.warn('[NovaBot KeepAlive] '+label+' returned HTTP '+res.statusCode);
    });
    req.on('timeout', () => req.destroy(new Error('Keep-alive request timed out')));
    req.on('error', error => console.warn('[NovaBot KeepAlive] '+label+' ping failed:', error.message));
  };
  const keepAliveTimer = setInterval(() => {
    ping('http://127.0.0.1:'+port+'/health', 'local');
    if (externalUrl) ping((externalUrl.endsWith('/') ? externalUrl.slice(0, -1) : externalUrl)+'/health', 'external');
  }, 180000);
  keepAliveTimer.unref?.();
});
client.once(Events.ClientReady,async ready => {
  console.log('[NovaBot] Online as '+ready.user.tag);
  try { await player.init(ready.user.id); console.log('[NovaBot] Lavalink music manager initialized.'); } catch(error) { console.error('[NovaBot] Lavalink initialization failed:',error.message); }
  try {
    const rest=new REST({version:'10'}).setToken(token);
    const route=process.env.GUILD_ID?Routes.applicationGuildCommands(clientId,process.env.GUILD_ID):Routes.applicationCommands(clientId);
    await rest.put(route,{body:[...commands.commands,...lilgrave.commands,...features.commands]}); console.log('[NovaBot] Registered '+commands.commands.length+' commands.');
  } catch(error) { console.error('[NovaBot] Command registration failed:',error.message); }
  utility.resumeReminders(client);
  lilgrave.start(client);
});
client.on(Events.InteractionCreate,async interaction => {
  if (!interaction.isAutocomplete()) brandInteraction(interaction);
  try {
    if(interaction.isAutocomplete()) {
      if (!features.isEnabled(interaction.guildId, 'music')) return interaction.respond([]);
      return await music.autocomplete(interaction,client);
    }
    if(interaction.isButton() && interaction.customId.startsWith('mina_music_')) {
      if (!features.isEnabled(interaction.guildId, 'music')) return interaction.reply({content:'Music is disabled in this server.',ephemeral:true});
      return await music.handleButton(interaction,client);
    }
    if(interaction.isButton() && interaction.customId.startsWith('lilgrave_leave:demote:')) return await lilgrave.handleDemotionButton(interaction);
    if((interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) && interaction.customId.startsWith('lilgrave_leave:')) return await lilgrave.handleComponent(interaction);
    if(interaction.isButton() && interaction.customId.startsWith('lilgrave_leave:')) return await lilgrave.handleComponent(interaction);
    if(interaction.isModalSubmit() && interaction.customId === 'lilgrave_leave:save') return await lilgrave.handleModal(interaction);
    if(interaction.isButton() && interaction.customId.startsWith('lilgrave_features:')) return await features.handleComponent(interaction);
    if(interaction.isStringSelectMenu() && interaction.customId==='lilgrave_features:select') return await features.handleComponent(interaction);
    if(interaction.isButton() && interaction.customId==='mina_verify_start' && !features.isEnabled(interaction.guildId,'verification')) return interaction.reply({content:'Verification is disabled in this server.',ephemeral:true});
    if(interaction.isButton()||interaction.isModalSubmit()) return await commands.handleComponent(interaction);
    if(!interaction.isChatInputCommand()) return;
    if(process.env.GUILD_ID&&interaction.guildId!==process.env.GUILD_ID) return interaction.reply({content:'This bot is configured for a different server.',ephemeral:true});
    if (interaction.commandName === 'features') return await features.execute(interaction);
    const feature = features.commandFeature(interaction.commandName);
    if (feature && !features.isEnabled(interaction.guildId, feature)) return interaction.reply({content:'This feature is currently disabled in this server. An administrator can enable it with /features.',ephemeral:true});
    if (['punishment-setup','staff-leave-setup','leave-return'].includes(interaction.commandName)) return await lilgrave.execute(interaction);
    await commands.execute(interaction,client,player);
  } catch(error) {
    console.error('[NovaBot] Interaction error:',error);
    const payload={content:'That command failed. Check bot permissions and try again.',ephemeral:true};
    if(interaction.replied||interaction.deferred) await interaction.followUp(payload).catch(()=>null); else await interaction.reply(payload).catch(()=>null);
  }
});
client.on(Events.MessageCreate,message=>{ if(features.isEnabled(message.guildId,'music')) music.handlePrefix(message,client).catch(error=>console.error('[NovaBot] Prefix command error:',error)); });
client.on(Events.MessageCreate,message=>{ if(features.isEnabled(message.guildId,'moderation')) commands.handlePrefix(message).catch(error=>console.error('[NovaBot] Moderation prefix error:',error)); });
client.on(Events.MessageCreate,message=>{ if(features.isEnabled(message.guildId,'lilgrave')) lilgrave.handleMessage(message).catch(error=>console.error('[Lilgrave] Message handler error:',error)); });
client.on(Events.GuildMemberAdd,member=>{ if(features.isEnabled(member.guild.id,'security')) security.onJoin(member).catch(console.error); });
client.on(Events.MessageCreate,message=>{ if(features.isEnabled(message.guildId,'security')) security.onMessage(message).catch(console.error); });
client.on(Events.GuildAuditLogEntryCreate,entry=>{ if(!features.isEnabled(entry.guild?.id,'security')) return; const item=security.auditTypes.find(([type])=>type===entry.action); if(item) security.handleDestructiveAudit(entry,item[1]).catch(console.error); });
client.on(Events.Error,error=>console.error('[NovaBot] Discord error:',error));
process.on('unhandledRejection',error=>console.error('[NovaBot] Unhandled rejection:',error));
async function shutdown(signal) { console.log('[NovaBot] Shutdown: '+signal); store.save(); healthServer.close(); try { player.shoukaku?.disconnect?.(); } catch {} client.destroy(); process.exit(0); }
process.once('SIGINT',()=>shutdown('SIGINT')); process.once('SIGTERM',()=>shutdown('SIGTERM'));
client.login(token).catch(error=>{console.error('[NovaBot] Login failed:',error.message);process.exit(1);});
