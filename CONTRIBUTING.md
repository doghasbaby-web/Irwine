# Contributing Guide

Thank you for your interest in the Dao Sheng San project! We welcome contributions of all kinds.

## How to Contribute

### Reporting Bugs

Before submitting a bug report, please:

1. Check if there's already an existing Issue
2. Verify the problem still exists in the latest version
3. Provide detailed reproduction steps

When creating an Issue, please include:
- Environment information (OS, Node.js version, etc.)
- Reproduction steps
- Expected behavior
- Actual behavior
- Error logs

### Suggesting Features

We welcome new feature suggestions! Please describe in the Issue:
- Use case for the feature
- Expected behavior
- Possible implementation approaches
- Alternative solutions

### Pull Request Process

1. **Fork the Repository**

```bash
git clone https://github.com/your-username/dao-code.git
cd dao-code
```

2. **Create a Branch**

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

3. **Development**

```bash
# Install dependencies
npm install

# Development
npm run dev

# Test
npm test

# Build
npm run build
```

4. **Commit Code**

```bash
git add .
git commit -m "feat: add new feature"
```

Commit message format:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation update
- `style:` Code formatting (doesn't affect functionality)
- `refactor:` Refactoring
- `test:` Testing
- `chore:` Build/tooling

5. **Push and Create PR**

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

### Code Standards

#### TypeScript

- Use TypeScript strict mode
- All public APIs must have type definitions
- Avoid using `any`

#### Code Style

```typescript
// ✓ Good
export async function processData(input: string): Promise<Result> {
  const validated = validateInput(input);
  return await performProcess(validated);
}

// ✗ Bad
export async function processData(input: any) {
  return await performProcess(input);
}
```

#### Comments

Add comments for complex logic:

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

#### Testing

- All new features must have tests
- Bug fixes should include regression tests
- Maintain test coverage > 80%

```typescript
describe('ThreeAgentCoordinator', () => {
  it('should rotate roles correctly', () => {
    // Test code
  });
});
```

## Development Guide

### Project Structure

```
src/
├── agents/          # Agent implementation
├── models/          # AI model clients
├── stages/          # Work stages
├── ui/              # User interface
├── types/           # Type definitions
├── config.ts        # Configuration
├── index.ts         # Main entry point
└── cli.ts           # CLI entry point
```

### Adding a New AI Model

1. Create a new client class in `src/models/`
2. Implement the `AIModelClient` interface
3. Register in `ModelFactory`
4. Update type definitions
5. Add documentation and tests

### Adding a New Agent Role

1. Add new role in `types/index.ts`
2. Define system prompts in `agents/prompts.ts`
3. Update `ThreeAgentCoordinator`
4. Add tests

### Adding a New Work Stage

1. Create new stage class in `src/stages/`
2. Implement core logic
3. Integrate in `DaoCodeApp`
4. Add CLI command
5. Update documentation

## Release Process

Maintainers will handle version releases with the following process:

1. Update version number (package.json)
2. Update CHANGELOG
3. Create Git tag
4. Publish to npm

## Community

- GitHub Discussions: Discuss ideas
- GitHub Issues: Bugs and feature requests
- Twitter: [@daocode](https://twitter.com/daocode)

## Code of Conduct

- Be friendly and professional
- Respect different viewpoints
- Accept constructive criticism
- Focus on the best user experience

## License

By contributing code, you agree that your contributions will be licensed under the MIT License.
