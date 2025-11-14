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
- 正方提出多个可行方案
- 反方质疑每个方案的潜在问题
- 裁判总结利弊，产出 3 个最佳方案供用户选择

### 2. 编码协同阶段 - 极限编程

三个 Agent 采用结对编程模式：
- Agent A: 编写代码
- Agent B: 实时审查
- Agent C: 质量把关

每轮结束后角色轮换，确保代码质量的同时保持创意。

### 3. 多模型支持 - 三智合体

支持三大 AI 模型轮换担任不同角色：
- **ChatGPT (OpenAI)**: 逻辑严密，工程实践强
- **Claude (Anthropic)**: 理解深刻，代码质量高
- **Gemini (Google)**: 多模态能力，创新思维

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

## License

MIT
