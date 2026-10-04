const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Set up the roles given to new members when they join.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addRoleOption(option => 
            option.setName('role1')
            .setDescription('The primary role to assign to new members')
            .setRequired(true)
        )
        .addRoleOption(option => 
            option.setName('role2')
            .setDescription('An additional role to assign')
            .setRequired(false)
        )
        .addRoleOption(option => 
            option.setName('role3')
            .setDescription('An additional role to assign')
            .setRequired(false)
        )
        .addBooleanOption(option => 
            option.setName('sticky_roles')
            .setDescription('Enable or Disable Sticky Roles (restores roles if they leave and rejoin)')
            .setRequired(false)
        ),
        
    // Your index.js requires an execute function to exist, but since 
    // modules/autorole.js handles the logic, we just leave this empty to prevent crashes!
    execute: async (interaction) => {
        // Handled globally by src/modules/autorole.js
    }
};
