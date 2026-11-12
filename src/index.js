'use strict';
require('dotenv').config();
const http = require('node:http');
const { Client, GatewayIntentBits, Partials, REST, Routes, Events } = require('discord.js');
const store = require('./store');
const security = require('./security');
const commands = require('./commands');
const utility = require('./utility');
const music = require('./music');

const token = process.env.DISCORD_TOKEN, clientId = process.env.CLIENT_ID;
if (!token || !clientId) { console.error('Missing DISCORD_TOKEN or CLIENT_ID.'); process.exit(1); }
const client = new Client({ intents: [GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildModeration,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildVoiceStates], partials: [Partials.Channel,Partials.GuildMember,Partials.Message] });
const player = music.createMusicManager(client); client.player = player;
const port = Number(process.env.PORT || 10000);
const healthServer = http.createServer((req,res) => {
  if (req.url === '/health' || req.url === '/ping') { res.writeHead(200,{'content-type':'application/json'}); return res.end(JSON.stringify({status:'ok',bot:client.isReady()?'online':'starting',uptime:process.uptime()})); }
  res.writeHead(404); res.end();
});
healthServer.listen(port,'0.0.0.0');
client.once(Events.ClientReady,async ready => {
  console.log('[Mina] Online as '+ready.user.tag);
  try { await player.init(ready.user.id); console.log('[Mina] Lavalink music manager initialized.'); } catch(error) { console.error('[Mina] Lavalink initialization failed:',error.message); }
  try {
    const rest=new REST({version:'10'}).setToken(token);
    const route=process.env.GUILD_ID?Routes.applicationGuildCommands(clientId,process.env.GUILD_ID):Routes.applicationCommands(clientId);
    await rest.put(route,{body:commands.commands}); console.log('[Mina] Registered '+commands.commands.length+' commands.');
  } catch(error) { console.error('[Mina] Command registration failed:',error.message); }
  utility.resumeReminders(client);
});
client.on(Events.InteractionCreate,async interaction => {
  try {
    if(interaction.isAutocomplete()) return await music.autocomplete(interaction,client);
    if(interaction.isButton() && interaction.customId.startsWith('mina_music_')) return await music.handleButton(interaction,client);
    if(interaction.isButton()||interaction.isModalSubmit()) return await commands.handleComponent(interaction);
    if(!interaction.isChatInputCommand()) return;
    if(process.env.GUILD_ID&&interaction.guildId!==process.env.GUILD_ID) return interaction.reply({content:'This bot is configured for a different server.',ephemeral:true});
    await commands.execute(interaction,client,player);
  } catch(error) {
    console.error('[Mina] Interaction error:',error);
    const payload={content:'That command failed. Check bot permissions and try again.',ephemeral:true};
    if(interaction.replied||interaction.deferred) await interaction.followUp(payload).catch(()=>null); else await interaction.reply(payload).catch(()=>null);
  }
});
client.on(Events.MessageCreate,message=>music.handlePrefix(message,client).catch(error=>console.error('[Mina] Prefix command error:',error)));
client.on(Events.GuildMemberAdd,member=>security.onJoin(member).catch(console.error));
client.on(Events.MessageCreate,message=>security.onMessage(message).catch(console.error));
client.on(Events.GuildAuditLogEntryCreate,entry=>{ const item=security.auditTypes.find(([type])=>type===entry.action); if(item) security.handleDestructiveAudit(entry,item[1]).catch(console.error); });
client.on(Events.Error,error=>console.error('[Mina] Discord error:',error));
process.on('unhandledRejection',error=>console.error('[Mina] Unhandled rejection:',error));
async function shutdown(signal) { console.log('[Mina] Shutdown: '+signal); store.save(); healthServer.close(); try { player.shoukaku?.disconnect?.(); } catch {} client.destroy(); process.exit(0); }
process.once('SIGINT',()=>shutdown('SIGINT')); process.once('SIGTERM',()=>shutdown('SIGTERM'));
client.login(token).catch(error=>{console.error('[Mina] Login failed:',error.message);process.exit(1);});
