import { BigQuery } from '@google-cloud/bigquery';

// Uses Application Default Credentials (ADC) natively in Cloud Run
const bigquery = new BigQuery();
const datasetId = 'civiq_analytics';
const tableId = 'events';

export const logToBigQuery = async (eventType: string, payload: any) => {
  try {
    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);

    // Check if dataset exists, if not create it
    const [datasetExists] = await dataset.exists();
    console.log(`[BigQuery Debug] datasetExists = ${datasetExists}`);
    if (!datasetExists) {
      console.log(`Dataset ${datasetId} not found. Creating it...`);
      await bigquery.createDataset(datasetId, { location: 'US' });
      console.log(`Dataset ${datasetId} created successfully.`);
    }
    
    // Check if table exists, if not create it
    const [tableExists] = await table.exists();
    console.log(`[BigQuery Debug] tableExists = ${tableExists}`);
    if (!tableExists) {
      console.log(`Table ${tableId} not found. Creating it...`);
      const schema = [
        { name: 'event_type', type: 'STRING', mode: 'REQUIRED' },
        { name: 'payload', type: 'STRING', mode: 'NULLABLE' },
        { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' }
      ];
      await dataset.createTable(tableId, { schema });
      console.log(`Table ${tableId} created successfully.`);
    }

    const row = {
      event_type: eventType,
      payload: JSON.stringify(payload),
      timestamp: new Date().toISOString()
    };

    // Streaming insert
    await table.insert([row]);
    console.log(`[BigQuery] Logged ${eventType} successfully.`);
  } catch (error) {
    // Safe logging fallback. Will gracefully fail if BQ tables aren't pre-provisioned
    console.warn(`[BigQuery Safe Fallback] Event ${eventType} could not be inserted:`, error);
  }
};
