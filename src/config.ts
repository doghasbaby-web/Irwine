/**
 * Configuration loader (Legacy)
 * NOTE: This file is kept for backward compatibility.
 * New code should use configManager from './utils/configManager.js'
 */

import dotenv from 'dotenv';
import { ModelProvider, CustomProviderConfig } from './types/index.js';
import { logger } from './utils/logger.js';

dotenv.config();

export interface Config {
  apiKeys: {
    anthropic?: string;
    openai?: string;
    google?: string;
    deepseek?: string;
    qwen?: string;
  };
  defaultProvider: ModelProvider | string;
  debateRounds: number;
  enableThreeAgentMode: boolean;
  customProviders?: CustomProviderConfig[];
}

export function loadConfig(): Config {
  const config: Config = {
    apiKeys: {
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      google: process.env.GOOGLE_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
      qwen: process.env.QWEN_API_KEY
    },
    defaultProvider: (process.env.DEFAULT_MODEL_PROVIDER as ModelProvider) || ModelProvider.ANTHROPIC,
    debateRounds: parseInt(process.env.DEBATE_ROUNDS || '3', 10),
    enableThreeAgentMode: process.env.ENABLE_THREE_AGENT_MODE !== 'false',
    customProviders: loadCustomProviders()
  };

  logger.debug('Legacy config loaded', {
    hasAnthropicKey: !!config.apiKeys.anthropic,
    hasOpenAIKey: !!config.apiKeys.openai,
    hasGoogleKey: !!config.apiKeys.google,
    debateRounds: config.debateRounds
  });

  return config;
}

/**
 * Load custom provider configurations from environment variables
 * Format: CUSTOM_PROVIDER_1_NAME, CUSTOM_PROVIDER_1_API_KEY, CUSTOM_PROVIDER_1_BASE_URL, etc.
 */
function loadCustomProviders(): CustomProviderConfig[] {
  const providers: CustomProviderConfig[] = [];
  let index = 1;

  while (process.env[`CUSTOM_PROVIDER_${index}_NAME`]) {
    const name = process.env[`CUSTOM_PROVIDER_${index}_NAME`];
    const apiKey = process.env[`CUSTOM_PROVIDER_${index}_API_KEY`];
    const baseURL = process.env[`CUSTOM_PROVIDER_${index}_BASE_URL`];
    const modelName = process.env[`CUSTOM_PROVIDER_${index}_MODEL`] || 'default';
    const type = (process.env[`CUSTOM_PROVIDER_${index}_TYPE`] || 'openai-compatible') as any;

    if (name && apiKey && baseURL) {
      providers.push({
        name,
        apiKey,
        baseURL,
        modelName,
        type
      });

      logger.debug('Custom provider loaded', { name, modelName });
    }

    index++;
  }

  return providers;
}

export function validateConfig(config: Config): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if at least one API key is provided (including custom providers)
  const hasBuiltInApiKey = Object.values(config.apiKeys).some(key => key && key.length > 0);
  const hasCustomProvider = config.customProviders && config.customProviders.length > 0;

  if (!hasBuiltInApiKey && !hasCustomProvider) {
    errors.push('At least one AI model API Key or custom provider must be configured');
  }

  // For three-agent mode, we need at least 1 valid provider
  if (config.enableThreeAgentMode) {
    const validBuiltInKeys = Object.values(config.apiKeys).filter(key => key && key.length > 0);
    const totalProviders = validBuiltInKeys.length + (config.customProviders?.length || 0);

    if (totalProviders < 1) {
      errors.push('Three-Agent mode requires at least one valid provider configuration');
    }
  }

  if (errors.length > 0) {
    logger.warn('Config validation failed', { errors });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
