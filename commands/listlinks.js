const { SlashCommandBuilder: SlashCommandBuilder3, PermissionFlagsBits, EmbedBuilder: EmbedBuilder2 } = require('discord.js');
const { getGuildConfig: getGuildConfig3 } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder3()
    .setName('listlinks')
    .setDescription('List all linked Twitch accounts (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client, config) {
    const guildConfig = getGuildConfig3(interaction.guild.id);

    if (!guildConfig.twitch?.linkedAccounts || Object.keys(guildConfig.twitch.linkedAccounts).length === 0) {
      return await interaction.reply({
        content: '📋 No linked accounts found in this server.',
        ephemeral: true
      });
    }

    const links = [];
    for (const [discordId, twitchUsername] of Object.entries(guildConfig.twitch.linkedAccounts)) {
      try {
        const user = await client.users.fetch(discordId);
        links.push(`• **${user.tag}** → \`${twitchUsername}\``);
      } catch (error) {
        links.push(`• <@${discordId}> (Unknown User) → \`${twitchUsername}\``);
      }
    }

    const embed = new EmbedBuilder2()
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