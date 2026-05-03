import { defineConfig } from 'vitest/config';
import path from 'path';

const root = '/Users/sujithputta/Projects/Civiq Challenge-2.1';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
        'src/fix_stats.ts',
        'src/list-models.ts',
        'src/modules/communication/messaging.service.ts',
        '.eslintrc.cjs',
        'src/test-*.ts',
        'src/scratch/**',
        'src/__tests__/**',
        'src/modules/shared/redis.service.ts',
        'src/utils/logger.ts',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
    server: {
      deps: {
        inline: [/@civiq\/types/, /@civiq\/config-env/],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@civiq/types': path.resolve(root, 'packages/types/index.ts'),
      '@civiq/config-env': path.resolve(root, 'packages/config-env/src/index.ts'),
    },
  },
});
