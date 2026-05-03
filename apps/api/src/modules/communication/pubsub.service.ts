import { PubSub } from '@google-cloud/pubsub';
import logger from '../../utils/logger.js';

const pubSubClient = new PubSub();

export const publishMythVerification = async (claim: string, result: Record<string, unknown>) => {
  const topicName = 'myth_verifications';

  try {
    const data = JSON.stringify({ claim, ...result, timestamp: new Date().toISOString() });
    const dataBuffer = Buffer.from(data);

    const [topic] = await pubSubClient.topic(topicName).get({ autoCreate: true });
    const messageId = await topic.publishMessage({ data: dataBuffer });

    logger.info({ messageId, topicName }, 'Message published to Pub/Sub');
  } catch (error) {
    logger.error({ error, topicName }, 'Error publishing to Pub/Sub');
  }
};
