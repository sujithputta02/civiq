import { PubSub } from '@google-cloud/pubsub';

// Ensure this uses Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS locally
// For production in Cloud Run, it inherits the service account automatically.
const pubSubClient = new PubSub();

export const publishMythVerification = async (claim: string, result: Record<string, unknown>) => {
  const topicName = 'myth_verifications';

  try {
    const data = JSON.stringify({ claim, ...result, timestamp: new Date().toISOString() });
    const dataBuffer = Buffer.from(data);

    const [topic] = await pubSubClient.topic(topicName).get({ autoCreate: true });
    const messageId = await topic.publishMessage({ data: dataBuffer });
      
    // eslint-disable-next-line no-console
    console.log(`Message ${messageId} published to ${topicName}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Received error while publishing to ${topicName}:`, error);
  }
};
