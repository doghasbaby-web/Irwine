# OpenAI Codex Functions Integration

This document describes the **Top 5 most popular OpenAI Codex functions** that have been integrated into the Dao Code (Dao Sheng San) system.

## Overview

OpenAI Codex is a powerful AI system that translates natural language into code and provides advanced code manipulation capabilities. Based on extensive research and analysis of Codex usage patterns, we've implemented the five most popular and essential functions.

## The Top 5 Codex Functions

### 1. 🔮 Code Completion (with Suffix/Prefix Support)

**Function:** `completeCode(request: CodeCompletionRequest)`

**Description:** Intelligent code completion that understands both prefix (code before cursor) and suffix (code after cursor) context. This is the most popular Codex feature, powering IDE autocomplete functionality.

**Use Cases:**
- IDE autocomplete
- Smart code suggestions
- Context-aware code generation
- Real-time coding assistance

**Example:**
```typescript
const result = await openAIClient.completeCode({
  prompt: 'function calculateSum(a, b) {',
  suffix: '}\n\nconsole.log(calculateSum(5, 3));',
  language: 'javascript',
  maxTokens: 256,
  temperature: 0.2
});

console.log(result.completion); // "  return a + b;"
```

**Features:**
- Context-aware completion using both prefix and suffix
- Language-specific optimization
- Configurable token limits and temperature
- Custom stop sequences support

---

### 2. ✂️ Code Editing with Insert (Suffix/Prefix)

**Function:** `insertCode(request: CodeInsertRequest)`

**Description:** Inserts code at a specific position while maintaining full context awareness of surrounding code. Essential for refactoring and adding functionality mid-code.

**Use Cases:**
- Intelligent code insertion
- Refactoring operations
- Adding methods/functions in existing classes
- Context-aware code modifications

**Example:**
```typescript
const result = await openAIClient.insertCode({
  prefix: 'class DataProcessor {\n  constructor() {\n',
  suffix: '\n  }\n\n  process(data) {\n    return data;\n  }\n}',
  instruction: 'add validation middleware',
  language: 'typescript',
  maxTokens: 512
});

console.log(result.insertedCode);
console.log(result.fullCode); // Complete code with insertion
```

**Features:**
- Maintains code coherence across prefix and suffix
- Custom instruction support
- Returns both inserted code and full result
- Language-aware formatting

---

### 3. 📖 Code Explanation

**Function:** `explainCode(request: CodeExplanationRequest)`

**Description:** Explains code in natural language with multiple detail levels. Perfect for documentation, learning, and code reviews.

**Use Cases:**
- Automated documentation generation
- Code learning and education
- Legacy code understanding
- Technical debt assessment

**Example:**
```typescript
const result = await openAIClient.explainCode({
  code: complexAlgorithm,
  language: 'python',
  detailLevel: 'expert',
  focusAreas: ['performance', 'security']
});

console.log(result.explanation);
console.log(result.keyPoints);      // Structured key insights
console.log(result.complexity);     // Complexity analysis
console.log(result.suggestions);    // Optimization suggestions
```

**Features:**
- Three detail levels: brief, detailed, expert
- Focus area filtering (performance, security, etc.)
- Complexity analysis
- Actionable improvement suggestions
- Structured JSON output

---

### 4. 🔍 Code Embeddings (Semantic Search)

**Function:** `generateCodeEmbedding(request: CodeEmbeddingRequest)`

**Description:** Generates vector embeddings for code, enabling semantic search, similarity analysis, and duplicate detection. Uses OpenAI's `text-embedding-3-small` model optimized for code.

**Use Cases:**
- Semantic code search across large codebases
- Duplicate code detection
- Code similarity analysis
- RAG (Retrieval-Augmented Generation) systems
- Intelligent code recommendations

**Example:**
```typescript
const embedding = await openAIClient.generateCodeEmbedding({
  code: functionCode,
  language: 'javascript',
  normalize: true  // For cosine similarity
});

console.log(embedding.dimensions);  // 1536
console.log(embedding.embedding);   // Float array

// Calculate similarity between two code snippets
const similarity = cosineSimilarity(embedding1, embedding2);
```

**Features:**
- High-dimensional vector representations (1536 dimensions)
- Normalization support for cosine similarity
- Language-aware embeddings
- Cost-effective model selection
- Compatible with vector databases

---

### 5. 🔒 Code Review & Bug Detection

**Function:** `reviewCode(request: CodeReviewRequest)`

**Description:** Automated comprehensive code review covering security, performance, style, and logic. Identifies bugs, vulnerabilities, and provides actionable fixes.

**Use Cases:**
- Automated security audits
- Performance optimization
- Style compliance checking
- Pre-commit quality gates
- Technical debt identification

**Example:**
```typescript
const review = await openAIClient.reviewCode({
  code: sourceCode,
  language: 'typescript',
  reviewType: 'comprehensive',  // or 'security', 'performance', 'style'
  severity: 'high'  // Filter by severity
});

console.log(review.overallAssessment);
console.log(review.score);  // Quality score 0-100

review.issues.forEach(issue => {
  console.log(`[${issue.severity}] ${issue.category}: ${issue.message}`);
  console.log(`Fix: ${issue.fix}`);
});
```

**Features:**
- Multiple review types: security, performance, style, comprehensive
- Severity-based filtering (critical, high, medium, low, info)
- Issue categorization (security, performance, style, logic, maintainability)
- Line-specific issue reporting
- Suggested fixes for each issue
- Overall quality scoring

---

## Implementation Details

### Architecture

All five functions are implemented in `/src/models/openai.ts` as methods of the `OpenAIClient` class:

```typescript
export class OpenAIClient extends BaseModelClient {
  // Existing methods
  async generateResponse(messages: Message[], config?: any): Promise<string>
  async *streamResponse(messages: Message[], config?: any): AsyncGenerator<string>

  // New Codex functions
  async completeCode(request: CodeCompletionRequest): Promise<CodeCompletionResponse>
  async insertCode(request: CodeInsertRequest): Promise<CodeInsertResponse>
  async explainCode(request: CodeExplanationRequest): Promise<CodeExplanationResponse>
  async generateCodeEmbedding(request: CodeEmbeddingRequest): Promise<CodeEmbeddingResponse>
  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResponse>
}
```

### Type Definitions

All request/response types are defined in `/src/types/index.ts`:

- `CodeCompletionRequest` / `CodeCompletionResponse`
- `CodeInsertRequest` / `CodeInsertResponse`
- `CodeExplanationRequest` / `CodeExplanationResponse`
- `CodeEmbeddingRequest` / `CodeEmbeddingResponse`
- `CodeReviewRequest` / `CodeReviewResponse`
- `CodeIssue` (supporting type for code review)

### Models Used

| Function | Model | Why |
|----------|-------|-----|
| Code Completion | gpt-4-turbo | Best instruction following, low temp (0.2) |
| Code Insert | gpt-4-turbo | Context awareness, medium temp (0.3) |
| Code Explanation | gpt-4-turbo | JSON mode for structured output |
| Code Embeddings | text-embedding-3-small | Cost-effective, optimized for code |
| Code Review | gpt-4-turbo | Comprehensive analysis, JSON mode |

### Error Handling

All functions use the base class error handling with retry logic:

- Automatic retry with exponential backoff
- Detailed error context
- Provider-specific error messages

## Usage Examples

See `/examples/codex-usage.ts` for comprehensive examples of all five functions.

Run the examples:

```bash
npm run build
node dist/examples/codex-usage.js
```

## Integration with Dao Code System

These Codex functions integrate seamlessly with the existing Three-Agent system:

1. **Debate Mode**: Agents can use code explanation to clarify requirements
2. **Coding Mode**: Agents can use code completion and insertion for generation
3. **Review Mode**: Agents can use code review for quality assurance
4. **Semantic Search**: Code embeddings enable intelligent code retrieval

## Performance Considerations

### Token Usage

- **Code Completion**: ~200-500 tokens per request
- **Code Insert**: ~500-1000 tokens per request
- **Code Explanation**: ~1000-2000 tokens per request
- **Code Embeddings**: Fixed cost per embedding
- **Code Review**: ~2000-3000 tokens per request

### Optimization Tips

1. **Code Completion**: Use lower temperature (0.2) for deterministic results
2. **Code Insert**: Keep prefix/suffix concise but informative
3. **Code Explanation**: Choose appropriate detail level to save tokens
4. **Code Embeddings**: Batch requests when generating embeddings for multiple files
5. **Code Review**: Filter by severity to reduce output size

## API Pricing (as of 2025)

- **GPT-4 Turbo**: $10/1M input tokens, $30/1M output tokens
- **text-embedding-3-small**: $0.02/1M tokens
- **Prompt Caching**: 75% discount on cached prompts

## Comparison with Original Codex API

| Feature | Original Codex | This Implementation |
|---------|---------------|---------------------|
| Completions | `/v1/completions` (deprecated) | Chat completions with prompts |
| Insert Mode | Native suffix/prefix params | Simulated via chat |
| Embeddings | Separate models | text-embedding-3-small |
| Code Review | Not available | GPT-4 + structured output |
| JSON Output | Not guaranteed | JSON mode enforced |

## Future Enhancements

Potential additions based on community feedback:

1. **Streaming Support**: Stream code completions for real-time display
2. **Fine-tuning**: Custom models for specific codebases
3. **Multi-file Context**: Analyze multiple files simultaneously
4. **Code Translation**: Convert between programming languages
5. **Test Generation**: Automatic unit test creation

## References

- [OpenAI Codex Documentation](https://platform.openai.com/docs/guides/code)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [GPT-4 Turbo API Reference](https://platform.openai.com/docs/models/gpt-4-turbo)

---

**Last Updated**: 2025-01-14
**Version**: 1.0.0
**Author**: Dao Code (Dao Sheng San) Team
