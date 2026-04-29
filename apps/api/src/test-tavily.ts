import { tavily } from '@tavily/core';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runTest() {
  // eslint-disable-next-line no-console
  console.log('Testing Tavily API...');
  try {
    const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
    const response = await tvly.search('upcoming elections in India', { searchDepth: 'basic', maxResults: 1 });
    // eslint-disable-next-line no-console
    console.log('SUCCESS! Tavily search results:', JSON.stringify(response.results, null, 2));
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('ERROR during Tavily search:', errorMessage);
  }
}

runTest();
