module.exports = {
  apps: [{
    name: 'openclaw-admin',
    script: './server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 10001,
      LOG_LEVEL: 'INFO'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 10001,
      LOG_LEVEL: 'WARN'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};
