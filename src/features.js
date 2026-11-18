'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const store = require('./store');

const definitions = [
  ['security', 'Security & Anti-Nuke', 'Anti-nuke, anti-raid, AutoMod and join protection'],
  ['verification', 'Verification', 'Member verification and verification panels'],
  ['moderation', 'Moderation', 'Moderation commands and prefix actions'],
  ['music', 'Music', 'Playback, queue, player buttons and music search'],
  ['utilities', 'Utilities', 'General utility commands such as polls and information'],
  ['reminders', 'Reminders', 'Scheduled user reminders'],
  ['lilgrave', 'Lilgrave assistants', 'Punishment evidence and staff leave assistants']
];
const command = new SlashCommandBuilder()
  .setName('features')
  .setDescription('Open the server feature control panel')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
const commands = [command.toJSON()];

function isEnabled(guildId, feature) {
  if (!guildId || !feature) return true;
  const cfg = store.get(guildId);
  return cfg.features?.[feature] !== false;
}
function commandFeature(name) {
  if (['security','lockdown','unlock'].includes(name)) return 'security';
  if (['verification','verify'].includes(name)) return 'verification';
  if (['timeout','kick','ban','warn','warnings','clearwarnings','purge','slowmode','nick','unban'].includes(name)) return 'moderation';
  if (['music','play','search','pause','resume','skip','stop','queue','nowplaying','volume','loop','shuffle','clear','remove','jump','seek','filter','speed','autoplay','join','previous','replay','spotify'].includes(name)) return 'music';
  if (['ping','avatar','userinfo','serverinfo','botinfo','calculate','poll','remind','help'].includes(name)) return name === 'remind' ? 'reminders' : 'utilities';
  if (['punishment-setup','staff-leave-setup'].includes(name)) return 'lilgrave';
  return null;
}
function panel(guildId) {
  const cfg = store.get(guildId);
  const lines = definitions.map(([key,label,description]) => (cfg.features[key] ? '🟢' : '🔴') + ' **' + label + '** — ' + (cfg.features[key] ? 'ON' : 'OFF') + '\n' + description);
  const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('Server feature control').setDescription('Choose which modules should run in this server. Changes save immediately.\n\n' + lines.join('\n\n')).setFooter({text:'Settings are saved per server and survive restarts.'});
  const select = new StringSelectMenuBuilder().setCustomId('lilgrave_features:select').setPlaceholder('Enable or disable an individual module').setMinValues(1).setMaxValues(1);
  for (const [key,label] of definitions) {
    select.addOptions({label:'Enable: ' + label,value:key + ':on'},{label:'Disable: ' + label,value:key + ':off'});
  }
  const row1 = new ActionRowBuilder().addComponents(select);
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('lilgrave_features:disable_all').setLabel('Disable All').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('lilgrave_features:enable_all').setLabel('Enable All').setStyle(ButtonStyle.Success)
  );
  return { embeds:[embed], components:[row1,row2], ephemeral:true };
}
async function execute(interaction) {
  if (!interaction.inGuild()) return interaction.reply({content:'Use this command inside a server.',ephemeral:true});
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({content:'Administrator permission required.',ephemeral:true});
  return interaction.reply(panel(interaction.guildId));
}
async function handleComponent(interaction) {
  if (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({content:'Administrator permission required.',ephemeral:true});
  }
  const id = interaction.customId;
  if (id === 'lilgrave_features:disable_all') {
    store.update(interaction.guildId,cfg=>{ for (const [key] of definitions) cfg.features[key]=false; });
  } else if (id === 'lilgrave_features:enable_all') {
    store.update(interaction.guildId,cfg=>{ for (const [key] of definitions) cfg.features[key]=true; });
  } else if (interaction.isStringSelectMenu() && id === 'lilgrave_features:select') {
    const [key,state] = interaction.values[0].split(':');
    if (!definitions.some(([name])=>name===key) || !['on','off'].includes(state)) return interaction.reply({content:'Unknown feature selection.',ephemeral:true});
    store.update(interaction.guildId,cfg=>{cfg.features[key]=state==='on';});
  } else {
    return interaction.reply({content:'This control is no longer available.',ephemeral:true});
  }
  return interaction.update(panel(interaction.guildId));
}
module.exports = { commands, execute, handleComponent, isEnabled, commandFeature, definitions };
