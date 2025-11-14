/**
 * Interactive prompts
 */

import inquirer from 'inquirer';
import { Proposal, ModelProvider } from '../types/index.js';

/**
 * Ask for user requirement
 */
export async function askRequirement(): Promise<string> {
  const { requirement } = await inquirer.prompt([
    {
      type: 'input',
      name: 'requirement',
      message: '请描述你的需求:',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return '需求不能为空';
        }
        return true;
      }
    }
  ]);

  return requirement;
}

/**
 * Ask user to select a proposal
 */
export async function askProposalSelection(proposals: Proposal[]): Promise<Proposal> {
  const choices = proposals.map((p, index) => ({
    name: `${index + 1}. ${p.title} (复杂度: ${p.estimatedComplexity})`,
    value: p
  }));

  const { selectedProposal } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedProposal',
      message: '请选择一个方案:',
      choices
    }
  ]);

  return selectedProposal;
}

/**
 * Ask for confirmation
 */
export async function askConfirmation(message: string): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: true
    }
  ]);

  return confirmed;
}

/**
 * Ask for model provider selection
 */
export async function askModelProviders(): Promise<{
  proposer: ModelProvider;
  challenger: ModelProvider;
  judge: ModelProvider;
}> {
  const providers = [
    { name: 'Claude (Anthropic)', value: ModelProvider.ANTHROPIC },
    { name: 'ChatGPT (OpenAI)', value: ModelProvider.OPENAI },
    { name: 'Gemini (Google)', value: ModelProvider.GOOGLE }
  ];

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'proposer',
      message: '选择正方 Agent 的模型:',
      choices: providers,
      default: ModelProvider.ANTHROPIC
    },
    {
      type: 'list',
      name: 'challenger',
      message: '选择反方 Agent 的模型:',
      choices: providers,
      default: ModelProvider.OPENAI
    },
    {
      type: 'list',
      name: 'judge',
      message: '选择裁判 Agent 的模型:',
      choices: providers,
      default: ModelProvider.GOOGLE
    }
  ]);

  return answers;
}

/**
 * Ask for main menu action
 */
export async function askMainAction(): Promise<'clarify' | 'code' | 'interactive' | 'exit'> {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '请选择操作:',
      choices: [
        { name: '需求澄清（辩论模式）', value: 'clarify' },
        { name: '编码协同（结对编程）', value: 'code' },
        { name: '完整流程（需求 → 编码）', value: 'interactive' },
        { name: '退出', value: 'exit' }
      ]
    }
  ]);

  return action;
}

/**
 * Ask user to select from three implementation options
 */
export async function askOptionSelection(options: {
  option1: string;
  option2: string;
  option3: string;
}): Promise<1 | 2 | 3> {
  const { selectedOption } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedOption',
      message: '请选择一个实现方案:',
      choices: [
        { name: '选项 1 - 正方提案', value: 1 },
        { name: '选项 2 - 反方提案', value: 2 },
        { name: '选项 3 - 裁判提案', value: 3 }
      ]
    }
  ]);

  return selectedOption;
}

/**
 * Ask user to manually input a proposal for coding-only mode
 */
export async function askManualProposal(): Promise<Proposal> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: '方案标题:',
      validate: (input: string) => input.trim().length > 0 || '标题不能为空'
    },
    {
      type: 'editor',
      name: 'description',
      message: '方案详细描述（将打开编辑器）:',
      validate: (input: string) => input.trim().length > 0 || '描述不能为空'
    },
    {
      type: 'editor',
      name: 'technicalApproach',
      message: '技术实现方法（将打开编辑器）:',
      validate: (input: string) => input.trim().length > 0 || '技术方法不能为空'
    },
    {
      type: 'list',
      name: 'estimatedComplexity',
      message: '预估复杂度:',
      choices: [
        { name: '低', value: 'low' },
        { name: '中', value: 'medium' },
        { name: '高', value: 'high' }
      ],
      default: 'medium'
    },
    {
      type: 'input',
      name: 'pros',
      message: '优点（用逗号分隔）:',
      default: '灵活,可维护',
      filter: (input: string) => input.split(',').map(s => s.trim()).filter(s => s)
    },
    {
      type: 'input',
      name: 'cons',
      message: '缺点（用逗号分隔）:',
      default: '开发时间较长',
      filter: (input: string) => input.split(',').map(s => s.trim()).filter(s => s)
    }
  ]);

  return {
    id: `manual-${Date.now()}`,
    title: answers.title,
    description: answers.description,
    technicalApproach: answers.technicalApproach,
    estimatedComplexity: answers.estimatedComplexity,
    pros: answers.pros,
    cons: answers.cons
  };
}

/**
 * Ask whether to load saved session or start new
 */
export async function askSessionAction(): Promise<'new' | 'load'> {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '选择操作:',
      choices: [
        { name: '创建新方案', value: 'new' },
        { name: '加载已保存的方案', value: 'load' }
      ]
    }
  ]);

  return action;
}

/**
 * Ask user to select a saved session
 */
export async function askSelectSession(sessions: string[]): Promise<string> {
  if (sessions.length === 0) {
    throw new Error('没有已保存的会话');
  }

  const { session } = await inquirer.prompt([
    {
      type: 'list',
      name: 'session',
      message: '选择一个已保存的会话:',
      choices: sessions.map(s => ({ name: s, value: s }))
    }
  ]);

  return session;
}
