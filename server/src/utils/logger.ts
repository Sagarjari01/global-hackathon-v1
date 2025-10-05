import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

const { combine, timestamp, json } = format;

// Point to the logs directory in the project root, outside the server folder
const logDir = path.resolve(__dirname, '../../../logs');

// Ensure the logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create a daily rotate file transport for error logs
const errorRotateTransport = new transports.DailyRotateFile({
  filename: path.join(logDir, 'judgement_error_%DATE%.log'),
  datePattern: 'YYYYMMDD',
  level: 'error',
  maxFiles: '14d',  // Keep logs for 14 days
  maxSize: '10m',
  zippedArchive: true
});

// Create a daily rotate file transport for combined logs
const combinedRotateTransport = new transports.DailyRotateFile({
  filename: path.join(logDir, 'judgement_combined_%DATE%.log'),
  datePattern: 'YYYYMMDD',
  maxFiles: '14d',  // Keep logs for 14 days
  maxSize: '10m',
  zippedArchive: true
});

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json() // Use JSON format for easy parsing with jq
  ),
  transports: [
    new transports.Console({
      format: combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    }),
    errorRotateTransport,
    combinedRotateTransport
  ]
});

// Handle transport errors
errorRotateTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info(`Error log rotated from ${oldFilename} to ${newFilename}`);
});

combinedRotateTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info(`Combined log rotated from ${oldFilename} to ${newFilename}`);
});

export default logger;