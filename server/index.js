import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config, log } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' })); // For base64 images

// In-memory storage for the latest image
let latestImage = null;
let imageTimestamp = null;

log('Server starting...');
log('Configuration:', {
  PORT: config.PORT,
  PIN_CODE: '****', // Don't log actual PIN
  IMAGE_TIMEOUT: config.IMAGE_TIMEOUT,
  DEBUG: config.DEBUG
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  log('Health check request');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasImage: !!latestImage
  });
});

// PIN verification endpoint
app.post('/api/verify-pin', (req, res) => {
  const { pin } = req.body;
  log('PIN verification attempt:', { providedPin: '****', match: pin === config.PIN_CODE });

  if (pin === config.PIN_CODE) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid PIN' });
  }
});

// Upload image endpoint
app.post('/api/upload-image', (req, res) => {
  const { image, timestamp } = req.body;

  if (!image) {
    log('Upload failed: No image provided');
    return res.status(400).json({ success: false, message: 'No image provided' });
  }

  latestImage = image;
  imageTimestamp = timestamp || new Date().toISOString();

  log('Image uploaded successfully', {
    timestamp: imageTimestamp,
    imageSize: image.length,
    imageSizeKB: Math.round(image.length / 1024)
  });

  res.json({
    success: true,
    timestamp: imageTimestamp
  });
});

// Get latest image endpoint
app.get('/api/latest-image', (req, res) => {
  const now = Date.now();
  const imageAge = imageTimestamp ? now - new Date(imageTimestamp).getTime() : null;

  log('Image request', {
    hasImage: !!latestImage,
    imageTimestamp,
    imageAge: imageAge ? `${Math.round(imageAge / 1000)}s` : 'N/A',
    isStale: imageAge && imageAge > config.IMAGE_TIMEOUT
  });

  // Check if image is too old
  if (!latestImage || !imageTimestamp || imageAge > config.IMAGE_TIMEOUT) {
    log('Returning no image (stale or missing)');
    return res.json({
      success: true,
      image: null,
      timestamp: null
    });
  }

  res.json({
    success: true,
    image: latestImage,
    timestamp: imageTimestamp
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '../dist');
  log('Serving static files from:', distPath);
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// Start server
app.listen(config.PORT, () => {
  log(`Server running on port ${config.PORT}`);
  log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV !== 'production') {
    log(`API available at: http://localhost:${config.PORT}/api`);
  }
});
