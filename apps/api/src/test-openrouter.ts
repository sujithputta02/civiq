/* eslint-disable @typescript-eslint/naming-convention */
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env explicitly
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { aiService } from './modules/ai/ai.service.js';

async function run() {
  /* eslint-disable no-console */
  console.log('Testing OpenRouter + Tavily Fallback Flow...');

  // Force Gemini to fail so it falls back
  process.env.GOOGLE_AI_API_KEY = 'invalid_key_to_force_fallback';

  console.log('\n--- Testing verifyClaim with real-time web search ---');
  try {
    const claimResult = await aiService.verifyClaim('is there any upcoming elections in India ?');
    console.log('\n--- VERIFICATION RESULT ---');
    console.log(JSON.stringify(claimResult, null, 2));
  } catch (err) {
    console.error('verifyClaim Error:', err);
  }
  /* eslint-enable no-console */
}

run();
