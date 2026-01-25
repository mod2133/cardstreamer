# CardStreamer PWA

Progressive Web App for streaming camera images with viewer mode support.

## Features

- 📱 iOS-compatible PWA
- 📷 Camera mode with manual/auto capture
- 👀 Viewer mode with auto-refresh
- 🔒 PIN authentication
- ⚙️ Configurable settings
- 🎯 Optimized for YOLOv8 object detection (640x480)

## Configuration

### PIN Code
Default PIN: `1234`
To change, edit `server/config.js`

### Auto-capture Interval
Default: 10 seconds
Configurable in app settings

### Viewer Timeout
Default: 60 seconds
Shows "no recent picture taken" if no image received

## Development

```bash
# Install dependencies
npm install

# Run in development mode (both server and client)
npm run dev

# Access at http://localhost:5173
```

## Production Deployment (Render.com)

1. Push code to GitHub
2. Create new Web Service on Render.com
3. Connect your repository
4. Use these settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node

The app will be available at your Render URL.

## Usage

1. Open the app and enter PIN (default: 1234)
2. Go to Settings to choose mode:
   - **Viewer**: See images from camera device(s)
   - **Camera**: Take pictures to share with viewers
3. In Camera mode:
   - Tap "Take Picture" for manual capture
   - Enable "Auto Capture" for automatic interval capture
4. Viewers will automatically see new images

## Architecture

- **Backend**: Express.js server
- **Frontend**: React PWA with Vite
- **Image Storage**: In-memory (no persistence)
- **Resolution**: 640x480 (VGA)
- **Update Method**: Polling

## Future Features

- Roboflow object detection integration
- Real-time WebSocket updates
