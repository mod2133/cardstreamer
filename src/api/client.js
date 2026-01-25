// API client for backend communication
import { debugLogger } from '../utils/debug';

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

export const api = {
  async verifyPin(pin) {
    debugLogger.log('API', 'Verifying PIN', { pinLength: pin.length });

    try {
      const response = await fetch(`${API_BASE}/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pin })
      });

      const data = await response.json();
      debugLogger.log('API', 'PIN verification response', {
        status: response.status,
        success: data.success
      });

      return data;
    } catch (error) {
      debugLogger.log('API', 'PIN verification error', { error: error.message });
      throw error;
    }
  },

  async uploadImage(imageData, timestamp, detectCards = false) {
    debugLogger.log('API', 'Uploading image', {
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
      debugLogger.log('API', 'Image upload response', {
        status: response.status,
        success: data.success,
        hasDetection: !!data.detection,
        detectionSuccess: data.detection?.success,
        cardCount: data.detection?.cards?.length || 0
      });

      return data;
    } catch (error) {
      debugLogger.log('API', 'Image upload error', { error: error.message });
      throw error;
    }
  },

  async getLatestImage() {
    debugLogger.log('API', 'Fetching latest image');

    try {
      const response = await fetch(`${API_BASE}/latest-image`);
      const data = await response.json();

      debugLogger.log('API', 'Latest image response', {
        status: response.status,
        hasImage: !!data.image,
        timestamp: data.timestamp,
        hasDetection: !!data.detection,
        detectionSuccess: data.detection?.success,
        cardCount: data.detection?.cards?.length || 0
      });

      return data;
    } catch (error) {
      debugLogger.log('API', 'Fetch image error', { error: error.message });
      throw error;
    }
  },

  async checkHealth() {
    debugLogger.log('API', 'Health check');

    try {
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();

      debugLogger.log('API', 'Health check response', {
        status: response.status,
        data
      });

      return data;
    } catch (error) {
      debugLogger.log('API', 'Health check error', { error: error.message });
      throw error;
    }
  }
};
