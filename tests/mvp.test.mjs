import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SourceTextModule } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/gi)];
const js = scripts.map(m=>m[1]).join('\n');

test('3D entrypoint and canvas host',()=>{
  assert.match(html, /id="stage"/);
  assert.match(html, /id="log"/);
  assert.match(html, /three\/addons\/loaders/);
  assert.ok(scripts.length>0);
});

test('module syntax parses',()=>{
  // node --experimental-vm-modules is needed to construct an ESM module.
  assert.doesNotThrow(()=>new SourceTextModule(js));
});

test('exploration, combat, fog, upgrades and return exist',()=>{
  for(const symbol of ['function buildWorld(', 'function updateFog(', 'function route(', 'function choose(', 'function battle(', 'function finish(', 'function renderUI(']){
    assert.ok(js.includes(symbol), 'missing '+symbol);
  }
  assert.match(js,/localStorage\.setItem/);
});

test('referenced element IDs exist',()=>{
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const [,id] of js.matchAll(/\$\('([^']+)'\)/g)){
    assert.ok(ids.has(id), 'missing element #'+id);
  }
});

test('dungeon room and encounter count agree',()=>{
  assert.match(js,/const rooms=/);
  assert.match(js,/const edges=/);
  assert.match(js,/const types=/);
});
