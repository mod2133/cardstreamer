import { useState, useRef, useEffect } from 'react';
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
  const intervalRef = useRef(null);

  useEffect(() => {
    debugLogger.log('CameraMode', 'Initializing camera');
    initCamera();

    return () => {
      debugLogger.log('CameraMode', 'Cleaning up camera');
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (autoCapture && stream) {
      startAutoCapture();
    } else {
      stopAutoCapture();
    }

    return () => stopAutoCapture();
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

  const captureImage = async () => {
    if (!videoRef.current || capturing) return;

    setCapturing(true);
    debugLogger.log('CameraMode', 'Capturing image');

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = 640;
      canvas.height = 480;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 640, 480);

      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      const timestamp = new Date().toISOString();

      debugLogger.log('CameraMode', 'Image captured', {
        timestamp,
        size: imageData.length,
        sizeKB: Math.round(imageData.length / 1024)
      });

      await api.uploadImage(imageData, timestamp);

      setLastCapture({
        timestamp,
        image: imageData
      });

      debugLogger.log('CameraMode', 'Image uploaded successfully');
    } catch (err) {
      debugLogger.log('CameraMode', 'Capture error', { error: err.message });
      alert('Failed to capture/upload image: ' + err.message);
    } finally {
      setCapturing(false);
    }
  };

  const startAutoCapture = () => {
    debugLogger.log('CameraMode', 'Starting auto-capture', {
      intervalSeconds: captureInterval
    });

    stopAutoCapture();

    intervalRef.current = setInterval(() => {
      debugLogger.log('CameraMode', 'Auto-capture triggered');
      captureImage();
    }, captureInterval * 1000);
  };

  const stopAutoCapture = () => {
    if (intervalRef.current) {
      debugLogger.log('CameraMode', 'Stopping auto-capture');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const toggleAutoCapture = () => {
    const newValue = !autoCapture;
    setAutoCapture(newValue);
    storage.setAutoCapture(newValue);
    debugLogger.log('CameraMode', 'Auto-capture toggled', { enabled: newValue });
  };

  const handleIntervalChange = (e) => {
    const value = parseInt(e.target.value) || 10;
    setCaptureInterval(value);
    storage.setCaptureInterval(value);
    debugLogger.log('CameraMode', 'Capture interval changed', { seconds: value });
  };

  return (
    <div className="camera-mode">
      <h2>📷 Camera Mode</h2>

      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-video"
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div className="camera-controls">
        <button
          onClick={captureImage}
          disabled={capturing || !stream}
          className="capture-button"
        >
          {capturing ? 'Capturing...' : '📸 Take Picture'}
        </button>

        <div className="auto-capture-controls">
          <label>
            <input
              type="checkbox"
              checked={autoCapture}
              onChange={toggleAutoCapture}
            />
            <span>Auto Capture</span>
          </label>

          {autoCapture && (
            <label>
              <span>Interval:</span>
              <input
                type="number"
                min="1"
                max="300"
                value={captureInterval}
                onChange={handleIntervalChange}
                className="interval-input"
              />
              <span>seconds</span>
            </label>
          )}
        </div>
      </div>

      {lastCapture && (
        <div className="last-capture">
          <h3>Last Capture</h3>
          <img src={lastCapture.image} alt="Last capture" />
          <p>{new Date(lastCapture.timestamp).toLocaleTimeString()}</p>
        </div>
      )}
    </div>
  );
}
