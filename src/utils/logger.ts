/**
 * Unified logging system
 * Provides structured logging with different levels and formatting
 */

import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private currentLevel: LogLevel = LogLevel.INFO;
  private logDir: string;
  private enableFileLogging: boolean = false;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize: number = 100;

  private constructor() {
    this.logDir = path.join(os.homedir(), '.dao-code', 'logs');
    this.initializeLogDir();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Initialize log directory
   */
  private async initializeLogDir(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      // Silently fail if unable to create log directory
    }
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Enable or disable file logging
   */
  setFileLogging(enabled: boolean): void {
    this.enableFileLogging = enabled;
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): void {
    if (level < this.currentLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error
    };

    // Console output
    this.logToConsole(entry);

    // Buffer for file logging
    if (this.enableFileLogging) {
      this.logBuffer.push(entry);
      if (this.logBuffer.length >= this.maxBufferSize) {
        this.flushLogs();
      }
    }
  }

  /**
   * Format and output to console
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = chalk.gray(entry.timestamp);
    const levelStr = this.formatLevel(entry.level);
    const message = entry.message;

    let output = `${timestamp} ${levelStr} ${message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += '\n' + chalk.dim(JSON.stringify(entry.context, null, 2));
    }

    if (entry.error) {
      output += '\n' + chalk.red(entry.error.stack || entry.error.message);
    }

    console.log(output);
  }

  /**
   * Format log level with colors
   */
  private formatLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return chalk.cyan('[DEBUG]');
      case LogLevel.INFO:
        return chalk.blue('[INFO]');
      case LogLevel.WARN:
        return chalk.yellow('[WARN]');
      case LogLevel.ERROR:
        return chalk.red('[ERROR]');
      default:
        return '[UNKNOWN]';
    }
  }

  /**
   * Flush log buffer to file
   */
  async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logFile = path.join(
      this.logDir,
      `dao-code-${new Date().toISOString().split('T')[0]}.log`
    );

    const logLines = this.logBuffer.map(entry => {
      const base = `${entry.timestamp} [${LogLevel[entry.level]}] ${entry.message}`;
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      const errorStr = entry.error ? ` ERROR: ${entry.error.message}` : '';
      return base + contextStr + errorStr;
    });

    try {
      await fs.appendFile(logFile, logLines.join('\n') + '\n', 'utf-8');
      this.logBuffer = [];
    } catch (error) {
      // Silently fail if unable to write logs
    }
  }

  /**
   * Create a child logger with context
   */
  child(context: Record<string, any>): ChildLogger {
    return new ChildLogger(this, context);
  }
}

/**
 * Child logger with persistent context
 */
export class ChildLogger {
  constructor(
    private parent: Logger,
    private context: Record<string, any>
  ) {}

  debug(message: string, additionalContext?: Record<string, any>): void {
    this.parent.debug(message, { ...this.context, ...additionalContext });
  }

  info(message: string, additionalContext?: Record<string, any>): void {
    this.parent.info(message, { ...this.context, ...additionalContext });
  }

  warn(message: string, additionalContext?: Record<string, any>): void {
    this.parent.warn(message, { ...this.context, ...additionalContext });
  }

  error(message: string, error?: Error, additionalContext?: Record<string, any>): void {
    this.parent.error(message, error, { ...this.context, ...additionalContext });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
