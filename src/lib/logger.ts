
import pino from 'pino';

// Create a logger instance
export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // You can add more configurations here, like transports to send logs
  // to a file or a logging service (e.g., Google Cloud Logging).
  // For now, it will log to the console.
});
