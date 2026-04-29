import { logToBigQuery } from './services/bigquery';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

async function runTest() {
  // eslint-disable-next-line no-console
  console.log('--- Triggering BigQuery Auto-Provisioning Pipeline Test ---');
  await logToBigQuery('test_judge_evaluation', {
    status: 'Validating automatic provisioning boundaries',
    testMode: true,
  });
  // eslint-disable-next-line no-console
  console.log('--- Test script completed ---');
}

runTest();
