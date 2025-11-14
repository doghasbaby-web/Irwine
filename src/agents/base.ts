/**
 * Base Agent class
 */

import { AgentRole, AgentConfig, Message, AIModelClient } from '../types/index.js';
import { ModelFactory } from '../models/factory.js';

export class Agent {
  role: AgentRole;
  config: AgentConfig;
  private client: AIModelClient;
  private conversationHistory: Message[] = [];

  constructor(config: AgentConfig, apiKey: string) {
    this.role = config.role;
    this.config = config;
    this.client = ModelFactory.createClient(
      config.modelProvider,
      apiKey,
      config.modelName
    );

    // Initialize with system prompt
    this.conversationHistory.push({
      role: 'system',
      content: config.systemPrompt,
      metadata: {
        agentRole: config.role,
        modelProvider: config.modelProvider,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Generate a response based on conversation history
   */
  async think(userMessage?: string, context?: Message[]): Promise<string> {
    const messages: Message[] = [...this.conversationHistory];

    // Add context from other agents if provided
    if (context && context.length > 0) {
      messages.push(...context);
    }

    // Add new user message if provided
    if (userMessage) {
      const msg: Message = {
        role: 'user',
        content: userMessage,
        metadata: {
          agentRole: this.role,
          modelProvider: this.config.modelProvider,
          timestamp: Date.now()
        }
      };
      messages.push(msg);
      this.conversationHistory.push(msg);
    }

    // Generate response
    const response = await this.client.generateResponse(messages);

    // Save response to history
    const assistantMsg: Message = {
      role: 'assistant',
      content: response,
      metadata: {
        agentRole: this.role,
        modelProvider: this.config.modelProvider,
        timestamp: Date.now()
      }
    };
    this.conversationHistory.push(assistantMsg);

    return response;
  }

  /**
   * Stream a response
   */
  async *thinkStream(userMessage?: string, context?: Message[]): AsyncGenerator<string> {
    if (!this.client.streamResponse) {
      // Fallback to non-streaming
      const response = await this.think(userMessage, context);
      yield response;
      return;
    }

    const messages: Message[] = [...this.conversationHistory];

    if (context && context.length > 0) {
      messages.push(...context);
    }

    if (userMessage) {
      const msg: Message = {
        role: 'user',
        content: userMessage,
        metadata: {
          agentRole: this.role,
          modelProvider: this.config.modelProvider,
          timestamp: Date.now()
        }
      };
      messages.push(msg);
      this.conversationHistory.push(msg);
    }

    let fullResponse = '';
    for await (const chunk of this.client.streamResponse(messages)) {
      fullResponse += chunk;
      yield chunk;
    }

    // Save complete response to history
    const assistantMsg: Message = {
      role: 'assistant',
      content: fullResponse,
      metadata: {
        agentRole: this.role,
        modelProvider: this.config.modelProvider,
        timestamp: Date.now()
      }
    };
    this.conversationHistory.push(assistantMsg);
  }

  /**
   * Get conversation history
   */
  getHistory(): Message[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history (keep system prompt)
   */
  reset(): void {
    const systemPrompt = this.conversationHistory[0];
    this.conversationHistory = [systemPrompt];
  }

  /**
   * Update system prompt dynamically
   */
  updateSystemPrompt(newPrompt: string): void {
    // Update config
    this.config.systemPrompt = newPrompt;

    // Update conversation history - replace first system message
    if (this.conversationHistory.length > 0 && this.conversationHistory[0].role === 'system') {
      this.conversationHistory[0] = {
        role: 'system',
        content: newPrompt,
        metadata: {
          agentRole: this.role,
          modelProvider: this.config.modelProvider,
          timestamp: Date.now()
        }
      };
    } else {
      // If no system message exists, add one at the beginning
      this.conversationHistory.unshift({
        role: 'system',
        content: newPrompt,
        metadata: {
          agentRole: this.role,
          modelProvider: this.config.modelProvider,
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * Get agent identity string
   */
  getIdentity(): string {
    const roleNames = {
      [AgentRole.PROPOSER]: '正方',
      [AgentRole.CHALLENGER]: '反方',
      [AgentRole.JUDGE]: '裁判'
    };
    return `${roleNames[this.role]} (${this.config.modelProvider})`;
  }
}
