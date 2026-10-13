import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
const js = scripts.map((match) => match[1]).join('\n');

test('entry page and gameplay script exist', () => {
  assert.match(html, /<html\s+lang="ko"/i);
  assert.ok(scripts.length > 0, 'inline gameplay script must exist');
  assert.match(html, /id="map"/);
  assert.match(html, /id="log"/);
});

test('inline JavaScript parses', () => {
  assert.doesNotThrow(() => new Script(js, { filename: 'index.html' }));
});

test('MVP includes dungeon, combat, return and upgrades', () => {
  for (const symbol of ['const NODES=', 'const TYPES=', 'function start(', 'function combat(', 'function finish(', 'function upgrades(', 'function map(']) {
    assert.ok(js.includes(symbol), `missing gameplay component: ${symbol}`);
  }
  assert.match(js, /localStorage\.setItem/);
  assert.match(js, /localStorage\.getItem/);
});

test('all referenced HTML ids exist', () => {
  const defined = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const referenced = [...js.matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]);
  for (const id of referenced) assert.ok(defined.has(id), `missing element #${id}`);
});

test('dungeon nodes and encounter definitions stay aligned', () => {
  const nodes = js.match(/const NODES=(\[[^;]+\]);/);
  const types = js.match(/const TYPES=(\[[^;]+\]);/);
  assert.ok(nodes && types);
  const nodeCount = JSON.parse(nodes[1]).length;
  const typeCount = JSON.parse(types[1].replaceAll("'", '"')).length;
  assert.equal(nodeCount, typeCount);
});
