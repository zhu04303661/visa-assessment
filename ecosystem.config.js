module.exports = {
  apps: [
    {
      name: 'frontend',
      namespace: 'xichi',
      script: 'npm',
      args: 'run dev:80',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 80,
        COPYWRITING_API_URL: 'http://localhost:5005'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 80,
        COPYWRITING_API_URL: 'http://localhost:5005'
      }
    },
    {
      name: 'frontend-prod',
      namespace: 'xichi',
      script: 'npm',
      args: 'run start:80',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 80,
        COPYWRITING_API_URL: 'http://localhost:5005'
      }
    },
    {
      name: 'backend-api',
      namespace: 'xichi',
      script: 'python3',
      args: 'api_server.py',
      cwd: './ace_gtv',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        PORT: 5005,
        LOG_LEVEL: 'INFO',
        DEBUG: 'false'
      },
      env_production: {
        PORT: 5005,
        LOG_LEVEL: 'WARNING',
        DEBUG: 'false'
      }
    }
  ]
};