/**
 * Main application logic
 */

import { ThreeAgentCoordinator, createDefaultConfig } from './agents/coordinator.js';
import { ClarificationStage } from './stages/clarification.js';
import { CodingStage } from './stages/coding.js';
import { loadConfig, validateConfig } from './config.js';
import { ModelProvider, ClarificationResult, Proposal } from './types/index.js';
import {
  displayBanner,
  displaySection,
  displayDebateRound,
  displayProposals,
  displayCodingIteration,
  displayFinalResult,
  displayError,
  displayInfo,
  displaySpinner
} from './ui/display.js';
import {
  askRequirement,
  askProposalSelection,
  askConfirmation
} from './ui/prompts.js';

export class DaoCodeApp {
  private coordinator: ThreeAgentCoordinator | null = null;
  private clarificationStage: ClarificationStage | null = null;
  private codingStage: CodingStage | null = null;

  /**
   * Initialize the application
   */
  async initialize(customProviders?: {
    proposer: ModelProvider;
    challenger: ModelProvider;
    judge: ModelProvider;
  }): Promise<void> {
    const config = loadConfig();
    const validation = validateConfig(config);

    if (!validation.valid) {
      displayError('配置错误:\n' + validation.errors.join('\n'));
      throw new Error('Configuration validation failed');
    }

    // Determine which providers to use
    let providers = customProviders;
    if (!providers) {
      // Use default or available providers
      providers = this.determineAvailableProviders(config);
    }

    const threeAgentConfig = createDefaultConfig(providers);

    this.coordinator = new ThreeAgentCoordinator(threeAgentConfig, config.apiKeys);
    this.clarificationStage = new ClarificationStage(this.coordinator);
    this.codingStage = new CodingStage(this.coordinator);

    displayInfo('三 Agent 系统初始化完成');
    displayInfo(`正方: ${providers.proposer}, 反方: ${providers.challenger}, 裁判: ${providers.judge}`);
  }

  /**
   * Determine available providers based on API keys
   */
  private determineAvailableProviders(config: any): {
    proposer: ModelProvider;
    challenger: ModelProvider;
    judge: ModelProvider;
  } {
    const availableProviders: ModelProvider[] = [];

    if (config.apiKeys.anthropic) availableProviders.push(ModelProvider.ANTHROPIC);
    if (config.apiKeys.openai) availableProviders.push(ModelProvider.OPENAI);
    if (config.apiKeys.google) availableProviders.push(ModelProvider.GOOGLE);

    // Assign providers, reusing if necessary
    return {
      proposer: availableProviders[0] || ModelProvider.ANTHROPIC,
      challenger: availableProviders[1] || availableProviders[0] || ModelProvider.ANTHROPIC,
      judge: availableProviders[2] || availableProviders[0] || ModelProvider.ANTHROPIC
    };
  }

  /**
   * Run clarification stage
   */
  async runClarification(requirement: string): Promise<ClarificationResult> {
    if (!this.clarificationStage) {
      throw new Error('Application not initialized');
    }

    displaySection('需求澄清阶段 - AI 辩论赛');

    const config = loadConfig();
    const result = await this.clarificationStage.execute(
      requirement,
      config.debateRounds,
      (round) => {
        displayDebateRound(round);
      }
    );

    displayProposals(result.proposals);

    return result;
  }

  /**
   * Run coding stage
   */
  async runCoding(proposal: Proposal): Promise<string> {
    if (!this.codingStage) {
      throw new Error('Application not initialized');
    }

    displaySection('编码协同阶段 - 结对编程');

    await this.codingStage.startSession(
      proposal,
      3,
      (iteration) => {
        displayCodingIteration(iteration);
      }
    );

    const finalCode = this.codingStage.getFinalCode();

    if (!finalCode) {
      throw new Error('No code was generated');
    }

    displayFinalResult(finalCode);

    return finalCode;
  }

  /**
   * Run interactive mode (full workflow)
   */
  async runInteractive(): Promise<void> {
    displayBanner();

    // Step 1: Get requirement
    const requirement = await askRequirement();

    // Step 2: Clarification
    displaySpinner('启动三 Agent 辩论...');
    const clarificationResult = await this.runClarification(requirement);

    // Step 3: Select proposal
    const selectedProposal = await askProposalSelection(clarificationResult.proposals);
    displayInfo(`已选择方案: ${selectedProposal.title}`);

    // Step 4: Confirm coding
    const shouldCode = await askConfirmation('是否开始编码？');

    if (shouldCode) {
      displaySpinner('启动三 Agent 编码协同...');
      await this.runCoding(selectedProposal);
    } else {
      displayInfo('已取消编码阶段');
    }
  }

  /**
   * Run clarification only mode
   */
  async runClarificationOnly(): Promise<void> {
    displayBanner();

    const requirement = await askRequirement();
    displaySpinner('启动三 Agent 辩论...');

    await this.runClarification(requirement);
  }

  /**
   * Run coding only mode (with manual proposal input)
   */
  async runCodingOnly(): Promise<void> {
    displayBanner();

    displayInfo('编码模式需要先有一个方案。请先运行需求澄清阶段。');
    // For now, this would require persisting proposals or manual input
  }
}

export * from './types/index.js';
export * from './agents/coordinator.js';
export * from './stages/clarification.js';
export * from './stages/coding.js';
