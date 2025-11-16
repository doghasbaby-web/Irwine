/**
 * Unified utilities export
 * Provides centralized access to all utility modules
 */

// Core infrastructure
export { logger, Logger, ChildLogger, LogLevel } from './logger.js';
export { cacheManager, CacheManager, LRUCache, CacheOptions } from './cache.js';
export { performanceMonitor, PerformanceMonitor, measurePerformance, measurePerformanceSync } from './performanceMonitor.js';

// Configuration management
export { configManager, ConfigManager, DaoCodeConfig, ProviderSettings } from './configManager.js';

// Session management
export { sessionManager, SessionManager, SessionMetadata, SessionSearchOptions } from './sessionManager.js';

// Error handling
export {
  DaoCodeError,
  ConfigurationError,
  APIError,
  SessionError,
  AgentError,
  ValidationError,
  SandboxError,
  ErrorHandler,
  retryWithBackoff
} from './errors.js';

// Legacy exports (for backward compatibility)
export * from './session.js';
export * from './retry.js';
export * from './docker.js';
export * from './visualTest.js';
export * from './operationLoader.js';
