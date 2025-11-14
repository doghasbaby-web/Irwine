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

/**
 * OpenAI Codex-specific types and interfaces
 */

// Code Completion with suffix/prefix support
export interface CodeCompletionRequest {
  prompt: string;           // Code before cursor (prefix)
  suffix?: string;          // Code after cursor
  language?: string;        // Programming language hint
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface CodeCompletionResponse {
  completion: string;
  finishReason: 'stop' | 'length' | 'content_filter';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Code Explanation
export interface CodeExplanationRequest {
  code: string;
  language?: string;
  detailLevel?: 'brief' | 'detailed' | 'expert';
  focusAreas?: string[];    // Specific aspects to explain (e.g., 'performance', 'security')
}

export interface CodeExplanationResponse {
  explanation: string;
  keyPoints: string[];
  complexity: string;
  suggestions?: string[];
}

// Code Embeddings for semantic search
export interface CodeEmbeddingRequest {
  code: string;
  language?: string;
  normalize?: boolean;      // Normalize embeddings to unit length
}

export interface CodeEmbeddingResponse {
  embedding: number[];
  dimensions: number;
  model: string;
}

// Code Review and Bug Detection
export interface CodeReviewRequest {
  code: string;
  language?: string;
  reviewType?: 'security' | 'performance' | 'style' | 'comprehensive';
  severity?: 'all' | 'critical' | 'high' | 'medium';
}

export interface CodeReviewResponse {
  overallAssessment: string;
  issues: CodeIssue[];
  suggestions: string[];
  score?: number;           // Quality score 0-100
}

export interface CodeIssue {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'security' | 'performance' | 'style' | 'logic' | 'maintainability';
  message: string;
  line?: number;
  column?: number;
  snippet?: string;
  fix?: string;             // Suggested fix
}

// Code Editing with Insert
export interface CodeInsertRequest {
  prefix: string;           // Code before insertion point
  suffix: string;           // Code after insertion point
  instruction?: string;     // What to insert/generate
  language?: string;
  maxTokens?: number;
}

export interface CodeInsertResponse {
  insertedCode: string;
  fullCode: string;         // prefix + inserted + suffix
  explanation?: string;
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
