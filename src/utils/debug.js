// Debug logging utility with log levels
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  VERBOSE: 3
};

const LOG_LEVEL_NAMES = {
  0: 'ERROR',
  1: 'WARN',
  2: 'INFO',
  3: 'VERBOSE'
};

export class DebugLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 50;
    // Load log level from localStorage, default to INFO
    const savedLevel = localStorage.getItem('debug_log_level');
    this.logLevel = savedLevel !== null ? parseInt(savedLevel) : LOG_LEVELS.INFO;
  }

  setLogLevel(level) {
    this.logLevel = level;
    localStorage.setItem('debug_log_level', level.toString());
    console.log(`[DebugLogger] Log level set to: ${LOG_LEVEL_NAMES[level]}`);
  }

  getLogLevel() {
    return this.logLevel;
  }

  log(level, category, message, data = null) {
    // Skip if below threshold
    if (level > this.logLevel) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    const logEntry = {
      timestamp,
      level,
      levelName,
      category,
      message,
      data
    };

    this.logs.unshift(logEntry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Always log ERROR to console, otherwise respect level filter
    if (level === LOG_LEVELS.ERROR || level <= this.logLevel) {
      const prefix = `[${timestamp}] [${levelName}] [${category}]`;
      if (level === LOG_LEVELS.ERROR) {
        console.error(prefix, message, data || '');
      } else if (level === LOG_LEVELS.WARN) {
        console.warn(prefix, message, data || '');
      } else {
        console.log(prefix, message, data || '');
      }
    }

    return logEntry;
  }

  error(category, message, data = null) {
    return this.log(LOG_LEVELS.ERROR, category, message, data);
  }

  warn(category, message, data = null) {
    return this.log(LOG_LEVELS.WARN, category, message, data);
  }

  info(category, message, data = null) {
    return this.log(LOG_LEVELS.INFO, category, message, data);
  }

  verbose(category, message, data = null) {
    return this.log(LOG_LEVELS.VERBOSE, category, message, data);
  }

  getLogs() {
    return this.logs;
  }

  getFormattedLogs() {
    return this.logs.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const dataStr = log.data ? ` | ${JSON.stringify(log.data)}` : '';
      return `[${time}] [${log.levelName}] [${log.category}] ${log.message}${dataStr}`;
    }).join('\n');
  }

  clear() {
    this.logs = [];
  }
}

export const debugLogger = new DebugLogger();
