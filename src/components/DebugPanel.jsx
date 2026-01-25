import { useState, useEffect } from 'react';
import { debugLogger } from '../utils/debug';
import './DebugPanel.css';

export default function DebugPanel() {
  const [logs, setLogs] = useState(debugLogger.getFormattedLogs());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(debugLogger.getFormattedLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleClear = () => {
    debugLogger.clear();
    setLogs('');
  };

  return (
    <div className={`debug-panel ${isExpanded ? 'expanded' : ''}`}>
      <div className="debug-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span>🐛 Debug Logs</span>
        <span className="debug-toggle">{isExpanded ? '▼' : '▲'}</span>
      </div>

      {isExpanded && (
        <div className="debug-content">
          <div className="debug-actions">
            <button onClick={handleClear} className="clear-button">
              Clear Logs
            </button>
            <span className="log-count">
              {debugLogger.getLogs().length} entries
            </span>
          </div>
          <pre className="debug-logs">{logs || 'No logs yet...'}</pre>
        </div>
      )}
    </div>
  );
}
