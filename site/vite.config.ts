/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@desktop-pet/domain': resolve(__dirname, '../app/src/domain'),
      '@desktop-pet/ui': resolve(__dirname, '../app/src/ui'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true,
  },
});
