# Dao Sheng San (Dao Code) - Three-Agent AI Coding Assistant

> "Tao gives birth to One, One gives birth to Two, Two gives birth to Three, Three gives birth to all things" - Tao Te Ching

A revolutionary AI programming assistant that achieves smarter and more reliable code generation through the collaborative work of three AI Agents.

## Core Philosophy

In traditional single-agent AI programming tools, AI may fall into thought patterns or biases. Dao Sheng San introduces three independent AI Agents that think about problems from different perspectives:

- **Proposer Agent**: Proposes innovative solutions
- **Challenger Agent**: Challenges assumptions and discovers problems
- **Judge Agent**: Synthesizes analysis and makes decisions

## Three Working Modes

### 1. Requirements Clarification Stage - AI Debate

At the beginning of a project, three Agents engage in in-depth debate:
- **Proposer (PROPOSER)**: Proposes 2-3 innovative and feasible technical solutions
- **Challenger (CHALLENGER)**: Questions solutions from security, performance, and maintainability perspectives
- **Judge (JUDGE)**: Synthesizes both perspectives and produces 3 best solutions after thorough debate

**Three-Round Debate Mechanism**:
1. Round 1: Proposer presents → Challenger questions
2. Round 2: Proposer refines → Challenger conducts deep analysis
3. Round 3: Proposer final solution → Challenger summary → Judge comprehensive evaluation

Users select the most suitable solution from the 3 options provided by the Judge to enter the coding phase.

### 2. Coding Collaboration Stage - Extreme Programming

Three Agents adopt pair programming mode, **roles automatically rotate after each iteration**:

**Iteration 1**:
- Writer: Agent A writes code
- Reviewer: Agent B reviews in real-time and provides improvement suggestions
- Inspector: Agent C conducts quality control and decides to pass/reject

**Iteration 2** (role rotation):
- Writer: Agent B (previous reviewer)
- Reviewer: Agent C (previous inspector)
- Inspector: Agent A (previous writer)

**Iteration 3** (rotation again):
- Writer: Agent C
- Reviewer: Agent A
- Inspector: Agent B

**Three-Option Mechanism for Uncertainty**:
When encountering complex decisions, the system lets three Agents propose implementation plans separately, generating 3 options for users to choose from.

### 3. Multi-Model Support - Three Minds United

Supports rotation of three major AI models in different roles:
- **ChatGPT (OpenAI)**: Rigorous logic, strong engineering practices
- **Claude (Anthropic)**: Deep understanding, high code quality
- **Gemini (Google)**: Multimodal capability, innovative thinking

Each model can serve as Proposer, Challenger, or Judge. Through role rotation, the strengths of different AIs complement each other.

## Quick Start

### Installation

```bash
npm install -g dao-code
```

### Configuration

Create a `.env` file and configure API Keys:

```bash
cp .env.example .env
# Edit the .env file and fill in your API Keys
```

### Usage

```bash
# Start requirements clarification mode
dao-code clarify "Implement a user authentication system"

# Start coding collaboration mode
dao-code code "Add JWT authentication middleware"

# Interactive mode
dao-code interactive
```

## Workflow

```
User Requirements
    ↓
Requirements Clarification (Debate Mode)
    ↓
Solution Selection (User Decision)
    ↓
Coding Collaboration (Pair Programming)
    ↓
Code Review (Three-Party Verification)
    ↓
Completion and Delivery
```

## Project Structure

```
dao-code/
├── src/
│   ├── agents/           # Agent implementation
│   │   ├── base.ts       # Agent base class
│   │   ├── coordinator.ts # Agent coordinator
│   │   └── roles.ts      # Role definitions
│   ├── models/           # AI model interfaces
│   │   ├── anthropic.ts  # Claude
│   │   ├── openai.ts     # ChatGPT
│   │   └── google.ts     # Gemini
│   ├── stages/           # Work stages
│   │   ├── clarification.ts  # Requirements clarification
│   │   └── coding.ts         # Coding collaboration
│   ├── cli.ts            # CLI entry point
│   └── index.ts          # Main entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Technical Features

- ✅ TypeScript full-stack type safety
- ✅ Support for three major mainstream AI models
- ✅ Modular architecture, easy to extend
- ✅ Complete error handling and logging system
- ✅ Beautiful CLI interactive interface

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Test
npm test
```

## Visual Testing Feature

Dao Sheng San supports visual browser testing for demonstrating and debugging web applications in a sandbox environment.

### Enable Visual Testing

Set in `.env` file:

```bash
VISUAL_TEST=Yes
```

### Features

When visual testing is enabled, after the sandbox starts it will automatically:

1. Launch Chrome browser (visible mode)
2. Execute test steps sequentially
3. 2-second delay between steps for observation
4. Automatically save screenshots of the testing process
5. Display detailed test logs

### Test Steps

Default demo test includes the following steps:

1. Navigate to example webpage
2. Take screenshot and save current page
3. Get page title
4. Find page elements
5. Execute JavaScript code
6. Save final screenshot

### Requirements

Visual testing feature uses Playwright and requires:

- Node.js >= 18.0.0
- Playwright browsers (auto-installed)

For first-time use, run the following command to install browsers:

```bash
npx playwright install chromium
```

### Custom Testing

You can also use the `VisualTester` class in your code to create custom tests:

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

### Notes

- Visual testing will open a real browser window
- Please do not minimize or close the browser window during testing
- Screenshot files will be saved in the project root directory
- If visual testing is not needed, keep `VISUAL_TEST=No`

## License

MIT
