import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface DockerImage {
  name: string;
  tag: string;
  description: string;
  isDefault?: boolean;
}

export interface SandboxConfig {
  image: string;
  containerName: string;
  workDir: string;
  volumes?: Array<{ host: string; container: string }>;
  environment?: Record<string, string>;
}

export interface SandboxResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

export const DEFAULT_IMAGES: DockerImage[] = [
  {
    name: 'dao-code-sandbox',
    tag: 'ubuntu24-node',
    description: 'Ubuntu 24.04 with Node.js and development tools',
    isDefault: true,
  },
  {
    name: 'node',
    tag: '20-alpine',
    description: 'Node.js 20 on Alpine Linux (lightweight)',
  },
  {
    name: 'ubuntu',
    tag: '24.04',
    description: 'Ubuntu 24.04 (base image)',
  },
];

export class DockerManager {
  private activeContainers: Set<string> = new Set();

  /**
   * Check if Docker is installed and running
   */
  async checkDockerAvailable(): Promise<boolean> {
    try {
      await execAsync('docker version');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Build the default sandbox image
   */
  async buildDefaultImage(): Promise<void> {
    const dockerfilePath = path.join(process.cwd(), 'docker', 'Dockerfile.sandbox');
    const contextPath = path.join(process.cwd(), 'docker');

    try {
      await fs.access(dockerfilePath);
    } catch {
      throw new Error(`Dockerfile not found at ${dockerfilePath}`);
    }

    const imageName = `${DEFAULT_IMAGES[0].name}:${DEFAULT_IMAGES[0].tag}`;
    const buildCommand = `docker build -t ${imageName} -f ${dockerfilePath} ${contextPath}`;

    try {
      const { stdout, stderr } = await execAsync(buildCommand);
      if (stderr && !stderr.includes('naming to')) {
        console.error('Build warnings:', stderr);
      }
    } catch (error: any) {
      throw new Error(`Failed to build Docker image: ${error.message}`);
    }
  }

  /**
   * Check if an image exists locally
   */
  async imageExists(imageName: string, tag: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`docker images -q ${imageName}:${tag}`);
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Pull a Docker image from registry
   */
  async pullImage(imageName: string, tag: string): Promise<void> {
    const fullName = `${imageName}:${tag}`;
    try {
      await execAsync(`docker pull ${fullName}`);
    } catch (error: any) {
      throw new Error(`Failed to pull image ${fullName}: ${error.message}`);
    }
  }

  /**
   * Create and start a sandbox container
   */
  async createSandbox(config: SandboxConfig): Promise<string> {
    const {
      image,
      containerName,
      workDir = '/workspace',
      volumes = [],
      environment = {},
    } = config;

    // Build volume mounts
    const volumeArgs = volumes
      .map((v) => `-v ${v.host}:${v.container}`)
      .join(' ');

    // Build environment variables
    const envArgs = Object.entries(environment)
      .map(([key, value]) => `-e ${key}="${value}"`)
      .join(' ');

    // Create container command
    const createCommand = `docker create -it \
      --name ${containerName} \
      ${volumeArgs} \
      ${envArgs} \
      -w ${workDir} \
      ${image} \
      /bin/bash`;

    try {
      const { stdout } = await execAsync(createCommand);
      const containerId = stdout.trim();
      this.activeContainers.add(containerName);
      return containerId;
    } catch (error: any) {
      throw new Error(`Failed to create sandbox container: ${error.message}`);
    }
  }

  /**
   * Start a container
   */
  async startContainer(containerName: string): Promise<void> {
    try {
      await execAsync(`docker start ${containerName}`);
    } catch (error: any) {
      throw new Error(`Failed to start container ${containerName}: ${error.message}`);
    }
  }

  /**
   * Stop a container
   */
  async stopContainer(containerName: string): Promise<void> {
    try {
      await execAsync(`docker stop ${containerName}`);
      this.activeContainers.delete(containerName);
    } catch (error: any) {
      throw new Error(`Failed to stop container ${containerName}: ${error.message}`);
    }
  }

  /**
   * Remove a container
   */
  async removeContainer(containerName: string, force: boolean = false): Promise<void> {
    const forceFlag = force ? '-f' : '';
    try {
      await execAsync(`docker rm ${forceFlag} ${containerName}`);
      this.activeContainers.delete(containerName);
    } catch (error: any) {
      throw new Error(`Failed to remove container ${containerName}: ${error.message}`);
    }
  }

  /**
   * Execute a command in the sandbox
   */
  async executeInSandbox(
    containerName: string,
    command: string,
    timeout: number = 30000
  ): Promise<SandboxResult> {
    const execCommand = `docker exec ${containerName} /bin/bash -c "${command.replace(/"/g, '\\"')}"`;

    try {
      const { stdout, stderr } = await execAsync(execCommand, {
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      return {
        success: true,
        output: stdout,
        error: stderr || undefined,
        exitCode: 0,
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        exitCode: error.code || 1,
      };
    }
  }

  /**
   * Copy files to sandbox
   */
  async copyToSandbox(
    containerName: string,
    sourcePath: string,
    destPath: string
  ): Promise<void> {
    try {
      await execAsync(`docker cp ${sourcePath} ${containerName}:${destPath}`);
    } catch (error: any) {
      throw new Error(`Failed to copy files to sandbox: ${error.message}`);
    }
  }

  /**
   * Copy files from sandbox
   */
  async copyFromSandbox(
    containerName: string,
    sourcePath: string,
    destPath: string
  ): Promise<void> {
    try {
      await execAsync(`docker cp ${containerName}:${sourcePath} ${destPath}`);
    } catch (error: any) {
      throw new Error(`Failed to copy files from sandbox: ${error.message}`);
    }
  }

  /**
   * List all sandbox containers
   */
  async listSandboxes(): Promise<Array<{ name: string; status: string; image: string }>> {
    try {
      const { stdout } = await execAsync(
        'docker ps -a --filter "name=dao-code-sandbox" --format "{{.Names}}\t{{.Status}}\t{{.Image}}"'
      );

      if (!stdout.trim()) {
        return [];
      }

      return stdout
        .trim()
        .split('\n')
        .map((line) => {
          const [name, status, image] = line.split('\t');
          return { name, status, image };
        });
    } catch (error) {
      return [];
    }
  }

  /**
   * Cleanup all sandbox containers
   */
  async cleanupAll(): Promise<void> {
    const sandboxes = await this.listSandboxes();
    for (const sandbox of sandboxes) {
      try {
        await this.removeContainer(sandbox.name, true);
      } catch (error) {
        console.error(`Failed to remove ${sandbox.name}:`, error);
      }
    }
  }

  /**
   * Get container info
   */
  async getContainerInfo(containerName: string): Promise<any> {
    try {
      const { stdout } = await execAsync(`docker inspect ${containerName}`);
      return JSON.parse(stdout)[0];
    } catch (error: any) {
      throw new Error(`Failed to get container info: ${error.message}`);
    }
  }

  /**
   * Check if container is running
   */
  async isContainerRunning(containerName: string): Promise<boolean> {
    try {
      const info = await this.getContainerInfo(containerName);
      return info.State.Running;
    } catch {
      return false;
    }
  }
}
