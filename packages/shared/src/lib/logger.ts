// Simple structured logger for tournament platform
// Supports multiple log levels and structured metadata

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogMetadata {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: LogMetadata;
  service?: string;
  userId?: string;
  orgId?: string;
}

class Logger {
  private service: string;
  private userId?: string;
  private orgId?: string;

  constructor(service: string) {
    this.service = service;
  }

  /**
   * Set user context for all subsequent logs
   */
  setUser(userId: string): void {
    this.userId = userId;
  }

  /**
   * Set organization context for all subsequent logs
   */
  setOrg(orgId: string): void {
    this.orgId = orgId;
  }

  /**
   * Clear user and org context
   */
  clearContext(): void {
    this.userId = undefined;
    this.orgId = undefined;
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, metadata?: LogMetadata): void {
    const errorMetadata =
      error instanceof Error
        ? {
            errorMessage: error.message,
            errorStack: error.stack,
            errorName: error.name,
            ...metadata,
          }
        : metadata;

    this.log(LogLevel.ERROR, message, errorMetadata);
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      ...(this.userId && { userId: this.userId }),
      ...(this.orgId && { orgId: this.orgId }),
      ...(metadata && { metadata }),
    };

    // In development, pretty print
    if (process.env.NODE_ENV === 'development') {
      this.prettyPrint(entry);
    } else {
      // In production, JSON for log aggregation
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(entry));
    }

    // TODO: Send to external logging service (Sentry, LogRocket, etc.)
    // if (process.env.NODE_ENV === 'production') {
    //   this.sendToExternalService(entry);
    // }
  }

  /**
   * Pretty print for development
   */
  private prettyPrint(entry: LogEntry): void {
    const emoji = {
      [LogLevel.DEBUG]: '🐛',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
    }[entry.level];

    const color = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m', // Green
      [LogLevel.WARN]: '\x1b[33m', // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
    }[entry.level];

    const reset = '\x1b[0m';
    const dim = '\x1b[2m';

    let output = `${color}${emoji} [${entry.service}]${reset} ${entry.message}`;

    if (entry.userId || entry.orgId) {
      output += ` ${dim}(`;
      if (entry.userId) output += `user:${entry.userId}`;
      if (entry.userId && entry.orgId) output += ', ';
      if (entry.orgId) output += `org:${entry.orgId}`;
      output += `)${reset}`;
    }

    // eslint-disable-next-line no-console
    console.log(output);

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      // eslint-disable-next-line no-console
      console.log(`  ${dim}${JSON.stringify(entry.metadata, null, 2)}${reset}`);
    }
  }
}

/**
 * Create a logger instance for a service
 */
export function createLogger(service: string): Logger {
  return new Logger(service);
}

/**
 * Default logger for shared package
 */
export const logger = createLogger('shared');
