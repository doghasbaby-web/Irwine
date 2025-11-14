/**
 * UI display utilities
 */

import chalk from 'chalk';
import { AgentRole, DebateRound, Proposal, CodingIteration } from '../types/index.js';

/**
 * Display welcome banner
 */
export function displayBanner(): void {
  console.log('\n');
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('         道生三 - Three-Agent AI Coding Assistant        '));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════'));
  console.log(chalk.gray('         "道生一，一生二，二生三，三生万物"'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════'));
  console.log('\n');
}

/**
 * Display section header
 */
export function displaySection(title: string): void {
  console.log('\n');
  console.log(chalk.yellow.bold(`▶ ${title}`));
  console.log(chalk.yellow('─'.repeat(60)));
}

/**
 * Display agent role
 */
export function displayAgentRole(role: AgentRole): string {
  const roleMap = {
    [AgentRole.PROPOSER]: chalk.green.bold('[正方]'),
    [AgentRole.CHALLENGER]: chalk.red.bold('[反方]'),
    [AgentRole.JUDGE]: chalk.blue.bold('[裁判]')
  };
  return roleMap[role] || role;
}

/**
 * Display debate round
 */
export function displayDebateRound(round: DebateRound): void {
  console.log('\n');
  console.log(chalk.magenta.bold(`══════ 第 ${round.round} 轮辩论 ══════`));
  console.log('\n');

  // Proposer
  console.log(displayAgentRole(AgentRole.PROPOSER));
  console.log(chalk.white(formatMessage(round.proposerMessage.content)));
  console.log('\n');

  // Challenger
  console.log(displayAgentRole(AgentRole.CHALLENGER));
  console.log(chalk.white(formatMessage(round.challengerMessage.content)));
  console.log('\n');

  // Judge (if available)
  if (round.judgeAnalysis) {
    console.log(displayAgentRole(AgentRole.JUDGE));
    console.log(chalk.white(formatMessage(round.judgeAnalysis.content)));
    console.log('\n');
  }
}

/**
 * Display proposals
 */
export function displayProposals(proposals: Proposal[]): void {
  console.log('\n');
  console.log(chalk.cyan.bold('════════ 推荐方案 ════════'));
  console.log('\n');

  proposals.forEach((proposal, index) => {
    console.log(chalk.yellow.bold(`${index + 1}. ${proposal.title}`));
    console.log(chalk.gray(`   复杂度: ${proposal.estimatedComplexity}`));
    console.log(chalk.white(`   ${proposal.description.substring(0, 150)}...`));
    console.log();
  });
}

/**
 * Display coding iteration
 */
export function displayCodingIteration(iteration: CodingIteration): void {
  console.log('\n');
  console.log(chalk.magenta.bold(`══════ 第 ${iteration.iteration} 轮编码 ══════`));

  // Show role rotation indicator for iterations > 1
  if (iteration.iteration > 1) {
    console.log(chalk.cyan('♻️  角色已轮换'));
  }
  console.log('\n');

  console.log(chalk.green('【编写者】'), displayAgentRole(iteration.writerAgent));
  console.log(chalk.gray('代码片段:'));
  console.log(chalk.white(formatCode(iteration.code.substring(0, 500))));
  if (iteration.code.length > 500) {
    console.log(chalk.gray('... (代码已截断)'));
  }
  console.log('\n');

  console.log(chalk.yellow('【审查者】'), displayAgentRole(iteration.reviewerAgent));
  console.log(chalk.white(`评论数量: ${iteration.reviewComments.length}`));
  iteration.reviewComments.slice(0, 3).forEach(comment => {
    console.log(chalk.gray(`  • ${comment.substring(0, 100)}`));
  });
  console.log('\n');

  console.log(chalk.blue('【检查者】'), displayAgentRole(iteration.inspectorAgent));
  const status = iteration.inspectionResult.approved
    ? chalk.green.bold('✓ 通过')
    : chalk.red.bold('✗ 需要改进');
  console.log(`状态: ${status}`);

  if (iteration.inspectionResult.issues.length > 0) {
    console.log(chalk.red('问题:'));
    iteration.inspectionResult.issues.forEach(issue => {
      const severityColor = issue.severity === 'critical' ? chalk.red : chalk.yellow;
      console.log(severityColor(`  [${issue.severity.toUpperCase()}] ${issue.message}`));
    });
  }
  console.log('\n');
}

/**
 * Display final result
 */
export function displayFinalResult(code: string): void {
  console.log('\n');
  console.log(chalk.green.bold('════════ 最终代码 ════════'));
  console.log('\n');
  console.log(chalk.white(formatCode(code)));
  console.log('\n');
  console.log(chalk.green.bold('✓ 代码生成完成！'));
  console.log('\n');
}

/**
 * Display error
 */
export function displayError(error: string | Error): void {
  const message = typeof error === 'string' ? error : error.message;
  console.log('\n');
  console.log(chalk.red.bold('✗ 错误:'), chalk.red(message));
  console.log('\n');
}

/**
 * Display info message
 */
export function displayInfo(message: string): void {
  console.log(chalk.cyan('ℹ'), chalk.white(message));
}

/**
 * Display success message
 */
export function displaySuccess(message: string): void {
  console.log(chalk.green('✓'), chalk.white(message));
}

/**
 * Format message content
 */
function formatMessage(content: string): string {
  return content
    .split('\n')
    .map(line => '  ' + line)
    .join('\n');
}

/**
 * Format code content
 */
function formatCode(code: string): string {
  return code
    .split('\n')
    .map(line => chalk.gray('  │ ') + line)
    .join('\n');
}

/**
 * Display spinner with message
 */
export function displaySpinner(message: string): void {
  console.log(chalk.cyan('⏳'), chalk.white(message));
}

/**
 * Display three implementation options
 */
export function displayThreeOptions(options: {
  option1: string;
  option2: string;
  option3: string;
}): void {
  console.log('\n');
  console.log(chalk.cyan.bold('════════ 三个实现选项 ════════'));
  console.log(chalk.gray('三个 Agent 分别提出了不同的实现方案：'));
  console.log('\n');

  console.log(chalk.green.bold('【选项 1 - 正方提案】'));
  console.log(chalk.white(formatMessage(options.option1.substring(0, 300))));
  if (options.option1.length > 300) {
    console.log(chalk.gray('... (内容已截断)'));
  }
  console.log('\n');

  console.log(chalk.red.bold('【选项 2 - 反方提案】'));
  console.log(chalk.white(formatMessage(options.option2.substring(0, 300))));
  if (options.option2.length > 300) {
    console.log(chalk.gray('... (内容已截断)'));
  }
  console.log('\n');

  console.log(chalk.blue.bold('【选项 3 - 裁判提案】'));
  console.log(chalk.white(formatMessage(options.option3.substring(0, 300))));
  if (options.option3.length > 300) {
    console.log(chalk.gray('... (内容已截断)'));
  }
  console.log('\n');
}
