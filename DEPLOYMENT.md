# Civiq Deployment Guide

## Prerequisites

1. **Firebase CLI**: Install globally
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Project**: Create a project at [Firebase Console](https://console.firebase.google.com/)

3. **Google Cloud Project**: Enable required APIs
   - Cloud Functions
   - Cloud Firestore
   - Cloud Storage
   - Vertex AI
   - BigQuery
   - Pub/Sub

## Initial Setup

### 1. Firebase Login
```bash
firebase login
```

### 2. Set Your Project ID
Edit `.firebaserc` and replace `your-project-id` with your actual Firebase project ID:
```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

Or use the CLI:
```bash
firebase use --add
```

### 3. Configure Environment Variables

#### For Firebase Functions (API):
```bash
# Set environment variables for Cloud Functions
firebase functions:config:set \
  google_ai.api_key="YOUR_GEMINI_API_KEY" \
  tavily.api_key="YOUR_TAVILY_API_KEY" \
  openrouter.api_key="YOUR_OPENROUTER_API_KEY" \
  cloud_scheduler.secret="YOUR_RANDOM_SECRET" \
  frontend.url="https://your-project-id.web.app"
```

#### For Next.js (Web App):
Create `apps/web/.env.production`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_API_URL=https://us-central1-your-project-id.cloudfunctions.net/api
```

### 4. Enable Required Google Cloud APIs
```bash
gcloud services enable \
  cloudfunctions.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  aiplatform.googleapis.com \
  bigquery.googleapis.com \
  pubsub.googleapis.com \
  cloudscheduler.googleapis.com
```

## Deployment Steps

### Option 1: Full Deployment (Recommended for first time)
```bash
npm run deploy
```

This will:
1. Build the web app
2. Build the API
3. Deploy Firestore rules and indexes
4. Deploy Storage rules
5. Deploy Cloud Functions
6. Deploy Firebase Hosting

### Option 2: Deploy Individual Components

#### Deploy Web App Only
```bash
npm run deploy:web
```

#### Deploy API Only
```bash
npm run deploy:api
```

#### Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

#### Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

#### Deploy Storage Rules
```bash
firebase deploy --only storage
```

## Post-Deployment Configuration

### 1. Set up Cloud Scheduler (for periodic tasks)
```bash
# Create a job to clean up old sessions daily
gcloud scheduler jobs create http cleanup-sessions \
  --schedule="0 2 * * *" \
  --uri="https://us-central1-your-project-id.cloudfunctions.net/api/cron/cleanup" \
  --http-method=POST \
  --headers="X-Cloud-Scheduler-Secret=YOUR_RANDOM_SECRET"
```

### 2. Configure BigQuery Dataset
```bash
# Create dataset for analytics
bq mk --dataset your-project-id:civiq_analytics

# Create events table
bq mk --table your-project-id:civiq_analytics.events \
  eventType:STRING,userId:STRING,timestamp:TIMESTAMP,metadata:JSON
```

### 3. Set up Pub/Sub Topics
```bash
# Create topic for myth verifications
gcloud pubsub topics create myth_verifications

# Create subscription
gcloud pubsub subscriptions create myth_verifications-sub \
  --topic=myth_verifications
```

### 4. Configure CORS for Cloud Functions
Create a `cors.json` file:
```json
[
  {
    "origin": ["https://your-project-id.web.app", "https://your-project-id.firebaseapp.com"],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "maxAgeSeconds": 3600
  }
]
```

## Monitoring & Logs

### View Function Logs
```bash
firebase functions:log
```

### View Hosting Logs
```bash
firebase hosting:channel:list
```

### Cloud Console
- Functions: https://console.cloud.google.com/functions
- Firestore: https://console.firebase.google.com/project/your-project-id/firestore
- Hosting: https://console.firebase.google.com/project/your-project-id/hosting

## Rollback

### Rollback Hosting
```bash
firebase hosting:clone SOURCE_SITE_ID:SOURCE_CHANNEL_ID TARGET_SITE_ID:live
```

### Rollback Functions
```bash
# List previous versions
gcloud functions list

# Rollback to specific version
gcloud functions deploy FUNCTION_NAME --source=gs://BUCKET/VERSION
```

## CI/CD with GitHub Actions

The project includes automated deployment via GitHub Actions. To enable:

1. Add Firebase service account to GitHub Secrets:
   ```bash
   # Generate service account key
   firebase login:ci
   ```

2. Add the token to GitHub Secrets as `FIREBASE_TOKEN`

3. Push to `main` branch to trigger deployment

## Troubleshooting

### Functions deployment fails
- Check that all environment variables are set
- Verify Node.js version matches (20.x)
- Check function logs for errors

### Hosting shows 404
- Ensure `apps/web/out` directory exists after build
- Check firebase.json rewrites configuration
- Verify Next.js is configured for static export

### Firestore permission denied
- Check firestore.rules are deployed
- Verify user authentication is working
- Check security rules in Firebase Console

## Performance Optimization

### Enable CDN
Firebase Hosting automatically uses CDN, but you can optimize:
- Set proper cache headers (already configured)
- Use Next.js Image Optimization
- Enable compression (already configured)

### Function Cold Starts
- Use minimum instances for critical functions:
  ```bash
  firebase functions:config:set runtime.min_instances=1
  ```

### Database Optimization
- Create composite indexes (already configured in firestore.indexes.json)
- Use subcollections for large datasets
- Implement pagination

## Security Checklist

- [ ] Environment variables are set and not exposed
- [ ] Firestore rules are restrictive
- [ ] Storage rules limit file sizes
- [ ] CORS is properly configured
- [ ] API endpoints have rate limiting
- [ ] Authentication is required for sensitive operations
- [ ] Audit logging is enabled
- [ ] HTTPS is enforced (automatic with Firebase)

## Cost Optimization

### Free Tier Limits
- Hosting: 10 GB storage, 360 MB/day transfer
- Functions: 2M invocations/month
- Firestore: 1 GB storage, 50K reads/day
- Storage: 5 GB storage, 1 GB/day download

### Monitor Usage
```bash
# Check current usage
firebase projects:list
```

### Set Budget Alerts
Configure in Google Cloud Console → Billing → Budgets & alerts

## Support

For issues or questions:
- GitHub Issues: [Your Repo URL]
- Firebase Support: https://firebase.google.com/support
- Documentation: https://firebase.google.com/docs
