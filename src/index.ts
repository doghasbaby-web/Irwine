/**
 * Main application logic
 */

import { ThreeAgentCoordinator, createDefaultConfig } from './agents/coordinator.js';
import { ClarificationStage } from './stages/clarification.js';
import { CodingStage } from './stages/coding.js';
import { SandboxStage } from './stages/sandbox.js';
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
  askConfirmation,
  askManualProposal,
  askSessionAction,
  askSelectSession,
  askSandboxAction,
  askSandboxImage,
  askCodeToExecute,
  askCommandToExecute,
  askMountCurrentDirectory
} from './ui/prompts.js';
import {
  saveClarificationResult,
  saveProposal,
  listProposals,
  listClarifications,
  loadSession
} from './utils/session.js';

export class DaoCodeApp {
  private coordinator: ThreeAgentCoordinator | null = null;
  private clarificationStage: ClarificationStage | null = null;
  private codingStage: CodingStage | null = null;
  private sandboxStage: SandboxStage | null = null;

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

    // Save clarification result
    const sessionName = await saveClarificationResult(requirement, clarificationResult);
    displayInfo(`辩论结果已保存: ${sessionName}`);

    // Step 3: Select proposal
    const selectedProposal = await askProposalSelection(clarificationResult.proposals);
    displayInfo(`已选择方案: ${selectedProposal.title}`);

    // Save selected proposal
    await saveProposal(selectedProposal);

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
   * Run coding only mode (with manual proposal input or loaded session)
   */
  async runCodingOnly(): Promise<void> {
    displayBanner();

    let proposal: Proposal;

    // Check if there are saved proposals
    const savedProposals = await listProposals();
    const savedClarifications = await listClarifications();
    const hasSavedSessions = savedProposals.length > 0 || savedClarifications.length > 0;

    if (hasSavedSessions) {
      const action = await askSessionAction();

      if (action === 'load') {
        // Load from saved session
        const allSessions = [...savedClarifications, ...savedProposals];
        const sessionName = await askSelectSession(allSessions);
        const sessionData = await loadSession(sessionName);

        if (sessionData.type === 'clarification') {
          // Let user choose from the proposals in the clarification result
          proposal = await askProposalSelection(sessionData.result.proposals);
          displayInfo(`已加载方案: ${proposal.title}`);
        } else if (sessionData.type === 'proposal') {
          proposal = sessionData.proposal;
          displayInfo(`已加载方案: ${proposal.title}`);
        } else {
          displayError('未知的会话类型');
          return;
        }
      } else {
        // Create new manual proposal
        displayInfo('请手动输入方案信息：');
        proposal = await askManualProposal();

        // Save the proposal
        const sessionName = await saveProposal(proposal);
        displayInfo(`方案已保存: ${sessionName}`);
      }
    } else {
      // No saved sessions, must create new
      displayInfo('没有已保存的会话。请手动输入方案信息：');
      proposal = await askManualProposal();

      // Save the proposal
      const sessionName = await saveProposal(proposal);
      displayInfo(`方案已保存: ${sessionName}`);
    }

    // Run coding stage
    displaySpinner('启动三 Agent 编码协同...');
    await this.runCoding(proposal);
  }

  /**
   * Run sandbox mode
   */
  async runSandbox(): Promise<void> {
    displayBanner();

    // Initialize sandbox stage
    if (!this.sandboxStage) {
      this.sandboxStage = new SandboxStage();
    }

    // Check Docker availability
    const dockerAvailable = await this.sandboxStage.initialize();
    if (!dockerAvailable) {
      return;
    }

    let exit = false;

    while (!exit) {
      const action = await askSandboxAction();

      switch (action) {
        case 'create': {
          const images = this.sandboxStage.getAvailableImages();
          const selectedImage = await askSandboxImage(images);

          const mountCurrent = await askMountCurrentDirectory();
          const volumes = mountCurrent
            ? [{ host: process.cwd(), container: '/workspace' }]
            : [];

          const session = await this.sandboxStage.createSession(
            selectedImage,
            '/workspace',
            volumes
          );

          if (session) {
            displayInfo('沙箱环境已创建并启动');
          }
          break;
        }

        case 'execute': {
          const currentSession = this.sandboxStage.getCurrentSession();
          if (!currentSession) {
            displayError(new Error('没有活动的沙箱会话。请先创建沙箱。'));
            break;
          }

          const { code, language } = await askCodeToExecute();
          await this.sandboxStage.executeCode(code, language);
          break;
        }

        case 'command': {
          const currentSession = this.sandboxStage.getCurrentSession();
          if (!currentSession) {
            displayError(new Error('没有活动的沙箱会话。请先创建沙箱。'));
            break;
          }

          const command = await askCommandToExecute();
          await this.sandboxStage.executeCommand(command);
          break;
        }

        case 'list': {
          await this.sandboxStage.listSandboxes();
          break;
        }

        case 'stop': {
          await this.sandboxStage.stopSession();
          break;
        }

        case 'remove': {
          await this.sandboxStage.removeSession();
          break;
        }

        case 'cleanup': {
          const confirm = await askConfirmation('确定要清理所有沙箱容器吗？');
          if (confirm) {
            await this.sandboxStage.cleanupAll();
          }
          break;
        }

        case 'exit': {
          // Ask if user wants to stop current session before exiting
          const currentSession = this.sandboxStage.getCurrentSession();
          if (currentSession) {
            const stopBeforeExit = await askConfirmation('是否停止当前沙箱会话？');
            if (stopBeforeExit) {
              await this.sandboxStage.stopSession();
            }
          }
          exit = true;
          displayInfo('再见！');
          break;
        }
      }

      if (!exit && action !== 'exit') {
        const continueUsing = await askConfirmation('是否继续使用沙箱？');
        if (!continueUsing) {
          // Ask if user wants to stop current session before exiting
          const currentSession = this.sandboxStage.getCurrentSession();
          if (currentSession) {
            const stopBeforeExit = await askConfirmation('是否停止当前沙箱会话？');
            if (stopBeforeExit) {
              await this.sandboxStage.stopSession();
            }
          }
          exit = true;
          displayInfo('再见！');
        }
      }
    }
  }
}

export * from './types/index.js';
export * from './agents/coordinator.js';
export * from './stages/clarification.js';
export * from './stages/coding.js';
export * from './stages/sandbox.js';
