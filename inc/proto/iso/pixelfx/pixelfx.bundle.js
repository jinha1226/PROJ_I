(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: !0 });
  };

  // ../dl_pixelfx/repo/src/core/math.js
  var TAU = Math.PI * 2, clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x, lerp = (a, b, t) => a + (b - a) * t;
  var wrap = (x, m) => (x % m + m) % m, seg = (t, t0, t1) => clamp((t - t0) / (t1 - t0)), smooth = (e0, e1, x) => {
    let t = seg(x, e0, e1);
    return t * t * (3 - 2 * t);
  };
  var ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    inQuart: (t) => t * t * t * t,
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inExpo: (t) => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
    outExpo: (t) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
    inSine: (t) => 1 - Math.cos(t * Math.PI / 2),
    outSine: (t) => Math.sin(t * Math.PI / 2),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    inBack: (t, s = 1.70158) => t <= 0 ? 0 : t >= 1 ? 1 : (s + 1) * t * t * t - s * t * t,
    outBack: (t, s = 1.70158) => t <= 0 ? 0 : t >= 1 ? 1 : 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    outElastic: (t) => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
    outBounce: (t) => t < 1 / 2.75 ? 7.5625 * t * t : t < 2 / 2.75 ? 7.5625 * (t -= 1.5 / 2.75) * t + 0.75 : t < 2.5 / 2.75 ? 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375 : 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
  };
  function hash(...ns) {
    let h = 2654435769;
    for (let n of ns)
      h = Math.imul(h ^ (n | 0), 2246822507), h ^= h >>> 13, h = Math.imul(h, 3266489909), h ^= h >>> 16;
    return h >>> 0;
  }
  var rand = (...ns) => hash(...ns) / 4294967296, Rng = class {
    constructor(seed = 1) {
      this.s = seed >>> 0 || 1;
    }
    next() {
      let t = this.s = this.s + 1831565813 >>> 0;
      return t = Math.imul(t ^ t >>> 15, t | 1), t ^= t + Math.imul(t ^ t >>> 7, t | 61), ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    range(a, b) {
      return a + (b - a) * this.next();
    }
    int(a, b) {
      return Math.floor(this.range(a, b + 1));
    }
    chance(p) {
      return this.next() < p;
    }
    sign() {
      return this.next() < 0.5 ? -1 : 1;
    }
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    }
    /** Roughly normal, mean 0, sd 1. */
    gauss() {
      return (this.next() + this.next() + this.next() + this.next() - 2) * 1.732;
    }
  }, rng = (...ns) => new Rng(hash(...ns));
  function noise(x, seed = 0) {
    let i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(rand(i, seed), rand(i + 1, seed), u) * 2 - 1;
  }

  // ../dl_pixelfx/repo/src/core/color.js
  var rgb = (r, g, b) => 255 << 24 | (b & 255) << 16 | (g & 255) << 8 | r & 255, red = (c) => c & 255, green = (c) => c >>> 8 & 255, blue = (c) => c >>> 16 & 255;
  function hex(h) {
    if (typeof h == "number") return h;
    let s = h.replace("#", "");
    s.length === 3 && (s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]);
    let v = parseInt(s.slice(0, 6), 16);
    return rgb(v >> 16 & 255, v >> 8 & 255, v & 255);
  }
  var toHex = (c) => "#" + [red(c), green(c), blue(c)].map((v) => v.toString(16).padStart(2, "0")).join("");
  function mix(a, b, t) {
    return t = clamp(t), rgb(red(a) + (red(b) - red(a)) * t, green(a) + (green(b) - green(a)) * t, blue(a) + (blue(b) - blue(a)) * t);
  }
  var scale = (c, k) => rgb(Math.min(255, red(c) * k), Math.min(255, green(c) * k), Math.min(255, blue(c) * k)), luma = (c) => (0.299 * red(c) + 0.587 * green(c) + 0.114 * blue(c)) / 255, ramp = (list) => list.map(hex);
  function fit(r, n) {
    return r = r.map(hex), r.length === n ? r : Array.from({ length: n }, (_, i) => r[Math.round(i * (r.length - 1) / Math.max(1, n - 1))]);
  }
  var PAL = {
    fire: ["#1f0b10", "#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"],
    ember: ["#1a0a0e", "#3d1012", "#701a14", "#a8301a", "#e0561e", "#ff8a2a", "#ffc46a"],
    lava: ["#14060a", "#380a10", "#6e1210", "#ac2410", "#e8501a", "#ff8c2a", "#ffd25a"],
    smoke: ["#0e0c12", "#1d1a22", "#2e2a35", "#433e4b", "#5c5664", "#7b7484", "#a39cab"],
    dust: ["#1c1610", "#33281c", "#4f3f2c", "#6e5a40", "#927a58", "#b89f78", "#dcc8a2"],
    ice: ["#0c1430", "#162c5c", "#1f4f94", "#2f7fcc", "#58b4ec", "#9bdcff", "#d8f4ff", "#ffffff"],
    water: ["#081830", "#0e2e5a", "#14508c", "#1c76bc", "#36a2e0", "#78ccf4", "#c4ecff", "#ffffff"],
    electric: ["#0a0f2e", "#172a78", "#2550d0", "#3f8cff", "#7cc8ff", "#c8f0ff", "#ffffff"],
    volt: ["#24160a", "#5e3a0c", "#a8680f", "#e8a218", "#ffd23c", "#fff08a", "#ffffff"],
    poison: ["#0d1a0c", "#173a14", "#265e18", "#3f8a1e", "#6cb82a", "#a8e04a", "#e0ff8a"],
    holy: ["#2a1c08", "#5a3e10", "#9a6c18", "#d8a428", "#ffd84a", "#fff09a", "#fffbe6", "#ffffff"],
    heal: ["#08201a", "#0f3f2c", "#17663e", "#24924e", "#3ec466", "#7ee88a", "#c8ffc4", "#ffffff"],
    arcane: ["#140a26", "#2b1252", "#481c88", "#6b2cc0", "#9a48ec", "#c684ff", "#ecc8ff", "#ffffff"],
    shadow: ["#050308", "#0f0a18", "#1c1230", "#2c1a4a", "#432468", "#5e3290", "#8048b8", "#a970e0"],
    blood: ["#14040a", "#3a0a14", "#6a101c", "#a01824", "#d42a30", "#ff5a50", "#ff9a8a"],
    earth: ["#140e0a", "#2a1e14", "#47321e", "#69492a", "#8e6638", "#b88a52", "#dcb47c"],
    stone: ["#0e0e12", "#1c1c24", "#2c2c38", "#42424f", "#5c5c6b", "#7d7d8c", "#a4a4b2", "#d0d0da"],
    gold: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"],
    leaf: ["#0c1a0e", "#163418", "#225224", "#357530", "#4f9a3a", "#7cc048", "#b4e070", "#e4ffb0"],
    wood: ["#160c06", "#2e1a0c", "#4a2c14", "#6a421e", "#8e5c2c", "#b47c40", "#d8a464"],
    metal: ["#0c0e14", "#1c2230", "#2e3648", "#4a5468", "#6e7a90", "#9aa6ba", "#d0d8e6", "#ffffff"],
    bone: ["#1a1814", "#3a352c", "#5e5648", "#8a806c", "#b8ad96", "#e4dcc8", "#fffaf0"],
    neon: ["#1a0516", "#3d0a33", "#701560", "#b0228f", "#f53cd1", "#ff86e6", "#ffd2f6", "#ffffff"],
    cyber: ["#041418", "#08303a", "#0c5260", "#108088", "#18b4b0", "#4ce8d8", "#b4fff0", "#ffffff"],
    matrix: ["#020a04", "#05200c", "#0a3c16", "#106624", "#1a9a34", "#3cd650", "#a4ffa8", "#e8ffe8"],
    candy: ["#ff4a5a", "#ff9a2a", "#ffe03c", "#5ad84a", "#3cc8ff", "#7a6cff", "#f53cd1"],
    night: ["#07060d", "#0c0a18", "#131026", "#1b1734", "#241f44", "#2f2956"]
  }, RAMP = Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, ramp(v)])), WHITE = hex("#ffffff"), BLACK = hex("#000000"), INK = hex("#0b0a10"), PATCH = hex("#f53cd1");

  // ../dl_pixelfx/repo/src/core/font.js
  var MINI = {
    A: ".#.|#.#|###|#.#|#.#",
    B: "##.|#.#|##.|#.#|##.",
    C: ".##|#..|#..|#..|.##",
    D: "##.|#.#|#.#|#.#|##.",
    E: "###|#..|##.|#..|###",
    F: "###|#..|##.|#..|#..",
    G: ".##|#..|#.#|#.#|.##",
    H: "#.#|#.#|###|#.#|#.#",
    I: "###|.#.|.#.|.#.|###",
    J: "..#|..#|..#|#.#|.#.",
    K: "#.#|#.#|##.|#.#|#.#",
    L: "#..|#..|#..|#..|###",
    M: "#.#|###|###|#.#|#.#",
    N: "##.|#.#|#.#|#.#|#.#",
    O: ".#.|#.#|#.#|#.#|.#.",
    P: "##.|#.#|##.|#..|#..",
    Q: ".#.|#.#|#.#|##.|.##",
    R: "##.|#.#|##.|#.#|#.#",
    S: ".##|#..|.#.|..#|##.",
    T: "###|.#.|.#.|.#.|.#.",
    U: "#.#|#.#|#.#|#.#|###",
    V: "#.#|#.#|#.#|#.#|.#.",
    W: "#.#|#.#|###|###|#.#",
    X: "#.#|#.#|.#.|#.#|#.#",
    Y: "#.#|#.#|.#.|.#.|.#.",
    Z: "###|..#|.#.|#..|###",
    0: "###|#.#|#.#|#.#|###",
    1: ".#.|##.|.#.|.#.|###",
    2: "##.|..#|.#.|#..|###",
    3: "##.|..#|.#.|..#|##.",
    4: "#.#|#.#|###|..#|..#",
    5: "###|#..|##.|..#|##.",
    6: ".##|#..|###|#.#|###",
    7: "###|..#|.#.|.#.|.#.",
    8: "###|#.#|###|#.#|###",
    9: "###|#.#|###|..#|##.",
    "+": "...|.#.|###|.#.|...",
    "-": "...|...|###|...|...",
    "!": "#|#|#|.|#",
    "?": "##.|..#|.#.|...|.#.",
    ".": ".|.|.|.|#",
    ",": "..|..|..|.#|#.",
    ":": ".|#|.|#|.",
    "/": "..#|..#|.#.|#..|#..",
    "%": "#.#|..#|.#.|#..|#.#",
    x: "...|#.#|.#.|#.#|...",
    "*": "#.#|.#.|#.#|...|...",
    "'": "#|#|.|.|.",
    "(": ".#|#.|#.|#.|.#",
    ")": "#.|.#|.#|.#|#.",
    "<": "..#|.#.|#..|.#.|..#",
    ">": "#..|.#.|..#|.#.|#..",
    "=": "...|###|...|###|...",
    _: "...|...|...|...|###",
    "#": "#.#|###|#.#|###|#.#"
  }, BIG = {
    A: ".###.|#...#|#...#|#####|#...#|#...#|#...#",
    B: "####.|#...#|#...#|####.|#...#|#...#|####.",
    C: ".###.|#...#|#....|#....|#....|#...#|.###.",
    D: "####.|#...#|#...#|#...#|#...#|#...#|####.",
    E: "#####|#....|#....|####.|#....|#....|#####",
    F: "#####|#....|#....|####.|#....|#....|#....",
    G: ".###.|#...#|#....|#.###|#...#|#...#|.####",
    H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
    I: "###|.#.|.#.|.#.|.#.|.#.|###",
    J: "..###|...#.|...#.|...#.|...#.|#..#.|.##..",
    K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
    L: "#....|#....|#....|#....|#....|#....|#####",
    M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#",
    N: "#...#|#...#|##..#|#.#.#|#..##|#...#|#...#",
    O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
    P: "####.|#...#|#...#|####.|#....|#....|#....",
    Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
    R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
    S: ".####|#....|#....|.###.|....#|....#|####.",
    T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
    U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.",
    V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
    W: "#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.",
    X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
    Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..",
    Z: "#####|....#|...#.|..#..|.#...|#....|#####",
    0: ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.",
    1: ".#.|##.|.#.|.#.|.#.|.#.|###",
    2: ".###.|#...#|....#|...#.|..#..|.#...|#####",
    3: "#####|...#.|..#..|...#.|....#|#...#|.###.",
    4: "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",
    5: "#####|#....|####.|....#|....#|#...#|.###.",
    6: "..##.|.#...|#....|####.|#...#|#...#|.###.",
    7: "#####|....#|...#.|..#..|.#...|.#...|.#...",
    8: ".###.|#...#|#...#|.###.|#...#|#...#|.###.",
    9: ".###.|#...#|#...#|.####|....#|...#.|.##..",
    "!": "#|#|#|#|#|.|#",
    "?": ".###.|#...#|....#|...#.|..#..|.....|..#..",
    "+": ".....|..#..|..#..|#####|..#..|..#..|.....",
    "-": "....|....|....|####|....|....|....",
    ".": ".|.|.|.|.|.|#",
    ",": "..|..|..|..|..|.#|#.",
    ":": ".|.|#|.|.|#|.",
    "/": "....#|....#|...#.|..#..|.#...|#....|#....",
    "%": "##...|##..#|...#.|..#..|.#...|#..##|...##",
    x: ".....|.....|#...#|.#.#.|..#..|.#.#.|#...#",
    "*": ".....|..#..|#.#.#|.###.|#.#.#|..#..|.....",
    "'": "#|#|.|.|.|.|.",
    "<": "...#|..#.|.#..|#...|.#..|..#.|...#",
    ">": "#...|.#..|..#.|...#|..#.|.#..|#...",
    "=": "....|....|####|....|####|....|....",
    "(": "..#|.#.|#..|#..|#..|.#.|..#",
    ")": "#..|.#.|..#|..#|..#|.#.|#..",
    "#": ".#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#."
  };
  function build(table, h) {
    let out = {};
    for (let [ch, src] of Object.entries(table)) {
      let rows = src.split("|");
      if (out[ch] = { w: rows[0].length, rows: rows.map((r) => [...r].map((c) => c === "#")) }, rows.length !== h) throw new Error(`glyph ${ch} has ${rows.length} rows, expected ${h}`);
    }
    return out;
  }
  var FONTS = {
    mini: { h: 5, space: 2, gap: 1, glyphs: build(MINI, 5) },
    big: { h: 7, space: 3, gap: 1, glyphs: build(BIG, 7) }
  };
  function textWidth(str, font = "mini") {
    let F = FONTS[font], w = 0;
    for (let ch of String(str)) {
      let g = F.glyphs[ch] ?? F.glyphs[ch.toUpperCase()];
      w += (g ? g.w : F.space) + F.gap;
    }
    return Math.max(0, w - F.gap);
  }
  function rasterText(str, font, plot2) {
    let F = FONTS[font], x = 0;
    for (let ch of String(str)) {
      let g = F.glyphs[ch] ?? F.glyphs[ch.toUpperCase()];
      if (!g) {
        x += F.space + F.gap;
        continue;
      }
      for (let r = 0; r < F.h; r++) for (let c = 0; c < g.w; c++) g.rows[r][c] && plot2(x + c, r);
      x += g.w + F.gap;
    }
  }

  // ../dl_pixelfx/repo/src/core/painter.js
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16), OUT = { c: 0, a: 1, l: 0, k: 0 }, sprites = /* @__PURE__ */ new WeakMap(), call = (v, ...args) => typeof v == "function" ? v(...args) : v, Painter = class {
    constructor(frame2) {
      this.frame = frame2, this.reset();
    }
    /** Re-read the frame and clear placement, fade and light strength. */
    reset() {
      let f = this.frame;
      return this.w = f.w, this.h = f.h, this.ox = f.ox | 0, this.oy = f.oy | 0, this.C = f.color, this.L = f.light, this.tx = 0, this.ty = 0, this.fx = 1, this.cs = 1, this.sn = 0, this.fade = 1, this.lightK = 1, this.layer = "front", this;
    }
    /** Put the effect's origin at (x, y) in frame space, mirrored if flip, rotated by angle (radians). */
    place(x, y, flip = !1, angle = 0) {
      return this.tx = x, this.ty = y, this.fx = flip ? -1 : 1, this.cs = Math.cos(angle), this.sn = Math.sin(angle), this;
    }
    // ---- transforms: local (effect) space <-> screen (frame) space
    toX(x, y) {
      return this.tx + x * this.fx * this.cs - y * this.sn;
    }
    toY(x, y) {
      return this.ty + x * this.fx * this.sn + y * this.cs;
    }
    fromX(sx, sy) {
      let dx = sx - this.tx, dy = sy - this.ty;
      return (dx * this.cs + dy * this.sn) * this.fx;
    }
    fromY(sx, sy) {
      let dx = sx - this.tx, dy = sy - this.ty;
      return -dx * this.sn + dy * this.cs;
    }
    // the screen pixel of the local pixel cell holding (x, y): mirrors and rotations land on whole cells
    cellX(x, y) {
      return Math.floor(this.toX(Math.floor(x) + 0.5, Math.floor(y) + 0.5));
    }
    cellY(x, y) {
      return Math.floor(this.toY(Math.floor(x) + 0.5, Math.floor(y) + 0.5));
    }
    // ---- raw writes, screen space, whole pixels. Color 0 means "nothing": it never erases what's there.
    put(sx, sy, c, a = 1) {
      if (!c || (a *= this.fade, a < 1 && a <= BAYER[(sy & 3) << 2 | sx & 3])) return;
      let x = sx - this.ox, y = sy - this.oy;
      x < 0 || y < 0 || x >= this.w || y >= this.h || (this.C[y * this.w + x] = c);
    }
    add(sx, sy, c, k = 1) {
      if (k *= this.fade * this.lightK, k <= 4e-3) return;
      let x = sx - this.ox, y = sy - this.oy;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      let i = y * this.w + x, d = this.L[i], r = Math.min(255, (d & 255) + (c & 255) * k) | 0, g = Math.min(255, (d >>> 8 & 255) + (c >>> 8 & 255) * k) | 0, b = Math.min(255, (d >>> 16 & 255) + (c >>> 16 & 255) * k) | 0;
      this.L[i] = 255 << 24 | b << 16 | g << 8 | r;
    }
    /**
     * Blend a color over what's there at alpha a (0..1), keeping the result's own alpha: soft smoke, vapour and
     * mist. Use dithered dot() for hard pixel fades and blend() for translucent volumes.
     */
    blendPx(sx, sy, c, a) {
      if (a *= this.fade, !c || a <= 4e-3) return;
      let x = sx - this.ox, y = sy - this.oy;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      let i = y * this.w + x, d = this.C[i], da = (d >>> 24) / 255, oa = a + da * (1 - a), k = a / oa, ch = (s) => (c >>> s & 255) * k + (d >>> s & 255) * (1 - k) & 255;
      this.C[i] = (oa * 255 & 255) << 24 | ch(16) << 16 | ch(8) << 8 | ch(0);
    }
    /** Translucent pixel at a local point. */
    blend(x, y, c, a) {
      this.blendPx(this.cellX(x, y), this.cellY(x, y), c, a);
    }
    /** A translucent disc: puffs of smoke, vapour, dust. c and a may be functions of (d: 0 center..1 rim, angle). */
    disc(cx, cy, r, c, a) {
      if (r < 0.5) return this.blend(cx, cy, call(c, 0, 0), call(a, 0, 0));
      this.each(cx - r, cy - r, cx + r, cy + r, (x, y, sx, sy) => {
        let dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        if (d2 > r * r) return;
        let d = Math.sqrt(d2) / r, ang = Math.atan2(dy, dx);
        this.blendPx(sx, sy, call(c, d, ang), call(a, d, ang));
      });
    }
    /** Read back the color under a local point (0 if empty). */
    get(x, y) {
      let sx = this.cellX(x, y) - this.ox, sy = this.cellY(x, y) - this.oy;
      return sx < 0 || sy < 0 || sx >= this.w || sy >= this.h ? 0 : this.C[sy * this.w + sx];
    }
    // ---- pixels
    /** One opaque pixel. */
    px(x, y, c) {
      this.put(this.cellX(x, y), this.cellY(x, y), c, 1);
    }
    /** One pixel at alpha a (0..1), faded by ordered dither. */
    dot(x, y, c, a = 1) {
      a > 0 && this.put(this.cellX(x, y), this.cellY(x, y), c, a);
    }
    /** Add light to one pixel. */
    light(x, y, c, k = 1) {
      this.add(this.cellX(x, y), this.cellY(x, y), c, k);
    }
    /**
     * Visit every screen pixel whose center falls in the local box [x0, x1] x [y0, y1], with that center in
     * local space: fn(lx, ly, sx, sy). The basis of every filled shape, so shapes mirror and rotate exactly.
     */
    each(x0, y0, x1, y1, fn) {
      let ax = 1 / 0, bx = -1 / 0, ay = 1 / 0, by = -1 / 0;
      for (let k = 0; k < 4; k++) {
        let x = k & 1 ? x1 : x0, y = k & 2 ? y1 : y0, sx = this.toX(x, y), sy = this.toY(x, y);
        sx < ax && (ax = sx), sx > bx && (bx = sx), sy < ay && (ay = sy), sy > by && (by = sy);
      }
      let sx0 = Math.max(Math.floor(ax), this.ox), sx1 = Math.min(Math.ceil(bx), this.ox + this.w - 1), sy0 = Math.max(Math.floor(ay), this.oy), sy1 = Math.min(Math.ceil(by), this.oy + this.h - 1);
      for (let sy = sy0; sy <= sy1; sy++)
        for (let sx = sx0; sx <= sx1; sx++) {
          let cx = sx + 0.5, cy = sy + 0.5;
          fn(this.fromX(cx, cy), this.fromY(cx, cy), sx, sy);
        }
    }
    /**
     * A pixel shader over a local box. fn(x, y, out) returns a color, or sets out.c (color), out.a (alpha),
     * out.l (light color, defaults to out.c) and out.k (light amount). Return nothing to leave the pixel alone.
     */
    shade(x0, y0, x1, y1, fn) {
      let o = OUT;
      this.each(x0, y0, x1, y1, (lx, ly, sx, sy) => {
        o.c = 0, o.a = 1, o.l = 0, o.k = 0;
        let c = fn(lx, ly, o) || o.c;
        c && this.put(sx, sy, c, o.a), o.k > 0 && this.add(sx, sy, o.l || c, o.k);
      });
    }
    // ---- shapes. Colors (c) and alphas (a) can be numbers or functions of the shape's own coordinates.
    /** 1 px line. c and a may be functions of u (0 at the start, 1 at the end). */
    line(x0, y0, x1, y1, c, a = 1) {
      let sx = this.cellX(x0, y0), sy = this.cellY(x0, y0), ex = this.cellX(x1, y1), ey = this.cellY(x1, y1), dx = Math.abs(ex - sx), dy = -Math.abs(ey - sy), stepx = sx < ex ? 1 : -1, stepy = sy < ey ? 1 : -1, n = Math.max(dx, -dy) || 1, fc = typeof c == "function", fa = typeof a == "function", err = dx + dy, i = 0;
      for (; ; ) {
        let u = i++ / n;
        if (this.put(sx, sy, fc ? c(u) : c, fa ? a(u) : a), sx === ex && sy === ey) break;
        let e2 = 2 * err;
        e2 >= dy && (err += dy, sx += stepx), e2 <= dx && (err += dx, sy += stepy);
      }
    }
    /** Lines through a list of points [[x, y], ...]. */
    polyline(pts, c, a = 1) {
      for (let i = 1; i < pts.length; i++) this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c, a);
    }
    /** Thick segment with round ends. c and a may be functions of (u along, v across: 0 center, 1 edge). */
    beam(x0, y0, x1, y1, width, c, a = 1) {
      let r = width / 2, dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1e-9;
      this.shade(Math.min(x0, x1) - r, Math.min(y0, y1) - r, Math.max(x0, x1) + r, Math.max(y0, y1) + r, (x, y, o) => {
        let u = clamp(((x - x0) * dx + (y - y0) * dy) / L2), px = x0 + dx * u - x, py = y0 + dy * u - y, d2 = px * px + py * py;
        if (d2 > r * r) return;
        let v = Math.sqrt(d2) / r;
        o.c = call(c, u, v), o.a = call(a, u, v);
      });
    }
    /** Filled disc. c and a may be functions of (d: 0 center to 1 rim, angle). */
    circle(cx, cy, r, c, a = 1) {
      if (r < 0.6) return this.dot(cx, cy, call(c, 0, 0), call(a, 0, 0));
      this.shade(cx - r, cy - r, cx + r, cy + r, (x, y, o) => {
        let dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        if (d2 > r * r) return;
        let d = Math.sqrt(d2) / r, ang = Math.atan2(dy, dx);
        o.c = call(c, d, ang), o.a = call(a, d, ang);
      });
    }
    /** Ellipse. c and a may be functions of (d: 0 center to 1 rim, angle). */
    ellipse(cx, cy, rx, ry, c, a = 1) {
      rx <= 0 || ry <= 0 || this.shade(cx - rx, cy - ry, cx + rx, cy + ry, (x, y, o) => {
        let dx = (x - cx) / rx, dy = (y - cy) / ry, d2 = dx * dx + dy * dy;
        if (d2 > 1) return;
        let d = Math.sqrt(d2), ang = Math.atan2(dy, dx);
        o.c = call(c, d, ang), o.a = call(a, d, ang);
      });
    }
    /** Ring from radius r - w to r. c and a may be functions of (v: 0 inner to 1 outer, angle). */
    ring(cx, cy, r, w, c, a = 1) {
      let r0 = Math.max(0, r - w);
      this.shade(cx - r, cy - r, cx + r, cy + r, (x, y, o) => {
        let dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        if (d2 > r * r || d2 < r0 * r0) return;
        let v = w > 0 ? (Math.sqrt(d2) - r0) / (r - r0 || 1) : 1, ang = Math.atan2(dy, dx);
        o.c = call(c, v, ang), o.a = call(a, v, ang);
      });
    }
    /**
     * Band of a ring from angle a0 to a1 (radians, a1 > a0), radius r - w to r: the slash and smear shape.
     * c and a may be functions of (u: 0 at a0 to 1 at a1, v: 0 inner to 1 outer). w can be a function of u
     * for a crescent that tapers at both ends.
     */
    arc(cx, cy, r, w, a0, a1, c, a = 1) {
      let span = a1 - a0, wf = typeof w == "function";
      this.shade(cx - r, cy - r, cx + r, cy + r, (x, y, o) => {
        let dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
        if (d > r) return;
        let ang = Math.atan2(dy, dx) - a0;
        if (ang -= Math.floor(ang / (Math.PI * 2)) * Math.PI * 2, ang > span) return;
        let u = ang / span, ww = wf ? w(u) : w;
        if (ww <= 0 || d < r - ww) return;
        let v = (d - (r - ww)) / ww;
        o.c = call(c, u, v), o.a = call(a, u, v);
      });
    }
    /** Filled rectangle. */
    rect(x, y, w, h, c, a = 1) {
      if (this.sn === 0) {
        let X0 = Math.round(x), Y0 = Math.round(y), X1 = Math.round(x + w), Y1 = Math.round(y + h);
        for (let yy = Y0; yy < Y1; yy++) for (let xx = X0; xx < X1; xx++) this.put(this.cellX(xx, yy), this.cellY(xx, yy), c, a);
        return;
      }
      this.shade(x, y, x + w, y + h, (lx, ly, o) => {
        lx < x || ly < y || lx >= x + w || ly >= y + h || (o.c = c, o.a = a);
      });
    }
    /** Filled polygon from points [[x, y], ...] (even-odd rule). */
    poly(pts, c, a = 1) {
      let x0 = 1 / 0, y0 = 1 / 0, x1 = -1 / 0, y1 = -1 / 0;
      for (let [x, y] of pts)
        x < x0 && (x0 = x), x > x1 && (x1 = x), y < y0 && (y0 = y), y > y1 && (y1 = y);
      let n = pts.length;
      this.shade(x0, y0, x1, y1, (x, y, o) => {
        let inside = !1;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          let [xi, yi] = pts[i], [xj, yj] = pts[j];
          yi > y != yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi && (inside = !inside);
        }
        inside && (o.c = call(c, x, y), o.a = call(a, x, y));
      });
    }
    tri(x0, y0, x1, y1, x2, y2, c, a = 1) {
      this.poly([[x0, y0], [x1, y1], [x2, y2]], c, a);
    }
    // ---- light
    /** Radial glow into the light buffer: k at the center, falling to 0 at radius r. */
    glow(x, y, r, c, k = 0.5) {
      if (r < 1 || k <= 4e-3) return;
      let cx = this.toX(x, y), cy = this.toY(x, y), x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r), y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
      for (let sy = y0; sy <= y1; sy++) {
        let dy = (sy + 0.5 - cy) / r;
        for (let sx = x0; sx <= x1; sx++) {
          let dx = (sx + 0.5 - cx) / r, d = dx * dx + dy * dy;
          if (d >= 1) continue;
          let f = 1 - Math.sqrt(d);
          this.add(sx, sy, c, f * f * k);
        }
      }
    }
    /** Glow around a segment (a soft beam of light). */
    glowLine(x0, y0, x1, y1, r, c, k = 0.5) {
      if (r < 1 || k <= 4e-3) return;
      let ax = this.toX(x0, y0), ay = this.toY(x0, y0), bx = this.toX(x1, y1), by = this.toY(x1, y1), dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9, X0 = Math.floor(Math.min(ax, bx) - r), X1 = Math.ceil(Math.max(ax, bx) + r), Y0 = Math.floor(Math.min(ay, by) - r), Y1 = Math.ceil(Math.max(ay, by) + r);
      for (let sy = Y0; sy <= Y1; sy++)
        for (let sx = X0; sx <= X1; sx++) {
          let px = sx + 0.5, py = sy + 0.5, u = clamp(((px - ax) * dx + (py - ay) * dy) / L2), ex = ax + dx * u - px, ey = ay + dy * u - py, d = Math.sqrt(ex * ex + ey * ey) / r;
          if (d >= 1) continue;
          let f = 1 - d;
          this.add(sx, sy, c, f * f * k);
        }
    }
    /** Glow hugging a circle of radius R (a shockwave's light), falling off over width r. */
    glowRing(x, y, R, r, c, k = 0.5) {
      if (r < 1 || k <= 4e-3) return;
      let cx = this.toX(x, y), cy = this.toY(x, y), E = R + r;
      for (let sy = Math.floor(cy - E); sy <= Math.ceil(cy + E); sy++)
        for (let sx = Math.floor(cx - E); sx <= Math.ceil(cx + E); sx++) {
          let d = Math.abs(Math.hypot(sx + 0.5 - cx, sy + 0.5 - cy) - R) / r;
          if (d >= 1) continue;
          let f = 1 - d;
          this.add(sx, sy, c, f * f * k);
        }
    }
    // ---- sprites, text, masks
    /**
     * A little sprite from strings: rows like ["..##..", ".#oo#."], pal maps characters to colors
     * ({ "#": "#222034", o: 0xff... }); "." and " " are empty. Top-left at (x, y).
     * opts: { scale, a, flip (mirror left-right), flipY (upside down), tint (draw every pixel in one color) }.
     */
    sprite(rows, pal, x, y, opts = {}) {
      let s = sprites.get(rows);
      s || sprites.set(rows, s = rows.map((r) => [...r]));
      let k = opts.scale ?? 1, a = opts.a ?? 1, W = s[0]?.length ?? 0, cache = {};
      for (let r = 0; r < s.length; r++)
        for (let q = 0; q < s[r].length; q++) {
          let ch = s[r][q];
          if (ch === "." || ch === " ") continue;
          let c = opts.tint;
          if (c === void 0 && (c = cache[ch], c === void 0 && (c = cache[ch] = pal[ch] === void 0 ? 0 : hex(pal[ch]))), !c) continue;
          let col = opts.flip ? W - 1 - q : q, row = opts.flipY ? s.length - 1 - r : r;
          k === 1 ? this.dot(x + col, y + row, c, a) : this.rect(x + col * k, y + row * k, k, k, c, a);
        }
    }
    /**
     * Pixel text. opts: { font: "mini" (3x5) | "big" (5x7), scale, align: "left" | "center" | "right",
     * outline: color, shadow: color, a }. (x, y) is the top of the text, at the left, center or right.
     */
    text(str, x, y, c, opts = {}) {
      let font = opts.font ?? "mini", k = opts.scale ?? 1, a = opts.a ?? 1, w = textWidth(str, font) * k, left = Math.round(opts.align === "center" ? x - w / 2 : opts.align === "right" ? x - w : x), top = Math.round(y), ol = opts.outline, sh = opts.shadow;
      ol !== void 0 && rasterText(str, font, (gx, gy) => this.rect(left + gx * k - 1, top + gy * k - 1, k + 2, k + 2, ol, a)), sh !== void 0 && rasterText(str, font, (gx, gy) => this.rect(left + gx * k + 1, top + gy * k + 1, k, k, sh, a)), rasterText(str, font, (gx, gy) => this.rect(left + gx * k, top + gy * k, k, k, call(c, gx, gy), a));
    }
    /** Size of text in pixels: [w, h]. */
    measure(str, opts = {}) {
      let k = opts.scale ?? 1;
      return [textWidth(str, opts.font ?? "mini") * k, FONTS[opts.font ?? "mini"].h * k];
    }
    /** Fill a mask ({ w, h, data }) with its top-left at (x, y). c may be a function of (mx, my). */
    mask(m, x, y, c, a = 1) {
      for (let my = 0; my < m.h; my++)
        for (let mx = 0; mx < m.w; mx++) m.data[my * m.w + mx] && this.dot(x + mx, y + my, call(c, mx, my), call(a, mx, my));
    }
    /** The 1 px outline just outside a mask. */
    outline(m, x, y, c, a = 1) {
      let at = (mx, my) => mx >= 0 && my >= 0 && mx < m.w && my < m.h && m.data[my * m.w + mx];
      for (let my = -1; my <= m.h; my++)
        for (let mx = -1; mx <= m.w; mx++)
          !at(mx, my) && (at(mx - 1, my) || at(mx + 1, my) || at(mx, my - 1) || at(mx, my + 1)) && this.dot(x + mx, y + my, call(c, mx, my), call(a, mx, my));
    }
  };

  // ../dl_pixelfx/repo/src/core/actor.js
  var HERO = [
    "....kkkkk...",
    "..kkhhhhhk..",
    ".khhhhhhhhk.",
    ".khhhhhhhhhk",
    ".khhssssshhk",
    ".khsessesshk",
    ".khsessesshk",
    "..ksssssssk.",
    "...kkSSSkk..",
    "..kttttttk..",
    ".kttTttTttk.",
    ".ksttTTttsk.",
    ".kstttttttk.",
    "..kbbbbbbk..",
    "..kppkkppk..",
    "..kppk.kppk.",
    "..kppk.kppk.",
    "..koook.kook",
    "..kkkkk.kkkk"
  ], HERO_PAL = {
    k: "#17121f",
    h: "#7a4128",
    s: "#f3c49d",
    S: "#c98b6c",
    e: "#17121f",
    t: "#5f6f94",
    T: "#46536f",
    b: "#8a5a32",
    p: "#38334a",
    o: "#6a4030",
    // the 2x character's extra detail
    H: "#a35d34",
    w: "#ffffff",
    m: "#a3564a",
    g: "#e8c060",
    L: "#7f90b6",
    O: "#8f5a3f",
    P: "#4b4560",
    // the scarf
    c: "#f53cd1",
    C: "#ff8fe6",
    D: "#a31f8a"
  }, DUMMY_PAL = {
    k: "#0e0c14",
    A: "#e4e6ec",
    B: "#b6b9c3",
    C: "#868995",
    D: "#5c5e6a",
    E: "#6e707c",
    F: "#4b4d58",
    G: "#34353f",
    J: "#2a2b33",
    m: "#f53cd1"
  }, HERO2 = [
    "...........kkk..........",
    "..........kAABk.........",
    ".........kAAABJk........",
    ".........kABBJJk........",
    ".........kBBBJCDk.......",
    ".........kBCJDDDk.......",
    ".........kkJJJDk........",
    ".......kkkkABBJCkk......",
    "......kAABCJBCCCkDk.....",
    "......kABBCJCCCmDkDk....",
    "......kBBCDDJCDDDkDk....",
    "......kABCDJDDDDDkk.....",
    ".....kAABDkDDDDJkk......",
    ".....kABCDkDDJJGkk......",
    ".....kABCkJJJGGGkk......",
    "....kJJCDkFFFGGGk.......",
    "....kAJJDkJJJGGGk.......",
    "....kJCJJkABBJGGk.......",
    ".....kJCCkBBCDJJJk......",
    ".....kCCCJBBCDJJDk......",
    ".....kCCCDJCCDkJDDk.....",
    "......kCDDJBCDkDDDk.....",
    ".......kDJJJCDkDDDkk....",
    ".......kJBCJCDkDDDkk....",
    ".......kBDJBCDkCDDkk....",
    "........kJJBCDkCDDk.....",
    "........kBBBCDkCCDDk....",
    "........kBBBCDkCCDDk....",
    ".........kBBCDkJDDDk....",
    "........kBJJJJkCJJJk....",
    "........kBBCCDkCCDDk....",
    "........kBBCDDkCDDk.....",
    "........kBBCDkCCDDk.....",
    "........kBCCDkCCDDk.....",
    "........kBCDDkCDDDk.....",
    ".......kJBCJkkkDJkkkk...",
    ".......kAJJAAAAkCCCCCk..",
    "........kkkkkkkkkkkkk..."
  ];
  function maskOf(rows, k = 1) {
    let h = rows.length * k, w = rows[0].length * k, data = new Uint8Array(w * h);
    return rows.forEach((r, y) => [...r].forEach((ch, x) => {
      if (ch !== ".")
        for (let j = 0; j < k * k; j++) data[(y * k + (j / k | 0)) * w + x * k + j % k] = 1;
    })), { w, h, data };
  }
  var MASKS = { 1: maskOf(HERO, 1), 2: maskOf(HERO2, 1) };
  function pixelsOf(rows, pal) {
    let w = rows[0].length, data = new Uint32Array(w * rows.length);
    return rows.forEach((r, y) => [...r].forEach((ch, x) => data[y * w + x] = ch === "." ? 0 : hex(pal[ch]))), data;
  }
  var PIXELS = { 1: pixelsOf(HERO, HERO_PAL), 2: pixelsOf(HERO2, DUMMY_PAL) };
  function stockActor(k = 1) {
    k = k === 2 ? 2 : 1;
    let m = MASKS[k], x = -Math.floor(m.w / 2), y = -m.h;
    return { mask: m, pixels: PIXELS[k], x, y, w: m.w, h: m.h, k, head: [0, y], chest: [0, k === 2 ? -26 : y + 11], ...k === 2 ? { eyes: [[13, 3], [15, 3]] } : {} };
  }

  // ../dl_pixelfx/repo/src/core/fx.js
  function createFrame(w, h, ox = 0, oy = 0) {
    return { w, h, ox, oy, color: new Uint32Array(w * h), light: new Uint32Array(w * h) };
  }
  function clearFrame(f) {
    return f.color.fill(0), f.light.fill(0), f;
  }
  var painters = /* @__PURE__ */ new WeakMap();
  function painterFor(frame2) {
    let p = painters.get(frame2);
    return p || painters.set(frame2, p = new Painter(frame2)), p.reset();
  }
  var FADE = 0.3, isRamp = (v) => Array.isArray(v) && v.length > 0 && v.every((c) => typeof c == "number" || /^#[0-9a-f]{3,8}$/i.test(c));
  function resolveOptions(meta22, o = {}) {
    let opts = { ...meta22.options ?? {}, ...o };
    for (let [k, def] of Object.entries(meta22.options ?? {}))
      isRamp(def) && isRamp(o[k]) && o[k].length !== def.length && (opts[k] = fit(o[k], def.length).map(toHex));
    return meta22.actor && !opts.actor && (opts.actor = stockActor(meta22.actor === 2 ? 2 : 1)), opts;
  }
  function createFx(mod, o = {}) {
    let meta22 = mod.meta ?? {}, opts = resolveOptions(meta22, o), impl = mod.create ? mod.create(opts) : mod, D7 = meta22.duration ?? 1, t = 0, stopAt = 1 / 0;
    return {
      meta: meta22,
      options: opts,
      get t() {
        return t;
      },
      update(dt) {
        if (t += dt, !impl.update) return;
        let n = Math.max(1, Math.ceil(dt * 120 - 1e-9));
        for (let i = 0; i < n; i++) impl.update(dt / n, opts);
      },
      draw(frame2, layer) {
        let p = painterFor(frame2);
        p.place(opts.x ?? 0, opts.y ?? 0, !!opts.flip, opts.angle ?? 0), p.fade = stopAt === 1 / 0 ? 1 : clamp(1 - (t - stopAt) / FADE), p.lightK = opts.light ?? 1;
        let tt = meta22.loop ? t % D7 : Math.min(t, D7);
        layer !== "front" && impl.drawBack && (p.layer = "back", impl.drawBack(p, tt, opts)), layer !== "back" && (p.layer = "front", impl.draw(p, tt, opts));
      },
      /** Let it end: loops fade out, one-shots cut short. */
      stop() {
        stopAt === 1 / 0 && (stopAt = t);
      },
      done() {
        return t - stopAt >= FADE || !meta22.loop && t >= D7;
      }
    };
  }

  // ../dl_pixelfx/repo/src/fx/impacts/hit-spark.js
  var hit_spark_exports = {};
  __export(hit_spark_exports, {
    create: () => create,
    meta: () => meta
  });

  // ../dl_pixelfx/repo/src/core/particles.js
  function fly(x, y, vx, vy, t, g = 0, drag = 0) {
    if (drag <= 0) return [x + vx * t, y + vy * t + 0.5 * g * t * t];
    let f = (1 - Math.exp(-drag * t)) / drag, vt = g / drag;
    return [x + vx * f, y + vt * t + (vy - vt) * f];
  }
  function cycle(t, period, count, seed, life, fn) {
    for (let i = 0; i < count; i++) {
      let g = rng(seed, i, 911), born = g.next() * period, L = typeof life == "function" ? life(g) : life, age = ((t - born) % period + period) % period;
      for (; age < L; age += period) fn(age, L, rng(seed, i), i);
    }
  }

  // ../dl_pixelfx/repo/src/core/sim.js
  var GRAVITY = 950, CROSS = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]], HOT = ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"].map(hex), FIRE_RAMP = ["#ffffff", "#fff3a6", "#ffe26b", "#ffc23d", "#ff8a2a", "#f2561d", "#c9281f", "#8a1f17", "#4a1712"].map(hex), SMOKE_RAMP = ["#7b6f72", "#5d5660", "#433d48", "#2b2630", "#1a171e"].map(hex), rampAt = (r, t) => r[Math.min(r.length - 1, Math.max(0, Math.floor(t * r.length)))], P = { SPARK: 0, MOTE: 1, STREAK: 2, FLAKE: 3, VAPOUR: 4, DUST: 5, STAR: 6, EMBER: 7, SMOKE: 8, FIRE: 9, BRAND: 10, GRIT: 11 }, PF = { SMOKES: 1, BIG: 2, BACK: 4 }, SOFT = /* @__PURE__ */ new Set([P.VAPOUR, P.DUST, P.SMOKE]), Particles = class {
    constructor(opts = {}) {
      this.R = opts.rng ?? new Rng(opts.seed ?? 1), this.list = [], this.t = 0, this.ground = opts.ground ?? (() => 1 / 0), this.sparks = (opts.sparks ?? HOT).map(hex), this.haze = opts.haze === void 0 ? null : hex(opts.haze), this.onLand = opts.onLand ?? null;
    }
    /** delay: seconds before it appears; flag: PF bits. col 0 lets FIRE and SMOKE use their own ramps. */
    spawn(k, x, y, vx, vy, life, col = WHITE, size = 1, delay = 0, flag = 0) {
      this.list.push({ k, x, y, vx, vy, life, max: life, col: col ? hex(col) : 0, size, seed: this.R.next() * 100, delay, flag });
    }
    get count() {
      return this.list.length;
    }
    update(dt) {
      this.t += dt;
      let R = this.R, t = this.t;
      for (let i = this.list.length - 1; i >= 0; i--) {
        let p = this.list[i];
        if (p.delay > 0) {
          p.delay -= dt;
          continue;
        }
        if ((p.life -= dt) <= 0) {
          if (p.k === P.FIRE && p.flag & PF.SMOKES) {
            let big = p.flag & PF.BIG;
            this.spawn(P.SMOKE, p.x, p.y, p.vx * 0.6, p.vy * 0.6 - 6, big ? R.range(1.3, 2.3) : R.range(0.8, 1.4), 0, p.size * (big ? 0.85 : 0.7), 0, big ? PF.BIG : 0);
          }
          this.list.splice(i, 1);
          continue;
        }
        switch (p.k) {
          case P.FIRE:
            p.vy -= 95 * dt, p.vx += Math.sin(t * 17 + p.seed) * 30 * dt, p.vx -= p.vx * 5 * dt, p.vy -= p.vy * 3.2 * dt;
            break;
          case P.GRIT: {
            p.vy += GRAVITY * dt, p.vx -= p.vx * 0.8 * dt;
            let g = this.ground(p.x), ny = p.y + p.vy * dt;
            p.x += p.vx * dt, p.vy > 0 && p.y <= g && ny >= g ? (p.y = g - 0.25, p.vy > 130 && R.chance(0.4) ? (p.vy = -p.vy * 0.25, p.vx = p.vx * 0.5 + R.range(-10, 10)) : (p.vx = p.vy = 0, p.life = Math.min(p.life, 0.5))) : p.y = ny;
            continue;
          }
          case P.BRAND: {
            p.vy += GRAVITY * 0.8 * dt, p.vx -= p.vx * 0.9 * dt, R.chance(0.9 * Math.min(1, dt * 60)) && this.spawn(P.FIRE, p.x, p.y, p.vx * 0.1 + R.range(-7, 7), p.vy * 0.1 - 10, R.range(0.16, 0.32), 0, R.range(0.9, 1.7) * (0.5 + p.life / p.max * 0.6), 0, R.chance(0.4) ? PF.SMOKES : 0);
            let g = this.ground(p.x), ny = p.y + p.vy * dt;
            p.x += p.vx * dt, p.vy > 0 && p.y <= g && ny >= g ? (this.onLand?.(p.x, g), this.list.splice(i, 1)) : p.y = ny;
            continue;
          }
          case P.SPARK: {
            p.vy += GRAVITY * 0.45 * dt, p.vx -= p.vx * 2.2 * dt, p.vy -= p.vy * 2.2 * dt;
            let g = this.ground(p.x), ny = p.y + p.vy * dt;
            p.x += p.vx * dt, p.vy > 0 && p.y <= g && ny >= g ? (p.vy = -p.vy * 0.45, p.vx *= 0.7, p.y = g - 0.25) : p.y = ny;
            continue;
          }
          case P.STREAK:
            p.vx += p.vx * 3 * dt, p.vy += p.vy * 3 * dt;
            break;
          case P.FLAKE:
            p.vx -= p.vx * 2.2 * dt, p.vy -= p.vy * 2.2 * dt - 35 * dt, p.x += Math.sin(this.t * 2.5 + p.seed) * 7 * dt;
            break;
          case P.EMBER:
            p.vy += (-30 + Math.sin(t * 3 + p.seed) * 20) * dt, p.vx += Math.cos(t * 2.3 + p.seed) * 45 * dt, p.vx -= p.vx * 1.6 * dt, p.vy -= p.vy * 1.6 * dt;
            break;
          case P.SMOKE: {
            let big = p.flag & PF.BIG;
            p.vy -= (big ? 23 : 16) * dt, p.vx += Math.sin(t * 1.3 + p.seed) * 8 * dt, p.vx -= p.vx * 1.6 * dt, p.vy -= p.vy * 1.2 * dt;
            break;
          }
          case P.MOTE:
            p.vx -= p.vx * 0.6 * dt, p.vy -= p.vy * 0.6 * dt;
            break;
          default: {
            let drag = SOFT.has(p.k) ? 4 : 1.6;
            p.vx -= p.vx * drag * dt, p.vy -= p.vy * drag * dt + 5 * dt;
          }
        }
        p.x += p.vx * dt, p.y += p.vy * dt;
      }
    }
    draw(p, layer) {
      for (let q of this.list) {
        if (q.delay > 0 || layer && (SOFT.has(q.k) || q.flag & PF.BACK ? "back" : "front") !== layer) continue;
        let k = q.life / q.max, x = q.x, y = q.y, sp = Math.hypot(q.vx, q.vy) || 1, ux = q.vx / sp, uy = q.vy / sp;
        switch (q.k) {
          case P.SPARK: {
            let S = this.sparks, head3 = k > 0.6 ? S[0] : k > 0.3 ? S[1] : S[2], len2 = Math.min(9, 1 + sp * 0.022);
            p.line(x - ux * len2, y - uy * len2, x - ux * len2 * 0.4, y - uy * len2 * 0.4, k > 0.5 ? head3 : S[S.length - 1]), p.line(x - ux * len2 * 0.45, y - uy * len2 * 0.45, x, y, head3), p.glow(x, y, 3, head3, 0.45 * k);
            break;
          }
          case P.MOTE: {
            let len2 = Math.min(16, 0.5 + sp * 0.026) * q.size, a = k < 0.35 ? k / 0.35 : 1;
            p.line(x - ux * len2, y - uy * len2, x - ux * len2 * 0.35, y - uy * len2 * 0.35, scale(q.col, 0.55), a), p.line(x - ux * len2 * 0.4, y - uy * len2 * 0.4, x, y, q.col, a), p.glow(x, y, 2.5 + q.size, q.col, 0.4 * k);
            break;
          }
          case P.STREAK: {
            let L = clamp(sp / 30, 1, 7);
            for (let d = L; d >= 0; d -= 0.5) p.dot(x - ux * d, y - uy * d, d < 1 ? WHITE : d < L * 0.5 ? q.col : scale(q.col, 0.6), d < L * 0.5 ? 1 : 1.2 - d / L);
            p.glow(x, y, 4, q.col, 0.4);
            break;
          }
          case P.FLAKE: {
            let a = Math.min(1, k * 3);
            if (p.dot(x, y, q.col, a), q.size > 1.3) for (let [dx, dy] of CROSS) p.dot(x + dx, y + dy, scale(q.col, 0.8), a * 0.8);
            break;
          }
          case P.VAPOUR: {
            let r = q.size * (0.6 + (1 - k) * 0.9);
            p.disc(x, y, r, q.col, Math.pow(k, 1.3) * 0.45), this.haze && p.glow(x, y, r * 1.8, this.haze, 0.16 * k);
            break;
          }
          case P.DUST:
            p.disc(x, y, q.size * (0.6 + (1 - k) * 0.9), q.col, Math.pow(k, 1.3) * 0.7);
            break;
          case P.SMOKE: {
            let age = 1 - k, big = q.flag & PF.BIG, r = q.size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * (big ? 0.5 : 0.4)), a = Math.min(1, age * 12) * Math.min(1, k * 2.4) * (big ? 0.7 : 0.58), c = q.col ? mix(q.col, rampAt(SMOKE_RAMP, age), age) : rampAt(SMOKE_RAMP, age * 1.05);
            p.disc(x, y, r, c, a * 0.45), p.disc(x + r * 0.05, y + r * 0.06, r * 0.74, c, a * 0.62), age < 0.5 && p.disc(x - r * 0.22, y - r * 0.3, r * 0.5, mix(c, WHITE, 0.12), a * 0.4 * (1 - age * 2));
            break;
          }
          case P.FIRE: {
            let age = 1 - k, heat = Math.min(0.999, Math.pow(age, 0.62) + q.seed % 1 * 0.1), F = FIRE_RAMP, n = F.length, idx = Math.min(n - 2, Math.floor(heat * (n - 1))), r = q.size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = F[idx];
            idx >= n - 2 ? p.disc(x, y, r, c, Math.min(1, k * 3) * 0.85) : (p.circle(x, y, r, F[Math.min(n - 1, idx + 2)]), p.circle(x - r * 0.16, y - r * 0.22, r * 0.78, c), r > 1.6 && p.circle(x, y - r * 0.9, r * 0.42, c), idx <= 3 && r > 1.8 && p.circle(x - r * 0.28, y - r * 0.34, r * 0.36, F[Math.max(0, idx - 1)]), idx < 6 && p.glow(x, y, r * 2.4 + 2, c, 0.18 * k));
            break;
          }
          case P.BRAND:
            p.circle(x, y, 1.6, HOT[3]), p.px(x, y, Math.sin(this.t * 40 + q.seed) > 0 ? HOT[0] : HOT[1]), p.px(x + 1, y, HOT[1]), p.glow(x, y, 7, HOT[2], 0.45);
            break;
          case P.GRIT:
            (k > 0.25 || k * 4 > 0.5) && (p.px(x, y, q.col), q.size >= 2 && (p.px(x + 1, y, q.col), p.px(x, y + 1, scale(q.col, 0.8)), p.px(x + 1, y + 1, scale(q.col, 0.7))));
            break;
          case P.EMBER: {
            let c = k > 0.6 ? this.sparks[0] : k > 0.3 ? this.sparks[1] : this.sparks[2];
            if (k < 0.25 && Math.sin(this.t * 40 + q.seed) < 0) break;
            p.px(x, y, c), q.size > 1.5 && p.px(x, y + 1, this.sparks[this.sparks.length - 1]), p.glow(x, y, 3 + q.size, c, 0.35 * k);
            break;
          }
          default: {
            let tw = 0.6 + 0.4 * Math.sin(this.t * (8 + q.seed % 5) + q.seed);
            if (q.size < 1) {
              tw * k > 0.25 && p.px(x, y, tw > 0.8 ? WHITE : q.col), p.glow(x, y, 3, q.col, 0.4 * k * tw);
              break;
            }
            sparkle(p, x, y, q.size * tw * Math.min(1, k * 3), q.col, scale(q.col, 0.75), 0.5 * k * tw);
          }
        }
      }
    }
  };
  var B = { SHARD: 0, CHUNK: 1, DRIP: 2 }, Bits = class {
    constructor(opts = {}) {
      this.list = [], this.ground = opts.ground ?? (() => 1 / 0);
    }
    add(b) {
      let life = b.life ?? 1;
      this.list.push({ kind: B.SHARD, vx: 0, vy: 0, a: 0, va: 0, s: 1, c: WHITE, g: 1, drag: 0, bounce: 0, rest: !1, ...b, life, max: life });
    }
    get count() {
      return this.list.length;
    }
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        let b = this.list[i];
        if ((b.life -= dt) <= 0) {
          this.list.splice(i, 1);
          continue;
        }
        if (b.rest) continue;
        b.vy += GRAVITY * b.g * dt, b.vx -= b.vx * b.drag * dt, b.vy -= b.vy * b.drag * dt, b.x += b.vx * dt, b.y += b.vy * dt, b.a += b.va * dt;
        let floor = this.ground(b.x), sp = b.vy;
        b.g <= 0 || b.y < floor || sp <= 0 || (b.y = floor - 0.01, b.kind === B.DRIP ? b.life = 0 : b.bounce > 0 && sp > 70 ? (b.vy = -sp * b.bounce, b.vx *= 0.7, b.va *= 0.6) : (b.rest = !0, b.vx = b.vy = 0));
      }
    }
    draw(p) {
      for (let b of this.list) {
        let a = Math.min(1, b.life / 0.4), ca = Math.cos(b.a), sa = Math.sin(b.a);
        if (b.kind === B.SHARD)
          for (let d = -b.s / 2; d <= b.s / 2; d += 0.5) p.dot(b.x + ca * d, b.y + sa * d, d > b.s / 2 - 0.6 ? WHITE : hex(b.c), a);
        else if (b.kind === B.DRIP)
          p.dot(b.x, b.y, hex(b.c), a), p.dot(b.x, b.y - 1, hex(b.c), a * 0.5);
        else {
          let R = (b.ramp ?? ["#1c2030", "#3a4a66", "#6e86a8", "#a8c0dc", "#e8f2ff"]).map(hex), n = R.length, x = Math.round(b.x), y = Math.round(b.y), r = Math.ceil(b.s) + 1;
          for (let py = -r; py <= r; py++)
            for (let px = -r; px <= r; px++) {
              let u = (px + 0.5) * ca + (py + 0.5) * sa, v = -(px + 0.5) * sa + (py + 0.5) * ca, d = Math.abs(u) / b.s + Math.abs(v) / (b.s * 0.62);
              d > 1.3 || p.dot(x + px, y + py, d > 1 ? R[0] : v < 0 ? u < 0 ? R[n - 1] : R[n - 2] : u < 0 ? R[n - 3] : R[Math.max(1, n - 4)], a);
            }
        }
      }
    }
  }, Lights = class {
    constructor() {
      this.list = [];
    }
    add(x, y, r, color, k, life) {
      this.list.push({ x, y, r, color: hex(color), k, life, max: life });
    }
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) (this.list[i].life -= dt) <= 0 && this.list.splice(i, 1);
    }
    draw(p) {
      for (let l of this.list) {
        let k = l.life / l.max;
        p.glow(l.x, l.y, l.r * (0.55 + 0.45 * k), l.color, l.k * k * k);
      }
    }
  };
  function sparkle(p, x, y, arm, c, tip = c, k = 0.6) {
    let n = Math.round(arm);
    if (n < 1) return;
    let X = Math.floor(x), Y = Math.floor(y);
    for (let d = 1; d <= n; d++) {
      let cc = d > n * 0.6 ? tip : c;
      for (let [dx, dy] of CROSS) p.px(X + dx * d, Y + dy * d, cc);
    }
    if (n >= 3) for (let [dx, dy] of DIAG) p.px(X + dx, Y + dy, c);
    if (n >= 6) for (let [dx, dy] of DIAG) p.px(X + dx * 2, Y + dy * 2, tip);
    p.px(X, Y, WHITE), p.glow(x, y, 4 + n * 2, c, k);
  }
  function flare(p, x, y, L, k, ramp2) {
    if (L < 1) return;
    let R = ramp2.map(hex), n = R.length;
    for (let i = 0; i < 8; i++) {
      let an = i * Math.PI / 4, len2 = i % 4 === 0 ? L : i % 2 === 0 ? L * 0.6 : L * 0.3, ca = Math.cos(an), sa = Math.sin(an);
      for (let d = 0; d <= len2; d += 0.5) {
        let u = d / len2;
        p.dot(x + ca * d, y + sa * d, u < 0.35 ? WHITE : u < 0.7 ? R[n - 2] : R[n - 3], u < 0.6 ? 1 : k * 1.5 * (1 - u) + 0.2);
      }
    }
  }
  function band(p, cx, cy, r, sy, th, k, ramp2, keep = () => !0, hot = !1) {
    if (r <= 0 || k <= 0) return;
    let R = ramp2.map(hex), n = R.length;
    for (let j = 0, m = Math.ceil(r * TAU * 1.2); j < m; j++) {
      let ang = j / m * TAU, ca = Math.cos(ang), sa = Math.sin(ang);
      if (keep(ang))
        for (let o = th; o >= 0; o -= 0.5) {
          let u = o / th, c = u < 0.15 ? hot ? WHITE : R[n - 1] : u < 0.4 ? R[n - 2] : u < 0.7 ? R[n - 3] : R[n - 4];
          p.dot(cx + ca * (r - o), cy + sa * (r - o) * sy, c, k * (u < 0.4 ? 1.2 : 1.15 - u));
        }
    }
  }

  // ../dl_pixelfx/repo/src/core/scene.js
  var SKY = hex("#15131d"), SKY_TOP = hex("#0d0b14"), SKY_LOW = hex("#221d33"), FLOOR_EDGE = hex("#4a4263"), FLOOR = hex("#2b2639"), FLOOR_DARK = hex("#211d2d"), MORTAR = hex("#1a1724");

  // ../dl_pixelfx/repo/src/core/rig.js
  var PAL2 = Object.fromEntries(Object.entries(DUMMY_PAL).map(([k, v]) => [k, hex(v) >>> 0])), INK2 = PAL2.k, SEAM = PAL2.J, MARK = PAL2.m, SHELL = [PAL2.A, PAL2.B, PAL2.C, PAL2.D], CORE = [PAL2.E, PAL2.F, PAL2.G, PAL2.G], DEG = Math.PI / 180;
  var add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = (a) => Math.hypot(a[0], a[1], a[2]), unit = (a) => mul(a, 1 / (len(a) || 1e-6)), rotY = (t) => {
    let c = Math.cos(t), s = Math.sin(t);
    return [c, 0, s, 0, 1, 0, -s, 0, c];
  }, rotZ = (t) => {
    let c = Math.cos(t), s = Math.sin(t);
    return [c, -s, 0, s, c, 0, 0, 0, 1];
  }, mm = (A, B2) => {
    let o = new Array(9);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = A[r * 3] * B2[c] + A[r * 3 + 1] * B2[3 + c] + A[r * 3 + 2] * B2[6 + c];
    return o;
  }, mv = (M2, v) => [M2[0] * v[0] + M2[1] * v[1] + M2[2] * v[2], M2[3] * v[0] + M2[4] * v[1] + M2[5] * v[2], M2[6] * v[0] + M2[7] * v[1] + M2[8] * v[2]];
  var clamp01 = (v) => Math.max(0, Math.min(1, v)), M = {
    pelvis: 19.7,
    spine1: 2.8,
    spine2: 4.6,
    shoulderUp: 2.5,
    shoulderOut: 5.9,
    neckUp: 4,
    headUp: 3.1,
    hipDown: 1.1,
    hipOut: 2.8,
    thigh: 8.6,
    shin: 8.3,
    upper: 7.6,
    fore: 7.4,
    turn: 36 * DEG
  }, STAND = { lean: 0, crouch: 0, yaw: 0, fx: -3, fy: -15, bx: 5, by: -15, ffx: -2, ffy: -4, fbx: 3, fby: -4 };
  function ik(a, target, L1, L2, pole) {
    let to = sub(target, a), d = len(to), reach = L1 + L2 - 0.02;
    d > reach && (to = mul(to, reach / d), d = reach);
    let u = unit(to), along3 = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - along3 * along3)), v = sub(pole, mul(u, dot(pole, u)));
    return v = len(v) < 1e-4 ? unit(cross(u, [0, 0, 1])) : unit(v), { joint: add(a, add(mul(u, along3), mul(v, h))), end: add(a, to), u, v };
  }
  function frame(t, R) {
    return { t, R };
  }
  function boneFrame(a, b, pole) {
    let x = unit(sub(b, a)), y = sub(pole, mul(x, dot(pole, x)));
    y = len(y) < 1e-4 ? unit(cross(x, [0, 0, 1])) : unit(y);
    let z = cross(x, y);
    return frame(a, [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]);
  }
  var weaponOf = (name) => WEAPONS[name];
  function solve(pose) {
    let q = { ...STAND, ...pose }, lean = q.lean, W = q.weapon && weaponOf(q.weapon), OW = q.offWeapon && weaponOf(q.offWeapon), sa = q.sa ?? 0, wl = q.wl ?? 1, axisZ = Math.sqrt(Math.max(0, 1 - wl * wl)) * (q.wz ?? 1), axis = [Math.cos(sa) * wl, -Math.sin(sa) * wl, axisZ], side = [-Math.sin(sa), -Math.cos(sa), 0], two = !!(q.two && W), nearZ = q.fz ?? (two ? 3 : 4.5), fwd = (q.fx - STAND.fx) / 24, farFwd = two ? 0 : (q.bx - STAND.bx) / 22, turn = M.turn + (fwd >= 0 ? -44 * DEG * Math.min(1, fwd) : 28 * DEG * Math.min(1, -fwd * 1.8));
    turn += (farFwd > 0 ? 34 * DEG * Math.min(1, farFwd) : 0) + (q.twist ?? 0) * 4 * DEG, q.turn !== void 0 && (turn = q.turn);
    let hipTurn = M.turn + (turn - M.turn) * 0.45, tilt = Math.atan2(lean, 13), Rp = mm(rotZ(-tilt * 0.25), rotY(-hipTurn)), Rc = mm(rotZ(-tilt), rotY(-turn)), ankleN = [q.ffx, -q.ffy - 1.8, q.fzz ?? 2.4], ankleF = [q.fbx, -q.fby - 1.8, q.bzz ?? -2.4], pelvis = [lean * 0.2, M.pelvis - q.crouch, 0], hipAt = (s) => add(pelvis, mv(Rp, [0, -M.hipDown, s * M.hipOut])), maxLeg = (M.thigh + M.shin) * 0.995;
    for (let [s, a] of [[1, ankleN], [-1, ankleF]]) {
      let h = hipAt(s), dx = h[0] - a[0], dz = h[2] - a[2], flat = dx * dx + dz * dz;
      if (flat < maxLeg * maxLeg) {
        let top = a[1] + Math.sqrt(maxLeg * maxLeg - flat);
        h[1] > top && (pelvis = [pelvis[0], pelvis[1] - (h[1] - top), pelvis[2]]);
      }
    }
    let waist = add(pelvis, [Math.sin(tilt * 0.45) * M.spine1, Math.cos(tilt * 0.45) * M.spine1, 0]), chest = add(waist, [Math.sin(tilt) * M.spine2, Math.cos(tilt) * M.spine2, 0]), neck = add(chest, mv(Rc, [0, M.neckUp, 0])), headTurn = M.turn * 0.9 + (turn - M.turn) * 0.35, nod = tilt * 0.35 + (q.hy ?? 0) * 7 * DEG, roll = (q.hx ?? 0) * 7 * DEG, Rh = mm(rotZ(-nod - roll), rotY(-headTurn)), head3 = add(neck, mv(Rh, [0.15, M.headUp, 0])), pick = (s, target) => {
      let base = add(chest, mv(Rc, [0, M.shoulderUp, s * M.shoulderOut])), to = sub(target, base), d = len(to);
      return add(base, mul(unit(to), Math.min(1.8, Math.max(0, d - 11) * 0.35)));
    }, nearT = [q.fx, -q.fy, nearZ], farT = two ? [q.fx + axis[0] * W.two, -q.fy + axis[1] * W.two, nearZ + axis[2] * W.two] : [q.bx, -q.by, q.bz ?? (q.armsFront ? 5.5 : -4.5)], sN = pick(1, nearT), sF = pick(-1, farT), pole = (s, T, shoulder, hold) => {
      let up = clamp01((T[1] - shoulder[1] + 2) / 10), base = [-0.55 + up * 1.1, -1 + up * 0.9, s * (0.45 + up * 0.5)];
      if (!hold) return base;
      let u = unit(sub(T, shoulder)), best = base, score = 1 / 0;
      for (let i = 0; i < 16; i++) {
        let a = i / 16 * Math.PI * 2, x = unit(cross(u, [0.3, 1, 0.2])), y = cross(u, x), v = add(mul(x, Math.cos(a)), mul(y, Math.sin(a))), A = ik(shoulder, T, M.upper, M.fore, v), f = unit(sub(A.end, A.joint)), cost = Math.abs(dot(f, hold)) * 0.7 + (1 - dot(unit(base), v)) * 0.55;
        cost < score && (score = cost, best = v);
      }
      return best;
    }, holdN = W ? W.across ? side : axis : null, holdF = two ? W.across ? side : axis : OW ? [Math.cos(q.sb ?? Math.PI), -Math.sin(q.sb ?? Math.PI), 0] : null, armN = ik(sN, nearT, M.upper, M.fore, pole(1, nearT, sN, holdN)), armF = ik(sF, farT, M.upper, M.fore, pole(-1, farT, sF, holdF)), kneePole = (s) => mv(Rp, [1, 0, s * 0.35]), hipN = hipAt(1), hipF = hipAt(-1), legN = ik(hipN, ankleN, M.thigh, M.shin, kneePole(1)), legF = ik(hipF, ankleF, M.thigh, M.shin, kneePole(-1)), footDir = (s) => {
      let t = hipTurn * 0.6 + s * 8 * DEG;
      return [Math.cos(t), 0, Math.sin(t)];
    }, B2 = {
      pelvis: frame(pelvis, Rp),
      waist: frame(waist, mm(rotZ(-tilt * 0.6), rotY(-(turn + hipTurn) / 2))),
      chest: frame(chest, Rc),
      head: frame(head3, Rh),
      neck: frame(neck, Rh),
      upperN: boneFrame(sN, armN.joint, armN.v),
      foreN: boneFrame(armN.joint, armN.end, armN.v),
      upperF: boneFrame(sF, armF.joint, armF.v),
      foreF: boneFrame(armF.joint, armF.end, armF.v),
      thighN: boneFrame(hipN, legN.joint, legN.v),
      shinN: boneFrame(legN.joint, legN.end, legN.v),
      thighF: boneFrame(hipF, legF.joint, legF.v),
      shinF: boneFrame(legF.joint, legF.end, legF.v)
    };
    return B2.footN = frame(legN.end, mm(rotY(-Math.atan2(footDir(1)[2], footDir(1)[0])), rotZ(q.toeF ? -55 * DEG : 0))), B2.footF = frame(legF.end, mm(rotY(-Math.atan2(footDir(-1)[2], footDir(-1)[0])), rotZ(q.toeB ? -55 * DEG : 0))), { B: B2, W, OW, q, axis, side, armN, armF, legN, legF, sN, sF, hipN, hipF, turn };
  }
  var BW = 300, BH = 240, OX = 150, OY = 180, Zb = new Float32Array(BW * BH), Tone = new Float32Array(BW * BH), Part = new Int8Array(BW * BH), Mat = new Int8Array(BW * BH), Fr = new Int8Array(BW * BH), LX = new Float32Array(BW * BH), LY = new Float32Array(BW * BH), Col = new Uint32Array(BW * BH), touched = [], LIGHT = unit([-0.55, 0.72, 0.5]);
  var curFrameIndex = 0;
  var onlyPart = 0;
  function plot(i, z, tone, part, mat, wx, wy, color) {
    if (!(onlyPart && part !== onlyPart)) {
      if (Part[i] === 0) touched.push(i);
      else if (z <= Zb[i]) return;
      Zb[i] = z, Tone[i] = tone, Part[i] = part, Mat[i] = mat, Fr[i] = curFrameIndex, LX[i] = wx, LY[i] = wy, Col[i] = color;
    }
  }
  var PART = { pelvis: 1, waist: 2, chest: 3, neck: 4, head: 5, face: 6, upperN: 7, elbowN: 8, foreN: 9, handN: 10, upperF: 11, elbowF: 12, foreF: 13, handF: 14, thighN: 15, kneeN: 16, shinN: 17, footN: 18, thighF: 19, kneeF: 20, shinF: 21, footF: 22, weapon: 23, offWeapon: 24 };
  var STEEL = Object.fromEntries(Object.entries({ hi: "#ffffff", a: "#e8edf6", b: "#a4afc6", d: "#68748f", gold: "#ffd84a", goldD: "#b8862a", grip: "#7a3a2a", gripD: "#4a2018", wood: "#8a5a32", woodD: "#5a3820", dark: "#3a3448", darkD: "#262033", olive: "#58663f", oliveA: "#7d8c58", oliveD: "#3a4529" }).map(([k, v]) => [k, hex(v) >>> 0]));
  function blade(T, from, length, w) {
    for (let i = from; i <= from + length + 0.01; i += 0.4) {
      let r = i - from, wd = r > length - 5 ? Math.max(0, (length - r) / 5 * w) : w;
      for (let k = -wd; k <= wd + 0.01; k += 0.4) T(i, k, k < -w * 0.4 ? STEEL.hi : k > w * 0.4 ? STEEL.d : STEEL.a);
    }
  }
  var haft = (T, from, to, a, d, r = 0.8) => {
    for (let i = from; i <= to; i += 0.4) for (let k = -r; k <= r + 0.01; k += 0.4) T(i, k, k > 0.1 ? d : a);
  }, WEAPONS = {
    // the fist is at i = 0; `two` is where the other hand goes; `across`: the handle lies across the weapon's length
    sword: { two: -4.4, draw(T, q) {
      let end = q.two ? -6.5 : -2.6;
      haft(T, end, 2.2, STEEL.grip, STEEL.gripD);
      for (let k = -1.4; k <= 1.4; k += 0.4) T(end - 0.4, k, STEEL.gold);
      for (let k = -4.6; k <= 4.6; k += 0.4) T(2.6, k, Math.abs(k) > 3.8 ? STEEL.goldD : STEEL.gold), T(3, k, STEEL.goldD);
      blade(T, 3.2, 25, 2.2);
    } },
    greatsword: { two: -4.8, draw(T) {
      haft(T, -7.2, 2.2, STEEL.grip, STEEL.gripD);
      for (let k = -1.8; k <= 1.8; k += 0.4) T(-7.6, k, STEEL.gold);
      for (let k = -6.6; k <= 6.6; k += 0.4) T(2.6, k, Math.abs(k) > 5.6 ? STEEL.goldD : STEEL.gold), T(3, k, STEEL.goldD);
      blade(T, 3.2, 31, 3);
      for (let i = 4; i <= 28; i += 0.4) T(i, 0, STEEL.b);
    } },
    dagger: { draw(T) {
      haft(T, -2.4, 1.8, STEEL.grip, STEEL.gripD);
      for (let k = -2.6; k <= 2.6; k += 0.4) T(2.2, k, STEEL.goldD);
      blade(T, 2.6, 10, 1.3);
    } },
    spear: { two: -12, draw(T) {
      haft(T, -18, 36, STEEL.wood, STEEL.woodD, 0.5), blade(T, 36, 11, 2);
      for (let k = -2.4; k <= 2.4; k += 0.4) T(36, k, STEEL.goldD);
    } },
    hammer: { two: -7, draw(T) {
      for (let lift of [-0.8, 0, 0.8]) for (let i = -10; i <= 18; i += 0.4) for (let k = -0.8; k <= 0.81; k += 0.4) T(i, k, k > 0.1 ? STEEL.woodD : STEEL.wood, lift);
      for (let i = 18; i <= 28; i += 0.4) for (let k = -9; k <= 9; k += 0.4) {
        let face = Math.abs(k) > 7.4 ? k < 0 ? STEEL.a : STEEL.d : i < 20 ? STEEL.hi : i > 26.4 ? STEEL.d : Math.abs(k) < 2 ? STEEL.gold : STEEL.b;
        if (T(i, k, face, 4.5), T(i, k, face, -4.5), i < 18.4 || i > 27.6 || Math.abs(k) > 8.6) for (let l = -4; l <= 4; l += 0.4) T(i, k, k < 0 ? STEEL.a : i > 27.6 ? STEEL.d : STEEL.b, l);
      }
    } },
    scythe: { two: -11, draw(T) {
      haft(T, -16, 31, STEEL.dark, STEEL.darkD, 0.5);
      for (let j = 0; j <= 28; j += 0.4) {
        let u = j / 28, w = 3.2 * (1 - u) + 0.3, b = 31.5 - u * u * 12;
        for (let k = -w; k <= w; k += 0.4) T(b + k, j + 0.8, k > w * 0.3 ? STEEL.hi : k < -w * 0.4 ? STEEL.d : STEEL.b);
      }
    } },
    claw: { draw(T) {
      for (let q0 of [-2.4, 0, 2.4])
        for (let i = 2; i <= 9.5; i += 0.4) {
          let u = (i - 2) / 7.5, k = q0 + u * u * 1.8;
          T(i, k, u > 0.55 ? STEEL.hi : STEEL.a), u < 0.6 && T(i, k + 0.8, STEEL.d);
        }
    } },
    bow: { across: !0, draw(T, q, off) {
      for (let u = -1; u <= 1.001; u += 0.025) {
        let k = u * 17, i = 6 * (1 - u * u) - 1;
        T(i, k, Math.abs(u) > 0.85 ? STEEL.goldD : STEEL.wood), T(i + 0.8, k, STEEL.woodD);
      }
      let tipA = T.at(-1, -17), tipB = T.at(-1, 17), mid = q.pull ? off : T.at(-1, 0), line = (A, B2, c) => {
        let n = Math.max(2, Math.ceil(len(sub(B2, A)) / 0.4)), Z = STEEL.a;
        for (let k = 0; k <= n; k++) {
          let P2 = add(A, mul(sub(B2, A), k / n)), wx = Math.round(P2[0]), wy = Math.round(P2[1]), idx = (OY - wy) * BW + (OX + wx);
          curFrameIndex = -1, plot(idx, P2[2] + 0.05, 2, PART.weapon, 2, wx, wy, c ?? Z);
        }
      };
      if (line(tipA, mid), line(tipB, mid), q.nocked) {
        let nock = mid, tip = T.at(13, 0);
        line(nock, tip, STEEL.wood);
        for (let i = 9; i <= 13; i += 0.4) for (let k = -(13 - i) * 0.45; k <= (13 - i) * 0.45; k += 0.4) T(i, k, STEEL.hi);
      }
    } },
    pistol: { across: !0, draw(T) {
      for (let i = -1; i <= 9.5; i += 0.4) for (let k = -4.2; k <= -2.4; k += 0.4) T(i, k, k < -3.6 ? STEEL.a : k > -2.9 ? STEEL.d : STEEL.b);
      for (let i = -1.2; i <= 1.2; i += 0.4) for (let k = -2.4; k <= 2.4; k += 0.4) T(i, k, STEEL.gripD);
      T(9, -4.6, STEEL.hi);
    } },
    launcher: { two: -9, draw(T) {
      for (let i = -14; i <= 22; i += 0.4) for (let k = -6; k <= -1; k += 0.4) T(i, k, k < -4.8 ? STEEL.oliveA : k > -2.2 ? STEEL.oliveD : Math.abs(i - 3) < 1.4 ? STEEL.gold : STEEL.olive);
      for (let k = -6.8; k <= -0.2; k += 0.4) T(22.4, k, STEEL.b), T(-14.4, k, STEEL.d);
    } },
    handle: { draw(T) {
      haft(T, -2.6, 6, STEEL.grip, STEEL.gripD);
      for (let k = -1.6; k <= 1.6; k += 0.4) T(-3, k, STEEL.gold), T(6.4, k, STEEL.gold);
    } }
  };
  var REST_FRAMES = null;
  REST_FRAMES = solve({}).B;

  // ../dl_pixelfx/repo/src/core/act.js
  var TW = 38, TH = 52, TP = Object.fromEntries(Object.entries({ ink: "#0b0a1a", wood: "#724c2e", woodL: "#a0703a", woodD: "#4e331f", straw: "#d2aa55", strawL: "#f0d98a", burlapD: "#86643a", burlap: "#b38b57", burlapL: "#c9a26c", red: "#9a2f3c", redL: "#c4434f", white: "#ffffff" }).map(([k, v]) => [k, hex(v)])), DUST = ["#efe7dc", "#c9bfb8", "#8f8693", "#5a5468"].map(hex), DUMMY = new Uint32Array(TW * TH);
  (function() {
    let px = (x, y, c) => {
      x >= 0 && y >= 0 && x < TW && y < TH && (DUMMY[y * TW + x] = c);
    }, R = (x, y, w, h, c) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c);
    };
    R(15, 38, 8, 14, TP.ink), R(16, 34, 6, 18, TP.wood), R(16, 34, 2, 18, TP.woodL), R(20, 34, 2, 18, TP.woodD), R(1, 18, 36, 1, TP.ink), R(1, 23, 36, 1, TP.ink), R(1, 19, 36, 4, TP.wood), R(1, 19, 36, 1, TP.woodL), R(1, 22, 36, 1, TP.woodD);
    for (let [bx, s] of [[0, -1], [33, 1]]) {
      R(bx, 17, 5, 8, TP.straw);
      for (let [dx, dy, c] of [[2, 16, TP.straw], [3, 15, TP.strawL], [1, 17, TP.strawL], [2, 25, TP.straw], [1, 26, TP.strawL], [3, 25, TP.burlapD], [2, 19, TP.strawL], [3, 21, TP.strawL], [1, 22, TP.burlapD], [2, 23, TP.strawL]]) px(bx + dx, dy, c);
      px(s < 0 ? bx - 1 : bx + 5, 19, TP.straw), px(s < 0 ? bx - 1 : bx + 5, 22, TP.strawL);
    }
    let sack = (x, y, w, h) => {
      R(x + 1, y, w - 2, 1, TP.ink), R(x + 1, y + h - 1, w - 2, 1, TP.ink), R(x, y + 1, 1, h - 2, TP.ink), R(x + w - 1, y + 1, 1, h - 2, TP.ink), R(x + 1, y + 1, w - 2, h - 2, TP.burlap), R(x + w - 4, y + 1, 3, h - 2, TP.burlapD), R(x + 1, y + h - 3, w - 2, 2, TP.burlapD), R(x + 1, y + 1, 1, h - 4, TP.burlapL), R(x + 1, y + 1, w - 6, 1, TP.burlapL);
      for (let j = y + 2; j < y + h - 2; j += 3) for (let i = x + 3 + j % 2; i < x + w - 4; i += 4) px(i, j, TP.burlapD);
    };
    sack(9, 17, 20, 24);
    for (let y = 19; y < 36; y++) for (let x = 11; x < 27; x++) {
      let d = Math.hypot(x - 18.5, y - 27);
      (d > 4 && d < 5.4 || d < 1.9) && px(x, y, x + y < 45 ? TP.redL : TP.red);
    }
    for (let x = 10; x < 28; x++)
      px(x, 36, x & 1 ? TP.woodL : TP.straw), px(x, 37, x & 1 ? TP.woodD : TP.wood);
    for (let [x, y, c] of [[11, 41, TP.straw], [12, 42, TP.strawL], [14, 41, TP.strawL], [15, 42, TP.straw], [23, 41, TP.straw], [24, 42, TP.strawL], [26, 41, TP.straw], [13, 43, TP.straw], [25, 43, TP.straw]]) px(x, y, c);
    sack(10, 1, 18, 16);
    for (let ex of [14, 23]) for (let d = -2; d <= 2; d++)
      px(ex + d, 7 + d, TP.ink), px(ex - d, 7 + d, TP.ink);
    for (let x = 14; x < 24; x++) px(x, 12, x & 1 ? TP.ink : TP.burlapD);
    for (let x of [15, 18, 21])
      px(x, 11, TP.ink), px(x, 13, TP.ink);
    for (let x = 12; x < 26; x++)
      px(x, 16, x & 1 ? TP.woodL : TP.straw), px(x, 17, x & 1 ? TP.wood : TP.woodD);
    for (let [x, y, c] of [[13, 0, TP.straw], [15, 0, TP.strawL], [18, 0, TP.straw], [21, 0, TP.strawL], [24, 0, TP.straw], [9, 4, TP.straw], [28, 6, TP.straw], [8, 7, TP.strawL], [29, 3, TP.strawL]]) px(x, y, c);
  })();
  var SKINS = { flash: [TP.white, 1], char: [hex("#1a0c0e"), 0.72], ice: [hex("#a8e8ff"), 0.72], shadow: [hex("#3a1a70"), 0.5], holy: [hex("#fff4c0"), 0.5], red: [hex("#ff2040"), 0.45], shock: [hex("#8fd6ff"), 0.6], poison: [hex("#58c43a"), 0.5] }, STRAW = [TP.strawL, TP.straw, TP.straw, TP.burlapD, TP.burlapD];
  var REST_MASK = new Uint8Array(912), REST_PX = new Uint32Array(912);
  HERO2.forEach((row, r) => [...row].forEach((ch, c) => {
    ch !== "." && (REST_MASK[r * 24 + c] = 1, REST_PX[r * 24 + c] = hex(DUMMY_PAL[ch]));
  }));
  var NEAREST = new Int16Array(912).fill(-1);
  for (let r = 0; r < 38; r++)
    for (let c = 0; c < 24; c++) {
      let best = -1, bd = 1e9;
      for (let y = Math.max(0, r - 7); y < Math.min(38, r + 8); y++)
        for (let x = Math.max(0, c - 7); x < Math.min(24, c + 8); x++) {
          let d = (x - c) * (x - c) + (y - r) * (y - r);
          REST_MASK[y * 24 + x] && d < bd && (bd = d, best = y * 24 + x);
        }
      NEAREST[r * 24 + c] = best;
    }

  // ../dl_pixelfx/repo/src/core/poses.js
  var READY = { crouch: 3, fx: 11, fy: -21, bx: 9, by: -21, ffx: 7, fbx: -7 };

  // ../dl_pixelfx/repo/src/fx/impacts/hit-spark.js
  var meta = {
    name: "Hit spark",
    desc: "The everyday hit: a sharp, lopsided cross flare with one long ray along the blow round a white diamond core, then a cone of sparks and hot chips that fall and bounce.",
    tags: ["impact", "hit", "spark", "combat", "directional", "one-shot"],
    size: [136, 80],
    origin: [44, 64],
    duration: 0.5,
    loop: !1,
    fps: 30,
    bg: "ground",
    options: { palette: ["#4a1712", "#c9281f", "#f2561d", "#ff8a2a", "#ffe26b", "#fff3a6", "#ffffff"], height: 20, aim: 0.1, seed: 4 }
  };
  function ray(p, x, y, a, L, w, C, from = 0) {
    let c = Math.cos(a), s = Math.sin(a);
    for (let d = from * L; d <= L; d += 0.5) {
      let u = d / L, hw = w * Math.pow(1 - u, 1.6), col = u < 0.3 ? WHITE : u < 0.62 ? C[5] : u < 0.88 ? C[4] : C[3];
      if (p.px(x + c * d, y + s * d, col), hw > 0.45) for (let o = 0.5; o <= hw; o += 0.5) for (let e of [-o, o]) p.px(x + c * d - s * e, y + s * d + c * e, u < 0.3 && o < 1 ? C[5] : C[4]);
    }
  }
  function diamond(p, x, y, r, C) {
    for (let dy = -r - 1; dy <= r + 1; dy++)
      for (let dx = -r - 1; dx <= r + 1; dx++) {
        let m = Math.abs(dx) + Math.abs(dy);
        m <= r ? p.px(x + dx, y + dy, WHITE) : m === r + 1 && p.px(x + dx, y + dy, C[3]);
      }
  }
  function create(o) {
    let C = fit(o.palette, 7), R = new Rng(o.seed), X = 0, Y = -o.height, A = o.aim, floor = () => 0, ps = new Particles({ rng: R, ground: floor, sparks: [C[6], C[5], C[4], C[2]] }), lights = new Lights(), tilt = R.range(-0.08, 0.08), rays = [
      { a: A + tilt, L: R.range(33, 37), w: 2.2 },
      { a: A + Math.PI + tilt, L: R.range(8, 10), w: 2.2 },
      { a: A - Math.PI / 2 + tilt, L: R.range(15, 18), w: 2.6 },
      { a: A + Math.PI / 2 + tilt, L: R.range(10, 12), w: 2.3 },
      { a: A - Math.PI / 4 + tilt, L: R.range(5, 7), w: 1 }
    ];
    lights.add(X, Y, 38, C[4], 0.35, 0.18), lights.add(X + Math.cos(A) * 10, Y + Math.sin(A) * 10, 22, C[5], 0.45, 0.1), lights.add(X, -2, 26, C[3], 0.22, 0.22);
    for (let i = 0; i < 9; i++) {
      let a = A + R.range(-0.6, 0.6) - 0.15, v = R.range(170, 360);
      ps.spawn(P.SPARK, X + 1, Y, Math.cos(a) * v, Math.sin(a) * v - 40, R.range(0.25, 0.45), WHITE, 1, i > 6 ? R.range(0.01, 0.03) : 0);
    }
    for (let i = 0; i < 6; i++) {
      let a = A + R.range(-1.1, 0.5) - 0.3, v = R.range(70, 170);
      ps.spawn(P.GRIT, X + 1, Y, Math.cos(a) * v, Math.sin(a) * v - R.range(30, 80), R.range(0.35, 0.45), R.pick([C[5], C[4], C[4], C[3]]), 1);
    }
    let t = 0;
    return {
      update(dt) {
        t += dt, ps.update(dt), lights.update(dt);
      },
      draw(p) {
        if (ps.draw(p), t < 0.025) {
          for (let r of rays) ray(p, X, Y, r.a, r.L, r.w, C);
          diamond(p, X, Y, 4, C);
        } else if (t < 0.058) {
          for (let r of rays) ray(p, X, Y, r.a, r.L * 1.2, r.w * 0.55, C, 0.12);
          diamond(p, X, Y, 3, C);
        } else if (t < 0.092) {
          let r = rays[0];
          ray(p, X, Y, r.a, r.L * 1.3, 0.6, [C[0], C[1], C[2], C[3], C[3], C[4]], 0.4);
        }
        let pop = Math.exp(-t / 0.045);
        pop > 0.02 && (p.glow(X, Y, 22, C[4], 0.3 * pop), p.glow(X, Y, 7, WHITE, 0.15 * pop), p.glowLine(X, Y, X + Math.cos(A) * 26, Y + Math.sin(A) * 26, 4, C[5], 0.25 * pop)), lights.draw(p);
      }
    };
  }

  // ../dl_pixelfx/repo/src/fx/impacts/crit-hit.js
  var crit_hit_exports = {};
  __export(crit_hit_exports, {
    create: () => create2,
    meta: () => meta2
  });

  // ../dl_pixelfx/repo/src/fx/impacts/_lib.js
  var SOOT = hex("#0d0a12"), OUTLINE = hex("#1a1422"), LIGHT2 = Math.atan2(-1, -1);
  function stone(c) {
    return c = hex(c), { light: mix(scale(c, 1.35), WHITE, 0.08), body: c, shade: scale(c, 0.64), dust: mix(scale(c, 1.2), rgb(150, 140, 150), 0.3), lip: mix(scale(c, 1.55), WHITE, 0.12) };
  }
  function spikes(R, n, aim, { len: len2 = [7, 10], w = [1.5, 2.1], fwd = 1.8, back = 0.6, jag = 1, jit = 0.18 } = {}) {
    return Array.from({ length: n }, (_, i) => {
      let a = aim + i / n * TAU + R.range(-jit, jit), cb = Math.cos(a - aim), L = R.range(len2[0], len2[1]) * (1 + fwd * Math.pow(Math.max(0, cb), 3) + back * Math.pow(Math.max(0, -cb), 3)) * (i % 2 ? jag : 1);
      return { a, len: L, w: R.range(w[0], w[1]) * (i % 2 ? Math.sqrt(jag) : 1) };
    });
  }
  function star(p, x, y, list, sc, th, [rim, body, inner, core], a = 1, heart2 = 2.4) {
    for (let pass = 0; pass < 3; pass++)
      for (let s of list) {
        let c = Math.cos(s.a), sn = Math.sin(s.a), L = s.len * sc;
        for (let d = 0; d <= L && !(pass === 2 && d > L * 0.55); d += 0.5) {
          let hw0 = s.w * th * (1 - d / L) * Math.min(1, 0.5 + d / 3), hw = pass === 0 ? hw0 + 0.8 : pass === 1 ? hw0 : hw0 * 0.45, col = pass === 0 ? rim : pass === 1 ? d < L * 0.35 ? inner : body : core;
          for (let o = -hw; o <= hw; o += 0.5) p.dot(x + c * d - sn * o, y + sn * d + c * o, col, a);
        }
      }
    let r = heart2 * sc * Math.sqrt(th);
    p.circle(x, y, r + 0.8, inner, a), p.circle(x, y, r, core, a);
  }
  function brokenRing(p, x, y, r, th, segs, brk, c, c2 = c, k = 1, sy = 1, maxY = 1 / 0) {
    if (r <= 0 || k <= 0) return;
    let full = TAU / segs.length;
    for (let s of segs) {
      let span = full * (1 - s.gap * brk) + 0.02, rr = r * (1 + s.dr * brk), m = Math.max(4, Math.ceil(rr * span * 1.8));
      for (let j = 0; j <= m; j++) {
        let u = j / m, ang = s.a + (u - 0.5) * span, w = Math.max(0.5, th * (s.w ?? 1) * (1 - brk * Math.pow(Math.abs(2 * u - 1), 1.6))), ca = Math.cos(ang), sa = Math.sin(ang);
        for (let o = -w / 2; o <= w / 2 + 0.01; o += 0.5) y + sa * (rr + o) * sy < maxY && p.dot(x + ca * (rr + o), y + sa * (rr + o) * sy, o > -0.26 ? c : c2, k);
      }
    }
  }
  var rockShape = (R, n = 6) => Array.from({ length: n }, () => R.range(0.7, 1.12));
  function rock(p, b, st) {
    let r = 0.75 + b.s * 0.8, n = b.pts.length, fade = Math.min(1, b.life / 0.5), ca = Math.cos(b.a), sa = Math.sin(b.a);
    p.shade(b.x - r - 2, b.y - r - 2, b.x + r + 2, b.y + r + 2, (x, y, out) => {
      let dx = x - b.x, dy = y - b.y, u = dx * ca + dy * sa, v = -dx * sa + dy * ca, d = Math.hypot(u, v), ang = Math.atan2(v, u);
      ang < 0 && (ang += TAU);
      let f = ang / TAU * n, i = Math.floor(f) % n, w = f - Math.floor(f), edge = r * (b.pts[i] * (1 - w) + b.pts[(i + 1) % n] * w);
      if (d > edge + 0.85) return;
      if (out.a = fade, d > edge) return OUTLINE;
      let lit = Math.cos((i + 0.5) / n * TAU + b.a - LIGHT2);
      return d < edge * 0.42 ? lit > 0.55 ? st.light : st.body : lit > 0.35 ? st.light : lit < -0.4 ? st.shade : st.body;
    });
  }

  // ../dl_pixelfx/repo/src/fx/impacts/crit-hit.js
  var meta2 = {
    name: "Critical hit",
    desc: "A critical hit: a jagged starburst slams in white and overshoots, a ring breaks into flying arcs, sparks streak off, shards tumble to the floor under a big flare.",
    tags: ["impact", "hit", "crit", "critical", "combat", "directional", "one-shot"],
    size: [216, 136],
    origin: [84, 106],
    duration: 0.9,
    loop: !1,
    fps: 30,
    bg: "ground",
    options: { palette: ["#2a0510", "#5c0a1c", "#a3142a", "#e0302c", "#ff7a2a", "#ffc23d", "#fff09a", "#ffffff"], height: 26, aim: 0.12, seed: 3 }
  }, KEYS = [
    [0, 1, 1, 1, [6, 7, 7, 7]],
    [0.025, 1.3, 1, 1, [2, 5, 6, 7]],
    [0.058, 1.05, 0.72, 1, [2, 4, 5, 6]],
    [0.092, 1.22, 0.3, 1, [1, 2, 3, 4]],
    [0.125]
  ];
  function flare2(p, x, y, L, k, C) {
    for (let [dx, dy, len2] of [[1, 0, L], [0, 1, L * 0.45], [0.7, 0.7, L * 0.16], [0.7, -0.7, L * 0.16]])
      for (let s of [-1, 1])
        for (let d = 1; d <= len2; d++) {
          let u = d / len2, a = u < 0.7 ? 1 : k * (1.6 - u);
          if (p.dot(x + s * dx * d, y + s * dy * d, u < 0.35 ? WHITE : u < 0.7 ? C[6] : C[5], a), dy === 0 && u < 0.42) for (let e of [-1, 1]) p.dot(x + s * d, y + e, u < 0.2 ? C[6] : C[5], u < 0.3 ? 1 : k);
        }
    p.glowLine(x - L, y, x + L, y, 6, C[6], 0.5 * k), p.glowLine(x, y - L * 0.45, x, y + L * 0.45, 4, C[6], 0.3 * k);
  }
  function create2(o) {
    let C = fit(o.palette, 8), R = new Rng(o.seed), X = 0, Y = -o.height, A = o.aim, floor = () => 0, ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[3]] }), bits = new Bits({ ground: floor }), lights = new Lights(), sp = spikes(R, 14, A, { len: [11, 15], w: [1.8, 2.5], fwd: 1.4, back: 0.6, jag: 0.5 });
    [...sp].sort((a, b) => b.len - a.len).slice(0, 2).forEach((s) => s.len *= 1.3);
    let segs = Array.from({ length: 7 }, (_, i) => {
      let a = A + i / 7 * TAU;
      return { a, gap: R.range(0.55, 0.85), dr: R.range(0.08, 0.4) + 0.15 * Math.max(0, Math.cos(a - A)), w: 0.7 + 0.5 * Math.max(0, Math.cos(a - A)) };
    });
    lights.add(X, Y, 84, C[5], 0.6, 0.5), lights.add(X, Y, 30, WHITE, 0.7, 0.1), lights.add(X, -4, 44, C[4], 0.3, 0.45);
    for (let i = 0; i < 36; i++) {
      let back = R.chance(0.22), a = (back ? A + Math.PI : A) + R.range(-1, 1) * (back ? 0.6 : 0.8), v = R.range(170, 430) * (back ? 0.6 : 1);
      ps.spawn(P.SPARK, X, Y, Math.cos(a) * v, Math.sin(a) * v - 50, R.range(0.15, 0.5), WHITE, 1, R.chance(0.3) ? R.range(0, 0.04) : 0);
    }
    for (let i = 0; i < 10; i++) {
      let a = A + R.range(-1, 1) * 1.1 - 0.35, v = R.range(110, 280);
      bits.add({ kind: B.SHARD, x: X, y: Y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: 0.8, drag: 0.7, bounce: 0.35, life: R.range(0.55, 0.85), a: R.range(0, TAU), va: R.range(-25, 25), s: R.range(2, 4.5), c: R.pick([C[7], C[6], C[6], C[5]]) });
    }
    for (let i = 0; i < 12; i++) {
      let a = A - Math.PI / 2 + R.range(-1.4, 1.4), v = R.range(35, 110);
      ps.spawn(P.MOTE, X + Math.cos(a) * 4, Y + Math.sin(a) * 4, Math.cos(a) * v, Math.sin(a) * v - 15, R.range(0.35, 0.7), R.pick([C[6], C[5], C[5]]), 0.6, R.range(0, 0.05));
    }
    for (let i = 0; i < 5; i++) {
      let a = R.range(0, TAU), d = R.range(14, 34);
      ps.spawn(P.STAR, X + Math.cos(a) * d, Y + Math.sin(a) * d * 0.8, 0, -4, R.range(0.22, 0.38), R.chance(0.5) ? C[6] : WHITE, R.range(1.6, 3), R.range(0.08, 0.32));
    }
    let t = 0;
    return {
      update(dt) {
        t += dt, ps.update(dt), bits.update(dt), lights.update(dt);
      },
      draw(p) {
        let u = clamp((t - 0.03) / 0.37);
        if (t >= 0.03 && u < 1) {
          let r = 10 + 30 * ease.outCubic(u), brk = smooth(0.12, 0.6, u), th = Math.max(1, 3.6 * Math.pow(1 - u, 1.2)), i = u < 0.12 ? 7 : u < 0.3 ? 6 : u < 0.5 ? 5 : u < 0.75 ? 4 : 3;
          brokenRing(p, X, Y, r, th, segs, brk, C[i], C[Math.max(2, i - 2)], u < 0.6 ? 1 : (1 - u) / 0.4, 1, 0), u < 0.6 && p.glowRing(X, Y, r, 6, C[5], 0.35 * Math.pow(1 - u / 0.6, 2));
        }
        bits.draw(p), ps.draw(p);
        let f = (t - 0.04) / 0.28;
        f > 0 && f < 1 && (flare2(p, X, Y, 64 * Math.pow(1 - f, 1.3), 1 - f, C), p.glow(X, Y, 56, C[5], 0.4 * (1 - f)));
        for (let i = 0; i < KEYS.length - 1; i++)
          if (t >= KEYS[i][0] && t < KEYS[i + 1][0]) {
            let [, sc, th, a, cols] = KEYS[i];
            star(p, X, Y, sp, sc, th, cols.map((j) => C[j]), a, 2.6);
          }
        let pop = Math.exp(-t / 0.05);
        pop > 0.02 && (p.glow(X, Y, 44, C[5], 0.4 * pop), p.glow(X, Y, 12, WHITE, 0.6 * pop)), lights.draw(p);
      }
    };
  }

  // ../dl_pixelfx/repo/src/fx/impacts/blunt-hit.js
  var blunt_hit_exports = {};
  __export(blunt_hit_exports, {
    create: () => create3,
    meta: () => meta3
  });
  var meta3 = {
    name: "Blunt hit",
    desc: "A heavy, soft thud: a white-hot lumpy blob cools to cream in a warm pool of light, inked wedges jab out and snap back, a squashed ring of dust puffs swells and drifts, clods drop.",
    tags: ["impact", "hit", "blunt", "punch", "club", "thump", "dust", "comic", "one-shot"],
    size: [128, 88],
    origin: [64, 72],
    duration: 0.9,
    loop: !1,
    fps: 30,
    bg: "ground",
    options: { palette: ["#1d1620", "#4a3a3c", "#7d6a66", "#b09c90", "#dccab4", "#f6ead2", "#ffffff"], warm: "#ffc98a", dust: "#b7a8a6", clod: "#6e5a5a", height: 22, seed: 9 }
  }, lump = (r, a, ph) => r * (1 + 0.15 * Math.sin(5 * a + ph) + 0.08 * Math.sin(9 * a + ph * 2.3));
  function create3(o) {
    let C = fit(o.palette, 7), R = new Rng(o.seed), X = 0, Y = -o.height, PH = R.range(0, TAU), floor = () => 0, WARM = hex(o.warm), DUST2 = hex(o.dust), st = stone(o.clod), lights = new Lights(), bits = new Bits({ ground: floor });
    lights.add(X, Y, 48, WARM, 0.6, 0.4), lights.add(X, Y, 16, WHITE, 0.6, 0.07), lights.add(X, -2, 36, WARM, 0.25, 0.4);
    let wedges = Array.from({ length: 9 }, (_, i) => ({ a: i / 9 * TAU + R.range(-0.2, 0.2), len: R.range(6, 15), w: R.range(3.2, 5), r0: R.range(13, 16), t0: R.range(0.015, 0.04), out: R.range(0.04, 0.06), back: R.range(0.09, 0.14) })), puffs = Array.from({ length: 30 }, (_, i) => {
      let a = i / 30 * TAU + R.range(-0.12, 0.12), side = Math.abs(Math.cos(a)), v = R.range(40, 140) * (0.6 + 0.5 * side);
      return { x: X + Math.cos(a) * 9, y: Y + Math.sin(a) * 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, r: R.range(2.4, 6.2) * (0.75 + 0.35 * side), life: R.range(0.35, 0.85), max: 0, t0: R.range(0.03, 0.1), lift: R.range(4, 16) };
    });
    for (let i = 0; i < 5; i++)
      puffs.push({ x: X + R.range(-6, 6), y: Y - R.range(3, 6), vx: R.range(-30, 30), vy: -R.range(20, 45), r: R.range(3.5, 5.5), life: R.range(0.6, 0.85), max: 0, t0: R.range(0.05, 0.1), lift: R.range(14, 24) });
    for (let q of puffs) q.max = q.life;
    for (let i = 0; i < 5; i++) {
      let s = R.sign(), a = -Math.PI / 2 + s * R.range(0.5, 1.3), v = R.range(70, 140);
      bits.add({ kind: B.CHUNK, x: X + s * R.range(4, 8), y: Y + R.range(-3, 3), vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1, drag: 0.6, bounce: 0.28, life: R.range(0.65, 0.85), a: R.range(0, TAU), va: s * R.range(8, 16), s: R.chance(0.4) ? 2 : 1, pts: rockShape(R), pvy: 0 });
    }
    let kicks = [], t = 0;
    return {
      update(dt) {
        t += dt;
        for (let q of puffs)
          t < q.t0 || (q.life -= dt, q.vx -= q.vx * 4.5 * dt, q.vy -= q.vy * 4.5 * dt + (q.lift ?? 6) * dt, q.x += q.vx * dt, q.y += q.vy * dt);
        for (let b of bits.list) b.pvy = b.vy;
        bits.update(dt);
        for (let b of bits.list)
          if (b.pvy > 60 && b.vy <= 0) {
            for (let i = 0; i < 2; i++) kicks.push({ x: b.x, y: -1, vx: R.sign() * R.range(8, 22), vy: -R.range(3, 10), r: R.range(1.2, 2), life: 0.4, max: 0.4, t0: 0 });
            b.pvy = 0;
          }
        for (let q of kicks)
          q.life -= dt, q.vx -= q.vx * 4 * dt, q.vy -= q.vy * 4 * dt, q.x += q.vx * dt, q.y += q.vy * dt;
        lights.update(dt);
      },
      draw(p) {
        for (let q of [...puffs, ...kicks]) {
          let k = q.life / q.max;
          if (t < q.t0 || k <= 0) continue;
          let r = q.r * (0.7 + (1 - k) * 0.85), a = Math.pow(k, 1.25) * Math.min(1, (t - q.t0) / 0.03), c = mix(DUST2, WARM, clamp(1 - (t - 0.03) / 0.25) * 0.55);
          p.disc(q.x, q.y, r, c, (d) => 0.58 * a * (1 - d * d * 0.75)), p.disc(q.x - r * 0.22, q.y - r * 0.32, r * 0.58, mix(c, WHITE, 0.55), (d) => 0.48 * a * (1 - d * d));
        }
        for (let b of bits.list) rock(p, b, st);
        if (t < 0.058) {
          let f = t < 0.025 ? 0 : 1, R0 = f ? 13.5 : 11.5;
          p.shade(X - R0 * 1.4, Y - R0 * 1.4, X + R0 * 1.4, Y + R0 * 1.4, (x, y) => {
            let dx = x - X, dy = (y - Y) * (f ? 1.25 : 1.1), d = Math.hypot(dx, dy), ro = lump(R0, Math.atan2(dy, dx), PH + f * 0.6);
            if (d > ro) return;
            let q = d / ro;
            return f === 0 ? q < 0.55 ? WHITE : q < 0.86 ? C[5] : C[4] : q < 0.3 ? WHITE : q < 0.72 ? C[5] : q < 0.9 ? C[4] : C[3];
          });
        }
        for (let w of wedges) {
          let u = t - w.t0;
          if (u < 0 || u > w.out + w.back) continue;
          let s = u < w.out ? ease.outCubic(u / w.out) : 1 - ease.inQuad((u - w.out) / w.back), L = w.len * s;
          if (L < 1.5) continue;
          let ca = Math.cos(w.a), sa = Math.sin(w.a), r0 = w.r0 + 2 * s, hw = w.w * (0.6 + 0.4 * s) / 2, tip = [X + ca * r0, Y + sa * r0], end = [X + ca * (r0 + L), Y + sa * (r0 + L)], n = [-sa * hw, ca * hw], wedge = (g) => [[tip[0] - ca * g, tip[1] - sa * g], [end[0] + n[0] * (1 + g * 0.45) + ca * g, end[1] + n[1] * (1 + g * 0.45) + sa * g], [end[0] - n[0] * (1 + g * 0.45) + ca * g, end[1] - n[1] * (1 + g * 0.45) + sa * g]];
          p.poly(wedge(1), C[1]), p.poly(wedge(0), u < w.out + 0.02 ? WHITE : C[5]);
        }
        let pop = Math.exp(-t / 0.06);
        pop > 0.02 && p.glow(X, Y, 28, WARM, 0.5 * pop), lights.draw(p);
      }
    };
  }

  // ../dl_pixelfx/repo/src/fx/melee/sword-slash.js
  var sword_slash_exports = {};
  __export(sword_slash_exports, {
    act: () => act,
    create: () => create4,
    meta: () => meta4
  });
  var meta4 = {
    name: "Sword slash",
    desc: "A tilted crescent whips round in two frames, cools from white to deep blue as it trails off, glints at the tip and throws sparks.",
    tags: ["melee", "slash", "sword", "combat", "directional", "one-shot"],
    size: [136, 104],
    origin: [44, 92],
    duration: 0.75,
    loop: !1,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#b8c9e8", "#e8f1ff", "#ffffff"],
      sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
      radius: 42,
      seed: 2
    }
  }, GUARD = { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 }, WIND = { ...GUARD, x: -8, crouch: 4, lean: -4, fx: -7, fy: -35, sa: -2.65, bx: 9, by: -25, armsFront: !0, ffx: 9, fbx: -8 }, CUT = { ...GUARD, x: 0, crouch: 2, lean: 3, fx: 16, fy: -37, sa: -1.45, bx: -7, by: -24, ffx: 11, fbx: -10, ghost: 1 }, DOWN = { ...GUARD, x: 2, crouch: 5, lean: 5, fx: 20, fy: -21, sa: 0.62, bx: -9, by: -24, ffx: 13, fbx: -10, toeB: !0 }, act = {
    target: { x: 58 },
    poses: [
      [-0.55, { ...GUARD, x: -8 }],
      [-0.3, WIND],
      [-0.08, { ...WIND, crouch: 5, lean: -5 }],
      [0, CUT, "snap"],
      [0.06, DOWN, "snap"],
      [0.3, { ...DOWN, x: 3, crouch: 6 }],
      [0.58, { ...GUARD, x: 1, crouch: 3, fx: 15, fy: -21, sa: 0.1, bx: -5, by: -21, ffx: 9, fbx: -7 }],
      [0.86, { ...GUARD, x: -8 }]
    ],
    hits: [{ t: 0.06, stop: 0.14, shake: 0.18, amp: 2, push: 2.8, straw: 18 }],
    dust: [{ t: 0.06, x: 16, n: 7, dir: 1 }, { t: 0.06, x: -11, n: 4, dir: -1 }]
  };
  function onArc(s, r, a) {
    let lx = Math.cos(a) * r, ly = Math.sin(a) * r * s.sy, c = Math.cos(s.rot), n = Math.sin(s.rot);
    return [s.cx + lx * c - ly * n, s.cy + lx * n + ly * c];
  }
  function crescent(p, s, ta, L, W, age) {
    if (Math.abs(L) < 0.02 || W < 0.3) return;
    let R = s.ramp, n = R.length, dir = Math.sign(L), span = Math.abs(L), c = Math.cos(s.rot), sn = Math.sin(s.rot), B2 = s.R + 2;
    p.shade(s.cx - B2, s.cy - B2, s.cx + B2, s.cy + B2, (x, y, out) => {
      let dx = x - s.cx, dy = y - s.cy, lx = dx * c + dy * sn, ly = (-dx * sn + dy * c) / s.sy, r = Math.hypot(lx, ly);
      if (r > s.R + 0.5 || r < s.R - W - 1) return;
      let u = dir * (Math.atan2(ly, lx) - ta) % TAU;
      if (u < 0 && (u += TAU), u > span) return;
      let v = u / span, w = W * Math.pow(Math.sin(Math.PI * Math.pow(v, 2.2)), 0.6);
      if (w < 0.35) return;
      let q = (s.R - r) / w;
      if (q < 0 || q > 1) return;
      let ci = q < 0.22 && age < 0.5 ? 0 : Math.round(q * (n - 1) * 0.75 + age * 2.4 - v * 0.8 + 0.4);
      out.c = R[n - 1 - clamp(ci, 0, n - 1)], out.a = Math.min(1, v / 0.4);
    });
    for (let u = 0; u <= span; u += 0.3) {
      let [x, y] = onArc(s, s.R - W * 0.4, ta + dir * u);
      p.glow(x, y, 5 + W, R[n - 3], 0.22 * (1 - age) * (u / span));
    }
  }
  function drawSlash(p, s, t) {
    let u = t - s.t0;
    if (u < 0) return;
    let span = s.a1 - s.a0, head3 = ease.outExpo(clamp(u / s.sweep)), tail = smooth(s.sweep + s.hold, s.sweep + s.hold + s.trail, u), age = clamp(u / (s.sweep + s.hold + s.trail));
    tail < 1 && crescent(p, s, s.a0 + span * tail, span * (head3 - tail), s.W * (1 - tail * 0.55), age);
    let th = 0.7 * (1 - clamp((u - s.sweep - s.hold) / (s.trail + 0.2)));
    if (tail > 0.02 && th > 0)
      for (let k = 0; k <= tail; k += 0.6 / (Math.abs(span) * s.R)) {
        let [x, y] = onArc(s, s.R - 0.5, s.a0 + span * k);
        p.dot(x, y, s.ramp[1], th * (0.4 + 0.6 * k));
      }
  }
  function tipOf(s) {
    let [x, y] = onArc(s, s.R - s.W * 0.3, s.a1), [x2, y2] = onArc(s, s.R - s.W * 0.3, s.a1 + Math.sign(s.a1 - s.a0) * 0.05), l = Math.hypot(x2 - x, y2 - y) || 1;
    return { x, y, dx: (x2 - x) / l, dy: (y2 - y) / l };
  }
  function create4(o) {
    let C = fit(o.palette, 7), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), R0 = o.radius, a0 = -2.55, a1 = 0.95, A = { cx: 6, cy: -26, R: R0, sy: 0.6, rot: -0.38, a0, a1, W: 12, t0: 0, sweep: 0.06, hold: 0.06, trail: 0.24, ramp: C }, E = { ...A, R: R0 * (33 / 42), W: R0 * (4.5 / 42), a0: a0 + (a1 - a0) * 0.1, a1: a1 - (a1 - a0) * (0.15 / 3.5), t0: 0.017, hold: 0.03, trail: 0.2, ramp: C.slice(0, 6) }, tip = tipOf(A), t = 0, landed = !1;
    return {
      update(dt) {
        if (t += dt, !landed && t >= A.sweep) {
          landed = !0;
          for (let i = 0; i < 10; i++) {
            let a = Math.atan2(tip.dy, tip.dx) + Rg.range(-0.5, 0.5), sp = Rg.range(150, 400);
            ps.spawn(P.SPARK, tip.x, tip.y, Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.12, 0.35));
          }
          for (let i = 0; i < 16; i++) {
            let a = a0 + (a1 - a0) * Rg.range(0.3, 1), [x, y] = onArc(A, A.R, a), ox = x - A.cx, oy = y - A.cy, l = Math.hypot(ox, oy) || 1, sp = Rg.range(30, 100);
            ps.spawn(P.MOTE, x, y, ox / l * sp, oy / l * sp - 10, Rg.range(0.25, 0.55), C[4 + Rg.int(0, 1)], 0.6);
          }
        }
        ps.update(dt);
      },
      draw(p) {
        drawSlash(p, E, t), drawSlash(p, A, t);
        let g = t - A.sweep * 0.6;
        if (g > 0 && g < 0.22 && sparkle(p, tip.x, tip.y, 9 * ease.outBack(Math.min(1, g / 0.05)) * (1 - g / 0.22), C[5], C[3], 0.6), t < 0.3) {
          let [x, y] = onArc(A, A.R - 4, A.a0 + (A.a1 - A.a0) * ease.outExpo(clamp(t / A.sweep)));
          p.glow(x, y, 40, C[3], 0.5 * (1 - t / 0.3));
        }
        ps.draw(p);
      }
    };
  }

  // ../dl_pixelfx/repo/src/fx/melee/thrust.js
  var thrust_exports = {};
  __export(thrust_exports, {
    act: () => act2,
    create: () => create5,
    meta: () => meta5
  });
  var meta5 = {
    name: "Thrust",
    desc: "A piercing stab: a bundle of streaks shoots out from the hand to a point, a long four-point star flares at the tip with a pierce ring, sparks and speed lines.",
    tags: ["melee", "thrust", "stab", "spear", "rapier", "pierce", "combat", "directional", "one-shot"],
    size: [196, 76],
    origin: [34, 62],
    duration: 0.75,
    loop: !1,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#2a1608", "#6b3c10", "#b8701a", "#f0b42e", "#ffe27a", "#fff6cf", "#ffffff"],
      sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
      reach: 66,
      seed: 4
    }
  }, STANCE = { ...READY, weapon: "sword", x: -14, fx: 12, fy: -21, sa: -0.3 }, BACK = { ...STANCE, crouch: 5, lean: -3, fx: -3, fy: -19, sa: -0.05, bx: 8, by: -30, armsFront: !0, ffx: 10, fbx: -8 }, LUNGE = { ...STANCE, crouch: 6, lean: 6, fx: 23, fy: -20, sa: 0, bx: -8, by: -24, ffx: 15, fbx: -11, toeB: !0 }, act2 = {
    target: { x: 80 },
    poses: [
      [-0.46, STANCE],
      [-0.24, BACK],
      [-0.05, { ...BACK, crouch: 6, fx: -5 }],
      [0, { ...LUNGE, ghost: 1 }, "snap"],
      [0.07, LUNGE, "snap"],
      [0.3, { ...LUNGE, crouch: 5, lean: 5 }],
      [0.7, STANCE]
    ],
    hits: [{ t: 0.07, stop: 0.12, shake: 0.14, amp: 2, push: 2.8, straw: 16, y: -26 }],
    dust: [{ t: 0, x: -24, n: 6, dir: -1 }, { t: 0.07, x: 1, n: 6, dir: 1 }]
  }, OUT2 = 0.07, HOLD = 0.06, PULL = 0.2;
  function longStar(p, x, y, L, k, C) {
    if (L < 1) return;
    let arms = [[1, 0, L], [-1, 0, L * 0.7], [0, -1, L * 0.42], [0, 1, L * 0.42]];
    for (let [dx, dy, len2] of arms)
      for (let d = 1; d <= len2; d += 0.5) {
        let u = d / len2, c = u < 0.3 ? WHITE : u < 0.65 ? C[5] : C[4];
        p.dot(x + dx * d, y + dy * d, c, u < 0.7 ? 1 : 1 - (u - 0.7) / 0.35), u < 0.25 && len2 > 6 && (p.dot(x + dx * d - dy, y + dy * d + dx, C[5]), p.dot(x + dx * d + dy, y + dy * d - dx, C[5]));
      }
    for (let [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) for (let d = 1; d <= Math.min(3, L * 0.14); d++) p.px(x + dx * d, y + dy * d, d < 2 ? C[5] : C[4]);
    p.px(x, y, WHITE), p.glow(x, y, 6 + L * 1.3, C[4], 0.35 * k), p.glow(x, y, 3 + L * 0.4, WHITE, 0.3 * k);
  }
  function create5(o) {
    let C = fit(o.palette, 7), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), lights = new Lights(), HX = 9, HY = -20, TX = HX + o.reach, TY = HY, streaks = [-7, -4, -2, 0, 2, 4, 7].map((off) => ({ off, x0: HX + 1 + Rg.range(0, 5) + Math.abs(off) * 0.6, t0: Rg.range(0, 0.02) + Math.abs(off) * 3e-3, w: off === 0 ? 2 : 1, hot: off === 0, len: Rg.range(0.75, 1) })), lines = [], t = 0, struck = !1;
    return {
      update(dt) {
        if (t += dt, t < OUT2 + 0.08 && Rg.chance(0.5)) {
          let s = Rg.sign();
          lines.push({ x: HX + Rg.range(0, o.reach * 0.6), y: HY + s * Rg.range(7, 17), l: Rg.range(18, 42), v: Rg.range(200, 340), t });
        }
        for (let i = lines.length - 1; i >= 0; i--) t - lines[i].t > 0.24 && lines.splice(i, 1);
        for (let l of lines) l.x += l.v * dt;
        if (!struck && t >= OUT2) {
          struck = !0, lights.add(TX, TY, 44, C[4], 0.45, 0.3), lights.add(TX, TY, 14, WHITE, 0.6, 0.06);
          for (let i = 0; i < 12; i++) {
            let a = Rg.range(-0.55, 0.45), sp = Rg.range(150, 330);
            ps.spawn(P.SPARK, TX, TY, Math.cos(a) * sp, Math.sin(a) * sp - 30, Rg.range(0.12, 0.35));
          }
          for (let i = 0; i < 10; i++) {
            let a = Rg.range(-0.9, 0.9) + (Rg.chance(0.3) ? Math.PI : 0), sp = Rg.range(40, 120);
            ps.spawn(P.MOTE, TX + Rg.range(-6, 2), TY + Rg.range(-2, 2), Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.25, 0.5), Rg.chance(0.5) ? C[5] : C[4], 0.6);
          }
          for (let i = 0; i < 4; i++) ps.spawn(P.STAR, TX + Rg.range(-10, 8), TY + Rg.range(-9, 9), 0, -3, Rg.range(0.2, 0.4), Rg.chance(0.5) ? C[5] : WHITE, Rg.range(1, 2), Rg.range(0.06, 0.2));
        }
        ps.update(dt), lights.update(dt);
      },
      draw(p) {
        t < 0.05 && sparkle(p, HX + 2, HY, 5 * (1 - t / 0.05) + 1, C[5], C[3], 0.4);
        for (let l of lines) {
          let k = (t - l.t) / 0.24;
          for (let d = 0; d < l.l * (1 - k * 0.6); d++) p.dot(l.x - d, l.y, d < 3 ? WHITE : d < l.l * 0.4 ? C[5] : C[3], (1 - d / l.l) * (1 - k));
        }
        let pull = smooth(OUT2 + HOLD, OUT2 + HOLD + PULL, t);
        for (let s of streaks) {
          let u = clamp((t - s.t0) / OUT2), head3 = ease.outExpo(u);
          if (u <= 0 || pull >= 1) continue;
          let y0 = HY + s.off, end = s.x0 + (TX - s.x0) * s.len, x1 = s.x0 + (end - s.x0) * head3, xa = s.x0 + (end - s.x0) * Math.max(pull, head3 * 0.35 * (1 - s.len) * 3), yAt = (x) => y0 + (TY - y0) * clamp((x - s.x0) / (TX - s.x0)) * 0.85;
          for (let x = xa; x <= x1; x += 0.5) {
            let v = (x - xa) / Math.max(1, x1 - xa), c = v > 0.88 ? WHITE : s.hot ? v > 0.35 ? C[6] : C[5] : v > 0.55 ? C[5] : v > 0.25 ? C[4] : C[3];
            p.dot(x, yAt(x), c, v < 0.12 ? v / 0.12 : 1), s.w > 1 && v > 0.1 && p.dot(x, yAt(x) + 1, v > 0.6 ? C[5] : C[3], v < 0.2 ? v / 0.2 : 1);
          }
        }
        t < OUT2 + HOLD + PULL && p.glowLine(HX + (TX - HX) * pull, HY, HX + (TX - HX) * ease.outExpo(clamp(t / OUT2)), TY, 6, C[4], 0.22 * (1 - pull));
        let q = t - OUT2;
        if (q >= 0 && q < 0.4) {
          let g = ease.outBack(clamp(q / 0.04), 2.4) * (1 - smooth(0.08, 0.4, q)) * (1 + 0.12 * Math.sin(q * 70));
          longStar(p, TX, TY, 24 * g, 1 - q / 0.4, C);
        }
        if (q >= 0 && q < 0.2) {
          let k = q / 0.2, rx = 2 + 7 * ease.outCubic(k), ry = 4 + 12 * ease.outCubic(k);
          for (let a = 0; a < TAU; a += 0.05) p.dot(TX + 4 + 10 * k + Math.cos(a) * rx, TY + Math.sin(a) * ry, k < 0.3 ? WHITE : C[5], 1.15 - k);
        }
        ps.draw(p), lights.draw(p);
      }
    };
  }

  // ../dl_pixelfx/repo/src/fx/melee/dagger-flurry.js
  var dagger_flurry_exports = {};
  __export(dagger_flurry_exports, {
    act: () => act3,
    create: () => create6,
    meta: () => meta6
  });

  // ../dl_pixelfx/repo/src/fx/melee/_lib.js
  var swing = (o) => ({ cx: 0, cy: 0, R: 30, sy: 1, rot: 0, a0: 0, dir: 1, k: 0, ...o });
  function through(x, y, th, dir, R, span, at = 0.55, extra = {}) {
    let a = th - dir * Math.PI / 2;
    return swing({ cx: x - Math.cos(a) * R, cy: y - Math.sin(a) * R, R, sy: 1, rot: 0, a0: a - dir * span * at, dir, span, ...extra });
  }
  function onSwing(s, r, u) {
    let a = s.a0 + s.dir * u, lx = Math.cos(a) * r, ly = Math.sin(a) * r * s.sy - s.k * (s.R - r), c = Math.cos(s.rot), n = Math.sin(s.rot);
    return [s.cx + lx * c - ly * n, s.cy + lx * n + ly * c];
  }
  function travel(s, u) {
    let [x0, y0] = onSwing(s, s.R, u), [x1, y1] = onSwing(s, s.R, u + 0.01), l = Math.hypot(x1 - x0, y1 - y0) || 1;
    return { x: x0, y: y0, dx: (x1 - x0) / l, dy: (y1 - y0) / l, a: s.a0 + s.dir * u };
  }
  function plane(s, x, y) {
    let c = Math.cos(s.rot), n = Math.sin(s.rot), dx = x - s.cx, dy = y - s.cy, lx = dx * c + dy * n, ly = -dx * n + dy * c;
    if (!s.k) return [Math.hypot(lx, ly / s.sy), Math.atan2(ly / s.sy, lx)];
    let m = ly + s.k * s.R, A = s.sy * s.sy - s.k * s.k, B2 = 2 * m * s.k, Cc = lx * lx * s.sy * s.sy + m * m, r = (-B2 + Math.sqrt(B2 * B2 + 4 * A * Cc)) / (2 * A);
    return [r, Math.atan2((m - s.k * r) / s.sy, lx)];
  }
  function smear(p, s, u0, u1, wMax, fn, half = 0, pad = 1) {
    if (u1 - u0 < 5e-3) return;
    let c = Math.cos(s.rot), n = Math.sin(s.rot), A = s.R + pad + 1, Bn = A * s.sy + s.k * (wMax + 2), hx = Math.hypot(A * c, Bn * n) + 1, hy = Math.hypot(A * n, Bn * c) + 1, rIn = s.R - wMax - 1, over = Math.abs(n) * A + s.k * (wMax + 2) + 2, y0 = half > 0 ? s.cy - over : s.cy - hy, y1 = half < 0 ? s.cy + over : s.cy + hy;
    p.shade(s.cx - hx, y0, s.cx + hx, y1, (x, y, out) => {
      let [r, a] = plane(s, x, y);
      if (r > s.R + pad || r < rIn || half && (Math.sin(a) < 0 ? -1 : 1) !== half) return;
      let u = s.dir * (a - s.a0) % TAU;
      for (u < 0 && (u += TAU); u < u0; ) u += TAU;
      if (!(u > u1))
        return fn(u, r, out, a);
    });
  }
  function trace(p, s, r, u0, u1, c, a, half = 0, step = 0.6) {
    let du = step / Math.max(4, r);
    for (let u = u0; u <= u1; u += du) {
      let g = s.a0 + s.dir * u;
      if (half && (Math.sin(g) < 0 ? -1 : 1) !== half) continue;
      let [x, y] = onSwing(s, r, u), k = typeof a == "function" ? a(u) : a;
      k > 0 && p.dot(x, y, typeof c == "function" ? c(u) : c, k);
    }
  }
  function glowAlong(p, s, r, u0, u1, rad, c, k, half = 0, step = 0.35) {
    for (let u = u0; u <= u1; u += step) {
      let g = s.a0 + s.dir * u;
      if (half && (Math.sin(g) < 0 ? -1 : 1) !== half) continue;
      let [x, y] = onSwing(s, r, u), kk = typeof k == "function" ? k(u) : k;
      kk > 4e-3 && p.glow(x, y, rad, c, kk);
    }
  }
  function slash(p, s, t, half = 0) {
    let u = t - s.t0;
    if (u < 0) return;
    let R = s.ramp, n = R.length, life = s.sweep + s.hold + s.trail, hot = s.hot ?? 0, head3 = ease.outExpo(clamp(u / s.sweep)), tail = smooth(s.sweep + s.hold, life, u), age = clamp(u / life), U = s.span * head3, T = s.span * tail, W = s.W * (1 - tail * 0.55);
    tail < 1 && U - T > 0.01 && (smear(p, s, T, U, W, (uu, r, out) => {
      let v = (uu - T) / (U - T), w = W * Math.pow(Math.sin(Math.PI * Math.pow(v, s.lens ? 1 : 2.2)), s.lens ? 0.75 : 0.6);
      if (w < 0.35) return;
      let q = (s.R - r) / w;
      if (q < 0 || q > 1) return;
      let ci = q < 0.22 && age < 0.5 || q < hot * 0.7 ? 0 : Math.round(q * (n - 1) * 0.75 + age * 2.4 - v * 0.8 + 0.4 - hot * 3);
      out.c = R[n - 1 - clamp(ci, 0, n - 1)], out.a = Math.min(1, v / (s.lens ? 0.1 : 0.4));
    }, half), glowAlong(p, s, s.R - W * 0.4, T, U, 5 + W, R[n - 3], (uu) => (0.22 + hot * 0.3) * (1 - age) * ((uu - T) / (U - T)), half, 0.3));
    let th = 0.7 * (1 - clamp((u - s.sweep - s.hold) / (s.trail + 0.2)));
    tail > 0.02 && th > 0 && trace(p, s, s.R - 0.5, 0, T, R[2], (uu) => th * (0.4 + 0.6 * uu / s.span), half);
  }
  var slashEnd = (s) => travel({ ...s, R: s.R - s.W * 0.3 }, s.span);
  function shavings(ps, R, s, n, colors, from = 0.3) {
    for (let i = 0; i < n; i++) {
      let [x, y] = onSwing(s, s.R, s.span * R.range(from, 1)), ox = x - s.cx, oy = y - s.cy, l = Math.hypot(ox, oy) || 1, sp = R.range(30, 100);
      ps.spawn(P.MOTE, x, y, ox / l * sp, Math.min(25, oy / l * sp) - 10, R.range(0.25, 0.55), R.pick(colors), 0.6);
    }
  }
  function stone2(c) {
    return c = hex(c), { light: mix(scale(c, 1.35), WHITE, 0.08), body: c, shade: scale(c, 0.64), dust: mix(scale(c, 1.2), rgb(150, 140, 150), 0.3), dark: scale(c, 0.42) };
  }
  var OUTLINE2 = hex("#1a1422");
  function rock2(p, b, st) {
    let r = 0.6 + b.s * 0.75, fade = Math.min(1, b.life / 0.5), lx = Math.cos(b.a) * r * 0.4, ly = Math.sin(b.a) * r * 0.4;
    p.shade(b.x - r - 1, b.y - r - 1, b.x + r + 1, b.y + r + 1, (x, y, out) => {
      let dx = x - b.x, dy = y - b.y, d = Math.hypot(dx * 1.15, dy);
      if (d > r + 0.9) return;
      let lit = dx * lx + dy * ly;
      out.c = d > r ? OUTLINE2 : lit < -0.4 ? st.light : lit > 0.6 ? st.shade : st.body, out.a = fade;
    });
  }
  function cracks(R, x0, n, reach, depth = 7, bias = 0.3) {
    let out = [];
    for (let i = 0; i < n; i++) {
      let side = R.chance(0.5 + bias * 0.5) ? 1 : -1, L = reach * R.range(0.45, 1) * (i < 2 ? 1 : 0.7), pts = [[x0 + side * R.range(0, 1.5), 0]], x = pts[0][0], y = 0;
      for (; Math.abs(x - x0) < L && y < depth; )
        if (x += side * R.range(1.5, 3.5), y = Math.min(depth, Math.max(0, y + R.range(-0.6, 1.6) * (Math.abs(x - x0) > 3 ? 1 : 0.3))), pts.push([Math.round(x), Math.round(y)]), R.chance(0.18) && pts.length > 3 && y < depth - 2) {
          let f = [[Math.round(x), Math.round(y)]], fx = x, fy = y;
          for (let j = R.int(1, 3); j > 0; j--) fx += side * R.range(1, 3), fy += R.range(0.8, 2), f.push([Math.round(fx), Math.round(Math.min(depth + 1, fy))]);
          out.push({ pts: f, at: Math.abs(x - x0) / reach, fork: !0 });
        }
      out.push({ pts, at: 0, fork: !1 });
    }
    return out;
  }
  function star2(p, x, y, spikes2, sc, th, core, body, inner, rim) {
    for (let pass of [0, 1, 2])
      for (let s of spikes2) {
        let c = Math.cos(s.a), sn = Math.sin(s.a), L = s.len * sc;
        for (let d = 0; d <= L; d += 0.5) {
          let hw0 = s.w * th * (1 - d / L) * Math.min(1, 0.5 + d / 3), hw = pass === 0 ? hw0 + 0.8 : pass === 1 ? hw0 : hw0 * 0.45;
          if (pass === 2 && d > L * 0.55) break;
          for (let o = -hw; o <= hw; o += 0.5) p.px(x + c * d - sn * o, y + sn * d + c * o, pass === 0 ? rim : pass === 1 ? d < L * 0.35 ? inner : body : core);
        }
      }
    let r = 2.4 * sc * Math.sqrt(th);
    p.circle(x, y, r + 0.8, inner), p.circle(x, y, r, core);
  }
  function sliver(p, x, y, a, r, arc, c, k) {
    let n = Math.ceil(r * arc * 2.2);
    for (let j = 0; j <= n; j++) {
      let u = j / n - 0.5, th = a + u * arc, w = 1.4 * (1 - Math.abs(u) * 2);
      for (let o = -w * 0.5; o <= w * 0.5 + 0.01; o += 0.5) p.dot(x + Math.cos(th) * (r + o), y + Math.sin(th) * (r + o), c, k);
    }
  }
  function along(pts, len2, fn) {
    let d = 0;
    for (let i = 1; i < pts.length && d < len2; i++) {
      let [x0, y0] = pts[i - 1], [x1, y1] = pts[i], l = Math.hypot(x1 - x0, y1 - y0), f = Math.min(1, (len2 - d) / l);
      fn(x0, y0, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, d), d += l;
    }
  }

  // ../dl_pixelfx/repo/src/fx/melee/dagger-flurry.js
  var meta6 = {
    name: "Dagger flurry",
    desc: "A flurry of small quick crescents at every angle in front of the fighter, each with a flick of sparks, finished by one big cut that glints and bursts.",
    tags: ["melee", "slash", "dagger", "combo", "flurry", "fast", "combat", "directional", "one-shot"],
    size: [148, 104],
    origin: [36, 86],
    duration: 0.95,
    loop: !1,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#1b1630", "#3a2f63", "#6150a3", "#9480d8", "#c7b8f5", "#efe9ff", "#ffffff"],
      sparks: ["#ffffff", "#efe9ff", "#c7b8f5", "#9480d8"],
      seed: 12
    }
  }, BASE = { ...READY, weapon: "dagger", offWeapon: "dagger", sa: -0.5, sb: -0.9, crouch: 4, lean: 3, ffx: 11, fbx: -9, fx: 12, fy: -24, bx: 9, by: -24 }, near = (fx, fy, sa, o = {}) => ({ ...BASE, fx, fy, sa, bx: 4, by: -24, sb: -1, ...o }), far = (bx, by, sb, o = {}) => ({ ...BASE, bx, by, sb, fx: 1, fy: -23, sa: -1, ...o }), act3 = {
    target: { x: 60 },
    poses: [
      [-0.4, { ...BASE, x: -4 }],
      [-0.14, { ...BASE, x: -6, lean: -2, crouch: 5, fx: 2, fy: -22, sa: -1.2, bx: 2, by: -26, sb: -1.5 }],
      [-0.03, { ...BASE, x: -6, lean: -3, crouch: 6, fx: 1, fy: -21, sa: -1.2, bx: 1, by: -25, sb: -1.5 }],
      [0, near(20, -31, -0.5, { x: 2, ghost: 1 }), "snap"],
      [0.055, far(21, -23, 0.5, { x: 3 }), "snap"],
      [0.11, near(18, -36, -1, { x: 4 }), "snap"],
      [0.165, far(22, -31, -0.6, { x: 5 }), "snap"],
      [0.22, near(20, -22, 0.2, { x: 5 }), "snap"],
      [0.275, far(21, -27, 0.05, { x: 6 }), "snap"],
      [0.33, { ...BASE, x: 4, lean: -3, crouch: 5, fx: -1, fy: -33, sa: -2.5, bx: 2, by: -23, sb: -1.2 }, "snap"],
      [0.37, { ...BASE, x: 7, lean: 2, crouch: 4, fx: 16, fy: -34, sa: -1, bx: -7, by: -24, sb: -2.4, ghost: 1 }, "snap"],
      [0.43, { ...BASE, x: 9, lean: 6, crouch: 6, fx: 22, fy: -23, sa: 0.15, bx: -9, by: -24, sb: -2.6, ffx: 13, fbx: -10, toeB: !0 }, "snap"],
      [0.68, { ...BASE, x: 9, lean: 5, crouch: 5, fx: 21, fy: -22, sa: 0.2, bx: -8, by: -24, sb: -2.6 }],
      [1.05, { ...BASE, x: -4 }]
    ],
    hits: [
      { t: 0.05, stop: 0.015, push: 0.5, straw: 3, flash: 0.02 },
      { t: 0.105, stop: 0.015, push: -0.3, straw: 3, flash: 0.02 },
      { t: 0.16, stop: 0.015, push: 0.5, straw: 3, flash: 0.02 },
      { t: 0.215, stop: 0.015, push: -0.3, straw: 3, flash: 0.02 },
      { t: 0.27, stop: 0.015, push: 0.5, straw: 3, flash: 0.02 },
      { t: 0.325, stop: 0.015, push: -0.3, straw: 3, flash: 0.02 },
      { t: 0.42, stop: 0.12, shake: 0.18, amp: 2, push: 2.6, straw: 16 }
    ],
    dust: [{ t: 0.43, x: 20, n: 7, dir: 1 }, { t: 0, x: -6, n: 3, dir: -1 }]
  }, EVERY = 0.055, CUTS = [
    [21, -27, -0.5, 1],
    [33, -16, 0.9, -1],
    [26, -38, 2.4, 1],
    [37, -30, -1.8, -1],
    [19, -17, 0.2, 1],
    [30, -24, 1.4, -1]
  ];
  function create6(o) {
    let C = fit(o.palette, 7), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), lights = new Lights(), small = CUTS.map(([x, y, rot, dir], i) => swing({ cx: x, cy: y, R: Rg.range(12, 15), sy: Rg.range(0.55, 0.75), rot, a0: Rg.range(-2.8, -2.2), dir, span: Rg.range(2.3, 2.8), W: Rg.range(5.2, 6.4), t0: i * EVERY, sweep: 0.035, hold: 0.03, trail: 0.13, ramp: C })), big = swing({ cx: 24, cy: -26, R: 30, sy: 0.36, k: 0.24, rot: 0.12, a0: 3, dir: -1, span: 2.85, W: 11, t0: small.length * EVERY + 0.04, sweep: 0.055, hold: 0.06, trail: 0.24, ramp: C }), all = [...small, big], ends = all.map(slashEnd), done = all.map(() => !1), slivers = [-2.6, -1.5, -0.4, 0.7].map((a) => ({ a: a + Rg.range(-0.2, 0.2), r: Rg.range(4, 7), v: Rg.range(70, 110), arc: Rg.range(0.4, 0.7) })), t = 0;
    return {
      update(dt) {
        t += dt, all.forEach((s, i) => {
          if (done[i] || t < s.t0 + s.sweep) return;
          done[i] = !0;
          let e = ends[i], last = s === big;
          lights.add(e.x, e.y, last ? 56 : 26, C[3], last ? 0.6 : 0.4, last ? 0.4 : 0.14), last && lights.add(e.x, e.y, 16, WHITE, 0.7, 0.08);
          for (let k = 0; k < (last ? 12 : 3); k++) {
            let a = Math.atan2(e.dy, e.dx) + Rg.range(-0.5, 0.5), sp = Rg.range(100, last ? 340 : 220);
            ps.spawn(P.SPARK, e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.1, last ? 0.35 : 0.22));
          }
          if (shavings(ps, Rg, s, last ? 14 : 4, [C[4], C[5]]), last) for (let k = 0; k < 5; k++) ps.spawn(P.STAR, s.cx + Rg.range(-22, 22), s.cy + Rg.range(-14, 14), 0, -4, Rg.range(0.2, 0.45), Rg.chance(0.5) ? C[5] : WHITE, Rg.range(1, 2.2), Rg.range(0.05, 0.25));
        }), ps.update(dt), lights.update(dt);
      },
      draw(p) {
        for (let s of all) slash(p, s, t);
        all.forEach((s, i) => {
          let e = ends[i], g = t - s.t0 - s.sweep * 0.6, last = s === big, life = last ? 0.24 : 0.12;
          g > 0 && g < life && sparkle(p, e.x, e.y, (last ? 10 : 4) * ease.outBack(Math.min(1, g / 0.04)) * (1 - g / life), C[5], C[3], last ? 0.6 : 0.35);
          let u = t - s.t0;
          if (u > 0 && u < s.sweep + 0.1) {
            let h = slashEnd({ ...s, span: s.span * ease.outExpo(clamp(u / s.sweep)) });
            p.glow(h.x, h.y, last ? 40 : 22, C[3], (last ? 0.5 : 0.35) * (1 - u / (s.sweep + 0.1)));
          }
        });
        let q = t - big.t0 - big.sweep;
        if (q > 0.02 && q < 0.14) {
          let k = (q - 0.02) / 0.12, e = ends[ends.length - 1];
          for (let s of slivers) sliver(p, e.x, e.y, s.a + Math.atan2(e.dy, e.dx), s.r + s.v * (q - 0.02), s.arc * (1 - 0.4 * k), k < 0.4 ? C[6] : k < 0.7 ? C[5] : C[4], 1 - k);
        }
        ps.draw(p), lights.draw(p);
      }
    };
  }

  // ../dl_pixelfx/repo/src/fx/melee/claw-swipe.js
  var claw_swipe_exports = {};
  __export(claw_swipe_exports, {
    act: () => act4,
    create: () => create7,
    meta: () => meta7
  });
  var meta7 = {
    name: "Claw swipe",
    desc: "Three claw marks rake down one after another, white-hot, cooling through orange to red, then close up from both ends and leave a dotted scar, with hot flecks and drips.",
    tags: ["melee", "claw", "swipe", "beast", "scratch", "combat", "directional", "one-shot"],
    size: [128, 96],
    origin: [36, 84],
    duration: 0.9,
    loop: !1,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#2a0808", "#5c0f12", "#a51d1d", "#e2401f", "#ff8a2a", "#ffd166", "#fff3c4", "#ffffff"],
      sparks: ["#fff3c4", "#ffd166", "#ff8a2a", "#c42a1a"],
      seed: 8
    }
  }, READY_ = { ...READY, weapon: "claw", offWeapon: "claw", sa: -0.4, sb: -0.9, crouch: 5, lean: 3, fx: 14, fy: -21, bx: 8, by: -25, ffx: 9, fbx: -8 }, HIGH = { ...READY_, x: -6, crouch: 4, lean: -3, fx: 3, fy: -41, sa: -1.4, bx: 7, by: -18, sb: -0.3, ffx: 10 }, act4 = {
    target: { x: 58 },
    poses: [
      [-0.46, { ...READY_, x: -6 }],
      [-0.2, HIGH],
      [-0.05, { ...HIGH, crouch: 5 }],
      [0, { ...READY_, x: 0, crouch: 3, lean: 4, fx: 19, fy: -36, sa: -0.9, bx: -7, by: -24, ghost: 1 }, "snap"],
      [0.05, { ...READY_, x: 2, crouch: 5, lean: 6, fx: 23, fy: -24, sa: 0.5, bx: -7, by: -24, ffx: 13, fbx: -10, toeB: !0 }, "snap"],
      [0.1, { ...READY_, x: 3, crouch: 7, lean: 7, fx: 22, fy: -12, sa: 1.2, bx: -7, by: -24, ffx: 13, fbx: -10, toeB: !0 }, "snap"],
      [0.42, { ...READY_, x: 3, crouch: 6, lean: 5, fx: 21, fy: -13, sa: 1.1, bx: -6, by: -22, ffx: 13, fbx: -10 }],
      [0.9, { ...READY_, x: -6 }]
    ],
    hits: [
      { t: 0.04, stop: 0.03, push: 0.9, straw: 5, y: -30, flash: 0.03 },
      { t: 0.08, stop: 0.03, push: 0.9, straw: 5, y: -26, flash: 0.03 },
      { t: 0.12, stop: 0.08, shake: 0.14, amp: 2, push: 1.4, straw: 9, y: -18 }
    ],
    dust: [{ t: 0.1, x: 12, n: 6, dir: 1 }]
  }, RAKE = 0.05, STAGGER = 0.04, CLOSE0 = 0.16, CLOSE = 0.3;
  function create7(o) {
    let C = fit(o.palette, 8), n = C.length, Rg = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: Rg, ground: floor, sparks: o.sparks }), drips = new Bits({ ground: floor }), lights = new Lights(), marks = [0, 1, 2].map((i) => {
      let s = through(31 + i * 8, -23 + i * 2, 1.84, 1, 40, 0.84 - i * 0.05, 0.5);
      return { s, t0: i * STAGGER, W: 4.2 - i * 0.4, open: !1, end: travel(s, s.span) };
    }), t = 0, heatAt = (m) => clamp(1 - (t - m.t0) / 0.42);
    return {
      update(dt) {
        t += dt;
        for (let m of marks)
          if (!m.open && t >= m.t0 + RAKE * 0.7) {
            m.open = !0, lights.add(m.end.x, m.end.y - 6, 34, C[4], 0.45, 0.3);
            for (let i = 0; i < 7; i++) {
              let a = Math.atan2(m.end.dy, m.end.dx) + Rg.range(-0.5, 0.5), sp = Rg.range(110, 260);
              ps.spawn(P.SPARK, m.end.x, m.end.y, Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.12, 0.32));
            }
            for (let i = 0; i < 5; i++) {
              let [x, y] = onSwing(m.s, m.s.R, m.s.span * Rg.range(0.15, 0.9));
              ps.spawn(P.MOTE, x, y, Rg.range(-60, -10), Rg.range(-30, 30), Rg.range(0.2, 0.4), Rg.chance(0.5) ? C[5] : C[4], 0.5);
            }
            for (let i = 0; i < 2; i++) {
              let [x, y] = onSwing(m.s, m.s.R - 1, m.s.span * Rg.range(0.35, 0.75));
              drips.add({ kind: B.DRIP, x, y, vx: Rg.range(-8, 8), vy: Rg.range(10, 40), g: 0.55, life: 1.2, c: C[3] });
            }
          }
        drips.update(dt), ps.update(dt), lights.update(dt);
      },
      draw(p) {
        for (let m of marks) {
          let u = t - m.t0;
          if (u < 0) continue;
          let S = m.s.span, head3 = S * ease.outExpo(clamp(u / RAKE)), c = smooth(CLOSE0, CLOSE0 + CLOSE, u), lo = S / 2 * c, hi = Math.min(head3, S - S / 2 * c), heat = heatAt(m);
          hi - lo > 0.02 && (smear(p, m.s, lo, hi, m.W, (uu, r, out) => {
            let v = uu / S, w = m.W * Math.pow(Math.sin(Math.PI * v), 1.15) * (1 - 0.55 * c), off = Math.abs(r - (m.s.R - m.W / 2)) / (w / 2 + 0.01);
            if (w < 0.5 || off > 1) return;
            let ci = Math.round((1 - heat) * 5.2 + off * 1.6 + (head3 < S ? (S - uu) / S : 0) * 0.5);
            out.c = C[n - 1 - clamp(ci, 0, n - 2)];
          }, 0, 2), glowAlong(p, m.s, m.s.R - m.W / 2, lo, hi, 11, C[4], 0.42 * heat * heat, 0, 0.2));
          let k = 0.8 * (1 - clamp((u - CLOSE0 - CLOSE * 0.5) / 0.4));
          c > 0.05 && k > 0 && (trace(p, m.s, m.s.R - m.W / 2, 0.04 * S, lo, C[2], k), trace(p, m.s, m.s.R - m.W / 2, S - lo, 0.96 * S, C[2], k));
          let g = u - RAKE * 0.4;
          g > 0 && g < 0.16 && sparkle(p, m.end.x, m.end.y, 5 * ease.outBack(Math.min(1, g / 0.04)) * (1 - g / 0.16), C[6], C[4], 0.4);
        }
        drips.draw(p), ps.draw(p), lights.draw(p);
      }
    };
  }

  // ../dl_pixelfx/repo/src/fx/melee/heavy-cleave.js
  var heavy_cleave_exports = {};
  __export(heavy_cleave_exports, {
    act: () => act5,
    create: () => create8,
    meta: () => meta8
  });
  var meta8 = {
    name: "Heavy cleave",
    desc: "A glint over the head, then a thick ember arc accelerates over the top into the floor: a white slam, glowing cracks, dust rolling both ways, grit and rising embers.",
    tags: ["melee", "slash", "cleave", "axe", "heavy", "ground", "fire", "combat", "directional", "one-shot"],
    size: [208, 116],
    origin: [68, 96],
    duration: 1.9,
    loop: !1,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#2a0c10", "#5c1414", "#a3241a", "#e0481c", "#ff8a2a", "#ffc23d", "#fff0a0", "#ffffff"],
      stone: "#4a3f69",
      seed: 5
    }
  }, REST_ = { ...READY, weapon: "greatsword", two: !0, sa: -1, fx: 11, fy: -21 }, OVER = { ...REST_, x: -4, crouch: 2, lean: -2, fx: 1, fy: -42, sa: -2.45, ffx: 8, fbx: -7 }, FLOOR2 = { ...REST_, x: 0, crouch: 7, lean: 6, fx: 17, fy: -21, sa: 0.72, ffx: 11, fbx: -10, toeB: !0 }, act5 = {
    target: { x: 66 },
    poses: [
      [-0.42, { ...REST_, x: -4 }],
      [-0.3, { ...REST_, x: -3, crouch: 4, fx: 13, fy: -29, sa: -1.3 }],
      [-0.12, { ...OVER, crouch: 4 }],
      [0.2, { ...OVER, crouch: 3 }],
      [0.27, { ...REST_, x: -1, y: -2, crouch: 0, lean: 2, fx: 11, fy: -42, sa: -1.45, ffx: 10, ghost: 1 }, "snap"],
      [0.31, { ...REST_, x: 0, y: -1, crouch: 3, lean: 4, fx: 18, fy: -33, sa: -0.45, ffx: 12, ghost: 1 }, "snap"],
      [0.335, FLOOR2, "snap"],
      [0.85, { ...FLOOR2, crouch: 6, lean: 5 }],
      [1.3, { ...REST_, x: -2, crouch: 4, lean: 2, fx: 15, fy: -23, sa: 0.1 }],
      [1.7, { ...REST_, x: -4 }]
    ],
    hits: [{ t: 0.335, stop: 0.2, shake: 0.34, amp: 3, push: 3.2, straw: 28, y: -8 }],
    dust: [{ t: 0.335, x: 18, n: 8, dir: 1 }, { t: 0.335, x: -12, n: 5, dir: -1 }]
  }, RAISE = 0.2, SWING = 0.135, HIT = RAISE + SWING, HOLD2 = 0.05, TRAIL = 0.22, head = (t) => ease.inQuad(clamp((t - RAISE) / SWING)), passedAt = (f) => RAISE + SWING * Math.sqrt(clamp(f));
  function create8(o) {
    let C = fit(o.palette, 8), n = C.length, R = new Rng(o.seed), st = stone2(o.stone), floor = () => 0, ps = new Particles({ rng: R, ground: floor, sparks: [C[6], C[5], C[4], C[3]] }), bits = new Bits({ ground: floor }), lights = new Lights(), A = swing({ cx: 3, cy: -22, R: 37, sy: 0.88, rot: 0.32, a0: -2.45, dir: 1 }), U1 = 0;
    for (; onSwing(A, A.R, U1)[1] < -0.5 && U1 < 4; ) U1 += 5e-3;
    let E = { ...A, R: A.R * 0.76 }, W = 16, WE = 5, [X] = onSwing(A, A.R - 2, U1), GLINT = onSwing(A, A.R - 3, 0), lines = cracks(R, X, 4, 40, 7, 0.4), spikes2 = [-Math.PI, -2.7, -2.15, -1.62, -1.05, -0.45, 0].map((a, i) => ({ a: a + R.range(-0.08, 0.08), len: (i === 0 || i === 6 ? 20 : i === 3 ? 15 : 9) + R.range(0, 4), w: 1.6 + R.range(0, 0.6) })), shards = [-2.5, -1.9, -1.2, -0.6].map((a) => ({ a: a + R.range(-0.15, 0.15), r: 8 + R.range(0, 3), v: R.range(80, 130), arc: R.range(0.35, 0.6) })), t = 0, hit = !1, arc = (p, s, w0, lag, rim) => {
      let tt = t - lag, U = U1 * head(tt), T = U1 * smooth(HIT + HOLD2, HIT + HOLD2 + TRAIL, tt);
      if (U < 0.02 || T >= U - 0.02) return;
      let gone = smooth(HIT + HOLD2, HIT + HOLD2 + TRAIL, tt), shrink = 1 - 0.75 * gone;
      smear(p, s, T, U, w0, (u, r, out) => {
        let age = Math.max(0, tt - passedAt(u / U1)), v = (u - T) / (U - T), w = w0 * shrink * Math.pow(Math.sin(Math.PI * Math.pow(v, 2.2)), 0.6);
        if (w < 0.4) return;
        let q = (s.R - r) / w;
        if (q < 0 || q > 1) return;
        let ci = rim && q < 0.22 && age < 0.12 ? 0 : Math.round(q * (n - 1) * 0.62 + age * 7 + Math.max(0, tt - HIT) * 10 - v * 0.8 + (rim ? 0.7 : 1.7));
        out.c = C[n - 1 - clamp(ci, 0, n - 1)], out.a = Math.min(1, v / 0.35) * (1.2 - gone);
      }), rim && glowAlong(p, s, s.R - w0 * 0.4, T, U, 7 + w0 * 0.5, C[4], (u) => 0.26 * Math.exp(-Math.max(0, tt - passedAt(u / U1)) / 0.2) * ((u - T) / (U - T)));
    };
    return {
      update(dt) {
        if (t += dt, t < RAISE - 0.04 && R.chance(0.35)) {
          let a = R.range(0, TAU), D7 = R.range(14, 26), T = R.range(0.14, 0.2), v = D7 * 3 / (Math.exp(3 * T) - 1);
          ps.spawn(P.STREAK, GLINT[0] + Math.cos(a) * D7, GLINT[1] + Math.sin(a) * D7, -Math.cos(a) * v, -Math.sin(a) * v, T, R.chance(0.5) ? C[5] : C[4]);
        }
        if (t > RAISE && t < HIT && R.chance(0.7)) {
          let u = U1 * head(t) * R.range(0.6, 1), [x, y] = onSwing(A, A.R - R.range(0, 6), u);
          ps.spawn(P.EMBER, x, y, R.range(-20, 20), R.range(-40, -10), R.range(0.5, 1.1), C[4], R.range(1, 2));
        }
        if (!hit && t >= HIT) {
          hit = !0, lights.add(X, -6, 26, WHITE, 0.9, 0.1), lights.add(X, -12, 64, C[4], 0.5, 0.8);
          for (let i = 0; i < 26; i++) {
            let a = -Math.PI / 2 + R.range(-1.2, 1.35), sp = R.range(140, 360);
            ps.spawn(P.SPARK, X, -1, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.15, 0.5));
          }
          for (let i = 0; i < 20; i++) {
            let s = i % 2 ? -1 : 1;
            ps.spawn(P.SMOKE, X + s * R.range(0, 8), -R.range(2, 6), s * R.range(45, 135), -R.range(2, 12), R.range(1, 1.45), st.dust, R.range(5, 8.5), R.range(0, 0.07), PF.BIG);
          }
          for (let i = 0; i < 4; i++) ps.spawn(P.SMOKE, X + R.range(-4, 4), -R.range(3, 8), R.range(-15, 15), -R.range(40, 90), R.range(1, 1.45), st.dust, R.range(4, 6.5), R.range(0.02, 0.1), PF.BIG);
          for (let i = 0; i < 8; i++) ps.spawn(P.DUST, X + R.range(-4, 4), -R.range(1, 4), R.range(-60, 60), -R.range(8, 30), R.range(0.35, 0.7), st.dust, R.range(2, 3.5));
          for (let i = 0; i < 44; i++) {
            let a = -Math.PI / 2 + R.range(-0.7, 1), sp = R.range(60, 230);
            ps.spawn(P.GRIT, X + R.range(-3, 3), -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1, 1.5), R.pick([st.light, st.body, st.body, st.shade]), R.chance(0.35) ? 2 : 1);
          }
          for (let i = 0; i < 6; i++)
            bits.add({ kind: B.CHUNK, x: X + R.range(-3, 3), y: -2, vx: R.range(-50, 110), vy: -R.range(120, 260), g: 1, drag: 0.4, bounce: 0.3, life: R.range(1.15, 1.5), a: R.range(0, TAU), va: R.range(-14, 14), s: R.int(1, 2) });
          for (let i = 0; i < 16; i++) ps.spawn(P.EMBER, X + R.range(-8, 8), -R.range(1, 6), R.range(-50, 60), -R.range(30, 110), R.range(0.7, 1.5), C[4], R.range(1, 2));
        }
        if (hit && t < HIT + 0.6 && R.chance(0.12)) {
          let c = R.pick(lines), pt = R.pick(c.pts);
          ps.spawn(P.EMBER, pt[0], pt[1] - 1, R.range(-12, 12), -R.range(20, 50), R.range(0.5, 0.9), C[4], 1);
        }
        bits.update(dt);
        for (let b of bits.list)
          if (b.rest && !b.dusted) {
            b.dusted = !0;
            for (let i = 0; i < 2; i++) ps.spawn(P.DUST, b.x + R.range(-1.5, 1.5), -0.5, R.sign() * R.range(8, 30), -R.range(2, 12), R.range(0.3, 0.6), st.dust, R.range(1.3, 2.4));
          }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let q = t - HIT;
        if (q >= 0) {
          let fade = 1 - smooth(1, 1.5, q);
          for (let y = 0; y <= 2; y++)
            for (let x = -9; x <= 9; x++) {
              let d = Math.hypot((x + 0.5) / 9, (y + 0.5) / 3.5);
              if (d > 1) continue;
              let T = Math.pow(clamp(1 - q / 0.8), 1.4) * (1.2 - d) - rand(x, y, 3) * 0.3;
              T > 0.08 ? p.dot(X + x, y, C[clamp(Math.round(T * 9), 1, 7)], fade) : p.dot(X + x, y, d < 0.5 ? st.dark : st.shade, (d < 0.9 - rand(x, y, 9) * 0.3 ? 1 : 1 - d) * fade);
            }
          let k = q / 0.45;
          k < 1 && band(p, X, 0.5, 6 + 46 * ease.outCubic(k), 0.16, Math.max(1, 3 * (1 - k)), 1.15 - k, [st.body, st.light, C[4], C[6]], (g) => Math.sin(g) < 0);
        }
        ps.draw(p, "back");
      },
      draw(p) {
        let q = t - HIT;
        if (t < RAISE + 0.03) {
          let g = ease.outBack(clamp(t / 0.1)) * (1 + 0.15 * Math.sin(t * 60)) * (t > RAISE ? 1 - (t - RAISE) / 0.03 : 1);
          sparkle(p, GLINT[0], GLINT[1], 1 + 7 * g, C[6], C[4], 0.5), p.glow(GLINT[0], GLINT[1], 22, C[4], 0.3 * g);
        }
        if (q >= 0) {
          let heat = Math.pow(clamp(1 - q / 1.2), 1.2), fade = 1 - smooth(1.15, 1.5, q);
          for (let c of lines) {
            let reach = 40 * ease.outCubic(clamp((q - c.at * 0.1) / 0.13)) * (c.fork ? 0.3 : 1);
            reach <= 0 || along(c.pts, reach, (x0, y0, x1, y1, d) => {
              let h = heat * (1 - d / 46) - (c.fork ? 0.12 : 0), col = h > 0.72 ? WHITE : h > 0.08 ? C[clamp(Math.round(h * 8), 1, 6)] : st.dark;
              y1 > 0.5 && p.line(x0 + 1, y0, x1 + 1, y1, st.dark, fade), p.line(x0, y0, x1, y1, col, fade), h > 0.25 && (d | 0) % 6 < 2 && p.glow(x1, y1, 6, C[4], 0.2 * h * fade);
            });
          }
          heat > 0 && p.glow(X, -2, 34, C[4], 0.32 * heat * fade);
          let k = q / 0.45;
          k < 1 && band(p, X, 0.5, 6 + 46 * ease.outCubic(k), 0.16, Math.max(1, 3 * (1 - k)), 1.15 - k, [st.body, st.light, C[4], C[6]], (g) => Math.sin(g) >= 0);
        }
        arc(p, E, WE, 0.02, !1), arc(p, A, W, 0, !0);
        let tail = U1 * smooth(HIT + HOLD2, HIT + HOLD2 + TRAIL, t), th = 0.8 * (1 - clamp((t - HIT - HOLD2) / (TRAIL + 0.25)));
        if (tail > 0.02 && th > 0 && trace(p, A, A.R - 0.5, 0, tail, C[3], (u) => th * (0.4 + 0.6 * u / U1)), t > RAISE && t < HIT + 0.05) {
          let [x, y] = onSwing(A, A.R - 5, U1 * head(t));
          p.glow(x, y, 40, C[4], 0.5);
        }
        if (q >= 0 && q < 0.035 ? star2(p, X, -1, spikes2, 1, 1, WHITE, C[6], C[7], C[5]) : q >= 0.035 && q < 0.07 && star2(p, X, -1, spikes2, 1.25, 0.55, C[7], C[6], C[6], C[4]), q >= 0.05 && q < 0.16) {
          let k = (q - 0.05) / 0.11;
          for (let s of shards) sliver(p, X, -1, s.a, s.r + s.v * (q - 0.05), s.arc * (1 - 0.4 * k), k < 0.4 ? C[6] : k < 0.7 ? C[5] : C[4], 1 - k);
        }
        if (q >= 0 && q < 0.2) {
          let pop = Math.exp(-q / 0.05);
          p.glow(X, -6, 30, C[5], 0.8 * pop), p.glow(X, -2, 10, WHITE, 0.7 * pop);
        }
        for (let b of bits.list) rock2(p, b, st);
        ps.draw(p, "front"), lights.draw(p);
      }
    };
  }

  // ../dl_pixelfx/repo/src/fx/projectiles/arrow.js
  var arrow_exports = {};
  __export(arrow_exports, {
    draw: () => draw,
    meta: () => meta9
  });

  // ../dl_pixelfx/repo/src/fx/projectiles/_lib.js
  function beat(t, period, n, seed, life, fn) {
    for (let i = 0; i < n; i++) {
      let L = typeof life == "function" ? life(rng(seed, i, 911)) : life;
      for (let age = wrap(t - i * period / n + 1e-7, period); age < L; age += period) fn(age, L, rng(seed, i), i);
    }
  }

  // ../dl_pixelfx/repo/src/fx/projectiles/arrow.js
  var meta9 = {
    name: "Arrow",
    desc: "An arrow in flight: a steel broadhead catching the light, a wooden shaft, fletching fluttering in the wind, streaks of air peeling off its head and swirling off its feathers.",
    tags: ["projectile", "arrow", "bow", "medieval", "directional", "loop"],
    size: [112, 32],
    origin: [92, 16],
    duration: 0.6,
    loop: !0,
    fps: 30,
    bg: "sky",
    options: {
      palette: ["#7a1f2c", "#b8323c", "#e8e2d6", "#ffffff"],
      wood: ["#3a2414", "#6e4422", "#a8723c", "#d8a868"],
      steel: ["#2e3648", "#5a6680", "#9aa6ba", "#dfe7f2"],
      wind: "#b8c8e8",
      seed: 3
    }
  }, HEAD = ["..LL....", "..sLLL..", "bbsSSSSW", "..dDDD..", "..DD...."], FLETCH = [
    ["AAa.........", ".aAAa.......", "..aaAAa.....", "nkkkkkkkkkkk", "..cCCc......", ".cCCc.......", "CCc........."],
    [".AAa........", "..aAAa......", "..aaAAAa....", "nkkkkkkkkkkk", "..cCCCc.....", "..cCCc......", ".CCc........"],
    ["AAAa........", "aAAa........", ".aaAAa......", "nkkkkkkkkkkk", "..ccCc......", "cCCc........", "CCc........."]
  ];
  function draw(p, t, o) {
    let PL = fit(o.palette, 4), W = fit(o.wood, 4), ST = fit(o.steel, 4), wind = hex(o.wind), S = o.seed, D7 = meta9.duration, fr = Math.floor(t * 30 + 1e-6), ph = t / D7, left = -meta9.origin[0] + 2, LEN = 36;
    beat(t, D7, 9, S, (r) => r.range(0.14, 0.26), (age, life, r) => {
      let k = age / life, top = r.chance(0.5) ? -1 : 1, x0 = (r.chance(0.6) ? -3 : -LEN + 6) - age * r.range(160, 240), len2 = r.range(8, 16) * (0.5 + k), y = 0.5 + top * (r.range(3, 5) + k * r.range(1, 2.5));
      if (x0 - len2 < left) return;
      let c = k < 0.4 ? wind : mix(wind, hex("#2a2540"), (k - 0.4) * 1.2);
      p.line(x0, y, x0 - len2, y, (u) => u < 0.25 && k < 0.4 ? mix(wind, WHITE, 0.5) : c, (u) => u < 0.65 ? 1 : (1 - u) / 0.35);
    }), beat(t, D7, 6, S + 3, (r) => r.range(0.15, 0.25), (age, life, r) => {
      let k = age / life, cx = -LEN - 2 - age * r.range(100, 150), cy = 0.5 + r.sign() * r.range(2, 4), a = age * 30 + r.range(0, TAU), rr = 1.2 + k * 1.5;
      if (!(cx < left + 4))
        for (let i = 0; i < 4; i++) p.dot(cx + Math.cos(a + i * 0.5) * rr, cy + Math.sin(a + i * 0.5) * rr, wind, (1 - k) * (1 - i * 0.2));
    }), p.line(-LEN + 11, 0, -7, 0, W[2]);
    for (let x = -LEN + 14; x < -8; x += 6) p.px(x, 0, W[3]);
    let pose = FLETCH[Math.floor(rand(fr, S) * 3)];
    p.sprite(pose, { a: PL[2], A: PL[3], c: PL[0], C: PL[1], k: W[1], n: W[0] }, -LEN, -3), p.sprite(HEAD, { L: ST[3], s: ST[2], S: ST[2], d: ST[0], D: ST[1], b: W[0], W: WHITE }, -7, -2);
    let g = ph * 2 % 1;
    g < 0.25 && sparkle(p, -5 + g * 16, -1, 1 + Math.round(2 * Math.sin(g / 0.25 * Math.PI)), WHITE, ST[3], 0.25);
  }

  // ../dl_pixelfx/repo/src/fx/fire/fireball.js
  var fireball_exports = {};
  __export(fireball_exports, {
    draw: () => draw2,
    meta: () => meta10
  });

  // ../dl_pixelfx/repo/src/fx/fire/_lib.js
  function pnoise(x, period, seed = 0) {
    let i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = rand(wrap(i, period), seed), b = rand(wrap(i + 1, period), seed);
    return (a + (b - a) * u) * 2 - 1;
  }
  function noiseFor(D7) {
    return D7 ? (tt, rate, seed = 0, off = 0) => {
      let P2 = Math.max(1, Math.round(rate * D7));
      return pnoise(tt / D7 * P2 + off, P2, seed);
    } : (tt, rate, seed = 0, off = 0) => noise(tt * rate + off, seed);
  }
  function looped(t, D7, count, seed, make, draw9) {
    for (let i = 0; i < count; i++) {
      let r = rng(seed, i), born = r.next() * D7, q = make(r, i);
      for (let age = wrap(t - born, D7); age < q.life; age += D7) draw9(q, age, i);
    }
  }
  var hotFirst = (F) => [...F].reverse(), LAYERS = [[1, 1, 6], [0.76, 0.86, 4], [0.54, 0.68, 2], [0.3, 0.42, 0]], BIG_LAYERS = [[1, 1, 6], [0.8, 0.9, 5], [0.62, 0.78, 4], [0.44, 0.6, 3], [0.26, 0.4, 1], [0.12, 0.22, 0]], BACK_LAYERS = [[1, 1, 7], [0.76, 0.86, 5], [0.54, 0.68, 3], [0.3, 0.42, 2]];
  function flameTongue(p, x, y, h, w, sx, N, n, H, layers = LAYERS, jit = 0.5, wob = 1.1) {
    if (!(h < 1))
      for (let [lw, lh, ri] of layers) {
        let L = h * lh, c = H[ri];
        for (let r = 0; r <= L; r++) {
          let u = r / Math.max(1, L), half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + N(9, n, r * 0.45) * jit;
          if (half < 0.3) continue;
          let cx = x + sx * u * u * lh + N(4, n + 7, r * 0.2) * u * wob, Y = Math.round(y - r);
          for (let px = Math.round(cx - half), x1 = Math.round(cx + half); px <= x1; px++) p.px(px, Y, c);
        }
      }
  }
  function flameBlade(p, x, y, ux, uy, len2, w, bend, N, n, H, layers = LAYERS, jit = 0.5, wob = 1.1) {
    if (len2 < 1) return;
    let nx = -uy, ny = ux;
    for (let [lw, lh, ri] of layers) {
      let L = len2 * lh, c = H[ri];
      for (let r = 0; r <= L; r += 0.5) {
        let u = r / Math.max(1, L), half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + N(9, n, r * 0.45) * jit;
        if (half < 0.3) continue;
        let off = bend * u * u * lh + N(4, n + 7, r * 0.2) * u * wob, cx = x + ux * r + nx * off, cy = y + uy * r + ny * off;
        for (let q = -half; q <= half; q += 0.5) p.px(cx + nx * q, cy + ny * q, c);
      }
    }
  }
  function solid(p, x, y, r, c) {
    if (r < 0.6) return p.px(x, y, c);
    let cx = p.toX(x, y), cy = p.toY(x, y), r2 = r * r;
    for (let sy = Math.floor(cy - r); sy <= Math.ceil(cy + r); sy++) {
      let dy = sy + 0.5 - cy, s2 = r2 - dy * dy;
      if (s2 < 0) continue;
      let s = Math.sqrt(s2);
      for (let sx = Math.ceil(cx - s - 0.5); sx <= Math.floor(cx + s - 0.5); sx++) p.put(sx, sy, c, 1);
    }
  }
  function soft(p, x, y, r, c, a) {
    if (a <= 4e-3) return;
    if (r < 0.5) return p.blend(x, y, c, a);
    let cx = p.toX(x, y), cy = p.toY(x, y), r2 = r * r;
    for (let sy = Math.floor(cy - r); sy <= Math.ceil(cy + r); sy++) {
      let dy = sy + 0.5 - cy, s2 = r2 - dy * dy;
      if (s2 < 0) continue;
      let s = Math.sqrt(s2);
      for (let sx = Math.ceil(cx - s - 0.5); sx <= Math.floor(cx + s - 0.5); sx++) p.blendPx(sx, sy, c, a);
    }
  }
  function firePuff(p, x, y, k, size, frac, H, glowK = 0.18, tx = 0, ty = -1) {
    let age = 1 - k, n = H.length, heat = Math.min(0.999, Math.pow(age, 0.62) + frac * 0.1), idx = Math.min(n - 2, Math.floor(heat * (n - 1))), r = size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = H[idx];
    if (idx >= n - 2) return soft(p, x, y, r, c, Math.min(1, k * 3) * 0.85);
    solid(p, x, y, r, H[Math.min(n - 1, idx + 2)]), r > 1.6 && ty > -0.99 && solid(p, x + tx * r * 1.5, y + ty * r * 1.5, r * 0.3, H[Math.min(n - 1, idx + 1)]), solid(p, x - r * 0.16, y - r * 0.22, r * 0.78, c), r > 1.6 && solid(p, x + tx * r * 0.9, y + ty * r * 0.9, r * 0.42, c), idx <= 3 && r > 1.8 && solid(p, x - r * 0.28, y - r * 0.34, r * 0.36, H[Math.max(0, idx - 1)]), idx < 6 && p.glow(x, y, r * 2.4 + 2, c, glowK * k);
  }
  function lick(p, x, y, k, s, H) {
    let r = s * (0.4 + 0.6 * k);
    solid(p, x, y, r + 0.6, k > 0.5 ? H[5] : H[6]), k > 0.35 && solid(p, x, y - 0.3, r * 0.6, k > 0.7 ? H[2] : H[4]);
  }
  var rampAt2 = (r, t) => r[Math.min(r.length - 1, Math.max(0, Math.floor(t * r.length)))];
  function smokePuff(p, x, y, k, size, col = 0, big = !1, aMul = 1) {
    let age = 1 - k, r = size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * (big ? 0.5 : 0.4)), a = Math.min(1, age * 12) * Math.min(1, k * 2.4) * (big ? 0.7 : 0.58) * aMul, c = col ? mix(col, rampAt2(SMOKE_RAMP, age), age) : rampAt2(SMOKE_RAMP, age * 1.05);
    soft(p, x, y, r, c, a * 0.45), soft(p, x + r * 0.05, y + r * 0.06, r * 0.74, c, a * 0.62), age < 0.5 && soft(p, x - r * 0.22, y - r * 0.3, r * 0.5, mix(c, WHITE, 0.12), a * 0.4 * (1 - age * 2));
  }
  function ember(p, x, y, k, size, cols, ph) {
    if (k < 0.25 && Math.sin(ph) < 0) return;
    let c = k > 0.6 ? cols[0] : k > 0.3 ? cols[1] : cols[2];
    if (size >= 2) {
      let rim = k > 0.45 ? cols[2] : cols[3];
      p.px(x - 1, y, rim), p.px(x + 1, y, rim), p.px(x, y - 1, rim), p.px(x, y + 1, rim), p.px(x, y, c), p.glow(x, y, 8, c, 0.4 * k);
      return;
    }
    p.px(x, y, c), size > 1.4 && p.px(x, y + 1, cols[3]), p.glow(x, y, 3 + size, c, 0.35 * k);
  }
  function spark(p, x, y, vx, vy, k, cols) {
    let sp = Math.hypot(vx, vy) || 1, ux = vx / sp, uy = vy / sp, len2 = Math.min(9, 1 + sp * 0.022), head3 = k > 0.6 ? cols[0] : k > 0.3 ? cols[1] : cols[2];
    p.line(x - ux * len2, y - uy * len2, x - ux * len2 * 0.4, y - uy * len2 * 0.4, k > 0.5 ? head3 : cols[cols.length - 1]), p.line(x - ux * len2 * 0.45, y - uy * len2 * 0.45, x, y, head3), p.glow(x, y, 3, head3, 0.45 * k);
  }
  function along2(x, v, a, k, t) {
    if (k <= 0) return [x + v * t + 0.5 * a * t * t, v + a * t];
    let e = Math.exp(-k * t), vt = a / k;
    return [x + vt * t + (v - vt) * (1 - e) / k, vt + (v - vt) * e];
  }
  function drift(x, y, vx, vy, t, ax, ay, kx, ky) {
    let X = along2(x, vx, ax, kx, t), Y = along2(y, vy, ay, ky, t);
    return [X[0], Y[0], X[1], Y[1]];
  }
  function sparkAt(x, y, vx, vy, t, floor = 0, g = 427, k = 2.2) {
    let s = [x, y, vx, vy], left = t;
    for (let b = 0; b < 3; b++) {
      let e2 = drift(s[0], s[1], s[2], s[3], left, 0, g, k, k);
      if (e2[1] < floor || s[1] >= floor) return e2;
      let lo = 0, hi = left;
      for (let i = 0; i < 16; i++) {
        let m = (lo + hi) / 2;
        drift(s[0], s[1], s[2], s[3], m, 0, g, k, k)[1] < floor ? lo = m : hi = m;
      }
      let c = drift(s[0], s[1], s[2], s[3], hi, 0, g, k, k);
      s = [c[0], floor - 0.25, c[2] * 0.7, -Math.abs(c[3]) * 0.45], left -= hi;
    }
    let e = drift(s[0], s[1], s[2], s[3], left, 0, g, k, k);
    return e[1] < floor ? e : [e[0], floor - 0.25, e[2], 0];
  }
  function floorLight(p, x, y, rx, ry, c, k) {
    k <= 4e-3 || rx < 1 || ry < 0.5 || p.shade(x - rx, y - ry, x + rx, y + ry, (px, py, out) => {
      let dx = (px - x) / rx, dy = (py - y) / ry, d = dx * dx + dy * dy;
      if (d >= 1) return;
      let f = 1 - Math.sqrt(d);
      out.l = c, out.k = f * f * k;
    });
  }
  var SMOKE1 = hex("#5b5566");
  function burn(p, t, T, o) {
    let { H, D: D7, NL: NL5, S } = o, HC = o.height, X = o.x ?? 0, Y = o.y ?? 0, W = o.spread ?? 6, G3 = o.glow ?? 1, N = (rate, seed = 0, off = 0) => NL5(t, rate, seed, off), fla = (tt) => 0.74 + 0.16 * NL5(tt, 7.3, S + 1) + 0.1 * NL5(tt, 19, S + 2), fl = fla(t), SMOKE = mix(SMOKE1, H[6], 0.25), EMB = [H[1], H[2], H[4], H[6]], GLOW = mix(mix(H[3], H[4], 0.5), WHITE, 0.25), R = rng(S, 77), count = (rate) => Math.round(rate * D7), TT = T.map(([dx, dy, h, w, back], i) => ({ dx: dx + R.range(-0.3, 0.3), y: dy, h: 2 + HC * h * R.range(0.92, 1.08), w: w * R.range(0.92, 1.08), back, env: h, n: (S * 7 + i) * 13 })), lean = (tt) => NL5(tt, 0.67, S + 90) * (o.lean ?? 0.1), height = (i, tt) => {
      let { h, n } = TT[i], leap = Math.max(0, NL5(tt, 2.6, n + 70) - 0.55) * 1.4;
      return (h + 0.25 * h * NL5(tt, 3.3, n) + h * leap) * (0.9 + 0.1 * fla(tt));
    }, sweep = (i, tt, h) => NL5(tt, 2.2, TT[i].n + 40) * (1 + h * 0.08) + lean(tt) * h * 0.9 - clamp(TT[i].dx * 0.3, -2.5, 2.5), tip = (i, tt) => {
      let h = height(i, tt);
      return [X + TT[i].dx + sweep(i, tt, h) * 0.85, Y + TT[i].y - h * 0.88 + 3, h];
    }, tongueAt = (i) => {
      let { dx, y, w, n, back } = TT[i], h = height(i, t);
      flameTongue(p, X + dx, Y + y, h, w, sweep(i, t, h), N, n, H, back ? BACK_LAYERS : w > 2.2 ? BIG_LAYERS : LAYERS, 0.5, 1.1 + h * 0.04);
    };
    looped(t, D7, count(o.smoke ?? 12), S + 300, (r) => ({ x: r.range(-W, W) * 0.7, y: -HC * 0.8 - r.range(0, 6), vx: r.range(-2, 2), vy: -r.range(10, 17), life: r.range(...o.smokeLife ?? [1.6, 2.6]), s: r.range(0.7, 1.1) * (o.smokeSize ?? 3) }), (q, age) => {
      let [x, y] = drift(q.x, q.y, q.vx, q.vy, age, o.wind ?? 3, -20, 1.6, 1);
      smokePuff(p, X + x + NL5(t - age, 0.8, S + 60) * (1.5 + 2.5 * age), Y + y, 1 - age / q.life, q.s, SMOKE);
    });
    let puffs = [];
    looped(t, D7, TT.length * count(o.puffs ?? 8), S + 200, (r, j) => {
      let i = j % TT.length, fire = r.range(0.14, 0.3), smokes = r.chance(0.45);
      return { i, fire, smokes, sl: r.range(0.8, 1.4), ox: r.range(-1, 1), oy: r.range(0, 4), vx: r.range(-4, 4), vy: -r.range(15, 30), s: r.range(0.8, 1.6) * (0.8 + 0.6 * TT[i].env), f: r.next(), life: fire + (smokes ? 1.4 : 0) };
    }, (q, age) => {
      let [tx, ty] = tip(q.i, t - age), [x, y, vx, vy] = drift(tx + q.ox, ty + q.oy, q.vx, q.vy, Math.min(age, q.fire), 0, -95, 5, 3.2);
      if (age < q.fire) return puffs.push([x, y, 1 - age / q.fire, q.s, q.f]);
      if (age - q.fire > q.sl) return;
      let [sx, sy] = drift(x, y, vx * 0.6, vy * 0.6 - 6, age - q.fire, o.wind ?? 3, -16, 1.6, 1.2);
      smokePuff(p, sx, sy, 1 - (age - q.fire) / q.sl, q.s * 0.7, 0);
    });
    for (let i = 0; i < TT.length; i++) TT[i].back && tongueAt(i);
    for (let i = 0; i < TT.length; i++) TT[i].back || tongueAt(i);
    o.mid?.(fl), looped(t, D7, TT.length * count(o.licks ?? 4), S + 220, (r, j) => ({ i: j % TT.length, vx: r.range(-3, 3), vy: -r.range(12, 22), s: r.range(0.9, 1.6) * (0.8 + 0.5 * TT[j % TT.length].env), life: 0.26 }), (q, age) => {
      let [tx, ty] = tip(q.i, t - age);
      lick(p, tx + q.vx * age, ty - 2 + q.vy * age, 1 - age / q.life, q.s, H);
    });
    for (let [x, y, k, s, f] of puffs) firePuff(p, x, y, k, s, f, H);
    if (looped(t, D7, count(o.embers ?? 8), S + 500, (r) => ({ x: r.range(-W, W), y: -r.range(HC * 0.3, HC * 0.8), vx: r.range(-15, 15), vy: -r.range(25, 60), life: r.range(1.1, 2.4), s: r.chance(0.15) ? 2 : r.range(1, 1.6), a: r.range(0, 6.3), b: r.range(0, 6.3) }), (q, age) => {
      let [x, y] = drift(q.x, q.y, q.vx, q.vy, age, 0, -30, 1.6, 1.6);
      ember(p, X + x + 7 * (Math.sin(age * 2.3 + q.a) - Math.sin(q.a)), Y + y + 2 * (Math.sin(age * 3 + q.b) - Math.sin(q.b)), 1 - age / q.life, q.s, EMB, age * 40 + q.a);
    }), G3 > 0) {
      let R1 = o.glowR ?? 46, lx = X + lean(t) * 12;
      p.glow(lx, Y - HC * 0.35, R1 * 1.5, GLOW, 0.22 * fl * G3), p.glow(lx, Y - HC * 0.75, R1, GLOW, 0.34 * fl * G3), p.glow(X, Y - HC * 0.2, R1 * 0.32, H[2], 0.2 * fl * G3), p.glow(X, Y - 2, 8, H[0], 0.14 * fl * G3);
    }
    return { tip, fl };
  }

  // ../dl_pixelfx/repo/src/fx/fire/fireball.js
  var meta10 = {
    name: "Fireball",
    desc: "A fireball flying right: a churning white-hot head with a corona of flame, a long torn tail of flame puffs cooling into smoke, embers shed behind.",
    tags: ["fire", "fireball", "projectile", "magic", "directional", "loop"],
    size: [136, 56],
    origin: [112, 28],
    duration: 1.2,
    loop: !0,
    fps: 30,
    bg: "dark",
    options: {
      palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
      radius: 5,
      speed: 120,
      seed: 5
    }
  }, D = meta10.duration, NL = noiseFor(D), SMOKE12 = hex("#5b5566"), BODY = [[30, 4.2, 0], [23, 4.4, -1.6], [22, 4.4, 1.6], [15, 4.6, 0]], CORONA = [[-1.3, 6, 1.1], [-1.8, 8, 1.2], [-2.3, 7, 1.1], [1.3, 6, 1.1], [1.8, 8, 1.2], [2.3, 7, 1.1]];
  function head2(p, H, t, R0, S, hx, hy) {
    let ph = t / D;
    p.shade(hx - R0 * 2.4, hy - R0 * 1.7, hx + R0 * 1.5, hy + R0 * 1.7, (x, y, out) => {
      x -= hx, y -= hy;
      let d = Math.hypot(x, y), th = Math.atan2(y, x), back = Math.max(0, -Math.cos(th)), a = th / TAU, bump = 0.55 * pnoise(a * 9 + ph * 9, 9, S) + 0.35 * pnoise(a * 5 - ph * 10, 5, S + 1), rim = R0 * (1 + 0.55 * back * back) + bump;
      if (d > rim) return;
      let swirl = pnoise(a * 5 - ph * 10 + d * 0.45, 5, S + 2), h = 1 - d / rim + 0.26 * swirl + 0.1 * (1 - back);
      return rim - d < 1 && back < 0.3 ? h > 0.3 ? H[3] : H[5] : h > 0.74 ? H[0] : h > 0.58 ? H[1] : h > 0.42 ? H[2] : h > 0.27 ? H[4] : h > 0.13 ? H[5] : H[6];
    });
  }
  function draw2(p, t, o) {
    let F = fit(o.palette, 9), H = hotFirst(F), S = o.seed, R0 = o.radius, V = o.speed, N = (rate, seed = 0, off = 0) => NL(t, rate, seed, off), GLOW = mix(mix(H[3], H[4], 0.5), WHITE, 0.25), SMOKE = mix(SMOKE12, H[6], 0.3), SPARKS = [H[1], H[2], H[4], H[5]], EMB = [H[1], H[2], H[4], H[6]], hx = N(3, S + 50) * 0.5, hy = N(2.5, S + 51) * 0.7, fire = [], smoke = [];
    looped(t, D, 130, S + 100, (r) => {
      let fl2 = r.range(0.22, 0.55), sm = r.chance(0.55), x = -r.range(2, 24);
      return { x, y: r.range(-1, 1) * (R0 - 0.1 * -x), v: V * r.range(0.3, 0.6), vy: r.range(-16, 16), fl: fl2, sm, sl: r.range(0.25, 0.45), s: r.range(1.3, 2.9), f: r.next() * 0.5 + 0.5 * (-x / 24), life: fl2 + (sm ? 0.45 : 0) };
    }, (q, age) => {
      let ta = Math.min(age, q.fl), [wx, y, wvx, vy] = drift(0, q.y, q.v, q.vy, ta, 0, -70, 4.5, 3), x = q.x + wx - V * ta;
      if (age < q.fl) return fire.push([age, x, y, q]);
      if (!q.sm || age - q.fl > q.sl) return;
      let sa = age - q.fl, [sx, sy] = drift(x, y, wvx - V, vy * 0.6 - 6, sa, V * 2, -30, 2, 1.2);
      smoke.push([sa, sx, sy, q]);
    });
    for (let [sa, x, y, q] of smoke) smokePuff(p, x, y, 1 - sa / q.sl, q.s * 0.9, SMOKE);
    fire.sort((a, b) => b[0] - a[0]);
    for (let [age, x, y, q] of fire) {
      let u = age / q.fl;
      firePuff(p, x, y, 1 - u, q.s * (1 + 1.3 * u), q.f, H, 0.07, -0.86, -0.5);
    }
    BODY.forEach(([len2, w, dy], i) => {
      let n = (S * 5 + i) * 17, L = len2 * (0.82 + 0.25 * N(4, n)) * (1 + 0.3 * Math.max(0, N(2.4, n + 3)));
      flameBlade(p, hx + 1, hy + dy * 0.5, -1, dy * 0.02, L, w * R0 / 5, N(3, n + 5) * 3 + dy, N, n, H, LAYERS, 0.5, 1.1 + L * 0.05);
    }), CORONA.forEach(([a, len2, w], i) => {
      let n = (S * 5 + i + 20) * 17, L = len2 * (0.7 + 0.4 * (0.5 + 0.5 * N(6, n))), ox = Math.cos(a) * R0 * 0.85, oy = Math.sin(a) * R0 * 0.85, dx = Math.cos(a) * 0.55 - 1, dy = Math.sin(a) * 0.55, l = Math.hypot(dx, dy);
      flameBlade(p, hx + ox, hy + oy, dx / l, dy / l, L, w, -Math.sign(a) * 1.5, N, n, H, LAYERS);
    }), head2(p, H, t, R0, S, hx, hy), looped(t, D, 26, S + 200, (r) => ({ a: r.range(-2.4, 2.4), v: r.range(30, 70), life: r.range(0.08, 0.18) }), (q, age) => {
      let ca = Math.cos(q.a), sa = Math.sin(q.a), d = R0 * 0.9 + q.v * age, x = hx + ca * d - V * 0.4 * age, y = hy + sa * d, k = 1 - age / q.life, L = 1 + 2 * k;
      p.line(x - ca * L + V * 0.02, y - sa * L, x, y, k > 0.5 ? H[1] : H[3]), p.glow(x, y, 3, H[2], 0.4 * k);
    }), looped(t, D, 30, S + 300, (r) => ({ x: -r.range(2, 16), y: r.range(-3, 3), v: V * r.range(0.3, 0.8), vy: r.range(-20, 20), life: r.range(0.25, 0.55), big: r.chance(0.25), ph: r.range(0, 6.3) }), (q, age) => {
      let [wx, y, wvx, vy] = drift(0, q.y, q.v, q.vy, age, 0, 50, 3, 2), x = q.x + wx - V * age, k = 1 - age / q.life;
      q.big ? ember(p, x, y, k, 2, EMB, age * 40 + q.ph) : spark(p, x, y, wvx - V, vy, k, SPARKS);
    });
    let fl = 0.85 + 0.15 * N(9, S + 7);
    p.glowLine(hx - 6, hy, -50, -2, 12, GLOW, 0.2 * fl), p.glow(hx - 2, hy, 42, GLOW, 0.42 * fl), p.glow(hx, hy, 13, H[1], 0.3 * fl);
  }

  // ../dl_pixelfx/repo/src/fx/ice/ice-lance.js
  var ice_lance_exports = {};
  __export(ice_lance_exports, {
    draw: () => draw3,
    meta: () => meta11
  });

  // ../dl_pixelfx/repo/src/fx/ice/_lib.js
  function blade2(p, bx, by, tx, ty, w, C, opts = {}) {
    let dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy);
    if (L < 1.5 || w < 0.5) return;
    let ux = dx / L, uy = dy / L, nx = -uy, ny = ux, a = opts.a ?? 1, dim = opts.dim ?? 0, jag = opts.jag ?? -1, glint2 = opts.glint ?? -1, K = (i) => C[clamp(i - dim, 0, C.length - 1)], hw = w / 2, left = (u) => hw * (1 - u) + 0.35, right = (u) => hw * (1 - u) * (jag >= 0 && u > jag ? 0.55 : 1) + 0.35, ridge = (u) => -w * 0.12 * (1 - u), pad = hw + 2;
    p.shade(Math.min(bx, tx) - pad, Math.min(by, ty) - pad, Math.max(bx, tx) + pad, Math.max(by, ty), (x, y, o) => {
      let rx = x - bx, ry = y - by, u = (rx * ux + ry * uy) / L, s = rx * nx + ry * ny;
      if (u < 0) return;
      let l = left(Math.min(u, 1)), r = right(Math.min(u, 1));
      if (u > 1 || s < -l || s > r) {
        let over = u > 1 ? (u - 1) * L : 0;
        Math.max(over, s < -l ? -l - s : s - r) < 1 && u < 1 + 1 / L && (o.c = K(0), o.a = a);
        return;
      }
      if (o.a = a, opts.white) return o.c = WHITE;
      let rd = ridge(u), c;
      if (u > 0.88 ? c = WHITE : Math.abs(s - rd) < 0.55 ? c = K(6) : s < rd ? c = s + l < 1 ? K(6) : (s + l) / Math.max(1, rd + l) > 0.55 ? K(5) : K(4) : c = r - s < 1.1 ? K(1) : (s - rd) / Math.max(1, r - rd) > 0.5 ? K(2) : K(3), jag >= 0 && Math.abs(u - jag) * L < 0.8 && s > rd ? c = K(6) : s < rd && c !== K(6) && (Math.floor(x) * 73856093 ^ Math.floor(y) * 19349663) % 997 < 30 && (c = K(7)), glint2 >= 0 && s <= rd + 0.6) {
        let g = Math.abs(u - glint2) * L;
        g < 0.8 ? c = WHITE : g < 1.8 && (c = K(6));
      }
      o.c = c;
    });
  }

  // ../dl_pixelfx/repo/src/fx/ice/ice-lance.js
  var meta11 = {
    name: "Ice lance",
    desc: "A faceted ice spear flying right: a light pulse runs through its core, rings of cold air shear off the tip, frost peels off into a wake and crystals shed behind it.",
    tags: ["ice", "lance", "spear", "projectile", "directional", "magic", "loop"],
    size: [176, 64],
    origin: [146, 32],
    duration: 0.8,
    loop: !0,
    fps: 30,
    bg: "dark",
    options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], length: 40, seed: 13 }
  };
  function spear(p, C, L, pulse, glint2) {
    let half = (x) => x > -16 ? 3.5 * (-x / 16) + 0.3 : x < -L + 3 ? 3.5 * (0.7 + 0.3 * ((x + L) / 3)) : 3.5;
    p.shade(-L - 1, -3.5 - 2, 1, 3.5 + 2, (x, y, o) => {
      if (x > 0 || x < -L) return;
      let h = half(x);
      if (Math.abs(y) > h + 0.5) {
        Math.abs(y) < h + 1.5 && (o.c = C[1]);
        return;
      }
      let v = y / Math.max(0.5, h);
      if (x > -1.5) return o.c = WHITE;
      if (v > -0.3 && v < 0.35 && Math.abs(x - pulse) < 2.5) return o.c = WHITE;
      if (v < -0.3 && Math.abs(x - glint2) < 1) return o.c = WHITE;
      o.c = v < -0.72 ? WHITE : v < -0.36 ? C[6] : v < -0.18 ? C[7] : v < 0.38 ? C[4] : v < 0.78 ? C[2] : C[1];
    });
  }
  function draw3(p, t, o) {
    let C = fit(o.palette, 8), D7 = meta11.duration, S = o.seed, L = o.length, ph = t / D7;
    p.each(-L - 100, -12, -L + 4, 12, (x, y, sx, sy) => {
      let u = (-L + 4 - x) / 104, w = 4.5 * (1 - u) ** 0.7 + 0.5 + 1.5 * Math.sin(u * 9 - ph * TAU * 2) * u, v = Math.abs(y) / w;
      if (v >= 1) return;
      let a = (1 - v * v) * (1 - u) ** 1.4;
      a < 0.04 || (p.blendPx(sx, sy, v < 0.25 && u < 0.4 ? C[6] : v < 0.6 ? C[5] : C[4], a * 0.7), a > 0.3 && p.add(sx, sy, C[5], 0.12 * a));
    }), p.glowLine(-L - 60, 0, 0, 0, 14, C[4], 0.22), cycle(t, D7, 14, S, (g) => g.range(0.35, 0.55), (age, life, r) => {
      let x0 = r.range(-L + 2, -8), [x, y] = fly(x0, r.range(-2.5, 2.5), -r.range(150, 230), r.sign() * r.range(8, 30), age, 0, 2.2), k = age / life, rad = 1.2 + 5.5 * k, a = 0.5 * (1 - k) ** 1.3;
      p.disc(x, y, rad, k < 0.3 ? C[6] : C[5], (d) => a * (1 - d * d)), p.glow(x, y, rad * 1.6, C[4], 0.1 * (1 - k));
    }), cycle(t, D7, 9, S + 1, (g) => g.range(0.4, 0.6), (age, life, r) => {
      let [x, y] = fly(r.range(-L, -6), r.range(-3, 3), -r.range(170, 260), r.range(-35, 35), age, 60, 1.2), k = age / life, a = r.range(0, TAU) + age * r.range(10, 18) * r.sign(), l = r.range(1.2, 2.2), ca = Math.cos(a), sa = Math.sin(a);
      if (!(k > 0.85 && age * 30 % 2 < 1) && (p.line(x - ca * l, y - sa * l, x + ca * l, y + sa * l, C[5]), p.px(x + ca * l, y + sa * l, WHITE), Math.cos(a * 2) > 0.9)) {
        for (let [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, C[6]);
        p.glow(x, y, 6, C[5], 0.45);
      }
    }), cycle(t, D7, 12, S + 2, (g) => g.range(0.16, 0.26), (age, life, r) => {
      let y = r.sign() * r.range(4, 13), x = r.range(-20, 0) - age * r.range(280, 380), l = r.range(6, 16), k = age / life;
      p.line(x, y, x + l, y, (u) => u > 0.7 ? C[6] : C[4], (u) => u * (1 - k) * 1.4);
    });
    for (let i = 0; i < 3; i++) {
      let q = (ph * 3 + i / 3) % 1, x = -4 - q * (L + 20), ry = 4.5 + q * 8, rx = 1.2 + q * 2.6;
      if (!(q > 0.8)) {
        for (let k = 0; k < 40; k++) {
          let an = k / 40 * TAU, px = x + Math.cos(an) * rx, py = Math.sin(an) * ry;
          Math.abs(py) < 4.6 && px > -L - 2 || p.px(px, py, Math.cos(an) > 0 ? q < 0.35 ? WHITE : C[6] : q < 0.4 ? C[5] : C[4]);
        }
        p.glowRing(x, 0, ry * 0.75, 3, C[5], 0.14 * (1 - q));
      }
    }
    for (let [dy, l, w] of [[-1, 10, 4], [1, 9, 4], [-0.2, 6, 3]]) blade2(p, -L + 3, dy * 1.5, -L + 3 - l, dy * (2 + l * 0.5), w, C);
    let pulse = -L + ph * 2 % 1 * (L + 6), glint2 = -((ph * 2 + 0.5) % 1) * L * 1.2;
    spear(p, C, L, pulse, glint2), p.glowLine(-L, 0, 0, 0, 10, C[4], 0.1), p.glow(pulse, 0, 8, C[6], 0.3), p.glow(0, 0, 8, WHITE, 0.4), p.glow(-L * 0.4, 0, 30, C[3], 0.16);
  }

  // ../dl_pixelfx/repo/src/fx/holy/heal.js
  var heal_exports = {};
  __export(heal_exports, {
    act: () => act6,
    create: () => create9,
    meta: () => meta12
  });

  // ../dl_pixelfx/repo/src/fx/holy/_lib.js
  var SHAPES = /* @__PURE__ */ new WeakMap();
  function shapeOf(A) {
    let s = SHAPES.get(A.mask);
    if (s && s.x === A.x && s.y === A.y) return s;
    let m = A.mask, inside = (i, j) => i >= 0 && j >= 0 && i < m.w && j < m.h && m.data[j * m.w + i] > 0, edge = [], out = [];
    for (let j = -1; j <= m.h; j++)
      for (let i = -1; i <= m.w; i++) {
        let nb = inside(i - 1, j) + inside(i + 1, j) + inside(i, j - 1) + inside(i, j + 1);
        inside(i, j) ? nb < 4 && edge.push([A.x + i, A.y + j]) : nb && out.push([A.x + i, A.y + j]);
      }
    return s = { x: A.x, y: A.y, edge, out, top: A.y, bottom: A.y + m.h, at: (x, y) => inside(Math.floor(x) - A.x, Math.floor(y) - A.y) }, SHAPES.set(A.mask, s), s;
  }
  function recolor(p, A, fn, a = 1) {
    let m = A.mask, P2 = A.pixels, fa = typeof a == "function";
    if (P2)
      for (let j = 0; j < m.h; j++)
        for (let i = 0; i < m.w; i++) {
          let c = P2[j * m.w + i];
          if (!c) continue;
          let x = A.x + i, y = A.y + j, n = fn(c, x, y);
          n && p.dot(x, y, n, fa ? a(x, y) : a);
        }
  }
  function oval(p, cx, cy, rx, ry, c, a = 1, keep = null) {
    if (rx < 0.5) return;
    let n = Math.ceil(Math.max(rx, ry) * TAU * 1.5) + 6, fc = typeof c == "function", fa = typeof a == "function";
    for (let j = 0; j < n; j++) {
      let g = j / n * TAU;
      keep && !keep(g) || p.dot(cx + Math.cos(g) * rx, cy + Math.sin(g) * ry, fc ? c(g) : c, fa ? a(g) : a);
    }
  }

  // ../dl_pixelfx/repo/src/fx/holy/heal.js
  var meta12 = {
    name: "Heal",
    desc: "Petals of light bloom under the feet, a hoop of light rises up the body restoring its colour and leaving sparkles, and motes spiral up and pop into tiny hearts.",
    tags: ["holy", "heal", "restore", "buff", "petals", "hearts", "character", "one-shot"],
    size: [80, 104],
    origin: [40, 92],
    duration: 1.9,
    loop: !1,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: { palette: ["#3d2027", "#7d3f35", "#c97a4a", "#f2b46a", "#ffd994", "#fff0cf", "#fffaf2", "#ffffff"], seed: 2 }
  }, HURT = { turn: 0.8, crouch: 5, lean: 3, hy: 1, fx: 1, fy: -21, bx: 7, by: -15, ffx: 4, fbx: -3 }, UP = { turn: 1.15, crouch: -1, fx: -13, fy: -36, bx: 14, by: -36, hy: -1, ffx: -3, fbx: 4 }, act6 = {
    onBody: !0,
    poses: [
      [-0.3, HURT],
      [0.16, { ...HURT, crouch: 6 }],
      [0.5, { ...HURT, crouch: 3, lean: 1, hy: 0 }],
      [0.78, UP],
      [1.2, { ...UP, crouch: 0, fy: -30, by: -30, hy: 0 }],
      [1.9, READY]
    ]
  }, SY = 0.3, NP = 8, PR = 16, LIFT0 = 0.16, LIFT1 = 0.74, TOPY = -43, HEART = [".#.#.", "#####", ".###.", "..#.."];
  function heart(p, x, y, C, a) {
    let X = Math.round(x) - 2, Y = Math.round(y) - 2, at = (i, j) => j >= 0 && j < 4 && i >= 0 && i < 5 && HEART[j][i] === "#";
    for (let j = -1; j <= 4; j++)
      for (let i = -1; i <= 5; i++)
        at(i, j) ? p.dot(X + i, Y + j, i === 1 && j === 1 ? WHITE : j >= 2 ? C[5] : C[6], a) : (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1)) && p.dot(X + i, Y + j, C[3], a * 0.9);
    p.glow(x, y, 6, C[5], 0.4 * a);
  }
  function create9(o) {
    let C = fit(o.palette, 8), A = o.actor, S = shapeOf(A), R = new Rng(o.seed), ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights(), rows = /* @__PURE__ */ new Map();
    for (let [x, y] of S.edge) (rows.get(y) ?? rows.set(y, []).get(y)).push(x);
    let petals = Array.from({ length: NP }, (_, k) => ({ a: k / NP * TAU + 0.2, t0: 0.02 + k * 3 % NP * 0.035, w: R.range(4.2, 5.2) })), motes = [];
    for (let k = 0; k < NP; k++) motes.push({ t0: 0.2 + k * 0.05, th0: petals[k].a, r0: PR * 0.9, y0: -1, w: 4.2 * (k % 2 ? 1 : -1), v: R.range(46, 58), life: R.range(0.75, 0.95), kind: k % 2 });
    for (let k = 0; k < 8; k++) motes.push({ t0: LIFT1 + R.range(0, 0.06), th0: k / 8 * TAU, r0: R.range(12, 18), y0: TOPY + R.range(-2, 4), w: 3.6 * (k % 2 ? 1 : -1), v: R.range(14, 34), life: R.range(0.35, 0.6), kind: (k + 1) % 2 });
    let t = 0, burst = !1, lastRow = 1, hoopY = (tt) => lerp(0, TOPY, ease.inOutSine(seg(tt, LIFT0, LIFT1))), hoopR = (tt) => lerp(PR, 12, seg(tt, LIFT0, LIFT1));
    function bloom(k, tt) {
      let pe = petals[k];
      return ease.outBack(seg(tt, pe.t0, pe.t0 + 0.3), 1.8) * (1 - ease.inBack(seg(tt, 1.25 + k * 0.02, 1.6 + k * 0.02), 1.4));
    }
    function petal(p, k, back) {
      let pe = petals[k], g = pe.a + t * 0.4, near2 = Math.sin(g) >= 0, b = bloom(k, t);
      if (near2 === back || b <= 0.02) return;
      let ca = Math.cos(g), sa = Math.sin(g), rb = 6, rt = rb + 9 * Math.min(1.2, b), h = (k % 2 ? 7 : 9) * b, bx = ca * rb, by = sa * rb * SY, tx = ca * rt, ty = sa * rt * SY - h, L = Math.hypot(tx - bx, ty - by);
      if (L < 1.5) return;
      let ux = (tx - bx) / L, uy = (ty - by) / L, W = pe.w * Math.min(1, b) * (0.35 + 0.65 * Math.abs(sa)), pad = W + 1;
      p.each(Math.min(bx, tx) - pad, Math.min(by, ty) - pad, Math.max(bx, tx) + pad, Math.max(by, ty) + pad, (x, y, sx, sy) => {
        let dx = x - bx, dy = y - by, u = (dx * ux + dy * uy) / L;
        if (u < 0 || u > 1) return;
        let hw = W * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.6)), 0.7) + 0.2, v = Math.abs(-dx * uy + dy * ux) / hw;
        if (!(v > 1)) {
          if (u > 0.9) return p.put(sx, sy, WHITE, 1);
          if (v > 0.7) return p.put(sx, sy, u < 0.3 ? C[3] : u < 0.7 ? C[5] : C[6], 1);
          if (v < 0.2 && u > 0.15 && u < 0.85) return p.put(sx, sy, u < 0.55 ? C[5] : C[6], back ? 0.75 : 0.85);
          p.blendPx(sx, sy, u < 0.45 ? C[3] : C[4], back ? 0.6 : 0.45);
        }
      }), p.glow(tx, ty, 5, C[5], 0.35 * Math.min(1, b));
    }
    function hoop(p, back) {
      if (t < LIFT0 || t > LIFT1 + 0.12) return;
      let y = hoopY(t), r = hoopR(t) * (t > LIFT1 ? 1 - (t - LIFT1) / 0.12 : 1), keep = back ? (g) => Math.sin(g) < 0 : (g) => Math.sin(g) >= 0;
      if (oval(p, 0, y, r, r * SY, (g) => Math.sin(g) > 0.5 ? WHITE : C[6], back ? 0.8 : 1, keep), !back) {
        oval(p, 0, y + 1, r - 0.5, r * SY, C[4], 1, keep);
        for (let i = -2; i <= 2; i++) p.glow(i * r * 0.45, y, 8, C[5], 0.32);
      }
    }
    return {
      update(dt) {
        if (t += dt, t > LIFT0 && t < LIFT1) {
          let Y = Math.round(hoopY(t));
          for (let y = lastRow; y > Y; y--) {
            let xs = rows.get(y);
            !xs || !R.chance(0.45) || ps.spawn(P.STAR, R.pick(xs) + R.range(-1, 1) * 2, y, R.range(-4, 4), -R.range(4, 12), R.range(0.3, 0.55), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 1.6));
          }
          lastRow = Math.min(lastRow, Y);
        }
        !burst && t >= LIFT1 && (burst = !0, lights.add(0, TOPY, 26, C[5], 0.55, 0.3), lights.add(0, TOPY, 10, WHITE, 0.45, 0.08)), ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let pool = smooth(0, 0.2, t) * (1 - smooth(1.3, 1.75, t));
        pool > 0 && p.glow(0, -2, 30, C[4], 0.3 * pool);
        for (let k = 0; k < NP; k++) petal(p, k, !0);
        hoop(p, !0), ps.draw(p, "back"), riders(p, !0);
      },
      draw(p) {
        let drain = smooth(0, 0.08, t);
        if (t < LIFT1 + 0.35) {
          let Y = t < LIFT0 ? 1 : hoopY(t), done = t >= LIFT1;
          recolor(p, A, (c, x, y) => {
            let d = y - Y;
            if (!done && d < -0.5) {
              let l = luma(c) * 0.88;
              return mix(c, rgb(l * 236, l * 226, l * 222), 0.68 * drain);
            }
            if (!done && d < 1) return WHITE;
            if (!done && d < 2.5) return C[6];
            let k = done ? 0.45 * (1 - seg(t, LIFT1, LIFT1 + 0.35)) : 0.5 * Math.exp(-(d - 2.5) / 5);
            return k > 0.05 ? mix(c, C[5], k) : 0;
          }), t > LIFT0 && !done && p.glow(0, Y, 18, C[5], 0.35);
        }
        for (let k = 0; k < NP; k++) petal(p, k, !1);
        hoop(p, !1), t >= LIFT1 && t < LIFT1 + 0.25 && sparkle(p, 0, TOPY, 8 * (1 - (t - LIFT1) / 0.25), WHITE, C[5], 0.6), riders(p, !1), ps.draw(p, "front"), lights.draw(p);
      }
    };
    function riders(p, back) {
      for (let m of motes) {
        let a = t - m.t0;
        if (a < 0) continue;
        let at = (aa) => {
          let th = m.th0 + m.w * aa, r = m.r0 * (1 - 0.45 * (aa / m.life));
          return [Math.cos(th) * r, m.y0 - m.v * aa, Math.sin(th)];
        };
        if (a < m.life) {
          let [x2, y2, z] = at(a);
          if (z < 0 !== back) continue;
          for (let j = 0; j < 7; j++) {
            let aj = a - j * 0.03;
            if (aj < 0) break;
            let [tx, ty, tz] = at(aj);
            tz < 0 === back && p.dot(tx, ty, j === 0 ? WHITE : j < 3 ? C[6] : C[5], (1 - j / 7) * (back ? 0.6 : 1));
          }
          p.glow(x2, y2, 4, C[5], back ? 0.2 : 0.4);
          continue;
        }
        let u = (a - m.life) / 0.36;
        if (u >= 1 || back) continue;
        let [x, y] = at(m.life), k = 1 - smooth(0.5, 1, u);
        u < 0.12 ? sparkle(p, x, y, 3, WHITE, C[6], 0.5) : m.kind ? heart(p, x, y - u * 6, C, k) : sparkle(p, x, y - u * 5, 1 + 2 * k * (0.7 + 0.3 * Math.sin(a * 30)), WHITE, C[5], 0.45 * k);
      }
    }
  }

  // ../dl_pixelfx/repo/src/fx/shadow/curse.js
  var curse_exports = {};
  __export(curse_exports, {
    act: () => act7,
    create: () => create10,
    meta: () => meta13
  });

  // ../dl_pixelfx/repo/src/fx/shadow/_lib.js
  var VOID = ["#06040b", "#150c26", "#2a1150", "#461a84", "#6f2cc0", "#9d5cec", "#cfa6ff", "#f6eaff"];
  function unlight(p, x0, y0, x1, y1, dark, keep = 0) {
    let L = p.L, w = p.w, ox = p.ox, oy = p.oy;
    p.each(x0, y0, x1, y1, (x, y, sx, sy) => {
      if (!dark(x, y)) return;
      let i = (sy - oy) * w + (sx - ox), d = L[i];
      d && (keep <= 0 ? L[i] = 0 : L[i] = 255 << 24 | (d >>> 16 & 255) * keep << 16 | (d >>> 8 & 255) * keep << 8 | (d & 255) * keep);
    });
  }
  function annulus(x, y, r0, r1, fn) {
    let r02 = r0 > 0 ? r0 * r0 : -1, r12 = r1 * r1;
    for (let py = Math.floor(y - r1); py <= Math.ceil(y + r1); py++) {
      let cy = py + 0.5, dy = cy - y, dy2 = dy * dy;
      if (dy2 >= r12) continue;
      let xo = Math.sqrt(r12 - dy2), xi = dy2 < r02 ? Math.sqrt(r02 - dy2) : 0;
      for (let px = Math.floor(x - xo), x1 = Math.ceil(x + xo); px <= x1; px++) {
        let cx = px + 0.5, dx = cx - x;
        if (xi > 0 && dx > -xi && dx < xi) {
          px = Math.max(px, Math.floor(x + xi) - 1);
          continue;
        }
        let d2 = dx * dx + dy2;
        d2 < r12 && d2 >= r02 && fn(cx, cy, Math.sqrt(d2));
      }
    }
  }
  function ringFast(p, x, y, r, w, c, a = 1) {
    if (r <= 0) return;
    let r0 = Math.max(0, r - w), fc = typeof c == "function", fa = typeof a == "function";
    annulus(x, y, r0, r, (cx, cy, d) => {
      let v = (d - r0) / (r - r0 || 1), ang = fc || fa ? Math.atan2(cy - y, cx - x) : 0;
      p.dot(cx, cy, fc ? c(v, ang) : c, fa ? a(v, ang) : a);
    });
  }
  function attract(list, x, y, G3, reach, swirl, r0, dt, w = () => 1, vmax = 1 / 0) {
    let eaten = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      let q = list[i], wt = w(q);
      if (!wt || q.delay > 0) continue;
      let dx = x - q.x, dy = y - q.y, d2 = dx * dx + dy * dy;
      if (d2 > reach * reach) continue;
      let d = Math.sqrt(d2) || 1;
      if (d < r0) {
        list.splice(i, 1), eaten++;
        continue;
      }
      let a = G3 / (d2 + r0 * r0) * Math.min(1, (reach - d) / (reach * 0.25)) * wt * dt, ux = dx / d, uy = dy / d;
      q.vx += (ux - uy * swirl) * a, q.vy += (uy + ux * swirl) * a;
      let drag = Math.min(0.2, (1 - d / reach) * 1.6 * dt);
      q.vx -= q.vx * drag, q.vy -= q.vy * drag;
      let v = Math.hypot(q.vx, q.vy);
      v > vmax && (q.vx *= vmax / v, q.vy *= vmax / v);
    }
    return eaten;
  }
  var PK = { FLAME: 0, SOOT: 1 }, Puffs = class {
    constructor(o) {
      this.R = o.rng, this.list = [], this.t = 0, this.F = ramp(o.flame), this.soot = ramp(o.soot), this.cap = hex(o.cap), this.rim = ramp(o.rim), this.floor = o.floor ?? null;
    }
    spawn(k, x, y, vx, vy, life, size, delay = 0, smokes = !1) {
      this.list.push({ k, x, y, vx, vy, life, max: life, size, delay, smokes, seed: this.R.next() * 100 });
    }
    get count() {
      return this.list.length;
    }
    update(dt) {
      this.t += dt;
      let t = this.t;
      for (let i = this.list.length - 1; i >= 0; i--) {
        let q = this.list[i];
        if (q.delay > 0) {
          q.delay -= dt;
          continue;
        }
        if ((q.life -= dt) <= 0) {
          q.k === PK.FLAME && q.smokes && this.spawn(PK.SOOT, q.x, q.y - 1, q.vx * 0.5, q.vy * 0.5 - 6, this.R.range(0.9, 1.6), q.size * 1.25), this.list.splice(i, 1);
          continue;
        }
        if (q.k === PK.FLAME ? (q.vy -= 95 * dt, q.vx += Math.sin(t * 17 + q.seed) * 30 * dt, q.vx -= q.vx * 5 * dt, q.vy -= q.vy * 3.2 * dt) : (q.vy -= 18 * dt, q.vx += Math.sin(t * 1.3 + q.seed) * 8 * dt, q.vx -= q.vx * 1.6 * dt, q.vy -= q.vy * 1.3 * dt), q.x += q.vx * dt, q.y += q.vy * dt, this.floor && q.k === PK.SOOT) {
          let f = this.floor(q.x) - q.size * 0.6;
          q.y > f && (q.y = f, q.vy = Math.min(0, q.vy), q.vx *= 1 - 2 * dt);
        }
      }
    }
    draw(p, kind, light = null) {
      let F = this.F, n = F.length;
      for (let q of this.list) {
        if (q.delay > 0 || q.k !== kind) continue;
        let k = q.life / q.max, age = 1 - k, x = q.x, y = q.y;
        if (q.k === PK.FLAME) {
          let heat = Math.min(0.999, Math.pow(age, 0.62) + q.seed % 1 * 0.1), idx = Math.min(n - 2, Math.floor(heat * (n - 1))), r2 = q.size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = F[idx];
          idx >= n - 3 ? p.disc(x, y, r2, c, Math.min(1, k * 3) * 0.8) : (p.circle(x, y, r2, F[Math.min(n - 1, idx + 2)]), p.circle(x - r2 * 0.16, y - r2 * 0.22, r2 * 0.78, c), r2 > 1.6 && p.circle(x, y - r2 * 0.9, r2 * 0.42, c), idx <= 3 && r2 > 1.8 && p.circle(x - r2 * 0.28, y - r2 * 0.34, r2 * 0.36, F[Math.max(0, idx - 1)]), idx < 6 && p.glow(x, y, r2 * 2.4 + 2, c, 0.2 * k));
          continue;
        }
        let r = q.size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * 0.45), a = Math.min(1, age * 10) * Math.min(1, k * 2.2) * 0.72, body = mix(this.soot[0], this.soot[1], age), edge = a * 0.5, core = 1 - (1 - a * 0.5) * (1 - a * 0.62);
        p.disc(x, y + r * 0.06, r, body, (d) => d < 0.72 ? core : edge);
        let lk = light ? light.k : 0;
        if (lk < 0.5 && p.disc(x - r * 0.2, y - r * 0.32, r * 0.48, this.cap, a * 0.32 * (1 - age * 0.7) * (1 - lk * 2)), lk <= 0.02) continue;
        let lx = light.x - x, ly = light.y - y, dl = Math.sqrt(lx * lx + ly * ly) || 1, ux = lx / dl, uy = ly / dl, lit = Math.min(1, light.k * clamp(1.3 - dl / light.reach)) * a;
        if (lit <= 0.02) continue;
        let [hot, warm, dim] = this.rim;
        p.disc(x + ux * r * 0.26, y + uy * r * 0.26, r * 0.72, dim, lit * 0.55), p.disc(x + ux * r * 0.5, y + uy * r * 0.5, r * 0.46, warm, lit * 0.5), r > 3 && p.disc(x + ux * r * 0.68, y + uy * r * 0.68, r * 0.24, hot, lit * 0.4);
      }
    }
  };

  // ../dl_pixelfx/repo/src/fx/shadow/curse.js
  var meta13 = {
    name: "Curse",
    desc: "Wisps gather over the head, a skull stamps down with a flash, its eyes burn as the curse floods the body violet, then it cracks and crumbles.",
    tags: ["shadow", "curse", "debuff", "skull", "status", "dark", "magic", "one-shot"],
    size: [112, 124],
    origin: [56, 108],
    duration: 3.4,
    loop: !1,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: { palette: VOID, bone: ["#170f26", "#4a3a6e", "#7f6ea6", "#b3a4d4", "#e2d8f6"], seed: 9 }
  }, COWER = { turn: 1, crouch: 6, lean: 2, hy: 1, fx: -6, fy: -38, bx: 7, by: -38, ffx: -4, fbx: 5 }, act7 = {
    onBody: !0,
    poses: [
      [-0.2, READY],
      [0.3, { turn: 0.9, hy: -1, fx: -9, fy: -19, bx: 10, by: -19, ffx: -3, fbx: 4 }],
      [0.55, COWER, "snap"],
      [0.8, { ...COWER, crouch: 7 }],
      [1.2, { ...COWER, crouch: 6, lean: 3 }],
      [1.72, { ...COWER, crouch: 7, lean: 2 }],
      [2.1, { turn: 1, crouch: 4, lean: 3, hy: 2, fx: -8, fy: -15, bx: 9, by: -15, ffx: -4, fbx: 5 }],
      [2.9, { turn: 1, crouch: 3, lean: 1, fx: -8, fy: -16, bx: 9, by: -16, ffx: -3, fbx: 4 }],
      [3.4, READY]
    ],
    hits: [{ t: 0.55, stop: 0.09, shake: 0.2, amp: 2 }]
  }, SY2 = -60, STAMP = 0.55, CRACK = 1.72, BREAK = 1.98, SKULL = [
    "......kkkkk......",
    "....kkhhhhlkk....",
    "...khhhhhhlllk...",
    "..khhhhhllllllk..",
    ".khhhhlllllllmmk.",
    ".khhhllllllllmmk.",
    "khhllllllllllmmdk",
    "khlldddllldddmmdk",
    "khleeeeelleeeeedk",
    "kleeeeeelleeeeedk",
    "kleeeeeemleeeeedk",
    "kmleeeelmmleeedkk",
    ".kmmlllmnnmlmddk.",
    "..kmmlmnnnnmddk..",
    "..kdmlllmmlmddk..",
    "...kgtgtgtgtgk...",
    "...kdgtgtgtgdk...",
    "....kkkkkkkkk...."
  ], SW = 17, SH = 18, EYES = [[-3.5, 1.5], [3.5, 1.5]], inSkull = (u, v) => u >= 0 && v >= 0 && u < SW && v < SH && SKULL[v][u] !== ".", CRACKS = (() => {
    let out = /* @__PURE__ */ new Map(), paths = [[[8, 1], [7, 3], [8, 5], [6, 6], [5, 7]], [[9, 1], [10, 3], [10, 4], [12, 6], [12, 7]], [[4, 3], [3, 5], [2, 6]], [[13, 4], [14, 6]]];
    for (let path of paths) {
      let n = 0, len2 = path.length - 1;
      for (let k = 0; k < len2; k++) {
        let [x0, y0] = path[k], [x1, y1] = path[k + 1], steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let s = 0; s <= steps; s++) {
          let x = Math.round(x0 + (x1 - x0) * s / steps), y = Math.round(y0 + (y1 - y0) * s / steps), key = y * SW + x;
          out.has(key) || out.set(key, (k + s / Math.max(1, steps)) / len2), n++;
        }
      }
    }
    return out;
  })();
  function skull(p, C, K, s, sq, ox, oy, white, crack) {
    let PAL3 = { k: K[0], d: K[1], m: K[2], l: K[3], h: K[4], e: C[0], n: C[0], t: K[3], g: K[0] }, cx = ox, cy = SY2 + oy, hw = SW / 2 * s + 1, hh = SH / 2 * s * sq + 1;
    p.shade(cx - hw, cy - hh, cx + hw, cy + hh, (x, y) => {
      let u = Math.floor((x - cx) / s + SW / 2), v = Math.floor((y - cy) / (s * sq) + SH / 2);
      if (!inSkull(u, v)) return;
      let ch = SKULL[v][u];
      if (white) return ch === "e" || ch === "n" ? C[5] : WHITE;
      let ck = CRACKS.get(v * SW + u);
      return ck !== void 0 && ck < crack ? crack > 0.55 && (u + v) % 2 ? C[6] : K[0] : PAL3[ch];
    });
  }
  function eyeFire(p, C, x, y, t, k, i) {
    if (!(k <= 0)) {
      for (let j of [-0.6, 0.7]) {
        let h = (1.5 + 3 * (0.5 + 0.5 * noise(t * 8 + j * 3.1 + i * 7, 4))) * k, sw = noise(t * 4 + j * 2 + i * 3, 8) * 1.2;
        for (let d = 1; d <= h; d += 0.5) {
          let u = d / h;
          p.dot(x + j + sw * u * u, y - d, u < 0.3 ? C[7] : u < 0.6 ? C[6] : u < 0.85 ? C[5] : C[4], u < 0.75 ? 1 : (1 - u) * 4);
        }
      }
      p.px(x, y, WHITE), p.px(x - 1, y, C[6]), p.glow(x, y, 8, C[5], 0.5 * k);
    }
  }
  function create10(o) {
    let C = fit(o.palette, 8), K = fit(o.bone, 5), R = new Rng(o.seed), A = o.actor, floor = () => 0, ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, C[7], C[6], C[5]], haze: C[4] }), puffs = new Puffs({ rng: R, flame: [WHITE, C[7], C[6], C[5], C[4], C[3], C[2], C[1], C[0]], soot: [mix(C[3], C[2], 0.5), mix(C[1], C[0], 0.3)], cap: mix(C[4], C[2], 0.5), rim: [C[6], C[5], C[4]], floor }), dust = new Puffs({ rng: R, flame: [WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE], soot: [mix(K[2], K[1], 0.4), mix(K[1], K[0], 0.5)], cap: K[3], rim: [K[4], K[3], K[2]], floor }), bits = new Bits({ ground: floor }), lights = [], t = 0, stamped = !1, broke = !1, acc = 0, light = (x, y, r, c, k, life) => lights.push({ x, y, r, c, k, life, max: life }), head3 = A ? A.y : -38;
    return {
      update(dt) {
        if (t += dt, t < STAMP - 0.05) {
          let k = t / STAMP;
          for (acc += dt * (40 + 60 * k); acc > 1; acc--) {
            let a = R.range(0, TAU), D7 = R.range(22, 44);
            ps.spawn(P.MOTE, Math.cos(a) * D7, SY2 + Math.sin(a) * D7 * 0.8, -Math.sin(a) * 60, Math.cos(a) * 60, 0.8, R.pick([WHITE, C[7], C[6], C[5]]), R.range(0.6, 1));
          }
          if (R.chance(dt * 14)) {
            let a = R.range(0, TAU), D7 = R.range(20, 34);
            puffs.spawn(PK.SOOT, Math.cos(a) * D7, SY2 + Math.sin(a) * D7 * 0.7, -Math.sin(a) * 40, Math.cos(a) * 30, R.range(0.5, 0.7), R.range(3, 5.5));
          }
          attract(ps.list, 0, SY2, 9e5 * (0.4 + k), 70, 0.6, 2.5, dt, (q) => q.k === P.MOTE ? 1 : 0, 300), attract(puffs.list, 0, SY2, 5e5 * (0.4 + k), 60, 0.7, 3.5, dt, () => 1, 120);
        }
        if (t >= STAMP && !stamped) {
          stamped = !0, ps.list.length = 0, puffs.list.length = 0, light(0, SY2, 64, C[5], 1, 0.35), light(0, SY2, 30, WHITE, 1, 0.1), light(0, head3 + 12, 40, C[4], 0.6, 0.5);
          for (let i = 0; i < 22; i++) {
            let a = R.range(0, TAU), sp = R.range(80, 160);
            ps.spawn(P.SPARK, Math.cos(a) * 6, SY2 + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.2, 0.5));
          }
          for (let i = 0; i < 6; i++) {
            let a = R.range(0, TAU), sp = R.range(20, 45);
            puffs.spawn(PK.SOOT, Math.cos(a) * 8, SY2 + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp * 0.6 - 10, R.range(0.6, 0.9), R.range(2.5, 4.5));
          }
        }
        if (stamped && !broke) {
          for (let [ex, ey] of EYES)
            R.chance(dt * 9) && ps.spawn(P.EMBER, ex, SY2 + ey - 3, R.range(-10, 10), -R.range(20, 45), R.range(0.5, 0.9), C[6]), R.chance(dt * 7) && puffs.spawn(PK.SOOT, ex + R.range(-1, 1), SY2 + ey - 3, R.range(-5, 5), -R.range(14, 26), R.range(0.5, 0.8), R.range(1.4, 2.4));
          R.chance(dt * 8) && ps.spawn(P.VAPOUR, R.range(-7, 7), SY2 + R.range(-6, 6), R.range(-12, 12), R.range(-12, 4), R.range(0.5, 0.8), R.chance(0.5) ? C[3] : C[4], R.range(5, 8)), R.chance(dt * 12) && ps.spawn(P.MOTE, R.range(-4, 4), SY2 + 9, R.range(-6, 6), R.range(40, 70), R.range(0.25, 0.4), R.chance(0.5) ? C[6] : C[5], 0.8), R.chance(dt * 10) && puffs.spawn(PK.SOOT, R.range(-3.5, 3.5), SY2 + 9, R.range(-3, 3), R.range(14, 26), R.range(0.45, 0.7), R.range(1.2, 2.2)), t > STAMP + 0.3 && R.chance(dt * 5) && ps.spawn(P.STAR, R.range(-1, 1) * (A ? A.w / 2 : 10), head3 + R.range(4, A ? A.h - 4 : 30), 0, -6, R.range(0.3, 0.5), C[6], R.range(1, 2));
        }
        if (t >= BREAK && !broke) {
          broke = !0;
          for (let i = 0; i < 24; i++) {
            let x, y;
            do
              x = R.range(-8.5, 8.5), y = R.range(-9, 9);
            while (!inSkull(Math.floor(x + SW / 2), Math.floor(y + SH / 2)));
            bits.add({ kind: B.CHUNK, x, y: SY2 + y, vx: x * R.range(2.5, 6) + R.range(-12, 12), vy: R.range(-70, 10), g: 0.85, drag: 0.4, bounce: 0.35, life: R.range(0.8, 1.2), a: R.range(0, TAU), va: R.range(-14, 14), s: R.range(1, 2.4), ramp: [K[0], K[1], K[2], K[3], K[4]] });
          }
          for (let i = 0; i < 26; i++) ps.spawn(P.GRIT, R.range(-7, 7), SY2 + R.range(-8, 8), R.range(-32, 32), R.range(-60, 20), R.range(0.8, 1.3), R.pick([K[2], K[3], K[3], K[4]]), R.chance(0.3) ? 2 : 1);
          for (let i = 0; i < 7; i++) dust.spawn(PK.SOOT, R.range(-7, 7), SY2 + R.range(-8, 6), R.range(-25, 25), R.range(-20, 5), R.range(0.5, 0.8), R.range(2, 4), R.range(0, 0.1));
          for (let [ex, ey] of EYES) puffs.spawn(PK.FLAME, ex, SY2 + ey, Math.sign(ex) * 6, -30, 0.5, 2.6, 0, !1);
          light(0, SY2, 40, C[5], 0.5, 0.25);
        }
        for (let i = lights.length - 1; i >= 0; i--) (lights[i].life -= dt) <= 0 && lights.splice(i, 1);
        bits.update(dt);
        for (let b of bits.list)
          b.rest && !b.dusted && (b.dusted = !0, dust.spawn(PK.SOOT, b.x, -1.5, R.range(-12, 12), -R.range(4, 10), R.range(0.35, 0.6), R.range(1.5, 2.5)));
        ps.update(dt), puffs.update(dt), dust.update(dt);
      },
      drawBack(p) {
        puffs.draw(p, PK.SOOT, { x: 0, y: SY2, k: stamped && !broke ? 0.8 : 0.3, reach: 50 }), dust.draw(p, PK.SOOT), ps.draw(p, "back");
      },
      draw(p) {
        let flood = smooth(STAMP + 0.04, STAMP + 0.42, t), ebb = 1 - smooth(BREAK + 0.15, BREAK + 0.75, t);
        if (A && flood > 0 && ebb > 0) {
          let k = ebb, pulse = 0.85 + 0.15 * Math.sin(t * 9);
          for (let my = 0; my < A.h; my++) {
            let u = my / A.h;
            if (u > flood + 0.06) break;
            let edge = flood < 1 && Math.abs(u - flood) < 0.05, band2 = flood >= 1 && Math.abs(u - (t - STAMP) * 1.3 % 1.4 + 0.2) < 0.06;
            for (let mx = 0; mx < A.w; mx++) {
              let c0 = A.pixels[my * A.w + mx];
              if (!c0) continue;
              let l = luma(c0), cc = l > 0.72 ? C[6] : l > 0.5 ? C[5] : l > 0.33 ? C[4] : l > 0.18 ? C[3] : C[2];
              p.blend(A.x + mx, A.y + my, edge ? C[7] : band2 ? C[6] : cc, edge ? 0.85 : band2 ? 0.7 * k : 0.6 * k * pulse);
            }
          }
          p.outline(A.mask, A.x, A.y, (mx, my) => Math.sin(my * 0.7 - t * 14 + mx * 0.3) > 0.2 ? C[6] : C[4], (mx, my) => my / A.h <= flood ? k : 0), p.glow(0, A.y + A.h * 0.45, 30, C[4], 0.3 * k * pulse);
        }
        if (t < STAMP) {
          let q = t / STAMP;
          p.glow(0, SY2, 14 + 16 * q, C[5], 0.2 + 0.5 * q), q > 0.15 && ringFast(p, 0, SY2, 4 + 30 * (1 - ease.inQuad(q)), 1, q > 0.7 ? C[5] : q > 0.4 ? C[4] : C[3]);
        }
        if (t >= STAMP && t < BREAK) {
          let u = (t - STAMP) / 0.1, s = u < 1 ? 1.7 - 0.7 * ease.inQuad(u) : 1, land = t - STAMP - 0.1, sq = land > 0 ? 1 - 0.16 * Math.exp(-land * 18) * Math.cos(land * 40) : 1, shake = t > CRACK ? (t - CRACK) * 4 : 0, ox = Math.round(Math.sin(t * 61) * shake), oy = land > 0 ? Math.round(Math.sin(t * 3.4) * 1.2) : 0;
          skull(p, C, K, s, sq, ox, oy, t < STAMP + 0.067, smooth(CRACK, BREAK, t));
          let burn2 = smooth(STAMP + 0.1, STAMP + 0.25, t);
          u >= 1 && EYES.forEach(([ex, ey], i) => eyeFire(p, C, ox + ex, SY2 + oy + ey, t, burn2 * (1 + 0.4 * smooth(CRACK, BREAK, t)), i)), u < 1.2 && sparkle(p, 0, SY2, 14 * (1 - u / 1.2), C[7], C[5], 0.6), p.glow(0, SY2, 26, C[4], 0.25);
        }
        let ru = (t - STAMP - 0.08) / 0.3;
        ru > 0 && ru < 1 && ringFast(p, 0, SY2 + 2, 10 + 26 * ease.outCubic(ru), Math.max(1, 2.5 * (1 - ru)), (v) => v > 0.5 ? WHITE : C[6], 1.2 - ru), bits.draw(p), puffs.draw(p, PK.FLAME), ps.draw(p, "front");
        for (let l of lights) {
          let q = l.life / l.max;
          p.glow(l.x, l.y, l.r * (0.6 + 0.4 * q), l.c, l.k * q * q);
        }
        t >= STAMP + 0.067 && t < BREAK && unlight(p, -10, SY2 - 10, 10, SY2 + 10, (x, y) => {
          let u = Math.floor(x + SW / 2), v = Math.floor(y - SY2 + SH / 2);
          return inSkull(u, v) && SKULL[v][u] !== "e";
        }, 0.2);
      }
    };
  }

  // ../dl_pixelfx/repo/src/fx/status/bleeding.js
  var bleeding_exports = {};
  __export(bleeding_exports, {
    act: () => act8,
    draw: () => draw4,
    drawBack: () => drawBack,
    meta: () => meta14
  });

  // ../dl_pixelfx/repo/src/fx/status/_lib.js
  var SHAPES2 = /* @__PURE__ */ new WeakMap();
  function shape(a) {
    let m = a.mask, s = SHAPES2.get(m);
    if (s) return s;
    let { w, h, data } = m, on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[y * w + x] > 0, body = [], up = [], side = [], outline = [], top = [], rows = [];
    for (let x = 0; x < w; x++) {
      let y = 0;
      for (; y < h && !on(x, y); ) y++;
      top.push(y < h ? y : -1);
    }
    for (let y = 0; y < h; y++) {
      let l = -1, r = -1;
      for (let x = 0; x < w; x++)
        on(x, y) && (l < 0 && (l = x), r = x, body.push([x, y]), on(x, y - 1) || up.push([x, y]), on(x - 1, y) || side.push([x, y, -1]), on(x + 1, y) || side.push([x, y, 1]));
      rows.push([l, r]);
    }
    for (let y = -1; y <= h; y++)
      for (let x = -1; x <= w; x++) {
        if (on(x, y)) continue;
        let nx = 0, ny = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) on(x + dx, y + dy) && (nx -= dx, ny -= dy);
        if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) {
          let l = Math.hypot(nx, ny) || 1;
          outline.push([x, y, nx / l, ny / l]);
        }
      }
    return s = { w, h, on, body, up, side, outline, top, rows }, SHAPES2.set(m, s), s;
  }
  var colorAt = (a, x, y) => a.pixels ? a.pixels[y * a.mask.w + x] : a.mask.data[y * a.mask.w + x] ? 4285229931 : 0;
  var travel2 = (v, g, d, a) => d > 0 ? g / d * a + (v - g / d) * (1 - Math.exp(-d * a)) / d : v * a + 0.5 * g * a * a;
  function bitmap(rows, k = 1, flip = !1) {
    let h = rows.length, w = rows[0].length, ox = Math.floor(w * k / 2), oy = Math.floor(h * k / 2);
    return (dx, dy) => {
      let bx = Math.floor((dx + ox) / k), by = Math.floor((dy + oy) / k);
      if (bx < 0 || by < 0 || bx >= w || by >= h) return "";
      flip && (bx = w - 1 - bx);
      let c = rows[by][bx];
      return c === "." ? "" : c;
    };
  }
  function icon(p, x, y, ext, inside, R, a = 1, paint = null) {
    let X = Math.round(x), Y = Math.round(y), at = (dx, dy) => !!inside(dx, dy);
    for (let dy = -ext - 1; dy <= ext + 1; dy++)
      for (let dx = -ext - 1; dx <= ext + 1; dx++) {
        let ch = inside(dx, dy), c;
        if (ch)
          if (paint && paint[ch] !== void 0) c = paint[ch];
          else {
            let top = !at(dx, dy - 1), left = !at(dx - 1, dy), bottom = !at(dx, dy + 1), right = !at(dx + 1, dy);
            c = top || left ? R[3] : bottom || right ? R[1] : R[2];
          }
        else if (R[0] && (at(dx - 1, dy) || at(dx + 1, dy) || at(dx, dy - 1) || at(dx, dy + 1))) c = R[0];
        else continue;
        p.dot(X + dx, Y + dy, c, a);
      }
  }
  var EYES2 = /* @__PURE__ */ new WeakMap();
  function eyes(a) {
    let list = EYES2.get(a.mask);
    if (list) return list;
    if (a.eyes)
      return list = a.eyes.map(([x, y]) => ({ x0: x, x1: x, y0: y, y1: y + 1, px: [[x, y], [x, y + 1]], skin: colorAt(a, x, y) })), EYES2.set(a.mask, list), list;
    let S = shape(a), W = S.w, col = (x, y) => S.on(x, y) ? colorAt(a, x, y) : 0, dark = (x, y) => S.on(x, y) && y < S.h * 0.4 && luma(col(x, y)) < 0.15 && S.on(x - 1, y) && S.on(x + 1, y) && S.on(x, y - 1) && S.on(x, y + 1), seen = /* @__PURE__ */ new Set();
    list = [];
    for (let [x0, y0] of S.body) {
      if (seen.has(y0 * W + x0) || !dark(x0, y0)) continue;
      let px = [], q = [[x0, y0]];
      for (seen.add(y0 * W + x0); q.length; ) {
        let [x, y] = q.pop();
        px.push([x, y]);
        for (let [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          let nx = x + dx, ny = y + dy, k = ny * W + nx;
          seen.has(k) || !(dark(nx, ny) || S.on(nx, ny) && luma(col(nx, ny)) > 0.95) || (seen.add(k), q.push([nx, ny]));
        }
      }
      if (px.length < 2 || px.length > 14) continue;
      let xs = px.map((p) => p[0]), ys = px.map((p) => p[1]), counts = /* @__PURE__ */ new Map(), e = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), px };
      for (let [x, y] of px)
        for (let [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]]) {
          let c = col(x + dx, y + dy), l = luma(c);
          c && l > 0.5 && l < 0.95 && !px.some((p) => p[0] === x + dx && p[1] === y + dy) && counts.set(c, (counts.get(c) ?? 0) + 1);
        }
      e.skin = [...counts].sort((p, q2) => q2[1] - p[1])[0]?.[0], e.skin && e.x1 - e.x0 <= 4 && e.y1 - e.y0 <= 5 && list.push(e);
    }
    return list.sort((p, q) => p.x0 - q.x0), list.length > 2 && (list = []), EYES2.set(a.mask, list), list;
  }

  // ../dl_pixelfx/repo/src/fx/status/bleeding.js
  var meta14 = {
    name: "Bleeding",
    desc: "Bleeding out: beads swell at three wounds, run, let go and fall to spatter into a glossy pool that ripples; each heartbeat spurts a little and flashes the body red.",
    tags: ["status", "bleed", "blood", "dot", "debuff", "wound", "loop"],
    size: [60, 56],
    origin: [30, 46],
    duration: 2.4,
    loop: !0,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: { palette: ["#350711", "#5e0c1b", "#931327", "#c71e33", "#f2384a", "#ff8a7a"], seed: 5 }
  }, CLUTCH = { turn: 0.7, crouch: 3, lean: 2, fx: 2, fy: -21, bx: 8, by: -14, ffx: 3, fbx: -3 }, BEAT_ = { ...CLUTCH, crouch: 5, lean: 4, hy: 1 }, act8 = {
    onBody: !0,
    poses: [[0, BEAT_], [0.18, CLUTCH], [1.2, CLUTCH], [1.2, BEAT_, "snap"], [1.38, CLUTCH], [2.4, CLUTCH], [2.4, BEAT_, "snap"]]
  }, D2 = meta14.duration, BEAT = D2 / 2, G2 = 900, WOUNDS = /* @__PURE__ */ new WeakMap();
  function wounds(a) {
    let w = WOUNDS.get(a.mask);
    if (w) return w;
    let S = shape(a), H = S.h, W = S.w, make = (mx, my, drops, phase) => {
      let run = 1;
      for (; run < 3 && S.on(mx, my + run + 1); ) run++;
      return { x: a.x + mx + 0.5, mx, y0: a.y + my, yb: a.y + my + run + 1, drops, phase, side: mx < W / 2 ? -1 : 1 };
    }, edge = (q, side) => {
      let my = Math.round(H * q), [l, r] = S.rows[my];
      return [side < 0 ? l + 1 : r - 1, my];
    }, front = S.body.filter(([x, y]) => y > H * 0.5 && y < H * 0.62 && x > W * 0.55 && x < W * 0.75 && S.on(x, y + 3))[0] ?? edge(0.55, 1);
    return w = [make(...edge(0.57, -1), 3, 0), make(...front, 2, 0.35), make(...edge(0.6, 1), 2, 0.7)], WOUNDS.set(a.mask, w), w;
  }
  function drop(p, C, x, y, v, s) {
    let tail = Math.min(5, v * 0.012);
    tail >= 1 && p.line(x, y - tail, x, y - 1, s >= 2 ? C[3] : C[2]), s >= 2 ? (p.px(x, y, C[5]), p.px(x + 1, y, C[4]), p.px(x, y + 1, C[3]), p.px(x + 1, y + 1, C[2])) : p.px(x, y, C[4]);
  }
  function splat(p, C, x, ground, age, big, seed) {
    let life = D2 * 0.85;
    if (age < 0 || age > life) return;
    let spread = smooth(0, 0.1, age), hw = (big ? 2.2 : 1.4) * (0.5 + 0.5 * spread), fade = 1 - smooth(life - 0.5, life, age), dry = age < 0.35 ? 4 : age < 1 ? 3 : 2;
    for (let xx = Math.floor(x - hw); xx <= Math.ceil(x + hw); xx++) p.dot(xx, ground - 1, Math.abs(xx + 0.5 - x) > hw * 0.75 ? C[dry - 1] : C[dry], fade);
    if (age < 0.3 && p.px(x - 0.5, ground - 1, C[5]), age < 0.4)
      for (let j = 0; j < (big ? 3 : 2); j++) {
        let vx = (j % 2 ? 1 : -1) * (18 + 24 * rand(seed, j, 1)), vy = -(40 + 40 * rand(seed, j, 2)), tt = age, dx = vx * tt, dy = vy * tt + 0.5 * G2 * tt * tt;
        dy <= 0 && p.px(x + dx, ground - 1 + dy, j ? C[3] : C[4]);
      }
  }
  function drawBack(p, t, o) {
    let C = fit(o.palette, 6), a = o.actor, W = wounds(a), px = (W[0].x + W[2].x) / 2 - 1, rx = 6.5, beat2 = Math.exp(-((t % BEAT + BEAT) % BEAT / 0.25));
    for (let x = Math.floor(px - rx - 1); x <= px + rx + 1; x++) {
      let q = Math.abs(x + 0.5 - px) / rx;
      q > 1.1 || (p.px(x, -1, q > 0.85 ? C[2] : C[1]), q < 0.8 && p.px(x, 0, q < 0.5 ? C[1] : C[0]), q < 0.45 && p.px(x, 1, C[0]));
    }
    p.px(px - 2, -1, C[4]), p.px(px - 1, -1, C[3]), p.px(px + 3, -1, C[3]), p.glow(px, -1, 8, C[3], 0.06 + 0.04 * beat2);
  }
  function draw4(p, t, o) {
    let C = fit(o.palette, 6), a = o.actor, W = wounds(a), S = shape(a), ph = (t % BEAT + BEAT) % BEAT, hurt = Math.max(0, 1 - ph / 0.12);
    if (hurt > 0) for (let [mx, my] of S.body) p.blend(a.x + mx, a.y + my, C[4], 0.26 * hurt);
    for (let w2 of W) {
      p.px(w2.x, w2.y0 - 1, C[1]), p.px(w2.x - w2.side, w2.y0 - 1, C[0]), p.px(w2.x - w2.side, w2.y0, C[2]);
      for (let y = w2.y0; y < w2.yb; y++) p.px(w2.x, y, y === w2.y0 ? C[4] : y >= w2.yb - 1 ? C[3] : C[2]);
      let period = D2 / w2.drops;
      for (let k = 0; k < w2.drops; k++) {
        let born = w2.phase * period + k * period, age = ((t - born) % D2 + D2) % D2, swell = period * 0.62, big = (k + w2.mx) % 2 === 0, fallH = Math.max(1, -1 - w2.yb), fall = Math.sqrt(2 * fallH / G2), ground = 0;
        if (age < swell) {
          let u = age / swell, len2 = u < 0.35 ? 1 : u < 0.75 ? 2 : 3;
          for (let j = 0; j < len2; j++) p.px(w2.x, w2.yb + j, j === len2 - 1 ? C[2] : C[3]);
          len2 === 3 && p.px(w2.x - 1, w2.yb + 2, C[1]), p.px(w2.x, w2.yb + len2 - 2, u > 0.5 ? C[5] : C[4]);
        } else if (age < swell + fall) {
          let f = age - swell, y = w2.yb + 2 + 0.5 * G2 * f * f;
          drop(p, C, w2.x, y, G2 * f, big ? 2 : 1);
        } else splat(p, C, w2.x, ground, age - swell - fall, big, w2.mx * 31 + k);
      }
    }
    let w = W[0];
    if (ph < 0.5)
      for (let j = 0; j < 7; j++) {
        let vx = w.side * (18 + 42 * rand(j, 7)), vy = -(15 + 50 * rand(j, 8)), tt = ph - j * 0.012;
        if (tt <= 0) continue;
        let x = w.x + travel2(vx, 0, 1.2, tt), y = w.y0 + travel2(vy, G2 * 0.8, 0.6, tt), x2 = w.x + travel2(vx, 0, 1.2, tt - 0.02), y2 = w.y0 + travel2(vy, G2 * 0.8, 0.6, tt - 0.02);
        y >= -1 || (p.line(x2, y2, x, y, j % 3 ? C[3] : C[2]), p.px(x, y, j % 2 ? C[5] : C[4]));
      }
    p.glow(w.x, w.y0, 6, C[4], 0.25 * hurt);
  }

  // ../dl_pixelfx/repo/src/fx/status/sleep.js
  var sleep_exports = {};
  __export(sleep_exports, {
    act: () => act9,
    draw: () => draw5,
    meta: () => meta15
  });
  var meta15 = {
    name: "Sleep",
    desc: "Fast asleep: eyes shut, soft outlined Zs float up off the head one after another, swaying and growing as they rise, dream motes drift, a slow breathing glow.",
    tags: ["status", "sleep", "zzz", "rest", "debuff", "loop"],
    size: [60, 82],
    origin: [26, 74],
    duration: 2.4,
    loop: !0,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: { palette: ["#1a1636", "#3c3a7a", "#6f78c8", "#a9b8f0", "#dfe6ff", "#ffffff"], seed: 3 }
  }, NOD = { turn: 0.9, crouch: 1, lean: 1, hy: 2, fx: -6, fy: -14, bx: 7, by: -14, ffx: -2, fbx: 3 }, act9 = {
    onBody: !0,
    poses: [[0, NOD], [1.2, { ...NOD, crouch: 2, lean: 2, hy: 3 }], [2.4, NOD]]
  }, D3 = meta15.duration, NZ = 3, ZS = [
    ["#####", "...#.", "..#..", ".#...", "#####"],
    ["#######", ".....#.", "....#..", "...#...", "..#....", ".#.....", "#######"],
    [".#######.", "#########", "......##.", ".....##..", "....##...", "...##....", "..##.....", "#########", ".#######."],
    [".#########.", "###########", ".......###.", "......###..", ".....###...", "....###....", "...###.....", "..###......", ".###.......", "###########", ".#########."]
  ].map((rows) => bitmap(rows));
  function zAt(a, i, u) {
    let side = i % 2 ? 1 : 0.6, x0 = a.x + a.w * 0.78, y0 = a.y + 7, x = x0 + 13 * side * u + 2.5 * Math.sin(TAU * 1.1 * u + i * 2.1), y = y0 - 32 * (1 - Math.pow(1 - u, 1.35)), size = u < 0.18 ? 0 : u < 0.42 ? 1 : u < 0.68 ? 2 : 3, k = Math.min(1, u / 0.06);
    return { x, y, size, k };
  }
  function shut(p, a) {
    for (let e of eyes(a)) {
      for (let [x, y2] of e.px) p.px(a.x + x, a.y + y2, e.skin);
      let lid = colorAt(a, e.x0 - 1, e.y0 - 4) || colorAt(a, e.px[0][0], e.px[0][1]), y = a.y + e.y1 - 1;
      for (let x = e.x0; x <= e.x1; x++) p.px(a.x + x, y, 4280227622);
      p.px(a.x + e.x0 - 1, y - 1, 4280227622), p.px(a.x + e.x1 + 1, y - 1, 4280227622);
    }
  }
  function draw5(p, t, o) {
    let C = fit(o.palette, 6), a = o.actor, breath = 0.5 + 0.5 * Math.sin(t / D3 * TAU * 2);
    shut(p, a), p.glow(0, a.y + 10, 24, C[3], 0.1 + 0.1 * breath), cycle(t, D3, 5, o.seed + 6, D3, (age, life, r) => {
      let u = age / life, x = a.x + a.w * r.range(0.3, 1.1) + Math.sin(u * TAU + r.next() * TAU) * 3, y = a.y + r.range(-6, 8) - u * 10, rad = r.range(3, 5) * (0.8 + 0.4 * u), k = Math.sin(Math.PI * u);
      p.glow(x, y, rad * 2.4, C[3], 0.1 * k);
    }), cycle(t, D3, 14, o.seed + 4, (r) => r.range(1.2, 2), (age, life, r) => {
      let u = age / life, x = a.x + a.w * r.range(0.4, 1.1) + Math.sin(age * 2 + r.next() * TAU) * 2, y = a.y + r.range(0, 10) - age * r.range(10, 18), tw = Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(age * 9 + r.next() * TAU));
      tw < 0.15 || (sparkle(p, x, y, tw > 0.7 && r.next() < 0.4 ? 1 : 0, C[4], C[3], 0.3 * tw), p.dot(x, y, tw > 0.6 ? C[5] : C[4], tw * 1.3));
    });
    let zs = [];
    for (let i = 0; i < NZ; i++) zs.push({ i, u: ((t - i * D3 / NZ) % D3 + D3) % D3 / D3 });
    zs.sort((p1, p2) => p2.u - p1.u);
    for (let { i, u } of zs) {
      let z = zAt(a, i, u);
      if (u > 0.9) {
        let k = (u - 0.9) / 0.1;
        for (let j = 0; j < 7; j++) {
          let an = j / 7 * TAU + i, d = 3 + 6 * Math.sqrt(k);
          p.dot(z.x + Math.cos(an) * d, z.y + Math.sin(an) * d * 0.8, j % 2 ? C[4] : C[5], 1.2 - k);
        }
        p.glow(z.x, z.y, 10, C[3], 0.25 * (1 - k));
        continue;
      }
      for (let j = 1; j <= 6; j++) {
        let q = zAt(a, i, Math.max(0, u - j * 0.025));
        j % 2 === 0 || u - j * 0.025 < 0.05 || p.dot(q.x - 1, q.y + 4 + q.size, C[3], (1 - j / 7) * 0.9);
      }
      let old = u > 0.78 ? 1 : 0, R = old ? [C[0], C[1], C[2], C[3]] : [C[1], C[2], C[3], C[4]];
      icon(p, z.x, z.y, 7, ZS[z.size], R, z.k), old || p.px(z.x - 2 - z.size, z.y - 2 - z.size * 0.8, C[5]), p.glow(z.x, z.y, 7 + z.size * 3, C[3], (old ? 0.12 : 0.26) * z.k);
    }
  }

  // ../dl_pixelfx/repo/src/fx/spawn/poof.js
  var poof_exports = {};
  __export(poof_exports, {
    create: () => create11,
    meta: () => meta16
  });
  var meta16 = {
    name: "Poof",
    desc: "A cartoon death poof: a white pop, a ring of soft round smoke balls bursting out between speed lines, little stars spinning off, and the cloud lifting and thinning away.",
    tags: ["spawn", "death", "despawn", "smoke", "poof", "cartoon", "one-shot"],
    size: [112, 92],
    origin: [56, 80],
    duration: 1.6,
    loop: !1,
    fps: 30,
    bg: "ground",
    options: {
      palette: ["#2a2440", "#5e5878", "#9a94b4", "#cdc8e0", "#f2f0fa", "#ffffff"],
      stars: ["#ffd84a", "#fff3a6", "#ffffff"],
      seed: 21
    }
  }, CY = -17;
  function create11(o) {
    let C = fit(o.palette, 6), S = fit(o.stars, 3), R = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, S[1], S[0], C[2]] }), lights = new Lights(), balls = [], lines = [], ring2 = 9;
    for (let i = 0; i < ring2; i++) {
      let a = i / ring2 * TAU + R.range(-0.2, 0.2), sp = R.range(95, 140), r = R.range(5, 7);
      balls.push({ x: Math.cos(a) * 3, y: CY + Math.sin(a) * 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 - 12, r0: r * 0.5, r1: r, life: R.range(0.7, 1.05), delay: R.range(0, 0.03) });
    }
    for (let i = 0; i < 5; i++) {
      let a = R.range(0, TAU), sp = R.range(20, 60);
      balls.push({ x: Math.cos(a) * 2, y: CY + Math.sin(a) * 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 16, r0: 4, r1: R.range(6.5, 8.5), life: R.range(0.85, 1.2), delay: R.range(0.02, 0.06) });
    }
    for (let i = 0; i < 7; i++) {
      let a = R.range(0, TAU), sp = R.range(170, 240), r = R.range(2.2, 3.6);
      balls.push({ x: Math.cos(a) * 4, y: CY + Math.sin(a) * 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.75 - 10, r0: r * 0.6, r1: r, life: R.range(0.32, 0.5), delay: R.range(0.01, 0.04) });
    }
    for (let b of balls) b.max = b.life;
    for (let i = 0; i < 12; i++) {
      let a = i / 12 * TAU + R.range(-0.12, 0.12) + 0.13, sa = Math.sin(a);
      lines.push({ a, r1: Math.min(R.range(24, 34), sa > 0.1 ? (-2 - CY) / sa : 99), d: R.range(0, 0.04) });
    }
    for (let i = 0; i < 7; i++) {
      let a = R.range(-Math.PI, 0.3), sp = R.range(70, 125);
      ps.spawn(P.STAR, Math.cos(a) * 6, CY + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.55, 0.95), R.pick([S[2], S[1], S[1], S[0]]), R.range(1.3, 2.4), R.range(0.02, 0.1));
    }
    for (let i = 0; i < 10; i++) {
      let a = R.range(0, TAU), sp = R.range(40, 110);
      ps.spawn(P.STAR, Math.cos(a) * 5, CY + Math.sin(a) * 5, Math.cos(a) * sp, Math.sin(a) * sp - 20, R.range(0.3, 0.6), R.pick([WHITE, S[1]]), 0.6, R.range(0, 0.08));
    }
    for (let i = 0; i < 6; i++) {
      let s = R.sign();
      ps.spawn(P.DUST, s * R.range(1, 6), -1, s * R.range(25, 70), -R.range(2, 10), R.range(0.4, 0.7), C[2], R.range(1.6, 3), R.range(0.02, 0.08));
    }
    lights.add(0, CY, 46, C[4], 0.8, 0.4), lights.add(0, CY, 22, WHITE, 0.8, 0.1);
    let t = 0, radius = (b) => {
      let age = b.max - b.life, u = age / b.max, grow = b.r0 + (b.r1 - b.r0) * ease.outBack(clamp(age / 0.22), 2), breathe = 1 + 0.06 * Math.sin(age * 14 + b.r1);
      return grow * breathe * (u < 0.62 ? 1 : 1 - ease.inBack(clamp((u - 0.62) / 0.38), 1.4));
    }, drawBall = (p, b, layer) => {
      let age = b.max - b.life, r = radius(b), a = Math.min(1, age * 20), lit = age < 0.12;
      if (r < 0.6) return;
      let hy = (b.y - CY + 6) / 14, lo = hy > 0.4, hi = hy < -0.3;
      layer === "shade" ? p.disc(b.x + r * 0.16, b.y + r * 0.2, r, lit ? C[3] : lo ? C[1] : C[2], 0.8 * a) : layer === "body" ? p.disc(b.x - r * 0.06, b.y - r * 0.08, r * 0.86, lit ? C[4] : lo ? C[2] : C[3], 0.88 * a) : (!lo || lit) && (p.disc(b.x - r * 0.28, b.y - r * 0.34, r * 0.42, lit || hi ? WHITE : C[4], 0.85 * a), age < 0.25 && p.disc(b.x - r * 0.3, b.y - r * 0.38, r * 0.2, WHITE, 0.9 * a * (1 - age / 0.25)));
    };
    return {
      update(dt) {
        t += dt;
        for (let i = balls.length - 1; i >= 0; i--) {
          let b = balls[i];
          if (b.delay > 0) {
            b.delay -= dt;
            continue;
          }
          if ((b.life -= dt) <= 0) {
            b.r1 > 4 && ps.spawn(P.STAR, b.x, b.y, 0, -8, 0.22, WHITE, 0.6), balls.splice(i, 1);
            continue;
          }
          b.vx -= b.vx * 7 * dt, b.vy -= b.vy * 7 * dt + 30 * dt, b.x += b.vx * dt, b.y = Math.min(b.y + b.vy * dt, -radius(b) * 0.7);
        }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let s = 1 - smooth(0.1, 0.9, t);
        s > 0 && p.glow(0, -1, 26, C[4], 0.25 * s), ps.draw(p, "back");
      },
      draw(p) {
        let live = balls.filter((b) => b.delay <= 0);
        for (let layer of ["shade", "body", "cap"]) for (let b of live) drawBall(p, b, layer);
        if (t < 0.07) {
          let k = t / 0.07;
          p.circle(0, CY, 9 + 3 * k, C[4]), p.circle(0, CY, 7 + 3 * k, WHITE), flare(p, 0, CY, 20 * (1 - k * 0.5), 1 - k, C);
        }
        let rk = (t - 0.03) / 0.2;
        rk > 0 && rk < 1 && p.ring(0, CY, 8 + 18 * ease.outCubic(rk), Math.max(1, 2.5 * (1 - rk)), rk < 0.3 ? WHITE : C[4], 1.1 - rk);
        for (let l of lines) {
          let u = (t - l.d) / 0.2;
          if (u <= 0 || u >= 1) continue;
          let head3 = 8 + (l.r1 - 8) * ease.outExpo(clamp(u / 0.6)), tail = 8 + (l.r1 - 8) * ease.inCubic(u), ca = Math.cos(l.a), sa = Math.sin(l.a);
          p.line(ca * tail, CY + sa * tail, ca * head3, CY + sa * head3, (v) => v > 0.6 ? WHITE : C[4]), p.glowLine(ca * tail, CY + sa * tail, ca * head3, CY + sa * head3, 3, C[4], 0.25);
        }
        ps.draw(p, "front"), lights.draw(p);
      }
    };
  }

  // ../dl_pixelfx/repo/src/fx/spawn/soul-rise.js
  var soul_rise_exports = {};
  __export(soul_rise_exports, {
    act: () => act10,
    actorAlpha: () => actorAlpha,
    create: () => create12,
    meta: () => meta17
  });

  // ../dl_pixelfx/repo/src/fx/spawn/_lib.js
  function bodyOf(actor, C) {
    let m = actor.mask, px = actor.pixels, list = [], cells = new Array(m.w * m.h).fill(null), on = (mx, my) => mx >= 0 && my >= 0 && mx < m.w && my < m.h && !!m.data[my * m.w + mx];
    for (let my = 0; my < m.h; my++)
      for (let mx = 0; mx < m.w; mx++) {
        if (!on(mx, my)) continue;
        let own = px?.[my * m.w + mx], c = own ? hex(own) : C[Math.max(1, Math.min(C.length - 2, Math.round((C.length - 2) * (0.85 - my / m.h * 0.5))))], b = { x: actor.x + mx, y: actor.y + my, mx, my, c, edge: !on(mx - 1, my) || !on(mx + 1, my) || !on(mx, my - 1) || !on(mx, my + 1) };
        list.push(b), cells[my * m.w + mx] = b;
      }
    return { list, w: m.w, h: m.h, x: actor.x, y: actor.y, on, cell: (mx, my) => on(mx, my) ? cells[my * m.w + mx] : null };
  }
  function rimOf(body) {
    let out = [];
    for (let my = -1; my <= body.h; my++)
      for (let mx = -1; mx <= body.w; mx++)
        !body.on(mx, my) && (body.on(mx - 1, my) || body.on(mx + 1, my) || body.on(mx, my - 1) || body.on(mx, my + 1)) && out.push({ x: body.x + mx, y: body.y + my, mx, my });
    return out;
  }

  // ../dl_pixelfx/repo/src/fx/spawn/soul-rise.js
  var meta17 = {
    name: "Soul rise",
    desc: "The body's outline flares and dims, then a pale glowing copy of it lifts out, stretching as its legs melt into a rippling wisp, shedding motes until it thins into light.",
    tags: ["spawn", "death", "soul", "ghost", "spirit", "rise", "light", "one-shot"],
    size: [96, 140],
    origin: [48, 126],
    duration: 3.2,
    loop: !1,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#101a33", "#1f3563", "#35609e", "#5c96d4", "#94c8f0", "#d2f0ff", "#ffffff"],
      height: 50,
      seed: 27
    }
  }, SLUMP = { crouch: 8, lean: 6, hy: 2, fx: 7, fy: -9, bx: 11, by: -9, ffx: 9, fbx: -8 }, act10 = {
    onBody: !0,
    follow: 0,
    poses: [
      [-0.2, READY],
      [0.3, { turn: 1, crouch: 2, hy: -1, fx: -10, fy: -24, bx: 11, by: -24, ffx: -3, fbx: 4 }],
      [0.7, { turn: 0.7, crouch: 4, lean: 3, hy: 1, fx: 2, fy: -14, bx: 8, by: -14, ffx: 4, fbx: -3 }],
      [1.1, SLUMP],
      [2.7, SLUMP],
      [3.2, { ...SLUMP, crouch: 7 }]
    ],
    dust: [{ t: 1.1, x: 0, n: 5 }]
  }, LEAVE = 0.35, TOP = 2.05, GONE = 2.55, SHADOW = hex("#0c0f1e");
  function create12(o) {
    let C = fit(o.palette, 7), R = new Rng(o.seed), floor = () => 0, body = bodyOf(o.actor, C), rim = rimOf(body), W = body.w, Hh = body.h, waist = Math.round(Hh * 0.6), tone = body.list.map((b) => b.edge ? 6 : 3 + Math.min(2, Math.floor(luma(b.c) * 3.6))), toneAt = new Int8Array(W * Hh).fill(-1);
    body.list.forEach((b, i) => toneAt[b.my * W + b.mx] = tone[i]);
    let ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, C[5], C[4], C[3]] }), lights = new Lights(), t = 0, left = !1, lift = () => o.height * ease.inOutSine(clamp((t - LEAVE) / (TOP - LEAVE))), stretch = () => 1 + 0.22 * ease.inOutSine(clamp((t - LEAVE) / (TOP - LEAVE))), sway = (row) => Math.sin(t * 3 - row * 0.12) * 2.2 * smooth(LEAVE, LEAVE + 0.5, t), melt = () => smooth(LEAVE + 0.1, LEAVE + 0.9, t), thin = () => smooth(TOP - 0.25, GONE, t), ring2 = (p, near2) => {
      let k = (t - LEAVE) / 0.5;
      k > 0 && k < 1 && band(p, 0, 0, 6 + 26 * ease.outCubic(k), 0.18, Math.max(1, 3 * (1 - k)), 1.15 - k, C, (g) => Math.sin(g) >= 0 === near2, k < 0.12);
    };
    return {
      update(dt) {
        if (t += dt, !left && t >= LEAVE) {
          left = !0, lights.add(0, -20, 50, C[4], 0.85, 0.55), lights.add(0, -20, 24, WHITE, 0.8, 0.12);
          for (let i = 0; i < 10; i++) {
            let c = R.pick(rim);
            ps.spawn(P.STAR, c.x, c.y, R.range(-20, 20), -R.range(20, 60), R.range(0.4, 0.8), R.pick([WHITE, C[5]]), R.range(0.8, 1.8));
          }
        }
        if (t > LEAVE && t < GONE) {
          let s = stretch(), y0 = body.y * s - lift(), th = thin();
          for (let n = 0; n < (th > 0 ? 3 : 1); n++) {
            if (!R.chance(th > 0 ? 0.9 : 0.5)) continue;
            let c = R.pick(rim), row = c.my;
            if (row / Hh < 1 - th * 1.1 - 0.05 && th > 0) continue;
            let x = c.x * (1 - 0.12 * (s - 1) * 4) + sway(row), y = y0 + c.my * s, life = Math.min(R.range(0.5, 1.1), meta17.duration - 0.1 - t, (y + 120) / 60);
            life > 0.1 && ps.spawn(R.chance(0.7) ? P.MOTE : P.STAR, x, y, R.range(-12, 12), -R.range(25, 60), life, R.pick([WHITE, C[5], C[5], C[4]]), R.range(0.5, 1));
          }
        }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let k = smooth(0, LEAVE, t) * (1 - smooth(LEAVE + 0.4, TOP, t));
        k > 0 && p.glow(0, -1, 26, C[4], 0.3 * k), ring2(p, !1);
      },
      draw(p) {
        if (t < LEAVE + 0.3) {
          let k = t < LEAVE ? t / LEAVE : 1 - (t - LEAVE) / 0.3;
          for (let c of rim) rand(c.mx, c.my, Math.floor(t * 30)) < 0.25 + 0.7 * k && p.px(c.x, c.y, k > 0.7 ? WHITE : C[5]);
          p.glow(0, -19, 26, C[4], 0.45 * k);
        }
        let dim = smooth(LEAVE, LEAVE + 0.6, t) * (1 - smooth(GONE, meta17.duration - 0.1, t));
        if (dim > 0) for (let b of body.list) p.blend(b.x, b.y, SHADOW, 0.45 * dim);
        if (ring2(p, !0), t < LEAVE || t > GONE + 0.1) {
          ps.draw(p), lights.draw(p);
          return;
        }
        let s = stretch(), L = lift(), m = melt(), th = thin(), top = body.y * s - L, sx = 1 - 0.12 * (s - 1) * 4, tail = Math.round(10 * m), y1 = top + (Hh + tail) * s, fadeIn = clamp((t - LEAVE) / 0.15);
        for (let y = Math.floor(top); y <= Math.ceil(y1); y++) {
          let my = Math.floor((y + 0.5 - top) / s);
          if (my < 0) continue;
          let k = my >= waist ? (my - waist + 1) / (Hh - waist + tail) : 0, narrow = 1 - k * m * 0.95;
          if (narrow <= 0.05) continue;
          let cx = sway(my) + Math.sin(my * 0.7 - t * 8) * 2 * k * m, a = (my >= waist ? 1 - k * 0.45 : 1) * fadeIn;
          for (let x = Math.floor(cx - W / 2 - 4); x <= Math.ceil(cx + W / 2 + 4); x++) {
            let mx = Math.floor((x + 0.5 - cx) / (sx * narrow) - body.x);
            if (th > 0 && my / (Hh + tail) > 1 - th * 1.25 + 0.25 * rand(mx, my, 5) - 0.1) continue;
            let ti;
            if (my < Hh) {
              if (mx < 0 || mx >= W || (ti = toneAt[my * W + mx], ti < 0)) continue;
            } else {
              let w = (1 - (my - Hh) / Math.max(1, tail)) * 3.2 * m, d = Math.abs(x + 0.5 - cx);
              if (d > w) continue;
              ti = d > w - 1 ? 5 : 4;
            }
            t < LEAVE + 0.07 ? p.px(x, y, ti >= 6 ? C[5] : WHITE) : ti >= 5 ? p.dot(x, y, ti >= 6 ? WHITE : C[5], Math.min(1, a * 1.3)) : p.blend(x, y, C[ti], a * 0.7);
          }
        }
        let cy = top + Hh * s * 0.45;
        p.glow(sway(10), cy, 30, C[4], 0.42 * fadeIn * (1 - th)), p.glow(sway(10), cy - 6, 14, C[5], 0.3 * fadeIn * (1 - th)), ps.draw(p), lights.draw(p);
      }
    };
  }
  var actorAlpha = () => 1;

  // ../dl_pixelfx/repo/src/fx/pickups/collect-burst.js
  var collect_burst_exports = {};
  __export(collect_burst_exports, {
    create: () => create13,
    meta: () => meta18
  });

  // ../dl_pixelfx/repo/src/fx/pickups/_lib.js
  var SHADOW2 = hex("#100e17");
  var INK3 = hex("#0b0814");
  function glint(p, x, y, arm, c, k = 0.4, tip = scale(c, 0.8)) {
    let n = Math.round(arm), X = Math.floor(x), Y = Math.floor(y);
    if (!(n < 0)) {
      for (let d = 1; d <= n; d++) {
        let cc = d === n && n > 1 ? tip : c;
        p.px(X + d, Y, cc), p.px(X - d, Y, cc), p.px(X, Y + d, cc), p.px(X, Y - d, cc);
      }
      p.px(X, Y, n > 0 ? WHITE : c), p.glow(X + 0.5, Y + 0.5, 3 + n * 2.5, c, k);
    }
  }

  // ../dl_pixelfx/repo/src/fx/pickups/collect-burst.js
  var meta18 = {
    name: "Collect burst",
    desc: "The moment of pickup: a white flash and a cross of light, a thin ring snapping out ahead of a softer one, twinkles thrown wide on curving paths that brake, hang and wink out.",
    tags: ["pickup", "collect", "burst", "sparkle", "reward", "one-shot"],
    size: [112, 108],
    origin: [56, 94],
    duration: 1.35,
    loop: !1,
    fps: 30,
    bg: "ground",
    options: { palette: ["#1a0516", "#3d0a33", "#701560", "#b0228f", "#f53cd1", "#ff86e6", "#ffd2f6", "#ffffff"], seed: 3 }
  }, CY2 = -30;
  function create13(o) {
    let C = fit(o.palette, 8), R = new Rng(o.seed), lights = new Lights();
    lights.add(0, CY2, 36, C[5], 0.85, 0.32), lights.add(0, CY2, 14, WHITE, 0.75, 0.08);
    let stars = Array.from({ length: 14 }, (_, i) => {
      let a = i / 14 * TAU + R.range(-0.2, 0.2), sp = R.range(145, 225) * (i % 3 === 0 ? 1.12 : 0.85);
      return { x: 0, y: CY2, a, sp, turn: (i % 2 ? 1 : -1) * R.range(2.5, 5), life: R.range(0.75, 1.15), age: 0, size: i % 3 === 0 ? 2.6 : R.range(1.2, 2), tr: [], c: i % 4 === 0 ? WHITE : i % 2 ? C[6] : C[5], ph: R.range(0, TAU) };
    }), motes = Array.from({ length: 7 }, () => ({ x: R.range(-8, 8), y: CY2 + R.range(-4, 6), vy: -R.range(12, 30), life: R.range(0.5, 0.9), d: R.range(0.05, 0.25), w: R.range(0, TAU) })), t = 0;
    return {
      update(dt) {
        t += dt;
        for (let s of stars)
          s.age > s.life || (s.age += dt, s.tr.unshift([s.x, s.y]), s.tr.length > 4 && s.tr.pop(), s.a += s.turn * dt * Math.max(0, 1 - s.age * 1.5), s.sp -= s.sp * 4.3 * dt, s.x += Math.cos(s.a) * s.sp * dt, s.y += Math.sin(s.a) * s.sp * dt + 6 * s.age * dt, s.y > -2 && (s.y = -2, s.a = -Math.abs(s.a), s.sp *= 0.5));
        lights.update(dt);
      },
      draw(p) {
        if (t < 0.07 && p.circle(0, CY2, 5.5 * (1 - t / 0.07) + 1, WHITE), t < 0.16) {
          let k = 1 - t / 0.16, L = 26 * ease.outCubic(Math.min(1, t / 0.03 + 0.4)) * k;
          for (let [dx, dy, l] of [[1, 0, 1], [-1, 0, 1], [0, 1, 0.6], [0, -1, 0.6]])
            p.line(0, CY2, dx * L * l, CY2 + dy * L * l, (u) => u < 0.3 ? WHITE : u < 0.65 ? C[6] : C[5], (u) => (u < 0.5 ? 1 : (1 - u) * 2) * (0.5 + k));
          p.glow(0, CY2, 20 * k + 4, C[5], 0.6 * k);
        }
        let u1 = t / 0.32;
        if (u1 < 1) {
          let r = 3 + 23 * ease.outExpo(u1);
          p.ring(0, CY2, r, 1, u1 < 0.3 ? WHITE : C[6], 1.3 - u1 * 1.2), p.glowRing(0, CY2, r, 4, C[5], 0.4 * (1 - u1));
        }
        let u2 = (t - 0.04) / 0.5;
        if (u2 > 0 && u2 < 1) {
          let r = 2 + 16 * ease.outCubic(u2);
          p.ring(0, CY2, r, Math.max(1, 2.6 * (1 - u2)), C[5], 1 - u2);
        }
        for (let s of stars) {
          if (s.age > s.life) continue;
          let k = 1 - s.age / s.life, tw = 0.65 + 0.35 * Math.sin(s.age * 26 + s.ph);
          s.tr.forEach(([x, y], i) => i > 0 && p.dot(x, y, i < 2 ? C[5] : C[4], (1 - i / 4) * k * 1.4)), !(k < 0.3 && Math.sin(s.age * 40 + s.ph) < 0) && glint(p, s.x, s.y, Math.round(s.size * tw * Math.min(1, k * 2.5)), s.c, 0.45 * k);
        }
        for (let m of motes) {
          let a = t - m.d;
          if (a < 0 || a > m.life) continue;
          let k = 1 - a / m.life, x = m.x + Math.sin(a * 6 + m.w) * 1.5, y = m.y + m.vy * a;
          p.dot(x, y, k > 0.5 ? C[6] : C[5], k * 1.5), p.glow(x + 0.5, y + 0.5, 3, C[5], 0.3 * k);
        }
        lights.draw(p);
      }
    };
  }

  // ../dl_pixelfx/repo/src/fx/fire/campfire.js
  var campfire_exports = {};
  __export(campfire_exports, {
    draw: () => draw6,
    meta: () => meta19
  });
  var meta19 = {
    name: "Campfire",
    desc: "Crossed logs on a bed of coals and a lively fire: tongues that lick and leap, popping sparks, embers drifting up, smoke curling off, a warm pool of light.",
    tags: ["fire", "campfire", "prop", "light", "smoke", "ambient", "loop"],
    size: [128, 128],
    origin: [64, 112],
    duration: 3,
    loop: !0,
    fps: 30,
    bg: "ground",
    options: {
      palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
      wood: ["#0e080a", "#24130f", "#3b2216", "#5a3520", "#8a5a34", "#b9884f"],
      height: 22,
      seed: 3
    }
  }, D4 = meta19.duration, NL2 = noiseFor(D4), SMOKE13 = hex("#5b5566"), ASH = [hex("#2a2530"), hex("#4a4350"), hex("#6b6270")], LOGS = [
    [-19, 2, 15, -12, 3.4],
    [19, 2, -15, -12, 3.4]
  ], CROSS2 = 0.56, BIG_LAYERS2 = [[1, 1, 6], [0.8, 0.9, 5], [0.62, 0.78, 4], [0.44, 0.6, 3], [0.26, 0.4, 1], [0.12, 0.22, 0]], TONGUES = [
    [-7.5, -7, 0.42, 1.8, 1],
    [7.5, -7, 0.46, 1.8, 1],
    [-3, -9, 0.78, 2, 1],
    [3.2, -9, 0.82, 2, 1],
    [-12, -3, 0.14, 1.3, 0],
    [12.5, -3, 0.16, 1.3, 0],
    [-9.5, -4.5, 0.3, 1.9, 0],
    [9.5, -4.5, 0.34, 1.9, 0],
    [-5, -6, 0.6, 2.6, 0],
    [5.2, -6, 0.66, 2.6, 0],
    [0, -7, 1, 3.4, 0]
  ];
  function log(p, L, W, H, u0, u1, t, S) {
    let [x0, y0, x1, y1, r] = L, dx = x1 - x0, dy = y1 - y0, len2 = Math.hypot(dx, dy), ax = dx / len2, ay = dy / len2, nx = -ay, ny = ax;
    ny < 0 && (nx = -nx, ny = -ny);
    let rim = 1 - 1.05 / r;
    p.shade(Math.min(x0, x1) - r - 1, Math.min(y0, y1) - r - 1, Math.max(x0, x1) + r + 1, Math.max(y0, y1) + r + 1, (x, y, out) => {
      let along3 = (x - x0) * ax + (y - y0) * ay, u = along3 / len2, s = ((x - x0) * nx + (y - y0) * ny) / r;
      if (u < u0 || u > u1 || Math.abs(s) > 1) return;
      let burn2 = clamp(1.2 - Math.abs(x) / 8), lane = Math.round(s * r * 0.85), run = rand(Math.floor(along3 / 3), lane, S);
      if (Math.abs(s) > rim || along3 > len2 - 1) return s < 0 && burn2 > 0.4 ? H[7] : W[0];
      if (burn2 > 0.35 && lane < 2) {
        if (run < 0.55 && lane > -2) {
          let g = 0.5 + 0.5 * Math.sin(t / D4 * Math.PI * 6 + rand(Math.floor(along3 / 2), lane, S + 1) * 6.3);
          return out.k = 0.3 * burn2 * g, g > 0.72 ? H[3] : g > 0.4 ? H[4] : H[5];
        }
        return lane < -1 ? W[1] : W[0];
      }
      return lane <= -2 ? run < 0.25 ? W[2] : mix(W[3], H[4], 0.45 * burn2) : lane === -1 ? run < 0.45 ? W[1] : W[2] : lane === 0 ? run < 0.2 ? W[1] : W[2] : run < 0.4 ? W[0] : W[1];
    }), u0 <= 0 && p.ellipse(x0, y0, r * 0.62, r + 0.2, (d) => d > 0.78 ? W[0] : d > 0.56 ? W[5] : d > 0.32 ? W[4] : W[3]);
  }
  function coals(p, W, H, t, S) {
    p.shade(-15, -3, 15, 2, (x, y, out) => {
      let dx = x / 14, dy = (y + 0.3) / 2.2, d = dx * dx + dy * dy;
      if (d > 1) return;
      let h = rand(Math.floor(x / 2), Math.floor(y), S + 20);
      if (d > 0.55 && h < 0.55) return ASH[h < 0.15 ? 2 : h < 0.32 ? 1 : 0];
      if (h > 0.5) {
        let g = (0.5 + 0.5 * Math.sin(t / D4 * Math.PI * 4 + h * 40)) * (1.1 - d);
        return out.k = 0.35 * g, g > 0.7 ? H[2] : g > 0.5 ? H[3] : g > 0.3 ? H[4] : H[5];
      }
      return h > 0.3 ? W[1] : W[0];
    });
  }
  function draw6(p, t, o) {
    let F = fit(o.palette, 9), H = hotFirst(F), W = fit(o.wood, 6), S = o.seed, R = new Rng(S), HC = o.height, N = (rate, seed = 0, off = 0) => NL2(t, rate, seed, off), fla = (tt) => 0.74 + 0.16 * NL2(tt, 7.3, S + 1) + 0.1 * NL2(tt, 19, S + 2), fl = fla(t), GLOW = mix(mix(H[3], H[4], 0.5), WHITE, 0.25), SMOKE = mix(SMOKE13, H[6], 0.25), SPARKS = [H[1], H[2], H[4], H[5]], EMB = [H[1], H[2], H[4], H[6]], T = TONGUES.map(([dx, y, h, w, back], i) => ({ dx: dx + R.range(-0.4, 0.4), y, h: 3 + HC * h * R.range(0.92, 1.08), w: w * R.range(0.9, 1.1), back, env: h, n: (S * 7 + i) * 13 })), lean = (tt) => NL2(tt, 0.67, S + 90) * 0.12, height = (i, tt) => {
      let { h, n } = T[i], leap = Math.max(0, NL2(tt, 2.6, n + 70) - 0.55) * 1.4;
      return (h + 0.25 * h * NL2(tt, 3.3, n) + h * leap) * (0.9 + 0.1 * fla(tt));
    }, sweep = (i, tt, h) => NL2(tt, 2.2, T[i].n + 40) * (1 + h * 0.08) + lean(tt) * h * 0.9 - clamp(T[i].dx * 0.3, -2.5, 2.5), tip = (i, tt) => {
      let h = height(i, tt);
      return [T[i].dx + sweep(i, tt, h) * 0.85, T[i].y - h * 0.88 + 3, h];
    }, tongueAt = (i) => {
      let { dx, y, w, n, back } = T[i], h = height(i, t);
      flameTongue(p, dx, y, h, w, sweep(i, t, h), N, n, H, back ? BACK_LAYERS : w > 2.2 ? BIG_LAYERS2 : LAYERS, 0.5, 1.1 + h * 0.04);
    };
    looped(t, D4, 48, S + 300, (r) => ({ x: r.range(-5, 5), y: -HC * 0.8 - r.range(0, 8), vx: r.range(-2, 2), vy: -r.range(10, 17), life: r.range(2, 2.9), s: r.range(2.4, 3.8) }), (q, age) => {
      let [x, y] = drift(q.x, q.y, q.vx, q.vy, age, 4, -20, 1.6, 1);
      smokePuff(p, x + NL2(t - age, 0.8, S + 60) * (2 + 3 * age), y, 1 - age / q.life, q.s, SMOKE);
    });
    let puffs = [];
    looped(t, D4, T.length * 24, S + 200, (r, j) => {
      let i = j % T.length, fire = r.range(0.14, 0.3), smokes = r.chance(0.45);
      return { i, fire, smokes, sl: r.range(0.8, 1.4), ox: r.range(-1, 1), oy: r.range(0, 4), vx: r.range(-4, 4), vy: -r.range(15, 30), s: r.range(0.8, 1.6) * (0.8 + 0.6 * T[i].env), f: r.next(), life: fire + (smokes ? 1.4 : 0) };
    }, (q, age) => {
      let [tx, ty] = tip(q.i, t - age), [x, y, vx, vy] = drift(tx + q.ox, ty + q.oy, q.vx, q.vy, Math.min(age, q.fire), 0, -95, 5, 3.2);
      if (age < q.fire) return puffs.push([x, y, 1 - age / q.fire, q.s, q.f]);
      if (age - q.fire > q.sl) return;
      let [sx, sy] = drift(x, y, vx * 0.6, vy * 0.6 - 6, age - q.fire, 2, -16, 1.6, 1.2);
      smokePuff(p, sx, sy, 1 - (age - q.fire) / q.sl, q.s * 0.7, 0);
    }), coals(p, W, H, t, S);
    for (let L of LOGS) log(p, L, W, H, CROSS2, 1, t, S + 11);
    for (let i = 0; i < T.length; i++) T[i].back && tongueAt(i);
    looped(t, D4, 90, S + 210, (r) => ({ x: r.range(-10, 10), y: -r.range(3, 8), vx: r.range(-5, 5), vy: -r.range(20, 40), life: r.range(0.16, 0.3), s: r.range(1, 1.8), f: r.next() }), (q, age) => {
      let [x, y] = drift(q.x, q.y, q.vx, q.vy, age, 0, -95, 5, 3.2);
      firePuff(p, x, y, 1 - age / q.life, q.s, q.f, H);
    });
    for (let i = 0; i < T.length; i++) T[i].back || tongueAt(i);
    looped(t, D4, T.length * 12, S + 220, (r, j) => ({ i: j % T.length, vx: r.range(-3, 3), vy: -r.range(12, 22), s: r.range(0.9, 1.6) * (0.8 + 0.5 * T[j % T.length].env), life: 0.26 }), (q, age) => {
      let [tx, ty] = tip(q.i, t - age);
      lick(p, tx + q.vx * age, ty - 2 + q.vy * age, 1 - age / q.life, q.s, H);
    });
    for (let [x, y, k, s, f] of puffs) firePuff(p, x, y, k, s, f, H);
    for (let L of LOGS) log(p, L, W, H, 0, CROSS2, t, S + 11);
    looped(t, D4, 4, S + 400, (r) => ({ x: r.range(-9, 9), y: -r.range(4, 9), n: r.int(3, 5), seed: r.int(0, 1e6), life: 0.7 }), (q, age) => {
      age < 0.08 && (p.px(q.x, q.y, WHITE), p.glow(q.x, q.y, 12, H[1], 0.7 * (1 - age / 0.08)));
      let r = new Rng(q.seed);
      for (let j = 0; j < q.n; j++) {
        let a = -Math.PI / 2 + r.range(-0.8, 0.8), sp = r.range(110, 220), life = r.range(0.25, 0.6);
        if (age >= life) continue;
        let [x, y, vx, vy] = sparkAt(q.x, q.y, Math.cos(a) * sp, Math.sin(a) * sp, age, 0);
        spark(p, x, y, vx, vy, 1 - age / life, SPARKS);
      }
    }), looped(t, D4, 36, S + 500, (r) => ({ x: r.range(-7, 7), y: -r.range(8, 18), vx: r.range(-15, 15), vy: -r.range(25, 60), life: r.range(1.1, 2.5), s: r.chance(0.15) ? 2 : r.range(1, 1.6), a: r.range(0, 6.3), b: r.range(0, 6.3) }), (q, age) => {
      let [x, y] = drift(q.x, q.y, q.vx, q.vy, age, 0, -30, 1.6, 1.6);
      ember(p, x + 7 * (Math.sin(age * 2.3 + q.a) - Math.sin(q.a)), y + 2 * (Math.sin(age * 3 + q.b) - Math.sin(q.b)), 1 - age / q.life, q.s, EMB, age * 40 + q.a);
    });
    let br = 0.92 + 0.08 * N(0.67, S + 3), lx = lean(t) * 12;
    p.glow(lx, -8, 74 * br * (0.9 + 0.1 * fl), GLOW, 0.3 * fl);
    for (let [x, y, k] of [[-6, -17, 0.85], [0, -21, 1], [6, -17, 0.85]])
      p.glow(x + lx, y, 46 * br, GLOW, 0.3 * k * fl), p.glow(x * 0.6, y + 13, 15, H[2], 0.16 * k * fl);
    p.glow(0, -3, 9, H[0], 0.16 * fl), floorLight(p, 0, 0.5, 48, 8, GLOW, 0.3 * fl);
  }

  // ../dl_pixelfx/repo/src/fx/fire/candle.js
  var candle_exports = {};
  __export(candle_exports, {
    draw: () => draw7,
    meta: () => meta20
  });
  var meta20 = {
    name: "Candle",
    desc: "A wax candle in a brass dish: a calm flame with a blue root that sways and stretches, a halo of light, motes drifting in it, a bead of wax running down a drip.",
    tags: ["fire", "candle", "prop", "light", "calm", "ambient", "loop"],
    size: [56, 76],
    origin: [28, 64],
    duration: 4,
    loop: !0,
    fps: 30,
    bg: "ground",
    options: {
      palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
      root: ["#1b2a8a", "#3a62e0", "#7fb4ff"],
      wax: ["#2e201e", "#5e4436", "#8e6e58", "#b8957a", "#d8b896", "#f0dcc0"],
      brass: ["#2a1a10", "#6a4a1e", "#b4862e", "#e8c060", "#fff0b0"],
      seed: 2
    }
  }, D5 = meta20.duration, NL3 = noiseFor(D5), TOP2 = -16, WICK = TOP2 - 3, CALM = [[1, 1, 5], [0.8, 0.88, 3], [0.6, 0.72, 2], [0.38, 0.52, 1], [0.18, 0.3, 0]], DRIP = { x: 4, y0: TOP2 + 2, y1: -7 };
  function dish(p, B2, H, fl) {
    p.ellipse(0, 1, 10, 2.6, (d, a) => d > 0.82 ? B2[0] : Math.sin(a) < -0.2 ? d > 0.6 ? mix(B2[3], H[3], 0.3 * fl) : B2[2] : d > 0.55 ? B2[1] : B2[2]), p.rect(-8, 2, 17, 1, B2[1]), p.rect(-7, 3, 15, 1, B2[0]);
  }
  function candle(p, X, H, fl) {
    let L = TOP2, cols = [X[1], X[4], X[5], X[4], X[4], X[3], X[3], X[2], X[0]];
    for (let i = 0; i < 9; i++) {
      let x = i - 4;
      p.rect(x, L + 1, 1, -L - 2, cols[i]), i === 2 && p.rect(x, -8, 1, 7, X[4]);
    }
    p.rect(-3, -1, 7, 1, X[2]), p.px(-4, -1, X[0]), p.px(4, -1, X[0]), p.rect(-3, L, 7, 1, mix(X[5], H[2], 0.25 * fl)), p.px(-4, L, X[1]), p.px(4, L, X[1]), p.rect(-2, L + 1, 5, 1, mix(X[5], H[1], 0.5 * fl)), p.rect(-1, L + 1, 3, 1, mix(X[4], H[2], 0.45 * fl));
    let y1 = DRIP.y1;
    p.rect(3, L + 1, 1, y1 - L - 1, X[4]), p.rect(4, L + 2, 1, y1 - L - 2, X[3]), p.px(5, L + 3, X[0]), p.rect(5, L + 4, 1, y1 - L - 4, X[0]), p.rect(3, y1, 2, 2, X[4]), p.px(5, y1, X[3]), p.px(5, y1 + 1, X[2]), p.px(6, y1, X[0]), p.px(6, y1 + 1, X[0]), p.rect(3, y1 + 2, 3, 1, X[0]), p.px(3, L + 2, X[5]), p.rect(-4, L + 1, 1, 4, X[4]), p.px(-5, L + 3, X[1]), p.px(-5, L + 4, X[1]), p.px(-4, L + 5, X[3]);
  }
  function draw7(p, t, o) {
    let F = fit(o.palette, 9), H = hotFirst(F), RT = fit(o.root, 3), X = fit(o.wax, 6), B2 = fit(o.brass, 5), S = o.seed, N = (rate, seed = 0, off = 0) => NL3(t, rate * 0.35, seed, off), fl = 0.86 + 0.08 * NL3(t, 2, S + 1) + 0.06 * NL3(t, 7, S + 2), h = 12 * (1 + Math.max(0, NL3(t, 0.75, S + 3) - 0.3) * 0.6) * (0.94 + 0.06 * fl), sway = NL3(t, 0.5, S + 4) * 1.6 + NL3(t, 1.5, S + 5) * 0.5, GLOW = mix(mix(H[3], H[4], 0.5), WHITE, 0.3), cy = WICK - h * 0.4;
    floorLight(p, 0, 1, 26, 5, GLOW, 0.3 * fl), p.glow(sway * 0.3, cy, 38 * fl, GLOW, 0.42 * fl), p.glowRing(sway * 0.3, cy, 10, 4, H[2], 0.12 * fl), dish(p, B2, H, fl), candle(p, X, H, fl);
    let run = t % D5 / D5, swell = smooth(0, 0.3, run), slide = smooth(0.3, 0.85, run), set = smooth(0.85, 1, run);
    if (set < 1 && swell > 0.15) {
      let by = Math.round(DRIP.y0 + (DRIP.y1 - DRIP.y0) * slide);
      p.px(DRIP.x, by, mix(X[5], H[1], 0.4 * fl)), swell > 0.6 && set < 0.5 && (p.px(DRIP.x + 1, by, X[4]), p.px(DRIP.x + 1, by + 1, X[2]));
    }
    p.line(0, TOP2, 0, WICK + 1, X[0]), p.px(0, WICK + 1, H[4]), flameTongue(p, 0, WICK + 1, h, 2.6, sway, N, S * 31, H, CALM, 0.25, 0.6);
    for (let dx = -2; dx <= 2; dx++) {
      let a = 1 - Math.abs(dx) * 0.2;
      p.dot(dx, WICK + 1, Math.abs(dx) === 2 ? RT[0] : RT[1], a), Math.abs(dx) <= 1 && p.dot(dx, WICK + 2, RT[0], 0.7);
    }
    p.px(0, WICK, RT[2]), looped(t, D5, 6, S + 300, (r) => ({ vx: r.range(-1.5, 1.5), vy: -r.range(8, 12), life: r.range(1.4, 2.2), s: r.range(0.8, 1.2) }), (q, age) => {
      let [x, y] = drift(sway, WICK - h, q.vx, q.vy, age, 1, -6, 1, 0.8);
      smokePuff(p, x + NL3(t - age, 0.6, S + 60) * (1 + age * 2), y, 1 - age / q.life, q.s, 0, !1, 0.6);
    }), looped(t, D5, 10, S + 400, (r) => ({ x: r.range(-20, 20), y: r.range(-44, -8), vx: r.range(-3, 3), vy: r.range(-4, 2), life: r.range(2.5, 4), ph: r.range(0, 6.3) }), (q, age) => {
      let x = q.x + q.vx * age + Math.sin(age * 1.3 + q.ph) * 2, y = q.y + q.vy * age, d = Math.hypot(x, y - cy), k = Math.min(1, age * 2, (q.life - age) * 2) * clamp(1.2 - d / 26);
      k > 0.15 && (p.dot(x, y, k > 0.6 ? H[1] : H[3], k), p.glow(x, y, 3, H[2], 0.2 * k));
    }), p.glow(sway * 0.5, WICK - h * 0.3, 10, H[1], 0.35 * fl);
  }

  // ../dl_pixelfx/repo/src/fx/fire/torch.js
  var torch_exports = {};
  __export(torch_exports, {
    draw: () => draw8,
    meta: () => meta21
  });
  var meta21 = {
    name: "Torch",
    desc: "A wall torch on an iron bracket: a licking flame leaping off a pitch-soaked wrap, licks and puffs torn off its tips, smoke, embers, a flickering light on the wall.",
    tags: ["fire", "torch", "prop", "light", "wall", "dungeon", "loop"],
    size: [72, 120],
    origin: [36, 94],
    duration: 2,
    loop: !0,
    fps: 30,
    bg: "dark",
    options: {
      palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
      wood: ["#0e080a", "#24130f", "#3b2216", "#5a3520", "#8a5a34", "#b9884f"],
      iron: ["#0d0b12", "#1e1b26", "#363242", "#5b5566", "#8a8396"],
      seed: 4
    }
  }, D6 = meta21.duration, NL4 = noiseFor(D6), BASE2 = -16, TONGUES2 = [
    [-1.9, -1, 0.74, 2, 1],
    [2.1, -1, 0.7, 2, 1],
    [-3.4, 0.5, 0.42, 1.6, 0],
    [3.6, 0.5, 0.46, 1.6, 0],
    [0, 0, 1, 2.9, 0]
  ];
  function plate(p, I, H, fl) {
    p.shade(-5.5, -5.5, 5.5, 11.5, (x, y) => x < -5 || x > 5 || y < -5 || y > 11 ? I[0] : Math.abs(x) < 0.6 && (Math.abs(y + 3.5) < 0.6 || Math.abs(y - 9.5) < 0.6) ? mix(I[4], H[3], 0.35 * fl) : y < -4 || x < -4 ? mix(I[3], H[4], 0.3 * fl) : y > 10 || x > 4 ? I[1] : y < 2 ? I[2] : I[1]);
  }
  function handle(p, W) {
    p.shade(-3, -12, 3, 15, (x, y) => {
      let half = 1.3 + clamp((14 - y) / 26) * 0.9;
      if (Math.abs(x) > half + 0.5 || y > 14.5) return;
      if (Math.abs(x) > half - 0.5 || y > 13.5) return W[0];
      let g = rand(Math.floor(y / 3), Math.round(x), 9);
      return x < -0.3 ? g < 0.3 ? W[2] : W[4] : g < 0.4 ? W[1] : W[2];
    });
  }
  function ring(p, I, H, fl) {
    p.rect(-3, -2, 7, 4, I[0]), p.rect(-2, -1, 5, 1, mix(I[4], H[3], 0.3 * fl)), p.rect(-2, 0, 5, 1, I[2]);
  }
  function wrap2(p, W, I, H, t) {
    p.shade(-6, BASE2 - 2, 6, -9, (x, y, out) => {
      let v = (y - (BASE2 - 1.5)) / 7.5, half = 4.6 - v * 1.9;
      if (Math.abs(x) > half + 0.5 || y < BASE2 - 1.5 || y > -9.5) return;
      if (Math.abs(x) > half - 0.5 || y > -10.5) return W[0];
      let cord = Math.floor(y - x * 0.6 + 40) % 3 === 0, h = rand(Math.floor(x), Math.floor(y), 31);
      if (v < 0.45) {
        if (h < 0.42) {
          let g = 0.5 + 0.5 * Math.sin(t / D6 * Math.PI * 4 + h * 40);
          return out.k = 0.3 * g, g > 0.66 ? H[2] : g > 0.33 ? H[4] : H[5];
        }
        return h < 0.75 ? W[0] : W[1];
      }
      return cord ? I[2] : x < -1 ? W[3] : x < 1.5 ? W[2] : W[1];
    });
  }
  function draw8(p, t, o) {
    let F = fit(o.palette, 9), H = hotFirst(F), W = fit(o.wood, 6), I = fit(o.iron, 5), S = o.seed, fl0 = 0.74 + 0.16 * NL4(t, 7.3, S + 1) + 0.1 * NL4(t, 19, S + 2);
    plate(p, I, H, fl0), handle(p, W), ring(p, I, H, fl0), burn(p, t, TONGUES2, {
      H,
      D: D6,
      NL: NL4,
      S,
      x: 0,
      y: BASE2,
      height: 20,
      lean: 0.12,
      spread: 4,
      puffs: 10,
      licks: 5,
      smoke: 7,
      smokeSize: 2.3,
      smokeLife: [1.3, 2.1],
      embers: 7,
      glowR: 48,
      glow: 1.25,
      wind: 2,
      mid: () => wrap2(p, W, I, H, t)
    });
  }

  // entry.js
  G.PFX = { createFrame, clearFrame, createFx, mods: { "impacts/hit-spark": hit_spark_exports, "impacts/crit-hit": crit_hit_exports, "impacts/blunt-hit": blunt_hit_exports, "melee/sword-slash": sword_slash_exports, "melee/thrust": thrust_exports, "melee/dagger-flurry": dagger_flurry_exports, "melee/claw-swipe": claw_swipe_exports, "melee/heavy-cleave": heavy_cleave_exports, "projectiles/arrow": arrow_exports, "fire/fireball": fireball_exports, "ice/ice-lance": ice_lance_exports, "holy/heal": heal_exports, "shadow/curse": curse_exports, "status/bleeding": bleeding_exports, "status/sleep": sleep_exports, "spawn/poof": poof_exports, "spawn/soul-rise": soul_rise_exports, "pickups/collect-burst": collect_burst_exports, "fire/campfire": campfire_exports, "fire/candle": candle_exports, "fire/torch": torch_exports } };
})();
