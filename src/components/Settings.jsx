import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { debugLogger } from '../utils/debug';
import './Settings.css';

export default function Settings({ onClose, onModeChange }) {
  const [mode, setMode] = useState(storage.getMode());
  const [autoCapture, setAutoCapture] = useState(storage.getAutoCapture());
  const [captureInterval, setCaptureInterval] = useState(storage.getCaptureInterval());
  const [viewerTimeout, setViewerTimeout] = useState(storage.getViewerTimeout());
  const [cardDetection, setCardDetection] = useState(storage.getCardDetection());
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [logs, setLogs] = useState(debugLogger.getFormattedLogs());

  useEffect(() => {
    debugLogger.log('Settings', 'Settings opened', {
      mode,
      autoCapture,
      captureInterval,
      viewerTimeout,
      cardDetection
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
    debugLogger.log('Settings', 'Mode changed', { mode: newMode });
  };

  const handleAutoCaptureToggle = () => {
    const newValue = !autoCapture;
    setAutoCapture(newValue);
    storage.setAutoCapture(newValue);
    debugLogger.log('Settings', 'Auto capture toggled', { enabled: newValue });
  };

  const handleCaptureIntervalChange = (e) => {
    const value = parseInt(e.target.value) || 10;
    setCaptureInterval(value);
    storage.setCaptureInterval(value);
    debugLogger.log('Settings', 'Capture interval changed', { seconds: value });
  };

  const handleViewerTimeoutChange = (e) => {
    const value = parseInt(e.target.value) || 60;
    setViewerTimeout(value);
    storage.setViewerTimeout(value);
    debugLogger.log('Settings', 'Viewer timeout changed', { seconds: value });
  };

  const handleCardDetectionToggle = () => {
    const newValue = !cardDetection;
    setCardDetection(newValue);
    storage.setCardDetection(newValue);
    debugLogger.log('Settings', 'Card detection toggled', { enabled: newValue });
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

          <div className="settings-section">
            <div className="settings-row">
              <span className="settings-label">Card Detection</span>
              <label className="ios-switch">
                <input
                  type="checkbox"
                  checked={cardDetection}
                  onChange={handleCardDetectionToggle}
                />
                <span className="slider"></span>
              </label>
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
            </div>
          )}

          <div className="settings-section">
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
