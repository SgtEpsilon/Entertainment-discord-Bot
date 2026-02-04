const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nudgetiktok')
    .setDescription('Check and post latest TikTok posts'),
  
  async execute(interaction, client, config, monitors) {
    const guildConfig = getGuildConfig(interaction.guildId);
    
    await interaction.deferReply();
    
    if (!guildConfig.channelId) {
      return interaction.editReply('❌ Please set up a notification channel first using `/setup`!');
    }
    
    if (!guildConfig.tiktok || guildConfig.tiktok.usernames.length === 0) {
      return interaction.editReply('❌ No TikTok accounts configured to check!');
    }

    const latestPosts = await monitors.tiktokMonitor.checkSpecificAccounts(guildConfig.tiktok.usernames);
    
    if (latestPosts.length === 0) {
      return interaction.editReply('🔴 No recent posts found for monitored TikTok accounts.');
    }

    const embed = new EmbedBuilder()
      .setColor('#000000')
      .setTitle('🎵 Recent TikTok Posts Found')
      .setDescription(`Found ${latestPosts.length} recent post(s) from monitored accounts`)
      .setTimestamp();

    latestPosts.forEach((post, index) => {
      const username = post.author.uniqueId;
      const nickname = post.author.nickname || username;
      const description = post.desc || 'No description';
      const postUrl = `https://www.tiktok.com/@${username}/video/${post.id}`;
      
      embed.addFields({
        name: `${index + 1}. @${username} (${nickname})`,
        value: `${description.substring(0, 100)}${description.length > 100 ? '...' : ''}\n[View Post](${postUrl})`,
        inline: false
      });
    });

    const options = [
      {
        label: '✅ Post All',
        description: `Post all ${latestPosts.length} post(s) to the notification channel`,
        value: 'post-all',
        emoji: '📤'
      }
    ];

    latestPosts.slice(0, 24).forEach((post, index) => {
      const username = post.author.uniqueId;
      const description = post.desc || 'No description';
      options.push({
        label: `@${username}`.substring(0, 100),
        description: `${description.substring(0, 50)}`.substring(0, 100),
        value: `post-${index}`,
        emoji: '🎬'
      });
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('nudgetiktok-select')
      .setPlaceholder('Choose which posts to share')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.editReply({
      embeds: [embed],
      components: [row]
    });

    try {
      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 120000
      });

      collector.on('collect', async i => {
        const selection = i.values[0];
        
        try {
          const notificationChannel = await client.channels.fetch(guildConfig.channelId);
          
          if (selection === 'post-all') {
            for (const post of latestPosts) {
              const username = post.author.uniqueId;
              let message = guildConfig.tiktok.message;

              if (guildConfig.tiktok.customMessages && guildConfig.tiktok.customMessages[username]) {
                message = guildConfig.tiktok.customMessages[username];
              }

              message = message
                .replace(/{username}/g, post.author.nickname || username)
                .replace(/{description}/g, post.desc || 'No description')
                .replace(/{url}/g, `https://www.tiktok.com/@${username}/video/${post.id}`);

              const postUrl = `https://www.tiktok.com/@${username}/video/${post.id}`;
              await notificationChannel.send(`${message}\n${postUrl}`);
              
              // Add delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await i.update({
              content: `✅ Posted all ${latestPosts.length} post(s) to ${notificationChannel}!`,
              embeds: [],
              components: []
            });
            console.log(`Manual TikTok check by ${interaction.user.tag} in guild ${interaction.guildId}: posted ${latestPosts.length} posts`);
          } else {
            const postIndex = parseInt(selection.split('-')[1]);
            const post = latestPosts[postIndex];
            const username = post.author.uniqueId;

            let message = guildConfig.tiktok.message;
            
            if (guildConfig.tiktok.customMessages && guildConfig.tiktok.customMessages[username]) {
              message = guildConfig.tiktok.customMessages[username];
            }

            message = message
              .replace(/{username}/g, post.author.nickname || username)
              .replace(/{description}/g, post.desc || 'No description')
              .replace(/{url}/g, `https://www.tiktok.com/@${username}/video/${post.id}`);

            const postUrl = `https://www.tiktok.com/@${username}/video/${post.id}`;
            await notificationChannel.send(`${message}\n${postUrl}`);

            await i.update({
              content: `✅ Posted TikTok from **@${username}** to ${notificationChannel}!\n\n**Description:** ${post.desc || 'No description'}`,
              embeds: [],
              components: []
            });
            console.log(`Manual TikTok check by ${interaction.user.tag} in guild ${interaction.guildId}: posted 1 post`);
          }
        } catch (error) {
          console.error('Error posting to channel:', error);
          await i.update({
            content: '❌ Error posting to the notification channel!',
            embeds: [],
            components: []
          });
        }

        collector.stop();
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          interaction.editReply({
            content: '⏱️ Selection timed out. No posts were shared.',
            embeds: [],
            components: []
          }).catch(console.error);
        }
      });

    } catch (error) {
      console.error('Error handling post selection:', error);
      await interaction.editReply({
        content: '❌ An error occurred. Please try again.',
        embeds: [],
        components: []
      });
    }
  }
};
