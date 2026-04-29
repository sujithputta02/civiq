import { PubSub, Message } from '@google-cloud/pubsub';
import { adminDb } from './services/admin';

const pubSubClient = new PubSub();

export const startMythVerificationWorker = async () => {
  const topicName = 'myth_verifications';
  const subscriptionName = 'myth_verifications-sub';
  
  try {
    // Ensure Topic exists
    const [topic] = await pubSubClient.topic(topicName).get({ autoCreate: true });
    // eslint-disable-next-line no-console
    console.log(`Topic ${topic.name} is ready.`);

    // Ensure Subscription exists
    const [subscription] = await topic.subscription(subscriptionName).get({ autoCreate: true });
    // eslint-disable-next-line no-console
    console.log(`Subscription ${subscription.name} is ready.`);

    // Message handler
    const messageHandler = async (message: Message) => {
    try {
      const dataStr = message.data.toString();
      const payload = JSON.parse(dataStr);
      
      // eslint-disable-next-line no-console
      console.log(`Worker received myth verification:`, payload.classification);

      // We want to aggregate statistics about verifications.
      // E.g., how many times TRUE, FALSE, MIXED was returned.
      // And keep a log of the most recent claims for the admin dashboard.
      const statsRef = adminDb.collection('aggregates').doc('myth_stats');
      
      await adminDb.runTransaction(async (t) => {
        const doc = await t.get(statsRef);
        const data = doc.data() || {
          totalQueries: 0,
          trueCount: 0,
          falseCount: 0,
          mixedCount: 0,
          recentQueries: []
        };
        
        data.totalQueries += 1;
        if (payload.classification === 'VERIFIED' || payload.classification === 'TRUE') {
          data.trueCount += 1;
        } else if (payload.classification === 'FALSE') {
          data.falseCount += 1;
        } else if (payload.classification === 'MISLEADING' || payload.classification === 'MIXED' || payload.classification === 'UNVERIFIED') {
          data.mixedCount += 1;
        }
        
        // Add to recent queries (keep last 50)
        data.recentQueries.unshift({
          claim: payload.claim,
          classification: payload.classification,
          timestamp: payload.timestamp || new Date().toISOString()
        });
        
        if (data.recentQueries.length > 50) {
          data.recentQueries.pop();
        }
        
        t.set(statsRef, data, { merge: true });
      });

      // eslint-disable-next-line no-console
      console.log(`Worker successfully updated aggregates/myth_stats`);
      
      // "Ack" (acknowledge receipt of) the message
      message.ack();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Worker failed to process message ${message.id}:`, error);
      // Nack the message to tell Pub/Sub to retry it
      message.nack();
    }
  };

    // Listen for new messages
    subscription.on('message', messageHandler);
    
    subscription.on('error', (error) => {
      // eslint-disable-next-line no-console
      console.error(`Pub/Sub Subscription Error:`, error);
    });

    // eslint-disable-next-line no-console
    console.log(`Pub/Sub Worker listening on ${subscriptionName}...`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize Pub/Sub infrastructure:', error);
  }
};
