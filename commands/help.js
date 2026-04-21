// commands/help.js
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),

  async execute(interaction, client, config) {
    const categories = {
      'Server Setup': [],
      'Bot Management': [],
      'Account Linking': [],
      'Twitch Monitoring': [],
      'YouTube Monitoring': [],
      'Utility': []
    };

    const commandCategories = {
      'setup': 'Server Setup',
      'setrole': 'Server Setup',
      'removerole': 'Server Setup',
      'customstatus': 'Bot Management',
      'clearstatus': 'Bot Management',
      'reloadstatus': 'Bot Management',
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

    const categoryIcons = {
      'Server Setup': '⚙️',
      'Bot Management': '🎮',
      'Account Linking': '🔗',
      'Twitch Monitoring': '🟣',
      'YouTube Monitoring': '📺',
      'Utility': '🛠️'
    };

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

    embed.addFields(
      {
        name: '💡 How It Works',
        value: [
          '**Automatic Monitoring:**',
          '• Twitch streams checked every 60 seconds',
          '• YouTube uploads checked every 5 minutes',
          '• Notifications sent to your configured channel(s)',
          '',
          '**Live Role System:**',
          '• Link your Twitch account with `/linkaccount`',
          '• Stream on Twitch → Get live role automatically',
          '• Stop streaming → Role removed automatically'
        ].join('\n'),
        inline: false
      },
      {
        name: '🚀 Quick Start',
        value: [
          '```',
          '# Separate channels per platform:',
          '/setup twitchchannel:#twitch-live youtubechannel:#yt-uploads liverole:@Live',
          '',
          '# Or a single fallback channel:',
          '/setup channel:#notifications liverole:@Live',
          '',
          '/linkaccount          → enter your Twitch username',
          '/addstreamer          → add a Twitch streamer',
          '/addchannel channel:@MrBeast',
          '```'
        ].join('\n'),
        inline: false
      },
      {
        name: '📡 Channel Routing',
        value: [
          '• **`twitchchannel`** — dedicated channel for Twitch go-live notifications',
          '• **`youtubechannel`** — dedicated channel for YouTube upload notifications',
          '• **`channel`** — shared fallback used when no platform channel is set',
          '',
          'You can mix and match — e.g. set a Twitch-specific channel and leave YouTube to the fallback.'
        ].join('\n'),
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
