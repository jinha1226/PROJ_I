import {itemDef} from '../items/catalog';
import type {Profile} from '../meta/profile';
import {BUILDINGS, isBuilt, isUnlocked, levelOf, NODE_BY_ID, nodesOf, type BuildingId, type Cost, type UpgradeNode} from '../meta/upgrades';
import {canCraft, countItem, purchaseCheck, RECIPES, type Recipe} from '../meta/workshop';
import {el, fmt} from './dom';

export interface BuildingPanelActions {
  purchase(nodeId: string): void;
  craft(recipeId: string): void;
  openStash(): void;
  track(nodeId: string | null): void;
}

function iconHtml(defId: string, icons: ReadonlyMap<string, string>): string {
  const def = itemDef(defId);
  const src = icons.get(defId);
  return src ? `<img src="${src}" alt="">` : `<span class="itemGlyph" style="color:${def.icon.color}">${def.icon.glyph}</span>`;
}

/** Cost chips: each material shows owned / needed, red when short. */
function costHtml(profile: Profile, cost: Cost, icons: ReadonlyMap<string, string>): string {
  const chips = cost.items.map(([id, qty]) => {
    const have = countItem(profile, id);
    return `<span class="chip${have < qty ? ' short' : ''}" title="${itemDef(id).name}">${iconHtml(id, icons)}<b>${have}/${qty}</b></span>`;
  });
  if (cost.gold > 0) chips.unshift(`<span class="chip${profile.gold < cost.gold ? ' short' : ''}"><b class="gold">${fmt(cost.gold)}G</b></span>`);
  return chips.join('');
}

const REASON: Readonly<Record<string, string>> = {maxed: '최대', locked: '잠김', soon: '준비 중', cost: '재료 부족'};

function nodeRow(profile: Profile, node: UpgradeNode, icons: ReadonlyMap<string, string>, actions: BuildingPanelActions): HTMLElement {
  const level = levelOf(profile.upgrades, node.id);
  const maxed = level >= node.maxLevel;
  const unlocked = isUnlocked(profile.upgrades, node);
  const row = el('div', `nodeRow${maxed ? ' maxed' : ''}${!unlocked || node.comingSoon ? ' locked' : ''}`);
  const pips = Array.from({length: node.maxLevel}, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('');
  const isBuild = node.id.endsWith('.build');
  const now = isBuild ? node.effect(1) : level > 0 ? node.effect(level) : '아직 배우지 않음';
  const next = maxed || isBuild ? '' : `<span class="next">다음: ${node.effect(level + 1)}</span>`;
  const req = !unlocked && node.requires ? `<span class="req">필요: ${NODE_BY_ID.get(node.requires.node)?.name} Lv${node.requires.level}</span>` : '';
  row.innerHTML = `
    <div class="nodeHead"><strong>${node.name}</strong>${isBuild ? '' : `<span class="pips">${pips}</span>`}</div>
    <div class="nodeEffect">${node.comingSoon ? node.effect(1) : now}${next}${req}</div>
    ${maxed || node.comingSoon ? '' : `<div class="nodeCost">${costHtml(profile, node.cost(level + 1), icons)}</div>`}`;
  const problem = purchaseCheck(profile, node.id);
  const label = problem ? REASON[problem] : isBuild ? '건설' : level === 0 ? '해금' : '강화';
  const buttons = el('div', 'nodeActions');
  const button = el('button', problem ? 'ghostBtn' : 'primaryBtn', label) as HTMLButtonElement;
  button.disabled = Boolean(problem);
  button.addEventListener('click', () => actions.purchase(node.id));
  buttons.append(button);
  if (!maxed && !node.comingSoon) {
    const tracking = profile.trackedUpgrade === node.id;
    const track = el('button', tracking ? 'trackBtn on' : 'trackBtn', tracking ? '추적 중' : '추적');
    track.addEventListener('click', () => actions.track(tracking ? null : node.id));
    buttons.append(track);
  }
  row.append(buttons);
  return row;
}

function recipeRow(profile: Profile, recipe: Recipe, icons: ReadonlyMap<string, string>, actions: BuildingPanelActions): HTMLElement {
  const unlocked = levelOf(profile.upgrades, recipe.requires.node) >= recipe.requires.level;
  const out = itemDef(recipe.output[0]);
  const row = el('div', `recipeRow${unlocked ? '' : ' locked'}`);
  row.innerHTML = `
    <span class="recipeOut">${iconHtml(out.id, icons)}</span>
    <div><strong>${out.name}${recipe.output[1] > 1 ? ` ×${recipe.output[1]}` : ''}</strong>
    <div class="nodeCost">${unlocked ? costHtml(profile, {gold: recipe.gold, items: recipe.inputs}, icons) : `<span class="req">${NODE_BY_ID.get(recipe.requires.node)?.name} Lv${recipe.requires.level} 필요</span>`}</div></div>`;
  const ok = canCraft(profile, recipe);
  const button = el('button', ok ? 'primaryBtn' : 'ghostBtn', '제작') as HTMLButtonElement;
  button.disabled = !ok;
  button.addEventListener('click', () => actions.craft(recipe.id));
  row.append(button);
  return row;
}

/** Fills the side panel for one building: build, upgrade nodes, and its recipes. */
export function renderBuildingPanel(root: HTMLElement, profile: Profile, id: BuildingId, icons: ReadonlyMap<string, string>, actions: BuildingPanelActions): void {
  const def = BUILDINGS.find(b => b.id === id)!;
  root.replaceChildren();
  const head = el('header', 'panelHead', `<div><h2>${def.name}</h2><p>${def.desc}</p></div>`);
  const close = el('button', 'ghostBtn', '닫기');
  close.addEventListener('click', () => (root.hidden = true));
  const treeBtn = el('button', 'ghostBtn', '트리');
  treeBtn.addEventListener('click', () => document.getElementById('openTree')?.click());
  head.append(treeBtn);
  head.append(close);
  root.append(head);

  if (id === 'tent') {
    root.append(el('p', 'panelNote', '창고 정리, 장비 장착, 상인 거래는 이곳에서 합니다.'));
    const open = el('button', 'primaryBtn big', '창고 · 출정 준비 열기');
    open.addEventListener('click', () => actions.openStash());
    root.append(open);
    return;
  }

  const nodes = nodesOf(id);
  const buildNode = nodes.find(n => n.id.endsWith('.build'))!;
  if (!isBuilt(profile.upgrades, id)) {
    root.append(el('p', 'panelNote', '아직 공사 중인 터다. 재료를 모아 건물을 세우자. 재료는 <b>창고와 출정 가방</b>에서 함께 사용된다.'));
    root.append(nodeRow(profile, buildNode, icons, actions));
    const preview = el('div', 'previewList', `<h3>건설하면 열리는 기술</h3>${nodes.filter(n => n !== buildNode).map(n => `<div>· ${n.name}${n.comingSoon ? ' <small>(준비 중)</small>' : ''}</div>`).join('')}`);
    root.append(preview);
    return;
  }

  const list = el('div', 'nodeList');
  list.append(el('h3', 'sectionTitle', '기술'));
  for (const node of nodes) if (node !== buildNode) list.append(nodeRow(profile, node, icons, actions));
  root.append(list);

  const recipes = RECIPES.filter(r => nodes.some(n => n.id === r.requires.node));
  if (recipes.length) {
    const box = el('div', 'nodeList');
    box.append(el('h3', 'sectionTitle', '제작 <small>완성품은 창고로 들어간다</small>'));
    for (const r of recipes) box.append(recipeRow(profile, r, icons, actions));
    root.append(box);
  }
}
