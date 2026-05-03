import { BigQuery } from '@google-cloud/bigquery';
import logger from '../../utils/logger.js';

// Uses Application Default Credentials (ADC) natively in Cloud Run
const bigquery = new BigQuery();
const datasetId = 'civiq_analytics';
const tableId = 'events';

export const logToBigQuery = async (eventType: string, payload: Record<string, unknown>) => {
  try {
    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);

    const [datasetExists] = await dataset.exists();
    if (!datasetExists) {
      logger.info({ datasetId }, 'Dataset not found, creating...');
      await bigquery.createDataset(datasetId, { location: 'US' });
    }

    const [tableExists] = await table.exists();
    if (!tableExists) {
      logger.info({ tableId }, 'Table not found, creating...');
      const schema = [
        { name: 'event_type', type: 'STRING', mode: 'REQUIRED' },
        { name: 'payload', type: 'STRING', mode: 'NULLABLE' },
        { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
      ];
      await dataset.createTable(tableId, { schema });
    }

    const row = {
      event_type: eventType,
      payload: JSON.stringify(payload),
      timestamp: new Date().toISOString(),
    };

    await table.insert([row]);
    logger.debug({ eventType }, 'Logged to BigQuery successfully');
  } catch (error) {
    logger.warn({ error, eventType }, 'BigQuery logging failed (Safe fallback)');
  }
};
