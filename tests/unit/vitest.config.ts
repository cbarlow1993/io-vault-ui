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
    reporters: ['verbose'],
    hookTimeout: 30000,
    dir: './',
    clearMocks: true,
    setupFiles: [path.join(__dirname, 'vitest.setup.ts')],
  },
  plugins: [tsconfigPaths()],
});
