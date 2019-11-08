const dotenv = require('dotenv');

const result = dotenv.config();

if (result.error) {
  console.log(`Cant find .env file`);
  console.error(result.error);
}

console.log(result.parsed);

const sharedConfig = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SERVICE_DISCOVERY_URL: process.env.SERVICE_DISCOVERY_URL ||'<not set>',
  SERVICE_NAME: process.env.SERVICE_NAME ||'<not set>',
  SERVICE_VERSION: process.env.SERVICE_VERSION ||'<not set>',
};

const config = {
  development: {
    ...sharedConfig
  },
  production: {
    ...sharedConfig
  }
};

function get(env) {

  const settings = config[env];

  if (!settings) {
    console.error(`Cant get settings for NODE_ENV`);
    return {};
  }

  return settings;
}

module.exports = get((process.env.NODE_ENV ||'development'));


