// commands/listlinks.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listlinks')
    .setDescription('List all linked Twitch accounts (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig(interaction.guild.id);

    // Check if there are any linked accounts
    if (!guildConfig.twitch.linkedAccounts || Object.keys(guildConfig.twitch.linkedAccounts).length === 0) {
      return await interaction.reply({
        content: '📋 No linked accounts found in this server.',
        ephemeral: true
      });
    }

    // Build the list
    const links = [];
    for (const [discordId, twitchUsername] of Object.entries(guildConfig.twitch.linkedAccounts)) {
      try {
        const user = await client.users.fetch(discordId);
        links.push(`• **${user.tag}** → \`${twitchUsername}\``);
      } catch (error) {
        // User not found (might have left the server)
        links.push(`• <@${discordId}> (Unknown User) → \`${twitchUsername}\``);
      }
    }

    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle('🔗 Linked Twitch Accounts')
      .setDescription(links.join('\n') || 'No links found')
      .setFooter({ text: `Total: ${links.length} linked account${links.length !== 1 ? 's' : ''}` })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
};