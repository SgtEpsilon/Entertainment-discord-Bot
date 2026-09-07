// PM2 process file for the Entertainment Discord Bot.
//
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 status
//   pm2 logs entertainment-bot
//   pm2 restart entertainment-bot
//   pm2 stop entertainment-bot
//   pm2 save && pm2 startup   (run once, so PM2 survives a server reboot)

module.exports = {
  apps: [
    {
      name: 'entertainment-bot',
      script: 'index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
