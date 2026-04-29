import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.config.*', '**/index.ts'],
      lines: 40,
      functions: 40,
      branches: 40,
      statements: 40,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
