# 🚀 Vercel Deployment Guide

This guide will walk you through deploying the Insight Reports Platform on Vercel.

## 📋 Prerequisites

- [Vercel Account](https://vercel.com/signup)
- [GitHub Account](https://github.com)
- [Resend Account](https://resend.com) (for email functionality)
- [OpenAI Account](https://platform.openai.com) (optional, for AI insights)

## 🔧 Step-by-Step Deployment

### 1. Prepare Your Repository

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Ensure all files are committed**
   - `vercel.json` (deployment configuration)
   - `web/next.config.ts` (Next.js configuration)
   - `server/src/index.ts` (server configuration)

### 2. Connect to Vercel

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Select the repository containing your project**

### 3. Configure Project Settings

#### Project Configuration
- **Framework Preset**: Other
- **Root Directory**: `./` (root of the project)
- **Build Command**: `npm run build`
- **Output Directory**: `web/.next`
- **Install Command**: `npm install`

#### Environment Variables

Add the following environment variables in Vercel:

```bash
# Required for email functionality
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM=noreply@yourdomain.com

# Optional - for enhanced AI analysis
OPENAI_API_KEY=sk-your_openai_api_key_here

# External API configuration
NEWFORM_API_TOKEN=NEWFORMCODINGCHALLENGE
NEWFORM_AUTH_HEADER_NAME=Authorization
NEWFORM_BASE_URL=https://bizdev.newform.ai

# Server configuration
PORT=4000
```

### 4. Deploy

1. **Click "Deploy"**
2. **Wait for the build to complete**
3. **Check the deployment logs for any errors**

### 5. Configure Custom Domain (Optional)

1. **Go to your project settings in Vercel**
2. **Navigate to "Domains"**
3. **Add your custom domain**
4. **Update DNS records as instructed**

## 🔍 Post-Deployment Verification

### 1. Test the Application

1. **Visit your deployed URL**
2. **Test the configuration page**
3. **Generate a test report**
4. **Verify email delivery (if configured)**

### 2. Check Function Logs

1. **Go to Vercel Dashboard**
2. **Navigate to "Functions"**
3. **Check for any errors in the logs**

### 3. Test API Endpoints

```bash
# Health check
curl https://your-domain.vercel.app/health

# API status
curl https://your-domain.vercel.app/api/status
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Build Failures

**Problem**: Build fails during deployment
**Solution**: 
- Check the build logs in Vercel
- Ensure all dependencies are properly installed
- Verify TypeScript compilation

#### 2. API Routes Not Working

**Problem**: API calls return 404
**Solution**:
- Verify `vercel.json` configuration
- Check that routes are properly configured
- Ensure server functions are deployed

#### 3. Environment Variables Missing

**Problem**: Application fails due to missing environment variables
**Solution**:
- Add all required environment variables in Vercel
- Redeploy after adding variables
- Check variable names match exactly

#### 4. CORS Issues

**Problem**: Frontend can't communicate with backend
**Solution**:
- Verify CORS configuration in `server/src/index.ts`
- Check that `VERCEL_URL` is properly set
- Ensure API routes are accessible

#### 5. File System Issues

**Problem**: Reports or data files not persisting
**Solution**:
- Vercel functions are stateless
- Consider using external storage (S3, etc.)
- Implement database storage for production

## 🔄 Continuous Deployment

### Automatic Deployments

1. **Connect your GitHub repository**
2. **Enable automatic deployments**
3. **Configure branch protection rules**
4. **Set up preview deployments for pull requests**

### Environment-Specific Deployments

1. **Create production and staging environments**
2. **Configure environment-specific variables**
3. **Set up deployment pipelines**

## 📊 Monitoring and Analytics

### Vercel Analytics

1. **Enable Vercel Analytics**
2. **Monitor performance metrics**
3. **Track user interactions**

### Error Monitoring

1. **Set up error tracking (Sentry, etc.)**
2. **Monitor function execution times**
3. **Track API response times**

## 🔒 Security Considerations

### Environment Variables

- **Never commit sensitive data**
- **Use Vercel's environment variable encryption**
- **Rotate API keys regularly**

### API Security

- **Implement rate limiting**
- **Add authentication if needed**
- **Validate all inputs**

### CORS Configuration

- **Restrict origins to your domain**
- **Use HTTPS in production**
- **Configure proper headers**

## 🚀 Production Optimization

### Performance

1. **Enable Vercel Edge Functions for static content**
2. **Implement caching strategies**
3. **Optimize bundle sizes**

### Scalability

1. **Monitor function execution limits**
2. **Implement proper error handling**
3. **Use external databases for data persistence**

## 📞 Support

### Vercel Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Vercel Support](https://vercel.com/support)

### Application Support

- Check the [README.md](./README.md) for application-specific issues
- Review the [EMAIL_SETUP.md](./EMAIL_SETUP.md) for email configuration
- Open issues on the project repository

## 🔄 Updates and Maintenance

### Regular Updates

1. **Keep dependencies updated**
2. **Monitor security advisories**
3. **Test deployments in staging first**

### Backup Strategy

1. **Backup configuration data**
2. **Export important reports**
3. **Document deployment procedures**

---

**Happy Deploying! 🚀**
