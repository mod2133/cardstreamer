// Server configuration
export const config = {
  // PIN code for authentication (change this for production)
  PIN_CODE: '1234',

  // Port for the server
  PORT: process.env.PORT || 3000,

  // Image settings
  IMAGE_TIMEOUT: 60000, // 60 seconds - how long to keep image in memory

  // Roboflow API configuration
  ROBOFLOW_API_KEY: process.env.ROBOFLOW_API_KEY || 'nlyS8Ph6gBtDqZdlMu85',
  ROBOFLOW_WORKFLOW_URL: 'https://serverless.roboflow.com/mod2133/workflows/detect-playing-cards',

  // Verbose debugging
  DEBUG: true
};

export function log(...args) {
  if (config.DEBUG) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}]`, ...args);
  }
}
