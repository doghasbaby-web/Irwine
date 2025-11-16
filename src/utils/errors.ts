/**
 * Custom error classes for better error handling
 */

/**
 * Base error class for all application errors
 */
export class DaoCodeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'DaoCodeError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack
    };
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends DaoCodeError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

/**
 * API error (for AI model API calls)
 */
export class APIError extends DaoCodeError {
  constructor(
    message: string,
    public provider: string,
    public statusCode?: number,
    details?: Record<string, any>
  ) {
    super(message, 'API_ERROR', { ...details, provider, statusCode });
    this.name = 'APIError';
  }
}

/**
 * Session error
 */
export class SessionError extends DaoCodeError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'SESSION_ERROR', details);
    this.name = 'SessionError';
  }
}

/**
 * Agent error
 */
export class AgentError extends DaoCodeError {
  constructor(
    message: string,
    public agentRole: string,
    details?: Record<string, any>
  ) {
    super(message, 'AGENT_ERROR', { ...details, agentRole });
    this.name = 'AgentError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends DaoCodeError {
  constructor(
    message: string,
    public field: string,
    details?: Record<string, any>
  ) {
    super(message, 'VALIDATION_ERROR', { ...details, field });
    this.name = 'ValidationError';
  }
}

/**
 * Docker/Sandbox error
 */
export class SandboxError extends DaoCodeError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'SANDBOX_ERROR', details);
    this.name = 'SandboxError';
  }
}

/**
 * Error handler utility
 */
export class ErrorHandler {
  /**
   * Handle and format error for display
   */
  static handle(error: unknown): {
    message: string;
    details?: Record<string, any>;
    shouldRetry: boolean;
  } {
    if (error instanceof DaoCodeError) {
      return {
        message: error.message,
        details: error.details,
        shouldRetry: this.isRetryable(error)
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        details: { stack: error.stack },
        shouldRetry: false
      };
    }

    return {
      message: String(error),
      shouldRetry: false
    };
  }

  /**
   * Determine if error is retryable
   */
  private static isRetryable(error: DaoCodeError): boolean {
    // API errors with certain status codes are retryable
    if (error instanceof APIError) {
      const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
      return error.statusCode ? retryableStatusCodes.includes(error.statusCode) : false;
    }

    // Most other errors are not retryable
    return false;
  }

  /**
   * Create user-friendly error message
   */
  static getUserMessage(error: unknown): string {
    const handled = this.handle(error);

    let message = handled.message;

    if (handled.details) {
      // Add important details to message
      if (handled.details.provider) {
        message += ` (Provider: ${handled.details.provider})`;
      }
      if (handled.details.agentRole) {
        message += ` (Agent: ${handled.details.agentRole})`;
      }
    }

    if (handled.shouldRetry) {
      message += '\n💡 This error might be temporary. You can try again.';
    }

    return message;
  }
}

/**
 * Retry wrapper with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    onRetry
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Don't retry if error is not retryable
      if (error instanceof DaoCodeError && !ErrorHandler.handle(error).shouldRetry) {
        throw error;
      }

      // Call onRetry callback
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
