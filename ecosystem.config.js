module.exports = {
  apps: [
    {
      name: "mina-bot",
      script: "src/boot.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 15,
      min_uptime: "10s",
      max_memory_restart: "1G",
      restart_delay: 2000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
