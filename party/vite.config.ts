import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // 상대 경로로 빌드해 GitHub Pages 하위 폴더에서도 동작하게 한다
  base: './',
  server: {
    // WSL 의 /mnt 드라이브에서는 파일 변경 감지가 안 되므로 폴링 사용
    watch: { usePolling: true, interval: 300 },
  },
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html') },
    },
  },
});
