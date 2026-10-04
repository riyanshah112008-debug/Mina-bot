// ==========================================
// 💰 Starry SUPREME ECONOMY & LEVELING SUITE (16 COMMANDS)
// File Path: src/commands/bundles/economyCommands.js
// XP Cards, Casino Slots, Banking & 1-Year Interactive Shop
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits 
} = require('discord.js');
const mongoose = require('mongoose');
const config = require('../../config');
const { ONE_YEAR_MS } = require('../../utils/contextHelper');

// Economy schema definition / model loader
const economySchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    wallet: { type: Number, default: 100 },
    bank: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    lastDaily: { type: Date, default: null },
    lastWeekly: { type: Date, default: null },
    lastWork: { type: Date, default: null },
    lastRob: { type: Date, default: null },
    lastFish: { type: Date, default: null },
    lastMine: { type: Date, default: null },
    inventory: { type: Array, default: [] },
    marriedTo: { type: String, default: null },
    marriedAt: { type: Date, default: null },
    pet: {
        name: { type: String, default: null },
        species: { type: String, default: null },
        level: { type: Number, default: 1 },
        xp: { type: Number, default: 0 },
        hunger: { type: Number, default: 100 },
        happiness: { type: Number, default: 100 }
    },
    bio: { type: String, default: 'Living the starlight dream ✨' }
});
economySchema.index({ userId: 1, guildId: 1 }, { unique: true });

if (mongoose.models.EcoUser) {
    try {
        mongoose.models.EcoUser.schema.add({
            lastFish: { type: Date, default: null },
            lastMine: { type: Date, default: null },
            inventory: { type: Array, default: [] },
            marriedTo: { type: String, default: null },
            marriedAt: { type: Date, default: null },
            pet: {
                name: { type: String, default: null },
                species: { type: String, default: null },
                level: { type: Number, default: 1 },
                xp: { type: Number, default: 0 },
                hunger: { type: Number, default: 100 },
                happiness: { type: Number, default: 100 }
            },
            bio: { type: String, default: 'Living the starlight dream ✨' }
        });
    } catch (e) {}
}

const EcoUser = mongoose.models.EcoUser || mongoose.model('EcoUser', economySchema);

async function getOrCreateEcoUser(userId, guildId = 'GLOBAL') {
    const safeGuildId = guildId || 'GLOBAL';
    let doc = await EcoUser.findOne({ userId, guildId: safeGuildId });
    if (!doc) {
        doc = await EcoUser.create({ 
            userId, 
            guildId: safeGuildId, 
            wallet: 100, 
            bank: 0, 
            xp: 0, 
            level: 1,
            inventory: [],
            bio: 'Living the starlight dream ✨'
        });
    }
    return doc;
}

const commands = [
    // 1. RANK / LEVEL
    {
        name: 'rank',
        aliases: ['level', 'lvl'],
        category: 'Economy',
        description: 'Check your current level, XP, and rank progress.',
        usage: ',rank [@user]',
        async execute(ctx) {
            const target = ctx.message?.mentions?.users?.first() || ctx.user;
            const doc = await getOrCreateEcoUser(target.id, ctx.guild.id);
            const neededXp = doc.level * 100;

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setAuthor({ name: `${target.username}'s Rank & Level`, iconURL: target.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '👑 Level', value: `\`Level ${doc.level}\``, inline: true },
                    { name: '✨ XP Progress', value: `\`${doc.xp} / ${neededXp} XP\``, inline: true },
                    { name: '💰 Net Worth', value: `\`$${(doc.wallet + doc.bank).toLocaleString()}\``, inline: true }
                )
                .setFooter({ text: 'Starry Leveling Engine • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 2. LEADERBOARD
    {
        name: 'leaderboard',
        aliases: ['lb', 'top'],
        category: 'Economy',
        description: 'View top server members by level and wealth.',
        usage: ',leaderboard [xp / money]',
        async execute(ctx) {
            const type = ctx.args[0]?.toLowerCase() === 'money' ? 'wallet' : 'xp';
            const top = await EcoUser.find({ guildId: ctx.guild.id }).sort({ [type]: -1 }).limit(10).lean();

            if (top.length === 0) return ctx.reply('📭 Leaderboard is empty for this server.');

            const list = top.map((u, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`#${i + 1}\``;
                return `${medal} <@${u.userId}> — **Level ${u.level}** (\`${u.xp} XP\`) | **$${(u.wallet + u.bank).toLocaleString()}**`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.ECONOMY)
                .setTitle(`🏆 ${ctx.guild.name} Top Leaderboard`)
                .setDescription(list)
                .setFooter({ text: 'Rankings update in real-time • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 3. SETLEVEL
    {
        name: 'setlevel',
        aliases: ['givexp'],
        category: 'Economy',
        description: 'Set a user\'s level or add XP (Admins Only).',
        usage: ',setlevel <@user> <level number>',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Administrator permission required.');
            }
            const target = ctx.message?.mentions?.users?.first();
            const level = parseInt(ctx.args[1]);
            if (!target || isNaN(level) || level < 1) {
                return ctx.reply('❌ Usage: `,setlevel @user <level>`');
            }
            await EcoUser.updateOne({ userId: target.id, guildId: ctx.guild.id }, { level, xp: 0 }, { upsert: true });
            return ctx.reply(`✅ **Set ${target.username}'s level to Level ${level}!**`);
        }
    },

    // 4. BALANCE
    {
        name: 'balance',
        aliases: ['bal', 'coins', 'money', 'wallet'],
        category: 'Economy',
        description: 'Check your wallet cash and bank balance.',
        usage: ',bal [@user]',
        async execute(ctx) {
            const target = ctx.message?.mentions?.users?.first() || ctx.user;
            const doc = await getOrCreateEcoUser(target.id, ctx.guild.id);

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.ECONOMY)
                .setAuthor({ name: `${target.username}'s Financial Balance`, iconURL: target.displayAvatarURL({ dynamic: true }) })
                .addFields(
                    { name: '💵 Wallet', value: `\`$${doc.wallet.toLocaleString()}\``, inline: true },
                    { name: '🏦 Bank', value: `\`$${doc.bank.toLocaleString()}\``, inline: true },
                    { name: '💎 Net Worth', value: `\`$${(doc.wallet + doc.bank).toLocaleString()}\``, inline: true }
                )
                .setFooter({ text: 'Starry Banking System • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 5. DAILY
    {
        name: 'daily',
        category: 'Economy',
        description: 'Claim your daily credit reward ($500).',
        usage: ',daily',
        async execute(ctx) {
            const doc = await getOrCreateEcoUser(ctx.user.id, ctx.guild.id);
            const now = new Date();
            const cooldown = 24 * 60 * 60 * 1000;

            if (doc.lastDaily && now - doc.lastDaily < cooldown) {
                const remaining = cooldown - (now - doc.lastDaily);
                const hours = Math.floor(remaining / (3600 * 1000));
                const mins = Math.floor((remaining % (3600 * 1000)) / (60 * 1000));
                return ctx.reply(`⏳ You already claimed your daily reward! Come back in **${hours}h ${mins}m**.`);
            }

            const reward = 500;
            doc.wallet += reward;
            doc.lastDaily = now;
            await doc.save();

            return ctx.reply(`🎁 **Daily Claimed:** You received **$${reward}** credits! New Wallet Balance: \`$${doc.wallet.toLocaleString()}\``);
        }
    },

    // 6. WEEKLY
    {
        name: 'weekly',
        category: 'Economy',
        description: 'Claim your weekly bonus reward ($2,500).',
        usage: ',weekly',
        async execute(ctx) {
            const doc = await getOrCreateEcoUser(ctx.user.id, ctx.guild.id);
            const now = new Date();
            const cooldown = 7 * 24 * 60 * 60 * 1000;

            if (doc.lastWeekly && now - doc.lastWeekly < cooldown) {
                const remaining = cooldown - (now - doc.lastWeekly);
                const days = Math.floor(remaining / (24 * 3600 * 1000));
                return ctx.reply(`⏳ Weekly reward already claimed! Come back in **${days} days**.`);
            }

            const reward = 2500;
            doc.wallet += reward;
            doc.lastWeekly = now;
            await doc.save();

            return ctx.reply(`🎉 **Weekly Bonus:** You received **$${reward.toLocaleString()}** credits!`);
        }
    },

    // 7. WORK
    {
        name: 'work',
        category: 'Economy',
        description: 'Work a random job and earn cash.',
        usage: ',work',
        async execute(ctx) {
            const doc = await getOrCreateEcoUser(ctx.user.id, ctx.guild.id);
            const now = new Date();
            const cooldown = 10 * 60 * 1000; // 10 mins

            if (doc.lastWork && now - doc.lastWork < cooldown) {
                const remaining = cooldown - (now - doc.lastWork);
                const mins = Math.ceil(remaining / 60000);
                return ctx.reply(`⏳ You are tired! Rest for **${mins} minutes** before working again.`);
            }

            const jobs = [
                { job: 'Software Engineer', pay: 250 },
                { job: 'Discord Moderator', pay: 150 },
                { job: 'Music DJ', pay: 200 },
                { job: 'Graphic Designer', pay: 180 },
                { job: 'Coffee Barista', pay: 120 }
            ];
            const choice = jobs[Math.floor(Math.random() * jobs.length)];

            doc.wallet += choice.pay;
            doc.xp += 15;
            doc.lastWork = now;
            await doc.save();

            return ctx.reply(`💼 You worked as a **${choice.job}** and earned **$${choice.pay}** (+15 XP)!`);
        }
    },

    // 8. BEG
    {
        name: 'beg',
        category: 'Economy',
        description: 'Beg for spare coins.',
        usage: ',beg',
        async execute(ctx) {
            const doc = await getOrCreateEcoUser(ctx.user.id, ctx.guild.id);
            const amount = Math.floor(Math.random() * 50) + 10;
            doc.wallet += amount;
            await doc.save();
            return ctx.reply(`🥺 A generous stranger gave you **$${amount}** coins!`);
        }
    },

    // 9. DEPOSIT
    {
        name: 'deposit',
        aliases: ['dep'],
        category: 'Economy',
        description: 'Deposit cash from your wallet into your safe bank.',
        usage: ',deposit <amount / all>',
        async execute(ctx) {
            const doc = await getOrCreateEcoUser(ctx.user.id, ctx.guild.id);
            const arg = ctx.args[0]?.toLowerCase();
            let amount = arg === 'all' || arg === 'max' ? doc.wallet : parseInt(arg);

            if (isNaN(amount) || amount <= 0 || amount > doc.wallet) {
                return ctx.reply(`❌ Invalid deposit amount! You have **$${doc.wallet}** in your wallet.`);
            }

            doc.wallet -= amount;
            doc.bank += amount;
            await doc.save();

            return ctx.reply(`🏦 **Deposited $${amount.toLocaleString()} into your bank.**\nWallet: \`$${doc.wallet.toLocaleString()}\` | Bank: \`$${doc.bank.toLocaleString()}\``);
        }
    },

    // 10. WITHDRAW
    {
        name: 'withdraw',
        aliases: ['with'],
        category: 'Economy',
        description: 'Withdraw cash from your bank into your wallet.',
        usage: ',withdraw <amount / all>',
        async execute(ctx) {
            const doc = await getOrCreateEcoUser(ctx.user.id, ctx.guild.id);
            const arg = ctx.args[0]?.toLowerCase();
            let amount = arg === 'all' || arg === 'max' ? doc.bank : parseInt(arg);

            if (isNaN(amount) || amount <= 0 || amount > doc.bank) {
                return ctx.reply(`❌ Invalid amount! You have **$${doc.bank}** in your bank.`);
            }

            doc.bank -= amount;
            doc.wallet += amount;
            await doc.save();

            return ctx.reply(`💵 **Withdrew $${amount.toLocaleString()} from your bank.**`);
        }
    },

    // 11. PAY / GIVE
    {
        name: 'pay',
        aliases: ['give', 'transfer'],
        category: 'Economy',
        description: 'Transfer credits to another member.',
        usage: ',pay <@user> <amount>',
        async execute(ctx) {
            const target = ctx.message?.mentions?.users?.first();
            const amount = parseInt(ctx.args[1]);

            if (!target || isNaN(amount) || amount <= 0 || target.id === ctx.user.id) {
                return ctx.reply('❌ Usage: `,pay @user <amount>`');
            }

            const sender = await getOrCreateEcoUser(ctx.user.id, ctx.guild.id);
            if (sender.wallet < amount) return ctx.reply(`❌ Insufficient funds! You only have **$${sender.wallet}** in your wallet.`);

            const receiver = await getOrCreateEcoUser(target.id, ctx.guild.id);

            sender.wallet -= amount;
            receiver.wallet += amount;
            await sender.save();
            await receiver.save();

            return ctx.reply(`💸 **Transferred $${amount.toLocaleString()} to ${target.username}!**`);
        }
    },

    // 12. GAMBLE
    {
        name: 'gamble',
        aliases: ['bet'],
        category: 'Economy',
        description: 'Gamble credits with double-or-nothing odds.',
        usage: ',gamble <amount>',
        async execute(ctx) {
            const amount = parseInt(ctx.args[0]);
            const doc = await getOrCreateEcoUser(ctx.user.id, ctx.guild.id);

            if (isNaN(amount) || amount <= 0 || amount > doc.wallet) {
                return ctx.reply(`❌ You can only gamble between $1 and your wallet balance ($${doc.wallet.toLocaleString()}).`);
            }

            const rollEmbed = new EmbedBuilder()
                .setColor('#3498DB')
                .setAuthor({ name: `${ctx.user.username}'s Dice Gamble`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`🎲 **Rolling the cosmic dice for $${amount.toLocaleString()}...**\n*Calculating starlight odds...*`)
                .setFooter({ text: 'Rolling...' });

            const msg = await ctx.reply({ embeds: [rollEmbed] });

            await new Promise(res => setTimeout(res, 1200));

            const win = Math.random() >= 0.52; // 48% win chance
            const userRoll = Math.floor(Math.random() * 100) + 1;
            const dealerRoll = win 
                ? Math.floor(Math.random() * userRoll) 
                : Math.min(100, userRoll + Math.floor(Math.random() * (100 - userRoll) + 1));

            if (win) {
                doc.wallet += amount;
            } else {
                doc.wallet -= amount;
            }
            await doc.save();

            const resultEmbed = new EmbedBuilder()
                .setColor(win ? '#2ECC71' : '#E74C3C')
                .setAuthor({ name: `${ctx.user.username}'s Dice Gamble`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setTitle(win ? '🎉 Victory! You Won!' : '💀 Defeat! Dealer Won!')
                .setDescription(
                    `> 🎲 **Your Roll:** \`${userRoll}\`\n` +
                    `> 🤖 **Dealer Roll:** \`${dealerRoll}\`\n\n` +
                    (win 
                        ? `✨ **You doubled your bet!** Received **+$${amount.toLocaleString()}** stardust credits!` 
                        : `💥 **You lost your bet!** Deducted **-$${amount.toLocaleString()}** stardust credits.`) +
                    `\n\n💰 **New Balance:** \`$${doc.wallet.toLocaleString()}\``
                )
                .setFooter({ text: 'Cosmic Casino • Prefix: ,' })
                .setTimestamp();

            if (msg && typeof msg.edit === 'function') {
                return await msg.edit({ embeds: [resultEmbed] }).catch(() => {});
            } else {
                return await ctx.editReply({ embeds: [resultEmbed] }).catch(() => {});
            }
        }
    },

    // 13. SLOTS
    {
        name: 'slots',
        category: 'Economy',
        description: 'Play a 3-reel casino slot machine.',
        usage: ',slots <bet amount>',
        async execute(ctx) {
            const bet = parseInt(ctx.args[0]) || 50;
            const doc = await getOrCreateEcoUser(ctx.user.id, ctx.guild.id);

            if (bet <= 0 || bet > doc.wallet) {
                return ctx.reply(`❌ You need **$${bet}** in your wallet to spin the slots!`);
            }

            // Deduct bet up-front
            doc.wallet -= bet;
            await doc.save();

            const spinEmbed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setAuthor({ name: `${ctx.user.username}'s Slot Machine`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setTitle('🎰 Spinning the Cosmic Reels...')
                .setDescription('**[ 🌀 | 🌀 | 🌀 ]**\n\n*The reels are spinning through the constellations...*')
                .setFooter({ text: `Bet: $${bet.toLocaleString()} Stardust` });

            const msg = await ctx.reply({ embeds: [spinEmbed] });

            await new Promise(res => setTimeout(res, 1200));

            const items = ['🍒', '🍋', '💎', '7️⃣', '🔔'];
            const r1 = items[Math.floor(Math.random() * items.length)];
            const r2 = items[Math.floor(Math.random() * items.length)];
            const r3 = items[Math.floor(Math.random() * items.length)];

            const winJackpot = r1 === r2 && r2 === r3;
            const winSmall = r1 === r2 || r2 === r3 || r1 === r3;

            let multiplier = 0;
            if (winJackpot) multiplier = r1 === '💎' ? 10 : r1 === '7️⃣' ? 7 : 4;
            else if (winSmall) multiplier = 1.5;

            const payout = Math.floor(bet * multiplier);
            if (payout > 0) {
                doc.wallet += payout;
                await doc.save();
            }

            const finalEmbed = new EmbedBuilder()
                .setColor(winJackpot ? '#2ECC71' : winSmall ? '#F1C40F' : '#E74C3C')
                .setAuthor({ name: `${ctx.user.username}'s Slot Machine`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setTitle('🎰 Cosmic Slot Machine')
                .setDescription(
                    `**[ ${r1} | ${r2} | ${r3} ]**\n\n` + 
                    (winJackpot ? `🔥 **JACKPOT!** You won **+$${payout.toLocaleString()}** (${multiplier}x)!` : 
                     winSmall ? `✨ **MATCH!** You won **+$${payout.toLocaleString()}** (${multiplier}x)!` : 
                     `❌ **No match!** You lost **-$${bet.toLocaleString()}** credits.`)
                )
                .setFooter({ text: `New Balance: $${doc.wallet.toLocaleString()}` })
                .setTimestamp();

            if (msg && typeof msg.edit === 'function') {
                return await msg.edit({ embeds: [finalEmbed] }).catch(() => {});
            } else {
                return await ctx.editReply({ embeds: [finalEmbed] }).catch(() => {});
            }
        }
    },

    // 14. ROB
    {
        name: 'rob',
        aliases: ['stealmoney'],
        category: 'Economy',
        description: 'Attempt to pickpocket wallet cash from another member.',
        usage: ',rob <@user>',
        async execute(ctx) {
            const target = ctx.message?.mentions?.users?.first();
            if (!target || target.id === ctx.user.id) return ctx.reply('❌ Specify a user to rob: `,rob @user`');

            const victim = await getOrCreateEcoUser(target.id, ctx.guild.id);
            const robber = await getOrCreateEcoUser(ctx.user.id, ctx.guild.id);

            if (victim.wallet < 100) return ctx.reply('❌ This user is too broke to rob ($100 minimum wallet).');
            if (robber.wallet < 100) return ctx.reply('❌ You need at least $100 in your wallet in case you get caught!');

            const success = Math.random() >= 0.55;
            if (success) {
                const stolen = Math.floor(victim.wallet * (Math.random() * 0.3 + 0.1));
                victim.wallet -= stolen;
                robber.wallet += stolen;
                await victim.save();
                await robber.save();
                return ctx.reply(`🥷 **Heist Successful!** You stole **$${stolen.toLocaleString()}** from ${target.username}!`);
            } else {
                const fine = 100;
                robber.wallet -= fine;
                victim.wallet += fine;
                await robber.save();
                await victim.save();
                return ctx.reply(`🚨 **Busted!** You were caught and paid a **$${fine}** fine to ${target.username}.`);
            }
        }
    },

    // 15. SHOP
    {
        name: 'shop',
        category: 'Economy',
        description: 'Open the server shop with 1-Year interactive buy buttons.',
        usage: ',shop',
        async execute(ctx) {
            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.ECONOMY)
                .setTitle(`🛍️ ${ctx.guild.name} Official Server Shop`)
                .setDescription('Use your earned credits to purchase exclusive perks and vanity roles!\n*Buttons remain active with 1-Year lifetime.*')
                .addFields(
                    { name: '⭐ VIP Supporter Role', value: 'Cost: **$5,000** credits | Access to VIP voice channels', inline: false },
                    { name: '👑 Server Noble Role', value: 'Cost: **$15,000** credits | Exclusive embed & color perks', inline: false },
                    { name: '🔥 Custom Server Booster Role', value: 'Cost: **$50,000** credits | Top hierarchy vanity color', inline: false }
                )
                .setFooter({ text: 'Use ,buy <item> • Prefix: ,' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shop_buy_vip').setLabel('Buy VIP ($5k)').setStyle(ButtonStyle.Success).setEmoji('⭐'),
                new ButtonBuilder().setCustomId('shop_buy_noble').setLabel('Buy Noble ($15k)').setStyle(ButtonStyle.Primary).setEmoji('👑'),
                new ButtonBuilder().setCustomId('shop_buy_booster').setLabel('Buy Booster ($50k)').setStyle(ButtonStyle.Danger).setEmoji('🔥')
            );

            const replyMsg = await ctx.reply({ embeds: [embed], components: [row] });

            // 1-Year Component Collector
            const collector = replyMsg.createMessageComponentCollector({ time: ONE_YEAR_MS });
            collector.on('collect', async (i) => {
                const buyer = await getOrCreateEcoUser(i.user.id, ctx.guild.id);
                let price = 5000;
                let roleName = 'VIP Supporter';

                if (i.customId === 'shop_buy_noble') { price = 15000; roleName = 'Server Noble'; }
                else if (i.customId === 'shop_buy_booster') { price = 50000; roleName = 'Custom Booster'; }

                if (buyer.wallet < price) {
                    return i.reply({ content: `❌ Insufficient wallet funds! You need **$${price.toLocaleString()}** credits.`, ephemeral: true });
                }

                buyer.wallet -= price;
                await buyer.save();
                await i.reply({ content: `🎉 **Purchase Successful!** You bought **${roleName}** for **$${price.toLocaleString()}**!`, ephemeral: true });
            });
        }
    },

    // 16. BUY
    {
        name: 'buy',
        category: 'Economy',
        description: 'Purchase an item from the server shop.',
        usage: ',buy <item name>',
        async execute(ctx) {
            const item = ctx.args.join(' ').toLowerCase();
            if (!item) return ctx.reply('❌ Specify item to buy: `,buy vip` or view `,shop`');
            return ctx.reply(`🛍️ Processing purchase for **${item}**... Use \`,shop\` for instant 1-click buy buttons!`);
        }
    },

    // 17. FISH (Pescar)
    {
        name: 'fish',
        aliases: ['pescar'],
        category: 'Economy',
        description: 'Cast your fishing rod to catch aquatic creatures and treasures.',
        usage: ',fish',
        async execute(ctx) {
            const doc = await getOrCreateEcoUser(ctx.user.id, ctx.guild.id);
            const now = new Date();
            const cooldown = 45 * 1000; // 45 seconds

            if (doc.lastFish && now - doc.lastFish < cooldown) {
                const remainingSec = Math.ceil((cooldown - (now - doc.lastFish)) / 1000);
                return ctx.reply(`⏳ Your fishing line is tangled! Wait **${remainingSec}s** before casting again.`);
            }

            const FISH_POOL = [
                { name: 'Sardine', emoji: '🐟', value: 35, rarity: 'Common', color: '#95A5A6', chance: 20 },
                { name: 'Bluegill', emoji: '🐟', value: 45, rarity: 'Common', color: '#95A5A6', chance: 20 },
                { name: 'River Carp', emoji: '🐟', value: 60, rarity: 'Common', color: '#95A5A6', chance: 15 },
                { name: 'Clownfish', emoji: '🐠', value: 120, rarity: 'Uncommon', color: '#2ECC71', chance: 15 },
                { name: 'Red Snapper', emoji: '🐠', value: 180, rarity: 'Uncommon', color: '#2ECC71', chance: 10 },
                { name: 'Pufferfish', emoji: '🐡', value: 320, rarity: 'Rare', color: '#3498DB', chance: 7 },
                { name: 'Electric Ray', emoji: '⚡', value: 450, rarity: 'Rare', color: '#3498DB', chance: 5 },
                { name: 'Giant Squid', emoji: '🦑', value: 850, rarity: 'Epic', color: '#9B59B6', chance: 4 },
                { name: 'Golden Swordfish', emoji: '🐬', value: 1200, rarity: 'Epic', color: '#9B59B6', chance: 2 },
                { name: 'Great White Shark', emoji: '🦈', value: 3200, rarity: 'Legendary', color: '#F1C40F', chance: 1 },
                { name: 'Mythic Golden Koi', emoji: '🐉', value: 5000, rarity: 'Legendary', color: '#F1C40F', chance: 1 }
            ];

            const totalWeight = FISH_POOL.reduce((acc, f) => acc + f.chance, 0);
            let roll = Math.random() * totalWeight;
            let caught = FISH_POOL[0];
            for (const f of FISH_POOL) {
                if (roll < f.chance) {
                    caught = f;
                    break;
                }
                roll -= f.chance;
            }

            if (!Array.isArray(doc.inventory)) doc.inventory = [];
            doc.inventory.push({
                id: 'fish_' + caught.name.toLowerCase().replace(/\s+/g, '_'),
                name: caught.name,
                emoji: caught.emoji,
                value: caught.value,
                rarity: caught.rarity,
                type: 'fish',
                date: now
            });

            doc.lastFish = now;
            doc.xp += 15;
            await doc.save();

            const embed = new EmbedBuilder()
                .setColor(caught.color)
                .setTitle(`🎣 Splaaash! Caught a ${caught.name}!`)
                .setDescription(`You reeled in a **${caught.rarity}** ${caught.emoji} **${caught.name}**!\n\n💰 Market Value: **$${caught.value.toLocaleString()}** credits\n✨ Gained: **+15 XP**`)
                .addFields(
                    { name: '🎒 Backpack', value: `Total items: \`${doc.inventory.length}\` | Use \`,inv\` to view or \`,sell all\` to cash out.`, inline: false }
                )
                .setFooter({ text: 'Starry Gathering Engine • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 18. MINE (Minar)
    {
        name: 'mine',
        aliases: ['minar'],
        category: 'Economy',
        description: 'Swing your pickaxe into the crystal cavern to mine rare minerals.',
        usage: ',mine',
        async execute(ctx) {
            const doc = await getOrCreateEcoUser(ctx.user.id, ctx.guild.id);
            const now = new Date();
            const cooldown = 45 * 1000; // 45 seconds

            if (doc.lastMine && now - doc.lastMine < cooldown) {
                const remainingSec = Math.ceil((cooldown - (now - doc.lastMine)) / 1000);
                return ctx.reply(`⏳ Your pickaxe is cooling down! Wait **${remainingSec}s** before mining again.`);
            }

            const MINE_POOL = [
                { name: 'Stone Chunk', emoji: '🪨', value: 25, rarity: 'Common', color: '#95A5A6', chance: 25 },
                { name: 'Coal Lump', emoji: '⛏️', value: 50, rarity: 'Common', color: '#95A5A6', chance: 25 },
                { name: 'Copper Ingot', emoji: '🧱', value: 110, rarity: 'Uncommon', color: '#E67E22', chance: 15 },
                { name: 'Iron Ingot', emoji: '🔩', value: 180, rarity: 'Uncommon', color: '#BDC3C7', chance: 10 },
                { name: 'Pure Gold Nugget', emoji: '🪙', value: 380, rarity: 'Rare', color: '#F1C40F', chance: 10 },
                { name: 'Amethyst Crystal', emoji: '🔮', value: 550, rarity: 'Rare', color: '#9B59B6', chance: 5 },
                { name: 'Starlight Diamond', emoji: '💎', value: 1350, rarity: 'Epic', color: '#3498DB', chance: 5 },
                { name: 'Ruby Core', emoji: '♦️', value: 1800, rarity: 'Epic', color: '#E74C3C', chance: 2 },
                { name: 'Cosmic Netherite', emoji: '🌌', value: 4200, rarity: 'Legendary', color: '#2C3E50', chance: 2 },
                { name: 'Astral Star Stone', emoji: '⭐', value: 7500, rarity: 'Legendary', color: '#FFD700', chance: 1 }
            ];

            const totalWeight = MINE_POOL.reduce((acc, m) => acc + m.chance, 0);
            let roll = Math.random() * totalWeight;
            let mined = MINE_POOL[0];
            for (const m of MINE_POOL) {
                if (roll < m.chance) {
                    mined = m;
                    break;
                }
                roll -= m.chance;
            }

            if (!Array.isArray(doc.inventory)) doc.inventory = [];
            doc.inventory.push({
                id: 'ore_' + mined.name.toLowerCase().replace(/\s+/g, '_'),
                name: mined.name,
                emoji: mined.emoji,
                value: mined.value,
                rarity: mined.rarity,
                type: 'ore',
                date: now
            });

            doc.lastMine = now;
            doc.xp += 20;
            await doc.save();

            const embed = new EmbedBuilder()
                .setColor(mined.color)
                .setTitle(`⛏️ Claaang! Mined a ${mined.name}!`)
                .setDescription(`Your pickaxe struck a vein of **${mined.rarity}** ${mined.emoji} **${mined.name}**!\n\n💰 Market Value: **$${mined.value.toLocaleString()}** credits\n✨ Gained: **+20 XP**`)
                .addFields(
                    { name: '🎒 Backpack', value: `Total items: \`${doc.inventory.length}\` | Use \`,inv\` to inspect or \`,sell all\` to cash out.`, inline: false }
                )
                .setFooter({ text: 'Starry Mining Engine • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 19. INVENTORY (Backpack / Mochila)
    {
        name: 'inventory',
        aliases: ['inv', 'mochila', 'bag'],
        category: 'Economy',
        description: 'View your stored fish, minerals, and items in your backpack.',
        usage: ',inventory [@user]',
        async execute(ctx) {
            const target = ctx.message?.mentions?.users?.first() || ctx.options?.getUser?.('user') || ctx.user;
            const doc = await getOrCreateEcoUser(target.id, ctx.guild.id);
            const inv = doc.inventory || [];

            if (inv.length === 0) {
                return ctx.reply(`🎒 **${target.username}'s Backpack is empty!**\nUse \`,fish\` to catch sea creatures or \`,mine\` to dig for gems!`);
            }

            const grouped = {};
            let totalValue = 0;
            for (const it of inv) {
                const key = `${it.emoji || '📦'} ${it.name}`;
                if (!grouped[key]) {
                    grouped[key] = { count: 0, unitValue: it.value || 0, rarity: it.rarity || 'Common' };
                }
                grouped[key].count++;
                totalValue += (it.value || 0);
            }

            const lines = Object.entries(grouped).map(([name, data]) => {
                const totalItemVal = data.count * data.unitValue;
                return `• **${name}** x${data.count} — \`$${totalItemVal.toLocaleString()}\` *(${data.rarity})*`;
            });

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.ECONOMY)
                .setTitle(`🎒 ${target.username}'s Backpack (${inv.length} Items)`)
                .setDescription(lines.slice(0, 20).join('\n') + (lines.length > 20 ? `\n*...and ${lines.length - 20} more items*` : ''))
                .addFields(
                    { name: '💎 Total Market Value', value: `\`$${totalValue.toLocaleString()}\` credits`, inline: true },
                    { name: '💡 Cash Out', value: 'Type `,sell all` to sell everything instantly!', inline: true }
                )
                .setFooter({ text: 'Starry Inventory • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 20. SELL (Vender)
    {
        name: 'sell',
        aliases: ['vender'],
        category: 'Economy',
        description: 'Sell gathered fish and minerals from your inventory for cash.',
        usage: ',sell all / ,sell <item name>',
        async execute(ctx) {
            const doc = await getOrCreateEcoUser(ctx.user.id, ctx.guild.id);
            const inv = doc.inventory || [];

            if (inv.length === 0) {
                return ctx.reply('🎒 Your backpack is already empty! Go `,fish` or `,mine` first.');
            }

            const arg = ctx.args.join(' ').toLowerCase().trim();
            if (!arg || arg === 'all') {
                const totalGained = inv.reduce((acc, it) => acc + (it.value || 0), 0);
                const count = inv.length;
                doc.wallet += totalGained;
                doc.inventory = [];
                await doc.save();

                return ctx.reply(`💰 **Liquidated Entire Backpack!** Sold **${count}** items for **+$${totalGained.toLocaleString()}** credits!\nNew Wallet Balance: \`$${doc.wallet.toLocaleString()}\``);
            }

            const matchIndices = [];
            let totalGained = 0;
            for (let i = 0; i < inv.length; i++) {
                if (inv[i].name.toLowerCase().includes(arg)) {
                    matchIndices.push(i);
                    totalGained += (inv[i].value || 0);
                }
            }

            if (matchIndices.length === 0) {
                return ctx.reply(`❌ No items found matching **"${arg}"** in your backpack. View your items with \`,inv\`.`);
            }

            for (let j = matchIndices.length - 1; j >= 0; j--) {
                inv.splice(matchIndices[j], 1);
            }

            doc.wallet += totalGained;
            doc.inventory = inv;
            await doc.save();

            return ctx.reply(`💵 Sold **${matchIndices.length}x** matching item(s) for **+$${totalGained.toLocaleString()}** credits!\nNew Wallet Balance: \`$${doc.wallet.toLocaleString()}\``);
        }
    },

    // 21. MARRY
    {
        name: 'marry',
        aliases: ['casarse', 'propose'],
        category: 'Social',
        description: 'Propose marriage to another member with interactive buttons.',
        usage: ',marry <@user>',
        async execute(ctx) {
            const target = ctx.message?.mentions?.users?.first() || ctx.options?.getUser?.('user') || ctx.options?.getUser?.('target');
            if (!target) return ctx.reply('❌ Please mention someone to propose to: `,marry @user`');
            if (target.id === ctx.user.id) return ctx.reply('❌ You cannot marry yourself, silly! 💕');
            if (target.bot) return ctx.reply('❌ Bots cannot get married!');

            const guildId = ctx.guild?.id || ctx.guildId || 'GLOBAL';
            const authorDoc = await getOrCreateEcoUser(ctx.user.id, guildId);
            const authorMarriedTo = authorDoc.marriedTo || (await EcoUser.findOne({ userId: ctx.user.id, marriedTo: { $ne: null } }))?.marriedTo;
            if (authorMarriedTo) {
                return ctx.reply('❌ You are already married! You must `,divorce` before proposing to someone else.');
            }

            const targetDoc = await getOrCreateEcoUser(target.id, guildId);
            const targetMarriedTo = targetDoc.marriedTo || (await EcoUser.findOne({ userId: target.id, marriedTo: { $ne: null } }))?.marriedTo;
            if (targetMarriedTo) {
                return ctx.reply(`❌ **${target.username}** is already married to someone else!`);
            }

            const embed = new EmbedBuilder()
                .setColor('#FF94D2')
                .setTitle('💍 Marriage Proposal!')
                .setDescription(`💖 <@${target.id}>, **${ctx.user.username}** is kneeling before you with a starry promise ring!\n\n*“Will you marry me and journey through the cosmos together?”*\n\nDo you accept their hand in holy matrimony? ✨`)
                .setThumbnail('https://i.giphy.com/media/G3va31oEEnIkM/giphy.gif')
                .setFooter({ text: 'You have 60 seconds to decide! • Prefix: ,' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`marry_yes_${ctx.user.id}_${target.id}`)
                    .setLabel('💍 Accept Proposal')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`marry_no_${ctx.user.id}_${target.id}`)
                    .setLabel('💔 Decline')
                    .setStyle(ButtonStyle.Danger)
            );

            const msg = await ctx.reply({ content: `<@${target.id}>`, embeds: [embed], components: [row] });
            if (!msg) return;

            const filter = (i) => i.user.id === target.id;
            const collector = msg.createMessageComponentCollector({ filter, time: 60000, max: 1 });

            collector.on('collect', async (i) => {
                if (i.replied || i.deferred) return;
                if (i.customId.startsWith('marry_yes')) {
                    const now = new Date();
                    authorDoc.marriedTo = target.id;
                    authorDoc.marriedAt = now;
                    targetDoc.marriedTo = ctx.user.id;
                    targetDoc.marriedAt = now;
                    await authorDoc.save();
                    await targetDoc.save();

                    await EcoUser.updateMany({ userId: ctx.user.id }, { $set: { marriedTo: target.id, marriedAt: now } }).catch(() => {});
                    await EcoUser.updateMany({ userId: target.id }, { $set: { marriedTo: ctx.user.id, marriedAt: now } }).catch(() => {});

                    const { getAnimeAttachment, getRandomKissGif } = require('../../utils/animeGifs');
                    const anim = getAnimeAttachment('kiss');
                    const unixTime = Math.floor(now.getTime() / 1000);

                    const acceptedEmbed = new EmbedBuilder()
                        .setColor('#FF69B4')
                        .setTitle('💍💖 JUST MARRIED! 💖💍')
                        .setDescription(
                            `✨ **<@${ctx.user.id}>** & **<@${target.id}>** have officially tied the knot! ✨\n\n` +
                            `*“Two souls bound by love across the infinite cosmos. May your journey through the stars be filled with eternal romance, joy, and warmth!”* 🌌🥂\n\n` +
                            `💍 **Spouses:** <@${ctx.user.id}> ❤️ <@${target.id}>\n` +
                            `📅 **Matrimony Date:** <t:${unixTime}:D> (<t:${unixTime}:R>)\n` +
                            `💫 **Status:** Official & Blessed in Starry Matrimony\n\n` +
                            `*Sealed with a passionate kiss!* 💕`
                        )
                        .setImage(anim ? anim.attachmentUrl : getRandomKissGif())
                        .setFooter({ text: 'Starry Matrimony Suite • Check with /profile or ,profile' })
                        .setTimestamp(now);

                    const updatePayload = { embeds: [acceptedEmbed], components: [] };
                    if (anim) updatePayload.files = [anim.attachment];
                    await i.update(updatePayload).catch(() => {});
                } else {
                    const { getAnimeAttachment, getRandomSlapGif } = require('../../utils/animeGifs');
                    const anim = getAnimeAttachment('slap');

                    const declinedEmbed = new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('💔 OUCH! PROPOSAL REJECTED! ✋💥')
                        .setDescription(
                            `💥 **<@${target.id}>** delivered a thunderous slap and rejected **<@${ctx.user.id}>**'s proposal!\n\n` +
                            `*“Oof! That's gotta leave a mark... Not today, starry lover! Better luck next time!”* 🥀💔\n\n` +
                            `💔 **Declined By:** <@${target.id}>\n` +
                            `🩹 **Condition:** Emotional Damage (Critical Hit)\n\n` +
                            `✨ *Don't worry <@${ctx.user.id}>, there are billions of other shining stars in the cosmos!*`
                        )
                        .setImage(anim ? anim.attachmentUrl : getRandomSlapGif())
                        .setFooter({ text: 'Starry Matrimony Suite • Proposal Declined' })
                        .setTimestamp();

                    const updatePayload = { embeds: [declinedEmbed], components: [] };
                    if (anim) updatePayload.files = [anim.attachment];
                    await i.update(updatePayload).catch(() => {});
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await msg.edit({ content: '⌛ *The marriage proposal timed out.*', components: [] }).catch(() => {});
                }
            });
        }
    },

    // 22. DIVORCE
    {
        name: 'divorce',
        aliases: ['divorcio'],
        category: 'Social',
        description: 'End your current marriage.',
        usage: ',divorce',
        async execute(ctx) {
            const guildId = ctx.guild?.id || ctx.guildId || 'GLOBAL';
            const authorDoc = await getOrCreateEcoUser(ctx.user.id, guildId);
            let exPartnerId = authorDoc.marriedTo;
            if (!exPartnerId) {
                const anyDoc = await EcoUser.findOne({ userId: ctx.user.id, marriedTo: { $ne: null } });
                exPartnerId = anyDoc?.marriedTo;
            }

            if (!exPartnerId) {
                return ctx.reply('❌ You are not married to anyone! Use `,marry @user` to find love.');
            }

            authorDoc.marriedTo = null;
            authorDoc.marriedAt = null;
            await authorDoc.save();

            await EcoUser.updateMany({ userId: ctx.user.id }, { $set: { marriedTo: null, marriedAt: null } }).catch(() => {});
            await EcoUser.updateMany({ userId: exPartnerId }, { $set: { marriedTo: null, marriedAt: null } }).catch(() => {});

            const { getAnimeAttachment } = require('../../utils/animeGifs');
            const anim = getAnimeAttachment('divorce');

            const embed = new EmbedBuilder()
                .setColor('#95A5A6')
                .setTitle('💔 Divorce Finalized')
                .setDescription(`🥀 **<@${ctx.user.id}>** has officially divorced **<@${exPartnerId}>**.\n\n*The rings have been returned, and paths have diverged across the stars.* Both are now single.`)
                .setImage(anim ? anim.attachmentUrl : 'https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif')
                .setFooter({ text: 'Starry Matrimony Suite • Divorce Finalized' })
                .setTimestamp();

            const replyPayload = { embeds: [embed] };
            if (anim) replyPayload.files = [anim.attachment];
            return ctx.reply(replyPayload);
        }
    },

    // 23. SHIP (Love Matchmaker)
    {
        name: 'ship',
        aliases: ['match', 'lovecalc', 'pareja'],
        category: 'Social',
        description: 'Calculate love compatibility between two members.',
        usage: ',ship <@user1> [@user2]',
        async execute(ctx) {
            let u1 = ctx.user;
            let u2 = null;

            const mentions = ctx.message?.mentions?.users;
            if (mentions && mentions.size >= 2) {
                const arr = Array.from(mentions.values());
                u1 = arr[0];
                u2 = arr[1];
            } else if (mentions && mentions.size === 1) {
                u2 = mentions.first();
            } else if (ctx.args.length >= 1) {
                u2 = ctx.message?.mentions?.users?.first() || null;
            }

            if (!u2) {
                return ctx.reply('❌ Please mention someone to calculate compatibility: `,ship @user` or `,ship @user1 @user2`');
            }

            if (u1.id === u2.id) {
                return ctx.reply('💖 **100%** | Self-love is the greatest love of all! ✨');
            }

            const now = new Date();
            const daySeed = now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
            const sumIds = BigInt(u1.id) + BigInt(u2.id) + BigInt(daySeed);
            const score = Number(sumIds % 101n);

            const filled = Math.round(score / 10);
            const bar = '❤️'.repeat(filled) + '🤍'.repeat(10 - filled);

            let comment = '';
            if (score >= 90) comment = '💖 **Destiny Awaits!** An absolute soulmate match written across the starry constellations! ✨';
            else if (score >= 75) comment = '💕 **High Chemistry!** Butterflies, warm smiles, and pure romance in the air! 🌸';
            else if (score >= 50) comment = '✨ **Great Potential!** A sparkling connection with plenty of room to grow! 💫';
            else if (score >= 30) comment = '🌱 **Casual Friends!** Good companions for hanging out, maybe besties! ☕';
            else comment = '⚡ **Anime Rivals!** Classic tsundere energy! Always arguing but secretly watching out! 💥';

            const embed = new EmbedBuilder()
                .setColor(score >= 50 ? '#FF69B4' : '#95A5A6')
                .setTitle(`💘 Love Affinity: ${u1.username} & ${u2.username}`)
                .setDescription(`**Compatibility Score:** \`${score}%\`\n${bar}\n\n${comment}`)
                .setThumbnail('https://media.giphy.com/media/nyGFcsP0kAobm/giphy.gif')
                .setFooter({ text: 'Starry Love Matchmaker • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 24. PROFILE
    {
        name: 'profile',
        aliases: ['perfil', 'userinfo-eco', 'p'],
        category: 'Economy',
        description: 'View your complete anime profile card, marriage, wealth, and pet.',
        usage: ',profile [@user]',
        async execute(ctx) {
            const target = ctx.message?.mentions?.users?.first() || ctx.options?.getUser?.('user') || ctx.user;
            const doc = await getOrCreateEcoUser(target.id, ctx.guild.id);
            const neededXp = doc.level * 100;
            const netWorth = (doc.wallet || 0) + (doc.bank || 0);

            let repCount = 0;
            try {
                let UserRep = mongoose.models.UserRep;
                if (!UserRep) {
                    const repMod = require('../../modules/rep');
                    UserRep = repMod.UserRep || mongoose.models.UserRep;
                }
                if (UserRep) {
                    const repDoc = await UserRep.findOne({ guildId: ctx.guild.id, userId: target.id });
                    if (repDoc) repCount = repDoc.reputation || 0;
                }
            } catch (e) {}

            let profileThemeColor = '#FF79C6';
            let colorGradientField = null;
            try {
                const ColorRole = mongoose.models.ColorRole || require('../../models/ColorRole');
                const colorDoc = await ColorRole.findOne({ guildId: ctx.guild.id, userId: target.id });
                if (colorDoc && colorDoc.active) {
                    profileThemeColor = colorDoc.primaryColor || colorDoc.blendedColor || '#FF79C6';
                    const hasGrad = Boolean(colorDoc.secondaryColor);
                    const modeDesc = colorDoc.applyMode === 'profile' ? 'Server Profile' : 'Role';
                    const gradText = hasGrad 
                        ? `\`${colorDoc.primaryColor}\` ➔ \`${colorDoc.secondaryColor}\`${colorDoc.presetName ? ` (${colorDoc.presetName})` : ''}`
                        : `\`${colorDoc.primaryColor}\``;
                    colorGradientField = {
                        name: '🎨 Discord Name Gradient',
                        value: `${gradText} *(${modeDesc})*`,
                        inline: true
                    };
                }
            } catch (e) {}

            let marriageStr = '💔 *Single* (Use `,marry @user`)';
            if (doc.marriedTo) {
                const partnerUser = await ctx.client.users.fetch(doc.marriedTo).catch(() => null);
                const partnerName = partnerUser ? partnerUser.username : doc.marriedTo;
                const timeAgo = doc.marriedAt ? `<t:${Math.floor(new Date(doc.marriedAt).getTime() / 1000)}:R>` : 'recently';
                marriageStr = `💍 Married to **${partnerName}** (${timeAgo}) 💖`;
            }

            let petStr = '🐾 *No pet adopted* (Use `,pet adopt`)';
            if (doc.pet && doc.pet.name) {
                petStr = `🐾 **${doc.pet.name}** (${doc.pet.species || 'Companion'}) • Lv. ${doc.pet.level || 1} • Mood: ${doc.pet.happiness || 100}%`;
            }

            const invCount = (doc.inventory || []).length;
            const invValue = (doc.inventory || []).reduce((acc, it) => acc + (it.value || 0), 0);

            const pct = Math.min(100, Math.round(((doc.xp || 0) / neededXp) * 100));
            const filled = Math.round(pct / 10);
            const progressBar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);

            const fields = [
                { name: '💍 Matrimony', value: marriageStr, inline: false },
                { 
                    name: '💰 Financial Status', 
                    value: `💵 **Wallet:** \`$${(doc.wallet || 0).toLocaleString()}\`\n🏦 **Bank:** \`$${(doc.bank || 0).toLocaleString()}\`\n💎 **Net Worth:** \`$${netWorth.toLocaleString()}\``, 
                    inline: true 
                },
                { 
                    name: '👑 Progression & Rep', 
                    value: `🌟 **Level:** \`${doc.level}\` (\`${doc.xp || 0}/${neededXp} XP\`)\n\`${progressBar}\` **${pct}%**\n⭐ **Reputation:** \`${repCount} Rep\``, 
                    inline: true 
                }
            ];

            if (colorGradientField) {
                fields.push(colorGradientField);
            }

            fields.push(
                { name: '🐾 Faithful Companion', value: petStr, inline: false },
                { 
                    name: '🎒 Backpack & Items', 
                    value: `📦 **${invCount} items** stored (Estimated: \`$${invValue.toLocaleString()}\`)\n*Use \`,inv\` to open backpack or \`,sell all\` to liquidate.*`, 
                    inline: false 
                }
            );

            const embed = new EmbedBuilder()
                .setColor(profileThemeColor)
                .setAuthor({ 
                    name: `${target.username}'s Anime Profile`, 
                    iconURL: target.displayAvatarURL({ dynamic: true }) 
                })
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
                .setDescription(`> *"${doc.bio || 'Living the starlight dream ✨'}"*`)
                .addFields(fields)
                .setFooter({ text: 'Starry Profile Engine • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 25. SETBIO
    {
        name: 'setbio',
        category: 'Economy',
        description: 'Customize the bio shown on your profile card.',
        usage: ',setbio <your custom bio text>',
        async execute(ctx) {
            const text = ctx.args.join(' ').trim();
            if (!text) return ctx.reply('❌ Usage: `,setbio Your custom bio here`');
            if (text.length > 120) return ctx.reply('❌ Bio must be 120 characters or fewer.');

            const doc = await getOrCreateEcoUser(ctx.user.id, ctx.guild.id);
            doc.bio = text;
            await doc.save();

            return ctx.reply(`✨ **Bio Updated!** Your new profile bio is:\n> *"${text}"*`);
        }
    },

    // 26. PET (Mascotas)
    {
        name: 'pet',
        aliases: ['mascota', 'pets'],
        category: 'Economy',
        description: 'Adopt, feed, play with, and manage your companion pet.',
        usage: ',pet [adopt <species> <name>]',
        async execute(ctx) {
            const doc = await getOrCreateEcoUser(ctx.user.id, ctx.guild.id);
            const sub = ctx.args[0]?.toLowerCase();

            const SPECIES_AVAILABLE = {
                cat: { name: 'Starry Neko', emoji: '🐱', image: 'https://media.giphy.com/media/108M7gCS1JSoO4/giphy.gif', desc: 'Agile starlight feline with high luck.' },
                dog: { name: 'Shiba Inu', emoji: '🐶', image: 'https://media.giphy.com/media/b5L1Lt3k4hG4U/giphy.gif', desc: 'Loyal companion who guards your wallet.' },
                fox: { name: 'Celestial Fox', emoji: '🦊', image: 'https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif', desc: 'Mystical kitsune with cosmic charms.' },
                dragon: { name: 'Starlight Dragon', emoji: '🐉', image: 'https://media.giphy.com/media/lrr9rHuoJOE0w/giphy.gif', desc: 'Legendary beast of the ancient nebula.' },
                bunny: { name: 'Lunar Bunny', emoji: '🐰', image: 'https://media.giphy.com/media/ye7OTQgwmVuNTYSS07/giphy.gif', desc: 'Playful moon rabbit that loves berries.' }
            };

            if (sub === 'adopt') {
                const speciesChoice = ctx.args[1]?.toLowerCase();
                const petName = ctx.args.slice(2).join(' ') || (speciesChoice ? SPECIES_AVAILABLE[speciesChoice]?.name : 'Buddy');

                if (!speciesChoice || !SPECIES_AVAILABLE[speciesChoice]) {
                    const list = Object.entries(SPECIES_AVAILABLE).map(([k, v]) => `• \`${k}\` — ${v.emoji} **${v.name}**: *${v.desc}*`).join('\n');
                    return ctx.reply(`🐾 **Pet Adoption Center**\nAdopt your personal companion!\n*Usage: \`,pet adopt <species> <custom name>\`*\n\n**Available Species:**\n${list}`);
                }

                if (doc.wallet < 200) {
                    return ctx.reply('❌ Adoption fee is **$200** credits. You need a little more cash in your wallet!');
                }

                doc.wallet -= 200;
                doc.pet = {
                    name: petName,
                    species: SPECIES_AVAILABLE[speciesChoice].name,
                    level: 1,
                    xp: 0,
                    hunger: 100,
                    happiness: 100
                };
                await doc.save();

                const embed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle(`🎉 Adopted ${SPECIES_AVAILABLE[speciesChoice].emoji} ${petName}!`)
                    .setDescription(`Welcome **${petName}** the **${SPECIES_AVAILABLE[speciesChoice].name}** to your family!\n\nTake good care of them! You can feed and play with them anytime.`)
                    .setImage(SPECIES_AVAILABLE[speciesChoice].image)
                    .setFooter({ text: 'Starry Pet Engine • Prefix: ,' })
                    .setTimestamp();

                return ctx.reply({ embeds: [embed] });
            }

            if (!doc.pet || !doc.pet.name) {
                const list = Object.entries(SPECIES_AVAILABLE).map(([k, v]) => `• \`${k}\` — ${v.emoji} **${v.name}**`).join('\n');
                return ctx.reply(`🐾 **You don't have a pet yet!**\nAdopt one for **$200** credits:\n\`,pet adopt <species> <name>\`\n\n**Species:**\n${list}`);
            }

            if (sub === 'feed') {
                if (doc.wallet < 30) return ctx.reply('❌ Pet food costs **$30** credits.');
                doc.wallet -= 30;
                doc.pet.hunger = 100;
                doc.pet.happiness = Math.min(100, (doc.pet.happiness || 50) + 15);
                doc.pet.xp = (doc.pet.xp || 0) + 10;
                if (doc.pet.xp >= doc.pet.level * 50) {
                    doc.pet.level += 1;
                    doc.pet.xp = 0;
                }
                await doc.save();
                return ctx.reply(`🍖 You fed **${doc.pet.name}** delicious treats! Hunger restored to 100% and gained +10 Pet XP!`);
            }

            if (sub === 'play') {
                doc.pet.happiness = 100;
                doc.pet.hunger = Math.max(0, (doc.pet.hunger || 100) - 15);
                doc.pet.xp = (doc.pet.xp || 0) + 15;
                if (doc.pet.xp >= doc.pet.level * 50) {
                    doc.pet.level += 1;
                    doc.pet.xp = 0;
                }
                await doc.save();
                return ctx.reply(`🎾 You played fetch with **${doc.pet.name}**! Mood is now 100%! (+15 Pet XP)`);
            }

            const hungerBar = '🍗'.repeat(Math.ceil((doc.pet.hunger || 100) / 20)) + '▫️'.repeat(Math.max(0, 5 - Math.ceil((doc.pet.hunger || 100) / 20)));
            const moodBar = '💖'.repeat(Math.ceil((doc.pet.happiness || 100) / 20)) + '▫️'.repeat(Math.max(0, 5 - Math.ceil((doc.pet.happiness || 100) / 20)));

            const embed = new EmbedBuilder()
                .setColor('#FF94D2')
                .setTitle(`🐾 ${doc.pet.name} — ${doc.pet.species}`)
                .setDescription(`Your loyal companion is happily following you!`)
                .addFields(
                    { name: '🌟 Level', value: `\`Level ${doc.pet.level || 1}\` (\`${doc.pet.xp || 0}/${(doc.pet.level || 1) * 50} XP\`)`, inline: true },
                    { name: '🍖 Hunger', value: `${hungerBar} **${doc.pet.hunger || 100}%**`, inline: true },
                    { name: '💖 Happiness', value: `${moodBar} **${doc.pet.happiness || 100}%**`, inline: true }
                )
                .setFooter({ text: 'Commands: ,pet feed | ,pet play • Prefix: ,' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('pet_feed_btn').setLabel('Feed ($30)').setStyle(ButtonStyle.Success).setEmoji('🍖'),
                new ButtonBuilder().setCustomId('pet_play_btn').setLabel('Play').setStyle(ButtonStyle.Primary).setEmoji('🎾')
            );

            const petMsg = await ctx.reply({ embeds: [embed], components: [row] });
            if (!petMsg) return;

            const collector = petMsg.createMessageComponentCollector({ time: 60000 });
            collector.on('collect', async (i) => {
                if (i.user.id !== ctx.user.id) {
                    return i.reply({ content: '❌ This is not your pet!', ephemeral: true });
                }
                if (i.customId === 'pet_feed_btn') {
                    if (doc.wallet < 30) return i.reply({ content: '❌ Pet food costs $30 credits.', ephemeral: true });
                    doc.wallet -= 30;
                    doc.pet.hunger = 100;
                    doc.pet.happiness = Math.min(100, (doc.pet.happiness || 50) + 15);
                    await doc.save();
                    return i.reply({ content: `🍖 You fed **${doc.pet.name}**!`, ephemeral: true });
                } else if (i.customId === 'pet_play_btn') {
                    doc.pet.happiness = 100;
                    doc.pet.hunger = Math.max(0, (doc.pet.hunger || 100) - 15);
                    await doc.save();
                    return i.reply({ content: `🎾 You played with **${doc.pet.name}**!`, ephemeral: true });
                }
            });
        }
    },

    // 27. ANIME (AniList Search)
    {
        name: 'anime',
        aliases: ['searchanime', 'mal'],
        category: 'Utility',
        description: 'Search for anime series, ratings, episodes, and synopses via AniList.',
        usage: ',anime <title>',
        async execute(ctx) {
            const query = ctx.args.join(' ').trim();
            if (!query) return ctx.reply('❌ Please specify an anime title to search: `,anime Attack on Titan`');

            const graphqlQuery = `
            query ($search: String) {
                Media (search: $search, type: ANIME) {
                    id
                    title { romaji english native }
                    description(asHtml: false)
                    status
                    episodes
                    averageScore
                    genres
                    coverImage { large }
                    bannerImage
                    siteUrl
                }
            }`;

            try {
                const res = await fetch("https://graphql.anilist.co", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Accept": "application/json" },
                    body: JSON.stringify({ query: graphqlQuery, variables: { search: query } })
                });

                const data = await res.json();
                const media = data.data?.Media;

                if (!media) {
                    return ctx.reply(`❌ No anime found matching **"${query}"** on AniList.`);
                }

                const title = media.title.english || media.title.romaji || media.title.native;
                let desc = media.description || 'No synopsis available.';
                desc = desc.replace(/<[^>]*>?/gm, '');
                if (desc.length > 500) desc = desc.slice(0, 497) + '...';

                const embed = new EmbedBuilder()
                    .setColor('#02A9FF')
                    .setTitle(`📺 ${title}`)
                    .setURL(media.siteUrl || `https://anilist.co/anime/${media.id}`)
                    .setDescription(desc)
                    .addFields(
                        { name: '⭐ Score', value: media.averageScore ? `\`${media.averageScore}%\`` : 'N/A', inline: true },
                        { name: '🎬 Episodes', value: media.episodes ? `\`${media.episodes} eps\`` : 'Ongoing / Unknown', inline: true },
                        { name: '📡 Status', value: `\`${media.status || 'Unknown'}\``, inline: true },
                        { name: '🏷️ Genres', value: media.genres && media.genres.length > 0 ? media.genres.slice(0, 5).join(', ') : 'None', inline: false }
                    );

                if (media.coverImage?.large) {
                    embed.setThumbnail(media.coverImage.large);
                }
                if (media.bannerImage) {
                    embed.setImage(media.bannerImage);
                }

                embed.setFooter({ text: 'AniList GraphQL Engine • Prefix: ,' })
                    .setTimestamp();

                return ctx.reply({ embeds: [embed] });
            } catch (err) {
                return ctx.reply('❌ Failed to fetch anime data from AniList. Please try again in a few moments.');
            }
        }
    },

    // 17. BEG
    {
        name: 'beg',
        category: 'Economy',
        description: 'Beg traveling cosmic entities for some spare stardust credits.',
        usage: ',beg',
        async execute(ctx) {
            const guildId = ctx.guild?.id || 'GLOBAL';
            const user = await getOrCreateEcoUser(ctx.user.id, guildId);

            const now = Date.now();
            const cooldown = 45000; // 45s cooldown
            if (!global.begCooldowns) global.begCooldowns = new Map();
            const lastBeg = global.begCooldowns.get(ctx.user.id) || 0;

            if (now - lastBeg < cooldown) {
                const rem = Math.ceil((cooldown - (now - lastBeg)) / 1000);
                return ctx.reply(`⏳ You are begging too fast! Give your voice a break for **${rem}s**!`);
            }
            global.begCooldowns.set(ctx.user.id, now);

            const success = Math.random() < 0.72;
            if (success) {
                const amount = Math.floor(Math.random() * 120) + 25;
                user.wallet += amount;
                await user.save();

                const donors = [
                    'A wandering Stargazer took pity on you and tossed **+$' + amount + '** stardust credits! ✨',
                    'An Interstellar Courier was feeling generous and gifted you **+$' + amount + '** credits! 🚀',
                    'A smiling Celestial Maiden dropped **+$' + amount + '** starlight coins into your hands! 🌟',
                    'A friendly alien traveler shared **+$' + amount + '** cosmic stardust with you! 🛸',
                    'Starry-chan patted your head and handed you **+$' + amount + '** star candies! 🍬'
                ];
                const text = donors[Math.floor(Math.random() * donors.length)];
                return ctx.reply(text);
            } else {
                const rejections = [
                    'A grumpy Space Goblin glared at you: *"Go mine some asteroids yourself!"*',
                    'An Astral Merchant laughed in your face and sped away in their starship!',
                    'You held out your hands, but only a gust of cosmic space dust blew by... 🍃',
                    'A strict Interstellar Patrol officer told you to move along!',
                    'Nobody noticed you in the vastness of the digital galaxy.'
                ];
                const text = rejections[Math.floor(Math.random() * rejections.length)];
                return ctx.reply(text);
            }
        }
    },

    // 18. SEARCH / SCAVENGE
    {
        name: 'search',
        aliases: ['scavenge', 'explore'],
        category: 'Economy',
        description: 'Scavenge cosmic locations to find stardust, gems, and mystery crates.',
        usage: ',search',
        async execute(ctx) {
            const guildId = ctx.guild?.id || 'GLOBAL';
            const user = await getOrCreateEcoUser(ctx.user.id, guildId);

            const now = Date.now();
            const cooldown = 60000; // 60s cooldown
            if (!global.searchCooldowns) global.searchCooldowns = new Map();
            const lastSearch = global.searchCooldowns.get(ctx.user.id) || 0;

            if (now - lastSearch < cooldown) {
                const rem = Math.ceil((cooldown - (now - lastSearch)) / 1000);
                return ctx.reply(`⏳ Your scanner is recharging! Please wait **${rem}s** before searching again.`);
            }

            const locations = [
                { name: '🌌 Orion Nebula', icon: '🌌', min: 80, max: 280 },
                { name: '🛸 Derelict Satellite', icon: '🛸', min: 100, max: 350 },
                { name: '🪐 Moon Crater', icon: '🪐', min: 60, max: 220 },
                { name: '☄️ Asteroid Belt', icon: '☄️', min: 90, max: 310 },
                { name: '📦 Space Station Locker', icon: '📦', min: 70, max: 250 }
            ];

            // Pick 3 random locations
            const shuffled = locations.sort(() => 0.5 - Math.random()).slice(0, 3);

            const row = new ActionRowBuilder();
            shuffled.forEach((loc, idx) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`search_${idx}`)
                        .setLabel(loc.name)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(loc.icon)
                );
            });

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle('🔭 Where would you like to search?')
                .setDescription('Select a celestial location from the buttons below to scavenge for lost cosmic treasures!\n*You have **25 seconds** to make your choice.*')
                .setFooter({ text: 'Starry Scavenger Engine' });

            const msg = await ctx.reply({ embeds: [embed], components: [row] });

            const collector = msg.createMessageComponentCollector({
                filter: (i) => i.user.id === ctx.user.id,
                time: 25000,
                max: 1
            });

            collector.on('collect', async (i) => {
                global.searchCooldowns.set(ctx.user.id, Date.now());
                const choiceIdx = parseInt(i.customId.replace('search_', ''), 10);
                const chosen = shuffled[choiceIdx] || shuffled[0];

                const foundAmount = Math.floor(Math.random() * (chosen.max - chosen.min + 1)) + chosen.min;
                user.wallet += foundAmount;

                let bonusItem = null;
                if (Math.random() < 0.25) {
                    bonusItem = '📦 Cosmic Mystery Crate';
                    if (!user.inventory) user.inventory = [];
                    user.inventory.push(bonusItem);
                }
                await user.save();

                let desc = `You explored **${chosen.name}** and recovered **+$${foundAmount.toLocaleString()}** stardust credits! ✨`;
                if (bonusItem) {
                    desc += `\n\n🎉 **RARE DROP!** You also discovered a **${bonusItem}**! Open it with \`,open\`!`;
                }

                const resultEmbed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.SUCCESS)
                    .setTitle(`✨ Scavenge Successful: ${chosen.name}`)
                    .setDescription(desc)
                    .setTimestamp();

                return i.update({ embeds: [resultEmbed], components: [] });
            });
        }
    },

    // 19. CRIME / HEIST
    {
        name: 'crime',
        aliases: ['heist', 'robbery'],
        category: 'Economy',
        description: 'Attempt a high-stakes planetary heist for massive stardust rewards (or a heavy fine!).',
        usage: ',crime',
        async execute(ctx) {
            const guildId = ctx.guild?.id || 'GLOBAL';
            const user = await getOrCreateEcoUser(ctx.user.id, guildId);

            const now = Date.now();
            const cooldown = 300000; // 5m cooldown
            if (!global.crimeCooldowns) global.crimeCooldowns = new Map();
            const lastCrime = global.crimeCooldowns.get(ctx.user.id) || 0;

            if (now - lastCrime < cooldown) {
                const remMins = Math.ceil((cooldown - (now - lastCrime)) / 60000);
                return ctx.reply(`🚨 The Interstellar Police are monitoring you! Lie low for **${remMins} more minutes**.`);
            }
            global.crimeCooldowns.set(ctx.user.id, now);

            const success = Math.random() < 0.58;
            if (success) {
                const loot = Math.floor(Math.random() * 700) + 300;
                user.wallet += loot;
                await user.save();

                const scenarios = [
                    `You successfully hacked into an automated Galactic Vault and bypassed the firewalls, escaping with **+$${loot.toLocaleString()}** credits! 💻💸`,
                    `You hijacked an illicit asteroid smuggling freighter and unloaded **+$${loot.toLocaleString()}** worth of raw stardust! 🏴‍☠️`,
                    `You pickpocketed a corrupt planetary governor during a lavish space gala, securing **+$${loot.toLocaleString()}** credits! 🥂✨`
                ];
                const text = scenarios[Math.floor(Math.random() * scenarios.length)];

                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.SUCCESS)
                    .setTitle('🦹 Planetary Heist Succeeded!')
                    .setDescription(text)
                    .setFooter({ text: 'Starry Risk & Reward • Prefix: ,' })
                    .setTimestamp();

                return ctx.reply({ embeds: [embed] });
            } else {
                const fine = Math.floor(Math.random() * 350) + 150;
                user.wallet = Math.max(0, user.wallet - fine);
                await user.save();

                const fails = [
                    `You tripped the silent alarm on the orbital bank! The Starry Security Force captured you and fined you **-$${fine.toLocaleString()}** credits! 🚔`,
                    `Your getaway ship engine stalled at lightspeed! You were impounded and had to pay **-$${fine.toLocaleString()}** in bail! 🚀💥`,
                    `A security android spotted you on surveillance and confiscated **-$${fine.toLocaleString()}** credits! 🤖🚨`
                ];
                const text = fails[Math.floor(Math.random() * fails.length)];

                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.DANGER)
                    .setTitle('🚨 Busted by Interstellar Patrol!')
                    .setDescription(text)
                    .setFooter({ text: 'Starry Risk & Reward • Prefix: ,' })
                    .setTimestamp();

                return ctx.reply({ embeds: [embed] });
            }
        }
    },

    // 20. CRATE / OPEN
    {
        name: 'open',
        aliases: ['crate', 'unbox'],
        category: 'Economy',
        description: 'Unbox a Cosmic Mystery Crate from your inventory for rare rewards.',
        usage: ',open',
        async execute(ctx) {
            const guildId = ctx.guild?.id || 'GLOBAL';
            const user = await getOrCreateEcoUser(ctx.user.id, guildId);

            const crateName = '📦 Cosmic Mystery Crate';
            const crateIndex = user.inventory ? user.inventory.indexOf(crateName) : -1;

            if (crateIndex === -1) {
                return ctx.reply(`❌ You don't have any **${crateName}** in your inventory! Find them while exploring (\`,search\`) or fishing/mining!`);
            }

            // Remove 1 crate
            user.inventory.splice(crateIndex, 1);

            const unboxEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setAuthor({ name: `${ctx.user.username}'s Unboxing`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setTitle('📦 Opening Cosmic Mystery Crate...')
                .setDescription('✨ *Unlocking ancient celestial seals...* 🗝️')
                .setFooter({ text: 'Revealing mystery rewards...' });

            const msg = await ctx.reply({ embeds: [unboxEmbed] });

            await new Promise(res => setTimeout(res, 1200));

            const rewardRoll = Math.random();
            let prizeDesc = '';
            let prizeColor = config.EMBED_COLORS.PRIMARY;

            if (rewardRoll < 0.50) {
                // Stardust Payout
                const credits = Math.floor(Math.random() * 800) + 400;
                user.wallet += credits;
                prizeDesc = `💵 **Abundant Stardust!** You unlocked **+$${credits.toLocaleString()}** credits! ✨`;
                prizeColor = config.EMBED_COLORS.SUCCESS;
            } else if (rewardRoll < 0.85) {
                // Rare Celestial Gem
                const gem = '💎 Astral Nebula Gem';
                user.inventory.push(gem);
                const bonusCash = 600;
                user.wallet += bonusCash;
                prizeDesc = `💎 **RARE GEMSTONE!** You discovered a **${gem}** and **+$${bonusCash}** credits! 🌟`;
                prizeColor = '#9B59B6';
            } else {
                // JACKPOT
                const jackpotCash = Math.floor(Math.random() * 2500) + 1500;
                user.wallet += jackpotCash;
                const petTreat = '🧁 Celestial Star Cookie';
                user.inventory.push(petTreat);
                prizeDesc = `👑 **COSMIC JACKPOT!** You unboxed an ancient relic containing **+$${jackpotCash.toLocaleString()}** credits and a **${petTreat}**! 🌠✨`;
                prizeColor = '#FFD700';
            }

            await user.save();

            const finalEmbed = new EmbedBuilder()
                .setColor(prizeColor)
                .setAuthor({ name: `${ctx.user.username}'s Unboxing`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setTitle('📦 Cosmic Mystery Crate Opened!')
                .setDescription(prizeDesc)
                .setFooter({ text: `Remaining Crates: ${user.inventory.filter(i => i === crateName).length}` })
                .setTimestamp();

            if (msg && typeof msg.edit === 'function') {
                return await msg.edit({ embeds: [finalEmbed] }).catch(() => {});
            } else {
                return await ctx.editReply({ embeds: [finalEmbed] }).catch(() => {});
            }
        }
    },

    // 21. PASSPORT
    {
        name: 'passport',
        aliases: ['starlightpassport', 'userpassport', 'pass'],
        category: 'Economy',
        description: 'View your complete personal Starlight Passport, badges, economy rank, and companion.',
        usage: ',passport [@user]',
        async execute(ctx) {
            const target = ctx.message?.mentions?.users?.first() || ctx.user;
            const guildId = ctx.guild?.id || 'GLOBAL';
            const user = await getOrCreateEcoUser(target.id, guildId);

            let profileThemeColor = config.EMBED_COLORS.PRIMARY;
            let colorGradientField = null;
            try {
                const ColorRole = mongoose.models.ColorRole || require('../../models/ColorRole');
                const colorDoc = await ColorRole.findOne({ guildId: ctx.guild?.id, userId: target.id });
                if (colorDoc && colorDoc.active) {
                    profileThemeColor = colorDoc.primaryColor || colorDoc.blendedColor || config.EMBED_COLORS.PRIMARY;
                    const hasGrad = Boolean(colorDoc.secondaryColor);
                    const modeDesc = colorDoc.applyMode === 'profile' ? 'Server Profile' : 'Role';
                    const gradText = hasGrad 
                        ? `\`${colorDoc.primaryColor}\` ➔ \`${colorDoc.secondaryColor}\`${colorDoc.presetName ? ` (${colorDoc.presetName})` : ''}`
                        : `\`${colorDoc.primaryColor}\``;
                    colorGradientField = {
                        name: '🎨 Discord Name Gradient',
                        value: `${gradText} *(${modeDesc})*`,
                        inline: true
                    };
                }
            } catch (e) {}

            const spouseText = user.marriedTo ? `<@${user.marriedTo}>` : 'Single';
            const petText = user.pet?.name ? `${user.pet.name} (${user.pet.species || 'Companion'}, Lvl ${user.pet.level || 1})` : 'No companion yet';
            const netWorth = (user.wallet || 0) + (user.bank || 0);

            const fields = [
                { name: '👑 Level & Rank', value: `\`Level ${user.level || 1}\` (${user.xp || 0} XP)`, inline: true },
                { name: '💎 Net Worth', value: `\`$${netWorth.toLocaleString()}\``, inline: true },
                { name: '💵 Wallet', value: `\`$${(user.wallet || 0).toLocaleString()}\``, inline: true },
                { name: '🏦 Bank', value: `\`$${(user.bank || 0).toLocaleString()}\``, inline: true },
                { name: '💍 Marital Status', value: spouseText, inline: true },
                { name: '🐾 Active Pet', value: petText, inline: true }
            ];

            if (colorGradientField) {
                fields.push(colorGradientField);
            }

            fields.push(
                { name: '🎒 Inventory', value: `${user.inventory?.length || 0} items (\`,inventory\`)`, inline: true }
            );

            const embed = new EmbedBuilder()
                .setColor(profileThemeColor)
                .setAuthor({ name: `${target.username}'s Starlight Passport`, iconURL: target.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
                .setDescription(`*“${user.bio || 'Living the starlight dream ✨'}”*`)
                .addFields(fields)
                .setFooter({ text: 'Starry Passport Engine • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    }
];

module.exports = commands;

