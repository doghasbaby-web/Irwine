import { chromium, Browser, Page } from 'playwright';
import { displayInfo, displaySuccess, displayError, displaySection, displayWarning } from '../ui/display.js';
import ora from 'ora';
import type { OperationFile, Operation, TestExecutionResult, OperationResult } from '../types/operation.js';
import {
  loadOperationFile,
  getAllOperations,
  getOperationFileSummary,
  createTestExecutionResult,
  addOperationResult,
  finalizeTestExecutionResult,
  exportTestResult
} from './operationLoader.js';
import { writeFile } from 'fs/promises';

export interface VisualTestConfig {
  headless?: boolean;
  slowMo?: number;
  stepDelay?: number;
}

export class VisualTester {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: VisualTestConfig;

  constructor(config: VisualTestConfig = {}) {
    this.config = {
      headless: false, // Show browser for visual testing
      slowMo: 500, // Slow down operations by 500ms
      stepDelay: 2000, // Wait 2 seconds between steps
      ...config,
    };
  }

  /**
   * Initialize the browser
   */
  async initialize(): Promise<boolean> {
    displaySection('初始化 Chrome 浏览器测试');

    const spinner = ora('启动 Chrome 浏览器...').start();

    try {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        slowMo: this.config.slowMo,
      });

      this.page = await this.browser.newPage();

      spinner.succeed('Chrome 浏览器启动成功');
      displayInfo('浏览器将以可见模式运行，便于观察测试过程');

      return true;
    } catch (error) {
      spinner.fail('Chrome 浏览器启动失败');
      displayError(error as Error);
      return false;
    }
  }

  /**
   * Run a step-by-step demonstration test
   */
  async runDemoTest(): Promise<boolean> {
    if (!this.page || !this.browser) {
      displayError(new Error('Browser not initialized. Call initialize() first.'));
      return false;
    }

    displaySection('运行可视化演示测试');

    try {
      // Step 1: Navigate to a test page
      await this.step('导航到示例网页', async () => {
        await this.page!.goto('https://example.com');
      });

      // Step 2: Take screenshot
      await this.step('截图保存当前页面', async () => {
        await this.page!.screenshot({ path: 'sandbox-test-step1.png' });
        displayInfo('截图已保存: sandbox-test-step1.png');
      });

      // Step 3: Get page title
      await this.step('获取页面标题', async () => {
        const title = await this.page!.title();
        displayInfo(`页面标题: ${title}`);
      });

      // Step 4: Find and interact with elements
      await this.step('查找页面元素', async () => {
        const h1Text = await this.page!.$eval('h1', el => el.textContent);
        displayInfo(`找到标题元素: ${h1Text}`);
      });

      // Step 5: Get page information
      await this.step('获取页面信息', async () => {
        const url = this.page!.url();
        const viewportSize = this.page!.viewportSize();

        displayInfo(`当前 URL: ${url}`);
        if (viewportSize) {
          displayInfo(`视口大小: ${viewportSize.width}x${viewportSize.height}`);
        }
      });

      // Step 6: Final screenshot
      await this.step('最终截图', async () => {
        await this.page!.screenshot({ path: 'sandbox-test-final.png' });
        displayInfo('截图已保存: sandbox-test-final.png');
      });

      displaySuccess('可视化测试完成！');
      return true;
    } catch (error) {
      displayError(error as Error);
      return false;
    }
  }

  /**
   * Run a custom test with user-provided URL and actions
   */
  async runCustomTest(url: string, actions?: Array<{ type: string; selector?: string; value?: string }>): Promise<boolean> {
    if (!this.page || !this.browser) {
      displayError(new Error('Browser not initialized. Call initialize() first.'));
      return false;
    }

    displaySection(`运行自定义测试: ${url}`);

    try {
      await this.step(`导航到 ${url}`, async () => {
        await this.page!.goto(url);
      });

      if (actions && actions.length > 0) {
        for (const action of actions) {
          await this.step(`执行操作: ${action.type}`, async () => {
            switch (action.type) {
              case 'click':
                if (action.selector) {
                  await this.page!.click(action.selector);
                }
                break;
              case 'type':
                if (action.selector && action.value) {
                  await this.page!.fill(action.selector, action.value);
                }
                break;
              case 'screenshot':
                await this.page!.screenshot({ path: action.value || 'custom-test.png' });
                displayInfo(`截图已保存: ${action.value || 'custom-test.png'}`);
                break;
              default:
                displayInfo(`未知操作类型: ${action.type}`);
            }
          });
        }
      }

      displaySuccess('自定义测试完成！');
      return true;
    } catch (error) {
      displayError(error as Error);
      return false;
    }
  }

  /**
   * Run test from an operation file
   */
  async runOperationFile(filePath: string): Promise<TestExecutionResult | null> {
    if (!this.page || !this.browser) {
      displayError(new Error('Browser not initialized. Call initialize() first.'));
      return null;
    }

    // Load operation file
    const operationFile = await loadOperationFile(filePath);
    if (!operationFile) {
      return null;
    }

    // Display operation file summary
    displaySection('Operation File Summary');
    displayInfo(getOperationFileSummary(operationFile));

    // Apply config from operation file if present
    if (operationFile.config) {
      if (operationFile.config.viewportWidth && operationFile.config.viewportHeight) {
        await this.page.setViewportSize({
          width: operationFile.config.viewportWidth,
          height: operationFile.config.viewportHeight
        });
        displayInfo(
          `Viewport set to ${operationFile.config.viewportWidth}x${operationFile.config.viewportHeight}`
        );
      }

      if (operationFile.config.defaultWait) {
        this.config.stepDelay = operationFile.config.defaultWait;
        displayInfo(`Default wait time set to ${operationFile.config.defaultWait}ms`);
      }
    }

    // Create test execution result
    const testResult = createTestExecutionResult(operationFile.name);
    displaySection(`Starting Test: ${operationFile.name}`);

    try {
      // Get all operations (setup, main, cleanup)
      const allOps = getAllOperations(operationFile);

      // Execute all operations
      for (const { phase, operation } of allOps) {
        const phaseLabel = phase === 'setup' ? '[SETUP]' : phase === 'cleanup' ? '[CLEANUP]' : '';
        const description = `${phaseLabel} Step ${operation.step}: ${operation.description}`;

        displayInfo(`\n${description}`);

        const operationResult = await this.executeOperation(
          operation,
          operationFile,
          operationFile.config?.screenshotOnError || false
        );

        addOperationResult(testResult, operationResult);

        if (!operationResult.success) {
          displayError(new Error(`Operation failed: ${operationResult.error}`));

          if (operationFile.config?.stopOnError) {
            displayWarning('Stopping test due to error (stopOnError = true)');
            break;
          }
        }

        // Apply custom wait time if specified, otherwise use default
        const waitTime = operation.waitAfter ?? this.config.stepDelay ?? 0;
        if (waitTime > 0) {
          await this.sleep(waitTime);
        }
      }

      // Finalize results
      finalizeTestExecutionResult(testResult);

      // Display summary
      displaySection('Test Execution Summary');
      displayInfo(`Total Operations: ${testResult.totalOperations}`);
      displayInfo(`Successful: ${testResult.successfulOperations}`);
      displayInfo(`Failed: ${testResult.failedOperations}`);
      displayInfo(`Skipped: ${testResult.skippedOperations}`);
      displayInfo(`Duration: ${testResult.duration}ms`);

      if (testResult.success) {
        displaySuccess('All operations completed successfully!');
      } else {
        displayError(new Error(testResult.errorSummary || 'Test failed'));
      }

      // Save test results to file
      const resultFilePath = `test-result-${Date.now()}.json`;
      await writeFile(resultFilePath, exportTestResult(testResult));
      displayInfo(`Test results saved to: ${resultFilePath}`);

      return testResult;
    } catch (error) {
      displayError(error as Error);
      finalizeTestExecutionResult(testResult);
      testResult.success = false;
      testResult.errorSummary = (error as Error).message;
      return testResult;
    }
  }

  /**
   * Execute a single operation from the operation file
   */
  private async executeOperation(
    operation: Operation,
    operationFile: OperationFile,
    screenshotOnError: boolean
  ): Promise<OperationResult> {
    const startTime = Date.now();
    const result: OperationResult = {
      step: operation.step,
      success: false,
      duration: 0
    };

    const spinner = ora('Executing...').start();

    try {
      switch (operation.type) {
        case 'navigate': {
          const url = operation.input?.text || operationFile.baseUrl || '';
          await this.page!.goto(url, { waitUntil: 'domcontentloaded' });
          displayInfo(`Navigated to: ${url}`);
          break;
        }

        case 'click': {
          if (!operation.selector) {
            throw new Error('Click operation requires a selector');
          }
          await this.page!.click(operation.selector);
          displayInfo(`Clicked: ${operation.selector}`);
          break;
        }

        case 'type': {
          if (!operation.selector) {
            throw new Error('Type operation requires a selector');
          }
          const text = operation.input?.text || '';
          await this.page!.fill(operation.selector, text);
          displayInfo(`Typed "${text}" into: ${operation.selector}`);
          break;
        }

        case 'clear': {
          if (!operation.selector) {
            throw new Error('Clear operation requires a selector');
          }
          await this.page!.fill(operation.selector, '');
          displayInfo(`Cleared: ${operation.selector}`);
          break;
        }

        case 'select': {
          if (!operation.selector) {
            throw new Error('Select operation requires a selector');
          }
          const value = operation.input?.text || '';
          await this.page!.selectOption(operation.selector, value);
          displayInfo(`Selected "${value}" in: ${operation.selector}`);
          break;
        }

        case 'wait': {
          const waitTime = operation.input?.number || 1000;
          await this.sleep(waitTime);
          displayInfo(`Waited for ${waitTime}ms`);
          break;
        }

        case 'screenshot': {
          const filename = operation.screenshotName || `screenshot-step-${operation.step}.png`;
          await this.page!.screenshot({ path: filename });
          result.screenshot = filename;
          displayInfo(`Screenshot saved: ${filename}`);
          break;
        }

        case 'scroll': {
          const distance = operation.input?.number || 0;
          await this.page!.evaluate((dist) => {
            window.scrollBy(0, dist);
          }, distance);
          displayInfo(`Scrolled ${distance}px`);
          break;
        }

        case 'hover': {
          if (!operation.selector) {
            throw new Error('Hover operation requires a selector');
          }
          await this.page!.hover(operation.selector);
          displayInfo(`Hovered over: ${operation.selector}`);
          break;
        }

        case 'verify': {
          if (!operation.selector) {
            throw new Error('Verify operation requires a selector');
          }
          const element = await this.page!.$(operation.selector);
          if (!element) {
            throw new Error(`Element not found: ${operation.selector}`);
          }

          if (operation.expected) {
            const text = await element.textContent();
            if (!text?.includes(operation.expected)) {
              throw new Error(
                `Verification failed: expected "${operation.expected}" but got "${text}"`
              );
            }
            displayInfo(`Verified: ${operation.selector} contains "${operation.expected}"`);
          } else {
            displayInfo(`Verified: ${operation.selector} exists`);
          }
          break;
        }

        case 'press': {
          const key = operation.input?.text || '';
          await this.page!.keyboard.press(key);
          displayInfo(`Pressed key: ${key}`);
          break;
        }

        case 'upload': {
          if (!operation.selector) {
            throw new Error('Upload operation requires a selector');
          }
          const filePath = operation.input?.text || '';
          await this.page!.setInputFiles(operation.selector, filePath);
          displayInfo(`Uploaded file: ${filePath} to ${operation.selector}`);
          break;
        }

        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      result.success = true;
      spinner.succeed('Complete');
    } catch (error) {
      result.success = false;
      result.error = (error as Error).message;
      spinner.fail('Failed');

      // Take screenshot on error if configured
      if (screenshotOnError) {
        const errorScreenshot = `error-step-${operation.step}-${Date.now()}.png`;
        try {
          await this.page!.screenshot({ path: errorScreenshot });
          result.screenshot = errorScreenshot;
          displayInfo(`Error screenshot saved: ${errorScreenshot}`);
        } catch (screenshotError) {
          displayWarning(`Failed to take error screenshot: ${(screenshotError as Error).message}`);
        }
      }

      // Handle retry logic
      if (operation.retryCount && operation.retryCount > 0) {
        displayWarning(`Retrying operation (${operation.retryCount} attempts remaining)...`);
        const retryOperation = { ...operation, retryCount: operation.retryCount - 1 };
        return this.executeOperation(retryOperation, operationFile, screenshotOnError);
      }
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute a single test step with delay
   */
  private async step(description: string, action: () => Promise<void>): Promise<void> {
    displayInfo(`\n步骤: ${description}`);
    const spinner = ora('执行中...').start();

    try {
      await action();
      spinner.succeed('完成');

      // Add delay between steps for visual demonstration
      if (this.config.stepDelay && this.config.stepDelay > 0) {
        await this.sleep(this.config.stepDelay);
      }
    } catch (error) {
      spinner.fail('失败');
      throw error;
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    displaySection('关闭浏览器');

    const spinner = ora('关闭 Chrome 浏览器...').start();

    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      spinner.succeed('浏览器已关闭');
    } catch (error) {
      spinner.fail('关闭浏览器失败');
      displayError(error as Error);
    }
  }

  /**
   * Check if visual testing is enabled in environment
   */
  static isEnabled(): boolean {
    const visualTest = process.env.VISUAL_TEST?.toLowerCase();
    return visualTest === 'yes' || visualTest === 'true' || visualTest === '1';
  }
}
