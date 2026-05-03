import * as admin from 'firebase-admin';
import logger from '../../utils/logger.js';

export const sendPushNotification = async (token: string, title: string, body: string) => {
  const message = {
    notification: {
      title,
      body,
    },
    token: token,
  };

  try {
    const response = await admin.messaging().send(message);
    logger.info({ response, title }, 'Push notification sent successfully');
    return response;
  } catch (error) {
    logger.error({ error, title }, 'Error sending push notification');
    throw error;
  }
};
