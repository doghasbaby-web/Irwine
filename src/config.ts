/**
 * Configuration loader
 */

import dotenv from 'dotenv';
import { ModelProvider } from './types/index.js';

dotenv.config();

export interface Config {
  apiKeys: {
    anthropic?: string;
    openai?: string;
    google?: string;
  };
  defaultProvider: ModelProvider;
  debateRounds: number;
  enableThreeAgentMode: boolean;
}

export function loadConfig(): Config {
  const config: Config = {
    apiKeys: {
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      google: process.env.GOOGLE_API_KEY
    },
    defaultProvider: (process.env.DEFAULT_MODEL_PROVIDER as ModelProvider) || ModelProvider.ANTHROPIC,
    debateRounds: parseInt(process.env.DEBATE_ROUNDS || '3', 10),
    enableThreeAgentMode: process.env.ENABLE_THREE_AGENT_MODE !== 'false'
  };

  return config;
}

export function validateConfig(config: Config): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if at least one API key is provided
  const hasApiKey = Object.values(config.apiKeys).some(key => key && key.length > 0);

  if (!hasApiKey) {
    errors.push('至少需要配置一个 AI 模型的 API Key（ANTHROPIC_API_KEY、OPENAI_API_KEY 或 GOOGLE_API_KEY）');
  }

  // For three-agent mode, we need at least 2 API keys (one can be reused)
  if (config.enableThreeAgentMode) {
    const validKeys = Object.values(config.apiKeys).filter(key => key && key.length > 0);
    if (validKeys.length < 1) {
      errors.push('三 Agent 模式至少需要一个有效的 API Key');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
