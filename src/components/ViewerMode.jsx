import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { storage } from '../utils/storage';
import { debugLogger } from '../utils/debug';
import './ViewerMode.css';

export default function ViewerMode() {
  const [image, setImage] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewerTimeout] = useState(storage.getViewerTimeout());
  const intervalRef = useRef(null);
  const pollInterval = 2000; // Poll every 2 seconds

  useEffect(() => {
    debugLogger.log('ViewerMode', 'Initializing viewer', {
      pollInterval,
      viewerTimeout
    });

    fetchImage();
    startPolling();

    return () => {
      debugLogger.log('ViewerMode', 'Cleaning up viewer');
      stopPolling();
    };
  }, []);

  const startPolling = () => {
    debugLogger.log('ViewerMode', 'Starting polling', { intervalMs: pollInterval });

    stopPolling();

    intervalRef.current = setInterval(() => {
      fetchImage();
    }, pollInterval);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      debugLogger.log('ViewerMode', 'Stopping polling');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const fetchImage = async () => {
    try {
      debugLogger.log('ViewerMode', 'Fetching image');
      const result = await api.getLatestImage();

      if (result.success) {
        if (result.image && result.timestamp) {
          const imageAge = Date.now() - new Date(result.timestamp).getTime();
          const isStale = imageAge > (viewerTimeout * 1000);

          debugLogger.log('ViewerMode', 'Image received', {
            timestamp: result.timestamp,
            ageSeconds: Math.round(imageAge / 1000),
            isStale
          });

          if (isStale) {
            setImage(null);
            setTimestamp(null);
          } else {
            setImage(result.image);
            setTimestamp(result.timestamp);
          }
        } else {
          debugLogger.log('ViewerMode', 'No image available');
          setImage(null);
          setTimestamp(null);
        }

        setError(null);
      } else {
        throw new Error('Failed to fetch image');
      }
    } catch (err) {
      debugLogger.log('ViewerMode', 'Fetch error', { error: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="viewer-placeholder">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="viewer-placeholder error">
          <p>⚠️ Connection Error</p>
          <p className="error-message">{error}</p>
        </div>
      );
    }

    if (!image) {
      return (
        <div className="viewer-placeholder no-image">
          <p>📷</p>
          <p>No recent picture taken</p>
          <p className="timeout-info">
            Waiting for camera... (timeout: {viewerTimeout}s)
          </p>
        </div>
      );
    }

    return (
      <>
        <img src={image} alt="Latest capture" className="viewer-image" />
        <div className="viewer-timestamp">
          {new Date(timestamp).toLocaleString()}
        </div>
      </>
    );
  };

  return (
    <div className="viewer-mode">
      <h2>👀 Viewer Mode</h2>
      <div className="viewer-info">
        Auto-refreshing every {pollInterval / 1000} seconds
      </div>
      <div className="viewer-container">
        {renderContent()}
      </div>
      <button onClick={fetchImage} className="refresh-button">
        🔄 Refresh Now
      </button>
    </div>
  );
}
