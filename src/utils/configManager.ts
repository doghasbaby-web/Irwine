/**
 * Enhanced configuration management system
 * Provides validation, defaults, and file-based configuration support
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import { ModelProvider, CustomProviderConfig } from '../types/index.js';
import { ConfigurationError } from './errors.js';
import { logger } from './logger.js';

dotenv.config();

export interface ProviderSettings {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface DaoCodeConfig {
  // Provider settings
  providers: {
    anthropic?: ProviderSettings;
    openai?: ProviderSettings;
    google?: ProviderSettings;
    deepseek?: ProviderSettings;
    qwen?: ProviderSettings;
    custom?: CustomProviderConfig[];
  };

  // Agent settings
  agents: {
    defaultProviders?: {
      proposer?: ModelProvider | string;
      challenger?: ModelProvider | string;
      judge?: ModelProvider | string;
    };
    debateRounds: number;
    rotationStrategy: 'sequential' | 'random' | 'performance-based';
    enableThreeAgentMode: boolean;
  };

  // Coding settings
  coding: {
    maxIterations: number;
    autoApprove: boolean;
    timeout: number;
  };

  // Session settings
  session: {
    autoSave: boolean;
    maxSessions: number;
    sessionDir?: string;
  };

  // Performance settings
  performance: {
    enableCaching: boolean;
    cacheSize: number;
    cacheTTL: number;
  };

  // Logging settings
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error' | 'none';
    enableFileLogging: boolean;
  };

  // Sandbox settings
  sandbox: {
    defaultImage: string;
    timeout: number;
    autoCleanup: boolean;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: DaoCodeConfig;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(os.homedir(), '.dao-code', 'config.json');
    this.config = this.getDefaultConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): DaoCodeConfig {
    return {
      providers: {
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: 'claude-sonnet-4-5-20250929',
          timeout: 60000,
          maxRetries: 3
        },
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          model: 'gpt-4-turbo',
          timeout: 60000,
          maxRetries: 3
        },
        google: {
          apiKey: process.env.GOOGLE_API_KEY,
          model: 'gemini-2.0-flash-exp',
          timeout: 60000,
          maxRetries: 3
        },
        deepseek: {
          apiKey: process.env.DEEPSEEK_API_KEY,
          model: 'deepseek-chat',
          baseUrl: 'https://api.deepseek.com',
          timeout: 60000,
          maxRetries: 3
        },
        qwen: {
          apiKey: process.env.QWEN_API_KEY,
          model: 'qwen-turbo',
          baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          timeout: 60000,
          maxRetries: 3
        },
        custom: this.loadCustomProviders()
      },
      agents: {
        defaultProviders: {
          proposer: process.env.PROPOSER_PROVIDER as ModelProvider || ModelProvider.ANTHROPIC,
          challenger: process.env.CHALLENGER_PROVIDER as ModelProvider || ModelProvider.OPENAI,
          judge: process.env.JUDGE_PROVIDER as ModelProvider || ModelProvider.GOOGLE
        },
        debateRounds: parseInt(process.env.DEBATE_ROUNDS || '3', 10),
        rotationStrategy: (process.env.ROTATION_STRATEGY as any) || 'sequential',
        enableThreeAgentMode: process.env.ENABLE_THREE_AGENT_MODE !== 'false'
      },
      coding: {
        maxIterations: parseInt(process.env.MAX_CODING_ITERATIONS || '3', 10),
        autoApprove: process.env.AUTO_APPROVE_CODE === 'true',
        timeout: parseInt(process.env.CODING_TIMEOUT || '300000', 10)
      },
      session: {
        autoSave: process.env.AUTO_SAVE_SESSION !== 'false',
        maxSessions: parseInt(process.env.MAX_SESSIONS || '100', 10),
        sessionDir: process.env.SESSION_DIR
      },
      performance: {
        enableCaching: process.env.ENABLE_CACHING !== 'false',
        cacheSize: parseInt(process.env.CACHE_SIZE || '100', 10),
        cacheTTL: parseInt(process.env.CACHE_TTL || '300000', 10)
      },
      logging: {
        level: (process.env.LOG_LEVEL as any) || 'info',
        enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true'
      },
      sandbox: {
        defaultImage: process.env.SANDBOX_IMAGE || 'ubuntu:latest',
        timeout: parseInt(process.env.SANDBOX_TIMEOUT || '300000', 10),
        autoCleanup: process.env.SANDBOX_AUTO_CLEANUP !== 'false'
      }
    };
  }

  /**
   * Load custom providers from environment variables
   */
  private loadCustomProviders(): CustomProviderConfig[] {
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
      }

      index++;
    }

    return providers;
  }

  /**
   * Load configuration from file
   */
  async load(): Promise<void> {
    try {
      const fileContent = await fs.readFile(this.configPath, 'utf-8');
      const fileConfig = JSON.parse(fileContent);

      // Merge with defaults
      this.config = this.mergeConfigs(this.getDefaultConfig(), fileConfig);

      logger.info('Configuration loaded from file', { path: this.configPath });
    } catch (error) {
      // If file doesn't exist, use defaults
      if ((error as any).code === 'ENOENT') {
        logger.info('No config file found, using defaults');
      } else {
        logger.warn('Failed to load config file, using defaults', { error });
      }
    }

    // Validate configuration
    this.validate();
  }

  /**
   * Save configuration to file
   */
  async save(): Promise<void> {
    try {
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );

      logger.info('Configuration saved to file', { path: this.configPath });
    } catch (error) {
      logger.error('Failed to save configuration', error as Error);
      throw new ConfigurationError('Failed to save configuration file');
    }
  }

  /**
   * Merge configurations (deep merge)
   */
  private mergeConfigs(defaults: DaoCodeConfig, overrides: Partial<DaoCodeConfig>): DaoCodeConfig {
    return {
      providers: {
        ...defaults.providers,
        ...overrides.providers
      },
      agents: {
        ...defaults.agents,
        ...overrides.agents
      },
      coding: {
        ...defaults.coding,
        ...overrides.coding
      },
      session: {
        ...defaults.session,
        ...overrides.session
      },
      performance: {
        ...defaults.performance,
        ...overrides.performance
      },
      logging: {
        ...defaults.logging,
        ...overrides.logging
      },
      sandbox: {
        ...defaults.sandbox,
        ...overrides.sandbox
      }
    };
  }

  /**
   * Validate configuration
   */
  validate(): void {
    const errors: string[] = [];

    // Check if at least one provider has API key
    const hasValidProvider =
      this.config.providers.anthropic?.apiKey ||
      this.config.providers.openai?.apiKey ||
      this.config.providers.google?.apiKey ||
      this.config.providers.deepseek?.apiKey ||
      this.config.providers.qwen?.apiKey ||
      (this.config.providers.custom && this.config.providers.custom.length > 0);

    if (!hasValidProvider) {
      errors.push('At least one AI provider API key must be configured');
    }

    // Validate debate rounds
    if (this.config.agents.debateRounds < 1 || this.config.agents.debateRounds > 10) {
      errors.push('Debate rounds must be between 1 and 10');
    }

    // Validate coding iterations
    if (this.config.coding.maxIterations < 1 || this.config.coding.maxIterations > 10) {
      errors.push('Max coding iterations must be between 1 and 10');
    }

    // Validate cache settings
    if (this.config.performance.cacheSize < 10 || this.config.performance.cacheSize > 10000) {
      errors.push('Cache size must be between 10 and 10000');
    }

    if (errors.length > 0) {
      throw new ConfigurationError('Configuration validation failed', { errors });
    }

    logger.info('Configuration validated successfully');
  }

  /**
   * Get current configuration
   */
  get(): DaoCodeConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  update(updates: Partial<DaoCodeConfig>): void {
    this.config = this.mergeConfigs(this.config, updates);
    this.validate();
  }

  /**
   * Get provider API key
   */
  getProviderApiKey(provider: ModelProvider | string): string | undefined {
    switch (provider) {
      case ModelProvider.ANTHROPIC:
        return this.config.providers.anthropic?.apiKey;
      case ModelProvider.OPENAI:
        return this.config.providers.openai?.apiKey;
      case ModelProvider.GOOGLE:
        return this.config.providers.google?.apiKey;
      case ModelProvider.DEEPSEEK:
        return this.config.providers.deepseek?.apiKey;
      case ModelProvider.QWEN:
        return this.config.providers.qwen?.apiKey;
      default:
        // Check custom providers
        const customProvider = this.config.providers.custom?.find(p => p.name === provider);
        return customProvider?.apiKey;
    }
  }

  /**
   * Get provider settings
   */
  getProviderSettings(provider: ModelProvider | string): ProviderSettings | undefined {
    switch (provider) {
      case ModelProvider.ANTHROPIC:
        return this.config.providers.anthropic;
      case ModelProvider.OPENAI:
        return this.config.providers.openai;
      case ModelProvider.GOOGLE:
        return this.config.providers.google;
      case ModelProvider.DEEPSEEK:
        return this.config.providers.deepseek;
      case ModelProvider.QWEN:
        return this.config.providers.qwen;
      default:
        // Check custom providers
        const customProvider = this.config.providers.custom?.find(p => p.name === provider);
        return customProvider
          ? {
              apiKey: customProvider.apiKey,
              model: customProvider.modelName,
              baseUrl: customProvider.baseURL
            }
          : undefined;
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): (ModelProvider | string)[] {
    const providers: (ModelProvider | string)[] = [];

    if (this.config.providers.anthropic?.apiKey) providers.push(ModelProvider.ANTHROPIC);
    if (this.config.providers.openai?.apiKey) providers.push(ModelProvider.OPENAI);
    if (this.config.providers.google?.apiKey) providers.push(ModelProvider.GOOGLE);
    if (this.config.providers.deepseek?.apiKey) providers.push(ModelProvider.DEEPSEEK);
    if (this.config.providers.qwen?.apiKey) providers.push(ModelProvider.QWEN);

    if (this.config.providers.custom) {
      providers.push(...this.config.providers.custom.map(p => p.name));
    }

    return providers;
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.config = this.getDefaultConfig();
    logger.info('Configuration reset to defaults');
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();
