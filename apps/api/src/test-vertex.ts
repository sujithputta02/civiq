import { VertexAI } from '@google-cloud/vertexai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from apps/api/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testVertex() {
  // eslint-disable-next-line no-console
  console.log('--- Vertex AI Connection Test ---');
  // eslint-disable-next-line no-console
  console.log('Project:', 'civiq-494613');
  // eslint-disable-next-line no-console
  console.log('Location:', 'us-central1');
  // eslint-disable-next-line no-console
  console.log('Credentials Path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

  const vertexAI = new VertexAI({ 
    project: 'civiq-494613', 
    location: 'us-central1' 
  });

  const model = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' });

  try {
    // eslint-disable-next-line no-console
    console.log('\nSending test prompt: "Hello, are you there?"');
    const result = await model.generateContent('Hello, are you there?');
    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (text) {
      // eslint-disable-next-line no-console
      console.log('\n✅ SUCCESS!');
      // eslint-disable-next-line no-console
      console.log('Response:', text);
    } else {
      // eslint-disable-next-line no-console
      console.log('\n⚠️ RECEIVED EMPTY RESPONSE');
      // eslint-disable-next-line no-console
      console.log('Full Response Object:', JSON.stringify(result.response, null, 2));
    }
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('\n❌ FAILED');
    const errorMessage = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error('Error Message:', errorMessage);
    if (error instanceof Error && error.stack) {
      // eslint-disable-next-line no-console
      console.error('Stack Trace:', error.stack);
    }
  }
}

testVertex();
