/**
 * Google Gemini model client
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseModelClient } from './base.js';
import { Message, ModelProvider } from '../types/index.js';

export class GoogleClient extends BaseModelClient {
  provider = ModelProvider.GOOGLE as const;
  private client: GoogleGenerativeAI;

  constructor(apiKey: string, modelName: string = 'gemini-2.0-flash-exp') {
    super(apiKey, modelName);
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateResponse(messages: Message[], config?: any): Promise<string> {
    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });

      // Convert messages to Gemini format
      const systemMessages = messages.filter(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      // Gemini doesn't have a separate system role, prepend system messages to first user message
      let chatMessages = conversationMessages;
      if (systemMessages.length > 0 && chatMessages.length > 0) {
        const systemContent = systemMessages.map(m => m.content).join('\n\n');
        if (chatMessages[0].role === 'user') {
          chatMessages = [
            { ...chatMessages[0], content: `${systemContent}\n\n${chatMessages[0].content}` },
            ...chatMessages.slice(1)
          ];
        }
      }

      // Build conversation history
      const history = chatMessages.slice(0, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const lastMessage = chatMessages[chatMessages.length - 1];

      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: config?.maxTokens || 4096,
          temperature: config?.temperature || 1.0,
        }
      });

      const result = await chat.sendMessage(lastMessage.content);
      return result.response.text();
    } catch (error) {
      this.handleError(error, 'generateResponse');
    }
  }

  async *streamResponse(messages: Message[], config?: any): AsyncGenerator<string> {
    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });

      const systemMessages = messages.filter(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      let chatMessages = conversationMessages;
      if (systemMessages.length > 0 && chatMessages.length > 0) {
        const systemContent = systemMessages.map(m => m.content).join('\n\n');
        if (chatMessages[0].role === 'user') {
          chatMessages = [
            { ...chatMessages[0], content: `${systemContent}\n\n${chatMessages[0].content}` },
            ...chatMessages.slice(1)
          ];
        }
      }

      const history = chatMessages.slice(0, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const lastMessage = chatMessages[chatMessages.length - 1];

      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: config?.maxTokens || 4096,
          temperature: config?.temperature || 1.0,
        }
      });

      const result = await chat.sendMessageStream(lastMessage.content);

      for await (const chunk of result.stream) {
        yield chunk.text();
      }
    } catch (error) {
      this.handleError(error, 'streamResponse');
    }
  }
}
