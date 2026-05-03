#!/bin/bash

# Civiq Deployment Script
# This script automates the deployment process to Firebase

set -e  # Exit on error

echo "🚀 Civiq Deployment Script"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed${NC}"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Firebase${NC}"
    echo "Logging in..."
    firebase login
fi

# Get project ID
PROJECT_ID=$(firebase use | grep "active project" | awk '{print $NF}' | tr -d '()')

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" == "your-project-id" ]; then
    echo -e "${RED}❌ Firebase project not configured${NC}"
    echo "Run: firebase use --add"
    exit 1
fi

echo -e "${GREEN}✓ Using Firebase project: $PROJECT_ID${NC}"
echo ""

# Ask what to deploy
echo "What would you like to deploy?"
echo "1) Everything (Full deployment)"
echo "2) Web App only"
echo "3) API (Functions) only"
echo "4) Firestore Rules & Indexes"
echo "5) Storage Rules"
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo -e "${YELLOW}📦 Building workspace packages...${NC}"
        npm run build --workspace=packages/config-env --workspace=packages/types --if-present
        
        echo -e "${YELLOW}🧪 Running tests...${NC}"
        CLOUD_SCHEDULER_SECRET=test GOOGLE_AI_API_KEY=test TAVILY_API_KEY=test npm run test:run
        
        echo -e "${YELLOW}🏗️  Building web app...${NC}"
        npm run build:web
        
        echo -e "${YELLOW}🏗️  Building API...${NC}"
        npm run build:api
        
        echo -e "${YELLOW}🚀 Deploying everything...${NC}"
        firebase deploy
        ;;
    2)
        echo -e "${YELLOW}🏗️  Building web app...${NC}"
        npm run build:web
        
        echo -e "${YELLOW}🚀 Deploying web app...${NC}"
        firebase deploy --only hosting
        ;;
    3)
        echo -e "${YELLOW}🏗️  Building API...${NC}"
        npm run build:api
        
        echo -e "${YELLOW}🚀 Deploying functions...${NC}"
        firebase deploy --only functions
        ;;
    4)
        echo -e "${YELLOW}🚀 Deploying Firestore rules and indexes...${NC}"
        firebase deploy --only firestore:rules,firestore:indexes
        ;;
    5)
        echo -e "${YELLOW}🚀 Deploying Storage rules...${NC}"
        firebase deploy --only storage
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "🌐 Web App: https://$PROJECT_ID.web.app"
echo "📡 API: https://us-central1-$PROJECT_ID.cloudfunctions.net/api"
echo "🔥 Console: https://console.firebase.google.com/project/$PROJECT_ID"
echo ""
echo "📊 View logs:"
echo "  firebase functions:log"
echo "  firebase hosting:channel:list"
