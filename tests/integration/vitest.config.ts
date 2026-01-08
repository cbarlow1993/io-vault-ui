/// <reference types="vitest" />
import path from 'node:path';
import dotenv from 'dotenv';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Load test environment from root .env.test or fallback to .env
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.test') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

export default defineConfig({
  test: {
    hookTimeout: 45000,
    testTimeout: 45000,
    fileParallelism: true,
    reporters: ['verbose'],
    maxConcurrency: 16,
    maxWorkers: 16,
    setupFiles: [path.join(__dirname, 'vitest.setup.ts')],
  },
  plugins: [tsconfigPaths()],
});
