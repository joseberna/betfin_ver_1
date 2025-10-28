const dotenv = require('dotenv')

// Load env vars if env is not production
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: './server/config/local.env' })
}

module.exports = {
  PORT: process.env.PORT || 7777,
  JWT_SECRET: process.env.JWT_SECRET,
  MONGO_URI: process.env.MONGO_URI,
  NODE_ENV: process.env.NODE_ENV || 'development',
  INITIAL_CHIPS_AMOUNT: 100000,
  JWT_TOKEN_EXPIRES_IN: process.env.JWT_TOKEN_EXPIRES_IN || '1h',
  JWT_SET_COOKIE: process.env.JWT_SET_COOKIE || 'false',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  APP_DOMAIN: process.env.APP_DOMAIN || 'localhost',
  APP_ORIGIN: process.env.APP_ORIGIN || 'http://localhost:3000',
}
