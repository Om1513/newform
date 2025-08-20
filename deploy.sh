#!/bin/bash

# 🚀 Vercel Deployment Script for Insight Reports Platform

echo "🚀 Starting Vercel deployment for Insight Reports Platform..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Please install it first:"
    echo "npm i -g vercel"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo "❌ vercel.json not found. Please run this script from the project root."
    exit 1
fi

# Check if all required files exist
echo "📋 Checking required files..."
required_files=("vercel.json" "web/next.config.ts" "server/src/index.ts" "package.json")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Required file missing: $file"
        exit 1
    fi
done
echo "✅ All required files found"

# Check if environment variables are set
echo "🔧 Checking environment variables..."
if [ -z "$RESEND_API_KEY" ]; then
    echo "⚠️  Warning: RESEND_API_KEY not set. Email functionality will not work."
fi

if [ -z "$NEWFORM_API_TOKEN" ]; then
    echo "⚠️  Warning: NEWFORM_API_TOKEN not set. Using default value."
fi

# Build the project
echo "🔨 Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi
echo "✅ Build completed successfully"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "🎉 Deployment completed successfully!"
    echo "📊 Your application is now live on Vercel!"
    echo ""
    echo "🔗 Next steps:"
    echo "1. Configure environment variables in Vercel dashboard"
    echo "2. Test the application functionality"
    echo "3. Set up custom domain (optional)"
    echo ""
    echo "📚 For more information, see DEPLOYMENT.md"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
