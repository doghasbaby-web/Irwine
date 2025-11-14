import { chromium, Browser, Page } from 'playwright';
import { displayInfo, displaySuccess, displayError, displaySection } from '../ui/display.js';
import ora from 'ora';

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
