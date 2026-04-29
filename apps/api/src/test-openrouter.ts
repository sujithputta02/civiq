import * as dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { verifyClaim } from './services/gemini';

async function run() {
  console.log('Testing OpenRouter + Tavily Fallback Flow...');
  
  // Force Gemini to fail so it falls back
  process.env.GOOGLE_AI_API_KEY = 'invalid_key_to_force_fallback';

  console.log(`\n--- Testing verifyClaim with real-time web search ---`);
  try {
    const claimResult = await verifyClaim('is there any upcoming elections in India ?');
    console.log('\n--- VERIFICATION RESULT ---');
    console.log(JSON.stringify(claimResult, null, 2));
  } catch (err) {
    console.error('verifyClaim Error:', err);
  }
}

run();
