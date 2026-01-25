import { useState } from 'react';
import { api } from '../api/client';
import { storage } from '../utils/storage';
import { debugLogger } from '../utils/debug';
import './PinLogin.css';

export default function PinLogin({ onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    debugLogger.log('PinLogin', 'Submitting PIN');

    try {
      const result = await api.verifyPin(pin);

      if (result.success) {
        debugLogger.log('PinLogin', 'PIN verified successfully');
        storage.setPinVerified(true);
        onSuccess();
      } else {
        setError('Invalid PIN');
        debugLogger.log('PinLogin', 'Invalid PIN entered');
      }
    } catch (err) {
      setError('Failed to verify PIN. Please try again.');
      debugLogger.log('PinLogin', 'PIN verification failed', { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pin-login">
      <div className="pin-login-container">
        <h1>CardStreamer</h1>
        <p>Enter PIN to continue</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
            disabled={loading}
          />

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading || !pin}>
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </form>

        <div className="hint">
          Default PIN: 1234
        </div>
      </div>
    </div>
  );
}
