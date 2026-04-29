import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from apps/api/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testGemini() {
  // eslint-disable-next-line no-console
  console.log('--- Gemini API Connection Test ---');
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey || apiKey.includes('YOUR_GEMINI_API_KEY')) {
    // eslint-disable-next-line no-console
    console.error('❌ ERROR: GOOGLE_AI_API_KEY is not set correctly in .env');
    return;
  }

  // eslint-disable-next-line no-console
  console.log('API Key Found:', apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 5));

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  try {
    // eslint-disable-next-line no-console
    console.log('\nSending test prompt: "Hello, are you there?"');
    const result = await model.generateContent('Hello, are you there?');
    const text = result.response.text();
    
    if (text) {
      // eslint-disable-next-line no-console
      console.log('\n✅ SUCCESS!');
      // eslint-disable-next-line no-console
      console.log('Response:', text);
    } else {
      // eslint-disable-next-line no-console
      console.log('\n⚠️ RECEIVED EMPTY RESPONSE');
    }
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('\n❌ FAILED');
    const errorMessage = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error('Error Message:', errorMessage);
  }
}

testGemini();
