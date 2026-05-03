import { PubSub, Message } from '@google-cloud/pubsub';
import { adminDb } from './modules/identity/admin.service.js';
import logger from './utils/logger.js';

const pubSubClient = new PubSub();

export const startMythVerificationWorker = async () => {
  const topicName = 'myth_verifications';
  const subscriptionName = 'myth_verifications-sub';

  try {
    const [topic] = await pubSubClient.topic(topicName).get({ autoCreate: true });
    logger.info({ topic: topic.name }, 'Pub/Sub Topic ready');

    const [subscription] = await topic.subscription(subscriptionName).get({ autoCreate: true });
    logger.info({ subscription: subscription.name }, 'Pub/Sub Subscription ready');

    const messageHandler = async (message: Message) => {
      try {
        const payload = JSON.parse(message.data.toString());
        const statsRef = adminDb.collection('aggregates').doc('myth_stats');

        await adminDb.runTransaction(async (t) => {
          const doc = await t.get(statsRef);
          const data = doc.data() || {
            totalQueries: 0,
            trueCount: 0,
            falseCount: 0,
            mixedCount: 0,
            recentQueries: [],
          };

          data.totalQueries += 1;
          const classification = payload.classification;
          if (classification === 'VERIFIED' || classification === 'TRUE') {
            data.trueCount += 1;
          } else if (classification === 'FALSE') {
            data.falseCount += 1;
          } else {
            data.mixedCount += 1;
          }

          data.recentQueries.unshift({
            claim: payload.claim,
            classification,
            timestamp: payload.timestamp || new Date().toISOString(),
          });

          if (data.recentQueries.length > 50) data.recentQueries.pop();
          t.set(statsRef, data, { merge: true });
        });

        logger.info({ msgId: message.id }, 'Worker processed myth verification');
        message.ack();
      } catch (error) {
        logger.error({ error, msgId: message.id }, 'Worker failed to process message');
        message.nack();
      }
    };

    subscription.on('message', messageHandler);
    subscription.on('error', (error) => logger.error(error, 'Pub/Sub Subscription Error'));
    logger.info('Pub/Sub Worker listening...');
  } catch (error) {
    logger.error(error, 'Failed to initialize Pub/Sub worker');
  }
};
