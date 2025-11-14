/**
 * Generic OpenAI-compatible client for DeepSeek, Qwen, and other OpenAI-compatible APIs
 */

import OpenAI from 'openai';
import { BaseModelClient } from './base.js';
import { Message, CustomProviderConfig } from '../types/index.js';

export class GenericOpenAIClient extends BaseModelClient {
  provider: string;
  private client: OpenAI;
  private config: CustomProviderConfig;

  constructor(config: CustomProviderConfig) {
    super(config.apiKey, config.modelName);
    this.provider = config.name;
    this.config = config;

    // Initialize OpenAI client with custom base URL
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      // Some providers may have different timeout requirements
      timeout: 60000,
      maxRetries: 3
    });
  }

  async generateResponse(messages: Message[], config?: any): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        max_tokens: config?.maxTokens || 4096,
        temperature: config?.temperature || 1.0,
        messages: this.convertMessages(messages)
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.handleError(error, 'generateResponse');
    }
  }

  async *streamResponse(messages: Message[], config?: any): AsyncGenerator<string> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.modelName,
        max_tokens: config?.maxTokens || 4096,
        temperature: config?.temperature || 1.0,
        messages: this.convertMessages(messages),
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      this.handleError(error, 'streamResponse');
    }
  }
}
