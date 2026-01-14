import { afterAll } from 'vitest';
import { closeApp, getTestMode } from '@/tests/utils/dualModeTestClient.js';


// Cleanup app instance after all tests complete (for local inject mode)
afterAll(async () => {
  if (getTestMode() === 'local') {
    await closeApp();
  }
});
