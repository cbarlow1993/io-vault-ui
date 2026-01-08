/// <reference types="vitest" />
import path from 'node:path';
import dotenv from 'dotenv';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Load e2e environment from root .env.e2e or fallback to .env
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.e2e') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    setupFiles: [path.join(__dirname, 'setup.ts')],
    testTimeout: 120000,
    hookTimeout: 60000,
    sequence: {
      concurrent: false,
    },
    reporters: ['verbose'],
  },
});
