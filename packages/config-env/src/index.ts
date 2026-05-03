import { cleanEnv, str, port, url, host } from 'envalid';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the root of the workspace if it exists
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 3005 }),
  FRONTEND_URL: url({ default: 'http://localhost:3000' }),
  CLOUD_SCHEDULER_SECRET: str({ desc: 'Secret for Cloud Scheduler authentication' }),
  GOOGLE_AI_API_KEY: str({ desc: 'API Key for Google Generative AI (Gemini)' }),
  TAVILY_API_KEY: str({ desc: 'API Key for Tavily search' }),
  OPENROUTER_API_KEY: str({ desc: 'API Key for OpenRouter fallback', default: '' }),
  OPENROUTER_MODEL: str({ default: 'nvidia/nemotron-3-super-120b-a12b:free' }),
  REDIS_URL: str({ desc: 'Redis connection URL', default: 'redis://localhost:6379' }),
});
