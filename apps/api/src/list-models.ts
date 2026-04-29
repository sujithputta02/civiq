import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listModels() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return console.error('No API Key');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    // There isn't a direct listModels in the main SDK easily accessible this way, 
    // but we can try common names.
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.5-flash-latest'];
    console.log('Testing models...');
    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        await model.generateContent('test');
        console.log(`✅ ${m} works!`);
      } catch (e: any) {
        console.log(`❌ ${m} failed: ${e.message}`);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

listModels();
