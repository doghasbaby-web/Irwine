/**
 * Operation File Loader
 *
 * Utility functions for loading and parsing operation files for visual tests
 */

import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { displayError, displayInfo, displayWarning } from '../ui/display.js';
import type {
  OperationFile,
  Operation,
  OperationType,
  OperationInput,
  TestExecutionResult,
  OperationResult
} from '../types/operation.js';

/**
 * Load an operation file from disk
 */
export async function loadOperationFile(filePath: string): Promise<OperationFile | null> {
  try {
    const absolutePath = resolve(filePath);
    displayInfo(`Loading operation file: ${absolutePath}`);

    const fileContent = await readFile(absolutePath, 'utf-8');
    const operationFile: OperationFile = JSON.parse(fileContent);

    // Validate the operation file
    if (!validateOperationFile(operationFile)) {
      displayError(new Error('Invalid operation file format'));
      return null;
    }

    displayInfo(`Operation file loaded successfully: ${operationFile.name}`);
    return operationFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      displayError(new Error(`Operation file not found: ${filePath}`));
    } else if (error instanceof SyntaxError) {
      displayError(new Error(`Invalid JSON in operation file: ${error.message}`));
    } else {
      displayError(error as Error);
    }
    return null;
  }
}

/**
 * Validate operation file structure
 */
export function validateOperationFile(file: any): file is OperationFile {
  if (!file || typeof file !== 'object') {
    displayError(new Error('Operation file must be a valid JSON object'));
    return false;
  }

  if (!file.name || typeof file.name !== 'string') {
    displayError(new Error('Operation file must have a "name" field'));
    return false;
  }

  if (!file.version || typeof file.version !== 'string') {
    displayError(new Error('Operation file must have a "version" field'));
    return false;
  }

  if (!file.operations || !Array.isArray(file.operations)) {
    displayError(new Error('Operation file must have an "operations" array'));
    return false;
  }

  if (file.operations.length === 0) {
    displayWarning('Operation file has no operations defined');
  }

  // Validate each operation
  for (let i = 0; i < file.operations.length; i++) {
    const op = file.operations[i];
    if (!validateOperation(op, i)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate a single operation
 */
export function validateOperation(operation: any, index: number): operation is Operation {
  if (!operation || typeof operation !== 'object') {
    displayError(new Error(`Operation at index ${index} is not a valid object`));
    return false;
  }

  if (typeof operation.step !== 'number') {
    displayError(new Error(`Operation at index ${index} must have a numeric "step" field`));
    return false;
  }

  if (!operation.description || typeof operation.description !== 'string') {
    displayError(new Error(`Operation at index ${index} must have a "description" field`));
    return false;
  }

  if (!operation.type || typeof operation.type !== 'string') {
    displayError(new Error(`Operation at index ${index} must have a "type" field`));
    return false;
  }

  const validTypes: OperationType[] = [
    'navigate', 'click', 'type', 'select', 'wait', 'screenshot',
    'scroll', 'hover', 'verify', 'clear', 'press', 'upload'
  ];

  if (!validTypes.includes(operation.type as OperationType)) {
    displayError(
      new Error(`Operation at index ${index} has invalid type: ${operation.type}. Valid types: ${validTypes.join(', ')}`)
    );
    return false;
  }

  return true;
}

/**
 * Get all operations including setup and cleanup
 */
export function getAllOperations(file: OperationFile): { phase: 'setup' | 'main' | 'cleanup'; operation: Operation }[] {
  const allOps: { phase: 'setup' | 'main' | 'cleanup'; operation: Operation }[] = [];

  if (file.setup) {
    file.setup.forEach(op => allOps.push({ phase: 'setup', operation: op }));
  }

  file.operations.forEach(op => allOps.push({ phase: 'main', operation: op }));

  if (file.cleanup) {
    file.cleanup.forEach(op => allOps.push({ phase: 'cleanup', operation: op }));
  }

  return allOps;
}

/**
 * Get operation by step number
 */
export function getOperationByStep(file: OperationFile, stepNumber: number, phase?: 'setup' | 'main' | 'cleanup'): Operation | null {
  const operations = phase === 'setup'
    ? file.setup
    : phase === 'cleanup'
    ? file.cleanup
    : file.operations;

  if (!operations) return null;

  return operations.find(op => op.step === stepNumber) || null;
}

/**
 * Filter operations by type
 */
export function filterOperationsByType(file: OperationFile, type: OperationType): Operation[] {
  const allOps = getAllOperations(file);
  return allOps
    .filter(item => item.operation.type === type)
    .map(item => item.operation);
}

/**
 * Get operation file summary
 */
export function getOperationFileSummary(file: OperationFile): string {
  const setupCount = file.setup?.length || 0;
  const mainCount = file.operations.length;
  const cleanupCount = file.cleanup?.length || 0;
  const totalCount = setupCount + mainCount + cleanupCount;

  const types = new Set<string>();
  getAllOperations(file).forEach(item => types.add(item.operation.type));

  return `
Operation File Summary:
  Name: ${file.name}
  Description: ${file.description}
  Version: ${file.version}

  Total Operations: ${totalCount}
    - Setup: ${setupCount}
    - Main: ${mainCount}
    - Cleanup: ${cleanupCount}

  Operation Types: ${Array.from(types).join(', ')}
  Tags: ${file.tags?.join(', ') || 'none'}
  Base URL: ${file.baseUrl || 'not specified'}
`.trim();
}

/**
 * Create initial test execution result
 */
export function createTestExecutionResult(testName: string): TestExecutionResult {
  return {
    testName,
    startTime: new Date(),
    endTime: new Date(),
    duration: 0,
    success: true,
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    skippedOperations: 0,
    results: []
  };
}

/**
 * Finalize test execution result
 */
export function finalizeTestExecutionResult(result: TestExecutionResult): TestExecutionResult {
  result.endTime = new Date();
  result.duration = result.endTime.getTime() - result.startTime.getTime();
  result.success = result.failedOperations === 0;

  if (!result.success) {
    const failedOps = result.results
      .filter(r => !r.success)
      .map(r => `Step ${r.step}`)
      .join(', ');
    result.errorSummary = `Failed operations: ${failedOps}`;
  }

  return result;
}

/**
 * Add operation result to test execution result
 */
export function addOperationResult(
  testResult: TestExecutionResult,
  operationResult: OperationResult
): void {
  testResult.results.push(operationResult);
  testResult.totalOperations++;

  if (operationResult.success) {
    testResult.successfulOperations++;
  } else {
    testResult.failedOperations++;
  }
}

/**
 * Export test execution result to JSON
 */
export function exportTestResult(result: TestExecutionResult): string {
  return JSON.stringify(result, null, 2);
}
