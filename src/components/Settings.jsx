import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { debugLogger } from '../utils/debug';
import './Settings.css';

export default function Settings({ onClose, onModeChange }) {
  const [mode, setMode] = useState(storage.getMode());
  const [autoCapture, setAutoCapture] = useState(storage.getAutoCapture());
  const [captureInterval, setCaptureInterval] = useState(storage.getCaptureInterval());
  const [viewerTimeout, setViewerTimeout] = useState(storage.getViewerTimeout());

  useEffect(() => {
    debugLogger.log('Settings', 'Settings opened', {
      mode,
      autoCapture,
      captureInterval,
      viewerTimeout
    });
  }, []);

  const handleSave = () => {
    debugLogger.log('Settings', 'Saving settings', {
      mode,
      autoCapture,
      captureInterval,
      viewerTimeout
    });

    storage.setMode(mode);
    storage.setAutoCapture(autoCapture);
    storage.setCaptureInterval(captureInterval);
    storage.setViewerTimeout(viewerTimeout);

    onModeChange(mode);
    onClose();
  };

  const handleLogout = () => {
    debugLogger.log('Settings', 'Logging out');
    storage.clearPinVerified();
    window.location.reload();
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <h2>⚙️ Settings</h2>

        <div className="settings-section">
          <label>
            <strong>Mode</strong>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="viewer">👀 Viewer</option>
              <option value="camera">📷 Camera</option>
            </select>
          </label>
          <p className="help-text">
            Viewer: See images from camera devices<br />
            Camera: Take pictures to share
          </p>
        </div>

        {mode === 'camera' && (
          <div className="settings-section">
            <label>
              <strong>Auto Capture</strong>
              <select
                value={autoCapture ? 'true' : 'false'}
                onChange={(e) => setAutoCapture(e.target.value === 'true')}
              >
                <option value="false">Off</option>
                <option value="true">On</option>
              </select>
            </label>

            {autoCapture && (
              <label>
                <strong>Capture Interval (seconds)</strong>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={captureInterval}
                  onChange={(e) => setCaptureInterval(parseInt(e.target.value) || 10)}
                />
              </label>
            )}
          </div>
        )}

        {mode === 'viewer' && (
          <div className="settings-section">
            <label>
              <strong>Image Timeout (seconds)</strong>
              <input
                type="number"
                min="5"
                max="600"
                value={viewerTimeout}
                onChange={(e) => setViewerTimeout(parseInt(e.target.value) || 60)}
              />
            </label>
            <p className="help-text">
              Show "no recent picture" message if no new image after this time
            </p>
          </div>
        )}

        <div className="settings-actions">
          <button onClick={handleSave} className="primary">
            Save & Close
          </button>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleLogout} className="danger">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
