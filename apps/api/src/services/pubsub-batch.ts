import { PubSub } from '@google-cloud/pubsub';
import { getErrorMessage } from '../types/errors';

const pubsub = new PubSub();
const BATCH_SIZE = 100;
const BATCH_TIMEOUT_MS = 5000; // 5 seconds

interface BatchItem {
  claim: string;
  result: Record<string, unknown>;
  timestamp: number;
}

let batch: BatchItem[] = [];
let batchTimer: NodeJS.Timeout | null = null;

/**
 * Add item to batch and flush if needed
 */
export async function addToBatch(claim: string, result: Record<string, unknown>): Promise<void> {
  batch.push({
    claim,
    result,
    timestamp: Date.now(),
  });

  // Flush if batch is full
  if (batch.length >= BATCH_SIZE) {
    await flushBatch();
  } else if (!batchTimer) {
    // Set timer to flush after timeout
    batchTimer = setTimeout(() => {
      flushBatch().catch((err) => {
        console.error('Failed to flush batch:', getErrorMessage(err));
      });
    }, BATCH_TIMEOUT_MS);
  }
}

/**
 * Flush batch to Pub/Sub
 */
export async function flushBatch(): Promise<void> {
  if (batch.length === 0) {
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    return;
  }

  try {
    const topic = pubsub.topic('myth-verifications');
    const messages = batch.map((item) => ({
      json: item,
    }));

    await topic.publishJSON(messages);
    // eslint-disable-next-line no-console
    console.log(`Flushed ${batch.length} items to Pub/Sub`);
    batch = [];

    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
  } catch (error) {
    console.error('Failed to flush batch to Pub/Sub:', getErrorMessage(error));
    // Keep batch in memory for retry
  }
}

/**
 * Graceful shutdown
 */
export async function shutdown(): Promise<void> {
  await flushBatch();
  await pubsub.close();
}
