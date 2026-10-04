// ==========================================
// 🛡️ STARRY CYBERSEC: WHITE-HAT ETHICAL HACKER ENGINE
// File Path: src/modules/cyberSec.js
// Discord Permission Loophole Auditor • Threat Modeling
// PhishShield URL Inspector • User Threat Forensics
// 100% Discord API & ToS Compliant White-Hat Security Intelligence
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

function getGeminiApiKey() {
    const raw = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || '';
    const keys = raw.split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) return null;
    return keys[Math.floor(Math.random() * keys.length)];
}

// Dangerous Discord Permissions that could lead to raids, nuking, or privilege escalation
const DANGEROUS_PERMS = [
    { bit: PermissionFlagsBits.Administrator, name: 'Administrator', severity: 'CRITICAL', weight: 35 },
    { bit: PermissionFlagsBits.ManageGuild, name: 'Manage Server', severity: 'HIGH', weight: 20 },
    { bit: PermissionFlagsBits.ManageRoles, name: 'Manage Roles', severity: 'CRITICAL', weight: 25 },
    { bit: PermissionFlagsBits.ManageChannels, name: 'Manage Channels', severity: 'HIGH', weight: 15 },
    { bit: PermissionFlagsBits.ManageWebhooks, name: 'Manage Webhooks', severity: 'HIGH', weight: 20 },
    { bit: PermissionFlagsBits.BanMembers, name: 'Ban Members', severity: 'MEDIUM', weight: 10 },
    { bit: PermissionFlagsBits.KickMembers, name: 'Kick Members', severity: 'MEDIUM', weight: 10 },
    { bit: PermissionFlagsBits.MentionEveryone, name: 'Mention @everyone', severity: 'HIGH', weight: 20 },
    { bit: PermissionFlagsBits.ManageMessages, name: 'Manage Messages', severity: 'HIGH', weight: 15 }
];

// Suspicious URL & Phishing regex patterns
const PHISHING_PATTERNS = [
    /d[i1l]sc[o0]r[cd]/i,
    /d[il1]scord.*nitro/i,
    /nitro.*gift/i,
    /free.*nitro/i,
    /steamcomm[uun]n[i1l]ty/i,
    /steamp[o0]wered/i,
    /robl[o0]x.*gift/i
];

const SUSPICIOUS_TLDS = [
    '.xyz', '.top', '.click', '.gift', '.ru', '.cc', '.tk', '.monster', 
    '.fun', '.rest', '.buzz', '.cfd', '.quest', '.skin', '.hair', '.beauty'
];

const KNOWN_GRABBERS = [
    'grabify.link', 'iplogger.org', 'blasze.tk', 'yip.su', '2no.co', 
    'iplis.ru', 'ezstat.ru', 'spys.one'
];

/**
 * 1. SERVER PENETRATION & LOOPHOLE AUDIT
 * Performs mathematical permission graph analysis and AI threat modeling
 */
async function auditServerSecurity(guild, requester) {
    let score = 100;
    const vulnerabilities = [];
    const hardeningSteps = [];
    const loopholesFound = [];

    // A. Audit @everyone Role & Default Server Overrides
    const everyoneRole = guild.roles.everyone;
    for (const dp of DANGEROUS_PERMS) {
        if (everyoneRole.permissions.has(dp.bit)) {
            score -= dp.weight;
            vulnerabilities.push({
                severity: 'CRITICAL',
                location: '@everyone Base Role',
                detail: `\`@everyone\` has dangerous permission: **${dp.name}**! Any member who joins can immediately execute this action.`
            });
            loopholesFound.push(`@everyone has global ${dp.name}`);
        }
    }

    // B. Audit Channel Permission Overwrites for @everyone & Public Leaks
    const channels = Array.from(guild.channels.cache.values());
    let channelsWithMentionEveryone = 0;
    let channelsWithWebhooks = 0;
    let channelsWithManageMsg = 0;
    let announcementsWithAttachments = 0;

    for (const ch of channels) {
        if (!ch.permissionOverwrites) continue;
        const overwrite = ch.permissionOverwrites.cache.get(guild.id);
        if (!overwrite) continue;

        // Check Mention Everyone in channel
        if (overwrite.allow.has(PermissionFlagsBits.MentionEveryone)) {
            channelsWithMentionEveryone++;
            loopholesFound.push(`Channel #${ch.name} allows @everyone mass mentions`);
        }

        // Check Webhook injection
        if (overwrite.allow.has(PermissionFlagsBits.ManageWebhooks)) {
            channelsWithWebhooks++;
            loopholesFound.push(`Channel #${ch.name} allows public Manage Webhooks`);
        }

        // Check Manage Messages
        if (overwrite.allow.has(PermissionFlagsBits.ManageMessages)) {
            channelsWithManageMsg++;
            loopholesFound.push(`Channel #${ch.name} allows public Manage Messages`);
        }

        // Check announcement/rule channels allowing files/embeds
        const chName = ch.name.toLowerCase();
        const isAnnouncement = chName.includes('announc') || chName.includes('rule') || chName.includes('update') || chName.includes('info') || chName.includes('news');
        if (isAnnouncement && (overwrite.allow.has(PermissionFlagsBits.AttachFiles) || overwrite.allow.has(PermissionFlagsBits.EmbedLinks))) {
            announcementsWithAttachments++;
            loopholesFound.push(`Protected channel #${ch.name} allows public files/embed links`);
        }
    }

    if (channelsWithMentionEveryone > 0) {
        score -= Math.min(25, channelsWithMentionEveryone * 10);
        vulnerabilities.push({
            severity: 'HIGH',
            location: `${channelsWithMentionEveryone} Channel(s)`,
            detail: `\`Mention @everyone\` override is explicitly **ALLOWED** for @everyone in ${channelsWithMentionEveryone} channel(s). Attackers can spam mass pings.`
        });
        hardeningSteps.push('Remove `Mention @everyone` permission override from all public chat channels.');
    }

    if (channelsWithWebhooks > 0) {
        score -= Math.min(25, channelsWithWebhooks * 15);
        vulnerabilities.push({
            severity: 'CRITICAL',
            location: `${channelsWithWebhooks} Channel(s)`,
            detail: `\`Manage Webhooks\` override is granted to public members in ${channelsWithWebhooks} channel(s). High risk of rogue webhook phishing.`
        });
        hardeningSteps.push('Deny `Manage Webhooks` override for @everyone in all channels.');
    }

    if (channelsWithManageMsg > 0) {
        score -= Math.min(20, channelsWithManageMsg * 10);
        vulnerabilities.push({
            severity: 'HIGH',
            location: `${channelsWithManageMsg} Channel(s)`,
            detail: `\`Manage Messages\` override is granted to regular members in ${channelsWithManageMsg} channel(s), allowing anyone to delete logs or messages.`
        });
    }

    if (announcementsWithAttachments > 0) {
        score -= 10;
        vulnerabilities.push({
            severity: 'MEDIUM',
            location: `${announcementsWithAttachments} Info/Announcement Channel(s)`,
            detail: `Public members can post attachments or embed links in read-only announcement channels.`
        });
        hardeningSteps.push('Deny `Attach Files` and `Embed Links` in announcement and info channels.');
    }

    // C. Audit Bots & Privilege Escalation Risks
    const allMembers = Array.from(guild.members?.cache?.values() || []);
    const bots = allMembers.filter(m => m.user?.bot);
    let adminBots = 0;
    let unverifiedAdminBots = [];

    bots.forEach(bot => {
        if (bot.permissions && bot.permissions.has(PermissionFlagsBits.Administrator)) {
            adminBots++;
            const isVerified = bot.user.flags && (bot.user.flags.bitfield & (1 << 16) || bot.user.flags.bitfield & (1 << 19));
            if (!isVerified && bot.user.id !== guild.client?.user?.id) {
                unverifiedAdminBots.push(bot.user.tag || bot.user.username);
            }
        }
    });

    if (unverifiedAdminBots.length > 0) {
        score -= Math.min(25, unverifiedAdminBots.length * 15);
        vulnerabilities.push({
            severity: 'CRITICAL',
            location: `Unverified Bot Integrations (${unverifiedAdminBots.length})`,
            detail: `Unverified third-party bots hold full **Administrator** rights: \`${unverifiedAdminBots.slice(0, 3).join(', ')}\`. If these bots are compromised, your server can be nuked.`
        });
        hardeningSteps.push('Strip `Administrator` from unverified bots and replace with scoped, least-privilege permissions.');
    } else if (adminBots > 3) {
        score -= 5;
        vulnerabilities.push({
            severity: 'LOW',
            location: 'Over-privileged Bot Ecosystem',
            detail: `${adminBots} bots have global Administrator access. Violates the principle of least privilege.`
        });
    }

    // D. Audit Server Level Security Settings
    const verificationLevels = ['NONE (Unrestricted)', 'LOW (Verified Email)', 'MEDIUM (Registered > 5m)', 'HIGH (Member > 10m)', 'VERY HIGH (Verified Phone)'];
    const vLevel = guild.verificationLevel || 0;
    if (vLevel === 0) {
        score -= 15;
        vulnerabilities.push({
            severity: 'HIGH',
            location: 'Server Verification Level',
            detail: 'Verification level is set to **NONE**. Fresh throwaway accounts and self-bot raiders can join and spam with zero barrier.'
        });
        hardeningSteps.push('Set Server Verification Level to at least **MEDIUM** or **HIGH** in Server Settings.');
    }

    const explicitFilter = guild.explicitContentFilter || 0;
    if (explicitFilter === 0) {
        score -= 10;
        vulnerabilities.push({
            severity: 'MEDIUM',
            location: 'Explicit Content Filter',
            detail: 'Automated explicit media scanner is **DISABLED**. Attackers can post illicit media unchecked.'
        });
        hardeningSteps.push('Enable Explicit Media Content Filter to "Scan media from all members".');
    }

    if (guild.mfaLevel === 0) {
        score -= 10;
        vulnerabilities.push({
            severity: 'MEDIUM',
            location: '2FA Requirement for Moderation',
            detail: 'Server does **NOT** require Two-Factor Authentication (2FA) for staff. A moderator account with a compromised password can wipe channels or ban members.'
        });
        hardeningSteps.push('Enable "Require 2FA for Moderation" in Server Settings.');
    }

    score = Math.max(0, Math.min(100, score));

    // Determine Defense Grade & Color
    let grade = 'A+ [FORTRESS]';
    let gradeColor = '#2ECC71';
    let gradeBadge = '🛡️ FORTIFIED';

    if (score >= 90) {
        grade = 'S-Tier (90-100) • FORTRESS';
        gradeColor = '#2ECC71';
        gradeBadge = '🛡️ FORTRESS';
    } else if (score >= 75) {
        grade = 'A-Tier (75-89) • GUARDED';
        gradeColor = '#3498DB';
        gradeBadge = '🟡 GUARDED';
    } else if (score >= 55) {
        grade = 'B-Tier (55-74) • EXPLOITABLE';
        gradeColor = '#E67E22';
        gradeBadge = '🟠 ELEVATED RISK';
    } else if (score >= 35) {
        grade = 'C-Tier (35-54) • SEVERE GAPS';
        gradeColor = '#E74C3C';
        gradeBadge = '🔴 SEVERE GAPS';
    } else {
        grade = 'F-Tier (<35) • CRITICAL BREACH RISK';
        gradeColor = '#992D22';
        gradeBadge = '☠️ CRITICAL HAZARD';
    }

    // E. Gemini AI Ethical Hacker Threat Modeling
    let aiThreatModel = null;
    const apiKey = getGeminiApiKey();

    if (apiKey && loopholesFound.length > 0) {
        try {
            const prompt = `You are a world-class Elite White-Hat Ethical Hacker & Discord Security Architect.
Analyze this Discord server security audit data:
- Server: "${guild.name}"
- Members: ${guild.memberCount}
- Security Score: ${score}/100 (Grade: ${gradeBadge})
- Discovered Loopholes:
${loopholesFound.map(l => '- ' + l).join('\n')}

Synthesize an authentic Ethical Hacker Pentest Briefing in 2 clean, concise paragraphs:
1. "🎭 Exploit Vector Simulation": Explain how a real malicious attacker or raid group would chain these exact loopholes together to compromise or damage this server.
2. "⚡ Surgical Hardening Directives": Provide the top 2-3 most critical, immediate fixes.
Keep it strictly professional, technical, urgent, and formatted in clean markdown bullet points. Do not include introductory fluff.`;

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 500, temperature: 0.3 }
                })
            });

            if (res.ok) {
                const data = await res.json();
                aiThreatModel = data.candidates?.[0]?.content?.parts?.[0]?.text;
            }
        } catch (err) {
            console.error('⚠️ [CyberSec Pentest Gemini AI Error]:', err.message);
        }
    }

    // Heuristic Fallback Threat Model if AI unavailable
    if (!aiThreatModel) {
        if (loopholesFound.length === 0) {
            aiThreatModel = `✅ **Security Posture Optimal**: No high-risk permission leaks or unverified admin integrations detected. The server follows the principle of least privilege. Maintain regular audits when adding new roles or bot integrations.`;
        } else {
            aiThreatModel = `⚠️ **Exploit Vector Simulation**:\nAn adversary joining with a freshly generated account could exploit channel override misconfigurations to execute unthrottled mass mentions, create untracked webhooks for phishing broadcasts, or flood announcement channels.\n\n⚡ **Surgical Hardening Directives**:\n• Deny \`Mention @everyone\` and \`Manage Webhooks\` across all channel overrides.\n• Enforce at least Medium verification level and staff 2FA.`;
        }
    }

    // Build Forensic Discord Embed
    const embed = new EmbedBuilder()
        .setColor(gradeColor)
        .setTitle(`🛡️ White-Hat Pentest & Loophole Audit: ${guild.name}`)
        .setDescription(`**Defensive Rating:** \`${grade}\`\n**Security Score:** \`${score}/100\` • **Audited Entities:** \`${channels.length}\` Channels, \`${guild.roles?.cache?.size || 0}\` Roles, \`${bots.length}\` Bots\n\n*Executed by Starry Autonomous CyberSec Engine (100% Discord API & ToS Compliant)*`)
        .addFields(
            {
                name: '🧮 Vulnerability Assessment Matrix',
                value: vulnerabilities.length > 0 
                    ? vulnerabilities.slice(0, 4).map(v => `• [**${v.severity}**] **${v.location}**: ${v.detail}`).join('\n')
                    : '🟢 **Zero Critical Vulnerabilities Detected!** Server permission matrix is tightly secured.',
                inline: false
            },
            {
                name: '🧠 AI Ethical Hacker Threat Simulation',
                value: aiThreatModel.length > 1020 ? aiThreatModel.slice(0, 1017) + '...' : aiThreatModel,
                inline: false
            },
            {
                name: '🛡️ Server Gate Hardening Status',
                value: `• **Verification Level:** \`${verificationLevels[vLevel]}\`\n• **Explicit Media Scanner:** \`${explicitFilter === 2 ? '🟢 All Members' : explicitFilter === 1 ? '🟡 Unverified' : '🔴 Disabled'}\`\n• **2FA Staff Requirement:** \`${guild.mfaLevel === 1 ? '🟢 Enabled' : '🔴 Disabled'}\`\n• **Admin Bots:** \`${adminBots}\` (${unverifiedAdminBots.length} unverified)`,
                inline: false
            }
        )
        .setFooter({ text: `Requested by ${requester?.tag || 'Member'} • Starry White-Hat Intelligence`, iconURL: requester?.displayAvatarURL?.() })
        .setTimestamp();

    // Interactive ActionRow Components
    const components = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('pentest_dm')
                .setLabel('Send Report to DM')
                .setEmoji('📬')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('pentest_blueprint')
                .setLabel('Admin Fix Blueprint')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('pentest_refresh')
                .setLabel('Re-Scan Server')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Success)
        )
    ];

    return { embed, components, score, grade, vulnerabilities, hardeningSteps, aiThreatModel };
}

/**
 * 2. PHISH-SHIELD DEEP LINK & MALWARE INSPECTOR
 * Inspects URLs for token logging, phishing, typosquatting, and deception
 */
async function scanUrlThreat(url, requester) {
    let cleanUrl = (url || '').trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
    }

    let parsed;
    try {
        parsed = new URL(cleanUrl);
    } catch (e) {
        return {
            embed: new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Invalid URL')
                .setDescription('Please provide a valid, well-formed URL (e.g. `https://example.com/login`).'),
            components: []
        };
    }

    const domain = parsed.hostname.toLowerCase();
    const full = parsed.href.toLowerCase();

    let threatLevel = 'SAFE';
    let threatColor = '#2ECC71';
    let riskScore = 0;
    const flags = [];

    // Check known token grabber/IP logger domains
    if (KNOWN_GRABBERS.some(g => domain.includes(g))) {
        threatLevel = 'MALICIOUS (CRITICAL)';
        threatColor = '#ED4245';
        riskScore += 95;
        flags.push('🚨 **Known IP Grabber / Token Harvester**: Matches verified signature of logger domain.');
    }

    // Check Phishing regex patterns
    if (PHISHING_PATTERNS.some(p => p.test(full))) {
        // Exclude legitimate domains
        const isLegit = domain === 'discord.com' || domain === 'discord.gg' || domain === 'discordapp.com' || domain === 'steampowered.com' || domain === 'steamcommunity.com' || domain === 'roblox.com';
        if (!isLegit) {
            threatLevel = 'MALICIOUS (CRITICAL)';
            threatColor = '#ED4245';
            riskScore += 90;
            flags.push('🚨 **Typosquatted Brand Phishing**: Domain or path mimics Discord / Steam / Nitro brand to harvest credentials.');
        }
    }

    // Check Suspicious TLDs
    if (SUSPICIOUS_TLDS.some(tld => domain.endsWith(tld))) {
        riskScore += 35;
        flags.push(`⚠️ **High-Risk TLD**: Utilizes low-reputation top-level domain frequently associated with throwaway phishing campaigns.`);
    }

    // Check query params for obfuscation or token scraping
    if (parsed.searchParams.has('token') || parsed.searchParams.has('auth') || parsed.searchParams.has('code') || parsed.searchParams.has('state')) {
        riskScore += 20;
        flags.push('⚠️ **Sensitive Auth Parameters**: URL passes authentication tokens or OAuth credentials in plaintext query parameters.');
    }

    if (riskScore >= 70) {
        threatLevel = 'MALICIOUS (CRITICAL)';
        threatColor = '#ED4245';
    } else if (riskScore >= 30) {
        threatLevel = 'SUSPICIOUS (ELEVATED RISK)';
        threatColor = '#F1C40F';
    }

    // AI Semantic Deception Scan via Gemini Flash
    let aiVerdict = null;
    const apiKey = getGeminiApiKey();
    if (apiKey) {
        try {
            const prompt = `You are a Senior Cyber Threat Intelligence Analyst.
Perform a threat assessment of this URL:
URL: ${cleanUrl}
Domain: ${domain}
Query: ${parsed.search || 'None'}
Automated Flags: ${flags.join('; ') || 'None'}

In 2-3 concise sentences:
1. Explain whether this link appears to be phishing, malware delivery, credential harvesting, or legitimate.
2. Give a definitive final recommendation (ALLOW, CAUTION, BLOCK).
Format cleanly in markdown.`;

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 300, temperature: 0.2 }
                })
            });

            if (res.ok) {
                const data = await res.json();
                aiVerdict = data.candidates?.[0]?.content?.parts?.[0]?.text;
            }
        } catch (err) {
            console.error('⚠️ [CyberSec Link Scan Gemini Error]:', err.message);
        }
    }

    if (!aiVerdict) {
        aiVerdict = threatLevel === 'SAFE' 
            ? '🟢 **Clean Heuristics**: Domain does not match known phishing signatures or credential harvesters. Standard web browsing precautions apply.'
            : '⚠️ **Hazard Warning**: URL matches known deceptive patterns or high-risk phishing infrastructure. **DO NOT enter passwords or authorize Discord bots via this link.**';
    }

    const embed = new EmbedBuilder()
        .setColor(threatColor)
        .setTitle(`🌐 PhishShield Deep Link Inspection`)
        .setDescription(`**Target Domain:** \`${domain}\`\n**Full URL:** \`${cleanUrl.slice(0, 100)}${cleanUrl.length > 100 ? '...' : ''}\`\n**Threat Verdict:** \`${threatLevel}\` (Risk Score: \`${riskScore}/100\`)`)
        .addFields(
            {
                name: '🔍 Forensic Signatures & Flags',
                value: flags.length > 0 ? flags.join('\n') : '🟢 **No Deceptive Heuristics Detected.** Domain topology appears standard.',
                inline: false
            },
            {
                name: '🧠 AI Cyber Threat Intelligence Verdict',
                value: aiVerdict,
                inline: false
            }
        )
        .setFooter({ text: `Requested by ${requester?.tag || 'User'} • Starry CyberSec Engine`, iconURL: requester?.displayAvatarURL?.() })
        .setTimestamp();

    return { embed, threatLevel, riskScore, flags };
}

/**
 * 3. USER THREAT & ALT ACCOUNT FORENSICS
 * Analyzes account age, velocity, and permission attack surface
 */
async function analyzeUserThreat(targetMember, requester) {
    if (!targetMember) return null;
    const user = targetMember.user;
    const now = Date.now();

    const createdDaysAgo = Math.floor((now - user.createdTimestamp) / (1000 * 60 * 60 * 24));
    const joinedDaysAgo = targetMember.joinedTimestamp 
        ? Math.floor((now - targetMember.joinedTimestamp) / (1000 * 60 * 60 * 24)) 
        : 0;

    let trustScore = 100;
    const riskIndicators = [];

    // Age evaluation
    if (createdDaysAgo < 1) {
        trustScore -= 50;
        riskIndicators.push('🚨 **Fresh Account**: Created less than 24 hours ago. Extreme raid/burner risk.');
    } else if (createdDaysAgo < 7) {
        trustScore -= 35;
        riskIndicators.push('⚠️ **Recent Alt Account Risk**: Created within the last 7 days.');
    } else if (createdDaysAgo < 30) {
        trustScore -= 15;
        riskIndicators.push('ℹ️ **Young Account**: Less than 30 days old.');
    }

    // Avatar evaluation
    if (!user.avatar) {
        trustScore -= 15;
        riskIndicators.push('⚠️ **Default Avatar**: No custom profile picture set.');
    }

    // Server tenure evaluation
    if (joinedDaysAgo < 1) {
        riskIndicators.push('⚡ **Joined Today**: Brand new presence in this server.');
    }

    // Permissions evaluation (Attack Surface)
    const dangerousHolding = [];
    for (const dp of DANGEROUS_PERMS) {
        if (targetMember.permissions.has(dp.bit)) {
            dangerousHolding.push(dp.name);
        }
    }

    let roleSeverity = 'Standard Member';
    if (targetMember.permissions.has(PermissionFlagsBits.Administrator)) {
        roleSeverity = '👑 Server Administrator';
    } else if (dangerousHolding.length > 0) {
        roleSeverity = `⚔️ Elevated Staff (${dangerousHolding.length} dangerous perms)`;
    }

    trustScore = Math.max(0, Math.min(100, trustScore));

    let verdict = '🟢 VERIFIED COMMUNITY MEMBER';
    let verdictColor = '#2ECC71';
    if (trustScore < 40) {
        verdict = '🔴 HIGH-RISK RAIDER / BURNER PROFILE';
        verdictColor = '#ED4245';
    } else if (trustScore < 70) {
        verdict = '🟡 ELEVATED SCRUTINY / SUSPECTED ALT';
        verdictColor = '#F1C40F';
    }

    const embed = new EmbedBuilder()
        .setColor(verdictColor)
        .setTitle(`👤 User Threat & Authenticity Dossier: ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(`**Forensic Trust Score:** \`${trustScore}%\` • **Verdict:** \`${verdict}\`\n**Account Type:** \`${user.bot ? '🤖 Bot Account' : '👤 Human User'}\` • **Privilege Tier:** \`${roleSeverity}\``)
        .addFields(
            {
                name: '📅 Chronological Timeline',
                value: `• **Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R> (\`${createdDaysAgo} days ago\`)\n• **Joined Server:** ${targetMember.joinedTimestamp ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R> (\`${joinedDaysAgo} days ago\`)` : '`Unknown`'}`,
                inline: true
            },
            {
                name: '🛡️ Threat Indicators',
                value: riskIndicators.length > 0 ? riskIndicators.join('\n') : '🟢 **No Suspicious Indicators.** Account age and profile metrics verify legitimate identity.',
                inline: false
            },
            {
                name: '⚔️ Dangerous Permissions Attack Surface',
                value: dangerousHolding.length > 0 
                    ? dangerousHolding.map(p => `\`${p}\``).join(', ') 
                    : '🟢 Standard member (Zero dangerous administrative permissions).',
                inline: false
            }
        )
        .setFooter({ text: `Audited by ${requester?.tag || 'Member'} • Starry CyberSec Dossier`, iconURL: requester?.displayAvatarURL?.() })
        .setTimestamp();

    return { embed, trustScore, verdict };
}

module.exports = {
    auditServerSecurity,
    scanUrlThreat,
    analyzeUserThreat,
    DANGEROUS_PERMS
};
