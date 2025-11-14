#!/usr/bin/env node

/**
 * CLI entry point for Dao Code
 */

import { Command } from 'commander';
import { DaoCodeApp } from './index.js';
import {
  displayBanner,
  displayError,
  displayInfo
} from './ui/display.js';
import {
  askMainAction,
  askModelProviders,
  askConfirmation
} from './ui/prompts.js';

const program = new Command();

program
  .name('dao-code')
  .description('道生三 - Three-Agent AI Coding Assistant')
  .version('1.0.0');

program
  .command('interactive')
  .alias('i')
  .description('交互式模式（完整流程）')
  .action(async () => {
    try {
      displayBanner();

      const app = new DaoCodeApp();

      // Ask if user wants to customize model providers
      const customize = await askConfirmation('是否自定义三个 Agent 的模型？（默认：Claude, GPT, Gemini）');

      if (customize) {
        const providers = await askModelProviders();
        await app.initialize(providers);
      } else {
        await app.initialize();
      }

      await app.runInteractive();
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

program
  .command('clarify')
  .alias('c')
  .description('仅运行需求澄清阶段（辩论模式）')
  .action(async () => {
    try {
      const app = new DaoCodeApp();
      await app.initialize();
      await app.runClarificationOnly();
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

program
  .command('code')
  .description('仅运行编码协同阶段（需要先有方案）')
  .action(async () => {
    try {
      const app = new DaoCodeApp();
      await app.initialize();
      await app.runCodingOnly();
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

program
  .command('menu')
  .alias('m')
  .description('显示主菜单')
  .action(async () => {
    try {
      displayBanner();

      const app = new DaoCodeApp();
      await app.initialize();

      let exit = false;

      while (!exit) {
        const action = await askMainAction();

        switch (action) {
          case 'clarify':
            await app.runClarificationOnly();
            break;
          case 'code':
            await app.runCodingOnly();
            break;
          case 'interactive':
            await app.runInteractive();
            break;
          case 'exit':
            exit = true;
            displayInfo('再见！');
            break;
        }

        if (!exit && action !== 'exit') {
          const continueUsing = await askConfirmation('是否继续使用？');
          if (!continueUsing) {
            exit = true;
            displayInfo('再见！');
          }
        }
      }
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

// Default action (no command)
program.action(async () => {
  try {
    displayBanner();

    const app = new DaoCodeApp();
    await app.initialize();

    const action = await askMainAction();

    switch (action) {
      case 'clarify':
        await app.runClarificationOnly();
        break;
      case 'code':
        await app.runCodingOnly();
        break;
      case 'interactive':
        await app.runInteractive();
        break;
      case 'exit':
        displayInfo('再见！');
        break;
    }
  } catch (error) {
    displayError(error as Error);
    process.exit(1);
  }
});

// Parse command line arguments
program.parse(process.argv);
