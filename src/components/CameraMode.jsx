import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { storage } from '../utils/storage';
import { debugLogger } from '../utils/debug';
import { getCardName } from '../utils/cardNames';
import './CameraMode.css';

export default function CameraMode() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [lastCapture, setLastCapture] = useState(null);
  const [autoCapture, setAutoCapture] = useState(storage.getAutoCapture());
  const [captureInterval, setCaptureInterval] = useState(storage.getCaptureInterval());
  const [cardDetection, setCardDetection] = useState(storage.getCardDetection());
  const [countdown, setCountdown] = useState(null);
  const [testing, setTesting] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const nextCaptureTimeRef = useRef(null);
  const captureIntervalRef = useRef(captureInterval);
  const autoCaptureRef = useRef(autoCapture);
  const cardDetectionRef = useRef(cardDetection);

  // Keep refs in sync
  useEffect(() => {
    captureIntervalRef.current = captureInterval;
  }, [captureInterval]);

  useEffect(() => {
    autoCaptureRef.current = autoCapture;
  }, [autoCapture]);

  useEffect(() => {
    cardDetectionRef.current = cardDetection;
  }, [cardDetection]);

  // Sync settings from storage periodically
  useEffect(() => {
    const syncInterval = setInterval(() => {
      const newAutoCapture = storage.getAutoCapture();
      const newCaptureInterval = storage.getCaptureInterval();
      const newCardDetection = storage.getCardDetection();

      if (newAutoCapture !== autoCapture) {
        debugLogger.verbose('CameraMode', 'Auto capture setting synced from storage', {
          old: autoCapture,
          new: newAutoCapture
        });
        setAutoCapture(newAutoCapture);
      }

      if (newCaptureInterval !== captureInterval) {
        debugLogger.verbose('CameraMode', 'Capture interval synced from storage', {
          old: captureInterval,
          new: newCaptureInterval
        });
        setCaptureInterval(newCaptureInterval);
      }

      if (newCardDetection !== cardDetection) {
        debugLogger.verbose('CameraMode', 'Card detection setting synced from storage', {
          old: cardDetection,
          new: newCardDetection
        });
        setCardDetection(newCardDetection);
      }
    }, 500);

    return () => clearInterval(syncInterval);
  }, [autoCapture, captureInterval, cardDetection]);

  useEffect(() => {
    debugLogger.info('CameraMode', 'Initializing camera');
    initCamera();

    return () => {
      debugLogger.info('CameraMode', 'Cleaning up camera');
      stopCamera();
      stopCountdown();
    };
  }, []);

  useEffect(() => {
    debugLogger.verbose('CameraMode', 'AutoCapture effect triggered', {
      autoCapture,
      captureInterval,
      hasStream: !!stream,
      currentIntervalRef: intervalRef.current
    });

    if (autoCapture && stream) {
      startAutoCapture();
    } else {
      stopAutoCapture();
      stopCountdown();
      setCountdown(null);
    }

    return () => {
      debugLogger.verbose('CameraMode', 'AutoCapture effect cleanup', {
        intervalRef: intervalRef.current
      });
      stopAutoCapture();
      stopCountdown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCapture, captureInterval, stream]);

  const initCamera = async () => {
    try {
      debugLogger.info('CameraMode', 'Requesting camera access', {
        constraints: { video: { width: 640, height: 480, facingMode: 'environment' } }
      });

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment' // Prefer back camera on mobile
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        debugLogger.info('CameraMode', 'Camera initialized successfully');
      }
    } catch (err) {
      debugLogger.error('CameraMode', 'Camera access error', { error: err.message });
      alert('Failed to access camera: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        debugLogger.verbose('CameraMode', 'Camera track stopped', { kind: track.kind });
      });
    }
  };

  const testDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      debugLogger.warn('CameraMode', 'Test skipped - no video');
      return;
    }

    const captureTimestamp = new Date().toISOString();
    debugLogger.info('CameraMode', 'Starting test detection', { captureTimestamp });
    setTesting(true);

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = 640;
      canvas.height = 480;

      const ctx = canvas.getContext('2d');
      // Clear canvas completely to ensure fresh frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw current video frame
      ctx.drawImage(video, 0, 0, 640, 480);

      // Add timestamp overlay to prove freshness
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 300, 30);
      ctx.fillStyle = '#00FF00';
      ctx.font = '14px monospace';
      ctx.fillText(`TEST: ${new Date().toLocaleTimeString()}`, 15, 30);

      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      debugLogger.info('CameraMode', 'Test frame captured from video', {
        captureTimestamp,
        videoTime: video.currentTime,
        videoPaused: video.paused,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        imageSize: imageData.length,
        imageSizeKB: Math.round(imageData.length / 1024)
      });

      const result = await api.testDetection(imageData);

      debugLogger.info('CameraMode', 'Test detection complete', {
        success: result.success,
        cardCount: result.cards?.length || 0,
        timing: result.timing?.duration
      });

      setTestResults({
        ...result,
        capturedImage: imageData,
        captureTimestamp
      });
      setShowTestModal(true);
    } catch (err) {
      debugLogger.error('CameraMode', 'Test detection failed', { error: err.message });
      setTestResults({
        success: false,
        error: err.message
      });
      setShowTestModal(true);
    } finally {
      setTesting(false);
    }
  }, []);

  const captureImage = useCallback(async () => {
    if (!videoRef.current) {
      debugLogger.warn('CameraMode', 'Capture skipped - no video');
      return;
    }

    debugLogger.info('CameraMode', 'Starting capture');
    setCapturing(true);

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = 640;
      canvas.height = 480;

      const ctx = canvas.getContext('2d');
      // Clear canvas to ensure fresh frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw current video frame
      ctx.drawImage(video, 0, 0, 640, 480);

      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      const timestamp = new Date().toISOString();
      const detectCards = cardDetectionRef.current;

      debugLogger.info('CameraMode', 'Image captured from video', {
        timestamp,
        videoTime: video.currentTime,
        videoPaused: video.paused,
        size: imageData.length,
        sizeKB: Math.round(imageData.length / 1024),
        detectCards
      });

      const response = await api.uploadImage(imageData, timestamp, detectCards);

      setLastCapture({
        timestamp,
        image: imageData
      });

      debugLogger.info('CameraMode', 'Image uploaded successfully', {
        detectionEnabled: detectCards,
        detectionSuccess: response.detection?.success,
        cardsDetected: response.detection?.cards?.length || 0
      });
    } catch (err) {
      debugLogger.error('CameraMode', 'Capture error', { error: err.message });
      alert('Failed to capture/upload image: ' + err.message);
    } finally {
      setCapturing(false);
    }
  }, []);

  const startAutoCapture = useCallback(() => {
    const interval = captureIntervalRef.current;

    debugLogger.verbose('CameraMode', 'Starting auto-capture', {
      intervalSeconds: interval
    });

    stopAutoCapture();
    stopCountdown();

    // Take first picture immediately
    captureImage();

    // Set up next capture time
    nextCaptureTimeRef.current = Date.now() + (interval * 1000);
    setCountdown(interval);

    debugLogger.verbose('CameraMode', 'Setting up interval timer', {
      intervalMs: interval * 1000
    });

    // Start interval for captures
    intervalRef.current = setInterval(() => {
      debugLogger.verbose('CameraMode', 'Auto-capture interval fired!', {
        intervalSeconds: captureIntervalRef.current,
        autoCaptureEnabled: autoCaptureRef.current
      });
      captureImage();
      const currentInterval = captureIntervalRef.current;
      nextCaptureTimeRef.current = Date.now() + (currentInterval * 1000);
      setCountdown(currentInterval);
    }, interval * 1000);

    debugLogger.verbose('CameraMode', 'Interval timer created', {
      intervalId: intervalRef.current
    });

    // Start countdown timer
    startCountdown();
  }, [captureImage]);

  const startCountdown = useCallback(() => {
    stopCountdown();

    debugLogger.verbose('CameraMode', 'Starting countdown timer');

    countdownRef.current = setInterval(() => {
      if (nextCaptureTimeRef.current) {
        const remaining = Math.ceil((nextCaptureTimeRef.current - Date.now()) / 1000);
        if (remaining >= 0) {
          setCountdown(remaining);
        }
      }
    }, 100); // Update every 100ms for smooth countdown
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      debugLogger.verbose('CameraMode', 'Stopping countdown timer');
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const stopAutoCapture = useCallback(() => {
    if (intervalRef.current) {
      debugLogger.verbose('CameraMode', 'Stopping auto-capture', {
        intervalId: intervalRef.current
      });
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    nextCaptureTimeRef.current = null;
  }, []);

  return (
    <div className="camera-mode">
      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-video"
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {lastCapture && (
          <div className="last-capture-overlay">
            <img src={lastCapture.image} alt="Last capture" />
          </div>
        )}

        {autoCapture && countdown !== null && (
          <div className="auto-capture-indicator">
            <div className="countdown-ring">
              <svg className="countdown-svg" viewBox="0 0 36 36">
                <circle
                  className="countdown-circle-bg"
                  cx="18"
                  cy="18"
                  r="16"
                />
                <circle
                  className="countdown-circle"
                  cx="18"
                  cy="18"
                  r="16"
                  style={{
                    strokeDasharray: `${(countdown / captureInterval) * 100} 100`
                  }}
                />
              </svg>
              <div className="countdown-text">{countdown}s</div>
            </div>
          </div>
        )}
      </div>

      <div className="camera-controls">
        <button
          onClick={captureImage}
          disabled={capturing || !stream}
          className="capture-button"
          aria-label="Take picture"
        >
          <div className="capture-button-inner"></div>
        </button>
        {lastCapture && (
          <div className="capture-time">
            {new Date(lastCapture.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>

      {cardDetection && (
        <div className="test-detection-container">
          <button
            onClick={testDetection}
            disabled={testing || !stream}
            className="test-button"
          >
            {testing ? 'Testing...' : 'Test Detection'}
          </button>
        </div>
      )}

      {showTestModal && testResults && (
        <div className="test-modal-overlay" onClick={() => setShowTestModal(false)}>
          <div className="test-modal" onClick={(e) => e.stopPropagation()}>
            <div className="test-modal-header">
              <h2>Detection Test Results</h2>
              <button onClick={() => setShowTestModal(false)} className="close-button">×</button>
            </div>

            <div className="test-modal-content">
              {testResults.capturedImage && (
                <div className="test-image-preview">
                  <img src={testResults.capturedImage} alt="Test capture" />
                </div>
              )}

              <div className="test-status">
                <div className={`status-badge ${testResults.success ? 'success' : 'error'}`}>
                  {testResults.success ? '✓ Success' : '✗ Failed'}
                </div>
                <div className="test-meta">
                  {testResults.captureTimestamp && (
                    <div className="test-timing">
                      Captured: {new Date(testResults.captureTimestamp).toLocaleTimeString()}
                    </div>
                  )}
                  {testResults.timing && (
                    <div className="test-timing">
                      Response: {testResults.timing.duration}
                    </div>
                  )}
                </div>
              </div>

              {testResults.error && (
                <div className="test-error">
                  <strong>Error:</strong> {testResults.error}
                </div>
              )}

              {testResults.success && testResults.cards && (
                <div className="test-cards">
                  <h3>Detected Cards ({testResults.cards.length})</h3>
                  {testResults.cards.length > 0 ? (
                    <div className="test-cards-list">
                      {testResults.cards.map((card, index) => (
                        <div key={index} className="test-card-item">
                          <span className="card-name">{getCardName(card.class)}</span>
                          <span className="card-confidence">
                            {Math.round(card.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-cards">No cards detected in this image</p>
                  )}
                  {testResults.totalDetections > testResults.cards.length && (
                    <p className="dedup-note">
                      {testResults.totalDetections - testResults.cards.length} duplicate(s) removed
                    </p>
                  )}
                </div>
              )}

              {testResults.raw && (
                <div className="test-raw-response">
                  <details>
                    <summary>Raw Roboflow Response (Click to expand)</summary>
                    <pre className="json-response">
                      {JSON.stringify(testResults.raw, null, 2)}
                    </pre>
                  </details>
                </div>
              )}

              {testResults.config && (
                <div className="test-config">
                  <h3>Configuration</h3>
                  <div className="config-item">
                    <span>API Key:</span>
                    <span>{testResults.config.hasApiKey ? testResults.config.apiKeyPreview : 'Not set'}</span>
                  </div>
                  <div className="config-item">
                    <span>Workflow URL:</span>
                    <span className="url-text">{testResults.config.workflowUrl}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
