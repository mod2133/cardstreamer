import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { storage } from '../utils/storage';
import { debugLogger } from '../utils/debug';
import { getCardName } from '../utils/cardNames';
import './ViewerMode.css';

export default function ViewerMode() {
  const [image, setImage] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [detection, setDetection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewerTimeout] = useState(storage.getViewerTimeout());
  const [cameraTimezone] = useState(storage.getCameraTimezone());
  const intervalRef = useRef(null);
  const pollInterval = 2000; // Poll every 2 seconds

  useEffect(() => {
    debugLogger.info('ViewerMode', 'Initializing viewer', {
      pollInterval,
      viewerTimeout
    });

    fetchImage();
    startPolling();

    return () => {
      debugLogger.info('ViewerMode', 'Cleaning up viewer');
      stopPolling();
    };
  }, []);

  const startPolling = () => {
    debugLogger.verbose('ViewerMode', 'Starting polling', { intervalMs: pollInterval });

    stopPolling();

    intervalRef.current = setInterval(() => {
      fetchImage();
    }, pollInterval);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      debugLogger.verbose('ViewerMode', 'Stopping polling');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const fetchImage = async () => {
    try {
      debugLogger.verbose('ViewerMode', 'Fetching image');
      const result = await api.getLatestImage();

      if (result.success) {
        if (result.image && result.timestamp) {
          const imageAge = Date.now() - new Date(result.timestamp).getTime();
          const isStale = imageAge > (viewerTimeout * 1000);

          debugLogger.verbose('ViewerMode', 'Image received', {
            timestamp: result.timestamp,
            ageSeconds: Math.round(imageAge / 1000),
            isStale,
            hasDetection: !!result.detection,
            detectionSuccess: result.detection?.success,
            cardCount: result.detection?.cards?.length || 0
          });

          if (isStale) {
            setImage(null);
            setTimestamp(null);
            setDetection(null);
          } else {
            setImage(result.image);
            setTimestamp(result.timestamp);
            setDetection(result.detection);
          }
        } else {
          debugLogger.verbose('ViewerMode', 'No image available');
          setImage(null);
          setTimestamp(null);
          setDetection(null);
        }

        setError(null);
      } else {
        throw new Error('Failed to fetch image');
      }
    } catch (err) {
      debugLogger.error('ViewerMode', 'Fetch error', { error: err.message });
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
          <p>Connection Error</p>
          <p className="error-message">{error}</p>
        </div>
      );
    }

    if (!image) {
      return (
        <div className="viewer-placeholder no-image">
          <p>No Recent Picture</p>
          <p className="timeout-info">
            Waiting for camera
          </p>
        </div>
      );
    }

    const date = new Date(timestamp);
    const cameraTime = date.toLocaleTimeString('en-US', {
      timeZone: cameraTimezone,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
    const localTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });

    return (
      <>
        <img src={image} alt="Latest capture" className="viewer-image" />
        <div className="viewer-timestamp">
          <div>Camera: {cameraTime}</div>
          <div>Your time: {localTime}</div>
        </div>
      </>
    );
  };

  return (
    <div className="viewer-mode">
      <div className="viewer-container">
        {renderContent()}
      </div>

      {image && (
        <div className="cards-section">
          {!detection && (
            <div className="detection-status info">
              <p className="status-message">
                Card detection was not enabled for this capture
              </p>
            </div>
          )}

          {detection && !detection.success && (
            <div className="detection-status error">
              <p className="status-title">Detection Failed</p>
              <p className="status-message">
                {detection.error || 'Unable to detect cards in this image'}
              </p>
              <p className="status-hint">
                Check Settings → Debug Logs for details
              </p>
            </div>
          )}

          {detection && detection.success && detection.cards.length === 0 && (
            <div className="detection-status warning">
              <p className="status-message">
                No playing cards detected in this image
              </p>
              <p className="status-hint">
                Ensure cards are clearly visible and well-lit
              </p>
            </div>
          )}

          {detection && detection.success && detection.cards.length > 0 && (
            <>
              <h3>Detected Cards ({detection.cards.length})</h3>
              <div className="cards-list">
                {detection.cards.map((card, index) => (
                  <div key={index} className="card-item">
                    <span className="card-name">{getCardName(card.class)}</span>
                    <span className="card-confidence">
                      {Math.round(card.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
              {detection.totalDetections > detection.cards.length && (
                <p className="detection-note">
                  {detection.totalDetections - detection.cards.length} duplicate(s) removed
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
