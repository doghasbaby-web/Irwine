# 贡献指南

感谢你对道生三项目的关注！我们欢迎各种形式的贡献。

## 如何贡献

### 报告 Bug

在提交 Bug 报告前，请：

1. 检查是否已有相同的 Issue
2. 使用最新版本验证问题是否仍然存在
3. 提供详细的复现步骤

创建 Issue 时请包含：
- 环境信息（OS、Node.js 版本等）
- 复现步骤
- 预期行为
- 实际行为
- 错误日志

### 提交功能建议

我们欢迎新功能建议！请在 Issue 中描述：
- 功能的使用场景
- 预期的行为
- 可能的实现方式
- 替代方案

### Pull Request 流程

1. **Fork 仓库**

```bash
git clone https://github.com/your-username/dao-code.git
cd dao-code
```

2. **创建分支**

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

3. **开发**

```bash
# 安装依赖
npm install

# 开发
npm run dev

# 测试
npm test

# 构建
npm run build
```

4. **提交代码**

```bash
git add .
git commit -m "feat: add new feature"
```

提交信息格式：
- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式（不影响功能）
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建/工具

5. **推送并创建 PR**

```bash
git push origin feature/your-feature-name
```

然后在 GitHub 上创建 Pull Request。

### 代码规范

#### TypeScript

- 使用 TypeScript strict 模式
- 所有公共 API 必须有类型定义
- 避免使用 `any`

#### 代码风格

```typescript
// ✓ 好
export async function processData(input: string): Promise<Result> {
  const validated = validateInput(input);
  return await performProcess(validated);
}

// ✗ 不好
export async function processData(input: any) {
  return await performProcess(input);
}
```

#### 注释

为复杂逻辑添加注释：

```typescript
/**
 * Execute a debate round between three agents
 *
 * @param userQuery - The user's requirement
 * @param round - Current round number
 * @returns Debate results from all three agents
 */
async executeDebateRound(userQuery: string, round: number): Promise<DebateResult>
```

#### 测试

- 所有新功能必须有测试
- Bug 修复应该包含回归测试
- 保持测试覆盖率 > 80%

```typescript
describe('ThreeAgentCoordinator', () => {
  it('should rotate roles correctly', () => {
    // 测试代码
  });
});
```

## 开发指南

### 项目结构

```
src/
├── agents/          # Agent 实现
├── models/          # AI 模型客户端
├── stages/          # 工作阶段
├── ui/              # 用户界面
├── types/           # 类型定义
├── config.ts        # 配置
├── index.ts         # 主入口
└── cli.ts           # CLI 入口
```

### 添加新的 AI 模型

1. 在 `src/models/` 创建新的客户端类
2. 实现 `AIModelClient` 接口
3. 在 `ModelFactory` 注册
4. 更新类型定义
5. 添加文档和测试

### 添加新的 Agent 角色

1. 在 `types/index.ts` 添加新角色
2. 在 `agents/prompts.ts` 定义系统提示
3. 更新 `ThreeAgentCoordinator`
4. 添加测试

### 添加新的工作阶段

1. 在 `src/stages/` 创建新阶段类
2. 实现核心逻辑
3. 在 `DaoCodeApp` 集成
4. 添加 CLI 命令
5. 更新文档

## 发布流程

维护者会处理版本发布，流程如下：

1. 更新版本号（package.json）
2. 更新 CHANGELOG
3. 创建 Git tag
4. 发布到 npm

## 社区

- GitHub Discussions: 讨论想法
- GitHub Issues: Bug 和功能请求
- Twitter: [@daocode](https://twitter.com/daocode)

## 行为准则

- 保持友善和专业
- 尊重不同观点
- 接受建设性批评
- 关注最佳用户体验

## License

通过贡献代码，你同意你的贡献将采用 MIT License。
