// Debug logging utility
export class DebugLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 50;
  }

  log(category, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      category,
      message,
      data
    };

    this.logs.unshift(logEntry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Also log to console
    console.log(`[${timestamp}] [${category}]`, message, data || '');

    return logEntry;
  }

  getLogs() {
    return this.logs;
  }

  getFormattedLogs() {
    return this.logs.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const dataStr = log.data ? ` | ${JSON.stringify(log.data)}` : '';
      return `[${time}] [${log.category}] ${log.message}${dataStr}`;
    }).join('\n');
  }

  clear() {
    this.logs = [];
  }
}

export const debugLogger = new DebugLogger();
