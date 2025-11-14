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
  .description('Dao Sheng San - Three-Agent AI Coding Assistant')
  .version('1.0.0');

program
  .command('interactive')
  .alias('i')
  .description('Interactive mode (complete workflow)')
  .action(async () => {
    try {
      displayBanner();

      const app = new DaoCodeApp();

      // Ask if user wants to customize model providers
      const customize = await askConfirmation('Customize models for the three Agents? (Default: Claude, GPT, Gemini)');

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
  .description('Run requirements clarification stage only (debate mode)')
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
  .description('Run coding collaboration stage only (requires existing solution)')
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
  .description('Display main menu')
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
            displayInfo('Goodbye!');
            break;
        }

        if (!exit && action !== 'exit') {
          const continueUsing = await askConfirmation('Continue using?');
          if (!continueUsing) {
            exit = true;
            displayInfo('Goodbye!');
          }
        }
      }
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

program
  .command('sandbox')
  .alias('s')
  .description('Docker sandbox environment')
  .action(async () => {
    try {
      displayBanner();

      const app = new DaoCodeApp();
      await app.runSandbox();
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
