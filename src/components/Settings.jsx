import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { debugLogger } from '../utils/debug';
import './Settings.css';

export default function Settings({ onClose, onModeChange }) {
  const [mode, setMode] = useState(storage.getMode());
  const [autoCapture, setAutoCapture] = useState(storage.getAutoCapture());
  const [captureInterval, setCaptureInterval] = useState(storage.getCaptureInterval());
  const [viewerTimeout, setViewerTimeout] = useState(storage.getViewerTimeout());
  const [cameraTimezone, setCameraTimezone] = useState(storage.getCameraTimezone());
  const [debugLevel, setDebugLevel] = useState(debugLogger.getLogLevel());
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [logs, setLogs] = useState(debugLogger.getFormattedLogs());

  useEffect(() => {
    debugLogger.info('Settings', 'Settings opened', {
      mode,
      autoCapture,
      captureInterval,
      viewerTimeout,
      cameraTimezone
    });

    const interval = setInterval(() => {
      setLogs(debugLogger.getFormattedLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    storage.setMode(newMode);
    onModeChange(newMode);
    debugLogger.info('Settings', 'Mode changed', { mode: newMode });
  };

  const handleAutoCaptureToggle = () => {
    const newValue = !autoCapture;
    setAutoCapture(newValue);
    storage.setAutoCapture(newValue);
    debugLogger.info('Settings', 'Auto capture toggled', { enabled: newValue });
  };

  const handleCaptureIntervalChange = (e) => {
    const value = parseInt(e.target.value) || 10;
    setCaptureInterval(value);
    storage.setCaptureInterval(value);
    debugLogger.info('Settings', 'Capture interval changed', { seconds: value });
  };

  const handleViewerTimeoutChange = (e) => {
    const value = parseInt(e.target.value) || 60;
    setViewerTimeout(value);
    storage.setViewerTimeout(value);
    debugLogger.info('Settings', 'Viewer timeout changed', { seconds: value });
  };

  const handleCameraTimezoneChange = (e) => {
    const newTimezone = e.target.value;
    setCameraTimezone(newTimezone);
    storage.setCameraTimezone(newTimezone);
    debugLogger.info('Settings', 'Camera timezone changed', { timezone: newTimezone });
  };

  const handleDebugLevelChange = (e) => {
    const level = parseInt(e.target.value);
    setDebugLevel(level);
    debugLogger.setLogLevel(level);
  };

  const handleClearLogs = () => {
    debugLogger.clear();
    setLogs('');
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <button onClick={onClose} className="close-button">Done</button>
          <h2>Settings</h2>
          <div className="header-spacer"></div>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <div className="settings-row">
              <span className="settings-label">Mode</span>
              <select
                value={mode}
                onChange={(e) => handleModeChange(e.target.value)}
                className="ios-select"
              >
                <option value="viewer">Viewer</option>
                <option value="camera">Camera</option>
              </select>
            </div>
          </div>

          {mode === 'camera' && (
            <div className="settings-section">
              <div className="settings-row">
                <span className="settings-label">Auto Capture</span>
                <label className="ios-switch">
                  <input
                    type="checkbox"
                    checked={autoCapture}
                    onChange={handleAutoCaptureToggle}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {autoCapture && (
                <div className="settings-row">
                  <span className="settings-label">Capture Interval</span>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={captureInterval}
                    onChange={handleCaptureIntervalChange}
                    className="ios-input"
                  />
                  <span className="settings-unit">sec</span>
                </div>
              )}
            </div>
          )}

          {mode === 'viewer' && (
            <div className="settings-section">
              <div className="settings-row">
                <span className="settings-label">Image Timeout</span>
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={viewerTimeout}
                  onChange={handleViewerTimeoutChange}
                  className="ios-input"
                />
                <span className="settings-unit">sec</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">Camera Timezone</span>
                <select
                  value={cameraTimezone}
                  onChange={handleCameraTimezoneChange}
                  className="ios-select"
                >
                  <option value="America/New_York">Eastern (ET)</option>
                  <option value="America/Chicago">Central (CT)</option>
                  <option value="America/Denver">Mountain (MT)</option>
                  <option value="America/Los_Angeles">Pacific (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Europe/Berlin">Berlin (CET)</option>
                  <option value="Europe/Amsterdam">Amsterdam (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Shanghai">Shanghai (CST)</option>
                  <option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Asia/Makassar">Bali (WITA)</option>
                  <option value="Australia/Sydney">Sydney (AEST)</option>
                  <option value="Pacific/Auckland">Auckland (NZST)</option>
                </select>
              </div>
            </div>
          )}

          <div className="settings-section">
            <div className="settings-row">
              <span className="settings-label">Debug Level</span>
              <select
                value={debugLevel}
                onChange={handleDebugLevelChange}
                className="ios-select"
              >
                <option value="0">Errors Only</option>
                <option value="1">Warnings</option>
                <option value="2">Info (Default)</option>
                <option value="3">Verbose</option>
              </select>
            </div>

            <div className="settings-row clickable" onClick={() => setShowDebugLogs(!showDebugLogs)}>
              <span className="settings-label">Debug Logs</span>
              <span className="chevron">{showDebugLogs ? '▼' : '▶'}</span>
            </div>
            {showDebugLogs && (
              <div className="debug-logs-container">
                <div className="debug-logs-header">
                  <span className="log-count">{debugLogger.getLogs().length} entries</span>
                  <button onClick={handleClearLogs} className="clear-logs-button">Clear</button>
                </div>
                <pre className="debug-logs">{logs || 'No logs yet...'}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
