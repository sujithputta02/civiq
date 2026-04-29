import { logToBigQuery } from './services/bigquery';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

async function runTest() {
  console.log('--- Triggering BigQuery Auto-Provisioning Pipeline Test ---');
  await logToBigQuery('test_judge_evaluation', {
    status: 'Validating automatic provisioning boundaries',
    testMode: true
  });
  console.log('--- Test script completed ---');
}

runTest();
