import { PubSub } from '@google-cloud/pubsub';
import { getErrorMessage } from '../../types/errors.js';
import logger from '../../utils/logger.js';

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

  if (batch.length >= BATCH_SIZE) {
    await flushBatch();
  } else if (!batchTimer) {
    batchTimer = setTimeout(() => {
      flushBatch().catch((err) => {
        logger.error({ error: getErrorMessage(err) }, 'Failed to flush batch');
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

  const currentBatchSize = batch.length;
  try {
    const topic = pubsub.topic('myth-verifications');
    const messages = batch.map((item) => ({
      json: item,
    }));

    await topic.publishJSON(messages);
    logger.info({ batchSize: currentBatchSize }, 'Flushed batch to Pub/Sub');
    batch = [];

    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
  } catch (error) {
    logger.error({ error: getErrorMessage(error) }, 'Failed to flush batch to Pub/Sub');
  }
}

/**
 * Graceful shutdown
 */
export async function shutdown(): Promise<void> {
  await flushBatch();
  await pubsub.close();
}
