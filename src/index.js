'use strict';
require('dotenv').config();
const http = require('node:http');
const { Client, GatewayIntentBits, Partials, REST, Routes, Events } = require('discord.js');
const store = require('./store');
const security = require('./security');
const commandModule = require('./commands');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or CLIENT_ID environment variable.');
  process.exit(1);
}
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message]
});

// Minimal JSON health endpoint for Render; this is not a website or dashboard.
const port = Number(process.env.PORT || 10000);
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/ping') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', bot: client.isReady() ? 'online' : 'starting', uptime: process.uptime() }));
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});
healthServer.listen(port, '0.0.0.0', () => console.log('[Mina] Health endpoint listening on ' + port));

client.once(Events.ClientReady, async ready => {
  console.log('[Mina] Online as ' + ready.user.tag);
  try {
    const rest = new REST({ version: '10' }).setToken(token);
    await rest.put(Routes.applicationCommands(clientId), { body: commandModule.commands });
    console.log('[Mina] Registered ' + commandModule.commands.length + ' slash commands.');
  } catch (error) {
    console.error('[Mina] Slash command registration failed:', error.message);
  }
});
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  try { await commandModule.execute(interaction); }
  catch (error) {
    console.error('[Mina] Command error:', error);
    const payload = { content: 'Command failed. Check bot permissions and role hierarchy.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => null);
    else await interaction.reply(payload).catch(() => null);
  }
});
client.on(Events.GuildMemberAdd, member => security.onJoin(member).catch(console.error));
client.on(Events.MessageCreate, message => security.onMessage(message).catch(console.error));
client.on(Events.GuildAuditLogEntryCreate, entry => {
  const item = security.auditTypes.find(([type]) => type === entry.action);
  if (item) security.handleDestructiveAudit(entry, item[1]).catch(console.error);
});
client.on(Events.Error, error => console.error('[Mina] Discord client error:', error));
process.on('unhandledRejection', error => console.error('[Mina] Unhandled rejection:', error));
async function shutdown(signal) {
  console.log('[Mina] Received ' + signal + '; shutting down.');
  store.save();
  healthServer.close();
  client.destroy();
  process.exit(0);
}
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
client.login(token).catch(error => {
  console.error('[Mina] Login failed:', error.message);
  process.exit(1);
});
