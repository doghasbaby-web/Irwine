# 道生三 (Dao Code) - Three-Agent AI Coding Assistant

> "道生一，一生二，二生三，三生万物" - 道德经

一个革命性的 AI 编程助手，通过三个 AI Agent 的协同工作，实现更智能、更可靠的代码生成。

## 核心理念

在传统的单 Agent AI 编程工具中，AI 可能会陷入思维定式或产生偏见。道生三通过引入三个独立的 AI Agent，让它们从不同角度思考问题：

- **正方 Agent**: 提出创新方案
- **反方 Agent**: 挑战假设、发现问题
- **裁判 Agent**: 综合分析、做出决策

## 三大工作模式

### 1. 需求澄清阶段 - AI 辩论赛

在项目开始时，三个 Agent 会进行深度辩论：
- **正方（PROPOSER）**: 提出 2-3 个创新且可行的技术方案
- **反方（CHALLENGER）**: 从安全性、性能、可维护性等角度质疑方案
- **裁判（JUDGE）**: 综合双方观点，产出 3 个经过充分辩论的最佳方案

**三轮辩论机制**：
1. 第 1 轮：正方提案 → 反方质疑
2. 第 2 轮：正方完善 → 反方深度分析
3. 第 3 轮：正方最终方案 → 反方总结 → 裁判综合评判

用户从裁判提供的 3 个方案中选择最合适的一个进入编码阶段。

### 2. 编码协同阶段 - 极限编程

三个 Agent 采用结对编程模式，**每轮迭代后角色自动轮换**：

**迭代 1**：
- 编写者（Writer）: Agent A 编写代码
- 审查者（Reviewer）: Agent B 实时审查，提出改进意见
- 检查者（Inspector）: Agent C 质量把关，决定通过/拒绝

**迭代 2**（角色轮换）：
- 编写者: Agent B（之前的审查者）
- 审查者: Agent C（之前的检查者）
- 检查者: Agent A（之前的编写者）

**迭代 3**（再次轮换）：
- 编写者: Agent C
- 审查者: Agent A
- 检查者: Agent B

**不确定时的三选项机制**：
当遇到复杂决策时，系统会让三个 Agent 分别提出实现方案，生成 3 个选项供用户选择。

### 3. 多模型支持 - 三智合体

支持三大 AI 模型轮换担任不同角色：
- **ChatGPT (OpenAI)**: 逻辑严密，工程实践强
- **Claude (Anthropic)**: 理解深刻，代码质量高
- **Gemini (Google)**: 多模态能力，创新思维

每个模型可以担任正方、反方或裁判，通过角色轮换，让不同 AI 的优势相互补充。

## 快速开始

### 安装

```bash
npm install -g dao-code
```

### 配置

创建 `.env` 文件并配置 API Keys：

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 API Keys
```

### 使用

```bash
# 启动需求澄清模式
dao-code clarify "实现一个用户认证系统"

# 启动编码协同模式
dao-code code "添加 JWT 认证中间件"

# 交互式模式
dao-code interactive
```

## 工作流程

```
用户需求
    ↓
需求澄清（辩论模式）
    ↓
方案选择（用户决策）
    ↓
编码协同（结对编程）
    ↓
代码审查（三方验证）
    ↓
完成交付
```

## 项目结构

```
dao-code/
├── src/
│   ├── agents/           # Agent 实现
│   │   ├── base.ts       # Agent 基类
│   │   ├── coordinator.ts # Agent 协调器
│   │   └── roles.ts      # 角色定义
│   ├── models/           # AI 模型接口
│   │   ├── anthropic.ts  # Claude
│   │   ├── openai.ts     # ChatGPT
│   │   └── google.ts     # Gemini
│   ├── stages/           # 工作阶段
│   │   ├── clarification.ts  # 需求澄清
│   │   └── coding.ts         # 编码协同
│   ├── cli.ts            # CLI 入口
│   └── index.ts          # 主入口
├── package.json
├── tsconfig.json
└── README.md
```

## 技术特点

- ✅ TypeScript 全栈类型安全
- ✅ 支持三大主流 AI 模型
- ✅ 模块化架构，易于扩展
- ✅ 完整的错误处理和日志系统
- ✅ 美观的 CLI 交互界面

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm test
```

## 可视化测试功能

道生三支持可视化浏览器测试，用于在沙箱环境中演示和调试 Web 应用。

### 启用可视化测试

在 `.env` 文件中设置：

```bash
VISUAL_TEST=Yes
```

### 功能特性

当启用可视化测试时，沙箱启动后会自动：

1. 启动 Chrome 浏览器（可见模式）
2. 逐步执行测试步骤
3. 每个步骤之间有 2 秒延迟，便于观察
4. 自动截图保存测试过程
5. 显示详细的测试日志

### 测试步骤

默认演示测试包含以下步骤：

1. 导航到示例网页
2. 截图保存当前页面
3. 获取页面标题
4. 查找页面元素
5. 执行 JavaScript 代码
6. 保存最终截图

### 依赖要求

可视化测试功能使用 Playwright，需要：

- Node.js >= 18.0.0
- Playwright 浏览器（自动安装）

首次使用时，运行以下命令安装浏览器：

```bash
npx playwright install chromium
```

### 自定义测试

你也可以在代码中使用 `VisualTester` 类创建自定义测试：

```typescript
import { VisualTester } from './utils/visualTest.js';

const tester = new VisualTester({
  headless: false,
  slowMo: 500,
  stepDelay: 2000,
});

await tester.initialize();
await tester.runCustomTest('https://your-app.com');
await tester.close();
```

### 注意事项

- 可视化测试会打开真实的浏览器窗口
- 测试过程中请勿最小化或关闭浏览器窗口
- 截图文件会保存在项目根目录
- 如不需要可视化测试，保持 `VISUAL_TEST=No` 即可

## License

MIT
