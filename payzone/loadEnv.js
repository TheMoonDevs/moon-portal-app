// loadEnv.js
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

function loadEnvironment() {
  // Determine which environment file to load based on NEXT_PUBLIC_ENV_TYPE
  const envType = process.env.NEXT_PUBLIC_ENV_TYPE || 'default';
  let envFile = '';

  switch (envType) {
    case 'preview':
      envFile = '.env';
      break;
    case 'production':
      envFile = '.env.production';
      break;
    default:
      envFile = '.env';
  }

  const envPath = path.resolve(process.cwd(), envFile);

  // Load the environment variables from the chosen file
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment variables from ${envFile}`);
    dotenv.config({ path: envPath });
  } else {
    console.warn(`Environment file ${envFile} not found. Falling back to default variables.`);
  }
}

module.exports = loadEnvironment;
