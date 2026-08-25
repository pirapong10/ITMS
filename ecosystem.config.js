module.exports = {
  apps: [
    {
      name: 'itsm-enterprise',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
    },
  ],
};
