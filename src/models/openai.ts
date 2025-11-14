/**
 * OpenAI GPT model client
 */

import OpenAI from 'openai';
import { BaseModelClient } from './base.js';
import { Message, ModelProvider } from '../types/index.js';

export class OpenAIClient extends BaseModelClient {
  provider = ModelProvider.OPENAI as const;
  private client: OpenAI;

  constructor(apiKey: string, modelName: string = 'gpt-4-turbo') {
    super(apiKey, modelName);
    this.client = new OpenAI({ apiKey });
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
