const { PermissionsBitField } = require('discord.js');

module.exports = (client) => {
    // 🟢 The Safe List: Add any websites here that you WANT people to be able to link!
    const safeDomains = [
        'tenor.com',            // Discord GIFs
        'giphy.com',            // Discord GIFs
        'imgur.com',            // Image hosting
        'cdn.discordapp.com',   // Discord attachments
        'media.discordapp.net', // Discord media
        'youtube.com',          // YouTube videos
        'youtu.be',             // YouTube short links
        'spotify.com',          // Spotify songs
        'prnt.sc'               // Lightshot screenshots
    ];

    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;

        // Admins and Moderators (anyone with 'Manage Messages') can post any link they want
        if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

        // Regex to detect ANY link in a message
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const links = message.content.match(urlRegex);

        if (links) {
            let isBadLink = false;

            // Check every link in the message against our Safe List and GIF check
            for (const link of links) {
                const isSafeDomain = safeDomains.some(domain => link.toLowerCase().includes(domain));
                
                let isGifFile = false;
                try {
                    // Check if the actual file path ends in .gif to allow random GIF sites
                    const parsedUrl = new URL(link);
                    if (parsedUrl.pathname.toLowerCase().endsWith('.gif')) {
                        isGifFile = true;
                    }
                } catch (err) {
                    // Fallback just in case the URL structure is deeply weird
                    if (link.toLowerCase().includes('.gif')) {
                        isGifFile = true;
                    }
                }

                // If it is NOT a safe domain AND NOT a direct GIF file, flag it for deletion
                if (!isSafeDomain && !isGifFile) {
                    isBadLink = true; 
                    break;
                }
            }

            // If a bad link was found, delete the message and warn the user
            if (isBadLink) {
                await message.delete().catch(() => {});
                
                const warningMsg = await message.channel.send(`⚠️ <@${message.author.id}>, please do not post unauthorized links here!`);
                setTimeout(() => warningMsg.delete().catch(() => {}), 5000); 
            }
        }
    });
};
                    
