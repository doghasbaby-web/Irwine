# Usage Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` and create a `.env` file:

```bash
cp .env.example .env
```

Edit the `.env` file and fill in your API Keys:

```env
# At least one API Key is required
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
GOOGLE_API_KEY=xxxxx

# Optional configuration
DEFAULT_MODEL_PROVIDER=anthropic
ENABLE_THREE_AGENT_MODE=true
DEBATE_ROUNDS=3
```

### 3. Run the Program

#### Development Mode

```bash
npm run dev
```

#### Build and Run

```bash
npm run build
npm start
```

## Usage Modes

### Interactive Mode (Recommended)

Experience the complete three-agent collaborative workflow:

```bash
dao-code interactive
# or
dao-code i
```

This mode will guide you through:
1. Input requirements
2. Watch three Agents debate
3. Select the best solution
4. Three Agents collaborate on coding
5. Get the final code

### Requirements Clarification Mode

Run only the requirements clarification stage to produce technical solutions:

```bash
dao-code clarify
# or
dao-code c
```

Suitable scenarios:
- Technical selection in early project stages
- Need multi-perspective solution evaluation
- Want to watch AI debate process

### Menu Mode

Display main menu, can execute different operations multiple times:

```bash
dao-code menu
# or
dao-code m
```

### Default Mode

Running directly will display the options menu:

```bash
dao-code
```

## Detailed Workflow

### Stage One: Requirements Clarification

Three Agents engage in in-depth debate:

1. **Round One**
   - Proposer: Proposes 2-3 preliminary solutions
   - Challenger: Questions issues with each solution
   - Judge: Records key points

2. **Round Two**
   - Proposer: Refines solutions, responds to challenges
   - Challenger: Continues to dig into potential risks
   - Judge: Comprehensive analysis

3. **Round Three** (Final Round)
   - Proposer: Final optimization
   - Challenger: Final check
   - Judge: Produces 3 best solutions for selection

### Stage Two: Coding Collaboration

Three Agents adopt extreme programming mode:

1. **Round One**
   - Agent A writes code
   - Agent B reviews in real-time
   - Agent C quality checks

2. **Subsequent Rounds** (if needed)
   - Role rotation: A → B → C → A
   - Improve code based on previous round issues
   - Until passing inspection or reaching maximum rounds

## Custom Configuration

### Selecting Different AI Models

You can customize models used by the three Agents at startup:

```bash
dao-code interactive
# The program will ask: Customize models for the three Agents?
# Select Yes, then choose a model for each role
```

Recommended combinations:

**Innovation Priority**
- Proposer: Claude (deep understanding)
- Challenger: GPT-4 (rigorous logic)
- Judge: Gemini (multi-perspective analysis)

**Stability Priority**
- Proposer: GPT-4 (engineering practices)
- Challenger: Claude (code quality)
- Judge: GPT-4 (decision-making ability)

**Cost Priority**
- All using Gemini (high cost-effectiveness)

### Adjusting Debate Rounds

Set in `.env`:

```env
DEBATE_ROUNDS=5  # More in-depth debate
```

## Usage Examples

### Example 1: Implementing User Authentication System

```
Requirement: Implement a JWT authentication middleware with token refresh support

Debate Results (Three Solutions):
1. Express middleware + Redis caching
2. Stateless JWT + short-term tokens
3. JWT + Refresh Token dual token mechanism

Selection: Solution 3

Coding Results:
- Generated complete authentication middleware code
- Includes error handling and security measures
- Passed three rounds of code review
```

### Example 2: Database Design

```
Requirement: Design order table structure for e-commerce system

Debate Results:
1. Single table design (simple but poor extensibility)
2. Order main table + order detail table (classic solution)
3. Event sourcing pattern (advanced but complex)

Selection: Solution 2

Coding Results:
- Complete table structure SQL
- Includes indexes and constraints
- Considered performance optimization
```

## Best Practices

### 1. Clearly Describe Requirements

❌ Poor requirement:
```
Write a login function
```

✅ Good requirement:
```
Implement a JWT-based user login system, requiring:
- Support email and password login
- Password encrypted with bcrypt
- JWT token validity period of 7 days
- Need to consider security (prevent brute force attacks, etc.)
```

### 2. Focus on the Debate Process

Don't skip the debate and go straight to the results. The questions and discussions during the debate process often discover important issues.

### 3. Rationally Select Solutions

Don't always choose the "most advanced" solution. Select based on actual project circumstances:
- Team skill level
- Time budget
- Maintenance cost

### 4. Subsequent Code Adjustments

Generated code is a starting point, not an endpoint. Adjust based on actual project needs:
- Add project-specific error handling
- Integrate into existing codebase
- Add tests

## Troubleshooting

### API Key Issues

**Error**: `API key is required for anthropic`

**Solution**:
1. Check if `.env` file exists
2. Confirm API Key format is correct
3. Restart the program

### Network Issues

**Error**: `API request failed`

**Solution**:
1. Check network connection
2. Confirm API service availability
3. Consider using a proxy

### Model Quota

**Error**: `Rate limit exceeded`

**Solution**:
1. Wait a while before retrying
2. Switch to another model
3. Upgrade API account

## Advanced Techniques

### 1. Save Debate History

You can redirect output to a file:

```bash
dao-code clarify > debate-log.txt
```

### 2. Batch Processing

Write scripts to batch process multiple requirements (future feature)

### 3. IDE Integration

Use as VS Code extension (future feature)

## Feedback and Support

- Submit Issue: [GitHub Issues](https://github.com/your-repo/dao-code/issues)
- Feature Suggestions: Welcome to submit PR
- Discussion: Join our community
