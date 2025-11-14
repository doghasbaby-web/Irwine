# 架构设计

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                         CLI Layer                        │
│  (Commander + Inquirer + Chalk)                         │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                    Application Layer                     │
│  - DaoCodeApp                                           │
│  - Configuration Management                             │
│  - Workflow Orchestration                               │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼────────┐  ┌──────▼───────┐
│ Clarification  │  │    Coding    │
│     Stage      │  │    Stage     │
└───────┬────────┘  └──────┬───────┘
        │                   │
        └─────────┬─────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│              Three-Agent Coordinator                     │
│  - Agent Management                                     │
│  - Role Rotation                                        │
│  - Message Coordination                                 │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
┌───────▼──┐ ┌───▼────┐ ┌──▼──────┐
│ Proposer │ │Challenger│ │  Judge │
│  Agent   │ │  Agent  │ │  Agent │
└───────┬──┘ └───┬────┘ └──┬──────┘
        │        │         │
┌───────▼────────▼─────────▼───────────────────────────┐
│              Model Abstraction Layer                  │
│  - AnthropicClient (Claude)                          │
│  - OpenAIClient (ChatGPT)                            │
│  - GoogleClient (Gemini)                             │
└───────────────────────────────────────────────────────┘
```

## 核心组件

### 1. Agent 系统

#### Agent 基类 (`Agent`)

```typescript
class Agent {
  - role: AgentRole
  - config: AgentConfig
  - client: AIModelClient
  - conversationHistory: Message[]

  + think(message, context): Promise<string>
  + thinkStream(message, context): AsyncGenerator<string>
  + reset(): void
}
```

**职责**：
- 维护对话历史
- 调用 AI 模型
- 管理上下文

#### 三 Agent 协调器 (`ThreeAgentCoordinator`)

```typescript
class ThreeAgentCoordinator {
  - agents: Map<AgentRole, Agent>
  - config: ThreeAgentConfig

  + getAgent(role): Agent
  + rotateRoles(): void
  + executeDebateRound(query, round): Promise<DebateResult>
}
```

**职责**：
- 管理三个 Agent 的生命周期
- 协调 Agent 之间的交互
- 实现角色轮换机制

### 2. 工作阶段

#### 需求澄清阶段 (`ClarificationStage`)

```typescript
class ClarificationStage {
  + execute(requirement, rounds): Promise<ClarificationResult>
  - extractProposals(analysis): Promise<Proposal[]>
}
```

**工作流程**：
```
User Requirement
      ↓
Round 1: Propose → Challenge → (Record)
      ↓
Round 2: Refine → Challenge → (Record)
      ↓
Round N: Finalize → Challenge → Judge
      ↓
Extract Top 3 Proposals
```

#### 编码协同阶段 (`CodingStage`)

```typescript
class CodingStage {
  + startSession(proposal, maxIterations): Promise<CodingSession>
  - executeIteration(): Promise<CodingIteration>
  - rotateRoles(): void
}
```

**工作流程**：
```
Selected Proposal
      ↓
Iteration 1: Write → Review → Inspect
      ↓ (if not approved)
Rotation: A→B, B→C, C→A
      ↓
Iteration 2: Write → Review → Inspect
      ↓ (if approved or max iterations)
Final Code
```

### 3. 模型抽象层

#### 基础客户端接口 (`AIModelClient`)

```typescript
interface AIModelClient {
  provider: ModelProvider
  generateResponse(messages): Promise<string>
  streamResponse?(messages): AsyncGenerator<string>
}
```

#### 具体实现

- **AnthropicClient**: Claude API 封装
- **OpenAIClient**: ChatGPT API 封装
- **GoogleClient**: Gemini API 封装

**设计特点**：
- 统一接口，易于扩展新模型
- 支持流式和非流式响应
- 错误处理和重试机制

### 4. CLI 层

#### 命令结构

```
dao-code
├── interactive (-i)    # 完整流程
├── clarify (-c)        # 仅需求澄清
├── code                # 仅编码协同
└── menu (-m)           # 菜单模式
```

#### 交互组件

- **display.ts**: 美化输出（chalk）
- **prompts.ts**: 用户输入（inquirer）

## 数据流

### 需求澄清流程

```
┌──────────┐
│   User   │
│  Input   │
└────┬─────┘
     │
┌────▼──────────────────────────────────────┐
│  Round 1                                   │
│  ┌────────┐  ┌──────────┐  ┌──────────┐  │
│  │Proposer│→ │Challenger│→ │  Judge   │  │
│  └────────┘  └──────────┘  └──────────┘  │
└────┬──────────────────────────────────────┘
     │
┌────▼──────────────────────────────────────┐
│  Round 2                                   │
│  ┌────────┐  ┌──────────┐  ┌──────────┐  │
│  │Proposer│→ │Challenger│→ │  Judge   │  │
│  └────────┘  └──────────┘  └──────────┘  │
└────┬──────────────────────────────────────┘
     │
┌────▼──────────────────────────────────────┐
│  Round N (Final)                           │
│  ┌────────┐  ┌──────────┐  ┌──────────┐  │
│  │Proposer│→ │Challenger│→ │ Judge +  │  │
│  └────────┘  └──────────┘  │ Analyze  │  │
│                             └──────────┘  │
└────┬──────────────────────────────────────┘
     │
┌────▼─────┐
│ Top 3    │
│Proposals │
└──────────┘
```

### 编码协同流程

```
┌──────────┐
│ Selected │
│ Proposal │
└────┬─────┘
     │
┌────▼───────────────────────────────────────┐
│  Iteration 1 (Roles: A=Write, B=Review,    │
│              C=Inspect)                     │
│  ┌─────┐  ┌──────┐  ┌────────┐            │
│  │  A  │→ │  B   │→ │   C    │→ Decision  │
│  │Write│  │Review│  │Inspect │            │
│  └─────┘  └──────┘  └────────┘            │
└────┬───────────────────────────────────────┘
     │ Not Approved
     │ ↓ Rotate Roles
┌────▼───────────────────────────────────────┐
│  Iteration 2 (Roles: B=Write, C=Review,    │
│              A=Inspect)                     │
│  ┌─────┐  ┌──────┐  ┌────────┐            │
│  │  B  │→ │  C   │→ │   A    │→ Decision  │
│  │Write│  │Review│  │Inspect │            │
│  └─────┘  └──────┘  └────────┘            │
└────┬───────────────────────────────────────┘
     │ Approved or Max Iterations
┌────▼─────┐
│  Final   │
│   Code   │
└──────────┘
```

## 设计模式

### 1. 策略模式 (Strategy Pattern)

不同的 AI 模型客户端实现相同接口：

```typescript
interface AIModelClient {
  generateResponse(messages): Promise<string>
}

// 三种策略
class AnthropicClient implements AIModelClient { }
class OpenAIClient implements AIModelClient { }
class GoogleClient implements AIModelClient { }
```

### 2. 工厂模式 (Factory Pattern)

```typescript
class ModelFactory {
  static createClient(provider, apiKey, modelName): AIModelClient {
    switch (provider) {
      case 'anthropic': return new AnthropicClient(...)
      case 'openai': return new OpenAIClient(...)
      case 'google': return new GoogleClient(...)
    }
  }
}
```

### 3. 协调器模式 (Coordinator Pattern)

`ThreeAgentCoordinator` 负责协调三个 Agent 的交互，避免 Agent 之间直接耦合。

### 4. 模板方法模式 (Template Method Pattern)

`ClarificationStage` 和 `CodingStage` 定义了固定的工作流程，具体步骤由 Agent 实现。

## 扩展性设计

### 添加新的 AI 模型

1. 实现 `AIModelClient` 接口
2. 在 `ModelFactory` 中注册
3. 更新配置和类型定义

```typescript
// 示例：添加 Llama 支持
class LlamaClient extends BaseModelClient {
  provider = ModelProvider.LLAMA
  async generateResponse(messages) { ... }
}

// 在 factory 中注册
case ModelProvider.LLAMA:
  return new LlamaClient(apiKey, modelName)
```

### 添加新的工作阶段

1. 创建新的 Stage 类
2. 在 `DaoCodeApp` 中集成
3. 添加 CLI 命令

```typescript
class TestingStage {
  constructor(coordinator: ThreeAgentCoordinator) {}

  async execute(code: string): Promise<TestResult> {
    // Proposer: 生成测试用例
    // Challenger: 找出未覆盖的边界情况
    // Judge: 评估测试质量
  }
}
```

### 添加新的角色轮换策略

```typescript
interface RotationStrategy {
  rotate(currentAssignments): NewAssignments
}

class PerformanceBasedRotation implements RotationStrategy {
  rotate(currentAssignments) {
    // 根据性能分数调整角色
  }
}
```

## 性能考虑

### 1. 并发请求

目前是串行调用 AI API，未来可以优化：

```typescript
// 当前
const proposerResponse = await proposer.think(...)
const challengerResponse = await challenger.think(...)

// 优化（某些场景）
const [proposerResponse, challengerResponse] = await Promise.all([
  proposer.think(...),
  challenger.think(...)
])
```

### 2. 缓存机制

- 模型客户端缓存（已实现）
- 对话历史持久化（待实现）
- 方案库缓存（待实现）

### 3. 流式响应

支持流式输出，提升用户体验：

```typescript
for await (const chunk of agent.thinkStream(message)) {
  process.stdout.write(chunk)
}
```

## 安全考虑

### 1. API Key 管理

- 使用环境变量存储
- 不提交到版本控制
- 支持多种配置方式

### 2. 输入验证

- 验证用户输入
- 防止注入攻击
- 限制输入长度

### 3. 错误处理

- 统一错误处理
- 敏感信息脱敏
- 优雅降级

## 测试策略

### 单元测试

- Agent 类
- Model 客户端
- 工具函数

### 集成测试

- Stage 流程
- Coordinator 协调
- CLI 命令

### E2E 测试

- 完整工作流
- 多模型组合
- 错误场景

## 未来规划

### Phase 2
- 持久化对话历史
- 支持更多 AI 模型
- 代码执行和验证

### Phase 3
- Web UI
- VS Code 插件
- 团队协作模式

### Phase 4
- 自定义 Agent 角色
- 可视化辩论过程
- AI 性能分析
