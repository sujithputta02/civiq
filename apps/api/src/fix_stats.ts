import dotenv from 'dotenv';
dotenv.config();
import { adminDb } from './services/admin';

async function fixStats() {
  const statsRef = adminDb.collection('aggregates').doc('myth_stats');
  const doc = await statsRef.get();
  
  if (!doc.exists) {
    // eslint-disable-next-line no-console
    console.log('No stats found');
    return;
  }
  
  const data = doc.data() || {};
  const recentQueries = data.recentQueries || [];
  
  let trueCount = 0;
  let falseCount = 0;
  let mixedCount = 0;
  
  for (const q of recentQueries) {
    if (q.classification === 'VERIFIED' || q.classification === 'TRUE') {
      trueCount++;
    } else if (q.classification === 'FALSE') {
      falseCount++;
    } else if (q.classification === 'MISLEADING' || q.classification === 'MIXED' || q.classification === 'UNVERIFIED') {
      mixedCount++;
    }
  }
  
  await statsRef.update({
    trueCount,
    falseCount,
    mixedCount,
    totalQueries: recentQueries.length
  });
  
  // eslint-disable-next-line no-console
  console.log('Stats fixed! True:', trueCount, 'False:', falseCount, 'Mixed:', mixedCount);
}

fixStats().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
});
