import { expect } from 'vitest';
import type { TestResponse } from '@/tests/utils/dualModeTestClient.js';

/**
 * Asserts that a response has the expected status code.
 * If the assertion fails, logs the actual status code and response body for debugging.
 */
export const expectStatus = (response: TestResponse, expectedStatus: number): void => {
  if (response.status !== expectedStatus) {
    console.error('Status assertion failed:', {
      expected: expectedStatus,
      actual: response.status,
      body: response.data,
      path: response.path,
      queryString: response.queryString,
      requestHeaders: response.requestHeaders,
    });
  }
  expect(response.status).toBe(expectedStatus);
};
