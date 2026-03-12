module.exports = {
  apps: [
    {
      name: 'printflow-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run dev',
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'printflow-store',
      cwd: './frontend-store',
      script: 'npm',
      args: 'run dev',
      watch: false,
      autorestart: true
    },
    {
      name: 'printflow-erp',
      cwd: './frontend-erp',
      script: 'npm',
      args: 'run dev',
      watch: false,
      autorestart: true
    }
  ]
};
