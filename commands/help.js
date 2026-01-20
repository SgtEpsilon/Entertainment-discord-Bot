// commands/help.js
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),
  
  async execute(interaction, client, config) {
    // Categorize commands
    const categories = {
      'Server Setup': [],
      'Account Linking': [],
      'Twitch Monitoring': [],
      'YouTube Monitoring': [],
      'Utility': []
    };

    // Command categorization mapping
    const commandCategories = {
      'setup': 'Server Setup',
      'setrole': 'Server Setup',
      'removerole': 'Server Setup',
      'linkaccount': 'Account Linking',
      'unlinkaccount': 'Account Linking',
      'manuallink': 'Account Linking',
      'listlinks': 'Account Linking',
      'addstreamer': 'Twitch Monitoring',
      'removestreamer': 'Twitch Monitoring',
      'liststreamers': 'Twitch Monitoring',
      'nudgetwitch': 'Twitch Monitoring',
      'addchannel': 'YouTube Monitoring',
      'removechannel': 'YouTube Monitoring',
      'listchannels': 'YouTube Monitoring',
      'nudgeyt': 'YouTube Monitoring',
      'help': 'Utility'
    };

    // Icons for each category
    const categoryIcons = {
      'Server Setup': '⚙️',
      'Account Linking': '🔗',
      'Twitch Monitoring': '🎮',
      'YouTube Monitoring': '📺',
      'Utility': '🛠️'
    };

    // Dynamically load all commands
    client.commands.forEach((command) => {
      const commandName = command.data.name;
      const commandDesc = command.data.description || 'No description';
      const category = commandCategories[commandName] || 'Utility';
      
      categories[category].push(`\`/${commandName}\` - ${commandDesc}`);
    });

    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle('🤖 Discord Streaming Bot - Help Menu')
      .setDescription('Monitor Twitch streams and YouTube uploads with automatic notifications!');

    // Add fields for each category that has commands
    for (const [categoryName, commands] of Object.entries(categories)) {
      if (commands.length > 0) {
        const icon = categoryIcons[categoryName] || '📌';
        embed.addFields({
          name: `${icon} ${categoryName}`,
          value: commands.join('\n'),
          inline: false
        });
      }
    }

    // Add additional info fields
    embed.addFields(
      {
        name: '💡 How It Works',
        value: '**Automatic Monitoring:**\n• Twitch streams checked every 60 seconds\n• YouTube uploads checked every 5 minutes\n• Notifications sent to your configured channel\n\n**Live Role System:**\n• Link your Twitch account with `/linkaccount`\n• Stream on Twitch → Get live role automatically\n• Stop streaming → Role removed automatically',
        inline: false
      },
      {
        name: '📝 Quick Start',
        value: '```\n1. /setup channel:#notifications liverole:@Live\n2. /linkaccount (enter your Twitch username)\n3. /addstreamer username:shroud\n4. Start streaming → Auto role!\n```',
        inline: false
      },
      {
        name: '🎯 YouTube Channel Formats',
        value: '• `@handle` - Example: `@MrBeast`\n• Full URL - Example: `https://youtube.com/@LinusTechTips`\n• Channel ID - Example: `UCX6OQ3DkcsbYNE6H8uQQuVA`',
        inline: false
      }
    );

    embed.setFooter({ text: `${client.commands.size} commands loaded • Each server has its own configuration!` });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};