'use strict';
const {SlashCommandBuilder,PermissionFlagsBits,ButtonBuilder,ButtonStyle,EmbedBuilder,ActionRowBuilder,ModalBuilder,TextInputBuilder,TextInputStyle}=require('discord.js');
const store=require('./store'),security=require('./security'),music=require('./music'),utility=require('./utility'),spotify=require('./spotify');
const { brandPayload } = require('./utils/embeds');
const moderation = require('./moderation');
const challenges=new Map();
function moderationCaseEmbed({ action, target, moderator, reason, guild, details }) {
 const colors={warn:0xF1C40F,timeout:0xE67E22,kick:0xE67E22,ban:0xED4245,unban:0x57F287,purge:0x5865F2,slowmode:0x5865F2,nick:0x5865F2,clearwarnings:0x57F287,lockdown:0xED4245,unlock:0x57F287};
 const labels={warn:'Member Warned',timeout:'Member Timed Out',kick:'Member Kicked',ban:'Member Banned',unban:'User Unbanned',purge:'Messages Purged',slowmode:'Slowmode Updated',nick:'Nickname Updated',clearwarnings:'Warnings Cleared',lockdown:'Server Lockdown Enabled',unlock:'Server Lockdown Released'};
 const embed=new EmbedBuilder().setColor(colors[action]||0x5865F2).setTitle(labels[action]||'Moderation Action').setTimestamp();
 if(guild?.name) embed.setAuthor({name:guild.name+' • Moderation',...(guild.iconURL()?{iconURL:guild.iconURL()}:{})});
 if(target){
  const user=target.user||target;
  embed.setDescription('**Member**\n'+(user.tag||user.username||'Unknown user')+' · <@'+user.id+'>');
  if(typeof user.displayAvatarURL==='function')embed.setThumbnail(user.displayAvatarURL({size:256}));
  embed.addFields({name:'User ID',value:String(user.id),inline:true});
 } else if(details) embed.setDescription(details);
 if(moderator)embed.addFields({name:'Moderator',value:(moderator.tag||moderator.username||'Unknown')+' · <@'+moderator.id+'>',inline:true});
 if(reason)embed.addFields({name:'Reason',value:String(reason).slice(0,1024),inline:false});
 embed.setFooter({text:'NovaBot Moderation'+(target?' • '+target.id:'')});
 return embed;
}

const securityCommand=new SlashCommandBuilder().setName('security').setDescription('Configure NovaBot protection')
.addSubcommand(s=>s.setName('setup').setDescription('Enable protection and set this channel as logs'))
.addSubcommand(s=>s.setName('status').setDescription('Show protection status'))
.addSubcommand(s=>s.setName('enable').setDescription('Enable protection')).addSubcommand(s=>s.setName('disable').setDescription('Disable protection'))
.addSubcommand(s=>s.setName('log-channel').setDescription('Set security log channel').addChannelOption(o=>o.setName('channel').setDescription('Text channel').setRequired(true)))
.addSubcommand(s=>s.setName('trust-user').setDescription('Trust a user').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)))
.addSubcommand(s=>s.setName('untrust-user').setDescription('Remove trusted user').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)))
.addSubcommand(s=>s.setName('trust-role').setDescription('Trust a role').addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true)))
.addSubcommand(s=>s.setName('untrust-role').setDescription('Remove trusted role').addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true)))
.addSubcommand(s=>s.setName('threshold').setDescription('Set anti-nuke burst threshold').addIntegerOption(o=>o.setName('actions').setDescription('Actions before punishment').setMinValue(2).setMaxValue(10).setRequired(true)).addIntegerOption(o=>o.setName('seconds').setDescription('Detection window').setMinValue(3).setMaxValue(60).setRequired(true)))
.addSubcommand(s=>s.setName('limits').setDescription('Set minute and hourly Anti-Nuke limits').addIntegerOption(o=>o.setName('minute').setDescription('Actions per minute').setMinValue(2).setMaxValue(50).setRequired(true)).addIntegerOption(o=>o.setName('hour').setDescription('Actions per hour').setMinValue(2).setMaxValue(200).setRequired(true)))
.addSubcommand(s=>s.setName('punishment').setDescription('Set anti-nuke punishment').addStringOption(o=>o.setName('action').setDescription('Action').setRequired(true).addChoices({name:'Timeout',value:'timeout'},{name:'Kick',value:'kick'},{name:'Ban',value:'ban'},{name:'Quarantine',value:'quarantine'})))
.addSubcommand(s=>s.setName('module').setDescription('Toggle a protection module').addStringOption(o=>o.setName('name').setDescription('Module').setRequired(true).addChoices({name:'Anti-nuke',value:'antiNuke'},{name:'Anti-raid',value:'antiRaid'},{name:'AutoMod',value:'automod'})).addBooleanOption(o=>o.setName('enabled').setDescription('Enable it').setRequired(true)))
.addSubcommand(s=>s.setName('incidents').setDescription('Show recent security incidents'))
.addSubcommand(s=>s.setName('quarantine-role').setDescription('Set quarantine role').addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true)))
.addSubcommand(s=>s.setName('allow-domain').setDescription('Allow a hostname').addStringOption(o=>o.setName('domain').setDescription('example.com').setRequired(true).setMaxLength(253)))
.addSubcommand(s=>s.setName('remove-domain').setDescription('Remove an allowed hostname').addStringOption(o=>o.setName('domain').setDescription('example.com').setRequired(true).setMaxLength(253)))
.addSubcommand(s=>s.setName('heat-threshold').setDescription('Set AutoMod heat trigger threshold').addIntegerOption(o=>o.setName('points').setDescription('Heat points, 10–500').setMinValue(10).setMaxValue(500).setRequired(true)))
.addSubcommand(s=>s.setName('heat-word-add').setDescription('Add a blocked word to Heat AutoMod').addStringOption(o=>o.setName('word').setDescription('Blocked word or phrase').setRequired(true).setMaxLength(80)))
.addSubcommand(s=>s.setName('heat-word-remove').setDescription('Remove a blocked word from Heat AutoMod').addStringOption(o=>o.setName('word').setDescription('Blocked word or phrase').setRequired(true).setMaxLength(80)))
.addSubcommand(s=>s.setName('join-gate').setDescription('Configure Join Gate filters').addBooleanOption(o=>o.setName('enabled').setDescription('Enable Join Gate').setRequired(true)).addIntegerOption(o=>o.setName('min_age_hours').setDescription('Minimum account age in hours').setMinValue(0).setMaxValue(8760)).addBooleanOption(o=>o.setName('require_avatar').setDescription('Require a profile avatar')).addBooleanOption(o=>o.setName('username_filter').setDescription('Block invite-link usernames')).addStringOption(o=>o.setName('action').setDescription('Action for flagged joins').addChoices({name:'Quarantine',value:'quarantine'},{name:'Kick',value:'kick'},{name:'Ban',value:'ban'})))
.addSubcommand(s=>s.setName('join-raid').setDescription('Configure Join Raid panic mode').addBooleanOption(o=>o.setName('panic').setDescription('Enable panic mode').setRequired(true)).addIntegerOption(o=>o.setName('joins').setDescription('Joins to trigger panic').setMinValue(2).setMaxValue(50).setRequired(true)).addIntegerOption(o=>o.setName('window_seconds').setDescription('Detection window in seconds').setMinValue(5).setMaxValue(300).setRequired(true)).addIntegerOption(o=>o.setName('duration_minutes').setDescription('Panic duration in minutes').setMinValue(1).setMaxValue(60).setRequired(true)))
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
const verificationCommand=new SlashCommandBuilder().setName('verification').setDescription('Configure member verification')
.addSubcommand(s=>s.setName('setup').setDescription('Set verified and quarantine roles').addRoleOption(o=>o.setName('verified_role').setDescription('Verified role').setRequired(true)).addRoleOption(o=>o.setName('quarantine_role').setDescription('Quarantine role').setRequired(true)))
.addSubcommand(s=>s.setName('panel').setDescription('Post verification panel').addChannelOption(o=>o.setName('channel').setDescription('Channel').setRequired(true)))
.addSubcommand(s=>s.setName('disable').setDescription('Disable verification')).setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
const musicCommand=new SlashCommandBuilder().setName('music').setDescription('Music player controls')
.addSubcommand(s=>s.setName('play').setDescription('Play a song, URL or Spotify link').addStringOption(o=>o.setName('song').setDescription('Song title, artist, or music link').setRequired(true).setAutocomplete(true).setMaxLength(500)))
.addSubcommand(s=>s.setName('pause').setDescription('Pause playback')).addSubcommand(s=>s.setName('resume').setDescription('Resume playback'))
.addSubcommand(s=>s.setName('skip').setDescription('Skip current track')).addSubcommand(s=>s.setName('stop').setDescription('Stop and clear player'))
.addSubcommand(s=>s.setName('queue').setDescription('Show upcoming tracks')).addSubcommand(s=>s.setName('nowplaying').setDescription('Show current track'))
.addSubcommand(s=>s.setName('volume').setDescription('Set player volume').addIntegerOption(o=>o.setName('amount').setDescription('Volume from 1 to 100').setMinValue(1).setMaxValue(100).setRequired(true)))
.addSubcommand(s=>s.setName('loop').setDescription('Set repeat mode').addStringOption(o=>o.setName('mode').setDescription('Repeat mode').setRequired(true).addChoices({name:'Off',value:'off'},{name:'Track',value:'track'},{name:'Queue',value:'queue'})))
.addSubcommand(s=>s.setName('shuffle').setDescription('Shuffle upcoming tracks')).addSubcommand(s=>s.setName('remove').setDescription('Remove a track by queue position').addIntegerOption(o=>o.setName('position').setDescription('Queue position').setMinValue(1).setRequired(true))).addSubcommand(s=>s.setName('clear').setDescription('Clear upcoming tracks'));
const musicStandaloneCommands = [
 new SlashCommandBuilder().setName('play').setDescription('Play high-quality audio from a song title, artist, or music link').addStringOption(o=>o.setName('song').setDescription('Song title, artist, or music link').setRequired(true).setAutocomplete(true).setMaxLength(500)),
 new SlashCommandBuilder().setName('search').setDescription('Search music').addStringOption(o=>o.setName('query').setDescription('Song title or artist to search').setRequired(true).setAutocomplete(true).setMaxLength(200)),
 new SlashCommandBuilder().setName('pause').setDescription('Pause playback'),
 new SlashCommandBuilder().setName('resume').setDescription('Resume playback'),
 new SlashCommandBuilder().setName('skip').setDescription('Skip current track'),
 new SlashCommandBuilder().setName('stop').setDescription('Stop and clear player'),
 new SlashCommandBuilder().setName('queue').setDescription('Show music queue'),
 new SlashCommandBuilder().setName('nowplaying').setDescription('Show current track'),
 new SlashCommandBuilder().setName('volume').setDescription('Change the music volume').addIntegerOption(o=>o.setName('amount').setDescription('Volume from 1 to 100').setMinValue(1).setMaxValue(100).setRequired(true)),
 new SlashCommandBuilder().setName('loop').setDescription('Set repeat mode').addStringOption(o=>o.setName('mode').setDescription('Mode').setRequired(true).addChoices({name:'Off',value:'off'},{name:'Track',value:'track'},{name:'Queue',value:'queue'})),
 new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle queue'),
 new SlashCommandBuilder().setName('clear').setDescription('Clear upcoming tracks'),
 new SlashCommandBuilder().setName('remove').setDescription('Remove queue position').addIntegerOption(o=>o.setName('position').setDescription('Position').setMinValue(1).setRequired(true)),
 new SlashCommandBuilder().setName('jump').setDescription('Jump to queue position').addIntegerOption(o=>o.setName('position').setDescription('Position').setMinValue(1).setRequired(true)),
 new SlashCommandBuilder().setName('seek').setDescription('Seek to seconds').addNumberOption(o=>o.setName('seconds').setDescription('Seconds').setMinValue(0).setRequired(true)),
 new SlashCommandBuilder().setName('filter').setDescription('Apply audio filter').addStringOption(o=>o.setName('name').setDescription('Filter').setRequired(true).addChoices(...['clear','bass','nightcore','daycore','8d','vaporwave','lofi','karaoke'].map(x=>({name:x,value:x})))),
 new SlashCommandBuilder().setName('speed').setDescription('Set playback speed').addNumberOption(o=>o.setName('multiplier').setDescription('0.5 to 2').setMinValue(0.5).setMaxValue(2).setRequired(true)),
 new SlashCommandBuilder().setName('autoplay').setDescription('Toggle autoplay'),
 new SlashCommandBuilder().setName('join').setDescription('Join your voice channel'),
 new SlashCommandBuilder().setName('previous').setDescription('Play previous track'),
 new SlashCommandBuilder().setName('replay').setDescription('Replay current track')
].map(c=>c.toJSON());
const commands=[
securityCommand.toJSON(),verificationCommand.toJSON(),new SlashCommandBuilder().setName('verify').setDescription('Start verification').toJSON(),musicCommand.toJSON(),...musicStandaloneCommands,
new SlashCommandBuilder().setName('spotify').setDescription('Search Spotify catalogue').addSubcommand(s=>s.setName('search').setDescription('Search for a track').addStringOption(o=>o.setName('query').setDescription('Track or artist').setRequired(true).setMaxLength(150))).toJSON(),
new SlashCommandBuilder().setName('ping').setDescription('Check bot latency').toJSON(),
new SlashCommandBuilder().setName('avatar').setDescription('Show a user avatar').addUserOption(o=>o.setName('user').setDescription('User').setRequired(false)).toJSON(),
new SlashCommandBuilder().setName('userinfo').setDescription('Show user information').addUserOption(o=>o.setName('user').setDescription('User').setRequired(false)).toJSON(),
new SlashCommandBuilder().setName('serverinfo').setDescription('Show server information').toJSON(),new SlashCommandBuilder().setName('botinfo').setDescription('Show bot information').toJSON(),
new SlashCommandBuilder().setName('calculate').setDescription('Calculate a basic expression').addStringOption(o=>o.setName('expression').setDescription('Example: (12+8)*3').setRequired(true).setMaxLength(120)).toJSON(),
new SlashCommandBuilder().setName('poll').setDescription('Create a reaction poll').addStringOption(o=>o.setName('question').setDescription('Poll question').setRequired(true).setMaxLength(250)).addStringOption(o=>o.setName('option1').setDescription('First option').setRequired(true).setMaxLength(80)).addStringOption(o=>o.setName('option2').setDescription('Second option').setRequired(true).setMaxLength(80)).addStringOption(o=>o.setName('option3').setDescription('Third option').setRequired(false).setMaxLength(80)).addStringOption(o=>o.setName('option4').setDescription('Fourth option').setRequired(false).setMaxLength(80)).addStringOption(o=>o.setName('option5').setDescription('Fifth option').setRequired(false).setMaxLength(80)).toJSON(),
new SlashCommandBuilder().setName('remind').setDescription('Create and manage reminders').addSubcommand(s=>s.setName('create').setDescription('Create a reminder').addStringOption(o=>o.setName('in').setDescription('Duration: 10m, 2h, 1d').setRequired(true)).addStringOption(o=>o.setName('message').setDescription('Reminder text').setRequired(true).setMaxLength(900))).addSubcommand(s=>s.setName('list').setDescription('List your reminders')).addSubcommand(s=>s.setName('cancel').setDescription('Cancel your reminder').addStringOption(o=>o.setName('id').setDescription('Reminder ID').setRequired(true))).toJSON(),
new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member').addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).addIntegerOption(o=>o.setName('minutes').setDescription('1–40320 minutes').setMinValue(1).setMaxValue(40320).setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setMaxLength(400)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).toJSON(),
new SlashCommandBuilder().setName('kick').setDescription('Kick a member').addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setMaxLength(400)).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers).toJSON(),
new SlashCommandBuilder().setName('ban').setDescription('Ban a member').addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setMaxLength(400)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers).toJSON(),
new SlashCommandBuilder().setName('warn').setDescription('Warn a member and record a case').addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setMaxLength(400)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).toJSON(),
new SlashCommandBuilder().setName('warnings').setDescription('View a member warning history').addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).toJSON(),
new SlashCommandBuilder().setName('clearwarnings').setDescription('Clear a member warning history').addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).toJSON(),
new SlashCommandBuilder().setName('purge').setDescription('Bulk delete recent messages').addIntegerOption(o=>o.setName('amount').setDescription('Number of messages (2–100)').setMinValue(2).setMaxValue(100).setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).toJSON(),
new SlashCommandBuilder().setName('slowmode').setDescription('Set this channel slowmode').addIntegerOption(o=>o.setName('seconds').setDescription('0 to disable, maximum 21600 seconds').setMinValue(0).setMaxValue(21600).setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels).toJSON(),
new SlashCommandBuilder().setName('nick').setDescription('Change or clear a member nickname').addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o=>o.setName('nickname').setDescription('New nickname; omit to clear').setMaxLength(32)).setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames).toJSON(),
new SlashCommandBuilder().setName('unban').setDescription('Unban a user by Discord ID').addStringOption(o=>o.setName('user_id').setDescription('User ID').setRequired(true).setMinLength(17).setMaxLength(20)).addStringOption(o=>o.setName('reason').setDescription('Reason').setMaxLength(400)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers).toJSON(),
new SlashCommandBuilder().setName('lockdown').setDescription('Emergency server lockdown').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).toJSON(),
new SlashCommandBuilder().setName('unlock').setDescription('Restore channels after lockdown').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).toJSON(),
new SlashCommandBuilder().setName('help').setDescription('Show NovaBot command guide').toJSON()
];
async function securityRun(i){
 const sub=i.options.getSubcommand(),cfg=store.get(i.guildId);
 if(sub==='setup'){store.update(i.guildId,c=>{c.enabled=true;c.antiNuke.enabled=true;c.antiRaid.enabled=true;c.automod.enabled=true;c.logChannelId=i.channelId;});return i.reply({content:'Baseline security enabled. This channel is now the security log channel.',ephemeral:true});}
 if(sub==='status')return i.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle('NovaBot protection status').addFields({name:'Protection',value:cfg.enabled?'ON':'OFF',inline:true},{name:'Anti-nuke',value:cfg.antiNuke.enabled?'ON':'OFF',inline:true},{name:'Anti-nuke limits',value:cfg.antiNuke.minuteLimit+'/min · '+cfg.antiNuke.hourLimit+'/hr',inline:true},{name:'Anti-raid',value:cfg.antiRaid.enabled?'ON':'OFF',inline:true},{name:'AutoMod',value:cfg.automod.enabled?'ON':'OFF',inline:true},{name:'Heat threshold',value:String(cfg.automod.heatThreshold),inline:true},{name:'Blocked words',value:String(cfg.automod.blacklistedWords.length),inline:true},{name:'Join Gate',value:cfg.joinGate.enabled?'ON':'OFF',inline:true},{name:'Join Raid panic',value:cfg.antiRaid.panicEnabled?'ON':'OFF',inline:true},{name:'Verification',value:cfg.verification.enabled?'ON':'OFF',inline:true},{name:'Incidents',value:String(cfg.incidents.length),inline:true},{name:'Trusted users / roles',value:cfg.trusted.length+' / '+cfg.trustedRoles.length,inline:true},{name:'Lockdown',value:cfg.lockdown.active?'ACTIVE':'inactive',inline:true})],ephemeral:true});
 if(sub==='enable'||sub==='disable'){store.update(i.guildId,c=>c.enabled=sub==='enable');return i.reply({content:'Security '+(sub==='enable'?'enabled':'disabled')+'.',ephemeral:true});}
 if(sub==='log-channel'){store.update(i.guildId,c=>c.logChannelId=i.options.getChannel('channel').id);return i.reply({content:'Security log channel updated.',ephemeral:true});}
 if(sub==='trust-user'||sub==='untrust-user'){const uid=i.options.getUser('user').id;store.update(i.guildId,c=>{c.trusted=sub==='trust-user'?[...new Set([...c.trusted,uid])]:c.trusted.filter(x=>x!==uid);});return i.reply({content:'Trusted user list updated.',ephemeral:true});}
 if(sub==='trust-role'||sub==='untrust-role'){const rid=i.options.getRole('role').id;store.update(i.guildId,c=>{c.trustedRoles=sub==='trust-role'?[...new Set([...c.trustedRoles,rid])]:c.trustedRoles.filter(x=>x!==rid);});return i.reply({content:'Trusted role list updated.',ephemeral:true});}
 if(sub==='threshold'){const actions=i.options.getInteger('actions'),seconds=i.options.getInteger('seconds');store.update(i.guildId,c=>{c.antiNuke.limit=actions;c.antiNuke.windowMs=seconds*1000;});return i.reply({content:'Anti-nuke threshold updated.',ephemeral:true});}
 if(sub==='punishment'){const action=i.options.getString('action');if(action==='quarantine'&&!cfg.quarantineRoleId)return i.reply({content:'Set a quarantine role first with /security quarantine-role.',ephemeral:true});store.update(i.guildId,c=>c.antiNuke.punish=action);return i.reply({content:'Anti-nuke punishment set to '+action+'.',ephemeral:true});}
 if(sub==='limits'){const minute=i.options.getInteger('minute'),hour=i.options.getInteger('hour');if(hour<minute)return i.reply({content:'The hourly limit must be at least the per-minute limit.',ephemeral:true});store.update(i.guildId,c=>{c.antiNuke.minuteLimit=minute;c.antiNuke.hourLimit=hour;});return i.reply({content:'Anti-nuke minute and hourly limits updated.',ephemeral:true});}
 if(sub==='heat-threshold'){const points=i.options.getInteger('points');store.update(i.guildId,c=>c.automod.heatThreshold=points);return i.reply({content:'Heat AutoMod threshold set to '+points+' points.',ephemeral:true});}
 if(sub==='heat-word-add'||sub==='heat-word-remove'){const word=i.options.getString('word').trim().toLowerCase();if(!word)return i.reply({content:'Enter a non-empty word or phrase.',ephemeral:true});store.update(i.guildId,c=>{const list=c.automod.blacklistedWords||[];c.automod.blacklistedWords=sub==='heat-word-add'?[...new Set([...list,word])].slice(0,100):list.filter(item=>item!==word);});return i.reply({content:'Heat AutoMod blocked-word list updated.',ephemeral:true});}
 if(sub==='join-gate'){const enabled=i.options.getBoolean('enabled'),age=i.options.getInteger('min_age_hours'),avatar=i.options.getBoolean('require_avatar'),username=i.options.getBoolean('username_filter'),action=i.options.getString('action');if(enabled&&(action||cfg.joinGate.action)==='quarantine'&&!cfg.quarantineRoleId&&!cfg.verification.quarantineRoleId)return i.reply({content:'Set a quarantine role with /security quarantine-role before enabling quarantine actions.',ephemeral:true});store.update(i.guildId,c=>{c.joinGate.enabled=enabled;if(age!==null)c.joinGate.minAccountAgeMs=age*3600000;if(avatar!==null)c.joinGate.requireAvatar=avatar;if(username!==null)c.joinGate.usernameFilter=username;if(action)c.joinGate.action=action;});return i.reply({content:'Join Gate configuration saved.',ephemeral:true});}
 if(sub==='join-raid'){const panic=i.options.getBoolean('panic'),joins=i.options.getInteger('joins'),windowSeconds=i.options.getInteger('window_seconds'),duration=i.options.getInteger('duration_minutes');store.update(i.guildId,c=>{c.antiRaid.panicEnabled=panic;c.antiRaid.panicJoinLimit=joins;c.antiRaid.windowMs=windowSeconds*1000;c.antiRaid.panicDurationMs=duration*60000;});return i.reply({content:'Join Raid panic configuration saved.',ephemeral:true});}
 if(sub==='module'){const name=i.options.getString('name'),enabled=i.options.getBoolean('enabled');store.update(i.guildId,c=>c[name].enabled=enabled);return i.reply({content:name+' '+(enabled?'enabled':'disabled')+'.',ephemeral:true});}
 if(sub==='incidents'){const items=cfg.incidents.slice(-10).reverse();if(!items.length)return i.reply({content:'No incidents recorded.',ephemeral:true});const embed=new EmbedBuilder().setColor(0xED4245).setTitle('Recent incidents').setDescription(items.map((x,n)=>(n+1)+'. **'+x.type+'** ('+x.severity+')\n'+x.details+'\n<t:'+Math.floor(new Date(x.at).getTime()/1000)+':R>').join('\n\n').slice(0,4000));return i.reply({embeds:[embed],ephemeral:true});}
 if(sub==='quarantine-role'){store.update(i.guildId,c=>c.quarantineRoleId=i.options.getRole('role').id);return i.reply({content:'Quarantine role saved.',ephemeral:true});}
 if(sub==='allow-domain'||sub==='remove-domain'){const domain=i.options.getString('domain').toLowerCase().trim().replace(/^https?:\/\//,'').replace(/\/$/,'');if(!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))return i.reply({content:'Enter a valid hostname such as example.com.',ephemeral:true});store.update(i.guildId,c=>{c.automod.allowedDomains=sub==='allow-domain'?[...new Set([...c.automod.allowedDomains,domain])]:c.automod.allowedDomains.filter(x=>x!==domain);});return i.reply({content:'Allowed domain list updated.',ephemeral:true});}
}
async function verificationRun(i){
 const sub=i.options.getSubcommand();
 if(sub==='setup'){const verified=i.options.getRole('verified_role'),quarantine=i.options.getRole('quarantine_role');if(verified.id===quarantine.id)return i.reply({content:'Choose two different roles.',ephemeral:true});store.update(i.guildId,c=>{c.verification={enabled:true,verifiedRoleId:verified.id,quarantineRoleId:quarantine.id};c.quarantineRoleId=quarantine.id;});return i.reply({content:'Verification configured. Ensure the quarantine role cannot view restricted channels.',ephemeral:true});}
 if(sub==='disable'){store.update(i.guildId,c=>c.verification.enabled=false);return i.reply({content:'Verification disabled.',ephemeral:true});}
 const channel=i.options.getChannel('channel');if(!channel.isTextBased())return i.reply({content:'Choose a text channel.',ephemeral:true});
 const embed=new EmbedBuilder().setColor(0x5865F2).setTitle('Server verification').setDescription('Press the button and solve a short arithmetic challenge to unlock the server.');
 const button=new ButtonBuilder().setCustomId('mina_verify_start').setLabel('Verify').setStyle(ButtonStyle.Success);
 await channel.send({...brandPayload({embeds:[embed]}),components:[new ActionRowBuilder().addComponents(button)]});return i.reply({content:'Verification panel posted.',ephemeral:true});
}
async function utilityRun(i,client){
 const name=i.commandName;
 if(name==='ping')return i.reply('🏓 Pong! Gateway: **'+Math.round(client.ws.ping)+'ms**.');
 if(name==='avatar'){const user=i.options.getUser('user')||i.user,url=user.displayAvatarURL({size:1024,extension:'png'});return i.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle((user.tag||user.username)+' avatar').setImage(url).setDescription('[Open image]('+url+')')]});}
 if(name==='userinfo'){const user=i.options.getUser('user')||i.user,member=await i.guild.members.fetch(user.id).catch(()=>null);return i.reply({embeds:[utility.userEmbed(user,member)]});}
 if(name==='serverinfo')return i.reply({embeds:[utility.serverEmbed(i.guild)]});
 if(name==='botinfo')return i.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle('NovaBot Bot').setThumbnail(client.user.displayAvatarURL()).addFields({name:'Servers',value:String(client.guilds.cache.size),inline:true},{name:'Users cached',value:String(client.users.cache.size),inline:true},{name:'Uptime',value:Math.floor(process.uptime()/60)+' minutes',inline:true},{name:'Node.js',value:process.version,inline:true})]});
 if(name==='calculate'){try{return i.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle('Calculator').addFields({name:'Expression',value:i.options.getString('expression')},{name:'Result',value:'**'+utility.calculator(i.options.getString('expression'))+'**'})]});}catch(e){return i.reply({content:e.message,ephemeral:true});}}
 if(name==='poll'){const opts=['option1','option2','option3','option4','option5'].map(k=>i.options.getString(k)).filter(Boolean),emojis=['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'];const embed=new EmbedBuilder().setColor(0x5865F2).setTitle('📊 '+i.options.getString('question')).setDescription(opts.map((x,n)=>emojis[n]+' '+x).join('\n')).setFooter({text:'Poll by '+i.user.tag});await i.reply({embeds:[embed]});const msg=await i.fetchReply();for(let n=0;n<opts.length;n++)await msg.react(emojis[n]).catch(()=>null);return;}
 if(name==='remind'){const sub=i.options.getSubcommand(),cfg=store.get(i.guildId);if(sub==='create'){const duration=utility.parseDuration(i.options.getString('in'));if(!duration)return i.reply({content:'Use 15m, 2h or 1d (maximum 24 days).',ephemeral:true});const item=utility.addReminder(client,i.guildId,i.user.id,i.channelId,duration,i.options.getString('message'));return i.reply({content:'Reminder set. ID: '+item.id+' — <t:'+Math.floor(item.at/1000)+':R>',ephemeral:true});}if(sub==='list'){const mine=cfg.reminders.filter(x=>x.userId===i.user.id);return i.reply({content:mine.length?mine.map(x=>x.id+' · <t:'+Math.floor(x.at/1000)+':R> · '+x.text).join('\n').slice(0,1900):'You have no reminders.',ephemeral:true});}const ok=utility.cancelReminder(i.guildId,i.user.id,i.options.getString('id'));return i.reply({content:ok?'Reminder cancelled.':'Reminder not found.',ephemeral:true});}
}
async function execute(i,client,player){
 if(!i.inGuild()&&!['ping','botinfo'].includes(i.commandName))return i.reply({content:'Use this command in a server.',ephemeral:true});
 const name=i.commandName;
 if(name==='help'){const embed=new EmbedBuilder().setColor(0x5865F2).setTitle('NovaBot command guide').addFields({name:'Security',value:'/security setup · /security status · /verification setup · /lockdown · /unlock'},{name:'Music',value:'/play · /search · /pause · /resume · /skip · /queue · /nowplaying · /volume · /loop · /shuffle · /filter · /seek · /speed · /stop\\nPrefix: ,play · ,pause · ,resume · ,skip · ,queue · ,volume · ,loop · ,shuffle'},{name:'Utilities',value:'/ping · /avatar · /userinfo · /serverinfo · /botinfo · /calculate · /poll · /remind'},{name:'Moderation',value:'/timeout · /kick · /ban · /verify'},{name:'Spotify',value:'/spotify search · /music play with a Spotify track or playlist URL'});return i.reply({embeds:[embed],ephemeral:true});}
 if(name==='security'){if(!i.memberPermissions?.has(PermissionFlagsBits.Administrator))return i.reply({content:'Administrator permission required.',ephemeral:true});return securityRun(i);}
 if(name==='verification'){if(!i.memberPermissions?.has(PermissionFlagsBits.Administrator))return i.reply({content:'Administrator permission required.',ephemeral:true});return verificationRun(i);}
 if(name==='verify'){const cfg=store.get(i.guildId);if(!cfg.verification.enabled)return i.reply({content:'Verification is not configured.',ephemeral:true});const button=new ButtonBuilder().setCustomId('mina_verify_start').setLabel('Start verification').setStyle(ButtonStyle.Success);return i.reply({content:'Press the button to start your verification challenge.',components:[new ActionRowBuilder().addComponents(button)],ephemeral:true});}
 if(name==='music'||['play','search','pause','resume','skip','stop','queue','nowplaying','volume','loop','shuffle','clear','remove','jump','seek','filter','speed','autoplay','join','previous','replay'].includes(name)){
 const action=name==='music'?i.options.getSubcommand():name;
 const value=action==='play'?i.options.getString('song'):action==='search'?i.options.getString('query'):action==='volume'?i.options.getInteger('amount'):action==='loop'?i.options.getString('mode'):action==='remove'||action==='jump'?i.options.getInteger('position'):action==='seek'?i.options.getNumber('seconds'):action==='filter'?i.options.getString('name'):action==='speed'?i.options.getNumber('multiplier'):null;
 const ctx={isInteraction:true,interaction:i,guild:i.guild,member:i.member,channel:i.channel,user:i.user,deferReply:()=>i.deferReply(),editReply:p=>i.editReply(p),reply:p=>i.reply(p)};
 return music.execute(ctx,player,action,value);
}
 if(name==='spotify'){try{const tracks=await spotify.search(i.options.getString('query'),5);if(!tracks.length)return i.reply({content:'No Spotify tracks found.',ephemeral:true});const embed=new EmbedBuilder().setColor(0x1DB954).setTitle('Spotify search results').setDescription(tracks.map((t,n)=>(n+1)+'. **'+t.name+'** — '+t.artists.join(', ')+'\n[Open in Spotify]('+t.url+')').join('\n\n'));return i.reply({embeds:[embed],ephemeral:true});}catch(e){return i.reply({content:e.message+' Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to the environment.',ephemeral:true});}}
 if(['ping','avatar','userinfo','serverinfo','botinfo','calculate','poll','remind'].includes(name))return utilityRun(i,client);
 if(name==='lockdown'){if(!i.memberPermissions?.has(PermissionFlagsBits.Administrator))return i.reply({content:'Administrator permission required.',ephemeral:true});await security.lockdown(i.guild,'Manually activated by '+i.user.tag);return i.reply({content:'Lockdown activated.',ephemeral:true});}
 if(name==='unlock'){if(!i.memberPermissions?.has(PermissionFlagsBits.Administrator))return i.reply({content:'Administrator permission required.',ephemeral:true});await security.restoreLockdown(i.guild);return i.reply({content:'Lockdown recovery completed.',ephemeral:true});}
 if(['timeout','kick','ban'].includes(name)){
 const actor=await i.guild.members.fetch(i.user.id),user=i.options.getUser('user'),target=await i.guild.members.fetch(user.id).catch(()=>null);
 if(!target)return i.reply({content:'Member not found in this server.',ephemeral:true});
 const hierarchy=moderation.canActOnTarget(actor,target,i.guild.members.me);
 if(!hierarchy.ok)return i.reply({content:hierarchy.reason,ephemeral:true});
 const reason=i.options.getString('reason')||'No reason provided';
 if(name==='timeout'){
  if(!actor.permissions.has(PermissionFlagsBits.ModerateMembers)||!target.moderatable)return i.reply({content:'Missing Moderate Members permission or target cannot be timed out.',ephemeral:true});
  await target.timeout(i.options.getInteger('minutes')*60000,reason);
 } else if(name==='kick'){
  if(!actor.permissions.has(PermissionFlagsBits.KickMembers)||!target.kickable)return i.reply({content:'Missing Kick Members permission or target cannot be kicked.',ephemeral:true});
  await target.kick(reason);
 } else {
  if(!actor.permissions.has(PermissionFlagsBits.BanMembers)||!target.bannable)return i.reply({content:'Missing Ban Members permission or target cannot be banned.',ephemeral:true});
  await target.ban({reason});
 }
 await security.log(i.guild,'Moderation: '+user.tag+' was '+name+' by '+i.user.tag+'. Reason: '+reason);
 return i.reply({embeds:[moderationCaseEmbed({action:name,target,moderator:i.user,reason: name==='timeout'?reason:reason+(name==='timeout'?'':'') ,guild:i.guild,details:name==='timeout'?'Duration: '+i.options.getInteger('minutes')+' minute(s)':undefined})],ephemeral:true});
}
if(name==='warn'){
 const actor=await i.guild.members.fetch(i.user.id),user=i.options.getUser('user'),target=await i.guild.members.fetch(user.id).catch(()=>null);
 if(!target)return i.reply({content:'Member not found in this server.',ephemeral:true});
 const hierarchy=moderation.canActOnTarget(actor,target,i.guild.members.me);if(!hierarchy.ok)return i.reply({content:hierarchy.reason,ephemeral:true});
 if(!actor.permissions.has(PermissionFlagsBits.ModerateMembers))return i.reply({content:'Moderate Members permission required.',ephemeral:true});
 const reason=i.options.getString('reason')||'No reason provided',item=moderation.addWarning(i.guildId,user.id,i.user.id,reason);
 await security.log(i.guild,'⚠️ **Warning #'+item.id+'** · '+user.tag+' warned by '+i.user.tag+'. Reason: '+reason);
 return i.reply({embeds:[moderationCaseEmbed({action:'warn',target,moderator:i.user,reason:'Warning #'+item.id+' · '+reason,guild:i.guild})],ephemeral:true});
}
if(name==='warnings'){
 const user=i.options.getUser('user'),items=moderation.getWarnings(i.guildId,user.id);
 if(!items.length)return i.reply({content:user.tag+' has no recorded warnings.',ephemeral:true});
 const lines=items.slice(-15).map(x=>'**#'+x.id+'** · '+(x.type||'warning')+' · '+x.reason+' · <t:'+Math.floor(new Date(x.at).getTime()/1000)+':R>');
 return i.reply({embeds:[new EmbedBuilder().setColor(0xF1C40F).setTitle('Warning history · '+user.tag).setDescription(lines.join('\\n').slice(0,4000))],ephemeral:true});
}
if(name==='clearwarnings'){
 if(!i.memberPermissions.has(PermissionFlagsBits.ManageMessages))return i.reply({content:'Manage Messages permission required.',ephemeral:true});
 const user=i.options.getUser('user'),removed=moderation.clearWarnings(i.guildId,user.id,i.user.id);
 await security.log(i.guild,'🧹 Cleared '+removed+' warning(s) for '+user.tag+' by '+i.user.tag+'.');
 return i.reply({embeds:[moderationCaseEmbed({action:'clearwarnings',target,moderator:i.user,reason:removed+' warning(s) removed',guild:i.guild})],ephemeral:true});
}
if(name==='purge'){
 if(!i.memberPermissions.has(PermissionFlagsBits.ManageMessages))return i.reply({content:'Manage Messages permission required.',ephemeral:true});
 const amount=i.options.getInteger('amount');
 await i.deferReply({ephemeral:true});
 const deleted=await i.channel.bulkDelete(amount,true);
 await security.log(i.guild,'🧹 '+i.user.tag+' bulk-deleted '+deleted.size+' messages in #'+i.channel.name+'.');
 return i.editReply({embeds:[moderationCaseEmbed({action:'purge',moderator:i.user,reason:'Deleted '+deleted.size+' recent messages in #'+i.channel.name+'.',guild:i.guild,details:'**Channel**\n<#'+i.channelId+'>\n\n**Deleted**\n'+deleted.size+' message(s)'})]});
}
if(name==='slowmode'){
 if(!i.memberPermissions.has(PermissionFlagsBits.ManageChannels))return i.reply({content:'Manage Channels permission required.',ephemeral:true});
 const seconds=i.options.getInteger('seconds');
 await i.channel.setRateLimitPerUser(seconds,'Changed by '+i.user.tag);
 await security.log(i.guild,'🐢 Slowmode set to '+seconds+'s in #'+i.channel.name+' by '+i.user.tag+'.');
 return i.reply({embeds:[moderationCaseEmbed({action:'slowmode',moderator:i.user,reason:'Changed in #'+i.channel.name,guild:i.guild,details:'**Slowmode**\n'+(seconds?seconds+' seconds':'Disabled')})],ephemeral:true});
}
if(name==='nick'){
 const actor=await i.guild.members.fetch(i.user.id),user=i.options.getUser('user'),target=await i.guild.members.fetch(user.id).catch(()=>null);
 if(!target)return i.reply({content:'Member not found in this server.',ephemeral:true});
 const hierarchy=moderation.canActOnTarget(actor,target,i.guild.members.me);if(!hierarchy.ok)return i.reply({content:hierarchy.reason,ephemeral:true});
 if(!actor.permissions.has(PermissionFlagsBits.ManageNicknames)||!target.manageable)return i.reply({content:'Missing Manage Nicknames permission or target cannot be edited.',ephemeral:true});
 await target.setNickname(i.options.getString('nickname'), 'Nickname changed by '+i.user.tag);
 return i.reply({embeds:[moderationCaseEmbed({action:'nick',target,moderator:i.user,reason:'Nickname changed to '+(i.options.getString('nickname')||'the account username'),guild:i.guild})],ephemeral:true});
}
if(name==='unban'){
 if(!i.memberPermissions.has(PermissionFlagsBits.BanMembers))return i.reply({content:'Ban Members permission required.',ephemeral:true});
 const id=i.options.getString('user_id'),reason=i.options.getString('reason')||'No reason provided';
 if(!/^\d{17,20}$/.test(id))return i.reply({content:'Enter a valid Discord user ID.',ephemeral:true});
 const existing=await i.guild.bans.fetch(id).catch(()=>null);
 if(!existing)return i.reply({content:'That user is not currently banned.',ephemeral:true});
 await i.guild.members.unban(id,reason);
 await security.log(i.guild,'🔓 User '+id+' unbanned by '+i.user.tag+'. Reason: '+reason);
 return i.reply({embeds:[moderationCaseEmbed({action:'unban',moderator:i.user,reason:reason,guild:i.guild,details:'**User ID**\n'+id})],ephemeral:true});
}
}
async function handleComponent(i){
 if(i.isButton()&&i.customId==='mina_verify_start'){const a=Math.floor(Math.random()*8)+2,b=Math.floor(Math.random()*8)+2,key=i.guildId+':'+i.user.id;challenges.set(key,{answer:String(a+b),expires:Date.now()+180000});const modal=new ModalBuilder().setCustomId('mina_verify_answer').setTitle('Verification check');const input=new TextInputBuilder().setCustomId('answer').setLabel('What is '+a+' + '+b+'?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3);modal.addComponents(new ActionRowBuilder().addComponents(input));return i.showModal(modal);}
 if(i.isModalSubmit()&&i.customId==='mina_verify_answer'){const key=i.guildId+':'+i.user.id,challenge=challenges.get(key);challenges.delete(key);if(!challenge||challenge.expires<Date.now()||i.fields.getTextInputValue('answer').trim()!==challenge.answer)return i.reply({content:'Verification failed or expired. Run /verify again.',ephemeral:true});const cfg=store.get(i.guildId),member=await i.guild.members.fetch(i.user.id).catch(()=>null);if(!member)return i.reply({content:'Could not find your membership.',ephemeral:true});const role=await i.guild.roles.fetch(cfg.verification.verifiedRoleId).catch(()=>null);if(!role||!member.manageable)return i.reply({content:'I cannot assign the verified role. Check role hierarchy.',ephemeral:true});await member.roles.add(role,'NovaBot verification completed');const quarantine=cfg.verification.quarantineRoleId?await i.guild.roles.fetch(cfg.verification.quarantineRoleId).catch(()=>null):null;if(quarantine&&member.roles.cache.has(quarantine.id))await member.roles.remove(quarantine,'NovaBot verification completed').catch(()=>null);await security.log(i.guild,'Member '+i.user.tag+' completed verification.');return i.reply({content:'Verification successful. Welcome!',ephemeral:true});}
}

async function handlePrefix(message) {
 if (!message.guild || message.author.bot || !message.content) return false;
 const match = message.content.trim().match(/^[,.]([a-z]+)(?:\s+([\s\S]*))?$/i);
 if (!match) return false;
 const name = match[1].toLowerCase(), args = (match[2] || '').trim();
 const perms = message.member?.permissions;
 const requirePerm = permission => perms?.has(permission);
 const deny = () => message.reply({ content: 'You do not have permission to use this command.' }).catch(() => null);
 const target = message.mentions.members.first();

 if (name === 'help') {
  await message.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('NovaBot commands').setDescription(
   '**Security:** /security, /verification, /lockdown, /unlock\n**Moderation:** /warn, /warnings, /clearwarnings, /timeout, /kick, /ban, /unban, /purge, /slowmode, /nick\n**Music:** ,play, ,pause, ,resume, ,skip, ,queue, ,volume\n**Utilities:** /ping, /calculate, /poll, /remind'
  )] }).catch(() => null);
  return true;
 }
 if (name === 'lockdown' || name === 'unlock') {
  if (!requirePerm(PermissionFlagsBits.Administrator)) return deny();
  if (name === 'lockdown') await security.lockdown(message.guild, 'Manually activated by ' + message.author.tag);
  else await security.restoreLockdown(message.guild);
  await message.reply({ embeds: [moderationCaseEmbed({ action:name, moderator:message.author, reason:'Manual action', guild:message.guild })] }).catch(() => null);
  return true;
 }
 if (name === 'purge') {
  if (!requirePerm(PermissionFlagsBits.ManageMessages)) return deny();
  const amount = Number(args.split(/\s+/)[0]);
  if (!Number.isInteger(amount) || amount < 2 || amount > 100) {
   await message.reply('Usage: ,purge 2-100').catch(() => null);
   return true;
  }
  const deleted = await message.channel.bulkDelete(amount, true).catch(() => null);
  await security.log(message.guild, message.author.tag + ' bulk-deleted ' + (deleted?.size || 0) + ' messages in #' + message.channel.name + '.');
  await message.channel.send({ embeds: [moderationCaseEmbed({ action:'purge', moderator:message.author, guild:message.guild, details:'**Channel**\\n<#'+message.channelId+'>\\n\\n**Deleted**\\n'+(deleted?.size||0)+' recent message(s)' })] }).then(m => setTimeout(() => m.delete().catch(() => null), 8000)).catch(() => null);
  return true;
 }
 if (name === 'slowmode') {
  if (!requirePerm(PermissionFlagsBits.ManageChannels)) return deny();
  const seconds = Number(args);
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600) {
   await message.reply('Usage: ,slowmode 0-21600').catch(() => null);
   return true;
  }
  await message.channel.setRateLimitPerUser(seconds, 'Changed by ' + message.author.tag);
  await message.reply({ embeds: [moderationCaseEmbed({ action:'slowmode', moderator:message.author, guild:message.guild, details:'**Channel**\\n<#'+message.channelId+'>\\n\\n**Slowmode**\\n'+(seconds?seconds+' seconds':'Disabled') })] }).catch(() => null);
  return true;
 }
 if (['warn', 'warnings', 'clearwarnings', 'timeout', 'kick', 'ban', 'nick'].includes(name)) {
  if (!target) {
   await message.reply('Mention a member.').catch(() => null);
   return true;
  }
  if (['warn', 'timeout', 'kick', 'ban', 'nick'].includes(name)) {
   const hierarchy = moderation.canActOnTarget(message.member, target, message.guild.members.me);
   if (!hierarchy.ok) {
    await message.reply(hierarchy.reason).catch(() => null);
    return true;
   }
  }
  const cleanArgs = args.replace(/<@!?\d+>/, '').trim();
  const reason = cleanArgs || 'No reason provided';
  if (name === 'warn') {
   if (!requirePerm(PermissionFlagsBits.ModerateMembers)) return deny();
   const item = moderation.addWarning(message.guildId, target.id, message.author.id, reason);
   await security.log(message.guild, 'Warning #' + item.id + ' · ' + target.user.tag + ' by ' + message.author.tag + '. Reason: ' + reason);
   await message.reply({ embeds: [moderationCaseEmbed({ action:'warn', target, moderator:message.author, reason:'Warning #'+item.id+' · '+reason, guild:message.guild })] }).catch(() => null);
   return true;
  }
  if (name === 'warnings') {
   if (!requirePerm(PermissionFlagsBits.ModerateMembers)) return deny();
   const items = moderation.getWarnings(message.guildId, target.id);
   const body = items.slice(-12).map(x => '#' + x.id + ' · ' + x.reason + ' · <t:' + Math.floor(new Date(x.at).getTime() / 1000) + ':R>').join('\n');
   await message.reply({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle('Warnings · ' + target.user.tag).setDescription(body || 'No warnings recorded.').setFooter({ text: items.length + ' record(s)' })] }).catch(() => null);
   return true;
  }
  if (name === 'clearwarnings') {
   if (!requirePerm(PermissionFlagsBits.ManageMessages)) return deny();
   const count = moderation.clearWarnings(message.guildId, target.id, message.author.id);
   await message.reply({ embeds: [moderationCaseEmbed({ action:'clearwarnings', target, moderator:message.author, reason:count+' warning(s) removed', guild:message.guild })] }).catch(() => null);
   return true;
  }
  if (name === 'timeout') {
   if (!requirePerm(PermissionFlagsBits.ModerateMembers) || !target.moderatable) return deny();
   const minutes = Number(cleanArgs.match(/^(\d+)/)?.[1]);
   const timeoutReason = cleanArgs.replace(/^\d+\s*/, '') || 'No reason provided';
   if (!Number.isInteger(minutes) || minutes < 1 || minutes > 40320) {
    await message.reply('Usage: ,timeout @member 1-40320 [reason]').catch(() => null);
    return true;
   }
   await target.timeout(minutes * 60000, timeoutReason);
   await message.reply({ embeds: [moderationCaseEmbed({ action:'timeout', target, moderator:message.author, reason:timeoutReason, guild:message.guild, details:'Duration: '+minutes+' minute(s)' })] }).catch(() => null);
   return true;
  }
  if (name === 'kick') {
   if (!requirePerm(PermissionFlagsBits.KickMembers) || !target.kickable) return deny();
   await target.kick(reason);
   await message.reply({ embeds: [moderationCaseEmbed({ action:'kick', target, moderator:message.author, reason, guild:message.guild })] }).catch(() => null);
   return true;
  }
  if (name === 'ban') {
   if (!requirePerm(PermissionFlagsBits.BanMembers) || !target.bannable) return deny();
   await target.ban({ reason });
   await message.reply({ embeds: [moderationCaseEmbed({ action:'ban', target, moderator:message.author, reason, guild:message.guild })] }).catch(() => null);
   return true;
  }
  if (name === 'nick') {
   if (!requirePerm(PermissionFlagsBits.ManageNicknames) || !target.manageable) return deny();
   await target.setNickname(cleanArgs || null, 'Changed by ' + message.author.tag);
   await message.reply({ embeds: [moderationCaseEmbed({ action:'nick', target, moderator:message.author, reason:'Nickname changed to '+(cleanArgs||'the account username'), guild:message.guild })] }).catch(() => null);
   return true;
  }
 }
 if (name === 'unban') {
  if (!requirePerm(PermissionFlagsBits.BanMembers)) return deny();
  const id = args.split(/\s+/)[0];
  if (!/^\d{17,20}$/.test(id || '')) {
   await message.reply('Usage: ,unban USER_ID [reason]').catch(() => null);
   return true;
  }
  const existing = await message.guild.bans.fetch(id).catch(() => null);
  if (!existing) {
   await message.reply('That user is not banned.').catch(() => null);
   return true;
  }
  await message.guild.members.unban(id, args.slice(id.length).trim() || 'No reason provided');
  await message.reply({ embeds: [moderationCaseEmbed({ action:'unban', moderator:message.author, reason:args.slice(id.length).trim()||'No reason provided', guild:message.guild, details:'**User ID**\\n'+id })] }).catch(() => null);
  return true;
 }
 return false;
}

module.exports={commands,execute,handleComponent,handlePrefix};
