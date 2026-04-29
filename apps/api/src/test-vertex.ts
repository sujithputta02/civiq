import { VertexAI } from '@google-cloud/vertexai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from apps/api/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testVertex() {
  console.log('--- Vertex AI Connection Test ---');
  console.log('Project:', 'civiq-494613');
  console.log('Location:', 'us-central1');
  console.log('Credentials Path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

  const vertexAI = new VertexAI({ 
    project: 'civiq-494613', 
    location: 'us-central1' 
  });

  const model = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' });

  try {
    console.log('\nSending test prompt: "Hello, are you there?"');
    const result = await model.generateContent('Hello, are you there?');
    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (text) {
      console.log('\n✅ SUCCESS!');
      console.log('Response:', text);
    } else {
      console.log('\n⚠️ RECEIVED EMPTY RESPONSE');
      console.log('Full Response Object:', JSON.stringify(result.response, null, 2));
    }
  } catch (error: any) {
    console.error('\n❌ FAILED');
    console.error('Error Message:', error.message);
    if (error.stack) console.error('Stack Trace:', error.stack);
  }
}

testVertex();
