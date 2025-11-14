# Visual Test Operation Files

## Overview

Operation files are JSON-based configuration files that define automated visual test scenarios for browser automation. They allow you to create reusable, maintainable test scripts that can be executed by the Visual Test system.

## Table of Contents

1. [File Structure](#file-structure)
2. [Operation Types](#operation-types)
3. [Configuration Options](#configuration-options)
4. [Input Types](#input-types)
5. [Examples](#examples)
6. [Usage](#usage)
7. [Best Practices](#best-practices)

## File Structure

An operation file consists of the following main sections:

```json
{
  "name": "Test Name",
  "description": "Test description",
  "version": "1.0.0",
  "baseUrl": "https://example.com",
  "config": { /* configuration options */ },
  "tags": ["tag1", "tag2"],
  "metadata": { /* custom metadata */ },
  "setup": [ /* setup operations */ ],
  "operations": [ /* main test operations */ ],
  "cleanup": [ /* cleanup operations */ ]
}
```

### Required Fields

- `name` (string): Name of the test suite
- `version` (string): Version of the operation file format
- `operations` (array): Array of operation objects to execute

### Optional Fields

- `description` (string): Description of what the test does
- `baseUrl` (string): Default base URL for navigation
- `config` (object): Global configuration for the test
- `tags` (array): Tags for categorizing tests
- `metadata` (object): Custom metadata
- `setup` (array): Operations to run before main test
- `cleanup` (array): Operations to run after main test

## Operation Types

Each operation must have these fields:

- `step` (number): Step number for ordering
- `description` (string): Human-readable description
- `type` (string): Type of operation to perform

### Supported Operation Types

#### 1. navigate
Navigate to a URL.

```json
{
  "step": 1,
  "description": "Navigate to homepage",
  "type": "navigate",
  "input": {
    "text": "https://example.com"
  }
}
```

#### 2. click
Click on an element.

```json
{
  "step": 2,
  "description": "Click submit button",
  "type": "click",
  "selector": "button[type='submit']",
  "retryCount": 3
}
```

#### 3. type
Type text into an input field.

```json
{
  "step": 3,
  "description": "Enter username",
  "type": "type",
  "selector": "input[name='username']",
  "input": {
    "text": "testuser"
  }
}
```

#### 4. clear
Clear an input field.

```json
{
  "step": 4,
  "description": "Clear search box",
  "type": "clear",
  "selector": "input[name='search']"
}
```

#### 5. select
Select an option from a dropdown.

```json
{
  "step": 5,
  "description": "Select country",
  "type": "select",
  "selector": "select[name='country']",
  "input": {
    "text": "USA"
  }
}
```

#### 6. wait
Wait for a specified duration.

```json
{
  "step": 6,
  "description": "Wait for page load",
  "type": "wait",
  "input": {
    "number": 3000
  }
}
```

#### 7. screenshot
Take a screenshot.

```json
{
  "step": 7,
  "description": "Capture current state",
  "type": "screenshot",
  "screenshotName": "step-7-result.png"
}
```

#### 8. scroll
Scroll the page vertically.

```json
{
  "step": 8,
  "description": "Scroll down 500px",
  "type": "scroll",
  "input": {
    "number": 500
  }
}
```

#### 9. hover
Hover over an element.

```json
{
  "step": 9,
  "description": "Hover over menu item",
  "type": "hover",
  "selector": ".menu-item"
}
```

#### 10. verify
Verify an element exists or contains expected text.

```json
{
  "step": 10,
  "description": "Verify success message",
  "type": "verify",
  "selector": ".success-message",
  "expected": "Operation successful"
}
```

#### 11. press
Press a keyboard key.

```json
{
  "step": 11,
  "description": "Press Enter key",
  "type": "press",
  "input": {
    "text": "Enter"
  }
}
```

#### 12. upload
Upload a file to a file input.

```json
{
  "step": 12,
  "description": "Upload profile picture",
  "type": "upload",
  "selector": "input[type='file']",
  "input": {
    "text": "/path/to/file.jpg"
  }
}
```

## Configuration Options

The `config` section allows you to set global test parameters:

```json
{
  "config": {
    "viewportWidth": 1920,
    "viewportHeight": 1080,
    "defaultWait": 1000,
    "screenshotOnError": true,
    "stopOnError": false,
    "timeout": 120000
  }
}
```

### Configuration Fields

- `viewportWidth` (number): Browser viewport width in pixels
- `viewportHeight` (number): Browser viewport height in pixels
- `defaultWait` (number): Default wait time between operations (ms)
- `screenshotOnError` (boolean): Take screenshot when operation fails
- `stopOnError` (boolean): Stop test execution on first error
- `timeout` (number): Maximum test execution time (ms)

## Input Types

The `input` field in operations can contain different data types:

```typescript
{
  "input": {
    "text": "string value",      // Text input
    "number": 1000,               // Numeric input
    "boolean": true,              // Boolean input
    "array": ["val1", "val2"],    // Array of values
    "data": {                     // Key-value pairs
      "key1": "value1",
      "key2": "value2"
    }
  }
}
```

## Operation Fields

Each operation can have these optional fields:

- `selector` (string): CSS selector for target element
- `input` (object): Input data for the operation
- `expected` (string): Expected result for verification
- `waitAfter` (number): Wait time after operation (ms)
- `skipIf` (string): Condition to skip this step
- `retryCount` (number): Number of retry attempts
- `screenshotName` (string): Custom screenshot filename
- `options` (object): Operation-specific options

## Examples

### Example 1: Simple Navigation Test

See: `examples/visual-test-operation.json`

This example demonstrates:
- Basic navigation
- Screenshot capture
- Element verification
- Scrolling

### Example 2: Form Interaction Test

See: `examples/form-test-operation.json`

This example demonstrates:
- Form field input
- Radio button selection
- Checkbox selection
- Form submission
- Result verification

### Example 3: Complex E-commerce Test

```json
{
  "name": "E-commerce Shopping Flow",
  "description": "Tests product search, selection, and checkout",
  "version": "1.0.0",
  "baseUrl": "https://shop.example.com",
  "config": {
    "viewportWidth": 1280,
    "viewportHeight": 720,
    "defaultWait": 1000,
    "screenshotOnError": true,
    "stopOnError": true
  },
  "setup": [
    {
      "step": 1,
      "description": "Navigate to homepage",
      "type": "navigate",
      "input": { "text": "https://shop.example.com" }
    }
  ],
  "operations": [
    {
      "step": 1,
      "description": "Search for product",
      "type": "type",
      "selector": "input[name='search']",
      "input": { "text": "laptop" }
    },
    {
      "step": 2,
      "description": "Submit search",
      "type": "press",
      "input": { "text": "Enter" },
      "waitAfter": 2000
    },
    {
      "step": 3,
      "description": "Verify search results",
      "type": "verify",
      "selector": ".search-results",
      "expected": "laptop"
    },
    {
      "step": 4,
      "description": "Click first product",
      "type": "click",
      "selector": ".product-item:first-child",
      "waitAfter": 2000
    },
    {
      "step": 5,
      "description": "Take product page screenshot",
      "type": "screenshot",
      "screenshotName": "product-page.png"
    }
  ],
  "cleanup": [
    {
      "step": 1,
      "description": "Take final screenshot",
      "type": "screenshot",
      "screenshotName": "test-complete.png"
    }
  ]
}
```

## Usage

### Using Operation Files in Code

```typescript
import { VisualTester } from './src/utils/visualTest.js';

async function runTest() {
  const tester = new VisualTester({
    headless: false,
    slowMo: 500
  });

  // Initialize browser
  await tester.initialize();

  // Run operation file
  const result = await tester.runOperationFile('./examples/visual-test-operation.json');

  // Check results
  if (result && result.success) {
    console.log('Test passed!');
    console.log(`Duration: ${result.duration}ms`);
  } else {
    console.log('Test failed!');
    console.log(result?.errorSummary);
  }

  // Close browser
  await tester.close();
}

runTest();
```

### Test Results

After execution, a test result JSON file is created with detailed information:

```json
{
  "testName": "Example Visual Test",
  "startTime": "2025-11-14T10:30:00.000Z",
  "endTime": "2025-11-14T10:30:45.000Z",
  "duration": 45000,
  "success": true,
  "totalOperations": 8,
  "successfulOperations": 8,
  "failedOperations": 0,
  "skippedOperations": 0,
  "results": [
    {
      "step": 1,
      "success": true,
      "duration": 2500,
      "screenshot": "step-1.png"
    }
  ]
}
```

## Best Practices

### 1. Use Descriptive Names and Descriptions

```json
{
  "step": 1,
  "description": "Click the 'Add to Cart' button on the product detail page",
  "type": "click",
  "selector": "button.add-to-cart"
}
```

### 2. Add Wait Times for Dynamic Content

```json
{
  "step": 2,
  "description": "Wait for AJAX response",
  "type": "wait",
  "input": { "number": 2000 },
  "waitAfter": 500
}
```

### 3. Use Setup and Cleanup Phases

- **Setup**: Login, navigate to starting page, set cookies
- **Cleanup**: Logout, clear data, take final screenshots

### 4. Take Strategic Screenshots

```json
{
  "step": 5,
  "description": "Capture state before submission",
  "type": "screenshot",
  "screenshotName": "before-submit.png"
}
```

### 5. Add Retry Logic for Flaky Operations

```json
{
  "step": 3,
  "description": "Click dynamically loaded button",
  "type": "click",
  "selector": ".dynamic-button",
  "retryCount": 3,
  "waitAfter": 1000
}
```

### 6. Use Verification Steps

```json
{
  "step": 6,
  "description": "Verify login was successful",
  "type": "verify",
  "selector": ".user-profile",
  "expected": "Welcome"
}
```

### 7. Organize Tests with Tags

```json
{
  "tags": ["smoke-test", "critical", "checkout-flow"]
}
```

### 8. Use Meaningful Step Numbers

- Setup: 1-10
- Main operations: 1-100
- Cleanup: 1-5

### 9. Enable Error Screenshots

```json
{
  "config": {
    "screenshotOnError": true
  }
}
```

### 10. Set Appropriate Timeouts

```json
{
  "config": {
    "timeout": 120000,  // 2 minutes
    "defaultWait": 500
  }
}
```

## Troubleshooting

### Common Issues

1. **Element Not Found**
   - Verify selector is correct
   - Add wait time before operation
   - Use retry logic

2. **Timeout Errors**
   - Increase operation timeout
   - Add explicit wait steps
   - Check network conditions

3. **Screenshot Not Captured**
   - Verify file path permissions
   - Check disk space
   - Ensure screenshotName is unique

4. **Verification Failures**
   - Check expected text is exact
   - Wait for dynamic content to load
   - Use partial text matching

## TypeScript Integration

For TypeScript projects, import the types:

```typescript
import type {
  OperationFile,
  Operation,
  TestExecutionResult
} from './src/types/operation.js';

const myTest: OperationFile = {
  name: "My Test",
  version: "1.0.0",
  operations: [/* ... */]
};
```

## Conclusion

Operation files provide a powerful, declarative way to define visual tests. They are:

- **Reusable**: Share tests across projects
- **Maintainable**: Easy to update and modify
- **Version-controlled**: Track changes in git
- **Readable**: Non-developers can understand tests
- **Flexible**: Support complex workflows

For more examples and advanced usage, see the `examples/` directory.
