module.exports = {
  apps: [
    {
      name: process.env.APP_NAME || 'nestjs-backend-starter',
      script: 'dist/main.js',
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: process.env.PM2_MAX_MEMORY || '512M',
      env: { NODE_ENV: process.env.NODE_ENV || 'development', PORT: process.env.PORT || 3000 },
      env_production: { NODE_ENV: 'production', PORT: process.env.PORT || 3000 },
    },
  ],
};
