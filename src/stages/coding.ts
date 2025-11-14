/**
 * Coding Collaboration Stage - Pair Programming Mode
 */

import { ThreeAgentCoordinator } from '../agents/coordinator.js';
import { Agent } from '../agents/base.js';
import {
  AgentRole,
  CodingSession,
  CodingIteration,
  InspectionResult,
  Proposal
} from '../types/index.js';
import { CODING_PROMPTS } from '../agents/prompts.js';

export class CodingStage {
  private coordinator: ThreeAgentCoordinator;
  private session: CodingSession | null = null;

  constructor(coordinator: ThreeAgentCoordinator) {
    this.coordinator = coordinator;
  }

  /**
   * Start a new coding session
   */
  async startSession(
    proposal: Proposal,
    maxIterations: number = 3,
    onIterationComplete?: (iteration: CodingIteration) => void
  ): Promise<CodingSession> {
    this.session = {
      stage: 'coding' as any,
      currentWriter: AgentRole.PROPOSER,
      currentReviewer: AgentRole.CHALLENGER,
      currentInspector: AgentRole.JUDGE,
      iterations: []
    };

    let approved = false;
    let iterationCount = 0;

    while (!approved && iterationCount < maxIterations) {
      iterationCount++;

      const iteration = await this.executeIteration(
        proposal,
        iterationCount,
        this.session.currentWriter,
        this.session.currentReviewer,
        this.session.currentInspector
      );

      this.session.iterations.push(iteration);

      if (onIterationComplete) {
        onIterationComplete(iteration);
      }

      approved = iteration.inspectionResult.approved;

      if (!approved && iterationCount < maxIterations) {
        // Rotate roles for next iteration
        this.rotateRoles();
      }
    }

    return this.session;
  }

  /**
   * Execute one coding iteration (write -> review -> inspect)
   */
  private async executeIteration(
    proposal: Proposal,
    iteration: number,
    writerRole: AgentRole,
    reviewerRole: AgentRole,
    inspectorRole: AgentRole
  ): Promise<CodingIteration> {
    const writer = this.coordinator.getAgent(writerRole);
    const reviewer = this.coordinator.getAgent(reviewerRole);
    const inspector = this.coordinator.getAgent(inspectorRole);

    // Step 1: Writer writes code
    const writerPrompt = this.buildWriterPrompt(proposal, iteration);
    await this.updateAgentSystemPrompt(writer, CODING_PROMPTS.writer);
    const code = await writer.think(writerPrompt);

    // Step 2: Reviewer reviews code
    const reviewerPrompt = this.buildReviewerPrompt(code);
    await this.updateAgentSystemPrompt(reviewer, CODING_PROMPTS.reviewer);
    const reviewResponse = await reviewer.think(reviewerPrompt);
    const reviewComments = this.parseReviewComments(reviewResponse);

    // Step 3: Inspector inspects and decides
    const inspectorPrompt = this.buildInspectorPrompt(code, reviewComments);
    await this.updateAgentSystemPrompt(inspector, CODING_PROMPTS.inspector);
    const inspectionResponse = await inspector.think(inspectorPrompt);
    const inspectionResult = this.parseInspectionResult(inspectionResponse);

    return {
      iteration,
      writerAgent: writerRole,
      reviewerAgent: reviewerRole,
      inspectorAgent: inspectorRole,
      code,
      reviewComments,
      inspectionResult
    };
  }

  /**
   * Build prompt for writer agent
   */
  private buildWriterPrompt(proposal: Proposal, iteration: number): string {
    let prompt = `请根据以下方案编写代码：

**方案标题**：${proposal.title}

**方案描述**：
${proposal.description}

**技术方案**：
${proposal.technicalApproach}

`;

    if (iteration > 1 && this.session && this.session.iterations.length > 0) {
      const lastIteration = this.session.iterations[this.session.iterations.length - 1];
      prompt += `\n**上一轮的问题**：\n`;
      for (const issue of lastIteration.inspectionResult.issues) {
        prompt += `- [${issue.severity}] ${issue.message}\n`;
      }
      prompt += `\n请改进代码，解决这些问题。\n`;
    }

    prompt += `\n请编写完整、可运行的代码，包含必要的注释和错误处理。`;

    return prompt;
  }

  /**
   * Build prompt for reviewer agent
   */
  private buildReviewerPrompt(code: string): string {
    return `请审查以下代码：

\`\`\`
${code}
\`\`\`

请从以下角度提供审查意见：
1. 代码逻辑正确性
2. 性能优化机会
3. 安全隐患
4. 可读性和可维护性
5. 错误处理

请列出具体的问题和建议。`;
  }

  /**
   * Build prompt for inspector agent
   */
  private buildInspectorPrompt(code: string, reviewComments: string[]): string {
    return `请对以下代码进行最终检查：

\`\`\`
${code}
\`\`\`

**审查者的评论**：
${reviewComments.map((c, i) => `${i + 1}. ${c}`).join('\n')}

请决定：
1. 是否通过（APPROVED 或 REJECTED）
2. 列出所有问题（按严重程度：CRITICAL, WARNING, INFO）
3. 提供改进建议

请按以下格式回复：
DECISION: [APPROVED/REJECTED]
ISSUES:
- [CRITICAL/WARNING/INFO] 问题描述
SUGGESTIONS:
- 建议内容`;
  }

  /**
   * Parse review comments from reviewer's response
   */
  private parseReviewComments(reviewResponse: string): string[] {
    const comments: string[] = [];
    const lines = reviewResponse.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[\d\-\*]+\.?\s+/)) {
        comments.push(trimmed.replace(/^[\d\-\*]+\.?\s+/, ''));
      }
    }

    return comments.length > 0 ? comments : [reviewResponse];
  }

  /**
   * Parse inspection result from inspector's response
   */
  private parseInspectionResult(inspectionResponse: string): InspectionResult {
    const lines = inspectionResponse.split('\n');
    let approved = false;
    const issues: any[] = [];
    const suggestions: string[] = [];

    let currentSection: 'decision' | 'issues' | 'suggestions' | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.includes('DECISION:')) {
        currentSection = 'decision';
        approved = trimmed.includes('APPROVED');
      } else if (trimmed.includes('ISSUES:')) {
        currentSection = 'issues';
      } else if (trimmed.includes('SUGGESTIONS:')) {
        currentSection = 'suggestions';
      } else if (currentSection === 'issues' && trimmed.startsWith('-')) {
        const issueMatch = trimmed.match(/\[(CRITICAL|WARNING|INFO)\]\s*(.+)/);
        if (issueMatch) {
          issues.push({
            severity: issueMatch[1].toLowerCase(),
            message: issueMatch[2]
          });
        }
      } else if (currentSection === 'suggestions' && trimmed.startsWith('-')) {
        suggestions.push(trimmed.substring(1).trim());
      }
    }

    // If parsing failed, use heuristics
    if (issues.length === 0 && !approved) {
      if (inspectionResponse.toLowerCase().includes('通过') ||
          inspectionResponse.toLowerCase().includes('approved')) {
        approved = true;
      }
    }

    return {
      approved,
      issues,
      suggestions
    };
  }

  /**
   * Rotate roles for next iteration
   * Writer -> Inspector, Reviewer -> Writer, Inspector -> Reviewer
   */
  private rotateRoles(): void {
    if (!this.session) return;

    // Rotate: Writer -> Inspector, Reviewer -> Writer, Inspector -> Reviewer
    const rotationMap = {
      [AgentRole.PROPOSER]: AgentRole.JUDGE,
      [AgentRole.CHALLENGER]: AgentRole.PROPOSER,
      [AgentRole.JUDGE]: AgentRole.CHALLENGER
    };

    // Rotate the role assignments
    const newWriter = rotationMap[this.session.currentWriter];
    const newReviewer = rotationMap[this.session.currentReviewer];
    const newInspector = rotationMap[this.session.currentInspector];

    this.session.currentWriter = newWriter;
    this.session.currentReviewer = newReviewer;
    this.session.currentInspector = newInspector;

    // Also rotate the coordinator's agents to maintain consistency
    this.coordinator.rotateRoles();
  }

  /**
   * Update agent's system prompt dynamically
   */
  private async updateAgentSystemPrompt(agent: Agent, newPrompt: string): Promise<void> {
    agent.updateSystemPrompt(newPrompt);
  }

  /**
   * Get current session
   */
  getSession(): CodingSession | null {
    return this.session;
  }

  /**
   * Get final code from the session
   */
  getFinalCode(): string | null {
    if (!this.session || this.session.iterations.length === 0) {
      return null;
    }

    const lastIteration = this.session.iterations[this.session.iterations.length - 1];
    return lastIteration.code;
  }

  /**
   * Generate three implementation options when uncertain
   * Each agent proposes a different approach
   */
  async generateThreeOptions(
    task: string,
    context?: string
  ): Promise<{ option1: string; option2: string; option3: string }> {
    const proposer = this.coordinator.getAgent(AgentRole.PROPOSER);
    const challenger = this.coordinator.getAgent(AgentRole.CHALLENGER);
    const judge = this.coordinator.getAgent(AgentRole.JUDGE);

    const basePrompt = `任务：${task}\n\n${context ? `上下文：${context}\n\n` : ''}请提供一个具体的实现方案（代码或设计）。`;

    // Get three different options from three agents
    const [option1, option2, option3] = await Promise.all([
      proposer.think(basePrompt),
      challenger.think(basePrompt),
      judge.think(basePrompt)
    ]);

    return { option1, option2, option3 };
  }
}
