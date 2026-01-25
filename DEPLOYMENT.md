# Deployment Guide

## Render.com Deployment

### Prerequisites
1. GitHub account
2. Render.com account (free tier available)

### Steps

#### 1. Push to GitHub

First, push your code to GitHub:

```bash
# Create a new repository on GitHub first, then:
git add .
git commit -m "Initial commit: CardStreamer PWA"
git remote add origin https://github.com/YOUR_USERNAME/cardstreamer.git
git branch -M main
git push -u origin main
```

#### 2. Deploy to Render.com

1. Go to [Render.com](https://render.com) and sign in
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Use these settings:
   - **Name**: cardstreamer (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or paid for better performance)

5. Click "Create Web Service"

#### 3. Configuration

Render will automatically detect the `render.yaml` file and use those settings.

**Environment Variables** (optional):
- `PORT` - Automatically set by Render (10000)
- `NODE_ENV` - Set to "production"

#### 4. Custom Domain (Optional)

After deployment:
1. Go to Settings → Custom Domain
2. Add your domain
3. Follow DNS configuration instructions

### Deployment Notes

- **Cold Start**: Free tier services may sleep after inactivity. First request may be slow.
- **HTTPS**: Render provides free SSL certificates automatically
- **Logs**: Available in the Render dashboard for debugging
- **Auto-Deploy**: Render auto-deploys on git push to main branch

### Testing the Deployed App

1. Once deployed, visit your Render URL (e.g., `https://cardstreamer.onrender.com`)
2. Enter PIN (default: 1234)
3. Test both Camera and Viewer modes on different devices

### Troubleshooting

**Build Fails:**
- Check Node version is 18+ in logs
- Verify package.json scripts are correct

**App Won't Start:**
- Check server logs in Render dashboard
- Ensure PORT environment variable is used correctly

**Camera Not Working:**
- HTTPS is required for camera access (Render provides this)
- Check browser permissions for camera access
- iOS requires user gesture to trigger camera

**PWA Not Installing:**
- Ensure HTTPS is enabled (automatic on Render)
- Check manifest.json is generated correctly
- iOS: Use "Add to Home Screen" from Safari Share menu

### Performance Tips

For production use:
1. Upgrade to paid Render tier for better performance
2. Add Redis for image caching if needed
3. Implement WebSocket for real-time updates (currently polling)
4. Add image compression/optimization

### Security Recommendations

1. **Change Default PIN**: Edit `server/config.js` before deploying
2. **Environment Variables**: Move PIN to environment variable:
   ```javascript
   PIN_CODE: process.env.PIN_CODE || '1234'
   ```
3. **Rate Limiting**: Add rate limiting for API endpoints
4. **CORS**: Configure CORS for specific origins in production
