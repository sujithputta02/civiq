/* eslint-disable @typescript-eslint/naming-convention */
import { logToBigQuery } from './modules/security/bigquery.service.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function runTest() {
  /* eslint-disable no-console */
  console.log('--- Triggering BigQuery Auto-Provisioning Pipeline Test ---');
  try {
    await logToBigQuery('test_judge_evaluation', {
      status: 'Validating automatic provisioning boundaries',
      testMode: true,
    });
    console.log('--- Test script completed ---');
  } catch (err) {
    console.error('BigQuery Test Error:', err);
  }
  /* eslint-enable no-console */
}

runTest();
