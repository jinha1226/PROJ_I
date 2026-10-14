import {defineConfig} from 'vitest/config';

export default defineConfig({
  // Relative base keeps the build deployable under any GitHub Pages path.
  base: './',
  build: {target: 'es2022', sourcemap: true},
  // File events do not reach WSL from Windows drives (/mnt/*), so poll instead.
  server: {watch: {usePolling: true, interval: 300}},
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {provider: 'v8', include: ['src/**/*.ts'], exclude: ['src/main.ts', 'src/**/*.d.ts']},
  },
});
