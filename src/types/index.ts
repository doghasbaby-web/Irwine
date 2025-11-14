/**
 * Core types for the Three-Agent System
 */

export enum AgentRole {
  PROPOSER = 'proposer',    // 正方：提出方案
  CHALLENGER = 'challenger', // 反方：挑战质疑
  JUDGE = 'judge'            // 裁判：综合评判
}

export enum WorkStage {
  CLARIFICATION = 'clarification', // 需求澄清阶段
  CODING = 'coding',               // 编码协同阶段
  REVIEW = 'review'                // 代码审查阶段
}

export enum ModelProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GOOGLE = 'google'
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    agentRole?: AgentRole;
    modelProvider?: ModelProvider;
    timestamp?: number;
  };
}

export interface AgentConfig {
  role: AgentRole;
  modelProvider: ModelProvider;
  modelName: string;
  systemPrompt: string;
}

export interface DebateRound {
  round: number;
  proposerMessage: Message;
  challengerMessage: Message;
  judgeAnalysis?: Message;
}

export interface ClarificationResult {
  rounds: DebateRound[];
  proposals: Proposal[];
  selectedProposal?: Proposal;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  technicalApproach: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export interface CodingSession {
  stage: WorkStage;
  currentWriter: AgentRole;
  currentReviewer: AgentRole;
  currentInspector: AgentRole;
  iterations: CodingIteration[];
}

export interface CodingIteration {
  iteration: number;
  writerAgent: AgentRole;
  reviewerAgent: AgentRole;
  inspectorAgent: AgentRole;
  code: string;
  reviewComments: string[];
  inspectionResult: InspectionResult;
}

export interface InspectionResult {
  approved: boolean;
  issues: Issue[];
  suggestions: string[];
}

export interface Issue {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  location?: string;
}

export interface AIModelClient {
  provider: ModelProvider;
  generateResponse(messages: Message[], config?: any): Promise<string>;
  streamResponse?(messages: Message[], config?: any): AsyncGenerator<string>;
}

export interface ThreeAgentConfig {
  enableDebateMode: boolean;
  debateRounds: number;
  rotationStrategy: 'sequential' | 'random' | 'performance-based';
  agents: {
    [AgentRole.PROPOSER]: AgentConfig;
    [AgentRole.CHALLENGER]: AgentConfig;
    [AgentRole.JUDGE]: AgentConfig;
  };
}
