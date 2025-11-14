/**
 * Qwen (通义千问) AI model client
 */

import { GenericOpenAIClient } from './generic-openai.js';
import { ModelProvider } from '../types/index.js';

export class QwenClient extends GenericOpenAIClient {
  provider = ModelProvider.QWEN as const;

  constructor(apiKey: string, modelName: string = 'qwen-turbo') {
    super({
      name: 'qwen',
      apiKey,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      modelName,
      type: 'openai-compatible'
    });
  }
}
