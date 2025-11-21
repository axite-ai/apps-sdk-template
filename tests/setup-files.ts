/**
 * Test setup file - runs before each test file
 *
 * This file is for per-test-file setup.
 * For global setup/teardown (like database creation), see global-setup.ts
 */

// Add any per-test-file setup here if needed
// For example: importing test utilities, setting up mocks, etc.

import { beforeAll, afterAll } from 'vitest';
import '@testing-library/jest-dom';

// Suppress console errors/warnings in tests unless explicitly testing them
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    // Filter out specific known errors/warnings that are expected in tests
    const message = args[0]?.toString() || '';

    // Add patterns to ignore here
    const ignoredPatterns = [
      /Warning: ReactDOM.render/,
      /Not implemented: HTMLFormElement.prototype.submit/,
    ];

    if (!ignoredPatterns.some(pattern => pattern.test(message))) {
      originalConsoleError(...args);
    }
  };

  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';

    // Add patterns to ignore here
    const ignoredPatterns = [
      /componentWillReceiveProps/,
    ];

    if (!ignoredPatterns.some(pattern => pattern.test(message))) {
      originalConsoleWarn(...args);
    }
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
