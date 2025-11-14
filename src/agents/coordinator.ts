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

  constructor(config: ThreeAgentConfig, apiKeys: any) {
    this.config = config;
    this.apiKeys = apiKeys;
    this.initializeAgents();
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
    if (this.config.rotationStrategy !== 'sequential') {
      // For now, only implement sequential rotation
      console.warn('Only sequential rotation is currently supported');
    }

    // Get current configurations
    const currentConfigs = new Map<AgentRole, AgentConfig>();
    for (const [role, agent] of this.agents.entries()) {
      currentConfigs.set(role, agent.config);
    }

    // Rotate: Proposer -> Challenger -> Judge -> Proposer
    const rotationMap = {
      [AgentRole.PROPOSER]: AgentRole.CHALLENGER,
      [AgentRole.CHALLENGER]: AgentRole.JUDGE,
      [AgentRole.JUDGE]: AgentRole.PROPOSER
    };

    // Create new agent assignments
    const newAgents = new Map<AgentRole, Agent>();

    for (const [currentRole, agent] of this.agents.entries()) {
      const newRole = rotationMap[currentRole];
      const newConfig = { ...agent.config, role: newRole };

      // Update system prompt for new role
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
