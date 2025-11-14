/**
 * Base class for AI model clients
 */

import { AIModelClient, Message, ModelProvider } from '../types/index.js';

export abstract class BaseModelClient implements AIModelClient {
  abstract provider: ModelProvider;

  protected apiKey: string;
  protected modelName: string;

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
    throw new Error(`${this.provider} API Error: ${error.message || 'Unknown error'}`);
  }
}
