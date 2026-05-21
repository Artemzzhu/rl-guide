module.exports = {
  apps: [
    {
      name: 'rl-guide',
      script: 'server/index.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
  ],
};
