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
      // look.html: 3D 룩 테스트 (KayKit + 셀 셰이딩 + 외곽선)
      input: { main: resolve(__dirname, 'index.html'), look: resolve(__dirname, 'look.html') },
    },
  },
});
