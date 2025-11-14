/**
 * Three-Agent Coordinator
 * Manages the interaction and rotation of three agents
 */

import { Agent } from './base.js';
import { AgentRole, AgentConfig, ThreeAgentConfig, Message, ModelProvider } from '../types/index.js';
import { AGENT_PROMPTS } from './prompts.js';

export class ThreeAgentCoordinator {
  private agents: Map<AgentRole, Agent> = new Map();
  private config: ThreeAgentConfig;
  private apiKeys: {
    anthropic?: string;
    openai?: string;
    google?: string;
  };
  private performanceMetrics: Map<ModelProvider, {
    successCount: number;
    failureCount: number;
    avgResponseTime: number;
    totalIterations: number;
  }> = new Map();

  constructor(config: ThreeAgentConfig, apiKeys: any) {
    this.config = config;
    this.apiKeys = apiKeys;
    this.initializeAgents();
    this.initializePerformanceMetrics();
  }

  /**
   * Initialize performance metrics for all providers
   */
  private initializePerformanceMetrics(): void {
    const providers = [ModelProvider.ANTHROPIC, ModelProvider.OPENAI, ModelProvider.GOOGLE];
    for (const provider of providers) {
      this.performanceMetrics.set(provider, {
        successCount: 0,
        failureCount: 0,
        avgResponseTime: 0,
        totalIterations: 0
      });
    }
  }

  /**
   * Initialize the three agents with their roles and models
   */
  private initializeAgents(): void {
    const roles = [AgentRole.PROPOSER, AgentRole.CHALLENGER, AgentRole.JUDGE];

    for (const role of roles) {
      const agentConfig = this.config.agents[role];
      const apiKey = this.getApiKeyForProvider(agentConfig.modelProvider);

      if (!apiKey) {
        throw new Error(`API key not found for provider: ${agentConfig.modelProvider}`);
      }

      const agent = new Agent(agentConfig, apiKey);
      this.agents.set(role, agent);
    }
  }

  /**
   * Get API key for a specific provider
   */
  private getApiKeyForProvider(provider: ModelProvider): string | undefined {
    switch (provider) {
      case ModelProvider.ANTHROPIC:
        return this.apiKeys.anthropic;
      case ModelProvider.OPENAI:
        return this.apiKeys.openai;
      case ModelProvider.GOOGLE:
        return this.apiKeys.google;
      default:
        return undefined;
    }
  }

  /**
   * Get an agent by role
   */
  getAgent(role: AgentRole): Agent {
    const agent = this.agents.get(role);
    if (!agent) {
      throw new Error(`Agent not found for role: ${role}`);
    }
    return agent;
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Rotate agent roles for the next iteration
   */
  rotateRoles(): void {
    switch (this.config.rotationStrategy) {
      case 'sequential':
        this.rotateSequential();
        break;
      case 'random':
        this.rotateRandom();
        break;
      case 'performance-based':
        this.rotatePerformanceBased();
        break;
      default:
        this.rotateSequential();
    }
  }

  /**
   * Sequential rotation: Proposer -> Challenger -> Judge -> Proposer
   */
  private rotateSequential(): void {
    const rotationMap = {
      [AgentRole.PROPOSER]: AgentRole.CHALLENGER,
      [AgentRole.CHALLENGER]: AgentRole.JUDGE,
      [AgentRole.JUDGE]: AgentRole.PROPOSER
    };

    const newAgents = new Map<AgentRole, Agent>();

    for (const [currentRole, agent] of this.agents.entries()) {
      const newRole = rotationMap[currentRole];
      const newConfig = { ...agent.config, role: newRole };
      newConfig.systemPrompt = AGENT_PROMPTS[newRole];

      const apiKey = this.getApiKeyForProvider(newConfig.modelProvider);
      if (!apiKey) {
        throw new Error(`API key not found for provider: ${newConfig.modelProvider}`);
      }

      const newAgent = new Agent(newConfig, apiKey);
      newAgents.set(newRole, newAgent);
    }

    this.agents = newAgents;
  }

  /**
   * Random rotation: Randomly shuffle providers across roles
   */
  private rotateRandom(): void {
    const roles = [AgentRole.PROPOSER, AgentRole.CHALLENGER, AgentRole.JUDGE];
    const providers = Array.from(this.agents.values()).map(a => a.config.modelProvider);

    // Fisher-Yates shuffle
    for (let i = providers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [providers[i], providers[j]] = [providers[j], providers[i]];
    }

    const newAgents = new Map<AgentRole, Agent>();

    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      const provider = providers[i];

      const newConfig: AgentConfig = {
        role,
        modelProvider: provider,
        modelName: this.getDefaultModelName(provider),
        systemPrompt: AGENT_PROMPTS[role]
      };

      const apiKey = this.getApiKeyForProvider(provider);
      if (!apiKey) {
        throw new Error(`API key not found for provider: ${provider}`);
      }

      const newAgent = new Agent(newConfig, apiKey);
      newAgents.set(role, newAgent);
    }

    this.agents = newAgents;
  }

  /**
   * Performance-based rotation: Best performer gets the Judge role
   */
  private rotatePerformanceBased(): void {
    const roles = [AgentRole.PROPOSER, AgentRole.CHALLENGER, AgentRole.JUDGE];
    const providers = Array.from(this.agents.values()).map(a => a.config.modelProvider);

    // Calculate performance scores
    const scores = providers.map(provider => {
      const metrics = this.performanceMetrics.get(provider);
      if (!metrics || metrics.totalIterations === 0) {
        return { provider, score: 0.5 }; // Neutral score for new providers
      }

      const successRate = metrics.successCount / (metrics.successCount + metrics.failureCount);
      const speedScore = 1 / (metrics.avgResponseTime + 1); // Lower response time = higher score
      return {
        provider,
        score: successRate * 0.7 + speedScore * 0.3 // Weight success more than speed
      };
    });

    // Sort by score (best first)
    scores.sort((a, b) => b.score - a.score);

    // Assign: Best -> Judge, Second -> Proposer, Third -> Challenger
    const roleAssignment = [
      { role: AgentRole.JUDGE, provider: scores[0].provider },
      { role: AgentRole.PROPOSER, provider: scores[1].provider },
      { role: AgentRole.CHALLENGER, provider: scores[2].provider }
    ];

    const newAgents = new Map<AgentRole, Agent>();

    for (const assignment of roleAssignment) {
      const newConfig: AgentConfig = {
        role: assignment.role,
        modelProvider: assignment.provider,
        modelName: this.getDefaultModelName(assignment.provider),
        systemPrompt: AGENT_PROMPTS[assignment.role]
      };

      const apiKey = this.getApiKeyForProvider(assignment.provider);
      if (!apiKey) {
        throw new Error(`API key not found for provider: ${assignment.provider}`);
      }

      const newAgent = new Agent(newConfig, apiKey);
      newAgents.set(assignment.role, newAgent);
    }

    this.agents = newAgents;
  }

  /**
   * Get default model name for a provider
   */
  private getDefaultModelName(provider: ModelProvider): string {
    switch (provider) {
      case ModelProvider.ANTHROPIC:
        return 'claude-sonnet-4-5-20250929';
      case ModelProvider.OPENAI:
        return 'gpt-4-turbo';
      case ModelProvider.GOOGLE:
        return 'gemini-2.0-flash-exp';
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Record performance metrics after an iteration
   */
  recordPerformance(provider: ModelProvider, success: boolean, responseTime: number): void {
    const metrics = this.performanceMetrics.get(provider);
    if (!metrics) return;

    if (success) {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }

    metrics.totalIterations++;
    metrics.avgResponseTime =
      (metrics.avgResponseTime * (metrics.totalIterations - 1) + responseTime) / metrics.totalIterations;

    this.performanceMetrics.set(provider, metrics);
  }

  /**
   * Get performance metrics for all providers
   */
  getPerformanceMetrics(): Map<ModelProvider, {
    successCount: number;
    failureCount: number;
    avgResponseTime: number;
    totalIterations: number;
  }> {
    return new Map(this.performanceMetrics);
  }

  /**
   * Reset all agents
   */
  resetAll(): void {
    for (const agent of this.agents.values()) {
      agent.reset();
    }
  }

  /**
   * Get current role assignments
   */
  getRoleAssignments(): { role: AgentRole; provider: ModelProvider }[] {
    return Array.from(this.agents.entries()).map(([role, agent]) => ({
      role,
      provider: agent.config.modelProvider
    }));
  }

  /**
   * Execute a debate round
   */
  async executeDebateRound(
    userQuery: string,
    round: number
  ): Promise<{
    proposerResponse: string;
    challengerResponse: string;
    judgeResponse?: string;
  }> {
    const proposer = this.getAgent(AgentRole.PROPOSER);
    const challenger = this.getAgent(AgentRole.CHALLENGER);
    const judge = this.getAgent(AgentRole.JUDGE);

    // Proposer speaks first
    const proposerPrompt = round === 1
      ? `用户需求：${userQuery}\n\n请提出 2-3 个可行的技术方案。`
      : `继续完善你的方案，回应反方的质疑。`;

    const proposerResponse = await proposer.think(proposerPrompt);

    // Challenger responds
    const challengerContext: Message[] = [{
      role: 'user',
      content: `正方提出的方案：\n\n${proposerResponse}\n\n请仔细分析并指出问题。`
    }];
    const challengerResponse = await challenger.think(undefined, challengerContext);

    // Judge analyzes (only on final round)
    let judgeResponse: string | undefined;
    if (round === this.config.debateRounds) {
      const judgeContext: Message[] = [
        {
          role: 'user',
          content: `正方方案：\n\n${proposerResponse}\n\n反方质疑：\n\n${challengerResponse}\n\n请给出综合分析和最终的 3 个推荐方案。`
        }
      ];
      judgeResponse = await judge.think(undefined, judgeContext);
    }

    return {
      proposerResponse,
      challengerResponse,
      judgeResponse
    };
  }

  /**
   * Execute a debate round with streaming output
   */
  async *executeDebateRoundStream(
    userQuery: string,
    round: number,
    onChunk?: (role: AgentRole, chunk: string) => void
  ): AsyncGenerator<{
    role: AgentRole;
    chunk: string;
    isComplete?: boolean;
    fullResponse?: string;
  }> {
    const proposer = this.getAgent(AgentRole.PROPOSER);
    const challenger = this.getAgent(AgentRole.CHALLENGER);
    const judge = this.getAgent(AgentRole.JUDGE);

    // Proposer speaks first
    const proposerPrompt = round === 1
      ? `用户需求：${userQuery}\n\n请提出 2-3 个可行的技术方案。`
      : `继续完善你的方案，回应反方的质疑。`;

    let proposerResponse = '';
    for await (const chunk of proposer.thinkStream(proposerPrompt)) {
      proposerResponse += chunk;
      if (onChunk) onChunk(AgentRole.PROPOSER, chunk);
      yield { role: AgentRole.PROPOSER, chunk };
    }
    yield { role: AgentRole.PROPOSER, chunk: '', isComplete: true, fullResponse: proposerResponse };

    // Challenger responds
    const challengerContext: Message[] = [{
      role: 'user',
      content: `正方提出的方案：\n\n${proposerResponse}\n\n请仔细分析并指出问题。`
    }];

    let challengerResponse = '';
    for await (const chunk of challenger.thinkStream(undefined, challengerContext)) {
      challengerResponse += chunk;
      if (onChunk) onChunk(AgentRole.CHALLENGER, chunk);
      yield { role: AgentRole.CHALLENGER, chunk };
    }
    yield { role: AgentRole.CHALLENGER, chunk: '', isComplete: true, fullResponse: challengerResponse };

    // Judge analyzes (only on final round)
    if (round === this.config.debateRounds) {
      const judgeContext: Message[] = [
        {
          role: 'user',
          content: `正方方案：\n\n${proposerResponse}\n\n反方质疑：\n\n${challengerResponse}\n\n请给出综合分析和最终的 3 个推荐方案。`
        }
      ];

      let judgeResponse = '';
      for await (const chunk of judge.thinkStream(undefined, judgeContext)) {
        judgeResponse += chunk;
        if (onChunk) onChunk(AgentRole.JUDGE, chunk);
        yield { role: AgentRole.JUDGE, chunk };
      }
      yield { role: AgentRole.JUDGE, chunk: '', isComplete: true, fullResponse: judgeResponse };
    }
  }
}

/**
 * Create default three-agent configuration
 */
export function createDefaultConfig(
  providers: {
    proposer: ModelProvider;
    challenger: ModelProvider;
    judge: ModelProvider;
  } = {
    proposer: ModelProvider.ANTHROPIC,
    challenger: ModelProvider.OPENAI,
    judge: ModelProvider.GOOGLE
  }
): ThreeAgentConfig {
  return {
    enableDebateMode: true,
    debateRounds: 3,
    rotationStrategy: 'sequential',
    agents: {
      [AgentRole.PROPOSER]: {
        role: AgentRole.PROPOSER,
        modelProvider: providers.proposer,
        modelName: getDefaultModelName(providers.proposer),
        systemPrompt: AGENT_PROMPTS[AgentRole.PROPOSER]
      },
      [AgentRole.CHALLENGER]: {
        role: AgentRole.CHALLENGER,
        modelProvider: providers.challenger,
        modelName: getDefaultModelName(providers.challenger),
        systemPrompt: AGENT_PROMPTS[AgentRole.CHALLENGER]
      },
      [AgentRole.JUDGE]: {
        role: AgentRole.JUDGE,
        modelProvider: providers.judge,
        modelName: getDefaultModelName(providers.judge),
        systemPrompt: AGENT_PROMPTS[AgentRole.JUDGE]
      }
    }
  };
}

function getDefaultModelName(provider: ModelProvider): string {
  switch (provider) {
    case ModelProvider.ANTHROPIC:
      return 'claude-sonnet-4-5-20250929';
    case ModelProvider.OPENAI:
      return 'gpt-4-turbo';
    case ModelProvider.GOOGLE:
      return 'gemini-2.0-flash-exp';
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
