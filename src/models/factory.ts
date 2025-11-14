/**
 * Factory for creating AI model clients
 */

import { ModelProvider, AIModelClient } from '../types/index.js';
import { AnthropicClient } from './anthropic.js';
import { OpenAIClient } from './openai.js';
import { GoogleClient } from './google.js';

export class ModelFactory {
  private static clients: Map<string, AIModelClient> = new Map();

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
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    this.clients.set(cacheKey, client);
    return client;
  }

  static clearCache(): void {
    this.clients.clear();
  }
}
