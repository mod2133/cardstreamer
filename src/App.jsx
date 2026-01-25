import { useState, useEffect } from 'react';
import PinLogin from './components/PinLogin';
import Settings from './components/Settings';
import CameraMode from './components/CameraMode';
import ViewerMode from './components/ViewerMode';
import { storage } from './utils/storage';
import { debugLogger } from './utils/debug';
import './App.css';

function App() {
  const [authenticated, setAuthenticated] = useState(storage.getPinVerified());
  const [mode, setMode] = useState(storage.getMode());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    debugLogger.log('App', 'Application initialized', {
      authenticated,
      mode
    });
  }, []);

  const handleLogin = () => {
    debugLogger.log('App', 'User logged in');
    setAuthenticated(true);
  };

  const handleModeChange = (newMode) => {
    debugLogger.log('App', 'Mode changed', { from: mode, to: newMode });
    setMode(newMode);
  };

  if (!authenticated) {
    return <PinLogin onSuccess={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <button
          onClick={() => setShowSettings(true)}
          className="hamburger-button"
          aria-label="Settings"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <h1>CardStreamer</h1>
        <div className="header-spacer"></div>
      </header>

      <main className="app-main">
        {mode === 'camera' ? <CameraMode /> : <ViewerMode />}
      </main>

      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          onModeChange={handleModeChange}
        />
      )}
    </div>
  );
}

export default App;
