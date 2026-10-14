import {describe, expect, it} from 'vitest';
import {NODES} from '../src/meta/upgrades';
import {layoutTree} from '../src/ui/techTree';

describe('tech tree layout', () => {
  const layout = layoutTree();

  it('places every node exactly once', () => {
    expect(layout.map(l => l.node.id).sort()).toEqual(NODES.map(n => n.id).sort());
  });

  it('children sit further out than their parents', () => {
    const byId = new Map(layout.map(l => [l.node.id, l]));
    for (const l of layout) {
      if (!l.parent) continue;
      const p = byId.get(l.parent)!;
      expect(Math.hypot(l.x, l.y)).toBeGreaterThan(Math.hypot(p.x, p.y));
    }
  });

  it('keeps nodes from overlapping', () => {
    for (let i = 0; i < layout.length; i++) {
      for (let j = i + 1; j < layout.length; j++) {
        const d = Math.hypot(layout[i].x - layout[j].x, layout[i].y - layout[j].y);
        expect(d, `${layout[i].node.id} vs ${layout[j].node.id}`).toBeGreaterThan(60);
      }
    }
  });
});
