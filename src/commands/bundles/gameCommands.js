// ==========================================
// 🎮 STARRY CELESTIAL ARCADE & GAMING SUITE (11 COMMANDS)
// File Path: src/commands/bundles/gameCommands.js
// 100% Original Celestial & Starlight Aesthetic
// Interactive Blackjack, Minesweeper, Trivia, Wordle, RPS, Tic-Tac-Toe, Coinflip & Wheel
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ComponentType 
} = require('discord.js');
const mongoose = require('mongoose');
const config = require('../../config');
const { ONE_YEAR_MS } = require('../../utils/contextHelper');
const { localizePayload } = require('../../utils/i18n');

// Helper to get or modify user's wallet
async function getEcoUser(userId, guildId = 'GLOBAL') {
    const EcoUser = mongoose.models.EcoUser;
    if (!EcoUser) return null;
    let doc = await EcoUser.findOne({ userId, guildId });
    if (!doc) {
        doc = await EcoUser.create({ userId, guildId, wallet: 250, bank: 0 });
    }
    return doc;
}

async function adjustWallet(userId, guildId = 'GLOBAL', amount) {
    const EcoUser = mongoose.models.EcoUser;
    if (!EcoUser) return 0;
    const doc = await EcoUser.findOneAndUpdate(
        { userId, guildId },
        { $inc: { wallet: amount } },
        { upsert: true, new: true }
    );
    return doc.wallet;
}

// ==========================================
// 1. BLACKJACK ENGINE
// ==========================================
const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const val of VALUES) {
            deck.push({ suit, val });
        }
    }
    // Shuffle (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;
    for (const card of hand) {
        if (card.val === 'A') {
            aces += 1;
            value += 11;
        } else if (['K', 'Q', 'J'].includes(card.val)) {
            value += 10;
        } else {
            value += parseInt(card.val, 10);
        }
    }
    while (value > 21 && aces > 0) {
        value -= 10;
        aces -= 1;
    }
    return value;
}

function formatHand(hand, hideSecond = false) {
    if (hideSecond && hand.length >= 2) {
        return `\`${hand[0].val}${hand[0].suit}\` \`🂠 ?\``;
    }
    return hand.map(c => `\`${c.val}${c.suit}\``).join(' ');
}

// ==========================================
// 2. TRIVIA QUESTIONS POOL
// ==========================================
const TRIVIA_POOL = [
    {
        q: 'Which celestial body is known as the Morning Star or Evening Star?',
        options: ['Mars', 'Venus', 'Jupiter', 'Mercury'],
        answer: 1,
        cat: 'Astronomy'
    },
    {
        q: 'What is the closest spiral galaxy to the Milky Way?',
        options: ['Andromeda', 'Triangulum', 'Sombrero', 'Centaurus A'],
        answer: 0,
        cat: 'Astronomy'
    },
    {
        q: 'In anime, what is the legendary pirate treasure hidden at Laugh Tale called?',
        options: ['Dragon Radar', 'One Piece', 'Death Note', 'Philosopher Stone'],
        answer: 1,
        cat: 'Anime'
    },
    {
        q: 'What is the highest achievable rank in chess called?',
        options: ['Master', 'Grandmaster', 'Champion', 'Archduke'],
        answer: 1,
        cat: 'Games'
    },
    {
        q: 'What programming language was initially created in just 10 days in 1995?',
        options: ['Python', 'JavaScript', 'C++', 'Java'],
        answer: 1,
        cat: 'Technology'
    },
    {
        q: 'How long does sunlight take to reach Earth on average?',
        options: ['8 seconds', '8 minutes', '8 hours', '8 days'],
        answer: 1,
        cat: 'Science'
    },
    {
        q: 'In video games, who is known as the "Hero of Time"?',
        options: ['Mario', 'Link', 'Sonic', 'Cloud Strife'],
        answer: 1,
        cat: 'Gaming'
    },
    {
        q: 'What is the hardest natural substance known on Earth?',
        options: ['Titanium', 'Diamond', 'Graphene', 'Platinum'],
        answer: 1,
        cat: 'Science'
    }
];

// ==========================================
// 3. WORDLE WORD BANK
// ==========================================
const WORDLE_WORDS = ['STARS', 'COMET', 'SOLAR', 'LUNAR', 'ORBIT', 'SPACE', 'LIGHT', 'SHINE', 'EARTH', 'VENUS', 'MAGIC', 'GLOWS', 'NIGHT', 'CLOUD', 'CRAFT'];

const commands = [
    // 1. BLACKJACK
    {
        name: 'blackjack',
        aliases: ['bj', '21'],
        category: 'Games',
        description: 'Play a game of classic 21-card Blackjack against the Cosmic Dealer with stardust bets.',
        usage: ',bj <bet>',
        async execute(ctx) {
            const rawBet = ctx.args[0]?.toLowerCase();
            const guildId = ctx.guild?.id || 'GLOBAL';
            const userEco = await getEcoUser(ctx.user.id, guildId);

            let bet = 50;
            if (rawBet) {
                if (rawBet === 'all' || rawBet === 'max') {
                    bet = Math.max(10, Math.min(userEco ? userEco.wallet : 1000, 5000));
                } else {
                    const parsed = parseInt(rawBet, 10);
                    if (!isNaN(parsed) && parsed >= 10) bet = parsed;
                }
            }

            if (userEco && userEco.wallet < bet) {
                return ctx.reply(`❌ You only have **$${userEco.wallet.toLocaleString()}** stardust credits. You need at least **$${bet}** to play!`);
            }

            // Deduct initial bet
            await adjustWallet(ctx.user.id, guildId, -bet);

            const deck = createDeck();
            const playerHand = [deck.pop(), deck.pop()];
            const dealerHand = [deck.pop(), deck.pop()];

            let playerValue = calculateHandValue(playerHand);
            let dealerValue = calculateHandValue(dealerHand);
            let gameOver = false;
            let resultMessage = '';
            let finalColor = config.EMBED_COLORS.PRIMARY;

            // Check Natural Blackjack
            if (playerValue === 21) {
                gameOver = true;
                if (dealerValue === 21) {
                    await adjustWallet(ctx.user.id, guildId, bet); // Push
                    resultMessage = '🤝 **Push!** Both you and the dealer drew a Natural Blackjack! Bet refunded.';
                } else {
                    const winPayout = Math.floor(bet * 2.5);
                    await adjustWallet(ctx.user.id, guildId, winPayout);
                    resultMessage = `🎉 **NATURAL BLACKJACK!** You win **+$${Math.floor(bet * 1.5).toLocaleString()}** credits! 🌟`;
                    finalColor = config.EMBED_COLORS.SUCCESS;
                }
            }

            const buildEmbed = (hideDealer = true) => {
                const pVal = calculateHandValue(playerHand);
                const dVal = hideDealer ? '?' : calculateHandValue(dealerHand);

                return new EmbedBuilder()
                    .setColor(finalColor)
                    .setAuthor({ name: `${ctx.user.username}'s Blackjack Table`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                    .setTitle('🃏 Cosmic Starlight Blackjack')
                    .setDescription(`**Bet Amount:** \`$${bet.toLocaleString()} Stardust\`\n\n${resultMessage}`)
                    .addFields(
                        { 
                            name: `Dealer's Hand (${dVal})`, 
                            value: formatHand(dealerHand, hideDealer), 
                            inline: false 
                        },
                        { 
                            name: `Your Hand (${pVal})`, 
                            value: formatHand(playerHand, false), 
                            inline: false 
                        }
                    )
                    .setFooter({ text: gameOver ? 'Game Concluded' : 'Click a button below to make your move!' })
                    .setTimestamp();
            };

            const buildButtons = (disabled = false) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('bj_hit')
                        .setLabel('Hit')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🟢')
                        .setDisabled(disabled),
                    new ButtonBuilder()
                        .setCustomId('bj_stand')
                        .setLabel('Stand')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🛑')
                        .setDisabled(disabled),
                    new ButtonBuilder()
                        .setCustomId('bj_double')
                        .setLabel('Double Down')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('💎')
                        .setDisabled(disabled || playerHand.length > 2)
                );
            };

            const initialMsg = await ctx.reply({
                embeds: [buildEmbed(true)],
                components: gameOver ? [] : [buildButtons(false)]
            });

            if (gameOver || !initialMsg) return;

            const collector = initialMsg.createMessageComponentCollector({
                time: 60000,
                componentType: ComponentType.Button
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== ctx.user.id) {
                    return i.reply({ content: '❌ This blackjack game belongs to another player! Start your own with `,bj <bet>`.', ephemeral: true });
                }

                const action = i.customId;

                // 1. Double Down
                if (action === 'bj_double') {
                    const currentEco = await getEcoUser(ctx.user.id, guildId);
                    if (currentEco && currentEco.wallet >= bet) {
                        await adjustWallet(ctx.user.id, guildId, -bet);
                        bet *= 2;
                        playerHand.push(deck.pop());
                        playerValue = calculateHandValue(playerHand);

                        if (playerValue > 21) {
                            gameOver = true;
                            resultMessage = `💥 **Bust!** Your total is **${playerValue}**. You lost **$${bet.toLocaleString()}** credits.`;
                            finalColor = config.EMBED_COLORS.DANGER;
                        } else {
                            // Stand after doubling
                            while (calculateHandValue(dealerHand) < 17) {
                                dealerHand.push(deck.pop());
                            }
                            dealerValue = calculateHandValue(dealerHand);
                            gameOver = true;

                            if (dealerValue > 21 || playerValue > dealerValue) {
                                await adjustWallet(ctx.user.id, guildId, bet * 2);
                                resultMessage = `🏆 **Victory!** Dealer has ${dealerValue > 21 ? 'busted' : dealerValue}. You win **+$${bet.toLocaleString()}**!`;
                                finalColor = config.EMBED_COLORS.SUCCESS;
                            } else if (playerValue === dealerValue) {
                                await adjustWallet(ctx.user.id, guildId, bet);
                                resultMessage = `🤝 **Push!** Both tied at ${playerValue}. Bet refunded.`;
                            } else {
                                resultMessage = `💀 **Dealer Wins!** Dealer scored ${dealerValue}. You lost **$${bet.toLocaleString()}**.`;
                                finalColor = config.EMBED_COLORS.DANGER;
                            }
                        }
                    } else {
                        return i.reply({ content: '❌ You don\'t have enough balance to double down!', ephemeral: true });
                    }
                    collector.stop();
                    return i.update({ embeds: [buildEmbed(false)], components: [] });
                }

                // 2. Hit
                if (action === 'bj_hit') {
                    playerHand.push(deck.pop());
                    playerValue = calculateHandValue(playerHand);

                    if (playerValue > 21) {
                        gameOver = true;
                        resultMessage = `💥 **Bust!** Your hand exceeded 21 with **${playerValue}**. You lost **$${bet.toLocaleString()}** credits.`;
                        finalColor = config.EMBED_COLORS.DANGER;
                        collector.stop();
                        return i.update({ embeds: [buildEmbed(false)], components: [] });
                    } else if (playerValue === 21) {
                        // Auto-stand on 21
                        while (calculateHandValue(dealerHand) < 17) {
                            dealerHand.push(deck.pop());
                        }
                        dealerValue = calculateHandValue(dealerHand);
                        gameOver = true;

                        if (dealerValue > 21 || playerValue > dealerValue) {
                            await adjustWallet(ctx.user.id, guildId, bet * 2);
                            resultMessage = `🏆 **Victory!** You hit 21! You win **+$${bet.toLocaleString()}** credits!`;
                            finalColor = config.EMBED_COLORS.SUCCESS;
                        } else if (playerValue === dealerValue) {
                            await adjustWallet(ctx.user.id, guildId, bet);
                            resultMessage = '🤝 **Push!** Tied at 21! Bet refunded.';
                        }
                        collector.stop();
                        return i.update({ embeds: [buildEmbed(false)], components: [] });
                    }

                    return i.update({ embeds: [buildEmbed(true)], components: [buildButtons(false)] });
                }

                // 3. Stand
                if (action === 'bj_stand') {
                    while (calculateHandValue(dealerHand) < 17) {
                        dealerHand.push(deck.pop());
                    }
                    dealerValue = calculateHandValue(dealerHand);
                    gameOver = true;

                    if (dealerValue > 21) {
                        await adjustWallet(ctx.user.id, guildId, bet * 2);
                        resultMessage = `🏆 **Dealer Busted (${dealerValue})!** You win **+$${bet.toLocaleString()}** credits!`;
                        finalColor = config.EMBED_COLORS.SUCCESS;
                    } else if (playerValue > dealerValue) {
                        await adjustWallet(ctx.user.id, guildId, bet * 2);
                        resultMessage = `🏆 **Victory!** Your ${playerValue} beats Dealer's ${dealerValue}! Won **+$${bet.toLocaleString()}**!`;
                        finalColor = config.EMBED_COLORS.SUCCESS;
                    } else if (playerValue === dealerValue) {
                        await adjustWallet(ctx.user.id, guildId, bet);
                        resultMessage = `🤝 **Push!** Both tied at ${playerValue}. Bet refunded.`;
                    } else {
                        resultMessage = `💀 **Dealer Wins!** Dealer has ${dealerValue} vs your ${playerValue}. Lost **$${bet.toLocaleString()}**.`;
                        finalColor = config.EMBED_COLORS.DANGER;
                    }

                    collector.stop();
                    return i.update({ embeds: [buildEmbed(false)], components: [] });
                }
            });

            collector.on('end', async (_, reason) => {
                if (reason === 'time' && !gameOver) {
                    await initialMsg.edit({ components: [buildButtons(true)] }).catch(() => {});
                }
            });
        }
    },

    // 2. COSMIC MINESWEEPER
    {
        name: 'mines',
        aliases: ['minesweeper', 'minefield'],
        category: 'Games',
        description: 'Navigate a 3x3 cosmic minefield to uncover stars and cash out growing multipliers before hitting a black hole!',
        usage: ',mines <bet>',
        async execute(ctx) {
            const rawBet = parseInt(ctx.args[0] || '50', 10);
            const bet = Math.max(10, isNaN(rawBet) ? 50 : rawBet);
            const guildId = ctx.guild?.id || 'GLOBAL';

            const userEco = await getEcoUser(ctx.user.id, guildId);
            if (userEco && userEco.wallet < bet) {
                return ctx.reply(`❌ You only have **$${userEco.wallet.toLocaleString()}** credits. You need **$${bet}** to play mines!`);
            }

            // Deduct bet
            await adjustWallet(ctx.user.id, guildId, -bet);

            // Generate 3x3 grid (9 tiles, 2 black holes, 7 stars)
            const tiles = new Array(9).fill('star');
            tiles[Math.floor(Math.random() * 4)] = 'bomb';
            tiles[5 + Math.floor(Math.random() * 4)] = 'bomb';

            const revealed = new Set();
            let currentMultiplier = 1.0;
            let isGameOver = false;

            const MULTIPLIERS = [1.0, 1.25, 1.65, 2.25, 3.5, 6.0, 12.0, 25.0];

            const buildGridRows = (revealAll = false) => {
                const rows = [];
                for (let r = 0; r < 3; r++) {
                    const row = new ActionRowBuilder();
                    for (let c = 0; c < 3; c++) {
                        const index = r * 3 + c;
                        const btn = new ButtonBuilder().setCustomId(`mine_${index}`);

                        if (revealed.has(index) || revealAll) {
                            if (tiles[index] === 'bomb') {
                                btn.setEmoji('💣').setStyle(ButtonStyle.Danger).setDisabled(true);
                            } else {
                                btn.setEmoji('⭐').setStyle(ButtonStyle.Success).setDisabled(true);
                            }
                        } else {
                            btn.setLabel('❓').setStyle(ButtonStyle.Secondary).setDisabled(revealAll);
                        }
                        row.addComponents(btn);
                    }
                    rows.push(row);
                }

                // Action row for Cashout
                const controlRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('mine_cashout')
                        .setLabel(`Cash Out ($${Math.floor(bet * currentMultiplier).toLocaleString()})`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('💰')
                        .setDisabled(revealAll || revealed.size === 0)
                );
                rows.push(controlRow);
                return rows;
            };

            const buildEmbed = (status = 'playing') => {
                let color = config.EMBED_COLORS.PRIMARY;
                let desc = `**Initial Bet:** \`$${bet.toLocaleString()} Stardust\`\n**Current Multiplier:** \`${currentMultiplier.toFixed(2)}x\`\n**Potential Winnings:** \`$${Math.floor(bet * currentMultiplier).toLocaleString()}\`\n\n*Click tiles to reveal stars. Cash out anytime to claim your reward!*`;

                if (status === 'cashed_out') {
                    color = config.EMBED_COLORS.SUCCESS;
                    desc = `💰 **CASHED OUT SUCCESSFULLY!**\n\nYou safely extracted **+$${Math.floor(bet * currentMultiplier).toLocaleString()}** stardust credits at \`${currentMultiplier.toFixed(2)}x\` multiplier! 🌟`;
                } else if (status === 'boom') {
                    color = config.EMBED_COLORS.DANGER;
                    desc = `💥 **BOOM! You hit a Cosmic Black Hole!**\n\nYour ship was sucked into the singularity! You lost your **$${bet.toLocaleString()}** stardust bet.`;
                }

                return new EmbedBuilder()
                    .setColor(color)
                    .setAuthor({ name: `${ctx.user.username}'s Minefield`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                    .setTitle('💣 Cosmic Minefield Expedition')
                    .setDescription(desc)
                    .setFooter({ text: 'Starry Arcade Games • Prefix: ,' })
                    .setTimestamp();
            };

            const msg = await ctx.reply({
                embeds: [buildEmbed('playing')],
                components: buildGridRows(false)
            });

            const collector = msg.createMessageComponentCollector({
                time: 60000,
                componentType: ComponentType.Button
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== ctx.user.id) {
                    return i.reply({ content: '❌ This minefield game belongs to another player! Start your own with `,mines <bet>`.', ephemeral: true });
                }

                if (i.customId === 'mine_cashout') {
                    isGameOver = true;
                    const payout = Math.floor(bet * currentMultiplier);
                    await adjustWallet(ctx.user.id, guildId, payout);
                    collector.stop();
                    return i.update({
                        embeds: [buildEmbed('cashed_out')],
                        components: buildGridRows(true)
                    });
                }

                const tileIndex = parseInt(i.customId.replace('mine_', ''), 10);
                if (isNaN(tileIndex) || revealed.has(tileIndex)) return i.deferUpdate();

                revealed.add(tileIndex);

                if (tiles[tileIndex] === 'bomb') {
                    isGameOver = true;
                    collector.stop();
                    return i.update({
                        embeds: [buildEmbed('boom')],
                        components: buildGridRows(true)
                    });
                } else {
                    currentMultiplier = MULTIPLIERS[Math.min(revealed.size, MULTIPLIERS.length - 1)];
                    // If all stars found
                    if (revealed.size === 7) {
                        isGameOver = true;
                        const payout = Math.floor(bet * currentMultiplier);
                        await adjustWallet(ctx.user.id, guildId, payout);
                        collector.stop();
                        return i.update({
                            embeds: [buildEmbed('cashed_out')],
                            components: buildGridRows(true)
                        });
                    }

                    return i.update({
                        embeds: [buildEmbed('playing')],
                        components: buildGridRows(false)
                    });
                }
            });

            collector.on('end', async (_, reason) => {
                if (reason === 'time' && !isGameOver) {
                    await msg.edit({ components: buildGridRows(true) }).catch(() => {});
                }
            });
        }
    },

    // 3. TRIVIA QUIZ
    {
        name: 'trivia',
        aliases: ['quiz', 'testknowledge'],
        category: 'Games',
        description: 'Test your knowledge in a 4-choice timed trivia quiz to win stardust and XP.',
        usage: ',trivia',
        async execute(ctx) {
            const questionData = TRIVIA_POOL[Math.floor(Math.random() * TRIVIA_POOL.length)];
            const labels = ['A', 'B', 'C', 'D'];

            const row = new ActionRowBuilder();
            questionData.options.forEach((opt, idx) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`trivia_${idx}`)
                        .setLabel(`${labels[idx]}: ${opt}`)
                        .setStyle(ButtonStyle.Secondary)
                );
            });

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setAuthor({ name: `Category: ${questionData.cat}`, iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' })
                .setTitle(`🧠 Celestial Trivia Challenge!`)
                .setDescription(`### ${questionData.q}\n\n*Select the correct option below within **20 seconds**!*`)
                .setFooter({ text: 'Reward: +$150 Stardust Credits • Prefix: ,' })
                .setTimestamp();

            const msg = await ctx.reply({ embeds: [embed], components: [row] });

            const collector = msg.createMessageComponentCollector({
                time: 20000,
                componentType: ComponentType.Button
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== ctx.user.id) {
                    return i.reply({ content: '❌ This trivia challenge belongs to another player! Start your own with `,trivia`.', ephemeral: true });
                }

                const choice = parseInt(i.customId.replace('trivia_', ''), 10);
                collector.stop();

                const isCorrect = choice === questionData.answer;
                const resultRow = new ActionRowBuilder();

                questionData.options.forEach((opt, idx) => {
                    const btn = new ButtonBuilder()
                        .setCustomId(`res_${idx}`)
                        .setLabel(`${labels[idx]}: ${opt}`)
                        .setDisabled(true);

                    if (idx === questionData.answer) {
                        btn.setStyle(ButtonStyle.Success).setEmoji('✅');
                    } else if (idx === choice && !isCorrect) {
                        btn.setStyle(ButtonStyle.Danger).setEmoji('❌');
                    } else {
                        btn.setStyle(ButtonStyle.Secondary);
                    }
                    resultRow.addComponents(btn);
                });

                if (isCorrect) {
                    await adjustWallet(ctx.user.id, ctx.guild?.id || 'GLOBAL', 150);
                    const winEmbed = new EmbedBuilder()
                        .setColor(config.EMBED_COLORS.SUCCESS)
                        .setTitle('🎉 Brilliant! Correct Answer!')
                        .setDescription(`You correctly identified **${questionData.options[questionData.answer]}**!\n\n✨ **Earned:** \`+$150 Stardust Credits\``)
                        .setTimestamp();

                    return i.update(localizePayload({ embeds: [winEmbed], components: [resultRow] }, ctx.lang));
                } else {
                    const loseEmbed = new EmbedBuilder()
                        .setColor(config.EMBED_COLORS.DANGER)
                        .setTitle('❌ Not Quite!')
                        .setDescription(`The correct answer was **${questionData.options[questionData.answer]}**!\nBetter luck on the next question!`)
                        .setTimestamp();

                    return i.update(localizePayload({ embeds: [loseEmbed], components: [resultRow] }, ctx.lang));
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor(config.EMBED_COLORS.WARNING)
                        .setTitle('⌛ Time Expired!')
                        .setDescription(`Time ran out! The correct answer was **${questionData.options[questionData.answer]}**.`);
                    await msg.edit(localizePayload({ embeds: [timeoutEmbed], components: [] }, ctx.lang)).catch(() => {});
                }
            });
        }
    },

    // 4. ROCK PAPER SCISSORS
    {
        name: 'rps',
        aliases: ['rockpaperscissors'],
        category: 'Games',
        description: 'Play Rock, Paper, Scissors against Starry AI or challenge a member with a bet.',
        usage: ',rps [bet]',
        async execute(ctx) {
            const rawBet = parseInt(ctx.args[0] || '0', 10);
            const bet = Math.max(0, isNaN(rawBet) ? 0 : rawBet);
            const guildId = ctx.guild?.id || 'GLOBAL';

            if (bet > 0) {
                const userEco = await getEcoUser(ctx.user.id, guildId);
                if (userEco && userEco.wallet < bet) {
                    return ctx.reply(`❌ You don't have enough credits for a **$${bet}** bet!`);
                }
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('rps_rock').setLabel('Rock').setStyle(ButtonStyle.Primary).setEmoji('🪨'),
                new ButtonBuilder().setCustomId('rps_paper').setLabel('Paper').setStyle(ButtonStyle.Primary).setEmoji('📄'),
                new ButtonBuilder().setCustomId('rps_scissors').setLabel('Scissors').setStyle(ButtonStyle.Primary).setEmoji('✂️')
            );

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle('🪨 📄 ✂️ Rock Paper Scissors')
                .setDescription(
                    `Choose your move below!\n` +
                    (bet > 0 ? `**Wager:** \`$${bet.toLocaleString()} Stardust\`\n` : '') +
                    `*You have 30 seconds to make your choice.*`
                )
                .setFooter({ text: 'Starry Mini-Games' });

            const msg = await ctx.reply({ embeds: [embed], components: [row] });

            const collector = msg.createMessageComponentCollector({
                time: 30000,
                componentType: ComponentType.Button
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== ctx.user.id) {
                    return i.reply({ content: '❌ This rock-paper-scissors game belongs to another player! Start your own with `,rps`.', ephemeral: true });
                }

                collector.stop();
                const moves = ['rock', 'paper', 'scissors'];
                const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };

                const playerMove = i.customId.replace('rps_', '');
                const botMove = moves[Math.floor(Math.random() * moves.length)];

                let outcome = 'tie';
                if (
                    (playerMove === 'rock' && botMove === 'scissors') ||
                    (playerMove === 'paper' && botMove === 'rock') ||
                    (playerMove === 'scissors' && botMove === 'paper')
                ) {
                    outcome = 'win';
                } else if (playerMove !== botMove) {
                    outcome = 'loss';
                }

                let resultTitle = '';
                let resultColor = config.EMBED_COLORS.PRIMARY;

                if (outcome === 'win') {
                    resultTitle = '🎉 Victory! You Won!';
                    resultColor = config.EMBED_COLORS.SUCCESS;
                    if (bet > 0) await adjustWallet(ctx.user.id, guildId, bet);
                } else if (outcome === 'loss') {
                    resultTitle = '💀 Defeat! Starry Won!';
                    resultColor = config.EMBED_COLORS.DANGER;
                    if (bet > 0) await adjustWallet(ctx.user.id, guildId, -bet);
                } else {
                    resultTitle = '🤝 It\'s a Tie!';
                }

                const resultEmbed = new EmbedBuilder()
                    .setColor(resultColor)
                    .setTitle(resultTitle)
                    .setDescription(
                        `**Your Choice:** ${emojis[playerMove]} \`${playerMove.toUpperCase()}\`\n` +
                        `**Starry's Choice:** ${emojis[botMove]} \`${botMove.toUpperCase()}\`\n\n` +
                        (bet > 0 ? `**Outcome:** \`${outcome === 'win' ? '+' : (outcome === 'loss' ? '-' : '')}$${bet.toLocaleString()} credits\`` : '')
                    )
                    .setFooter({ text: 'Prefix: , • Starry Arcade' })
                    .setTimestamp();

                return i.update({ embeds: [resultEmbed], components: [] });
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await msg.edit({ components: [] }).catch(() => {});
                }
            });
        }
    },

    // 5. TIC TAC TOE
    {
        name: 'tictactoe',
        aliases: ['ttt'],
        category: 'Games',
        description: 'Challenge another server member to an interactive game of Tic-Tac-Toe.',
        usage: ',ttt <@user>',
        async execute(ctx) {
            const target = ctx.message?.mentions?.users?.first() || ctx.options?.getUser?.('user');
            if (!target || target.id === ctx.user.id || target.bot) {
                return ctx.reply('❌ **Please mention another member to play with!**\n*Example: `,ttt @friend`*');
            }

            const p1 = ctx.user;
            const p2 = target;
            let currentTurn = p1.id; // p1 is X, p2 is O
            const board = new Array(9).fill(null); // 'X' | 'O' | null

            function checkWin() {
                const wins = [
                    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
                    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
                    [0, 4, 8], [2, 4, 6]             // Diagonals
                ];
                for (const [a, b, c] of wins) {
                    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                        return board[a];
                    }
                }
                return board.includes(null) ? null : 'tie';
            }

            const buildBoardRows = (disabled = false) => {
                const rows = [];
                for (let r = 0; r < 3; r++) {
                    const row = new ActionRowBuilder();
                    for (let c = 0; c < 3; c++) {
                        const idx = r * 3 + c;
                        const val = board[idx];
                        const btn = new ButtonBuilder()
                            .setCustomId(`ttt_${idx}`)
                            .setDisabled(disabled || val !== null);

                        if (val === 'X') {
                            btn.setLabel('X').setStyle(ButtonStyle.Danger);
                        } else if (val === 'O') {
                            btn.setLabel('O').setStyle(ButtonStyle.Primary);
                        } else {
                            btn.setLabel('➖').setStyle(ButtonStyle.Secondary);
                        }
                        row.addComponents(btn);
                    }
                    rows.push(row);
                }
                return rows;
            };

            const buildEmbed = (winner = null) => {
                let desc = `**Player 1 (❌):** <@${p1.id}>\n**Player 2 (⭕):** <@${p2.id}>\n\n`;
                if (!winner) {
                    desc += `👉 **Current Turn:** <@${currentTurn}> (${currentTurn === p1.id ? '❌' : '⭕'})`;
                } else if (winner === 'tie') {
                    desc += `🤝 **Game Ended in a Draw!** Well played by both travelers!`;
                } else {
                    const winnerId = winner === 'X' ? p1.id : p2.id;
                    desc += `🏆 **Game Over! <@${winnerId}> wins the match!** ✨`;
                }

                return new EmbedBuilder()
                    .setColor(winner ? config.EMBED_COLORS.SUCCESS : config.EMBED_COLORS.PRIMARY)
                    .setTitle('❌ ⭕ Starlight Tic-Tac-Toe Arena')
                    .setDescription(desc)
                    .setFooter({ text: 'Turn timer: 60s per move' });
            };

            const msg = await ctx.reply({
                embeds: [buildEmbed()],
                components: buildBoardRows(false)
            });

            const collector = msg.createMessageComponentCollector({
                time: 180000,
                componentType: ComponentType.Button
            });

            collector.on('collect', async (i) => {
                if (![p1.id, p2.id].includes(i.user.id)) {
                    return i.reply({ content: '❌ You are not a player in this Tic-Tac-Toe match!', ephemeral: true });
                }

                if (i.user.id !== currentTurn) {
                    return i.reply({ content: '⏳ It is not your turn yet!', ephemeral: true });
                }

                const index = parseInt(i.customId.replace('ttt_', ''), 10);
                if (isNaN(index) || board[index] !== null) return i.deferUpdate();

                board[index] = currentTurn === p1.id ? 'X' : 'O';
                const winner = checkWin();

                if (winner) {
                    collector.stop();
                    return i.update({
                        embeds: [buildEmbed(winner)],
                        components: buildBoardRows(true)
                    });
                }

                currentTurn = currentTurn === p1.id ? p2.id : p1.id;
                return i.update({
                    embeds: [buildEmbed()],
                    components: buildBoardRows(false)
                });
            });

            collector.on('end', async (_, reason) => {
                if (reason === 'time') {
                    await msg.edit({ components: buildBoardRows(true) }).catch(() => {});
                }
            });
        }
    },

    // 6. HIGH-LOW
    {
        name: 'highlow',
        aliases: ['hl'],
        category: 'Games',
        description: 'Guess if the secret celestial number (1-100) is higher or lower than the hint.',
        usage: ',hl <bet>',
        async execute(ctx) {
            const bet = Math.max(10, parseInt(ctx.args[0] || '50', 10));
            const guildId = ctx.guild?.id || 'GLOBAL';

            const userEco = await getEcoUser(ctx.user.id, guildId);
            if (userEco && userEco.wallet < bet) {
                return ctx.reply(`❌ You only have **$${userEco.wallet}** credits!`);
            }

            const currentNumber = Math.floor(Math.random() * 80) + 10; // 10 - 89
            const nextNumber = Math.floor(Math.random() * 100) + 1;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('hl_higher').setLabel('Higher ⬆️').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('hl_lower').setLabel('Lower ⬇️').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('hl_jackpot').setLabel('Exact Match (10x) 🎯').setStyle(ButtonStyle.Primary)
            );

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle('🔢 High or Low Challenge')
                .setDescription(
                    `The celestial beacon shows: **\`${currentNumber}\`**\n\n` +
                    `Will the next secret number be **Higher** or **Lower**?\n` +
                    `**Wager:** \`$${bet.toLocaleString()} Stardust\`\n\n*Click your prediction below within 20s!*`
                );

            const msg = await ctx.reply({ embeds: [embed], components: [row] });

            const collector = msg.createMessageComponentCollector({
                time: 20000,
                componentType: ComponentType.Button
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== ctx.user.id) {
                    return i.reply({ content: '❌ This game belongs to another player! Start your own with `,hl <bet>`.', ephemeral: true });
                }

                collector.stop();
                const choice = i.customId.replace('hl_', '');

                let won = false;
                let multiplier = 1.0;

                if (choice === 'higher' && nextNumber > currentNumber) {
                    won = true;
                    multiplier = 1.8;
                } else if (choice === 'lower' && nextNumber < currentNumber) {
                    won = true;
                    multiplier = 1.8;
                } else if (choice === 'jackpot' && nextNumber === currentNumber) {
                    won = true;
                    multiplier = 10.0;
                }

                if (won) {
                    const payout = Math.floor(bet * multiplier);
                    await adjustWallet(ctx.user.id, guildId, payout);
                    const winEmbed = new EmbedBuilder()
                        .setColor(config.EMBED_COLORS.SUCCESS)
                        .setTitle('🎉 Prediction Correct!')
                        .setDescription(`The secret number was **\`${nextNumber}\`**!\n\n✨ **Won:** \`+$${payout.toLocaleString()} Credits\` (${multiplier}x)`);
                    return i.update({ embeds: [winEmbed], components: [] });
                } else {
                    await adjustWallet(ctx.user.id, guildId, -bet);
                    const loseEmbed = new EmbedBuilder()
                        .setColor(config.EMBED_COLORS.DANGER)
                        .setTitle('💀 Incorrect Prediction!')
                        .setDescription(`The secret number was **\`${nextNumber}\`**!\nYou lost your **$${bet.toLocaleString()}** bet.`);
                    return i.update({ embeds: [loseEmbed], components: [] });
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await msg.edit({ components: [] }).catch(() => {});
                }
            });
        }
    },

    // 7. WHEEL OF FORTUNE
    {
        name: 'spin',
        aliases: ['wheel', 'wheeloffortune'],
        category: 'Games',
        description: 'Spin the celestial wheel of fortune for multipliers up to 10x!',
        usage: ',spin <bet>',
        async execute(ctx) {
            const bet = Math.max(10, parseInt(ctx.args[0] || '50', 10));
            const guildId = ctx.guild?.id || 'GLOBAL';

            const userEco = await getEcoUser(ctx.user.id, guildId);
            if (userEco && userEco.wallet < bet) {
                return ctx.reply(`❌ You only have **$${userEco.wallet.toLocaleString()}** credits!`);
            }

            await adjustWallet(ctx.user.id, guildId, -bet);

            const spinEmbed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setAuthor({ name: `${ctx.user.username}'s Wheel Spin`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setTitle('🎡 The Celestial Wheel is Spinning...')
                .setDescription(`**Your Bet:** \`$${bet.toLocaleString()} Stardust\`\n\n*Passing through multipliers... 🌀*`)
                .setFooter({ text: 'Waiting for the wheel to settle...' });

            const msg = await ctx.reply({ embeds: [spinEmbed] });

            await new Promise(res => setTimeout(res, 1300));

            const outcomes = [
                { mult: 0, label: '💥 0x (Bankrupt)', weight: 30 },
                { mult: 0.5, label: '🌑 0.5x (Half Bet)', weight: 25 },
                { mult: 1.5, label: '⭐ 1.5x (Small Win)', weight: 20 },
                { mult: 2.0, label: '🌟 2.0x (Double Win)', weight: 15 },
                { mult: 3.5, label: '💫 3.5x (Mega Win)', weight: 7 },
                { mult: 10.0, label: '👑 10.0x (COSMIC JACKPOT!)', weight: 3 }
            ];

            // Weighted random selection
            const totalWeight = outcomes.reduce((sum, o) => sum + o.weight, 0);
            let rand = Math.random() * totalWeight;
            let chosen = outcomes[0];

            for (const o of outcomes) {
                if (rand < o.weight) {
                    chosen = o;
                    break;
                }
                rand -= o.weight;
            }

            const winAmount = Math.floor(bet * chosen.mult);
            if (winAmount > 0) {
                await adjustWallet(ctx.user.id, guildId, winAmount);
            }

            const finalEmbed = new EmbedBuilder()
                .setColor(chosen.mult >= 2 ? config.EMBED_COLORS.SUCCESS : (chosen.mult === 0 ? config.EMBED_COLORS.DANGER : config.EMBED_COLORS.PRIMARY))
                .setAuthor({ name: `${ctx.user.username}'s Wheel Spin`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setTitle(`🎡 The Wheel Settled On: ${chosen.label}!`)
                .setDescription(
                    `**Your Bet:** \`$${bet.toLocaleString()} Stardust\`\n` +
                    `**Multiplier:** \`${chosen.mult}x\`\n` +
                    `**Net Result:** \`${winAmount >= bet ? '+' : '-'}$${Math.abs(winAmount - bet).toLocaleString()} credits\``
                )
                .setFooter({ text: 'Spin again anytime with ,spin <bet>' })
                .setTimestamp();

            if (msg && typeof msg.edit === 'function') {
                return await msg.edit({ embeds: [finalEmbed] }).catch(() => {});
            } else {
                return await ctx.editReply({ embeds: [finalEmbed] }).catch(() => {});
            }
        }
    },

    // 8. 8-BALL CELESTIAL ORACLE
    {
        name: '8ball',
        aliases: ['oracle', 'askoracle'],
        category: 'Games',
        description: 'Consult the mystic celestial 8-ball oracle for cosmic guidance.',
        usage: ',8ball <question>',
        async execute(ctx) {
            const question = ctx.args.join(' ');
            if (!question) return ctx.reply('🔮 **Please ask a question!** *Example: `,8ball Will I achieve greatness today?`*');

            const answers = [
                '✨ The cosmic constellations align in your favor — Absolutely Yes!',
                '🌟 The astral starlight shines brightly on this outcome.',
                '🌠 As certain as the North Star guides travelers across the night.',
                '💫 Without a doubt in this entire galaxy.',
                '🌙 The cosmos whispers: You may rely on it.',
                '✨ Most likely, according to the celestial charts.',
                '🪐 Stardust obscures the vision — Ask again when the moon rises.',
                '🌌 Better not unveil this mystery now, traveler.',
                '☄️ The gravitational waves are too unstable to predict.',
                '🔮 Concentrate deeply and ask the cosmic oracle once more.',
                '🌑 Do not count on it — The dark void suggests otherwise.',
                '🥀 My celestial sources signal a clear negative.',
                '❄️ The astral winds blow cold — Outlook not so good.',
                '💥 Highly doubtful in all known parallel universes.'
            ];

            const answer = answers[Math.floor(Math.random() * answers.length)];

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setAuthor({ name: '🔮 Cosmic 8-Ball Oracle', iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' })
                .addFields(
                    { name: '❓ Question', value: `>>> *${question}*`, inline: false },
                    { name: '🌟 Cosmic Prediction', value: `>>> **${answer}**`, inline: false }
                )
                .setFooter({ text: `Consulted by ${ctx.user.username}` })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 9. COINFLIP
    {
        name: 'coinflip',
        aliases: ['cf', 'flip'],
        category: 'Games',
        description: 'Flip a celestial coin with optional stardust bets.',
        usage: ',cf [heads|tails] [bet]',
        async execute(ctx) {
            const sideGuess = ctx.args[0]?.toLowerCase();
            const betInput = parseInt(ctx.args[1] || '0', 10);
            const bet = Math.max(0, isNaN(betInput) ? 0 : betInput);
            const guildId = ctx.guild?.id || 'GLOBAL';

            if (bet > 0) {
                const userEco = await getEcoUser(ctx.user.id, guildId);
                if (userEco && userEco.wallet < bet) {
                    return ctx.reply(`❌ You only have **$${userEco.wallet.toLocaleString()}** credits!`);
                }
            }

            const flipEmbed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setAuthor({ name: `${ctx.user.username}'s Coinflip`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`🪙 **Flipping the starlight coin high into the cosmos...** 💫\n${bet > 0 ? `*Bet:* \`$${bet.toLocaleString()} Stardust\` | *Prediction:* \`${sideGuess ? sideGuess.toUpperCase() : 'Any'}\`` : ''}`)
                .setFooter({ text: 'The coin is spinning in mid-air...' });

            const msg = await ctx.reply({ embeds: [flipEmbed] });

            await new Promise(res => setTimeout(res, 1200));

            const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
            const coinEmoji = coinResult === 'heads' ? '🪙 (Heads)' : '🌕 (Tails)';

            let won = false;
            let resultText = '';

            if (sideGuess && ['heads', 'tails', 'h', 't'].includes(sideGuess)) {
                const normalizedGuess = sideGuess.startsWith('h') ? 'heads' : 'tails';
                won = normalizedGuess === coinResult;

                if (won) {
                    if (bet > 0) await adjustWallet(ctx.user.id, guildId, bet);
                    resultText = `🎉 **You guessed correctly!** Won **+$${bet.toLocaleString()}** credits!`;
                } else {
                    if (bet > 0) await adjustWallet(ctx.user.id, guildId, -bet);
                    resultText = `💀 **Incorrect!** Lost **-$${bet.toLocaleString()}** credits.`;
                }
            } else {
                resultText = `The coin spun through the starlight and landed on **${coinResult.toUpperCase()}**!`;
            }

            const finalEmbed = new EmbedBuilder()
                .setColor(won ? config.EMBED_COLORS.SUCCESS : (bet > 0 ? config.EMBED_COLORS.DANGER : config.EMBED_COLORS.PRIMARY))
                .setAuthor({ name: `${ctx.user.username}'s Coinflip`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setTitle(`🪙 Celestial Coinflip Result`)
                .setDescription(`The coin landed on: **${coinEmoji}**\n\n${resultText}`)
                .setFooter({ text: 'Starry Arcade Games • Prefix: ,' })
                .setTimestamp();

            if (msg && typeof msg.edit === 'function') {
                return await msg.edit({ embeds: [finalEmbed] }).catch(() => {});
            } else {
                return await ctx.editReply({ embeds: [finalEmbed] }).catch(() => {});
            }
        }
    },

    // 10. ROLL DICE
    {
        name: 'roll',
        aliases: ['dice', 'rolldice'],
        category: 'Games',
        description: 'Roll dice of any size with modifier support (e.g. ,roll 2d20+5 or ,roll 100).',
        usage: ',roll [NdN+M]',
        async execute(ctx) {
            const input = ctx.args[0] || '6';

            // Check format like 2d20+5
            const diceRegex = /^(\d+)?d(\d+)(?:([+-])(\d+))?$/i;
            const match = input.match(diceRegex);

            if (match) {
                const count = Math.min(20, Math.max(1, parseInt(match[1] || '1', 10)));
                const sides = Math.min(1000, Math.max(2, parseInt(match[2], 10)));
                const op = match[3];
                const mod = match[4] ? parseInt(match[4], 10) : 0;

                const rolls = [];
                let total = 0;
                for (let i = 0; i < count; i++) {
                    const r = Math.floor(Math.random() * sides) + 1;
                    rolls.push(r);
                    total += r;
                }

                if (op === '+') total += mod;
                if (op === '-') total -= mod;

                const rollString = rolls.length > 1 ? `(${rolls.join(' + ')})` : `${rolls[0]}`;
                const modString = mod > 0 ? ` ${op} ${mod}` : '';

                return ctx.reply(`🎲 **Dice Roll (${input}):**\n${rollString}${modString} = **\`${total}\`** ✨`);
            }

            // Single number roll (1 to N)
            const max = Math.min(10000, Math.max(2, parseInt(input, 10) || 6));
            const roll = Math.floor(Math.random() * max) + 1;
            return ctx.reply(`🎲 **Rolled (1-${max}):** **\`${roll}\`** ✨`);
        }
    },

    // 11. WORDLE
    {
        name: 'wordle',
        aliases: ['starguess'],
        category: 'Games',
        description: 'Guess the hidden 5-letter cosmic word in 6 attempts!',
        usage: ',wordle [guess <word>]',
        async execute(ctx) {
            const sub = ctx.args[0]?.toLowerCase();

            // Wordle session stored per user
            if (!global.wordleSessions) global.wordleSessions = new Map();
            let session = global.wordleSessions.get(ctx.user.id);

            if (sub === 'guess') {
                if (!session) {
                    return ctx.reply('❌ You don\'t have an active Wordle game! Start one with `,wordle`.');
                }

                const guess = ctx.args[1]?.toUpperCase();
                if (!guess || guess.length !== 5) {
                    return ctx.reply('❌ Your guess must be exactly **5 letters** long! *Example: `,wordle guess ORBIT`*');
                }

                // Clean up user guess command to prevent chat clutter
                ctx.message?.delete().catch(() => {});

                const targetWord = session.target;
                let feedback = '';

                for (let i = 0; i < 5; i++) {
                    if (guess[i] === targetWord[i]) {
                        feedback += '🟩'; // Exact match
                    } else if (targetWord.includes(guess[i])) {
                        feedback += '🟨'; // In word but wrong spot
                    } else {
                        feedback += '⬛'; // Not in word
                    }
                }

                session.guesses.push(`\`${guess}\` ${feedback}`);

                let resultEmbed = null;

                if (guess === targetWord) {
                    global.wordleSessions.delete(ctx.user.id);
                    await adjustWallet(ctx.user.id, ctx.guild?.id || 'GLOBAL', 250);

                    resultEmbed = new EmbedBuilder()
                        .setColor(config.EMBED_COLORS.SUCCESS)
                        .setAuthor({ name: `${ctx.user.username}'s Cosmic Wordle`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                        .setTitle('🎉 Cosmic Wordle Solved!')
                        .setDescription(`You uncovered **${targetWord}** in **${session.guesses.length}/6** tries!\n\n${session.guesses.join('\n')}\n\n✨ **Earned:** \`+$250 Stardust Credits\``)
                        .setFooter({ text: 'Game Finished • Start a new one with ,wordle' })
                        .setTimestamp();
                } else if (session.guesses.length >= 6) {
                    global.wordleSessions.delete(ctx.user.id);
                    resultEmbed = new EmbedBuilder()
                        .setColor(config.EMBED_COLORS.DANGER)
                        .setAuthor({ name: `${ctx.user.username}'s Cosmic Wordle`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                        .setTitle('💀 Wordle Game Over!')
                        .setDescription(`You ran out of guesses! The secret word was **\`${targetWord}\`**.\n\n${session.guesses.join('\n')}`)
                        .setFooter({ text: 'Game Finished • Try again with ,wordle' })
                        .setTimestamp();
                } else {
                    resultEmbed = new EmbedBuilder()
                        .setColor(config.EMBED_COLORS.PRIMARY)
                        .setAuthor({ name: `${ctx.user.username}'s Cosmic Wordle`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                        .setTitle(`🌟 Cosmic Wordle (${session.guesses.length}/6 Attempts)`)
                        .setDescription(`Guess the secret 5-letter word!\n\n${session.guesses.join('\n')}\n\n*Type \`,wordle guess <5-letter word>\` to submit your next try!*`)
                        .setFooter({ text: `${6 - session.guesses.length} attempts remaining` });
                }

                if (session.message && typeof session.message.edit === 'function') {
                    return await session.message.edit({ embeds: [resultEmbed] }).catch(() => ctx.reply({ embeds: [resultEmbed] }));
                } else {
                    return await ctx.reply({ embeds: [resultEmbed] });
                }
            }

            // Start new game
            const targetWord = WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)];

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setAuthor({ name: `${ctx.user.username}'s Cosmic Wordle`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setTitle('🌟 Cosmic Wordle Started!')
                .setDescription(
                    `I've picked a secret **5-letter** cosmic word!\n\n` +
                    `🟩 = Correct letter & correct position\n` +
                    `🟨 = Correct letter, wrong position\n` +
                    `⬛ = Letter not in word\n\n` +
                    `*Submit your first guess with:* \`,wordle guess <word>\``
                )
                .setFooter({ text: '6 attempts • Reward: +$250 credits' });

            const initialMsg = await ctx.reply({ embeds: [embed] });
            global.wordleSessions.set(ctx.user.id, {
                target: targetWord,
                guesses: [],
                message: initialMsg
            });
            return;
        }
    }
];

module.exports = commands;
