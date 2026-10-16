import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

/** 시작 화면에 보여줄 빌드 번호: 커밋 짧은 해시 + 빌드 시각 (한국 시간) */
function buildLabel(): string {
  let sha = 'local';
  try {
    sha = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    // git이 없으면 local
  }
  const at = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${sha} · ${at}`;
}

// 보드 전술 로그라이크 시제품 (DESIGN.md). 상위 저장소(PROJ_I)와 따로 설치 · 실행한다
// 프로젝트가 Windows 드라이브(/mnt/*)에 있으면 WSL에서 파일 변경 감지가 안 되므로 폴링으로 감시한다
export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(buildLabel()) },
  server: {
    port: 5180,
    watch: { usePolling: true, interval: 300 },
  },
});
