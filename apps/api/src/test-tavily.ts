import { tavily } from '@tavily/core';

async function runTest() {
  console.log('Testing Tavily API...');
  try {
    const tvly = tavily({ apiKey: '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' });
    const response = await tvly.search('upcoming elections in India', { searchDepth: 'basic', maxResults: 1 });
    console.log('SUCCESS! Tavily search results:', JSON.stringify(response.results, null, 2));
  } catch (err: any) {
    console.error('ERROR during Tavily search:', err.message || err);
  }
}

runTest();
