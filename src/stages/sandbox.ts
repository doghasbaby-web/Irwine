import { DockerManager, DockerImage, DEFAULT_IMAGES, SandboxConfig } from '../utils/docker.js';
import { displayInfo, displaySuccess, displayError, displaySection } from '../ui/display.js';
import { VisualTester } from '../utils/visualTest.js';
import ora from 'ora';

export interface SandboxSession {
  containerName: string;
  containerId: string;
  image: string;
  createdAt: Date;
}

export class SandboxStage {
  private dockerManager: DockerManager;
  private currentSession: SandboxSession | null = null;
  private visualTester: VisualTester | null = null;

  constructor() {
    this.dockerManager = new DockerManager();
  }

  /**
   * Initialize the sandbox environment
   */
  async initialize(): Promise<boolean> {
    displaySection('检查 Docker 环境');

    const spinner = ora('检查 Docker 是否可用...').start();

    const isAvailable = await this.dockerManager.checkDockerAvailable();
    if (!isAvailable) {
      spinner.fail('Docker 未安装或未运行');
      displayError(
        new Error(
          'Docker is not available. Please install Docker and ensure it is running.\n' +
            'Visit https://docs.docker.com/get-docker/ for installation instructions.'
        )
      );
      return false;
    }

    spinner.succeed('Docker 环境正常');
    return true;
  }

  /**
   * Setup the default sandbox image
   */
  async setupDefaultImage(): Promise<boolean> {
    const defaultImage = DEFAULT_IMAGES[0];
    const imageName = `${defaultImage.name}:${defaultImage.tag}`;

    displaySection('准备沙箱镜像');

    const exists = await this.dockerManager.imageExists(defaultImage.name, defaultImage.tag);

    if (exists) {
      displaySuccess(`镜像 ${imageName} 已存在`);
      return true;
    }

    displayInfo(`镜像 ${imageName} 不存在，开始构建...`);
    const spinner = ora('构建默认沙箱镜像...').start();

    try {
      await this.dockerManager.buildDefaultImage();
      spinner.succeed('镜像构建成功');
      return true;
    } catch (error) {
      spinner.fail('镜像构建失败');
      displayError(error as Error);
      return false;
    }
  }

  /**
   * Create a new sandbox session
   */
  async createSession(
    image?: DockerImage,
    workDir?: string,
    volumes?: Array<{ host: string; container: string }>
  ): Promise<SandboxSession | null> {
    const selectedImage = image || DEFAULT_IMAGES[0];
    const fullImageName = `${selectedImage.name}:${selectedImage.tag}`;

    displaySection('创建沙箱环境');

    // Ensure image exists
    const imageExists = await this.dockerManager.imageExists(
      selectedImage.name,
      selectedImage.tag
    );

    if (!imageExists) {
      // If it's the default image, try to build it
      if (selectedImage.isDefault) {
        const built = await this.setupDefaultImage();
        if (!built) {
          return null;
        }
      } else {
        // Try to pull the image
        const spinner = ora(`拉取镜像 ${fullImageName}...`).start();
        try {
          await this.dockerManager.pullImage(selectedImage.name, selectedImage.tag);
          spinner.succeed('镜像拉取成功');
        } catch (error) {
          spinner.fail('镜像拉取失败');
          displayError(error as Error);
          return null;
        }
      }
    }

    // Generate unique container name
    const timestamp = Date.now();
    const containerName = `dao-code-sandbox-${timestamp}`;

    // Create sandbox configuration
    const config: SandboxConfig = {
      image: fullImageName,
      containerName,
      workDir: workDir || '/workspace',
      volumes: volumes || [],
      environment: {
        SANDBOX_SESSION: timestamp.toString(),
      },
    };

    const spinner = ora('创建沙箱容器...').start();

    try {
      const containerId = await this.dockerManager.createSandbox(config);
      await this.dockerManager.startContainer(containerName);

      spinner.succeed('沙箱容器创建成功');

      this.currentSession = {
        containerName,
        containerId,
        image: fullImageName,
        createdAt: new Date(),
      };

      displayInfo(`容器名称: ${containerName}`);
      displayInfo(`镜像: ${fullImageName}`);

      // Run visual test if enabled
      if (VisualTester.isEnabled()) {
        await this.runVisualTest();
      }

      return this.currentSession;
    } catch (error) {
      spinner.fail('创建沙箱容器失败');
      displayError(error as Error);
      return null;
    }
  }

  /**
   * Execute code in the sandbox
   */
  async executeCode(code: string, language: string = 'javascript'): Promise<string | null> {
    if (!this.currentSession) {
      displayError(new Error('No active sandbox session. Please create a session first.'));
      return null;
    }

    displaySection('在沙箱中执行代码');

    // Determine the execution command based on language
    let command: string;
    let filename: string;

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        filename = 'test.js';
        command = `echo '${code.replace(/'/g, "'\\''")}' > ${filename} && node ${filename}`;
        break;
      case 'typescript':
      case 'ts':
        filename = 'test.ts';
        command = `echo '${code.replace(/'/g, "'\\''")}' > ${filename} && tsx ${filename}`;
        break;
      case 'python':
      case 'py':
        filename = 'test.py';
        command = `echo '${code.replace(/'/g, "'\\''")}' > ${filename} && python3 ${filename}`;
        break;
      case 'bash':
      case 'sh':
        command = code;
        break;
      default:
        displayError(new Error(`Unsupported language: ${language}`));
        return null;
    }

    const spinner = ora('执行代码...').start();

    try {
      const result = await this.dockerManager.executeInSandbox(
        this.currentSession.containerName,
        command,
        60000 // 60 second timeout
      );

      if (result.success) {
        spinner.succeed('代码执行成功');
        if (result.output) {
          displaySection('输出结果');
          console.log(result.output);
        }
        if (result.error) {
          displaySection('警告/错误信息');
          console.log(result.error);
        }
        return result.output;
      } else {
        spinner.fail('代码执行失败');
        displaySection('错误信息');
        console.log(result.error || 'Unknown error');
        return null;
      }
    } catch (error) {
      spinner.fail('代码执行出错');
      displayError(error as Error);
      return null;
    }
  }

  /**
   * Execute a shell command in the sandbox
   */
  async executeCommand(command: string, timeout: number = 30000): Promise<string | null> {
    if (!this.currentSession) {
      displayError(new Error('No active sandbox session. Please create a session first.'));
      return null;
    }

    displaySection('执行命令');
    displayInfo(`命令: ${command}`);

    const spinner = ora('执行中...').start();

    try {
      const result = await this.dockerManager.executeInSandbox(
        this.currentSession.containerName,
        command,
        timeout
      );

      if (result.success) {
        spinner.succeed('命令执行成功');
        if (result.output) {
          console.log(result.output);
        }
        return result.output;
      } else {
        spinner.fail('命令执行失败');
        if (result.error) {
          console.log(result.error);
        }
        return null;
      }
    } catch (error) {
      spinner.fail('命令执行出错');
      displayError(error as Error);
      return null;
    }
  }

  /**
   * List all available sandbox containers
   */
  async listSandboxes(): Promise<void> {
    displaySection('现有沙箱容器');

    const sandboxes = await this.dockerManager.listSandboxes();

    if (sandboxes.length === 0) {
      displayInfo('没有找到沙箱容器');
      return;
    }

    console.log('\n');
    sandboxes.forEach((sandbox, index) => {
      console.log(`${index + 1}. ${sandbox.name}`);
      console.log(`   状态: ${sandbox.status}`);
      console.log(`   镜像: ${sandbox.image}`);
      console.log('');
    });
  }

  /**
   * Get current session
   */
  getCurrentSession(): SandboxSession | null {
    return this.currentSession;
  }

  /**
   * Stop the current sandbox session
   */
  async stopSession(): Promise<void> {
    if (!this.currentSession) {
      displayInfo('没有活动的沙箱会话');
      return;
    }

    displaySection('停止沙箱会话');

    const spinner = ora('停止容器...').start();

    try {
      await this.dockerManager.stopContainer(this.currentSession.containerName);
      spinner.succeed('容器已停止');
      this.currentSession = null;
    } catch (error) {
      spinner.fail('停止容器失败');
      displayError(error as Error);
    }
  }

  /**
   * Remove the current sandbox session
   */
  async removeSession(): Promise<void> {
    if (!this.currentSession) {
      displayInfo('没有活动的沙箱会话');
      return;
    }

    displaySection('删除沙箱会话');

    const spinner = ora('删除容器...').start();

    try {
      await this.dockerManager.removeContainer(this.currentSession.containerName, true);
      spinner.succeed('容器已删除');
      this.currentSession = null;
    } catch (error) {
      spinner.fail('删除容器失败');
      displayError(error as Error);
    }
  }

  /**
   * Cleanup all sandbox containers
   */
  async cleanupAll(): Promise<void> {
    displaySection('清理所有沙箱容器');

    const spinner = ora('清理中...').start();

    try {
      await this.dockerManager.cleanupAll();
      spinner.succeed('清理完成');
      this.currentSession = null;
    } catch (error) {
      spinner.fail('清理失败');
      displayError(error as Error);
    }
  }

  /**
   * Get available images
   */
  getAvailableImages(): DockerImage[] {
    return DEFAULT_IMAGES;
  }

  /**
   * Run visual test in Chrome browser
   */
  async runVisualTest(): Promise<void> {
    displaySection('启动可视化浏览器测试');
    displayInfo('VISUAL_TEST 已启用，将运行 Chrome 浏览器演示测试');

    this.visualTester = new VisualTester({
      headless: false,
      slowMo: 500,
      stepDelay: 2000,
    });

    const initialized = await this.visualTester.initialize();
    if (!initialized) {
      displayError(new Error('Failed to initialize visual tester'));
      return;
    }

    await this.visualTester.runDemoTest();
    await this.visualTester.close();

    this.visualTester = null;
  }

  /**
   * Run custom visual test with specific URL
   */
  async runCustomVisualTest(url: string): Promise<void> {
    if (!this.visualTester) {
      this.visualTester = new VisualTester({
        headless: false,
        slowMo: 500,
        stepDelay: 2000,
      });

      const initialized = await this.visualTester.initialize();
      if (!initialized) {
        displayError(new Error('Failed to initialize visual tester'));
        return;
      }
    }

    await this.visualTester.runCustomTest(url);
  }

  /**
   * Close visual tester if running
   */
  async closeVisualTester(): Promise<void> {
    if (this.visualTester) {
      await this.visualTester.close();
      this.visualTester = null;
    }
  }
}
