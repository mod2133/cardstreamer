// LocalStorage utilities with debugging
import { debugLogger } from './debug';

const STORAGE_KEYS = {
  PIN_VERIFIED: 'pin_verified',
  MODE: 'mode',
  AUTO_CAPTURE: 'auto_capture',
  CAPTURE_INTERVAL: 'capture_interval',
  VIEWER_TIMEOUT: 'viewer_timeout',
  CARD_DETECTION: 'card_detection'
};

export const storage = {
  // PIN verification - uses sessionStorage to clear on browser close
  getPinVerified() {
    const value = sessionStorage.getItem(STORAGE_KEYS.PIN_VERIFIED);
    debugLogger.log('Storage', 'Get PIN verified', { value, storage: 'session' });
    return value === 'true';
  },

  setPinVerified(verified) {
    sessionStorage.setItem(STORAGE_KEYS.PIN_VERIFIED, verified.toString());
    debugLogger.log('Storage', 'Set PIN verified', { verified, storage: 'session' });
  },

  clearPinVerified() {
    sessionStorage.removeItem(STORAGE_KEYS.PIN_VERIFIED);
    debugLogger.log('Storage', 'Clear PIN verified');
  },

  // Mode (viewer or camera)
  getMode() {
    const value = localStorage.getItem(STORAGE_KEYS.MODE) || 'viewer';
    debugLogger.log('Storage', 'Get mode', { value });
    return value;
  },

  setMode(mode) {
    localStorage.setItem(STORAGE_KEYS.MODE, mode);
    debugLogger.log('Storage', 'Set mode', { mode });
  },

  // Auto capture
  getAutoCapture() {
    const value = localStorage.getItem(STORAGE_KEYS.AUTO_CAPTURE);
    const result = value === 'true';
    debugLogger.log('Storage', 'Get auto capture', { value, result });
    return result;
  },

  setAutoCapture(enabled) {
    localStorage.setItem(STORAGE_KEYS.AUTO_CAPTURE, enabled.toString());
    debugLogger.log('Storage', 'Set auto capture', { enabled });
  },

  // Capture interval (in seconds)
  getCaptureInterval() {
    const value = parseInt(localStorage.getItem(STORAGE_KEYS.CAPTURE_INTERVAL) || '10');
    debugLogger.log('Storage', 'Get capture interval', { value });
    return value;
  },

  setCaptureInterval(seconds) {
    localStorage.setItem(STORAGE_KEYS.CAPTURE_INTERVAL, seconds.toString());
    debugLogger.log('Storage', 'Set capture interval', { seconds });
  },

  // Viewer timeout (in seconds)
  getViewerTimeout() {
    const value = parseInt(localStorage.getItem(STORAGE_KEYS.VIEWER_TIMEOUT) || '60');
    debugLogger.log('Storage', 'Get viewer timeout', { value });
    return value;
  },

  setViewerTimeout(seconds) {
    localStorage.setItem(STORAGE_KEYS.VIEWER_TIMEOUT, seconds.toString());
    debugLogger.log('Storage', 'Set viewer timeout', { seconds });
  },

  // Card detection
  getCardDetection() {
    const value = localStorage.getItem(STORAGE_KEYS.CARD_DETECTION);
    const result = value === 'true';
    debugLogger.log('Storage', 'Get card detection', { value, result });
    return result;
  },

  setCardDetection(enabled) {
    localStorage.setItem(STORAGE_KEYS.CARD_DETECTION, enabled.toString());
    debugLogger.log('Storage', 'Set card detection', { enabled });
  }
};
