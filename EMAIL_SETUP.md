# Email Setup Guide for Scheduled Insight Reports

## Overview
The application uses [Resend](https://resend.com) for email delivery. To enable email functionality, you need to configure the required environment variables.

## Setup Steps

### 1. Get Resend API Key
1. Visit [resend.com](https://resend.com) and create an account
2. Go to your dashboard and create a new API key
3. Copy the API key for use in environment variables

### 2. Set Up Environment Variables

Create a `.env` file in the `scheduled-insight-reports/server/` directory with the following variables:

```bash
# Required for email functionality
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM=noreply@yourdomain.com

# Optional - for enhanced AI analysis
OPENAI_API_KEY=your_openai_api_key_here

# Server configuration
SERVER_PUBLIC_BASE=http://localhost:4000
```

### 3. Domain Verification (For Production)
- For production use, you'll need to verify your domain in Resend
- For testing, you can use Resend's sandbox domain

### 4. Testing Email Functionality

1. Start the server with environment variables:
   ```bash
   cd scheduled-insight-reports/server
   npm run dev
   ```

2. Configure a report with email delivery:
   - Go to the config page in the web interface
   - Select "Email" as the delivery method
   - Enter a valid email address
   - Save the configuration

3. Run a report:
   - Click "Generate Report Now" on the dashboard
   - Check the server console for detailed logs
   - If successful, you should receive an email with the report

## Troubleshooting

### Common Issues

1. **"RESEND_API_KEY not set" error**
   - Ensure the `.env` file exists in the server directory
   - Check that the API key is correctly set in the `.env` file
   - Restart the server after adding environment variables

2. **"RESEND_FROM not set" error**
   - Add a valid sender email address to the `.env` file
   - Use a domain you own or Resend's sandbox domain for testing

3. **Email not received**
   - Check spam/junk folder
   - Verify the recipient email address is correct
   - Check server console logs for detailed error messages
   - Ensure your Resend account has sending credits

4. **Domain verification issues (Production)**
   - Follow Resend's domain verification process
   - Use DNS records to verify domain ownership
   - Wait for verification to complete before sending emails

### Debug Logs

The application now includes comprehensive logging for email functionality:

- Environment variable checks
- Email sending attempts
- Success/failure notifications
- Detailed error messages

Check the server console when testing email functionality to see these logs.

## Example .env File

```bash
RESEND_API_KEY=re_123456789_abcdefghijklmnop
RESEND_FROM=reports@mycompany.com
OPENAI_API_KEY=sk-123456789abcdefghijklmnop
SERVER_PUBLIC_BASE=http://localhost:4000
```

## Support

If you continue to have issues:
1. Check the server console logs for detailed error messages
2. Verify your Resend account status and credits
3. Test with a simple email first using Resend's API directly
4. Ensure all environment variables are properly set and the server is restarted

