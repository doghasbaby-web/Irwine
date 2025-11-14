/**
 * Visual Test Operation File Types
 *
 * This file defines the structure for operation files that guide visual test processes.
 * Test cases read these files to simulate user interactions with the browser.
 */

/**
 * Types of operations that can be performed during visual testing
 */
export type OperationType =
  | 'navigate'      // Navigate to a URL
  | 'click'         // Click on an element
  | 'type'          // Type text into an input field
  | 'select'        // Select an option from a dropdown
  | 'wait'          // Wait for a specific duration or element
  | 'screenshot'    // Take a screenshot
  | 'scroll'        // Scroll the page
  | 'hover'         // Hover over an element
  | 'verify'        // Verify element or text exists
  | 'clear'         // Clear an input field
  | 'press'         // Press a keyboard key
  | 'upload';       // Upload a file

/**
 * Input type for operation parameters
 */
export interface OperationInput {
  /** Text input value */
  text?: string;

  /** Numeric input value */
  number?: number;

  /** Boolean input value */
  boolean?: boolean;

  /** Array of values */
  array?: string[];

  /** Key-value pairs for complex inputs */
  data?: Record<string, any>;
}

/**
 * Single operation step in the test process
 */
export interface Operation {
  /** Step number for ordering and reference */
  step: number;

  /** Description of what this operation does */
  description: string;

  /** Type of operation to perform */
  type: OperationType;

  /** CSS selector for the target element (if applicable) */
  selector?: string;

  /** Input data for the operation */
  input?: OperationInput;

  /** Expected result or verification criteria */
  expected?: string;

  /** Wait time after operation (in milliseconds) */
  waitAfter?: number;

  /** Skip this step if condition is met */
  skipIf?: string;

  /** Retry count for flaky operations */
  retryCount?: number;

  /** Screenshot filename (if type is 'screenshot') */
  screenshotName?: string;

  /** Additional options specific to the operation type */
  options?: Record<string, any>;
}

/**
 * Complete operation file structure
 */
export interface OperationFile {
  /** Name of the test suite */
  name: string;

  /** Description of what this test suite does */
  description: string;

  /** Version of the operation file format */
  version: string;

  /** Base URL for the test (can be overridden in individual operations) */
  baseUrl?: string;

  /** Global configuration for the test */
  config?: {
    /** Browser viewport width */
    viewportWidth?: number;

    /** Browser viewport height */
    viewportHeight?: number;

    /** Default wait time between operations (ms) */
    defaultWait?: number;

    /** Take screenshot on error */
    screenshotOnError?: boolean;

    /** Stop on first error */
    stopOnError?: boolean;

    /** Maximum execution time (ms) */
    timeout?: number;
  };

  /** Setup operations to run before the main test */
  setup?: Operation[];

  /** Main test operations */
  operations: Operation[];

  /** Cleanup operations to run after the test */
  cleanup?: Operation[];

  /** Tags for categorizing tests */
  tags?: string[];

  /** Metadata for the test */
  metadata?: Record<string, any>;
}

/**
 * Result of executing an operation
 */
export interface OperationResult {
  /** Step number that was executed */
  step: number;

  /** Whether the operation succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Execution time in milliseconds */
  duration: number;

  /** Screenshot path if taken */
  screenshot?: string;

  /** Additional data captured during execution */
  data?: any;
}

/**
 * Complete test execution result
 */
export interface TestExecutionResult {
  /** Name of the test that was executed */
  testName: string;

  /** Start time of execution */
  startTime: Date;

  /** End time of execution */
  endTime: Date;

  /** Total duration in milliseconds */
  duration: number;

  /** Whether all operations succeeded */
  success: boolean;

  /** Number of operations executed */
  totalOperations: number;

  /** Number of successful operations */
  successfulOperations: number;

  /** Number of failed operations */
  failedOperations: number;

  /** Number of skipped operations */
  skippedOperations: number;

  /** Individual operation results */
  results: OperationResult[];

  /** Error summary if test failed */
  errorSummary?: string;
}
