import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { storage } from '../utils/storage';
import { debugLogger } from '../utils/debug';
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
        debugLogger.log('CameraMode', 'Auto capture setting synced from storage', {
          old: autoCapture,
          new: newAutoCapture
        });
        setAutoCapture(newAutoCapture);
      }

      if (newCaptureInterval !== captureInterval) {
        debugLogger.log('CameraMode', 'Capture interval synced from storage', {
          old: captureInterval,
          new: newCaptureInterval
        });
        setCaptureInterval(newCaptureInterval);
      }

      if (newCardDetection !== cardDetection) {
        debugLogger.log('CameraMode', 'Card detection setting synced from storage', {
          old: cardDetection,
          new: newCardDetection
        });
        setCardDetection(newCardDetection);
      }
    }, 500);

    return () => clearInterval(syncInterval);
  }, [autoCapture, captureInterval, cardDetection]);

  useEffect(() => {
    debugLogger.log('CameraMode', 'Initializing camera');
    initCamera();

    return () => {
      debugLogger.log('CameraMode', 'Cleaning up camera');
      stopCamera();
      stopCountdown();
    };
  }, []);

  useEffect(() => {
    debugLogger.log('CameraMode', 'AutoCapture effect triggered', {
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
      debugLogger.log('CameraMode', 'AutoCapture effect cleanup', {
        intervalRef: intervalRef.current
      });
      stopAutoCapture();
      stopCountdown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCapture, captureInterval, stream]);

  const initCamera = async () => {
    try {
      debugLogger.log('CameraMode', 'Requesting camera access', {
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
        debugLogger.log('CameraMode', 'Camera initialized successfully');
      }
    } catch (err) {
      debugLogger.log('CameraMode', 'Camera access error', { error: err.message });
      alert('Failed to access camera: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        debugLogger.log('CameraMode', 'Camera track stopped', { kind: track.kind });
      });
    }
  };

  const captureImage = useCallback(async () => {
    if (!videoRef.current) {
      debugLogger.log('CameraMode', 'Capture skipped - no video');
      return;
    }

    debugLogger.log('CameraMode', 'Starting capture');
    setCapturing(true);

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = 640;
      canvas.height = 480;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 640, 480);

      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      const timestamp = new Date().toISOString();
      const detectCards = cardDetectionRef.current;

      debugLogger.log('CameraMode', 'Image captured', {
        timestamp,
        size: imageData.length,
        sizeKB: Math.round(imageData.length / 1024),
        detectCards
      });

      const response = await api.uploadImage(imageData, timestamp, detectCards);

      setLastCapture({
        timestamp,
        image: imageData
      });

      debugLogger.log('CameraMode', 'Image uploaded successfully', {
        detectionEnabled: detectCards,
        detectionSuccess: response.detection?.success,
        cardsDetected: response.detection?.cards?.length || 0
      });
    } catch (err) {
      debugLogger.log('CameraMode', 'Capture error', { error: err.message });
      alert('Failed to capture/upload image: ' + err.message);
    } finally {
      setCapturing(false);
    }
  }, []);

  const startAutoCapture = useCallback(() => {
    const interval = captureIntervalRef.current;

    debugLogger.log('CameraMode', 'Starting auto-capture', {
      intervalSeconds: interval
    });

    stopAutoCapture();
    stopCountdown();

    // Take first picture immediately
    captureImage();

    // Set up next capture time
    nextCaptureTimeRef.current = Date.now() + (interval * 1000);
    setCountdown(interval);

    debugLogger.log('CameraMode', 'Setting up interval timer', {
      intervalMs: interval * 1000
    });

    // Start interval for captures
    intervalRef.current = setInterval(() => {
      debugLogger.log('CameraMode', 'Auto-capture interval fired!', {
        intervalSeconds: captureIntervalRef.current,
        autoCaptureEnabled: autoCaptureRef.current
      });
      captureImage();
      const currentInterval = captureIntervalRef.current;
      nextCaptureTimeRef.current = Date.now() + (currentInterval * 1000);
      setCountdown(currentInterval);
    }, interval * 1000);

    debugLogger.log('CameraMode', 'Interval timer created', {
      intervalId: intervalRef.current
    });

    // Start countdown timer
    startCountdown();
  }, [captureImage]);

  const startCountdown = useCallback(() => {
    stopCountdown();

    debugLogger.log('CameraMode', 'Starting countdown timer');

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
      debugLogger.log('CameraMode', 'Stopping countdown timer');
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const stopAutoCapture = useCallback(() => {
    if (intervalRef.current) {
      debugLogger.log('CameraMode', 'Stopping auto-capture', {
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
    </div>
  );
}
