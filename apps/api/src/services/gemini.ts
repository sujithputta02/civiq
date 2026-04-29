import { type VerificationResult } from '@civiq/types';
import { tavily } from '@tavily/core';
import { adminDb } from './admin';
import { logToBigQuery } from './bigquery';
import { sanitizeInput, sanitizeLocation, truncateString } from '../utils/sanitize';

const MODEL_NAME = 'gemini-2.0-flash';

export async function verifyClaim(claim: string): Promise<VerificationResult> {
  // Security: Sanitize input to prevent prompt injection
  const sanitizedClaim = sanitizeInput(claim);
  
  const API_KEY = process.env.GOOGLE_AI_API_KEY || '';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

  let searchContext = '';
  try {
    const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
    const searchResponse = await tvly.search(sanitizedClaim, { searchDepth: 'basic', maxResults: 3 });
    if (searchResponse.results && searchResponse.results.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      searchContext = 'Real-time context from the web:\n' + searchResponse.results.map((r: any) => `- ${r.title}: ${r.content} (${r.url})`).join('\n') + '\n\n';
    }
  } catch (searchErr) {
    // eslint-disable-next-line no-console
    console.error('Tavily search failed:', searchErr);
  }

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const prompt = `
    You are an expert election misinformation verifier for the "Civiq" platform.
    Today's date is ${currentDate}.
    ${searchContext}
    Analyze the following claim about the election process: "${sanitizedClaim}"
    
    Classify it as one of: VERIFIED, UNVERIFIED, MISLEADING, FALSE.
    If there are upcoming elections, explicitly list what they are and when they are scheduled in your explanation.
    Provide a clear, neutral explanation based on trusted civic sources.
    Provide a source name or URL if possible.
    
    Return the result in JSON format:
    {
      "classification": "VERIFIED" | "UNVERIFIED" | "MISLEADING" | "FALSE",
      "explanation": "string",
      "source": "string"
    }
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from Gemini');
    
    const parsedResult = JSON.parse(text) as VerificationResult;
    await logToBigQuery('claim_verification', { claim: sanitizedClaim, result: parsedResult });
    return parsedResult;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error verifying claim, falling back to OpenRouter:', error);
    try {
      const openRouterKey = process.env.OPENROUTER_API_KEY;
      if (!openRouterKey) throw new Error('OpenRouter API key is not configured in environment variables');

      const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free',
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const orResult = await orResponse.json();
      // eslint-disable-next-line no-console
      console.log('OpenRouter Response for verifyClaim:', JSON.stringify(orResult, null, 2));
      if (orResult.error) {
        throw new Error(orResult.error.message || JSON.stringify(orResult.error));
      }
      
      let text = orResult.choices?.[0]?.message?.content;
      if (!text) throw new Error('No response from OpenRouter');
      
      // Clean up potential markdown JSON formatting
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      return JSON.parse(text) as VerificationResult;
    } catch (fallbackError) {
      // eslint-disable-next-line no-console
      console.error('Error verifying claim with fallback:', fallbackError);
      return {
        classification: 'UNVERIFIED',
        explanation: 'Sorry, we could not verify this claim at the moment.',
      };
    }
  }
}

export async function chatAssistant(userId: string, message: string, contextData: Record<string, unknown>, explanationMode: string = '1m'): Promise<string> {
  // Security: Sanitize inputs
  const sanitizedMessage = sanitizeInput(message);
  const sanitizedLocation = sanitizeLocation(typeof contextData?.location === 'string' ? contextData.location : 'Unknown');
  
  const API_KEY = process.env.GOOGLE_AI_API_KEY || '';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

  // Fetch existing history from Firestore
  const chatDocRef = adminDb.collection('users').doc(userId).collection('chat').doc('session');
  const chatDoc = await chatDocRef.get();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let history: any[] = chatDoc.exists ? chatDoc.data()?.messages || [] : [];

  let searchContext = '';
  try {
    const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
    const searchResponse = await tvly.search(sanitizedMessage, { searchDepth: 'basic', maxResults: 3 });
    if (searchResponse.results && searchResponse.results.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      searchContext = 'Real-time context from the web:\n' + searchResponse.results.map((r: any) => `- ${r.title}: ${r.content} (${r.url})`).join('\n') + '\n\n';
    }
  } catch (searchErr) {
    // eslint-disable-next-line no-console
    console.error('Tavily search failed:', searchErr);
  }

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const systemInstruction = `You are an expert election assistant for Civiq. 
Today's date is ${currentDate}. 
User Context: ${JSON.stringify(contextData)}

CRITICAL INSTRUCTIONS:
1. The user's location is explicitly set to: ${sanitizedLocation}. 
2. You MUST ONLY provide election procedures, deadlines, and rules specific to ${sanitizedLocation}. 
3. DO NOT provide information about United States elections (e.g., Georgia, USA) unless the user's location is explicitly in the US. If real-time web results show US data and the user is in India, IGNORE the web results and rely on your knowledge of Indian election procedures (e.g., ECI, NVSP portal, EPIC card).
4. If the user asks about voter ID, refer to the correct local terminology (e.g., EPIC in India).
5. You MUST tailor your output to this length constraint: "${truncateString(explanationMode, 10)}".
   - If "15s": Provide a highly concise, fast-read 15-second summary. Max 2 short sentences.
   - If "1m": Provide a comprehensive 1-minute quick guide. Max 1-2 short paragraphs.
   - If "deep": Provide a detailed, deep-dive explanation addressing edge cases and requirements.

Real-time Web Context (Use cautiously and verify it matches the user's location):
${searchContext}`;

  let finalReply = 'No response';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemInstruction }] },
          ...history,
          { role: 'user', parts: [{ text: sanitizedMessage }] }
        ]
      })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    finalReply = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in chat, falling back to OpenRouter:', error);
    try {
      const openRouterKey = process.env.OPENROUTER_API_KEY;
      if (!openRouterKey) throw new Error('OpenRouter API key is not configured in environment variables');
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages: any[] = [{ role: 'system', content: systemInstruction }];
      for (const h of history) {
        messages.push({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.parts?.[0]?.text || ''
        });
      }
      messages.push({ role: 'user', content: sanitizedMessage });

      const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free',
          messages
        })
      });
      const orResult = await orResponse.json();
      // eslint-disable-next-line no-console
      console.log('OpenRouter Response for chatAssistant:', JSON.stringify(orResult, null, 2));
      if (orResult.error) {
        throw new Error(orResult.error.message || JSON.stringify(orResult.error));
      }
      
      finalReply = orResult.choices?.[0]?.message?.content || 'No response';
    } catch (fallbackError) {
      // eslint-disable-next-line no-console
      console.error('Error in chat fallback:', fallbackError);
      finalReply = 'Failed to generate response.';
    }
  }

  // Save updated history
  if (finalReply !== 'Failed to generate response.') {
    history.push({ role: 'user', parts: [{ text: sanitizedMessage }] });
    history.push({ role: 'model', parts: [{ text: finalReply }] });
    
    // limit history size to prevent payload from getting too large (e.g., last 20 messages = 10 turns)
    if (history.length > 20) {
      history = history.slice(history.length - 20);
    }

    await chatDocRef.set({ messages: history }, { merge: true });
    await logToBigQuery('assistant_query', { userId, message: sanitizedMessage, explanationMode });
  }

  return finalReply;
}
