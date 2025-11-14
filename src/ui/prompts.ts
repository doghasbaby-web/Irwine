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
