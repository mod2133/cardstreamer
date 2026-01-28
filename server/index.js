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
  log('Starting card detection', {
    imageSize: imageBase64.length,
    imageSizeKB: Math.round(imageBase64.length / 1024)
  });

  try {
    const requestPayload = {
      api_key: config.ROBOFLOW_API_KEY,
      inputs: {
        image: { type: 'base64', value: imageBase64 }
      }
    };

    log('Sending request to Roboflow', {
      url: config.ROBOFLOW_WORKFLOW_URL,
      payloadKeys: Object.keys(requestPayload),
      hasApiKey: !!requestPayload.api_key
    });

    const response = await fetch(config.ROBOFLOW_WORKFLOW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload)
    });

    const responseText = await response.text();
    log('Roboflow response received', {
      status: response.status,
      statusText: response.statusText,
      contentLength: responseText.length
    });

    if (!response.ok) {
      log('Roboflow API error', {
        status: response.status,
        statusText: response.statusText,
        body: responseText.substring(0, 500)
      });
      throw new Error(`Roboflow API error: ${response.status} - ${responseText.substring(0, 200)}`);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      log('Failed to parse Roboflow response', {
        error: parseError.message,
        responsePreview: responseText.substring(0, 200)
      });
      throw new Error('Invalid JSON response from Roboflow');
    }

    // Validate response structure
    if (!result.outputs) {
      log('Unexpected response structure', {
        keys: Object.keys(result)
      });
      throw new Error('Response missing "outputs" field');
    }

    console.log('=== ROBOFLOW RESPONSE STRUCTURE ===');
    console.log('Has outputs:', !!result.outputs);
    console.log('Output keys:', result.outputs ? Object.keys(result.outputs) : []);
    console.log('Full outputs:', JSON.stringify(result.outputs, null, 2));
    console.log('=== END ROBOFLOW RESPONSE ===');

    log('Roboflow API response parsed', {
      hasOutputs: !!result.outputs,
      outputKeys: result.outputs ? Object.keys(result.outputs) : []
    });

    // Extract predictions from the workflow response
    // Roboflow workflows return outputs as an object where keys can be '0', '1', etc.
    let predictions = [];
    if (result.outputs) {
      log('Searching for predictions in outputs', {
        availableKeys: Object.keys(result.outputs)
      });

      // Iterate through all output keys (usually '0', '1', etc.)
      for (const outputKey of Object.keys(result.outputs)) {
        const output = result.outputs[outputKey];
        console.log(`\nChecking output key "${outputKey}":`, {
          hasModelPredictions: !!output.model_predictions,
          hasPredictions: !!output.model_predictions?.predictions
        });

        // Check if this output has model_predictions.predictions
        if (output.model_predictions && output.model_predictions.predictions && Array.isArray(output.model_predictions.predictions)) {
          predictions = output.model_predictions.predictions;
          console.log(`✓ FOUND ${predictions.length} predictions in outputs["${outputKey}"].model_predictions`);
          log('✓ Found predictions', {
            outputKey,
            count: predictions.length
          });
          break;
        }
      }

      // If still no predictions, log for debugging
      if (predictions.length === 0) {
        console.log('\n❌ NO PREDICTIONS FOUND!');
        console.log('Available output keys:', Object.keys(result.outputs));
        const firstKey = Object.keys(result.outputs)[0];
        if (firstKey) {
          console.log(`Structure of outputs["${firstKey}"]:`, Object.keys(result.outputs[firstKey]));
        }
      }
    }

    log('Raw predictions from Roboflow', {
      count: predictions.length,
      predictions: predictions.map(p => ({
        class: p.class,
        confidence: p.confidence,
        confidencePercent: Math.round(p.confidence * 100) + '%'
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
      totalDetections: predictions.length,
      raw: result
    };

  } catch (error) {
    log('Card detection error', {
      error: error.message,
      stack: error.stack
    });
    return {
      success: false,
      error: error.message,
      cards: [],
      raw: null
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

// Test detection endpoint - does NOT store image
app.post('/api/test-detection', async (req, res) => {
  const startTime = Date.now();
  const { image } = req.body;

  log('Test detection request received', {
    imageSize: image?.length,
    timestamp: new Date().toISOString()
  });

  if (!image) {
    return res.status(400).json({
      success: false,
      error: 'No image provided'
    });
  }

  try {
    const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, '');
    const detection = await detectPlayingCards(base64Image);
    const duration = Date.now() - startTime;

    res.json({
      success: detection.success,
      cards: detection.cards,
      totalDetections: detection.totalDetections,
      error: detection.error,
      timing: {
        duration: `${duration}ms`,
        startTime: new Date(startTime).toISOString()
      },
      config: {
        workflowUrl: config.ROBOFLOW_WORKFLOW_URL,
        hasApiKey: !!config.ROBOFLOW_API_KEY,
        apiKeyPreview: config.ROBOFLOW_API_KEY?.substring(0, 8) + '...'
      },
      raw: detection.raw
    });
  } catch (error) {
    log('Test detection error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message,
      stack: config.DEBUG ? error.stack : undefined
    });
  }
});

// Detection config endpoint
app.get('/api/detection-config', (req, res) => {
  res.json({
    configured: !!config.ROBOFLOW_API_KEY,
    workflowUrl: config.ROBOFLOW_WORKFLOW_URL,
    apiKeySet: !!config.ROBOFLOW_API_KEY,
    apiKeyPreview: config.ROBOFLOW_API_KEY ?
      config.ROBOFLOW_API_KEY.substring(0, 8) + '...' :
      'NOT SET',
    debugMode: config.DEBUG
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
