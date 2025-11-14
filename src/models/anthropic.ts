/**
 * Anthropic Claude model client
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseModelClient } from './base.js';
import { Message, ModelProvider } from '../types/index.js';

export class AnthropicClient extends BaseModelClient {
  provider = ModelProvider.ANTHROPIC as const;
  private client: Anthropic;

  constructor(apiKey: string, modelName: string = 'claude-sonnet-4-5-20250929') {
    super(apiKey, modelName);
    this.client = new Anthropic({ apiKey });
  }

  async generateResponse(messages: Message[], config?: any): Promise<string> {
    return this.withRetry(async () => {
      try {
        // Separate system messages from conversation messages
        const systemMessages = messages.filter(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system');

        const systemPrompt = systemMessages.length > 0
          ? systemMessages.map(m => m.content).join('\n\n')
          : undefined;

        const response = await this.client.messages.create({
          model: this.modelName,
          max_tokens: config?.maxTokens || 4096,
          temperature: config?.temperature || 1.0,
          system: systemPrompt,
          messages: conversationMessages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          }))
        });

        const textContent = response.content.find(c => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text content in response');
        }

        return textContent.text;
      } catch (error) {
        this.handleError(error, 'generateResponse');
      }
    });
  }

  async *streamResponse(messages: Message[], config?: any): AsyncGenerator<string> {
    try {
      const systemMessages = messages.filter(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      const systemPrompt = systemMessages.length > 0
        ? systemMessages.map(m => m.content).join('\n\n')
        : undefined;

      const stream = await this.client.messages.create({
        model: this.modelName,
        max_tokens: config?.maxTokens || 4096,
        temperature: config?.temperature || 1.0,
        system: systemPrompt,
        messages: conversationMessages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        stream: true
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta') {
          yield chunk.delta.text;
        }
      }
    } catch (error) {
      this.handleError(error, 'streamResponse');
    }
  }
}
