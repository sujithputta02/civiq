import * as admin from 'firebase-admin';

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
    // eslint-disable-next-line no-console
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error sending message:', error);
    throw error;
  }
};
