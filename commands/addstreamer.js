const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getGuildConfig, saveConfig } = require('../utils/config');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addstreamer')
    .setDescription('Add a Twitch streamer to the monitoring list with optional custom notification'),
  
  async execute(interaction, client, config, monitors) {
    const modal = new ModalBuilder()
      .setCustomId('addstreamer-modal')
      .setTitle('Add Twitch Streamer');

    const usernameInput = new TextInputBuilder()
      .setCustomId('username')
      .setLabel('Twitch Username')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., shroud, xqc, pokimane')
      .setRequired(true)
      .setMinLength(4)
      .setMaxLength(25);

    const messageInput = new TextInputBuilder()
      .setCustomId('custom-message')
      .setLabel('Custom Notification (Optional)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Leave blank for default. Use: {username}, {title}, {game}, {url}')
      .setRequired(false)
      .setMaxLength(500);

    const usernameRow = new ActionRowBuilder().addComponents(usernameInput);
    const messageRow = new ActionRowBuilder().addComponents(messageInput);
    modal.addComponents(usernameRow, messageRow);

    await interaction.showModal(modal);

    try {
      const submitted = await interaction.awaitModalSubmit({
        time: 300000,
        filter: i => i.user.id === interaction.user.id && i.customId === 'addstreamer-modal'
      });

      await submitted.deferReply();

      const username = submitted.fields.getTextInputValue('username').toLowerCase().trim();
      const customMessage = submitted.fields.getTextInputValue('custom-message').trim() || null;

      if (!/^[a-zA-Z0-9_]{4,25}$/.test(username)) {
        return submitted.editReply('❌ Invalid Twitch username format. Usernames must be 4-25 characters long and can only contain letters, numbers, and underscores.');
      }

      const guildConfig = getGuildConfig(interaction.guildId);

      if (guildConfig.twitch.usernames.includes(username)) {
        return submitted.editReply(`❌ **${username}** is already being monitored!`);
      }

      try {
        const isValid = await validateTwitchUser(username);
        if (!isValid) {
          return submitted.editReply(`❌ Twitch user **${username}** does not exist or could not be found. Please check the username and try again.`);
        }
      } catch (error) {
        console.error(`Error validating Twitch user ${username}:`, error.message);
        return submitted.editReply(`❌ Error validating Twitch user **${username}**. This could mean:\n• The username doesn't exist\n• Twitch API is unavailable\n• Invalid API credentials\n\nPlease verify the username and try again.`);
      }

      guildConfig.twitch.usernames.push(username);

      if (customMessage) {
        if (!guildConfig.twitch.customMessages) {
          guildConfig.twitch.customMessages = {};
        }
        guildConfig.twitch.customMessages[username] = customMessage;
      }

      if (saveConfig()) {
        let reply = `✅ Added **${username}** to the monitoring list!\n\nThe bot will check if they go live every minute.`;
        
        if (customMessage) {
          reply += `\n\n**Custom notification set:**\n\`\`\`${customMessage}\`\`\``;
        } else {
          reply += `\n\n**Using default notification:**\n\`\`\`${guildConfig.twitch.message}\`\`\``;
        }

        await submitted.editReply(reply);
        console.log(`Guild ${interaction.guildId} added ${username} to Twitch monitoring${customMessage ? ' with custom message' : ''}`);
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

async function validateTwitchUser(username) {
  try {
    const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials'
      }
    });

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      params: { login: username },
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return userResponse.data.data && userResponse.data.data.length > 0;
  } catch (error) {
    if (error.response?.status === 400) {
      return false;
    }
    throw error;
  }
}
