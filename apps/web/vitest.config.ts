import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['./tests/**/*.test.{ts,tsx}', './app/**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      './tests/integration/**', // Skip integration tests that need real DB
      './tests/wip/**', // Skip work-in-progress tests with known issues
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/fixtures/',
        '**/*.config.ts',
        '**/*.d.ts',
      ],
    },
    poolOptions: {
      threads: {
        singleThread: true, // Run tests sequentially for database operations
      },
    },
    server: {
      deps: {
        inline: ['next-auth'], // Inline next-auth to avoid module resolution issues
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@tournament/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@tournament/api-contracts': path.resolve(__dirname, '../../packages/api-contracts/src'),
    },
  },
});
