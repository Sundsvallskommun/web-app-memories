import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LOG_DIR, NODE_ENV } from '@/config';

const logDir = LOG_DIR || './data/logs';

const logFormat = winston.format.printf(({ timestamp, level, message }) => {
  return `${timestamp} ${level}: ${message}`;
});

// The logger only prepares the fields; each transport builds its own line with logFormat.
// A transport's format runs after the logger's, so colorize has to come before printf.
export const logger = winston.createLogger({
  format: winston.format.combine(winston.format.splat(), winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
  transports: [
    new DailyRotateFile({
      level: 'debug',
      datePattern: 'YYYY-MM-DD',
      dirname: `${logDir}/debug`,
      filename: '%DATE%.log',
      maxFiles: 30,
      json: false,
      zippedArchive: true,
      format: logFormat,
    }),
    new DailyRotateFile({
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      dirname: `${logDir}/error`,
      filename: '%DATE%.log',
      maxFiles: 30,
      json: false,
      zippedArchive: true,
      format: logFormat,
    }),
    // Colours only locally: on OpenShift stdout is the log people read (pod logs, log
    // collection), where colour codes would show up as noise like [32minfo[39m.
    new winston.transports.Console({
      format: NODE_ENV === 'development' ? winston.format.combine(winston.format.colorize(), logFormat) : logFormat,
    }),
  ],
});

export const stream = {
  write: (message: string) => {
    logger.info(message.trimEnd());
  },
};
