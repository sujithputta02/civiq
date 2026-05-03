# 🚀 Civiq Deployment Checklist

## Pre-Deployment Setup

### 1. Firebase Project Setup
- [ ] Create Firebase project at https://console.firebase.google.com/
- [ ] Note your Project ID: `_________________`
- [ ] Enable Blaze (Pay as you go) plan for Cloud Functions
- [ ] Enable Authentication → Email/Password provider
- [ ] Create Firestore database (production mode)
- [ ] Create Storage bucket

### 2. Google Cloud APIs
Enable these APIs in Google Cloud Console:
- [ ] Cloud Functions API
- [ ] Cloud Firestore API
- [ ] Cloud Storage API
- [ ] Vertex AI API
- [ ] BigQuery API
- [ ] Cloud Pub/Sub API
- [ ] Cloud Scheduler API

### 3. API Keys & Credentials

#### Get Firebase Config
From Firebase Console → Project Settings → General:
```
API Key: _________________
Auth Domain: _________________
Project ID: _________________
Storage Bucket: _________________
Messaging Sender ID: _________________
App ID: _________________
```

#### Get External API Keys
- [ ] Gemini API Key: https://aistudio.google.com/app/apikey
- [ ] Tavily API Key: https://tavily.com
- [ ] OpenRouter API Key (optional): https://openrouter.ai/keys

### 4. Local Configuration

#### Update `.firebaserc`
```bash
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
  }
}
```

#### Create `apps/web/.env.production`
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_API_URL=https://us-central1-your-project-id.cloudfunctions.net/api
```

### 5. Firebase Functions Configuration
```bash
firebase functions:config:set \
  google_ai.api_key="YOUR_GEMINI_KEY" \
  tavily.api_key="YOUR_TAVILY_KEY" \
  openrouter.api_key="YOUR_OPENROUTER_KEY" \
  cloud_scheduler.secret="$(openssl rand -hex 32)" \
  frontend.url="https://your-project-id.web.app"
```

## Deployment Steps

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### Step 2: Initialize Firebase (if not done)
```bash
firebase use --add
# Select your project
```

### Step 3: Build & Test Locally
```bash
# Install dependencies
npm install --legacy-peer-deps

# Build packages
npm run build --workspace=packages/config-env --workspace=packages/types

# Run tests
CLOUD_SCHEDULER_SECRET=test GOOGLE_AI_API_KEY=test TAVILY_API_KEY=test npm run test:run

# Build web app
npm run build:web

# Build API
npm run build:api
```

### Step 4: Deploy to Firebase
```bash
# Full deployment
npm run deploy

# Or deploy individually:
npm run deploy:web      # Web app only
npm run deploy:api      # API only
npm run deploy:rules    # Firestore & Storage rules
npm run deploy:indexes  # Firestore indexes
```

### Step 5: Post-Deployment Configuration

#### Create BigQuery Dataset
```bash
bq mk --dataset YOUR_PROJECT_ID:civiq_analytics
bq mk --table YOUR_PROJECT_ID:civiq_analytics.events \
  eventType:STRING,userId:STRING,timestamp:TIMESTAMP,metadata:JSON
```

#### Create Pub/Sub Topics
```bash
gcloud pubsub topics create myth_verifications
gcloud pubsub subscriptions create myth_verifications-sub \
  --topic=myth_verifications
```

#### Set up Cloud Scheduler
```bash
gcloud scheduler jobs create http cleanup-sessions \
  --schedule="0 2 * * *" \
  --uri="https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api/cron/cleanup" \
  --http-method=POST \
  --headers="X-Cloud-Scheduler-Secret=YOUR_SECRET"
```

## GitHub Actions Setup (Optional)

### 1. Generate Firebase Token
```bash
firebase login:ci
# Copy the token
```

### 2. Add GitHub Secrets
Go to GitHub → Settings → Secrets and add:
- `FIREBASE_TOKEN`: Token from step 1
- `FIREBASE_PROJECT_ID`: Your project ID
- `FIREBASE_SERVICE_ACCOUNT`: Service account JSON
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Storage bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID`: App ID
- `NEXT_PUBLIC_API_URL`: API URL

### 3. Enable GitHub Actions
Push to `main` branch to trigger automatic deployment.

## Verification

### Check Deployment Status
- [ ] Web App: https://YOUR_PROJECT_ID.web.app
- [ ] API Health: https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api/health
- [ ] Firebase Console: https://console.firebase.google.com/project/YOUR_PROJECT_ID

### Test Core Features
- [ ] User can sign up/login
- [ ] Assessment flow works
- [ ] Timeline displays correctly
- [ ] AI verification works
- [ ] Simulation loads

### Monitor Logs
```bash
# Function logs
firebase functions:log

# Firestore operations
# Check in Firebase Console → Firestore

# Hosting
firebase hosting:channel:list
```

## Troubleshooting

### Build Fails
```bash
# Clean and rebuild
rm -rf node_modules package-lock.json apps/*/node_modules
npm install --legacy-peer-deps
npm run build
```

### Functions Deploy Fails
```bash
# Check function logs
firebase functions:log

# Verify environment config
firebase functions:config:get

# Redeploy specific function
firebase deploy --only functions:api
```

### Hosting Shows 404
```bash
# Verify build output
ls -la apps/web/out

# Check firebase.json configuration
cat firebase.json

# Redeploy hosting
npm run deploy:web
```

### Firestore Permission Denied
```bash
# Deploy rules
npm run deploy:rules

# Check rules in console
# Firebase Console → Firestore → Rules
```

## Cost Monitoring

### Set Budget Alert
1. Go to Google Cloud Console → Billing
2. Create budget alert
3. Set threshold (e.g., $50/month)
4. Add email notifications

### Monitor Usage
```bash
# Check current usage
firebase projects:list

# View billing
gcloud billing accounts list
```

## Rollback Plan

### Rollback Hosting
```bash
firebase hosting:clone SOURCE:CHANNEL TARGET:live
```

### Rollback Functions
```bash
# List versions
gcloud functions list

# Deploy previous version
gcloud functions deploy FUNCTION_NAME --source=PREVIOUS_SOURCE
```

## Support & Resources

- 📚 Full Guide: See `DEPLOYMENT.md`
- 🔥 Firebase Docs: https://firebase.google.com/docs
- 💬 Firebase Support: https://firebase.google.com/support
- 🐛 Issues: [Your GitHub Issues URL]

## Success Criteria

- [ ] All tests passing
- [ ] Web app accessible
- [ ] API responding
- [ ] Authentication working
- [ ] Database operations functional
- [ ] Monitoring enabled
- [ ] Budget alerts configured
- [ ] Documentation updated

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Project ID**: _______________
**Version**: _______________
