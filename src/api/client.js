// API client for backend communication
import { debugLogger } from '../utils/debug';

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

export const api = {
  async verifyPin(pin) {
    debugLogger.info('API', 'Verifying PIN', { pinLength: pin.length });

    try {
      const response = await fetch(`${API_BASE}/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pin })
      });

      const data = await response.json();
      debugLogger.info('API', 'PIN verification response', {
        status: response.status,
        success: data.success
      });

      return data;
    } catch (error) {
      debugLogger.error('API', 'PIN verification error', { error: error.message });
      throw error;
    }
  },

  async uploadImage(imageData, timestamp, detectCards = false) {
    debugLogger.info('API', 'Uploading image', {
      timestamp,
      imageSize: imageData.length,
      imageSizeKB: Math.round(imageData.length / 1024),
      detectCards
    });

    try {
      const response = await fetch(`${API_BASE}/upload-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: imageData,
          timestamp,
          detectCards
        })
      });

      const data = await response.json();
      debugLogger.info('API', 'Image upload response', {
        status: response.status,
        success: data.success,
        hasDetection: !!data.detection,
        detectionSuccess: data.detection?.success,
        cardCount: data.detection?.cards?.length || 0
      });

      return data;
    } catch (error) {
      debugLogger.error('API', 'Image upload error', { error: error.message });
      throw error;
    }
  },

  async getLatestImage() {
    debugLogger.verbose('API', 'Fetching latest image');

    try {
      const response = await fetch(`${API_BASE}/latest-image`);
      const data = await response.json();

      debugLogger.verbose('API', 'Latest image response', {
        status: response.status,
        hasImage: !!data.image,
        timestamp: data.timestamp,
        hasDetection: !!data.detection,
        detectionSuccess: data.detection?.success,
        cardCount: data.detection?.cards?.length || 0
      });

      return data;
    } catch (error) {
      debugLogger.error('API', 'Fetch image error', { error: error.message });
      throw error;
    }
  },

  async checkHealth() {
    debugLogger.verbose('API', 'Health check');

    try {
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();

      debugLogger.verbose('API', 'Health check response', {
        status: response.status,
        data
      });

      return data;
    } catch (error) {
      debugLogger.error('API', 'Health check error', { error: error.message });
      throw error;
    }
  },

  async testDetection(imageData) {
    debugLogger.info('API', 'Testing card detection');

    try {
      const response = await fetch(`${API_BASE}/test-detection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });

      const data = await response.json();
      debugLogger.info('API', 'Test detection response', {
        success: data.success,
        cardCount: data.cards?.length || 0,
        timing: data.timing?.duration,
        error: data.error
      });

      return data;
    } catch (error) {
      debugLogger.error('API', 'Test detection error', { error: error.message });
      throw error;
    }
  },

  async getDetectionConfig() {
    debugLogger.info('API', 'Fetching detection config');

    try {
      const response = await fetch(`${API_BASE}/detection-config`);
      const data = await response.json();

      debugLogger.info('API', 'Detection config response', data);
      return data;
    } catch (error) {
      debugLogger.error('API', 'Detection config error', { error: error.message });
      throw error;
    }
  }
};
