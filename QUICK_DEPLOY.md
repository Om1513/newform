# ⚡ Quick Vercel Deployment

## 🚀 One-Click Deployment

### Option 1: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to project root
cd scheduled-insight-reports

# Deploy
vercel --prod
```

### Option 2: Using Deployment Script

```bash
# Make script executable (if not already)
chmod +x deploy.sh

# Run deployment script
./deploy.sh
```

### Option 3: GitHub Integration

1. **Push code to GitHub**
2. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
3. **Click "New Project"**
4. **Import your repository**
5. **Configure and deploy**

## ⚙️ Required Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Email Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM=noreply@yourdomain.com

# External API
NEWFORM_API_TOKEN=NEWFORMCODINGCHALLENGE
NEWFORM_AUTH_HEADER_NAME=Authorization
NEWFORM_BASE_URL=https://bizdev.newform.ai

# Optional AI Features
OPENAI_API_KEY=sk-your_openai_key_here

# Server Configuration
PORT=4000
```

## 🔍 Post-Deployment Checklist

- [ ] **Test the application**: Visit your deployed URL
- [ ] **Configure a report**: Go to the config page
- [ ] **Generate a test report**: Verify functionality
- [ ] **Check email delivery**: If email is configured
- [ ] **Monitor logs**: Check Vercel function logs

## 🛠️ Troubleshooting

### Common Issues

1. **Build fails**: Check build logs in Vercel dashboard
2. **API not working**: Verify environment variables
3. **CORS errors**: Check CORS configuration
4. **Email not sending**: Verify Resend API key

### Quick Fixes

```bash
# Redeploy after environment variable changes
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs
```

## 📚 Full Documentation

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Your app will be live at: `https://your-project-name.vercel.app`** 🎉
