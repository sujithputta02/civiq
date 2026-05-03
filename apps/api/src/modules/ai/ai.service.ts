import { type VerificationResult } from '@civiq/types';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { tavily } from '@tavily/core';
import circuitBreaker from 'opossum';
import { adminDb } from '../identity/admin.service.js';
import { logToBigQuery } from '../security/bigquery.service.js';
import { sanitizeInput, sanitizeLocation, truncateString } from '../../utils/sanitize.js';
import logger from '../../utils/logger.js';
import { env } from '@civiq/config-env';

const MODEL_NAME = 'gemini-2.0-flash';

const breakerOptions = {
  timeout: 10000, // 10 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30 seconds
};

/**
 * Core AI Service with Circuit Breaker protection
 */
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message: string;
  };
}

export class AIService {
  private verifyBreaker: circuitBreaker<[string], VerificationResult>;
  private chatBreaker: circuitBreaker<[string, string, Record<string, unknown>, string?], string>;

  public constructor() {
    this.verifyBreaker = new circuitBreaker(this.performVerifyClaim.bind(this), breakerOptions);
    this.chatBreaker = new circuitBreaker(this.performChatAssistant.bind(this), breakerOptions);

    this.setupBreakerEvents(this.verifyBreaker, 'AI_Verify');
    this.setupBreakerEvents(this.chatBreaker, 'AI_Chat');
  }

  private setupBreakerEvents(breaker: circuitBreaker<unknown[], unknown>, name: string) {
    breaker.on('open', () => logger.warn(`${name} Circuit Breaker OPEN`));
    breaker.on('halfOpen', () => logger.info(`${name} Circuit Breaker HALF_OPEN`));
    breaker.on('close', () => logger.info(`${name} Circuit Breaker CLOSED`));
    breaker.on('fallback', () => logger.warn(`${name} Circuit Breaker FALLBACK triggered`));
  }

  public async verifyClaim(claim: string): Promise<VerificationResult> {
    return this.verifyBreaker.fire(claim);
  }

  public async chatAssistant(
    userId: string,
    message: string,
    contextData: Record<string, unknown>,
    explanationMode: string = '1m'
  ): Promise<string> {
    return this.chatBreaker.fire(userId, message, contextData, explanationMode);
  }

  private async performVerifyClaim(claim: string): Promise<VerificationResult> {
    const sanitizedClaim = sanitizeInput(claim);
    const API_KEY = env.GOOGLE_AI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

    let searchContext = '';
    try {
      const tvly = tavily({ apiKey: env.TAVILY_API_KEY });
      const searchResponse = await tvly.search(sanitizedClaim, {
        searchDepth: 'basic',
        maxResults: 3,
      });
      if (searchResponse.results && searchResponse.results.length > 0) {
        searchContext =
          'Real-time context from the web:\n' +
          searchResponse.results
            .map(
              (r: { title: string; content: string; url: string }) =>
                `- ${r.title}: ${r.content} (${r.url})`
            )
            .join('\n') +
          '\n\n';
      }
    } catch (searchErr) {
      logger.error(searchErr, 'Tavily search failed');
    }

    const prompt = `
      You are an expert election misinformation verifier for the "Civiq" platform.
      ${searchContext}
      Analyze the following claim about the election process: "${sanitizedClaim}"
      Classify it as one of: VERIFIED, UNVERIFIED, MISLEADING, FALSE.
      Return JSON: { "classification": "...", "explanation": "...", "source": "..." }
    `;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    const result = (await response.json()) as GeminiResponse;
    if (result.error) throw new Error(result.error.message);

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from Gemini');

    const parsedResult = JSON.parse(text) as VerificationResult;
    await logToBigQuery('claim_verification', { claim: sanitizedClaim, result: parsedResult });
    return parsedResult;
  }

  private async performChatAssistant(
    userId: string,
    message: string,
    contextData: Record<string, unknown>,
    explanationMode: string = '1m'
  ): Promise<string> {
    const sanitizedMessage = sanitizeInput(message);
    const sanitizedLocation = sanitizeLocation(
      typeof contextData?.location === 'string' ? contextData.location : 'Unknown'
    );

    const API_KEY = env.GOOGLE_AI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

    const chatDocRef = adminDb.collection('users').doc(userId).collection('chat').doc('session');
    const chatDoc = await chatDocRef.get();
    let history: { role: string; parts: { text: string }[] }[] = chatDoc.exists
      ? chatDoc.data()?.messages || []
      : [];

    const systemInstruction = `You are an expert election assistant for Civiq. 
Location: ${sanitizedLocation}. Mode: ${truncateString(explanationMode, 10)}.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemInstruction }] },
          ...history,
          { role: 'user', parts: [{ text: sanitizedMessage }] },
        ],
      }),
    });

    const result = (await response.json()) as GeminiResponse;
    if (result.error) throw new Error(result.error.message);

    const finalReply = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    // Save history asynchronously
    history.push({ role: 'user', parts: [{ text: sanitizedMessage }] });
    history.push({ role: 'model', parts: [{ text: finalReply }] });
    if (history.length > 20) history = history.slice(-20);

    await chatDocRef.set({ messages: history }, { merge: true });
    await logToBigQuery('assistant_query', { userId, message: sanitizedMessage, explanationMode });

    return finalReply;
  }
}

export const aiService = new AIService();
