// Paper-doll character renderer for the LAYERLAB "2D Minimal - Character Maker"
// parts, converted by tools/import_minimal_chars.py into assets/chars/.
//
//   await PaperDoll.load();                      // once
//   const d = PaperDoll.create({ Hair:'Body_Hair_003', Chest:'FA_Chest_004_Brown',
//                                 weapon:['Sword','FA_WP_Main_Sword_001_Blue'],
//                                 colors:{ skin:'#fac9ac', hair:'#7de8a7' } });
//   d.play('Attack', { once:true, onEvent:(fn)=>..., onEnd:()=>... });
//   d.update(dt); d.draw(ctx, x, y, { scale:1, flip:false });   // (x,y) = feet
(function (global) {
  'use strict';

  const WEAPONS = ['Sword', 'Axe', 'Blunt', 'Spear', 'Staff', 'Wand', 'Bow', 'Crossbow'];
  const SLOTS = ['Eye', 'Hair', 'Beard', 'Helmet', 'Chest', 'Shield', 'Sub_Item', 'Arrow'];
  const ONCE_DEFAULT = new Set(['Dead1', 'Dead2', 'Dead3']);
  const DEFAULT_COLORS = { skin: '#fac9ac', hair: '#ffffff', eye: '#ffffff', beard: '#ffffff' };

  const PD = { ready: false, rig: null, sprites: null, catalog: null, anims: null,
               images: {}, base: 'assets/chars/' };
  const tintCache = new Map();

  function loadImage(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('image load failed: ' + src));
      im.src = src;
    });
  }

  PD.load = async function (base) {
    if (PD.ready) return PD;
    if (base) PD.base = base.endsWith('/') ? base : base + '/';
    const [rigData, anims] = await Promise.all([
      fetch(PD.base + 'rig.json').then(r => r.json()),
      fetch(PD.base + 'anims.json').then(r => r.json()),
    ]);
    PD.rig = rigData.rig; PD.sprites = rigData.sprites; PD.catalog = rigData.catalog; PD.anims = anims;
    await Promise.all(Object.keys(PD.sprites).map(async key => {
      PD.images[key] = await loadImage(PD.base + 'parts/' + key + '.png');
    }));
    PD.ready = true;
    return PD;
  };

  // ---- curve evaluation (Unity Hermite keys: [t, v, inSlope, outSlope]) ----
  function evalCurve(keys, t) {
    const n = keys.length;
    if (t <= keys[0][0]) return keys[0][1];
    if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0;
    while (i < n - 2 && t >= keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1];
    if (a[3] === null || b[2] === null) return a[1];          // stepped tangent
    const dt = b[0] - a[0];
    const s = (t - a[0]) / dt, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * a[1] + (s3 - 2 * s2 + s) * a[3] * dt +
           (-2 * s3 + 3 * s2) * b[1] + (s3 - s2) * b[2] * dt;
  }

  // ---- colour tinting (Unity SpriteRenderer.color = multiply) ----
  function hexToRgb(c) {
    if (Array.isArray(c)) return c;
    const h = c.replace('#', '');
    const v = parseInt(h.length === 3 ? h.replace(/./g, x => x + x) : h, 16);
    return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255];
  }
  function tinted(key, rgb) {
    if (!rgb || (rgb[0] === 1 && rgb[1] === 1 && rgb[2] === 1)) return PD.images[key];
    const ck = key + '|' + rgb.map(x => x.toFixed(3)).join(',');
    let cv = tintCache.get(ck);
    if (cv) return cv;
    const im = PD.images[key];
    cv = document.createElement('canvas');
    cv.width = im.width; cv.height = im.height;
    const g = cv.getContext('2d');
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, cv.width, cv.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      p[i] *= rgb[0]; p[i + 1] *= rgb[1]; p[i + 2] *= rgb[2];
    }
    g.putImageData(d, 0, 0);
    tintCache.set(ck, cv);
    return cv;
  }

  // ---- doll instance ----
  class Doll {
    constructor(look) {
      this.nodes = [];          // flat DFS list
      this.byPath = {};
      const walk = (n, parent) => {
        const inst = { def: n, parent, idx: this.nodes.length,
                       x: n.x, y: n.y, rot: n.rot, sx: n.sx, sy: n.sy,
                       alpha: n.color ? n.color[3] : 1,
                       sprite: n.sprite || null, show: n.active, tint: null };
        this.nodes.push(inst);
        this.byPath[n.path] = inst;
        (n.children || []).forEach(c => walk(c, inst));
      };
      walk(PD.rig, null);
      this.clip = null; this.time = 0; this.speed = 1;
      this.setLook(look || {});
      this.play('Idle');
    }

    node(path) { return this.byPath[path]; }

    setLook(look) {
      this.look = Object.assign({ Eye: PD.catalog.Eye[0], Chest: null, Hair: null,
                                  Beard: null, Helmet: null, Shield: null, Sub_Item: null,
                                  Arrow: PD.catalog.Arrow[0], weapon: null }, look);
      this.colors = Object.assign({}, DEFAULT_COLORS, look.colors || {});
      this._applyLook();
    }
    equip(slot, name) {             // equip('Helmet', null) removes
      if (slot === 'weapon' || WEAPONS.includes(slot)) {
        this.look.weapon = name == null ? null : (slot === 'weapon' ? name : [slot, name]);
      } else this.look[slot] = name;
      this._applyLook();
    }
    setColor(target, c) { this.colors[target] = c; this._applyLook(); }

    _set(path, sprite, tint) {
      const n = this.byPath[path];
      if (!n) return;
      n.sprite = sprite; n.show = !!sprite; n.tint = tint || null;
    }
    _applyLook() {
      const L = this.look, C = {};
      for (const k in this.colors) C[k] = hexToRgb(this.colors[k]);
      const key = (cat, name) => (name ? cat + '/' + name : null);

      this._set('Body', 'Default/Body', C.skin);
      this._set('Body/Head', 'Default/Head', C.skin);
      this._set('Body/Chest', key('Chest', L.Chest));
      this._set('Body/Head/Eye', key('Eye', L.Eye), C.eye);
      this._set('Body/Head/Beard', key('Beard', L.Beard), C.beard);
      this._set('Body/Head/Helmet', key('Helmet', L.Helmet));
      // Helmet on -> swap hair for the trimmed helmet-hair variant (same index)
      const hairIdx = L.Hair ? PD.catalog.Hair.indexOf(L.Hair) : -1;
      const helmetHair = hairIdx >= 0 ? PD.catalog.Helmet_Hair[hairIdx] : null;
      this._set('Body/Head/Hair', L.Helmet ? null : key('Hair', L.Hair), C.hair);
      this._set('Body/Head/Hair_Helmet', L.Helmet ? key('Helmet_Hair', helmetHair) : null, C.hair);
      this._set('HandLeft/Shield', key('Shield', L.Shield));
      this._set('HandLeft/Sub_Item', key('Sub_Item', L.Sub_Item));

      // weapons: clear all, then enable the equipped one
      for (const w of WEAPONS) if (w !== 'Bow' && w !== 'Crossbow') this._set('HandRight/' + w, null);
      ['Bow/Bow', 'Bow/Bow_Line_Up', 'Bow/Bow_Line_Down', 'Bow/Arrow',
       'Crossbow/Crossbow', 'Crossbow/Crossbow_Down', 'Crossbow/Crossbow_Line_Up',
       'Crossbow/Crossbow_Line_Down', 'Crossbow/Bolt'].forEach(p => this._set('HandRight/' + p, null));
      const [wt, wn] = L.weapon || [];
      if (wt === 'Bow') {
        this._set('HandRight/Bow/Bow', 'Bow/' + wn);
        this._set('HandRight/Bow/Bow_Line_Up', 'Bow/Bow_Line_Up');
        this._set('HandRight/Bow/Bow_Line_Down', 'Bow/Bow_Line_Down');
        this._set('HandRight/Bow/Arrow', key('Arrow', L.Arrow));
      } else if (wt === 'Crossbow') {
        this._set('HandRight/Crossbow/Crossbow', 'Crossbow/' + wn);
        const down = PD.sprites['Crossbow/' + wn + '_Down'] ? 'Crossbow/' + wn + '_Down' : null;
        this._set('HandRight/Crossbow/Crossbow_Down', down);
        this._set('HandRight/Crossbow/Crossbow_Line_Up', 'Crossbow/Crossbow_Line_Up');
        this._set('HandRight/Crossbow/Crossbow_Line_Down', 'Crossbow/Crossbow_Line_Down');
        this._set('HandRight/Crossbow/Bolt', key('Arrow', L.Arrow));
      } else if (wt) {
        this._set('HandRight/' + wt, wt + '/' + wn);
      }
      // the rig's always-on decorative sprites
      for (const p of ['Shadow', 'Dead/Bone', 'Dead/Bone2', 'Dead/Bone3', 'Dead/Bone4',
                       'Dead/Gravestone', 'Dead/Ghost', 'Body/Head/Ani_Eye/Eye_Defeat',
                       'Body/Head/Ani_Eye/Eye_Defeat2', 'Body/Head/Ani_Eye/Eye_Stun',
                       'Body/Head/Ani_Eye/Eye_Stun2']) {
        const n = this.byPath[p]; n.sprite = n.def.sprite; n.show = true;
      }
    }

    play(name, opts) {
      const clip = PD.anims[name];
      if (!clip) throw new Error('unknown animation: ' + name);
      opts = opts || {};
      this.clipName = name; this.clip = clip; this.time = 0;
      this.once = opts.once != null ? opts.once : ONCE_DEFAULT.has(name);
      this.onEvent = opts.onEvent || null; this.onEnd = opts.onEnd || null;
      this.ended = false;
      for (const n of this.nodes) {             // reset to rest pose
        const d = n.def;
        n.x = d.x; n.y = d.y; n.rot = d.rot; n.sx = d.sx; n.sy = d.sy;
        n.alpha = d.color ? d.color[3] : 1;
      }
      this._pose();
    }

    update(dt) {
      if (!this.clip || this.ended) return;
      const c = this.clip, prev = this.time;
      let t = prev + dt * this.speed;
      const fire = (a, b) => { for (const e of c.events) if (e.t > a && e.t <= b && this.onEvent) this.onEvent(e.fn, e); };
      if (t >= c.len) {
        fire(prev, c.len);
        if (this.once) { t = c.len; this.ended = true; this.time = t; this._pose(); if (this.onEnd) this.onEnd(); return; }
        t %= c.len; fire(-1, t);
        if (this.onEnd) this.onEnd();
      } else fire(prev, t);
      this.time = t;
      this._pose();
    }

    _pose() {
      const tr = this.clip.tracks, t = this.time;
      for (const path in tr) {
        const n = this.byPath[path];
        if (!n) continue;
        const props = tr[path];
        for (const p in props) n[p] = evalCurve(props[p], t);
      }
    }

    // (x, y): canvas position of the character's root (feet). scale: 1 = 100px per unit.
    draw(ctx, x, y, opt) {
      opt = opt || {};
      const S = 100 * (opt.scale || 1), flip = opt.flip ? -1 : 1;
      const list = [];
      // world matrices, Unity y-up -> canvas y-down
      const M = new Array(this.nodes.length);
      for (const n of this.nodes) {
        const r = -n.rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
        const lx = n.x * S, ly = -n.y * S;
        let m = [c * n.sx, s * n.sx, -s * n.sy, c * n.sy, lx, ly];
        if (n.parent) {
          const p = M[n.parent.idx];
          m = [p[0] * m[0] + p[2] * m[1], p[1] * m[0] + p[3] * m[1],
               p[0] * m[2] + p[2] * m[3], p[1] * m[2] + p[3] * m[3],
               p[0] * m[4] + p[2] * m[5] + p[4], p[1] * m[4] + p[3] * m[5] + p[5]];
        } else {
          m = [m[0] * flip, m[1], m[2] * flip, m[3], x + m[4] * flip, y + m[5]];
        }
        M[n.idx] = m;
        const vis = n.show && (!n.parent || n.parent.visible !== false);
        n.visible = vis;
        if (vis && n.sprite && n.def.order != null) {
          // n.alpha = SpriteRenderer colour alpha (rest value, or the clip's animated value)
          const alpha = n.alpha * (opt.alpha == null ? 1 : opt.alpha);
          if (alpha > 0.001) list.push({ n, m, alpha });
        }
      }
      list.sort((a, b) => a.n.def.order - b.n.def.order || a.n.idx - b.n.idx);
      const unit = S / 100;
      ctx.save();
      for (const { n, m, alpha } of list) {
        const meta = PD.sprites[n.sprite], img = tinted(n.sprite, n.tint);
        const k = unit * (100 / meta.ppu);
        ctx.setTransform(m[0] * k, m[1] * k, m[2] * k, m[3] * k, m[4], m[5]);
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.drawImage(img, -meta.px * meta.w, -(1 - meta.py) * meta.h);
        // 흉터 (에셋에 없는 것): 머리 위에 선을 긋는다. 얼굴은 오른쪽 (인형 기준)
        if (this.look.scar && n.def.path === 'Body/Head') { ctx.save(); ctx.strokeStyle = 'rgba(110,28,28,0.95)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(4, -16); ctx.lineTo(18, 6); ctx.moveTo(8, -10); ctx.lineTo(4, -4); ctx.moveTo(14, -6); ctx.lineTo(10, 0); ctx.moveTo(-14, -14); ctx.lineTo(-4, -20); ctx.stroke(); ctx.restore(); }
      }
      ctx.restore();
    }
  }

  PD.create = look => new Doll(look);
  PD.random = function (rng) {
    rng = rng || Math.random;
    const pick = (a, pNone) => (pNone && rng() < pNone) ? null : a[Math.floor(rng() * a.length)];
    const real = a => a.filter(s => !/_Line_|_Down$/.test(s));
    const wt = pick(WEAPONS);
    const hsv = (h, s, v) => { const f = n => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5), f(3), f(1)]; };
    return {
      Eye: pick(PD.catalog.Eye), Hair: pick(PD.catalog.Hair, 0.1), Beard: pick(PD.catalog.Beard, 0.6),
      Helmet: pick(PD.catalog.Helmet, 0.4), Chest: pick(PD.catalog.Chest),
      Shield: (wt === 'Bow' || wt === 'Crossbow' || wt === 'Staff') ? null : pick(PD.catalog.Shield, 0.5),
      Arrow: pick(PD.catalog.Arrow), weapon: [wt, pick(real(PD.catalog[wt]))],
      colors: { skin: hsv(0.05 + rng() * 0.04, 0.15 + rng() * 0.45, 0.45 + rng() * 0.55),
                hair: hsv(rng(), 0.4 + rng() * 0.6, 0.5 + rng() * 0.5),
                beard: hsv(rng(), 0.4 + rng() * 0.6, 0.5 + rng() * 0.5) },
    };
  };
  PD.WEAPONS = WEAPONS; PD.SLOTS = SLOTS;
  global.PaperDoll = PD;
})(typeof window !== 'undefined' ? window : globalThis);
