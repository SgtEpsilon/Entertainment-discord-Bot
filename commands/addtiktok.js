const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, saveConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addtiktok')
    .setDescription('Add a TikTok account to the monitoring list')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction, client, config, monitors) {
    const modal = new ModalBuilder()
      .setCustomId('addtiktok-modal')
      .setTitle('Add TikTok Account');

    const usernameInput = new TextInputBuilder()
      .setCustomId('username')
      .setLabel('TikTok Username (without @)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., charlidamelio, khaby.lame')
      .setRequired(true)
      .setMinLength(2)
      .setMaxLength(24);

    const messageInput = new TextInputBuilder()
      .setCustomId('custom-message')
      .setLabel('Custom Notification (Optional)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Leave blank for default. Use: {username}, {description}, {url}')
      .setRequired(false)
      .setMaxLength(500);

    const usernameRow = new ActionRowBuilder().addComponents(usernameInput);
    const messageRow = new ActionRowBuilder().addComponents(messageInput);
    modal.addComponents(usernameRow, messageRow);

    await interaction.showModal(modal);

    try {
      const submitted = await interaction.awaitModalSubmit({
        time: 300000,
        filter: i => i.user.id === interaction.user.id && i.customId === 'addtiktok-modal'
      });

      await submitted.deferReply({ ephemeral: true });

      let username = submitted.fields.getTextInputValue('username').toLowerCase().trim();
      const customMessage = submitted.fields.getTextInputValue('custom-message').trim() || null;

      // Remove @ if user included it
      username = username.replace(/^@/, '');

      // Basic validation
      if (!/^[a-zA-Z0-9._]{2,24}$/.test(username)) {
        return submitted.editReply('❌ Invalid TikTok username format. Usernames must be 2-24 characters and can only contain letters, numbers, dots, and underscores.');
      }

      const guildConfig = getGuildConfig(interaction.guildId);

      // Initialize TikTok config if it doesn't exist
      if (!guildConfig.tiktok) {
        guildConfig.tiktok = {
          usernames: [],
          checkInterval: 300000,
          message: "🎵 {username} just posted on TikTok!\n**{description}**",
          customMessages: {}
        };
      }

      if (guildConfig.tiktok.usernames.includes(username)) {
        return submitted.editReply(`❌ **@${username}** is already being monitored!`);
      }

      // Validate TikTok account exists
      try {
        await submitted.editReply('⏳ Validating TikTok account...');
        const isValid = await monitors.tiktokMonitor.validateUsername(username);
        if (!isValid) {
          return submitted.editReply(`❌ TikTok user **@${username}** does not exist or could not be found. Please check the username and try again.`);
        }
      } catch (error) {
        console.error(`Error validating TikTok user ${username}:`, error.message);
        return submitted.editReply(`❌ Error validating TikTok user **@${username}**. Please verify the username and try again.`);
      }

      guildConfig.tiktok.usernames.push(username);

      if (customMessage) {
        if (!guildConfig.tiktok.customMessages) {
          guildConfig.tiktok.customMessages = {};
        }
        guildConfig.tiktok.customMessages[username] = customMessage;
      }

      if (saveConfig()) {
        let reply = `✅ Added **@${username}** to the TikTok monitoring list!\n\nThe bot will check for new posts every 5 minutes.`;
        
        if (customMessage) {
          reply += `\n\n**Custom notification set:**\n\`\`\`${customMessage}\`\`\``;
        } else {
          reply += `\n\n**Using default notification:**\n\`\`\`${guildConfig.tiktok.message}\`\`\``;
        }

        await submitted.editReply(reply);
        console.log(`Guild ${interaction.guildId} added @${username} to TikTok monitoring${customMessage ? ' with custom message' : ''}`);
      } else {
        await submitted.editReply('❌ Error saving configuration. Please try again.');
      }

    } catch (error) {
      if (error.code !== 'InteractionCollectorError') {
        console.error('Error handling modal submission:', error);
      }
    }
  }
};
