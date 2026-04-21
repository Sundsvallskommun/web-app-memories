import { config } from 'dotenv';

config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });
config({ path: `.env` });

export const {
  NODE_ENV = 'development',
  PORT = '3001',
  BASE_URL_PREFIX = '/api',
  API_BASE_URL = '',
  CLIENT_KEY = '',
  CLIENT_SECRET = '',
  MUNICIPALITY_ID = '2281',
  SECRET_KEY = 'change-me',
  SESSION_STORE = 'memory',
  ORIGIN = 'http://localhost:3000',
  CREDENTIALS,
  LOG_FORMAT = 'dev',
  LOG_DIR = './data/logs',
} = process.env;
