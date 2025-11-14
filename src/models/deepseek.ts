/**
 * DeepSeek AI model client
 */

import { GenericOpenAIClient } from './generic-openai.js';
import { ModelProvider } from '../types/index.js';

export class DeepSeekClient extends GenericOpenAIClient {
  provider = ModelProvider.DEEPSEEK as const;

  constructor(apiKey: string, modelName: string = 'deepseek-chat') {
    super({
      name: 'deepseek',
      apiKey,
      baseURL: 'https://api.deepseek.com/v1',
      modelName,
      type: 'openai-compatible'
    });
  }
}
