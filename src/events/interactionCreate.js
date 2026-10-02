const { handleTicketInteraction } = require("../modules/tickets/ticketManager");
const { handleNormalVerification } = require("../modules/verification/normalVerify");
const { handleVideoVerification } = require("../modules/verification/videoVerify");
const { handleDevInteraction } = require("../modules/dev/devPanelManager");
const { handleHelpSelectInteraction } = require("../commands/utility/help");
const { handleMusicInteraction } = require("../utils/musicManager");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      // 0. HELP MENU SELECT INTERACTIONS
      if (interaction.isStringSelectMenu() && interaction.customId === "help_category_select") {
        return await handleHelpSelectInteraction(interaction, client);
      }

      // 0.1 MUSIC INTERACTIONS (Buttons & DSP Filters)
      if (
        (interaction.customId && interaction.customId.startsWith("music_")) ||
        (interaction.customId && interaction.customId.startsWith("dj_"))
      ) {
        return await handleMusicInteraction(interaction, client);
      }

      // 0.2 DEVELOPER DASHBOARD INTERACTIONS
      if (
        (interaction.customId && interaction.customId.startsWith("dev_")) ||
        (interaction.customId && interaction.customId.startsWith("modal_dev_"))
      ) {
        return await handleDevInteraction(interaction, client);
      }

      // 1. TICKET INTERACTIONS
      if (
        (interaction.customId && interaction.customId.startsWith("ticket_")) ||
        (interaction.customId && interaction.customId.startsWith("modal_ticket_"))
      ) {
        return await handleTicketInteraction(interaction, client);
      }

      // 2. NORMAL VERIFICATION
      if (
        (interaction.customId && interaction.customId.startsWith("verify_user_")) ||
        interaction.customId === "modal_verify_captcha"
      ) {
        return await handleNormalVerification(interaction, client);
      }

      // 3. VIDEO VERIFICATION IN VC
      if (
        (interaction.customId && interaction.customId.startsWith("video_verify_")) ||
        (interaction.customId && interaction.customId.startsWith("vcverify_")) ||
        (interaction.customId && interaction.customId.startsWith("modal_vcverify_"))
      ) {
        return await handleVideoVerification(interaction, client);
      }

      // 4. SLASH COMMANDS
      if (interaction.isChatInputCommand()) {
        const commandName = interaction.commandName.toLowerCase();
        const command = client.commands.get(commandName);

        if (!command) {
          console.warn(`[SlashCommand] Unknown command: ${commandName}`);
          return interaction.reply({ content: "❌ Command not recognized or disabled.", ephemeral: true });
        }

        // Permission check
        if (command.permissions && interaction.member) {
          const hasPerm = command.permissions.every((p) => interaction.member.permissions.has(p));
          if (!hasPerm) {
            return interaction.reply({
              content: `❌ You lack the required permissions to execute \`/${commandName}\`.`,
              ephemeral: true,
            });
          }
        }

        try {
          await command.execute(interaction, [], client);
        } catch (error) {
          console.error(`[SlashCommand Error] /${commandName}:`, error);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: `❌ Error: ${error.message}`, ephemeral: true }).catch(() => null);
          } else {
            await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true }).catch(() => null);
          }
        }
      }
    } catch (topError) {
      console.error("[interactionCreate Error]:", topError);
    }
  },
};
