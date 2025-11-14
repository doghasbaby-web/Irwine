# Architecture Design

## System Architecture

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

## Core Components

### 1. Agent System

#### Agent Base Class (`Agent`)

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

**Responsibilities**:
- Maintain conversation history
- Call AI models
- Manage context

#### Three-Agent Coordinator (`ThreeAgentCoordinator`)

```typescript
class ThreeAgentCoordinator {
  - agents: Map<AgentRole, Agent>
  - config: ThreeAgentConfig

  + getAgent(role): Agent
  + rotateRoles(): void
  + executeDebateRound(query, round): Promise<DebateResult>
}
```

**Responsibilities**:
- Manage lifecycle of three Agents
- Coordinate interactions between Agents
- Implement role rotation mechanism

### 2. Work Stages

#### Requirements Clarification Stage (`ClarificationStage`)

```typescript
class ClarificationStage {
  + execute(requirement, rounds): Promise<ClarificationResult>
  - extractProposals(analysis): Promise<Proposal[]>
}
```

**Workflow**:
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

#### Coding Collaboration Stage (`CodingStage`)

```typescript
class CodingStage {
  + startSession(proposal, maxIterations): Promise<CodingSession>
  - executeIteration(): Promise<CodingIteration>
  - rotateRoles(): void
}
```

**Workflow**:
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

### 3. Model Abstraction Layer

#### Base Client Interface (`AIModelClient`)

```typescript
interface AIModelClient {
  provider: ModelProvider
  generateResponse(messages): Promise<string>
  streamResponse?(messages): AsyncGenerator<string>
}
```

#### Concrete Implementations

- **AnthropicClient**: Claude API wrapper
- **OpenAIClient**: ChatGPT API wrapper
- **GoogleClient**: Gemini API wrapper

**Design Features**:
- Unified interface, easy to extend with new models
- Supports streaming and non-streaming responses
- Error handling and retry mechanism

### 4. CLI Layer

#### Command Structure

```
dao-code
├── interactive (-i)    # Complete workflow
├── clarify (-c)        # Requirements clarification only
├── code                # Coding collaboration only
└── menu (-m)           # Menu mode
```

#### Interactive Components

- **display.ts**: Beautified output (chalk)
- **prompts.ts**: User input (inquirer)

## Data Flow

### Requirements Clarification Flow

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

### Coding Collaboration Flow

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

## Design Patterns

### 1. Strategy Pattern

Different AI model clients implement the same interface:

```typescript
interface AIModelClient {
  generateResponse(messages): Promise<string>
}

// Three strategies
class AnthropicClient implements AIModelClient { }
class OpenAIClient implements AIModelClient { }
class GoogleClient implements AIModelClient { }
```

### 2. Factory Pattern

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

### 3. Coordinator Pattern

`ThreeAgentCoordinator` coordinates interactions between three Agents, avoiding direct coupling between Agents.

### 4. Template Method Pattern

`ClarificationStage` and `CodingStage` define fixed workflows, with specific steps implemented by Agents.

## Extensibility Design

### Adding a New AI Model

1. Implement the `AIModelClient` interface
2. Register in `ModelFactory`
3. Update configuration and type definitions

```typescript
// Example: Adding Llama support
class LlamaClient extends BaseModelClient {
  provider = ModelProvider.LLAMA
  async generateResponse(messages) { ... }
}

// Register in factory
case ModelProvider.LLAMA:
  return new LlamaClient(apiKey, modelName)
```

### Adding a New Work Stage

1. Create a new Stage class
2. Integrate in `DaoCodeApp`
3. Add CLI command

```typescript
class TestingStage {
  constructor(coordinator: ThreeAgentCoordinator) {}

  async execute(code: string): Promise<TestResult> {
    // Proposer: Generate test cases
    // Challenger: Find uncovered edge cases
    // Judge: Evaluate test quality
  }
}
```

### Adding a New Role Rotation Strategy

```typescript
interface RotationStrategy {
  rotate(currentAssignments): NewAssignments
}

class PerformanceBasedRotation implements RotationStrategy {
  rotate(currentAssignments) {
    // Adjust roles based on performance scores
  }
}
```

## Performance Considerations

### 1. Concurrent Requests

Currently using serial AI API calls, can be optimized in the future:

```typescript
// Current
const proposerResponse = await proposer.think(...)
const challengerResponse = await challenger.think(...)

// Optimized (certain scenarios)
const [proposerResponse, challengerResponse] = await Promise.all([
  proposer.think(...),
  challenger.think(...)
])
```

### 2. Caching Mechanisms

- Model client caching (implemented)
- Conversation history persistence (to be implemented)
- Solution library caching (to be implemented)

### 3. Streaming Response

Support streaming output to improve user experience:

```typescript
for await (const chunk of agent.thinkStream(message)) {
  process.stdout.write(chunk)
}
```

## Security Considerations

### 1. API Key Management

- Store using environment variables
- Do not commit to version control
- Support multiple configuration methods

### 2. Input Validation

- Validate user input
- Prevent injection attacks
- Limit input length

### 3. Error Handling

- Unified error handling
- Sanitize sensitive information
- Graceful degradation

## Testing Strategy

### Unit Testing

- Agent classes
- Model clients
- Utility functions

### Integration Testing

- Stage workflows
- Coordinator coordination
- CLI commands

### E2E Testing

- Complete workflows
- Multi-model combinations
- Error scenarios

## Future Roadmap

### Phase 2
- Persist conversation history
- Support more AI models
- Code execution and validation

### Phase 3
- Web UI
- VS Code extension
- Team collaboration mode

### Phase 4
- Custom Agent roles
- Visualize debate process
- AI performance analytics
