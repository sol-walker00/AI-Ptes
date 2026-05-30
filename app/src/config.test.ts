import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('development server configuration', () => {
  it('uses 127.0.0.1 consistently for preview links and Tauri dev', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    const tauriConfig = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8')) as {
      build: { beforeDevCommand: string; devUrl: string };
    };

    expect(packageJson.scripts.dev).toContain('--host 127.0.0.1');
    expect(tauriConfig.build.devUrl).toBe('http://127.0.0.1:1420');
  });
});
