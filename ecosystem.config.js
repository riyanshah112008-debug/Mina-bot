module.exports = {
  apps: [
    {
      name: 'starry-bot',
      script: 'src/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '4G',
      restart_delay: 2000,
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      node_args: '--max-old-space-size=4096 --optimize-for-size',
      env: {
        NODE_ENV: 'production',
        UV_THREADPOOL_SIZE: 16
      }
    }
  ]
};

