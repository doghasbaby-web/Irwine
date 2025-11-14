/**
 * Requirement Clarification Stage - Debate Mode
 */

import { ThreeAgentCoordinator } from '../agents/coordinator.js';
import { ClarificationResult, DebateRound, Proposal } from '../types/index.js';
import { nanoid } from 'nanoid';

export class ClarificationStage {
  private coordinator: ThreeAgentCoordinator;
  private rounds: DebateRound[] = [];

  constructor(coordinator: ThreeAgentCoordinator) {
    this.coordinator = coordinator;
  }

  /**
   * Execute the full clarification process with multiple debate rounds
   */
  async execute(
    userRequirement: string,
    numRounds: number = 3,
    onRoundComplete?: (round: DebateRound) => void
  ): Promise<ClarificationResult> {
    this.rounds = [];

    for (let i = 1; i <= numRounds; i++) {
      const roundResult = await this.coordinator.executeDebateRound(
        userRequirement,
        i
      );

      const debateRound: DebateRound = {
        round: i,
        proposerMessage: {
          role: 'assistant',
          content: roundResult.proposerResponse,
          metadata: {
            agentRole: this.coordinator.getAgent('proposer' as any).role,
            timestamp: Date.now()
          }
        },
        challengerMessage: {
          role: 'assistant',
          content: roundResult.challengerResponse,
          metadata: {
            agentRole: this.coordinator.getAgent('challenger' as any).role,
            timestamp: Date.now()
          }
        },
        judgeAnalysis: roundResult.judgeResponse ? {
          role: 'assistant',
          content: roundResult.judgeResponse,
          metadata: {
            agentRole: this.coordinator.getAgent('judge' as any).role,
            timestamp: Date.now()
          }
        } : undefined
      };

      this.rounds.push(debateRound);

      if (onRoundComplete) {
        onRoundComplete(debateRound);
      }
    }

    // Extract proposals from the final judge's analysis
    const proposals = await this.extractProposals(
      this.rounds[this.rounds.length - 1].judgeAnalysis?.content || ''
    );

    return {
      rounds: this.rounds,
      proposals
    };
  }

  /**
   * Execute with streaming output for real-time display
   */
  async *executeWithStream(
    userRequirement: string,
    numRounds: number = 3
  ): AsyncGenerator<{
    type: 'round_start' | 'agent_start' | 'chunk' | 'agent_complete' | 'round_complete' | 'complete';
    round?: number;
    role?: import('../types/index.js').AgentRole;
    chunk?: string;
    fullResponse?: string;
    debateRound?: DebateRound;
    result?: ClarificationResult;
  }> {
    this.rounds = [];

    for (let i = 1; i <= numRounds; i++) {
      yield { type: 'round_start', round: i };

      let proposerResponse = '';
      let challengerResponse = '';
      let judgeResponse = '';

      for await (const streamEvent of this.coordinator.executeDebateRoundStream(userRequirement, i)) {
        if (streamEvent.isComplete) {
          yield {
            type: 'agent_complete',
            role: streamEvent.role,
            fullResponse: streamEvent.fullResponse
          };

          if (streamEvent.role === 'proposer' as any) {
            proposerResponse = streamEvent.fullResponse || '';
          } else if (streamEvent.role === 'challenger' as any) {
            challengerResponse = streamEvent.fullResponse || '';
          } else if (streamEvent.role === 'judge' as any) {
            judgeResponse = streamEvent.fullResponse || '';
          }
        } else {
          if (!streamEvent.chunk) continue;

          // First chunk for this agent
          if (streamEvent.chunk && streamEvent.chunk.length > 0) {
            yield { type: 'chunk', role: streamEvent.role, chunk: streamEvent.chunk };
          }
        }
      }

      // Create debate round after all agents have spoken
      const debateRound: DebateRound = {
        round: i,
        proposerMessage: {
          role: 'assistant',
          content: proposerResponse,
          metadata: {
            agentRole: this.coordinator.getAgent('proposer' as any).role,
            timestamp: Date.now()
          }
        },
        challengerMessage: {
          role: 'assistant',
          content: challengerResponse,
          metadata: {
            agentRole: this.coordinator.getAgent('challenger' as any).role,
            timestamp: Date.now()
          }
        },
        judgeAnalysis: judgeResponse ? {
          role: 'assistant',
          content: judgeResponse,
          metadata: {
            agentRole: this.coordinator.getAgent('judge' as any).role,
            timestamp: Date.now()
          }
        } : undefined
      };

      this.rounds.push(debateRound);
      yield { type: 'round_complete', round: i, debateRound };
    }

    // Extract proposals from the final judge's analysis
    const proposals = await this.extractProposals(
      this.rounds[this.rounds.length - 1].judgeAnalysis?.content || ''
    );

    yield {
      type: 'complete',
      result: {
        rounds: this.rounds,
        proposals
      }
    };
  }

  /**
   * Extract structured proposals from judge's analysis
   */
  private async extractProposals(judgeAnalysis: string): Promise<Proposal[]> {
    // For now, create a simple parser
    // In a production system, you might want to use the judge agent to structure this
    const proposals: Proposal[] = [];

    // Parse the judge's response to extract proposals
    // This is a simplified implementation
    const lines = judgeAnalysis.split('\n');
    let currentProposal: Partial<Proposal> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect proposal headers (e.g., "方案一：", "方案1:", etc.)
      if (line.match(/^[方案|选项|推荐][一二三1-3][:：]/)) {
        if (currentProposal && currentProposal.title) {
          proposals.push(this.finalizeProposal(currentProposal));
        }
        currentProposal = {
          id: nanoid(),
          title: line,
          description: '',
          pros: [],
          cons: [],
          technicalApproach: '',
          estimatedComplexity: 'medium'
        };
      } else if (currentProposal) {
        // Accumulate description
        if (line && !line.match(/^[优点|缺点|技术方案][:：]/)) {
          currentProposal.description += line + '\n';
        }
      }
    }

    if (currentProposal && currentProposal.title) {
      proposals.push(this.finalizeProposal(currentProposal));
    }

    // If parsing failed to find structured proposals, create generic ones
    if (proposals.length === 0) {
      for (let i = 0; i < 3; i++) {
        proposals.push({
          id: nanoid(),
          title: `方案 ${i + 1}`,
          description: '从辩论中提取的方案',
          pros: ['经过充分讨论'],
          cons: ['需要进一步细化'],
          technicalApproach: judgeAnalysis.substring(0, 200),
          estimatedComplexity: 'medium'
        });
      }
    }

    return proposals.slice(0, 3); // Return top 3 proposals
  }

  /**
   * Finalize a proposal object
   */
  private finalizeProposal(partial: Partial<Proposal>): Proposal {
    return {
      id: partial.id || nanoid(),
      title: partial.title || 'Unnamed Proposal',
      description: (partial.description || '').trim(),
      pros: partial.pros || [],
      cons: partial.cons || [],
      technicalApproach: partial.technicalApproach || '',
      estimatedComplexity: partial.estimatedComplexity || 'medium'
    };
  }

  /**
   * Get debate history
   */
  getDebateHistory(): DebateRound[] {
    return [...this.rounds];
  }
}
