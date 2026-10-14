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
    const icons = renderItemIcons(assets);
    new App(assets, icons);
    byId('loading').hidden = true;
  } catch (error: unknown) {
    text.textContent = `로딩 실패: ${error instanceof Error ? error.message : String(error)}. 'npm run assets'로 에셋을 받았는지 확인하세요.`;
    throw error;
  }
}

void boot();
