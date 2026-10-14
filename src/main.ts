import './ui/style.css';
import {App} from './game/app';
import {loadAssets} from './render/assets';
import {renderItemIcons} from './render/icons';
import {byId} from './ui/dom';

async function boot(): Promise<void> {
  const bar = byId('loadingFill');
  const text = byId('loadingText');
  try {
    const assets = await loadAssets(ratio => {
      bar.style.transform = `scaleX(${ratio})`;
      text.textContent = `에셋 불러오는 중… ${Math.round(ratio * 100)}%`;
    });
    text.textContent = '아이템 아이콘 준비 중…';
    const params = new URLSearchParams(location.search);
    if (params.has('raidtest')) {
      const [{Stage}, {startRaidDemo}] = await Promise.all([import('./render/stage'), import('./demo/raidDemo')]);
      const stage = new Stage(byId('game'));
      startRaidDemo(stage, assets);
      byId('loading').hidden = true;
      return;
    }
    if (params.has('mix')) {
      const [{Stage}, {startMixDemo}] = await Promise.all([import('./render/stage'), import('./demo/mixDemo')]);
      const stage = new Stage(byId('game'));
      stage.setPixelSize(1, false);
      startMixDemo(stage, assets);
      byId('loading').hidden = true;
      return;
    }
    const icons = renderItemIcons(assets);
    const app = new App(assets, icons);
    if (params.has('lab')) {
      const {mountLabPanel} = await import('./ui/labPanel');
      const {visual} = await import('./render/visual');
      app.startLab();
      mountLabPanel(v => app.applyVisual(v));
      app.applyVisual(visual);
    }
    byId('loading').hidden = true;
  } catch (error: unknown) {
    text.textContent = `로딩 실패: ${error instanceof Error ? error.message : String(error)}. 'npm run assets'로 에셋을 받았는지 확인하세요.`;
    throw error;
  }
}

void boot();
