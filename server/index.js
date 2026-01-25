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
let detectedCards = null;

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

// Detect playing cards using Roboflow API
async function detectPlayingCards(imageBase64) {
  log('Starting card detection');

  try {
    const response = await fetch(config.ROBOFLOW_WORKFLOW_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: config.ROBOFLOW_API_KEY,
        inputs: {
          image: { type: 'base64', value: imageBase64 }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('Roboflow API error', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Roboflow API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    log('Roboflow API response received', {
      hasOutputs: !!result.outputs,
      outputKeys: result.outputs ? Object.keys(result.outputs) : []
    });

    // Extract predictions from the workflow response
    let predictions = [];
    if (result.outputs && result.outputs.llave_model_predictions) {
      predictions = result.outputs.llave_model_predictions.predictions || [];
    }

    log('Raw predictions from Roboflow', {
      count: predictions.length,
      predictions: predictions.map(p => ({
        class: p.class,
        confidence: p.confidence
      }))
    });

    // Deduplicate cards (same suite and number = one card)
    const uniqueCards = deduplicateCards(predictions);

    log('Card detection complete', {
      totalDetections: predictions.length,
      uniqueCards: uniqueCards.length,
      cards: uniqueCards.map(c => c.class)
    });

    return {
      success: true,
      cards: uniqueCards,
      totalDetections: predictions.length
    };

  } catch (error) {
    log('Card detection error', {
      error: error.message,
      stack: error.stack
    });
    return {
      success: false,
      error: error.message,
      cards: []
    };
  }
}

// Deduplicate cards - if same suite and number, keep only one
function deduplicateCards(predictions) {
  const cardMap = new Map();

  predictions.forEach(prediction => {
    const cardName = prediction.class;
    const confidence = prediction.confidence;

    log('Processing prediction', {
      card: cardName,
      confidence: confidence,
      x: prediction.x,
      y: prediction.y
    });

    // If card already exists, keep the one with higher confidence
    if (cardMap.has(cardName)) {
      const existing = cardMap.get(cardName);
      if (confidence > existing.confidence) {
        log('Replacing duplicate card with higher confidence', {
          card: cardName,
          oldConfidence: existing.confidence,
          newConfidence: confidence
        });
        cardMap.set(cardName, prediction);
      } else {
        log('Keeping existing card (higher confidence)', {
          card: cardName,
          existingConfidence: existing.confidence,
          newConfidence: confidence
        });
      }
    } else {
      cardMap.set(cardName, prediction);
    }
  });

  const uniqueCards = Array.from(cardMap.values()).map(p => ({
    class: p.class,
    confidence: p.confidence,
    x: p.x,
    y: p.y
  }));

  log('Deduplication complete', {
    original: predictions.length,
    unique: uniqueCards.length,
    removed: predictions.length - uniqueCards.length
  });

  return uniqueCards;
}

// Upload image endpoint
app.post('/api/upload-image', async (req, res) => {
  const { image, timestamp, detectCards } = req.body;

  if (!image) {
    log('Upload failed: No image provided');
    return res.status(400).json({ success: false, message: 'No image provided' });
  }

  latestImage = image;
  imageTimestamp = timestamp || new Date().toISOString();

  log('Image uploaded successfully', {
    timestamp: imageTimestamp,
    imageSize: image.length,
    imageSizeKB: Math.round(image.length / 1024),
    detectCards: detectCards
  });

  // Run card detection if enabled
  if (detectCards) {
    log('Card detection enabled, starting detection...');
    // Remove data:image/jpeg;base64, prefix if present
    const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, '');
    const detection = await detectPlayingCards(base64Image);
    detectedCards = detection;

    log('Card detection result stored', {
      success: detection.success,
      cardCount: detection.cards.length,
      error: detection.error
    });
  } else {
    log('Card detection disabled, skipping');
    detectedCards = null;
  }

  res.json({
    success: true,
    timestamp: imageTimestamp,
    detection: detectedCards
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
    isStale: imageAge && imageAge > config.IMAGE_TIMEOUT,
    hasDetection: !!detectedCards
  });

  // Check if image is too old
  if (!latestImage || !imageTimestamp || imageAge > config.IMAGE_TIMEOUT) {
    log('Returning no image (stale or missing)');
    return res.json({
      success: true,
      image: null,
      timestamp: null,
      detection: null
    });
  }

  res.json({
    success: true,
    image: latestImage,
    timestamp: imageTimestamp,
    detection: detectedCards
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
