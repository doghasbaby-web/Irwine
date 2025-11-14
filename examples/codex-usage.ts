/**
 * OpenAI Codex Functions Usage Examples
 *
 * This file demonstrates how to use the 5 most popular OpenAI Codex functions
 * implemented in the Dao Code system.
 */

import { OpenAIClient } from '../src/models/openai.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize OpenAI client
const apiKey = process.env.OPENAI_API_KEY || '';
const client = new OpenAIClient(apiKey, 'gpt-4-turbo');

/**
 * Example 1: Code Completion with Suffix/Prefix
 * Use case: IDE autocomplete, intelligent code suggestions
 */
async function exampleCodeCompletion() {
  console.log('\n=== 1. CODE COMPLETION EXAMPLE ===\n');

  const result = await client.completeCode({
    prompt: 'function calculateFactorial(n) {\n  if (n === 0) return 1;\n  ',
    suffix: '\n}\n\nconsole.log(calculateFactorial(5));',
    language: 'javascript',
    maxTokens: 256,
    temperature: 0.2
  });

  console.log('Completion:', result.completion);
  console.log('Tokens used:', result.usage?.totalTokens);
  console.log('Finish reason:', result.finishReason);
}

/**
 * Example 2: Code Editing with Insert (Suffix/Prefix)
 * Use case: Refactoring, adding functionality in the middle of code
 */
async function exampleCodeInsert() {
  console.log('\n=== 2. CODE INSERT EXAMPLE ===\n');

  const result = await client.insertCode({
    prefix: `class UserManager {
  constructor() {
    this.users = [];
  }

  // INSERT ERROR HANDLING HERE
`,
    suffix: `

  getUser(id) {
    return this.users.find(u => u.id === id);
  }
}`,
    instruction: 'add error handling middleware method',
    language: 'typescript',
    maxTokens: 512
  });

  console.log('Inserted code:', result.insertedCode);
  console.log('\nFull code preview:');
  console.log(result.fullCode);
}

/**
 * Example 3: Code Explanation
 * Use case: Documentation, learning, code reviews
 */
async function exampleCodeExplanation() {
  console.log('\n=== 3. CODE EXPLANATION EXAMPLE ===\n');

  const complexCode = `
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}`;

  const result = await client.explainCode({
    code: complexCode,
    language: 'javascript',
    detailLevel: 'detailed',
    focusAreas: ['performance', 'use cases']
  });

  console.log('Explanation:', result.explanation);
  console.log('\nKey Points:');
  result.keyPoints.forEach((point, i) => console.log(`  ${i + 1}. ${point}`));
  console.log('\nComplexity:', result.complexity);
  if (result.suggestions?.length) {
    console.log('\nSuggestions:');
    result.suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  }
}

/**
 * Example 4: Code Embeddings for Semantic Search
 * Use case: Code search, duplicate detection, similarity analysis
 */
async function exampleCodeEmbeddings() {
  console.log('\n=== 4. CODE EMBEDDINGS EXAMPLE ===\n');

  const code1 = `
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[0];
  const left = arr.slice(1).filter(x => x < pivot);
  const right = arr.slice(1).filter(x => x >= pivot);
  return [...quickSort(left), pivot, ...quickSort(right)];
}`;

  const code2 = `
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr`;

  const embedding1 = await client.generateCodeEmbedding({
    code: code1,
    language: 'javascript',
    normalize: true
  });

  const embedding2 = await client.generateCodeEmbedding({
    code: code2,
    language: 'python',
    normalize: true
  });

  console.log('Embedding 1 dimensions:', embedding1.dimensions);
  console.log('Embedding 2 dimensions:', embedding2.dimensions);
  console.log('Model used:', embedding1.model);

  // Calculate cosine similarity (since embeddings are normalized)
  const similarity = embedding1.embedding.reduce(
    (sum, val, i) => sum + val * embedding2.embedding[i],
    0
  );
  console.log('Semantic similarity:', (similarity * 100).toFixed(2) + '%');
  console.log('(Both are sorting algorithms, should have high similarity)');
}

/**
 * Example 5: Code Review and Bug Detection
 * Use case: Automated code review, security audits, quality checks
 */
async function exampleCodeReview() {
  console.log('\n=== 5. CODE REVIEW EXAMPLE ===\n');

  const vulnerableCode = `
function getUserData(req, res) {
  const userId = req.query.id;
  const query = "SELECT * FROM users WHERE id = " + userId;

  db.query(query, (err, results) => {
    if (err) throw err;
    res.send(results);
  });
}

function processPayment(amount) {
  // No validation
  const result = creditCard.charge(amount);
  return result;
}`;

  const result = await client.reviewCode({
    code: vulnerableCode,
    language: 'javascript',
    reviewType: 'comprehensive',
    severity: 'all'
  });

  console.log('Overall Assessment:', result.overallAssessment);
  if (result.score) {
    console.log('Quality Score:', result.score + '/100');
  }

  console.log('\nIssues Found:', result.issues.length);
  result.issues.forEach((issue, i) => {
    console.log(`\n${i + 1}. [${issue.severity.toUpperCase()}] ${issue.category}`);
    console.log('   Message:', issue.message);
    if (issue.line) console.log('   Line:', issue.line);
    if (issue.fix) console.log('   Suggested fix:', issue.fix);
  });

  if (result.suggestions.length) {
    console.log('\nGeneral Suggestions:');
    result.suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   OpenAI Codex Functions - Top 5 Popular Capabilities     ║');
    console.log('║   Implemented in Dao Code (道生三)                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    await exampleCodeCompletion();
    await exampleCodeInsert();
    await exampleCodeExplanation();
    await exampleCodeEmbeddings();
    await exampleCodeReview();

    console.log('\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}

export {
  exampleCodeCompletion,
  exampleCodeInsert,
  exampleCodeExplanation,
  exampleCodeEmbeddings,
  exampleCodeReview
};
