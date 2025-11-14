/**
 * OpenAI GPT model client with Codex functionality
 */

import OpenAI from 'openai';
import { BaseModelClient } from './base.js';
import {
  Message,
  ModelProvider,
  CodeCompletionRequest,
  CodeCompletionResponse,
  CodeExplanationRequest,
  CodeExplanationResponse,
  CodeEmbeddingRequest,
  CodeEmbeddingResponse,
  CodeReviewRequest,
  CodeReviewResponse,
  CodeInsertRequest,
  CodeInsertResponse,
  CodeIssue
} from '../types/index.js';

export class OpenAIClient extends BaseModelClient {
  provider = ModelProvider.OPENAI as const;
  private client: OpenAI;

  constructor(apiKey: string, modelName: string = 'gpt-4-turbo') {
    super(apiKey, modelName);
    this.client = new OpenAI({ apiKey });
  }

  async generateResponse(messages: Message[], config?: any): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        max_tokens: config?.maxTokens || 4096,
        temperature: config?.temperature || 1.0,
        messages: this.convertMessages(messages)
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.handleError(error, 'generateResponse');
    }
  }

  async *streamResponse(messages: Message[], config?: any): AsyncGenerator<string> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.modelName,
        max_tokens: config?.maxTokens || 4096,
        temperature: config?.temperature || 1.0,
        messages: this.convertMessages(messages),
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      this.handleError(error, 'streamResponse');
    }
  }

  /**
   * =====================================================
   * OpenAI Codex Functions - Top 5 Popular Capabilities
   * =====================================================
   */

  /**
   * 1. CODE COMPLETION with suffix/prefix support
   * Complete code given prefix (before cursor) and optional suffix (after cursor)
   * This is the most popular Codex feature for IDE autocomplete
   */
  async completeCode(request: CodeCompletionRequest): Promise<CodeCompletionResponse> {
    try {
      const systemPrompt = `You are an expert code completion assistant. Complete the code based on the prefix${
        request.suffix ? ' and suffix context' : ''
      }. ${request.language ? `Language: ${request.language}.` : ''} Provide only the completion, no explanations.`;

      const userPrompt = request.suffix
        ? `Complete the code between PREFIX and SUFFIX:\n\nPREFIX:\n${request.prompt}\n\n[COMPLETE HERE]\n\nSUFFIX:\n${request.suffix}`
        : `Complete this code:\n${request.prompt}`;

      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: request.maxTokens || 512,
        temperature: request.temperature || 0.2, // Lower temp for more predictable completions
        stop: request.stopSequences
      });

      const completion = response.choices[0]?.message?.content || '';

      return {
        completion: completion.trim(),
        finishReason: (response.choices[0]?.finish_reason as any) || 'stop',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      this.handleError(error, 'completeCode');
    }
  }

  /**
   * 2. CODE EDITING with INSERT (suffix/prefix)
   * Insert code at a specific position with full context awareness
   * Used for intelligent code insertion and refactoring
   */
  async insertCode(request: CodeInsertRequest): Promise<CodeInsertResponse> {
    try {
      const systemPrompt = `You are an expert code editor. ${
        request.language ? `Language: ${request.language}. ` : ''
      }Insert appropriate code between the prefix and suffix to make the code complete and functional.`;

      const userPrompt = `Insert code between PREFIX and SUFFIX:

PREFIX:
${request.prefix}

[INSERT CODE HERE]${request.instruction ? `\nInstruction: ${request.instruction}` : ''}

SUFFIX:
${request.suffix}

Provide ONLY the code to insert, nothing else.`;

      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: request.maxTokens || 1024,
        temperature: 0.3
      });

      const insertedCode = response.choices[0]?.message?.content?.trim() || '';
      const fullCode = request.prefix + insertedCode + request.suffix;

      return {
        insertedCode,
        fullCode,
        explanation: request.instruction
          ? `Inserted code to ${request.instruction}`
          : 'Code inserted successfully'
      };
    } catch (error) {
      this.handleError(error, 'insertCode');
    }
  }

  /**
   * 3. CODE EXPLANATION
   * Explain code in natural language at different detail levels
   * Essential for code documentation and learning
   */
  async explainCode(request: CodeExplanationRequest): Promise<CodeExplanationResponse> {
    try {
      const detailInstructions = {
        brief: 'Provide a concise 2-3 sentence explanation.',
        detailed: 'Provide a comprehensive explanation with examples.',
        expert: 'Provide an expert-level analysis including time/space complexity, design patterns, and optimization opportunities.'
      };

      const focusText = request.focusAreas?.length
        ? `Focus specifically on: ${request.focusAreas.join(', ')}.`
        : '';

      const systemPrompt = `You are an expert code analyst. ${
        request.language ? `Language: ${request.language}. ` : ''
      }${detailInstructions[request.detailLevel || 'detailed']} ${focusText}`;

      const userPrompt = `Explain this code:\n\n\`\`\`\n${request.code}\n\`\`\`\n\nProvide your response in this JSON format:
{
  "explanation": "main explanation text",
  "keyPoints": ["point 1", "point 2", ...],
  "complexity": "complexity analysis",
  "suggestions": ["suggestion 1", "suggestion 2", ...]
}`;

      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2048,
        temperature: 0.4,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      return {
        explanation: parsed.explanation || 'No explanation available',
        keyPoints: parsed.keyPoints || [],
        complexity: parsed.complexity || 'Not analyzed',
        suggestions: parsed.suggestions || []
      };
    } catch (error) {
      this.handleError(error, 'explainCode');
    }
  }

  /**
   * 4. CODE EMBEDDINGS for semantic search
   * Generate vector embeddings for code semantic search and similarity
   * Used for intelligent code search, duplicate detection, and RAG systems
   */
  async generateCodeEmbedding(request: CodeEmbeddingRequest): Promise<CodeEmbeddingResponse> {
    try {
      // Use OpenAI's text-embedding-3-small for code
      // It's optimized for both text and code and is cost-effective
      const embeddingModel = 'text-embedding-3-small';

      const codeText = request.language
        ? `${request.language}\n${request.code}`
        : request.code;

      const response = await this.client.embeddings.create({
        model: embeddingModel,
        input: codeText,
        encoding_format: 'float'
      });

      let embedding = response.data[0]?.embedding || [];

      // Normalize to unit length if requested (for cosine similarity)
      if (request.normalize && embedding.length > 0) {
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        embedding = embedding.map(val => val / magnitude);
      }

      return {
        embedding,
        dimensions: embedding.length,
        model: embeddingModel
      };
    } catch (error) {
      this.handleError(error, 'generateCodeEmbedding');
    }
  }

  /**
   * 5. CODE REVIEW and BUG DETECTION
   * Automated code review with security, performance, and style analysis
   * Essential for maintaining code quality and catching bugs early
   */
  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResponse> {
    try {
      const reviewTypeInstructions = {
        security: 'Focus on security vulnerabilities, injection risks, authentication/authorization issues, and data exposure.',
        performance: 'Focus on performance bottlenecks, algorithmic complexity, memory leaks, and optimization opportunities.',
        style: 'Focus on code style, naming conventions, readability, and best practices.',
        comprehensive: 'Perform a comprehensive review covering security, performance, style, logic, and maintainability.'
      };

      const severityFilter = request.severity !== 'all'
        ? `Report only ${request.severity} and above severity issues.`
        : '';

      const systemPrompt = `You are an expert code reviewer. ${
        request.language ? `Language: ${request.language}. ` : ''
      }${reviewTypeInstructions[request.reviewType || 'comprehensive']} ${severityFilter}`;

      const userPrompt = `Review this code and identify issues:\n\n\`\`\`\n${request.code}\n\`\`\`\n\nProvide your response in this JSON format:
{
  "overallAssessment": "summary of code quality",
  "score": 85,
  "issues": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "security|performance|style|logic|maintainability",
      "message": "issue description",
      "line": 10,
      "snippet": "problematic code",
      "fix": "suggested fix"
    }
  ],
  "suggestions": ["general improvement 1", "general improvement 2"]
}`;

      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 3072,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      // Filter issues by severity if specified
      let issues: CodeIssue[] = parsed.issues || [];
      if (request.severity && request.severity !== 'all') {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
        const minSeverity = severityOrder[request.severity];
        issues = issues.filter(
          issue => severityOrder[issue.severity] >= minSeverity
        );
      }

      return {
        overallAssessment: parsed.overallAssessment || 'No assessment available',
        issues,
        suggestions: parsed.suggestions || [],
        score: parsed.score || undefined
      };
    } catch (error) {
      this.handleError(error, 'reviewCode');
    }
  }
}
