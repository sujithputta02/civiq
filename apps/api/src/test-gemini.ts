import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from apps/api/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testGemini() {
  console.log('--- Gemini API Connection Test ---');
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey || apiKey.includes('YOUR_GEMINI_API_KEY')) {
    console.error('❌ ERROR: GOOGLE_AI_API_KEY is not set correctly in .env');
    return;
  }

  console.log('API Key Found:', apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 5));

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  try {
    console.log('\nSending test prompt: "Hello, are you there?"');
    const result = await model.generateContent('Hello, are you there?');
    const text = result.response.text();
    
    if (text) {
      console.log('\n✅ SUCCESS!');
      console.log('Response:', text);
    } else {
      console.log('\n⚠️ RECEIVED EMPTY RESPONSE');
    }
  } catch (error: any) {
    console.error('\n❌ FAILED');
    console.error('Error Message:', error.message);
  }
}

testGemini();
