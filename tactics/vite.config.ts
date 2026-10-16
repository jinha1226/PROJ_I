import { defineConfig } from 'vite';

// 보드 전술 로그라이크 시제품 (DESIGN.md). 상위 저장소(PROJ_I)와 따로 설치 · 실행한다
// 프로젝트가 Windows 드라이브(/mnt/*)에 있으면 WSL에서 파일 변경 감지가 안 되므로 폴링으로 감시한다
export default defineConfig({
  base: './',
  server: {
    port: 5180,
    watch: { usePolling: true, interval: 300 },
  },
});
