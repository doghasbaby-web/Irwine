/**
 * Factory for creating AI model clients
 */

import { ModelProvider, AIModelClient, CustomProviderConfig } from '../types/index.js';
import { AnthropicClient } from './anthropic.js';
import { OpenAIClient } from './openai.js';
import { GoogleClient } from './google.js';
import { DeepSeekClient } from './deepseek.js';
import { QwenClient } from './qwen.js';
import { GenericOpenAIClient } from './generic-openai.js';

export class ModelFactory {
  private static clients: Map<string, AIModelClient> = new Map();

  /**
   * Create a client for a built-in provider
   */
  static createClient(
    provider: ModelProvider,
    apiKey: string,
    modelName?: string
  ): AIModelClient {
    const cacheKey = `${provider}-${modelName || 'default'}`;

    if (this.clients.has(cacheKey)) {
      return this.clients.get(cacheKey)!;
    }

    let client: AIModelClient;

    switch (provider) {
      case ModelProvider.ANTHROPIC:
        client = new AnthropicClient(apiKey, modelName);
        break;
      case ModelProvider.OPENAI:
        client = new OpenAIClient(apiKey, modelName);
        break;
      case ModelProvider.GOOGLE:
        client = new GoogleClient(apiKey, modelName);
        break;
      case ModelProvider.DEEPSEEK:
        client = new DeepSeekClient(apiKey, modelName);
        break;
      case ModelProvider.QWEN:
        client = new QwenClient(apiKey, modelName);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    this.clients.set(cacheKey, client);
    return client;
  }

  /**
   * Create a client with custom provider configuration
   */
  static createCustomClient(config: CustomProviderConfig): AIModelClient {
    const cacheKey = `${config.name}-${config.modelName}`;

    if (this.clients.has(cacheKey)) {
      return this.clients.get(cacheKey)!;
    }

    let client: AIModelClient;

    // Choose the appropriate client based on compatibility type
    switch (config.type) {
      case 'openai-compatible':
      default:
        client = new GenericOpenAIClient(config);
        break;
      // Future: Add support for anthropic-compatible and google-compatible
    }

    this.clients.set(cacheKey, client);
    return client;
  }

  static clearCache(): void {
    this.clients.clear();
  }
}
