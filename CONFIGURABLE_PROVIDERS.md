# Configurable Multi-Agent Providers

This document explains how to configure the three-agent system to use different AI providers (OpenAI, DeepSeek, Qwen, or any custom OpenAI-compatible API) for each agent.

## Overview

The three-agent system now supports:
- **Built-in providers**: Anthropic (Claude), OpenAI (GPT), Google (Gemini), DeepSeek, Qwen
- **Custom providers**: Any OpenAI-compatible API (local LLMs, other cloud providers, etc.)
- **Flexible assignment**: Each agent (Proposer, Challenger, Judge) can use a different provider

## Quick Start

### 1. Built-in Providers

Add API keys to your `.env` file:

```bash
# Choose which providers you want to use
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
GOOGLE_API_KEY=xxx
DEEPSEEK_API_KEY=sk-xxx
QWEN_API_KEY=sk-xxx
```

The system will automatically use available providers for the three agents.

### 2. Custom Providers

Add custom provider configurations to your `.env` file:

```bash
# Custom Provider 1: DeepSeek with explicit configuration
CUSTOM_PROVIDER_1_NAME=deepseek
CUSTOM_PROVIDER_1_API_KEY=sk-xxx
CUSTOM_PROVIDER_1_BASE_URL=https://api.deepseek.com/v1
CUSTOM_PROVIDER_1_MODEL=deepseek-chat
CUSTOM_PROVIDER_1_TYPE=openai-compatible

# Custom Provider 2: Qwen (Alibaba Cloud)
CUSTOM_PROVIDER_2_NAME=qwen
CUSTOM_PROVIDER_2_API_KEY=sk-xxx
CUSTOM_PROVIDER_2_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
CUSTOM_PROVIDER_2_MODEL=qwen-turbo
CUSTOM_PROVIDER_2_TYPE=openai-compatible

# Custom Provider 3: Local LLM
CUSTOM_PROVIDER_3_NAME=local-llm
CUSTOM_PROVIDER_3_API_KEY=sk-xxx
CUSTOM_PROVIDER_3_BASE_URL=http://localhost:8000/v1
CUSTOM_PROVIDER_3_MODEL=llama-3-70b
CUSTOM_PROVIDER_3_TYPE=openai-compatible
```

## Supported Providers

### Built-in Providers

| Provider | Model | API Key Variable | Base URL |
|----------|-------|-----------------|----------|
| Anthropic | claude-sonnet-4-5-20250929 | `ANTHROPIC_API_KEY` | https://api.anthropic.com |
| OpenAI | gpt-4-turbo | `OPENAI_API_KEY` | https://api.openai.com/v1 |
| Google | gemini-2.0-flash-exp | `GOOGLE_API_KEY` | - |
| DeepSeek | deepseek-chat | `DEEPSEEK_API_KEY` | https://api.deepseek.com/v1 |
| Qwen | qwen-turbo | `QWEN_API_KEY` | https://dashscope.aliyuncs.com/compatible-mode/v1 |

### Custom Providers

Any OpenAI-compatible API can be used as a custom provider. Examples:

- **Local LLMs**: Ollama, LocalAI, vLLM, etc.
- **Cloud Providers**: Together AI, Anyscale, Replicate, etc.
- **Other AI Services**: Any service with OpenAI-compatible endpoints

## Configuration Examples

### Example 1: DeepSeek for All Agents

```bash
DEEPSEEK_API_KEY=sk-your-deepseek-key

# The system will use DeepSeek for all three agents if it's the only provider configured
```

### Example 2: Mixed Providers

```bash
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
DEEPSEEK_API_KEY=sk-xxx

# The system will distribute:
# - Proposer: Anthropic (Claude)
# - Challenger: OpenAI (GPT)
# - Judge: DeepSeek
```

### Example 3: Custom Local LLM + Cloud Providers

```bash
# Cloud providers
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# Local LLM via Ollama
CUSTOM_PROVIDER_1_NAME=ollama
CUSTOM_PROVIDER_1_API_KEY=not-required
CUSTOM_PROVIDER_1_BASE_URL=http://localhost:11434/v1
CUSTOM_PROVIDER_1_MODEL=llama3.1:70b
CUSTOM_PROVIDER_1_TYPE=openai-compatible
```

### Example 4: All Custom Providers

```bash
CUSTOM_PROVIDER_1_NAME=deepseek
CUSTOM_PROVIDER_1_API_KEY=sk-deepseek-xxx
CUSTOM_PROVIDER_1_BASE_URL=https://api.deepseek.com/v1
CUSTOM_PROVIDER_1_MODEL=deepseek-chat
CUSTOM_PROVIDER_1_TYPE=openai-compatible

CUSTOM_PROVIDER_2_NAME=qwen
CUSTOM_PROVIDER_2_API_KEY=sk-qwen-xxx
CUSTOM_PROVIDER_2_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
CUSTOM_PROVIDER_2_MODEL=qwen-turbo
CUSTOM_PROVIDER_2_TYPE=openai-compatible

CUSTOM_PROVIDER_3_NAME=local-llm
CUSTOM_PROVIDER_3_API_KEY=not-required
CUSTOM_PROVIDER_3_BASE_URL=http://localhost:8000/v1
CUSTOM_PROVIDER_3_MODEL=llama-3-70b
CUSTOM_PROVIDER_3_TYPE=openai-compatible
```

## Provider Configuration Parameters

### Required Parameters

- `CUSTOM_PROVIDER_N_NAME`: Display name for the provider
- `CUSTOM_PROVIDER_N_API_KEY`: API key for authentication
- `CUSTOM_PROVIDER_N_BASE_URL`: Base URL for the API endpoint
- `CUSTOM_PROVIDER_N_MODEL`: Model name to use

### Optional Parameters

- `CUSTOM_PROVIDER_N_TYPE`: API compatibility type (default: `openai-compatible`)
  - `openai-compatible`: OpenAI-compatible API
  - Future: `anthropic-compatible`, `google-compatible`

## How It Works

1. **Configuration Loading**: The system loads all API keys and custom provider configurations from `.env`
2. **Provider Assignment**: Available providers are automatically assigned to the three agents:
   - Proposer: Proposes solutions
   - Challenger: Challenges and critiques
   - Judge: Analyzes and judges
3. **Model Selection**: Each provider uses its default model or a custom model specified in the configuration
4. **Dynamic Rotation**: Providers can be rotated across roles using different strategies:
   - Sequential: Proposer → Challenger → Judge → Proposer
   - Random: Random shuffle across roles
   - Performance-based: Best performer gets Judge role

## Testing Your Configuration

After configuring your providers, test the setup:

```bash
# Build the project
npm run build

# Run the CLI
npm start
```

The system will display which providers are being used for each agent role.

## Troubleshooting

### Provider Not Found

**Error**: `API key not found for provider: xxx`

**Solution**: Make sure the API key is set in your `.env` file:
```bash
DEEPSEEK_API_KEY=your-key-here
```

### Connection Failed

**Error**: `Failed to connect to provider`

**Solution**:
1. Check the `BASE_URL` is correct
2. Verify your API key is valid
3. Ensure the provider service is running (for local LLMs)

### Model Not Found

**Error**: `Model not found: xxx`

**Solution**: Update the model name in your configuration:
```bash
CUSTOM_PROVIDER_1_MODEL=correct-model-name
```

## Advanced Usage

### Programmatic Configuration

You can also configure providers programmatically:

```typescript
import { CustomProviderConfig, ModelProvider } from './types/index.js';
import { createDefaultConfig, ThreeAgentCoordinator } from './agents/coordinator.js';

// Define custom providers
const customProviders: CustomProviderConfig[] = [
  {
    name: 'local-llm',
    apiKey: 'not-required',
    baseURL: 'http://localhost:8000/v1',
    modelName: 'llama-3-70b',
    type: 'openai-compatible'
  }
];

// Create coordinator with custom providers
const coordinator = new ThreeAgentCoordinator(
  config,
  apiKeys,
  customProviders
);
```

## API Documentation

### CustomProviderConfig Interface

```typescript
interface CustomProviderConfig {
  name: string;           // Display name (e.g., 'deepseek', 'qwen', 'local-llm')
  apiKey: string;         // API key for authentication
  baseURL: string;        // Base URL for the API (e.g., 'https://api.deepseek.com/v1')
  modelName: string;      // Model name to use (e.g., 'deepseek-chat', 'qwen-turbo')
  type?: 'openai-compatible' | 'anthropic-compatible' | 'google-compatible';
}
```

### ModelProvider Enum

```typescript
enum ModelProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GOOGLE = 'google',
  DEEPSEEK = 'deepseek',
  QWEN = 'qwen',
  CUSTOM = 'custom'
}
```

## Contributing

To add support for a new provider:

1. Create a new client class in `src/models/` (if needed)
2. Update `ModelProvider` enum in `src/types/index.ts`
3. Add the provider case in `ModelFactory.createClient()`
4. Update documentation

## License

MIT
