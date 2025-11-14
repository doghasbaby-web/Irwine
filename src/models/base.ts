/**
 * Base class for AI model clients
 */

import { AIModelClient, Message, ModelProvider } from '../types/index.js';
import { retryWithBackoff, isRetryableError } from '../utils/retry.js';

export abstract class BaseModelClient implements AIModelClient {
  abstract provider: ModelProvider;

  protected apiKey: string;
  protected modelName: string;
  protected enableRetry: boolean = true;
  protected maxRetries: number = 3;

  constructor(apiKey: string, modelName: string) {
    if (!apiKey) {
      throw new Error(`API key is required`);
    }
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  abstract generateResponse(messages: Message[], config?: any): Promise<string>;

  abstract streamResponse?(messages: Message[], config?: any): AsyncGenerator<string>;

  /**
   * Execute a function with retry logic
   */
  protected async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.enableRetry) {
      return fn();
    }

    return retryWithBackoff(fn, {
      maxRetries: this.maxRetries,
      initialDelay: 1000,
      maxDelay: 10000,
      exponentialBase: 2,
      onRetry: (error, attempt) => {
        if (isRetryableError(error)) {
          console.warn(`[${this.provider}] Retry attempt ${attempt} after error: ${error.message}`);
        }
      }
    });
  }

  /**
   * Convert internal Message format to provider-specific format
   */
  protected convertMessages(messages: Message[]): any[] {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : msg.role === 'user' ? 'user' : 'system',
      content: msg.content
    }));
  }

  /**
   * Handle errors uniformly across providers
   */
  protected handleError(error: any, context: string): never {
    console.error(`[${this.provider}] Error in ${context}:`, error);

    // Add more context to error message
    let errorMessage = error.message || 'Unknown error';
    if (error.status) {
      errorMessage = `HTTP ${error.status}: ${errorMessage}`;
    }

    throw new Error(`${this.provider} API Error in ${context}: ${errorMessage}`);
  }
}
