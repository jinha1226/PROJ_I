(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: !0 });
  };

  // src/core/math.js
  function hash(...ns) {
    let h = 2654435769;
    for (let n of ns)
      h = Math.imul(h ^ (n | 0), 2246822507), h ^= h >>> 13, h = Math.imul(h, 3266489909), h ^= h >>> 16;
    return h >>> 0;
  }
  function noise(x, seed2 = 0) {
    let i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(rand(i, seed2), rand(i + 1, seed2), u) * 2 - 1;
  }
  function noise2(x, y, seed2 = 0) {
    let ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), a = rand(ix, iy, seed2), b = rand(ix + 1, iy, seed2), c = rand(ix, iy + 1, seed2), d = rand(ix + 1, iy + 1, seed2);
    return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
  }
  function fbm(x, y, seed2 = 0, octaves = 3) {
    let s = 0, a = 0.5, n = 0;
    for (let o = 0; o < octaves; o++)
      s += noise2(x, y, seed2 + o * 101) * a, n += a, x *= 2.03, y *= 2.03, a *= 0.5;
    return s / n;
  }
  function tileNoise(x, y, px = 0, py = 0, seed2 = 0) {
    let ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), x0 = px ? wrap(ix, px) : ix, x1 = px ? wrap(ix + 1, px) : ix + 1, y0 = py ? wrap(iy, py) : iy, y1 = py ? wrap(iy + 1, py) : iy + 1, a = rand(x0, y0, seed2), b = rand(x1, y0, seed2), c = rand(x0, y1, seed2), d = rand(x1, y1, seed2);
    return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
  }
  function tileFbm(x, y, px = 0, py = 0, seed2 = 0, octaves = 3) {
    let s = 0, a = 0.5, n = 0, k = 1;
    for (let o = 0; o < octaves; o++)
      s += tileNoise(x * k, y * k, px * k, py * k, seed2 + o * 101) * a, n += a, a *= 0.5, k *= 2;
    return s / n;
  }
  function loopNoise(phase, radius3 = 1, seed2 = 0) {
    let a = phase * TAU;
    return noise2(Math.cos(a) * radius3 + 50, Math.sin(a) * radius3 + 50, seed2);
  }
  var TAU, clamp, lerp, wrap, seg, smooth, ease, rand, Rng, rng, init_math = __esm({
    "src/core/math.js"() {
      TAU = Math.PI * 2, clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x, lerp = (a, b, t) => a + (b - a) * t, wrap = (x, m) => (x % m + m) % m, seg = (t, t0, t1) => clamp((t - t0) / (t1 - t0)), smooth = (e0, e1, x) => {
        let t = seg(x, e0, e1);
        return t * t * (3 - 2 * t);
      }, ease = {
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
      rand = (...ns) => hash(...ns) / 4294967296, Rng = class {
        constructor(seed2 = 1) {
          this.s = seed2 >>> 0 || 1;
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
    }
  });

  // src/core/color.js
  function hex(h) {
    if (typeof h == "number") return h;
    let s = h.replace("#", "");
    s.length === 3 && (s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]);
    let v = parseInt(s.slice(0, 6), 16);
    return rgb(v >> 16 & 255, v >> 8 & 255, v & 255);
  }
  function mix(a, b, t) {
    return t = clamp(t), rgb(red(a) + (red(b) - red(a)) * t, green(a) + (green(b) - green(a)) * t, blue(a) + (blue(b) - blue(a)) * t);
  }
  function fit(r, n) {
    return r = r.map(hex), r.length === n ? r : Array.from({ length: n }, (_, i) => r[Math.round(i * (r.length - 1) / Math.max(1, n - 1))]);
  }
  var rgb, red, green, blue, toHex, scale, luma, ramp, PAL, RAMP, WHITE, BLACK, INK, PATCH, init_color = __esm({
    "src/core/color.js"() {
      init_math();
      rgb = (r, g, b) => 255 << 24 | (b & 255) << 16 | (g & 255) << 8 | r & 255, red = (c) => c & 255, green = (c) => c >>> 8 & 255, blue = (c) => c >>> 16 & 255;
      toHex = (c) => "#" + [red(c), green(c), blue(c)].map((v) => v.toString(16).padStart(2, "0")).join("");
      scale = (c, k) => rgb(Math.min(255, red(c) * k), Math.min(255, green(c) * k), Math.min(255, blue(c) * k)), luma = (c) => (0.299 * red(c) + 0.587 * green(c) + 0.114 * blue(c)) / 255, ramp = (list) => list.map(hex);
      PAL = {
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
    }
  });

  // src/core/font.js
  function build(table, h) {
    let out = {};
    for (let [ch, src] of Object.entries(table)) {
      let rows = src.split("|");
      if (out[ch] = { w: rows[0].length, rows: rows.map((r) => [...r].map((c) => c === "#")) }, rows.length !== h) throw new Error(`glyph ${ch} has ${rows.length} rows, expected ${h}`);
    }
    return out;
  }
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
  var MINI, BIG, FONTS, init_font = __esm({
    "src/core/font.js"() {
      MINI = {
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
      FONTS = {
        mini: { h: 5, space: 2, gap: 1, glyphs: build(MINI, 5) },
        big: { h: 7, space: 3, gap: 1, glyphs: build(BIG, 7) }
      };
    }
  });

  // src/core/painter.js
  var BAYER, OUT, sprites, call, Painter, init_painter = __esm({
    "src/core/painter.js"() {
      init_math();
      init_color();
      init_font();
      BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16), OUT = { c: 0, a: 1, l: 0, k: 0 }, sprites = /* @__PURE__ */ new WeakMap(), call = (v, ...args) => typeof v == "function" ? v(...args) : v, Painter = class {
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
            let X0 = Math.round(x), Y02 = Math.round(y), X1 = Math.round(x + w), Y1 = Math.round(y + h);
            for (let yy = Y02; yy < Y1; yy++) for (let xx = X0; xx < X1; xx++) this.put(this.cellX(xx, yy), this.cellY(xx, yy), c, a);
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
          let ax = this.toX(x0, y0), ay = this.toY(x0, y0), bx = this.toX(x1, y1), by = this.toY(x1, y1), dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9, X0 = Math.floor(Math.min(ax, bx) - r), X1 = Math.ceil(Math.max(ax, bx) + r), Y02 = Math.floor(Math.min(ay, by) - r), Y1 = Math.ceil(Math.max(ay, by) + r);
          for (let sy = Y02; sy <= Y1; sy++)
            for (let sx = X0; sx <= X1; sx++) {
              let px = sx + 0.5, py = sy + 0.5, u = clamp(((px - ax) * dx + (py - ay) * dy) / L2), ex = ax + dx * u - px, ey = ay + dy * u - py, d = Math.sqrt(ex * ex + ey * ey) / r;
              if (d >= 1) continue;
              let f = 1 - d;
              this.add(sx, sy, c, f * f * k);
            }
        }
        /** Glow hugging a circle of radius R (a shockwave's light), falling off over width r. */
        glowRing(x, y, R6, r, c, k = 0.5) {
          if (r < 1 || k <= 4e-3) return;
          let cx = this.toX(x, y), cy = this.toY(x, y), E2 = R6 + r;
          for (let sy = Math.floor(cy - E2); sy <= Math.ceil(cy + E2); sy++)
            for (let sx = Math.floor(cx - E2); sx <= Math.ceil(cx + E2); sx++) {
              let d = Math.abs(Math.hypot(sx + 0.5 - cx, sy + 0.5 - cy) - R6) / r;
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
          let k = opts.scale ?? 1, a = opts.a ?? 1, W4 = s[0]?.length ?? 0, cache = {};
          for (let r = 0; r < s.length; r++)
            for (let q = 0; q < s[r].length; q++) {
              let ch = s[r][q];
              if (ch === "." || ch === " ") continue;
              let c = opts.tint;
              if (c === void 0 && (c = cache[ch], c === void 0 && (c = cache[ch] = pal[ch] === void 0 ? 0 : hex(pal[ch]))), !c) continue;
              let col = opts.flip ? W4 - 1 - q : q, row = opts.flipY ? s.length - 1 - r : r;
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
          let at2 = (mx, my) => mx >= 0 && my >= 0 && mx < m.w && my < m.h && m.data[my * m.w + mx];
          for (let my = -1; my <= m.h; my++)
            for (let mx = -1; mx <= m.w; mx++)
              !at2(mx, my) && (at2(mx - 1, my) || at2(mx + 1, my) || at2(mx, my - 1) || at2(mx, my + 1)) && this.dot(x + mx, y + my, call(c, mx, my), call(a, mx, my));
        }
      };
    }
  });

  // src/core/actor.js
  function maskOf(rows, k = 1) {
    let h = rows.length * k, w = rows[0].length * k, data = new Uint8Array(w * h);
    return rows.forEach((r, y) => [...r].forEach((ch, x) => {
      if (ch !== ".")
        for (let j = 0; j < k * k; j++) data[(y * k + (j / k | 0)) * w + x * k + j % k] = 1;
    })), { w, h, data };
  }
  function pixelsOf(rows, pal) {
    let w = rows[0].length, data = new Uint32Array(w * rows.length);
    return rows.forEach((r, y) => [...r].forEach((ch, x) => data[y * w + x] = ch === "." ? 0 : hex(pal[ch]))), data;
  }
  function stockActor(k = 1) {
    k = k === 2 ? 2 : 1;
    let m = MASKS[k], x = -Math.floor(m.w / 2), y = -m.h;
    return { mask: m, pixels: PIXELS[k], x, y, w: m.w, h: m.h, k, head: [0, y], chest: [0, k === 2 ? -26 : y + 11], ...k === 2 ? { eyes: [[13, 3], [15, 3]] } : {} };
  }
  var HERO, HERO_PAL, DUMMY_PAL, HERO2, MASKS, PIXELS, init_actor = __esm({
    "src/core/actor.js"() {
      init_color();
      HERO = [
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
      MASKS = { 1: maskOf(HERO, 1), 2: maskOf(HERO2, 1) };
      PIXELS = { 1: pixelsOf(HERO, HERO_PAL), 2: pixelsOf(HERO2, DUMMY_PAL) };
    }
  });

  // src/core/fx.js
  function createFrame(w, h, ox = 0, oy = 0) {
    return { w, h, ox, oy, color: new Uint32Array(w * h), light: new Uint32Array(w * h) };
  }
  function clearFrame(f) {
    return f.color.fill(0), f.light.fill(0), f;
  }
  function painterFor(frame2) {
    let p = painters.get(frame2);
    return p || painters.set(frame2, p = new Painter(frame2)), p.reset();
  }
  function resolveOptions(meta96, o = {}) {
    let opts = { ...meta96.options ?? {}, ...o };
    for (let [k, def] of Object.entries(meta96.options ?? {}))
      isRamp(def) && isRamp(o[k]) && o[k].length !== def.length && (opts[k] = fit(o[k], def.length).map(toHex));
    return meta96.actor && !opts.actor && (opts.actor = stockActor(meta96.actor === 2 ? 2 : 1)), opts;
  }
  function createFx(mod, o = {}) {
    let meta96 = mod.meta ?? {}, opts = resolveOptions(meta96, o), impl = mod.create ? mod.create(opts) : mod, D25 = meta96.duration ?? 1, t = 0, stopAt = 1 / 0;
    return {
      meta: meta96,
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
        let tt = meta96.loop ? t % D25 : Math.min(t, D25);
        layer !== "front" && impl.drawBack && (p.layer = "back", impl.drawBack(p, tt, opts)), layer !== "back" && (p.layer = "front", impl.draw(p, tt, opts));
      },
      /** Let it end: loops fade out, one-shots cut short. */
      stop() {
        stopAt === 1 / 0 && (stopAt = t);
      },
      done() {
        return t - stopAt >= FADE || !meta96.loop && t >= D25;
      }
    };
  }
  var painters, FADE, isRamp, init_fx = __esm({
    "src/core/fx.js"() {
      init_painter();
      init_math();
      init_actor();
      init_color();
      painters = /* @__PURE__ */ new WeakMap();
      FADE = 0.3, isRamp = (v) => Array.isArray(v) && v.length > 0 && v.every((c) => typeof c == "number" || /^#[0-9a-f]{3,8}$/i.test(c));
    }
  });

  // src/core/particles.js
  function fly(x, y, vx, vy, t, g = 0, drag = 0) {
    if (drag <= 0) return [x + vx * t, y + vy * t + 0.5 * g * t * t];
    let f = (1 - Math.exp(-drag * t)) / drag, vt = g / drag;
    return [x + vx * f, y + vt * t + (vy - vt) * f];
  }
  function flyV(vx, vy, t, g = 0, drag = 0) {
    if (drag <= 0) return [vx, vy + g * t];
    let e = Math.exp(-drag * t), vt = g / drag;
    return [vx * e, vt + (vy - vt) * e];
  }
  function cycle(t, period, count, seed2, life, fn) {
    for (let i = 0; i < count; i++) {
      let g = rng(seed2, i, 911), born = g.next() * period, L = typeof life == "function" ? life(g) : life, age = ((t - born) % period + period) % period;
      for (; age < L; age += period) fn(age, L, rng(seed2, i), i);
    }
  }
  var init_particles = __esm({
    "src/core/particles.js"() {
      init_math();
    }
  });

  // src/core/shapes.js
  function bolt(r, x0, y0, x1, y1, { jag = 0.22, depth = 5 } = {}) {
    let pts = [[x0, y0], [x1, y1]];
    for (let d = 0; d < depth; d++) {
      let next = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        let [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), off2 = (r.next() * 2 - 1) * jag * L;
        next.push([(ax + bx) / 2 + -dy / (L || 1) * off2, (ay + by) / 2 + dx / (L || 1) * off2], pts[i]);
      }
      pts = next;
    }
    return pts;
  }
  function forks(r, path2, { count = 3, len: len2 = 20, jag = 0.3, spread = 0.9 } = {}) {
    let out = [];
    for (let k = 0; k < count; k++) {
      let i = 1 + Math.floor(r.next() * (path2.length - 2)), [x, y] = path2[i], [px, py] = path2[i - 1], a = Math.atan2(y - py, x - px) + (r.next() < 0.5 ? -1 : 1) * spread * (0.4 + 0.6 * r.next()), l = len2 * (0.4 + 0.6 * r.next());
      out.push(bolt(r, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, { jag, depth: 3 }));
    }
    return out;
  }
  var init_shapes = __esm({
    "src/core/shapes.js"() {
      init_math();
    }
  });

  // src/core/sim.js
  function sparkle(p, x, y, arm2, c, tip = c, k = 0.6) {
    let n = Math.round(arm2);
    if (n < 1) return;
    let X = Math.floor(x), Y3 = Math.floor(y);
    for (let d = 1; d <= n; d++) {
      let cc = d > n * 0.6 ? tip : c;
      for (let [dx, dy] of CROSS) p.px(X + dx * d, Y3 + dy * d, cc);
    }
    if (n >= 3) for (let [dx, dy] of DIAG) p.px(X + dx, Y3 + dy, c);
    if (n >= 6) for (let [dx, dy] of DIAG) p.px(X + dx * 2, Y3 + dy * 2, tip);
    p.px(X, Y3, WHITE), p.glow(x, y, 4 + n * 2, c, k);
  }
  function flare(p, x, y, L, k, ramp2) {
    if (L < 1) return;
    let R6 = ramp2.map(hex), n = R6.length;
    for (let i = 0; i < 8; i++) {
      let an = i * Math.PI / 4, len2 = i % 4 === 0 ? L : i % 2 === 0 ? L * 0.6 : L * 0.3, ca = Math.cos(an), sa = Math.sin(an);
      for (let d = 0; d <= len2; d += 0.5) {
        let u = d / len2;
        p.dot(x + ca * d, y + sa * d, u < 0.35 ? WHITE : u < 0.7 ? R6[n - 2] : R6[n - 3], u < 0.6 ? 1 : k * 1.5 * (1 - u) + 0.2);
      }
    }
  }
  function band(p, cx, cy, r, sy, th, k, ramp2, keep2 = () => !0, hot = !1) {
    if (r <= 0 || k <= 0) return;
    let R6 = ramp2.map(hex), n = R6.length;
    for (let j = 0, m = Math.ceil(r * TAU * 1.2); j < m; j++) {
      let ang = j / m * TAU, ca = Math.cos(ang), sa = Math.sin(ang);
      if (keep2(ang))
        for (let o = th; o >= 0; o -= 0.5) {
          let u = o / th, c = u < 0.15 ? hot ? WHITE : R6[n - 1] : u < 0.4 ? R6[n - 2] : u < 0.7 ? R6[n - 3] : R6[n - 4];
          p.dot(cx + ca * (r - o), cy + sa * (r - o) * sy, c, k * (u < 0.4 ? 1.2 : 1.15 - u));
        }
    }
  }
  function crystal(p, x, base, h, w, lean, ramp2, opts = {}) {
    if (h < 1.5) return;
    let R6 = ramp2.map(hex), n = R6.length, C = (i) => R6[Math.max(0, n - 1 - i)], a = opts.a ?? 1, top = base - h, ridge0 = x - w * 0.14, glint2 = opts.glint ?? -1, inside = (px, py) => {
      let u = (base - (py + 0.5)) / h;
      return u >= 0 && u <= 1 && Math.abs(px + 0.5 - (x + lean * u)) <= w / 2 * (1 - u) + 0.35;
    };
    for (let py = Math.floor(top) - 1; py < Math.ceil(base); py++)
      for (let px = Math.floor(x - w / 2 - Math.abs(lean) - 2); px <= Math.ceil(x + w / 2 + Math.abs(lean) + 2); px++) {
        if (!inside(px, py)) {
          (inside(px - 1, py) || inside(px + 1, py) || inside(px, py + 1) || inside(px, py - 1) && py < base - 1) && p.dot(px, py, R6[0], a);
          continue;
        }
        if (opts.white) {
          p.dot(px, py, WHITE, a);
          continue;
        }
        let u = (base - (py + 0.5)) / h, rx = ridge0 + (x + lean - ridge0) * u, c = x + lean * u, hw = w / 2 * (1 - u) + 0.35, fx = px + 0.5, col = u > 0.9 ? WHITE : Math.abs(fx - rx) < 0.55 ? C(1) : fx < rx ? fx - (c - hw) < 1 ? C(1) : (fx - (c - hw)) / Math.max(1, rx - (c - hw)) > 0.55 ? C(2) : C(3) : c + hw - fx < 1.2 ? C(Math.min(n - 2, 6)) : (fx - rx) / Math.max(1, c + hw - rx) > 0.5 ? C(5) : C(4);
        if (glint2 >= 0 && fx <= rx + 0.6) {
          let g = Math.abs(u - glint2);
          g < 0.05 ? col = WHITE : g < 0.1 && (col = C(1));
        }
        p.dot(px, py, col, a);
      }
  }
  var GRAVITY, CROSS, DIAG, HOT, FIRE_RAMP, SMOKE_RAMP, rampAt, P, PF, SOFT, Particles, Blazes, B, Bits, Lights, init_sim = __esm({
    "src/core/sim.js"() {
      init_math();
      init_color();
      GRAVITY = 950, CROSS = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]], HOT = ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"].map(hex), FIRE_RAMP = ["#ffffff", "#fff3a6", "#ffe26b", "#ffc23d", "#ff8a2a", "#f2561d", "#c9281f", "#8a1f17", "#4a1712"].map(hex), SMOKE_RAMP = ["#7b6f72", "#5d5660", "#433d48", "#2b2630", "#1a171e"].map(hex), rampAt = (r, t) => r[Math.min(r.length - 1, Math.max(0, Math.floor(t * r.length)))], P = { SPARK: 0, MOTE: 1, STREAK: 2, FLAKE: 3, VAPOUR: 4, DUST: 5, STAR: 6, EMBER: 7, SMOKE: 8, FIRE: 9, BRAND: 10, GRIT: 11 }, PF = { SMOKES: 1, BIG: 2, BACK: 4 }, SOFT = /* @__PURE__ */ new Set([P.VAPOUR, P.DUST, P.SMOKE]), Particles = class {
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
          let R6 = this.R, t = this.t;
          for (let i = this.list.length - 1; i >= 0; i--) {
            let p = this.list[i];
            if (p.delay > 0) {
              p.delay -= dt;
              continue;
            }
            if ((p.life -= dt) <= 0) {
              if (p.k === P.FIRE && p.flag & PF.SMOKES) {
                let big = p.flag & PF.BIG;
                this.spawn(P.SMOKE, p.x, p.y, p.vx * 0.6, p.vy * 0.6 - 6, big ? R6.range(1.3, 2.3) : R6.range(0.8, 1.4), 0, p.size * (big ? 0.85 : 0.7), 0, big ? PF.BIG : 0);
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
                p.x += p.vx * dt, p.vy > 0 && p.y <= g && ny >= g ? (p.y = g - 0.25, p.vy > 130 && R6.chance(0.4) ? (p.vy = -p.vy * 0.25, p.vx = p.vx * 0.5 + R6.range(-10, 10)) : (p.vx = p.vy = 0, p.life = Math.min(p.life, 0.5))) : p.y = ny;
                continue;
              }
              case P.BRAND: {
                p.vy += GRAVITY * 0.8 * dt, p.vx -= p.vx * 0.9 * dt, R6.chance(0.9 * Math.min(1, dt * 60)) && this.spawn(P.FIRE, p.x, p.y, p.vx * 0.1 + R6.range(-7, 7), p.vy * 0.1 - 10, R6.range(0.16, 0.32), 0, R6.range(0.9, 1.7) * (0.5 + p.life / p.max * 0.6), 0, R6.chance(0.4) ? PF.SMOKES : 0);
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
                let S = this.sparks, head4 = k > 0.6 ? S[0] : k > 0.3 ? S[1] : S[2], len2 = Math.min(9, 1 + sp * 0.022);
                p.line(x - ux * len2, y - uy * len2, x - ux * len2 * 0.4, y - uy * len2 * 0.4, k > 0.5 ? head4 : S[S.length - 1]), p.line(x - ux * len2 * 0.45, y - uy * len2 * 0.45, x, y, head4), p.glow(x, y, 3, head4, 0.45 * k);
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
                let age = 1 - k, heat2 = Math.min(0.999, Math.pow(age, 0.62) + q.seed % 1 * 0.1), F = FIRE_RAMP, n = F.length, idx = Math.min(n - 2, Math.floor(heat2 * (n - 1))), r = q.size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = F[idx];
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
      }, Blazes = class {
        constructor(ps) {
          this.ps = ps, this.list = [];
        }
        add(x, y, life, power) {
          this.list.push({ x, y, life, max: life, acc: this.ps.R.next(), power });
        }
        get count() {
          return this.list.length;
        }
        update(dt) {
          let ps = this.ps, R6 = ps.R;
          for (let i = this.list.length - 1; i >= 0; i--) {
            let b = this.list[i];
            if ((b.life -= dt) <= 0) {
              this.list.splice(i, 1);
              continue;
            }
            let k = b.life / b.max, intensity = b.power * (k > 0.7 ? 1 : 0.35 + k / 0.7 * 0.65);
            for (b.acc += dt * (6 + 16 * intensity); b.acc > 1; b.acc--) {
              let s = R6.range(1.2, 2.8) * intensity;
              ps.spawn(P.FIRE, b.x + R6.range(-1.5, 1.5), b.y - s * 0.6, R6.range(-6, 6), R6.range(-30, -12), R6.range(0.28, 0.6), 0, s, 0, PF.BACK | (R6.chance(0.3) ? PF.SMOKES : 0)), R6.chance(0.06) && ps.spawn(P.EMBER, b.x, b.y - 1.5, R6.range(-15, 15), R6.range(-45, -15), R6.range(0.6, 1.4), HOT[2], 1, 0, PF.BACK);
            }
          }
        }
        drawBack(p) {
          for (let b of this.list) {
            let k = b.life / b.max;
            p.px(b.x, b.y, k > 0.4 ? Math.sin(b.life * 31 + b.x) > 0 ? HOT[1] : HOT[2] : HOT[3]), p.glow(b.x, b.y, 6 + 5 * k * b.power, HOT[2], 0.3 * k * b.power);
          }
        }
      }, B = { SHARD: 0, CHUNK: 1, DRIP: 2 }, Bits = class {
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
              let R6 = (b.ramp ?? ["#1c2030", "#3a4a66", "#6e86a8", "#a8c0dc", "#e8f2ff"]).map(hex), n = R6.length, x = Math.round(b.x), y = Math.round(b.y), r = Math.ceil(b.s) + 1;
              for (let py = -r; py <= r; py++)
                for (let px = -r; px <= r; px++) {
                  let u = (px + 0.5) * ca + (py + 0.5) * sa, v = -(px + 0.5) * sa + (py + 0.5) * ca, d = Math.abs(u) / b.s + Math.abs(v) / (b.s * 0.62);
                  d > 1.3 || p.dot(x + px, y + py, d > 1 ? R6[0] : v < 0 ? u < 0 ? R6[n - 1] : R6[n - 2] : u < 0 ? R6[n - 3] : R6[Math.max(1, n - 4)], a);
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
    }
  });

  // src/core/scene.js
  var SKY, SKY_TOP, SKY_LOW, FLOOR_EDGE, FLOOR, FLOOR_DARK, MORTAR, init_scene = __esm({
    "src/core/scene.js"() {
      init_color();
      init_math();
      SKY = hex("#15131d"), SKY_TOP = hex("#0d0b14"), SKY_LOW = hex("#221d33"), FLOOR_EDGE = hex("#4a4263"), FLOOR = hex("#2b2639"), FLOOR_DARK = hex("#211d2d"), MORTAR = hex("#1a1724");
    }
  });

  // src/core/rig.js
  function ik(a, target, L1, L2, pole) {
    let to = sub(target, a), d = len(to), reach = L1 + L2 - 0.02;
    d > reach && (to = mul(to, reach / d), d = reach);
    let u = unit(to), along5 = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - along5 * along5)), v = sub(pole, mul(u, dot(pole, u)));
    return v = len(v) < 1e-4 ? unit(cross(u, [0, 0, 1])) : unit(v), { joint: add(a, add(mul(u, along5), mul(v, h))), end: add(a, to), u, v };
  }
  function frame(t, R6) {
    return { t, R: R6 };
  }
  function boneFrame(a, b, pole) {
    let x = unit(sub(b, a)), y = sub(pole, mul(x, dot(pole, x)));
    y = len(y) < 1e-4 ? unit(cross(x, [0, 0, 1])) : unit(y);
    let z = cross(x, y);
    return frame(a, [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]);
  }
  function solve(pose) {
    let q = { ...STAND, ...pose }, lean = q.lean, W4 = q.weapon && weaponOf(q.weapon), OW = q.offWeapon && weaponOf(q.offWeapon), sa = q.sa ?? 0, wl = q.wl ?? 1, axisZ = Math.sqrt(Math.max(0, 1 - wl * wl)) * (q.wz ?? 1), axis2 = [Math.cos(sa) * wl, -Math.sin(sa) * wl, axisZ], side = [-Math.sin(sa), -Math.cos(sa), 0], two = !!(q.two && W4), nearZ = q.fz ?? (two ? 3 : 4.5), fwd = (q.fx - STAND.fx) / 24, farFwd = two ? 0 : (q.bx - STAND.bx) / 22, turn2 = M.turn + (fwd >= 0 ? -44 * DEG * Math.min(1, fwd) : 28 * DEG * Math.min(1, -fwd * 1.8));
    turn2 += (farFwd > 0 ? 34 * DEG * Math.min(1, farFwd) : 0) + (q.twist ?? 0) * 4 * DEG, q.turn !== void 0 && (turn2 = q.turn);
    let hipTurn = M.turn + (turn2 - M.turn) * 0.45, tilt = Math.atan2(lean, 13), Rp = mm(rotZ(-tilt * 0.25), rotY(-hipTurn)), Rc = mm(rotZ(-tilt), rotY(-turn2)), ankleN = [q.ffx, -q.ffy - 1.8, q.fzz ?? 2.4], ankleF = [q.fbx, -q.fby - 1.8, q.bzz ?? -2.4], pelvis = [lean * 0.2, M.pelvis - q.crouch, 0], hipAt = (s) => add(pelvis, mv(Rp, [0, -M.hipDown, s * M.hipOut])), maxLeg = (M.thigh + M.shin) * 0.995;
    for (let [s, a] of [[1, ankleN], [-1, ankleF]]) {
      let h = hipAt(s), dx = h[0] - a[0], dz = h[2] - a[2], flat = dx * dx + dz * dz;
      if (flat < maxLeg * maxLeg) {
        let top = a[1] + Math.sqrt(maxLeg * maxLeg - flat);
        h[1] > top && (pelvis = [pelvis[0], pelvis[1] - (h[1] - top), pelvis[2]]);
      }
    }
    let waist = add(pelvis, [Math.sin(tilt * 0.45) * M.spine1, Math.cos(tilt * 0.45) * M.spine1, 0]), chest = add(waist, [Math.sin(tilt) * M.spine2, Math.cos(tilt) * M.spine2, 0]), neck = add(chest, mv(Rc, [0, M.neckUp, 0])), headTurn = M.turn * 0.9 + (turn2 - M.turn) * 0.35, nod = tilt * 0.35 + (q.hy ?? 0) * 7 * DEG, roll = (q.hx ?? 0) * 7 * DEG, Rh = mm(rotZ(-nod - roll), rotY(-headTurn)), head4 = add(neck, mv(Rh, [0.15, M.headUp, 0])), pick = (s, target) => {
      let base = add(chest, mv(Rc, [0, M.shoulderUp, s * M.shoulderOut])), to = sub(target, base), d = len(to);
      return add(base, mul(unit(to), Math.min(1.8, Math.max(0, d - 11) * 0.35)));
    }, nearT = [q.fx, -q.fy, nearZ], farT = two ? [q.fx + axis2[0] * W4.two, -q.fy + axis2[1] * W4.two, nearZ + axis2[2] * W4.two] : [q.bx, -q.by, q.bz ?? (q.armsFront ? 5.5 : -4.5)], sN = pick(1, nearT), sF = pick(-1, farT), pole = (s, T2, shoulder, hold) => {
      let up = clamp01((T2[1] - shoulder[1] + 2) / 10), base = [-0.55 + up * 1.1, -1 + up * 0.9, s * (0.45 + up * 0.5)];
      if (!hold) return base;
      let u = unit(sub(T2, shoulder)), best = base, score = 1 / 0;
      for (let i = 0; i < 16; i++) {
        let a = i / 16 * Math.PI * 2, x = unit(cross(u, [0.3, 1, 0.2])), y = cross(u, x), v = add(mul(x, Math.cos(a)), mul(y, Math.sin(a))), A = ik(shoulder, T2, M.upper, M.fore, v), f = unit(sub(A.end, A.joint)), cost = Math.abs(dot(f, hold)) * 0.7 + (1 - dot(unit(base), v)) * 0.55;
        cost < score && (score = cost, best = v);
      }
      return best;
    }, holdN = W4 ? W4.across ? side : axis2 : null, holdF = two ? W4.across ? side : axis2 : OW ? [Math.cos(q.sb ?? Math.PI), -Math.sin(q.sb ?? Math.PI), 0] : null, armN = ik(sN, nearT, M.upper, M.fore, pole(1, nearT, sN, holdN)), armF = ik(sF, farT, M.upper, M.fore, pole(-1, farT, sF, holdF)), kneePole = (s) => mv(Rp, [1, 0, s * 0.35]), hipN = hipAt(1), hipF = hipAt(-1), legN = ik(hipN, ankleN, M.thigh, M.shin, kneePole(1)), legF = ik(hipF, ankleF, M.thigh, M.shin, kneePole(-1)), footDir = (s) => {
      let t = hipTurn * 0.6 + s * 8 * DEG;
      return [Math.cos(t), 0, Math.sin(t)];
    }, B4 = {
      pelvis: frame(pelvis, Rp),
      waist: frame(waist, mm(rotZ(-tilt * 0.6), rotY(-(turn2 + hipTurn) / 2))),
      chest: frame(chest, Rc),
      head: frame(head4, Rh),
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
    return B4.footN = frame(legN.end, mm(rotY(-Math.atan2(footDir(1)[2], footDir(1)[0])), rotZ(q.toeF ? -55 * DEG : 0))), B4.footF = frame(legF.end, mm(rotY(-Math.atan2(footDir(-1)[2], footDir(-1)[0])), rotZ(q.toeB ? -55 * DEG : 0))), { B: B4, W: W4, OW, q, axis: axis2, side, armN, armF, legN, legF, sN, sF, hipN, hipF, turn: turn2 };
  }
  function plot(i, z, tone, part, mat, wx, wy, color) {
    if (!(onlyPart && part !== onlyPart)) {
      if (Part[i] === 0) touched.push(i);
      else if (z <= Zb[i]) return;
      Zb[i] = z, Tone[i] = tone, Part[i] = part, Mat[i] = mat, Fr[i] = curFrameIndex, LX[i] = wx, LY[i] = wy, Col[i] = color;
    }
  }
  function blade(T2, from, length, w) {
    for (let i = from; i <= from + length + 0.01; i += 0.4) {
      let r = i - from, wd = r > length - 5 ? Math.max(0, (length - r) / 5 * w) : w;
      for (let k = -wd; k <= wd + 0.01; k += 0.4) T2(i, k, k < -w * 0.4 ? STEEL.hi : k > w * 0.4 ? STEEL.d : STEEL.a);
    }
  }
  var PAL2, INK2, SEAM, MARK, SHELL, CORE, DEG, add, sub, mul, dot, cross, len, unit, rotY, rotZ, mm, mv, clamp01, M, STAND, weaponOf, BW, BH, OX, OY, Zb, Tone, Part, Mat, Fr, LX, LY, Col, touched, LIGHT, curFrameIndex, onlyPart, PART, STEEL, haft, WEAPONS, REST_FRAMES, init_rig = __esm({
    "src/core/rig.js"() {
      init_color();
      init_actor();
      PAL2 = Object.fromEntries(Object.entries(DUMMY_PAL).map(([k, v]) => [k, hex(v) >>> 0])), INK2 = PAL2.k, SEAM = PAL2.J, MARK = PAL2.m, SHELL = [PAL2.A, PAL2.B, PAL2.C, PAL2.D], CORE = [PAL2.E, PAL2.F, PAL2.G, PAL2.G], DEG = Math.PI / 180, add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = (a) => Math.hypot(a[0], a[1], a[2]), unit = (a) => mul(a, 1 / (len(a) || 1e-6)), rotY = (t) => {
        let c = Math.cos(t), s = Math.sin(t);
        return [c, 0, s, 0, 1, 0, -s, 0, c];
      }, rotZ = (t) => {
        let c = Math.cos(t), s = Math.sin(t);
        return [c, -s, 0, s, c, 0, 0, 0, 1];
      }, mm = (A, B4) => {
        let o = new Array(9);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = A[r * 3] * B4[c] + A[r * 3 + 1] * B4[3 + c] + A[r * 3 + 2] * B4[6 + c];
        return o;
      }, mv = (M2, v) => [M2[0] * v[0] + M2[1] * v[1] + M2[2] * v[2], M2[3] * v[0] + M2[4] * v[1] + M2[5] * v[2], M2[6] * v[0] + M2[7] * v[1] + M2[8] * v[2]], clamp01 = (v) => Math.max(0, Math.min(1, v)), M = {
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
      weaponOf = (name) => WEAPONS[name];
      BW = 300, BH = 240, OX = 150, OY = 180, Zb = new Float32Array(BW * BH), Tone = new Float32Array(BW * BH), Part = new Int8Array(BW * BH), Mat = new Int8Array(BW * BH), Fr = new Int8Array(BW * BH), LX = new Float32Array(BW * BH), LY = new Float32Array(BW * BH), Col = new Uint32Array(BW * BH), touched = [], LIGHT = unit([-0.55, 0.72, 0.5]), curFrameIndex = 0, onlyPart = 0;
      PART = { pelvis: 1, waist: 2, chest: 3, neck: 4, head: 5, face: 6, upperN: 7, elbowN: 8, foreN: 9, handN: 10, upperF: 11, elbowF: 12, foreF: 13, handF: 14, thighN: 15, kneeN: 16, shinN: 17, footN: 18, thighF: 19, kneeF: 20, shinF: 21, footF: 22, weapon: 23, offWeapon: 24 }, STEEL = Object.fromEntries(Object.entries({ hi: "#ffffff", a: "#e8edf6", b: "#a4afc6", d: "#68748f", gold: "#ffd84a", goldD: "#b8862a", grip: "#7a3a2a", gripD: "#4a2018", wood: "#8a5a32", woodD: "#5a3820", dark: "#3a3448", darkD: "#262033", olive: "#58663f", oliveA: "#7d8c58", oliveD: "#3a4529" }).map(([k, v]) => [k, hex(v) >>> 0]));
      haft = (T2, from, to, a, d, r = 0.8) => {
        for (let i = from; i <= to; i += 0.4) for (let k = -r; k <= r + 0.01; k += 0.4) T2(i, k, k > 0.1 ? d : a);
      }, WEAPONS = {
        // the fist is at i = 0; `two` is where the other hand goes; `across`: the handle lies across the weapon's length
        sword: { two: -4.4, draw(T2, q) {
          let end = q.two ? -6.5 : -2.6;
          haft(T2, end, 2.2, STEEL.grip, STEEL.gripD);
          for (let k = -1.4; k <= 1.4; k += 0.4) T2(end - 0.4, k, STEEL.gold);
          for (let k = -4.6; k <= 4.6; k += 0.4) T2(2.6, k, Math.abs(k) > 3.8 ? STEEL.goldD : STEEL.gold), T2(3, k, STEEL.goldD);
          blade(T2, 3.2, 25, 2.2);
        } },
        greatsword: { two: -4.8, draw(T2) {
          haft(T2, -7.2, 2.2, STEEL.grip, STEEL.gripD);
          for (let k = -1.8; k <= 1.8; k += 0.4) T2(-7.6, k, STEEL.gold);
          for (let k = -6.6; k <= 6.6; k += 0.4) T2(2.6, k, Math.abs(k) > 5.6 ? STEEL.goldD : STEEL.gold), T2(3, k, STEEL.goldD);
          blade(T2, 3.2, 31, 3);
          for (let i = 4; i <= 28; i += 0.4) T2(i, 0, STEEL.b);
        } },
        dagger: { draw(T2) {
          haft(T2, -2.4, 1.8, STEEL.grip, STEEL.gripD);
          for (let k = -2.6; k <= 2.6; k += 0.4) T2(2.2, k, STEEL.goldD);
          blade(T2, 2.6, 10, 1.3);
        } },
        spear: { two: -12, draw(T2) {
          haft(T2, -18, 36, STEEL.wood, STEEL.woodD, 0.5), blade(T2, 36, 11, 2);
          for (let k = -2.4; k <= 2.4; k += 0.4) T2(36, k, STEEL.goldD);
        } },
        hammer: { two: -7, draw(T2) {
          for (let lift of [-0.8, 0, 0.8]) for (let i = -10; i <= 18; i += 0.4) for (let k = -0.8; k <= 0.81; k += 0.4) T2(i, k, k > 0.1 ? STEEL.woodD : STEEL.wood, lift);
          for (let i = 18; i <= 28; i += 0.4) for (let k = -9; k <= 9; k += 0.4) {
            let face = Math.abs(k) > 7.4 ? k < 0 ? STEEL.a : STEEL.d : i < 20 ? STEEL.hi : i > 26.4 ? STEEL.d : Math.abs(k) < 2 ? STEEL.gold : STEEL.b;
            if (T2(i, k, face, 4.5), T2(i, k, face, -4.5), i < 18.4 || i > 27.6 || Math.abs(k) > 8.6) for (let l = -4; l <= 4; l += 0.4) T2(i, k, k < 0 ? STEEL.a : i > 27.6 ? STEEL.d : STEEL.b, l);
          }
        } },
        scythe: { two: -11, draw(T2) {
          haft(T2, -16, 31, STEEL.dark, STEEL.darkD, 0.5);
          for (let j = 0; j <= 28; j += 0.4) {
            let u = j / 28, w = 3.2 * (1 - u) + 0.3, b = 31.5 - u * u * 12;
            for (let k = -w; k <= w; k += 0.4) T2(b + k, j + 0.8, k > w * 0.3 ? STEEL.hi : k < -w * 0.4 ? STEEL.d : STEEL.b);
          }
        } },
        claw: { draw(T2) {
          for (let q0 of [-2.4, 0, 2.4])
            for (let i = 2; i <= 9.5; i += 0.4) {
              let u = (i - 2) / 7.5, k = q0 + u * u * 1.8;
              T2(i, k, u > 0.55 ? STEEL.hi : STEEL.a), u < 0.6 && T2(i, k + 0.8, STEEL.d);
            }
        } },
        bow: { across: !0, draw(T2, q, off2) {
          for (let u = -1; u <= 1.001; u += 0.025) {
            let k = u * 17, i = 6 * (1 - u * u) - 1;
            T2(i, k, Math.abs(u) > 0.85 ? STEEL.goldD : STEEL.wood), T2(i + 0.8, k, STEEL.woodD);
          }
          let tipA = T2.at(-1, -17), tipB = T2.at(-1, 17), mid = q.pull ? off2 : T2.at(-1, 0), line2 = (A, B4, c) => {
            let n = Math.max(2, Math.ceil(len(sub(B4, A)) / 0.4)), Z = STEEL.a;
            for (let k = 0; k <= n; k++) {
              let P3 = add(A, mul(sub(B4, A), k / n)), wx = Math.round(P3[0]), wy = Math.round(P3[1]), idx = (OY - wy) * BW + (OX + wx);
              curFrameIndex = -1, plot(idx, P3[2] + 0.05, 2, PART.weapon, 2, wx, wy, c ?? Z);
            }
          };
          if (line2(tipA, mid), line2(tipB, mid), q.nocked) {
            let nock = mid, tip = T2.at(13, 0);
            line2(nock, tip, STEEL.wood);
            for (let i = 9; i <= 13; i += 0.4) for (let k = -(13 - i) * 0.45; k <= (13 - i) * 0.45; k += 0.4) T2(i, k, STEEL.hi);
          }
        } },
        pistol: { across: !0, draw(T2) {
          for (let i = -1; i <= 9.5; i += 0.4) for (let k = -4.2; k <= -2.4; k += 0.4) T2(i, k, k < -3.6 ? STEEL.a : k > -2.9 ? STEEL.d : STEEL.b);
          for (let i = -1.2; i <= 1.2; i += 0.4) for (let k = -2.4; k <= 2.4; k += 0.4) T2(i, k, STEEL.gripD);
          T2(9, -4.6, STEEL.hi);
        } },
        launcher: { two: -9, draw(T2) {
          for (let i = -14; i <= 22; i += 0.4) for (let k = -6; k <= -1; k += 0.4) T2(i, k, k < -4.8 ? STEEL.oliveA : k > -2.2 ? STEEL.oliveD : Math.abs(i - 3) < 1.4 ? STEEL.gold : STEEL.olive);
          for (let k = -6.8; k <= -0.2; k += 0.4) T2(22.4, k, STEEL.b), T2(-14.4, k, STEEL.d);
        } },
        handle: { draw(T2) {
          haft(T2, -2.6, 6, STEEL.grip, STEEL.gripD);
          for (let k = -1.6; k <= 1.6; k += 0.4) T2(-3, k, STEEL.gold), T2(6.4, k, STEEL.gold);
        } }
      }, REST_FRAMES = null;
      REST_FRAMES = solve({}).B;
    }
  });

  // src/core/act.js
  var TW, TH, TP, DUST, DUMMY, SKINS, STRAW, REST_MASK, REST_PX, NEAREST, init_act = __esm({
    "src/core/act.js"() {
      init_math();
      init_color();
      init_fx();
      init_actor();
      init_rig();
      TW = 38, TH = 52, TP = Object.fromEntries(Object.entries({ ink: "#0b0a1a", wood: "#724c2e", woodL: "#a0703a", woodD: "#4e331f", straw: "#d2aa55", strawL: "#f0d98a", burlapD: "#86643a", burlap: "#b38b57", burlapL: "#c9a26c", red: "#9a2f3c", redL: "#c4434f", white: "#ffffff" }).map(([k, v]) => [k, hex(v)])), DUST = ["#efe7dc", "#c9bfb8", "#8f8693", "#5a5468"].map(hex), DUMMY = new Uint32Array(TW * TH);
      (function() {
        let px = (x, y, c) => {
          x >= 0 && y >= 0 && x < TW && y < TH && (DUMMY[y * TW + x] = c);
        }, R6 = (x, y, w, h, c) => {
          for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c);
        };
        R6(15, 38, 8, 14, TP.ink), R6(16, 34, 6, 18, TP.wood), R6(16, 34, 2, 18, TP.woodL), R6(20, 34, 2, 18, TP.woodD), R6(1, 18, 36, 1, TP.ink), R6(1, 23, 36, 1, TP.ink), R6(1, 19, 36, 4, TP.wood), R6(1, 19, 36, 1, TP.woodL), R6(1, 22, 36, 1, TP.woodD);
        for (let [bx, s] of [[0, -1], [33, 1]]) {
          R6(bx, 17, 5, 8, TP.straw);
          for (let [dx, dy, c] of [[2, 16, TP.straw], [3, 15, TP.strawL], [1, 17, TP.strawL], [2, 25, TP.straw], [1, 26, TP.strawL], [3, 25, TP.burlapD], [2, 19, TP.strawL], [3, 21, TP.strawL], [1, 22, TP.burlapD], [2, 23, TP.strawL]]) px(bx + dx, dy, c);
          px(s < 0 ? bx - 1 : bx + 5, 19, TP.straw), px(s < 0 ? bx - 1 : bx + 5, 22, TP.strawL);
        }
        let sack = (x, y, w, h) => {
          R6(x + 1, y, w - 2, 1, TP.ink), R6(x + 1, y + h - 1, w - 2, 1, TP.ink), R6(x, y + 1, 1, h - 2, TP.ink), R6(x + w - 1, y + 1, 1, h - 2, TP.ink), R6(x + 1, y + 1, w - 2, h - 2, TP.burlap), R6(x + w - 4, y + 1, 3, h - 2, TP.burlapD), R6(x + 1, y + h - 3, w - 2, 2, TP.burlapD), R6(x + 1, y + 1, 1, h - 4, TP.burlapL), R6(x + 1, y + 1, w - 6, 1, TP.burlapL);
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
      SKINS = { flash: [TP.white, 1], char: [hex("#1a0c0e"), 0.72], ice: [hex("#a8e8ff"), 0.72], shadow: [hex("#3a1a70"), 0.5], holy: [hex("#fff4c0"), 0.5], red: [hex("#ff2040"), 0.45], shock: [hex("#8fd6ff"), 0.6], poison: [hex("#58c43a"), 0.5] }, STRAW = [TP.strawL, TP.straw, TP.straw, TP.burlapD, TP.burlapD], REST_MASK = new Uint8Array(912), REST_PX = new Uint32Array(912);
      HERO2.forEach((row, r) => [...row].forEach((ch, c) => {
        ch !== "." && (REST_MASK[r * 24 + c] = 1, REST_PX[r * 24 + c] = hex(DUMMY_PAL[ch]));
      }));
      NEAREST = new Int16Array(912).fill(-1);
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
    }
  });

  // src/core/poses.js
  var READY, init_poses = __esm({
    "src/core/poses.js"() {
      READY = { crouch: 3, fx: 11, fy: -21, bx: 9, by: -21, ffx: 7, fbx: -7 };
    }
  });

  // src/core/chain.js
  var init_chain = __esm({
    "src/core/chain.js"() {
      init_fx();
    }
  });

  // src/core/index.js
  var init_core = __esm({
    "src/core/index.js"() {
      init_math();
      init_color();
      init_particles();
      init_shapes();
      init_sim();
      init_painter();
      init_font();
      init_fx();
      init_actor();
      init_scene();
      init_act();
      init_rig();
      init_poses();
      init_chain();
    }
  });

  // src/fx/impacts/hit-spark.js
  var hit_spark_exports = {};
  __export(hit_spark_exports, {
    create: () => create,
    meta: () => meta
  });
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
    let C = fit(o.palette, 7), R6 = new Rng(o.seed), X = 0, Y3 = -o.height, A = o.aim, floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [C[6], C[5], C[4], C[2]] }), lights = new Lights(), tilt = R6.range(-0.08, 0.08), rays = [
      { a: A + tilt, L: R6.range(33, 37), w: 2.2 },
      { a: A + Math.PI + tilt, L: R6.range(8, 10), w: 2.2 },
      { a: A - Math.PI / 2 + tilt, L: R6.range(15, 18), w: 2.6 },
      { a: A + Math.PI / 2 + tilt, L: R6.range(10, 12), w: 2.3 },
      { a: A - Math.PI / 4 + tilt, L: R6.range(5, 7), w: 1 }
    ];
    lights.add(X, Y3, 38, C[4], 0.35, 0.18), lights.add(X + Math.cos(A) * 10, Y3 + Math.sin(A) * 10, 22, C[5], 0.45, 0.1), lights.add(X, -2, 26, C[3], 0.22, 0.22);
    for (let i = 0; i < 9; i++) {
      let a = A + R6.range(-0.6, 0.6) - 0.15, v = R6.range(170, 360);
      ps.spawn(P.SPARK, X + 1, Y3, Math.cos(a) * v, Math.sin(a) * v - 40, R6.range(0.25, 0.45), WHITE, 1, i > 6 ? R6.range(0.01, 0.03) : 0);
    }
    for (let i = 0; i < 6; i++) {
      let a = A + R6.range(-1.1, 0.5) - 0.3, v = R6.range(70, 170);
      ps.spawn(P.GRIT, X + 1, Y3, Math.cos(a) * v, Math.sin(a) * v - R6.range(30, 80), R6.range(0.35, 0.45), R6.pick([C[5], C[4], C[4], C[3]]), 1);
    }
    let t = 0;
    return {
      update(dt) {
        t += dt, ps.update(dt), lights.update(dt);
      },
      draw(p) {
        if (ps.draw(p), t < 0.025) {
          for (let r of rays) ray(p, X, Y3, r.a, r.L, r.w, C);
          diamond(p, X, Y3, 4, C);
        } else if (t < 0.058) {
          for (let r of rays) ray(p, X, Y3, r.a, r.L * 1.2, r.w * 0.55, C, 0.12);
          diamond(p, X, Y3, 3, C);
        } else if (t < 0.092) {
          let r = rays[0];
          ray(p, X, Y3, r.a, r.L * 1.3, 0.6, [C[0], C[1], C[2], C[3], C[3], C[4]], 0.4);
        }
        let pop = Math.exp(-t / 0.045);
        pop > 0.02 && (p.glow(X, Y3, 22, C[4], 0.3 * pop), p.glow(X, Y3, 7, WHITE, 0.15 * pop), p.glowLine(X, Y3, X + Math.cos(A) * 26, Y3 + Math.sin(A) * 26, 4, C[5], 0.25 * pop)), lights.draw(p);
      }
    };
  }
  var meta, init_hit_spark = __esm({
    "src/fx/impacts/hit-spark.js"() {
      init_core();
      meta = {
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
    }
  });

  // src/fx/impacts/_lib.js
  function stone(c) {
    return c = hex(c), { light: mix(scale(c, 1.35), WHITE, 0.08), body: c, shade: scale(c, 0.64), dust: mix(scale(c, 1.2), rgb(150, 140, 150), 0.3), lip: mix(scale(c, 1.55), WHITE, 0.12) };
  }
  function spikes(R6, n, aim, { len: len2 = [7, 10], w = [1.5, 2.1], fwd = 1.8, back = 0.6, jag = 1, jit = 0.18 } = {}) {
    return Array.from({ length: n }, (_, i) => {
      let a = aim + i / n * TAU + R6.range(-jit, jit), cb = Math.cos(a - aim), L = R6.range(len2[0], len2[1]) * (1 + fwd * Math.pow(Math.max(0, cb), 3) + back * Math.pow(Math.max(0, -cb), 3)) * (i % 2 ? jag : 1);
      return { a, len: L, w: R6.range(w[0], w[1]) * (i % 2 ? Math.sqrt(jag) : 1) };
    });
  }
  function star(p, x, y, list, sc, th, [rim, body4, inner, core], a = 1, heart2 = 2.4) {
    for (let pass = 0; pass < 3; pass++)
      for (let s of list) {
        let c = Math.cos(s.a), sn = Math.sin(s.a), L = s.len * sc;
        for (let d = 0; d <= L && !(pass === 2 && d > L * 0.55); d += 0.5) {
          let hw0 = s.w * th * (1 - d / L) * Math.min(1, 0.5 + d / 3), hw = pass === 0 ? hw0 + 0.8 : pass === 1 ? hw0 : hw0 * 0.45, col = pass === 0 ? rim : pass === 1 ? d < L * 0.35 ? inner : body4 : core;
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
  function walk(R6, x, y, a, L, { jit = 0.55, steer = 0.45, step: step2 = [2, 4], maxY = 1 / 0, d0 = 0 } = {}) {
    let pts = [[x, y, d0]], d = 0, cur = a;
    for (; d < L - 0.01; ) {
      let s = Math.min(L - d, R6.range(step2[0], step2[1]));
      cur += R6.range(-jit, jit) + (a - cur) * steer, x += Math.cos(cur) * s, y = clamp(y + Math.sin(cur) * s, 0.5, maxY), d += s, pts.push([x, y, d0 + d]);
    }
    return pts;
  }
  function makeCracks(R6, n, { len: len2 = [14, 40], dive = 0.85, maxY = 22, forks: forks2 = 0.5, x0 = [1, 5] } = {}) {
    let out = [];
    for (let i = 0; i < n; i++) {
      let side = i % 2 ? 1 : -1, dip = 0.06 + Math.pow(R6.next(), 1.7) * dive, L = R6.range(len2[0], len2[1]) * (1 - 0.5 * dip / (dive + 0.06)), a = side > 0 ? dip : Math.PI - dip, pts = walk(R6, side * R6.range(x0[0], x0[1]), R6.range(0.5, 1.5), a, L, { maxY }), c = { pts, len: L, t0: R6.range(0, 0.035), kids: [] };
      for (let j = 2; j < pts.length - 1; j++)
        if (R6.chance(forks2 * 0.4)) {
          let [fx, fy, fd] = pts[j];
          c.kids.push(walk(R6, fx, fy, a + R6.sign() * R6.range(0.45, 1), R6.range(3, 9) * (1 - 0.5 * j / pts.length), { maxY, d0: fd, jit: 0.7, step: [1.5, 3] }));
        }
      out.push(c);
    }
    return out;
  }
  function drawCracks(p, cracks5, g, heat2, hot, dark, lip2, k = 1) {
    if (k <= 0) return;
    let col = (d) => {
      let h = heat2(d);
      return h > 0.75 ? hot[0] : h > 0.5 ? hot[1] : h > 0.3 ? hot[2] : h > 0.12 ? hot[3] : dark;
    };
    for (let c of cracks5) {
      let G6 = g(c);
      if (!(G6 <= 0))
        for (let path2 of [c.pts, ...c.kids])
          for (let i = 1; i < path2.length; i++) {
            let [x0, y0, d0] = path2[i - 1], [x1, y1, d1] = path2[i];
            if (d0 >= G6) break;
            let f = d1 > G6 ? (G6 - d0) / (d1 - d0) : 1, ex = x0 + (x1 - x0) * f, ey = y0 + (y1 - y0) * f;
            p.line(x0, y0 + 1, ex, ey + 1, lip2, (u) => rand(Math.round(x0 + (ex - x0) * u), Math.round(y0 + (ey - y0) * u), 5) < 0.3 ? k * 0.8 : 0), p.line(x0, y0, ex, ey, (u) => col(d0 + (d1 - d0) * f * u), k);
            let h = heat2(d0);
            h > 0.12 && p.glow((x0 + ex) / 2, (y0 + ey) / 2, 4 + h * 4, hot[2], 0.22 * h * k);
          }
    }
  }
  function frontCrescent(p, x, dir, h, w, cols, k = 1) {
    if (h < 1 || w < 0.3 || k <= 0) return;
    let ry = h * 0.8, cy = -h * 0.2, rx = Math.max(2, h * 0.55), x0 = dir > 0 ? x - rx - w - 1 : x - 1, x1 = dir > 0 ? x + 1 : x + rx + w + 1;
    p.shade(x0, -h - 1, x1, 0, (px, py, out) => {
      if (py > 0) return;
      let ey = (py - cy) / ry;
      if (ey <= -1 || ey >= 1) return;
      let e2 = 1 - ey * ey, edge = rx * Math.sqrt(e2) - rx, wt = w * Math.pow(e2, 0.45), q = (edge - (px - x) * dir) / Math.max(0.5, wt);
      q < 0 || q > 1 || (out.c = q < 0.28 ? cols[0] : q < 0.62 ? cols[1] : cols[2], out.a = k * (ey < -0.8 ? 0.7 : 1) * (q > 0.7 ? 1.25 - q * 0.8 : 1));
    });
  }
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
  var SOOT, OUTLINE, LIGHT2, rockShape, init_lib = __esm({
    "src/fx/impacts/_lib.js"() {
      init_core();
      SOOT = hex("#0d0a12"), OUTLINE = hex("#1a1422"), LIGHT2 = Math.atan2(-1, -1);
      rockShape = (R6, n = 6) => Array.from({ length: n }, () => R6.range(0.7, 1.12));
    }
  });

  // src/fx/impacts/crit-hit.js
  var crit_hit_exports = {};
  __export(crit_hit_exports, {
    create: () => create2,
    meta: () => meta2
  });
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
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), X = 0, Y3 = -o.height, A = o.aim, floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [C[7], C[6], C[5], C[3]] }), bits = new Bits({ ground: floor }), lights = new Lights(), sp = spikes(R6, 14, A, { len: [11, 15], w: [1.8, 2.5], fwd: 1.4, back: 0.6, jag: 0.5 });
    [...sp].sort((a, b) => b.len - a.len).slice(0, 2).forEach((s) => s.len *= 1.3);
    let segs = Array.from({ length: 7 }, (_, i) => {
      let a = A + i / 7 * TAU;
      return { a, gap: R6.range(0.55, 0.85), dr: R6.range(0.08, 0.4) + 0.15 * Math.max(0, Math.cos(a - A)), w: 0.7 + 0.5 * Math.max(0, Math.cos(a - A)) };
    });
    lights.add(X, Y3, 84, C[5], 0.6, 0.5), lights.add(X, Y3, 30, WHITE, 0.7, 0.1), lights.add(X, -4, 44, C[4], 0.3, 0.45);
    for (let i = 0; i < 36; i++) {
      let back = R6.chance(0.22), a = (back ? A + Math.PI : A) + R6.range(-1, 1) * (back ? 0.6 : 0.8), v = R6.range(170, 430) * (back ? 0.6 : 1);
      ps.spawn(P.SPARK, X, Y3, Math.cos(a) * v, Math.sin(a) * v - 50, R6.range(0.15, 0.5), WHITE, 1, R6.chance(0.3) ? R6.range(0, 0.04) : 0);
    }
    for (let i = 0; i < 10; i++) {
      let a = A + R6.range(-1, 1) * 1.1 - 0.35, v = R6.range(110, 280);
      bits.add({ kind: B.SHARD, x: X, y: Y3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: 0.8, drag: 0.7, bounce: 0.35, life: R6.range(0.55, 0.85), a: R6.range(0, TAU), va: R6.range(-25, 25), s: R6.range(2, 4.5), c: R6.pick([C[7], C[6], C[6], C[5]]) });
    }
    for (let i = 0; i < 12; i++) {
      let a = A - Math.PI / 2 + R6.range(-1.4, 1.4), v = R6.range(35, 110);
      ps.spawn(P.MOTE, X + Math.cos(a) * 4, Y3 + Math.sin(a) * 4, Math.cos(a) * v, Math.sin(a) * v - 15, R6.range(0.35, 0.7), R6.pick([C[6], C[5], C[5]]), 0.6, R6.range(0, 0.05));
    }
    for (let i = 0; i < 5; i++) {
      let a = R6.range(0, TAU), d = R6.range(14, 34);
      ps.spawn(P.STAR, X + Math.cos(a) * d, Y3 + Math.sin(a) * d * 0.8, 0, -4, R6.range(0.22, 0.38), R6.chance(0.5) ? C[6] : WHITE, R6.range(1.6, 3), R6.range(0.08, 0.32));
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
          brokenRing(p, X, Y3, r, th, segs, brk, C[i], C[Math.max(2, i - 2)], u < 0.6 ? 1 : (1 - u) / 0.4, 1, 0), u < 0.6 && p.glowRing(X, Y3, r, 6, C[5], 0.35 * Math.pow(1 - u / 0.6, 2));
        }
        bits.draw(p), ps.draw(p);
        let f = (t - 0.04) / 0.28;
        f > 0 && f < 1 && (flare2(p, X, Y3, 64 * Math.pow(1 - f, 1.3), 1 - f, C), p.glow(X, Y3, 56, C[5], 0.4 * (1 - f)));
        for (let i = 0; i < KEYS.length - 1; i++)
          if (t >= KEYS[i][0] && t < KEYS[i + 1][0]) {
            let [, sc, th, a, cols] = KEYS[i];
            star(p, X, Y3, sp, sc, th, cols.map((j) => C[j]), a, 2.6);
          }
        let pop = Math.exp(-t / 0.05);
        pop > 0.02 && (p.glow(X, Y3, 44, C[5], 0.4 * pop), p.glow(X, Y3, 12, WHITE, 0.6 * pop)), lights.draw(p);
      }
    };
  }
  var meta2, KEYS, init_crit_hit = __esm({
    "src/fx/impacts/crit-hit.js"() {
      init_core();
      init_lib();
      meta2 = {
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
    }
  });

  // src/fx/impacts/blunt-hit.js
  var blunt_hit_exports = {};
  __export(blunt_hit_exports, {
    create: () => create3,
    meta: () => meta3
  });
  function create3(o) {
    let C = fit(o.palette, 7), R6 = new Rng(o.seed), X = 0, Y3 = -o.height, PH = R6.range(0, TAU), floor = () => 0, WARM5 = hex(o.warm), DUST5 = hex(o.dust), st = stone(o.clod), lights = new Lights(), bits = new Bits({ ground: floor });
    lights.add(X, Y3, 48, WARM5, 0.6, 0.4), lights.add(X, Y3, 16, WHITE, 0.6, 0.07), lights.add(X, -2, 36, WARM5, 0.25, 0.4);
    let wedges = Array.from({ length: 9 }, (_, i) => ({ a: i / 9 * TAU + R6.range(-0.2, 0.2), len: R6.range(6, 15), w: R6.range(3.2, 5), r0: R6.range(13, 16), t0: R6.range(0.015, 0.04), out: R6.range(0.04, 0.06), back: R6.range(0.09, 0.14) })), puffs = Array.from({ length: 30 }, (_, i) => {
      let a = i / 30 * TAU + R6.range(-0.12, 0.12), side = Math.abs(Math.cos(a)), v = R6.range(40, 140) * (0.6 + 0.5 * side);
      return { x: X + Math.cos(a) * 9, y: Y3 + Math.sin(a) * 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, r: R6.range(2.4, 6.2) * (0.75 + 0.35 * side), life: R6.range(0.35, 0.85), max: 0, t0: R6.range(0.03, 0.1), lift: R6.range(4, 16) };
    });
    for (let i = 0; i < 5; i++)
      puffs.push({ x: X + R6.range(-6, 6), y: Y3 - R6.range(3, 6), vx: R6.range(-30, 30), vy: -R6.range(20, 45), r: R6.range(3.5, 5.5), life: R6.range(0.6, 0.85), max: 0, t0: R6.range(0.05, 0.1), lift: R6.range(14, 24) });
    for (let q of puffs) q.max = q.life;
    for (let i = 0; i < 5; i++) {
      let s = R6.sign(), a = -Math.PI / 2 + s * R6.range(0.5, 1.3), v = R6.range(70, 140);
      bits.add({ kind: B.CHUNK, x: X + s * R6.range(4, 8), y: Y3 + R6.range(-3, 3), vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1, drag: 0.6, bounce: 0.28, life: R6.range(0.65, 0.85), a: R6.range(0, TAU), va: s * R6.range(8, 16), s: R6.chance(0.4) ? 2 : 1, pts: rockShape(R6), pvy: 0 });
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
            for (let i = 0; i < 2; i++) kicks.push({ x: b.x, y: -1, vx: R6.sign() * R6.range(8, 22), vy: -R6.range(3, 10), r: R6.range(1.2, 2), life: 0.4, max: 0.4, t0: 0 });
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
          let r = q.r * (0.7 + (1 - k) * 0.85), a = Math.pow(k, 1.25) * Math.min(1, (t - q.t0) / 0.03), c = mix(DUST5, WARM5, clamp(1 - (t - 0.03) / 0.25) * 0.55);
          p.disc(q.x, q.y, r, c, (d) => 0.58 * a * (1 - d * d * 0.75)), p.disc(q.x - r * 0.22, q.y - r * 0.32, r * 0.58, mix(c, WHITE, 0.55), (d) => 0.48 * a * (1 - d * d));
        }
        for (let b of bits.list) rock(p, b, st);
        if (t < 0.058) {
          let f = t < 0.025 ? 0 : 1, R05 = f ? 13.5 : 11.5;
          p.shade(X - R05 * 1.4, Y3 - R05 * 1.4, X + R05 * 1.4, Y3 + R05 * 1.4, (x, y) => {
            let dx = x - X, dy = (y - Y3) * (f ? 1.25 : 1.1), d = Math.hypot(dx, dy), ro = lump(R05, Math.atan2(dy, dx), PH + f * 0.6);
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
          let ca = Math.cos(w.a), sa = Math.sin(w.a), r0 = w.r0 + 2 * s, hw = w.w * (0.6 + 0.4 * s) / 2, tip = [X + ca * r0, Y3 + sa * r0], end = [X + ca * (r0 + L), Y3 + sa * (r0 + L)], n = [-sa * hw, ca * hw], wedge = (g) => [[tip[0] - ca * g, tip[1] - sa * g], [end[0] + n[0] * (1 + g * 0.45) + ca * g, end[1] + n[1] * (1 + g * 0.45) + sa * g], [end[0] - n[0] * (1 + g * 0.45) + ca * g, end[1] - n[1] * (1 + g * 0.45) + sa * g]];
          p.poly(wedge(1), C[1]), p.poly(wedge(0), u < w.out + 0.02 ? WHITE : C[5]);
        }
        let pop = Math.exp(-t / 0.06);
        pop > 0.02 && p.glow(X, Y3, 28, WARM5, 0.5 * pop), lights.draw(p);
      }
    };
  }
  var meta3, lump, init_blunt_hit = __esm({
    "src/fx/impacts/blunt-hit.js"() {
      init_core();
      init_lib();
      meta3 = {
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
    }
  });

  // src/fx/melee/sword-slash.js
  var sword_slash_exports = {};
  __export(sword_slash_exports, {
    act: () => act,
    create: () => create4,
    meta: () => meta4
  });
  function onArc(s, r, a) {
    let lx = Math.cos(a) * r, ly = Math.sin(a) * r * s.sy, c = Math.cos(s.rot), n = Math.sin(s.rot);
    return [s.cx + lx * c - ly * n, s.cy + lx * n + ly * c];
  }
  function crescent(p, s, ta, L, W4, age) {
    if (Math.abs(L) < 0.02 || W4 < 0.3) return;
    let R6 = s.ramp, n = R6.length, dir = Math.sign(L), span = Math.abs(L), c = Math.cos(s.rot), sn = Math.sin(s.rot), B4 = s.R + 2;
    p.shade(s.cx - B4, s.cy - B4, s.cx + B4, s.cy + B4, (x, y, out) => {
      let dx = x - s.cx, dy = y - s.cy, lx = dx * c + dy * sn, ly = (-dx * sn + dy * c) / s.sy, r = Math.hypot(lx, ly);
      if (r > s.R + 0.5 || r < s.R - W4 - 1) return;
      let u = dir * (Math.atan2(ly, lx) - ta) % TAU;
      if (u < 0 && (u += TAU), u > span) return;
      let v = u / span, w = W4 * Math.pow(Math.sin(Math.PI * Math.pow(v, 2.2)), 0.6);
      if (w < 0.35) return;
      let q = (s.R - r) / w;
      if (q < 0 || q > 1) return;
      let ci = q < 0.22 && age < 0.5 ? 0 : Math.round(q * (n - 1) * 0.75 + age * 2.4 - v * 0.8 + 0.4);
      out.c = R6[n - 1 - clamp(ci, 0, n - 1)], out.a = Math.min(1, v / 0.4);
    });
    for (let u = 0; u <= span; u += 0.3) {
      let [x, y] = onArc(s, s.R - W4 * 0.4, ta + dir * u);
      p.glow(x, y, 5 + W4, R6[n - 3], 0.22 * (1 - age) * (u / span));
    }
  }
  function drawSlash(p, s, t) {
    let u = t - s.t0;
    if (u < 0) return;
    let span = s.a1 - s.a0, head4 = ease.outExpo(clamp(u / s.sweep)), tail2 = smooth(s.sweep + s.hold, s.sweep + s.hold + s.trail, u), age = clamp(u / (s.sweep + s.hold + s.trail));
    tail2 < 1 && crescent(p, s, s.a0 + span * tail2, span * (head4 - tail2), s.W * (1 - tail2 * 0.55), age);
    let th = 0.7 * (1 - clamp((u - s.sweep - s.hold) / (s.trail + 0.2)));
    if (tail2 > 0.02 && th > 0)
      for (let k = 0; k <= tail2; k += 0.6 / (Math.abs(span) * s.R)) {
        let [x, y] = onArc(s, s.R - 0.5, s.a0 + span * k);
        p.dot(x, y, s.ramp[1], th * (0.4 + 0.6 * k));
      }
  }
  function tipOf(s) {
    let [x, y] = onArc(s, s.R - s.W * 0.3, s.a1), [x2, y2] = onArc(s, s.R - s.W * 0.3, s.a1 + Math.sign(s.a1 - s.a0) * 0.05), l = Math.hypot(x2 - x, y2 - y) || 1;
    return { x, y, dx: (x2 - x) / l, dy: (y2 - y) / l };
  }
  function create4(o) {
    let C = fit(o.palette, 7), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), R05 = o.radius, a0 = -2.55, a1 = 0.95, A = { cx: 6, cy: -26, R: R05, sy: 0.6, rot: -0.38, a0, a1, W: 12, t0: 0, sweep: 0.06, hold: 0.06, trail: 0.24, ramp: C }, E2 = { ...A, R: R05 * (33 / 42), W: R05 * (4.5 / 42), a0: a0 + (a1 - a0) * 0.1, a1: a1 - (a1 - a0) * (0.15 / 3.5), t0: 0.017, hold: 0.03, trail: 0.2, ramp: C.slice(0, 6) }, tip = tipOf(A), t = 0, landed = !1;
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
        drawSlash(p, E2, t), drawSlash(p, A, t);
        let g = t - A.sweep * 0.6;
        if (g > 0 && g < 0.22 && sparkle(p, tip.x, tip.y, 9 * ease.outBack(Math.min(1, g / 0.05)) * (1 - g / 0.22), C[5], C[3], 0.6), t < 0.3) {
          let [x, y] = onArc(A, A.R - 4, A.a0 + (A.a1 - A.a0) * ease.outExpo(clamp(t / A.sweep)));
          p.glow(x, y, 40, C[3], 0.5 * (1 - t / 0.3));
        }
        ps.draw(p);
      }
    };
  }
  var meta4, GUARD, WIND, CUT, DOWN, act, init_sword_slash = __esm({
    "src/fx/melee/sword-slash.js"() {
      init_core();
      meta4 = {
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
    }
  });

  // src/fx/melee/thrust.js
  var thrust_exports = {};
  __export(thrust_exports, {
    act: () => act2,
    create: () => create5,
    meta: () => meta5
  });
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
    let C = fit(o.palette, 7), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), lights = new Lights(), HX3 = 9, HY4 = -20, TX2 = HX3 + o.reach, TY2 = HY4, streaks2 = [-7, -4, -2, 0, 2, 4, 7].map((off2) => ({ off: off2, x0: HX3 + 1 + Rg.range(0, 5) + Math.abs(off2) * 0.6, t0: Rg.range(0, 0.02) + Math.abs(off2) * 3e-3, w: off2 === 0 ? 2 : 1, hot: off2 === 0, len: Rg.range(0.75, 1) })), lines2 = [], t = 0, struck = !1;
    return {
      update(dt) {
        if (t += dt, t < OUT2 + 0.08 && Rg.chance(0.5)) {
          let s = Rg.sign();
          lines2.push({ x: HX3 + Rg.range(0, o.reach * 0.6), y: HY4 + s * Rg.range(7, 17), l: Rg.range(18, 42), v: Rg.range(200, 340), t });
        }
        for (let i = lines2.length - 1; i >= 0; i--) t - lines2[i].t > 0.24 && lines2.splice(i, 1);
        for (let l of lines2) l.x += l.v * dt;
        if (!struck && t >= OUT2) {
          struck = !0, lights.add(TX2, TY2, 44, C[4], 0.45, 0.3), lights.add(TX2, TY2, 14, WHITE, 0.6, 0.06);
          for (let i = 0; i < 12; i++) {
            let a = Rg.range(-0.55, 0.45), sp = Rg.range(150, 330);
            ps.spawn(P.SPARK, TX2, TY2, Math.cos(a) * sp, Math.sin(a) * sp - 30, Rg.range(0.12, 0.35));
          }
          for (let i = 0; i < 10; i++) {
            let a = Rg.range(-0.9, 0.9) + (Rg.chance(0.3) ? Math.PI : 0), sp = Rg.range(40, 120);
            ps.spawn(P.MOTE, TX2 + Rg.range(-6, 2), TY2 + Rg.range(-2, 2), Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.25, 0.5), Rg.chance(0.5) ? C[5] : C[4], 0.6);
          }
          for (let i = 0; i < 4; i++) ps.spawn(P.STAR, TX2 + Rg.range(-10, 8), TY2 + Rg.range(-9, 9), 0, -3, Rg.range(0.2, 0.4), Rg.chance(0.5) ? C[5] : WHITE, Rg.range(1, 2), Rg.range(0.06, 0.2));
        }
        ps.update(dt), lights.update(dt);
      },
      draw(p) {
        t < 0.05 && sparkle(p, HX3 + 2, HY4, 5 * (1 - t / 0.05) + 1, C[5], C[3], 0.4);
        for (let l of lines2) {
          let k = (t - l.t) / 0.24;
          for (let d = 0; d < l.l * (1 - k * 0.6); d++) p.dot(l.x - d, l.y, d < 3 ? WHITE : d < l.l * 0.4 ? C[5] : C[3], (1 - d / l.l) * (1 - k));
        }
        let pull = smooth(OUT2 + HOLD, OUT2 + HOLD + PULL, t);
        for (let s of streaks2) {
          let u = clamp((t - s.t0) / OUT2), head4 = ease.outExpo(u);
          if (u <= 0 || pull >= 1) continue;
          let y0 = HY4 + s.off, end = s.x0 + (TX2 - s.x0) * s.len, x1 = s.x0 + (end - s.x0) * head4, xa = s.x0 + (end - s.x0) * Math.max(pull, head4 * 0.35 * (1 - s.len) * 3), yAt = (x) => y0 + (TY2 - y0) * clamp((x - s.x0) / (TX2 - s.x0)) * 0.85;
          for (let x = xa; x <= x1; x += 0.5) {
            let v = (x - xa) / Math.max(1, x1 - xa), c = v > 0.88 ? WHITE : s.hot ? v > 0.35 ? C[6] : C[5] : v > 0.55 ? C[5] : v > 0.25 ? C[4] : C[3];
            p.dot(x, yAt(x), c, v < 0.12 ? v / 0.12 : 1), s.w > 1 && v > 0.1 && p.dot(x, yAt(x) + 1, v > 0.6 ? C[5] : C[3], v < 0.2 ? v / 0.2 : 1);
          }
        }
        t < OUT2 + HOLD + PULL && p.glowLine(HX3 + (TX2 - HX3) * pull, HY4, HX3 + (TX2 - HX3) * ease.outExpo(clamp(t / OUT2)), TY2, 6, C[4], 0.22 * (1 - pull));
        let q = t - OUT2;
        if (q >= 0 && q < 0.4) {
          let g = ease.outBack(clamp(q / 0.04), 2.4) * (1 - smooth(0.08, 0.4, q)) * (1 + 0.12 * Math.sin(q * 70));
          longStar(p, TX2, TY2, 24 * g, 1 - q / 0.4, C);
        }
        if (q >= 0 && q < 0.2) {
          let k = q / 0.2, rx = 2 + 7 * ease.outCubic(k), ry = 4 + 12 * ease.outCubic(k);
          for (let a = 0; a < TAU; a += 0.05) p.dot(TX2 + 4 + 10 * k + Math.cos(a) * rx, TY2 + Math.sin(a) * ry, k < 0.3 ? WHITE : C[5], 1.15 - k);
        }
        ps.draw(p), lights.draw(p);
      }
    };
  }
  var meta5, STANCE, BACK, LUNGE, act2, OUT2, HOLD, PULL, init_thrust = __esm({
    "src/fx/melee/thrust.js"() {
      init_core();
      meta5 = {
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
    }
  });

  // src/fx/melee/_lib.js
  function through(x, y, th, dir, R6, span, at2 = 0.55, extra = {}) {
    let a = th - dir * Math.PI / 2;
    return swing({ cx: x - Math.cos(a) * R6, cy: y - Math.sin(a) * R6, R: R6, sy: 1, rot: 0, a0: a - dir * span * at2, dir, span, ...extra });
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
    let m = ly + s.k * s.R, A = s.sy * s.sy - s.k * s.k, B4 = 2 * m * s.k, Cc = lx * lx * s.sy * s.sy + m * m, r = (-B4 + Math.sqrt(B4 * B4 + 4 * A * Cc)) / (2 * A);
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
  function trace(p, s, r, u0, u1, c, a, half = 0, step2 = 0.6) {
    let du = step2 / Math.max(4, r);
    for (let u = u0; u <= u1; u += du) {
      let g = s.a0 + s.dir * u;
      if (half && (Math.sin(g) < 0 ? -1 : 1) !== half) continue;
      let [x, y] = onSwing(s, r, u), k = typeof a == "function" ? a(u) : a;
      k > 0 && p.dot(x, y, typeof c == "function" ? c(u) : c, k);
    }
  }
  function glowAlong(p, s, r, u0, u1, rad, c, k, half = 0, step2 = 0.35) {
    for (let u = u0; u <= u1; u += step2) {
      let g = s.a0 + s.dir * u;
      if (half && (Math.sin(g) < 0 ? -1 : 1) !== half) continue;
      let [x, y] = onSwing(s, r, u), kk = typeof k == "function" ? k(u) : k;
      kk > 4e-3 && p.glow(x, y, rad, c, kk);
    }
  }
  function slash(p, s, t, half = 0) {
    let u = t - s.t0;
    if (u < 0) return;
    let R6 = s.ramp, n = R6.length, life = s.sweep + s.hold + s.trail, hot = s.hot ?? 0, head4 = ease.outExpo(clamp(u / s.sweep)), tail2 = smooth(s.sweep + s.hold, life, u), age = clamp(u / life), U = s.span * head4, T2 = s.span * tail2, W4 = s.W * (1 - tail2 * 0.55);
    tail2 < 1 && U - T2 > 0.01 && (smear(p, s, T2, U, W4, (uu, r, out) => {
      let v = (uu - T2) / (U - T2), w = W4 * Math.pow(Math.sin(Math.PI * Math.pow(v, s.lens ? 1 : 2.2)), s.lens ? 0.75 : 0.6);
      if (w < 0.35) return;
      let q = (s.R - r) / w;
      if (q < 0 || q > 1) return;
      let ci = q < 0.22 && age < 0.5 || q < hot * 0.7 ? 0 : Math.round(q * (n - 1) * 0.75 + age * 2.4 - v * 0.8 + 0.4 - hot * 3);
      out.c = R6[n - 1 - clamp(ci, 0, n - 1)], out.a = Math.min(1, v / (s.lens ? 0.1 : 0.4));
    }, half), glowAlong(p, s, s.R - W4 * 0.4, T2, U, 5 + W4, R6[n - 3], (uu) => (0.22 + hot * 0.3) * (1 - age) * ((uu - T2) / (U - T2)), half, 0.3));
    let th = 0.7 * (1 - clamp((u - s.sweep - s.hold) / (s.trail + 0.2)));
    tail2 > 0.02 && th > 0 && trace(p, s, s.R - 0.5, 0, T2, R6[2], (uu) => th * (0.4 + 0.6 * uu / s.span), half);
  }
  function shavings(ps, R6, s, n, colors, from = 0.3) {
    for (let i = 0; i < n; i++) {
      let [x, y] = onSwing(s, s.R, s.span * R6.range(from, 1)), ox = x - s.cx, oy = y - s.cy, l = Math.hypot(ox, oy) || 1, sp = R6.range(30, 100);
      ps.spawn(P.MOTE, x, y, ox / l * sp, Math.min(25, oy / l * sp) - 10, R6.range(0.25, 0.55), R6.pick(colors), 0.6);
    }
  }
  function stone2(c) {
    return c = hex(c), { light: mix(scale(c, 1.35), WHITE, 0.08), body: c, shade: scale(c, 0.64), dust: mix(scale(c, 1.2), rgb(150, 140, 150), 0.3), dark: scale(c, 0.42) };
  }
  function rock2(p, b, st) {
    let r = 0.6 + b.s * 0.75, fade = Math.min(1, b.life / 0.5), lx = Math.cos(b.a) * r * 0.4, ly = Math.sin(b.a) * r * 0.4;
    p.shade(b.x - r - 1, b.y - r - 1, b.x + r + 1, b.y + r + 1, (x, y, out) => {
      let dx = x - b.x, dy = y - b.y, d = Math.hypot(dx * 1.15, dy);
      if (d > r + 0.9) return;
      let lit = dx * lx + dy * ly;
      out.c = d > r ? OUTLINE2 : lit < -0.4 ? st.light : lit > 0.6 ? st.shade : st.body, out.a = fade;
    });
  }
  function cracks(R6, x0, n, reach, depth = 7, bias = 0.3) {
    let out = [];
    for (let i = 0; i < n; i++) {
      let side = R6.chance(0.5 + bias * 0.5) ? 1 : -1, L = reach * R6.range(0.45, 1) * (i < 2 ? 1 : 0.7), pts = [[x0 + side * R6.range(0, 1.5), 0]], x = pts[0][0], y = 0;
      for (; Math.abs(x - x0) < L && y < depth; )
        if (x += side * R6.range(1.5, 3.5), y = Math.min(depth, Math.max(0, y + R6.range(-0.6, 1.6) * (Math.abs(x - x0) > 3 ? 1 : 0.3))), pts.push([Math.round(x), Math.round(y)]), R6.chance(0.18) && pts.length > 3 && y < depth - 2) {
          let f = [[Math.round(x), Math.round(y)]], fx = x, fy = y;
          for (let j = R6.int(1, 3); j > 0; j--) fx += side * R6.range(1, 3), fy += R6.range(0.8, 2), f.push([Math.round(fx), Math.round(Math.min(depth + 1, fy))]);
          out.push({ pts: f, at: Math.abs(x - x0) / reach, fork: !0 });
        }
      out.push({ pts, at: 0, fork: !1 });
    }
    return out;
  }
  function star2(p, x, y, spikes2, sc, th, core, body4, inner, rim) {
    for (let pass of [0, 1, 2])
      for (let s of spikes2) {
        let c = Math.cos(s.a), sn = Math.sin(s.a), L = s.len * sc;
        for (let d = 0; d <= L; d += 0.5) {
          let hw0 = s.w * th * (1 - d / L) * Math.min(1, 0.5 + d / 3), hw = pass === 0 ? hw0 + 0.8 : pass === 1 ? hw0 : hw0 * 0.45;
          if (pass === 2 && d > L * 0.55) break;
          for (let o = -hw; o <= hw; o += 0.5) p.px(x + c * d - sn * o, y + sn * d + c * o, pass === 0 ? rim : pass === 1 ? d < L * 0.35 ? inner : body4 : core);
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
  var swing, slashEnd, OUTLINE2, init_lib2 = __esm({
    "src/fx/melee/_lib.js"() {
      init_core();
      swing = (o) => ({ cx: 0, cy: 0, R: 30, sy: 1, rot: 0, a0: 0, dir: 1, k: 0, ...o });
      slashEnd = (s) => travel({ ...s, R: s.R - s.W * 0.3 }, s.span);
      OUTLINE2 = hex("#1a1422");
    }
  });

  // src/fx/melee/dagger-flurry.js
  var dagger_flurry_exports = {};
  __export(dagger_flurry_exports, {
    act: () => act3,
    create: () => create6,
    meta: () => meta6
  });
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
  var meta6, BASE, near, far, act3, EVERY, CUTS, init_dagger_flurry = __esm({
    "src/fx/melee/dagger-flurry.js"() {
      init_core();
      init_lib2();
      meta6 = {
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
    }
  });

  // src/fx/melee/claw-swipe.js
  var claw_swipe_exports = {};
  __export(claw_swipe_exports, {
    act: () => act4,
    create: () => create7,
    meta: () => meta7
  });
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
          let S = m.s.span, head4 = S * ease.outExpo(clamp(u / RAKE)), c = smooth(CLOSE0, CLOSE0 + CLOSE, u), lo = S / 2 * c, hi = Math.min(head4, S - S / 2 * c), heat2 = heatAt(m);
          hi - lo > 0.02 && (smear(p, m.s, lo, hi, m.W, (uu, r, out) => {
            let v = uu / S, w = m.W * Math.pow(Math.sin(Math.PI * v), 1.15) * (1 - 0.55 * c), off2 = Math.abs(r - (m.s.R - m.W / 2)) / (w / 2 + 0.01);
            if (w < 0.5 || off2 > 1) return;
            let ci = Math.round((1 - heat2) * 5.2 + off2 * 1.6 + (head4 < S ? (S - uu) / S : 0) * 0.5);
            out.c = C[n - 1 - clamp(ci, 0, n - 2)];
          }, 0, 2), glowAlong(p, m.s, m.s.R - m.W / 2, lo, hi, 11, C[4], 0.42 * heat2 * heat2, 0, 0.2));
          let k = 0.8 * (1 - clamp((u - CLOSE0 - CLOSE * 0.5) / 0.4));
          c > 0.05 && k > 0 && (trace(p, m.s, m.s.R - m.W / 2, 0.04 * S, lo, C[2], k), trace(p, m.s, m.s.R - m.W / 2, S - lo, 0.96 * S, C[2], k));
          let g = u - RAKE * 0.4;
          g > 0 && g < 0.16 && sparkle(p, m.end.x, m.end.y, 5 * ease.outBack(Math.min(1, g / 0.04)) * (1 - g / 0.16), C[6], C[4], 0.4);
        }
        drips.draw(p), ps.draw(p), lights.draw(p);
      }
    };
  }
  var meta7, READY_, HIGH, act4, RAKE, STAGGER, CLOSE0, CLOSE, init_claw_swipe = __esm({
    "src/fx/melee/claw-swipe.js"() {
      init_core();
      init_lib2();
      meta7 = {
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
    }
  });

  // src/fx/melee/heavy-cleave.js
  var heavy_cleave_exports = {};
  __export(heavy_cleave_exports, {
    act: () => act5,
    create: () => create8,
    meta: () => meta8
  });
  function create8(o) {
    let C = fit(o.palette, 8), n = C.length, R6 = new Rng(o.seed), st = stone2(o.stone), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [C[6], C[5], C[4], C[3]] }), bits = new Bits({ ground: floor }), lights = new Lights(), A = swing({ cx: 3, cy: -22, R: 37, sy: 0.88, rot: 0.32, a0: -2.45, dir: 1 }), U1 = 0;
    for (; onSwing(A, A.R, U1)[1] < -0.5 && U1 < 4; ) U1 += 5e-3;
    let E2 = { ...A, R: A.R * 0.76 }, W4 = 16, WE = 5, [X] = onSwing(A, A.R - 2, U1), GLINT = onSwing(A, A.R - 3, 0), lines2 = cracks(R6, X, 4, 40, 7, 0.4), spikes2 = [-Math.PI, -2.7, -2.15, -1.62, -1.05, -0.45, 0].map((a, i) => ({ a: a + R6.range(-0.08, 0.08), len: (i === 0 || i === 6 ? 20 : i === 3 ? 15 : 9) + R6.range(0, 4), w: 1.6 + R6.range(0, 0.6) })), shards = [-2.5, -1.9, -1.2, -0.6].map((a) => ({ a: a + R6.range(-0.15, 0.15), r: 8 + R6.range(0, 3), v: R6.range(80, 130), arc: R6.range(0.35, 0.6) })), t = 0, hit = !1, arc = (p, s, w0, lag, rim) => {
      let tt = t - lag, U = U1 * head(tt), T2 = U1 * smooth(HIT + HOLD2, HIT + HOLD2 + TRAIL, tt);
      if (U < 0.02 || T2 >= U - 0.02) return;
      let gone = smooth(HIT + HOLD2, HIT + HOLD2 + TRAIL, tt), shrink = 1 - 0.75 * gone;
      smear(p, s, T2, U, w0, (u, r, out) => {
        let age = Math.max(0, tt - passedAt(u / U1)), v = (u - T2) / (U - T2), w = w0 * shrink * Math.pow(Math.sin(Math.PI * Math.pow(v, 2.2)), 0.6);
        if (w < 0.4) return;
        let q = (s.R - r) / w;
        if (q < 0 || q > 1) return;
        let ci = rim && q < 0.22 && age < 0.12 ? 0 : Math.round(q * (n - 1) * 0.62 + age * 7 + Math.max(0, tt - HIT) * 10 - v * 0.8 + (rim ? 0.7 : 1.7));
        out.c = C[n - 1 - clamp(ci, 0, n - 1)], out.a = Math.min(1, v / 0.35) * (1.2 - gone);
      }), rim && glowAlong(p, s, s.R - w0 * 0.4, T2, U, 7 + w0 * 0.5, C[4], (u) => 0.26 * Math.exp(-Math.max(0, tt - passedAt(u / U1)) / 0.2) * ((u - T2) / (U - T2)));
    };
    return {
      update(dt) {
        if (t += dt, t < RAISE - 0.04 && R6.chance(0.35)) {
          let a = R6.range(0, TAU), D25 = R6.range(14, 26), T2 = R6.range(0.14, 0.2), v = D25 * 3 / (Math.exp(3 * T2) - 1);
          ps.spawn(P.STREAK, GLINT[0] + Math.cos(a) * D25, GLINT[1] + Math.sin(a) * D25, -Math.cos(a) * v, -Math.sin(a) * v, T2, R6.chance(0.5) ? C[5] : C[4]);
        }
        if (t > RAISE && t < HIT && R6.chance(0.7)) {
          let u = U1 * head(t) * R6.range(0.6, 1), [x, y] = onSwing(A, A.R - R6.range(0, 6), u);
          ps.spawn(P.EMBER, x, y, R6.range(-20, 20), R6.range(-40, -10), R6.range(0.5, 1.1), C[4], R6.range(1, 2));
        }
        if (!hit && t >= HIT) {
          hit = !0, lights.add(X, -6, 26, WHITE, 0.9, 0.1), lights.add(X, -12, 64, C[4], 0.5, 0.8);
          for (let i = 0; i < 26; i++) {
            let a = -Math.PI / 2 + R6.range(-1.2, 1.35), sp = R6.range(140, 360);
            ps.spawn(P.SPARK, X, -1, Math.cos(a) * sp, Math.sin(a) * sp - 40, R6.range(0.15, 0.5));
          }
          for (let i = 0; i < 20; i++) {
            let s = i % 2 ? -1 : 1;
            ps.spawn(P.SMOKE, X + s * R6.range(0, 8), -R6.range(2, 6), s * R6.range(45, 135), -R6.range(2, 12), R6.range(1, 1.45), st.dust, R6.range(5, 8.5), R6.range(0, 0.07), PF.BIG);
          }
          for (let i = 0; i < 4; i++) ps.spawn(P.SMOKE, X + R6.range(-4, 4), -R6.range(3, 8), R6.range(-15, 15), -R6.range(40, 90), R6.range(1, 1.45), st.dust, R6.range(4, 6.5), R6.range(0.02, 0.1), PF.BIG);
          for (let i = 0; i < 8; i++) ps.spawn(P.DUST, X + R6.range(-4, 4), -R6.range(1, 4), R6.range(-60, 60), -R6.range(8, 30), R6.range(0.35, 0.7), st.dust, R6.range(2, 3.5));
          for (let i = 0; i < 44; i++) {
            let a = -Math.PI / 2 + R6.range(-0.7, 1), sp = R6.range(60, 230);
            ps.spawn(P.GRIT, X + R6.range(-3, 3), -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(1, 1.5), R6.pick([st.light, st.body, st.body, st.shade]), R6.chance(0.35) ? 2 : 1);
          }
          for (let i = 0; i < 6; i++)
            bits.add({ kind: B.CHUNK, x: X + R6.range(-3, 3), y: -2, vx: R6.range(-50, 110), vy: -R6.range(120, 260), g: 1, drag: 0.4, bounce: 0.3, life: R6.range(1.15, 1.5), a: R6.range(0, TAU), va: R6.range(-14, 14), s: R6.int(1, 2) });
          for (let i = 0; i < 16; i++) ps.spawn(P.EMBER, X + R6.range(-8, 8), -R6.range(1, 6), R6.range(-50, 60), -R6.range(30, 110), R6.range(0.7, 1.5), C[4], R6.range(1, 2));
        }
        if (hit && t < HIT + 0.6 && R6.chance(0.12)) {
          let c = R6.pick(lines2), pt = R6.pick(c.pts);
          ps.spawn(P.EMBER, pt[0], pt[1] - 1, R6.range(-12, 12), -R6.range(20, 50), R6.range(0.5, 0.9), C[4], 1);
        }
        bits.update(dt);
        for (let b of bits.list)
          if (b.rest && !b.dusted) {
            b.dusted = !0;
            for (let i = 0; i < 2; i++) ps.spawn(P.DUST, b.x + R6.range(-1.5, 1.5), -0.5, R6.sign() * R6.range(8, 30), -R6.range(2, 12), R6.range(0.3, 0.6), st.dust, R6.range(1.3, 2.4));
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
              let T2 = Math.pow(clamp(1 - q / 0.8), 1.4) * (1.2 - d) - rand(x, y, 3) * 0.3;
              T2 > 0.08 ? p.dot(X + x, y, C[clamp(Math.round(T2 * 9), 1, 7)], fade) : p.dot(X + x, y, d < 0.5 ? st.dark : st.shade, (d < 0.9 - rand(x, y, 9) * 0.3 ? 1 : 1 - d) * fade);
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
          let heat2 = Math.pow(clamp(1 - q / 1.2), 1.2), fade = 1 - smooth(1.15, 1.5, q);
          for (let c of lines2) {
            let reach = 40 * ease.outCubic(clamp((q - c.at * 0.1) / 0.13)) * (c.fork ? 0.3 : 1);
            reach <= 0 || along(c.pts, reach, (x0, y0, x1, y1, d) => {
              let h = heat2 * (1 - d / 46) - (c.fork ? 0.12 : 0), col = h > 0.72 ? WHITE : h > 0.08 ? C[clamp(Math.round(h * 8), 1, 6)] : st.dark;
              y1 > 0.5 && p.line(x0 + 1, y0, x1 + 1, y1, st.dark, fade), p.line(x0, y0, x1, y1, col, fade), h > 0.25 && (d | 0) % 6 < 2 && p.glow(x1, y1, 6, C[4], 0.2 * h * fade);
            });
          }
          heat2 > 0 && p.glow(X, -2, 34, C[4], 0.32 * heat2 * fade);
          let k = q / 0.45;
          k < 1 && band(p, X, 0.5, 6 + 46 * ease.outCubic(k), 0.16, Math.max(1, 3 * (1 - k)), 1.15 - k, [st.body, st.light, C[4], C[6]], (g) => Math.sin(g) >= 0);
        }
        arc(p, E2, WE, 0.02, !1), arc(p, A, W4, 0, !0);
        let tail2 = U1 * smooth(HIT + HOLD2, HIT + HOLD2 + TRAIL, t), th = 0.8 * (1 - clamp((t - HIT - HOLD2) / (TRAIL + 0.25)));
        if (tail2 > 0.02 && th > 0 && trace(p, A, A.R - 0.5, 0, tail2, C[3], (u) => th * (0.4 + 0.6 * u / U1)), t > RAISE && t < HIT + 0.05) {
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
  var meta8, REST_, OVER, FLOOR2, act5, RAISE, SWING, HIT, HOLD2, TRAIL, head, passedAt, init_heavy_cleave = __esm({
    "src/fx/melee/heavy-cleave.js"() {
      init_core();
      init_lib2();
      meta8 = {
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
    }
  });

  // src/fx/projectiles/_lib.js
  function beat(t, period, n, seed2, life, fn) {
    for (let i = 0; i < n; i++) {
      let L = typeof life == "function" ? life(rng(seed2, i, 911)) : life;
      for (let age = wrap(t - i * period / n + 1e-7, period); age < L; age += period) fn(age, L, rng(seed2, i), i);
    }
  }
  var init_lib3 = __esm({
    "src/fx/projectiles/_lib.js"() {
      init_core();
    }
  });

  // src/fx/projectiles/arrow.js
  var arrow_exports = {};
  __export(arrow_exports, {
    draw: () => draw,
    meta: () => meta9
  });
  function draw(p, t, o) {
    let PL = fit(o.palette, 4), W4 = fit(o.wood, 4), ST = fit(o.steel, 4), wind2 = hex(o.wind), S = o.seed, D25 = meta9.duration, fr = Math.floor(t * 30 + 1e-6), ph = t / D25, left = -meta9.origin[0] + 2, LEN3 = 36;
    beat(t, D25, 9, S, (r) => r.range(0.14, 0.26), (age, life, r) => {
      let k = age / life, top = r.chance(0.5) ? -1 : 1, x0 = (r.chance(0.6) ? -3 : -LEN3 + 6) - age * r.range(160, 240), len2 = r.range(8, 16) * (0.5 + k), y = 0.5 + top * (r.range(3, 5) + k * r.range(1, 2.5));
      if (x0 - len2 < left) return;
      let c = k < 0.4 ? wind2 : mix(wind2, hex("#2a2540"), (k - 0.4) * 1.2);
      p.line(x0, y, x0 - len2, y, (u) => u < 0.25 && k < 0.4 ? mix(wind2, WHITE, 0.5) : c, (u) => u < 0.65 ? 1 : (1 - u) / 0.35);
    }), beat(t, D25, 6, S + 3, (r) => r.range(0.15, 0.25), (age, life, r) => {
      let k = age / life, cx = -LEN3 - 2 - age * r.range(100, 150), cy = 0.5 + r.sign() * r.range(2, 4), a = age * 30 + r.range(0, TAU), rr = 1.2 + k * 1.5;
      if (!(cx < left + 4))
        for (let i = 0; i < 4; i++) p.dot(cx + Math.cos(a + i * 0.5) * rr, cy + Math.sin(a + i * 0.5) * rr, wind2, (1 - k) * (1 - i * 0.2));
    }), p.line(-LEN3 + 11, 0, -7, 0, W4[2]);
    for (let x = -LEN3 + 14; x < -8; x += 6) p.px(x, 0, W4[3]);
    let pose = FLETCH[Math.floor(rand(fr, S) * 3)];
    p.sprite(pose, { a: PL[2], A: PL[3], c: PL[0], C: PL[1], k: W4[1], n: W4[0] }, -LEN3, -3), p.sprite(HEAD, { L: ST[3], s: ST[2], S: ST[2], d: ST[0], D: ST[1], b: W4[0], W: WHITE }, -7, -2);
    let g = ph * 2 % 1;
    g < 0.25 && sparkle(p, -5 + g * 16, -1, 1 + Math.round(2 * Math.sin(g / 0.25 * Math.PI)), WHITE, ST[3], 0.25);
  }
  var meta9, HEAD, FLETCH, init_arrow = __esm({
    "src/fx/projectiles/arrow.js"() {
      init_core();
      init_lib3();
      meta9 = {
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
    }
  });

  // src/fx/fire/_lib.js
  function pnoise(x, period, seed2 = 0) {
    let i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = rand(wrap(i, period), seed2), b = rand(wrap(i + 1, period), seed2);
    return (a + (b - a) * u) * 2 - 1;
  }
  function noiseFor(D25) {
    return D25 ? (tt, rate, seed2 = 0, off2 = 0) => {
      let P3 = Math.max(1, Math.round(rate * D25));
      return pnoise(tt / D25 * P3 + off2, P3, seed2);
    } : (tt, rate, seed2 = 0, off2 = 0) => noise(tt * rate + off2, seed2);
  }
  function looped(t, D25, count, seed2, make, draw37) {
    for (let i = 0; i < count; i++) {
      let r = rng(seed2, i), born = r.next() * D25, q = make(r, i);
      for (let age = wrap(t - born, D25); age < q.life; age += D25) draw37(q, age, i);
    }
  }
  function flameTongue(p, x, y, h, w, sx, N9, n, H3, layers = LAYERS, jit = 0.5, wob = 1.1) {
    if (!(h < 1))
      for (let [lw, lh, ri] of layers) {
        let L = h * lh, c = H3[ri];
        for (let r = 0; r <= L; r++) {
          let u = r / Math.max(1, L), half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + N9(9, n, r * 0.45) * jit;
          if (half < 0.3) continue;
          let cx = x + sx * u * u * lh + N9(4, n + 7, r * 0.2) * u * wob, Y3 = Math.round(y - r);
          for (let px = Math.round(cx - half), x1 = Math.round(cx + half); px <= x1; px++) p.px(px, Y3, c);
        }
      }
  }
  function flameBlade(p, x, y, ux, uy, len2, w, bend2, N9, n, H3, layers = LAYERS, jit = 0.5, wob = 1.1) {
    if (len2 < 1) return;
    let nx = -uy, ny = ux;
    for (let [lw, lh, ri] of layers) {
      let L = len2 * lh, c = H3[ri];
      for (let r = 0; r <= L; r += 0.5) {
        let u = r / Math.max(1, L), half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + N9(9, n, r * 0.45) * jit;
        if (half < 0.3) continue;
        let off2 = bend2 * u * u * lh + N9(4, n + 7, r * 0.2) * u * wob, cx = x + ux * r + nx * off2, cy = y + uy * r + ny * off2;
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
  function firePuff(p, x, y, k, size, frac3, H3, glowK = 0.18, tx = 0, ty = -1) {
    let age = 1 - k, n = H3.length, heat2 = Math.min(0.999, Math.pow(age, 0.62) + frac3 * 0.1), idx = Math.min(n - 2, Math.floor(heat2 * (n - 1))), r = size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = H3[idx];
    if (idx >= n - 2) return soft(p, x, y, r, c, Math.min(1, k * 3) * 0.85);
    solid(p, x, y, r, H3[Math.min(n - 1, idx + 2)]), r > 1.6 && ty > -0.99 && solid(p, x + tx * r * 1.5, y + ty * r * 1.5, r * 0.3, H3[Math.min(n - 1, idx + 1)]), solid(p, x - r * 0.16, y - r * 0.22, r * 0.78, c), r > 1.6 && solid(p, x + tx * r * 0.9, y + ty * r * 0.9, r * 0.42, c), idx <= 3 && r > 1.8 && solid(p, x - r * 0.28, y - r * 0.34, r * 0.36, H3[Math.max(0, idx - 1)]), idx < 6 && p.glow(x, y, r * 2.4 + 2, c, glowK * k);
  }
  function lick(p, x, y, k, s, H3) {
    let r = s * (0.4 + 0.6 * k);
    solid(p, x, y, r + 0.6, k > 0.5 ? H3[5] : H3[6]), k > 0.35 && solid(p, x, y - 0.3, r * 0.6, k > 0.7 ? H3[2] : H3[4]);
  }
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
    let sp = Math.hypot(vx, vy) || 1, ux = vx / sp, uy = vy / sp, len2 = Math.min(9, 1 + sp * 0.022), head4 = k > 0.6 ? cols[0] : k > 0.3 ? cols[1] : cols[2];
    p.line(x - ux * len2, y - uy * len2, x - ux * len2 * 0.4, y - uy * len2 * 0.4, k > 0.5 ? head4 : cols[cols.length - 1]), p.line(x - ux * len2 * 0.45, y - uy * len2 * 0.45, x, y, head4), p.glow(x, y, 3, head4, 0.45 * k);
  }
  function along2(x, v, a, k, t) {
    if (k <= 0) return [x + v * t + 0.5 * a * t * t, v + a * t];
    let e = Math.exp(-k * t), vt = a / k;
    return [x + vt * t + (v - vt) * (1 - e) / k, vt + (v - vt) * e];
  }
  function drift(x, y, vx, vy, t, ax, ay, kx, ky) {
    let X = along2(x, vx, ax, kx, t), Y3 = along2(y, vy, ay, ky, t);
    return [X[0], Y3[0], X[1], Y3[1]];
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
  function simDraw(p, ps, H3, layer) {
    let all = ps.list, rest = [], fire = [];
    for (let q of all) (q.k === P.FIRE ? fire : rest).push(q);
    let puffs = (back) => {
      for (let q of fire) q.delay <= 0 && !!(q.flag & PF.BACK) === back && firePuff(p, q.x, q.y, q.life / q.max, q.size, q.seed % 1, H3);
    };
    ps.list = rest, layer !== "front" && (ps.draw(p, "back"), puffs(!0)), layer !== "back" && (puffs(!1), ps.draw(p, "front")), ps.list = all;
  }
  function burn(p, t, T2, o) {
    let { H: H3, D: D25, NL: NL8, S } = o, HC = o.height, X = o.x ?? 0, Y3 = o.y ?? 0, W4 = o.spread ?? 6, G6 = o.glow ?? 1, N9 = (rate, seed2 = 0, off2 = 0) => NL8(t, rate, seed2, off2), fla = (tt) => 0.74 + 0.16 * NL8(tt, 7.3, S + 1) + 0.1 * NL8(tt, 19, S + 2), fl = fla(t), SMOKE2 = mix(SMOKE1, H3[6], 0.25), EMB = [H3[1], H3[2], H3[4], H3[6]], GLOW = mix(mix(H3[3], H3[4], 0.5), WHITE, 0.25), R6 = rng(S, 77), count = (rate) => Math.round(rate * D25), TT = T2.map(([dx, dy, h, w, back], i) => ({ dx: dx + R6.range(-0.3, 0.3), y: dy, h: 2 + HC * h * R6.range(0.92, 1.08), w: w * R6.range(0.92, 1.08), back, env: h, n: (S * 7 + i) * 13 })), lean = (tt) => NL8(tt, 0.67, S + 90) * (o.lean ?? 0.1), height2 = (i, tt) => {
      let { h, n } = TT[i], leap = Math.max(0, NL8(tt, 2.6, n + 70) - 0.55) * 1.4;
      return (h + 0.25 * h * NL8(tt, 3.3, n) + h * leap) * (0.9 + 0.1 * fla(tt));
    }, sweep = (i, tt, h) => NL8(tt, 2.2, TT[i].n + 40) * (1 + h * 0.08) + lean(tt) * h * 0.9 - clamp(TT[i].dx * 0.3, -2.5, 2.5), tip = (i, tt) => {
      let h = height2(i, tt);
      return [X + TT[i].dx + sweep(i, tt, h) * 0.85, Y3 + TT[i].y - h * 0.88 + 3, h];
    }, tongueAt = (i) => {
      let { dx, y, w, n, back } = TT[i], h = height2(i, t);
      flameTongue(p, X + dx, Y3 + y, h, w, sweep(i, t, h), N9, n, H3, back ? BACK_LAYERS : w > 2.2 ? BIG_LAYERS : LAYERS, 0.5, 1.1 + h * 0.04);
    };
    looped(t, D25, count(o.smoke ?? 12), S + 300, (r) => ({ x: r.range(-W4, W4) * 0.7, y: -HC * 0.8 - r.range(0, 6), vx: r.range(-2, 2), vy: -r.range(10, 17), life: r.range(...o.smokeLife ?? [1.6, 2.6]), s: r.range(0.7, 1.1) * (o.smokeSize ?? 3) }), (q, age) => {
      let [x, y] = drift(q.x, q.y, q.vx, q.vy, age, o.wind ?? 3, -20, 1.6, 1);
      smokePuff(p, X + x + NL8(t - age, 0.8, S + 60) * (1.5 + 2.5 * age), Y3 + y, 1 - age / q.life, q.s, SMOKE2);
    });
    let puffs = [];
    looped(t, D25, TT.length * count(o.puffs ?? 8), S + 200, (r, j) => {
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
    o.mid?.(fl), looped(t, D25, TT.length * count(o.licks ?? 4), S + 220, (r, j) => ({ i: j % TT.length, vx: r.range(-3, 3), vy: -r.range(12, 22), s: r.range(0.9, 1.6) * (0.8 + 0.5 * TT[j % TT.length].env), life: 0.26 }), (q, age) => {
      let [tx, ty] = tip(q.i, t - age);
      lick(p, tx + q.vx * age, ty - 2 + q.vy * age, 1 - age / q.life, q.s, H3);
    });
    for (let [x, y, k, s, f] of puffs) firePuff(p, x, y, k, s, f, H3);
    if (looped(t, D25, count(o.embers ?? 8), S + 500, (r) => ({ x: r.range(-W4, W4), y: -r.range(HC * 0.3, HC * 0.8), vx: r.range(-15, 15), vy: -r.range(25, 60), life: r.range(1.1, 2.4), s: r.chance(0.15) ? 2 : r.range(1, 1.6), a: r.range(0, 6.3), b: r.range(0, 6.3) }), (q, age) => {
      let [x, y] = drift(q.x, q.y, q.vx, q.vy, age, 0, -30, 1.6, 1.6);
      ember(p, X + x + 7 * (Math.sin(age * 2.3 + q.a) - Math.sin(q.a)), Y3 + y + 2 * (Math.sin(age * 3 + q.b) - Math.sin(q.b)), 1 - age / q.life, q.s, EMB, age * 40 + q.a);
    }), G6 > 0) {
      let R13 = o.glowR ?? 46, lx = X + lean(t) * 12;
      p.glow(lx, Y3 - HC * 0.35, R13 * 1.5, GLOW, 0.22 * fl * G6), p.glow(lx, Y3 - HC * 0.75, R13, GLOW, 0.34 * fl * G6), p.glow(X, Y3 - HC * 0.2, R13 * 0.32, H3[2], 0.2 * fl * G6), p.glow(X, Y3 - 2, 8, H3[0], 0.14 * fl * G6);
    }
    return { tip, fl };
  }
  var hotFirst, LAYERS, BIG_LAYERS, BACK_LAYERS, rampAt2, SMOKE1, init_lib4 = __esm({
    "src/fx/fire/_lib.js"() {
      init_core();
      hotFirst = (F) => [...F].reverse(), LAYERS = [[1, 1, 6], [0.76, 0.86, 4], [0.54, 0.68, 2], [0.3, 0.42, 0]], BIG_LAYERS = [[1, 1, 6], [0.8, 0.9, 5], [0.62, 0.78, 4], [0.44, 0.6, 3], [0.26, 0.4, 1], [0.12, 0.22, 0]], BACK_LAYERS = [[1, 1, 7], [0.76, 0.86, 5], [0.54, 0.68, 3], [0.3, 0.42, 2]];
      rampAt2 = (r, t) => r[Math.min(r.length - 1, Math.max(0, Math.floor(t * r.length)))];
      SMOKE1 = hex("#5b5566");
    }
  });

  // src/fx/fire/fireball.js
  var fireball_exports = {};
  __export(fireball_exports, {
    draw: () => draw2,
    meta: () => meta10
  });
  function head2(p, H3, t, R05, S, hx, hy) {
    let ph = t / D;
    p.shade(hx - R05 * 2.4, hy - R05 * 1.7, hx + R05 * 1.5, hy + R05 * 1.7, (x, y, out) => {
      x -= hx, y -= hy;
      let d = Math.hypot(x, y), th = Math.atan2(y, x), back = Math.max(0, -Math.cos(th)), a = th / TAU, bump = 0.55 * pnoise(a * 9 + ph * 9, 9, S) + 0.35 * pnoise(a * 5 - ph * 10, 5, S + 1), rim = R05 * (1 + 0.55 * back * back) + bump;
      if (d > rim) return;
      let swirl2 = pnoise(a * 5 - ph * 10 + d * 0.45, 5, S + 2), h = 1 - d / rim + 0.26 * swirl2 + 0.1 * (1 - back);
      return rim - d < 1 && back < 0.3 ? h > 0.3 ? H3[3] : H3[5] : h > 0.74 ? H3[0] : h > 0.58 ? H3[1] : h > 0.42 ? H3[2] : h > 0.27 ? H3[4] : h > 0.13 ? H3[5] : H3[6];
    });
  }
  function draw2(p, t, o) {
    let F = fit(o.palette, 9), H3 = hotFirst(F), S = o.seed, R05 = o.radius, V = o.speed, N9 = (rate, seed2 = 0, off2 = 0) => NL(t, rate, seed2, off2), GLOW = mix(mix(H3[3], H3[4], 0.5), WHITE, 0.25), SMOKE2 = mix(SMOKE12, H3[6], 0.3), SPARKS = [H3[1], H3[2], H3[4], H3[5]], EMB = [H3[1], H3[2], H3[4], H3[6]], hx = N9(3, S + 50) * 0.5, hy = N9(2.5, S + 51) * 0.7, fire = [], smoke2 = [];
    looped(t, D, 130, S + 100, (r) => {
      let fl2 = r.range(0.22, 0.55), sm = r.chance(0.55), x = -r.range(2, 24);
      return { x, y: r.range(-1, 1) * (R05 - 0.1 * -x), v: V * r.range(0.3, 0.6), vy: r.range(-16, 16), fl: fl2, sm, sl: r.range(0.25, 0.45), s: r.range(1.3, 2.9), f: r.next() * 0.5 + 0.5 * (-x / 24), life: fl2 + (sm ? 0.45 : 0) };
    }, (q, age) => {
      let ta = Math.min(age, q.fl), [wx, y, wvx, vy] = drift(0, q.y, q.v, q.vy, ta, 0, -70, 4.5, 3), x = q.x + wx - V * ta;
      if (age < q.fl) return fire.push([age, x, y, q]);
      if (!q.sm || age - q.fl > q.sl) return;
      let sa = age - q.fl, [sx, sy] = drift(x, y, wvx - V, vy * 0.6 - 6, sa, V * 2, -30, 2, 1.2);
      smoke2.push([sa, sx, sy, q]);
    });
    for (let [sa, x, y, q] of smoke2) smokePuff(p, x, y, 1 - sa / q.sl, q.s * 0.9, SMOKE2);
    fire.sort((a, b) => b[0] - a[0]);
    for (let [age, x, y, q] of fire) {
      let u = age / q.fl;
      firePuff(p, x, y, 1 - u, q.s * (1 + 1.3 * u), q.f, H3, 0.07, -0.86, -0.5);
    }
    BODY.forEach(([len2, w, dy], i) => {
      let n = (S * 5 + i) * 17, L = len2 * (0.82 + 0.25 * N9(4, n)) * (1 + 0.3 * Math.max(0, N9(2.4, n + 3)));
      flameBlade(p, hx + 1, hy + dy * 0.5, -1, dy * 0.02, L, w * R05 / 5, N9(3, n + 5) * 3 + dy, N9, n, H3, LAYERS, 0.5, 1.1 + L * 0.05);
    }), CORONA.forEach(([a, len2, w], i) => {
      let n = (S * 5 + i + 20) * 17, L = len2 * (0.7 + 0.4 * (0.5 + 0.5 * N9(6, n))), ox = Math.cos(a) * R05 * 0.85, oy = Math.sin(a) * R05 * 0.85, dx = Math.cos(a) * 0.55 - 1, dy = Math.sin(a) * 0.55, l = Math.hypot(dx, dy);
      flameBlade(p, hx + ox, hy + oy, dx / l, dy / l, L, w, -Math.sign(a) * 1.5, N9, n, H3, LAYERS);
    }), head2(p, H3, t, R05, S, hx, hy), looped(t, D, 26, S + 200, (r) => ({ a: r.range(-2.4, 2.4), v: r.range(30, 70), life: r.range(0.08, 0.18) }), (q, age) => {
      let ca = Math.cos(q.a), sa = Math.sin(q.a), d = R05 * 0.9 + q.v * age, x = hx + ca * d - V * 0.4 * age, y = hy + sa * d, k = 1 - age / q.life, L = 1 + 2 * k;
      p.line(x - ca * L + V * 0.02, y - sa * L, x, y, k > 0.5 ? H3[1] : H3[3]), p.glow(x, y, 3, H3[2], 0.4 * k);
    }), looped(t, D, 30, S + 300, (r) => ({ x: -r.range(2, 16), y: r.range(-3, 3), v: V * r.range(0.3, 0.8), vy: r.range(-20, 20), life: r.range(0.25, 0.55), big: r.chance(0.25), ph: r.range(0, 6.3) }), (q, age) => {
      let [wx, y, wvx, vy] = drift(0, q.y, q.v, q.vy, age, 0, 50, 3, 2), x = q.x + wx - V * age, k = 1 - age / q.life;
      q.big ? ember(p, x, y, k, 2, EMB, age * 40 + q.ph) : spark(p, x, y, wvx - V, vy, k, SPARKS);
    });
    let fl = 0.85 + 0.15 * N9(9, S + 7);
    p.glowLine(hx - 6, hy, -50, -2, 12, GLOW, 0.2 * fl), p.glow(hx - 2, hy, 42, GLOW, 0.42 * fl), p.glow(hx, hy, 13, H3[1], 0.3 * fl);
  }
  var meta10, D, NL, SMOKE12, BODY, CORONA, init_fireball = __esm({
    "src/fx/fire/fireball.js"() {
      init_core();
      init_lib4();
      meta10 = {
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
    }
  });

  // src/fx/ice/_lib.js
  function inPoly(pts, x, y) {
    let inside = !1;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      let [xi, yi] = pts[i], [xj, yj] = pts[j];
      yi > y != yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi && (inside = !inside);
    }
    return inside;
  }
  function centroid(pts) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      let [x0, y0] = pts[j], [x1, y1] = pts[i], k = x0 * y1 - x1 * y0;
      a += k, cx += (x0 + x1) * k, cy += (y0 + y1) * k;
    }
    if (Math.abs(a) < 1e-6) {
      let n = pts.length;
      return { x: pts.reduce((s, q) => s + q[0], 0) / n, y: pts.reduce((s, q) => s + q[1], 0) / n, area: 0 };
    }
    return { x: cx / (3 * a), y: cy / (3 * a), area: Math.abs(a) / 2 };
  }
  function splitPoly(pts, x, y, a) {
    let nx = -Math.sin(a), ny = Math.cos(a), side = (q) => (q[0] - x) * nx + (q[1] - y) * ny, L = [], Rt = [];
    for (let i = 0; i < pts.length; i++) {
      let p = pts[i], q = pts[(i + 1) % pts.length], sp = side(p), sq = side(q);
      if ((sp >= 0 ? L : Rt).push(p), sp >= 0 != sq >= 0) {
        let u = sp / (sp - sq), m = [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
        L.push(m), Rt.push(m);
      }
    }
    return [L, Rt].filter((s) => s.length >= 3);
  }
  function glassPoly(p, pts, c, a) {
    let x0 = 1 / 0, y0 = 1 / 0, x1 = -1 / 0, y1 = -1 / 0;
    for (let [x, y] of pts) x0 = Math.min(x0, x), x1 = Math.max(x1, x), y0 = Math.min(y0, y), y1 = Math.max(y1, y);
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) inPoly(pts, x + 0.5, y + 0.5) && p.blend(x, y, c, a);
  }
  function blade2(p, bx, by, tx, ty, w, C, opts = {}) {
    let dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy);
    if (L < 1.5 || w < 0.5) return;
    let ux = dx / L, uy = dy / L, nx = -uy, ny = ux, a = opts.a ?? 1, dim = opts.dim ?? 0, jag = opts.jag ?? -1, glint2 = opts.glint ?? -1, K2 = (i) => C[clamp(i - dim, 0, C.length - 1)], hw = w / 2, left = (u) => hw * (1 - u) + 0.35, right = (u) => hw * (1 - u) * (jag >= 0 && u > jag ? 0.55 : 1) + 0.35, ridge = (u) => -w * 0.12 * (1 - u), pad = hw + 2;
    p.shade(Math.min(bx, tx) - pad, Math.min(by, ty) - pad, Math.max(bx, tx) + pad, Math.max(by, ty), (x, y, o) => {
      let rx = x - bx, ry = y - by, u = (rx * ux + ry * uy) / L, s = rx * nx + ry * ny;
      if (u < 0) return;
      let l = left(Math.min(u, 1)), r = right(Math.min(u, 1));
      if (u > 1 || s < -l || s > r) {
        let over = u > 1 ? (u - 1) * L : 0;
        Math.max(over, s < -l ? -l - s : s - r) < 1 && u < 1 + 1 / L && (o.c = K2(0), o.a = a);
        return;
      }
      if (o.a = a, opts.white) return o.c = WHITE;
      let rd = ridge(u), c;
      if (u > 0.88 ? c = WHITE : Math.abs(s - rd) < 0.55 ? c = K2(6) : s < rd ? c = s + l < 1 ? K2(6) : (s + l) / Math.max(1, rd + l) > 0.55 ? K2(5) : K2(4) : c = r - s < 1.1 ? K2(1) : (s - rd) / Math.max(1, r - rd) > 0.5 ? K2(2) : K2(3), jag >= 0 && Math.abs(u - jag) * L < 0.8 && s > rd ? c = K2(6) : s < rd && c !== K2(6) && (Math.floor(x) * 73856093 ^ Math.floor(y) * 19349663) % 997 < 30 && (c = K2(7)), glint2 >= 0 && s <= rd + 0.6) {
        let g = Math.abs(u - glint2) * L;
        g < 0.8 ? c = WHITE : g < 1.8 && (c = K2(6));
      }
      o.c = c;
    });
  }
  function flakeDesign(R6) {
    let n = R6.int(1, 3), branches = [];
    for (let i = 0; i < n; i++) branches.push([0.38 + 0.4 * (i + R6.range(0.2, 0.8)) / n, R6.range(0.24, 0.36) * (1 - i * 0.15)]);
    return { branches, plate: R6.chance(0.45), fork: R6.chance(0.45) };
  }
  function snowflake(p, x, y, r, rot, d, C, opts = {}) {
    let n = C.length, a = opts.a ?? 1, hot = opts.hot ?? 0;
    if (rot = Math.round(rot / (Math.PI / 18)) * (Math.PI / 18), r < 1.2) {
      p.dot(x, y, WHITE, a);
      return;
    }
    if (r < 2.6) {
      let pts = Math.floor((rot % (Math.PI / 3) + Math.PI / 3) / (Math.PI / 6)) % 2 ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 1], [-1, -1], [1, -1], [-1, 1]];
      for (let [dx, dy] of pts) p.dot(x + dx, y + dy, hot > 0.5 ? WHITE : C[n - 3], a);
      p.dot(x, y, WHITE, a), p.glow(x, y, 4, C[n - 3], 0.2 * a);
      return;
    }
    let arm2 = hot > 0.5 ? WHITE : C[n - 2], br = hot > 0.5 ? C[n - 2] : C[n - 3], big = r >= 7, branches = r < 4 ? [] : big ? d.branches.slice(0, 2) : [[0.58, 0.36]];
    for (let k = 0; k < 6; k++) {
      let g = rot + k * TAU / 6, ca = Math.cos(g), sa = Math.sin(g);
      p.line(x, y, x + ca * r, y + sa * r, arm2, a);
      for (let [u, l] of branches) {
        let bx = x + ca * r * u, by = y + sa * r * u, bl = Math.max(1, r * l);
        for (let s of [-1, 1]) p.line(bx, by, bx + Math.cos(g + s * Math.PI / 3) * bl, by + Math.sin(g + s * Math.PI / 3) * bl, br, a);
      }
      if (d.fork && big && !d.plate)
        for (let s of [-1, 1]) p.dot(x + ca * r + Math.cos(g + s * 0.9) * 1.2, y + sa * r + Math.sin(g + s * 0.9) * 1.2, br, a);
      p.dot(x + ca * r, y + sa * r, WHITE, a);
    }
    if (d.plate && big) {
      let q = r * 0.34;
      for (let k = 0; k < 6; k++) {
        let g0 = rot + Math.PI / 6 + k * TAU / 6, g1 = g0 + TAU / 6;
        p.line(x + Math.cos(g0) * q, y + Math.sin(g0) * q, x + Math.cos(g1) * q, y + Math.sin(g1) * q, C[n - 3], a);
      }
    }
    p.px(x, y, WHITE), p.glow(x, y, 3 + r * 1.2, C[n - 4], (0.14 + 0.35 * hot) * a), hot > 0.3 && p.glow(x, y, 2 + r * 0.5, WHITE, 0.3 * hot * a);
  }
  function endBy(t, D25, ...systems) {
    let left = Math.max(1e-3, D25 - 0.05 - t);
    for (let sys of systems) for (let q of sys.list) q.life > left && (q.life = left);
  }
  function fractures(R6, inside, x, y, n, opts = {}) {
    let out = [], step2 = opts.step ?? [1.6, 2.6], len2 = opts.len ?? 18, fork = opts.fork ?? 0.16, a0 = opts.a0 ?? R6.range(0, TAU), spread = opts.spread ?? TAU, walk3 = (x2, y2, d, a, len3, depth) => {
      let pts = [[x2, y2, d]];
      for (let s = 0; s < len3; s++) {
        a += R6.range(-0.55, 0.55);
        let st = R6.range(step2[0], step2[1]), nx = x2 + Math.cos(a) * st, ny = y2 + Math.sin(a) * st;
        if (!inside(nx, ny)) break;
        x2 = nx, y2 = ny, d += st, pts.push([x2, y2, d]), depth < 2 && pts.length > 2 && R6.chance(fork) && walk3(x2, y2, d, a + R6.sign() * R6.range(0.6, 1.2), Math.ceil(len3 * 0.5), depth + 1);
      }
      pts.length > 1 && out.push(pts);
    };
    for (let i = 0; i < n; i++) walk3(x, y, 0, a0 + i / n * spread + R6.range(-0.3, 0.3) * Math.min(1, spread / TAU), len2, 0);
    return out;
  }
  function drawFractures(p, cracks5, reach, C, opts = {}) {
    let n = C.length, ox = opts.ox ?? 0, oy = opts.oy ?? 0, hot = opts.hot ?? !0, a = opts.a ?? 1, seg3 = (pts, i) => {
      let [x0, y0, d0] = pts[i - 1], [x1, y1, d1] = pts[i];
      if (d0 >= reach) return null;
      let u = Math.min(1, (reach - d0) / Math.max(0.01, d1 - d0));
      return [x0 + ox, y0 + oy, x0 + ox + (x1 - x0) * u, y0 + oy + (y1 - y0) * u, reach - d1 < 3];
    };
    for (let pts of cracks5)
      for (let i = 1; i < pts.length; i++) {
        let s = seg3(pts, i);
        if (!s) break;
        p.line(s[0], s[1] + 1, s[2], s[3] + 1, C[Math.min(2, n - 1)], a);
      }
    for (let pts of cracks5)
      for (let i = 1; i < pts.length; i++) {
        let s = seg3(pts, i);
        if (!s) break;
        let tip = hot && s[4];
        p.line(s[0], s[1], s[2], s[3], tip ? WHITE : C[n - 2], a), tip ? p.glow(s[2], s[3], 5, C[n - 3], 0.5 * a) : i % 2 && p.glow(s[2], s[3], 3, C[n - 3], 0.18 * a);
      }
  }
  var Panes, init_lib5 = __esm({
    "src/fx/ice/_lib.js"() {
      init_core();
      Panes = class {
        constructor(opts = {}) {
          this.list = [], this.ground = opts.ground ?? (() => 1 / 0), this.onLand = opts.onLand ?? null, this.onCrumble = opts.onCrumble ?? null, this.onSkid = opts.onSkid ?? null;
        }
        add(q) {
          let life = q.life ?? 1;
          this.list.push({ vx: 0, vy: 0, a: 0, va: 0, f: 0, vf: 0, lit: 0.6, g: 1, drag: 0.3, bounce: 0.35, rest: !1, brittle: !1, ...q, life, max: life });
        }
        get count() {
          return this.list.length;
        }
        /** The pane's corners as drawn: tumbled (squashed across its own width), turned and placed. */
        corners(q) {
          let ca = Math.cos(q.a), sa = Math.sin(q.a), k = Math.cos(q.f);
          return q.pts.map(([x, y]) => {
            let yy = y * k;
            return [q.x + x * ca - yy * sa, q.y + x * sa + yy * ca];
          });
        }
        seat(q) {
          let low = -1 / 0;
          for (let c of this.corners(q)) low = Math.max(low, c[1]);
          return low;
        }
        update(dt) {
          for (let i = this.list.length - 1; i >= 0; i--) {
            let q = this.list[i];
            if ((q.life -= dt) <= 0) {
              this.list.splice(i, 1);
              continue;
            }
            let floor = this.ground(q.x) - 0.5;
            if (q.rest && q.crumble !== void 0 && (q.restT = (q.restT ?? 0) + dt) > q.crumble) {
              this.onCrumble?.(q), this.list.splice(i, 1);
              continue;
            }
            if (q.rest) {
              Math.abs(q.vx) > 8 && this.onSkid?.(q, q.x, floor + 0.5), q.x += q.vx * dt, q.vx -= q.vx * 7 * dt, q.a += q.va * dt, q.va -= q.va * 9 * dt, q.vf -= q.vf * 9 * dt, q.f += q.vf * dt, q.y -= this.seat(q) - floor;
              continue;
            }
            q.vy += GRAVITY * q.g * dt, q.vx -= q.vx * q.drag * dt, q.vy -= q.vy * q.drag * dt, q.x += q.vx * dt, q.y += q.vy * dt, q.a += q.va * dt, q.f += q.vf * dt;
            let low = this.seat(q);
            if (!(q.g <= 0 || low < floor || q.vy <= 0)) {
              if (q.y -= low - floor, q.vy > 70 && (q.hits = (q.hits ?? 0) + 1, this.onLand?.(q, q.x, floor + 0.5, q.vy)), q.brittle && q.vy > 70 && q.hits >= q.brittle) {
                this.list.splice(i, 1);
                continue;
              }
              q.vy > 70 && q.bounce > 0 ? (q.vy = -q.vy * q.bounce, q.vx *= 0.75, q.va *= 0.6, q.vf *= 0.5) : (q.rest = !0, q.vy = 0);
            }
          }
        }
        draw(p, C) {
          let n = C.length;
          for (let q of this.list) {
            let a = Math.min(1, q.life / 0.35), pts = this.corners(q), k = Math.cos(q.f), face = Math.abs(k), lv = q.lit * (0.35 + 0.65 * face), flash2 = face > 0.97 && !q.rest;
            if (face > 0.25)
              if (q.solid && q.tone !== void 0)
                p.poly(pts, flash2 ? C[n - 1] : C[clamp(Math.round(1 + q.tone * 5 * (0.6 + 0.4 * face)), 1, n - 2)], a);
              else if (q.solid) {
                let rr = q.ridge ?? -Math.PI / 2, cr = Math.cos(rr), sr = Math.sin(rr), ca = Math.cos(q.a), sa = Math.sin(q.a), rx = cr * ca - sr * k * sa, nx = -(cr * sa + sr * k * ca), ny = rx;
                nx * -0.55 + ny * -0.84 < 0 && (nx = -nx, ny = -ny);
                let lit = flash2 ? C[n - 1] : C[clamp(Math.round(3 + lv * 3), 3, n - 2)], deep = C[clamp(Math.round(1 + lv * 2), 1, 3)];
                p.poly(pts, (x, y) => {
                  let d = (x - q.x) * nx + (y - q.y) * ny;
                  return d > 0.6 ? lit : d > -0.6 ? C[n - 2] : deep;
                }, a);
              } else glassPoly(p, pts, flash2 ? C[n - 1] : C[clamp(Math.round(3 + lv * 3), 3, n - 2)], (0.3 + 0.35 * lv + (flash2 ? 0.3 : 0)) * a);
            let cx = 0, cy = 0, top = 0;
            for (let [x, y] of pts) cx += x, cy += y;
            cx /= pts.length, cy /= pts.length;
            for (let i = 0; i < pts.length; i++) {
              let [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length], nx = y1 - y0, ny = x0 - x1;
              nx * ((x0 + x1) / 2 - cx) + ny * ((y0 + y1) / 2 - cy) < 0 && (nx = -nx, ny = -ny);
              let l = Math.hypot(nx, ny) || 1, lit = (-nx * 0.55 - ny * 0.84) / l;
              p.line(x0, y0, x1, y1, face < 0.25 || lit > 0.35 ? C[n - 1] : lit > -0.25 ? C[n - 2] : q.solid ? C[1] : C[Math.max(2, n - 4)], a), pts[i][1] < pts[top][1] && (top = i);
            }
            face > 0.7 && p.dot(pts[top][0], pts[top][1], WHITE, a), p.glow(cx, cy, 5, C[n - 3], (flash2 ? 0.5 : 0.14) * a);
          }
        }
      };
    }
  });

  // src/fx/ice/ice-lance.js
  var ice_lance_exports = {};
  __export(ice_lance_exports, {
    draw: () => draw3,
    meta: () => meta11
  });
  function spear(p, C, L, pulse2, glint2) {
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
      if (v > -0.3 && v < 0.35 && Math.abs(x - pulse2) < 2.5) return o.c = WHITE;
      if (v < -0.3 && Math.abs(x - glint2) < 1) return o.c = WHITE;
      o.c = v < -0.72 ? WHITE : v < -0.36 ? C[6] : v < -0.18 ? C[7] : v < 0.38 ? C[4] : v < 0.78 ? C[2] : C[1];
    });
  }
  function draw3(p, t, o) {
    let C = fit(o.palette, 8), D25 = meta11.duration, S = o.seed, L = o.length, ph = t / D25;
    p.each(-L - 100, -12, -L + 4, 12, (x, y, sx, sy) => {
      let u = (-L + 4 - x) / 104, w = 4.5 * (1 - u) ** 0.7 + 0.5 + 1.5 * Math.sin(u * 9 - ph * TAU * 2) * u, v = Math.abs(y) / w;
      if (v >= 1) return;
      let a = (1 - v * v) * (1 - u) ** 1.4;
      a < 0.04 || (p.blendPx(sx, sy, v < 0.25 && u < 0.4 ? C[6] : v < 0.6 ? C[5] : C[4], a * 0.7), a > 0.3 && p.add(sx, sy, C[5], 0.12 * a));
    }), p.glowLine(-L - 60, 0, 0, 0, 14, C[4], 0.22), cycle(t, D25, 14, S, (g) => g.range(0.35, 0.55), (age, life, r) => {
      let x0 = r.range(-L + 2, -8), [x, y] = fly(x0, r.range(-2.5, 2.5), -r.range(150, 230), r.sign() * r.range(8, 30), age, 0, 2.2), k = age / life, rad = 1.2 + 5.5 * k, a = 0.5 * (1 - k) ** 1.3;
      p.disc(x, y, rad, k < 0.3 ? C[6] : C[5], (d) => a * (1 - d * d)), p.glow(x, y, rad * 1.6, C[4], 0.1 * (1 - k));
    }), cycle(t, D25, 9, S + 1, (g) => g.range(0.4, 0.6), (age, life, r) => {
      let [x, y] = fly(r.range(-L, -6), r.range(-3, 3), -r.range(170, 260), r.range(-35, 35), age, 60, 1.2), k = age / life, a = r.range(0, TAU) + age * r.range(10, 18) * r.sign(), l = r.range(1.2, 2.2), ca = Math.cos(a), sa = Math.sin(a);
      if (!(k > 0.85 && age * 30 % 2 < 1) && (p.line(x - ca * l, y - sa * l, x + ca * l, y + sa * l, C[5]), p.px(x + ca * l, y + sa * l, WHITE), Math.cos(a * 2) > 0.9)) {
        for (let [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, C[6]);
        p.glow(x, y, 6, C[5], 0.45);
      }
    }), cycle(t, D25, 12, S + 2, (g) => g.range(0.16, 0.26), (age, life, r) => {
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
    let pulse2 = -L + ph * 2 % 1 * (L + 6), glint2 = -((ph * 2 + 0.5) % 1) * L * 1.2;
    spear(p, C, L, pulse2, glint2), p.glowLine(-L, 0, 0, 0, 10, C[4], 0.1), p.glow(pulse2, 0, 8, C[6], 0.3), p.glow(0, 0, 8, WHITE, 0.4), p.glow(-L * 0.4, 0, 30, C[3], 0.16);
  }
  var meta11, init_ice_lance = __esm({
    "src/fx/ice/ice-lance.js"() {
      init_core();
      init_lib5();
      meta11 = {
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
    }
  });

  // src/fx/holy/_lib.js
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
    let m = A.mask, P3 = A.pixels, fa = typeof a == "function";
    if (P3)
      for (let j = 0; j < m.h; j++)
        for (let i = 0; i < m.w; i++) {
          let c = P3[j * m.w + i];
          if (!c) continue;
          let x = A.x + i, y = A.y + j, n = fn(c, x, y);
          n && p.dot(x, y, n, fa ? a(x, y) : a);
        }
  }
  function oval(p, cx, cy, rx, ry, c, a = 1, keep2 = null) {
    if (rx < 0.5) return;
    let n = Math.ceil(Math.max(rx, ry) * TAU * 1.5) + 6, fc = typeof c == "function", fa = typeof a == "function";
    for (let j = 0; j < n; j++) {
      let g = j / n * TAU;
      keep2 && !keep2(g) || p.dot(cx + Math.cos(g) * rx, cy + Math.sin(g) * ry, fc ? c(g) : c, fa ? a(g) : a);
    }
  }
  function feather(p, x, y, ang, len2, wid, R6, a = 1, side = 1, hot = 0, quill = 0.02) {
    if (len2 < 1.5 || a <= 0.02) return;
    let n = R6.length, ca = Math.cos(ang), sa = Math.sin(ang), x1 = x + ca * len2, y1 = y + sa * len2, pad = wid + 1.2, h = hot > 0.5, edge = h ? R6[n - 3] : R6[n - 5], lead = h ? WHITE : R6[n - 2], B4 = h ? [WHITE, WHITE, R6[n - 2]] : [R6[n - 2], R6[n - 3], R6[n - 4]];
    p.each(Math.min(x, x1) - pad, Math.min(y, y1) - pad, Math.max(x, x1) + pad, Math.max(y, y1) + pad, (px, py, sx, sy) => {
      let dx = px - x, dy = py - y, u = (dx * ca + dy * sa) / len2;
      if (u < 0 || u > 1.05) return;
      let v = (-dx * sa + dy * ca) * side, av = Math.abs(v), w = wid * Math.sqrt(clamp((u - quill) / 0.22)) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (u - 0.55) / 0.47), 2))), lim = v < 0 ? w * 0.42 : w, fade = u < 0.72 ? 1 : 1 - (u - 0.72) * 1.6;
      if (av < 0.5 && u < 0.9) return p.put(sx, sy, u < 0.5 ? WHITE : B4[0], a);
      if (!(av > lim + 0.05 || w < 0.5)) {
        if (lim - av < 1) return v > 0 ? p.put(sx, sy, u > 0.85 ? B4[2] : edge, a * fade) : p.put(sx, sy, lead, a);
        if (u < 0.72) return p.put(sx, sy, u < 0.38 ? B4[0] : B4[1], a);
        p.blendPx(sx, sy, B4[2], a * fade);
      }
    });
  }
  function plus(p, x, y, L, th, R6, a = 1, glint2 = !1) {
    let n = R6.length, X = Math.round(x), Y3 = Math.round(y), w = th > 1 ? 1 : 0, ins = (i, j) => Math.abs(i) <= w && Math.abs(j) <= L || Math.abs(j) <= w && Math.abs(i) <= L;
    for (let j = -L - 1; j <= L + 1; j++)
      for (let i = -L - 1; i <= L + 1; i++) {
        if (!ins(i, j)) {
          w && (ins(i - 1, j) || ins(i + 1, j) || ins(i, j - 1) || ins(i, j + 1)) && p.dot(X + i, Y3 + j, R6[Math.max(0, n - 6)], a * 0.9);
          continue;
        }
        let c;
        w ? i === 0 && j === 0 ? c = WHITE : i === 0 || j === 0 ? c = Math.abs(i) + Math.abs(j) < L ? R6[n - 2] : R6[n - 3] : c = i < 0 || j < 0 ? R6[n - 3] : R6[n - 5] : c = i === 0 && j === 0 ? WHITE : Math.abs(i) + Math.abs(j) >= L ? R6[n - 3] : R6[n - 2], glint2 && (i === 0 && j === -L || i === -L && j === 0) && (c = WHITE), p.dot(X + i, Y3 + j, c, a);
      }
  }
  var GOLD, GREEN, ASH, SHAPES, toneOf, FAR, NEAR, Feathers, init_lib6 = __esm({
    "src/fx/holy/_lib.js"() {
      init_core();
      GOLD = ["#3b1d2a", "#7a3a2c", "#c4652e", "#f0a040", "#ffd25e", "#fff0a0", "#fffbe0", "#ffffff"], GREEN = ["#0e2a24", "#14472f", "#1d6e3a", "#2f9a45", "#5cc654", "#a0e46c", "#dcffb4", "#ffffff"], ASH = ["#16131c", "#26222f", "#3a3546", "#524c5e", "#6e6878", "#8c8796"], SHAPES = /* @__PURE__ */ new WeakMap();
      toneOf = (R6, c, lift = 0) => R6[clamp(Math.floor((luma(c) * 1.1 + lift) * R6.length), 0, R6.length - 1)];
      FAR = (g) => Math.sin(g) < 0, NEAR = (g) => Math.sin(g) >= 0;
      Feathers = class {
        constructor(rng2, floor = 0) {
          this.R = rng2, this.floor = floor, this.list = [];
        }
        add(f) {
          let R6 = this.R;
          this.list.push({ vx: 0, vy: 0, a: 0, len: 7, wid: 2, delay: 0, back: !1, side: R6.sign(), ph: R6.range(0, TAU), w: R6.range(3.2, 4.6), amp: R6.range(6, 11), sink: R6.range(14, 24), va: R6.range(-9, 9), tilt: R6.range(-0.35, 0.35), ...f, max: f.life, age: 0, landed: !1 });
        }
        get count() {
          return this.list.length;
        }
        update(dt) {
          for (let i = this.list.length - 1; i >= 0; i--) {
            let f = this.list[i];
            if (f.delay > 0) {
              f.delay -= dt;
              continue;
            }
            if ((f.life -= dt) <= 0) {
              this.list.splice(i, 1);
              continue;
            }
            if (f.age += dt, f.landed) {
              f.a += (Math.round(f.a / Math.PI) * Math.PI - f.a) * Math.min(1, dt * 10);
              continue;
            }
            f.vx -= f.vx * 3.4 * dt, f.vy -= f.vy * 3.4 * dt;
            let s = smooth(0.1, 0.6, f.age), ph = f.age * f.w + f.ph, c = Math.cos(ph);
            f.x += (f.vx + Math.sin(ph) * f.amp * s * 0.9) * dt, f.y += (f.vy + f.sink * s * (c * c * 1.5 - 0.2)) * dt;
            let rest = Math.round(f.a / Math.PI) * Math.PI + f.tilt + Math.sin(ph) * 0.6;
            f.a += f.va * dt * (1 - s) + (rest - f.a) * Math.min(1, dt * 5 * s), f.y >= this.floor - 0.5 && (f.y = this.floor - 0.5, f.landed = !0, f.life = Math.min(f.life, 0.6));
          }
        }
        draw(p, R6, layer) {
          for (let f of this.list) {
            if (f.delay > 0 || layer && (f.back ? "back" : "front") !== layer) continue;
            let k = f.life / f.max, a = Math.min(1, f.life / 0.45, f.age / 0.06), ca = Math.cos(f.a), sa = Math.sin(f.a);
            feather(p, f.x - ca * f.len / 2, f.y - sa * f.len / 2, f.a, f.len, f.wid, R6, a, f.side, f.age < 0.06 ? 1 : 0, 0.2), p.glow(f.x, f.y, 4 + f.len * 0.5, R6[R6.length - 3], 0.22 * a * (0.4 + 0.6 * k));
          }
        }
      };
    }
  });

  // src/fx/holy/heal.js
  var heal_exports = {};
  __export(heal_exports, {
    act: () => act6,
    create: () => create9,
    meta: () => meta12
  });
  function heart(p, x, y, C, a) {
    let X = Math.round(x) - 2, Y3 = Math.round(y) - 2, at2 = (i, j) => j >= 0 && j < 4 && i >= 0 && i < 5 && HEART[j][i] === "#";
    for (let j = -1; j <= 4; j++)
      for (let i = -1; i <= 5; i++)
        at2(i, j) ? p.dot(X + i, Y3 + j, i === 1 && j === 1 ? WHITE : j >= 2 ? C[5] : C[6], a) : (at2(i - 1, j) || at2(i + 1, j) || at2(i, j - 1) || at2(i, j + 1)) && p.dot(X + i, Y3 + j, C[3], a * 0.9);
    p.glow(x, y, 6, C[5], 0.4 * a);
  }
  function create9(o) {
    let C = fit(o.palette, 8), A = o.actor, S = shapeOf(A), R6 = new Rng(o.seed), ps = new Particles({ rng: R6, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights(), rows = /* @__PURE__ */ new Map();
    for (let [x, y] of S.edge) (rows.get(y) ?? rows.set(y, []).get(y)).push(x);
    let petals = Array.from({ length: NP }, (_, k) => ({ a: k / NP * TAU + 0.2, t0: 0.02 + k * 3 % NP * 0.035, w: R6.range(4.2, 5.2) })), motes2 = [];
    for (let k = 0; k < NP; k++) motes2.push({ t0: 0.2 + k * 0.05, th0: petals[k].a, r0: PR * 0.9, y0: -1, w: 4.2 * (k % 2 ? 1 : -1), v: R6.range(46, 58), life: R6.range(0.75, 0.95), kind: k % 2 });
    for (let k = 0; k < 8; k++) motes2.push({ t0: LIFT1 + R6.range(0, 0.06), th0: k / 8 * TAU, r0: R6.range(12, 18), y0: TOPY + R6.range(-2, 4), w: 3.6 * (k % 2 ? 1 : -1), v: R6.range(14, 34), life: R6.range(0.35, 0.6), kind: (k + 1) % 2 });
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
      let ux = (tx - bx) / L, uy = (ty - by) / L, W4 = pe.w * Math.min(1, b) * (0.35 + 0.65 * Math.abs(sa)), pad = W4 + 1;
      p.each(Math.min(bx, tx) - pad, Math.min(by, ty) - pad, Math.max(bx, tx) + pad, Math.max(by, ty) + pad, (x, y, sx, sy) => {
        let dx = x - bx, dy = y - by, u = (dx * ux + dy * uy) / L;
        if (u < 0 || u > 1) return;
        let hw = W4 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.6)), 0.7) + 0.2, v = Math.abs(-dx * uy + dy * ux) / hw;
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
      let y = hoopY(t), r = hoopR(t) * (t > LIFT1 ? 1 - (t - LIFT1) / 0.12 : 1), keep2 = back ? (g) => Math.sin(g) < 0 : (g) => Math.sin(g) >= 0;
      if (oval(p, 0, y, r, r * SY, (g) => Math.sin(g) > 0.5 ? WHITE : C[6], back ? 0.8 : 1, keep2), !back) {
        oval(p, 0, y + 1, r - 0.5, r * SY, C[4], 1, keep2);
        for (let i = -2; i <= 2; i++) p.glow(i * r * 0.45, y, 8, C[5], 0.32);
      }
    }
    return {
      update(dt) {
        if (t += dt, t > LIFT0 && t < LIFT1) {
          let Y3 = Math.round(hoopY(t));
          for (let y = lastRow; y > Y3; y--) {
            let xs = rows.get(y);
            !xs || !R6.chance(0.45) || ps.spawn(P.STAR, R6.pick(xs) + R6.range(-1, 1) * 2, y, R6.range(-4, 4), -R6.range(4, 12), R6.range(0.3, 0.55), R6.chance(0.5) ? WHITE : C[6], R6.range(0.6, 1.6));
          }
          lastRow = Math.min(lastRow, Y3);
        }
        !burst && t >= LIFT1 && (burst = !0, lights.add(0, TOPY, 26, C[5], 0.55, 0.3), lights.add(0, TOPY, 10, WHITE, 0.45, 0.08)), ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let pool3 = smooth(0, 0.2, t) * (1 - smooth(1.3, 1.75, t));
        pool3 > 0 && p.glow(0, -2, 30, C[4], 0.3 * pool3);
        for (let k = 0; k < NP; k++) petal(p, k, !0);
        hoop(p, !0), ps.draw(p, "back"), riders(p, !0);
      },
      draw(p) {
        let drain = smooth(0, 0.08, t);
        if (t < LIFT1 + 0.35) {
          let Y3 = t < LIFT0 ? 1 : hoopY(t), done = t >= LIFT1;
          recolor(p, A, (c, x, y) => {
            let d = y - Y3;
            if (!done && d < -0.5) {
              let l = luma(c) * 0.88;
              return mix(c, rgb(l * 236, l * 226, l * 222), 0.68 * drain);
            }
            if (!done && d < 1) return WHITE;
            if (!done && d < 2.5) return C[6];
            let k = done ? 0.45 * (1 - seg(t, LIFT1, LIFT1 + 0.35)) : 0.5 * Math.exp(-(d - 2.5) / 5);
            return k > 0.05 ? mix(c, C[5], k) : 0;
          }), t > LIFT0 && !done && p.glow(0, Y3, 18, C[5], 0.35);
        }
        for (let k = 0; k < NP; k++) petal(p, k, !1);
        hoop(p, !1), t >= LIFT1 && t < LIFT1 + 0.25 && sparkle(p, 0, TOPY, 8 * (1 - (t - LIFT1) / 0.25), WHITE, C[5], 0.6), riders(p, !1), ps.draw(p, "front"), lights.draw(p);
      }
    };
    function riders(p, back) {
      for (let m of motes2) {
        let a = t - m.t0;
        if (a < 0) continue;
        let at2 = (aa) => {
          let th = m.th0 + m.w * aa, r = m.r0 * (1 - 0.45 * (aa / m.life));
          return [Math.cos(th) * r, m.y0 - m.v * aa, Math.sin(th)];
        };
        if (a < m.life) {
          let [x2, y2, z] = at2(a);
          if (z < 0 !== back) continue;
          for (let j = 0; j < 7; j++) {
            let aj = a - j * 0.03;
            if (aj < 0) break;
            let [tx, ty, tz] = at2(aj);
            tz < 0 === back && p.dot(tx, ty, j === 0 ? WHITE : j < 3 ? C[6] : C[5], (1 - j / 7) * (back ? 0.6 : 1));
          }
          p.glow(x2, y2, 4, C[5], back ? 0.2 : 0.4);
          continue;
        }
        let u = (a - m.life) / 0.36;
        if (u >= 1 || back) continue;
        let [x, y] = at2(m.life), k = 1 - smooth(0.5, 1, u);
        u < 0.12 ? sparkle(p, x, y, 3, WHITE, C[6], 0.5) : m.kind ? heart(p, x, y - u * 6, C, k) : sparkle(p, x, y - u * 5, 1 + 2 * k * (0.7 + 0.3 * Math.sin(a * 30)), WHITE, C[5], 0.45 * k);
      }
    }
  }
  var meta12, HURT, UP, act6, SY, NP, PR, LIFT0, LIFT1, TOPY, HEART, init_heal = __esm({
    "src/fx/holy/heal.js"() {
      init_core();
      init_lib6();
      meta12 = {
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
    }
  });

  // src/fx/shadow/_lib.js
  function unlight(p, x0, y0, x1, y1, dark, keep2 = 0) {
    let L = p.L, w = p.w, ox = p.ox, oy = p.oy;
    p.each(x0, y0, x1, y1, (x, y, sx, sy) => {
      if (!dark(x, y)) return;
      let i = (sy - oy) * w + (sx - ox), d = L[i];
      d && (keep2 <= 0 ? L[i] = 0 : L[i] = 255 << 24 | (d >>> 16 & 255) * keep2 << 16 | (d >>> 8 & 255) * keep2 << 8 | (d & 255) * keep2);
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
  function ringLight(p, x, y, R6, w, c, k, keep2 = null) {
    if (w < 1 || k <= 4e-3) return;
    let col = hex(c);
    annulus(x, y, Math.max(0, R6 - w), R6 + w, (cx, cy, d) => {
      if (keep2 && !keep2(cx, cy)) return;
      let f = 1 - Math.abs(d - R6) / w;
      p.light(cx, cy, col, f * f * k);
    });
  }
  function halo(p, x, y, r0, r1, c, k) {
    if (r1 <= r0 || k <= 4e-3) return;
    let col = hex(c), w = r1 - r0;
    annulus(x, y, Math.max(0, r0), r1, (cx, cy, d) => {
      let f = 1 - (d - r0) / w;
      p.light(cx, cy, col, f * f * k);
    });
  }
  function blackStar(cy, L, rot, short = 0.46, q = 0.32) {
    let R05 = Math.ceil(L) + 2, n = R05 * 2 + 1, data = new Uint8Array(n * n);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        let x = i - R05 + 0.5, y = cy + j - R05 + 0.5;
        (inStar(x, y, 0, cy, L, rot, q) || inStar(x, y, 0, cy, L * short, rot + Math.PI / 4, q)) && (data[j * n + i] = 1);
      }
    for (let a = 0; a < 4; a++)
      for (let d = 0, ca = Math.cos(rot + a * Math.PI / 2), sa = Math.sin(rot + a * Math.PI / 2); d < L - 1; d += 0.5) {
        let i = Math.floor(ca * d) + R05, j = Math.floor(sa * d) + R05;
        data[j * n + i] = 1;
      }
    let at2 = (x, y) => {
      let i = Math.floor(x) + R05, j = Math.floor(y - cy) + R05;
      return i >= 0 && j >= 0 && i < n && j < n && data[j * n + i] === 1;
    };
    return {
      R0: R05,
      at: at2,
      /** take the light off its black cells (call last, like unlight) */
      unlight(p) {
        let Lb = p.L, w = p.w, h = p.h, ox = p.ox, oy = p.oy;
        for (let j = 0; j < n; j++)
          for (let i = 0; i < n; i++) {
            if (!data[j * n + i]) continue;
            let x = i - R05 + 0.5, y = cy + j - R05 + 0.5, sx = p.cellX(x, y) - ox, sy = p.cellY(x, y) - oy;
            sx >= 0 && sy >= 0 && sx < w && sy < h && (Lb[sy * w + sx] = 0);
          }
      },
      draw(p, c, rim, skip) {
        for (let j = 0; j < n; j++)
          for (let i = 0; i < n; i++) {
            let x = i - R05 + 0.5, y = cy + j - R05 + 0.5;
            data[j * n + i] ? p.px(x, y, c) : rim && !skip(x, y) && (at2(x - 1, y) || at2(x + 1, y) || at2(x, y - 1) || at2(x, y + 1)) && p.px(x, y, rim);
          }
      }
    };
  }
  function inStar(x, y, cx, cy, L, rot, q = 0.42) {
    if (L <= 0) return !1;
    let c = Math.cos(rot), s = Math.sin(rot), dx = x - cx, dy = y - cy, u = Math.abs(dx * c + dy * s) / L, v = Math.abs(-dx * s + dy * c) / L;
    return u < 1 && v < 1 && Math.min(u, v) <= Math.pow(0.5, 1 / q) && Math.pow(u, q) + Math.pow(v, q) <= 1;
  }
  function attract(list, x, y, G6, reach, swirl2, r0, dt, w = () => 1, vmax = 1 / 0) {
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
      let a = G6 / (d2 + r0 * r0) * Math.min(1, (reach - d) / (reach * 0.25)) * wt * dt, ux = dx / d, uy = dy / d;
      q.vx += (ux - uy * swirl2) * a, q.vy += (uy + ux * swirl2) * a;
      let drag = Math.min(0.2, (1 - d / reach) * 1.6 * dt);
      q.vx -= q.vx * drag, q.vy -= q.vy * drag;
      let v = Math.hypot(q.vx, q.vy);
      v > vmax && (q.vx *= vmax / v, q.vy *= vmax / v);
    }
    return eaten;
  }
  function shard(p, b, C, lx, ly, lk) {
    let fa = Math.min(1, b.life / 0.4), ca = Math.cos(b.a), sa = Math.sin(b.a), L = Math.max(2, b.s), W4 = Math.max(2, L * 0.55), side = -sa * (lx - b.x) + ca * (ly - b.y) > 0 ? 1 : -1, rim = lk > 0.6 ? C[6] : lk > 0.3 ? C[5] : lk > 0.08 ? C[4] : C[3], E2 = L / 2 + 1.5;
    p.shade(b.x - E2, b.y - E2, b.x + E2, b.y + E2, (x, y, out) => {
      let dx = x - b.x, dy = y - b.y, u = dx * ca + dy * sa, v = (-dx * sa + dy * ca) * side;
      if (u < -L / 2 - 0.4 || u > L / 2 + 0.4) return;
      let half = W4 / 2 * (L / 2 - u) / L + 0.4;
      if (!(Math.abs(v) > half))
        return out.a = fa, u > L / 2 - 1.3 && lk > 0.3 ? WHITE : v > half - 1 ? u > -L / 4 ? rim : C[Math.max(3, C.indexOf(rim) - 1)] : v < -half + 1 ? C[1] : C[2];
    }), lk > 0.04 && p.glow(b.x, b.y, 3 + L * 0.6, C[5], 0.2 * lk * fa);
  }
  function floorPool(p, C, rx, t, ripples) {
    if (rx < 1) return;
    let ry = rx * 0.17 + 0.6;
    p.shade(-rx - 3, -ry - 2, rx + 3, ry + 2, (x, y) => {
      let dx = x / rx, dy = (y - 0.5) / ry, d = Math.sqrt(dx * dx + dy * dy);
      if (!(d > 1.18)) {
        if (d > 1)
          return dy < 0 && d < 1.09 ? Math.abs(dx) < 0.55 ? C[6] : Math.abs(dx) < 0.85 ? C[5] : C[4] : dy >= 0 && d < 1.09 ? C[2] : y > -0.5 && noise(x * 0.7, 9) > 0.15 ? C[1] : void 0;
        for (let r of ripples) {
          let age = t - r.t0, rr = age * 46 * r.w + 1, ex = x - r.x, ey = (y - 0.5) / 0.17, e = Math.sqrt(ex * ex + ey * ey) || 1, g = Math.sqrt(ex * ex + (ey / 0.17) ** 2) / e;
          if (Math.abs(e - rr) < 0.55 * g && age < r.life) return age < r.life * 0.5 ? C[4] : C[3];
        }
        return dy < -0.55 && dy > -0.85 && noise(x * 0.25 + t * 1.3, 4) > 0.2 ? noise(x * 0.6 - t * 2, 6) > 0.55 ? C[5] : C[2] : dy < -0.35 && d > 0.72 ? d > 0.9 ? C[3] : C[2] : d > 0.86 ? C[1] : C[0];
      }
    });
  }
  var VOID, PK, Puffs, Drops, init_lib7 = __esm({
    "src/fx/shadow/_lib.js"() {
      init_core();
      VOID = ["#06040b", "#150c26", "#2a1150", "#461a84", "#6f2cc0", "#9d5cec", "#cfa6ff", "#f6eaff"];
      PK = { FLAME: 0, SOOT: 1 }, Puffs = class {
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
              let heat2 = Math.min(0.999, Math.pow(age, 0.62) + q.seed % 1 * 0.1), idx = Math.min(n - 2, Math.floor(heat2 * (n - 1))), r2 = q.size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = F[idx];
              idx >= n - 3 ? p.disc(x, y, r2, c, Math.min(1, k * 3) * 0.8) : (p.circle(x, y, r2, F[Math.min(n - 1, idx + 2)]), p.circle(x - r2 * 0.16, y - r2 * 0.22, r2 * 0.78, c), r2 > 1.6 && p.circle(x, y - r2 * 0.9, r2 * 0.42, c), idx <= 3 && r2 > 1.8 && p.circle(x - r2 * 0.28, y - r2 * 0.34, r2 * 0.36, F[Math.max(0, idx - 1)]), idx < 6 && p.glow(x, y, r2 * 2.4 + 2, c, 0.2 * k));
              continue;
            }
            let r = q.size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * 0.45), a = Math.min(1, age * 10) * Math.min(1, k * 2.2) * 0.72, body4 = mix(this.soot[0], this.soot[1], age), edge = a * 0.5, core = 1 - (1 - a * 0.5) * (1 - a * 0.62);
            p.disc(x, y + r * 0.06, r, body4, (d) => d < 0.72 ? core : edge);
            let lk = light ? light.k : 0;
            if (lk < 0.5 && p.disc(x - r * 0.2, y - r * 0.32, r * 0.48, this.cap, a * 0.32 * (1 - age * 0.7) * (1 - lk * 2)), lk <= 0.02) continue;
            let lx = light.x - x, ly = light.y - y, dl = Math.sqrt(lx * lx + ly * ly) || 1, ux = lx / dl, uy = ly / dl, lit = Math.min(1, light.k * clamp(1.3 - dl / light.reach)) * a;
            if (lit <= 0.02) continue;
            let [hot, warm, dim] = this.rim;
            p.disc(x + ux * r * 0.26, y + uy * r * 0.26, r * 0.72, dim, lit * 0.55), p.disc(x + ux * r * 0.5, y + uy * r * 0.5, r * 0.46, warm, lit * 0.5), r > 3 && p.disc(x + ux * r * 0.68, y + uy * r * 0.68, r * 0.24, hot, lit * 0.4);
          }
        }
      };
      Drops = class {
        constructor(o = {}) {
          this.list = [], this.floor = o.floor ?? (() => 0), this.onLand = o.onLand ?? null, this.g = o.g ?? 0.8;
        }
        add(x, y, vx, vy, size = 1) {
          this.list.push({ x, y, vx, vy, size });
        }
        update(dt) {
          for (let i = this.list.length - 1; i >= 0; i--) {
            let d = this.list[i];
            d.vy += GRAVITY * this.g * dt, d.vx -= d.vx * 0.4 * dt, d.x += d.vx * dt, d.y += d.vy * dt;
            let f = this.floor(d.x);
            d.vy > 0 && d.y >= f && (this.onLand?.(d.x, f, d.vy, d.size), this.list.splice(i, 1));
          }
        }
        draw(p, body4, shine) {
          for (let d of this.list) {
            let up = d.vy < 0;
            p.px(d.x, d.y, body4), d.size > 1.4 && p.px(d.x, d.y + (up ? 1 : -1), body4), p.px(d.x, d.y - (d.size > 1.4 && !up ? 1 : 0), shine);
          }
        }
      };
    }
  });

  // src/fx/shadow/curse.js
  var curse_exports = {};
  __export(curse_exports, {
    act: () => act7,
    create: () => create10,
    meta: () => meta13
  });
  function skull(p, C, K2, s, sq, ox, oy, white, crack) {
    let PAL3 = { k: K2[0], d: K2[1], m: K2[2], l: K2[3], h: K2[4], e: C[0], n: C[0], t: K2[3], g: K2[0] }, cx = ox, cy = SY2 + oy, hw = SW / 2 * s + 1, hh = SH / 2 * s * sq + 1;
    p.shade(cx - hw, cy - hh, cx + hw, cy + hh, (x, y) => {
      let u = Math.floor((x - cx) / s + SW / 2), v = Math.floor((y - cy) / (s * sq) + SH / 2);
      if (!inSkull(u, v)) return;
      let ch = SKULL[v][u];
      if (white) return ch === "e" || ch === "n" ? C[5] : WHITE;
      let ck = CRACKS.get(v * SW + u);
      return ck !== void 0 && ck < crack ? crack > 0.55 && (u + v) % 2 ? C[6] : K2[0] : PAL3[ch];
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
    let C = fit(o.palette, 8), K2 = fit(o.bone, 5), R6 = new Rng(o.seed), A = o.actor, floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [WHITE, C[7], C[6], C[5]], haze: C[4] }), puffs = new Puffs({ rng: R6, flame: [WHITE, C[7], C[6], C[5], C[4], C[3], C[2], C[1], C[0]], soot: [mix(C[3], C[2], 0.5), mix(C[1], C[0], 0.3)], cap: mix(C[4], C[2], 0.5), rim: [C[6], C[5], C[4]], floor }), dust = new Puffs({ rng: R6, flame: [WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE], soot: [mix(K2[2], K2[1], 0.4), mix(K2[1], K2[0], 0.5)], cap: K2[3], rim: [K2[4], K2[3], K2[2]], floor }), bits = new Bits({ ground: floor }), lights = [], t = 0, stamped = !1, broke = !1, acc = 0, light = (x, y, r, c, k, life) => lights.push({ x, y, r, c, k, life, max: life }), head4 = A ? A.y : -38;
    return {
      update(dt) {
        if (t += dt, t < STAMP - 0.05) {
          let k = t / STAMP;
          for (acc += dt * (40 + 60 * k); acc > 1; acc--) {
            let a = R6.range(0, TAU), D25 = R6.range(22, 44);
            ps.spawn(P.MOTE, Math.cos(a) * D25, SY2 + Math.sin(a) * D25 * 0.8, -Math.sin(a) * 60, Math.cos(a) * 60, 0.8, R6.pick([WHITE, C[7], C[6], C[5]]), R6.range(0.6, 1));
          }
          if (R6.chance(dt * 14)) {
            let a = R6.range(0, TAU), D25 = R6.range(20, 34);
            puffs.spawn(PK.SOOT, Math.cos(a) * D25, SY2 + Math.sin(a) * D25 * 0.7, -Math.sin(a) * 40, Math.cos(a) * 30, R6.range(0.5, 0.7), R6.range(3, 5.5));
          }
          attract(ps.list, 0, SY2, 9e5 * (0.4 + k), 70, 0.6, 2.5, dt, (q) => q.k === P.MOTE ? 1 : 0, 300), attract(puffs.list, 0, SY2, 5e5 * (0.4 + k), 60, 0.7, 3.5, dt, () => 1, 120);
        }
        if (t >= STAMP && !stamped) {
          stamped = !0, ps.list.length = 0, puffs.list.length = 0, light(0, SY2, 64, C[5], 1, 0.35), light(0, SY2, 30, WHITE, 1, 0.1), light(0, head4 + 12, 40, C[4], 0.6, 0.5);
          for (let i = 0; i < 22; i++) {
            let a = R6.range(0, TAU), sp = R6.range(80, 160);
            ps.spawn(P.SPARK, Math.cos(a) * 6, SY2 + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp - 30, R6.range(0.2, 0.5));
          }
          for (let i = 0; i < 6; i++) {
            let a = R6.range(0, TAU), sp = R6.range(20, 45);
            puffs.spawn(PK.SOOT, Math.cos(a) * 8, SY2 + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp * 0.6 - 10, R6.range(0.6, 0.9), R6.range(2.5, 4.5));
          }
        }
        if (stamped && !broke) {
          for (let [ex, ey] of EYES)
            R6.chance(dt * 9) && ps.spawn(P.EMBER, ex, SY2 + ey - 3, R6.range(-10, 10), -R6.range(20, 45), R6.range(0.5, 0.9), C[6]), R6.chance(dt * 7) && puffs.spawn(PK.SOOT, ex + R6.range(-1, 1), SY2 + ey - 3, R6.range(-5, 5), -R6.range(14, 26), R6.range(0.5, 0.8), R6.range(1.4, 2.4));
          R6.chance(dt * 8) && ps.spawn(P.VAPOUR, R6.range(-7, 7), SY2 + R6.range(-6, 6), R6.range(-12, 12), R6.range(-12, 4), R6.range(0.5, 0.8), R6.chance(0.5) ? C[3] : C[4], R6.range(5, 8)), R6.chance(dt * 12) && ps.spawn(P.MOTE, R6.range(-4, 4), SY2 + 9, R6.range(-6, 6), R6.range(40, 70), R6.range(0.25, 0.4), R6.chance(0.5) ? C[6] : C[5], 0.8), R6.chance(dt * 10) && puffs.spawn(PK.SOOT, R6.range(-3.5, 3.5), SY2 + 9, R6.range(-3, 3), R6.range(14, 26), R6.range(0.45, 0.7), R6.range(1.2, 2.2)), t > STAMP + 0.3 && R6.chance(dt * 5) && ps.spawn(P.STAR, R6.range(-1, 1) * (A ? A.w / 2 : 10), head4 + R6.range(4, A ? A.h - 4 : 30), 0, -6, R6.range(0.3, 0.5), C[6], R6.range(1, 2));
        }
        if (t >= BREAK && !broke) {
          broke = !0;
          for (let i = 0; i < 24; i++) {
            let x, y;
            do
              x = R6.range(-8.5, 8.5), y = R6.range(-9, 9);
            while (!inSkull(Math.floor(x + SW / 2), Math.floor(y + SH / 2)));
            bits.add({ kind: B.CHUNK, x, y: SY2 + y, vx: x * R6.range(2.5, 6) + R6.range(-12, 12), vy: R6.range(-70, 10), g: 0.85, drag: 0.4, bounce: 0.35, life: R6.range(0.8, 1.2), a: R6.range(0, TAU), va: R6.range(-14, 14), s: R6.range(1, 2.4), ramp: [K2[0], K2[1], K2[2], K2[3], K2[4]] });
          }
          for (let i = 0; i < 26; i++) ps.spawn(P.GRIT, R6.range(-7, 7), SY2 + R6.range(-8, 8), R6.range(-32, 32), R6.range(-60, 20), R6.range(0.8, 1.3), R6.pick([K2[2], K2[3], K2[3], K2[4]]), R6.chance(0.3) ? 2 : 1);
          for (let i = 0; i < 7; i++) dust.spawn(PK.SOOT, R6.range(-7, 7), SY2 + R6.range(-8, 6), R6.range(-25, 25), R6.range(-20, 5), R6.range(0.5, 0.8), R6.range(2, 4), R6.range(0, 0.1));
          for (let [ex, ey] of EYES) puffs.spawn(PK.FLAME, ex, SY2 + ey, Math.sign(ex) * 6, -30, 0.5, 2.6, 0, !1);
          light(0, SY2, 40, C[5], 0.5, 0.25);
        }
        for (let i = lights.length - 1; i >= 0; i--) (lights[i].life -= dt) <= 0 && lights.splice(i, 1);
        bits.update(dt);
        for (let b of bits.list)
          b.rest && !b.dusted && (b.dusted = !0, dust.spawn(PK.SOOT, b.x, -1.5, R6.range(-12, 12), -R6.range(4, 10), R6.range(0.35, 0.6), R6.range(1.5, 2.5)));
        ps.update(dt), puffs.update(dt), dust.update(dt);
      },
      drawBack(p) {
        puffs.draw(p, PK.SOOT, { x: 0, y: SY2, k: stamped && !broke ? 0.8 : 0.3, reach: 50 }), dust.draw(p, PK.SOOT), ps.draw(p, "back");
      },
      draw(p) {
        let flood = smooth(STAMP + 0.04, STAMP + 0.42, t), ebb = 1 - smooth(BREAK + 0.15, BREAK + 0.75, t);
        if (A && flood > 0 && ebb > 0) {
          let k = ebb, pulse2 = 0.85 + 0.15 * Math.sin(t * 9);
          for (let my = 0; my < A.h; my++) {
            let u = my / A.h;
            if (u > flood + 0.06) break;
            let edge = flood < 1 && Math.abs(u - flood) < 0.05, band2 = flood >= 1 && Math.abs(u - (t - STAMP) * 1.3 % 1.4 + 0.2) < 0.06;
            for (let mx = 0; mx < A.w; mx++) {
              let c0 = A.pixels[my * A.w + mx];
              if (!c0) continue;
              let l = luma(c0), cc = l > 0.72 ? C[6] : l > 0.5 ? C[5] : l > 0.33 ? C[4] : l > 0.18 ? C[3] : C[2];
              p.blend(A.x + mx, A.y + my, edge ? C[7] : band2 ? C[6] : cc, edge ? 0.85 : band2 ? 0.7 * k : 0.6 * k * pulse2);
            }
          }
          p.outline(A.mask, A.x, A.y, (mx, my) => Math.sin(my * 0.7 - t * 14 + mx * 0.3) > 0.2 ? C[6] : C[4], (mx, my) => my / A.h <= flood ? k : 0), p.glow(0, A.y + A.h * 0.45, 30, C[4], 0.3 * k * pulse2);
        }
        if (t < STAMP) {
          let q = t / STAMP;
          p.glow(0, SY2, 14 + 16 * q, C[5], 0.2 + 0.5 * q), q > 0.15 && ringFast(p, 0, SY2, 4 + 30 * (1 - ease.inQuad(q)), 1, q > 0.7 ? C[5] : q > 0.4 ? C[4] : C[3]);
        }
        if (t >= STAMP && t < BREAK) {
          let u = (t - STAMP) / 0.1, s = u < 1 ? 1.7 - 0.7 * ease.inQuad(u) : 1, land = t - STAMP - 0.1, sq = land > 0 ? 1 - 0.16 * Math.exp(-land * 18) * Math.cos(land * 40) : 1, shake = t > CRACK ? (t - CRACK) * 4 : 0, ox = Math.round(Math.sin(t * 61) * shake), oy = land > 0 ? Math.round(Math.sin(t * 3.4) * 1.2) : 0;
          skull(p, C, K2, s, sq, ox, oy, t < STAMP + 0.067, smooth(CRACK, BREAK, t));
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
  var meta13, COWER, act7, SY2, STAMP, CRACK, BREAK, SKULL, SW, SH, EYES, inSkull, CRACKS, init_curse = __esm({
    "src/fx/shadow/curse.js"() {
      init_core();
      init_lib7();
      meta13 = {
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
        for (let path2 of paths) {
          let n = 0, len2 = path2.length - 1;
          for (let k = 0; k < len2; k++) {
            let [x0, y0] = path2[k], [x1, y1] = path2[k + 1], steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
            for (let s = 0; s <= steps; s++) {
              let x = Math.round(x0 + (x1 - x0) * s / steps), y = Math.round(y0 + (y1 - y0) * s / steps), key = y * SW + x;
              out.has(key) || out.set(key, (k + s / Math.max(1, steps)) / len2), n++;
            }
          }
        }
        return out;
      })();
    }
  });

  // src/fx/status/_lib.js
  function shape(a) {
    let m = a.mask, s = SHAPES2.get(m);
    if (s) return s;
    let { w, h, data } = m, on2 = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[y * w + x] > 0, body4 = [], up = [], side = [], outline = [], top = [], rows = [];
    for (let x = 0; x < w; x++) {
      let y = 0;
      for (; y < h && !on2(x, y); ) y++;
      top.push(y < h ? y : -1);
    }
    for (let y = 0; y < h; y++) {
      let l = -1, r = -1;
      for (let x = 0; x < w; x++)
        on2(x, y) && (l < 0 && (l = x), r = x, body4.push([x, y]), on2(x, y - 1) || up.push([x, y]), on2(x - 1, y) || side.push([x, y, -1]), on2(x + 1, y) || side.push([x, y, 1]));
      rows.push([l, r]);
    }
    for (let y = -1; y <= h; y++)
      for (let x = -1; x <= w; x++) {
        if (on2(x, y)) continue;
        let nx = 0, ny = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) on2(x + dx, y + dy) && (nx -= dx, ny -= dy);
        if (on2(x - 1, y) || on2(x + 1, y) || on2(x, y - 1) || on2(x, y + 1)) {
          let l = Math.hypot(nx, ny) || 1;
          outline.push([x, y, nx / l, ny / l]);
        }
      }
    return s = { w, h, on: on2, body: body4, up, side, outline, top, rows }, SHAPES2.set(m, s), s;
  }
  function wnoise(x, P3, seed2 = 0) {
    let i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = rand(wrap(i, P3), seed2), b = rand(wrap(i + 1, P3), seed2);
    return (a + (b - a) * u) * 2 - 1;
  }
  function tnoise(t, D25, f, seed2 = 0, off2 = 0) {
    let P3 = Math.max(2, Math.round(f * D25));
    return wnoise(t / D25 * P3 + off2, P3, seed2);
  }
  function tongue(p, x, y, h, w, sx, F, t, D25, n, layers = LAYERS2) {
    if (!(h < 1))
      for (let [lw, lh, ri] of layers) {
        if (ri === 0 && h < 4) continue;
        let H3 = h * lh, col = F[ri];
        for (let r = 0; r <= H3; r++) {
          let u = r / Math.max(1, H3), half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + tnoise(t, D25, 9, n, r * 0.45) * 0.5;
          if (half < 0.3) continue;
          let cx = x + sx * u * u * lh + tnoise(t, D25, 4, n + 7, r * 0.2) * u * 1.1;
          for (let px = Math.round(cx - half); px <= Math.round(cx + half); px++) p.px(px, Math.round(y - r), col);
        }
      }
  }
  function smoke(p, x, y, size, u, col, k = 1, warm = 0) {
    let r = size * (0.65 + Math.min(1, u * 2.5) * 0.45 + u * 0.4), a = Math.min(1, u * 12) * Math.min(1, (1 - u) * 2.4) * 0.58 * k;
    if (a <= 0.01) return;
    let c = col ? mix(col, rampAt3(SMOKE_RAMP, u), u) : rampAt3(SMOKE_RAMP, u * 1.05);
    p.disc(x, y, r, c, a * 0.45), p.disc(x + r * 0.05, y + r * 0.06, r * 0.74, c, a * 0.62), warm && u < 0.6 && p.disc(x + r * 0.1, y + r * 0.3, r * 0.56, mix(c, warm, 0.5), a * 0.7 * (1 - u / 0.6)), u < 0.5 && p.disc(x - r * 0.22, y - r * 0.3, r * 0.5, mix(c, WHITE, 0.12), a * 0.4 * (1 - u * 2));
  }
  function ember2(p, x, y, u, E2, ph, k = 1) {
    let left = 1 - u;
    if (left < 0.22 && Math.sin(ph * 40) < 0) return;
    let c = left > 0.5 ? Math.sin(ph * 22) > -0.2 ? E2[0] : E2[1] : left > 0.22 ? E2[1] : E2[2];
    p.px(x, y, c), p.glow(x, y, 3, c, 0.32 * left * k);
  }
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
  function icon(p, x, y, ext, inside, R6, a = 1, paint = null) {
    let X = Math.round(x), Y3 = Math.round(y), at2 = (dx, dy) => !!inside(dx, dy);
    for (let dy = -ext - 1; dy <= ext + 1; dy++)
      for (let dx = -ext - 1; dx <= ext + 1; dx++) {
        let ch = inside(dx, dy), c;
        if (ch)
          if (paint && paint[ch] !== void 0) c = paint[ch];
          else {
            let top = !at2(dx, dy - 1), left = !at2(dx - 1, dy), bottom = !at2(dx, dy + 1), right = !at2(dx + 1, dy);
            c = top || left ? R6[3] : bottom || right ? R6[1] : R6[2];
          }
        else if (R6[0] && (at2(dx - 1, dy) || at2(dx + 1, dy) || at2(dx, dy - 1) || at2(dx, dy + 1))) c = R6[0];
        else continue;
        p.dot(X + dx, Y3 + dy, c, a);
      }
  }
  function starShape(r0 = 0.45) {
    return (u, v) => {
      let a = Math.atan2(v, u) + Math.PI / 2, d = Math.hypot(u, v), seg3 = 2 * Math.PI / 5, k = 1 - Math.abs((a % seg3 + seg3) % seg3 - seg3 / 2) / (seg3 / 2);
      return d <= 1 - (1 - r0) * Math.pow(k, 0.8);
    };
  }
  function eyes(a) {
    let list = EYES2.get(a.mask);
    if (list) return list;
    if (a.eyes)
      return list = a.eyes.map(([x, y]) => ({ x0: x, x1: x, y0: y, y1: y + 1, px: [[x, y], [x, y + 1]], skin: colorAt(a, x, y) })), EYES2.set(a.mask, list), list;
    let S = shape(a), W4 = S.w, col = (x, y) => S.on(x, y) ? colorAt(a, x, y) : 0, dark = (x, y) => S.on(x, y) && y < S.h * 0.4 && luma(col(x, y)) < 0.15 && S.on(x - 1, y) && S.on(x + 1, y) && S.on(x, y - 1) && S.on(x, y + 1), seen = /* @__PURE__ */ new Set();
    list = [];
    for (let [x0, y0] of S.body) {
      if (seen.has(y0 * W4 + x0) || !dark(x0, y0)) continue;
      let px = [], q = [[x0, y0]];
      for (seen.add(y0 * W4 + x0); q.length; ) {
        let [x, y] = q.pop();
        px.push([x, y]);
        for (let [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          let nx = x + dx, ny = y + dy, k = ny * W4 + nx;
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
  var SHAPES2, colorAt, travel2, LAYERS2, rampAt3, shaped, heartShape, EYES2, init_lib8 = __esm({
    "src/fx/status/_lib.js"() {
      init_core();
      SHAPES2 = /* @__PURE__ */ new WeakMap();
      colorAt = (a, x, y) => a.pixels ? a.pixels[y * a.mask.w + x] : a.mask.data[y * a.mask.w + x] ? 4285229931 : 0;
      travel2 = (v, g, d, a) => d > 0 ? g / d * a + (v - g / d) * (1 - Math.exp(-d * a)) / d : v * a + 0.5 * g * a * a, LAYERS2 = [[1, 1, 6], [0.76, 0.86, 4], [0.54, 0.68, 2], [0.3, 0.42, 0]];
      rampAt3 = (r, t) => r[Math.min(r.length - 1, Math.max(0, Math.floor(t * r.length)))];
      shaped = (f, s, ang = 0) => {
        let c = Math.cos(ang), n = Math.sin(ang);
        return (dx, dy) => {
          let x = dx + 0.5, y = dy + 0.5;
          return f((x * c + y * n) / s, (-x * n + y * c) / s) ? "#" : "";
        };
      };
      heartShape = (u, v) => (u + 0.5) ** 2 + (v + 0.32) ** 2 <= 0.55 ** 2 || (u - 0.5) ** 2 + (v + 0.32) ** 2 <= 0.55 ** 2 || v >= -0.32 && v <= 1 && Math.abs(u) <= 1.04 * Math.pow(1 - (v + 0.32) / 1.32, 0.75), EYES2 = /* @__PURE__ */ new WeakMap();
    }
  });

  // src/fx/status/bleeding.js
  var bleeding_exports = {};
  __export(bleeding_exports, {
    act: () => act8,
    draw: () => draw4,
    drawBack: () => drawBack,
    meta: () => meta14
  });
  function wounds(a) {
    let w = WOUNDS.get(a.mask);
    if (w) return w;
    let S = shape(a), H3 = S.h, W4 = S.w, make = (mx, my, drops, phase) => {
      let run = 1;
      for (; run < 3 && S.on(mx, my + run + 1); ) run++;
      return { x: a.x + mx + 0.5, mx, y0: a.y + my, yb: a.y + my + run + 1, drops, phase, side: mx < W4 / 2 ? -1 : 1 };
    }, edge = (q, side) => {
      let my = Math.round(H3 * q), [l, r] = S.rows[my];
      return [side < 0 ? l + 1 : r - 1, my];
    }, front = S.body.filter(([x, y]) => y > H3 * 0.5 && y < H3 * 0.62 && x > W4 * 0.55 && x < W4 * 0.75 && S.on(x, y + 3))[0] ?? edge(0.55, 1);
    return w = [make(...edge(0.57, -1), 3, 0), make(...front, 2, 0.35), make(...edge(0.6, 1), 2, 0.7)], WOUNDS.set(a.mask, w), w;
  }
  function drop(p, C, x, y, v, s) {
    let tail2 = Math.min(5, v * 0.012);
    tail2 >= 1 && p.line(x, y - tail2, x, y - 1, s >= 2 ? C[3] : C[2]), s >= 2 ? (p.px(x, y, C[5]), p.px(x + 1, y, C[4]), p.px(x, y + 1, C[3]), p.px(x + 1, y + 1, C[2])) : p.px(x, y, C[4]);
  }
  function splat(p, C, x, ground, age, big, seed2) {
    let life = D2 * 0.85;
    if (age < 0 || age > life) return;
    let spread = smooth(0, 0.1, age), hw = (big ? 2.2 : 1.4) * (0.5 + 0.5 * spread), fade = 1 - smooth(life - 0.5, life, age), dry = age < 0.35 ? 4 : age < 1 ? 3 : 2;
    for (let xx = Math.floor(x - hw); xx <= Math.ceil(x + hw); xx++) p.dot(xx, ground - 1, Math.abs(xx + 0.5 - x) > hw * 0.75 ? C[dry - 1] : C[dry], fade);
    if (age < 0.3 && p.px(x - 0.5, ground - 1, C[5]), age < 0.4)
      for (let j = 0; j < (big ? 3 : 2); j++) {
        let vx = (j % 2 ? 1 : -1) * (18 + 24 * rand(seed2, j, 1)), vy = -(40 + 40 * rand(seed2, j, 2)), tt = age, dx = vx * tt, dy = vy * tt + 0.5 * G2 * tt * tt;
        dy <= 0 && p.px(x + dx, ground - 1 + dy, j ? C[3] : C[4]);
      }
  }
  function drawBack(p, t, o) {
    let C = fit(o.palette, 6), a = o.actor, W4 = wounds(a), px = (W4[0].x + W4[2].x) / 2 - 1, rx = 6.5, beat4 = Math.exp(-((t % BEAT + BEAT) % BEAT / 0.25));
    for (let x = Math.floor(px - rx - 1); x <= px + rx + 1; x++) {
      let q = Math.abs(x + 0.5 - px) / rx;
      q > 1.1 || (p.px(x, -1, q > 0.85 ? C[2] : C[1]), q < 0.8 && p.px(x, 0, q < 0.5 ? C[1] : C[0]), q < 0.45 && p.px(x, 1, C[0]));
    }
    p.px(px - 2, -1, C[4]), p.px(px - 1, -1, C[3]), p.px(px + 3, -1, C[3]), p.glow(px, -1, 8, C[3], 0.06 + 0.04 * beat4);
  }
  function draw4(p, t, o) {
    let C = fit(o.palette, 6), a = o.actor, W4 = wounds(a), S = shape(a), ph = (t % BEAT + BEAT) % BEAT, hurt = Math.max(0, 1 - ph / 0.12);
    if (hurt > 0) for (let [mx, my] of S.body) p.blend(a.x + mx, a.y + my, C[4], 0.26 * hurt);
    for (let w2 of W4) {
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
    let w = W4[0];
    if (ph < 0.5)
      for (let j = 0; j < 7; j++) {
        let vx = w.side * (18 + 42 * rand(j, 7)), vy = -(15 + 50 * rand(j, 8)), tt = ph - j * 0.012;
        if (tt <= 0) continue;
        let x = w.x + travel2(vx, 0, 1.2, tt), y = w.y0 + travel2(vy, G2 * 0.8, 0.6, tt), x2 = w.x + travel2(vx, 0, 1.2, tt - 0.02), y2 = w.y0 + travel2(vy, G2 * 0.8, 0.6, tt - 0.02);
        y >= -1 || (p.line(x2, y2, x, y, j % 3 ? C[3] : C[2]), p.px(x, y, j % 2 ? C[5] : C[4]));
      }
    p.glow(w.x, w.y0, 6, C[4], 0.25 * hurt);
  }
  var meta14, CLUTCH, BEAT_, act8, D2, BEAT, G2, WOUNDS, init_bleeding = __esm({
    "src/fx/status/bleeding.js"() {
      init_core();
      init_lib8();
      meta14 = {
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
    }
  });

  // src/fx/status/sleep.js
  var sleep_exports = {};
  __export(sleep_exports, {
    act: () => act9,
    draw: () => draw5,
    meta: () => meta15
  });
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
      let old = u > 0.78 ? 1 : 0, R6 = old ? [C[0], C[1], C[2], C[3]] : [C[1], C[2], C[3], C[4]];
      icon(p, z.x, z.y, 7, ZS[z.size], R6, z.k), old || p.px(z.x - 2 - z.size, z.y - 2 - z.size * 0.8, C[5]), p.glow(z.x, z.y, 7 + z.size * 3, C[3], (old ? 0.12 : 0.26) * z.k);
    }
  }
  var meta15, NOD, act9, D3, NZ, ZS, init_sleep = __esm({
    "src/fx/status/sleep.js"() {
      init_core();
      init_lib8();
      meta15 = {
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
    }
  });

  // src/fx/spawn/poof.js
  var poof_exports = {};
  __export(poof_exports, {
    create: () => create11,
    meta: () => meta16
  });
  function create11(o) {
    let C = fit(o.palette, 6), S = fit(o.stars, 3), R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [WHITE, S[1], S[0], C[2]] }), lights = new Lights(), balls = [], lines2 = [], ring4 = 9;
    for (let i = 0; i < ring4; i++) {
      let a = i / ring4 * TAU + R6.range(-0.2, 0.2), sp = R6.range(95, 140), r = R6.range(5, 7);
      balls.push({ x: Math.cos(a) * 3, y: CY + Math.sin(a) * 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 - 12, r0: r * 0.5, r1: r, life: R6.range(0.7, 1.05), delay: R6.range(0, 0.03) });
    }
    for (let i = 0; i < 5; i++) {
      let a = R6.range(0, TAU), sp = R6.range(20, 60);
      balls.push({ x: Math.cos(a) * 2, y: CY + Math.sin(a) * 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 16, r0: 4, r1: R6.range(6.5, 8.5), life: R6.range(0.85, 1.2), delay: R6.range(0.02, 0.06) });
    }
    for (let i = 0; i < 7; i++) {
      let a = R6.range(0, TAU), sp = R6.range(170, 240), r = R6.range(2.2, 3.6);
      balls.push({ x: Math.cos(a) * 4, y: CY + Math.sin(a) * 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.75 - 10, r0: r * 0.6, r1: r, life: R6.range(0.32, 0.5), delay: R6.range(0.01, 0.04) });
    }
    for (let b of balls) b.max = b.life;
    for (let i = 0; i < 12; i++) {
      let a = i / 12 * TAU + R6.range(-0.12, 0.12) + 0.13, sa = Math.sin(a);
      lines2.push({ a, r1: Math.min(R6.range(24, 34), sa > 0.1 ? (-2 - CY) / sa : 99), d: R6.range(0, 0.04) });
    }
    for (let i = 0; i < 7; i++) {
      let a = R6.range(-Math.PI, 0.3), sp = R6.range(70, 125);
      ps.spawn(P.STAR, Math.cos(a) * 6, CY + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp - 30, R6.range(0.55, 0.95), R6.pick([S[2], S[1], S[1], S[0]]), R6.range(1.3, 2.4), R6.range(0.02, 0.1));
    }
    for (let i = 0; i < 10; i++) {
      let a = R6.range(0, TAU), sp = R6.range(40, 110);
      ps.spawn(P.STAR, Math.cos(a) * 5, CY + Math.sin(a) * 5, Math.cos(a) * sp, Math.sin(a) * sp - 20, R6.range(0.3, 0.6), R6.pick([WHITE, S[1]]), 0.6, R6.range(0, 0.08));
    }
    for (let i = 0; i < 6; i++) {
      let s = R6.sign();
      ps.spawn(P.DUST, s * R6.range(1, 6), -1, s * R6.range(25, 70), -R6.range(2, 10), R6.range(0.4, 0.7), C[2], R6.range(1.6, 3), R6.range(0.02, 0.08));
    }
    lights.add(0, CY, 46, C[4], 0.8, 0.4), lights.add(0, CY, 22, WHITE, 0.8, 0.1);
    let t = 0, radius3 = (b) => {
      let age = b.max - b.life, u = age / b.max, grow = b.r0 + (b.r1 - b.r0) * ease.outBack(clamp(age / 0.22), 2), breathe2 = 1 + 0.06 * Math.sin(age * 14 + b.r1);
      return grow * breathe2 * (u < 0.62 ? 1 : 1 - ease.inBack(clamp((u - 0.62) / 0.38), 1.4));
    }, drawBall = (p, b, layer) => {
      let age = b.max - b.life, r = radius3(b), a = Math.min(1, age * 20), lit = age < 0.12;
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
          b.vx -= b.vx * 7 * dt, b.vy -= b.vy * 7 * dt + 30 * dt, b.x += b.vx * dt, b.y = Math.min(b.y + b.vy * dt, -radius3(b) * 0.7);
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
        for (let l of lines2) {
          let u = (t - l.d) / 0.2;
          if (u <= 0 || u >= 1) continue;
          let head4 = 8 + (l.r1 - 8) * ease.outExpo(clamp(u / 0.6)), tail2 = 8 + (l.r1 - 8) * ease.inCubic(u), ca = Math.cos(l.a), sa = Math.sin(l.a);
          p.line(ca * tail2, CY + sa * tail2, ca * head4, CY + sa * head4, (v) => v > 0.6 ? WHITE : C[4]), p.glowLine(ca * tail2, CY + sa * tail2, ca * head4, CY + sa * head4, 3, C[4], 0.25);
        }
        ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta16, CY, init_poof = __esm({
    "src/fx/spawn/poof.js"() {
      init_core();
      meta16 = {
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
    }
  });

  // src/fx/spawn/_lib.js
  function bodyOf(actor, C) {
    let m = actor.mask, px = actor.pixels, list = [], cells = new Array(m.w * m.h).fill(null), on2 = (mx, my) => mx >= 0 && my >= 0 && mx < m.w && my < m.h && !!m.data[my * m.w + mx];
    for (let my = 0; my < m.h; my++)
      for (let mx = 0; mx < m.w; mx++) {
        if (!on2(mx, my)) continue;
        let own = px?.[my * m.w + mx], c = own ? hex(own) : C[Math.max(1, Math.min(C.length - 2, Math.round((C.length - 2) * (0.85 - my / m.h * 0.5))))], b = { x: actor.x + mx, y: actor.y + my, mx, my, c, edge: !on2(mx - 1, my) || !on2(mx + 1, my) || !on2(mx, my - 1) || !on2(mx, my + 1) };
        list.push(b), cells[my * m.w + mx] = b;
      }
    return { list, w: m.w, h: m.h, x: actor.x, y: actor.y, on: on2, cell: (mx, my) => on2(mx, my) ? cells[my * m.w + mx] : null };
  }
  function rimOf(body4) {
    let out = [];
    for (let my = -1; my <= body4.h; my++)
      for (let mx = -1; mx <= body4.w; mx++)
        !body4.on(mx, my) && (body4.on(mx - 1, my) || body4.on(mx + 1, my) || body4.on(mx, my - 1) || body4.on(mx, my + 1)) && out.push({ x: body4.x + mx, y: body4.y + my, mx, my });
    return out;
  }
  var init_lib9 = __esm({
    "src/fx/spawn/_lib.js"() {
      init_core();
    }
  });

  // src/fx/spawn/soul-rise.js
  var soul_rise_exports = {};
  __export(soul_rise_exports, {
    act: () => act10,
    actorAlpha: () => actorAlpha,
    create: () => create12,
    meta: () => meta17
  });
  function create12(o) {
    let C = fit(o.palette, 7), R6 = new Rng(o.seed), floor = () => 0, body4 = bodyOf(o.actor, C), rim = rimOf(body4), W4 = body4.w, Hh = body4.h, waist = Math.round(Hh * 0.6), tone = body4.list.map((b) => b.edge ? 6 : 3 + Math.min(2, Math.floor(luma(b.c) * 3.6))), toneAt = new Int8Array(W4 * Hh).fill(-1);
    body4.list.forEach((b, i) => toneAt[b.my * W4 + b.mx] = tone[i]);
    let ps = new Particles({ rng: R6, ground: floor, sparks: [WHITE, C[5], C[4], C[3]] }), lights = new Lights(), t = 0, left = !1, lift = () => o.height * ease.inOutSine(clamp((t - LEAVE) / (TOP - LEAVE))), stretch = () => 1 + 0.22 * ease.inOutSine(clamp((t - LEAVE) / (TOP - LEAVE))), sway = (row) => Math.sin(t * 3 - row * 0.12) * 2.2 * smooth(LEAVE, LEAVE + 0.5, t), melt = () => smooth(LEAVE + 0.1, LEAVE + 0.9, t), thin = () => smooth(TOP - 0.25, GONE, t), ring4 = (p, near2) => {
      let k = (t - LEAVE) / 0.5;
      k > 0 && k < 1 && band(p, 0, 0, 6 + 26 * ease.outCubic(k), 0.18, Math.max(1, 3 * (1 - k)), 1.15 - k, C, (g) => Math.sin(g) >= 0 === near2, k < 0.12);
    };
    return {
      update(dt) {
        if (t += dt, !left && t >= LEAVE) {
          left = !0, lights.add(0, -20, 50, C[4], 0.85, 0.55), lights.add(0, -20, 24, WHITE, 0.8, 0.12);
          for (let i = 0; i < 10; i++) {
            let c = R6.pick(rim);
            ps.spawn(P.STAR, c.x, c.y, R6.range(-20, 20), -R6.range(20, 60), R6.range(0.4, 0.8), R6.pick([WHITE, C[5]]), R6.range(0.8, 1.8));
          }
        }
        if (t > LEAVE && t < GONE) {
          let s = stretch(), y0 = body4.y * s - lift(), th = thin();
          for (let n = 0; n < (th > 0 ? 3 : 1); n++) {
            if (!R6.chance(th > 0 ? 0.9 : 0.5)) continue;
            let c = R6.pick(rim), row = c.my;
            if (row / Hh < 1 - th * 1.1 - 0.05 && th > 0) continue;
            let x = c.x * (1 - 0.12 * (s - 1) * 4) + sway(row), y = y0 + c.my * s, life = Math.min(R6.range(0.5, 1.1), meta17.duration - 0.1 - t, (y + 120) / 60);
            life > 0.1 && ps.spawn(R6.chance(0.7) ? P.MOTE : P.STAR, x, y, R6.range(-12, 12), -R6.range(25, 60), life, R6.pick([WHITE, C[5], C[5], C[4]]), R6.range(0.5, 1));
          }
        }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let k = smooth(0, LEAVE, t) * (1 - smooth(LEAVE + 0.4, TOP, t));
        k > 0 && p.glow(0, -1, 26, C[4], 0.3 * k), ring4(p, !1);
      },
      draw(p) {
        if (t < LEAVE + 0.3) {
          let k = t < LEAVE ? t / LEAVE : 1 - (t - LEAVE) / 0.3;
          for (let c of rim) rand(c.mx, c.my, Math.floor(t * 30)) < 0.25 + 0.7 * k && p.px(c.x, c.y, k > 0.7 ? WHITE : C[5]);
          p.glow(0, -19, 26, C[4], 0.45 * k);
        }
        let dim = smooth(LEAVE, LEAVE + 0.6, t) * (1 - smooth(GONE, meta17.duration - 0.1, t));
        if (dim > 0) for (let b of body4.list) p.blend(b.x, b.y, SHADOW, 0.45 * dim);
        if (ring4(p, !0), t < LEAVE || t > GONE + 0.1) {
          ps.draw(p), lights.draw(p);
          return;
        }
        let s = stretch(), L = lift(), m = melt(), th = thin(), top = body4.y * s - L, sx = 1 - 0.12 * (s - 1) * 4, tail2 = Math.round(10 * m), y1 = top + (Hh + tail2) * s, fadeIn = clamp((t - LEAVE) / 0.15);
        for (let y = Math.floor(top); y <= Math.ceil(y1); y++) {
          let my = Math.floor((y + 0.5 - top) / s);
          if (my < 0) continue;
          let k = my >= waist ? (my - waist + 1) / (Hh - waist + tail2) : 0, narrow = 1 - k * m * 0.95;
          if (narrow <= 0.05) continue;
          let cx = sway(my) + Math.sin(my * 0.7 - t * 8) * 2 * k * m, a = (my >= waist ? 1 - k * 0.45 : 1) * fadeIn;
          for (let x = Math.floor(cx - W4 / 2 - 4); x <= Math.ceil(cx + W4 / 2 + 4); x++) {
            let mx = Math.floor((x + 0.5 - cx) / (sx * narrow) - body4.x);
            if (th > 0 && my / (Hh + tail2) > 1 - th * 1.25 + 0.25 * rand(mx, my, 5) - 0.1) continue;
            let ti;
            if (my < Hh) {
              if (mx < 0 || mx >= W4 || (ti = toneAt[my * W4 + mx], ti < 0)) continue;
            } else {
              let w = (1 - (my - Hh) / Math.max(1, tail2)) * 3.2 * m, d = Math.abs(x + 0.5 - cx);
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
  var meta17, SLUMP, act10, LEAVE, TOP, GONE, SHADOW, actorAlpha, init_soul_rise = __esm({
    "src/fx/spawn/soul-rise.js"() {
      init_core();
      init_lib9();
      meta17 = {
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
      actorAlpha = () => 1;
    }
  });

  // src/fx/pickups/_lib.js
  function glint(p, x, y, arm2, c, k = 0.4, tip = scale(c, 0.8)) {
    let n = Math.round(arm2), X = Math.floor(x), Y3 = Math.floor(y);
    if (!(n < 0)) {
      for (let d = 1; d <= n; d++) {
        let cc = d === n && n > 1 ? tip : c;
        p.px(X + d, Y3, cc), p.px(X - d, Y3, cc), p.px(X, Y3 + d, cc), p.px(X, Y3 - d, cc);
      }
      p.px(X, Y3, n > 0 ? WHITE : c), p.glow(X + 0.5, Y3 + 0.5, 3 + n * 2.5, c, k);
    }
  }
  var SHADOW2, INK3, init_lib10 = __esm({
    "src/fx/pickups/_lib.js"() {
      init_core();
      SHADOW2 = hex("#100e17"), INK3 = hex("#0b0814");
    }
  });

  // src/fx/pickups/collect-burst.js
  var collect_burst_exports = {};
  __export(collect_burst_exports, {
    create: () => create13,
    meta: () => meta18
  });
  function create13(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), lights = new Lights();
    lights.add(0, CY2, 36, C[5], 0.85, 0.32), lights.add(0, CY2, 14, WHITE, 0.75, 0.08);
    let stars = Array.from({ length: 14 }, (_, i) => {
      let a = i / 14 * TAU + R6.range(-0.2, 0.2), sp = R6.range(145, 225) * (i % 3 === 0 ? 1.12 : 0.85);
      return { x: 0, y: CY2, a, sp, turn: (i % 2 ? 1 : -1) * R6.range(2.5, 5), life: R6.range(0.75, 1.15), age: 0, size: i % 3 === 0 ? 2.6 : R6.range(1.2, 2), tr: [], c: i % 4 === 0 ? WHITE : i % 2 ? C[6] : C[5], ph: R6.range(0, TAU) };
    }), motes2 = Array.from({ length: 7 }, () => ({ x: R6.range(-8, 8), y: CY2 + R6.range(-4, 6), vy: -R6.range(12, 30), life: R6.range(0.5, 0.9), d: R6.range(0.05, 0.25), w: R6.range(0, TAU) })), t = 0;
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
        for (let m of motes2) {
          let a = t - m.d;
          if (a < 0 || a > m.life) continue;
          let k = 1 - a / m.life, x = m.x + Math.sin(a * 6 + m.w) * 1.5, y = m.y + m.vy * a;
          p.dot(x, y, k > 0.5 ? C[6] : C[5], k * 1.5), p.glow(x + 0.5, y + 0.5, 3, C[5], 0.3 * k);
        }
        lights.draw(p);
      }
    };
  }
  var meta18, CY2, init_collect_burst = __esm({
    "src/fx/pickups/collect-burst.js"() {
      init_core();
      init_lib10();
      meta18 = {
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
    }
  });

  // src/fx/fire/campfire.js
  var campfire_exports = {};
  __export(campfire_exports, {
    draw: () => draw6,
    meta: () => meta19
  });
  function log(p, L, W4, H3, u0, u1, t, S) {
    let [x0, y0, x1, y1, r] = L, dx = x1 - x0, dy = y1 - y0, len2 = Math.hypot(dx, dy), ax = dx / len2, ay = dy / len2, nx = -ay, ny = ax;
    ny < 0 && (nx = -nx, ny = -ny);
    let rim = 1 - 1.05 / r;
    p.shade(Math.min(x0, x1) - r - 1, Math.min(y0, y1) - r - 1, Math.max(x0, x1) + r + 1, Math.max(y0, y1) + r + 1, (x, y, out) => {
      let along5 = (x - x0) * ax + (y - y0) * ay, u = along5 / len2, s = ((x - x0) * nx + (y - y0) * ny) / r;
      if (u < u0 || u > u1 || Math.abs(s) > 1) return;
      let burn2 = clamp(1.2 - Math.abs(x) / 8), lane = Math.round(s * r * 0.85), run = rand(Math.floor(along5 / 3), lane, S);
      if (Math.abs(s) > rim || along5 > len2 - 1) return s < 0 && burn2 > 0.4 ? H3[7] : W4[0];
      if (burn2 > 0.35 && lane < 2) {
        if (run < 0.55 && lane > -2) {
          let g = 0.5 + 0.5 * Math.sin(t / D4 * Math.PI * 6 + rand(Math.floor(along5 / 2), lane, S + 1) * 6.3);
          return out.k = 0.3 * burn2 * g, g > 0.72 ? H3[3] : g > 0.4 ? H3[4] : H3[5];
        }
        return lane < -1 ? W4[1] : W4[0];
      }
      return lane <= -2 ? run < 0.25 ? W4[2] : mix(W4[3], H3[4], 0.45 * burn2) : lane === -1 ? run < 0.45 ? W4[1] : W4[2] : lane === 0 ? run < 0.2 ? W4[1] : W4[2] : run < 0.4 ? W4[0] : W4[1];
    }), u0 <= 0 && p.ellipse(x0, y0, r * 0.62, r + 0.2, (d) => d > 0.78 ? W4[0] : d > 0.56 ? W4[5] : d > 0.32 ? W4[4] : W4[3]);
  }
  function coals(p, W4, H3, t, S) {
    p.shade(-15, -3, 15, 2, (x, y, out) => {
      let dx = x / 14, dy = (y + 0.3) / 2.2, d = dx * dx + dy * dy;
      if (d > 1) return;
      let h = rand(Math.floor(x / 2), Math.floor(y), S + 20);
      if (d > 0.55 && h < 0.55) return ASH2[h < 0.15 ? 2 : h < 0.32 ? 1 : 0];
      if (h > 0.5) {
        let g = (0.5 + 0.5 * Math.sin(t / D4 * Math.PI * 4 + h * 40)) * (1.1 - d);
        return out.k = 0.35 * g, g > 0.7 ? H3[2] : g > 0.5 ? H3[3] : g > 0.3 ? H3[4] : H3[5];
      }
      return h > 0.3 ? W4[1] : W4[0];
    });
  }
  function draw6(p, t, o) {
    let F = fit(o.palette, 9), H3 = hotFirst(F), W4 = fit(o.wood, 6), S = o.seed, R6 = new Rng(S), HC = o.height, N9 = (rate, seed2 = 0, off2 = 0) => NL2(t, rate, seed2, off2), fla = (tt) => 0.74 + 0.16 * NL2(tt, 7.3, S + 1) + 0.1 * NL2(tt, 19, S + 2), fl = fla(t), GLOW = mix(mix(H3[3], H3[4], 0.5), WHITE, 0.25), SMOKE2 = mix(SMOKE13, H3[6], 0.25), SPARKS = [H3[1], H3[2], H3[4], H3[5]], EMB = [H3[1], H3[2], H3[4], H3[6]], T2 = TONGUES.map(([dx, y, h, w, back], i) => ({ dx: dx + R6.range(-0.4, 0.4), y, h: 3 + HC * h * R6.range(0.92, 1.08), w: w * R6.range(0.9, 1.1), back, env: h, n: (S * 7 + i) * 13 })), lean = (tt) => NL2(tt, 0.67, S + 90) * 0.12, height2 = (i, tt) => {
      let { h, n } = T2[i], leap = Math.max(0, NL2(tt, 2.6, n + 70) - 0.55) * 1.4;
      return (h + 0.25 * h * NL2(tt, 3.3, n) + h * leap) * (0.9 + 0.1 * fla(tt));
    }, sweep = (i, tt, h) => NL2(tt, 2.2, T2[i].n + 40) * (1 + h * 0.08) + lean(tt) * h * 0.9 - clamp(T2[i].dx * 0.3, -2.5, 2.5), tip = (i, tt) => {
      let h = height2(i, tt);
      return [T2[i].dx + sweep(i, tt, h) * 0.85, T2[i].y - h * 0.88 + 3, h];
    }, tongueAt = (i) => {
      let { dx, y, w, n, back } = T2[i], h = height2(i, t);
      flameTongue(p, dx, y, h, w, sweep(i, t, h), N9, n, H3, back ? BACK_LAYERS : w > 2.2 ? BIG_LAYERS2 : LAYERS, 0.5, 1.1 + h * 0.04);
    };
    looped(t, D4, 48, S + 300, (r) => ({ x: r.range(-5, 5), y: -HC * 0.8 - r.range(0, 8), vx: r.range(-2, 2), vy: -r.range(10, 17), life: r.range(2, 2.9), s: r.range(2.4, 3.8) }), (q, age) => {
      let [x, y] = drift(q.x, q.y, q.vx, q.vy, age, 4, -20, 1.6, 1);
      smokePuff(p, x + NL2(t - age, 0.8, S + 60) * (2 + 3 * age), y, 1 - age / q.life, q.s, SMOKE2);
    });
    let puffs = [];
    looped(t, D4, T2.length * 24, S + 200, (r, j) => {
      let i = j % T2.length, fire = r.range(0.14, 0.3), smokes = r.chance(0.45);
      return { i, fire, smokes, sl: r.range(0.8, 1.4), ox: r.range(-1, 1), oy: r.range(0, 4), vx: r.range(-4, 4), vy: -r.range(15, 30), s: r.range(0.8, 1.6) * (0.8 + 0.6 * T2[i].env), f: r.next(), life: fire + (smokes ? 1.4 : 0) };
    }, (q, age) => {
      let [tx, ty] = tip(q.i, t - age), [x, y, vx, vy] = drift(tx + q.ox, ty + q.oy, q.vx, q.vy, Math.min(age, q.fire), 0, -95, 5, 3.2);
      if (age < q.fire) return puffs.push([x, y, 1 - age / q.fire, q.s, q.f]);
      if (age - q.fire > q.sl) return;
      let [sx, sy] = drift(x, y, vx * 0.6, vy * 0.6 - 6, age - q.fire, 2, -16, 1.6, 1.2);
      smokePuff(p, sx, sy, 1 - (age - q.fire) / q.sl, q.s * 0.7, 0);
    }), coals(p, W4, H3, t, S);
    for (let L of LOGS) log(p, L, W4, H3, CROSS2, 1, t, S + 11);
    for (let i = 0; i < T2.length; i++) T2[i].back && tongueAt(i);
    looped(t, D4, 90, S + 210, (r) => ({ x: r.range(-10, 10), y: -r.range(3, 8), vx: r.range(-5, 5), vy: -r.range(20, 40), life: r.range(0.16, 0.3), s: r.range(1, 1.8), f: r.next() }), (q, age) => {
      let [x, y] = drift(q.x, q.y, q.vx, q.vy, age, 0, -95, 5, 3.2);
      firePuff(p, x, y, 1 - age / q.life, q.s, q.f, H3);
    });
    for (let i = 0; i < T2.length; i++) T2[i].back || tongueAt(i);
    looped(t, D4, T2.length * 12, S + 220, (r, j) => ({ i: j % T2.length, vx: r.range(-3, 3), vy: -r.range(12, 22), s: r.range(0.9, 1.6) * (0.8 + 0.5 * T2[j % T2.length].env), life: 0.26 }), (q, age) => {
      let [tx, ty] = tip(q.i, t - age);
      lick(p, tx + q.vx * age, ty - 2 + q.vy * age, 1 - age / q.life, q.s, H3);
    });
    for (let [x, y, k, s, f] of puffs) firePuff(p, x, y, k, s, f, H3);
    for (let L of LOGS) log(p, L, W4, H3, 0, CROSS2, t, S + 11);
    looped(t, D4, 4, S + 400, (r) => ({ x: r.range(-9, 9), y: -r.range(4, 9), n: r.int(3, 5), seed: r.int(0, 1e6), life: 0.7 }), (q, age) => {
      age < 0.08 && (p.px(q.x, q.y, WHITE), p.glow(q.x, q.y, 12, H3[1], 0.7 * (1 - age / 0.08)));
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
    let br = 0.92 + 0.08 * N9(0.67, S + 3), lx = lean(t) * 12;
    p.glow(lx, -8, 74 * br * (0.9 + 0.1 * fl), GLOW, 0.3 * fl);
    for (let [x, y, k] of [[-6, -17, 0.85], [0, -21, 1], [6, -17, 0.85]])
      p.glow(x + lx, y, 46 * br, GLOW, 0.3 * k * fl), p.glow(x * 0.6, y + 13, 15, H3[2], 0.16 * k * fl);
    p.glow(0, -3, 9, H3[0], 0.16 * fl), floorLight(p, 0, 0.5, 48, 8, GLOW, 0.3 * fl);
  }
  var meta19, D4, NL2, SMOKE13, ASH2, LOGS, CROSS2, BIG_LAYERS2, TONGUES, init_campfire = __esm({
    "src/fx/fire/campfire.js"() {
      init_core();
      init_lib4();
      meta19 = {
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
      }, D4 = meta19.duration, NL2 = noiseFor(D4), SMOKE13 = hex("#5b5566"), ASH2 = [hex("#2a2530"), hex("#4a4350"), hex("#6b6270")], LOGS = [
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
    }
  });

  // src/fx/fire/candle.js
  var candle_exports = {};
  __export(candle_exports, {
    draw: () => draw7,
    meta: () => meta20
  });
  function dish(p, B4, H3, fl) {
    p.ellipse(0, 1, 10, 2.6, (d, a) => d > 0.82 ? B4[0] : Math.sin(a) < -0.2 ? d > 0.6 ? mix(B4[3], H3[3], 0.3 * fl) : B4[2] : d > 0.55 ? B4[1] : B4[2]), p.rect(-8, 2, 17, 1, B4[1]), p.rect(-7, 3, 15, 1, B4[0]);
  }
  function candle(p, X, H3, fl) {
    let L = TOP2, cols = [X[1], X[4], X[5], X[4], X[4], X[3], X[3], X[2], X[0]];
    for (let i = 0; i < 9; i++) {
      let x = i - 4;
      p.rect(x, L + 1, 1, -L - 2, cols[i]), i === 2 && p.rect(x, -8, 1, 7, X[4]);
    }
    p.rect(-3, -1, 7, 1, X[2]), p.px(-4, -1, X[0]), p.px(4, -1, X[0]), p.rect(-3, L, 7, 1, mix(X[5], H3[2], 0.25 * fl)), p.px(-4, L, X[1]), p.px(4, L, X[1]), p.rect(-2, L + 1, 5, 1, mix(X[5], H3[1], 0.5 * fl)), p.rect(-1, L + 1, 3, 1, mix(X[4], H3[2], 0.45 * fl));
    let y1 = DRIP.y1;
    p.rect(3, L + 1, 1, y1 - L - 1, X[4]), p.rect(4, L + 2, 1, y1 - L - 2, X[3]), p.px(5, L + 3, X[0]), p.rect(5, L + 4, 1, y1 - L - 4, X[0]), p.rect(3, y1, 2, 2, X[4]), p.px(5, y1, X[3]), p.px(5, y1 + 1, X[2]), p.px(6, y1, X[0]), p.px(6, y1 + 1, X[0]), p.rect(3, y1 + 2, 3, 1, X[0]), p.px(3, L + 2, X[5]), p.rect(-4, L + 1, 1, 4, X[4]), p.px(-5, L + 3, X[1]), p.px(-5, L + 4, X[1]), p.px(-4, L + 5, X[3]);
  }
  function draw7(p, t, o) {
    let F = fit(o.palette, 9), H3 = hotFirst(F), RT = fit(o.root, 3), X = fit(o.wax, 6), B4 = fit(o.brass, 5), S = o.seed, N9 = (rate, seed2 = 0, off2 = 0) => NL3(t, rate * 0.35, seed2, off2), fl = 0.86 + 0.08 * NL3(t, 2, S + 1) + 0.06 * NL3(t, 7, S + 2), h = 12 * (1 + Math.max(0, NL3(t, 0.75, S + 3) - 0.3) * 0.6) * (0.94 + 0.06 * fl), sway = NL3(t, 0.5, S + 4) * 1.6 + NL3(t, 1.5, S + 5) * 0.5, GLOW = mix(mix(H3[3], H3[4], 0.5), WHITE, 0.3), cy = WICK - h * 0.4;
    floorLight(p, 0, 1, 26, 5, GLOW, 0.3 * fl), p.glow(sway * 0.3, cy, 38 * fl, GLOW, 0.42 * fl), p.glowRing(sway * 0.3, cy, 10, 4, H3[2], 0.12 * fl), dish(p, B4, H3, fl), candle(p, X, H3, fl);
    let run = t % D5 / D5, swell = smooth(0, 0.3, run), slide = smooth(0.3, 0.85, run), set = smooth(0.85, 1, run);
    if (set < 1 && swell > 0.15) {
      let by = Math.round(DRIP.y0 + (DRIP.y1 - DRIP.y0) * slide);
      p.px(DRIP.x, by, mix(X[5], H3[1], 0.4 * fl)), swell > 0.6 && set < 0.5 && (p.px(DRIP.x + 1, by, X[4]), p.px(DRIP.x + 1, by + 1, X[2]));
    }
    p.line(0, TOP2, 0, WICK + 1, X[0]), p.px(0, WICK + 1, H3[4]), flameTongue(p, 0, WICK + 1, h, 2.6, sway, N9, S * 31, H3, CALM, 0.25, 0.6);
    for (let dx = -2; dx <= 2; dx++) {
      let a = 1 - Math.abs(dx) * 0.2;
      p.dot(dx, WICK + 1, Math.abs(dx) === 2 ? RT[0] : RT[1], a), Math.abs(dx) <= 1 && p.dot(dx, WICK + 2, RT[0], 0.7);
    }
    p.px(0, WICK, RT[2]), looped(t, D5, 6, S + 300, (r) => ({ vx: r.range(-1.5, 1.5), vy: -r.range(8, 12), life: r.range(1.4, 2.2), s: r.range(0.8, 1.2) }), (q, age) => {
      let [x, y] = drift(sway, WICK - h, q.vx, q.vy, age, 1, -6, 1, 0.8);
      smokePuff(p, x + NL3(t - age, 0.6, S + 60) * (1 + age * 2), y, 1 - age / q.life, q.s, 0, !1, 0.6);
    }), looped(t, D5, 10, S + 400, (r) => ({ x: r.range(-20, 20), y: r.range(-44, -8), vx: r.range(-3, 3), vy: r.range(-4, 2), life: r.range(2.5, 4), ph: r.range(0, 6.3) }), (q, age) => {
      let x = q.x + q.vx * age + Math.sin(age * 1.3 + q.ph) * 2, y = q.y + q.vy * age, d = Math.hypot(x, y - cy), k = Math.min(1, age * 2, (q.life - age) * 2) * clamp(1.2 - d / 26);
      k > 0.15 && (p.dot(x, y, k > 0.6 ? H3[1] : H3[3], k), p.glow(x, y, 3, H3[2], 0.2 * k));
    }), p.glow(sway * 0.5, WICK - h * 0.3, 10, H3[1], 0.35 * fl);
  }
  var meta20, D5, NL3, TOP2, WICK, CALM, DRIP, init_candle = __esm({
    "src/fx/fire/candle.js"() {
      init_core();
      init_lib4();
      meta20 = {
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
    }
  });

  // src/fx/fire/torch.js
  var torch_exports = {};
  __export(torch_exports, {
    draw: () => draw8,
    meta: () => meta21
  });
  function plate(p, I, H3, fl) {
    p.shade(-5.5, -5.5, 5.5, 11.5, (x, y) => x < -5 || x > 5 || y < -5 || y > 11 ? I[0] : Math.abs(x) < 0.6 && (Math.abs(y + 3.5) < 0.6 || Math.abs(y - 9.5) < 0.6) ? mix(I[4], H3[3], 0.35 * fl) : y < -4 || x < -4 ? mix(I[3], H3[4], 0.3 * fl) : y > 10 || x > 4 ? I[1] : y < 2 ? I[2] : I[1]);
  }
  function handle(p, W4) {
    p.shade(-3, -12, 3, 15, (x, y) => {
      let half = 1.3 + clamp((14 - y) / 26) * 0.9;
      if (Math.abs(x) > half + 0.5 || y > 14.5) return;
      if (Math.abs(x) > half - 0.5 || y > 13.5) return W4[0];
      let g = rand(Math.floor(y / 3), Math.round(x), 9);
      return x < -0.3 ? g < 0.3 ? W4[2] : W4[4] : g < 0.4 ? W4[1] : W4[2];
    });
  }
  function ring(p, I, H3, fl) {
    p.rect(-3, -2, 7, 4, I[0]), p.rect(-2, -1, 5, 1, mix(I[4], H3[3], 0.3 * fl)), p.rect(-2, 0, 5, 1, I[2]);
  }
  function wrap2(p, W4, I, H3, t) {
    p.shade(-6, BASE2 - 2, 6, -9, (x, y, out) => {
      let v = (y - (BASE2 - 1.5)) / 7.5, half = 4.6 - v * 1.9;
      if (Math.abs(x) > half + 0.5 || y < BASE2 - 1.5 || y > -9.5) return;
      if (Math.abs(x) > half - 0.5 || y > -10.5) return W4[0];
      let cord = Math.floor(y - x * 0.6 + 40) % 3 === 0, h = rand(Math.floor(x), Math.floor(y), 31);
      if (v < 0.45) {
        if (h < 0.42) {
          let g = 0.5 + 0.5 * Math.sin(t / D6 * Math.PI * 4 + h * 40);
          return out.k = 0.3 * g, g > 0.66 ? H3[2] : g > 0.33 ? H3[4] : H3[5];
        }
        return h < 0.75 ? W4[0] : W4[1];
      }
      return cord ? I[2] : x < -1 ? W4[3] : x < 1.5 ? W4[2] : W4[1];
    });
  }
  function draw8(p, t, o) {
    let F = fit(o.palette, 9), H3 = hotFirst(F), W4 = fit(o.wood, 6), I = fit(o.iron, 5), S = o.seed, fl0 = 0.74 + 0.16 * NL4(t, 7.3, S + 1) + 0.1 * NL4(t, 19, S + 2);
    plate(p, I, H3, fl0), handle(p, W4), ring(p, I, H3, fl0), burn(p, t, TONGUES2, {
      H: H3,
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
      mid: () => wrap2(p, W4, I, H3, t)
    });
  }
  var meta21, D6, NL4, BASE2, TONGUES2, init_torch = __esm({
    "src/fx/fire/torch.js"() {
      init_core();
      init_lib4();
      meta21 = {
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
    }
  });

  // src/fx/explosions/small-explosion.js
  var small_explosion_exports = {};
  __export(small_explosion_exports, {
    create: () => create14,
    meta: () => meta22
  });
  function stone3(c) {
    return c = hex(c), { light: mix(scale(c, 1.35), WHITE, 0.08), body: c, shade: scale(c, 0.64), dust: mix(scale(c, 1.2), rgb(150, 140, 150), 0.3) };
  }
  function scorch(p, F, t, rx0, cool, fade) {
    if (fade <= 0) return;
    let rx = rx0 * Math.min(1, t / 0.08), ry = 4, heat2 = [...F].reverse();
    for (let y = 0; y <= 2; y++)
      for (let x = Math.floor(-rx); x <= Math.ceil(rx); x++) {
        let dx = (x + 0.5) / rx, dy = (y + 0.5) / ry, d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) continue;
        let k = rand(x * 31 + y, 3), T2 = Math.pow(clamp(1 - t / cool), 1.4) * (1.25 - d) - k * 0.35;
        if (T2 > 0.06) {
          let c = heat2[Math.min(heat2.length - 1, Math.floor((1 - Math.min(1, T2)) * (heat2.length - 1)))];
          p.dot(x, y, c, fade), (x & 3) === 0 && p.glow(x + 0.5, y, 6, c, 0.18 * T2 * fade);
        } else p.dot(x, y, d < 0.5 ? SOOT2 : SOOT22, (d < 0.95 - k * 0.3 ? 1 : 1 - d) * fade);
      }
  }
  function rock3(p, b, st) {
    let r = 0.6 + b.s * 0.75, fade = Math.min(1, b.life / 0.5), lx = Math.cos(b.a) * r * 0.4, ly = Math.sin(b.a) * r * 0.4;
    p.shade(b.x - r - 1, b.y - r - 1, b.x + r + 1, b.y + r + 1, (x, y, out) => {
      let dx = x - b.x, dy = y - b.y, d = Math.hypot(dx * 1.15, dy);
      if (d > r + 0.9) return;
      let lit = dx * lx + dy * ly;
      out.c = d > r ? OUTLINE3 : lit < -0.4 ? st.light : lit > 0.6 ? st.shade : st.body, out.a = fade;
    });
  }
  function create14(o) {
    let F = fit(o.palette, 8), S = o.size, RAD = 18 * S, POWER = 0.9 * Math.pow(S, 0.8), EARTH = 1.6, st = stone3(o.stone), R6 = new Rng(o.seed), floor = () => 0, blazes, ps = new Particles({ rng: R6, ground: floor, sparks: [F[6], F[5], F[3], F[2]], onLand: (x, y) => blazes.add(x, y - 0.25, R6.range(0.9, 1.5), R6.range(0.55, 0.85)) });
    blazes = new Blazes(ps);
    let rocks = new Bits({ ground: floor }), lights = new Lights(), flashes = [], rings = [], Y3 = -RAD * 0.3, t = 0;
    flashes.push({ r: RAD * 1.05, life: 0.06, max: 0.06 }), rings.push({ r0: RAD * 0.45, r1: RAD * 2.7, life: 0.34, max: 0.34, thick: 3, c: F[5] }, { r0: RAD * 0.3, r1: RAD * 1.6, life: 0.22, max: 0.22, thick: 1.8, c: F[3] }), lights.add(0, Y3, RAD * 3.4, WARM, 0.6 * POWER, 0.7), lights.add(0, Y3, RAD * 1.6, WHITE, 0.6, 0.08);
    for (let i = 0; i < 5; i++) ps.spawn(P.FIRE, R6.range(-2.5, 2.5), Y3 + R6.range(-2.5, 2.5), R6.range(-20, 20), R6.range(-40, -10), R6.range(0.18, 0.3), 0, R6.range(RAD * 0.4, RAD * 0.55));
    for (let i = 0; i < Math.round(28 * POWER); i++) {
      let a = R6.range(0, TAU), d = R6.range(0, RAD * 0.55), sp = R6.range(40, 210) * POWER;
      ps.spawn(P.FIRE, Math.cos(a) * d, Y3 + Math.sin(a) * d, Math.cos(a) * sp, Math.sin(a) * sp * 0.8 - 40, R6.range(0.55, 1.15), 0, R6.range(RAD * 0.22, RAD * 0.46), 0, R6.chance(0.45) ? PF.SMOKES | PF.BIG : 0);
    }
    for (let i = 0; i < 5; i++) {
      let a = R6.range(0, TAU), d = R6.range(RAD * 0.1, RAD * 0.5);
      ps.spawn(P.SMOKE, Math.cos(a) * d, Y3 + Math.sin(a) * d, Math.cos(a) * 30, Math.sin(a) * 20 - 30, R6.range(0.9, 1.5), rgb(34, 29, 38), R6.range(RAD * 0.15, RAD * 0.26), R6.range(0.06, 0.2), PF.BIG);
    }
    for (let i = 0; i < 5; i++) ps.spawn(P.FIRE, R6.range(-RAD * 0.25, RAD * 0.25), Y3, R6.range(-12, 12), R6.range(-180, -100), R6.range(0.8, 1.3), 0, R6.range(RAD * 0.24, RAD * 0.36), R6.range(0, 0.1), R6.chance(0.6) ? PF.SMOKES | PF.BIG : 0);
    for (let i = 0; i < Math.round(10 * POWER); i++) {
      let a = R6.range(0, TAU), d = R6.range(0, RAD * 0.7), sp = R6.range(15, 100);
      ps.spawn(P.SMOKE, Math.cos(a) * d, Y3 + Math.sin(a) * d, Math.cos(a) * sp, Math.sin(a) * sp * 0.6 - 35, R6.range(1.8, 2.8), 0, R6.range(RAD * 0.26, RAD * 0.44), R6.range(0.12, 0.45), PF.BIG);
    }
    for (let i = 0; i < Math.round(80 * POWER); i++) {
      let a = R6.range(0, TAU), sp = R6.range(140, 380) * POWER;
      ps.spawn(P.SPARK, 0, Y3, Math.cos(a) * sp, Math.sin(a) * sp - 70, R6.range(0.18, 0.6));
    }
    for (let i = 0; i < Math.round(40 * POWER); i++) {
      let a = R6.range(0, TAU), sp = R6.range(30, 150);
      ps.spawn(P.EMBER, Math.cos(a) * RAD * 0.4, Y3 + Math.sin(a) * RAD * 0.4, Math.cos(a) * sp, Math.sin(a) * sp - 75, R6.range(1.2, 2.6), F[3]);
    }
    for (let i = 0; i < Math.round(R6.range(9, 14) * Math.max(0, POWER - 0.55)); i++) {
      let a = -Math.PI / 2 + R6.range(-1.35, 1.35), sp = R6.range(170, 330);
      ps.spawn(P.BRAND, 0, Y3, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.7, 1.3));
    }
    for (let i = 0; i < Math.round(RAD * 0.5); i++) {
      let s = R6.sign();
      ps.spawn(P.SMOKE, s * R6.range(0, RAD * 0.6), -R6.range(1, 5 + RAD * 0.04), s * R6.range(3, 9.5) * RAD, -R6.range(2, 15), R6.range(1.1, 2), st.dust, R6.range(4, 7) + RAD / 6, R6.range(0, 0.06), PF.BIG);
    }
    for (let i = 0; i < 26 * Math.min(1.5, S); i++)
      rocks.add({ kind: B.CHUNK, x: R6.range(-0.4, 0.4) * RAD, y: -3, vx: R6.range(-9, 9) * RAD * 0.25, vy: -R6.range(7, 16) * RAD * 0.9, g: 1, drag: 0.4, bounce: 0.3, life: R6.range(1.8, 2.6), a: R6.range(0, TAU), va: R6.range(-16, 16), s: R6.int(1, 3) });
    for (let i = 0; i < Math.round(EARTH * RAD * 4); i++) {
      let u = R6.range(-1, 1), a = -Math.PI / 2 + u * 0.5, sp = R6.range(5, 15) * RAD * (1 - 0.45 * Math.abs(u));
      ps.spawn(P.GRIT, u * 0.25 * RAD, -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(1.2, 2.2), R6.pick([st.light, st.body, st.body, st.shade]), R6.chance(0.45) ? 2 : 1);
    }
    for (let i = 0; i < Math.round(EARTH * 12); i++)
      ps.spawn(P.SMOKE, R6.range(-0.3, 0.3) * RAD, -R6.range(2, RAD * 0.6), R6.range(-15, 15), -R6.range(60, 190) * EARTH * 0.6, R6.range(1.6, 2.6), st.dust, R6.range(5, 9) * Math.sqrt(S) + RAD / 7, R6.range(0, 0.15), PF.BIG);
    return {
      update(dt) {
        t += dt;
        for (let a of [flashes, rings]) for (let i = a.length - 1; i >= 0; i--) (a[i].life -= dt) <= 0 && a.splice(i, 1);
        rocks.update(dt);
        for (let b of rocks.list)
          if (b.rest && !b.dusted) {
            b.dusted = !0;
            for (let i = 0; i < 3; i++) ps.spawn(P.DUST, b.x + R6.range(-1.5, 1.5), -0.5, R6.sign() * R6.range(10, 55) * 0.6, -R6.range(2, 22), R6.range(0.3, 0.65), st.dust, R6.range(1.3, 2.8));
          }
        blazes.update(dt), ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        scorch(p, F, t, 22 * S, 1.2 + RAD / 14, 1 - smooth(meta22.duration - 1.2, meta22.duration - 0.2, t)), ps.draw(p, "back"), blazes.drawBack(p);
        let k = t / 0.5;
        k < 1 && band(p, 0, 0.5, 80 * S * ease.outCubic(k), 0.16, Math.max(1, (2 + RAD / 9) * (1 - k)), 1.15 - k, [st.body, st.light, F[3], F[6]], (g) => Math.sin(g) < 0);
      },
      draw(p) {
        let k = t / 0.5;
        k < 1 && band(p, 0, 0.5, 80 * S * ease.outCubic(k), 0.16, Math.max(1, (2 + RAD / 9) * (1 - k)), 1.15 - k, [st.body, st.light, F[3], F[6]], (g) => Math.sin(g) >= 0);
        for (let b of rocks.list) rock3(p, b, st);
        ps.draw(p, "front");
        for (let f of flashes) {
          let k2 = f.life / f.max, r = f.r * (0.8 + 0.2 * k2);
          p.circle(0, Y3, r + 1.2, F[2]), p.circle(0, Y3, r, k2 > 0.45 ? F[6] : F[5]), p.circle(0, Y3, r * 0.6, k2 > 0.45 ? WHITE : F[6]);
        }
        for (let r of rings) {
          let k2 = r.life / r.max, e = 1 - Math.pow(k2, 3);
          p.ring(0, Y3, r.r0 + (r.r1 - r.r0) * e, Math.max(1, r.thick * k2 + 0.4), r.c, Math.min(1, k2 * 1.6));
        }
        lights.draw(p);
      }
    };
  }
  var meta22, SOOT2, SOOT22, OUTLINE3, WARM, init_small_explosion = __esm({
    "src/fx/explosions/small-explosion.js"() {
      init_core();
      meta22 = {
        name: "Explosion",
        desc: "A ground blast: a white flash and shock rings, fire that cools into a rolling smoke column, sparks, burning brands that land and keep burning, tumbling rocks and a glowing scorch.",
        tags: ["explosion", "fire", "smoke", "debris", "impact", "one-shot"],
        size: [300, 240],
        origin: [150, 196],
        duration: 5.4,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: ["#4a1712", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"], stone: "#4a3f69", size: 1, seed: 7 }
      }, SOOT2 = hex("#0d0a12"), SOOT22 = hex("#17121d"), OUTLINE3 = hex("#1a1422"), WARM = rgb(255, 176, 96);
    }
  });

  // src/fx/ice/ice-shatter.js
  var ice_shatter_exports = {};
  __export(ice_shatter_exports, {
    create: () => create15,
    meta: () => meta23
  });
  function create15(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] }), bits = new Bits({ ground: floor }), lights = new Lights(), scuffs = [], splinter = (x, y, vx, n) => {
      for (let i = 0; i < n; i++) bits.add({ kind: B.SHARD, x: x + R6.range(-2, 2), y: y - 1, vx: vx * 0.6 + R6.range(-35, 45), vy: -R6.range(30, 100), g: 0.8, drag: 0.6, bounce: 0.35, life: R6.range(0.4, 0.8), a: R6.range(0, TAU), va: R6.range(-18, 18), s: R6.range(1.2, 2.4), c: C[R6.int(4, 7)] });
    }, panes = new Panes({
      ground: floor,
      onLand: (q, x, y, v) => {
        v < 100 || (ps.spawn(P.VAPOUR, x, y - 1, q.vx * 0.3 + R6.range(-15, 15), -R6.range(2, 10), R6.range(0.4, 0.7), C[6], R6.range(1.6, 2.8)), splinter(x, y, q.vx, 2), R6.chance(0.3) && ps.spawn(P.STAR, x, y - 3, 0, -5, R6.range(0.2, 0.4), WHITE, R6.range(0.8, 1.6)));
      },
      onSkid: (q, x) => {
        R6.chance(0.5) && scuffs.push({ x: Math.round(x + R6.range(-1, 1)), t: 0 });
      },
      onCrumble: (q) => {
        splinter(q.x, 0, q.vx, 3), ps.spawn(P.VAPOUR, q.x, -1, R6.range(-10, 14), -R6.range(2, 6), R6.range(0.4, 0.7), C[6], R6.range(1.2, 2));
      }
    }), veins = [], bubbles2 = [];
    for (let k = 0; k < 3; k++) {
      let x = R6.range(-12, 8), y = R6.range(-24, -6), a = R6.range(0, TAU);
      for (let i = 0; i < 9 && (a += R6.range(-0.6, 0.6), x += Math.cos(a) * 1.5, y += Math.sin(a) * 1.2, !(x < -14 || x > 10 || y < -26 || y > -2)); i++)
        veins.push([Math.floor(x), Math.floor(y)]);
    }
    for (let k = 0; k < 5; k++) bubbles2.push([R6.int(-12, 8), R6.int(-23, -4), R6.chance(0.4) ? 1 : 0]);
    let inside = (x, y) => inPoly(SIL, x, y), cracks5 = fractures(R6, inside, HIT_AT[0] + 1, HIT_AT[1], 4, { len: 8, a0: -0.9, spread: 1.9 }), cracks22 = fractures(R6, inside, HIT_AT[0] + 1, HIT_AT[1], 6, { len: 18, a0: -1.3, spread: 2.7, fork: 0.16 }), t = 0, struck = !1, burst = !1, wave2 = !1, white = !1, jolt = () => t >= HIT2 && t < HIT2 + 0.05 ? 2 : t >= HIT2 + 0.05 && t < HIT2 + 0.12 || t >= SHIVER && t < FLASH && Math.floor(t * 40) % 2 ? 1 : 0, drawBlock = (p) => {
      if (t >= BURST) return;
      let jx = jolt(), wh = t >= FLASH, sweep = -40 + 70 * seg(t, 0.04, 0.3), sh = (pts) => pts.map(([x, y]) => [x + jx, y]);
      if (p.poly(sh([[-17, 1], [-17, -28.5], [-8.3, -35.2], [21, -35.2], [21, -5.6], [12.5, 1]]), C[0]), wh) {
        p.poly(sh(SIL), WHITE);
        return;
      }
      p.poly(sh(FRONT), (x, y) => {
        let lx = x - jx, d = lx + y * 0.8;
        return Math.abs(d - sweep) < 1.3 && y < -6 ? WHITE : y < -9 && (Math.abs(d + 21) < 1.1 || Math.abs(d + 16.5) < 0.6) ? C[6] : (Math.abs(lx + 7.5) < 0.5 && y < -6 || Math.abs(y + 5.5) < 0.5 && lx > -8) && (Math.floor(lx) + Math.floor(y)) % 2 === 0 ? C[5] : inPoly(PLANE, lx, y) ? y < -25.5 ? C[6] : C[5] : inPoly(SHADE, lx, y) ? C[3] : y < -25.5 ? C[5] : y < -8 ? C[4] : y < -2.5 ? C[3] : C[2];
      }), p.poly(sh(TOP3), (x, y) => y > -29.5 ? C[7] : y < -32.5 ? C[5] : rand(Math.floor(x), Math.floor(y), 3) < 0.08 ? C[7] : C[6]), p.poly(sh(SIDE), (x, y) => {
        let lx = x - jx;
        return lx < 13.5 || Math.abs(lx - 16.5) < 0.6 && y < -8 ? C[3] : y > (lx - 12) * -0.75 - 3 ? C[1] : C[2];
      });
      for (let [x, y] of veins) p.px(x + jx, y, C[5]);
      for (let [x, y, big] of bubbles2)
        p.px(x + jx, y, C[6]), big && (p.px(x + jx + 1, y, C[5]), p.px(x + jx, y + 1, C[5]));
      let E2 = (a, b, c) => p.line(a[0] + jx, a[1], b[0] + jx, b[1], c);
      E2([-16, -28], [12, -28], WHITE), E2([-16, -28], [-8, -34], C[6]), E2([-8, -34], [20, -34], C[5]), E2([12, -28], [20, -34], C[7]), E2([-16, -1], [-16, -28], C[5]), E2([12, -1], [12, -28], C[6]), E2([20, -6], [20, -34], C[3]), E2([13, -1], [20, -6], C[1]), t >= HIT2 && drawFractures(p, cracks5, (t - HIT2) * 170, C, { ox: jx }), t >= CRACK2 && drawFractures(p, cracks22, (t - CRACK2) * 200, C, { ox: jx });
    }, drawFloor = (p) => {
      let out = 1 - smooth(BURST + 0.6, BURST + 1.5, t);
      if (out > 0)
        for (let x = -22; x <= 26; x++) {
          let d = Math.abs(x - 2) / 24, h = rand(x, 41), a = out * clamp((1.1 - d) / 0.25);
          if (!(a <= 0)) {
            p.dot(x, 0, h < 0.35 ? WHITE : C[6], a), h < 0.4 && (x < -16 || x > 20) && p.dot(x, -1, C[5], a);
            for (let j = 1; j <= 1 + Math.round(rand(x, 7) * 3 * (1 - d)); j++) p.dot(x, j, j < 2 ? C[5] : C[4], a * (1 - j / 5));
          }
        }
      for (let s of scuffs) {
        let a = 1 - s.t / 0.9;
        a > 0 && (p.dot(s.x, 0, s.t < 0.15 ? WHITE : C[6], a), p.dot(s.x, 1, C[4], a * 0.6));
      }
    }, explode = () => {
      let chop = (pts, max, depth) => {
        let c = centroid(pts);
        return c.area < max || depth > 4 ? [pts] : splitPoly(pts, c.x + R6.range(-1, 1), c.y + R6.range(-1, 1), R6.range(0, Math.PI)).flatMap((q) => chop(q, max, depth + 1));
      };
      for (let [face, tone, max] of [[FRONT, 0.6, 46], [TOP3, 1, 40], [SIDE, 0.3, 46]])
        for (let part of chop(face, max, 0)) {
          let m = centroid(part), dx = m.x - HIT_AT[0], dy = m.y - HIT_AT[1], d = Math.hypot(dx, dy) || 1, sp = R6.range(50, 150) * (0.7 + 0.3 * (1 - d / 40));
          panes.add({
            pts: part.map(([x, y]) => [x - m.x, y - m.y]),
            x: m.x,
            y: m.y,
            vx: dx / d * sp * 0.9 + R6.range(40, 110),
            vy: dy / d * sp * 0.4 - R6.range(60, 200),
            a: 0,
            va: R6.range(-10, 10),
            f: R6.range(-0.9, 0.9),
            vf: R6.range(-7, 7),
            tone,
            lit: tone,
            g: 0.9,
            drag: 0.5,
            bounce: 0.38,
            solid: !0,
            brittle: 3,
            crumble: R6.range(0.25, 0.6),
            life: R6.range(1.5, 1.9)
          });
        }
      for (let i = 0; i < 46; i++) {
        let x = R6.range(-15, 19), y = -R6.range(1, 33), dx = x - HIT_AT[0], dy = y - HIT_AT[1], d = Math.hypot(dx, dy) || 1, sp = R6.range(60, 200);
        inside(x, y) && bits.add({ kind: R6.chance(0.15) ? B.CHUNK : B.SHARD, x, y, vx: dx / d * sp * 0.8 + R6.range(20, 90), vy: dy / d * sp * 0.4 - R6.range(60, 240), g: 0.85, drag: 0.6, bounce: 0.32, life: R6.range(0.8, 1.4), a: R6.range(0, TAU), va: R6.range(-22, 22), s: R6.range(1.2, 3.4), c: C[R6.int(4, 7)], ramp: [C[1], C[3], C[4], C[6], C[7]] });
      }
      for (let i = 0; i < 9; i++) ps.spawn(P.VAPOUR, R6.range(-6, 18), -R6.range(1, 6), R6.range(10, 130), -R6.range(2, 12), R6.range(0.6, 1.1), C[6], R6.range(2.2, 3.8));
      for (let i = 0; i < 5; i++) ps.spawn(P.DUST, R6.range(-6, 16), -R6.range(1, 4), R6.range(30, 110), -R6.range(2, 8), R6.range(0.5, 0.9), C[5], R6.range(1.6, 2.8));
      for (let i = 0; i < 4; i++) ps.spawn(P.VAPOUR, R6.range(-8, 18), -R6.range(8, 28), R6.range(-10, 50), -R6.range(8, 24), R6.range(0.6, 1), C[6], R6.range(2.6, 4));
      for (let i = 0; i < 16; i++) {
        let a = R6.range(-Math.PI * 0.9, -0.1), sp = R6.range(40, 140);
        ps.spawn(P.FLAKE, R6.range(-8, 16), -R6.range(6, 28), Math.cos(a) * sp + 20, Math.sin(a) * sp, R6.range(1, 1.6), R6.chance(0.6) ? WHITE : C[6], R6.range(0.5, 1.6));
      }
      for (let i = 0; i < 7; i++) ps.spawn(P.STAR, R6.range(-14, 40), -R6.range(4, 40), R6.range(-8, 16), -R6.range(4, 16), R6.range(0.4, 0.8), R6.chance(0.5) ? WHITE : C[6], R6.range(1, 2.4));
      lights.add(2, -17, 64, WHITE, 0.85, 0.14), lights.add(16, -18, 86, C[4], 0.5, 0.55);
    };
    return {
      update(dt) {
        if (t += dt, !struck && t >= HIT2) {
          struck = !0, lights.add(HIT_AT[0], HIT_AT[1], 24, WHITE, 0.6, 0.08), lights.add(HIT_AT[0] + 6, HIT_AT[1], 40, C[5], 0.4, 0.3);
          for (let i = 0; i < 12; i++) {
            let a = Math.PI + R6.range(-0.9, 0.9), sp = R6.range(50, 120);
            ps.spawn(P.SPARK, HIT_AT[0] - 1, HIT_AT[1], Math.cos(a) * sp, Math.sin(a) * sp - 40, R6.range(0.15, 0.4));
          }
          for (let i = 0; i < 6; i++) {
            let a = Math.PI + R6.range(-1, 0.8), sp = R6.range(40, 100);
            bits.add({ kind: B.SHARD, x: HIT_AT[0] - 1, y: HIT_AT[1] + R6.range(-2, 2), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, g: 0.85, drag: 0.6, bounce: 0.3, life: R6.range(0.5, 0.9), a: R6.range(0, TAU), va: R6.range(-20, 20), s: R6.range(1.2, 2.4), c: C[R6.int(5, 7)] });
          }
        }
        if (!wave2 && t >= CRACK2) {
          wave2 = !0, lights.add(0, -16, 36, C[6], 0.35, 0.15);
          for (let i = 0; i < 3; i++) bits.add({ kind: B.SHARD, x: R6.range(-14, 18), y: -R6.range(4, 30), vx: R6.range(-30, 30), vy: -R6.range(10, 50), g: 0.85, drag: 0.6, bounce: 0.3, life: R6.range(0.4, 0.7), a: R6.range(0, TAU), va: R6.range(-20, 20), s: R6.range(1, 2), c: C[R6.int(5, 7)] });
        }
        if (!white && t >= FLASH && (white = !0, lights.add(2, -17, 44, WHITE, 0.7, 0.08)), !burst && t >= BURST && (burst = !0, explode()), burst && t < BURST + 1 && R6.chance(0.08) && bits.list.length) {
          let b = R6.pick(bits.list);
          ps.spawn(P.STAR, b.x, b.y - 1, 0, -3, R6.range(0.2, 0.4), R6.chance(0.5) ? WHITE : C[6], R6.range(0.6, 1.5));
        }
        for (let i = scuffs.length - 1; i >= 0; i--) (scuffs[i].t += dt) > 0.9 && scuffs.splice(i, 1);
        ps.update(dt), bits.update(dt), panes.update(dt), lights.update(dt), endBy(t, meta23.duration, ps, bits, panes);
      },
      drawBack(p) {
        drawFloor(p), ps.draw(p, "back");
      },
      draw(p) {
        drawBlock(p);
        let h = t - HIT2;
        h >= 0 && h < 0.2 && (sparkle(p, HIT_AT[0] - 1, HIT_AT[1], 9 * ease.outBack(Math.min(1, h / 0.04)) * (1 - h / 0.2), C[6], C[4], 0.7), h < 0.08 && flare(p, HIT_AT[0] - 1, HIT_AT[1], 14 * (1 - h / 0.08), 1 - h / 0.08, C));
        let k = 1 - smooth(BURST, BURST + 0.4, t), crk = smooth(HIT2, FLASH, t);
        k > 0 && (p.glow(2, -17, 34, C[4], (0.16 + 0.22 * crk) * k), p.glow(2, -2, 30, C[4], 0.14 * k)), t >= FLASH && t < BURST + 0.12 && flare(p, 2, -17, 26 * (1 - clamp((t - FLASH) / 0.18)), 1 - clamp((t - FLASH) / 0.18), C), panes.draw(p, C), bits.draw(p), ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta23, HIT2, CRACK2, SHIVER, FLASH, BURST, FRONT, TOP3, SIDE, SIL, HIT_AT, PLANE, SHADE, init_ice_shatter = __esm({
    "src/fx/ice/ice-shatter.js"() {
      init_core();
      init_lib5();
      meta23 = {
        name: "Ice shatter",
        desc: "A block of ice takes a hit from the left: it jolts, cracks race over its faces, it flashes white and bursts into chunks that tumble, bounce and skid off in a roll of ice dust.",
        tags: ["ice", "shatter", "break", "destroy", "impact", "directional", "one-shot"],
        size: [224, 112],
        origin: [68, 90],
        duration: 2.8,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], seed: 6 }
      }, HIT2 = 0.26, CRACK2 = 0.4, SHIVER = 0.54, FLASH = 0.62, BURST = 0.68, FRONT = [[-16, 0], [-16, -28], [12, -28], [12, 0]], TOP3 = [[-16, -28], [-8, -34], [20, -34], [12, -28]], SIDE = [[12, 0], [12, -28], [20, -34], [20, -6]], SIL = [[-16, 0], [-16, -28], [-8, -34], [20, -34], [20, -6], [12, 0]], HIT_AT = [-16, -15], PLANE = [[-16, -21], [-5, -28], [3, -13], [-16, -9]], SHADE = [[5, -28], [12, -28], [12, -10]];
    }
  });

  // src/fx/holy/smite.js
  var smite_exports = {};
  __export(smite_exports, {
    create: () => create16,
    meta: () => meta24
  });
  function chip(p, b, st) {
    let r = 0.6 + b.s * 0.7, fade = Math.min(1, b.life / 0.5), lx = Math.cos(b.a) * r * 0.4, ly = Math.sin(b.a) * r * 0.4;
    p.shade(b.x - r - 1, b.y - r - 1, b.x + r + 1, b.y + r + 1, (x, y, out) => {
      let dx = x - b.x, dy = y - b.y, d = Math.hypot(dx * 1.2, dy);
      if (d > r + 0.9) return;
      let lit = dx * lx + dy * ly;
      out.c = d > r ? OUTLINE4 : lit < -0.3 ? st[3] : lit > 0.5 ? st[1] : st[2], out.a = fade;
    });
  }
  function create16(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), s0 = hex(o.stone), st = [scale(s0, 0.5), scale(s0, 0.75), s0, mix(scale(s0, 1.4), WHITE, 0.1)], dust = mix(s0, hex("#8a8094"), 0.4), ps = new Particles({ rng: R6, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]] }), chips = new Bits({ ground: () => 0 }), lights = new Lights(), cracks5 = Array.from({ length: 7 }, (_, i) => {
      let a = 0.12 + i / 6 * (Math.PI - 0.24) + R6.range(-0.12, 0.12), L = R6.range(30, 54) * (Math.abs(Math.sin(a)) > 0.7 ? 0.6 : 1), pts = bolt(R6, 0, 0, Math.cos(a) * L, Math.sin(a) * L, { jag: 0.28, depth: 4 }).map(([x, z]) => [x, z * SY3]), fork = pts.length > 6 ? bolt(R6, ...pts[Math.floor(pts.length * 0.5)], pts[Math.floor(pts.length * 0.5)][0] + Math.cos(a + R6.sign() * 0.7) * L * 0.35, pts[Math.floor(pts.length * 0.5)][1] + Math.sin(a + R6.sign() * 0.7) * L * 0.35 * SY3, { jag: 0.3, depth: 3 }) : null;
      return { pts, fork, L, cool: R6.range(1.6, 2.1) };
    }), t = 0, hit = !1, tipY = (tt) => lerp(TOP4 - 6, 0, ease.inCubic(seg(tt, MARK2, HIT3)));
    function hammer(p) {
      if (t < MARK2 || t >= HIT3 + 0.06) return;
      let y1 = t >= HIT3 ? 0 : tipY(t), y0 = Math.max(TOP4 + 5, y1 - LEN * (t >= HIT3 ? 1 - (t - HIT3) / 0.06 : 1)), white = t >= HIT3;
      if (!(y1 < TOP4 + 12)) {
        for (let [dx, k] of [[-5, 0.6], [-2, 0.9], [2, 0.8], [5, 0.5]]) y0 > TOP4 + 2 && p.line(dx, Math.max(TOP4, y0 - 70), dx, y0, (u) => u > 0.7 ? C[6] : C[4], (u) => u * k);
        y1 - 3 > y0 && p.beam(0, y0, 0, y1 - 3, 9, (u, v) => white || v < 0.35 ? WHITE : v < 0.7 ? C[6] : C[5]), p.beam(0, y1 - 6, 0, y1 - 1, 13, (u, v) => v < 0.6 || white ? WHITE : C[6]), p.glowLine(0, y0 + 10, 0, y1, 16, C[5], 0.6), p.glow(0, y1 - 4, Math.min(22, y1 - TOP4 - 6), WHITE, 0.5);
      }
    }
    function crack(p) {
      if (t < HIT3) return;
      let grow = ease.outCubic(seg(t, HIT3, HIT3 + 0.1));
      for (let c of cracks5)
        for (let path2 of c.fork ? [c.pts, c.fork] : [c.pts]) {
          let n = Math.max(1, Math.round((path2.length - 1) * grow));
          for (let i = 0; i < n; i++) {
            let [x0, y0] = path2[i], [x1, y1] = path2[i + 1], d = Math.hypot(x0, y0 / SY3) / c.L, heat2 = clamp(1 - (t - HIT3) / c.cool - d * 0.5);
            if (heat2 <= 0) continue;
            let col = heat2 > 0.85 ? WHITE : heat2 > 0.65 ? C[6] : heat2 > 0.45 ? C[5] : heat2 > 0.3 ? C[4] : heat2 > 0.18 ? C[3] : C[2];
            p.line(x0, y0, x1, y1, col, heat2 < 0.12 ? heat2 / 0.12 : 1), d < 0.45 && path2 === c.pts && p.line(x0, y0 + 1, x1, y1 + 1, heat2 > 0.5 ? C[4] : C[2], heat2 < 0.12 ? heat2 / 0.12 : 1), i % 2 === 0 && p.glow(x0, y0, 10, C[4], 0.45 * heat2);
          }
        }
      let h = clamp(1 - (t - HIT3) / 1.6);
      h > 0 && (oval(p, 0, 0, 5, 1.6, h > 0.6 ? WHITE : h > 0.3 ? C[5] : C[3], Math.min(1, h * 3)), p.glow(0, 0, 18, C[4], 0.45 * h));
    }
    return {
      update(dt) {
        if (t += dt, t < MARK2 && R6.chance(0.25) && ps.spawn(P.STAR, R6.range(-10, 10), -R6.range(0, 18), 0, -R6.range(4, 12), R6.range(0.2, 0.4), R6.chance(0.5) ? WHITE : C[6], R6.range(0.5, 1.2)), t > MARK2 && t < HIT3 && tipY(t) > TOP4 + 50 && R6.chance(0.6) && ps.spawn(P.MOTE, R6.sign() * R6.range(4, 7), tipY(t) - R6.range(4, 30), R6.range(-20, 20), -R6.range(10, 40), R6.range(0.15, 0.3), C[6], 0.7), !hit && t >= HIT3) {
          hit = !0, lights.add(0, -24, 92, C[5], 1, 0.6), lights.add(0, -8, 40, WHITE, 0.9, 0.12);
          for (let i = 0; i < 60; i++) {
            let a = -Math.PI / 2 + R6.range(-1.25, 1.25), sp = R6.range(110, 280);
            ps.spawn(P.SPARK, R6.range(-3, 3), -2, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.25, 0.75));
          }
          for (let i = 0; i < 16; i++) {
            let a = -Math.PI / 2 + R6.range(-1, 1), sp = R6.range(60, 160);
            ps.spawn(P.STAR, R6.range(-4, 4), -4, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.4, 0.9), R6.chance(0.5) ? WHITE : C[6], R6.range(0.8, 2.4));
          }
          for (let i = 0; i < 14; i++) {
            let a = -Math.PI / 2 + R6.range(-1.2, 1.2), sp = R6.range(90, 230);
            chips.add({ kind: B.CHUNK, x: R6.range(-5, 5), y: -2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 1, drag: 0.4, bounce: 0.35, life: R6.range(1.2, 1.8), a: R6.range(0, TAU), va: R6.range(-14, 14), s: R6.int(1, 3) });
          }
          for (let i = 0; i < 34; i++) {
            let a = -Math.PI / 2 + R6.range(-1, 1), sp = R6.range(60, 220);
            ps.spawn(P.GRIT, R6.range(-4, 4), -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.9, 1.5), R6.pick(st.slice(1)), R6.chance(0.4) ? 2 : 1);
          }
          for (let i = 0; i < 9; i++) {
            let s = R6.sign();
            ps.spawn(P.SMOKE, s * R6.range(2, 10), -R6.range(1, 4), s * R6.range(50, 130), -R6.range(2, 12), R6.range(0.7, 1.2), mix(dust, C[4], 0.18), R6.range(3.5, 6), R6.range(0, 0.06), PF.BIG);
          }
          for (let i = 0; i < 4; i++) ps.spawn(P.SMOKE, R6.range(-4, 4), -R6.range(2, 8), R6.range(-8, 8), -R6.range(20, 45), R6.range(1.2, 1.8), mix(dust, C[5], 0.25), R6.range(4, 6), R6.range(0.05, 0.3));
        }
        if (t > HIT3 && t < HIT3 + 1.3 && R6.chance(0.5)) {
          let c = R6.pick(cracks5), q = R6.pick(c.pts);
          R6.chance(0.75) ? ps.spawn(P.EMBER, q[0], q[1] - 1, R6.range(-8, 8), -R6.range(15, 35), R6.range(0.5, 0.9), C[5]) : ps.spawn(P.STAR, q[0], q[1] - 2, 0, -R6.range(4, 12), R6.range(0.3, 0.6), R6.chance(0.5) ? WHITE : C[6], R6.range(0.8, 1.8));
        }
        chips.update(dt), ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        crack(p), ps.draw(p, "back");
        let k = seg(t, HIT3, HIT3 + 0.42);
        t >= HIT3 && k < 1 && band(p, 0, 0, 6 + 84 * ease.outCubic(k), SY3 * 0.8, Math.max(1, 5 * (1 - k)), 1.15 - k, C.slice(3), (g) => Math.sin(g) < 0, k < 0.12);
      },
      draw(p) {
        if (t < HIT3) {
          let u = seg(t, 0, MARK2), k2 = smooth(0, 0.08, t), spin = t * 3, rr = lerp(26, 8, ease.inOutCubic(u));
          oval(p, 0, 0, rr, rr * SY3, (g) => Math.sin(g * 4 + spin) > 0 ? WHITE : C[5], k2 * (0.65 + 0.35 * Math.sin(t * 40))), oval(p, 0, 1, rr, rr * SY3, C[3], k2 * 0.6, (g) => Math.sin(g) > 0);
          let L = (3 + 8 * ease.outBack(clamp(t / 0.2), 2)) * (t > MARK2 ? 1 + 0.6 * seg(t, MARK2, HIT3) : 1);
          for (let i = 0; i < 4; i++) {
            let a = spin * 0.3 + i * Math.PI / 2, len2 = i % 2 ? L * 0.6 : L;
            p.line(0, -2, Math.cos(a) * len2, -2 + Math.sin(a) * len2, (v) => v < 0.4 ? WHITE : C[5], (v) => 1.2 - v);
          }
          p.px(0, -2, WHITE), p.glow(0, -2, 14 + 10 * u, C[5], 0.5 * k2), p.glowLine(0, TOP4 + 6, 0, -2, 5, C[4], 0.12 * u);
        }
        hammer(p);
        let ai = seg(t, HIT3 + 0.04, HIT3 + 0.55);
        if (t > HIT3 + 0.04 && ai < 1) {
          let w = 1 + 4 * Math.pow(1 - ai, 2);
          p.beam(0, TOP4 + 4, 0, -4, w, (u, v) => v < 0.5 ? WHITE : C[5], (u) => (0.3 + 0.7 * u) * (1 - ai * 0.5)), p.glowLine(0, TOP4 + 16, 0, -6, 10, C[5], 0.4 * (1 - ai));
        }
        let k = seg(t, HIT3, HIT3 + 0.42);
        t >= HIT3 && k < 1 && band(p, 0, 0, 6 + 84 * ease.outCubic(k), SY3 * 0.8, Math.max(1, 5 * (1 - k)), 1.15 - k, C.slice(3), (g) => Math.sin(g) >= 0, k < 0.12);
        let d = seg(t, HIT3, HIT3 + 0.28);
        if (t >= HIT3 && d < 1) {
          let r = 8 + 40 * ease.outCubic(d);
          p.arc(0, 0, r, Math.max(1, 3 * (1 - d)), Math.PI, TAU, (u, v) => d < 0.2 || v > 0.6 ? WHITE : C[5], 1.1 - d);
          for (let g = Math.PI * 1.1; g < TAU - 0.2; g += 0.5) p.glow(Math.cos(g) * r, Math.sin(g) * r, 8, C[5], 0.3 * (1 - d));
        }
        t >= HIT3 && t < HIT3 + 0.07 && (p.circle(0, -6, 16, WHITE), p.circle(0, -6, 19, C[6], 0.6));
        for (let b of chips.list) chip(p, b, st);
        ps.draw(p, "front"), t >= HIT3 && t < HIT3 + 0.25 && sparkle(p, 0, -8, 16 * (1 - (t - HIT3) / 0.25), WHITE, C[5], 0.7), lights.draw(p);
      }
    };
  }
  var meta24, TOP4, SY3, MARK2, HIT3, LEN, OUTLINE4, init_smite = __esm({
    "src/fx/holy/smite.js"() {
      init_core();
      init_lib6();
      meta24 = {
        name: "Smite",
        desc: "A glint marks the spot, then a bolt of light drops like a hammer: a white flash, a shockwave over the floor, stone chips flying and cracks that glow and cool.",
        tags: ["holy", "smite", "strike", "impact", "light", "ground", "one-shot"],
        size: [224, 176],
        origin: [112, 148],
        duration: 2.8,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: GOLD, stone: "#5a5066", seed: 9 }
      }, TOP4 = -148, SY3 = 0.38, MARK2 = 0.42, HIT3 = 0.54, LEN = 44, OUTLINE4 = hex("#1a1422");
    }
  });

  // src/fx/nature/_lib.js
  function stoneShape(R6, n = R6.int(5, 7)) {
    let pts = [], a0 = R6.range(0, TAU), squash = R6.range(0.7, 1);
    for (let i = 0; i < n; i++) {
      let a = a0 + (i + R6.range(-0.28, 0.28)) * TAU / n, r = R6.range(0.72, 1.12);
      pts.push([Math.cos(a) * r, Math.sin(a) * r * squash]);
    }
    return pts;
  }
  function drawRock(p, x, y, s, a, pts, S, alpha = 1, white = !1) {
    let n = S.length, top = n - 2, ca = Math.cos(a), sa = Math.sin(a);
    if (s < 1.4) {
      p.dot(x, y, S[top - 1], alpha), p.dot(x + 1, y, S[top - 3], alpha);
      return;
    }
    let V = pts.map(([u, v]) => [(u * ca - v * sa) * s, (u * sa + v * ca) * s]), ang = V.map(([vx, vy]) => Math.atan2(vy, vx)), lit = V.map(([ax, ay], i) => {
      let [bx, by] = V[(i + 1) % V.length], ex = bx - ax, ey = by - ay, l = Math.hypot(ex, ey) || 1, nx = ey / l, ny = -ex / l;
      return nx * (ax + bx) + ny * (ay + by) < 0 && (nx = -nx, ny = -ny), nx * LX2 + ny * LY2;
    }), X0 = Math.floor(x) - Math.ceil(s * 1.25) - 1, Y02 = Math.floor(y) - Math.ceil(s * 1.25) - 1, N9 = Math.min(62, 2 * Math.ceil(s * 1.25) + 3);
    for (let j = 0; j < N9; j++)
      for (let i = 0; i < N9; i++) {
        let dx = X0 + i + 0.5 - x, dy = Y02 + j + 0.5 - y, k = j * 64 + i;
        if (MASK[k] = inPoly2(V, dx, dy) ? 1 : 0, !MASK[k]) continue;
        let g = Math.atan2(dy, dx), f = 0;
        for (let q = 0; q < ang.length; q++) {
          let a0 = ang[q], a1 = ang[(q + 1) % ang.length], d = (g - a0) % TAU, span = (a1 - a0) % TAU;
          if (d < 0 && (d += TAU), span < 0 && (span += TAU), d <= span) {
            f = q;
            break;
          }
        }
        FACE[k] = f;
      }
    let at2 = (i, j) => i >= 0 && j >= 0 && i < N9 && j < N9 && MASK[j * 64 + i] === 1;
    for (let j = -1; j <= N9; j++)
      for (let i = -1; i <= N9; i++) {
        let X = X0 + i, Y3 = Y02 + j;
        if (!at2(i, j)) {
          (at2(i - 1, j) || at2(i + 1, j) || at2(i, j - 1) || at2(i, j + 1)) && p.dot(X, Y3, S[0], alpha);
          continue;
        }
        if (white) {
          p.dot(X, Y3, WHITE, alpha);
          continue;
        }
        let L = lit[FACE[j * 64 + i]], edge = !at2(i - 1, j) || !at2(i + 1, j) || !at2(i, j - 1) || !at2(i, j + 1), c = L > 0.55 ? S[top] : L > 0.15 ? S[top - 1] : L > -0.3 ? S[top - 2] : S[top - 3];
        edge && (c = L > 0.3 ? S[top + 1] : L < -0.2 ? S[Math.max(1, top - 4)] : c), p.dot(X, Y3, c, alpha);
      }
  }
  function drawSpike(p, x, base, h, w, lean, sp, S, opts = {}) {
    if (h < 1.5) return;
    let a = opts.a ?? 1, white = opts.white, glint2 = opts.glint ?? -1, clip = opts.clip ?? 1, floorY = opts.floor ?? 1 / 0, hw = (u, side) => {
      let v = w / 2 * Math.pow(Math.max(0, 1 - u), 0.85) + 0.3;
      for (let n of sp.notches) n.side === side && u > n.u && u < n.u + 0.07 && (v -= n.d * (1 - u * 0.5));
      return Math.max(0, v);
    }, half = opts.half ?? 0, Y02 = Math.floor(base - h) - 2, NR2 = Math.min(ROWS, Math.ceil(base) - Y02 + 2);
    for (let k = 0; k < NR2; k++) {
      let u = (base - (Y02 + k + 0.5)) / h;
      RU[k] = u, u < 0 || u > 1 || Y02 + k + 0.5 > floorY ? (RL[k] = 1 / 0, RR[k] = -1 / 0) : (RL[k] = x + lean * u - hw(u, -1), RR[k] = x + lean * u + hw(u, 1));
    }
    let inside = (px, py) => {
      let k = py - Y02, fx = px + 0.5;
      if (k < 0 || k >= NR2 || fx < RL[k] || fx > RR[k] || clip < 1 && RU[k] > clip + (rand(px, 77) - 0.5) * 0.07) return !1;
      if (!half) return !0;
      let q = (fx - RL[k]) / Math.max(0.5, RR[k] - RL[k]) * 2 - 1;
      return half < 0 ? q < -0.18 : q >= -0.18;
    }, X0 = Math.floor(x - w / 2 - Math.abs(lean) - 2), X1 = Math.ceil(x + w / 2 + Math.abs(lean) + 2);
    for (let py = Math.floor(base - h) - 1; py < Math.ceil(base); py++)
      for (let px = X0; px <= X1; px++) {
        if (!inside(px, py)) {
          py + 0.5 <= floorY && (inside(px - 1, py) || inside(px + 1, py) || inside(px, py + 1) || inside(px, py - 1) && py < base - 1) && p.dot(px, py, S[0], a);
          continue;
        }
        if (white) {
          p.dot(px, py, WHITE, a);
          continue;
        }
        let k0 = py - Y02, u = RU[k0], c = x + lean * u, l = RL[k0], r = RR[k0], fx = px + 0.5, band2 = 0, st = !1;
        for (let s of sp.strata) {
          let d = u * h - s * h - sp.slope * (fx - c);
          d > 0 && band2++, Math.abs(d) < 0.5 && (st = !0);
        }
        let jog = (rand(band2, sp.seed) - 0.5) * 0.3, q = (fx - l) / Math.max(0.5, r - l) * 2 - 1, qr = -0.18 + jog, i;
        u > 0.93 ? i = q < qr + 0.3 ? 7 : 5 : Math.abs(q - qr) < Math.max(0.09, 0.55 / Math.max(1, r - l)) ? i = 7 : q < qr ? i = fx - l < 1 ? 7 : q < -0.5 + jog ? 6 : 5 : i = r - fx < 1 ? 3 : q < 0.38 + jog ? 4 : 2, st && i < 7 && (i -= 1);
        let fleck = rand(px * 7 + 3, py * 13 + 5);
        if (fleck < 0.035 ? i = q < qr ? 7 : i - 1 : fleck > 0.965 && (i -= 1), glint2 >= 0 && q < qr + 0.1) {
          let g = Math.abs(u - glint2);
          g < 0.035 ? i = 8 : g < 0.07 && (i = Math.max(i, 7));
        }
        p.dot(px, py, i >= 8 ? WHITE : S[clamp(i, 0, S.length - 1)], a);
      }
    if (opts.cracks && opts.crack > 0)
      for (let path2 of opts.cracks) {
        let m = Math.max(1, Math.floor(path2.length * opts.crack));
        for (let k = 1; k < m; k++) {
          let [u0, v0] = path2[k - 1], [u1, v1] = path2[k], P3 = ([u, v]) => [x + lean * u + v * hw(u, v < 0 ? -1 : 1), base - u * h], [ax, ay] = P3([u0, v0]), [bx, by] = P3([u1, v1]);
          if (u1 > clip) break;
          if (!inside(Math.floor(ax), Math.floor(ay)) || !inside(Math.floor(bx), Math.floor(by))) continue;
          let hot = opts.heat ?? 0, Gl = opts.glowRamp;
          hot > 0.05 && Gl ? (p.line(ax + 1, ay, bx + 1, by, S[0], a), p.line(ax, ay, bx, by, hot > 0.7 ? Gl[4] : hot > 0.4 ? Gl[3] : hot > 0.2 ? Gl[2] : Gl[1], a), k % 2 === 0 && p.glow(bx, by, 7, Gl[2], 0.35 * hot)) : (p.line(ax, ay, bx, by, S[0], a), p.dot(bx + 1, by - 1, S[6], a * 0.7));
        }
      }
  }
  function spikeLook(R6) {
    let notches = [], strata = [];
    for (let i = 0, n = R6.int(3, 5); i < n; i++) notches.push({ u: R6.range(0.1, 0.8), side: R6.sign(), d: R6.range(0.8, 1.8) });
    for (let i = 0, n = R6.int(2, 4); i < n; i++) strata.push(R6.range(0.12, 0.8));
    return { notches, strata, slope: R6.range(-0.25, 0.25), seed: R6.int(1, 9999) };
  }
  function spikeCrack(R6, u0, v0, dir) {
    let pts = [[u0, v0]], u = u0, v = v0;
    for (let i = 0; i < 9 && (u += R6.range(0.03, 0.08), v += dir * R6.range(0.05, 0.28) + R6.range(-0.12, 0.12), !(u > 0.95 || Math.abs(v) > 1)); i++)
      pts.push([u, v]);
    return pts;
  }
  function floorCrack(R6, side, len2) {
    let pts = [[0, 0]];
    for (let x = 0; Math.abs(x) < len2; )
      x += side * R6.range(2, 5), pts.push([x, R6.int(0, 2)]);
    return pts;
  }
  function drawLeaf(p, x, y, len2, wid, ang, fl, pal, alpha = 1) {
    let ca = Math.cos(ang), sa = Math.sin(ang), sq = Math.cos(fl), w = Math.max(0.55, Math.abs(sq) * wid), under = sq < 0, R6 = Math.ceil(len2 / 2 + 2), X = Math.round(x), Y3 = Math.round(y), inside = (i, j) => {
      let u = (i + 0.5) * ca + (j + 0.5) * sa + len2 / 2, v = -(i + 0.5) * sa + (j + 0.5) * ca;
      if (u < 0 || u > len2) return 0;
      let half = w * Math.pow(Math.sin(Math.PI * u / len2), 0.75);
      return Math.abs(v) <= half ? v < 0 ? 1 : 2 : 0;
    };
    for (let j = -R6; j <= R6; j++)
      for (let i = -R6; i <= R6; i++) {
        let s = inside(i, j);
        if (!s) {
          (inside(i - 1, j) || inside(i + 1, j) || inside(i, j - 1) || inside(i, j + 1)) && p.dot(X + i, Y3 + j, pal[0], alpha);
          continue;
        }
        let u = (i + 0.5) * ca + (j + 0.5) * sa + len2 / 2, v = -(i + 0.5) * sa + (j + 0.5) * ca, rib = Math.abs(v) < 0.5 && u > len2 * 0.12 && u < len2 * 0.88 && w > 1.2;
        p.dot(X + i, Y3 + j, rib ? pal[1] : s === 1 !== under ? pal[3] : pal[2], alpha);
      }
    p.dot(X - ca * (len2 / 2 + 1), Y3 - sa * (len2 / 2 + 1), pal[1], alpha);
  }
  function gasPuff(p, x, y, r, a, belly, body4, cap, hi = 0) {
    a < 0.02 || r < 0.6 || (p.disc(x + r * 0.06, y + r * 0.28, r * 0.9, belly, a * 0.55), p.disc(x, y, r, body4, a * 0.45), p.disc(x + r * 0.03, y - r * 0.02, r * 0.76, body4, a * 0.5), p.disc(x - r * 0.2, y - r * 0.34, r * 0.52, cap, a * 0.45), hi && p.disc(x - r * 0.3, y - r * 0.55, r * 0.26, hi, a * 0.32));
  }
  var LX2, LY2, inPoly2, MASK, FACE, ROWS, RL, RR, RU, Drops2, Gas, init_lib11 = __esm({
    "src/fx/nature/_lib.js"() {
      init_core();
      LX2 = -0.6, LY2 = -0.8, inPoly2 = (V, x, y) => {
        let inside = !1;
        for (let i = 0, j = V.length - 1; i < V.length; j = i++) {
          let [xi, yi] = V[i], [xj, yj] = V[j];
          yi > y != yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi && (inside = !inside);
        }
        return inside;
      }, MASK = new Uint8Array(4096), FACE = new Int8Array(4096), ROWS = 400, RL = new Float32Array(ROWS), RR = new Float32Array(ROWS), RU = new Float32Array(ROWS);
      Drops2 = class {
        constructor(ground = () => 0) {
          this.list = [], this.ground = ground;
        }
        add(x, y, vx, vy, s = 1, delay = 0) {
          this.list.push({ x, y, vx, vy, s, delay });
        }
        update(dt, onLand) {
          for (let i = this.list.length - 1; i >= 0; i--) {
            let d = this.list[i];
            if (d.delay > 0) {
              d.delay -= dt;
              continue;
            }
            let drag = 0.6 / d.s, py = d.y;
            d.vy += GRAVITY * dt, d.vx -= d.vx * drag * dt, d.vy -= d.vy * drag * 0.5 * dt, d.x += d.vx * dt, d.y += d.vy * dt;
            let g = this.ground(d.x);
            d.vy > 0 && py <= g && d.y >= g && (onLand?.(d, g), this.list.splice(i, 1));
          }
        }
        /** C: the liquid's ramp, dark to bright (5+ steps). */
        draw(p, C) {
          let n = C.length;
          for (let d of this.list) {
            if (d.delay > 0) continue;
            let sp = Math.hypot(d.vx, d.vy) || 1, ux = d.vx / sp, uy = d.vy / sp, len2 = Math.min(5, 0.5 + sp * 0.012);
            p.line(d.x - ux * len2, d.y - uy * len2, d.x - ux, d.y - uy, C[n - 4]), p.px(d.x, d.y, C[n - 1]), d.s > 1 && (p.px(d.x - ux, d.y - uy, C[n - 2]), p.px(d.x + 1, d.y, C[n - 3])), p.glow(d.x, d.y, 3 + d.s * 1.5, C[n - 2], 0.3);
          }
        }
      };
      Gas = class {
        constructor() {
          this.list = [], this.n = 0;
        }
        add(t, x, y, vx, vy, r0, r1, end, rise = 0) {
          this.list.push({ x, y, vx, vy, r0, r1, t0: t, end, rise, seed: this.n++ * 37.7 % 100 });
        }
        prune(t) {
          for (let i = this.list.length - 1; i >= 0; i--) t > this.list[i].end && this.list.splice(i, 1);
        }
        at(q, t) {
          let age = t - q.t0, e = 1 - Math.exp(-age * 2.2), sw = Math.min(1, age), x = q.x + q.vx / 2.2 * e + Math.sin(t * 1.7 + q.seed) * 2.5 * sw, y = q.y + q.vy / 2.2 * e - q.rise * age + Math.sin(t * 1.3 + q.seed * 2) * 1.5 * sw, u = clamp(age / Math.max(0.01, q.end - q.t0)), r = q.r0 + (q.r1 - q.r0) * (1 - Math.pow(1 - Math.min(1, age / 1.2), 3));
          return { x, y, r, a: clamp(age / 0.15) * (1 - clamp((u - 0.4) / 0.6)), u };
        }
        draw(p, t, belly, body4, cap, hi = 0, k = 1, glow = 0) {
          for (let q of this.list) {
            let g = this.at(q, t);
            g.a <= 0.02 || (gasPuff(p, g.x, g.y, g.r, g.a * k, belly, body4, cap, g.u < 0.5 ? hi : 0), glow && g.r > 4 && p.glow(g.x, g.y, g.r * 1.6, glow, 0.07 * g.a * k));
          }
        }
      };
    }
  });

  // src/fx/nature/acid-splash.js
  var acid_splash_exports = {};
  __export(acid_splash_exports, {
    create: () => create17,
    meta: () => meta25
  });
  function wisp(p, q, t, col) {
    let age = t - q.t0, u = age / q.life;
    if (u < 0 || u >= 1) return;
    let head4 = q.rise * age, tail2 = Math.max(0, head4 - q.len), fade = smooth(0, 0.15, u) * (1 - smooth(0.4, 1, u));
    for (let h = tail2; h <= head4; h += 0.5) {
      let s = (h - tail2) / Math.max(1, head4 - tail2), x = q.x + q.amp * Math.sin(h * q.k + q.ph) * (0.2 + s) + q.drift * age;
      p.blend(x, q.y - h, col, fade * Math.sin(Math.PI * s) * 0.42);
    }
  }
  function create17(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), floor = () => 0, SCORCH = mix(C[0], hex("#140f0c"), 0.6), BURNT = mix(C[1], hex("#2a1a10"), 0.6), STEAM = mix(C[7], hex("#e8ece6"), 0.75), ps = new Particles({ rng: R6, ground: floor, sparks: [C[7], C[6], C[5], C[4]] }), drops = new Drops2(floor), lights = new Lights(), stains = [], wisps = [], pops = [], spikes2 = Array.from({ length: 13 }, (_, i) => ({ a: i / 13 * TAU + R6.range(-0.18, 0.18), h: R6.range(4, 10), r: R6.range(0.85, 1.12), shed: !1 })), rag = Array.from({ length: 80 }, (_, i) => rand(i, o.seed, 5) - 0.5), t = 0, hit = !1, pw = () => W * ease.outCubic(clamp((t - HIT4) / SPREAD)) * 1.02, pitD = () => PIT * ease.outCubic(clamp((t - HIT4) / 1.1)), depth = (x) => {
      let w = pw(), d = Math.abs(x) / Math.max(1, w);
      return d >= 1 ? -1 : pitD() * Math.sqrt(1 - d * d) + rag[(Math.round(x) + 200) % 80] * 0.9;
    }, level4 = () => t < HIT4 ? 0 : -1.6 + (PIT + 1.6) * ease.inQuad(smooth(DRY, GONE2, t)), width = () => {
      let L = level4(), w = pw();
      return L <= 0 ? w : w * Math.sqrt(Math.max(0, 1 - (L / Math.max(0.1, pitD())) ** 2));
    }, heat2 = () => smooth(HIT4, HIT4 + 0.3, t) * (1 - smooth(GONE2 - 0.3, GONE2 + 0.25, t)), gobY = () => Y0 + V0 * t + 0.5 * 950 * t * t, crownR = () => 4 + 11 * ease.outCubic(clamp((t - HIT4) / 0.16)), crownH = () => 5 * Math.sin(Math.PI * clamp((t - HIT4) / 0.26)), spikeK = () => {
      let u = clamp((t - HIT4 - 0.015) / 0.26);
      return Math.sin(Math.PI * Math.pow(u, 0.6));
    }, tipOf2 = (s) => {
      let r = crownR() * s.r, h = crownH(), sn = Math.sin(s.a), sh = s.h * spikeK(), bx = Math.cos(s.a) * r, by = sn * r * 0.3 - h * (0.75 + 0.25 * Math.abs(sn));
      return [bx, by, bx + Math.cos(s.a) * sh * 0.55, by - sh];
    }, steam = (x, y, big) => wisps.push({ x, y, t0: t, life: Math.min(R6.range(0.5, 0.9) * (big ? 1.3 : 1), meta25.duration - 0.05 - t), rise: R6.range(22, 32), len: R6.range(5, 10) * (big ? 1.4 : 1), amp: R6.range(1, 2.5), k: R6.range(0.35, 0.6), ph: R6.range(0, TAU), drift: R6.range(-4, 4) }), crown2 = (p, back) => {
      if (t < HIT4 || t > HIT4 + 0.27) return;
      let r = crownR(), h = crownH(), ry = r * 0.3;
      for (let x = Math.floor(-r); x <= Math.ceil(r); x++) {
        let c = (x + 0.5) / r;
        if (Math.abs(c) > 1) continue;
        let e = Math.sqrt(1 - c * c), yb = (back ? -ry : ry) * e, hh = h * (0.75 + 0.25 * e);
        for (let y = Math.floor(yb - hh); y <= Math.round(yb); y++)
          y === Math.floor(yb - hh) ? p.px(x, y, back ? C[5] : c < 0.1 ? C[7] : C[6]) : p.blend(x, y, C[(c < -0.25 ? 5 : c > 0.45 ? 3 : 4) - (back ? 1 : 0)], back ? 0.55 : 0.7);
      }
      for (let s of spikes2) {
        if (Math.sin(s.a) < 0 !== back) continue;
        let [bx, by, tx, ty] = tipOf2(s);
        p.line(bx, by, tx, ty, back ? C[4] : C[6]), p.line(bx + 1, by, (bx + tx) / 2 + 0.5, (by + ty) / 2, back ? C[3] : C[5]), s.shed || (p.px(tx, ty - 1, back ? C[5] : C[7]), p.px(tx + 1, ty - 1, C[5]));
      }
    };
    return {
      update(dt) {
        t += dt;
        let f = Math.min(1, dt * 120), w = width();
        if (!hit && t >= HIT4) {
          hit = !0, lights.add(0, -4, 28, WHITE, 0.6, 0.08), lights.add(0, -10, 56, C[5], 0.5, 0.6);
          for (let i = 0; i < 26; i++) {
            let a = -Math.PI / 2 + R6.range(-1.35, 1.35), sp = R6.range(60, 250);
            drops.add(R6.range(-3, 3), -2, Math.cos(a) * sp, Math.sin(a) * sp, R6.chance(0.3) ? 2 : 1);
          }
          for (let i = 0; i < 10; i++) {
            let a = -Math.PI / 2 + R6.range(-1.2, 1.2), sp = R6.range(120, 260);
            ps.spawn(P.SPARK, 0, -2, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.12, 0.3));
          }
          for (let i = 0; i < 5; i++) steam(R6.range(-10, 10), -R6.range(2, 6), !0);
        }
        if (hit) {
          for (let s of spikes2)
            if (!s.shed && t > HIT4 + 0.09) {
              s.shed = !0;
              let [, , tx, ty] = tipOf2(s);
              drops.add(tx, ty - 1, Math.cos(s.a) * R6.range(30, 80), -R6.range(50, 130), R6.chance(0.4) ? 2 : 1);
            }
        }
        drops.update(dt, (d) => {
          Math.abs(d.x) > pw() && stains.push({ x: d.x, t0: t, w: d.s * 0.8 + R6.range(0.3, 1.2) }), t < GONE2 && steam(d.x, -1, !1);
        });
        let lv = level4(), w2 = width();
        if (t > HIT4 + 0.15 && t < GONE2 && w2 > 2) {
          if (R6.chance(0.3 * f)) {
            let x = R6.range(-0.85, 0.85) * w2, y = Math.min(lv, depth(x)) - 1;
            pops.push({ x, y, t0: t });
            for (let j = 0; j < R6.int(1, 3); j++) drops.add(x, Math.min(y - 1, -1), R6.range(-40, 40), -R6.range(50, 110), 1);
          }
          R6.chance(0.14 * f) && steam(R6.range(-0.9, 0.9) * w2, Math.min(lv, 0) - 1, R6.chance(0.25));
        }
        t > GONE2 - 0.2 && t < meta25.duration - 0.5 && R6.chance(0.08 * f) && steam(R6.range(-0.7, 0.7) * pw(), 0, !1);
        for (let i = pops.length - 1; i >= 0; i--) t - pops[i].t0 > 0.1 && pops.splice(i, 1);
        for (let i = wisps.length - 1; i >= 0; i--) t - wisps[i].t0 > wisps[i].life && wisps.splice(i, 1);
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let fade = 1 - smooth(meta25.duration - 0.6, meta25.duration - 0.08, t), hk = heat2(), w = pw(), lv = level4();
        for (let s of stains) {
          let age = t - s.t0, k = 1 - smooth(1, 1.8, age), c = age < 0.15 ? C[7] : age < 0.5 ? C[6] : age < 0.9 ? C[4] : BURNT;
          for (let x = Math.floor(s.x - s.w); x <= Math.ceil(s.x + s.w); x++) p.dot(x, 0, Math.abs(x - s.x) < s.w * 0.5 ? SCORCH : c, k * fade);
          age < 0.5 && p.glow(s.x, -1, 5, C[5], 0.3 * (1 - age / 0.5));
        }
        if (crown2(p, !0), t > HIT4 && w > 1) {
          for (let x = Math.floor(-w) - 1; x <= Math.ceil(w) + 1; x++) {
            let dp = depth(x + 0.5);
            if (dp < 0) continue;
            let bottom = Math.max(0, Math.round(dp)), edge = Math.abs(x + 0.5) / w > 0.88;
            for (let y = 0; y <= bottom; y++) p.dot(x, y, y === bottom ? hk > 0.5 ? C[6] : hk > 0.15 ? C[4] : BURNT : SCORCH, fade);
            p.dot(x, bottom + 1, hk > 0.5 ? C[5] : hk > 0.15 ? C[3] : SCORCH, fade * 0.8), edge && p.dot(x, -1, hk > 0.4 ? C[7] : hk > 0.1 ? C[5] : BURNT, fade);
          }
          for (let sd of [-1, 1]) p.glow(sd * w, -1, 8, C[6], 0.45 * hk);
          if (t < GONE2)
            for (let x = Math.floor(-w); x <= Math.ceil(w); x++) {
              let dp = depth(x + 0.5);
              if (dp < 0) continue;
              let d = Math.abs(x + 0.5) / w, dome = lv < 0 ? Math.round(lv * Math.sqrt(Math.max(0, 1 - d * d))) : Math.round(lv), bottom = Math.round(dp);
              if (dome > bottom) continue;
              let n = noise(x * 0.25 - t * 2.4, 3) + noise(x * 0.1 + t * 1.4, 5) * 0.6;
              for (let y = dome; y <= bottom; y++) p.px(x, y, y === dome ? n > 0.7 ? C[7] : C[6] : y === dome + 1 ? n > 0.2 ? C[5] : C[4] : y >= bottom ? C[3] : C[4]);
            }
          p.glow(0, -6, w * 1.4 + 10, C[4], 0.3 * hk * (0.85 + 0.15 * Math.sin(t * 9))), p.glow(0, 1, w * 0.9, C[6], 0.2 * hk);
        }
        ps.draw(p, "back");
      },
      draw(p) {
        if (t < HIT4) {
          let y = gobY(), v = V0 + 950 * t, st = 1 + v * 22e-4, rx = 2.6 / Math.sqrt(st), ry = 2.8 * st;
          p.shade(-rx - 1, y - ry - 4, rx + 1, y + ry + 1, (x, yy, out) => {
            let dx = x / rx, dy = (yy - y) / ry, tail2 = dy < 0 && Math.abs(x) < rx * (1 + dy * 0.9) + 0.4 && dy > -1.7, d = dx * dx + dy * dy;
            d > 1.25 && !tail2 || (out.c = d > 1 && !tail2 ? C[2] : dx < -0.2 && dy < -0.1 ? C[7] : dy > 0.45 ? C[4] : C[5]);
          }), p.px(-1, y - ry * 0.3, WHITE);
          for (let i = 1; i <= 3; i++) p.dot(0, y - ry - 2 - i * 4, C[5], 1 - i * 0.25);
          p.glow(0, y, 10, C[5], 0.45);
        }
        crown2(p, !1);
        let e = t - HIT4;
        if (e >= 0 && e < 0.07) {
          let k = 1 - e / 0.07;
          p.ellipse(0, -2, 6 + 6 * (1 - k), 2.5, k > 0.5 ? WHITE : C[7]), sparkle(p, 0, -4, 8 * k, C[7], C[6], 0.6);
        }
        for (let q of pops) {
          let k = (t - q.t0) / 0.1;
          p.px(q.x, q.y, WHITE);
          for (let [dx, dy] of [[1, 0], [-1, 0], [0, -1]]) p.dot(q.x + dx * (1 + k * 2), q.y + dy * (1 + k * 2), C[7], 1 - k);
          p.glow(q.x, q.y, 4, C[6], 0.4 * (1 - k));
        }
        for (let q of wisps) wisp(p, q, t, STEAM);
        drops.draw(p, C), ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta25, HIT4, Y0, V0, SPREAD, DRY, GONE2, W, PIT, init_acid_splash = __esm({
    "src/fx/nature/acid-splash.js"() {
      init_core();
      init_lib11();
      meta25 = {
        name: "Acid splash",
        desc: "A gob of acid bursts into a crown and spatters; it eats a glowing, smoking pit into the floor and boils down into it, spitting bright beads, pale steam curling off.",
        tags: ["nature", "acid", "poison", "splash", "liquid", "ground", "one-shot"],
        size: [184, 116],
        origin: [92, 100],
        duration: 2.8,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: ["#0e140a", "#1c3010", "#2c5214", "#457e18", "#6aae1c", "#a0dc2a", "#dcff6a", "#f8ffd0"], seed: 6 }
      }, HIT4 = 0.3, Y0 = -62, V0 = 60, SPREAD = 0.4, DRY = 0.7, GONE2 = 2.2, W = 30, PIT = 5;
    }
  });

  // src/fx/projectiles/magic-missile.js
  var magic_missile_exports = {};
  __export(magic_missile_exports, {
    create: () => create18,
    meta: () => meta26
  });
  function create18(o) {
    let C = fit(o.palette, 8), H3 = o.height, X1 = o.reach, R6 = new Rng(o.seed), ps = new Particles({ rng: R6, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights(), pos = (u) => [X1 * ease.inOutSine(u) + Math.sin(u * Math.PI) * 6, -H3 + Math.sin(u * TAU * 1.5) * 9 * Math.sin(u * Math.PI)], t = 0, burst = !1, trail = [];
    return {
      update(dt) {
        if (t += dt, t < CHARGE) {
          if (R6.chance(0.8)) {
            let a = R6.range(0, TAU), d = R6.range(12, 26), sp = d / 0.14;
            ps.spawn(P.MOTE, Math.cos(a) * d, -H3 + Math.sin(a) * d, -Math.cos(a) * sp - Math.sin(a) * sp * 0.5, -Math.sin(a) * sp + Math.cos(a) * sp * 0.5, 0.14, R6.pick([C[5], C[6], WHITE]), 0.8);
          }
        } else if (t < CHARGE + FLY) {
          let u = (t - CHARGE) / FLY, [x, y] = pos(u);
          trail.push({ x, y, t }), R6.chance(0.6) && ps.spawn(P.MOTE, x, y, R6.range(-50, 50), R6.range(-50, 50), R6.range(0.2, 0.4), R6.pick([C[4], C[5], C[6]]), 0.7), R6.chance(0.25) && ps.spawn(P.STAR, x + R6.range(-3, 3), y + R6.range(-3, 3), R6.range(-10, 10), R6.range(-10, 10), R6.range(0.25, 0.5), C[6], R6.range(0.6, 1.6));
        } else if (!burst) {
          burst = !0;
          let y = -H3;
          lights.add(X1, y, 52, C[4], 0.95, 0.55), lights.add(X1, y, 22, WHITE, 0.8, 0.12);
          for (let i = 0; i < 26; i++) {
            let a = R6.range(0, TAU), sp = R6.range(60, 150) * (1 - 0.65 * Math.max(0, Math.sin(a)));
            ps.spawn(i % 3 ? P.MOTE : P.STAR, X1, y, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.25, 0.45), R6.pick([C[5], C[6], WHITE]), R6.range(0.8, 1.8));
          }
          for (let i = 0; i < 18; i++) {
            let a = R6.range(0, TAU), sp = R6.range(110, 240) * (1 - 0.5 * Math.max(0, Math.sin(a)));
            ps.spawn(P.SPARK, X1, y, Math.cos(a) * sp, Math.sin(a) * sp - 30, R6.range(0.12, 0.3));
          }
          for (let i = 0; i < 14; i++) {
            let a = R6.range(0, TAU), d = R6.range(4, 22);
            ps.spawn(P.STAR, X1 + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 0, -R6.range(2, 8), R6.range(0.5, 1.1), R6.pick([C[6], WHITE, C[5]]), R6.range(0.8, 2.6), R6.range(0.05, 0.45));
          }
        }
        ps.update(dt), lights.update(dt);
      },
      draw(p) {
        let now = t, keep2 = trail.filter((q2) => now - q2.t < 0.32);
        for (let i = 1; i < keep2.length; i++) {
          let a = keep2[i - 1], b = keep2[i], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
          for (let f = 0; f < 1; f += 0.5 / l) {
            let tt = a.t + (b.t - a.t) * f, k = 1 - (now - tt) / 0.32, tw = Math.sin(tt * 26), w = 3.2 * k * Math.abs(tw) + 0.4, face = tw > 0, x = a.x + dx * f, y = a.y + dy * f;
            for (let s = -w; s <= w; s += 0.5) {
              let edge = Math.abs(s) > w - 0.8, c = face ? edge ? C[6] : k > 0.6 ? C[5] : C[4] : edge ? C[4] : C[2];
              p.dot(x + nx * s, y + ny * s, c, k > 0.35 ? 1 : k / 0.35);
            }
          }
          i % 3 === 0 && p.glow(b.x, b.y, 6, C[4], 0.25 * (1 - (now - b.t) / 0.32));
        }
        if (ps.draw(p), t < CHARGE + FLY) {
          let k = t < CHARGE ? t / CHARGE : 1, [x, y] = t < CHARGE ? [0, -H3] : pos((t - CHARGE) / FLY), r = 1 + 3 * ease.outBack(k);
          p.circle(x, y, r + 1.4, C[3]), p.circle(x, y, r + 0.4, C[5]), p.circle(x - 0.4, y - 0.4, r * 0.55, WHITE);
          for (let i = 0; i < 3; i++) {
            let a = t * 14 + i * TAU / 3;
            p.px(x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3) * 0.6, i ? C[6] : WHITE);
          }
          p.glow(x, y, 20, C[4], 0.65 * k), p.glow(x, y, 7, C[6], 0.5 * k);
        }
        let q = t - CHARGE - FLY;
        if (q >= 0 && q < 0.5) {
          let e = q / 0.5;
          e < 0.5 && flare(p, X1, -H3, 26 * Math.pow(1 - e * 2, 1.2) + 2, 1 - e * 2, C), e < 0.12 && p.circle(X1, -H3, 6 * (1 - e / 0.12) + 1, WHITE), p.ring(X1, -H3, 4 + 20 * ease.outCubic(e), Math.max(1, 2.5 * (1 - e)), e < 0.3 ? C[6] : C[5], Math.min(1, (1 - e) * 1.5)), e < 0.4 && sparkle(p, X1, -H3, 7 * (1 - e / 0.4), C[6], C[4], 0.6 * (1 - e / 0.4));
        }
        lights.draw(p), smooth;
      }
    };
  }
  var meta26, CHARGE, FLY, init_magic_missile = __esm({
    "src/fx/projectiles/magic-missile.js"() {
      init_core();
      meta26 = {
        name: "Magic missile",
        desc: "Motes gather into an arcane orb at a hand `height` px above the floor (the origin); it weaves to its target trailing a twisting ribbon and bursts into a star of light.",
        tags: ["projectile", "magic", "arcane", "missile", "spell", "directional", "one-shot"],
        size: [208, 112],
        origin: [24, 104],
        duration: 1.9,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: ["#140a26", "#2b1252", "#481c88", "#6b2cc0", "#9a48ec", "#c684ff", "#ecc8ff", "#ffffff"], height: 26, reach: 112, seed: 6 }
      }, CHARGE = 0.2, FLY = 0.62;
    }
  });

  // src/fx/fire/meteor.js
  var meteor_exports = {};
  __export(meteor_exports, {
    create: () => create19,
    meta: () => meta27
  });
  function stone4(c) {
    return c = hex(c), { light: mix(scale(c, 1.35), WHITE, 0.08), body: c, shade: scale(c, 0.64), dust: mix(scale(c, 1.2), rgb(150, 140, 150), 0.3) };
  }
  function rock4(p, b, st) {
    let r = 0.6 + b.s * 0.75, fade = Math.min(1, b.life / 0.5), lx = Math.cos(b.a) * r * 0.4, ly = Math.sin(b.a) * r * 0.4;
    p.shade(b.x - r - 1, b.y - r - 1, b.x + r + 1, b.y + r + 1, (x, y, out) => {
      let dx = x - b.x, dy = y - b.y, d = Math.hypot(dx * 1.15, dy);
      if (d > r + 0.9) return;
      let lit = dx * lx + dy * ly;
      out.c = d > r ? OUTLINE5 : lit < -0.4 ? st.light : lit > 0.6 ? st.shade : st.body, out.a = fade;
    });
  }
  function create19(o) {
    let F = fit(o.palette, 9), H3 = hotFirst(F), RK = fit(o.rock, 4), st = stone4(o.stone), R6 = new Rng(o.seed), floor = () => 0, S = o.seed * 11, blazes, ps = new Particles({ rng: R6, ground: floor, sparks: [H3[1], H3[2], H3[4], H3[5]], onLand: (x, y) => blazes.add(x, y - 0.25, R6.range(0.9, 1.6), R6.range(0.5, 0.85)) });
    blazes = new Blazes(ps);
    let bits = new Bits({ ground: floor }), lights = new Lights(), GLOW = mix(mix(H3[3], H3[4], 0.5), WHITE, 0.25), len2 = Math.hypot(FROM[0], FROM[1]), ux = -FROM[0] / len2, uy = -FROM[1] / len2, pos = (tt) => {
      let k = ease.inQuad(clamp(tt / HIT5)) * 0.35 + clamp(tt / HIT5) * 0.65;
      return [FROM[0] * (1 - k), FROM[1] * (1 - k)];
    }, t = 0, hit = !1, last = pos(0), meteor = (p, x, y, R05, cool, alpha = 1) => {
      p.shade(x - R05 - 2, y - R05 - 2, x + R05 + 2, y + R05 + 2, (px, py, out) => {
        out.a = alpha;
        let dx = px - x, dy = py - y, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), rr = R05 * (1 + 0.18 * noise(a * 2.2 + 3, S) + 0.1 * noise(a * 5, S + 1));
        if (d > rr + 1) return;
        if (d > rr) return OUTLINE5;
        let face = (dx * ux + dy * uy) / Math.max(1, d), heat2 = (1 - cool) * (face * 0.6 + 0.5 - d / rr * 0.25);
        return heat2 > 0.62 ? heat2 > 0.85 ? H3[0] : heat2 > 0.74 ? H3[1] : H3[2] : heat2 > 0.42 ? H3[4] : rand(Math.floor(px - x), Math.floor(py - y), S + 3) < 0.22 * (1 - cool * 0.7) ? 1 - cool > 0.5 ? H3[4] : H3[6] : dx * -0.6 + dy * -0.8 > 0 ? RK[2] : d / rr > 0.6 ? RK[0] : RK[1];
      });
    }, crater2 = (p) => {
      if (t < HIT5) return;
      let a = t - HIT5, end = 1 - smooth(meta27.duration - 1, meta27.duration - 0.15, t), rx = 36 * Math.min(1, a / 0.08), ry = 6;
      for (let y = -1; y <= 3; y++)
        for (let x = Math.floor(-rx); x <= Math.ceil(rx); x++) {
          let dx = (x + 0.5) / rx, dy = (y + 0.5) / ry, d = Math.sqrt(dx * dx + dy * dy);
          if (d > 1) continue;
          let k = rand(x * 31 + y, S + 5), T2 = Math.pow(clamp(1 - a / 2.6), 1.3) * (1.25 - d) - k * 0.35;
          if (T2 > 0.06) {
            let ramp2 = [H3[0], H3[1], H3[2], H3[3], H3[4], H3[5], H3[6], H3[7], H3[8]], c = ramp2[Math.min(8, Math.floor((1 - Math.min(1, T2)) * 8))];
            p.dot(x, y, c, end), (x & 3) === 0 && p.glow(x + 0.5, y, 7, c, 0.2 * T2 * end);
          } else p.dot(x, y, d < 0.55 ? SOOT3 : SOOT23, (d < 0.95 - k * 0.3 ? 1 : 1 - d) * end);
        }
      for (let x = -40; x <= 40; x++) {
        let e = Math.abs(x) / 40, hh = e < 0.7 ? 0 : Math.round(2.4 * Math.sin((e - 0.7) / 0.3 * Math.PI) * (0.6 + 0.4 * rand(x, S + 7)));
        for (let j = 0; j < hh; j++) p.dot(x, -1 - j, j === hh - 1 ? mix(st.light, H3[4], 0.5 * clamp(1 - a / 2)) : st.shade, end);
        hh && p.dot(x, 0, OUTLINE5, end);
      }
    };
    return {
      update(dt) {
        if (t += dt, t < HIT5) {
          let [x, y] = pos(t), vx = (x - last[0]) / dt, vy = (y - last[1]) / dt;
          last = [x, y];
          for (let i = 0; i < 3; i++)
            R6.chance(0.8 * dt * 60) && ps.spawn(P.FIRE, x - ux * R6.range(2, 8) + R6.range(-3, 3), y - uy * R6.range(2, 8) + R6.range(-3, 3), vx * 0.15 + R6.range(-20, 20), vy * 0.15 + R6.range(-30, 10), R6.range(0.3, 0.6), 0, R6.range(3, 6), 0, R6.chance(0.65) ? PF.SMOKES | PF.BIG : 0);
          R6.chance(0.6 * dt * 60) && ps.spawn(P.SPARK, x, y, vx * 0.35 + R6.range(-80, 80), vy * 0.35 + R6.range(-80, 40), R6.range(0.2, 0.5)), R6.chance(0.3 * dt * 60) && ps.spawn(P.EMBER, x, y, vx * 0.1 + R6.range(-30, 30), vy * 0.1 + R6.range(-40, 0), R6.range(0.8, 1.6), H3[3], R6.chance(0.2) ? 2 : 1);
        } else if (!hit) {
          hit = !0, lights.add(0, -40, 100, WARM2, 0.95, 0.9), lights.add(0, -20, 46, WHITE, 0.9, 0.12);
          for (let i = 0; i < 34; i++) {
            let a = -Math.PI / 2 + R6.range(-1.3, 1.3) + 0.25, sp = R6.range(50, 210);
            ps.spawn(P.FIRE, R6.range(-6, 6), -R6.range(2, 10), Math.cos(a) * sp, Math.sin(a) * sp * 0.75 - 30, R6.range(0.5, 1.1), 0, R6.range(5, 9), 0, R6.chance(0.5) ? PF.SMOKES | PF.BIG : 0);
          }
          for (let i = 0; i < 9; i++) ps.spawn(P.FIRE, R6.range(-6, 6), -6, R6.range(-14, 14), -R6.range(130, 220), R6.range(0.8, 1.2), 0, R6.range(6, 8.5), R6.range(0, 0.12), PF.SMOKES | PF.BIG);
          for (let i = 0; i < 20; i++) {
            let a = R6.range(-Math.PI, 0), d = R6.range(4, 18);
            ps.spawn(P.SMOKE, Math.cos(a) * d, -R6.range(6, 24), Math.cos(a) * R6.range(10, 40), -R6.range(30, 110), R6.range(1.8, 2.8), 0, R6.range(8, 12), R6.range(0.15, 0.5), PF.BIG);
          }
          for (let i = 0; i < 16; i++) {
            let s = R6.sign();
            ps.spawn(P.SMOKE, s * R6.range(4, 18), -R6.range(1, 5), s * R6.range(60, 130) + 10, -R6.range(2, 12), R6.range(1.2, 2), st.dust, R6.range(5, 8), R6.range(0, 0.06), PF.BIG);
          }
          for (let i = 0; i < 90; i++) {
            let a = -Math.PI / 2 + R6.range(-1.3, 1.3) + 0.15, sp = R6.range(100, 300);
            ps.spawn(P.SPARK, 0, -4, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.2, 0.7));
          }
          for (let i = 0; i < 36; i++) {
            let a = R6.range(0, TAU), sp = R6.range(40, 150);
            ps.spawn(P.EMBER, Math.cos(a) * 8, -8 + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp - 70, R6.range(1.2, 2.6), H3[3]);
          }
          for (let i = 0; i < 10; i++) {
            let a = -Math.PI / 2 + R6.range(-1, 1.05), sp = R6.range(130, 240);
            ps.spawn(P.BRAND, 0, -6, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.7, 1.3));
          }
          for (let i = 0; i < 28; i++)
            bits.add({ kind: B.CHUNK, x: R6.range(-8, 8), y: -3, vx: R6.range(-80, 110), vy: -R6.range(140, 340), g: 1, drag: 0.4, bounce: 0.3, life: R6.range(1.8, 2.8), a: R6.range(0, TAU), va: R6.range(-16, 16), s: R6.int(1, 3), ramp: [OUTLINE5, st.shade, st.body, st.light, mix(st.light, WHITE, 0.3)] });
          for (let i = 0; i < 80; i++) {
            let u = R6.range(-1, 1), a = -Math.PI / 2 + u * 0.7 + 0.15, sp = R6.range(90, 270) * (1 - 0.4 * Math.abs(u));
            ps.spawn(P.GRIT, u * 6, -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(1.2, 2.2), R6.pick([st.light, st.body, st.body, st.shade]), R6.chance(0.45) ? 2 : 1);
          }
        }
        bits.update(dt);
        for (let b of bits.list)
          if (b.rest && !b.dusted) {
            b.dusted = !0;
            for (let i = 0; i < 3; i++) ps.spawn(P.DUST, b.x + R6.range(-1.5, 1.5), -0.5, R6.sign() * R6.range(8, 35), -R6.range(2, 18), R6.range(0.3, 0.6), st.dust, R6.range(1.3, 2.6));
          }
        blazes.update(dt), ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        crater2(p), simDraw(p, ps, H3, "back"), blazes.drawBack(p);
        let k = (t - HIT5) / 0.5;
        k > 0 && k < 1 && band(p, 0, 0.5, 110 * ease.outCubic(k), 0.16, Math.max(1, 5 * (1 - k)), 1.15 - k, [st.body, st.light, H3[4], H3[1]], (g) => Math.sin(g) < 0);
      },
      draw(p) {
        let k = (t - HIT5) / 0.5;
        k > 0 && k < 1 && band(p, 0, 0.5, 110 * ease.outCubic(k), 0.16, Math.max(1, 5 * (1 - k)), 1.15 - k, [st.body, st.light, H3[4], H3[1]], (g) => Math.sin(g) >= 0, k < 0.12);
        for (let b of bits.list) rock4(p, b, st);
        if (t < HIT5) {
          let [x, y] = pos(t), NZ2 = (rate, seed2 = 0, off2 = 0) => noise(t * rate + off2, seed2);
          floorLight(p, 0, 0.5, 30 + 40 * (t / HIT5), 7, GLOW, 0.5 * (t / HIT5) ** 2), [[36, 7, 0], [26, 7.5, -2.5], [26, 7.5, 2.5], [16, 8, 0]].forEach(([L, w, off2], i) => {
            let n = (S + i) * 13;
            flameBlade(p, x - uy * off2, y + ux * off2, -ux, -uy, L * (0.85 + 0.25 * NZ2(5, n)), w, NZ2(3, n + 3) * 3, NZ2, n, H3, LAYERS, 0.5, 1.6);
          }), meteor(p, x, y, 6.5, 0), p.glow(x, y, 46, GLOW, 0.55), p.glow(x, y, 12, H3[1], 0.4);
        } else {
          let a = t - HIT5, cool = clamp(a / 2.8), end = 1 - smooth(meta27.duration - 1.1, meta27.duration - 0.2, t);
          end > 0 && (meteor(p, 0, 0, 5.5, cool, end), p.glow(0, -2, 22, GLOW, 0.4 * (1 - cool) * end));
        }
        simDraw(p, ps, H3, "front");
        let f = (t - HIT5) / 0.08;
        f > 0 && f < 1 && (p.circle(0, -6, 11 * (1 - f * 0.3) + 1.5, H3[3]), p.circle(0, -6, 11 * (1 - f * 0.3), f < 0.5 ? H3[1] : H3[2]), p.circle(0, -6, 7 * (1 - f * 0.3), f < 0.5 ? WHITE : H3[1]));
        let fr = (t - HIT5) / 0.24;
        fr > 0 && fr < 1 && flare(p, 0, -6, 44 * Math.pow(1 - fr, 1.4), 1 - fr, [H3[6], H3[4], H3[2], H3[1]]), lights.draw(p);
      }
    };
  }
  var meta27, HIT5, FROM, SOOT3, SOOT23, OUTLINE5, WARM2, init_meteor = __esm({
    "src/fx/fire/meteor.js"() {
      init_core();
      init_lib4();
      meta27 = {
        name: "Meteor",
        desc: "A burning rock streaks in from the upper left in a comet of fire and smashes into the floor: a white flash, a fireball, rocks and brands thrown, a glowing crater that cools.",
        tags: ["fire", "meteor", "impact", "explosion", "spell", "debris", "one-shot"],
        size: [272, 232],
        origin: [150, 208],
        duration: 5,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: {
          palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
          stone: "#4a3f69",
          rock: ["#120e16", "#2a2230", "#463a4a", "#6a5a66"],
          seed: 9
        }
      }, HIT5 = 0.62, FROM = [-112, -142], SOOT3 = hex("#0d0a12"), SOOT23 = hex("#17121d"), OUTLINE5 = hex("#1a1422"), WARM2 = rgb(255, 176, 96);
    }
  });

  // src/fx/fire/flame-pillar.js
  var flame_pillar_exports = {};
  __export(flame_pillar_exports, {
    create: () => create20,
    meta: () => meta28
  });
  function stone5(c) {
    return c = hex(c), { light: mix(scale(c, 1.35), WHITE, 0.08), body: c, shade: scale(c, 0.64), dust: mix(scale(c, 1.2), rgb(150, 140, 150), 0.3) };
  }
  function rock5(p, b, st) {
    let r = 0.6 + b.s * 0.75, fade = Math.min(1, b.life / 0.5), lx = Math.cos(b.a) * r * 0.4, ly = Math.sin(b.a) * r * 0.4;
    p.shade(b.x - r - 1, b.y - r - 1, b.x + r + 1, b.y + r + 1, (x, y, out) => {
      let dx = x - b.x, dy = y - b.y, d = Math.hypot(dx * 1.15, dy);
      if (d > r + 0.9) return;
      let lit = dx * lx + dy * ly;
      out.c = d > r ? OUTLINE6 : lit < -0.4 ? st.light : lit > 0.6 ? st.shade : st.body, out.a = fade;
    });
  }
  function create20(o) {
    let F = fit(o.palette, 9), H3 = hotFirst(F), HMAX = o.height, st = stone5(o.stone), R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [H3[1], H3[2], H3[4], H3[5]] }), bits = new Bits({ ground: floor }), lights = new Lights(), GLOW = mix(mix(H3[3], H3[4], 0.5), WHITE, 0.25), S = o.seed * 13, cracks5 = [], crack = (x, y, a, len2, t0, w) => {
      let pts = [[x, y]];
      for (let d = 0; d < len2; d += 2) a += R6.range(-0.55, 0.55), x += Math.cos(a) * 2, y += Math.sin(a) * 0.76, pts.push([x, y]);
      return cracks5.push({ pts, t0, grow: R6.range(0.22, 0.36), w }), pts;
    };
    for (let i = 0; i < 9; i++) {
      let a = i / 9 * TAU + R6.range(-0.25, 0.25), pts = crack(R6.range(-1, 1), R6.range(-0.3, 0.3), a, R6.range(20, 40), R6.range(0, 0.16), 1), j = 3 + R6.int(0, pts.length - 6);
      pts.length > 8 && crack(pts[j][0], pts[j][1], a + R6.sign() * R6.range(0.5, 1), R6.range(6, 14), 0.18 + R6.range(0, 0.15), 0);
    }
    let strands = Array.from({ length: 7 }, (_, i) => ({ o: (rand(i, S, 1) - 0.5) * 1.4, w: 0.05 + rand(i, S, 2) * 0.06, f: 1 + rand(i, S, 3) * 2 })), t = 0, erupted = !1, fell = !1, height2 = (tt) => tt < ERUPT ? 0 : tt < ERUPT + RISE ? HMAX * ease.outCubic((tt - ERUPT) / RISE) : tt < FALL ? HMAX * (1 + 0.05 * noise(tt * 3, S)) : HMAX * (1 - ease.inQuad(clamp((tt - FALL) / (GONE3 - FALL)))), width = (tt) => tt < ERUPT ? 0 : tt < FALL ? 12 * (1 + 0.45 * Math.exp(-(tt - ERUPT) * 7)) * (0.94 + 0.06 * noise(tt * 9, S + 1)) : 12 * (1 - smooth(FALL, GONE3, tt)) + 1.5 * (1 - smooth(GONE3 - 0.1, GONE3, tt)), heat2 = (tt) => smooth(0, ERUPT, tt) * 0.75 + 0.25 * smooth(ERUPT - 0.05, ERUPT + 0.1, tt) - smooth(GONE3 - 0.3, meta28.duration - 0.6, tt) * 1.05;
    function column(p) {
      let h = height2(t), w0 = width(t);
      if (h < 1 || w0 < 0.3) return;
      if (t < FALL + 0.25) {
        let k = clamp(w0 / 12), NZ2 = (rate, seed2, off2) => noise(t * rate + off2, seed2);
        for (let i = 0; i < 5; i++) {
          let n = (S + i) * 17, dx = (i - 2) * w0 * 0.4, th = (12 + 12 * (0.5 + 0.5 * noise(t * 3.3 + i, n))) * k * (i === 2 ? 1.2 : i % 4 === 0 ? 0.6 : 0.9);
          flameTongue(p, dx + noise(t * 2, n + 2) * 1.5, -h + 12, th, 3.4 * k * (i % 4 === 0 ? 0.7 : 1), -dx * 0.3 + noise(t * 2.2, n + 1) * 3, NZ2, n, H3, LAYERS);
        }
      }
      let lvlC = [H3[0], H3[1], H3[2], H3[3], H3[4], H3[5], H3[6], H3[7]];
      for (let y = 0; y >= -h; y--) {
        let v = -y / h, cx = noise(-y * 0.04 + t * 1.6, S + 2) * 1.6 * v, foot2 = 1 + 0.7 * Math.max(0, 1 - -y / 12) ** 2, top = 1 - smooth(0.82, 1, v) * 0.7, wl = w0 * foot2 * top * (1 + 0.65 * Math.max(0, noise(y * 0.2 + t * 8, S + 3)) ** 1.5), wr = w0 * foot2 * top * (1 + 0.65 * Math.max(0, noise(y * 0.2 + t * 8, S + 4)) ** 1.5), pulse2 = (-y * 0.032 + t * 3.6) % 1 < 0.09 ? 1 : 0;
        for (let x = Math.floor(cx - wl * 1.15); x <= Math.ceil(cx + wr * 1.15); x++) {
          let dx = x + 0.5 - cx, q = Math.abs(dx) / (dx < 0 ? wl : wr);
          if (q > 1.15) continue;
          let lvl = q < 0.12 ? 0 : q < 0.26 ? 1 : q < 0.42 ? 2 : q < 0.56 ? 3 : q < 0.7 ? 4 : q < 0.84 ? 5 : q < 0.96 ? 6 : 7;
          for (let s of strands) Math.abs(dx / w0 - s.o - 0.06 * Math.sin(t * s.f * 3 + s.o * 9)) < s.w && (lvl = Math.max(0, lvl - 1));
          lvl = Math.max(0, lvl - pulse2), !(lvl === 7 && rand(x, y, Math.floor(t * 20)) < 0.5) && p.px(x, y, lvlC[lvl]);
        }
        y % 12 === 0 && p.glow(cx, y, w0 * 2.4 + 8, GLOW, 0.28 * clamp(w0 / 12));
      }
      p.glow(0, -h * 0.45, 92, GLOW, 0.3 * clamp(w0 / 12));
    }
    function cracksDraw(p) {
      let k = heat2(t);
      if (!(k <= -0.05)) {
        for (let c of cracks5) {
          let n = Math.floor(c.pts.length * clamp((t - c.t0) / c.grow));
          for (let i = 1; i < n; i++) {
            let u = i / c.pts.length, hot = k * (1 - 0.45 * u), [x0, y0] = c.pts[i - 1], [x1, y1] = c.pts[i];
            if (hot < 0) {
              let a = 1 + hot * 3;
              a > 0 && p.line(x0, y0, x1, y1, SOOT4, a);
              continue;
            }
            let col = hot > 0.85 ? H3[1] : hot > 0.65 ? H3[2] : hot > 0.45 ? H3[4] : hot > 0.25 ? H3[5] : hot > 0.1 ? H3[6] : H3[7];
            c.w && i < c.pts.length * 0.5 && hot > 0.2 && (p.line(x0, y0 + 1, x1, y1 + 1, hot > 0.6 ? H3[5] : H3[6]), p.line(x0, y0 - 1, x1, y1 - 1, H3[7])), p.line(x0, y0, x1, y1, col), i % 2 === 0 && p.glow(x1, y1, 5 + 7 * hot, GLOW, 0.3 * hot);
          }
        }
        k > 0 && floorLight(p, 0, 0.5, 44, 8, GLOW, 0.35 * k);
      }
    }
    return {
      update(dt) {
        if (t += dt, t < ERUPT && R6.chance(0.6 * dt * 60 * smooth(0.15, ERUPT, t)) && ps.spawn(P.FIRE, R6.range(-5, 5), -1, R6.range(-6, 6), -R6.range(20, 45), R6.range(0.15, 0.3), 0, R6.range(1, 2.2)), t < ERUPT && R6.chance(0.5 * dt * 60 * smooth(0, ERUPT, t))) {
          let c = R6.pick(cracks5), i = R6.int(0, Math.floor(c.pts.length * clamp((t - c.t0) / c.grow)) - 1);
          if (i >= 0) {
            let [x, y] = c.pts[i];
            R6.chance(0.5) ? ps.spawn(P.FIRE, x, y - 1, R6.range(-5, 5), -R6.range(15, 35), R6.range(0.15, 0.3), 0, R6.range(0.8, 1.6)) : ps.spawn(P.EMBER, x, y - 1, R6.range(-15, 15), -R6.range(30, 70), R6.range(0.5, 1), H3[3], 1);
          }
        }
        if (!erupted && t >= ERUPT) {
          erupted = !0, lights.add(0, -40, 90, WARM3, 0.7, 0.6), lights.add(0, -8, 44, WHITE, 0.7, 0.1);
          for (let i = 0; i < 70; i++) {
            let a = -Math.PI / 2 + R6.range(-1.1, 1.1), sp = R6.range(100, 260);
            ps.spawn(P.SPARK, R6.range(-4, 4), -2, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.25, 0.7));
          }
          for (let i = 0; i < 18; i++) bits.add({ kind: B.CHUNK, x: R6.range(-6, 6), y: -2, vx: R6.range(-110, 110), vy: -R6.range(150, 330), g: 1, drag: 0.4, bounce: 0.3, life: R6.range(1.6, 2.4), a: R6.range(0, TAU), va: R6.range(-16, 16), s: R6.int(1, 3) });
          for (let i = 0; i < 60; i++) {
            let a = -Math.PI / 2 + R6.range(-0.9, 0.9), sp = R6.range(80, 260);
            ps.spawn(P.GRIT, R6.range(-5, 5), -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(1, 1.8), R6.pick([st.light, st.body, st.body, st.shade]), R6.chance(0.4) ? 2 : 1);
          }
          for (let i = 0; i < 14; i++) {
            let s = R6.sign();
            ps.spawn(P.SMOKE, s * R6.range(2, 10), -R6.range(1, 4), s * R6.range(40, 110), -R6.range(2, 10), R6.range(1, 1.8), st.dust, R6.range(4, 7), R6.range(0, 0.06), PF.BIG);
          }
        }
        let h = height2(t), w = width(t);
        if (t > ERUPT && t < GONE3 && h > 4) {
          if (R6.chance(0.9 * dt * 60)) {
            let s = R6.sign(), y = -R6.range(4, h * 0.9);
            ps.spawn(P.FIRE, s * w * R6.range(0.7, 1.1), y, s * R6.range(15, 40), -R6.range(30, 70), R6.range(0.25, 0.5), 0, R6.range(1.6, 3.2), 0, R6.chance(0.35) ? PF.SMOKES : 0);
          }
          R6.chance(0.7 * dt * 60) && ps.spawn(P.FIRE, R6.range(-w, w), -h + R6.range(0, 6), R6.range(-20, 20), -R6.range(30, 80), R6.range(0.35, 0.7), 0, R6.range(3, 5.5), 0, R6.chance(0.6) ? PF.SMOKES | (t < FALL - 0.3 ? PF.BIG : 0) : 0), t < FALL && R6.chance(0.5 * dt * 60) && ps.spawn(P.EMBER, R6.range(-w, w) * 0.6, -h + 4, R6.range(-60, 60), -R6.range(50, 110), R6.range(0.7, 1.3), H3[3], R6.chance(0.2) ? 2 : 1);
        }
        t >= FALL && !fell && (fell = !0), fell && t < GONE3 - 0.1 && R6.chance(1.6 * dt * 60) && ps.spawn(P.FIRE, R6.range(-w - 2, w + 2), -h - R6.range(0, 8), R6.range(-30, 30), -R6.range(10, 50), R6.range(0.4, 0.75), 0, R6.range(3.5, 6.5), 0, PF.SMOKES), bits.update(dt);
        for (let b of bits.list)
          if (b.rest && !b.dusted) {
            b.dusted = !0;
            for (let i = 0; i < 3; i++) ps.spawn(P.DUST, b.x + R6.range(-1.5, 1.5), -0.5, R6.sign() * R6.range(8, 35), -R6.range(2, 18), R6.range(0.3, 0.6), st.dust, R6.range(1.3, 2.6));
          }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        cracksDraw(p), simDraw(p, ps, H3, "back");
        let k = (t - ERUPT) / 0.45;
        k > 0 && k < 1 && band(p, 0, 0.5, 84 * ease.outCubic(k), 0.18, Math.max(1, 4 * (1 - k)), 1.15 - k, [st.body, st.light, H3[4], H3[1]], (g) => Math.sin(g) < 0);
      },
      draw(p) {
        column(p);
        for (let b of bits.list) rock5(p, b, st);
        simDraw(p, ps, H3, "front");
        let k = (t - ERUPT) / 0.45;
        k > 0 && k < 1 && band(p, 0, 0.5, 84 * ease.outCubic(k), 0.18, Math.max(1, 4 * (1 - k)), 1.15 - k, [st.body, st.light, H3[4], H3[1]], (g) => Math.sin(g) >= 0, k < 0.15);
        let f = (t - ERUPT) / 0.08;
        f > 0 && f < 1 && (p.ellipse(0, -2, 16 * (1 - f * 0.3), 6, H3[2]), p.ellipse(0, -3, 11 * (1 - f * 0.3), 4, f < 0.5 ? WHITE : H3[1])), lights.draw(p);
      }
    };
  }
  var meta28, ERUPT, RISE, FALL, GONE3, SOOT4, OUTLINE6, WARM3, init_flame_pillar = __esm({
    "src/fx/fire/flame-pillar.js"() {
      init_core();
      init_lib4();
      meta28 = {
        name: "Flame pillar",
        desc: "The floor cracks and glows, a column of fire erupts white-hot and roars, spewing embers and shedding flame, then collapses into rolling smoke.",
        tags: ["fire", "pillar", "eruption", "spell", "ground", "one-shot"],
        size: [184, 256],
        origin: [92, 232],
        duration: 5,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: {
          palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
          stone: "#4a3f69",
          height: 140,
          seed: 5
        }
      }, ERUPT = 0.55, RISE = 0.12, FALL = 1.95, GONE3 = 2.45, SOOT4 = hex("#0d0a12"), OUTLINE6 = hex("#1a1422"), WARM3 = rgb(255, 176, 96);
    }
  });

  // src/fx/fire/fire-tornado.js
  var fire_tornado_exports = {};
  __export(fire_tornado_exports, {
    draw: () => draw9,
    meta: () => meta29
  });
  function draw9(p, t, o) {
    let F = fit(o.palette, 9), H3 = hotFirst(F), S = o.seed, HT = o.height, ph = t / D7, N9 = (rate, seed2 = 0, off2 = 0) => NL5(t, rate, seed2, off2), GLOW = mix(mix(H3[3], H3[4], 0.5), WHITE, 0.25), SMOKE2 = mix(SMOKE14, H3[6], 0.25), EMB = [H3[1], H3[2], H3[4], H3[6]], cx = (v, tt = t) => 3.2 * Math.sin(v * 4.2 - tt / D7 * TAU * 2) * v + 2 * Math.sin(tt / D7 * TAU) * v, rad = (v) => 3.5 + 15 * Math.pow(v, 1.35), spin = (v, tt = t) => tt / D7 * TAU * SPIN + v * 5.5, orbit = [];
    looped(t, D7, 30, S + 500, (r) => ({ v0: r.range(0.02, 0.7), rise: r.range(0.12, 0.3), a: r.range(0, TAU), w: r.range(4, 7), out: r.range(4, 12), life: r.range(1.2, 2.4), big: r.chance(0.2) }), (q, age) => {
      let v = q.v0 + q.rise * age, R6 = rad(Math.min(1, v)) + q.out + age * 4, a = q.a + q.w * age, k = 1 - age / q.life, x = cx(Math.min(1, v), t) + Math.cos(a) * R6, y = -v * HT + Math.sin(a) * R6 * 0.28, z = Math.sin(a);
      orbit.push({ x, y, z, k, vx: -Math.sin(a) * R6 * q.w, vy: Math.cos(a) * R6 * q.w * 0.28, big: q.big });
    });
    let embers = (front) => {
      for (let e of orbit) {
        if (e.z >= 0 !== front || e.k <= 0) continue;
        let sp = Math.hypot(e.vx, e.vy) || 1, L = Math.min(5, 1 + sp * 0.025), c = e.k > 0.6 ? EMB[0] : e.k > 0.3 ? EMB[1] : EMB[2];
        p.line(e.x - e.vx / sp * L, e.y - e.vy / sp * L, e.x, e.y, (u) => u > 0.6 ? c : front ? EMB[3] : H3[7]), front ? p.glow(e.x, e.y, 4, c, 0.4 * e.k) : p.glow(e.x, e.y, 3, c, 0.15 * e.k);
      }
    }, ring4 = (front) => {
      for (let i = 0; i < 12; i++) {
        let a = i / 12 * TAU + t / D7 * TAU * 2, z = Math.sin(a);
        if (z >= 0 !== front) continue;
        let n = (S * 3 + i) * 19, R6 = 12 + 2 * N9(2, n), x = Math.cos(a) * R6, y = z * R6 * 0.25, h = (5 + 5 * (0.5 + 0.5 * N9(5, n + 1))) * (front ? 1 : 0.8);
        flameTongue(p, x, y, h, 1.6, -Math.cos(a + Math.PI / 2) * 3, N9, n, H3, front ? LAYERS : BACK_LAYERS);
      }
    };
    looped(t, D7, 20, S + 300, (r) => ({ a: r.range(0, TAU), life: r.range(1.2, 2), s: r.range(2.5, 4), vy: -r.range(12, 22) }), (q, age) => {
      let R6 = rad(1) * (0.8 + age * 0.5), a = q.a + age * 3, x = cx(1, t - age) + Math.cos(a) * R6, y = -HT - 2 + q.vy * age + Math.sin(a) * R6 * 0.25;
      smokePuff(p, x, y, 1 - age / q.life, q.s, SMOKE2);
    }), floorLight(p, 0, 0.5, 40, 8, GLOW, 0.4), embers(!1), ring4(!1);
    let fl = 0.85 + 0.15 * N9(7, S + 1);
    for (let y = 0; y >= -HT * 1.2; y--) {
      let v = -y / HT, vv = Math.min(1, v), c = cx(vv), r = rad(vv) * (1 + 0.08 * N9(3, S + 2, y * 0.1)), sp = spin(v), cut2 = clamp((v - 0.72) / 0.42), lickL = 0.3 * Math.max(0, pnoise(-y * 0.22 + ph * 18, 18, S + 3)), lickR = 0.3 * Math.max(0, pnoise(-y * 0.22 + ph * 18 + 9, 18, S + 4));
      for (let x = Math.floor(c - r * 1.35); x <= Math.ceil(c + r * 1.35); x++) {
        let dx = (x + 0.5 - c) / r, edge = 1 + (dx < 0 ? lickL : lickR);
        if (Math.abs(dx) > edge) continue;
        let th = Math.asin(clamp(dx, -1, 1)), depth = Math.cos(th), tear = 0.18 * pnoise(y * 0.45 + dx * 2 - ph * 30, 30, S + 6), band2 = 0.5 + 0.5 * Math.sin((th + sp + tear) * 3), streak = band2 * band2 * band2;
        if (cut2 > 0 && band2 < 0.35 + cut2 * 0.6 + 0.1 * pnoise(x * 0.7 + ph * 20, 20, S + 5)) continue;
        let heat2 = 0.22 + 0.36 * depth + 0.5 * streak - 0.22 * vv + 0.1 * (1 - vv) - 0.25 * cut2;
        Math.abs(dx) > 1 && (heat2 = 0.3 - (Math.abs(dx) - 1) * 1.5), heat2 *= fl;
        let col = heat2 > 0.95 ? H3[0] : heat2 > 0.82 ? H3[1] : heat2 > 0.7 ? H3[2] : heat2 > 0.58 ? H3[3] : heat2 > 0.46 ? H3[4] : heat2 > 0.34 ? H3[5] : heat2 > 0.2 ? H3[6] : H3[7];
        p.px(x, y, col);
      }
      y % 10 === 0 && v <= 1 && p.glow(c, y, r * 2 + 8, GLOW, 0.22 * fl);
    }
    looped(t, D7, 70, S + 200, (r) => ({ v: r.range(0.05, 0.95), side: r.sign(), sp: r.range(20, 50), life: r.range(0.25, 0.5), s: r.range(1.4, 2.8), f: r.next() }), (q, age) => {
      let tb = t - age, x0 = cx(q.v, tb) + q.side * rad(q.v), y0 = -q.v * HT, [x, y] = drift(x0, y0, q.side * q.sp, -q.sp * 0.6, age, 0, -60, 3, 3);
      firePuff(p, x, y, 1 - age / q.life, q.s, q.f, H3, 0.1, -q.side * 0.6, -0.8);
    }), ring4(!0), embers(!0), p.glow(0, -HT * 0.5, 80, GLOW, 0.28 * fl), p.glow(0, -6, 18, H3[2], 0.3 * fl);
  }
  var meta29, D7, NL5, SMOKE14, SPIN, init_fire_tornado = __esm({
    "src/fx/fire/fire-tornado.js"() {
      init_core();
      init_lib4();
      meta29 = {
        name: "Fire tornado",
        desc: "A spinning funnel of fire: spiral bands turning round it, licks flung off its sides, a ring of flame whirling at its foot, embers orbiting it in and out of view.",
        tags: ["fire", "tornado", "vortex", "spell", "aoe", "loop"],
        size: [120, 152],
        origin: [60, 136],
        duration: 2,
        loop: !0,
        fps: 30,
        bg: "ground",
        options: {
          palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
          height: 80,
          seed: 4
        }
      }, D7 = meta29.duration, NL5 = noiseFor(D7), SMOKE14 = hex("#5b5566"), SPIN = 3;
    }
  });

  // src/fx/fire/fire-ring.js
  var fire_ring_exports = {};
  __export(fire_ring_exports, {
    act: () => act11,
    create: () => create21,
    meta: () => meta30
  });
  function create21(o) {
    let F = fit(o.palette, 9), H3 = hotFirst(F), REACH2 = o.reach, R6 = new Rng(o.seed), floor = () => 0, S = o.seed * 7, ps = new Particles({ rng: R6, ground: floor, sparks: [H3[1], H3[2], H3[4], H3[5]] }), lights = new Lights(), GLOW = mix(mix(H3[3], H3[4], 0.5), WHITE, 0.25), front = (t2) => REACH2 * ease.outCubic(clamp((t2 - CHARGE2) / SPREAD2)), reachedAt = (d) => CHARGE2 + SPREAD2 * (1 - Math.cbrt(1 - Math.min(1, d / REACH2))), sites = [];
    for (let r = 10; r <= REACH2; r += 9) {
      let per = TAU * Math.sqrt((r * r + (r * SY4) ** 2) / 2), n = Math.max(5, Math.round(per / 8.5));
      for (let k = 0; k < n; k++) {
        let a = (k + R6.range(0.15, 0.85)) / n * TAU, rr = r + R6.range(-3, 3), q = Math.min(1, rr / REACH2);
        sites.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr * SY4, back: Math.sin(a) < 0, t0: reachedAt(rr) + R6.range(0, 0.04), life: (0.3 + 1 * q * q) * R6.range(0.85, 1.2), h: R6.range(9, 15) * (0.6 + 0.55 * q), w: R6.range(1.8, 2.7) * (0.75 + 0.3 * q), n: R6.int(0, 1e5) });
      }
    }
    sites.sort((a, b) => a.y - b.y);
    let t = 0, burst = !1, flames = (p, back) => {
      let NZ2 = (rate, seed2 = 0, off2 = 0) => noise(t * rate + off2, seed2);
      for (let s of sites) {
        if (s.back !== back) continue;
        let age = t - s.t0;
        if (age < 0 || age > s.life) continue;
        let u = age / s.life, rise = ease.outBack(clamp(age / 0.08), 2), fade = 1 - Math.pow(Math.max(0, (u - 0.1) / 0.9), 1.3), h = s.h * rise * fade * (0.85 + 0.15 * noise(t * 3.3, s.n)) * (1 + 0.5 * Math.max(0, noise(t * 2.6, s.n + 70) - 0.55));
        if (h < 1) continue;
        let L = u < 0.3 ? back ? BACK_LAYERS : LAYERS : u < 0.65 ? BACK_LAYERS : EMBER_LAYERS;
        flameTongue(p, s.x, s.y, h, s.w * (0.6 + 0.4 * fade), NZ2(2.2, s.n + 40) * 1.5 - s.x * 0.02, NZ2, s.n, H3, L);
      }
    }, scorch3 = (p) => {
      let fr = front(t), end = 1 - smooth(meta30.duration - 1.2, meta30.duration - 0.15, t);
      if (!(fr < 1 || end <= 0))
        for (let y = Math.floor(-fr * SY4); y <= Math.ceil(fr * SY4); y++)
          for (let x = Math.floor(-fr); x <= Math.ceil(fr); x++) {
            let d = Math.hypot(x + 0.5, (y + 0.5) / SY4);
            if (d > fr) continue;
            let since5 = t - reachedAt(d), h = rand(x, y, S), hot = 1 - since5 / (1.2 + h * 0.9);
            if (hot > 0 && h < 0.03 + 0.06 * hot) {
              p.px(x, y, hot > 0.7 ? H3[3] : hot > 0.45 ? H3[4] : hot > 0.2 ? H3[5] : H3[6]), p.light(x, y, H3[4], 0.3 * hot);
              continue;
            }
            p.blend(x, y, h < 0.5 ? SOOT5 : SOOT24, Math.min(1, since5 * 3) * (0.55 - d / REACH2 * 0.25) * end);
          }
    }, ring4 = (p, back) => {
      let k = (t - CHARGE2) / (SPREAD2 + 0.1);
      k < 0 || k >= 1 || band(p, 0, 0, front(t) + 1.5, SY4, Math.max(1.5, 6 * (1 - k)), k < 0.75 ? 1 : (1 - k) / 0.25, [H3[6], H3[4], H3[2], H3[1]], (g) => Math.sin(g) < 0 === back, k < 0.12);
    };
    return {
      update(dt) {
        if (t += dt, t < CHARGE2 - 0.05 && R6.chance(0.9 * dt * 60)) {
          let a = R6.range(0, TAU), d = R6.range(26, 54), T2 = R6.range(0.18, 0.26), v = d * 3 / (Math.exp(3 * T2) - 1), x = Math.cos(a) * d, y = Math.min(-2, -6 + Math.sin(a) * d * 0.45), l = Math.hypot(x, y + 4) || 1;
          ps.spawn(P.STREAK, x, y, -x / l * v, (-4 - y) / l * v, T2, R6.chance(0.5) ? H3[2] : H3[3]);
        }
        if (t < CHARGE2 && R6.chance(0.5 * dt * 60 * (t / CHARGE2)) && ps.spawn(P.FIRE, R6.range(-4, 4), -1, R6.range(-8, 8), -R6.range(20, 40), R6.range(0.12, 0.24), 0, R6.range(1, 2.2)), !burst && t >= CHARGE2) {
          burst = !0, lights.add(0, -18, 64, WARM4, 0.85, 0.5), lights.add(0, -6, 30, WHITE, 0.8, 0.08);
          for (let i = 0; i < 40; i++) {
            let a = R6.range(0, TAU), sp = R6.range(80, 220);
            ps.spawn(P.SPARK, Math.cos(a) * 3, -2, Math.cos(a) * sp, Math.sin(a) * sp * 0.4 - R6.range(40, 120), R6.range(0.2, 0.5));
          }
        }
        if (t > CHARGE2 && t < CHARGE2 + SPREAD2 + 1.2)
          for (let i = 0; i < 3; i++) {
            if (!R6.chance(0.75 * dt * 60)) continue;
            let s = R6.pick(sites), age = t - s.t0;
            age < 0 || age > s.life * 0.7 || (ps.spawn(P.FIRE, s.x + R6.range(-1, 1), s.y - s.h * 0.6, R6.range(-5, 5), -R6.range(20, 40), R6.range(0.2, 0.4), 0, R6.range(1.2, 2.4), 0, R6.chance(0.5) ? PF.SMOKES | (s.back ? PF.BACK : 0) : s.back ? PF.BACK : 0), R6.chance(0.12) && ps.spawn(P.EMBER, s.x, s.y - s.h * 0.5, R6.range(-15, 15), -R6.range(30, 70), R6.range(0.6, 1.3), H3[3], 1, 0, s.back ? PF.BACK : 0));
          }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        scorch3(p), ring4(p, !0), flames(p, !0), simDraw(p, ps, H3, "back");
        let fr = front(t), k = t < CHARGE2 ? 0 : 1 - smooth(CHARGE2 + SPREAD2, CHARGE2 + SPREAD2 + 1.4, t);
        if (k > 0) for (let i = 0; i < 16; i++) p.glow(Math.cos(i / 16 * TAU) * fr, Math.sin(i / 16 * TAU) * fr * SY4 - 3, 16, GLOW, 0.2 * k);
      },
      draw(p) {
        if (ring4(p, !1), flames(p, !1), simDraw(p, ps, H3, "front"), t < CHARGE2 && p.glow(0, -3, 8 + 22 * (t / CHARGE2), GLOW, 0.6 * (t / CHARGE2)), t >= CHARGE2 && t < CHARGE2 + 0.1) {
          let k2 = 1 - (t - CHARGE2) / 0.1;
          p.ellipse(0, -1, 14 * (0.6 + 0.4 * k2), 4, H3[2]), p.ellipse(0, -1, 9 * (0.6 + 0.4 * k2), 2.6, k2 > 0.5 ? WHITE : H3[1]);
        }
        let k = smooth(CHARGE2 - 0.05, CHARGE2, t) * (1 - smooth(CHARGE2 + SPREAD2 * 0.5, CHARGE2 + SPREAD2 + 1.2, t));
        k > 0 && p.glow(0, -6, 92, GLOW, 0.3 * k), lights.draw(p);
      }
    };
  }
  var meta30, HIGH2, SLAM, EASE, act11, SY4, CHARGE2, SPREAD2, SOOT5, SOOT24, WARM4, EMBER_LAYERS, init_fire_ring = __esm({
    "src/fx/fire/fire-ring.js"() {
      init_core();
      init_lib4();
      meta30 = {
        name: "Fire ring",
        desc: "A white flash at the feet, then flames race outward along the floor in a ring, flaring as the front passes and burning down behind it over a smouldering scorch.",
        tags: ["fire", "ring", "nova", "aoe", "spell", "ground", "one-shot"],
        size: [224, 128],
        origin: [112, 92],
        duration: 3.9,
        loop: !1,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: {
          palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
          reach: 92,
          seed: 6
        }
      }, HIGH2 = { turn: 1.15, crouch: 0, fx: -7, fy: -44, bx: 8, by: -44, ffx: -5, fbx: 6 }, SLAM = { turn: 1.15, crouch: 8, lean: 3, fx: -9, fy: -8, bx: 11, by: -8, ffx: -8, fbx: 9 }, EASE = { turn: 1, crouch: 2, fx: -8, fy: -17, bx: 9, by: -17, ffx: -4, fbx: 5 }, act11 = {
        target: { x: 70 },
        poses: [
          [-0.32, READY],
          [0.02, HIGH2],
          [0.27, { ...HIGH2, y: -1 }],
          [0.32, SLAM, "snap"],
          [0.85, { ...SLAM, crouch: 7 }],
          [1.5, EASE],
          [2.4, READY],
          [3.9, READY]
        ],
        hits: [
          { t: 0.32, stop: 0.1, shake: 0.28, amp: 3, target: !1 },
          { t: 0.6, push: 1.2, straw: 10, y: -8, skin: "char" },
          { t: 3.5, push: 0, straw: 0, flash: 0, skin: null }
        ],
        dust: [{ t: 0.32, x: 10, n: 6, dir: 1 }, { t: 0.32, x: -10, n: 6, dir: -1 }]
      }, SY4 = 0.2, CHARGE2 = 0.32, SPREAD2 = 0.75, SOOT5 = hex("#0d0a12"), SOOT24 = hex("#17121d"), WARM4 = rgb(255, 176, 96), EMBER_LAYERS = [[1, 1, 7], [0.7, 0.8, 6], [0.4, 0.55, 5]];
    }
  });

  // src/fx/fire/fire-breath.js
  var fire_breath_exports = {};
  __export(fire_breath_exports, {
    draw: () => draw10,
    meta: () => meta31
  });
  function draw10(p, t, o) {
    let F = fit(o.palette, 9), H3 = hotFirst(F), S = o.seed, A = o.spread, V = o.speed, N9 = (rate, seed2 = 0, off2 = 0) => NL6(t, rate, seed2, off2), GLOW = mix(mix(H3[3], H3[4], 0.5), WHITE, 0.25), SMOKE2 = mix(SMOKE15, H3[6], 0.3), SPARKS = [H3[1], H3[2], H3[4], H3[5]], EMB = [H3[1], H3[2], H3[4], H3[6]], roar = (tt) => 0.85 + 0.15 * NL6(tt, 3, S + 1), sway = (tt) => NL6(tt, 1.3, S + 2) * 0.05, fire = [], smoke2 = [];
    looped(t, D8, 260, S + 100, (r) => {
      let e = r.range(-1, 1), fl = r.range(0.42, 0.8) * (1 - 0.3 * Math.abs(e)), sm = r.chance(0.2 + 0.4 * Math.abs(e));
      return { e, sp: r.range(0.75, 1.1), fl, sm, sl: r.range(0.5, 0.85), s: r.range(3, 5.2), f: r.next(), ox: r.range(4, 10), life: fl + (sm ? 0.85 : 0) };
    }, (q, age) => {
      let tb = t - age, a = q.e * A + sway(tb) - 0.04, v = V * q.sp * roar(tb), ta = Math.min(age, q.fl), [x, y, vx, vy] = drift(q.ox, q.e * 1.5, Math.cos(a) * v, Math.sin(a) * v, ta, 0, -100, 2, 2.4);
      if (age < q.fl) return fire.push([age, x, y, q]);
      if (!q.sm || age - q.fl > q.sl) return;
      let sa = age - q.fl, [sx, sy] = drift(x, y, vx * 0.5, vy * 0.6 - 8, sa, 0, -26, 1.8, 1.2);
      smoke2.push([sa, sx, sy, q]);
    });
    for (let [sa, x, y, q] of smoke2) smokePuff(p, x, y, 1 - sa / q.sl, q.s * 1.1, SMOKE2, !0, 0.7);
    fire.sort((a, b) => b[0] - a[0]);
    for (let [age, x, y, q] of fire) {
      let u = age / q.fl, edge = Math.abs(q.e), size = q.s * (0.75 + 1.6 * u), heat2 = Math.min(0.999, Math.pow(u, 1.5) * (0.85 + 0.2 * edge) + 0.3 * edge * edge), tear = clamp((u - 0.32) / 0.2);
      if (firePuff(p, x, y, 1 - heat2, size * (1 - 0.55 * tear), q.f, H3, 0.1, -0.5, -0.86), tear > 0) {
        let n = Math.floor(q.f * 1e5), h = size * (1.5 + 0.5 * N9(4, n)) * (1.2 - heat2 * 0.6) * tear;
        flameTongue(p, x, y + size * 0.3, h, size * 0.5 * (1.1 - heat2 * 0.5), -h * 0.4 + N9(2.5, n + 1) * 2, N9, n, H3, heat2 < 0.45 ? LAYERS : heat2 < 0.72 ? BACK_LAYERS : COOL_LAYERS);
      }
    }
    for (let i = 0; i < 6; i++) {
      let n = (S * 3 + i) * 19, side = i % 2 ? 1 : -1, d = 18 + (i >> 1) * 16 + N9(2, n) * 4, L = (9 + 5 * (0.5 + 0.5 * N9(5, n + 1))) * (1 - d / 120), ex = d, ey = side * d * A * 0.85 - d * 0.06;
      flameBlade(p, ex, ey, 0.75, side * 0.45 - 0.48, L, 1.6 + L * 0.08, -side * 3, N9, n, H3, LAYERS);
    }
    looped(t, D8, 70, S + 250, (r) => ({ e: r.range(-0.6, 0.6), v: r.range(330, 470), life: r.range(0.12, 0.26), l: r.range(4, 9) }), (q, age) => {
      let a = q.e * A - 0.03, [x, y, vx, vy] = drift(6, q.e * 2, Math.cos(a) * q.v, Math.sin(a) * q.v, age, 0, -60, 2, 2), sp = Math.hypot(vx, vy), k2 = 1 - age / q.life, L = q.l * (sp / 400);
      p.line(x - vx / sp * L, y - vy / sp * L, x, y, (u) => u > 0.6 ? k2 > 0.5 ? H3[0] : H3[1] : k2 > 0.5 ? H3[2] : H3[3]);
    }), JET.forEach(([len2, w, a], i) => {
      let n = (S * 5 + i) * 17, L = len2 * roar(t) * (0.85 + 0.2 * N9(5, n)), aa = a + sway(t);
      flameBlade(p, 0, 0, Math.cos(aa), Math.sin(aa), L, w, N9(3, n + 3) * 3, N9, n, H3, LAYERS, 0.5, 1.5);
    }), looped(t, D8, 40, S + 300, (r) => ({ d: r.range(4, 60), e: r.range(-1, 1), v: r.range(140, 280), life: r.range(0.25, 0.55) }), (q, age) => {
      let a = q.e * A * 1.8 - 0.12, [x, y, vx, vy] = drift(q.d, q.e * q.d * A, Math.cos(a) * q.v, Math.sin(a) * q.v - 30, age, 0, 190, 2, 2);
      spark(p, x, y, vx, vy, 1 - age / q.life, SPARKS);
    }), looped(t, D8, 18, S + 400, (r) => ({ x: r.range(50, 100), y: r.range(-14, 6), vx: r.range(10, 40), vy: -r.range(20, 50), life: r.range(0.8, 1.4), s: r.chance(0.2) ? 2 : 1, ph: r.range(0, 6.3) }), (q, age) => {
      let [x, y] = drift(q.x, q.y, q.vx, q.vy, age, 0, -30, 1.6, 1.6);
      ember(p, x + 5 * (Math.sin(age * 2.3 + q.ph) - Math.sin(q.ph)), y, 1 - age / q.life, q.s, EMB, age * 40 + q.ph);
    });
    let k = roar(t);
    p.glow(3, 0, 34 * k, GLOW, 0.75 * k), p.glow(3, 0, 10, H3[0], 0.55);
    for (let d = 10; d < 126; d += 8) p.glow(d, -d * 0.1, 10 + d * 0.2, GLOW, 0.32 * k * (1 - d / 150));
    p.glow(64, -12, 96, GLOW, 0.16 * k);
  }
  var meta31, D8, NL6, SMOKE15, COOL_LAYERS, JET, init_fire_breath = __esm({
    "src/fx/fire/fire-breath.js"() {
      init_core();
      init_lib4();
      meta31 = {
        name: "Fire breath",
        desc: "A roaring cone of fire streaming right from the mouth: white-hot at the lips, billowing out and cooling to red and smoke at its edges, sparks thrown out ahead.",
        tags: ["fire", "breath", "dragon", "stream", "cone", "directional", "loop"],
        size: [160, 116],
        origin: [12, 72],
        duration: 1.5,
        loop: !0,
        fps: 30,
        bg: "dark",
        options: {
          palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
          spread: 0.24,
          speed: 320,
          seed: 6
        }
      }, D8 = meta31.duration, NL6 = noiseFor(D8), SMOKE15 = hex("#5b5566"), COOL_LAYERS = [[1, 1, 7], [0.72, 0.82, 6], [0.44, 0.58, 5]], JET = [[42, 4.2, 0], [32, 3.8, -0.08], [30, 3.8, 0.08], [20, 4.6, 0]];
    }
  });

  // src/fx/status/burning.js
  var burning_exports = {};
  __export(burning_exports, {
    act: () => act12,
    actorAlpha: () => actorAlpha2,
    draw: () => draw11,
    drawBack: () => drawBack2,
    meta: () => meta32
  });
  function spots(a, seed2) {
    let s = SPOTS.get(a.mask);
    if (s || SPOTS.set(a.mask, s = /* @__PURE__ */ new Map()), s.has(seed2)) return s.get(seed2);
    let S = shape(a), H3 = S.h, W4 = S.w, R6 = new Rng(seed2 * 13 + 5), at2 = (q, side) => {
      let my = Math.round(H3 * q), [l, r] = S.rows[my];
      return [side < 0 ? l : r, my];
    }, hair = S.up.filter(([x]) => x < W4 * 0.42).sort((p, q) => p[1] - q[1] || p[0] - q[0])[0], shoulder = S.up.filter(([x, y]) => x > W4 / 2 && y > H3 * 0.4 && y < H3 * 0.62).sort((p, q) => p[1] - q[1])[0] ?? at2(0.5, 1), list = [
      { at: hair, side: -1, n: 3, h: 4.5 },
      { at: shoulder, side: 1, n: 2, h: 4 },
      { at: at2(0.62, -1), side: -1, n: 2, h: 3.5 },
      { at: at2(0.6, 1), side: 1, n: 2, h: 3.5 }
    ].map((sp, i) => ({ ...sp, x: a.x + sp.at[0] + 0.5, y: a.y + sp.at[1] + 1.5, tongues: Array.from({ length: sp.n }, (_, j) => ({ dx: (j - (sp.n - 1) / 2) * 1.6 + R6.range(-0.4, 0.4), h: sp.h * R6.range(0.8, 1.2), n: i * 17 + j * 5 + seed2 })) })), scorch3 = [0, 1].map((tick) => [0, 1].map((k) => {
      let sp = list[(tick * 2 + k + 1) % list.length], lum = (x2, y2) => luma(colorAt(a, x2, y2)), cand = S.body.filter(([x2, y2]) => Math.hypot(a.x + x2 + 0.5 - sp.x, a.y + y2 + 0.5 - sp.y) < 9 && y2 > H3 * 0.42 && lum(x2, y2) > 0.3 && lum(x2, y2) < 0.6);
      cand.length || (cand = S.body.filter(([, y2]) => y2 > H3 * 0.45));
      let [x, y] = cand[Math.floor(R6.next() * cand.length)];
      return { x: a.x + x + 0.5, y: a.y + y + 0.5, r: R6.range(3.2, 4.4) };
    })), out = { list, scorch: scorch3 };
    return s.set(seed2, out), out;
  }
  function drawBack2(p, t, o) {
    let F = fit(o.palette, 9).reverse(), a = o.actor, fl = flare3(t), flick = 0.8 + 0.2 * tnoise(t, D9, 7.5, 3);
    p.shade(-30, -3, 30, 7, (x, y, out) => {
      let d = Math.hypot(x / 26, (y - 0.5) / 4.5);
      d < 1 && (out.l = mix(F[3], F[4], 0.5), out.k = (0.16 + 0.22 * fl) * flick * (1 - d) * (1 - d));
    });
    let smokeC = mix(hex(o.smoke), F[6], 0.2), { list } = spots(a, o.seed);
    cycle(t, D9, 16, o.seed + 4, (r) => r.range(0.8, 1.2), (age, life, r, i) => {
      let sp = list[i % list.length], x = sp.x + travel2(WIND2 * 0.6, WIND2 * 0.5, 0.8, age) + Math.sin(age * 4 + i) * 1.2, y = sp.y - 3 - travel2(18, 6, 1, age);
      smoke(p, x, y, r.range(1.1, 1.9), age / life, smokeC, 0.9);
    });
  }
  function draw11(p, t, o) {
    let F = fit(o.palette, 9).reverse(), CH = fit(o.char, 3), a = o.actor, S = shape(a), { list, scorch: scorch3 } = spots(a, o.seed), ph = since(t), tick = Math.floor(t / TICK) % 2, fl = flare3(t);
    if (ph < 0.034) for (let [mx, my] of S.body) p.px(a.x + mx, a.y + my, WHITE);
    else if (ph < 0.22) {
      let k = 1 - (ph - 0.034) / 0.186;
      for (let [mx, my] of S.body) p.blend(a.x + mx, a.y + my, F[4], 0.55 * k);
    }
    for (let sc of scorch3[tick]) {
      let grow = clamp(ph / 0.14), fade = 1 - clamp((ph - 0.25) / 0.33), r = sc.r * (0.4 + 0.6 * grow);
      if (!(fade <= 0)) {
        for (let [mx, my] of S.body) {
          let x = a.x + mx + 0.5, y = a.y + my + 0.5, d = Math.hypot(x - sc.x, (y - sc.y) * 1.2) + rand(mx, my, 7) * 0.9;
          if (d > r) continue;
          d > r - 1 ? p.dot(x - 0.5, y - 0.5, rand(mx, my, Math.floor(t * 20)) < 0.5 ? F[3] : F[4], fade * 1.2) : p.dot(x - 0.5, y - 0.5, d < r * 0.5 ? CH[0] : CH[1], fade * 1.1);
        }
        p.glow(sc.x, sc.y, 6, F[4], 0.3 * fade);
      }
    }
    for (let sp of list) {
      for (let tg of sp.tongues) {
        let h = tg.h * (0.85 + 0.25 * tnoise(t, D9, 5, tg.n)) * (1 + 1.6 * fl);
        tongue(p, sp.x + tg.dx, sp.y, h, 1.1 + 0.3 * fl, WIND2 * 0.08 * h / 4 + tnoise(t, D9, 3, tg.n + 9) * 0.8, F, t, D9, tg.n);
      }
      p.glow(sp.x, sp.y - 2, 9 + 6 * fl, F[4], 0.22 + 0.35 * fl);
    }
    if (cycle(t, D9, 20, o.seed + 6, (r) => r.range(0.5, 0.9), (age, life, r, i) => {
      let sp = list[i % list.length], x = sp.x + r.range(-1.5, 1.5) + travel2(WIND2 + r.range(-10, 6), WIND2 * 0.6, 1.2, age) + Math.sin(age * 9 + i) * 1.2 * age, y = sp.y - 2 + travel2(-r.range(25, 55), -18, 1.4, age);
      ember2(p, x, y, age / life, [F[1], F[3], F[5]], age + i);
    }), ph < 0.3)
      for (let [k, sp] of list.entries())
        for (let j = 0; j < 4; j++) {
          let an = -Math.PI / 2 + (rand(k, j, tick) - 0.5) * 2.2, v = 50 + 50 * rand(k, j, 2), x = sp.x + Math.cos(an) * travel2(v, 0, 3, ph), y = sp.y - 2 + Math.sin(an) * travel2(v, 0, 3, ph) + 60 * ph * ph;
          p.px(x, y, ph < 0.12 ? F[1] : F[3]), p.light(x, y, F[3], 0.4 * (1 - ph / 0.3));
        }
  }
  var meta32, A_, B_, act12, D9, TICK, WIND2, since, flare3, actorAlpha2, SPOTS, init_burning = __esm({
    "src/fx/status/burning.js"() {
      init_core();
      init_lib8();
      init_core();
      meta32 = {
        name: "Burning",
        desc: "Burning over time: small flames lick from four hot spots, trailing sparks and thin smoke; every 0.6 s they flare, the body flashes white then orange, scorch marks spread.",
        tags: ["status", "fire", "burn", "dot", "debuff", "loop"],
        size: [72, 80],
        origin: [36, 70],
        duration: 1.2,
        loop: !0,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: {
          palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
          char: ["#120c0a", "#2a1a14", "#4a2c1c"],
          smoke: "#5b5566",
          seed: 3
        }
      }, A_ = { turn: 1, crouch: 2, lean: 2, fx: -13, fy: -38, bx: 12, by: -17, ffx: -3, ffy: -7, fbx: 5 }, B_ = { turn: 0.9, crouch: 3, lean: -2, fx: -12, fy: -17, bx: 13, by: -38, ffx: -4, fbx: 4, fby: -7 }, act12 = {
        onBody: !0,
        poses: [[0, A_], [0.15, B_, "snap"], [0.3, A_, "snap"], [0.45, B_, "snap"], [0.6, A_, "snap"], [0.75, B_, "snap"], [0.9, A_, "snap"], [1.05, B_, "snap"], [1.2, A_, "snap"]]
      }, D9 = meta32.duration, TICK = 0.6, WIND2 = -14, since = (t) => (t % TICK + TICK) % TICK, flare3 = (t) => Math.exp(-since(t) / 0.12), actorAlpha2 = (t) => since(t) < 0.034 ? 0 : 1, SPOTS = /* @__PURE__ */ new WeakMap();
    }
  });

  // src/fx/fire/spirit-flame.js
  var spirit_flame_exports = {};
  __export(spirit_flame_exports, {
    draw: () => draw12,
    meta: () => meta33
  });
  function ghostTongue(p, x, y, h, w, centre, N9, n, H3, layers, jit = 0.5) {
    for (let [lw, lh, ri] of layers) {
      let L = h * lh, c = H3[ri];
      for (let r = 0; r <= L; r++) {
        let u = r / Math.max(1, L), v = r / h, half = w * lw * Math.pow(1 - u, 0.75) * Math.min(1, (r + 1.5) / 4) + N9(6, n, r * 0.4) * jit * u;
        if (half < 0.3) continue;
        let cx = x + centre(v, r), Y3 = Math.round(y - r);
        for (let px = Math.round(cx - half), x1 = Math.round(cx + half); px <= x1; px++) p.px(px, Y3, c);
      }
    }
  }
  function draw12(p, t, o) {
    let F = fit(o.palette, 9), H3 = hotFirst(F), S = o.seed, ph = t / D10, N9 = (rate, seed2 = 0, off2 = 0) => NL7(t, rate, seed2, off2), COLD = mix(H3[3], WHITE, 0.15), bob = Math.sin(ph * TAU) * 1.5, lean = N9(0.67, S + 2) * 3, wave = (v, r, k = 0) => (Math.sin(r * 0.24 - ph * TAU * 2 + k) * 2.2 + Math.sin(r * 0.11 - ph * TAU + k * 0.5) * 3.2) * v * v + lean * v * v, H03 = 44 * (0.92 + 0.08 * N9(1.3, S + 3)), y0 = bob, br = 0.9 + 0.1 * N9(2, S + 4);
    p.glow(0, y0 - 16, 60, COLD, 0.36 * br), p.glow(wave(0.5, 20) * 0.5, y0 - 20, 26, H3[2], 0.2 * br), looped(t, D10, 40, S + 300, (r) => ({ x: r.range(-4, 4), y: -H03 * r.range(0.55, 0.95), vx: r.range(-7, 7), vy: -r.range(10, 22), life: r.range(1, 1.9), s: r.range(1.4, 2.8), a: r.range(0, TAU), w: r.range(2, 3.5) }), (q, age) => {
      let tb = t - age, [x, y] = drift(q.x + wave(0.9, 26, 0) * 0.5, q.y + y0, q.vx, q.vy, age, 0, -6, 1.2, 0.6), k = 1 - age / q.life, cx = x + Math.sin(age * q.w + q.a) * 3 * (age + 0.2), a = Math.min(1, age * 5) * k;
      soft(p, cx, y, q.s * (0.8 + age * 0.8), H3[4], 0.35 * a), soft(p, cx - 0.4, y - 0.6, q.s * 0.5 * (0.8 + age * 0.5), H3[2], 0.4 * a * k), p.glow(cx, y, 6, H3[3], 0.15 * a);
    });
    let wl = Math.max(0, 0.25 + 0.55 * N9(1.7, S + 6)), wr = Math.max(0, 0.25 + 0.55 * N9(1.7, S + 7));
    wl > 0.12 && ghostTongue(p, -4, y0 - 4, H03 * wl, 2.4, (v, r) => wave(v, r, 2.1) - 6 * v * v + 3 * Math.sin(v * 5 - ph * TAU * 2) * v, N9, S * 11 + 1, H3, GHOST), wr > 0.12 && ghostTongue(p, 4.2, y0 - 4, H03 * wr, 2.4, (v, r) => wave(v, r, -1.8) + 6 * v * v - 3 * Math.sin(v * 5 - ph * TAU * 2 + 1) * v, N9, S * 11 + 2, H3, GHOST), ghostTongue(p, 0, y0, H03, 8.6, (v, r) => wave(v, r), N9, S * 11, H3, GHOST, 0.6);
    for (let k of [0, 1])
      for (let r = 4; r < H03 * 0.72; r++) {
        let v = r / H03, x = wave(v, r) + Math.sin(r * 0.35 - ph * TAU * 3 + k * Math.PI) * 2.2 * (1 - v);
        Math.sin(r * 0.2 - ph * TAU * 4 + k * 2) > 0.2 && p.px(x, y0 - r, k ? H3[2] : H3[1]);
      }
    for (let v of [0.2, 0.45, 0.7]) p.glow(wave(v, H03 * v), y0 - H03 * v, 12, H3[2], 0.16 * br);
    p.glow(0, y0 - 4, 9, H3[1], 0.22 + 0.06 * N9(3, S + 5)), looped(t, D10, 34, S + 400, (r) => ({ x: r.range(-7, 7), y: -r.range(4, 28), vx: r.range(-12, 12), vy: -r.range(14, 34), life: r.range(0.9, 1.8), a: r.range(0, TAU) }), (q, age) => {
      let [x, y] = drift(q.x, q.y + y0, q.vx, q.vy, age, 0, -10, 1.2, 1.2), k = 1 - age / q.life, tw = 0.5 + 0.5 * Math.sin(age * 14 + q.a), sx = x + Math.sin(age * 3 + q.a) * 3;
      k * (0.4 + 0.6 * tw) < 0.2 || (p.px(sx, y, tw > 0.7 && k > 0.5 ? H3[0] : k > 0.5 ? H3[1] : H3[3]), tw > 0.85 && k > 0.6 && (p.px(sx - 1, y, H3[3]), p.px(sx + 1, y, H3[3]), p.px(sx, y - 1, H3[3]), p.px(sx, y + 1, H3[3])), p.glow(sx, y, 4, H3[2], 0.3 * k));
    });
  }
  var meta33, D10, NL7, GHOST, init_spirit_flame = __esm({
    "src/fx/fire/spirit-flame.js"() {
      init_core();
      init_lib4();
      meta33 = {
        name: "Spirit flame",
        desc: "A cold blue-teal ghost fire floating in the air: a bright rim round a hollow dark heart, a wave climbing its wispy tail, curls breaking off, cold sparks rising.",
        tags: ["fire", "spirit", "ghost", "magic", "cold", "ambient", "loop"],
        size: [80, 124],
        origin: [40, 94],
        duration: 3,
        loop: !0,
        fps: 30,
        bg: "dark",
        options: {
          palette: ["#040a16", "#08203a", "#0b3a52", "#0f5e6e", "#16908e", "#2cc4b4", "#7ef0dc", "#c8fff2", "#ffffff"],
          seed: 7
        }
      }, D10 = meta33.duration, NL7 = noiseFor(D10), GHOST = [[1, 1, 1], [0.8, 0.92, 3], [0.6, 0.78, 6], [0.3, 0.42, 2], [0.14, 0.22, 0]];
    }
  });

  // src/fx/ice/icicle-fall.js
  var icicle_fall_exports = {};
  __export(icicle_fall_exports, {
    create: () => create22,
    meta: () => meta34
  });
  function icicle(p, C, x, top, len2, w, opts = {}) {
    let hw = (u) => w / 2 * Math.pow(1 - u, 0.75) * (1 + 0.14 * Math.sin(u * 13 + 0.5)) * (u < 0.08 ? 1.15 : 1) + 0.3, tilt = opts.tilt ?? 0, cut2 = opts.cut ?? 0;
    p.shade(x - w / 2 - 4, top - 1, x + w / 2 + 4 + Math.abs(tilt) * len2, top + len2 + 1, (px, py, o) => {
      let u = (py - top) / len2, cx = x + tilt * len2 * u + 0.7 * Math.sin(u * 6 + 1), s = px - cx;
      if (u < cut2 || u > 1) return;
      let h = hw(u);
      if (Math.abs(s) > h + 1) return;
      if (Math.abs(s) > h) {
        o.c = C[1];
        return;
      }
      if (opts.white) return o.c = WHITE;
      let q = s / h, ring4 = Math.sin(u * 13 + 0.5) > 0.7, c = u > 0.88 ? WHITE : q < -0.72 ? C[6] : q < -0.2 ? ring4 ? C[7] : C[5] : q < 0.18 ? u < 0.72 ? C[7] : C[6] : q > 0.8 ? C[2] : Math.abs(q - 0.45) < 0.1 && u > 0.15 && u < 0.6 ? C[5] : q < 0.6 ? C[4] : C[3];
      opts.glint >= 0 && q < 0.25 && Math.abs(u - opts.glint) < 0.06 && (c = WHITE), o.c = c;
    });
  }
  function create22(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] }), bits = new Bits({ ground: floor }), lights = new Lights(), splinter = (x, y2, vx, n) => {
      for (let i = 0; i < n; i++) bits.add({ kind: B.SHARD, x: x + R6.range(-2, 2), y: y2 - 1, vx: vx * 0.5 + R6.range(-45, 45), vy: -R6.range(30, 100), g: 0.8, drag: 0.6, bounce: 0.35, life: R6.range(0.4, 0.75), a: R6.range(0, TAU), va: R6.range(-18, 18), s: R6.range(1.2, 2.4), c: C[R6.int(4, 7)] });
    }, panes = new Panes({
      ground: floor,
      onLand: (q, x, y2, v) => {
        v < 100 || (ps.spawn(P.VAPOUR, x, y2 - 1, R6.range(-15, 15), -R6.range(2, 8), R6.range(0.4, 0.6), C[6], R6.range(1.4, 2.2)), splinter(x, y2, q.vx, 2));
      },
      onCrumble: (q) => splinter(q.x, 0, q.vx, 3)
    }), rime = [];
    for (let x = -18; x <= 18; x++) {
      let h = rand(x, o.seed, 2), d = Math.abs(x) / 18;
      rime.push({ x, h: 1 + Math.round((0.6 + h * 1.8) * (1 - d * 0.7)), stub: h < 0.3 && Math.abs(x) > 7 ? 2 + Math.round(rand(x, 5) * 5 * (1 - d * 0.5)) : 0 });
    }
    let t = 0, snapped = !1, landed = !1, dripped = !1, y = 0, top = () => ROOT + (t < FREE ? 0 : 0.5 * GRAVITY * (t - FREE) ** 2);
    return {
      update(dt) {
        if (t += dt, !dripped && t >= DRIP2 && (dripped = !0, bits.add({ kind: B.DRIP, x: 0.5, y: ROOT + LEN2 + 1, vy: 20, g: 0.9, life: 1.2, c: C[6] })), t > TREMBLE && t < SNAP && R6.chance(0.25) && ps.spawn(P.FLAKE, R6.range(-6, 6), ROOT + R6.range(0, 3), R6.range(-8, 8), R6.range(5, 20), R6.range(0.6, 1.1), R6.chance(0.5) ? WHITE : C[6], R6.range(0.5, 1.1)), !snapped && t >= SNAP) {
          snapped = !0, lights.add(0, ROOT + 4, 24, WHITE, 0.6, 0.1), lights.add(0, ROOT + 4, 32, C[5], 0.4, 0.3);
          for (let i = 0; i < 7; i++) {
            let a = R6.range(0, TAU), sp = R6.range(30, 110);
            bits.add({ kind: B.SHARD, x: R6.range(-4, 4), y: ROOT + 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, g: 0.8, drag: 0.8, bounce: 0.3, life: R6.range(0.5, 0.9), a: R6.range(0, TAU), va: R6.range(-20, 20), s: R6.range(1, 2), c: C[R6.int(5, 7)] });
          }
          for (let i = 0; i < 3; i++) ps.spawn(P.VAPOUR, R6.range(-5, 5), ROOT + 2, R6.range(-25, 25), R6.range(-5, 5), R6.range(0.4, 0.7), C[6], R6.range(1.6, 2.6));
          for (let i = 0; i < 5; i++) ps.spawn(P.FLAKE, R6.range(-6, 6), ROOT + 2, R6.range(-30, 30), R6.range(-20, 20), R6.range(0.6, 1.2), R6.chance(0.5) ? WHITE : C[6], R6.range(0.5, 1.3));
        }
        if (t > FREE && t < IMPACT && R6.chance(0.5)) {
          let tp = top();
          ps.spawn(P.MOTE, R6.range(-3, 3), tp + R6.range(0, LEN2 * 0.6), R6.range(-10, 10), R6.range(-40, -10), R6.range(0.2, 0.35), R6.chance(0.5) ? C[6] : C[5], 0.6);
        }
        if (!landed && t >= IMPACT) {
          landed = !0;
          let tp = -LEN2;
          lights.add(0, -16, 46, WHITE, 0.85, 0.12), lights.add(0, -16, 58, C[4], 0.5, 0.5);
          let parts = [[[-W2 / 2, tp], [W2 / 2, tp], [0.5, 0]]];
          for (let v of [0.3, 0.58, 0.8]) parts = parts.flatMap((poly) => splitPoly(poly, 0, tp + LEN2 * v + R6.range(-2, 2), R6.range(-0.4, 0.4)));
          parts = parts.flatMap((poly) => centroid(poly).area > 22 ? splitPoly(poly, centroid(poly).x, centroid(poly).y, Math.PI / 2 + R6.range(-0.5, 0.5)) : [poly]);
          for (let part of parts) {
            let m = centroid(part), side = m.x < 0.5 ? -1 : 1, low = clamp(-m.y / LEN2);
            panes.add({
              pts: part.map(([x, y2]) => [x - m.x, y2 - m.y]),
              x: m.x,
              y: m.y,
              vx: side * R6.range(30, 110) + R6.range(-15, 15),
              vy: -R6.range(70, 200) * (0.4 + low),
              a: 0,
              va: R6.range(-12, 12),
              f: R6.range(-0.7, 0.7),
              vf: R6.range(-8, 8),
              lit: 0.75,
              g: 0.9,
              drag: 0.6,
              bounce: 0.35,
              solid: !0,
              ridge: Math.PI / 2,
              brittle: 2,
              crumble: R6.range(0.15, 0.45),
              life: R6.range(1, 1.4)
            });
          }
          for (let i = 0; i < 52; i++) {
            let a = -Math.PI / 2 + R6.range(-1.25, 1.25), sp = R6.range(60, 230);
            bits.add({ kind: R6.chance(0.15) ? B.CHUNK : B.SHARD, x: R6.range(-3, 3), y: -R6.range(1, 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.85, drag: 0.6, bounce: 0.32, life: R6.range(0.6, 1.2), a: R6.range(0, TAU), va: R6.range(-22, 22), s: R6.range(1.2, 3), c: C[R6.int(4, 7)], ramp: [C[1], C[3], C[4], C[6], C[7]] });
          }
          for (let i = 0; i < 10; i++) {
            let s = R6.sign();
            ps.spawn(P.VAPOUR, s * R6.range(0, 8), -R6.range(1, 6), s * R6.range(25, 90), -R6.range(2, 14), R6.range(0.6, 1.1), C[6], R6.range(2.2, 3.8));
          }
          for (let i = 0; i < 12; i++) ps.spawn(P.FLAKE, R6.range(-6, 6), -R6.range(2, 16), R6.range(-70, 70), -R6.range(30, 110), R6.range(1, 1.5), R6.chance(0.6) ? WHITE : C[6], R6.range(0.5, 1.5));
          for (let i = 0; i < 6; i++) ps.spawn(P.STAR, R6.range(-24, 24), -R6.range(4, 34), R6.range(-10, 10), -R6.range(4, 14), R6.range(0.4, 0.8), R6.chance(0.5) ? WHITE : C[6], R6.range(1, 2.2));
        }
        if (landed && t < IMPACT + 0.9 && R6.chance(0.08) && bits.list.length) {
          let b = R6.pick(bits.list);
          ps.spawn(P.STAR, b.x, b.y - 1, 0, -3, R6.range(0.2, 0.4), R6.chance(0.5) ? WHITE : C[6], R6.range(0.6, 1.4));
        }
        ps.update(dt), bits.update(dt), panes.update(dt), lights.update(dt), endBy(t, meta34.duration, ps, bits, panes);
      },
      drawBack(p) {
        if (t > TREMBLE && t < IMPACT + 0.05) {
          let k = t < FREE ? seg(t, TREMBLE, FREE) * 0.35 : 0.35 + 0.65 * seg(t, FREE, IMPACT), rx = 3 + 7 * k;
          for (let x = Math.floor(-rx); x <= rx; x++) {
            let f = 1 - (x / rx) ** 2;
            p.blend(x + 0.5, 0, C[0], 0.7 * k * f), Math.abs(x) < rx * 0.7 && p.blend(x + 0.5, 1, C[0], 0.45 * k * f);
          }
        }
        if (t >= IMPACT) {
          let g = ease.outCubic(seg(t, IMPACT, IMPACT + 0.25)), out = 1 - smooth(IMPACT + 0.8, IMPACT + 1.5, t);
          for (let x = -26; x <= 26; x++) {
            let d = Math.abs(x + 0.5) / 26, h = rand(x, 23), a = out * clamp((g * 1.15 - d) / 0.15);
            if (!(a <= 0)) {
              if (p.dot(x, 0, h < 0.35 || d > g - 0.12 ? WHITE : C[6], a), h < 0.4) for (let j = 1; j <= Math.round((1 + rand(x, 3) * 2.5) * (1 - d)); j++) p.dot(x + Math.sign(x) * (j > 1 ? 1 : 0), -j, j > 1 ? WHITE : C[5], a);
              for (let j = 1; j <= Math.round((2 + rand(x, 7) * 3) * (1 - d * 0.6)); j++) p.dot(x, j, j < 2 ? C[5] : C[4], a * (1.1 - j / 6));
            }
          }
          let k = seg(t, IMPACT, IMPACT + 0.35);
          k < 1 && band(p, 0, 0.5, 6 + 34 * ease.outCubic(k), 0.18, Math.max(1, 4 * (1 - k)), 1.1 - k, [C[3], C[4], C[5], C[6]], (a) => Math.sin(a) < 0);
        }
        ps.draw(p, "back");
      },
      draw(p) {
        let ra = 1 - smooth(meta34.duration - 0.7, meta34.duration - 0.2, t);
        for (let r of rime) {
          for (let j = 0; j < r.h + 1; j++) p.dot(r.x, ROOT - 1 - j, j === r.h ? WHITE : j === r.h - 1 ? C[6] : j === 0 ? C[3] : C[5], ra);
          for (let j = 0; j < r.stub; j++) p.dot(r.x, ROOT + j, j === r.stub - 1 ? WHITE : j === 0 ? C[5] : C[4], ra);
          r.stub > 4 && p.dot(r.x + 1, ROOT, C[3], ra);
        }
        if (snapped)
          for (let x = -W2 / 2 + 1; x <= W2 / 2 - 1; x++) {
            let L = 1 + Math.round(rand(x, 77) * 2.5);
            for (let j = 0; j < L; j++) p.dot(x, ROOT + j, j === L - 1 ? t < SNAP + 0.15 ? WHITE : C[6] : x < 0 ? C[5] : C[3], ra);
          }
        if (p.glow(0, ROOT, 18, C[4], 0.3 * ra), t >= IMPACT) {
          let k = seg(t, IMPACT, IMPACT + 0.35);
          k < 1 && band(p, 0, 0.5, 6 + 34 * ease.outCubic(k), 0.18, Math.max(1, 4 * (1 - k)), 1.1 - k, [C[3], C[4], C[5], C[6]], (a) => Math.sin(a) >= 0, k < 0.15), t < IMPACT + 0.22 && sparkle(p, 0.5, -3, 10 * ease.outBack(Math.min(1, (t - IMPACT) / 0.05)) * (1 - (t - IMPACT) / 0.22), C[6], C[4], 0.7);
        }
        if (t < IMPACT) {
          let tp = top(), jx = t > TREMBLE && t < SNAP ? (Math.floor(t * 36) % 2 ? 1 : 0) * Math.round(seg(t, TREMBLE, SNAP) * 1.4 + 0.4) : 0, falling = t >= FREE, sp = falling ? GRAVITY * (t - FREE) : 0;
          if (falling)
            for (let [dx, k] of [[-3, 0.7], [0.5, 1], [4, 0.6]]) {
              let L = Math.min(30, sp * 0.07) * k;
              L > 2 && p.line(dx, tp - L, dx, tp + 3, (u) => u > 0.75 ? C[6] : u > 0.4 ? C[4] : C[3]);
            }
          let gl = (t - 0.04) / 0.3;
          if (icicle(p, C, jx + 0.5, tp, LEN2, W2, { white: t >= IMPACT - 0.025 || t >= SNAP && t < SNAP + 0.03, glint: gl >= 0 && gl <= 1 ? gl : -1 }), snapped && t < SNAP + 0.12 && p.line(-W2 / 2 - 1, ROOT + 1, W2 / 2 + 1, ROOT + 1, WHITE), p.glow(0.5, tp + LEN2 * 0.5, 20, C[4], 0.28), t < DRIP2) {
            let s = seg(t, 0, DRIP2);
            p.dot(0.5, ROOT + LEN2 + 1, C[6], s), s > 0.6 && p.px(0.5, ROOT + LEN2 + 2, WHITE);
          }
        }
        panes.draw(p, C), bits.draw(p), ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta34, ROOT, LEN2, W2, DRIP2, TREMBLE, SNAP, FREE, FALL_T, IMPACT, init_icicle_fall = __esm({
    "src/fx/ice/icicle-fall.js"() {
      init_core();
      init_lib5();
      meta34 = {
        name: "Icicle fall",
        desc: "An icicle drips and trembles, snaps off its frosted root, drops, stabs the floor and bursts into skidding shards, splinters and rolling frost.",
        tags: ["ice", "icicle", "fall", "trap", "shatter", "one-shot"],
        size: [152, 120],
        origin: [76, 100],
        duration: 2.6,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], seed: 4 }
      }, ROOT = -80, LEN2 = 36, W2 = 12, DRIP2 = 0.16, TREMBLE = 0.3, SNAP = 0.6, FREE = SNAP + 0.04, FALL_T = Math.sqrt(2 * (-ROOT - LEN2) / GRAVITY), IMPACT = FREE + FALL_T;
    }
  });

  // src/fx/ice/frost-breath.js
  var frost_breath_exports = {};
  __export(frost_breath_exports, {
    draw: () => draw13,
    drawBack: () => drawBack3,
    meta: () => meta35
  });
  function puff(p, C, x, y, r, a, k, front) {
    let body4 = front ? C[5] : C[4], cap = front ? C[7] : C[6], soft2 = (q) => (d) => q * (1 - d * d);
    p.disc(x, y, r, body4, soft2(a * 0.6)), p.disc(x + r * 0.06, y + r * 0.12, r * 0.68, mix(body4, C[3], 0.3), soft2(a * 0.5)), k < 0.55 && p.disc(x - r * 0.25, y - r * 0.3, r * 0.5, cap, soft2(a * 0.7 * (1 - k / 0.55))), p.glow(x, y, r * 1.7, C[4], 0.1 * a);
  }
  function gust(p, C, t, o) {
    let ph = t / meta35.duration, sp = Math.tan(o.spread) * 1.08, S = o.seed;
    p.each(2, -46, 170, 46, (x, y, sx, sy) => {
      let u = x / 170, hw = 2.5 + x * sp, yc = 7 * u * u, v = (y - yc) / hw;
      if (v * v >= 1 || u >= 1) return;
      let n = tileFbm(x * 0.055 - ph * 10, (y - yc) * 0.15 + 7, 10, 0, S, 2), edge = (1 - v * v) * (u < 0.08 ? u / 0.08 : 1) * (1 - u) ** 0.8, d = clamp(0.5 + n * 1.3 + (1 - Math.abs(v)) * 0.35 * (1 - u) ** 1.5) * edge;
      d < 0.08 || (p.blendPx(sx, sy, d > 0.72 ? C[7] : d > 0.52 ? C[6] : d > 0.32 ? C[5] : C[4], Math.min(0.78, d * 0.95) * clamp((d - 0.08) / 0.3)), d > 0.3 && p.add(sx, sy, d > 0.6 ? C[6] : C[5], 0.2 * d));
    });
  }
  function drawBack3(p, t, o) {
    let C = fit(o.palette, 8), D25 = meta35.duration, S = o.seed, sp = o.spread;
    gust(p, C, t, o), cycle(t, D25, 12, S, (g) => g.range(1, 1.25), (age, life, r) => {
      let th = r.range(-sp, sp), v = r.range(170, 230) * o.power, [x, y] = fly(3, r.range(-1, 1), v * Math.cos(th), v * Math.sin(th), age, SINK, 1.4), k = age / life, rad = 2 + 12 * Math.pow(k, 0.75);
      puff(p, C, x, Math.min(y, 40 - rad), rad, 0.75 * Math.pow(1 - k, 1.2) * Math.min(1, age / 0.08), k, !1);
    });
  }
  function draw13(p, t, o) {
    let C = fit(o.palette, 8), D25 = meta35.duration, S = o.seed, sp = o.spread, ph = t / D25;
    p.glowLine(4, 0, 120, 6, 24, C[4], 0.26), p.glowLine(2, 0, 50, 1, 9, C[6], 0.3), p.glow(60, 4, 44, C[3], 0.16), cycle(t, D25, 10, S + 1, (g) => g.range(0.7, 0.95), (age, life, r) => {
      let th = r.range(-sp * 0.8, sp * 0.8), v = r.range(190, 260) * o.power, [x, y] = fly(3, r.range(-1, 1), v * Math.cos(th), v * Math.sin(th), age, SINK, 1.6), k = age / life, rad = 1.5 + 8 * Math.pow(k, 0.7);
      puff(p, C, x, Math.min(y, 40 - rad), rad, 0.85 * Math.pow(1 - k, 1.3) * Math.min(1, age / 0.06), k, !0);
    }), cycle(t, D25, 18, S + 2, (g) => g.range(0.8, 1.1), (age, life, r) => {
      let th = r.range(-sp * 1.1, sp * 1.1), v = r.range(120, 190), [x, y] = fly(4, 0, v * Math.cos(th), v * Math.sin(th), age, SINK * 1.4, 1.5), k = age / life, sw = Math.sin(age * 9 + r.range(0, TAU)) * 1.5;
      (k < 0.85 || age * 30 % 2 < 1) && p.px(x, y + sw, r.chance(0.5) ? WHITE : C[6]);
    }), cycle(t, D25, 26, S + 3, (g) => g.range(0.22, 0.36), (age, life, r) => {
      let th = r.range(-sp * 0.9, sp * 0.9), v = r.range(280, 380), [x, y] = fly(6, r.range(-2, 2), v * Math.cos(th), v * Math.sin(th), age, 0, 0.9), [vx, vy] = flyV(v * Math.cos(th), v * Math.sin(th), age, 0, 0.9), s = Math.hypot(vx, vy), L = 4 + s * 0.03, ux = vx / s, uy = vy / s, k = age / life;
      p.line(x - ux * L, y - uy * L, x, y, (u) => u > 0.8 ? WHITE : u > 0.4 ? C[6] : C[4], (u) => (u > 0.35 ? 1 : u / 0.35) * (k < 0.75 ? 1 : (1 - k) / 0.25)), p.glow(x, y, 3, C[5], 0.3 * (1 - k));
    }), cycle(t, D25, 9, S + 4, (g) => g.range(0.65, 0.9), (age, life, r) => {
      let th = r.range(-sp, sp), v = r.range(150, 230), [x, y] = fly(5, 0, v * Math.cos(th), v * Math.sin(th), age, SINK, 1.1), k = age / life, a = r.range(0, TAU) + age * r.range(9, 15) * r.sign(), L = r.range(1.5, 2.6), ca = Math.cos(a), sa = Math.sin(a);
      if (k > 0.85 && age * 30 % 2 < 1) return;
      if (p.line(x - ca * L, y - sa * L, x + ca * L, y + sa * L, C[5]), p.px(x + ca * L, y + sa * L, WHITE), Math.cos(a * 2) > 0.92) {
        for (let [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, C[6]);
        p.px(x, y, WHITE), p.glow(x, y, 6, C[5], 0.5);
      } else p.glow(x, y, 3, C[5], 0.2);
    });
    for (let i = 0; i < 3; i++) {
      let L = 9 + 6 * loopNoise(ph, 1.2, S + i * 7), dy = (i - 1) * 1.4;
      p.line(2, dy * 0.5, 2 + L, dy, (u) => u < 0.5 ? WHITE : C[6], (u) => u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4);
    }
    p.ellipse(2.5, 0, 4.6, 3, C[6]), p.ellipse(2, 0, 3, 1.8, WHITE);
    let fl = 0.85 + 0.15 * Math.sin(ph * TAU * 3);
    p.glow(2, 0, 24, C[5], 0.7 * fl), p.glow(2, 0, 9, WHITE, 0.5 * fl);
  }
  var meta35, SINK, init_frost_breath = __esm({
    "src/fx/ice/frost-breath.js"() {
      init_core();
      meta35 = {
        name: "Frost breath",
        desc: "A cone of icy wind blowing right: frost puffs billow out, swell and sink, wind streaks race through, ice crystals tumble and glint off a white-hot mouth.",
        tags: ["ice", "breath", "frost", "cone", "wind", "directional", "loop"],
        size: [184, 104],
        origin: [12, 50],
        duration: 1.2,
        loop: !0,
        fps: 30,
        bg: "dark",
        options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], spread: 0.21, power: 1, seed: 11 }
      }, SINK = 9;
    }
  });

  // src/fx/ice/frost-nova.js
  var frost_nova_exports = {};
  __export(frost_nova_exports, {
    act: () => act13,
    create: () => create23,
    meta: () => meta36
  });
  function frost(p, C, x0, x1, reach, a, edge) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      let d = Math.abs(x + 0.5), q = d / reach, k = clamp((a * 1.15 - q) / 0.15);
      if (k <= 0) continue;
      let h = rand(x, 17), fresh = edge > 0 && d > edge - 3, tuft = h < 0.45 ? Math.round((1 + rand(x, 5) * 3) * (1 - q * 0.6)) : 0, D25 = (4 + rand(x, 11) * 4) * (1 - q * 0.5);
      p.dot(x, 0, fresh || h < 0.25 ? WHITE : C[6], k);
      for (let j = 1; j <= tuft; j++) p.dot(x, -j, j === tuft ? WHITE : C[5], k);
      tuft > 1 && rand(x, 9) < 0.5 && p.dot(x + (rand(x, 3) < 0.5 ? -1 : 1), -tuft + 1, C[6], k);
      for (let j = 1; j <= D25; j++) {
        let v = j / D25;
        p.dot(x, j, rand(x * 31 + j, 7) < 0.06 ? WHITE : v < 0.25 ? C[6] : v < 0.55 ? C[5] : C[4], k * (1.1 - v) * (fresh ? 1.3 : 1));
      }
    }
  }
  function snowflake2(p, C, x, y, L, spin, k) {
    if (!(L < 0.8)) {
      for (let i = 0; i < 6; i++) {
        let a = spin + i * TAU / 6, ca = Math.cos(a), sa = Math.sin(a);
        for (let d = 0; d <= L; d += 0.5) p.dot(x + ca * d, y + sa * d, d < L * 0.4 ? WHITE : C[6], k + 0.2);
        if (L > 3)
          for (let s of [-1, 1]) {
            let bx = x + ca * L * 0.6, by = y + sa * L * 0.6, ba = a + s * 0.9;
            for (let d = 0; d <= L * 0.35; d += 0.5) p.dot(bx + Math.cos(ba) * d, by + Math.sin(ba) * d, C[5], k);
          }
      }
      p.px(x, y, WHITE), p.glow(x, y, 10 + L * 3, C[5], 0.35 + 0.5 * k);
    }
  }
  function create23(o) {
    let C = fit(o.palette, 8), DIM = [C[0], C[0], C[1], C[2], C[3], C[4], C[5], C[6]], REACH2 = o.reach, R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] }), bits = new Bits({ ground: floor }), lights = new Lights(), front = (t2) => t2 < CHARGE3 ? 0 : REACH2 * (1 - Math.pow(1 - clamp((t2 - CHARGE3) / SPREAD3), 3)), reachedAt = (d) => CHARGE3 + SPREAD3 * (1 - Math.cbrt(1 - Math.min(1, d / REACH2))), sites = [];
    for (let side of [-1, 1])
      RINGS.forEach((ring5, ri) => {
        for (let i = 0; i < ring5.n; i++) {
          let q = ring5.q[0] + (ring5.q[1] - ring5.q[0]) * (i + R6.range(0.2, 0.8)) / ring5.n, h = R6.range(...ring5.h), w = R6.range(...ring5.w), parts = [{ dx: 0, h, w, lean: side * h * R6.range(0.1, 0.28) }];
          for (let k = 0; k < ring5.kids; k++) {
            let s = k % 2 ? -side : side, kh = h * R6.range(0.4, 0.62);
            parts.unshift({ dx: s * R6.range(0.3, 0.5) * w, h: kh, w: w * 0.62, lean: s * kh * R6.range(0.35, 0.6) });
          }
          sites.push({ x: side * q * REACH2, d: q * REACH2, h, back: (i + ri + (side > 0 ? 1 : 0)) % 2 === 1, t0: reachedAt(q * REACH2) + R6.range(0, 0.03), up: !1, parts, phase: R6.next() });
        }
      });
    let t = 0, released = !1, sink = (tt) => smooth(HOLD3, HOLD3 + MELT, tt), drawCrystals = (p, back) => {
      let m = sink(t);
      for (let s of sites) {
        if (!s.up || s.back !== back || m >= 1) continue;
        let g = ease.outBack(clamp((t - s.t0) / 0.1), 2.6), white = t < s.t0 + 0.03, sw = ((t - s.t0) * 0.7 + s.phase * 3) % 1.6 / 0.5;
        for (let q of s.parts)
          crystal(p, s.x + q.dx, back ? -1 : 0, q.h * g * (1 - m), q.w * (1 - m * 0.3), q.lean * g * (1 - m), back ? DIM : C, { white, glint: sw <= 1 ? sw : -1 });
      }
    }, ring4 = (p, back) => {
      if (t < CHARGE3) return;
      let u = clamp((t - CHARGE3) / (SPREAD3 + 0.15));
      if (!(u >= 1) && (band(p, 0, 0, front(t) + 2, 0.16, Math.max(2, 10 * Math.pow(1 - u, 0.7)), u < 0.75 ? 1 : (1 - u) / 0.25, C, (g) => Math.sin(g) < 0 === back, t - CHARGE3 < 0.1), !back))
        for (let s of [-1, 1]) p.glow(s * (front(t) + 2), -2, 22, C[5], 0.55 * (1 - u));
    };
    return {
      update(dt) {
        if (t += dt, t < CHARGE3 - 0.06) {
          if (R6.chance(0.9)) {
            let a = R6.range(0, TAU), D25 = R6.range(26, 58), T2 = R6.range(0.2, 0.3), v = D25 * 3 / (Math.exp(3 * T2) - 1), x = Math.cos(a) * D25, y = Math.min(CORE_Y + Math.sin(a) * D25 * 0.8, -2), l = Math.hypot(x, y - CORE_Y) || 1;
            ps.spawn(P.STREAK, x, y, -x / l * v, (CORE_Y - y) / l * v, T2, R6.chance(0.5) ? C[6] : C[5]);
          }
          if (R6.chance(0.14)) {
            let s = R6.sign();
            ps.spawn(P.VAPOUR, s * R6.range(28, 60), -R6.range(0, 2), -s * R6.range(35, 70), -R6.range(0, 3), R6.range(0.35, 0.5), C[6], R6.range(2, 3));
          }
        }
        if (t >= CHARGE3 && !released) {
          released = !0, lights.add(0, CORE_Y, 84, C[4], 0.8, 0.55), lights.add(0, CORE_Y, 45, WHITE, 0.7, 0.12);
          for (let i = 0; i < 22; i++) {
            let a = R6.range(-Math.PI, 0.25), sp = R6.range(110, 280);
            bits.add({ kind: B.SHARD, x: R6.range(-3, 3), y: CORE_Y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.7, drag: 0.6, bounce: 0.3, life: R6.range(0.9, 1.5), a: R6.range(0, TAU), va: R6.range(-20, 20), s: R6.range(1.5, 3.5), c: R6.pick([C[7], C[6], C[5]]) });
          }
          for (let i = 0; i < 14; i++) {
            let a = R6.range(-Math.PI, 0), sp = R6.range(40, 160);
            ps.spawn(P.FLAKE, 0, CORE_Y, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(1.2, 1.8), R6.chance(0.6) ? WHITE : C[6], R6.range(0.5, 1.6));
          }
        }
        let fr = front(t);
        if (t > CHARGE3 && t < CHARGE3 + SPREAD3)
          for (let s of [-1, 1])
            ps.spawn(P.VAPOUR, s * fr + R6.range(-2, 2), -R6.range(0, 5), s * R6.range(15, 75), -R6.range(2, 15), R6.range(0.6, 1), R6.chance(0.7) ? C[6] : C[5], R6.range(3, 5.5) * (1 - 0.4 * (fr / REACH2))), R6.chance(0.45) && ps.spawn(P.FLAKE, s * fr, -2, s * R6.range(10, 45), -R6.range(30, 85), R6.range(1.1, 1.9), R6.chance(0.5) ? WHITE : C[6], R6.range(0.5, 1.2));
        for (let s of sites)
          if (!s.up && t >= s.t0) {
            s.up = !0;
            for (let i = 0; i < 2 + Math.round(s.h / 8); i++) {
              let a = -Math.PI / 2 + R6.range(-1.3, 1.3), sp = R6.range(60, 200) * (0.5 + s.h / 40);
              bits.add({ kind: B.SHARD, x: s.x + R6.range(-3, 3), y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.8, drag: 0.6, bounce: 0.3, life: R6.range(0.9, 1.6), a: R6.range(0, TAU), va: R6.range(-18, 18), s: R6.range(1.5, 3), c: R6.pick([C[7], C[6], C[5]]) });
            }
            ps.spawn(P.VAPOUR, s.x, -1, R6.range(-30, 30), -R6.range(2, 8), R6.range(0.5, 0.9), C[6], R6.range(2.5, 4)), s.h > 10 && ps.spawn(P.STAR, s.x + R6.range(-3, 3), -R6.range(4, s.h * 0.8), 0, -3, R6.range(0.3, 0.6), C[6], R6.range(1, 2.4));
          }
        if (t > CHARGE3 + 0.2 && t < HOLD3 + 0.2) {
          if (R6.chance(0.5)) {
            let s = R6.pick(sites);
            s.up && ps.spawn(P.STAR, s.x + R6.range(-3, 3), -R6.range(2, s.h * 0.9), 0, -3, R6.range(0.3, 0.6), R6.chance(0.6) ? C[6] : WHITE, R6.range(0.6, 2.2));
          }
          t < HOLD3 - 0.3 && R6.chance(0.16) && ps.spawn(P.FLAKE, R6.range(-1, 1) * fr, -R6.range(40, 90), R6.range(-5, 5), R6.range(3, 10), R6.range(1.1, 1.5), R6.chance(0.5) ? WHITE : C[6], R6.range(0.5, 1.4));
        }
        if (t > HOLD3 && t < HOLD3 + MELT) {
          if (R6.chance(0.5)) {
            let s = R6.pick(sites);
            bits.add({ kind: B.DRIP, x: s.x + R6.range(-3, 3), y: -R6.range(3, s.h * 0.6 * (1 - sink(t))), vy: 10, g: 0.6, life: 1, c: C[5] });
          }
          R6.chance(0.25) && ps.spawn(P.VAPOUR, R6.range(-1, 1) * REACH2 * 0.8, -R6.range(0, 3), R6.range(-10, 10), -R6.range(6, 16), R6.range(0.6, 1), C[5], R6.range(3, 5));
        }
        ps.update(dt), bits.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let out = 1 - smooth(HOLD3 + 0.2, HOLD3 + MELT + 0.6, t), fr = front(t);
        out > 0 && t > CHARGE3 && frost(p, C, -Math.max(12, fr + 1), Math.max(12, fr + 1), REACH2, out, fr), ring4(p, !0), drawCrystals(p, !0), ps.draw(p, "back");
      },
      draw(p) {
        if (ring4(p, !1), drawCrystals(p, !1), t < CHARGE3) {
          let k = t / CHARGE3, beat4 = 1 + 0.25 * Math.exp(-((t - CHARGE3 * 0.55) ** 2) / 2e-3) + 0.3 * Math.exp(-((t - CHARGE3 * 0.85) ** 2) / 2e-3);
          snowflake2(p, C, 0, CORE_Y, (2 + 5.5 * k * k) * beat4, t * 4, k);
        } else if (t < CHARGE3 + 0.22) {
          let a = (t - CHARGE3) / 0.22;
          flare(p, 0, CORE_Y, 36 * Math.pow(1 - a, 1.5), 1 - a, C), p.glow(0, CORE_Y, 46, WHITE, 0.6 * (1 - a));
        }
        if (t > CHARGE3) {
          let k = (1 - smooth(HOLD3, HOLD3 + MELT + 0.3, t)) * (0.85 + 0.15 * Math.sin(t * 2.4)), fr = front(t);
          for (let i = -3; i <= 3; i++) p.glow(i / 3.5 * fr, -4, 26, C[4], 0.16 * k);
        }
        bits.draw(p), ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta36, HIGH3, SLAM2, EASE2, act13, CHARGE3, SPREAD3, HOLD3, MELT, CORE_Y, RINGS, init_frost_nova = __esm({
    "src/fx/ice/frost-nova.js"() {
      init_core();
      meta36 = {
        name: "Frost nova",
        desc: "Frost spirals into a spinning snowflake, then a wave blooms three rings of ice crystals round the caster; snow drifts, frost creeps, and the ice melts back into the floor.",
        tags: ["ice", "nova", "aoe", "frost", "magic", "one-shot"],
        size: [288, 192],
        origin: [144, 150],
        duration: 3.4,
        loop: !1,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], reach: 104, seed: 4 }
      }, HIGH3 = { turn: 1.15, crouch: 0, fx: -7, fy: -44, bx: 8, by: -44, ffx: -5, fbx: 6 }, SLAM2 = { turn: 1.15, crouch: 8, lean: 3, fx: -9, fy: -8, bx: 11, by: -8, ffx: -8, fbx: 9 }, EASE2 = { turn: 1, crouch: 2, fx: -8, fy: -17, bx: 9, by: -17, ffx: -4, fbx: 5 }, act13 = {
        target: { x: 76 },
        poses: [
          [-0.34, READY],
          [-0.04, { ...HIGH3, crouch: 2, fy: -36, by: -36 }],
          [0.36, HIGH3],
          [0.42, SLAM2, "snap"],
          [0.9, { ...SLAM2, crouch: 7 }],
          [1.9, { ...SLAM2, crouch: 6 }],
          [2.6, EASE2],
          [3.4, READY]
        ],
        hits: [
          { t: 0.42, stop: 0.1, shake: 0.26, amp: 2, target: !1 },
          { t: 0.66, push: 0.9, straw: 6, y: -10, skin: "ice", shiver: 1.7 },
          { t: 2.9, push: 0.2, straw: 0, flash: 0, skin: null }
        ],
        dust: [{ t: 0.42, x: 10, n: 5, dir: 1, c: "#d8f2ff" }, { t: 0.42, x: -10, n: 5, dir: -1, c: "#d8f2ff" }]
      }, CHARGE3 = 0.42, SPREAD3 = 0.62, HOLD3 = 1.95, MELT = 0.7, CORE_Y = -24, RINGS = [
        { q: [0.15, 0.24], h: [24, 32], w: [10, 13], n: 2, kids: 2 },
        { q: [0.36, 0.52], h: [13, 19], w: [7, 9], n: 3, kids: 1 },
        { q: [0.62, 0.9], h: [5, 10], w: [4, 6], n: 4, kids: 0 }
      ];
    }
  });

  // src/fx/ice/ice-spikes.js
  var ice_spikes_exports = {};
  __export(ice_spikes_exports, {
    create: () => create24,
    meta: () => meta37
  });
  function create24(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), REACH2 = o.reach, floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] }), bits = new Bits({ ground: floor }), lights = new Lights(), splinter = (x, y, vx, n) => {
      for (let i = 0; i < n; i++) bits.add({ kind: B.SHARD, x: x + R6.range(-2, 2), y: y - 1, vx: vx * 0.5 + R6.range(-45, 45), vy: -R6.range(30, 100), g: 0.8, drag: 0.6, bounce: 0.35, life: R6.range(0.4, 0.75), a: R6.range(0, TAU), va: R6.range(-18, 18), s: R6.range(1.2, 2.4), c: C[R6.int(4, 7)] });
    }, panes = new Panes({
      ground: floor,
      onCrumble: (q) => {
        splinter(q.x, 0, 0, 3), ps.spawn(P.VAPOUR, q.x, -1, R6.range(-12, 12), -R6.range(2, 8), R6.range(0.4, 0.7), C[6], R6.range(1.4, 2.2));
      },
      onLand: (q, x, y, v) => {
        v < 110 || (ps.spawn(P.VAPOUR, x, y - 1, R6.range(-20, 20), -R6.range(2, 8), R6.range(0.4, 0.7), C[6], R6.range(1.4, 2.4)), splinter(x, y, q.vx, 3), R6.chance(0.3) && ps.spawn(P.STAR, x, y - 2, 0, -5, R6.range(0.2, 0.4), WHITE, R6.range(0.8, 1.6)));
      }
    }), front = (t2) => REACH2 * (1 - Math.pow(1 - seg(t2, START, START + RUN), 1.7)), reachedAt = (x) => START + RUN * (1 - Math.pow(1 - clamp(x / REACH2), 1 / 1.7)), env = (q) => 0.28 + 0.72 * Math.exp(-(((q - 0.64) / 0.3) ** 2)), clusters = [];
    for (let x = 10; x < REACH2 - 2; x += R6.range(20, 26)) {
      let q = x / REACH2, H3 = o.height * env(q) * R6.range(0.88, 1.06), W4 = clamp(H3 * 0.36, 5, 14), lean = H3 * R6.range(0.2, 0.34), list = [
        { dx: W4 * R6.range(0.35, 0.6), h: H3 * R6.range(0.5, 0.7), w: W4 * 0.7, lean: H3 * R6.range(0.4, 0.6), back: !0, delay: R6.range(0.02, 0.05), jag: R6.chance(0.5) ? R6.range(0.35, 0.6) : -1 },
        { dx: 0, h: H3, w: W4, lean, back: !1, delay: 0, jag: R6.chance(0.7) ? R6.range(0.32, 0.58) : -1, main: !0 }
      ];
      H3 > 14 && list.push({ dx: -W4 * R6.range(0.35, 0.55), h: H3 * R6.range(0.24, 0.4), w: W4 * 0.55, lean: -H3 * R6.range(0, 0.12), back: !1, delay: R6.range(0.03, 0.07), jag: -1 }), clusters.push({ x, q, H: H3, W: W4, blades: list, main: list[1], t0: reachedAt(x) + 0.012, up: !1 });
    }
    let crest = clusters.reduce((a, c) => c.H > a.H ? c : a, clusters[0]), t = 0, broke = !1, trembled = !1, pose = (c, b) => {
      let g = ease.outBack(clamp((t - c.t0 - b.delay) / 0.09), 2.2), x = c.x + b.dx;
      return { g, x, tx: x + b.lean * g, ty: -b.h * g, white: t - c.t0 - b.delay < 0.03 || t >= FLASH2 && t < SHATTER };
    }, drawClusters = (p) => {
      if (!(t >= SHATTER))
        for (let pass of [0, 1, 2])
          for (let c of clusters) {
            if (t < c.t0) continue;
            let jx = t >= TREMBLE2 && t < FLASH2 && (Math.floor(t * 40) + Math.round(c.x)) % 2 ? 1 : 0;
            for (let b of c.blades) {
              if (pass === 0 !== b.back || pass === 1 != !!b.main) continue;
              let s = pose(c, b);
              if (s.g <= 0) continue;
              let gl = (t - SHIMMER - c.q * 0.34) / 0.2;
              blade2(p, s.x + jx, 0, s.tx + jx, s.ty, b.w, C, { white: s.white, jag: b.jag, dim: b.back ? 1 : 0, glint: gl >= 0 && gl <= 1 ? gl : -1 });
            }
            if (pass === 2) {
              let pop = clamp(1 - (t - c.t0) / 0.15), wh = t >= FLASH2;
              p.glow(c.x + c.main.lean * 0.4, -c.H * 0.45, c.H * 0.9 + 10, C[4], (0.16 + 0.42 * pop + (wh ? 0.4 : 0)) * (0.85 + 0.15 * Math.sin(t * 3 + c.x))), pop > 0 && p.glow(c.x, -2, 14, WHITE, 0.55 * pop);
            }
          }
    }, drawFrost = (p) => {
      let fr = front(t);
      for (let x = -3; x <= Math.min(fr, REACH2 + 6); x++) {
        let q = clamp(x / REACH2), age = t - reachedAt(Math.max(0, x)), a = 1 - smooth(MELT2 + q * 0.35, MELT2 + q * 0.35 + 0.6, t);
        if (a <= 0 || age < 0) continue;
        let h = rand(x, 17), grow = smooth(0, 0.3, age), head4 = fr - x < 3 && fr < REACH2;
        p.dot(x, 0, head4 || age < 0.06 || h < 0.3 ? WHITE : C[6], a);
        let L = h < 0.45 ? Math.round(grow * (1 + rand(x, 5) * 2.6)) : 0;
        for (let j = 1; j <= L; j++) p.dot(x, -j, j === L ? WHITE : C[5], a);
        L > 1 && rand(x, 9) < 0.5 && p.dot(x + 1, -L + 1, C[6], a);
        let D25 = grow * (2 + rand(x, 11) * 4) * (1 - q * 0.3);
        for (let j = 1; j <= D25; j++) p.dot(x, j, rand(x * 31 + j, 7) < 0.06 ? WHITE : j < 2 ? C[5] : j < 4 ? C[4] : C[3], a * (1.1 - j / (D25 + 1)));
        head4 && p.dot(x, -1, WHITE);
      }
      fr < REACH2 && t > START && (p.glow(fr, -2, 16, C[6], 0.6), p.glow(fr, -1, 7, WHITE, 0.6));
    }, breakBlade = (c, b) => {
      let s = pose(c, b), ax = s.tx - s.x, ay = s.ty, L = Math.hypot(ax, ay) || 1, nx = -ay / L, ny = ax / L, hw = b.w / 2, tri = [[s.x - nx * hw, -ny * hw], [s.tx, s.ty], [s.x + nx * hw, ny * hw]], ang = Math.atan2(ay, ax) + Math.PI / 2, parts = [tri];
      b.h > 9 && (parts = parts.flatMap((poly) => splitPoly(poly, s.x + ax * 0.4, ay * 0.4, ang))), b.h > 22 && (parts = parts.flatMap((poly) => poly.some(([, y]) => y < ay * 0.5) ? splitPoly(poly, s.x + ax * 0.72, ay * 0.72, ang) : [poly]));
      for (let part of parts) {
        let mx = 0, my = 0;
        for (let [x, y] of part) mx += x, my += y;
        mx /= part.length, my /= part.length;
        let up = clamp(-my / 40);
        panes.add({
          pts: part.map(([x, y]) => [x - mx, y - my]),
          x: mx,
          y: my,
          vx: R6.range(-25, 60),
          vy: -R6.range(40, 130) * (0.5 + up),
          a: 0,
          va: R6.range(-8, 8),
          f: R6.range(-0.7, 0.7),
          vf: R6.range(-6, 6),
          lit: b.back ? 0.45 : 0.75,
          g: 0.9,
          drag: 0.6,
          bounce: 0.3,
          solid: !0,
          ridge: Math.atan2(ay, ax),
          brittle: b.h > 30 ? 2 : 1,
          crumble: R6.range(0.12, 0.4),
          life: R6.range(1, 1.4)
        });
      }
      for (let i = 0; i < 2 + b.h / 7; i++) {
        let u = R6.next();
        bits.add({ kind: R6.chance(0.15) ? B.CHUNK : B.SHARD, x: s.x + ax * u + R6.range(-1.5, 1.5), y: ay * u, vx: R6.range(-60, 90), vy: -R6.range(60, 230), g: 0.9, drag: 0.6, bounce: 0.3, life: R6.range(0.7, 1.3), a: R6.range(0, TAU), va: R6.range(-20, 20), s: R6.range(1.2, 3.2), c: C[R6.int(4, 7)], ramp: [C[1], C[3], C[4], C[6], C[7]] });
      }
    };
    return {
      update(dt) {
        if (t += dt, t - dt <= START && t > START) {
          for (let i = 0; i < 4; i++) ps.spawn(P.VAPOUR, R6.range(0, 6), -R6.range(0, 3), R6.range(10, 60), -R6.range(2, 12), R6.range(0.4, 0.7), C[6], R6.range(2, 3.2));
          lights.add(4, -4, 26, C[5], 0.6, 0.25);
        }
        let fr = front(t);
        t > START && fr < REACH2 - 1 && (R6.chance(0.5) && ps.spawn(P.STREAK, fr - R6.range(4, 12), -R6.range(1, 3), R6.range(40, 80), -R6.range(0, 6), R6.range(0.08, 0.14), R6.chance(0.5) ? C[6] : WHITE), R6.chance(0.3) && ps.spawn(P.FLAKE, fr, -1, R6.range(10, 50), -R6.range(20, 70), R6.range(0.5, 0.9), R6.chance(0.5) ? WHITE : C[6], R6.range(0.5, 1.2)), R6.chance(0.12) && ps.spawn(P.VAPOUR, fr, -R6.range(0, 3), R6.range(20, 60), -R6.range(2, 10), R6.range(0.4, 0.7), C[6], R6.range(1.6, 2.8)));
        for (let c of clusters) {
          if (c.up || t < c.t0) continue;
          c.up = !0;
          let big = c === crest, n = 3 + Math.round(c.H / 8);
          for (let i = 0; i < n; i++) {
            let a = -Math.PI / 2 + R6.range(-1.1, 1), sp = R6.range(60, 190) * (0.45 + c.H / 44);
            bits.add({ kind: B.SHARD, x: c.x + R6.range(-3, 3), y: -1, vx: Math.cos(a) * sp + 25, vy: Math.sin(a) * sp, g: 0.8, drag: 0.6, bounce: 0.3, life: R6.range(0.6, 1.1), a: R6.range(0, TAU), va: R6.range(-18, 18), s: R6.range(1.2, 3), c: C[R6.int(5, 7)] });
          }
          ps.spawn(P.VAPOUR, c.x, -1, R6.range(-10, 40), -R6.range(2, 10), R6.range(0.5, 0.9), C[6], R6.range(2.2, 3.4) * (0.6 + c.H / 60));
          for (let i = 0; i < 2; i++) ps.spawn(P.FLAKE, c.x + R6.range(-4, 4), -R6.range(2, c.H * 0.5), R6.range(-20, 40), -R6.range(20, 60), R6.range(0.6, 1.1), R6.chance(0.5) ? WHITE : C[6], R6.range(0.5, 1.3));
          if (c.H > 16 && ps.spawn(P.STAR, c.x + c.main.lean, -c.H * 0.96, 0, -4, R6.range(0.3, 0.5), WHITE, R6.range(1.4, 2.6), 0.08), lights.add(c.x, -c.H * 0.4, 16 + c.H * 0.6, C[5], 0.5, 0.18), big) {
            lights.add(c.x, -c.H * 0.5, 54, WHITE, 0.5, 0.14);
            for (let i = 0; i < 4; i++) ps.spawn(P.VAPOUR, c.x + R6.range(-6, 6), -R6.range(0, 4), R6.range(-40, 60), -R6.range(4, 16), R6.range(0.6, 1), C[6], R6.range(3, 4.5));
          }
        }
        if (t > START + RUN && t < TREMBLE2 && R6.chance(0.09)) {
          let c = R6.pick(clusters), b = R6.pick(c.blades), s = pose(c, b), u = R6.range(0.3, 0.95);
          ps.spawn(P.STAR, s.x + (s.tx - s.x) * u, s.ty * u, 0, -3, R6.range(0.25, 0.5), R6.chance(0.6) ? WHITE : C[6], R6.range(0.6, 2));
        }
        if (!trembled && t >= TREMBLE2) {
          trembled = !0;
          for (let c of clusters)
            for (let i = 0; i < 2; i++) bits.add({ kind: B.SHARD, x: c.x + R6.range(-4, 4), y: -R6.range(4, c.H * 0.8), vx: R6.range(-20, 20), vy: -R6.range(0, 30), g: 0.8, drag: 0.5, bounce: 0.3, life: R6.range(0.3, 0.6), a: R6.range(0, TAU), va: R6.range(-18, 18), s: R6.range(1, 1.8), c: C[R6.int(5, 7)] });
        }
        if (!broke && t >= SHATTER) {
          broke = !0;
          for (let c of clusters) {
            for (let b of c.blades) breakBlade(c, b);
            for (let i = 0; i < 2; i++) ps.spawn(P.VAPOUR, c.x + R6.range(-6, 6), -R6.range(1, 8), R6.range(-30, 50), -R6.range(4, 18), R6.range(0.6, 1.1), C[6], R6.range(2.4, 4) * (0.7 + c.H / 60));
            R6.chance(0.7) && ps.spawn(P.STAR, c.x + R6.range(-6, 6), -R6.range(4, c.H), R6.range(-10, 10), -R6.range(6, 20), R6.range(0.4, 0.8), R6.chance(0.5) ? WHITE : C[6], R6.range(1, 2.2));
            for (let i = 0; i < 2; i++) ps.spawn(P.FLAKE, c.x + R6.range(-6, 6), -R6.range(4, c.H), R6.range(-30, 60), -R6.range(30, 90), R6.range(0.9, 1.5), R6.chance(0.6) ? WHITE : C[6], R6.range(0.5, 1.5));
            lights.add(c.x, -c.H * 0.5, 22 + c.H, WHITE, 0.45, 0.12);
          }
          for (let i = 0; i < 5; i++) lights.add(REACH2 * (i + 0.5) / 5, -18, 40, C[4], 0.4, 0.5);
        }
        if (broke && t < SHATTER + 0.8 && R6.chance(0.1) && bits.list.length) {
          let b = R6.pick(bits.list);
          ps.spawn(P.STAR, b.x, b.y - 1, 0, -3, R6.range(0.2, 0.4), R6.chance(0.5) ? WHITE : C[6], R6.range(0.6, 1.5));
        }
        ps.update(dt), bits.update(dt), panes.update(dt), lights.update(dt), endBy(t, meta37.duration, ps, bits, panes);
      },
      drawBack(p) {
        drawFrost(p), ps.draw(p, "back");
      },
      draw(p) {
        drawClusters(p);
        let k = (1 - smooth(MELT2, MELT2 + 0.9, t)) * smooth(START, START + 0.3, t), fr = front(t);
        for (let i = 0; i < 6; i++) p.glow(fr * (i + 0.5) / 6, -3, 26, C[4], 0.15 * k);
        if (t >= FLASH2 && t < SHATTER + 0.1) for (let c of clusters) sparkle(p, c.x + c.main.lean, -c.H, 6 * (1 - clamp((t - FLASH2) / 0.16)), C[6], C[4], 0.4);
        panes.draw(p, C), bits.draw(p), ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta37, START, RUN, SHIMMER, TREMBLE2, FLASH2, SHATTER, MELT2, init_ice_spikes = __esm({
    "src/fx/ice/ice-spikes.js"() {
      init_core();
      init_lib5();
      meta37 = {
        name: "Ice spikes",
        desc: "A frost line races along the floor and clusters of jagged ice blades burst up behind it in a rising wave, glint, flash white together and shatter into toppling shards.",
        tags: ["ice", "spikes", "ground", "wave", "directional", "magic", "one-shot"],
        size: [264, 112],
        origin: [24, 96],
        duration: 3,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], reach: 172, height: 56, seed: 3 }
      }, START = 0.04, RUN = 0.44, SHIMMER = 0.74, TREMBLE2 = 1.2, FLASH2 = 1.36, SHATTER = 1.42, MELT2 = 1.75;
    }
  });

  // src/fx/ice/blizzard-vortex.js
  var blizzard_vortex_exports = {};
  __export(blizzard_vortex_exports, {
    draw: () => draw14,
    drawBack: () => drawBack4,
    meta: () => meta38
  });
  function streaks(p, C, t, o, front) {
    let D25 = meta38.duration, H3 = o.height, ph = t / D25;
    cycle(t, D25, 58, o.seed + 9, (g) => g.range(0.5, 0.9), (age, life, r) => {
      let h0 = r.range(2, H3), w = r.range(8, 12) * (1.45 - h0 / H3), th = r.range(0, TAU) + age * w, k = age / life, fade = Math.min(1, age / 0.08) * (k > 0.7 ? (1 - k) / 0.3 : 1), L = r.range(0.7, 1.5), m = Math.ceil(L / 0.07);
      for (let j = 0; j <= m; j++) {
        let a = th - j * 0.07, s = Math.sin(a);
        if (s >= 0 !== front) continue;
        let h = Math.min(H3 + 4, h0 + age * 16 - j * 0.25), R6 = radius(Math.min(h, H3), H3) * (1 + Math.min(0.3, Math.max(0, h - H3 * 0.84) * 0.03)), u = j / m, x = axis(Math.min(h, H3), H3, ph) + Math.cos(a) * R6, y = -h + s * R6 * TILT, c = front ? u < 0.15 ? WHITE : u < 0.5 ? C[6] : C[5] : u < 0.3 ? C[5] : u < 0.6 ? C[4] : C[3];
        p.dot(x, y, c, fade * (u < 0.6 ? 1 : 1.5 - u * 1.2) * (front ? 1 : 0.85));
      }
    });
  }
  function body(p, C, ph, H3) {
    p.each(-44, -H3 - 6, 44, 2, (x, y, sx, sy) => {
      let h = -y;
      if (h < 0 || h > H3 + 4) return;
      let R6 = radius(h, H3), dx = x - axis(h, H3, ph), u = dx / R6;
      if (u * u >= 1) return;
      let k = h / H3, rim = Math.pow(Math.abs(u), 3), swirl2 = Math.sin(Math.asin(u) * 3 - TAU * ph * 2 + h * 0.2) * 0.5 + 0.5, a = (0.07 + 0.24 * rim + 0.12 * swirl2) * clamp((1 - Math.abs(u)) / 0.18) * (k > 0.7 ? Math.max(0, (1 - k) / 0.3) : 1) * (h < 4 ? h / 4 : 1);
      a < 0.03 || (p.blendPx(sx, sy, rim > 0.5 ? C[6] : swirl2 > 0.6 ? C[5] : C[4], a), (rim > 0.3 || swirl2 > 0.75) && p.add(sx, sy, C[5], 0.16 * Math.max(rim, swirl2 - 0.5) * (1 - k * 0.5)));
    });
  }
  function orbiters(p, C, t, o, front) {
    let D25 = meta38.duration, H3 = o.height, ph = t / D25;
    cycle(t, D25, 76, o.seed, (g) => g.range(0.9, 1.6), (age, life, r, i) => {
      let h0 = r.range(0, H3 * 0.6), h = h0 + age * r.range(14, 30), k = age / life;
      if (h > H3 + 8) return;
      let w = r.range(7, 11) * (1.5 - h / H3), th = r.range(0, TAU) + age * w, out = 1 + r.range(0.05, 0.3) + Math.min(0.35, Math.max(0, h - H3 * 0.82) * 0.04), R6 = radius(Math.min(h, H3), H3) * out, s = Math.sin(th);
      if (s >= 0 !== front) return;
      let x = axis(Math.min(h, H3), H3, ph) + Math.cos(th) * R6, y = -h + s * R6 * TILT, big = i % 5 === 0, fade = Math.min(1, age / 0.1) * (k > 0.8 ? (1 - k) / 0.2 : 1);
      if (fade <= 0) return;
      let th2 = th - 0.25, x2 = axis(Math.min(h, H3), H3, ph) + Math.cos(th2) * R6, y2 = -h + 2 + Math.sin(th2) * R6 * TILT;
      if (front) {
        if (p.line(x2, y2, x, y, (u) => u > 0.6 ? C[6] : C[4], (u) => u * fade), p.dot(x, y, big ? WHITE : r.chance(0.5) ? WHITE : C[6], fade), big) {
          for (let [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.dot(x + dx, y + dy, C[6], fade);
          p.glow(x, y, 5, C[5], 0.35 * fade);
        }
      } else
        p.line(x2, y2, x, y, C[3], (u) => u * fade * 0.8), p.dot(x, y, big ? C[5] : C[4], fade);
    });
  }
  function foot(p, C, t, o, front) {
    let D25 = meta38.duration, ph = t / D25;
    cycle(t, D25, 12, o.seed + 5, (g) => g.range(0.8, 1.2), (age, life, r) => {
      let th = r.range(0, TAU) + age * r.range(4, 6), R6 = 9 + age * r.range(8, 16), s = Math.sin(th), k = age / life;
      if (s >= 0 !== front) return;
      let x = axis(0, 1, ph) + Math.cos(th) * R6, y = -2 - age * r.range(4, 10) + s * R6 * 0.2, rad = 2 + 4 * k, a = 0.5 * (1 - k) ** 1.2 * Math.min(1, age / 0.1);
      p.disc(x, y, rad, front ? C[6] : C[5], (d) => a * (1 - d * d)), p.disc(x - rad * 0.25, y - rad * 0.3, rad * 0.5, WHITE, (d) => a * 0.5 * (1 - d * d) * (1 - k));
    });
  }
  function drawBack4(p, t, o) {
    let C = fit(o.palette, 8), H3 = o.height, ph = t / meta38.duration;
    for (let x = -30; x <= 30; x++) {
      let d = Math.abs(x) / 30, hgt = Math.round((1 - d * d) * (1.5 + rand(x, 3) * 1.5));
      for (let j = 0; j < hgt; j++) p.px(x, -j, j === hgt - 1 ? WHITE : C[5]);
      p.dot(x, 0, C[6], 1 - d * 0.5), p.dot(x, 1, C[4], 0.8 - d * 0.6);
    }
    p.glow(0, -2, 40, C[4], 0.22), foot(p, C, t, o, !1), streaks(p, C, t, o, !1), orbiters(p, C, t, o, !1);
  }
  function draw14(p, t, o) {
    let C = fit(o.palette, 8), H3 = o.height, ph = t / meta38.duration;
    body(p, C, ph, H3), p.glow(axis(H3 * 0.45, H3, ph), -H3 * 0.45, 40, C[4], 0.3), p.glow(axis(H3 * 0.15, H3, ph), -H3 * 0.15, 18, C[5], 0.4 + 0.1 * Math.sin(TAU * ph * 4)), p.glow(axis(H3 * 0.05, H3, ph), -3, 10, WHITE, 0.3), streaks(p, C, t, o, !0), orbiters(p, C, t, o, !0), foot(p, C, t, o, !0), cycle(t, meta38.duration, 10, o.seed + 3, (g) => g.range(0.9, 1.3), (age, life, r) => {
      let th = r.range(0, TAU), R6 = radius(H3, H3) * (0.6 + age * 0.9), k = age / life, rad = 3 + 6 * k, Rc = Math.min(R6, 36), x = axis(H3, H3, ph) + Math.cos(th) * Rc, y = -H3 - 2 - age * 4 + Math.sin(th) * Rc * TILT, a = 0.24 * (1 - k) * Math.min(1, age / 0.15);
      p.disc(x, y, rad * 0.8, C[6], (d) => a * (1 - d * d)), p.glow(x, y, rad * 1.5, C[4], 0.08 * (1 - k));
    });
  }
  var meta38, TILT, radius, axis, init_blizzard_vortex = __esm({
    "src/fx/ice/blizzard-vortex.js"() {
      init_core();
      meta38 = {
        name: "Blizzard vortex",
        desc: "A swirling snow tornado: wind bands spin up a leaning funnel, flakes and ice crystals orbit in front and behind, snow boils at its foot and cold light fills its throat.",
        tags: ["ice", "snow", "blizzard", "tornado", "vortex", "wind", "loop"],
        size: [128, 116],
        origin: [64, 102],
        duration: 2,
        loop: !0,
        fps: 30,
        bg: "ground",
        options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], height: 80, seed: 17 }
      }, TILT = 0.24, radius = (h, H3) => 4 + 28 * Math.pow(clamp(h / H3), 1.35), axis = (h, H3, ph) => (5 * Math.sin(TAU * ph + h * 0.05) + 1.5 * Math.sin(TAU * ph * 2 - h * 0.11)) * (h / H3) - 2 * (h / H3);
    }
  });

  // src/fx/lightning/_lib.js
  function zigzag(R6, x0, y0, x1, y1, jag = 0.32, forks2 = 0.35, w = 1, depth = 0) {
    let out = { paths: [] }, L = Math.hypot(x1 - x0, y1 - y0), pts = [[x0, y0], [x1, y1]], off2 = L * jag;
    for (; pts.length < 2 + L / 3; ) {
      let nxt = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        let [ax, ay] = pts[i], [bx, by] = pts[i + 1], l = Math.hypot(bx - ax, by - ay) || 1, o = R6.range(-off2, off2);
        nxt.push([(ax + bx) / 2 + -(by - ay) / l * o, (ay + by) / 2 + (bx - ax) / l * o], [bx, by]);
      }
      pts = nxt, off2 *= 0.52;
    }
    if (out.paths.push({ pts, w }), depth < 2) {
      for (let i = 2; i < pts.length - 3; i++)
        if (R6.chance(forks2 / (1 + depth) / Math.max(4, pts.length / 6))) {
          let [ax, ay] = pts[i], [bx, by] = pts[Math.min(pts.length - 1, i + 3)], a = Math.atan2(by - ay, bx - ax) + R6.sign() * R6.range(0.35, 0.9), l = (L - i / pts.length * L) * R6.range(0.25, 0.55);
          out.paths.push(...zigzag(R6, ax, ay, ax + Math.cos(a) * l, ay + Math.sin(a) * l, jag * 1.1, forks2, w * 0.55, depth + 1).paths);
        }
    }
    return out;
  }
  function bowed(R6, x0, y0, x1, y1, bow, jag = 0.22, forks2 = 0.4) {
    let L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L, mx = (x0 + x1) / 2 + nx * bow + R6.range(-2, 2), my = (y0 + y1) / 2 + ny * bow, a = zigzag(R6, x0, y0, mx, my, jag, forks2), b = zigzag(R6, mx, my, x1, y1, jag, forks2);
    return { paths: [{ pts: [...a.paths[0].pts, ...b.paths[0].pts.slice(1)], w: 1 }, ...a.paths.slice(1), ...b.paths.slice(1)] };
  }
  function bend(b, fn) {
    return { paths: b.paths.map((q) => ({ w: q.w, pts: q.pts.map(([x, y]) => fn(x, y)) })) };
  }
  function mark(x, y, lvl) {
    let X = Math.floor(x) + HALF, Y3 = Math.floor(y) + HALF;
    if (X < 0 || Y3 < 0 || X >= N || Y3 >= N) return;
    let i = Y3 * N + X, v = GRID[i];
    v || HIT6.push(i), lvl > v && (GRID[i] = lvl);
  }
  function stamp(x, y, r, lvl) {
    if (r <= 0.5) return mark(Math.round(x), Math.round(y), lvl);
    let r2 = r * r;
    for (let py = Math.floor(y - r); py <= Math.ceil(y + r); py++) {
      let dy = py + 0.5 - y;
      for (let px = Math.floor(x - r); px <= Math.ceil(x + r); px++) {
        let dx = px + 0.5 - x;
        dx * dx + dy * dy <= r2 && mark(px, py, lvl);
      }
    }
  }
  function flush(p, cols, alphas) {
    for (let i of HIT6) {
      let v = GRID[i];
      GRID[i] = 0;
      let x = i % N - HALF, y = (i / N | 0) - HALF, a = alphas ? alphas[v - 1] : 1;
      a >= 1 ? p.px(x, y, cols[v - 1]) : a > 0 && p.dot(x, y, cols[v - 1], a);
    }
    HIT6.length = 0;
  }
  function stroke(p, b, k, C, s = 1, o = {}) {
    if (k <= 0.02) return;
    let lk = o.light ?? 0.5;
    for (let q of b.paths) {
      let trunk = q.w >= 1;
      if (!trunk && k < 0.5) continue;
      let rh = (trunk ? k > 0.6 ? 2.1 : 1.6 : 1.1) * s, rb = (trunk ? k > 0.6 ? 1.3 : 0.8 : 0.5) * s, pts = o.upTo !== void 0 && trunk ? q.pts.slice(0, Math.max(2, Math.ceil(q.pts.length * o.upTo))) : q.pts;
      walk2(pts, (x, y) => {
        stamp(x, y, rh, 1), stamp(x, y, rb, trunk ? 3 : 2), trunk && k > 0.3 && (o.core ? stamp(x, y, o.core, 4) : mark(x, y, 4));
      });
      for (let i = 0; i < pts.length - 1; i += 3) (o.minY === void 0 || pts[i][1] > o.minY) && p.glow(pts[i][0], pts[i][1], (trunk ? 14 : 7) * s, C[4], lk * k * q.w);
    }
    let a = o.a ?? 1;
    flush(p, o.hero ? [C[3], C[6], C[7], C[7]] : [C[2], C[4], C[5], C[7]], [a, a, a, a]);
  }
  function crackle(p, b, k, C, glowK = 0.5, a = 1) {
    if (!(k <= 0.02)) {
      for (let q of b.paths) {
        let thick = q.w >= 1;
        walk2(q.pts, (x, y) => {
          if (k > 0.45 && thick) for (let [dx, dy] of CROSS3) mark(x + dx * 1.5, y + dy * 1.5, 1);
          k > 0.25 && (thick || q.w > 0.4) && (mark(x + 1, y, 2), mark(x, y + 1, 2)), mark(x, y, thick && k > 0.3 ? 4 : 3);
        });
        for (let i = 0; i < q.pts.length - 1; i += 3) p.glow(q.pts[i][0], q.pts[i][1], (thick ? 9 : 5) * (0.5 + k * 0.5), C[4], glowK * k * q.w);
      }
      flush(p, [C[3], C[5], C[5], C[7]], [Math.min(1, (k - 0.45) * 1.6) * a, a, a, a]);
    }
  }
  function trace2(p, pts, c, a = 1, from = 0, to = pts.length - 1) {
    for (let i = Math.max(0, from); i < Math.min(to, pts.length - 1); i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, a);
  }
  function scorch2(p, cx, cy, rx, T0, fade = 1, ry = Math.max(2.5, rx * 0.12)) {
    if (!(fade <= 0))
      for (let y = Math.floor(cy); y <= cy + ry; y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          let dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = Math.sqrt(dx * dx + dy * dy);
          if (d > 1) continue;
          let n = rand(x, y, 41), T2 = T0 * (1.25 - d) - n * 0.35;
          if (T2 > 0.06) {
            let c = FIRE_RAMP[Math.min(FIRE_RAMP.length - 1, Math.floor((1 - Math.min(1, T2)) * (FIRE_RAMP.length - 1)))];
            p.dot(x, y, c, fade), (x & 3) === 0 && p.glow(x + 0.5, y, 6, c, 0.18 * T2 * fade);
          } else p.dot(x, y, d < 0.5 ? SOOT6 : SOOT25, (d < 0.95 - n * 0.3 ? 1 : 1 - d) * fade);
        }
  }
  function flight(x, y, vx, vy, age, { g = 0.45, drag = 2.2, floor = 1 / 0, bounce = 0.45 } = {}) {
    let dt = 0.008333333333333333;
    for (let s = 0; s < age; s += dt) {
      let h = Math.min(dt, age - s);
      vy += GRAVITY * g * h, vx -= vx * drag * h, vy -= vy * drag * h;
      let ny = y + vy * h;
      x += vx * h, vy > 0 && y <= floor && ny >= floor ? (vy = -vy * bounce, vx *= 0.7, y = floor - 0.25) : y = ny;
    }
    return [x, y, vx, vy];
  }
  function spark2(p, x, y, vx, vy, k, S) {
    let sp = Math.hypot(vx, vy) || 1, ux = vx / sp, uy = vy / sp, head4 = k > 0.6 ? S[0] : k > 0.3 ? S[1] : S[2], len2 = Math.min(9, 1 + sp * 0.022);
    p.line(x - ux * len2, y - uy * len2, x - ux * len2 * 0.4, y - uy * len2 * 0.4, k > 0.5 ? head4 : S[S.length - 1]), p.line(x - ux * len2 * 0.45, y - uy * len2 * 0.45, x, y, head4), p.glow(x, y, 3, head4, 0.45 * k);
  }
  var VOLT, PLASMA, SOOT6, SOOT25, N, HALF, GRID, HIT6, walk2, CROSS3, heat, init_lib12 = __esm({
    "src/fx/lightning/_lib.js"() {
      init_core();
      VOLT = ["#120a33", "#2a1b78", "#4630c0", "#5a62f0", "#58a6ff", "#9ed8ff", "#e4f6ff", "#ffffff"], PLASMA = ["#ffffff", "#c8f8ff", "#7ff3ff", "#1ab8e6"], SOOT6 = hex("#110c16"), SOOT25 = hex("#1c1522");
      N = 1024, HALF = 512, GRID = new Uint8Array(N * N), HIT6 = [];
      walk2 = (pts, fn) => {
        for (let i = 0; i < pts.length - 1; i++) {
          let [ax, ay] = pts[i], [bx, by] = pts[i + 1], l = Math.max(1, Math.hypot(bx - ax, by - ay));
          for (let d = 0; d <= l; d += 0.5) fn(ax + (bx - ax) * d / l, ay + (by - ay) * d / l, i);
        }
      };
      CROSS3 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      heat = (T2) => T2 > 0.06 ? FIRE_RAMP[Math.min(FIRE_RAMP.length - 1, Math.floor((1 - Math.min(1, T2)) * (FIRE_RAMP.length - 1)))] : 0;
    }
  });

  // src/fx/lightning/lightning-strike.js
  var lightning_strike_exports = {};
  __export(lightning_strike_exports, {
    create: () => create25,
    meta: () => meta39
  });
  function cracks2(R6) {
    let out = [], grow = (x, y, a, len2, w, d, depth) => {
      let pts = [[x, y, d]];
      for (let s = 0; s < len2; s += 1.5)
        a += R6.range(-0.32, 0.32), x += Math.cos(a) * 1.5, y = clamp(y + Math.sin(a) * 0.45, 0, 5), d += 1.5, pts.push([x, y, d]), depth < 2 && s > 3 && R6.chance(0.09) && grow(x, y, a + R6.sign() * R6.range(0.5, 1.2), (len2 - s) * R6.range(0.3, 0.6), w * 0.6, d, depth + 1);
      out.push({ pts, w });
    };
    for (let i = 0; i < 6; i++) grow(R6.range(-1, 1), R6.range(0, 1), i % 2 ? R6.range(-0.5, 0.7) : Math.PI + R6.range(-0.7, 0.5), REACH * R6.range(0.55, 1), 1, 0, 0);
    return out;
  }
  function sigil(p, t, C, k, near2) {
    let reveal = clamp(t / 0.22), spin = t * 0.8, burnt = t > S1 ? t - S1 : -1;
    if (burnt > 0.45) return;
    let a0 = burnt < 0 || burnt < 0.07 ? 1 : 1 - (burnt - 0.07) / 0.38, hot = burnt >= 0 && burnt < 0.07, on2 = (a) => Math.sin(a) >= 0 === near2, from = (a) => Math.abs(((a - Math.PI / 2) % TAU + TAU + Math.PI) % TAU - Math.PI) / Math.PI;
    for (let i = 0; i < 22; i++) {
      let a = i / 22 * TAU + spin;
      if (!(!on2(a) || from(a) > reveal)) {
        for (let da of [0, 0.06, 0.12]) {
          let x = Math.cos(a + da) * RX, y = Math.sin(a + da) * RX * SY5;
          p.dot(x, y, hot ? WHITE : near2 ? k > 0.7 ? C[6] : C[5] : k > 0.7 ? C[4] : C[3], a0), near2 && p.dot(x, y + 1, hot ? C[6] : C[2], a0);
        }
        i % 3 === 0 && p.glow(Math.cos(a) * RX, Math.sin(a) * RX * SY5, 5, C[4], 0.3 * k * a0);
      }
    }
    for (let j = 0; j < 4; j++) {
      let a = spin * -0.5 + j * TAU / 4 + Math.PI / 4;
      !on2(a) || reveal < 1 || p.line(Math.cos(a) * (RX - 5), Math.sin(a) * (RX - 5) * SY5, Math.cos(a) * (RX + 5), Math.sin(a) * (RX + 5) * SY5, hot ? WHITE : near2 ? C[6] : C[4], a0);
    }
    if (t > 0.3)
      for (let a = 0; a < TAU; a += 0.09)
        on2(a) && p.dot(Math.cos(a) * 14, Math.sin(a) * 14 * SY5, hot ? WHITE : near2 ? C[4] : C[2], a0 * clamp((t - 0.3) / 0.12));
    if (near2 && burnt < 0) {
      let pulse2 = 0.6 + 0.4 * Math.sin(t * (10 + 30 * k));
      p.px(0, 0, k > 0.5 ? WHITE : C[6]);
      for (let [dx, dy] of [[1, 0], [-1, 0], [0, -1]]) p.px(dx, dy, C[5]);
      p.glow(0, -1, 10 + 10 * k, C[5], 0.3 + 0.4 * k * pulse2);
    }
  }
  function keep(b) {
    let paths = [];
    for (let q of b.paths) {
      let pts = [];
      for (let pt of q.pts) {
        if (Math.abs(pt[0]) > W3 - 5 || pt[1] > -3 || pt[1] < TOP5 + 6) break;
        pts.push(pt);
      }
      (q.w >= 1 || pts.length > 3) && paths.push({ w: q.w, pts: q.w >= 1 ? q.pts : pts });
    }
    return { paths };
  }
  function create25(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: o.sparks }), hot = new Particles({ rng: R6, ground: floor }), lights = new Lights(), X0 = R6.range(8, 18) * (R6.chance(0.5) ? 1 : -1), main = keep(zigzag(R6, X0, TOP5, 0, -1, 0.17, 0.5)), trunk = main.paths[0].pts, drift2 = (dx) => (x, y) => [x + dx * Math.sin(Math.PI * y / TOP5), y], bolts = [main, bend({ paths: [{ pts: trunk, w: 1 }] }, drift2(1.5)), bend({ paths: [{ pts: trunk, w: 1 }] }, drift2(3))], chan = (i) => bolts[i].paths[0].pts, last = STROKES[STROKES.length - 1], end = chan(STROKES.length - 1), tree = cracks2(R6), gone = end.map(([, y], i) => last.t + 0.25 + 0.75 * (0.55 * rand(o.seed, i, 5) + 0.45 * (1 - y / TOP5))), t = 0, struck = -1, now = () => {
      for (let i = STROKES.length - 1; i >= 0; i--) if (t >= STROKES[i].t) return { i, s: STROKES[i], a: t - STROKES[i].t, k: level(t - STROKES[i].t) * STROKES[i].k };
      return null;
    }, charge = () => clamp(t / S1) ** 1.5, heatAt = () => struck < 0 ? 0 : Math.max(...STROKES.slice(0, struck + 1).map((s) => s.k * Math.pow(clamp(1 - (t - s.t) / 1.6), 1.4)));
    return {
      update(dt) {
        t += dt;
        for (let [i, s] of STROKES.entries()) {
          if (struck >= i || t < s.t) continue;
          struck = i;
          let k = s.k;
          lights.add(0, -50, 120, C[4], 0.55 * k, 0.4), lights.add(0, -3, 24, WHITE, 0.5 * k, 0.1);
          for (let j = 0; j < Math.round(44 * k); j++) {
            let a = -Math.PI / 2 + R6.range(-1.3, 1.3), sp = R6.range(110, 320) * (0.65 + 0.35 * k);
            ps.spawn(P.SPARK, R6.range(-1.5, 1.5), -2, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.2, 0.55));
          }
          for (let j = 0; j < Math.round(12 * k); j++) {
            let a = -Math.PI / 2 + R6.range(-1.2, 1.2), sp = R6.range(70, 220);
            hot.spawn(P.SPARK, R6.range(-2, 2), -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.5, 1));
          }
          for (let j = 0; j < Math.round(5 * k); j++) hot.spawn(P.EMBER, R6.range(-4, 4), -2, R6.range(-25, 25), -R6.range(30, 80), R6.range(0.8, 1.5));
          for (let j = 0; j < Math.round(18 * k); j++) {
            let a = -Math.PI / 2 + R6.range(-1.1, 1.1), sp = R6.range(50, 190);
            ps.spawn(P.GRIT, R6.range(-3, 3), -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(1, 1.5), R6.pick(STONE), R6.chance(0.35) ? 2 : 1);
          }
          for (let j = 0; j < 8; j++) ps.spawn(P.DUST, R6.range(-3, 3), -1, R6.sign() * R6.range(30, 110), -R6.range(4, 24), R6.range(0.4, 0.8), DUST2, R6.range(1.5, 3));
          for (let j = 0; j < Math.round(4 * k); j++) ps.spawn(P.SMOKE, R6.range(-8, 8), -4, R6.range(-10, 10), -R6.range(10, 25), R6.range(1.1, 1.6), mix(ASH3, C[2], 0.3), R6.range(3, 6), R6.range(0.05, 0.25));
        }
        struck >= 0 && t < 1.7 && R6.chance(6 * dt) && ps.spawn(P.SMOKE, R6.range(-8, 8), -2, R6.range(-4, 4), -R6.range(9, 17), R6.range(1, 1.3), 0, R6.range(2, 3.5));
        for (let i = 0; i < gone.length - 1; i++)
          if (gone[i] <= t && gone[i] > t - dt && rand(o.seed, i, 6) < 0.5) {
            let [x, y] = end[i];
            ps.spawn(P.MOTE, x, y, R6.range(-8, 8), R6.range(6, 22), R6.range(0.4, 0.8), R6.chance(0.5) ? C[5] : C[4], R6.range(0.5, 0.9));
          }
        ps.update(dt), hot.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let dark = 0.5 * smooth(0.46, 0.66, t) * (1 - smooth(S1 - 0.01, S1 + 0.02, t));
        if (dark > 0.01)
          for (let y = -228; y < 36; y++)
            for (let x = -W3; x < W3; x++) {
              let d = Math.hypot(x / W3, (y + 96) / 132), a = dark * (1 - smooth(0.55, 1, d));
              a > 0.01 && p.blend(x + 0.5, y + 0.5, NIGHT, a);
            }
        if (sigil(p, t, C, charge(), !1), struck >= 0) {
          let s = now(), front = REACH * ease.outCubic(clamp((t - S1) / 0.35)), T0 = heatAt(), fade = 1 - smooth(2.3, 2.95, t), elec = s.a < 0.14 ? s.s.k * (1 - s.a / 0.14) : 0;
          for (let br of tree)
            for (let [x, y, d] of br.pts) {
              if (d > front) break;
              let q = d / REACH, n = rand(Math.round(x * 2), Math.round(y * 2), 9), fresh = d > front - 6 && front < REACH, T2 = T0 * (1.15 - q) * (br.w < 1 ? 0.8 : 1) - n * 0.25, c = fresh || elec > 0.3 && n < 0.85 ? q < 0.5 ? WHITE : C[6] : heat(T2) || SOOT25;
              p.dot(x, y + 1, SOOT6, fade), p.dot(x, y, c, fade), br.w >= 1 && d < 9 && p.dot(x, y + 2, SOOT6, fade), (fresh || elec > 0.3) && (Math.round(d) & 3) === 0 ? p.glow(x, y, 7, C[5], 0.4) : T2 > 0.2 && (Math.round(d) & 3) === 0 && p.glow(x, y, 5, c, 0.2 * T2);
            }
          scorch2(p, 0, 0, 12, T0, fade), T0 > 0 && p.glow(0, -2, 34, heat(0.55), 0.3 * T0);
        }
        ps.draw(p, "back"), hot.draw(p, "back");
      },
      draw(p) {
        let s = now(), f = Math.floor(t * 30 + 1e-4), k = charge();
        if (sigil(p, t, C, k, !0), t > 0.15 && t < S1) {
          let r = rng(o.seed, 61, f);
          for (let i = 0; i < Math.round(1 + 4 * k); i++) {
            let a = r.range(0, TAU), x = Math.cos(a) * RX, y = Math.sin(a) * RX * SY5;
            crackle(p, zigzag(r, x, y, x + r.range(-2.5, 2.5), y - r.range(4, 9) * (0.6 + k), 0.45, 0.3), 0.45 + 0.4 * k, C, 0.3);
          }
          p.glow(0, -2, 36, C[4], 0.12 + 0.3 * k);
        }
        if (t >= LEAD0 && t < S1) {
          let u = clamp((t - LEAD0) / (S1 - LEAD0)), st = Math.min(STEPS, Math.floor(u * STEPS) + 1), fresh = 1 - u * STEPS % 1, reach = TOP5 + (MEET - TOP5) * Math.pow(st / STEPS, 1.2), prev = TOP5 + (MEET - TOP5) * Math.pow((st - 1) / STEPS, 1.2);
          for (let q of main.paths) {
            let tk = q.w >= 1;
            for (let i = 0; i < q.pts.length - 1; i++) {
              let [ax, ay] = q.pts[i], [bx, by] = q.pts[i + 1];
              if (by > reach) {
                ay <= reach && i > 0 && (p.px(ax, ay, WHITE), p.glow(ax, ay, 7, C[5], 0.5 * fresh + 0.15));
                break;
              }
              let young = by > prev;
              p.line(ax, ay, bx, by, young ? fresh > 0.4 ? tk ? C[6] : C[5] : C[4] : tk ? C[3] : C[2]), i % 4 === 0 && ay > TOP5 + 14 && p.glow(ax, ay, young ? 8 : 5, C[4], young ? 0.3 * fresh + 0.1 : 0.12);
            }
          }
          if (t > 0.62) {
            let h = -MEET * ease.outQuad((t - 0.62) / (S1 - 0.62)), r = rng(o.seed, 77, f), b = zigzag(r, 0, -1, r.range(-2, 2), -Math.max(3, h), 0.3, 0.3), tip = b.paths[0].pts.at(-1);
            crackle(p, b, 0.85, C, 0.45), p.px(tip[0], tip[1], WHITE), p.glow(tip[0], tip[1], 9, C[5], 0.5);
          }
        }
        let next = STROKES.find((q) => q.t > t);
        if (next && next !== STROKES[0] && t > next.t - 0.06) {
          let tr = chan(STROKES.indexOf(next)), u = (t - (next.t - 0.06)) / 0.06, i1 = Math.floor(u * tr.length);
          trace2(p, tr, C[3], 1), trace2(p, tr, C[6], 1, i1 - 18, i1);
          for (let i = Math.max(0, i1 - 18); i < Math.min(tr.length, i1); i += 4) tr[i][1] > TOP5 + 14 && p.glow(tr[i][0], tr[i][1], 9, C[4], 0.35);
        } else if (s && s.k > 0) {
          let hero = s.i === 0 && s.a < 0.03333333333333333;
          stroke(p, bolts[s.i], s.k, C, s.i === 0 ? 1.5 : 1.2, { hero, core: s.k > 0.6 ? hero ? 1.2 : 0.8 : 0, minY: TOP5 + 14 });
          let r = 4.5 * s.k;
          p.circle(0, -1, r + 1.5, C[2]), p.circle(0, -1, r + 0.5, C[5]), p.circle(0, -1, r * 0.65, WHITE), s.a < 0.07 && sparkle(p, 0, -2, Math.round(12 * s.k * (1 - s.a / 0.07)), C[6], C[4], 0.25), p.glow(0, -16, 96, C[3], 0.42 * s.k), p.glow(0, -3, 22, C[5], 0.3 * s.k), hero && p.glow(X0 * 0.5, -110, 170, C[3], 0.3);
        } else if (s) {
          let crumble = s.i === STROKES.length - 1, cool = clamp((s.a - 0.23) / 0.45), tr = chan(s.i);
          for (let i = 0; i < tr.length - 1; i++) {
            if (crumble && t >= gone[i]) continue;
            let h = crumble ? 1 - clamp((t - last.t - 0.23) / (gone[i] - last.t - 0.23)) : 1 - cool;
            p.line(tr[i][0], tr[i][1], tr[i + 1][0], tr[i + 1][1], h > 0.7 ? C[5] : h > 0.4 ? C[4] : h > 0.15 ? C[3] : C[2]), i % 6 === 0 && h > 0.3 && tr[i][1] > TOP5 + 14 && p.glow(tr[i][0], tr[i][1], 6, C[4], 0.15 * h);
          }
        }
        if (s && s.a < 0.4) {
          let r = rng(o.seed, 91, f), run = s.i === 0 ? REACH * ease.outCubic(clamp(s.a / 0.35)) : REACH * clamp(s.a / 0.22);
          for (let br of tree) {
            if (br.w < 1 || r.next() < 0.3) continue;
            let i1 = br.pts.findIndex(([, , d]) => d > run), j1 = i1 < 0 ? br.pts.length : i1, j0 = Math.max(0, j1 - r.int(7, 13)), pts = br.pts.slice(j0, j1).map(([x, y]) => [x + r.range(-0.6, 0.6), y - 1.5 - r.range(0, 2.5)]);
            pts.length > 1 && crackle(p, { paths: [{ pts, w: 1 }] }, 0.9 * (1 - s.a / 0.4) + 0.1, C, 0.35);
          }
        }
        ps.draw(p, "front"), hot.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta39, W3, TOP5, RX, SY5, REACH, LEAD0, STEPS, MEET, STROKES, FLICK, level, NIGHT, DUST2, ASH3, STONE, S1, init_lightning_strike = __esm({
    "src/fx/lightning/lightning-strike.js"() {
      init_core();
      init_lib12();
      meta39 = {
        name: "Lightning strike",
        desc: "A targeted strike: a sigil charges on the floor, the scene darkens, a thick bolt slams into it, arcs race out along the cracks it splits, the channel crumbles to a scorch.",
        tags: ["lightning", "electric", "strike", "spell", "target", "impact", "ground", "one-shot"],
        size: [240, 264],
        origin: [120, 228],
        duration: 3,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: VOLT, sparks: PLASMA, seed: 5 }
      }, W3 = 120, TOP5 = -224, RX = 28, SY5 = 0.22, REACH = 52, LEAD0 = 0.48, STEPS = 9, MEET = -30, STROKES = [{ t: 0.76, k: 1 }, { t: 1.04, k: 0.8 }, { t: 1.26, k: 0.55 }], FLICK = [1, 0.72, 0.3, 0.95, 0.5, 0.8, 0.22], level = (a) => a < 0 ? 0 : FLICK[Math.floor(a * 30 + 1e-4)] ?? 0, NIGHT = hex("#04030a"), DUST2 = hex("#6e6382"), ASH3 = hex("#5b5566"), STONE = ["#655b7a", "#4a4263", "#342d45"].map(hex), S1 = STROKES[0].t;
    }
  });

  // src/fx/lightning/chain-lightning.js
  var chain_lightning_exports = {};
  __export(chain_lightning_exports, {
    act: () => act14,
    create: () => create26,
    meta: () => meta40
  });
  function level2(i, t) {
    let a = t - on(i);
    if (a < 0) return 0;
    let hum = a < 0.1 ? [1, 0.55, 1][Math.floor(a * 30)] ?? 1 : 0.78 + 0.22 * Math.sin(t * 61 + i) * Math.sin(t * 23 + i * 2), b = t - off(i);
    return b < 0 ? hum : b < BREAK2 ? hum * (1 - b / BREAK2) * (Math.floor(b * 60) % 3 === 1 ? 0.5 : 1) : 0;
  }
  function create26(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: o.sparks }), hot = new Particles({ rng: R6, ground: floor }), lights = new Lights(), pts = [HAND, ...HOPS], hit = HOPS.map(() => !1), popped = HOPS.map(() => !1), ground = HOPS.map(([x]) => x + R6.range(-5, 5)), t = 0, shape2 = (i, f, salt = 0) => {
      let r = rng(o.seed, 31 + salt, i, f), [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0);
      return bowed(r, x0, y0, x1, y1, -L * r.range(0.05, 0.15), 0.2, 0.08);
    };
    return {
      update(dt) {
        if (t += dt, t < WIND3 && R6.chance(70 * dt)) {
          let a = R6.range(0, TAU), d = R6.range(10, 24), T2 = R6.range(0.06, 0.1), v = d * 3 / (Math.exp(3 * T2) - 1);
          ps.spawn(P.STREAK, HAND[0] + Math.cos(a) * d, HAND[1] + Math.sin(a) * d, -Math.cos(a) * v, -Math.sin(a) * v, T2, R6.chance(0.5) ? C[6] : C[5]);
        }
        for (let [i, [x, y]] of HOPS.entries()) {
          if (!hit[i] && t >= on(i)) {
            hit[i] = !0;
            let [px, py] = pts[i], dir = Math.atan2(y - py, x - px);
            lights.add(x, y, 56, C[4], 0.85, 0.22), lights.add(x, y, 16, WHITE, 0.7, 0.08), i === 0 && lights.add(HAND[0], HAND[1], 40, C[4], 0.6, 0.15);
            for (let j = 0; j < 18; j++) {
              let a = R6.chance(0.6) ? dir + R6.range(-1.1, 1.1) : R6.range(0, TAU), sp = R6.range(70, 230);
              ps.spawn(P.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, R6.range(0.15, 0.4));
            }
            for (let j = 0; j < 5; j++) hot.spawn(P.SPARK, x + R6.range(-2, 2), y + 2, R6.range(-50, 50), R6.range(-60, 20), R6.range(0.5, 0.9));
            ps.spawn(P.STAR, x + R6.range(-4, 4), y - R6.range(3, 7), 0, -6, R6.range(0.25, 0.4), C[6], R6.range(1.5, 2.5));
            for (let j = 0; j < 2; j++) ps.spawn(P.SMOKE, x + R6.range(-4, 4), y + R6.range(-2, 3), R6.range(-6, 6), -R6.range(8, 16), R6.range(0.7, 1), mix(ASH4, C[2], 0.35), R6.range(2, 3.5), R6.range(0.1, 0.25));
          }
          if (hit[i] && t < off(i)) {
            if (R6.chance(9 * dt)) {
              let u = R6.next(), [x0, y0] = pts[i];
              ps.spawn(P.SPARK, lerp(x0, x, u), lerp(y0, y, u) - 2, R6.range(-60, 60), R6.range(-90, 20), R6.range(0.1, 0.25));
            }
            R6.chance(7 * dt) && ps.spawn(P.SPARK, ground[i], -1, R6.range(-70, 70), -R6.range(40, 140), R6.range(0.12, 0.3)), R6.chance(2 * dt) && hot.spawn(P.SPARK, x + R6.range(-3, 3), y + 3, R6.range(-30, 30), R6.range(-30, 10), R6.range(0.5, 0.8));
          }
          if (!popped[i] && t >= off(i) + BREAK2) {
            popped[i] = !0;
            for (let j = 0; j < 7; j++) {
              let a = R6.range(0, TAU), sp = R6.range(40, 140);
              ps.spawn(P.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 30, R6.range(0.12, 0.3));
            }
            ps.spawn(P.SMOKE, x, y, R6.range(-4, 4), -R6.range(10, 16), R6.range(0.55, 0.7), mix(ASH4, C[2], 0.35), R6.range(2.5, 3.5)), lights.add(x, y, 30, C[4], 0.5, 0.12);
          }
        }
        ps.update(dt), hot.update(dt), lights.update(dt);
      },
      drawBack(p) {
        for (let [i] of HOPS.entries()) {
          let a = t - on(i);
          if (a < 0) continue;
          let T0 = Math.min(1, a / 0.2) * Math.pow(clamp(1 - (t - off(i)) / 0.7), 1.3) * 0.9;
          scorch2(p, ground[i], 0, 7, T0, 1 - smooth(1.35, 1.75, t));
        }
        ps.draw(p, "back"), hot.draw(p, "back");
      },
      draw(p) {
        let f = Math.floor(t * 30 + 1e-4), f2 = f >> 1, kh = t < WIND3 ? t / WIND3 : level2(0, t);
        if (kh > 0.02) {
          let r = (1.2 + 1.6 * kh + Math.sin(t * 53) * 0.4) * Math.min(1, kh * 1.5);
          if (p.circle(HAND[0], HAND[1], r + 1.2, C[4]), p.circle(HAND[0], HAND[1], r, C[6]), p.circle(HAND[0], HAND[1], r * 0.5, WHITE), p.glow(HAND[0], HAND[1], 18, C[4], 0.6 * kh), t > WIND3 * 0.5) {
            let r2 = rng(o.seed, 5, f), a = r2.range(0, TAU), d = r2.range(4, 8);
            crackle(p, zigzag(r2, HAND[0], HAND[1], HAND[0] + Math.cos(a) * d, HAND[1] + Math.sin(a) * d, 0.4, 0.3), 0.6 * kh, C, 0.3);
          }
        }
        for (let [i, [x, y]] of HOPS.entries()) {
          let t0 = WIND3 + i * GAP, [x0, y0] = pts[i];
          if (t >= t0 && t < on(i)) {
            let u = ease.outQuad((t - t0) / LEAP), b = shape2(i, -1), trunk = { paths: [b.paths[0]] };
            stroke(p, trunk, 1, C, 0.75, { upTo: u });
            let tp = b.paths[0].pts, [hx, hy] = tp[Math.min(tp.length - 1, Math.floor(u * (tp.length - 1)))];
            p.circle(hx, hy, 2, WHITE), p.glow(hx, hy, 16, C[5], 0.7);
          }
          let k = level2(i, t);
          if (k > 0)
            stroke(p, shape2(i, f2), k, C, 0.75);
          else if (t >= off(i) + BREAK2 && t < off(i) + BREAK2 + 0.35) {
            let g = 1 - (t - off(i) - BREAK2) / 0.35, b = shape2(i, Math.floor((off(i) + BREAK2) * 15));
            trace2(p, b.paths[0].pts, g > 0.5 ? C[4] : C[2], g * 0.9);
          }
          let a = t - on(i);
          if (a >= 0 && a < 0.09) {
            let q = a / 0.09;
            p.circle(x, y, 6 * (1 - q) + 1.5, C[5]), p.circle(x, y, 5 * (1 - q), WHITE), sparkle(p, x, y, Math.round(10 * (1 - q)), C[6], C[4], 0.6);
          }
          if (k > 0.05) {
            let r = (2.6 + Math.sin(t * 47 + i) * 0.7) * k;
            p.circle(x, y, r + 1.5, C[2]), p.circle(x, y, r + 0.7, C[5]), p.circle(x, y, r * 0.6, WHITE), p.glow(x, y, 26, C[4], 0.6 * k), p.glow(x, y, 8, C[6], 0.5 * k);
            let r2 = rng(o.seed, 11, i, f);
            for (let j = 0; j < (t - on(i) < 0.12 ? 2 : 1); j++) {
              let a0 = r2.range(0, TAU), a1 = a0 + r2.sign() * r2.range(0.5, 1), d0 = r2.range(4, 6), d1 = r2.range(5, 8);
              crackle(p, zigzag(r2, x + Math.cos(a0) * d0, y + Math.sin(a0) * d0, x + Math.cos(a1) * d1, y + Math.sin(a1) * d1, 0.35, 0), r2.range(0.45, 0.7) * k, C, 0.25);
            }
            if (r2.next() < 0.3 * k) {
              let gx = ground[i] + r2.range(-3, 3);
              crackle(p, zigzag(r2, x + r2.range(-2, 2), y + 3, gx, -0.5, 0.3, 0.35), 0.75 * k, C, 0.35), p.glow(gx, -1, 12, C[5], 0.5 * k), p.px(gx, -1, WHITE);
            }
          }
        }
        ps.draw(p, "front"), hot.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta40, AIM, BACK2, zap, act14, HAND, HOPS, WIND3, LEAP, GAP, HOLD4, BREAK2, ASH4, on, off, init_chain_lightning = __esm({
    "src/fx/lightning/chain-lightning.js"() {
      init_core();
      init_lib12();
      meta40 = {
        name: "Chain lightning",
        desc: "A bolt leaps from the caster's hand through three targets in turn; each flashes, sparks and grounds itself to the floor while the arcs between them flicker, then the chain snaps.",
        tags: ["lightning", "electric", "chain", "spell", "combat", "directional", "one-shot"],
        size: [248, 104],
        origin: [40, 82],
        duration: 1.8,
        loop: !1,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: { palette: VOLT, sparks: PLASMA, seed: 3 }
      }, AIM = { ...READY, x: -6, crouch: 4, lean: 4, fx: 16, fy: -16, bx: -6, by: -23, ffx: 11, fbx: -9 }, BACK2 = { ...READY, x: -6, crouch: 4, lean: -3, fx: -5, fy: -32, bx: 8, by: -24, armsFront: !0, ffx: 9, fbx: -7 }, zap = (at2, t, stop = 0.03) => ({ t, at: at2, stop, push: 1.2, straw: 6, skin: "shock", shiver: 0.7, y: -22 }), act14 = {
        targets: [{ x: 58 }, { x: 104 }, { x: 150 }],
        poses: [
          [-0.46, { ...READY, x: -6 }],
          [-0.22, BACK2],
          [0, { ...BACK2, crouch: 5 }],
          [0.04, AIM, "snap"],
          [0.7, { ...AIM, crouch: 3 }],
          [1.35, { ...AIM, crouch: 3, fy: -18 }],
          [1.8, { ...READY, x: -6 }]
        ],
        hits: [
          zap(0, 0.05),
          zap(1, 0.14),
          { ...zap(2, 0.23, 0.07), shake: 0.14, amp: 1 },
          { t: 1.35, push: 0, straw: 0, flash: 0, skin: null }
        ]
      }, HAND = [10, -16], HOPS = [[58, -22], [104, -30], [150, -19]], WIND3 = 0.12, LEAP = 0.05, GAP = 0.075, HOLD4 = 0.78, BREAK2 = 0.16, ASH4 = hex("#5b5566"), on = (i) => WIND3 + i * GAP + LEAP, off = (i) => HOLD4 + i * 0.05;
    }
  });

  // src/fx/lightning/zap-hit.js
  var zap_hit_exports = {};
  __export(zap_hit_exports, {
    create: () => create27,
    meta: () => meta41
  });
  function fern(R6) {
    let out = [], grow = (x, y, a, len2, w, d, depth) => {
      let pts = [[x, y, d]], side = R6.sign();
      for (let s = 0; s < len2; s += 1.4)
        a += R6.range(-0.3, 0.3), x += Math.cos(a) * 1.4, y += Math.sin(a) * 1.4, d += 1.4, pts.push([x, y, d]), depth < 2 && s > 2 && R6.chance(0.24) && (side = -side, grow(x, y, a + side * R6.range(0.55, 1.05), (len2 - s) * R6.range(0.3, 0.55), w * 0.6, d, depth + 1));
      out.push({ pts, w });
    };
    for (let i = 0; i < 6; i++) grow(0, 0, i / 6 * TAU + R6.range(-0.35, 0.35), R6.range(18, 32), 1, 0, 0);
    return out;
  }
  function create27(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), ps = new Particles({ rng: R6 }), lights = new Lights(), tree = fern(R6), Y02 = R6.range(-14, 6), kinked = Array.from({ length: 16 }, () => {
      let a = R6.range(-1.2, 1.2) + (R6.chance(0.7) ? 0 : Math.PI), sp = R6.range(130, 250);
      return { x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: R6.range(0.2, 0.36), age: -SNAP2, next: R6.range(0.02, 0.05), trail: [] };
    }), t = 0, hit = !1;
    return {
      update(dt) {
        if (t += dt, !hit && t >= SNAP2) {
          hit = !0, lights.add(0, 0, 60, C[4], 0.7, 0.3), lights.add(0, 0, 14, WHITE, 0.5, 0.07);
          for (let i = 0; i < 3; i++) ps.spawn(P.SMOKE, R6.range(-3, 5), R6.range(-4, 2), R6.range(-5, 8), -R6.range(8, 16), R6.range(0.55, 0.75), mix(ASH5, C[4], 0.3), R6.range(2.5, 3.8), R6.range(0.08, 0.16));
        }
        for (let s of kinked)
          if (!((s.age += dt) < 0 || s.age >= s.life)) {
            if ((s.next -= dt) <= 0) {
              s.next = R6.range(0.025, 0.055);
              let sp = Math.hypot(s.vx, s.vy), a = Math.atan2(s.vy, s.vx) + R6.sign() * R6.range(0.6, 1.3);
              s.vx = Math.cos(a) * sp, s.vy = Math.sin(a) * sp, s.trail.push([s.x, s.y]), s.trail.length > 4 && s.trail.shift();
            }
            s.vx -= s.vx * 3 * dt, s.vy -= s.vy * 3 * dt - 140 * dt, s.x += s.vx * dt, s.y += s.vy * dt;
          }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        if (t < SNAP2) return;
        let cool = smooth(0.45, 0.85, t), fade = 1 - smooth(0.78, 0.88, t);
        for (let br of tree)
          for (let i = 1; i < br.pts.length; i++) {
            let [x0, y0] = br.pts[i - 1], [x, y, d] = br.pts[i], age = t - SNAP2 - d / 260;
            if (age < 0) break;
            let k = Math.exp(-age / 0.22) - cool * 0.3, c = k > 0.75 ? WHITE : k > 0.45 ? C[6] : k > 0.25 ? C[5] : k > 0.1 ? C[4] : k > -0.05 ? C[2] : C[1];
            p.line(x0, y0, x, y, c, fade), br.w >= 1 && d < 9 && p.line(x0 + 1, y0, x + 1, y, k > 0.45 ? C[5] : C[2], fade), (i & 3) === 0 && k > 0 && p.glow(x, y, 5, C[5], 0.35 * k * fade);
          }
        ps.draw(p, "back");
      },
      draw(p) {
        let f = Math.floor(t * 30 + 1e-4);
        if (t < 0.32) {
          let r = rng(o.seed, 2, f), b = zigzag(r, -66, Y02, 0, 0, 0.22, 0.35), u = clamp(t / SNAP2), k = t < SNAP2 ? 1 : t < 0.2 ? f % 2 ? 0.7 : 1 : 0.55 * (1 - (t - 0.2) / 0.12);
          if (stroke(p, u < 1 ? { paths: [b.paths[0]] } : b, k, C, t < SNAP2 + 0.034 ? 0.95 : 0.7, { upTo: u, hero: t >= SNAP2 && t < SNAP2 + 0.034 }), u < 1) {
            let tp = b.paths[0].pts, [hx, hy] = tp[Math.floor(u * (tp.length - 1))];
            p.circle(hx, hy, 2, WHITE), p.glow(hx, hy, 14, C[5], 0.6);
          }
        }
        if (t >= SNAP2 && t < 0.45) {
          let a = (t - SNAP2) / 0.4, r = rng(o.seed, 5, f), R05 = 8 * (1 - a * 0.6), m = Math.round(11 * (1 - a * 0.5));
          for (let i = 0; i < m; i++) {
            let ang = r.range(0, TAU), d0 = r.range(0.5, R05 * 0.5), ang2 = ang + r.range(-1.2, 1.2), d1 = r.range(R05 * 0.55, R05);
            crackle(p, zigzag(r, Math.cos(ang) * d0, Math.sin(ang) * d0, Math.cos(ang2) * d1, Math.sin(ang2) * d1, 0.5, 0), 0.75 * (1 - a) + 0.25, C, 0.25);
          }
          p.circle(0, 0, 3 * (1 - a) + 1, C[5]), p.circle(0, 0, 2 * (1 - a) + 0.5, WHITE), p.glow(0, 0, 20, C[4], 0.55 * (1 - a)), t < SNAP2 + 0.07 && p.glow(0, 0, 9, WHITE, 0.4);
        }
        for (let s of kinked) {
          if (s.age < 0 || s.age >= s.life) continue;
          let k = 1 - s.age / s.life, path2 = [...s.trail, [s.x, s.y]];
          for (let i = 0; i < path2.length - 1; i++) p.line(path2[i][0], path2[i][1], path2[i + 1][0], path2[i + 1][1], i === path2.length - 2 ? k > 0.5 ? WHITE : C[6] : k > 0.5 ? C[5] : C[4], 0.6 + 0.4 * (i / path2.length));
          p.px(s.x, s.y, k > 0.4 ? WHITE : C[5]), p.glow(s.x, s.y, 4, C[5], 0.4 * k);
        }
        t >= SNAP2 && p.glow(0, 0, 40 * Math.max(0, 1 - t / 0.85), C[3], 0.45 * Math.exp(-(t - SNAP2) * 5) * (f % 2 ? 0.7 : 1)), ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta41, SNAP2, ASH5, init_zap_hit = __esm({
    "src/fx/lightning/zap-hit.js"() {
      init_core();
      init_lib12();
      meta41 = {
        name: "Zap hit",
        desc: "A contact zap: an arc snaps in from the left, the hit point overloads into a knot of tiny crackling zigzags, a fern of burn marks glows outward, sparks jink away, ozone puffs.",
        tags: ["lightning", "electric", "hit", "impact", "combat", "directional", "one-shot"],
        size: [144, 112],
        origin: [76, 56],
        duration: 0.9,
        loop: !1,
        fps: 30,
        bg: "dark",
        options: { palette: VOLT, seed: 3 }
      }, SNAP2 = 0.05, ASH5 = hex("#6a6680");
    }
  });

  // src/fx/lightning/thunderclap.js
  var thunderclap_exports = {};
  __export(thunderclap_exports, {
    act: () => act15,
    create: () => create28,
    meta: () => meta42
  });
  function create28(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), REACH2 = o.reach, floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: o.sparks }), hot = new Particles({ rng: R6, ground: floor }), lights = new Lights(), bolts = Array.from({ length: 8 }, (_, i) => {
      let down = i % 2 === 0, side = i % 4 < 2 ? -1 : 1, a = down ? side > 0 ? R6.range(0.35, 0.75) : Math.PI - R6.range(0.35, 0.75) : side > 0 ? -R6.range(0.15, 1.2) : Math.PI + R6.range(0.15, 1.2), L = down ? -CY3 / Math.sin(a) : R6.range(40, 62), x1 = Math.cos(a) * L, y1 = down ? 0 : CY3 + Math.sin(a) * L;
      return { down, x1, y1, t0: CLAP + R6.range(0, 0.06) };
    }), front = (t2) => t2 < CLAP ? 0 : 8 + (REACH2 - 8) * ease.outCubic(clamp((t2 - CLAP) / 0.5)), t = 0, clapped = !1, landed = bolts.map(() => !1);
    return {
      update(dt) {
        if (t += dt, t < CLAP && R6.chance(60 * dt)) {
          let a = R6.range(0, TAU), d = R6.range(16, 30), T2 = R6.range(0.07, 0.1), v = d * 3 / (Math.exp(3 * T2) - 1);
          ps.spawn(P.STREAK, Math.cos(a) * d, CY3 + Math.sin(a) * d * 0.8, -Math.cos(a) * v, -Math.sin(a) * v * 0.8, T2, R6.chance(0.5) ? C[6] : C[5]);
        }
        if (t >= CLAP && !clapped) {
          clapped = !0, lights.add(0, CY3 - 10, 100, C[4], 0.65, 0.45), lights.add(0, CY3, 26, WHITE, 0.5, 0.07);
          for (let i = 0; i < 64; i++) {
            let a = R6.range(0, TAU), sp = R6.range(170, 380) * (Math.sin(a) > 0.4 ? 0.5 : 1);
            ps.spawn(P.SPARK, Math.cos(a) * 6, CY3 + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp - 40, R6.range(0.2, 0.55));
          }
          for (let i = 0; i < 8; i++) ps.spawn(P.SMOKE, R6.range(-8, 8), CY3 + R6.range(-6, 6), R6.range(-25, 25), -R6.range(10, 30), R6.range(0.8, 1.3), mix(ASH6, C[4], 0.3), R6.range(4, 7), R6.range(0.05, 0.2));
        }
        for (let [i, b] of bolts.entries())
          if (b.down && !landed[i] && t >= b.t0) {
            landed[i] = !0, lights.add(b.x1, -4, 46, C[4], 0.7, 0.25);
            for (let j = 0; j < 12; j++) {
              let a = -Math.PI / 2 + R6.range(-1.2, 1.2), sp = R6.range(70, 240);
              ps.spawn(P.SPARK, b.x1, -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.2, 0.5));
            }
            for (let j = 0; j < 5; j++) hot.spawn(P.SPARK, b.x1 + R6.range(-2, 2), -1, R6.range(-80, 80), -R6.range(60, 180), R6.range(0.4, 0.8));
          }
        let fr = front(t);
        if (t > CLAP && t < CLAP + 0.5)
          for (let s of [-1, 1])
            R6.chance(70 * dt) && ps.spawn(P.SMOKE, s * fr + R6.range(-3, 3), -R6.range(1, 4), s * R6.range(10, 40), -R6.range(5, 20), R6.range(0.6, 1.1), DUST3, R6.range(3, 6) * (1 - 0.4 * (fr / REACH2)), 0, PF.BIG), R6.chance(50 * dt) && ps.spawn(P.GRIT, s * fr, -1, s * R6.range(10, 60), -R6.range(60, 180), R6.range(0.8, 1.3), R6.pick(STONE2), R6.chance(0.3) ? 2 : 1);
        ps.update(dt), hot.update(dt), lights.update(dt);
      },
      drawBack(p) {
        for (let b of bolts) b.down && t >= b.t0 && scorch2(p, b.x1, 0, 9, Math.pow(clamp(1 - (t - b.t0) / 1.1), 1.3), 1 - smooth(1.4, 1.85, t));
        let u = (t - CLAP) / 0.5;
        u > 0 && u < 1 && band(p, 0, 0.5, front(t), 0.18, Math.max(2, 16 * (1 - u)), 1.25 - u, [C[1], C[2], C[4], C[6]], (g) => Math.sin(g) < 0, u < 0.15), ps.draw(p, "back"), hot.draw(p, "back");
      },
      draw(p) {
        let f = Math.floor(t * 30 + 1e-4), u = (t - CLAP) / 0.5, A = o.actor, a = t - CLAP;
        if (a >= 0 && a < 0.07 && p.mask(A.mask, A.x, A.y, a < 0.035 ? WHITE : C[6]), a >= 0 && a < 0.2) {
          let q = a / 0.2;
          flare(p, 0, CY3, 44 * Math.pow(1 - q, 1.4), 1 - q, C), q < 0.35 && p.circle(0, CY3, 10 * (1 - q * 2) + 2, WHITE), p.glow(0, CY3, 44, C[5], 0.32 * (1 - q));
        }
        for (let [i, b] of bolts.entries()) {
          let ba = Math.floor((t - b.t0) * 30 + 1e-4);
          if (t < b.t0 || ba >= BK.length) continue;
          let r = rng(o.seed, 3, i, ba >> 1);
          stroke(p, zigzag(r, 0, CY3, b.x1, b.y1, 0.25, b.down ? 0.5 : 0.8), BK[ba], C, ba === 0 ? 1 : 0.8, { hero: ba === 0 }), b.down ? (p.circle(b.x1, -1, 3 * BK[ba] + 1, C[5]), p.px(b.x1, -1, WHITE), p.glow(b.x1, -3, 20, C[5], 0.5 * BK[ba])) : ba < 2 && sparkle(p, b.x1, b.y1, 4, C[6], C[4], 0.4);
        }
        if (u > 0 && u < 1) {
          band(p, 0, 0.5, front(t), 0.18, Math.max(2, 16 * (1 - u)), 1.25 - u, [C[1], C[2], C[4], C[6]], (g) => Math.sin(g) >= 0, u < 0.15);
          for (let s of [-1, 1]) p.glow(s * front(t), -3, 28, C[4], 0.45 * (1 - u));
          let ua = (t - CLAP) / 0.26, ra = 8 + 60 * ease.outCubic(ua);
          ua < 1 && p.ring(0, CY3, ra, Math.max(1, 2 * (1 - ua)), ua < 0.25 ? C[5] : ua < 0.6 ? C[4] : C[3], (v, g) => CY3 + Math.sin(g) * ra > -1 ? 0 : 0.85 - 0.85 * ua);
        }
        if (a > 0.2 && a < 0.9) {
          let r = rng(o.seed, 9, f), k = 1 - (a - 0.2) / 0.7;
          if (r.next() < 0.8) {
            let x0 = r.range(-14, 14), y0 = r.range(-34, -4), b = r.range(0, TAU), l = r.range(6, 13);
            crackle(p, zigzag(r, x0, y0, x0 + Math.cos(b) * l, y0 + Math.sin(b) * l, 0.4, 0.3), 0.85 * k + 0.1, C, 0.35);
          }
        }
        ps.draw(p, "front"), hot.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta42, WIDE, CLAP_, act15, CLAP, CY3, BK, DUST3, STONE2, ASH6, init_thunderclap = __esm({
    "src/fx/lightning/thunderclap.js"() {
      init_core();
      init_lib12();
      meta42 = {
        name: "Thunderclap",
        desc: "A thunderclap round the caster: a white flash, forked bolts burst out and stab the floor, a heavy shock ring tears across the ground raising dust and grit, sparks streak away.",
        tags: ["lightning", "electric", "nova", "aoe", "spell", "shockwave", "one-shot"],
        size: [288, 156],
        origin: [144, 124],
        duration: 1.9,
        loop: !1,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: { palette: VOLT, sparks: PLASMA, reach: 104, seed: 6 }
      }, WIDE = { turn: 1.15, crouch: 5, lean: -1, fx: -15, fy: -33, bx: 15, by: -33, ffx: -7, fbx: 8 }, CLAP_ = { turn: 1.15, y: -2, crouch: 0, fx: -1, fy: -45, bx: 1, by: -45, ffx: -3, ffy: -5, fbx: 4, fby: -5 }, act15 = {
        onBody: !0,
        follow: 0,
        target: { x: 104 },
        poses: [
          [-0.46, READY],
          [-0.18, WIDE],
          [0.08, { ...WIDE, crouch: 6 }],
          [0.12, CLAP_, "snap"],
          [0.55, { ...CLAP_, y: 0, ffy: -4, fby: -4, crouch: 1 }],
          [1.05, { turn: 1, crouch: 3, fx: -10, fy: -28, bx: 11, by: -28, ffx: -4, fbx: 5 }],
          [1.7, READY]
        ],
        hits: [
          { t: 0.12, stop: 0.13, shake: 0.3, amp: 3, target: !1 },
          { t: 0.42, push: 2, straw: 14, y: -8, skin: "shock", shiver: 0.5 },
          { t: 1.2, push: 0, straw: 0, flash: 0, skin: null }
        ]
      }, CLAP = 0.12, CY3 = -22, BK = [1, 0.7, 0.95, 0.5, 0.8, 0.3], DUST3 = hex("#6e6382"), STONE2 = ["#655b7a", "#4a4263", "#342d45"].map(hex), ASH6 = hex("#5b5566");
    }
  });

  // src/fx/lightning/storm-cloud.js
  var storm_cloud_exports = {};
  __export(storm_cloud_exports, {
    draw: () => draw15,
    meta: () => meta43
  });
  function billows(seed2, ph) {
    return BILLOWS.map(([x, y, v, sq = 1], i) => {
      let top = y < -112 && sq === 1, boil = 0.82 + 0.3 * Math.sin(Math.PI * ((ph + i * 0.37) % 1)) ** 2;
      return { sq, x: x + 3.5 * loopNoise(ph, 0.7, seed2 + i) + (sq < 1 ? 4 * loopNoise(ph, 0.5, seed2 + i + 90) : 0), y: y + 2 * loopNoise(ph, 0.7, seed2 + i + 30) - (top ? 4 * (boil - 0.97) : 0), r: v * (top ? boil : 1 + 0.08 * loopNoise(ph, 0.6, seed2 + i + 60)) / VIS };
    });
  }
  function cloud(p, B4, ph, seed2, K2, C, flashes) {
    FIELD.fill(0), GX.fill(0), GY.fill(0), LIT.fill(0);
    for (let [i, b] of B4.entries()) {
      let k = flashes.get(i) ?? 0, r2 = b.r * b.r, ry = b.r * b.sq;
      for (let y = Math.max(0, Math.floor(b.y - ry - H0)); y < Math.min(GH, Math.ceil(b.y + ry - H0)); y++)
        for (let x = Math.max(0, Math.floor(b.x - b.r - W0)); x < Math.min(GW, Math.ceil(b.x + b.r - W0)); x++) {
          let dx = x + W0 + 0.5 - b.x, dy = (y + H0 + 0.5 - b.y) / b.sq, d2 = (dx * dx + dy * dy) / r2;
          if (d2 >= 1) continue;
          let j = y * GW + x, u = 1 - d2, c = u * u;
          FIELD[j] += c, GX[j] += -4 * u * dx / r2, GY[j] += -4 * u * dy / (r2 * b.sq), k && (LIT[j] += k * (0.25 + 0.75 * c) * (d2 < 1 ? 1 : 0));
        }
    }
    let ramp2 = [...K2, C[3], C[4], C[5], C[6]], n = K2.length;
    for (let y = 0; y < GH; y++) {
      let cy = y + H0 + 0.5;
      for (let x = 0; x < GW; x++) {
        let j = y * GW + x;
        if (FIELD[j] < TH2 - 0.06) continue;
        let cx = x + W0 + 0.5, base = BASE3 + 1.5 * tileNoise(cx * 0.12 + 9 * ph, 3, 9, 0, seed2 + 5), F = FIELD[j] * (1 - smooth(base - 3, base, cy)) + 0.05 * tileNoise(cx * 0.21 + 18 * ph, cy * 0.21, 18, 0, seed2);
        if (F < TH2) continue;
        let gl = Math.hypot(GX[j], GY[j]) || 1, lam = -(GX[j] * 0.42 + GY[j] * 0.9) / gl, edge = Math.min(1, gl * 5) * (F < TH2 + 0.08 ? 1 : 0.55), h = 1 - 2 * clamp((cy - TOP6) / (BASE3 - TOP6)), i = 2.7 + 2.2 * h + 1.3 * lam * edge + 0.4 * tileNoise(cx * 0.16 + 12 * ph, cy * 0.16, 12, 0, seed2 + 9);
        F < TH2 + 0.05 && lam > 0.3 && h > -0.5 && (i += 1), cy > base - 6 && (i -= 1), i = clamp(Math.round(i), 0, n - 1);
        let L = LIT[j] * (0.7 + 0.6 * tileNoise(cx * 0.2 - 14 * ph, cy * 0.2, 14, 0, seed2 + 3));
        L > 0.12 && (i = Math.min(ramp2.length - 1, i + Math.round(L * 5.5))), p.px(cx, cy, ramp2[i]);
      }
    }
  }
  function scud(p, ph, seed2, K2) {
    let r = rng(seed2, 13);
    for (let w = 0; w < 6; w++) {
      let x0 = r.range(-60, 60), y0 = BASE3 + r.range(3, 9), rx = r.range(10, 20), ry = r.range(1.3, 2.2), off2 = r.next(), u = (ph + off2) % 1, a = Math.sin(Math.PI * u) ** 0.8, xc = x0 + 16 * (u - 0.5);
      for (let y = Math.floor(y0 - ry - 1); y <= y0 + ry + 1; y++)
        for (let x = Math.floor(xc - rx - 1); x <= xc + rx + 1; x++) {
          let dx = (x + 0.5 - xc) / rx, dy = (y + 0.5 - y0) / ry, nz = tileNoise((x + 0.5) * 0.35 + 10 * ph + w * 7, (y + 0.5) * 0.5, 10, 0, seed2 + 20 + w), v = (1 - dx * dx - dy * dy) * a + 0.6 * nz - 0.25;
          v > 0 && p.blend(x + 0.5, y + 0.5, v > 0.4 ? K2[2] : K2[3], Math.min(0.6, 0.2 + v * 0.7));
        }
    }
  }
  function draw15(p, t, o) {
    let C = fit(o.palette, 8), K2 = fit(o.cloud, 7), RN = fit(o.rain, 4), S = o.sparks.map(hex), f = Math.floor(t * FPS + 1e-6) % N2, ph = f / N2, B4 = billows(o.seed, ph), br = rng(o.seed, 5, BOLT), ba = f - BOLT, bx0 = BILLOWS[BOLT_B][0] + br.range(-4, 4), bx1 = br.range(-24, 24), flashes = new Map(FLASHES.filter(([ff]) => ff === f).map(([, b, k]) => [b, k]));
    ba >= 0 && ba < BK2.length && flashes.set(BOLT_B, Math.max(flashes.get(BOLT_B) ?? 0, BK2[ba]));
    let lights = [...flashes].map(([b, k]) => ({ x: B4[b].x, y: B4[b].y, k, r: B4[b].r * VIS * (B4[b].sq < 1 ? 1.6 : 2.2) })), flash2 = lights.reduce((s, l) => Math.max(s, l.k), 0);
    cycle(t, P2, 150, o.seed + 11, (g) => g.range(0.5, 0.62), (age, life, r) => {
      let x0 = r.range(-62, 62), vy = r.range(190, 240), vx = -vy * 0.18, tf = (0 - (BASE3 + 4)) / vy;
      if (age < tf) {
        let x = x0 + vx * age, y = BASE3 + 4 + vy * age, l = r.range(4, 6.5);
        p.line(x - vx * 0.018 * (l / 4), y - l, x, y, (u) => u > 0.7 ? flash2 > 0.5 ? C[5] : RN[3] : flash2 > 0.5 ? C[3] : RN[u > 0.35 ? 2 : 1]);
      } else if (age < tf + 0.12) {
        let x = x0 + vx * tf, a = (age - tf) / 0.12;
        for (let s of [-1, 1]) p.px(x + s * (1 + a * 2.5), -1 - Math.sin(a * Math.PI) * 2.5, a < 0.5 ? RN[3] : RN[2]);
        a < 0.4 && p.px(x, 0, RN[3]);
      }
    }), scud(p, ph, o.seed, K2), cloud(p, B4, ph, o.seed, K2, C, flashes);
    for (let l of lights) p.glow(l.x, l.y, l.r, C[4], 0.4 * l.k);
    p.glow(0, -122, 80, C[2], 0.05 + 0.22 * flash2);
    for (let [ff, b, k] of FLASHES)
      if (ff === f && k > 0.6) {
        let r = rng(o.seed, 7, ff), x = B4[b].x;
        crackle(p, zigzag(r, x - r.range(12, 22), BASE3 - r.range(2, 6), x + r.range(12, 22), BASE3 - r.range(1, 5), 0.25, 0.5), 0.6, C, 0.4);
      }
    if (ba >= 0 && ba < BK2.length) {
      let k = BK2[ba];
      stroke(p, zigzag(rng(o.seed, 9, BOLT), bx0, BASE3 - 3, bx1, 0, 0.22, 0.7), k, C, ba === 0 ? 1.15 : 1, { hero: ba === 0 }), p.circle(bx1, -1, 3 * k + 1.5, C[2]), p.circle(bx1, -1, 3 * k + 0.5, C[5]), p.circle(bx1, -1, 2 * k, WHITE), p.glow(bx1, -22, 78, C[3], 0.5 * k), p.glow(bx1, -3, 18, C[5], 0.45 * k), p.glow(bx0, BASE3, 84, C[4], 0.3 * k);
    }
    let sa = ((t - BOLT / FPS) % P2 + P2) % P2;
    for (let j = 0; j < 16; j++) {
      let q = rng(o.seed, 31, j), life = q.range(0.25, 0.6);
      if (sa >= life) continue;
      let a = -Math.PI / 2 + q.range(-1.3, 1.3), sp = q.range(60, 200), [x, y, vx, vy] = flight(bx1, -1, Math.cos(a) * sp, Math.sin(a) * sp, sa, { floor: 0 });
      spark2(p, x, y, vx, vy, 1 - sa / life, S);
    }
  }
  var meta43, FPS, N2, P2, BASE3, TOP6, TH2, VIS, BILLOWS, FLASHES, BOLT, BOLT_B, BK2, W0, H0, GW, GH, FIELD, GX, GY, LIT, init_storm_cloud = __esm({
    "src/fx/lightning/storm-cloud.js"() {
      init_core();
      init_lib12();
      meta43 = {
        name: "Storm cloud",
        desc: "A storm cloud boils overhead, billows lit from inside by flickering discharges, ragged scud under its flat dark base; rain slants down and once a loop a bolt cracks to the floor.",
        tags: ["lightning", "storm", "weather", "cloud", "rain", "ambient", "loop"],
        size: [168, 176],
        origin: [84, 164],
        duration: 3,
        loop: !0,
        fps: 30,
        bg: "ground",
        options: { palette: VOLT, sparks: PLASMA, cloud: ["#09070f", "#120f1e", "#1b182e", "#252640", "#323758", "#464d78", "#646b9c"], rain: ["#2b3250", "#46527a", "#6d7cab", "#a5b5e0"], seed: 8 }
      }, FPS = 30, N2 = 90, P2 = 3, BASE3 = -100, TOP6 = -156, TH2 = 0.35, VIS = Math.sqrt(1 - Math.sqrt(TH2)), BILLOWS = [
        [-6, -132, 17],
        [18, -127, 14],
        [-28, -122, 12],
        [38, -118, 10],
        [0, -142, 12],
        [14, -149, 19, 0.38],
        [40, -148, 14, 0.34],
        [-48, -113, 10],
        [55, -110, 9],
        [-17, -115, 13],
        [22, -113, 12],
        [-42, -104, 11],
        [-10, -104, 12],
        [20, -104, 11],
        [48, -103, 9],
        [-63, -104, 7],
        [66, -103, 6]
      ], FLASHES = [[7, 2, 0.8], [8, 9, 0.55], [29, 1, 0.75], [31, 10, 1], [33, 3, 0.5], [70, 0, 0.8], [71, 4, 0.55], [72, 5, 0.35]], BOLT = 52, BOLT_B = 12, BK2 = [1, 0.7, 0.3, 0.95, 0.5, 0.75, 0.2], W0 = -84, H0 = TOP6 - 6, GW = 168, GH = BASE3 + 8 - H0, FIELD = new Float32Array(GW * GH), GX = new Float32Array(GW * GH), GY = new Float32Array(GW * GH), LIT = new Float32Array(GW * GH);
    }
  });

  // src/fx/nature/poison-cloud.js
  var poison_cloud_exports = {};
  __export(poison_cloud_exports, {
    draw: () => draw16,
    drawBack: () => drawBack5,
    meta: () => meta44
  });
  function tongues(sh, si, E2, ph) {
    let out = [];
    for (let s of [-1, 1])
      for (let i = 0; i < sh.n; i++) {
        let q = (ph + i / sh.n + si * 0.17 + (s > 0 ? 0.5 / sh.n : 0)) % 1;
        out.push({ s, q, x: s * E2 * (0.3 + 0.82 * q), h: sh.h * (0.75 - 0.45 * q) });
      }
    return out;
  }
  function height(sh, si, E2, x, ph, T2, seed2) {
    let ax = Math.abs(x), env = 1 - smooth(0.5, 1, ax / (E2 * sh.e)), r = tileNoise(ax * 0.07 - ph * sh.flow, si * 3.7, sh.flow, 0, seed2 + si), h = sh.h * env * (0.55 + 0.45 * r);
    for (let g of T2) {
      let behind = g.s * (g.x - x);
      behind < -1.5 || behind > 30 || (h = Math.max(h, g.h * Math.sqrt(Math.max(0, 1 - behind / 30)) * smooth(-1.5, 1.5, behind) * (1 - smooth(0.75, 1, g.q))));
    }
    return h;
  }
  function sheet(p, C, sh, si, E2, t, seed2) {
    let ph = t / D11, T2 = tongues(sh, si, E2, ph), d = sh.dim, X = Math.ceil(E2 * 1.25);
    for (let x = -X; x <= X; x++) {
      let H3 = height(sh, si, E2, x + 0.5, ph, T2, seed2);
      if (H3 < 0.6) continue;
      let top = -Math.round(H3);
      for (let y = top; y <= 1; y++) {
        let v = clamp(-y / H3), streak = 0.7 + 0.3 * tileNoise(x * 0.05 - ph * sh.flow * Math.sign(x || 1), y * 0.55, sh.flow, 0, seed2 + 9 + si), lv = v - (streak - 0.7) * 0.6, c = y === top ? C[Math.max(1, 4 - d)] : lv < 0.16 ? C[6 - d] : lv < 0.42 ? C[5 - d] : lv < 0.68 ? C[4 - d] : C[Math.max(1, 3 - d)];
        p.blend(x, y, c, sh.a * (y === top ? 0.65 : (0.6 + 0.4 * (1 - v)) * streak));
      }
    }
    for (let g of T2) {
      let k = Math.sin(Math.PI * g.q);
      if (k < 0.15 || g.h < 4) continue;
      let r = 1.8 + g.h * 0.22, cx = g.x - g.s * r * 0.6, cy = -g.h * 0.72, spin = -g.s * g.q * TAU * 2.2;
      for (let a = 0; a < 4.6; a += 0.1) {
        let rr = r * (1 - a * 0.12), px = cx + g.s * Math.cos(spin + a) * rr, py = cy + Math.sin(spin + a) * rr, w = 1.6 * (1 - a / 6);
        for (let o = -w; o <= w; o += 0.8) {
          let qx = px + g.s * Math.cos(spin + a) * o, qy = py + Math.sin(spin + a) * o;
          p.blend(qx, qy, o > w * 0.4 ? C[5 - d] : C[4 - d], sh.a * 0.75 * k * (1 - a / 5.5));
        }
      }
    }
  }
  function plumes(p, C, E2, t, seed2) {
    cycle(t, D11, 5, seed2, (g) => g.range(2.4, 3.2), (age, L, R6) => {
      let u = age / L, x0 = R6.range(-0.55, 0.55) * E2, rise = R6.range(13, 19), len2 = R6.range(34, 48), ph = R6.range(0, TAU), amp = R6.range(3, 5), head4 = 14 + rise * age, tail2 = Math.max(10, head4 - len2), fade = smooth(0, 0.15, u) * (1 - smooth(0.5, 1, u));
      for (let h = tail2; h <= head4; h += 0.7) {
        let s = (h - tail2) / Math.max(1, head4 - tail2), tw = Math.cos(h * 0.22 + age * 2.4 + ph), w = 0.6 + 2.2 * Math.abs(tw) * (1 - s * 0.5), x = x0 + amp * Math.sin(h * 0.12 + age + ph) * (0.4 + s), a = fade * Math.sin(Math.PI * Math.min(1, s * 1.2)) * 0.32;
        for (let o = -w; o <= w; o += 1) p.blend(x + o, -h, tw > 0 ? Math.abs(o) < w * 0.5 ? C[6] : C[5] : Math.abs(o) < w * 0.5 ? C[3] : C[2], a);
      }
    });
  }
  function specks(p, C, E2, t, seed2) {
    cycle(t, D11, 30, seed2, (g) => g.range(1.5, 2.6), (age, L, R6) => {
      let u = age / L, s = R6.sign(), x = s * (R6.range(0.05, 0.7) * E2 + age * R6.range(6, 14)), y = -R6.range(2, 20) - Math.sin(age * R6.range(1.5, 3) + R6.next() * TAU) * 2, a = Math.min(1, u * 5) * Math.min(1, (1 - u) * 3) * (0.6 + 0.4 * Math.sin(age * R6.range(6, 10) + R6.next() * TAU));
      a < 0.1 || (p.dot(x, y, a > 0.7 ? C[7] : C[6], a * 1.3), p.glow(x, y, 4, C[6], 0.3 * a));
    });
  }
  function drawBack5(p, t, o) {
    let C = fit(o.palette, 8), E2 = 96 * o.spread, pulse2 = 0.85 + 0.15 * Math.sin(TAU * t * 2 / D11);
    for (let x = -E2; x <= E2; x += 22) p.glow(x, -3, 30, C[5], 0.14 * pulse2 * (1 - Math.abs(x) / (E2 * 1.3)));
    for (let i = 0; i < 6; i++) {
      let R6 = rng(o.seed, i, 7), x = Math.sin(TAU * t / D11 + R6.range(0, TAU)) * E2 * R6.range(0.2, 0.7) + R6.range(-0.3, 0.3) * E2, k = 0.6 + 0.4 * Math.sin(TAU * t * 3 / D11 + i);
      p.glow(x, -R6.range(4, 10), R6.range(14, 22), C[6], 0.2 * k);
    }
    SHEETS.forEach((sh, i) => sh.back && sheet(p, C, sh, i, E2, t, o.seed));
  }
  function draw16(p, t, o) {
    let C = fit(o.palette, 8), E2 = 96 * o.spread;
    plumes(p, C, E2, t, o.seed * 7 + 2), SHEETS.forEach((sh, i) => !sh.back && sheet(p, C, sh, i, E2, t, o.seed)), specks(p, C, E2, t, o.seed * 11 + 5), p.glow(0, -6, E2 * 0.9, C[5], 0.1);
  }
  var meta44, D11, SHEETS, init_poison_cloud = __esm({
    "src/fx/nature/poison-cloud.js"() {
      init_core();
      meta44 = {
        name: "Poison cloud",
        desc: "A miasma hugging the floor: ragged sheets of gas lit yellow-green from within, fading to violet, creep out in tongues that curl over at their tips; plumes twist up as ribbons.",
        tags: ["nature", "poison", "gas", "cloud", "miasma", "toxic", "area", "ground", "loop"],
        size: [256, 100],
        origin: [128, 86],
        duration: 4,
        loop: !0,
        fps: 30,
        bg: "ground",
        options: {
          palette: ["#0e0816", "#24123a", "#3e2056", "#5a3a62", "#6a6a3a", "#96aa30", "#cce040", "#f4ffa0"],
          spread: 1,
          seed: 3
        }
      }, D11 = meta44.duration, SHEETS = [
        { h: 36, e: 0.84, a: 0.46, dim: 2, flow: 4, n: 2, back: !0 },
        { h: 26, e: 0.96, a: 0.5, dim: 1, flow: 8, n: 2, back: !0 },
        { h: 16, e: 1.04, a: 0.56, dim: 0, flow: 8, n: 3, back: !1 }
      ];
    }
  });

  // src/fx/status/poisoned.js
  var poisoned_exports = {};
  __export(poisoned_exports, {
    act: () => act16,
    actorAlpha: () => actorAlpha3,
    draw: () => draw17,
    drawBack: () => drawBack6,
    meta: () => meta45
  });
  function body2(a, seed2) {
    let m = BODIES.get(a.mask);
    if (m || BODIES.set(a.mask, m = /* @__PURE__ */ new Map()), m.has(seed2)) return m.get(seed2);
    let S = shape(a), H3 = S.h, W4 = S.w, R6 = new Rng(seed2 * 7 + 3), [l, r] = S.rows[Math.round(H3 * 0.6)], wx = r - 1, wy = Math.round(H3 * 0.6), veins = [], walk3 = (x, y, ang, len2, depth) => {
      let pts = [];
      for (let s = 0; s < len2 && (ang += R6.range(-0.5, 0.5), x += Math.cos(ang), y += Math.sin(ang), !!S.on(Math.round(x), Math.round(y))); s++)
        pts.push([Math.round(x), Math.round(y), s / len2]), depth < 2 && s > 2 && R6.chance(0.16) && walk3(x, y, ang + R6.sign() * R6.range(0.6, 1.1), len2 * 0.55, depth + 1);
      veins.push(pts);
    };
    for (let i = 0; i < 4; i++) walk3(wx, wy, Math.PI + (i / 4 - 0.45) * 2.2, 11, 0);
    let lum = (x, y) => luma(colorAt(a, x, y)), skin = S.body.filter(([x, y]) => lum(x, y) > 0.55 && S.on(x - 1, y) && S.on(x + 1, y)), pick = (list) => list[Math.floor(R6.next() * list.length)], blisters = [0, 1].map(() => [0, 1, 2].map(() => {
      let [x, y] = pick(S.body.filter(([x2, y2]) => y2 > 4 && S.on(x2 - 1, y2) && S.on(x2 + 1, y2) && S.on(x2, y2 - 1)));
      return { x, y, r: R6.range(1.1, 1.8) };
    })), E2 = eyes(a), sweat = [];
    for (let e of E2) sweat.push([e.x0 < W4 / 2 ? e.x0 - 1 : e.x1 + 1, e.y0 - 1]);
    for (let side of [-1, 1]) {
      let hand3 = S.body.filter(([x, y]) => y > H3 * 0.5 && y < H3 * 0.7 && (side < 0 ? x <= l + 1 : x >= r - 1) && !S.on(x, y + 1));
      hand3.length && sweat.push(hand3[0]);
    }
    sweat.length || sweat.push(pick(skin.length ? skin : S.body));
    let out = { veins, wound: [wx, wy], blisters, sweat };
    return m.set(seed2, out), out;
  }
  function offsets(t, H3) {
    let lean = 1.3 * Math.sin(t / D12 * TAU), ph = since2(t), w = ph < 0.12 ? Math.sin(ph / 0.12 * Math.PI) : 0;
    return (my) => Math.round(lean * (1 - my / H3) + w * Math.sin(my * 0.42 + ph * 40));
  }
  function drawBack6(p, t, o) {
    let P3 = fit(o.palette, 8), ph = since2(t), k = ph / 0.55;
    k < 1 && band(p, 0, 0, 5 + 22 * Math.sqrt(k), 0.18, Math.max(1, 2.5 * (1 - k)), 1 - k, [P3[3], P3[4], P3[5], P3[6]], (g) => Math.sin(g) < 0), p.shade(-28, -3, 28, 6, (x, y, out) => {
      let d = Math.hypot(x / 24, (y - 0.5) / 4);
      d < 1 && (out.l = P3[4], out.k = (0.14 + 0.2 * Math.exp(-ph / 0.2)) * (1 - d) * (1 - d));
    });
  }
  function draw17(p, t, o) {
    let P3 = fit(o.palette, 8), a = o.actor, S = shape(a), H3 = S.h, B4 = body2(a, o.seed), off2 = offsets(t, H3), ph = since2(t), tick = Math.floor(t / TICK2) % 2, vein = hex(o.veins);
    for (let [mx, my] of S.body) {
      let c = colorAt(a, mx, my), l = luma(c), wave = 0.5 + 0.5 * Math.sin(TAU * (my / H3 * 1.6 + t / D12 * 2)), sick = P3[clamp(1 + Math.round(l * 6.2), 1, 7)], k2 = 0.22 + 0.4 * wave * wave;
      p.px(a.x + mx + off2(my), a.y + my, mix(c, wave > 0.85 && l > 0.4 ? mix(sick, P3[6], 0.3) : sick, k2));
    }
    let grow = smooth(0, D12 * 0.55, t) * (1 - smooth(D12 * 0.62, D12, t)) * 1.15;
    for (let pts of B4.veins)
      for (let [x, y, u] of pts) u < grow && p.px(a.x + x + off2(y), a.y + y, u > grow - 0.12 ? P3[2] : vein);
    let [wx, wy] = B4.wound;
    p.px(a.x + wx + off2(wy), a.y + wy, P3[6]), p.px(a.x + wx + off2(wy) - 1, a.y + wy, P3[3]), p.glow(a.x + wx, a.y + wy, 6, P3[5], 0.3);
    for (let bl of B4.blisters[tick]) {
      let x = a.x + bl.x + off2(bl.y), y = a.y + bl.y, grow2 = clamp(ph / 0.16);
      if (ph > 0.38) {
        if (ph < 0.56) {
          let k2 = (ph - 0.38) / 0.18;
          for (let j = 0; j < 6; j++) {
            let an = j / 6 * TAU + bl.x, d = bl.r + 0.5 + k2 * 3.5;
            p.dot(x + Math.cos(an) * d, y + Math.sin(an) * d - k2 * 2, j % 2 ? P3[6] : P3[5], 1.2 - k2);
          }
          p.glow(x, y, 6, P3[6], 0.4 * (1 - k2));
        }
      } else {
        let r = bl.r * grow2;
        p.circle(x, y, r + 0.6, P3[3]), p.circle(x - 0.2, y - 0.2, r, P3[5]), r > 0.8 && p.px(x - 0.5, y - 0.8, WHITE), p.glow(x, y, 4, P3[5], 0.3 * grow2);
      }
    }
    B4.sweat.forEach(([sx, sy], i) => {
      let per = D12 / 2, age = ((t - i * 0.37) % per + per) % per, gather = 0.35, x = a.x + sx + 0.5 + off2(sy), y0 = a.y + sy;
      if (age < gather) {
        let k3 = age / gather, run = Math.round(k3 * 2);
        p.px(x, y0 + run, k3 > 0.5 ? P3[6] : P3[5]), k3 > 0.5 && p.px(x, y0 + run - 1, P3[4]);
        return;
      }
      let f = age - gather, fallH = -1 - (y0 + 2), tf = Math.sqrt(2 * Math.max(1, fallH) / G3);
      if (f < tf) {
        let y = y0 + 2 + 0.5 * G3 * f * f;
        p.line(x, y - Math.min(3, G3 * f * 0.012), x, y, P3[4]), p.px(x, y, P3[6]);
        return;
      }
      let h = f - tf;
      if (h > 0.4) return;
      let k2 = h / 0.4;
      p.line(x - 1 - k2 * 2, -1, x + 1 + k2 * 2, -1, P3[k2 < 0.4 ? 6 : 4], 1.2 - k2);
      for (let j = 0; j < 3; j++) p.dot(x + (j - 1) * (2 + 3 * k2), -2 - j % 2 - 5 * k2 * (1 - k2), P3[6], 1 - k2);
      p.disc(x + Math.sin(k2 * 6) * 1.5, -3 - k2 * 6, 1 + 1.5 * k2, P3[5], 0.35 * (1 - k2)), p.glow(x, -1.5, 5, P3[5], 0.35 * (1 - k2));
    });
    let k = ph / 0.55;
    k < 1 && band(p, 0, 0, 5 + 22 * Math.sqrt(k), 0.18, Math.max(1, 2.5 * (1 - k)), 1 - k, [P3[3], P3[4], P3[5], P3[6]], (g) => Math.sin(g) >= 0), p.glow(0, a.y + H3 * 0.45, 26, P3[4], 0.14 + 0.2 * Math.exp(-ph / 0.18));
  }
  var meta45, SICK, act16, D12, TICK2, G3, since2, actorAlpha3, BODIES, init_poisoned = __esm({
    "src/fx/status/poisoned.js"() {
      init_core();
      init_lib8();
      meta45 = {
        name: "Poisoned",
        desc: "Sick to the bone: green rolls up the body in waves, dark veins creep from a wound, toxic sweat drips and hisses; every 0.8 s it wobbles, blisters pop and a ring pulses out.",
        tags: ["status", "poison", "toxic", "dot", "debuff", "sick", "loop"],
        size: [72, 64],
        origin: [36, 54],
        duration: 1.6,
        loop: !0,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: { palette: ["#0e1d14", "#173320", "#23552e", "#318232", "#55b92f", "#8eea3f", "#cfff63", "#f6ffc2"], veins: "#2c1a3a", seed: 5 }
      }, SICK = { turn: 0.8, crouch: 4, lean: 4, hy: 1, fx: 2, fy: -20, bx: 8, by: -14, ffx: 3, fbx: -3 }, act16 = {
        onBody: !0,
        poses: [[0, { ...SICK, x: -1, crouch: 5, lean: 5 }], [0.2, { ...SICK, x: 0 }], [0.5, { ...SICK, x: 1 }], [0.8, { ...SICK, x: 1, crouch: 5, lean: 5 }], [1, { ...SICK, x: 0 }], [1.3, { ...SICK, x: -1 }], [1.6, { ...SICK, x: -1, crouch: 5, lean: 5 }]]
      }, D12 = meta45.duration, TICK2 = 0.8, G3 = 760, since2 = (t) => (t % TICK2 + TICK2) % TICK2, actorAlpha3 = () => 0, BODIES = /* @__PURE__ */ new WeakMap();
    }
  });

  // src/fx/nature/spore-burst.js
  var spore_burst_exports = {};
  __export(spore_burst_exports, {
    create: () => create29,
    meta: () => meta46
  });
  function toadstool(p, K2, Sm, Cs, g, sx, sy, glow, sink) {
    let H3 = 17 * g, cw = 17 * sx * g, ch = 13 * sy * g, base = sink, top = base - H3;
    if (g < 0.05) return;
    for (let y = Math.floor(top); y <= Math.min(0, base); y++)
      for (let x = -4; x <= 4; x++) {
        let w = 3 + (y - top) / H3 * 1;
        if (Math.abs(x + 0.5) > w) continue;
        let q = (x + 0.5 + w) / (2 * w);
        p.px(x, y, Math.abs(x + 0.5) > w - 0.8 ? Sm[1] : q < 0.4 ? Sm[4] : q < 0.7 ? Sm[3] : Sm[2]);
      }
    let ring4 = top + H3 * 0.3;
    if (ring4 <= 0) for (let x = -5; x <= 5; x++) p.px(x, ring4 + (Math.abs(x) > 3 ? 1 : 0), Math.abs(x) > 4 ? Sm[1] : Sm[3]);
    let gy = top + 1;
    if (gy <= 0)
      for (let x = Math.floor(-cw); x <= Math.ceil(cw); x++) {
        let d = Math.abs(x + 0.5) / cw;
        d > 0.95 || (p.px(x, gy, d < 0.3 ? Cs[0] : x & 1 ? Sm[2] : Sm[3]), glow > 0.05 && p.px(x, gy, glow > 0.6 && x & 1 ? K2[7] : K2[5]));
      }
    glow > 0.05 && p.glow(0, gy + 2, cw * 1.5 + 6, K2[5], 0.5 * glow), p.shade(-cw - 1, top - ch - 1, cw + 1, top + 1, (x, y, out) => {
      let dx = x / cw, dy = (top - y) / ch, d = dx * dx + dy * dy;
      if (dy < -0.12 || d > 1.12 || y > 0) return;
      if (d > 1) return out.c = Cs[0];
      let i = dx < -0.35 && dy > 0.45 ? 5 : dx < 0.05 && dy > 0.3 ? 4 : dy < 0.18 || dx > 0.55 ? 2 : 3;
      for (let [sx0, sy0, r] of SPOTS2) {
        let ex = (dx - sx0) * cw, ey = (dy - sy0) * ch;
        ex * ex + ey * ey * 1.6 < r * r * g * g && (i = ex < 0 && ey > 0 ? 9 : 8);
      }
      out.c = i === 9 ? Sm[4] : i === 8 ? Sm[3] : Cs[i];
    }), p.px(-cw * 0.45, top - ch * 0.8, Cs[5]);
  }
  function create29(o) {
    let K2 = fit(o.palette, 8), Cs = fit(o.cap, 6), Sm = fit(o.stem, 5), R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [K2[7], K2[6], K2[5], K2[4]], haze: K2[5] }), gas = new Gas(), lights = new Lights(), t = 0, puffed = !1, grown = !1, g = () => ease.outBack(clamp(t / GROW), 1.6) * (1 - ease.inCubic(clamp((t - SINK2) / 0.45))), charge = () => smooth(GROW, PUFF, t), shape2 = () => {
      if (t < PUFF) {
        let k = charge(), j = Math.sin(t * 70) * 0.04 * k;
        return [1 + 0.28 * k + j, 1 + 0.22 * k - j];
      }
      let e = t - PUFF, sp = Math.exp(-e * 7) * Math.cos(e * 26);
      return [1 + 0.25 * sp, 1 - 0.35 * sp];
    };
    return {
      update(dt) {
        t += dt;
        let f = Math.min(1, dt * 120);
        if (!grown) {
          grown = !0;
          for (let i = 0; i < 10; i++) ps.spawn(P.GRIT, R6.range(-4, 4), -1, R6.range(-50, 50), -R6.range(40, 120), R6.range(0.5, 0.8), R6.pick([Sm[1], Sm[2]]), 1);
          for (let i = 0; i < 4; i++) ps.spawn(P.DUST, R6.range(-4, 4), -1, R6.sign() * R6.range(10, 40), -R6.range(4, 12), R6.range(0.4, 0.7), Sm[1], R6.range(2, 3));
        }
        if (t > GROW && t < PUFF - 0.05 && R6.chance(0.25 * f)) {
          let a = R6.range(Math.PI * 1.05, Math.PI * 1.95), d = R6.range(20, 38), x = Math.cos(a) * d, y = -18 + Math.sin(a) * d * 0.7;
          ps.spawn(P.STREAK, x, y, -x * 3, (-18 - y) * 3, R6.range(0.2, 0.3), K2[6]);
        }
        if (!puffed && t >= PUFF) {
          puffed = !0, lights.add(0, -22, 30, WHITE, 0.6, 0.1), lights.add(0, -28, 70, K2[5], 0.55, 0.9);
          for (let i = 0; i < 30; i++) {
            let a = -Math.PI / 2 + R6.range(-1.1, 1.1), sp = R6.range(15, 95);
            gas.add(t, R6.range(-8, 8), -20 + R6.range(-3, 3), Math.cos(a) * sp * 1.3, Math.sin(a) * sp - 10, R6.range(3, 5), R6.range(8, 14), t + R6.range(1.6, 2.2), R6.range(5, 10));
          }
          for (let i = 0; i < 6; i++) {
            let sd = R6.sign();
            gas.add(t, sd * R6.range(6, 12), -5, sd * R6.range(30, 70), -R6.range(2, 14), R6.range(2, 3), R6.range(4, 6), t + R6.range(0.8, 1.1), R6.range(4, 8));
          }
          for (let i = 0; i < 40; i++) {
            let a = -Math.PI / 2 + R6.range(-1.4, 1.4), sp = R6.range(40, 160), mote2 = R6.chance(0.5), k = mote2 ? 0.35 : 0.7;
            ps.spawn(mote2 ? P.MOTE : P.FLAKE, R6.range(-5, 5), -20, Math.cos(a) * sp * k, Math.sin(a) * sp * k, R6.range(1, 2), R6.pick([K2[7], K2[6], K2[6], K2[5]]), R6.range(0.6, 1.6));
          }
          for (let i = 0; i < 6; i++) ps.spawn(P.STAR, R6.range(-20, 20), -R6.range(12, 40), 0, -6, R6.range(0.3, 0.6), K2[7], R6.range(1, 2.4), R6.range(0.05, 0.4));
          for (let i = 0; i < 8; i++) ps.spawn(P.DUST, R6.sign() * R6.range(4, 10), -1, R6.sign() * R6.range(30, 90), -R6.range(2, 10), R6.range(0.5, 0.9), K2[3], R6.range(2, 3.5));
        }
        puffed && t < 2.6 && R6.chance(0.12 * f) && ps.spawn(P.FLAKE, R6.range(-40, 40), -R6.range(30, 70), R6.range(-8, 8), R6.range(4, 14), Math.min(R6.range(0.9, 1.5), meta46.duration - 0.05 - t), R6.chance(0.5) ? K2[7] : K2[6], R6.range(0.6, 1.5)), t > SINK2 && t < SINK2 + 0.4 && R6.chance(0.15 * f) && ps.spawn(P.DUST, R6.range(-5, 5), -1, R6.sign() * R6.range(10, 30), -R6.range(2, 8), R6.range(0.3, 0.5), Sm[1], R6.range(1.5, 2.5)), gas.prune(t), ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let k = charge() * (1 - smooth(PUFF + 0.2, PUFF + 1.2, t));
        if (k > 0) for (let x = -20; x <= 20; x++) p.dot(x, 0, Math.abs(x) < 10 ? K2[5] : K2[4], k * (1 - Math.abs(x) / 21));
        p.glow(0, -2, 30, K2[4], 0.25 * k), ps.draw(p, "back");
      },
      draw(p) {
        let [sx, sy] = shape2(), gl = t < PUFF ? charge() * (0.75 + 0.25 * Math.sin(t * (20 + 30 * charge()))) : Math.max(0, 1 - (t - PUFF) * 1.5);
        if (toadstool(p, K2, Sm, Cs, g(), sx, sy, gl, ease.inCubic(clamp((t - SINK2) / 0.45)) * 20), gas.draw(p, t, K2[2], K2[4], K2[6], K2[7], 0.62, K2[6]), gas.list.length) {
          let cx = 0, cy = 0, n = 0;
          for (let q of gas.list) {
            let g2 = gas.at(q, t);
            cx += g2.x * g2.a, cy += g2.y * g2.a, n += g2.a;
          }
          n > 0.2 && p.glow(cx / n, cy / n, 46, K2[5], Math.min(0.32, 0.03 * n));
        }
        let e = t - PUFF;
        e > 0 && e < 0.1 && sparkle(p, 0, -20, 10 * (1 - e / 0.1), K2[7], K2[6], 0.6), ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta46, GROW, PUFF, SINK2, SPOTS2, init_spore_burst = __esm({
    "src/fx/nature/spore-burst.js"() {
      init_core();
      init_lib11();
      meta46 = {
        name: "Spore burst",
        desc: "A toadstool pushes up, swells and trembles as its gills glow, then squashes and puffs a lumpy cloud of glowing spores that billows up and drifts down twinkling.",
        tags: ["nature", "mushroom", "spores", "poison", "cloud", "ground", "one-shot"],
        size: [212, 132],
        origin: [106, 118],
        duration: 3.2,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: {
          palette: ["#06141c", "#0c2a34", "#11484e", "#17706a", "#22a08a", "#4cd0a8", "#a8f4d0", "#f0fff6"],
          cap: ["#1a0c1e", "#3a1438", "#62204e", "#8e3462", "#bc5276", "#e88a96"],
          stem: ["#2a2230", "#5a4e5e", "#9a8e98", "#d8ccd0", "#f6eeee"],
          seed: 9
        }
      }, GROW = 0.32, PUFF = 0.8, SINK2 = 2.15, SPOTS2 = [[-0.45, 0.45, 1.4], [0.1, 0.72, 1.8], [0.55, 0.38, 1.2], [-0.12, 0.25, 1], [0.3, 0.12, 0.9], [-0.7, 0.16, 0.8]];
    }
  });

  // src/fx/nature/root-snare.js
  var root_snare_exports = {};
  __export(root_snare_exports, {
    act: () => act17,
    create: () => create30,
    meta: () => meta47
  });
  function path(r, cinch) {
    let pts = [];
    for (let i = 0; i <= NP2; i++) {
      let s = i / NP2, th = r.th0 + r.dir * TAU * r.turns * s, rad = lerp(r.r0, r.leg - cinch * 1.6, ease.outCubic(Math.min(1, s * 3.5)));
      pts.push({ x: Math.cos(th) * rad, y: -r.h * Math.pow(s, 1.05) + Math.sin(th) * rad * SY6, z: Math.sin(th), s });
    }
    return pts;
  }
  function root(p, pts, g, C, back, a) {
    let n = Math.floor(NP2 * g);
    for (let i = 0; i < n; i++) {
      let A = pts[i], Bp = pts[i + 1];
      if ((A.z + Bp.z) / 2 >= 0 === back) continue;
      let dx = Bp.x - A.x, dy = Bp.y - A.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, up = nx * -0.6 + ny * -0.8 > 0 ? 1 : -1, w = (1.4 + 3.6 * Math.pow(1 - A.s, 0.8)) / 2 + 0.35, dim = back ? 1 : 0;
      for (let y = Math.floor(Math.min(A.y, Bp.y) - w - 1); y <= Math.ceil(Math.max(A.y, Bp.y) + w + 1); y++)
        for (let x = Math.floor(Math.min(A.x, Bp.x) - w - 1); x <= Math.ceil(Math.max(A.x, Bp.x) + w + 1); x++) {
          if (y > 0) continue;
          let px = x + 0.5 - A.x, py = y + 0.5 - A.y, u = (px * dx + py * dy) / (L * L);
          if (u < -0.2 || u > 1.2) continue;
          let d = px * nx + py * ny;
          if (Math.abs(d) > w) continue;
          let side = Math.sign(d) * up, q = Math.abs(d) / w, i2 = q > 0.72 ? side > 0 ? 7 : 1 : side > 0 ? q > 0.3 ? 6 : 5 : q > 0.35 ? 2 : 3;
          q < 0.25 && rand(Math.round(A.s * 40), 3) < 0.4 && (i2 = 4), p.dot(x, y, C[Math.max(1, i2 - dim)], a);
        }
      i % 7 === 3 && w > 1.2 && p.dot(A.x - nx * up * (w + 1), A.y - ny * up * (w + 1), C[2 - dim], a);
    }
  }
  function create30(o) {
    let C = fit(o.palette, 8), G6 = fit(o.glow, 4), R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [G6[3], G6[2], G6[1], G6[0]] }), lights = new Lights(), chips = [], roots = Array.from({ length: 5 }, (_, i) => ({
      th0: i / 5 * TAU + R6.range(-0.3, 0.3),
      dir: i % 2 ? 1 : -1,
      turns: R6.range(1.1, 1.6),
      r0: R6.range(14, 19),
      leg: R6.range(8, 10),
      h: R6.range(13, 21),
      at: 0.16 + i * 0.07 + R6.range(0, 0.04),
      buds: [R6.range(0.35, 0.55), R6.range(0.6, 0.85)]
    })), cracks5 = [floorCrack(R6, -1, R6.range(18, 26)), floorCrack(R6, 1, R6.range(18, 26))], t = 0, cinched = !1, broken = !1, grow = (r) => ease.outCubic(clamp((t - r.at) / 0.32)), squeeze = () => smooth(CINCH - 0.03, CINCH + 0.05, t) * (1 - 0.4 * smooth(CINCH + 0.05, CINCH + 0.25, t));
    return {
      update(dt) {
        t += dt;
        let f = Math.min(1, dt * 120);
        if (t < 0.4 && R6.chance(0.3 * f)) {
          let sd = R6.sign();
          ps.spawn(P.GRIT, sd * R6.range(4, 22), -1, R6.range(-20, 20), -R6.range(30, 90), R6.range(0.5, 0.9), R6.pick([C[5], C[4]]), 1);
        }
        for (let r of roots)
          if (!r.burst && t >= r.at) {
            r.burst = !0;
            let x = Math.cos(r.th0) * r.r0;
            for (let i = 0; i < 4; i++) chips.push({ x, y: -1, vx: R6.range(-60, 60), vy: -R6.range(60, 160), a: R6.range(0, TAU), va: R6.range(-15, 15), s: R6.range(1.2, 2), pts: stoneShape(R6), life: R6.range(0.6, 0.9) });
            for (let i = 0; i < 3; i++) ps.spawn(P.DUST, x, -1, R6.range(-25, 25), -R6.range(4, 18), R6.range(0.4, 0.8), C[5], R6.range(2, 3.5));
            lights.add(x, -4, 20, G6[2], 0.35, 0.3);
          }
        if (!cinched && t >= CINCH) {
          cinched = !0, lights.add(0, -10, 40, G6[3], 0.5, 0.3), lights.add(0, -10, 16, WHITE, 0.4, 0.06);
          for (let i = 0; i < 8; i++) ps.spawn(P.DUST, R6.range(-12, 12), -R6.range(0, 4), R6.sign() * R6.range(20, 60), -R6.range(4, 14), R6.range(0.5, 0.9), C[5], R6.range(2, 3.5));
          for (let i = 0; i < 6; i++) ps.spawn(P.STAR, R6.range(-9, 9), -R6.range(4, 20), 0, -4, R6.range(0.25, 0.5), G6[3], R6.range(0.8, 1.8), R6.range(0, 0.1));
        }
        if (t > CINCH && t < BREAK3 && R6.chance(0.06 * f) && ps.spawn(P.MOTE, R6.range(-9, 9), -R6.range(3, 18), R6.range(-6, 6), -R6.range(14, 30), R6.range(0.5, 0.9), G6[3], 0.6), !broken && t >= BREAK3) {
          broken = !0, lights.add(0, -10, 36, G6[2], 0.4, 0.25);
          for (let r of roots) {
            let pts = path(r, 1);
            for (let i = 2; i < NP2; i += 4) {
              let q = pts[i], w = 1.4 + 3.6 * Math.pow(1 - q.s, 0.8);
              chips.push({ x: q.x, y: Math.min(q.y, -1), vx: (Math.sign(q.x) || 1) * R6.range(25, 85) + q.x * 3, vy: -R6.range(50, 150), a: R6.range(0, TAU), va: R6.range(-10, 10), s: clamp(w * 0.75, 1.5, 3), pts: stoneShape(R6), life: Math.min(R6.range(0.7, 0.95), meta47.duration - 0.05 - t) }), i % 10 === 2 && ps.spawn(P.GRIT, q.x, Math.min(q.y, -1), R6.range(-40, 40), -R6.range(20, 80), Math.min(R6.range(0.6, 0.9), meta47.duration - 0.05 - t), R6.pick([C[4], C[3], C[2]]), R6.chance(0.3) ? 2 : 1);
            }
          }
          for (let i = 0; i < 10; i++) ps.spawn(P.SMOKE, R6.range(-12, 12), -R6.range(2, 16), R6.range(-25, 25), -R6.range(5, 20), Math.min(R6.range(0.6, 0.9), meta47.duration - 0.05 - t), C[5], R6.range(3, 5), 0, 0);
        }
        for (let i = chips.length - 1; i >= 0; i--) {
          let c = chips[i];
          (c.life -= dt) <= 0 && chips.splice(i, 1), c.vy += 950 * dt, c.x += c.vx * dt, c.y += c.vy * dt, c.a += c.va * dt, c.y > 0 && c.vy > 0 && (c.vy > 110 ? (c.y = 0, c.vy *= -0.3, c.vx *= 0.5) : (c.y = 0, c.vy = c.vx = c.va = 0));
        }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let open = ease.outCubic(clamp(t / 0.25)), hot = smooth(0, 0.3, t) * (1 - smooth(0.5, 1.4, t)), fade = 1 - smooth(meta47.duration - 0.6, meta47.duration - 0.15, t);
        for (let c of cracks5) {
          let m = Math.max(2, Math.ceil(c.length * open));
          for (let k = 1; k < m; k++) {
            let [x0, y0] = c[k - 1], [x1, y1] = c[k];
            p.line(x0, y0 + 1, x1, y1 + 1, C[0], fade), p.line(x0, y0, x1, y1, hot > 0.5 ? G6[3] : hot > 0.2 ? G6[2] : C[1], fade), k % 2 === 0 && p.glow(x1, y1, 6, G6[2], 0.3 * hot);
          }
        }
        let hold = smooth(0.3, CINCH, t) * (1 - smooth(BREAK3, BREAK3 + 0.3, t)) * (0.8 + 0.2 * Math.sin(t * 8));
        if (hold > 0 && (p.glow(0, -12, 30, G6[2], 0.3 * hold), p.glow(0, -1, 22, G6[3], 0.16 * hold)), t < BREAK3) for (let r of roots) t > r.at && root(p, path(r, squeeze()), grow(r), C, !0, 1);
        ps.draw(p, "back");
      },
      draw(p) {
        if (t < BREAK3) {
          for (let r of roots) {
            if (t <= r.at) continue;
            let pts = path(r, squeeze()), g = grow(r);
            root(p, pts, g, C, !1, 1);
            for (let b of r.buds) {
              let q = pts[Math.floor(b * NP2)], lk = clamp((t - CINCH - 0.1 - b * 0.2) / 0.25);
              b > g || lk <= 0 || q.z < 0 || drawLeaf(p, q.x + 2, q.y - 2, 5 * lk, 1.6, -0.6 + Math.sin(t * 5 + b * 9) * 0.2, 0.3, [G6[0], G6[1], G6[2], G6[3]]);
            }
          }
          let e = t - CINCH;
          if (e > 0 && e < 0.12) for (let [x, y] of [[-8, -6], [8, -10], [-7, -15]]) sparkle(p, x, y, 5 * (1 - e / 0.12), C[7], G6[3], 0.4);
          let w = BREAK3 - t;
          if (w > 0 && w < 0.05) for (let r of roots) for (let q of path(r, 1)) q.z >= 0 && p.px(q.x, q.y, WHITE);
        }
        let BARK = [C[0], C[1], C[2], C[2], C[3], C[4], C[5]];
        for (let c of chips) drawRock(p, c.x, c.y, c.s, c.a, c.pts, BARK, Math.min(1, c.life / 0.25));
        ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta47, GRAB, act17, SY6, CINCH, BREAK3, NP2, init_root_snare = __esm({
    "src/fx/nature/root-snare.js"() {
      init_core();
      init_lib11();
      meta47 = {
        name: "Root snare",
        desc: "The floor cracks and roots burst up round the character, spiralling round its legs; they cinch tight with a snap, hold, then crack and crumble into bark and dust.",
        tags: ["nature", "roots", "plant", "snare", "root", "status", "actor", "one-shot"],
        size: [128, 96],
        origin: [64, 78],
        duration: 2.7,
        loop: !1,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: {
          palette: ["#140c08", "#2a1a10", "#46301e", "#64462a", "#86623a", "#a8824e", "#ccaa70", "#ecd6a0"],
          glow: ["#123818", "#2f7a2a", "#6cb83a", "#c8f070"],
          seed: 7
        }
      }, GRAB = { turn: 0.9, crouch: 3, fx: -12, fy: -34, bx: 12, by: -28, ffx: -2, fbx: 3 }, act17 = {
        poses: [
          [-0.24, { ...READY, ffx: -2, fbx: 3 }],
          [0.3, { turn: 0.9, lean: -1, crouch: 2, fx: -10, fy: -24, bx: 11, by: -24, ffx: -2, fbx: 3 }],
          [0.62, GRAB, "snap"],
          [0.86, { ...GRAB, lean: -3, fy: -37, by: -27 }],
          [1.1, { ...GRAB, lean: 3, fy: -27, by: -37 }],
          [1.34, { ...GRAB, lean: -3, fy: -37, by: -27 }],
          [1.58, { ...GRAB, lean: 3, fy: -27, by: -37 }],
          [1.75, { ...GRAB, crouch: 6 }],
          [1.8, { turn: 1.1, crouch: -1, y: -3, fx: -14, fy: -36, bx: 15, by: -36, ffx: -3, ffy: -6, fbx: 4, fby: -6 }, "snap"],
          [2.05, { ...READY, y: 0, crouch: 5 }],
          [2.7, { ...READY, ffx: -2, fbx: 3 }]
        ],
        hits: [{ t: 0.62, stop: 0.05, shake: 0.1, amp: 1 }, { t: 1.75, stop: 0.04, shake: 0.14, amp: 2 }]
      }, SY6 = 0.34, CINCH = 0.62, BREAK3 = 1.75, NP2 = 48;
    }
  });

  // src/fx/nature/thorns.js
  var thorns_exports = {};
  __export(thorns_exports, {
    create: () => create31,
    meta: () => meta48
  });
  function thorn(p, s, h, C, opts) {
    if (h < 1.5) return;
    let { x, w, hook, lean } = s, base = opts.base ?? 0, white = opts.white, cx = (u) => x + lean * u + hook * Math.pow(u, 2.4), hw = (u) => w / 2 * Math.pow(1 - u, 0.9) + 0.25, inside = (px, py) => {
      let u = (base - (py + 0.5)) / h;
      if (u < 0 || u > 1 || py + 0.5 > 0) return !1;
      let c = cx(u), fx = px + 0.5;
      return Math.abs(fx - c) <= hw(u);
    }, X0 = Math.floor(x - w - 6), X1 = Math.ceil(x + w / 2 + Math.abs(lean) + Math.abs(hook) + 2);
    for (let py = Math.floor(base - h) - 1; py <= Math.min(0, Math.ceil(base)); py++)
      for (let px = X0; px <= X1; px++) {
        if (!inside(px, py)) {
          py <= 0 && (inside(px - 1, py) || inside(px + 1, py) || inside(px, py + 1) || inside(px, py - 1)) && p.dot(px, py, C[0], opts.a ?? 1);
          continue;
        }
        if (white) {
          p.px(px, py, WHITE);
          continue;
        }
        let u = (base - (py + 0.5)) / h, c = cx(u), r = hw(u), q = (px + 0.5 - (c - r)) / (2 * r), i = q < 0 ? 4 : q < 0.16 ? 6 : q < 0.36 ? 5 : q < 0.46 ? 7 : q < 0.7 ? 4 : q < 0.86 ? 3 : 2;
        u > 0.86 && (i = q < 0.6 ? 7 : 5), i < 7 && i > 2 && rand(px, Math.floor((py + 0.5 - base) / 3), s.seed) < 0.12 && (i -= 1), p.px(px, py, C[i]);
      }
    if (!white && h > 14) {
      let y0 = base - 0.34 * h, y1 = base - 0.46 * h, e0 = cx(0.34) - hw(0.34), e1 = cx(0.46) - hw(0.46), L = w * 0.45;
      y0 <= 0 && (p.tri(e0 + 0.5, y0, e1 + 0.5, y1, e1 - L, y1 - L * 0.7, C[3]), p.line(e1, y1, e1 - L, y1 - L * 0.7, C[6]), p.px(e1 - L, y1 - L * 0.7, C[7]), p.line(e0, y0 + 1, e1 - L + 1, y1 - L * 0.7 + 1, C[0]));
    }
  }
  function create31(o) {
    let C = fit(o.palette, 8), G6 = fit(o.glow, 4), S = fit(o.soil, 8), R6 = new Rng(o.seed), floor = () => 0, n = Math.max(2, o.count), ps = new Particles({ rng: R6, ground: floor, sparks: [G6[3], G6[2], G6[1], G6[0]] }), lights = new Lights(), chips = [], list = Array.from({ length: n }, (_, i) => {
      let k = i / (n - 1), h = 12 + 36 * k + R6.range(-1.5, 1.5);
      return { x: 10 + i * (104 / (n - 1)) + R6.range(-3, 3), h, w: 6 + 9 * k, lean: R6.range(-1, 1.5) + k * 2, hook: h * R6.range(0.14, 0.22), at: 0.12 + i * 0.075, sink: 1.45 + i * 0.06, seed: R6.int(1, 999), up: !1, down: !1 };
    }), reach = list[n - 1].x + 8, t = 0, chip2 = (x, sp, nn) => {
      for (let i = 0; i < nn; i++) {
        let a = -Math.PI / 2 + R6.range(-1.1, 1.1), v = R6.range(60, 210) * sp;
        chips.push({ x: x + R6.range(-3, 3), y: -1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: R6.range(0, TAU), va: R6.range(-15, 15), s: R6.range(1.3, 2.6) * Math.sqrt(sp), pts: stoneShape(R6), life: Math.min(R6.range(0.7, 1.1), meta48.duration - 0.05 - t) });
      }
    }, grown = (s) => t < s.at ? 0 : ease.outBack(clamp((t - s.at) / RISE2), 2.4), sunk = (s) => smooth(s.sink, s.sink + SINK3, t);
    return {
      update(dt) {
        t += dt;
        let f = Math.min(1, dt * 120);
        for (let s of list) {
          let k = s.h / 48;
          if (!s.up && t >= s.at) {
            s.up = !0, lights.add(s.x, -s.h * 0.5, 18 + 18 * k, WHITE, 0.45, 0.08), lights.add(s.x, -s.h * 0.4, 26 + 26 * k, G6[2], 0.45, 0.4), chip2(s.x, 0.6 + 0.6 * k, 3 + Math.round(5 * k));
            for (let i = 0; i < 10 + 18 * k; i++) {
              let a = -Math.PI / 2 + R6.range(-1, 1), v = R6.range(60, 230) * (0.6 + 0.6 * k);
              ps.spawn(P.GRIT, s.x + R6.range(-s.w / 3, s.w / 3), -1, Math.cos(a) * v, Math.sin(a) * v, R6.range(0.6, 1.1), R6.pick([S[5], S[4], S[3]]), R6.chance(0.3) ? 2 : 1);
            }
            for (let i = 0; i < 3 + 5 * k; i++) ps.spawn(P.SMOKE, s.x + R6.range(-4, 4), -R6.range(1, 4), R6.sign() * R6.range(20, 80), -R6.range(5, 25), R6.range(0.7, 1.2), S[5], R6.range(3, 5.5) * (0.6 + 0.5 * k), 0, 0);
            for (let i = 0; i < 2 + 3 * k; i++) ps.spawn(P.STAR, s.x + s.hook * 0.8 + R6.range(-3, 3), -s.h * R6.range(0.5, 1), R6.range(-10, 10), -R6.range(5, 20), R6.range(0.3, 0.6), G6[3], R6.range(0.8, 2), R6.range(0, 0.12));
            for (let i = 0; i < 4; i++) ps.spawn(P.MOTE, s.x + R6.range(-3, 3), -R6.range(2, s.h * 0.6), R6.range(-20, 20), -R6.range(30, 70), R6.range(0.4, 0.8), G6[3], 0.7);
          }
          if (!s.down && t >= s.sink) {
            s.down = !0, chip2(s.x, 0.35, 2 + Math.round(2 * k));
            for (let i = 0; i < 3 + 3 * k; i++) ps.spawn(P.DUST, s.x + R6.range(-s.w / 2, s.w / 2), -R6.range(0, 3), R6.sign() * R6.range(15, 50), -R6.range(2, 10), Math.min(R6.range(0.4, 0.7), meta48.duration - 0.05 - t), S[5], R6.range(2, 4));
          }
          s.up && !s.down && t > s.at + 0.2 && R6.chance(0.05 * f) && ps.spawn(P.STAR, s.x + s.lean * 0.5 - s.w * 0.15, -s.h * R6.range(0.3, 0.8), 0, -3, R6.range(0.25, 0.45), C[7], R6.range(0.8, 1.8));
        }
        for (let i = chips.length - 1; i >= 0; i--) {
          let c = chips[i];
          (c.life -= dt) <= 0 && chips.splice(i, 1), c.vy += 950 * dt, c.x += c.vx * dt, c.y += c.vy * dt, c.a += c.va * dt, c.y > 0 && c.vy > 0 && (c.vy > 120 ? (c.y = 0, c.vy *= -0.3, c.vx *= 0.6, c.va *= 0.5) : (c.y = 0, c.vy = c.vx = c.va = 0));
        }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let run = ease.outCubic(clamp((t - 0.04) / 0.5)) * reach, fade = 1 - smooth(1.9, 2.3, t);
        for (let x = -2; x <= run; x++) {
          let hot = clamp(1 - (run - x) / 18) * (1 - smooth(0.6, 1.2, t)), h = rand(x, 31);
          p.dot(x, 0, hot > 0.4 ? G6[3] : hot > 0.1 ? G6[2] : S[0], fade), h < 0.5 && p.dot(x, 1, S[1], fade * 0.8), h < 0.15 && p.dot(x, -1, S[4], fade), hot > 0.3 && (x & 3) === 0 && p.glow(x, 0, 6, G6[2], 0.3 * hot);
        }
        ps.draw(p, "back");
      },
      draw(p) {
        for (let s of list) {
          let g = grown(s), k = sunk(s);
          if (g <= 0 || k >= 1) continue;
          thorn(p, s, s.h * g, C, { white: t - s.at < 0.035, base: k * s.h * 1.05 }), t - s.at < 0.3 && p.glow(s.x, -s.h * 0.5 * g, s.h * 0.6 + 6, G6[2], 0.35 * (1 - (t - s.at) / 0.3));
          let lk = clamp((t - s.at - 0.04) / 0.18) * (1 - k), lw = s.w * 0.5;
          if (lk > 0.05)
            for (let [sd, a0, sz] of [[-1, -2.5, 1], [1, -0.55, 0.9], [-1, -1.9, 0.7]]) {
              let la = a0 + sd * 0.25 * (1 - lk) + Math.sin(t * 4 + s.x) * 0.06, L = (5 + s.w * 0.45) * sz * lk;
              drawLeaf(p, s.x + sd * lw + Math.cos(la) * L * 0.5, -1 + Math.sin(la) * L * 0.5, L, 1.4 + s.w * 0.1 * sz, la, 0.35, [G6[0], G6[1], G6[2], G6[3]]);
            }
          p.glow(s.x, -2, s.w + 6, G6[2], 0.18 * lk);
        }
        for (let c of chips) drawRock(p, c.x, c.y, c.s, c.a, c.pts, S, Math.min(1, c.life / 0.25));
        ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta48, RISE2, SINK3, init_thorns = __esm({
    "src/fx/nature/thorns.js"() {
      init_core();
      init_lib11();
      meta48 = {
        name: "Thorns",
        desc: "A seam races along the floor and hooked thorns punch up out of it one after another, each bigger than the last, in bursts of dirt and green light; they hold, then sink.",
        tags: ["nature", "thorns", "plant", "spikes", "ground", "attack", "one-shot"],
        size: [232, 92],
        origin: [48, 78],
        duration: 2.4,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: {
          palette: ["#160c0e", "#2e1418", "#4e2224", "#743a30", "#9a5a3e", "#c08458", "#e2b484", "#fbe8c8"],
          glow: ["#123818", "#2f7a2a", "#6cb83a", "#c8f070"],
          soil: ["#120c0c", "#251917", "#3b2a24", "#553d31", "#715440", "#8f6e52", "#b8966e", "#e6d0a8"],
          count: 6,
          seed: 8
        }
      }, RISE2 = 0.11, SINK3 = 0.36;
    }
  });

  // src/fx/nature/toxic-puddle.js
  var toxic_puddle_exports = {};
  __export(toxic_puddle_exports, {
    draw: () => draw18,
    drawBack: () => drawBack7,
    meta: () => meta49
  });
  function surf(x, W4, t) {
    let d = Math.min(1, Math.abs(x) / W4), ph = TAU * t / D13, lens = Math.sqrt(1 - d * d) * 6.6 + (d > 0.8 ? 1.6 * smooth(0.8, 0.9, d) : 0), swell = Math.max(0, Math.sin(x * 0.09 - ph)) ** 6 * 1.2 + Math.max(0, Math.sin(x * 0.06 + ph * 2 + 1)) ** 8 * 0.9;
    return -Math.round(lens + swell * (1 - d));
  }
  function pool(p, C, Sh, W4, t, seed2) {
    let ph = t / D13;
    for (let x = Math.floor(-W4 - 1); x <= Math.ceil(W4 + 1); x++) {
      let d = Math.abs(x + 0.5) / W4;
      if (d > 1.03) continue;
      let top = surf(x + 0.5, W4, t), oil = 0.6 * tileNoise(x * 0.08, ph * 4, 0, 4, seed2) + 0.6 * tileNoise(x * 0.11 - ph * 4, 1, 4, 0, seed2 + 1), hue = tileNoise(x * 0.05, ph * 2 + 7, 0, 2, seed2 + 3);
      for (let y = top; y <= 2; y++) {
        if (y === 2 && d > 0.75 || y === 1 && d > 0.9) continue;
        let c;
        if (d > 0.93 && y <= 0) c = y === top ? C[7] : C[6];
        else if (y === top) {
          let glint2 = Math.abs(((x * 0.07 - ph * 3) % 1 + 1) % 1 - 0.5) < 0.012 || rand(x, Math.floor(t * 10)) < 0.015;
          c = glint2 ? WHITE : oil > 0.55 ? hue > 0 ? Sh[3] : Sh[2] : oil > 0.15 && hue > 0 ? Sh[1] : C[5], glint2 && p.light(x, y, C[7], 0.5);
        } else if (y === top + 1) c = oil > 0.4 ? Sh[0] : C[3];
        else if (y >= 1) c = C[0];
        else {
          let pulse2 = 0.5 + 0.5 * Math.sin(TAU * t / D13 + x * 0.03), v = Math.abs(tileNoise(x * 0.09, y * 0.75 + ph * 4, 0, 4, seed2 + 7) + 0.2 * Math.sin(TAU * t * 2 / D13 + x * 0.15)), w = 0.6 + 0.6 * pulse2;
          c = v < 0.035 * w ? C[7] : v < 0.08 * w ? C[6] : v < 0.14 * w ? C[4] : C[1], v < 0.08 * w && p.light(x, y, C[6], 0.25 + 0.3 * pulse2);
        }
        p.px(x, y, c);
      }
      d > 0.9 && d <= 1.03 && p.px(x, top - 1, C[1]);
    }
    for (let s of [-1, 1])
      for (let k = 1; k <= 6; k++) p.dot(s * (W4 + k), 0, k < 3 ? C[6] : C[5], 1 - k / 7);
  }
  function bubbles(p, C, Sh, W4, t, seed2) {
    cycle(t, D13, 8, seed2, (g) => g.range(2.4, 3.2), (age, L, R6) => {
      let swell = R6.range(1, 1.6), x = R6.range(-0.7, 0.7) * W4, rmax = R6.range(4.5, 8), sy = surf(x, W4, t) + 0.5;
      if (age < swell) {
        let k = age / swell, st = smooth(0.65, 1, k), gr = ease.outCubic(Math.min(1, k * 1.3)), rx = rmax * gr * (1 - 0.18 * st), ry = rmax * gr * (1 + 0.5 * st), X = Math.round(x), Y3 = Math.round(sy), inner = 0.35 + 0.65 * k;
        for (let j = -Math.ceil(ry) - 1; j <= 0; j++)
          for (let i = -Math.ceil(rx) - 1; i <= Math.ceil(rx) + 1; i++) {
            let dd = Math.hypot(i / Math.max(0.6, rx), j / Math.max(0.6, ry));
            if (dd > 1.1) continue;
            let c;
            dd > 0.9 ? c = C[0] : dd < 0.55 * inner && j > -ry * 0.75 ? c = dd < 0.3 * inner ? C[6] : C[5] : dd < 0.8 * inner ? c = C[4] : c = j < -ry * 0.5 ? C[2] : C[3], p.px(X + i, Y3 + j, c);
          }
        if (rx > 1.8)
          for (let a = 3.5; a < 4.7; a += 0.16) p.px(X + Math.cos(a) * rx * 0.68, Y3 + Math.sin(a) * ry * 0.68, a < 3.9 ? Sh[3] : a < 4.3 ? C[7] : Sh[1]);
        rx > 1.2 && (p.px(X - Math.round(rx * 0.35), Y3 - Math.round(ry * 0.62), WHITE), p.px(X - Math.round(rx * 0.35) + 1, Y3 - Math.round(ry * 0.62), C[7])), p.glow(x, sy - ry * 0.5, 7 + rx * 1.4, C[6], (0.2 + 0.35 * st) * gr);
        return;
      }
      let e = age - swell;
      if (e < 0.3) {
        let k = e / 0.3, rr = 2 + 14 * ease.outCubic(k);
        for (let a = 0; a < TAU; a += 0.5 / rr) {
          let rx2 = x + Math.cos(a) * rr, ry2 = sy + Math.sin(a) * rr * 0.22;
          Math.abs(rx2) < W4 * 0.95 && p.dot(rx2, ry2, k < 0.4 ? WHITE : k < 0.7 ? C[7] : C[6], (1 - k) * 1.4);
        }
        p.glowRing(x, sy, rr, 3, C[6], 0.35 * (1 - k)), e < 0.1 && p.glow(x, sy - 2, 18, C[6], 0.7 * (1 - e / 0.1));
      }
      for (let j = 0; j < 7; j++) {
        let vx = (rand(j, seed2, Math.round(x * 10)) - 0.5) * 80, vy = -45 - rand(j, seed2 + 3, Math.round(x * 10)) * 70, [dx, dy] = fly(x, sy - 2, vx, vy, e, 420);
        dy < sy && e < 0.6 && (p.px(dx, dy, C[1]), p.px(dx, dy - 1, j & 1 ? Sh[3] : C[6]));
      }
      ribbon(p, C, x, sy - 2, e, L - swell, R6, 0.9);
    });
  }
  function ribbon(p, C, x0, y0, age, life, R6, k) {
    let u = age / life, len2 = R6.range(16, 26), rise = R6.range(9, 14), amp = R6.range(2, 4.5), w = R6.range(0.18, 0.3), ph = R6.range(0, TAU), head4 = rise * age, tail2 = Math.max(0, head4 - len2), fray = smooth(0.35, 0.85, u), fade = smooth(0, 0.12, u) * (1 - smooth(0.5, 1, u)) * k;
    if (fade < 0.02) return;
    let GREY = hex("#b4b8ae"), n = fray > 0.05 ? 3 : 1;
    for (let h = tail2; h <= head4; h += 0.5) {
      let s = (h - tail2) / Math.max(1, head4 - tail2), cx = x0 + amp * Math.sin(h * w + ph + age * 1.6) * (0.3 + s), y = y0 - h, a = fade * Math.sin(Math.PI * s) * 0.45, lit = Math.max(0, 1 - h / 22) * (1 - 0.6 * fray), VAP = mix(GREY, C[6], 0.75 * lit);
      for (let q = 0; q < n; q++) {
        let off2 = n === 1 ? 0 : fray * s * (q - 1) * 3 + fray * 2.5 * Math.sin(h * (0.35 + q * 0.17) + ph * (q + 1) + age * 2);
        p.blend(cx + off2, y, VAP, a * (n === 1 ? 1 : 0.65 - 0.25 * fray) * (0.8 + 0.4 * lit));
      }
    }
  }
  function drawBack7(p, t, o) {
    let C = fit(o.palette, 8), Sh = fit(o.sheen, 4), W4 = o.width, pulse2 = 0.85 + 0.15 * Math.sin(TAU * t * 2 / D13);
    p.glow(0, -3, W4 * 1.25, C[5], 0.22 * pulse2), p.glow(0, -10, W4 * 1.1, C[6], 0.1 * pulse2);
    for (let s of [-1, 1]) p.glow(s * W4, -1, 12, C[6], 0.35 * pulse2);
    pool(p, C, Sh, W4, t, o.seed);
  }
  function draw18(p, t, o) {
    let C = fit(o.palette, 8), Sh = fit(o.sheen, 4), W4 = o.width;
    bubbles(p, C, Sh, W4, t, o.seed * 7 + 1), cycle(t, D13, 9, o.seed * 13 + 4, (g) => g.range(2.4, 3.4), (age, L, R6) => {
      let x = R6.range(-0.85, 0.85) * W4;
      ribbon(p, C, x, surf(x, W4, t) - 1, age, L, R6, 0.75);
    });
  }
  var meta49, D13, init_toxic_puddle = __esm({
    "src/fx/nature/toxic-puddle.js"() {
      init_core();
      meta49 = {
        name: "Toxic puddle",
        desc: "Black tar lit from inside by chartreuse veins and a glowing rim, an oily sheen drifting on it; glossy bubbles dome, stretch and pop, vapour curls up in fraying ribbons.",
        tags: ["nature", "poison", "toxic", "sludge", "tar", "puddle", "hazard", "ground", "loop"],
        size: [176, 100],
        origin: [88, 86],
        duration: 4,
        loop: !0,
        fps: 30,
        bg: "ground",
        options: {
          palette: ["#06070a", "#0c100c", "#141a10", "#1e2814", "#2e3c18", "#5a7a1c", "#a6d42a", "#ecff86"],
          sheen: ["#2a1648", "#5a2e8e", "#1e7a86", "#6adccc"],
          width: 42,
          seed: 2
        }
      }, D13 = meta49.duration;
    }
  });

  // src/fx/nature/earth-spike.js
  var earth_spike_exports = {};
  __export(earth_spike_exports, {
    create: () => create32,
    meta: () => meta50
  });
  function create32(o) {
    let S = fit(o.palette, 8), G6 = fit(o.glow, 5), R6 = new Rng(o.seed), floor = () => 0, H3 = o.height, DUST5 = mix(S[6], hex("#8c8494"), 0.45), DUST22 = mix(S[5], hex("#6c6474"), 0.4), ps = new Particles({ rng: R6, ground: floor, sparks: [G6[4], G6[3], G6[2], G6[1]] }), bits = new Bits({ ground: floor }), lights = new Lights(), spikes2 = [
      { x: -H3 * 0.17, H: H3 * 0.52, w: H3 * 0.22, lean: -H3 * R6.range(0.13, 0.18), at: UP2 + 0.045, split: SPLIT - 0.1, back: !0 },
      { x: H3 * 0.18, H: H3 * 0.4, w: H3 * 0.2, lean: H3 * R6.range(0.11, 0.15), at: UP2 + 0.085, split: SPLIT + 0.08, back: !1 },
      { x: 0, H: H3, w: H3 * 0.36, lean: R6.range(-2, 2), at: UP2, split: SPLIT, back: !1, main: !0 }
    ];
    for (let s of spikes2)
      s.look = spikeLook(R6), s.cracks = [spikeCrack(R6, R6.range(0.04, 0.16), R6.range(-0.6, -0.1), 1), spikeCrack(R6, R6.range(0.22, 0.4), R6.range(0.1, 0.6), -1), spikeCrack(R6, R6.range(0.42, 0.58), R6.range(-0.4, 0.4), R6.sign())], s.up = s.split0 = !1, s.cut = R6.range(0.24, 0.32), s.top = 1;
    let cracks5 = [floorCrack(R6, -1, R6.range(34, 44)), floorCrack(R6, 1, R6.range(34, 44)), floorCrack(R6, -1, R6.range(14, 20)), floorCrack(R6, 1, R6.range(14, 20))], slabs = [-1, 1].map((sd) => ({ sd, x: sd * R6.range(13, 16), pts: [[-1.2, -0.32], [1.1, -0.42], [1.2, 0.36], [-1.1, 0.4]], s: R6.range(5.5, 7), a: sd * R6.range(0.45, 0.65) })), rock6 = (b) => bits.add({ ...b, pts: stoneShape(R6) }), t = 0, grown = (s) => t < s.at ? 0 : ease.outBack(clamp((t - s.at) / RISE3), 2.2), open = () => ease.outCubic(clamp((t - 0.02) / 0.24)), heat2 = () => t < UP2 ? smooth(0, UP2, t) : 1 - smooth(UP2, UP2 + 0.9, t), gap2 = (s) => smooth(s.split, s.split + PART2, t) * (s.main ? 3 : 2), tip = (s) => smooth(s.split, s.split + PART2 + FALL2, t) * 0.12 * s.H, topAt = (s) => lerp(1, s.cut, ease.inQuad(clamp((t - s.split - 0.04) / FALL2))), erupt = (s) => {
      let k = s.H / H3;
      lights.add(s.x, -s.H * 0.4, 30 * k + 14, WHITE, 0.5 * k + 0.1, 0.1), lights.add(s.x, -10, 60 * k + 20, G6[2], 0.34 * k, 0.5);
      for (let i = 0; i < Math.round(16 * k) + 3; i++) {
        let a = -Math.PI / 2 + R6.range(-1.1, 1.1), sp = R6.range(140, 360) * (0.6 + 0.4 * k);
        rock6({ kind: B.CHUNK, x: s.x + R6.range(-s.w / 3, s.w / 3), y: -R6.range(1, 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 1, drag: 0.35, bounce: 0.32, life: R6.range(1.4, 2.4), a: R6.range(0, TAU), va: R6.range(-14, 14), s: R6.range(1.6, 3.8) * (0.6 + 0.4 * k) });
      }
      for (let i = 0; i < Math.round(55 * k) + 10; i++) {
        let u = R6.range(-1, 1), a = -Math.PI / 2 + u * 0.9, sp = R6.range(90, 330) * (1 - 0.35 * Math.abs(u));
        ps.spawn(P.GRIT, s.x + u * s.w * 0.4, -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(1, 2), R6.pick([S[6], S[5], S[4], S[4], S[3]]), R6.chance(0.4) ? 2 : 1);
      }
      for (let i = 0; i < Math.round(9 * k) + 2; i++) {
        let a = -Math.PI / 2 + R6.range(-1.2, 1.2), sp = R6.range(160, 380);
        ps.spawn(P.SPARK, s.x, -R6.range(2, 10), Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.15, 0.4));
      }
      for (let i = 0; i < Math.round(10 * k) + 3; i++) {
        let sd = R6.sign();
        ps.spawn(P.SMOKE, s.x + sd * R6.range(2, 10), -R6.range(1, 4), sd * R6.range(50, 170) * (0.5 + 0.5 * k), -R6.range(3, 16), R6.range(0.9, 1.6), R6.chance(0.5) ? DUST5 : DUST22, R6.range(3, 5.5) * (0.6 + 0.4 * k), R6.range(0, 0.05), PF.BIG);
      }
      for (let i = 0; i < Math.round(14 * k) + 4; i++) {
        let sd = R6.sign();
        ps.spawn(P.DUST, s.x + sd * R6.range(0, 8), -R6.range(0, 3), sd * R6.range(40, 160), -R6.range(2, 20), R6.range(0.5, 1), R6.chance(0.5) ? DUST5 : DUST22, R6.range(1.5, 3.2));
      }
      for (let i = 0; i < Math.round(3 * k) + 1; i++)
        ps.spawn(P.SMOKE, s.x + R6.range(-6, 6), -R6.range(2, 12), R6.range(-20, 20), -R6.range(15, 45), R6.range(1, 1.6), DUST5, R6.range(4, 6) * k + 2, R6.range(0.02, 0.12), PF.BIG);
      if (s.main) {
        for (let i = 0; i < 3; i++) ps.spawn(P.STAR, s.x + R6.range(-5, 5), -R6.range(10, s.H * 0.9), 0, -3, R6.range(0.25, 0.5), S[7], R6.range(1, 2.2), R6.range(0.1, 0.4));
        for (let i = 0; i < 14; i++) ps.spawn(P.GRIT, R6.range(-60, 60), -R6.range(110, 125), R6.range(-15, 15), R6.range(10, 60), R6.range(1.2, 1.8), R6.pick([S[5], S[4], S[3]]), R6.chance(0.35) ? 2 : 1, R6.range(0.25, 0.9));
      }
    }, crumble = (s, u0, u1) => {
      let g = gap2(s), lean = s.lean, tp = tip(s);
      for (let half of [-1, 1]) {
        let u = (u0 + u1) / 2, hw = s.w / 2 * Math.pow(1 - u, 0.85), x = s.x + lean * u + half * (g / 2 + hw * 0.45 + tp * u), y = -u * s.H;
        if (!(hw < 0.8 && half > 0)) {
          rock6({ kind: B.CHUNK, x, y, vx: half * R6.range(8, 40) + lean * 0.6, vy: -R6.range(0, 50), g: 1, drag: 0.3, bounce: 0.3, life: Math.min(R6.range(1.1, 1.6), meta50.duration - 0.15 - t), a: R6.range(0, TAU), va: R6.range(-8, 8), s: clamp(hw * 0.62, 1.6, 4.8) });
          for (let i = 0; i < 3; i++) ps.spawn(P.GRIT, x + R6.range(-2, 2), y + R6.range(-2, 2), half * R6.range(5, 45), -R6.range(10, 70), R6.range(0.9, 1.6), R6.pick([S[6], S[5], S[4], S[3]]), R6.chance(0.35) ? 2 : 1);
        }
      }
      R6.chance(0.5) && ps.spawn(P.DUST, s.x + lean * u1 + R6.range(-4, 4), -u1 * s.H, R6.sign() * R6.range(15, 45), R6.range(20, 60), R6.range(0.35, 0.6), DUST5, R6.range(2, 3.5));
    }, drawShard = (p, s) => {
      let g = grown(s);
      if (g <= 0) return;
      if (t < s.split) {
        let white = t - s.at < 0.04 || t > s.split - 0.045, crack = smooth(CRACK3 + (s.main ? 0 : 0.05), s.split - 0.03, t), sw = (t - s.at) * 0.9 - 0.15, glint2 = sw > 0 && sw % 1.2 < 0.55 ? sw % 1.2 / 0.55 : -1;
        drawSpike(p, s.x, 0, s.H * g, s.w, s.lean * Math.min(1, g), s.look, S, { white, glint: glint2, cracks: s.cracks, crack, heat: smooth(CRACK3, s.split, t), glowRamp: G6 });
        return;
      }
      let top = topAt(s), gp = gap2(s), tp = tip(s), sink = smooth(s.split + FALL2, s.split + FALL2 + SINK4, t) * s.H * (s.cut + 0.06);
      if (!(sink >= s.H * (s.cut + 0.05)))
        for (let half of [-1, 1]) drawSpike(p, s.x + half * gp / 2, sink, s.H, s.w, s.lean + half * tp, s.look, S, { half, clip: top, floor: 0, cracks: s.cracks, crack: 1, heat: 1 - smooth(s.split, s.split + 0.45, t), glowRamp: G6 });
    };
    return {
      update(dt) {
        t += dt;
        let f = Math.min(1, dt * 120);
        if (t < UP2) {
          let L = open();
          for (let c of cracks5)
            if (R6.chance(0.35 * f)) {
              let q = c[Math.min(c.length - 1, Math.floor(R6.range(0, L) * c.length))];
              ps.spawn(P.GRIT, q[0], -1, R6.range(-20, 20), -R6.range(30, 110), R6.range(0.5, 1), R6.pick([S[5], S[4]]), 1), R6.chance(0.25) && ps.spawn(P.DUST, q[0], -1, R6.range(-15, 15), -R6.range(4, 14), R6.range(0.3, 0.6), DUST22, R6.range(1.5, 3));
            }
          t > 0.12 && R6.chance(0.2 * f) && ps.spawn(P.DUST, R6.sign() * R6.range(10, 16), -R6.range(1, 4), R6.sign() * R6.range(10, 30), -R6.range(4, 12), R6.range(0.4, 0.7), DUST22, R6.range(2, 3.5));
        }
        for (let s of spikes2) {
          if (!s.up && t >= s.at && (s.up = !0, erupt(s)), !s.split0 && t >= s.split && (s.split0 = !0, lights.add(s.x, -s.H * 0.5, 30, WHITE, 0.3, 0.08), ps.spawn(P.STAR, s.x + s.lean * 0.5, -s.H * 0.55, 0, -2, 0.3, S[7], 2.5)), t >= s.split) {
            let top = topAt(s);
            for (; s.top - top > 0.045 || top <= s.cut + 1e-6 && s.top > s.cut + 1e-6; ) {
              let u1 = s.top, u0 = Math.max(top, s.top - 0.11);
              if (crumble(s, u0, u1), s.top = u0, u0 <= s.cut + 1e-6) break;
            }
          }
          if (t < s.split && t > CRACK3 && R6.chance(0.12 * f)) {
            let u = R6.range(0.1, 0.7);
            ps.spawn(P.GRIT, s.x + s.lean * u + R6.range(-2, 2), -u * s.H, R6.range(-15, 15), -R6.range(0, 20), R6.range(0.6, 1.1), R6.pick([S[5], S[4]]), 1), R6.chance(0.3) && ps.spawn(P.DUST, s.x + s.lean * u, -u * s.H, R6.range(-10, 10), -R6.range(2, 8), R6.range(0.4, 0.7), DUST5, R6.range(1.5, 2.5));
          }
          if (s.up && t < s.split && t > s.at + 0.2 && R6.chance(0.05 * f)) {
            let u = R6.range(0.2, 0.8), sd = R6.sign();
            ps.spawn(P.GRIT, s.x + s.lean * u + sd * (s.w / 2) * (1 - u), -u * s.H, sd * R6.range(10, 30), -R6.range(0, 15), R6.range(0.7, 1.2), R6.pick([S[6], S[5]]), 1);
          }
          s.main && s.up && t < s.split && t > s.at + 0.25 && R6.chance(0.03 * f) && ps.spawn(P.STAR, s.x + R6.range(-4, 2), -R6.range(8, s.H * 0.85), 0, -2, R6.range(0.25, 0.45), R6.chance(0.5) ? S[7] : G6[3], R6.range(0.8, 2)), t > s.split + FALL2 && t < s.split + FALL2 + SINK4 * 0.8 && R6.chance(0.15 * f) && ps.spawn(P.DUST, s.x + R6.range(-s.w / 2, s.w / 2), -R6.range(0, 2), R6.sign() * R6.range(20, 60), -R6.range(0, 5), R6.range(0.4, 0.7), DUST22, R6.range(1.5, 3));
        }
        bits.update(dt);
        for (let b of bits.list)
          if (b.rest && !b.dusted) {
            b.dusted = !0;
            for (let i = 0; i < 2; i++) ps.spawn(P.DUST, b.x + R6.range(-1.5, 1.5), -0.5, R6.sign() * R6.range(8, 35), -R6.range(2, 14), R6.range(0.3, 0.6), DUST22, R6.range(1.3, 2.6));
          }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let L = open(), hk = heat2(), fade = 1 - smooth(meta50.duration - 1.1, meta50.duration - 0.3, t);
        for (let c of cracks5) {
          let m = Math.max(2, Math.ceil(c.length * L));
          for (let k = 1; k < m; k++) {
            let [x0, y0] = c[k - 1], [x1, y1] = c[k];
            p.line(x0, y0 + 1, x1, y1 + 1, S[0], fade), p.line(x0, y0, x1, y1, hk > 0.65 ? G6[4] : hk > 0.35 ? G6[3] : hk > 0.12 ? G6[2] : hk > 0.03 ? G6[1] : S[1], fade), k % 2 === 0 && p.glow(x1, y1, 6, G6[2], 0.3 * hk);
          }
        }
        hk > 0 && p.glow(0, -3, 26, G6[2], 0.35 * hk), ps.draw(p, "back");
        for (let s of spikes2) s.back && drawShard(p, s);
      },
      draw(p) {
        if (t < UP2 + 0.02) {
          let k = smooth(0.06, UP2, t), hm = 8 * k, jx = Math.sin(t * 95) * 0.8 * k;
          hm > 0.6 && p.shade(-16, -hm - 1, 16, 1, (x, y, out) => {
            let dx = (x - jx) / 15, dy = y / hm, d = dx * dx + dy * dy;
            y > 0.5 || d > 1.18 || (out.c = d > 1 ? S[0] : dy < -0.72 ? S[6] : dx < -0.3 ? S[5] : dx > 0.35 ? S[3] : S[4]);
          });
        }
        if (t >= UP2) {
          let sink = smooth(SPLIT + FALL2, SPLIT + FALL2 + SINK4, t) * 7, a = 1 - smooth(SPLIT + FALL2, SPLIT + FALL2 + SINK4, t);
          for (let sl of slabs) {
            let g = ease.outBack(clamp((t - UP2) / 0.1), 2);
            a > 0 && drawRock(p, sl.x, -1.5 + sink, sl.s * Math.min(1, g), sl.a * g, sl.pts, S, a, t - UP2 < 0.04);
          }
        }
        for (let s of spikes2) s.back || drawShard(p, s);
        let m0 = spikes2[2], leak = smooth(CRACK3, SPLIT, t) * (1 - smooth(SPLIT, SPLIT + 0.5, t));
        leak > 0 && p.glowLine(m0.x, -4, m0.x + m0.lean * 0.6, -m0.H * 0.6, 20, G6[2], 0.22 * leak);
        for (let b of bits.list) drawRock(p, b.x, b.y, b.s, b.a, b.pts, S, Math.min(1, b.life / 0.4));
        ps.draw(p, "front");
        let m = spikes2[2], e = t - m.at;
        if (e > 0 && e < 0.2) {
          let g = ease.outBack(clamp(e / RISE3), 2.2);
          sparkle(p, m.x + m.lean, -m.H * g, 10 * (1 - e / 0.2), S[7], G6[3], 0.5), p.glowLine(m.x, 0, m.x + m.lean, -m.H * g, 10, G6[3], 0.3 * (1 - e / 0.2));
        }
        lights.draw(p);
      }
    };
  }
  var meta50, UP2, RISE3, CRACK3, SPLIT, PART2, FALL2, SINK4, init_earth_spike = __esm({
    "src/fx/nature/earth-spike.js"() {
      init_core();
      init_lib11();
      meta50 = {
        name: "Earth spike",
        desc: "The floor cracks with light and heaves, a faceted stone spike rams up with two side shards in a burst of chips, grit and dust; rubble rains, then it splits and crumbles.",
        tags: ["nature", "earth", "stone", "spike", "ground", "attack", "one-shot"],
        size: [272, 150],
        origin: [136, 132],
        duration: 3.4,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: {
          palette: ["#120c0c", "#251917", "#3b2a24", "#553d31", "#715440", "#8f6e52", "#b8966e", "#e6d0a8"],
          glow: ["#4a1a0c", "#a8401a", "#ff8a2a", "#ffd27a", "#fff4d0"],
          height: 62,
          seed: 5
        }
      }, UP2 = 0.34, RISE3 = 0.09, CRACK3 = 1.18, SPLIT = 1.5, PART2 = 0.1, FALL2 = 0.42, SINK4 = 0.55;
    }
  });

  // src/fx/nature/quake.js
  var quake_exports = {};
  __export(quake_exports, {
    create: () => create33,
    meta: () => meta51
  });
  function create33(o) {
    let S = fit(o.palette, 8), G6 = fit(o.glow, 5), R6 = new Rng(o.seed), floor = () => 0, REACH2 = o.reach, DUST5 = mix(S[6], hex("#8c8494"), 0.4), DUST22 = mix(S[5], hex("#6c6474"), 0.35), ps = new Particles({ rng: R6, ground: floor, sparks: [G6[4], G6[3], G6[2], G6[1]] }), bits = new Bits({ ground: floor }), lights = new Lights(), rift = [];
    for (let x = -REACH2; x <= REACH2; x += R6.range(2.5, 5)) rift.push([x, R6.int(0, 2)]);
    let slabs = [];
    for (let x = -REACH2 + 8; x < REACH2 - 6; x += R6.range(12, 17)) slabs.push({ x: x + R6.range(-2, 2), y: 0, vy: 0, a: 0, va: 0, rest: !0, s: R6.range(4.5, 6), side: R6.sign(), pts: [[-1, -0.38], [1, -0.42], [1.02, 0.4], [-0.98, 0.38]] });
    let t = 0, j = 0, open = () => ease.outCubic(clamp((t - JOLTS[0]) / 0.45)) * REACH2 * (0.55 + 0.45 * smooth(JOLTS[1], JOLTS[1] + 0.3, t)), gap2 = (x) => (1 - smooth(CLOSE2, CLOSE2 + 0.5, t)) * (1 + 2.6 * (1 - Math.abs(x) / REACH2)) * (0.6 + 0.4 * smooth(JOLTS[1], JOLTS[2] + 0.2, t)), heat2 = () => smooth(0, 0.3, t) * (1 - smooth(1.4, CLOSE2 + 0.3, t)) * (0.8 + 0.2 * Math.sin(t * 17)), shake = () => JOLTS.reduce((s, tj, i) => t > tj ? s + Math.exp(-(t - tj) * 9) * Math.sin((t - tj) * 80) * (1.6 - i * 0.3) : s, 0);
    return {
      update(dt) {
        t += dt;
        let f = Math.min(1, dt * 120);
        for (; j < JOLTS.length && t >= JOLTS[j]; ) {
          let k = 1 - j * 0.2, L = open() + 10;
          j++, lights.add(0, -2, 60, G6[2], 0.5 * k, 0.5), lights.add(0, -2, 26, WHITE, 0.4 * k, 0.07);
          for (let s of slabs) {
            let d = Math.abs(s.x) / REACH2;
            Math.abs(s.x) > L || R6.chance(0.25 + d * 0.3) || (s.rest = !1, s.vy = -R6.range(70, 170) * k * (1 - d * 0.5), s.va = s.side * R6.range(3, 8));
          }
          for (let i = 0; i < 70 * k; i++) {
            let x = R6.range(-L, L), a = -Math.PI / 2 + R6.range(-0.6, 0.6), sp = R6.range(40, 200) * k;
            ps.spawn(P.GRIT, x, -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.6, 1.2), R6.pick([S[7], S[6], S[5], S[4]]), R6.chance(0.35) ? 2 : 1);
          }
          for (let i = 0; i < 8 * k; i++) {
            let x = R6.range(-L, L) * 0.8, a = -Math.PI / 2 + R6.range(-0.9, 0.9), sp = R6.range(100, 230) * k;
            bits.add({ kind: B.CHUNK, x, y: -2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 1, drag: 0.5, bounce: 0.3, life: Math.min(R6.range(1.1, 1.6), meta51.duration - 0.1 - t), a: R6.range(0, TAU), va: R6.range(-14, 14), s: R6.range(1.6, 3.2), pts: stoneShape(R6) });
          }
          for (let i = 0; i < 14 * k; i++) {
            let x = R6.range(-L, L) * 0.9;
            ps.spawn(P.SMOKE, x, -R6.range(1, 4), R6.range(-40, 40), -R6.range(15, 55) * k, R6.range(1, 1.7), R6.chance(0.5) ? DUST5 : DUST22, R6.range(4, 7) * k, R6.range(0, 0.15), PF.BIG);
          }
          for (let i = 0; i < 10 * k; i++) {
            let x = R6.range(-L, L) * 0.7, a = -Math.PI / 2 + R6.range(-1, 1), sp = R6.range(120, 300);
            ps.spawn(P.SPARK, x, -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.12, 0.3));
          }
        }
        if (t > JOLTS[0] && t < CLOSE2 && R6.chance(0.3 * f)) {
          let x = R6.range(-1, 1) * open();
          ps.spawn(P.GRIT, x, -1, R6.range(-20, 20), -R6.range(20, 70), R6.range(0.5, 0.8), R6.pick([S[6], S[5]]), 1), R6.chance(0.3) && ps.spawn(P.EMBER, x, -1, R6.range(-10, 10), -R6.range(20, 45), Math.min(R6.range(0.6, 1.2), meta51.duration - 0.1 - t), G6[3], 1), R6.chance(0.25) && ps.spawn(P.DUST, x, -1, R6.range(-15, 15), -R6.range(4, 14), R6.range(0.5, 0.8), DUST22, R6.range(2, 3.5));
        }
        for (let s of slabs)
          if (!s.rest && (s.vy += 950 * dt, s.y += s.vy * dt, s.a += s.va * dt, s.y >= 0 && s.vy > 0))
            if (s.y = 0, s.a = clamp(s.a, -0.45, 0.45), s.vy > 160) s.vy *= -0.25, s.va *= -0.4;
            else {
              s.rest = !0;
              for (let i = 0; i < 3; i++) ps.spawn(P.DUST, s.x + R6.range(-5, 5), -0.5, R6.sign() * R6.range(10, 40), -R6.range(2, 12), R6.range(0.4, 0.7), DUST22, R6.range(1.5, 3));
            }
        bits.update(dt);
        for (let b of bits.list)
          b.rest && !b.dusted && (b.dusted = !0, ps.spawn(P.DUST, b.x, -0.5, R6.sign() * R6.range(8, 30), -R6.range(2, 10), Math.min(R6.range(0.3, 0.6), meta51.duration - 0.1 - t), DUST22, R6.range(1.3, 2.4)));
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let L = open(), hk = heat2(), jx = shake(), fade = 1 - smooth(CLOSE2 + 0.3, CLOSE2 + 0.7, t);
        if (t > JOLTS[0])
          for (let i = 1; i < rift.length; i++) {
            let [x0, d0] = rift[i - 1], [x1, d1] = rift[i];
            if (!(Math.abs(x0) > L)) {
              for (let x = Math.ceil(x0); x < x1; x++) {
                let u = (x - x0) / (x1 - x0), d = Math.round(d0 + (d1 - d0) * u), w = gap2(x), X = x + jx;
                if (w < 0.4) {
                  p.dot(X, d, S[1], fade);
                  continue;
                }
                p.dot(X, d - 1, S[6], fade);
                let deep = rand(Math.floor(x / 3), 41) + (w - 1.5) * 0.35, hot = hk * clamp(deep - 0.35, 0, 1) * 1.6;
                for (let y = 0; y < w; y++) p.dot(X, d + y, y > w / 2 - 1 && hot > 0.25 ? hot > 0.9 && rand(x, Math.floor(t * 12)) < 0.6 ? G6[3] : G6[2] : y > w / 2 - 1 && hot > 0.08 ? G6[1] : S[0], fade);
                p.dot(X, d + Math.ceil(w), S[2], fade);
              }
              i % 3 === 0 && hk > 0 && p.glow(x1 + jx, d1 + 1, 9, G6[2], 0.35 * hk * (1 - Math.abs(x1) / (REACH2 * 1.2)));
            }
          }
        ps.draw(p, "back");
      },
      draw(p) {
        let jx = shake(), sink = smooth(CLOSE2, CLOSE2 + 0.6, t);
        for (let s of slabs) !(s.rest && s.a === 0 && s.y === 0) && sink < 1 && drawRock(p, s.x + jx, s.y - 1.5 + sink * 4, s.s, s.a, s.pts, S, 1 - sink);
        for (let b of bits.list) drawRock(p, b.x, b.y, b.s, b.a, b.pts, S, Math.min(1, b.life / 0.4));
        ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta51, JOLTS, CLOSE2, init_quake = __esm({
    "src/fx/nature/quake.js"() {
      init_core();
      init_lib11();
      meta51 = {
        name: "Quake",
        desc: "The ground jolts three times: a rift tears out along the floor glowing deep inside, slabs of floor heave up and drop back askew, pebbles hop and dust bursts out of the split.",
        tags: ["nature", "earth", "quake", "rift", "aoe", "ground", "one-shot"],
        size: [288, 104],
        origin: [144, 88],
        duration: 3.1,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: {
          palette: ["#0e0c14", "#1a1724", "#211d2d", "#2b2639", "#3a3450", "#4a4263", "#6a6088", "#8e86a8"],
          glow: ["#4a1a0c", "#a8401a", "#ff8a2a", "#ffd27a", "#fff4d0"],
          reach: 118,
          seed: 12
        }
      }, JOLTS = [0.06, 0.5, 0.92], CLOSE2 = 2.2;
    }
  });

  // src/fx/nature/tornado.js
  var tornado_exports = {};
  __export(tornado_exports, {
    draw: () => draw19,
    drawBack: () => drawBack8,
    meta: () => meta52
  });
  function geo(o, t) {
    let ph = TAU * t / meta52.duration;
    return {
      FH: o.height,
      ph,
      ax: (u) => 8.5 * Math.sin(ph - 2.6 * u) * (0.2 + 0.8 * u) + 3 * Math.sin(2 * ph + 1.3 - 4.5 * u) * u,
      rad: (u) => 3 + 20 * Math.pow(u, 1.5) + 17 * Math.pow(smooth(0.78, 1, u), 2)
    };
  }
  function body3(p, C, Dst, g, t, seed2) {
    let { FH: FH2, ax, rad } = g;
    for (let y = -Math.ceil(FH2) + 2; y <= 0; y++) {
      let u = -y / FH2, cx = ax(u), r = rad(u), K2 = 2 + (rand(y, seed2) < 0.35 ? 1 : 0), rot = TAU * K2 * t / meta52.duration, fade = Math.min(1, u * 8 + 0.25) * (1 - smooth(0.9, 1.02, u));
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        let c = (x + 0.5 - cx) / r;
        if (Math.abs(c) > 1) continue;
        let n = tileNoise((Math.acos(c) + rot) * 6 / TAU, y * 0.34, 6, 0, seed2), v = -c * 0.55 + 0.15 + n * 0.55, col = v > 0.6 ? C[6] : v > 0.28 ? C[5] : v > -0.05 ? C[4] : v > -0.4 ? C[3] : C[2];
        u < 0.3 && (col = mix(col, Dst[v > 0.3 ? 3 : v > -0.2 ? 2 : 1], 0.7 * (1 - u / 0.3))), p.blend(x, y, col, (0.14 + 0.36 * Math.sqrt(1 - c * c)) * fade);
      }
    }
  }
  function bands(p, C, g, t, seed2, back) {
    let { FH: FH2, ax, rad } = g;
    for (let j = 0; j < 58; j++) {
      let R6 = rng(seed2, j), u = (j + R6.range(0.1, 0.9)) / 58, K2 = R6.int(2, 4), span = R6.range(0.7, 2.1), lvl = R6.next(), cx = ax(u), r = rad(u) * R6.range(1, 1.1), y0 = -u * FH2, head4 = R6.range(0, TAU) + TAU * K2 * t / meta52.duration;
      if (!(u > 0.97)) {
        for (let s = 0; s <= span; s += 0.5 / Math.max(2, r)) {
          let th = head4 - s, sn = Math.sin(th);
          if (sn > 0 === back) continue;
          let k = s / span, x = cx + r * Math.cos(th), y = y0 + r * SY7 * sn, lit = Math.cos(th) < 0.2, i = lvl < 0.18 ? 2 : k < 0.15 && lvl > 0.55 ? 7 : k < 0.45 ? lit ? 6 : 5 : lit ? 5 : 4;
          back && (i = Math.max(1, i - 2)), k < 0.5 ? p.dot(x, y, C[i]) : p.blend(x, y, C[i], 2 * (1 - k));
        }
        if (!back && lvl > 0.6 && Math.sin(head4) > 0) {
          let hx = cx + r * Math.cos(head4), hy = y0 + r * SY7 * Math.sin(head4);
          p.dot(hx, hy, WHITE), p.glow(hx, hy, 5, C[6], 0.3);
        }
      }
    }
  }
  function blob(p, cx, cy, rx, ry, c, a) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        let dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        dx * dx + dy * dy <= 1 && p.blend(x, y, c, a);
      }
  }
  function crown(p, C, g, t, seed2, back, flash2) {
    let { FH: FH2, ax, rad } = g, cx = ax(1), r = rad(1), L = (c) => mix(c, C[7], flash2 * 0.6), y0 = -FH2 - 3;
    back && (blob(p, cx, y0 + 1, r * 0.85, 6, C[1], 0.6), blob(p, cx - 4, y0 - 3, r * 0.6, 3.5, L(C[3]), 0.45));
    for (let j = 0; j < 16; j++) {
      let R6 = rng(seed2, j), rr = r * R6.range(0.4, 1.15), K2 = R6.int(1, 2), span = R6.range(1.4, 2.8), head4 = R6.range(0, TAU) + TAU * K2 * t / meta52.duration, th0 = R6.range(3.2, 6), lift = R6.range(-4, 3) - (1 - rr / (r * 1.15)) * 5;
      for (let s2 = 0; s2 <= span; s2 += 0.6 / rr) {
        let th = head4 - s2, sn = Math.sin(th);
        if (sn > 0 === back) continue;
        let k = s2 / span, th2 = th0 * Math.sin(Math.PI * Math.pow(1 - k, 0.7)), x = cx + rr * Math.cos(th), y = y0 + lift + rr * SY7 * sn, T2 = Math.max(1, Math.round(th2)), d = back ? 1 : 0, lit = Math.cos(th) < 0.3;
        for (let i = 0; i < T2; i++) {
          let c = i === 0 ? L(C[(lit ? 6 : 5) - d]) : i === T2 - 1 && T2 > 2 ? C[1] : L(C[(i === 1 ? 4 : 3) - d]);
          p.blend(x, y - T2 / 2 + i, c, (0.55 + 0.35 * (1 - k)) * (back ? 0.75 : 1));
        }
      }
    }
  }
  function debris(p, C, L, g, t, seed2, back, S) {
    let { FH: FH2, ax, rad } = g;
    cycle(t, meta52.duration, 24, seed2, (q) => q.range(1.3, 1.95), (age, life, R6, i) => {
      let k = age / life, sk = R6.range(0.15, 0.3), q = clamp((k - sk) / (1 - sk)), u = lerp(0.03, 0.98, Math.pow(q, 0.85)), th = R6.range(0, TAU) + R6.range(2, 3.2) * TAU * k, sn = Math.sin(th);
      if (sn > 0 === back) return;
      let fling = smooth(0.78, 1, q), inward = 1 - smooth(0, sk, k), far2 = R6.range(26, 44), rr = lerp(Math.min(68, rad(u) * (1.12 + fling * 1.1) + R6.range(2, 7)), far2, inward), x = ax(u) + rr * Math.cos(th), y = Math.min(-1, -u * FH2 + rr * SY7 * sn - fling * 8), a = Math.min(1, k * 8) * (1 - smooth(0.85, 1, k)), kind = R6.next(), spin = R6.range(-14, 14) * age, dk = back ? 1 : 0;
      if (kind < 0.62) {
        let o = R6.next() < 0.5 ? 0 : 4, pal = [L[o], L[o + 1], L[o + 2 - dk], L[o + 3 - dk]];
        drawLeaf(p, x, y, R6.range(6, 9), R6.range(1.8, 2.6), spin, age * R6.range(5, 10), pal, a);
      } else if (kind < 0.8) {
        let ca = Math.cos(spin) * 2.5, sa = Math.sin(spin) * 2.5;
        p.line(x - ca, y - sa, x + ca, y + sa, back ? L[0] : L[1], a), p.dot(x + ca, y + sa, L[2], a);
      } else drawRock(p, x, y, R6.range(1.6, 2.6), spin, stoneShape(R6, 5), S, a);
    });
  }
  function skirt(p, D25, g, t, seed2, back) {
    let cx0 = g.ax(0);
    if (cycle(t, meta52.duration, 40, seed2, (q) => q.range(0.7, 1.3), (age, life, R6) => {
      let k = age / life, th = R6.range(0, TAU) + R6.range(5, 9) * age, sn = Math.sin(th);
      if (sn > 0 === back) return;
      let rr = 4 + k * R6.range(14, 28), x = cx0 + rr * Math.cos(th), y = -1.5 - k * R6.range(4, 16) + rr * 0.3 * sn, s = R6.range(3, 6) * (0.6 + 0.8 * k), a = Math.min(1, k * 6) * (1 - k) * 0.6;
      p.disc(x, y + s * 0.2, s, D25[back ? 1 : 2], a), p.disc(x - s * 0.2, y - s * 0.3, s * 0.55, D25[back ? 2 : 3], a * 0.8);
    }), !back) {
      cycle(t, meta52.duration, 16, seed2 + 7, (q) => q.range(0.35, 0.6), (age, life, R6) => {
        let th = R6.range(0, TAU), v = R6.range(25, 55), x = cx0 + Math.cos(th) * (4 + v * age), y = Math.sin(th) * 2 - R6.range(40, 80) * age + 260 * age * age;
        y < 0.5 && p.dot(x, Math.min(0, y), R6.next() < 0.5 ? D25[3] : D25[4], 1 - age / life);
      });
      for (let j = 0; j < 7; j++) {
        let R6 = rng(seed2 + 3, j), rr = R6.range(12, 28), th0 = R6.range(0, TAU) + TAU * 3 * t / meta52.duration, span = R6.range(0.5, 1.1);
        for (let s = 0; s < span; s += 0.6 / rr) {
          let th = th0 - s;
          p.dot(cx0 + rr * Math.cos(th), 0.5 + rr * 0.18 * Math.sin(th), D25[s < span * 0.4 ? 3 : 2], 1 - s / span);
        }
      }
    }
  }
  function flashAt(t) {
    let q = t / meta52.duration;
    return Math.max(0, 1 - Math.abs(q - 0.62) / 0.025) + 0.6 * Math.max(0, 1 - Math.abs(q - 0.69) / 0.015);
  }
  function drawBack8(p, t, o) {
    let C = fit(o.palette, 8), D25 = fit(o.dust, 5), g = geo(o, t), f = flashAt(t);
    skirt(p, D25, g, t, o.seed * 5 + 1, !0), crown(p, C, g, t, o.seed * 7 + 2, !0, f), bands(p, C, g, t, o.seed * 3 + 5, !0), debris(p, C, fit(o.leaves, 8), g, t, o.seed * 11 + 3, !0, C), body3(p, C, D25, g, t, o.seed);
  }
  function draw19(p, t, o) {
    let C = fit(o.palette, 8), D25 = fit(o.dust, 5), g = geo(o, t), f = flashAt(t), cx = g.ax(1);
    if (bands(p, C, g, t, o.seed * 3 + 5, !1), crown(p, C, g, t, o.seed * 7 + 2, !1, f), skirt(p, D25, g, t, o.seed * 5 + 1, !1), debris(p, C, fit(o.leaves, 8), g, t, o.seed * 11 + 3, !1, C), p.glowLine(g.ax(0.1), -g.FH * 0.1, cx, -g.FH * 0.9, 26, C[5], 0.08), p.glow(g.ax(0), -2, 30, D25[3], 0.12), f > 0.05) {
      let R6 = rng(o.seed, 99, Math.floor(t / meta52.duration * 7)), path2 = bolt(R6, cx - 18, -g.FH - 6, cx + 16, -g.FH + 2, { jag: 0.3, depth: 3 });
      p.polyline(path2, f > 0.6 ? WHITE : C[7], Math.min(1, f * 1.5)), p.glow(cx, -g.FH - 2, 70, C[7], 0.45 * f);
    }
  }
  var meta52, SY7, init_tornado = __esm({
    "src/fx/nature/tornado.js"() {
      init_core();
      init_lib11();
      meta52 = {
        name: "Tornado",
        desc: "A snaking funnel of spinning wind bands under a flared, churning top that flickers with lightning; leaves and debris whirl round it front and back, dust boils at its foot.",
        tags: ["nature", "wind", "tornado", "storm", "hazard", "ground", "loop"],
        size: [196, 168],
        origin: [98, 152],
        duration: 2,
        loop: !0,
        fps: 30,
        bg: "ground",
        options: {
          palette: ["#141221", "#231f33", "#36314a", "#4d4762", "#68617d", "#8a839e", "#b3adc4", "#e2def0"],
          dust: ["#2a2018", "#4e3e2e", "#76624a", "#a08a6a", "#cbb894"],
          leaves: ["#4a200c", "#a8541c", "#e8962e", "#ffd27a", "#123818", "#2f7a2a", "#6cb83a", "#c8f070"],
          height: 112,
          seed: 4
        }
      }, SY7 = 0.28;
    }
  });

  // src/fx/nature/leaf-storm.js
  var leaf_storm_exports = {};
  __export(leaf_storm_exports, {
    act: () => act18,
    draw: () => draw20,
    drawBack: () => drawBack9,
    meta: () => meta53
  });
  function leaves(p, L, t, seed2, back) {
    cycle(t, meta53.duration, 28, seed2, (g) => g.range(1.5, 2.3), (age, life, R6) => {
      let k = age / life, turns = R6.range(1.4, 2.2), th = R6.range(0, TAU) + turns * TAU * k, sn = Math.sin(th);
      if (sn > 0 === back) return;
      let y = -lerp(1, TOP7, Math.pow(k, 0.9)) - R6.range(0, 6), fling = smooth(0.75, 1, k), rr = ringR(y) * R6.range(0.85, 1.15) + fling * 22, x = Math.cos(th) * rr, yy = y + sn * rr * SY8, a = Math.min(1, k * 7) * (1 - smooth(0.85, 1, k)), spin = R6.range(-9, 9) * age + th, fl = age * R6.range(5, 11), o = R6.int(0, 2) * 4, pal = back ? [L[o], L[o], L[o + 1], L[o + 2]] : [L[o], L[o + 1], L[o + 2], L[o + 3]];
      drawLeaf(p, x, yy, R6.range(6.5, 9), R6.range(2.4, 3.3), spin, fl, pal, a), !back && Math.abs(Math.cos(fl)) > 0.97 && (p.px(x, yy, WHITE), p.glow(x, yy, 5, L[o + 3], 0.35 * a));
    });
  }
  function wind(p, C, t, seed2, back) {
    for (let j = 0; j < 16; j++) {
      let R6 = rng(seed2, j), y0 = -R6.range(4, TOP7 - 4), r = ringR(y0) * R6.range(1, 1.25), K2 = R6.int(2, 3), span = R6.range(1.1, 2.4), head4 = R6.range(0, TAU) + TAU * K2 * t / meta53.duration, rise = R6.range(-0.18, 0.18);
      for (let s = 0; s <= span; s += 0.45 / r) {
        let th = head4 - s, sn = Math.sin(th);
        if (sn > 0 === back) continue;
        let k = s / span, x = Math.cos(th) * r, y = y0 + sn * r * SY8 + (th - head4) * rise * 4, c = back ? k < 0.3 ? C[3] : C[2] : k < 0.06 && R6.next() < 2 ? WHITE : k < 0.15 ? C[5] : k < 0.4 ? C[4] : C[3];
        k < 0.45 ? p.dot(x, y, c) : p.blend(x, y, c, 1.6 * (1 - k));
      }
      !back && Math.sin(head4) > 0 && p.glow(Math.cos(head4) * r, y0 + Math.sin(head4) * r * SY8, 5, C[4], 0.25);
    }
  }
  function swirl(p, C, L, t, seed2, back) {
    cycle(t, meta53.duration, 14, seed2, (g) => g.range(0.6, 1.1), (age, life, R6) => {
      let k = age / life, th = R6.range(0, TAU) + R6.range(6, 9) * age, sn = Math.sin(th);
      if (sn > 0 === back) return;
      let rr = R6.range(10, 22) + k * 8, x = Math.cos(th) * rr, y = -1 - k * R6.range(2, 8) + sn * rr * 0.25, s = R6.range(2, 3.5) * (0.6 + k);
      p.disc(x, y, s, back ? C[2] : C[3], (1 - k) * Math.min(1, k * 6) * 0.3);
    });
    for (let j = 0; j < 6; j++) {
      let R6 = rng(seed2 + 9, j), rr = R6.range(12, 24), th0 = R6.range(0, TAU) + TAU * 3 * t / meta53.duration, span = R6.range(0.5, 1);
      for (let s = 0; s < span; s += 0.6 / rr) {
        let th = th0 - s;
        Math.sin(th) > 0 !== back && p.dot(Math.cos(th) * rr, 0.5 + rr * 0.2 * Math.sin(th), s < span * 0.4 ? C[3] : C[2], 1 - s / span);
      }
    }
  }
  function drawBack9(p, t, o) {
    let C = fit(o.palette, 6), L = fit(o.leaves, 12);
    p.glow(0, -30, 46, C[4], 0.12), p.glow(0, -2, 26, L[2], 0.12), swirl(p, C, L, t, o.seed * 3 + 1, !0), wind(p, C, t, o.seed * 5 + 2, !0), leaves(p, L, t, o.seed * 7 + 3, !0);
  }
  function draw20(p, t, o) {
    let C = fit(o.palette, 6), L = fit(o.leaves, 12);
    swirl(p, C, L, t, o.seed * 3 + 1, !1), wind(p, C, t, o.seed * 5 + 2, !1), leaves(p, L, t, o.seed * 7 + 3, !1);
  }
  var meta53, UP3, act18, SY8, TOP7, ringR, init_leaf_storm = __esm({
    "src/fx/nature/leaf-storm.js"() {
      init_core();
      init_lib11();
      meta53 = {
        name: "Leaf storm",
        desc: "Leaves tumble up a rising spiral round the character, passing behind and in front, turning and flipping, wrapped in bright bands of wind; litter swirls at their feet.",
        tags: ["nature", "wind", "leaves", "buff", "aura", "actor", "loop"],
        size: [112, 104],
        origin: [56, 92],
        duration: 2.4,
        loop: !0,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: {
          palette: ["#1a2420", "#2e4038", "#4a6656", "#7a9a84", "#b4d0b8", "#eef8e8"],
          leaves: ["#123818", "#2f7a2a", "#6cb83a", "#c8f070", "#4a2a08", "#a8701c", "#e8b42e", "#fff09a", "#3a1010", "#9a2e1c", "#e0642a", "#ffb070"],
          seed: 5
        }
      }, UP3 = { turn: 1.1, crouch: 0, fx: -13, fy: -37, bx: 13, by: -37, ffx: -3, fbx: 4 }, act18 = {
        poses: [
          [0, UP3],
          [0.6, { ...UP3, lean: 2, fy: -40, by: -33 }],
          [1.2, { ...UP3, crouch: -1 }],
          [1.8, { ...UP3, lean: -2, fy: -33, by: -40 }],
          [2.4, UP3]
        ]
      }, SY8 = 0.3, TOP7 = 64, ringR = (y) => 15 + 9 * clamp(-y / TOP7);
    }
  });

  // src/fx/holy/holy-pillar.js
  var holy_pillar_exports = {};
  __export(holy_pillar_exports, {
    create: () => create34,
    meta: () => meta54
  });
  function create34(o) {
    let C = fit(o.palette, 8), N9 = Math.max(3, o.shafts | 0), R6 = new Rng(o.seed), mid = (N9 - 1) / 2, WING = [C[2], C[3], C[4], C[5], C[6], WHITE], ps = new Particles({ rng: R6, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]] }), lights = new Lights(), feathers = new Feathers(R6, 0), shafts = Array.from({ length: N9 }, (_, i) => {
      let off2 = i - mid, far2 = Math.abs(off2) / mid;
      return { th: off2 * (0.4 / mid) + R6.range(-0.02, 0.02), spread: R6.range(0.05, 0.085) * (1 - far2 * 0.25), b: (1 - far2 * 0.35) * R6.range(0.8, 1), ph: R6.range(0, 1), far: far2 };
    }), motes2 = Array.from({ length: 72 }, () => ({ x: R6.range(-80, 80), y: R6.range(0, 1), v: R6.range(7, 18), amp: R6.range(0.5, 2.5), f: R6.range(0.6, 1.5), ph: R6.range(0, TAU) }));
    for (let i = 0; i < 6; i++)
      feathers.add({ x: R6.range(-46, 46), y: R6.range(-150, -100), vx: R6.range(-8, 8), vy: R6.range(0, 8), a: R6.range(-0.4, 0.4), len: R6.range(7, 9), wid: R6.range(1.9, 2.3), life: R6.range(1.4, 1.7), sink: R6.range(26, 36), back: i % 3 === 0, delay: HIT7 + 0.1 + i * 0.16 + R6.range(0, 0.08) });
    let DMAX = PY - TOP8, row = new Float32Array(192), core = new Uint8Array(192), t = 0, hit = !1, shut2 = !1, glinted = !1, angle = (s, tt) => {
      let st = s.far * 0.1, open = ease.outBack(seg(tt, OPEN + st, OPEN + st + 0.42), 1.5), fold = ease.inOutCubic(seg(tt, FOLD - s.far * 0.1, SHUT));
      return s.th * open * (1 - fold);
    }, frontD = (s, tt) => DMAX * (1 - ease.inQuad(seg(tt, OPEN + s.far * 0.06, HIT7 + s.far * 0.06))), liftD = (tt) => DMAX * ease.inQuad(seg(tt, SHUT + 0.05, LIFT)), fade = (tt) => smooth(OPEN, OPEN + 0.1, tt) * (1 - smooth(LIFT - 0.05, LIFT + 0.05, tt)), width = (s, d, tt) => (1.4 + d * s.spread) * lerp(1, 0.25, smooth(SHUT, LIFT, tt)), pulse2 = (s, d, tt) => {
      if (tt < HIT7 || tt > SHUT) return 1;
      let D25 = DMAX * (1 - frac((tt - HIT7) / 0.6 + s.ph));
      return 1 + 0.9 * Math.exp(-(((d - D25) / 12) ** 2));
    }, lightAt = (x, y) => {
      let dy = PY - y;
      if (dy <= 0) return 0;
      let I = 0;
      for (let s of shafts) {
        let a = angle(s, t), d = dy / Math.cos(a), xc = Math.tan(a) * dy, hw = width(s, d, t) / 2 / Math.cos(a);
        if (d < liftD(t) || d < frontD(s, t)) continue;
        let v = (x - xc) / hw;
        Math.abs(v) < 1 && (I += (1 - v * v) * s.b);
      }
      return I * fade(t);
    };
    function fan(p) {
      let k = fade(t);
      if (k <= 0) return;
      let lift = liftD(t);
      for (let y = Math.ceil(TOP8); y < PY; y++) {
        let dy = PY - (y + 0.5);
        row.fill(0), core.fill(0);
        let any = !1;
        for (let s of shafts) {
          let a = angle(s, t), ca = Math.cos(a), d = dy / ca;
          if (d < lift || d < frontD(s, t) - 6) continue;
          let xc = Math.tan(a) * dy, hw = width(s, d, t) / 2 / ca, soft2 = smooth(frontD(s, t) - 6, frontD(s, t) + 4, d) * smooth(lift, lift + 6, d), I0 = s.b * pulse2(s, d, t) * soft2 * k;
          for (let x = Math.floor(xc - hw); x <= Math.ceil(xc + hw); x++) {
            let v = (x + 0.5 - xc) / hw, i = x + 96;
            i < 0 || i >= 192 || Math.abs(v) >= 1 || (row[i] += I0 * Math.pow(1 - v * v, 1.3), any = !0);
          }
          let ci = Math.round(xc - 0.5) + 96;
          ci >= 0 && ci < 192 && (core[ci] = Math.max(core[ci], Math.min(255, I0 * 200)));
        }
        if (any)
          for (let i = 0; i < 192; i++) {
            let I = row[i];
            if (I < 0.02) continue;
            let x = i - 96;
            p.blend(x, y, C[6], Math.min(0.6, I * 0.38)), p.light(x, y, C[4], Math.min(0.9, I * 0.32)), core[i] && p.dot(x, y, core[i] > 150 ? WHITE : C[6], Math.min(1, core[i] / 180));
          }
      }
      t > HIT7 - 0.05 && p.glow(0, PY - 3, 20, C[5], 0.5 * k);
    }
    function sun(p) {
      let r = 15 * ease.outBack(seg(t, 0.02, 0.45), 1.8) * (1 - ease.inBack(seg(t, SHUT, LIFT + 0.1), 1.5));
      if (r > 0.5) {
        let spin = t * 0.6;
        p.glow(0, SUN, Math.min(32, r * 3), C[4], 0.5), p.glow(0, SUN, r * 1.4, WHITE, 0.35), p.circle(0, SUN, r * 0.45, WHITE), oval(p, 0, SUN, r * 0.62, r * 0.62, C[6], 1), oval(p, 0, SUN, r, r, (g) => Math.sin(g * 6 + spin * 4) > 0.5 ? WHITE : C[5], 1);
        for (let j = 0; j < 16; j++) {
          let g = spin + j * TAU / 16, l = j % 2 ? 3 : 6;
          p.line(Math.cos(g) * (r + 2), SUN + Math.sin(g) * (r + 2), Math.cos(g) * (r + 2 + l), SUN + Math.sin(g) * (r + 2 + l), (u) => u < 0.4 ? C[6] : C[4], (u) => 1.1 - u);
        }
      }
      t > LIFT && t < LIFT + 0.3 && sparkle(p, 0, SUN, 10 * (1 - (t - LIFT) / 0.3), WHITE, C[5], 0.6);
    }
    function sigil3(p, back) {
      if (t < HIT7) return;
      let u = seg(t, HIT7, HIT7 + 0.2), heat2 = 1 - smooth(SHUT, SHUT + 0.8, t), out = 1 - smooth(SHUT + 0.4, SHUT + 1, t);
      if (out <= 0) return;
      let keep2 = back ? (g) => Math.sin(g) < 0 : (g) => Math.sin(g) >= 0, burnt = (g) => Math.abs(((g - Math.PI / 2 + Math.PI) % TAU + TAU) % TAU - Math.PI) <= u * Math.PI + 0.01, col = (g, hot) => {
        if (!burnt(g)) return 0;
        let flick = rand(Math.round(g * 40), Math.floor(t * 20)) < 0.18;
        return t < HIT7 + 0.08 || flick && heat2 > 0.4 ? WHITE : heat2 > 0.6 ? hot ? C[6] : C[5] : heat2 > 0.3 ? C[4] : heat2 > 0.1 ? C[3] : C[2];
      };
      oval(p, 0, 0, RX2, RX2 * SY9, (g) => col(g, !0), out, (g) => keep2(g) && burnt(g)), oval(p, 0, 0, RX2 * 0.72, RX2 * 0.72 * SY9, (g) => col(g, !1), out, (g) => keep2(g) && burnt(g));
      for (let j = 0; j < 12; j++) {
        let g = t * 0.35 + j * TAU / 12;
        if (!keep2(g) || !burnt(g)) continue;
        let c = col(g, j % 2 === 0), r0 = RX2 * 0.78, r1 = RX2 * (j % 3 === 0 ? 0.95 : 0.88);
        c && p.line(Math.cos(g) * r0, Math.sin(g) * r0 * SY9, Math.cos(g) * r1, Math.sin(g) * r1 * SY9, c, out);
      }
      if (!back) {
        for (let i = -2; i <= 2; i++) p.glow(i * RX2 * 0.45, -2, 16, C[4], (0.34 - Math.abs(i) * 0.05) * out * (0.5 + 0.5 * heat2));
        p.glow(0, -1, 10, WHITE, 0.3 * heat2 * out);
      }
    }
    return {
      update(dt) {
        if (t += dt, t < OPEN + 0.1 && R6.chance(0.5)) {
          let a = R6.range(0, TAU), D25 = R6.range(22, 34), x = Math.cos(a) * D25, y = SUN + Math.sin(a) * D25, T2 = R6.range(0.18, 0.28), v = (D25 - 10) * 3 / (Math.exp(3 * T2) - 1);
          ps.spawn(P.STREAK, x, y, -x / D25 * v, (SUN - y) / D25 * v, T2, R6.chance(0.5) ? C[6] : C[5]);
        }
        if (!hit && t >= HIT7) {
          hit = !0, lights.add(0, -30, 64, C[5], 0.85, 0.5), lights.add(0, -6, 30, WHITE, 0.8, 0.12);
          for (let i = 0; i < 26; i++) {
            let a = -Math.PI / 2 + R6.range(-1.2, 1.2), sp = R6.range(70, 190);
            ps.spawn(P.SPARK, R6.range(-3, 3), -2, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.25, 0.6));
          }
        }
        if (t > HIT7 && t < SHUT + 0.1 && R6.chance(0.35)) {
          let g = R6.range(0, TAU), r = RX2 * (R6.chance(0.5) ? 1 : 0.72);
          ps.spawn(P.EMBER, Math.cos(g) * r, Math.sin(g) * r * SY9 - 1, R6.range(-6, 6), -R6.range(12, 30), R6.range(0.5, 0.8), C[5], 1, 0, Math.sin(g) < 0 ? 4 : 0);
        }
        if (t > HIT7 && t < FOLD && R6.chance(0.05) && ps.spawn(P.STAR, R6.range(-1, 1) * 40, -R6.range(20, 160), 0, R6.range(2, 8), R6.range(0.3, 0.6), R6.chance(0.5) ? WHITE : C[6], R6.range(0.8, 1.8)), !shut2 && t >= SHUT) {
          shut2 = !0, lights.add(0, -60, 70, C[5], 0.7, 0.35);
          for (let i = 0; i < 12; i++) ps.spawn(P.STAR, R6.range(-4, 4), -R6.range(10, 170), R6.range(-25, 25), R6.range(-10, 10), R6.range(0.4, 0.8), R6.chance(0.5) ? WHITE : C[6], R6.range(0.8, 2));
        }
        !glinted && t >= LIFT && (glinted = !0, lights.add(0, SUN, 40, WHITE, 0.6, 0.2)), ps.update(dt), feathers.update(dt), lights.update(dt);
      },
      drawBack(p) {
        fan(p), sigil3(p, !0), feathers.draw(p, WING, "back"), ps.draw(p, "back");
      },
      draw(p) {
        sigil3(p, !1);
        for (let m of motes2) {
          let y = TOP8 + ((m.y * DMAX + t * m.v) % DMAX + DMAX) % DMAX, x = m.x + Math.sin(t * m.f + m.ph) * m.amp, I = lightAt(x, y);
          I < 0.2 || (p.dot(x, y, I > 0.7 ? WHITE : C[6], Math.min(1, I * 1.3)), p.light(x, y, C[5], 0.4 * Math.min(1, I)));
        }
        sun(p), t > HIT7 - 0.02 && t < HIT7 + 0.25 && sparkle(p, 0, PY - 2, 12 * (1 - (t - HIT7) / 0.25), WHITE, C[5], 0.7), t > SHUT && t < SHUT + 0.2 && sparkle(p, 0, PY - 2, 8 * (1 - (t - SHUT) / 0.2), WHITE, C[5], 0.5), feathers.draw(p, WING, "front"), ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta54, TOP8, PY, SUN, SY9, RX2, OPEN, HIT7, FOLD, SHUT, LIFT, frac, init_holy_pillar = __esm({
    "src/fx/holy/holy-pillar.js"() {
      init_core();
      init_lib6();
      meta54 = {
        name: "Holy pillar",
        desc: "Light breaks through from above: a sun opens at the top and a fan of shafts converges on the mark, pulsing, while a sigil burns on the floor; then the fan folds shut.",
        tags: ["holy", "pillar", "light", "rays", "aoe", "sigil", "ground", "one-shot"],
        size: [192, 232],
        origin: [96, 204],
        duration: 3.5,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: GOLD, shafts: 7, seed: 3 }
      }, TOP8 = -204, PY = -1, SUN = TOP8 + 38, SY9 = 0.24, RX2 = 26, OPEN = 0.3, HIT7 = 0.66, FOLD = 2.05, SHUT = 2.45, LIFT = 2.75, frac = (x) => x - Math.floor(x);
    }
  });

  // src/fx/holy/sunburst.js
  var sunburst_exports = {};
  __export(sunburst_exports, {
    draw: () => draw21,
    meta: () => meta55
  });
  function ray2(p, C, a, L, w0, k) {
    let ca = Math.cos(a), sa = Math.sin(a), x1 = ca * (R0 + L), y1 = sa * (R0 + L), pad = w0 + 1;
    p.shade(Math.min(0, x1) - pad, Math.min(0, y1) - pad, Math.max(0, x1) + pad, Math.max(0, y1) + pad, (x, y, out) => {
      let along5 = x * ca + y * sa - R0, u = along5 / L;
      if (u < 0 || u > 1) return;
      let across = Math.abs(-x * sa + y * ca), w = w0 / 2 * (1 - u * 0.85) + 0.25;
      if (across > w) return;
      let spine2 = across < 0.5, rim = across > w - 0.6 && w > 0.9;
      out.c = spine2 ? u < 0.4 ? WHITE : u < 0.75 ? C[6] : C[5] : rim && u > 0.15 ? C[3] : u < 0.3 ? C[6] : u < 0.62 ? C[5] : C[4], out.a = u < 0.72 ? k : k * (1 - (u - 0.72) / 0.28) * 1.2;
    }), p.glowLine(ca * R0, sa * R0, ca * (R0 + L * 0.8), sa * (R0 + L * 0.8), 5, C[5], 0.16 * k);
  }
  function draw21(p, t, o) {
    let C = fit(o.palette, 8), N9 = o.rays * 2, T2 = meta55.duration, rot = t / T2 * (2 * TAU / N9);
    p.glow(0, 0, 62, C[4], 0.3 + 0.06 * Math.sin(t / T2 * TAU * 2));
    for (let i = 0; i < N9; i++) {
      let a = rot + (i + 0.5) * TAU / N9, L = 14 + 6 * Math.sin(a * 3 + t / T2 * TAU);
      p.line(Math.cos(a) * (R0 + 1), Math.sin(a) * (R0 + 1), Math.cos(a) * (R0 + L), Math.sin(a) * (R0 + L), (u) => u < 0.3 ? C[6] : C[5], (u) => 0.7 - u * 0.8);
    }
    for (let i = 0; i < N9; i++) {
      let a = rot + i * TAU / N9, long = i % 2 === 0, breathe2 = 0.86 + 0.14 * Math.sin(a * 3 - t / T2 * TAU * 2), L = (long ? 36 : 21) * breathe2;
      if (ray2(p, C, a, L, long ? 4 : 2.6, 1), long) {
        let g = frac2(t / T2 * 2 + a * 3 / TAU), r = R0 + g * L;
        g < 0.9 ? (p.px(Math.cos(a) * r, Math.sin(a) * r, WHITE), p.glow(Math.cos(a) * r, Math.sin(a) * r, 5, C[6], 0.45 * (1 - g))) : sparkle(p, Math.cos(a) * (R0 + L), Math.sin(a) * (R0 + L), 1 + 3 * Math.sin((g - 0.9) / 0.1 * Math.PI), WHITE, C[6], 0.5);
      }
    }
    p.shade(-RING - 2, -RING - 2, RING + 2, RING + 2, (x, y, out) => {
      let d = Math.hypot(x, y);
      if (d > RING) return;
      let flick = 0.5 + 0.5 * Math.sin(Math.atan2(y, x) * 5 + t / T2 * TAU * 3);
      out.c = d < CORE2 ? WHITE : d < CORE2 + 1.5 ? flick > 0.6 ? WHITE : C[6] : flick > 0.5 ? C[5] : C[4];
    }), p.glow(0, 0, 16, WHITE, 0.28), cycle(t, T2, 10, o.seed, (g) => g.range(0.35, 0.7), (age, life, R6) => {
      let a = R6.range(0, TAU), d = R6.range(16, 44), k = Math.sin(age / life * Math.PI);
      sparkle(p, Math.cos(a) * d, Math.sin(a) * d, 1 + 2.4 * k * R6.range(0.5, 1), WHITE, C[5], 0.4 * k);
    });
  }
  var meta55, CORE2, RING, R0, frac2, init_sunburst = __esm({
    "src/fx/holy/sunburst.js"() {
      init_core();
      init_lib6();
      meta55 = {
        name: "Sunburst",
        desc: "A white-hot core in a gold corona; long and short rays turn slowly round it, breathing, with glints running out along them that wink at the tips.",
        tags: ["holy", "sun", "radiant", "rays", "light", "glow", "loop"],
        size: [128, 128],
        origin: [64, 64],
        duration: 4,
        loop: !0,
        fps: 30,
        bg: "dark",
        options: { palette: GOLD, rays: 8, seed: 3 }
      }, CORE2 = 4.5, RING = 7.5, R0 = 9, frac2 = (x) => x - Math.floor(x);
    }
  });

  // src/fx/holy/feather-burst.js
  var feather_burst_exports = {};
  __export(feather_burst_exports, {
    create: () => create35,
    meta: () => meta56
  });
  function create35(o) {
    let F = fit(o.palette, 6), G6 = hex(o.glow), R6 = new Rng(o.seed), ps = new Particles({ rng: R6, ground: () => 1 / 0, sparks: [WHITE, F[4], F[3], F[2]] }), lights = new Lights(), loose = new Feathers(R6, 1e6), lobes = Array.from({ length: 11 }, (_, i) => {
      let a = i / 11 * TAU + R6.range(-0.25, 0.25), d = R6.range(5, 14);
      return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8, r0: R6.range(2.5, 4), r1: R6.range(6, 9.5), life: R6.range(0.45, 0.8) };
    });
    for (let i = 0; i < 20; i++) {
      let a = i / 20 * TAU + R6.range(-0.15, 0.15), sp = R6.range(110, 230), up = Math.sin(a) < 0 ? 0.7 : 0.9;
      loose.add({ x: Math.cos(a) * 3, y: Math.sin(a) * 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * up - 20, a: a + R6.range(-0.5, 0.5), len: R6.range(10, 14), wid: R6.range(2.6, 3.4), life: R6.range(1.9, 2.6), delay: R6.range(0, 0.03), sink: R6.range(26, 38), amp: R6.range(8, 13) });
    }
    for (let i = 0; i < 10; i++) {
      let a = R6.range(0, TAU), sp = R6.range(50, 130);
      loose.add({ x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, a: R6.range(0, TAU), len: R6.range(6, 8), wid: R6.range(1.8, 2.2), life: R6.range(1.6, 2.4), back: !0, sink: R6.range(18, 28) });
    }
    for (let i = 0; i < 26; i++) {
      let a = R6.range(0, TAU), sp = R6.range(30, 140);
      ps.spawn(P.FLAKE, R6.range(-3, 3), R6.range(-3, 3), Math.cos(a) * sp, Math.sin(a) * sp - 15, R6.range(1.4, 2.6), R6.chance(0.6) ? WHITE : F[4], R6.range(0.6, 1.6));
    }
    for (let i = 0; i < 10; i++) {
      let a = R6.range(0, TAU), sp = R6.range(60, 160);
      ps.spawn(P.STAR, 0, 0, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.3, 0.6), R6.chance(0.5) ? WHITE : G6, R6.range(0.8, 2.2));
    }
    lights.add(0, 0, 50, G6, 0.75, 0.45), lights.add(0, 0, 20, WHITE, 0.7, 0.1);
    let t = 0;
    function puff2(p) {
      for (let l of lobes) {
        let u = t / l.life;
        if (u >= 1) continue;
        let e = ease.outCubic(u), x = l.x * (0.4 + e * 1.3), y = l.y * (0.4 + e * 1.3) - u * 5, r = (l.r0 + (l.r1 - l.r0) * ease.outCubic(Math.min(1, u * 3))) * (1 - ease.inQuad(u));
        r < 0.6 || (p.circle(x, y, r + 0.8, F[2]), p.circle(x, y, r, (d, a) => d > 0.55 && Math.sin(a + 0.8) > 0.3 ? F[3] : d < 0.45 && Math.sin(a + 0.8) < -0.2 ? WHITE : F[4]));
      }
    }
    return {
      update(dt) {
        if (t += dt, t > 0.3 && t < 2.2 && loose.count && R6.chance(0.14)) {
          let q = R6.pick(loose.list);
          q.delay <= 0 && ps.spawn(P.STAR, q.x + R6.range(-2, 2), q.y + R6.range(-1, 1), 0, 0, R6.range(0.2, 0.4), R6.chance(0.5) ? WHITE : G6, R6.range(1, 2.2));
        }
        ps.update(dt), loose.update(dt), lights.update(dt);
      },
      drawBack(p) {
        loose.draw(p, F, "back"), ps.draw(p, "back"), puff2(p);
      },
      draw(p) {
        if (t < 0.07 && p.circle(0, 0, 9 * (1 - t / 0.14), WHITE), t < 0.25) {
          let u = t / 0.25;
          p.ring(0, 0, 6 + 24 * ease.outCubic(u), Math.max(1, 2.5 * (1 - u)), (v) => v > 0.5 ? WHITE : mix(F[4], G6, 0.4), 1.1 - u);
        }
        t < 0.2 && sparkle(p, 0, 0, 10 * (1 - t / 0.2), WHITE, G6, 0.6), p.glow(0, 4, 46, G6, 0.28 * (1 - smooth(0, 1.3, t))), loose.draw(p, F, "front"), ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta56, init_feather_burst = __esm({
    "src/fx/holy/feather-burst.js"() {
      init_core();
      init_lib6();
      meta56 = {
        name: "Feather burst",
        desc: "A white puff pops and throws feathers that brake hard, then rock from side to side as they sink and fade, with down drifting after them.",
        tags: ["holy", "feather", "burst", "poof", "angel", "bird", "one-shot"],
        size: [160, 160],
        origin: [80, 60],
        duration: 3,
        loop: !1,
        fps: 30,
        bg: "dark",
        options: { palette: ["#4a4560", "#7a7494", "#aaa5c2", "#d6d3e6", "#f4f3fa", "#ffffff"], glow: "#fff0c0", seed: 4 }
      };
    }
  });

  // src/fx/holy/heal-aoe.js
  var heal_aoe_exports = {};
  __export(heal_aoe_exports, {
    create: () => create36,
    meta: () => meta57
  });
  function create36(o) {
    let C = fit(o.palette, 8), REACH2 = o.reach, R6 = new Rng(o.seed), ps = new Particles({ rng: R6, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights(), front = (tt) => tt < SEED ? 0 : REACH2 * ease.outCubic(seg(tt, SEED, SEED + ROLL)), passed = (d) => SEED + ROLL * (1 - Math.cbrt(1 - Math.min(0.999, d / REACH2))), sites = Array.from({ length: 26 }, (_, i) => {
      let a = R6.range(0, TAU), d = REACH2 * Math.sqrt(R6.range(0.04, 0.92)), big = i % 5 < 2;
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, t0: passed(d) + R6.range(0, 0.06), rise: R6.range(18, 34), life: R6.range(0.9, 1.3), sway: R6.range(0, TAU), L: big ? 3 + (i % 5 === 0 ? 1 : 0) : i % 5 === 2 ? 1 : 2, thick: big ? 3 : 1, popped: !1 };
    }), riders = Array.from({ length: 14 }, (_, i) => ({ a: i / 14 * TAU + R6.range(-0.2, 0.2), w: R6.range(0.6, 1.1) * (i % 2 ? 1 : -1) })), t = 0, released = !1;
    function wash(p) {
      let fr = front(t);
      fr < 2 || t > 2.6 || p.shade(-fr - 1, -fr * SY10 - 1, fr + 1, fr * SY10 + 1, (x, y, out) => {
        let d = Math.hypot(x, y / SY10);
        if (d > fr) return;
        let age = t - passed(d), k = Math.exp(-age / 0.35) * smooth(fr, fr - 6, d) * (1 - smooth(1.4, 1.9, t));
        k < 0.04 || (out.l = C[4], out.k = 0.32 * k);
      });
    }
    function ring4(p, back) {
      if (t < SEED) return;
      let u = seg(t, SEED, SEED + ROLL + 0.25), fr = front(t), k = u < 0.7 ? 1 : (1 - u) / 0.3;
      if (k <= 0) return;
      let keep2 = back ? (g) => Math.sin(g) < 0 : (g) => Math.sin(g) >= 0;
      band(p, 0, 0, fr, SY10, Math.max(2, 7 * (1 - u * 0.7)), k, C.slice(2), keep2, t < SEED + 0.08), oval(p, 0, 0, fr + 1, (fr + 1) * SY10, (g) => Math.sin(g) > 0.3 ? WHITE : C[6], k * (back ? 0.7 : 1), keep2);
      for (let j = 0, n = Math.ceil(fr * 0.9); j < n; j++) {
        let g = j / n * TAU, near2 = Math.sin(g) >= 0;
        if (near2 === back || rand(j, Math.floor(t * 20)) > 0.45) continue;
        let x = Math.cos(g) * fr, y = Math.sin(g) * fr * SY10, h = (1 + rand(j, 7) * 4) * k * (near2 ? 1 : 0.6);
        for (let i = 1; i <= h; i++) p.dot(x, y - i, i > h - 1 ? WHITE : C[6], k * (1.2 - i / (h + 1)));
      }
      for (let r of riders) {
        let g = r.a + r.w * (t - SEED) * 2.2, near2 = Math.sin(g) >= 0;
        if (near2 === back) continue;
        let x = Math.cos(g) * fr, y = Math.sin(g) * fr * SY10;
        near2 ? sparkle(p, x, y - 1, 2 + (Math.sin(t * 9 + r.a * 5) > 0.3 ? 1 : 0), WHITE, C[6], 0.35 * k) : p.dot(x, y, C[6], k);
      }
      if (!back) for (let i = 0; i < 8; i++) {
        let g = i / 8 * TAU;
        p.glow(Math.cos(g) * fr, Math.sin(g) * fr * SY10 - 2, 16, C[4], 0.22 * k);
      }
    }
    function sprouts(p, back) {
      for (let s of sites) {
        let a = t - s.t0;
        if (a < 0 || a > s.life || s.z < 0 !== back) continue;
        let u = a / s.life, h = s.rise * ease.outCubic(u), x = s.x + Math.sin(a * 4 + s.sway) * 1.5 * u, y = s.z * SY10 - 2 - h, pop = ease.outBack(clamp(a / 0.12), 2.6), end = s.life - 0.15, L = Math.max(1, Math.round(s.L * pop - (back ? 1 : 0)));
        if (a < 0.04) sparkle(p, x, y, 3, WHITE, C[6], 0.5);
        else if (a < end) plus(p, x, y, L, back && L < 3 ? 1 : s.thick, back ? C.slice(0, 7) : C, back ? 0.8 : 1, !back && Math.sin(a * 12 + s.sway * 3) > 0.8);
        else {
          let v = (a - end) / 0.15;
          for (let [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) p.dot(x + dx * (2 + v * 5), y + dy * (2 + v * 5) - v * 2, v < 0.4 ? WHITE : C[6], 1 - v);
        }
        if (u < 0.5) for (let j = 1; j < h * (1 - u * 2); j += 1.5) p.dot(s.x, s.z * SY10 - 2 - h + j + 3, C[5], (1 - j / h) * (1 - u * 2) * (back ? 0.5 : 0.8));
        p.glow(x, y, 7 + L * 2, C[5], (back ? 0.2 : 0.34) * (a < end ? 1 : 1 - (a - end) / 0.15));
      }
    }
    return {
      update(dt) {
        if (t += dt, t < SEED - 0.04 && R6.chance(0.7)) {
          let a = R6.range(0, TAU), D25 = R6.range(24, 48), x = Math.cos(a) * D25, y = Math.sin(a) * D25 * SY10 - R6.range(1, 8), T2 = R6.range(0.16, 0.24), l = Math.hypot(x, y + 3) || 1, v = l * 3 / (Math.exp(3 * T2) - 1);
          ps.spawn(P.STREAK, x, y, -x / l * v, (-3 - y) / l * v, T2, R6.chance(0.5) ? C[6] : C[5]);
        }
        if (!released && t >= SEED) {
          released = !0, lights.add(0, -16, 76, C[5], 0.85, 0.55), lights.add(0, -6, 28, WHITE, 0.8, 0.12);
          for (let i = 0; i < 10; i++) ps.spawn(P.MOTE, R6.range(-2, 2), -R6.range(2, 10), R6.range(-25, 25), -R6.range(80, 170), R6.range(0.3, 0.6), R6.chance(0.5) ? WHITE : C[6], R6.range(0.6, 1));
          for (let i = 0; i < 16; i++) {
            let a = R6.range(Math.PI * 1.05, Math.PI * 1.95), sp = R6.range(40, 120);
            ps.spawn(P.STAR, 0, -3, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.4, 0.8), R6.chance(0.5) ? WHITE : C[6], R6.range(0.6, 2));
          }
        }
        for (let s of sites)
          if (!s.popped && t >= s.t0) {
            s.popped = !0;
            for (let i = 0; i < 3; i++) ps.spawn(P.STAR, s.x + R6.range(-3, 3), s.z * SY10 - 1, R6.range(-10, 10), -R6.range(15, 40), R6.range(0.3, 0.6), R6.chance(0.5) ? WHITE : C[6], R6.range(0.5, 1.2), 0, s.z < 0 ? 4 : 0);
          }
        if (t > SEED + 0.1 && t < 1.9 && R6.chance(0.35)) {
          let fr = front(t), a = R6.range(0, TAU), d = fr * Math.sqrt(R6.next());
          ps.spawn(P.EMBER, Math.cos(a) * d, Math.sin(a) * d * SY10 - 1, R6.range(-5, 5), -R6.range(10, 30), R6.range(0.5, 1), C[5], 1, 0, Math.sin(a) < 0 ? 4 : 0);
        }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        wash(p), ring4(p, !0), sprouts(p, !0), ps.draw(p, "back");
      },
      draw(p) {
        if (ring4(p, !1), t < SEED) {
          let k = t / SEED;
          sparkle(p, 0, -3, 2 + 4 * k * k, WHITE, C[6], 0.3 + 0.4 * k), p.glow(0, -3, 10 + 16 * k, C[4], 0.5 * k);
        } else t < SEED + 0.2 && flare(p, 0, -3, 22 * Math.pow(1 - (t - SEED) / 0.2, 1.5), 1 - (t - SEED) / 0.2, C.slice(3));
        let g = seg(t, SEED, SEED + 0.5);
        if (g > 0 && g < 1) {
          let top = -4 - 46 * ease.outCubic(Math.min(1, g * 2.2)) - 10 * g, bot = -2 - 50 * ease.inQuad(seg(g, 0.35, 1)), w = 1 + 2.4 * (1 - g);
          bot - top > 2 && (p.beam(0, bot, 0, top, w * 2, (u, v) => v < 0.45 ? WHITE : u > 0.8 ? C[5] : C[6]), p.glowLine(0, bot, 0, top, 12, C[5], 0.55 * (1 - g)), sparkle(p, 0, top, 4 * (1 - g) + 1, WHITE, C[6], 0.5 * (1 - g)));
        }
        sprouts(p, !1), ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta57, SY10, SEED, ROLL, init_heal_aoe = __esm({
    "src/fx/holy/heal-aoe.js"() {
      init_core();
      init_lib6();
      meta57 = {
        name: "Healing ring",
        desc: "A seed of green light sinks into the floor and a soft ring rolls out from it; the floor glows where it passes and plus signs sprout and float up.",
        tags: ["holy", "heal", "aoe", "ring", "plus", "ground", "one-shot"],
        size: [256, 136],
        origin: [128, 104],
        duration: 2.9,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: GREEN, reach: 104, seed: 6 }
      }, SY10 = 0.2, SEED = 0.3, ROLL = 1;
    }
  });

  // src/fx/nature/healing-bloom.js
  var healing_bloom_exports = {};
  __export(healing_bloom_exports, {
    create: () => create37,
    meta: () => meta58
  });
  function cross2(p, x, y, L, C, a, glint2) {
    let X = Math.round(x), Y3 = Math.round(y), ins = (dx, dy) => dx === 0 && Math.abs(dy) <= L || dy === 0 && Math.abs(dx) <= L;
    for (let dy = -L - 1; dy <= L + 1; dy++)
      for (let dx = -L - 1; dx <= L + 1; dx++)
        ins(dx, dy) ? p.dot(X + dx, Y3 + dy, glint2 && !dx && !dy ? WHITE : dy < 0 || dx < 0 ? C[6] : C[5], a) : L > 1 && (ins(dx - 1, dy) || ins(dx + 1, dy) || ins(dx, dy - 1) || ins(dx, dy + 1)) && p.dot(X + dx, Y3 + dy, C[2], a * 0.8);
    p.glow(x, y, 5 + L * 2, C[6], 0.35 * a);
  }
  function create37(o) {
    let C = fit(o.palette, 8), Pt = fit(o.petal, 4), Ht = fit(o.heart, 4), R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [Ht[3], Ht[2], Ht[1], Ht[0]] }), lights = new Lights(), flying = [], glyphs2 = [], petals = Array.from({ length: NPET }, (_, i) => ({ az: i / NPET * TAU + 0.3, off: i * 0.7 % 1, gone: !1, at: LIFT2 + i * 0.37 % 1 * 0.55 })), t = 0, popped = !1, sprouted = !1, grow = () => ease.outCubic(clamp(t / STEM)) * (1 - ease.inCubic(clamp((t - WILT) / 0.6))), sway = () => Math.sin(t * 2.6) * 1.4 * smooth(0.2, 0.6, t), stem = () => {
      let g = grow(), pts = [];
      for (let i = 0; i <= 12; i++) {
        let s = i / 12;
        pts.push([Math.sin(s * 3.2) * 2.2 * s + sway() * s * s, (1 - g) * H * 1.1 - s * H]);
      }
      return pts;
    }, open = () => ease.outBack(clamp((t - BUD) / (OPEN2 - BUD)), 1.4);
    return {
      update(dt) {
        t += dt;
        let f = Math.min(1, dt * 120), top = stem()[12];
        if (!sprouted) {
          sprouted = !0;
          for (let i = 0; i < 8; i++) ps.spawn(P.GRIT, R6.range(-3, 3), -1, R6.range(-40, 40), -R6.range(40, 100), R6.range(0.5, 0.8), R6.pick([C[2], C[3]]), 1);
          for (let i = 0; i < 3; i++) ps.spawn(P.DUST, R6.range(-3, 3), -1, R6.sign() * R6.range(10, 30), -R6.range(4, 10), R6.range(0.4, 0.6), C[3], R6.range(1.5, 2.5));
        }
        if (t > STEM && t < BUD && R6.chance(0.3 * f)) {
          let a = R6.range(0, TAU), d = R6.range(14, 26), x = top[0] + Math.cos(a) * d, y = top[1] - 3 + Math.sin(a) * d * 0.8;
          ps.spawn(P.STREAK, x, y, (top[0] - x) * 3.4, (top[1] - 3 - y) * 3.4, R6.range(0.18, 0.26), R6.chance(0.5) ? Ht[2] : C[6]);
        }
        if (!popped && t >= OPEN2 - 0.12) {
          popped = !0, lights.add(top[0], top[1] - 3, 22, WHITE, 0.45, 0.08), lights.add(top[0], top[1] - 3, 70, Ht[2], 0.5, 0.8);
          for (let i = 0; i < 16; i++) {
            let a = R6.range(0, TAU), sp = R6.range(40, 120);
            ps.spawn(P.MOTE, top[0], top[1] - 3, Math.cos(a) * sp, Math.sin(a) * sp - 20, R6.range(0.4, 0.8), R6.chance(0.5) ? Ht[3] : C[7], 0.7);
          }
          for (let i = 0; i < 5; i++) ps.spawn(P.STAR, top[0] + R6.range(-10, 10), top[1] - R6.range(0, 14), 0, -6, R6.range(0.3, 0.6), Ht[3], R6.range(1, 2.4), R6.range(0, 0.3));
        }
        t > OPEN2 && t < WILT && R6.chance(0.13 * f) && glyphs2.push({ x: R6.range(-22, 22), y: -R6.range(2, 36), t0: t, life: Math.min(R6.range(0.7, 1.1), meta58.duration - 0.05 - t), L: R6.chance(0.35) ? 3 : 2, seed: R6.next() * 9 }), t > OPEN2 - 0.1 && t < WILT && R6.chance(0.35 * f) && ps.spawn(P.EMBER, R6.range(-20, 20), -R6.range(0, 8), R6.range(-6, 6), -R6.range(25, 55), Math.min(R6.range(0.6, 1.1), meta58.duration - 0.05 - t), R6.chance(0.6) ? C[6] : Ht[2], R6.chance(0.3) ? 2 : 1);
        for (let i = glyphs2.length - 1; i >= 0; i--) t - glyphs2[i].t0 > glyphs2[i].life && glyphs2.splice(i, 1);
        for (let q of petals)
          if (!q.gone && t >= q.at) {
            q.gone = !0;
            let e = Math.PI / 2 - 0.15, dx = Math.sin(e) * Math.cos(q.az), L = 10;
            flying.push({ x: top[0] + dx * L * 0.6, y: top[1] - 3 - Math.cos(e) * L * 0.6, vx: dx * 30 + R6.range(-10, 10), vy: -R6.range(25, 45), a: Math.atan2(-Math.cos(e), dx), va: R6.range(-5, 5), fl: 0, vf: R6.range(5, 9), life: Math.min(R6.range(0.75, 1), meta58.duration - 0.45 - t), max: 0 }), flying[flying.length - 1].max = flying[flying.length - 1].life;
          }
        for (let i = flying.length - 1; i >= 0; i--) {
          let q = flying[i];
          if ((q.life -= dt) <= 0) {
            ps.spawn(P.STAR, q.x, q.y, 0, -8, Math.min(0.35, meta58.duration - 0.05 - t), Pt[3], 1.8), flying.splice(i, 1);
            continue;
          }
          q.vx -= q.vx * 1.5 * dt, q.vy -= q.vy * 0.8 * dt + 10 * dt, q.x += q.vx * dt + Math.sin(q.fl) * 12 * dt, q.y += q.vy * dt, q.a += q.va * dt, q.fl += q.vf * dt;
        }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let bloom = smooth(OPEN2 - 0.15, OPEN2 + 0.2, t) * (1 - smooth(WILT - 0.2, WILT + 0.5, t)), top = stem()[12];
        for (let h = 0; h < 70; h += 7) p.glow(0, -h, 22, C[5], 0.12 * bloom * (1 - h / 80));
        let k = clamp((t - OPEN2 + 0.12) / 0.6);
        k > 0 && k < 1 && band(p, 0, 0.5, 6 + 30 * ease.outCubic(k), 0.18, Math.max(1, 3 * (1 - k)), 1.1 - k, [C[3], C[5], Ht[2], Ht[3]], (g) => Math.sin(g) < 0);
        let fw = 6 + 16 * smooth(0, 0.8, t);
        for (let x = Math.floor(-fw); x <= fw; x++) {
          let u = Math.abs(x) / fw, a = Math.sqrt(1 - u) * smooth(0, 0.4, t) * (1 - smooth(WILT, WILT + 0.6, t));
          p.dot(x, 0, u < 0.3 ? C[6] : u < 0.65 ? C[5] : C[4], a), x % 5 === 0 && p.glow(x, 0, 8, C[5], 0.2 * a * (1 - u));
        }
        if (t > BUD - 0.05) for (let q of petals) Math.sin(q.az) < 0 && !q.gone && petal(p, q, top);
        ps.draw(p, "back");
      },
      draw(p) {
        let pts = stem(), top = pts[12];
        if (grow() > 0.02) {
          for (let i = 1; i < pts.length; i++) {
            let [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
            y1 > 0 || (p.line(x0, y0, x1, y1, C[5]), p.line(x0 + 1, y0, x1 + 1, y1, C[3]));
          }
          for (let [i, sd, d] of [[4, -1, 0.1], [7, 1, 0.22]]) {
            let lk = ease.outBack(clamp((t - d - 0.12) / 0.3), 1.6) * (1 - smooth(WILT, WILT + 0.5, t) * 0.4), [x, y] = pts[i];
            if (lk <= 0 || y > -1) continue;
            let la = sd < 0 ? -2.6 + 0.4 * (1 - lk) : -0.55 - 0.4 * (1 - lk);
            drawLeaf(p, x + Math.cos(la) * 6 * lk, y + Math.sin(la) * 6 * lk, 12 * lk, 3.4, la, 0.25, [C[1], C[3], C[5], C[6]]);
          }
          if (t > STEM - 0.1 && t < OPEN2 - 0.1) {
            let b = clamp((t - STEM + 0.1) / (BUD - STEM)), w = 2 + 2.5 * b, h = 3.5 + 5 * b;
            p.ellipse(top[0], top[1] - h * 0.6, w, h, (d, a) => Math.cos(a) < -0.2 ? Pt[2] : d > 0.7 ? Pt[0] : Pt[1]), p.glow(top[0], top[1] - h * 0.6, 8 + 8 * b, Ht[2], 0.25 * b);
          }
        }
        for (let q of petals) Math.sin(q.az) >= 0 && !q.gone && t > BUD - 0.05 && petal(p, q, top);
        if (t > OPEN2 - 0.12 && t < WILT + 0.3) {
          let pulse2 = 0.85 + 0.15 * Math.sin(t * 9), k = 1 - smooth(WILT - 0.3, WILT + 0.3, t), cy = top[1] - 4;
          p.circle(top[0], cy, 3.3 * k, Ht[1]), p.circle(top[0] - 0.5, cy - 0.5, 2.2 * k, Ht[2]), p.px(top[0] - 1, cy - 1, Ht[3]), p.glow(top[0], cy, 16 * pulse2, Ht[2], 0.5 * k), p.glow(top[0], cy, 34, C[5], 0.2 * k);
        }
        let e = t - OPEN2 + 0.12;
        e > 0 && e < 0.16 && sparkle(p, top[0], top[1] - 3, 10 * (1 - e / 0.16), Ht[3], Ht[2], 0.6);
        for (let q of flying) drawLeaf(p, q.x, q.y, 6, 2.2, q.a, q.fl, [Pt[0], Pt[1], Pt[2], Pt[3]], Math.min(1, q.life / 0.3));
        for (let q of glyphs2) {
          let k = (t - q.t0) / q.life;
          cross2(p, q.x + Math.sin(k * 5 + q.seed) * 2, q.y - k * 24, q.L, C, Math.sin(Math.PI * k), Math.sin(k * 14 + q.seed) > 0.8);
        }
        ps.draw(p, "front"), lights.draw(p);
      }
    };
    function petal(p, q, top) {
      let op = open(), e = lerp(0.15, Math.PI / 2 - 0.2, op), dx = Math.sin(e) * Math.cos(q.az), dz = Math.sin(e) * Math.sin(q.az), dy = -Math.cos(e), L = lerp(8, 12, op), len2 = L * Math.hypot(dx, dy), ang = Math.atan2(dy, dx), back = dz < 0, cy = top[1] - 3;
      len2 < 1.5 || drawLeaf(p, top[0] + dx * L * 0.5, cy + dy * L * 0.5, len2 + 1, 3 + (1 - Math.abs(dz)) * 0.8, ang, back ? 0.9 : 0.2, back ? [Pt[0], Pt[0], Pt[1], Pt[2]] : [Pt[0], Pt[1], Pt[2], Pt[3]]);
    }
  }
  var meta58, STEM, BUD, OPEN2, LIFT2, WILT, H, NPET, init_healing_bloom = __esm({
    "src/fx/nature/healing-bloom.js"() {
      init_core();
      init_lib11();
      meta58 = {
        name: "Healing bloom",
        desc: "A sprout pushes up and unfurls, a bud swells and opens round a glowing golden heart in a flare of healing light; its petals lift away one by one as motes.",
        tags: ["nature", "heal", "flower", "plant", "buff", "ground", "one-shot"],
        size: [124, 120],
        origin: [62, 108],
        duration: 3.3,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: {
          palette: ["#0c1a10", "#173a1a", "#24582a", "#357a34", "#52a03e", "#86c84e", "#c4ec7a", "#f4ffd0"],
          petal: ["#4a1a3a", "#a8406e", "#ec8ab0", "#ffd8e8"],
          heart: ["#a8641a", "#f0b42e", "#ffe680", "#fffbe0"],
          seed: 4
        }
      }, STEM = 0.42, BUD = 0.75, OPEN2 = 1.05, LIFT2 = 1.7, WILT = 2.4, H = 36, NPET = 6;
    }
  });

  // src/fx/holy/resurrection.js
  var resurrection_exports = {};
  __export(resurrection_exports, {
    act: () => act19,
    create: () => create38,
    meta: () => meta59
  });
  function along3(pts, s) {
    let L = 0, seglen = [];
    for (let i = 1; i < pts.length; i++) L += seglen[i - 1] = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let d = s * L;
    for (let i = 0; i < seglen.length; i++) {
      if (d <= seglen[i] || i === seglen.length - 1) {
        let f = seglen[i] ? clamp(d / seglen[i]) : 0;
        return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)];
      }
      d -= seglen[i];
    }
    return pts[pts.length - 1];
  }
  function beat2(t) {
    return t < B0 ? 0 : t < B1 ? -0.34 * ease.inOutSine(seg(t, B0, B1)) : t < B2 ? lerp(-0.34, 0.66, ease.inQuad(seg(t, B1, B2))) : 0.66 * (1 - ease.outBack(seg(t, B2, B3), 1.3));
  }
  function create38(o) {
    let C = fit(o.palette, 8), AS = fit(o.ash, 6), A = o.actor, S = shapeOf(A), R6 = new Rng(o.seed), WING = [C[2], C[3], C[4], C[5], C[6], WHITE], ps = new Particles({ rng: R6, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]], haze: C[4] }), lights = new Lights(), loose = new Feathers(R6, 0), rows = /* @__PURE__ */ new Map();
    for (let [x, y] of S.edge) (rows.get(y) ?? rows.set(y, []).get(y)).push(x);
    let rays = Array.from({ length: 6 }, (_, i) => ({ o: -0.75 + i * 0.3 + R6.range(-0.08, 0.08), w: R6.range(0.1, 0.2), b: R6.range(0.55, 1), f: R6.range(1.5, 3.5), ph: R6.range(0, TAU) })), cores = [...rays].sort((a, b) => b.b - a.b).slice(0, 2), motes2 = Array.from({ length: 34 }, () => ({ q: R6.range(-1, 1), y: R6.range(0, 1), v: R6.range(4, 11), amp: R6.range(0.6, 2.4), ph: R6.range(0, TAU), f: R6.range(0.6, 1.4) })), reach = QUILLS.map(([s, ang, len2]) => {
      let b = along3(ARM_OPEN, s);
      return Math.hypot(b[0] + Math.cos(ang) * len2, b[1] + Math.sin(ang) * len2);
    }), far2 = Math.max(...reach), quills = QUILLS.map(([s, ang, len2, wid, kind], i) => {
      let off2 = () => SC + (1 - reach[i] / far2) * 0.2 + R6.range(0, 0.04);
      return { s, ang, len: len2, wid, kind, fold: 1.45 + i % 6 * 0.04, open: kind === 0 ? 0.06 + (s - 0.8) * 0.45 : kind === 1 ? s * 0.06 : 0.03 + s * 0.05, off: [off2(), off2()], gone: [!1, !1] };
    }), profile = new Float32Array(121), t = 0, poured = !1, flashed = !1, formed = !1, beaten = !1, climbY = (tt) => lerp(1, S.top - 2, ease.inOutSine(seg(tt, CL0, CL1))), shaftK = (tt) => smooth(0, 0.12, tt) * (1 - smooth(3, 3.75, tt)), shaftW = (tt) => lerp(0.4, 1, ease.outCubic(seg(tt, 0, 0.6))) * lerp(1, 0.12, ease.inCubic(seg(tt, 2.9, 3.6))), halfW2 = (y, tt) => lerp(8, 25, (y - TOP9) / -TOP9) * shaftW(tt);
    function wing(tt, side) {
      let oa = ease.outBack(seg(tt, W02, W02 + 0.4), 1.6), rot = beat2(tt), om = (beat2(tt) - beat2(tt - 0.03)) / 0.03, arm2 = ARM_FOLD.map((f, i) => [lerp(f[0], ARM_OPEN[i][0], oa), lerp(f[1], ARM_OPEN[i][1], oa)]), cr = Math.cos(rot), sr = Math.sin(rot), place = ([x, y]) => [side * (SHOULDER[0] + x * cr - y * sr), SHOULDER[1] + x * sr + y * cr], a0 = smooth(W02, W02 + 0.1, tt), out = [];
      return quills.forEach((q, i) => {
        if (tt >= q.off[side > 0 ? 0 : 1] + 0.05) return;
        let of = ease.outBack(seg(tt, W02 + q.open, W02 + q.open + 0.42), 2), [bx, by] = place(along3(arm2, q.s)), ang = lerp(q.fold, q.ang, of) + rot - clamp(om * 0.045 * FLEX[q.kind], -0.5, 0.5);
        out.push({ i, q, x: bx, y: by, ang: side > 0 ? ang : Math.PI - ang, len: q.len * lerp(0.3, 1, of), wid: q.wid, a: a0, hot: tt < W02 + q.open + 0.07 || tt >= q.off[side > 0 ? 0 : 1] ? 1 : 0 });
      }), { out, arm: arm2.map(place) };
    }
    function drawWing(p, side) {
      let { out, arm: arm2 } = wing(t, side);
      if (!out.length) return;
      let order = [...out].sort((a, b) => b.q.ang - a.q.ang);
      for (let f of order) f.q.kind !== 2 && feather(p, f.x, f.y, f.ang, f.len, f.wid, WING, f.a, side, f.hot);
      for (let f of order) f.q.kind === 2 && feather(p, f.x, f.y, f.ang, f.len, f.wid, WING, f.a, side, f.hot);
      let k = out.length / quills.length;
      k > 0.5 && (p.polyline(arm2.map(([x, y]) => [x, y + 1]), C[5], out[0].a), p.polyline(arm2, WHITE, out[0].a)), p.glow(side * 28, -36, 38, C[4], 0.26 * out[0].a * k);
      let g = (t - W02 - 0.45) * 1.3 % 1;
      if (k > 0.9 && t > W02 + 0.45 && g < 0.8) {
        let [gx, gy] = along3(arm2, g / 0.8);
        sparkle(p, gx, gy, 2 + Math.sin(g / 0.8 * Math.PI) * 2, WHITE, C[6], 0.4);
      }
      if (p.glowLine(arm2[0][0], arm2[0][1], arm2[3][0], arm2[3][1], 7, C[5], 0.25 * out[0].a * k), t > B1 + 0.03 && t < B2 + 0.14)
        for (let i of [6, 8, 10]) {
          let pts = [];
          for (let j = 0; j < 10; j++) {
            let tt = Math.max(B1 + 0.01, t - j * 0.012), w = wing(tt, side).out.find((f) => f.i === i);
            w && pts.push([w.x + Math.cos(w.ang) * (w.len - 1), w.y + Math.sin(w.ang) * (w.len - 1)]);
          }
          let fade = 1 - smooth(B2, B2 + 0.14, t);
          for (let j = 1; j < pts.length; j++) p.line(pts[j - 1][0], pts[j - 1][1], pts[j][0], pts[j][1], j < 3 ? WHITE : j < 6 ? C[6] : C[4], fade * (1.1 - j / 10));
        }
    }
    function shaft(p) {
      let k = shaftK(t);
      if (k <= 0) return;
      for (let i = 0; i < profile.length; i++) {
        let q = (i - 60) / 40, I = 0;
        for (let r of rays) {
          let d = (q - r.o) / r.w;
          I += r.b * Math.exp(-d * d) * (0.72 + 0.28 * Math.sin(t * r.f + r.ph));
        }
        profile[i] = (I * 0.6 + 0.35 * Math.max(0, 1 - q * q)) * smooth(1.25, 0.7, Math.abs(q));
      }
      let front = lerp(TOP9, 1, ease.inQuad(seg(t, 0, POUR))), w0 = halfW2(0, t) * 1.3;
      p.each(-w0 - 1, TOP9, w0 + 1, Math.min(front, 0.5), (x, y, sx, sy) => {
        let w = halfW2(y, t), q = x / w;
        if (q < -1.5 || q > 1.5) return;
        let I = profile[Math.round(q * 40) + 60] * k * (0.75 + 0.25 * smooth(TOP9, 0, y)) * smooth(front, front - 10, y);
        I <= 0.01 || (p.blendPx(sx, sy, C[6], I * 0.24), p.add(sx, sy, C[4], I * 0.3));
      });
      for (let r of cores) {
        let sh = 0.75 + 0.25 * Math.sin(t * r.f + r.ph);
        for (let y = TOP9; y < Math.min(front, 0); y++) {
          let pulse2 = 0.5 + 0.5 * Math.sin(y * 0.13 - t * 11 + r.ph);
          p.dot(r.o * halfW2(y, t), y, pulse2 > 0.8 ? WHITE : C[6], k * sh * (0.15 + 0.55 * pulse2) * smooth(front, front - 10, y));
        }
      }
      if (t < POUR + 0.05 && front > TOP9 + 14) {
        let fy = Math.min(front, 0);
        p.glow(0, fy, 14, C[5], 0.7 * k);
        for (let dy = -6; dy <= 0; dy++) p.dot(0, fy + dy, dy > -3 ? WHITE : C[6], 1 + dy / 7);
      }
      for (let m of motes2) {
        let y = TOP9 + ((m.y * -TOP9 + t * m.v) % -TOP9 + -TOP9) % -TOP9;
        if (y > front) continue;
        let w = halfW2(y, t), x = m.q * w + Math.sin(t * m.f + m.ph) * m.amp, I = profile[Math.round(x / w * 40) + 60] * k;
        I < 0.25 || (p.dot(x, y, I > 0.75 ? WHITE : I > 0.5 ? C[6] : C[5], Math.min(1, I * 1.4)), p.light(x, y, C[5], I * 0.5));
      }
    }
    function pool3(p, back) {
      let k = shaftK(t) * smooth(POUR - 0.05, POUR + 0.1, t), w = halfW2(0, t) * 1.25;
      if (!(k <= 0)) {
        if (back) {
          p.glow(0, -2, w * 1.6, C[4], 0.3 * k);
          return;
        }
        for (let y = 0; y <= 3; y++)
          for (let x = Math.floor(-w); x <= w; x++) {
            let u = Math.hypot(x / w, y / 4);
            if (u >= 1) continue;
            let a = k * (y === 0 ? Math.sqrt(1 - u) * 1.2 : (1 - u) * 0.9);
            p.dot(x, y, u < 0.3 ? y ? C[5] : WHITE : u < 0.6 ? C[5] : u < 0.85 ? C[4] : C[3], a);
          }
      }
    }
    function halo2(p) {
      let form = ease.outCubic(seg(t, H02, H1)), k = 1 - smooth(3.35, 3.9, t);
      if (form <= 0 || k <= 0) return;
      let white = t >= H1 && t < H1 + 0.06, gl = (t - H1) * 4.2 + Math.PI / 2, n = 96;
      for (let j = 0; j < n; j++) {
        let g = j / n * TAU, fromFront = Math.abs(((g - Math.PI / 2 + Math.PI) % TAU + TAU) % TAU - Math.PI);
        if (fromFront > form * Math.PI + 0.02) continue;
        let x = HX + Math.cos(g) * HRX * (0.9 + 0.1 * form), y = HY + Math.sin(g) * HRY, near2 = Math.sin(g) >= 0, dg = Math.abs(((g - gl + Math.PI) % TAU + TAU) % TAU - Math.PI), hot = white || dg < 0.22 || fromFront > form * Math.PI - 0.3;
        near2 ? (p.dot(x, y, hot ? WHITE : C[6], k), p.dot(x, y + 1, hot ? C[6] : C[4], k)) : p.dot(x, y, hot ? C[6] : C[5], k * 0.9);
      }
      p.glow(HX, HY, 20, C[4], 0.4 * k * form), p.glow(HX, HY + 1, 9, WHITE, 0.2 * k * form);
      let gx = HX + Math.cos(gl) * HRX, gy = HY + Math.sin(gl) * HRY;
      t > H1 && Math.sin(gl) > 0.2 && sparkle(p, gx, gy + 0.5, 2 + 2 * Math.sin(gl), C[6], C[4], 0.35 * k), t >= H1 && t < H1 + 0.3 && sparkle(p, HX, HY + HRY + 0.5, 7 * (1 - (t - H1) / 0.3), WHITE, C[5], 0.6);
    }
    function body4(p) {
      if (t >= CL1 + 0.6) return;
      let Ly = climbY(t);
      if (t < CL1) {
        recolor(p, A, (c, x, y) => {
          let d = y - Ly;
          if (d < -0.5) return toneOf(AS, c);
          if (d < 0.5) return WHITE;
          if (d < 1.5) return C[6];
          let k = Math.exp(-(d - 1.5) / 4) * 0.7;
          return k > 0.08 ? mix(c, C[5], k) : 0;
        });
        for (let [x, y] of S.out) {
          let d = y - Ly;
          d < -0.5 || d > 12 || p.dot(x, y, d < 1 ? WHITE : d < 5 ? C[5] : C[4], d < 1 ? 1 : 1.1 - d / 12);
        }
        t > CL0 && (p.glow(0, Ly, 26, C[4], 0.5), p.glow(0, Ly, 8, WHITE, 0.3), p.glow(0, -18, 36, C[5], 0.16 * seg(t, CL0, CL1)));
        return;
      }
      let u = t - CL1;
      if (recolor(p, A, (c) => u < 0.06 ? WHITE : u < 0.45 ? mix(c, C[5], 0.55 * Math.pow(1 - u / 0.45, 2)) : 0), u < 0.25) for (let [x, y] of S.out) p.dot(x, y, u < 0.08 ? WHITE : C[5], 1 - u / 0.25);
    }
    return {
      update(dt) {
        if (t += dt, t > 0.05 && t < 2.9 && R6.chance(0.16)) {
          let q = R6.range(-0.9, 0.9), y = TOP9 + R6.range(8, 24), v0 = R6.range(50, 90), life = Math.log(1 + 3 * (-y - 2) / v0) / 3;
          ps.spawn(P.STREAK, q * halfW2(y, t), y, q * 2, v0, life, R6.chance(0.5) ? C[6] : C[5]);
        }
        if (t > 0.3 && t < 2.8 && R6.chance(0.05) && ps.spawn(P.STAR, R6.range(-1, 1) * halfW2(-30, t), -R6.range(4, 90), R6.range(-3, 3), R6.range(-4, 6), R6.range(0.4, 0.8), R6.chance(0.5) ? C[6] : WHITE, R6.range(0.6, 1.8)), !poured && t >= POUR) {
          poured = !0, lights.add(0, -12, 42, C[5], 0.9, 0.4), lights.add(0, -6, 16, WHITE, 0.6, 0.1);
          for (let i = 0; i < 14; i++) ps.spawn(P.STAR, R6.range(-18, 18), -R6.range(0, 6), R6.range(-20, 20), -R6.range(10, 50), R6.range(0.5, 1.1), R6.chance(0.5) ? WHITE : C[6], R6.range(0.6, 2.2));
          for (let i = 0; i < 10; i++) {
            let a = -Math.PI / 2 + R6.range(-1.2, 1.2), sp = R6.range(60, 150);
            ps.spawn(P.SPARK, R6.range(-3, 3), -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.25, 0.5));
          }
        }
        if (t > CL0 && t < CL1) {
          let Ly = Math.round(climbY(t));
          for (let y of [Ly, Ly + 1]) {
            let xs = rows.get(y);
            if (!xs || !R6.chance(0.35)) continue;
            let x = R6.pick(xs), s = Math.sign(x + 0.5);
            ps.spawn(R6.chance(0.6) ? P.MOTE : P.STAR, x + s, y, s * R6.range(8, 30), -R6.range(15, 45), R6.range(0.35, 0.7), R6.chance(0.5) ? C[6] : C[5], R6.range(0.5, 1.1));
          }
        }
        if (!flashed && t >= CL1) {
          flashed = !0, lights.add(0, -24, 64, C[5], 0.7, 0.5), lights.add(0, -30, 28, WHITE, 0.7, 0.1);
          for (let i = 0; i < 18; i++) {
            let a = R6.range(0, TAU), sp = R6.range(30, 110);
            ps.spawn(P.STAR, Math.cos(a) * 6, -24 + Math.sin(a) * 12, Math.cos(a) * sp, Math.sin(a) * sp * 0.7 - 20, R6.range(0.4, 0.9), R6.chance(0.5) ? WHITE : C[6], R6.range(0.6, 2));
          }
        }
        if (t > H02 - 0.2 && t < H02 + 0.1 && R6.chance(0.6)) {
          let g = R6.range(0, TAU), D25 = R6.range(14, 24), x = HX + Math.cos(g) * D25, y = HY + Math.sin(g) * D25 * 0.5, tx = HX + Math.cos(g + 0.6) * HRX, ty = HY + Math.sin(g + 0.6) * HRY, T2 = R6.range(0.16, 0.24), l = Math.hypot(tx - x, ty - y) || 1, v = l * 3 / (Math.exp(3 * T2) - 1);
          ps.spawn(P.STREAK, x, y, (tx - x) / l * v, (ty - y) / l * v, T2, R6.chance(0.5) ? C[6] : C[5]);
        }
        if (!formed && t >= H1 && (formed = !0, lights.add(HX, HY, 30, C[6], 0.8, 0.3)), t > W02 && t < W02 + 0.35 && R6.chance(0.5))
          for (let side of [-1, 1]) {
            let f = R6.pick(wing(t, side).out);
            f && ps.spawn(P.STAR, f.x + Math.cos(f.ang) * f.len, f.y + Math.sin(f.ang) * f.len, side * R6.range(5, 25), -R6.range(5, 25), R6.range(0.3, 0.6), R6.chance(0.5) ? WHITE : C[6], R6.range(0.6, 1.6));
          }
        if (t > W02 + 0.45 && t < SC)
          for (let side of [-1, 1]) {
            if (R6.chance(0.045)) {
              let f = R6.pick(wing(t, side).out.filter((w) => w.q.kind === 0));
              f && ps.spawn(P.STAR, f.x + Math.cos(f.ang) * (f.len - 2), f.y + Math.sin(f.ang) * (f.len - 2), 0, -R6.range(2, 8), R6.range(0.3, 0.6), R6.chance(0.5) ? WHITE : C[6], R6.range(1, 2.4));
            }
            if (R6.chance(0.03)) {
              let f = R6.pick(wing(t, side).out);
              f && ps.spawn(P.EMBER, f.x + Math.cos(f.ang) * f.len * 0.7, f.y + Math.sin(f.ang) * f.len * 0.7, R6.range(-8, 8), -R6.range(8, 25), R6.range(0.6, 1.1), C[5]);
            }
          }
        if (!beaten && t >= B2 - 0.03) {
          beaten = !0;
          for (let side of [-1, 1]) {
            lights.add(side * 30, -34, 46, C[5], 0.6, 0.4);
            for (let i = 0; i < 7; i++) ps.spawn(P.MOTE, side * R6.range(8, 22), -R6.range(1, 4), side * R6.range(90, 160), -R6.range(0, 8), R6.range(0.25, 0.45), R6.chance(0.5) ? C[6] : C[5], R6.range(0.6, 1));
            for (let f of wing(t, side).out)
              if (f.q.kind === 0) {
                let tx = f.x + Math.cos(f.ang) * f.len, ty = f.y + Math.sin(f.ang) * f.len;
                ps.spawn(P.SPARK, tx, ty, side * R6.range(30, 90), R6.range(60, 160), R6.range(0.3, 0.6));
              }
            for (let i = 0; i < 3; i++) {
              let f = R6.pick(wing(t, side).out.filter((w) => w.q.kind === 1));
              f && loose.add({ x: f.x + Math.cos(f.ang) * f.len * 0.6, y: f.y + Math.sin(f.ang) * f.len * 0.6, vx: side * R6.range(20, 70), vy: R6.range(10, 50), a: f.ang, len: R6.range(9, 12), wid: R6.range(2.2, 2.8), life: R6.range(1.2, 1.6), side });
            }
          }
        }
        for (let side of [-1, 1]) {
          let si = side > 0 ? 0 : 1;
          for (let q of quills) {
            if (q.gone[si] || t < q.off[si]) continue;
            q.gone[si] = !0;
            let f = wing(q.off[si] - 1e-3, side).out.find((w) => w.q === q);
            if (!f) continue;
            let ca = Math.cos(f.ang), sa = Math.sin(f.ang), n = q.kind === 2 ? 0 : 1;
            for (let j = 0; j < n; j++) {
              let x = f.x + ca * f.len * 0.55, y = f.y + sa * f.len * 0.55, ox = x - side * 4, oy = y + 20, l = Math.hypot(ox, oy) || 1, sp = R6.range(60, 150);
              loose.add({ x, y, vx: ox / l * sp + R6.range(-15, 15), vy: oy / l * sp * 0.5 - R6.range(20, 50), a: f.ang + R6.range(-0.4, 0.4), len: R6.range(9, 12), wid: R6.range(2.2, 2.8), life: R6.range(1, 1.45), side, back: R6.chance(0.35) });
            }
            for (let j = 0; j < 2; j++) ps.spawn(P.EMBER, f.x + ca * f.len * R6.range(0.3, 1), f.y + sa * f.len * R6.range(0.3, 1), R6.range(-15, 15), -R6.range(10, 40), R6.range(0.6, 1.1), C[5]);
            R6.chance(0.6) && ps.spawn(P.STAR, f.x + ca * f.len, f.y + sa * f.len, 0, -R6.range(5, 15), R6.range(0.3, 0.6), WHITE, R6.range(1, 2));
          }
        }
        if (t > 3.35 && t < 3.75 && R6.chance(0.4)) {
          let g = R6.range(0, TAU);
          ps.spawn(P.EMBER, HX + Math.cos(g) * HRX, HY + Math.sin(g) * HRY, R6.range(-6, 6), -R6.range(10, 25), R6.range(0.5, 0.9), C[5]);
        }
        ps.update(dt), lights.update(dt), loose.update(dt);
      },
      drawBack(p) {
        shaft(p), pool3(p, !0), t > POUR && t < POUR + 0.4 && band(p, 0, 0, 4 + 32 * ease.outCubic(seg(t, POUR, POUR + 0.4)), 0.18, 2.5 * (1 - seg(t, POUR, POUR + 0.4)) + 0.5, 1.1 - seg(t, POUR, POUR + 0.4), C.slice(3), FAR, t < POUR + 0.06);
        for (let side of [-1, 1]) drawWing(p, side);
        loose.draw(p, WING, "back"), ps.draw(p, "back");
      },
      draw(p) {
        if (pool3(p, !1), t > POUR && t < POUR + 0.4 && band(p, 0, 0, 4 + 32 * ease.outCubic(seg(t, POUR, POUR + 0.4)), 0.18, 2.5 * (1 - seg(t, POUR, POUR + 0.4)) + 0.5, 1.1 - seg(t, POUR, POUR + 0.4), C.slice(3), NEAR, t < POUR + 0.06), body4(p), t > B2 - 0.03 && t < B2 + 0.45) {
          let u = seg(t, B2 - 0.03, B2 + 0.45), fx = 10 + 70 * ease.outCubic(u);
          for (let s of [-1, 1]) for (let d = 0; d < 12; d++) p.dot(s * (fx - d), 0, d < 2 ? WHITE : d < 5 ? C[6] : C[4], (1 - u) * (1 - d / 12) * 1.3);
        }
        let wk = smooth(W02, W02 + 0.2, t) * (1 - smooth(SC, SC + 0.3, t));
        if (wk > 0) {
          for (let [x, y] of S.out) y < -8 && p.light(x, y, C[5], 0.55 * wk);
          p.glow(0, -34, 76, C[4], 0.14 * wk);
        }
        halo2(p), t >= CL1 && t < CL1 + 0.22 && flare(p, 0, S.top - 1, 22 * (1 - (t - CL1) / 0.22), 1 - (t - CL1) / 0.22, C.slice(3)), loose.draw(p, WING, "front"), ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta59, DOWN2, RISEN, act19, TOP9, POUR, CL0, CL1, W02, H02, H1, B0, B1, B2, B3, SC, HX, HY, HRX, HRY, SHOULDER, ARM_OPEN, ARM_FOLD, QUILLS, FLEX, init_resurrection = __esm({
    "src/fx/holy/resurrection.js"() {
      init_core();
      init_lib6();
      meta59 = {
        name: "Resurrection",
        desc: "Light pours down on the fallen and life climbs back up the body; wings of light unfold, a halo forms, one great wingbeat, then the wings scatter into feathers.",
        tags: ["holy", "revive", "resurrect", "wings", "halo", "light", "character", "one-shot"],
        size: [192, 160],
        origin: [96, 140],
        duration: 4.8,
        loop: !1,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: { palette: GOLD, ash: ASH, seed: 5 }
      }, DOWN2 = { turn: 0.9, crouch: 8, lean: 6, hy: 2, fx: -4, fy: -10, bx: 9, by: -10, ffx: 8, fbx: -7 }, RISEN = { turn: 1.15, crouch: -1, fx: -15, fy: -33, bx: 16, by: -33, hy: -1, ffx: -3, ffy: -5, fbx: 4, fby: -5 }, act19 = {
        onBody: !0,
        follow: 0.6,
        poses: [
          [0, DOWN2],
          [0.5, DOWN2],
          [0.85, { ...DOWN2, crouch: 6, lean: 4, hy: 1 }],
          [1.15, { turn: 1, crouch: 2, fx: -8, fy: -17, bx: 9, by: -17 }],
          [1.5, { ...RISEN, y: -2 }],
          [1.95, { ...RISEN, y: -3 }],
          [2.1, { ...RISEN, y: -2, crouch: 1, fy: -37, by: -37 }],
          [2.3, { ...RISEN, y: -9, fx: -15, fy: -38, bx: 16, by: -38 }],
          [2.95, { ...RISEN, y: -6 }],
          [3.8, { turn: 1, y: 0, crouch: 2, fx: -8, fy: -17, bx: 9, by: -17 }],
          [4.3, READY],
          [4.8, READY]
        ],
        dust: [{ t: 3.8, x: 0, n: 5 }]
      }, TOP9 = -140, POUR = 0.34, CL0 = 0.5, CL1 = 1.15, W02 = 1.1, H02 = 1.24, H1 = 1.5, B0 = 1.95, B1 = 2.25, B2 = 2.37, B3 = 2.8, SC = 2.95, HX = 0, HY = -47, HRX = 9.5, HRY = 2.6, SHOULDER = [4, -20], ARM_OPEN = [[0, 0], [7, -9], [15, -19], [20, -27]], ARM_FOLD = [[0, 0], [2, -2], [3, -3], [4, -3]], QUILLS = [
        [0.14, 1.35, 11, 2.6, 1],
        [0.26, 1.12, 14, 2.8, 1],
        [0.38, 0.88, 17, 3, 1],
        [0.5, 0.62, 19, 3.1, 1],
        [0.62, 0.35, 21, 3.2, 1],
        [0.72, 0.08, 23, 3.3, 1],
        [0.8, -0.2, 26, 3.4, 0],
        [0.85, -0.45, 29, 3.5, 0],
        [0.9, -0.72, 31, 3.6, 0],
        [0.95, -1, 30, 3.6, 0],
        [1, -1.3, 26, 3.4, 0],
        [0.22, 1.2, 7, 2.2, 2],
        [0.34, 0.98, 8, 2.3, 2],
        [0.46, 0.75, 9, 2.4, 2],
        [0.58, 0.5, 10, 2.5, 2],
        [0.7, 0.22, 10, 2.5, 2],
        [0.81, -0.1, 11, 2.6, 2],
        [0.92, -0.5, 11, 2.6, 2]
      ], FLEX = [1, 0.5, 0.3];
    }
  });

  // src/fx/holy/blessing.js
  var blessing_exports = {};
  __export(blessing_exports, {
    act: () => act20,
    draw: () => draw22,
    drawBack: () => drawBack10,
    meta: () => meta60
  });
  function landings(o, S) {
    let key = `${o.seed}:${S.x}:${S.y}`;
    if (LANDS.has(key)) return LANDS.get(key);
    let out = [];
    for (let i = 0; i < 20; i++) {
      let R6 = rng(o.seed, i), q = R6.range(-0.9, 0.9), v = R6.range(22, 34), sway = R6.range(1, 3), ph = R6.range(0, TAU), size = R6.range(0.8, 2.4), land = 1 / 0;
      for (let a = 0; a < 6; a += 0.02) {
        let y = TOP10 + 6 + v * a, x = q * halfW(y) + Math.sin(a * 2.2 + ph) * sway;
        if (y >= -1 || S.at(x, y)) {
          land = a;
          break;
        }
      }
      out.push({ q, v, sway, ph, size, land });
    }
    return LANDS.set(key, out), out;
  }
  function drawBack10(p, t, o) {
    let C = fit(o.palette, 8);
    p.each(-24, TOP10, 24, 0.5, (x, y, sx, sy) => {
      let I = ray3(x / halfW(y), t) * (0.6 + 0.4 * smooth(TOP10, 0, y));
      I < 0.02 || (p.blendPx(sx, sy, C[6], I * 0.13), p.add(sx, sy, C[4], I * 0.22));
    });
    for (let [o2, , k, ph] of [RAYS[1], RAYS[2]])
      for (let y = TOP10; y < -1; y++) {
        let pulse2 = 0.5 + 0.5 * Math.sin(y * 0.11 - t / T * TAU * 3 + ph);
        p.dot(o2 * halfW(y), y, pulse2 > 0.85 ? WHITE : C[6], (0.1 + 0.45 * pulse2) * (0.5 + 0.5 * Math.sin(t / T * TAU * k + ph)) * smooth(TOP10, TOP10 + 20, y));
      }
    p.glow(0, -4, 30, C[4], 0.22);
  }
  function draw22(p, t, o) {
    let C = fit(o.palette, 8), A = o.actor, S = A ? shapeOf(A) : null;
    if (A) {
      let m = A.mask;
      for (let i = 0; i < m.w; i++)
        for (let j = 0; j < m.h; j++) {
          let c = A.pixels[j * m.w + i];
          if (!(!c || luma(c) < 0.15)) {
            p.px(A.x + i, A.y + j, mix(c, C[6], 0.35));
            break;
          }
        }
      p.glow(0, -30, 20, C[5], 0.22);
    }
    for (let y = 0; y <= 3; y++)
      for (let x = -24; x <= 24; x++) {
        let u = Math.hypot(x / 24, y / 4);
        u >= 1 || p.dot(x, y, u < 0.3 ? y ? C[5] : WHITE : u < 0.6 ? C[5] : u < 0.85 ? C[4] : C[3], y === 0 ? Math.sqrt(1 - u) : (1 - u) * 0.7);
      }
    if (S) {
      let L = landings(o, S);
      cycle(t, T, L.length, o.seed, (g) => 3, (age, life, R6, i) => {
        let s = L[i], y = TOP10 + 6 + s.v * age, x = s.q * halfW(y) + Math.sin(age * 2.2 + s.ph) * s.sway, fade = Math.min(1, age / 0.3);
        if (age > s.land) {
          let w = (age - s.land) / 0.14;
          if (w < 1) {
            let ly = TOP10 + 6 + s.v * s.land, lx = s.q * halfW(ly) + Math.sin(s.land * 2.2 + s.ph) * s.sway;
            sparkle(p, lx, ly, 3 * (1 - w) + 1, WHITE, C[6], 0.5 * (1 - w));
          }
          return;
        }
        let tw = 0.6 + 0.4 * Math.sin(age * (7 + i % 4) + s.ph);
        s.size > 1.2 ? sparkle(p, x, y, s.size * tw * fade, tw > 0.85 ? WHITE : C[6], C[5], 0.35 * fade) : (p.dot(x, y, tw > 0.8 ? WHITE : C[6], fade), p.glow(x, y, 3, C[5], 0.35 * fade));
      });
    }
    cycle(t, T, 16, o.seed + 9, (g) => g.range(1.2, 2.4), (age, life, R6) => {
      let u = age / life, y = TOP10 + 10 + R6.range(0, 90) + u * R6.range(6, 14), q = R6.range(-1, 1), x = q * halfW(y) + Math.sin(age * 1.7 + q * 5) * 1.5, k = Math.sin(u * Math.PI) * ray3(q, t);
      k > 0.12 && p.dot(x, y, k > 0.45 ? WHITE : C[6], Math.min(1, k * 2.2));
    });
  }
  var meta60, OPEN3, act20, TOP10, T, halfW, RAYS, ray3, LANDS, init_blessing = __esm({
    "src/fx/holy/blessing.js"() {
      init_core();
      init_lib6();
      meta60 = {
        name: "Blessing",
        desc: "A soft cone of light rests on the character from above; sparkles drift down through it, twinkling, and wink out where they land on the head and shoulders.",
        tags: ["holy", "blessing", "buff", "light", "sparkle", "character", "loop"],
        size: [80, 128],
        origin: [40, 108],
        duration: 3,
        loop: !0,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: { palette: GOLD, seed: 7 }
      }, OPEN3 = { turn: 1.15, fx: -13, fy: -31, bx: 14, by: -31, hy: -1, ffx: -3, fbx: 4 }, act20 = {
        onBody: !0,
        poses: [
          [0, OPEN3],
          [0.75, { ...OPEN3, fy: -33, by: -33 }],
          [1.5, { ...OPEN3, crouch: -1, fy: -35, by: -35 }],
          [2.25, { ...OPEN3, fy: -33, by: -33 }],
          [3, OPEN3]
        ]
      }, TOP10 = -108, T = 3, halfW = (y) => lerp(5, 20, (y - TOP10) / -TOP10), RAYS = [[-0.62, 0.16, 1, 0.3], [-0.2, 0.2, 2, 1.7], [0.22, 0.14, 1, 4.1], [0.6, 0.18, 2, 2.6]], ray3 = (q, t) => {
        let I = 0.3 * Math.max(0, 1 - q * q);
        for (let [o, w, k, ph] of RAYS) I += Math.exp(-(((q - o) / w) ** 2)) * (0.55 + 0.45 * Math.sin(t / T * TAU * k + ph)) * 0.6;
        return I * smooth(1.25, 0.75, Math.abs(q));
      }, LANDS = /* @__PURE__ */ new Map();
    }
  });

  // src/fx/holy/halo.js
  var halo_exports = {};
  __export(halo_exports, {
    act: () => act21,
    draw: () => draw23,
    meta: () => meta61
  });
  function draw23(p, t, o) {
    let C = fit(o.palette, 8), T2 = meta61.duration, ph = t / T2 * TAU, A = o.actor, y0 = HY2 + (Math.sin(ph) > 0.55 ? -1 : 0), gl = Math.PI / 2 + ph;
    if (A) {
      let m = A.mask;
      for (let i = 0; i < m.w; i++)
        for (let j = 0; j < Math.min(m.h, 9); j++) {
          let c = A.pixels[j * m.w + i];
          if (!c || luma(c) < 0.15) continue;
          let x = A.x + i, y = A.y + j;
          p.px(x, y, mix(c, C[6], 0.45));
          let c2 = A.pixels[(j + 1) * m.w + i];
          c2 && luma(c2) >= 0.15 && p.px(x, y + 1, mix(c2, C[5], 0.18));
          for (let d = 0; d <= 4; d++) p.light(x, y + d, C[4], 0.3 * (1 - d / 5));
          break;
        }
    }
    for (let j = 0, n = 92; j < n; j++) {
      let g = j / n * TAU, x = Math.cos(g) * RX3, y = y0 + Math.sin(g) * RY, near2 = Math.sin(g) >= 0, shimmer = Math.sin(g * 3 - ph * 2) > 0.7, hot = apart(g, gl) < 0.3;
      near2 ? (p.px(x, y, hot ? WHITE : shimmer ? WHITE : C[6]), p.px(x, y + 1, hot ? C[6] : C[4])) : p.dot(x, y, hot ? WHITE : shimmer ? C[6] : C[5], 0.9);
    }
    p.glow(0, y0, 20, C[4], 0.4), p.glow(0, y0 + 1, 9, WHITE, 0.16);
    let gx = Math.cos(gl) * RX3, gy = y0 + Math.sin(gl) * RY;
    Math.sin(gl) > -0.2 ? sparkle(p, gx, gy + 0.5, 1.5 + 2.5 * Math.max(0, Math.sin(gl)), WHITE, C[6], 0.45) : p.glow(gx, gy, 5, C[6], 0.3), p.glowLine(0, y0 + 2, 0, y0 + 9, 9, C[4], 0.16), cycle(t, T2, 6, o.seed + 3, (g) => g.range(0.3, 0.5), (age, life, R6) => {
      let g = R6.range(0, TAU), d = R6.range(1.1, 1.5), k = Math.sin(age / life * Math.PI);
      sparkle(p, Math.cos(g) * RX3 * d, y0 + Math.sin(g) * RY * d - R6.range(1, 4), 1 + 2 * k, WHITE, C[6], 0.4 * k);
    }), cycle(t, T2, 16, o.seed, (g) => g.range(0.8, 1.5), (age, life, R6) => {
      let g = R6.range(0, TAU), u = age / life, x = Math.cos(g) * RX3 * R6.range(0.8, 1) + Math.sin(u * 5 + g) * 1.2, y = y0 + Math.sin(g) * RY + 1 + u * R6.range(7, 14), tw = 0.6 + 0.4 * Math.sin(age * 18 + g * 7), k = Math.sin(u * Math.PI) * tw;
      p.dot(x, y, tw > 0.85 ? WHITE : C[6], Math.min(1, k * 1.5)), p.light(x, y, C[5], 0.5 * k);
    });
  }
  var meta61, PRAY, act21, HY2, RX3, RY, apart, init_halo = __esm({
    "src/fx/holy/halo.js"() {
      init_core();
      init_lib6();
      meta61 = {
        name: "Halo",
        desc: "A ring of gold light floats over the head with a glint running round it; fine dust sifts down from it and the head catches its light.",
        tags: ["holy", "halo", "saint", "buff", "glow", "character", "loop"],
        size: [56, 80],
        origin: [28, 70],
        duration: 2,
        loop: !0,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: { palette: GOLD, seed: 5 }
      }, PRAY = { turn: 1.1, fx: -1, fy: -26, bx: 2, by: -26, armsFront: !0, hy: 1, ffx: -3, fbx: 4 }, act21 = {
        onBody: !0,
        poses: [[0, PRAY], [0.5, { ...PRAY, crouch: 1 }], [1, { ...PRAY, crouch: 1, hy: 2 }], [1.5, { ...PRAY, crouch: 1 }], [2, PRAY]]
      }, HY2 = -46, RX3 = 9.5, RY = 2.6, apart = (a, b) => Math.abs(((a - b + Math.PI) % TAU + TAU) % TAU - Math.PI);
    }
  });

  // src/fx/holy/divine-shield.js
  var divine_shield_exports = {};
  __export(divine_shield_exports, {
    act: () => act22,
    draw: () => draw24,
    drawBack: () => drawBack11,
    meta: () => meta62
  });
  function onSphere(r, lat, lon) {
    let X = r * Math.cos(lat) * Math.sin(lon), Y3 = r * Math.sin(lat), Z = r * Math.cos(lat) * Math.cos(lon);
    return [X, CY4 - (Y3 * Math.cos(TILT2) - Z * Math.sin(TILT2)), Y3 * Math.sin(TILT2) + Z * Math.cos(TILT2)];
  }
  function lattice(p, t, o, back) {
    let C = fit(o.palette, 8), r = o.radius, T2 = meta62.duration, phi = t / T2 * (Math.PI / N3), sw = sheen(t, T2), seen = /* @__PURE__ */ new Map(), dot2 = (x, y, z) => {
      if (z < 0 !== back) return;
      let key = Math.floor(x) * 1e3 + Math.floor(y), f = Math.abs(z) / r, q = (x - (y - CY4)) / (r * 1.414), hot = Math.abs(q - sw) < 0.12 ? 1 : 0, v = seen.get(key);
      (!v || f < v[2]) && seen.set(key, [x, y, f, hot || (v ? v[3] : 0)]);
    };
    for (let k = 0; k < 2 * N3; k++) {
      let lon = phi + k * Math.PI / N3;
      for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += 0.7 / r) dot2(...onSphere(r, lat, lon));
    }
    for (let lon = 0; lon < TAU; lon += 0.7 / r) dot2(...onSphere(r, 0, lon));
    for (let [x, y, f, hot] of seen.values())
      back ? p.blend(x, y, C[4], 0.32) : hot ? p.px(x, y, WHITE) : f < 0.4 ? p.px(x, y, C[6]) : p.blend(x, y, f < 0.7 ? C[6] : C[5], f < 0.7 ? 0.8 : 0.55);
  }
  function film(p, t, o, back) {
    let C = fit(o.palette, 8), r = o.radius, sw = sheen(t, meta62.duration);
    p.each(-r - 1, CY4 - r - 1, r + 1, CY4 + r + 1, (x, y, sx, sy) => {
      let d = Math.hypot(x, y - CY4) / r;
      if (d >= 1) return;
      let q = (x - (y - CY4)) / (r * 1.414), hot = Math.max(0, 1 - Math.abs(q - sw) / 0.22), a = (back ? 0.07 : 0.03) + 0.26 * Math.pow(d, 6) + 0.2 * hot * (back ? 0.3 : 1);
      p.blendPx(sx, sy, hot > 0.5 && !back ? C[6] : C[5], a);
    });
  }
  function drawBack11(p, t, o) {
    let C = fit(o.palette, 8), r = o.radius, rf = Math.sqrt(r * r - CY4 * CY4);
    film(p, t, o, !0), lattice(p, t, o, !0), oval(p, 0, 0, rf, rf * FLOOR_SY, C[5], 0.8, (g) => Math.sin(g) < 0), p.glow(0, CY4, r * 1.1, C[4], 0.14);
  }
  function draw24(p, t, o) {
    let C = fit(o.palette, 8), r = o.radius, T2 = meta62.duration, rf = Math.sqrt(r * r - CY4 * CY4), A = o.actor;
    if (A) for (let [x, y] of shapeOf(A).out) p.light(x, y, C[5], 0.3);
    film(p, t, o, !1), lattice(p, t, o, !1);
    let sw = sheen(t, T2);
    for (let j = 0, n = Math.ceil(r * TAU * 1.4); j < n; j++) {
      let g = j / n * TAU, x = Math.cos(g) * r, y = CY4 + Math.sin(g) * r, q = (x - (y - CY4)) / (r * 1.414), lit = Math.cos(g + 2.36), hot = Math.abs(q - sw) < 0.15;
      p.dot(x, y, hot || lit > 0.75 ? WHITE : lit > -0.2 ? C[6] : C[5], 1), p.dot(Math.cos(g) * (r - 1), CY4 + Math.sin(g) * (r - 1), C[4], 0.35 + 0.3 * lit);
    }
    p.glowRing(0, CY4, r, 6, C[4], 0.32);
    let phi = t / T2 * (Math.PI / N3);
    for (let k = 0; k < 2 * N3; k++) {
      let [x, y, z] = onSphere(r, 0, phi + k * Math.PI / N3);
      if (!(z < r * 0.15)) {
        if (p.px(x, y, WHITE), z > r * 0.45) for (let [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.blend(x + dx, y + dy, C[6], 0.7);
        p.glow(x, y, 4, C[5], 0.3);
      }
    }
    let [px0, py0] = onSphere(r, Math.PI / 2, 0);
    sparkle(p, px0, py0, 2 + Math.round(1.5 + 1.5 * Math.sin(t / T2 * TAU * 2)), WHITE, C[6], 0.45);
    for (let off2 of [0, Math.PI]) {
      let g = t / T2 * TAU + off2 + 0.8;
      sparkle(p, Math.cos(g) * r, CY4 + Math.sin(g) * r, 2, WHITE, C[6], 0.4);
    }
    for (let g = 3.55; g < 4.2; g += 0.04) p.px(Math.cos(g) * r * 0.74, CY4 + Math.sin(g) * r * 0.74, g > 3.7 && g < 4.05 ? WHITE : C[6]);
    p.px(Math.cos(3.4) * r * 0.62, CY4 + Math.sin(3.4) * r * 0.62, WHITE);
    for (let g = 0.45; g < 0.8; g += 0.05) p.dot(Math.cos(g) * r * 0.8, CY4 + Math.sin(g) * r * 0.8, C[5], 0.6);
    oval(p, 0, 0, rf, rf * FLOOR_SY, (g) => Math.sin(g) > 0.6 ? WHITE : C[6], 1, (g) => Math.sin(g) >= 0);
    for (let i = -2; i <= 2; i++) p.glow(i * rf * 0.5, 0, 12, C[4], 0.18);
    cycle(t, T2, 9, o.seed, (g) => g.range(0.35, 0.6), (age, life, R6) => {
      let [x, y, z] = onSphere(r, R6.range(-1.2, 1.3), R6.range(0, TAU) + phi), k = Math.sin(age / life * Math.PI);
      z < 0 || sparkle(p, x, y, 1 + 2.5 * k * R6.range(0.6, 1), WHITE, C[6], 0.45 * k);
    }), cycle(t, T2, 12, o.seed + 1, (g) => g.range(1.2, 2.2), (age, life, R6) => {
      let x0 = R6.range(-0.7, 0.7) * r, u = age / life, x = x0 + Math.sin(u * 6 + R6.range(0, 6)) * 2, y = CY4 + r * 0.75 - u * r * 1.4;
      Math.hypot(x, y - CY4) > r - 2 || (p.dot(x, y, u < 0.5 ? C[6] : C[5], Math.sin(u * Math.PI)), p.light(x, y, C[5], 0.4 * Math.sin(u * Math.PI)));
    });
  }
  var meta62, BRACE, act22, CY4, TILT2, N3, FLOOR_SY, sheen, init_divine_shield = __esm({
    "src/fx/holy/divine-shield.js"() {
      init_core();
      init_lib6();
      meta62 = {
        name: "Divine shield",
        desc: "A bubble of gold light round the character: a bright rim and a thin gold film, meridians turning like a slow globe, a sheen sweeping across and sparkles winking on it.",
        tags: ["holy", "shield", "bubble", "barrier", "buff", "character", "loop"],
        size: [88, 84],
        origin: [44, 68],
        duration: 2.4,
        loop: !0,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: { palette: GOLD, radius: 29, seed: 8 }
      }, BRACE = { turn: 0.7, crouch: 3, lean: 1, fx: 5, fy: -33, bx: 10, by: -20, ffx: 4, fbx: -2 }, act22 = {
        onBody: !0,
        poses: [
          [0, BRACE],
          [0.6, { ...BRACE, crouch: 4 }],
          [1.2, { ...BRACE, fy: -35, crouch: 3 }],
          [1.8, { ...BRACE, crouch: 4 }],
          [2.4, BRACE]
        ]
      }, CY4 = -22, TILT2 = 0.34, N3 = 4, FLOOR_SY = 0.26;
      sheen = (t, T2) => -1.7 + 3.4 * clamp(t / T2 % 1 / 0.55);
    }
  });

  // src/fx/shadow/hex-sigil.js
  var hex_sigil_exports = {};
  __export(hex_sigil_exports, {
    create: () => create39,
    meta: () => meta63
  });
  function strokes(seed2) {
    let paths = [], circle2 = (r, a0, n = 0) => Array.from({ length: (n || Math.ceil(r * TAU)) + 1 }, (_, i) => [Math.cos(a0 + i / (n || Math.ceil(r * TAU)) * TAU) * r, CY5 + Math.sin(a0 + i / (n || Math.ceil(r * TAU)) * TAU) * r]);
    paths.push(circle2(RO, -Math.PI / 2));
    let star3 = [];
    for (let i = 0; i <= 7; i++) {
      let a = -Math.PI / 2 + i * 3 % 7 * (TAU / 7);
      star3.push([Math.cos(a) * RI, CY5 + Math.sin(a) * RI]);
    }
    paths.push(star3), paths.push(circle2(RI, -Math.PI / 2)), paths.push(circle2(RC, Math.PI / 2)), paths.push([[0, CY5 - 3.5], [2, CY5], [0, CY5 + 3.5], [-2, CY5], [0, CY5 - 3.5]]);
    let pts = [], speeds = [420, 700, 550, 380, 300], t = 0.12;
    return paths.forEach((path2, k) => {
      for (let i = 1; i < path2.length; i++) {
        let [x0, y0] = path2[i - 1], [x1, y1] = path2[i], L = Math.hypot(x1 - x0, y1 - y0);
        for (let d = 0; d < L; d += 0.5) pts.push({ x: x0 + (x1 - x0) * d / L, y: y0 + (y1 - y0) * d / L, t: t + d / speeds[k] });
        t += L / speeds[k];
      }
      t += 0.04;
    }), { pts, end: t };
  }
  function glyphs(seed2) {
    return Array.from({ length: 7 }, (_, i) => {
      let r = rng(seed2, i, 31), segs = [[[1, 0], [1, 2]]];
      for (let k = 0; k < 2 + (r.next() < 0.5 ? 1 : 0); k++) {
        let a = [r.int(0, 2), r.int(0, 2)], b = [Math.max(0, Math.min(2, a[0] + r.int(-1, 1))), Math.max(0, Math.min(2, a[1] + r.int(-1, 1)))];
        (a[0] !== b[0] || a[1] !== b[1]) && segs.push([a, b]);
      }
      let ang = -Math.PI / 2 + i * TAU / 7 + Math.PI / 7, rr = (RO + RI) / 2;
      return { x: Math.cos(ang) * rr, y: CY5 + Math.sin(ang) * rr, segs, t: GLYPH + i * 0.07 };
    });
  }
  function create39(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), floor = () => 0, S = strokes(o.seed), G6 = glyphs(o.seed), ps = new Particles({ rng: R6, ground: floor, sparks: [WHITE, C[7], C[6], C[5]] }), embers = new Particles({ rng: R6, ground: floor, sparks: [C[7], C[6], C[5], C[4]] }), puffs = new Puffs({ rng: R6, flame: [WHITE, C[7], C[6], C[5], C[4], C[3], C[2], C[1], C[0]], soot: [mix(C[3], C[2], 0.5), mix(C[2], C[1], 0.5)], cap: mix(C[4], C[2], 0.5), rim: [C[6], C[5], C[4]], floor }), bits = new Bits({ ground: floor }), lights = [], t = 0, pi = 0, flared = !1, broke = !1, pen = () => S.pts[Math.min(S.pts.length - 1, pi)];
    return {
      update(dt) {
        for (t += dt; pi < S.pts.length - 1 && S.pts[pi + 1].t <= t; ) pi++;
        if (t > 0.12 && t < S.end) {
          let q = pen();
          R6.chance(dt * 70) && ps.spawn(P.SPARK, q.x, q.y, R6.range(-70, 70), R6.range(-100, 20), R6.range(0.12, 0.35)), R6.chance(dt * 10) && embers.spawn(P.EMBER, q.x, q.y, R6.range(-12, 12), R6.range(5, 25), R6.range(0.5, 0.9));
        }
        if (t > 0.2 && t < FLARE - 0.05 && R6.chance(dt * (8 + 14 * smooth(0.2, FLARE, t)))) {
          let a = R6.range(0, TAU), D0 = R6.range(40, 60), T2 = R6.range(0.22, 0.32), v = D0 * 3 / (Math.exp(3 * T2) - 1);
          ps.spawn(P.STREAK, Math.cos(a) * D0, CY5 + Math.sin(a) * D0, -Math.cos(a) * v, -Math.sin(a) * v, T2, R6.chance(0.5) ? C[7] : C[6]);
        }
        for (let g of G6)
          if (!g.popped && t >= g.t) {
            g.popped = !0, lights.push({ x: g.x, y: g.y, r: 14, k: 0.7, life: 0.2, max: 0.2 });
            for (let i = 0; i < 4; i++) ps.spawn(P.SPARK, g.x, g.y, R6.range(-60, 60), R6.range(-70, 20), R6.range(0.1, 0.25));
          }
        if (t >= FLARE && !flared) {
          flared = !0, lights.push({ x: 0, y: CY5, r: 96, k: 1.4, life: 0.45, max: 0.45 }, { x: 0, y: CY5, r: 44, k: 1, life: 0.14, max: 0.14 });
          for (let i = 0; i < 24; i++) {
            let a = R6.range(0, TAU), sp = R6.range(60, 130);
            ps.spawn(P.SPARK, Math.cos(a) * 13, CY5 + Math.sin(a) * 13, Math.cos(a) * sp, Math.sin(a) * sp - 30, R6.range(0.2, 0.45));
          }
        }
        if (t >= BREAK4 && !broke) {
          broke = !0;
          for (let i = 0; i < S.pts.length - 1; i += 7) {
            let q = S.pts[i], n = S.pts[i + 1], a = Math.atan2(n.y - q.y, n.x - q.x);
            bits.add({ kind: B.SHARD, x: q.x, y: q.y, vx: R6.range(-8, 8), vy: R6.range(-12, 6), g: R6.range(0.22, 0.45), drag: 0.6, bounce: 0.25, life: R6.range(0.8, 1.2), a, va: R6.range(-3, 3), s: R6.range(2.5, 3.5), c: R6.pick([C[7], C[6], C[6], C[5]]) }), i % 27 === 0 && embers.spawn(P.EMBER, q.x, q.y, R6.range(-10, 10), -R6.range(10, 40), R6.range(0.6, 1.1));
          }
          for (let g of G6) puffs.spawn(PK.SOOT, g.x, g.y, R6.range(-6, 6), -R6.range(8, 18), R6.range(0.7, 1.1), R6.range(3, 5));
          for (let i = 0; i < 8; i++) puffs.spawn(PK.SOOT, R6.range(-20, 20), CY5 + R6.range(-20, 20), R6.range(-8, 8), -R6.range(6, 16), R6.range(0.8, 1.2), R6.range(3, 6), R6.range(0, 0.15));
        }
        for (let i = lights.length - 1; i >= 0; i--) (lights[i].life -= dt) <= 0 && lights.splice(i, 1);
        bits.update(dt), ps.update(dt), embers.update(dt), puffs.update(dt);
      },
      drawBack(p) {
        puffs.draw(p, PK.SOOT, { x: 0, y: CY5, k: broke ? 0.3 : 0, reach: 50 });
        let k = t < BREAK4 ? smooth(0.1, 0.6, t) : 1 - smooth(BREAK4, BREAK4 + 0.6, t);
        k > 0 && p.glow(0, CY5, 52, C[4], 0.3 * k);
      },
      draw(p) {
        if (!broke) {
          let hold = t > S.end ? 0.5 + 0.5 * Math.sin((t - S.end) * 9) : 0, white = t >= FLARE;
          for (let q of S.pts) {
            if (q.t > t) break;
            let age = t - q.t;
            p.px(q.x, q.y, white ? WHITE : age < 0.05 ? WHITE : age < 0.15 ? C[7] : age < 0.35 || hold > 0.75 ? C[6] : C[5]);
          }
          if (white) for (let q of S.pts) (q.x * 2 | 0) % 3 === 0 && p.light(q.x, q.y, C[6], 0.5);
          for (let g of G6) {
            if (t < g.t) continue;
            let age = t - g.t, col = white || age < 0.06 ? WHITE : age < 0.2 || hold > 0.75 ? C[7] : C[6];
            for (let [a, b] of g.segs) p.line(g.x - 2 + a[0] * 2, g.y - 2 + a[1] * 2, g.x - 2 + b[0] * 2, g.y - 2 + b[1] * 2, col);
            age < 0.18 && ringFast(p, g.x, g.y, 2 + 4 * (age / 0.18), 1, age < 0.09 ? C[7] : C[5]), p.glow(g.x, g.y, 6, C[5], 0.25);
          }
          if (t > 0.12 && t < S.end + 0.05) {
            let q = pen();
            sparkle(p, q.x, q.y, 3 + Math.sin(t * 60), C[7], C[6], 0.6), p.glow(q.x, q.y, 16, C[6], 0.55);
          }
        }
        let fu = (t - FLARE) / 0.35, bu = (t - FLARE) / 0.22;
        bu > 0 && bu < 1 && sparkle(p, 0, CY5, 18 * (1 - bu), C[7], C[5], 0.9 * (1 - bu)), fu > 0 && fu < 1 && ringFast(p, 0, CY5, RO + 3 + 12 * ease.outCubic(fu), Math.max(1, 3 * (1 - fu)), fu < 0.4 ? WHITE : fu < 0.7 ? C[6] : C[4]), bits.draw(p), puffs.draw(p, PK.FLAME), ps.draw(p), embers.draw(p);
        for (let l of lights) {
          let q = l.life / l.max;
          p.glow(l.x, l.y, l.r * (0.6 + 0.4 * q), l.k > 1 ? C[5] : C[6], l.k * q * q);
        }
      }
    };
  }
  var meta63, CY5, RO, RI, RC, GLYPH, FLARE, BREAK4, init_hex_sigil = __esm({
    "src/fx/shadow/hex-sigil.js"() {
      init_core();
      init_lib7();
      meta63 = {
        name: "Hex sigil",
        desc: "A burning pen traces a cursed sigil in the air, its glyphs pop in one by one, then it flares white and crumbles into falling embers.",
        tags: ["shadow", "hex", "sigil", "rune", "curse", "magic", "circle", "one-shot"],
        size: [168, 128],
        origin: [84, 112],
        duration: 4.2,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: VOID, seed: 7 }
      }, CY5 = -50, RO = 28, RI = 22, RC = 6, GLYPH = 1.62, FLARE = 2.6, BREAK4 = 2.74;
    }
  });

  // src/fx/shadow/soul-drain.js
  var soul_drain_exports = {};
  __export(soul_drain_exports, {
    draw: () => draw25,
    drawBack: () => drawBack12,
    meta: () => meta64
  });
  function along4(L, u) {
    let v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
    return [a * L.sx + b * L.c1x + c * L.c2x, a * L.sy + b * L.c1y + c * L.c2y + d * (VY - L.sy) + d * L.sy];
  }
  function vessel(p, C, t, f) {
    let y0 = VY + Math.sin(TAU * t / D14) * 1.5, W4 = 9, UP5 = 14, DN = 12;
    return p.shade(-W4 - 1, y0 - UP5 - 1, W4 + 1, y0 + DN + 1, (x, y) => {
      let dy = y - y0, half = dy < 0 ? W4 * (1 + dy / UP5) : W4 * (1 - dy / DN);
      if (half <= 0 || Math.abs(x) > half + 0.6) return;
      if (Math.abs(x) > half - 0.4) return f > 0.5 ? C[6] : C[1];
      let ridge = Math.abs(x + dy * 0.12) < 0.6;
      return Math.abs(x) + Math.abs(dy - 1) < 2.6 + f * 1.5 ? f > 0.4 ? WHITE : C[6] : ridge ? f > 0.3 ? C[7] : C[5] : x < 0 ? dy < 0 ? f > 0.2 ? C[5] : C[4] : C[3] : dy < 0 ? C[2] : C[1];
    }), p.glow(0, y0, 30 + 14 * f, C[5], 0.5 + 0.5 * f), p.glow(0, y0 + 1, 8, WHITE, 0.25 + 0.6 * f), y0;
  }
  function drawBack12(p, t, o) {
    let C = fit(o.palette, 8);
    for (let i = 0; i < LINES; i++) {
      let L = LN[i], ph = wrap3(t + i * 0.37) / D14, px = null, py = null;
      for (let u = 0; u <= 1.0001; u += 0.01) {
        let [x, y] = along4(L, u), dash = ((u * 5 - ph * 10 + i * 0.3) % 1 + 1) % 1;
        px !== null && p.line(px, py, x, y, u > 0.6 ? C[3] : C[2], 0.4 + 0.6 * u), dash < 0.18 && p.px(x, y, u > 0.7 ? C[7] : u > 0.35 ? C[6] : C[5]), px = x, py = y;
      }
    }
    p.glow(10, VY, 40, C[4], 0.22);
  }
  function draw25(p, t, o) {
    let C = fit(o.palette, 8), S = fit(o.soul, 4), f = landings2(t);
    cycle(t, D14, 10, o.seed, (r) => r.range(0.8, 1.3), (age, Lf, r) => {
      let x = r.range(100, 150), y = r.range(-80, -20) - age * 18, u = age / Lf;
      p.dot(x, y, S[2], (1 - u) * 0.8), p.glow(x, y, 4, S[1], 0.2 * (1 - u));
    }), cycle(t, D14, 22, o.seed + 1, (r) => r.range(0.4, 0.7), (age, Lf, r) => {
      let L = LN[Math.floor(r.next() * LINES)], u0 = r.range(0.15, 0.5), q = u0 + (1 - u0) * Math.pow(age / Lf, 2.2), q2 = u0 + (1 - u0) * Math.pow(Math.max(0, age - 0.06) / Lf, 2.2), [x, y] = along4(L, q), [tx, ty] = along4(L, q2);
      p.line(tx, ty, x, y, (v) => v > 0.7 ? WHITE : v > 0.35 ? C[6] : C[4]), p.glow(x, y, 4, C[6], 0.35);
    });
    let y0 = vessel(p, C, t, f);
    for (let k = 0; k < 6; k++) {
      let a = TAU * (2 * t) / D14 + k * TAU / 6, ex = Math.cos(a) * 15, ey = Math.sin(a) * 5 - 2, z = Math.sin(a);
      p.px(ex, y0 + ey, z > 0 ? C[7] : C[4]), z > 0 && p.glow(ex, y0 + ey, 4, C[6], 0.35);
    }
    for (let j = 0; j < SOULS; j++) {
      let s = soul(j), age = wrap3(t - s.born);
      if (age > TRAVEL) continue;
      let L = LN[s.line], u = Math.pow(age / TRAVEL, 1.8), [x, y] = along4(L, u);
      if (age < 0.18) {
        let k = 1 - age / 0.18;
        ringFast(p, L.sx, L.sy, 3 + 9 * (1 - k), 1, k > 0.5 ? S[2] : S[1]), p.glow(L.sx, L.sy, 12, S[1], 0.5 * k);
      }
      for (let k = 14; k >= 1; k--) {
        let uu = Math.pow(Math.max(0, age - k * 0.03) / TRAVEL, 1.8), [tx, ty] = along4(L, uu), w = Math.sin(t * 12 + k * 0.8 + j) * k * 0.16, r = Math.max(0.5, 2.6 - k * 0.17);
        p.disc(tx, ty + w, r, k < 4 ? S[2] : k < 9 ? S[1] : C[5], 0.75 * (1 - k / 15));
      }
      let near2 = smooth(0.82, 1, u), hr = 3.4 - near2 * 1.6;
      p.circle(x, y, hr + 0.8, S[1]), p.circle(x, y, hr, S[2]), p.px(x - 1, y - 2, S[3]), p.px(x - 2, y - 1, S[3]), near2 < 0.5 && (p.px(x - 1.5, y, S[0]), p.px(x + 1.5, y, S[0]), p.px(x, y + 1.6, S[0]), p.px(x, y + 2.4, S[0])), p.glow(x, y, 10, S[1], 0.5);
    }
    for (let j = 0; j < SOULS; j++) {
      let since5 = wrap3(t - soul(j).born - TRAVEL);
      if (since5 < 0.3) {
        let k = since5 / 0.3;
        ringFast(p, 0, y0, 6 + 18 * ease.outCubic(k), Math.max(1, 2 * (1 - k)), k < 0.4 ? C[7] : k < 0.7 ? C[5] : C[3]);
      }
    }
    halo(p, 0, y0, 4, 22, C[6], 0.25 * f);
  }
  var meta64, VY, D14, LINES, SOULS, TRAVEL, wrap3, line, LN, soul, landings2, init_soul_drain = __esm({
    "src/fx/shadow/soul-drain.js"() {
      init_core();
      init_lib7();
      meta64 = {
        name: "Soul drain",
        desc: "Pale souls are torn loose on the right and dragged down a funnel of streaks into a black crystal vessel, which flares violet as each one lands.",
        tags: ["shadow", "soul", "drain", "necromancy", "funnel", "directional", "magic", "loop"],
        size: [208, 120],
        origin: [40, 110],
        duration: 3.2,
        loop: !0,
        fps: 30,
        bg: "ground",
        options: { palette: VOID, soul: ["#2c3f66", "#7d9fd0", "#cfe6ff", "#ffffff"], seed: 8 }
      }, VY = -50, D14 = 3.2, LINES = 11, SOULS = 4, TRAVEL = 1.45, wrap3 = (x) => (x % D14 + D14) % D14, line = (i) => {
        let sx = 96 + rand(i, 1) * 64, sy = -88 + rand(i, 2) * 72, bend2 = (rand(i, 3) - 0.5) * 50;
        return { sx, sy, c1x: sx * 0.55, c1y: sy + bend2, c2x: 22 + rand(i, 4) * 14, c2y: VY + (sy - VY) * 0.25 };
      }, LN = Array.from({ length: LINES }, (_, i) => line(i));
      soul = (j) => ({ born: (j + 0.15 + rand(j, 7) * 0.5) * (D14 / SOULS), line: Math.floor(rand(j, 8) * LINES) }), landings2 = (t) => {
        let f = 0;
        for (let j = 0; j < SOULS; j++) {
          let since5 = wrap3(t - soul(j).born - TRAVEL);
          f += Math.exp(-since5 / 0.14) * (since5 < 1 ? 1 : 0);
        }
        return Math.min(1.4, f);
      };
    }
  });

  // src/fx/shadow/dark-explosion.js
  var dark_explosion_exports = {};
  __export(dark_explosion_exports, {
    create: () => create40,
    meta: () => meta65
  });
  function sphere(p, C, r, t, heat2) {
    if (r < 0.6) return;
    let E2 = r + 12 * heat2 + 2;
    p.shade(-E2, Y - E2, E2, Y + E2, (x, y, out) => {
      let dx = x, dy = y - Y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > E2) return;
      if (d < r - 0.5) {
        let e2 = r - d, ang2 = Math.atan2(dy, dx);
        return e2 < 1.4 && Math.cos(ang2 - 0.8) > 0.55 ? C[2] : r > 8 && (dx + r * 0.45) ** 2 + (dy + r * 0.45) ** 2 < 1.6 ? C[3] : C[0];
      }
      let e = d - (r - 0.5);
      if (e < 1) {
        out.c = Math.sin(Math.atan2(dy, dx) * 7 + t * 9) > -0.6 ? WHITE : C[7], out.k = 0.4;
        return;
      }
      let ang = Math.atan2(dy + e * 0.6, dx), top = Math.max(0, -Math.sin(ang)), a1 = ang - t * 0.9, a2 = ang + t * 1.7, i1 = Math.round(a1 * 9 / TAU), i2 = Math.round(a2 * 15 / TAU), T1 = Math.pow(0.5 + 0.5 * Math.cos(a1 * 9), 3) * (0.55 + 0.45 * noise(t * 7 + i1 * 3.7, 1)), T2 = Math.pow(0.5 + 0.5 * Math.cos(a2 * 15), 4) * (0.5 + 0.5 * noise(t * 11 + i2 * 5.1, 2)), h = heat2 * (0.3 + 0.95 * top) * (1.5 + 12 * Math.max(0, T1) + 6 * Math.max(0, T2));
      if (e > h + 1) return;
      let u = (e - 1) / h;
      out.c = u < 0.18 ? WHITE : u < 0.4 ? C[7] : u < 0.62 ? C[6] : u < 0.84 ? C[5] : C[4], out.a = u < 0.8 ? 1 : (1 - u) * 5, u < 0.6 && (Math.floor(x) + Math.floor(y) & 1) === 0 && (out.k = 0.25 * (1 - u));
    });
  }
  function create40(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [WHITE, C[7], C[6], C[5]] }), embers = new Particles({ rng: R6, ground: floor, sparks: [C[7], C[6], C[5], C[4]] }), puffs = new Puffs({
      rng: R6,
      flame: [WHITE, C[7], C[6], C[5], C[5], C[4], C[4], C[3], C[2]],
      soot: [mix(mix(C[3], C[1], 0.3), SMOKE, 0.45), mix(C[1], SMOKE, 0.3)],
      cap: mix(mix(C[4], C[2], 0.5), SMOKE, 0.4),
      rim: [C[6], C[5], C[4]],
      floor
    }), bits = new Bits({ ground: floor }), lights = [], rings = [], t = 0, released = !1, collapsing = !1, popped = !1, acc = 0, dustAcc = 0, flick = 1, coreR = (tt) => tt < REL - 0.07 ? 1.5 + 5 * ease.inQuad(tt / REL) : 1, sphereR = (tt) => tt < REL ? 0 : tt < BURN ? RS * ease.outBack(clamp((tt - REL) / 0.14), 2.4) * (1 + 0.06 * smooth(REL + 0.3, BURN, tt) + 0.02 * Math.sin(tt * 11)) : tt < POP ? RS * 1.08 * (1 - ease.inQuad((tt - BURN) / (POP - BURN))) : 0, starL = (tt) => tt < REL || tt > REL + 0.26 ? 0 : 60 * (1 - ease.inQuad(clamp((tt - REL - 0.05) / 0.21))), starRot = (tt) => 0.32 + (tt - REL) * 2.2, burning = (tt) => tt < REL ? clamp(tt / REL) * 0.7 : tt < BURN ? 1 : tt < POP ? 1.2 : Math.max(0, 1 - (tt - POP) / 0.35), light = (x, y, r, c, k, life) => lights.push({ x, y, r, c, k, life, max: life }), rim = (a, r) => [Math.cos(a) * r, Y + Math.sin(a) * r];
    function release() {
      light(0, Y, 100, C[4], 1.25, 0.85), light(0, Y, 86, mix(C[6], WHITE, 0.5), 1.3, 0.22), rings.push({ r0: RS, r1: 104, life: 0.46, max: 0.46, th: 3.6, hot: !0, delay: 0 }), rings.push({ r0: RS * 0.8, r1: 62, life: 0.3, max: 0.3, th: 1.6, hot: !0, delay: 0.02 }), rings.push({ r0: RS, r1: 124, life: 0.62, max: 0.62, th: 1.2, hot: !1, delay: 0.07 });
      for (let i = 0; i < 34; i++) {
        let big = i < 20, a = R6.range(0, TAU), [x, y] = rim(a, RS * 0.7), sp = big ? R6.range(80, 170) : R6.range(130, 220);
        bits.add({ kind: B.SHARD, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - R6.range(40, 110), g: 0.75, drag: big ? 1.3 : 1.7, bounce: 0.35, life: R6.range(1.6, 2.6), a: R6.range(0, TAU), va: R6.range(-16, 16), s: big ? R6.range(6, 11) : R6.range(3, 4.5) });
      }
      for (let i = 0; i < 84; i++) {
        let a = R6.range(0, TAU), [x, y] = rim(a, RS * 0.8), sp = R6.range(120, 235);
        ps.spawn(P.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 50, R6.range(0.2, 0.7));
      }
      for (let i = 0; i < 28; i++) {
        let a = R6.range(0, TAU), [x, y] = rim(a, RS * 0.9), sp = R6.range(30, 130);
        embers.spawn(P.EMBER, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, R6.range(1.3, 2.5));
      }
      for (let i = 0; i < 24; i++) {
        let a = R6.range(0, TAU), [x, y] = rim(a, RS * 0.9), sp = R6.range(15, 70);
        puffs.spawn(PK.SOOT, x, y, Math.cos(a) * sp, Math.sin(a) * sp * 0.8 - 14, R6.range(2, 2.8), R6.range(7, 12), R6.range(0.02, 0.3));
      }
      for (let i = 0; i < 12; i++) {
        let s = i % 2 ? 1 : -1;
        puffs.spawn(PK.SOOT, s * R6.range(10, 40), -R6.range(2, 5), s * R6.range(50, 120), -R6.range(0, 10), R6.range(1.6, 2.4), R6.range(5, 9), R6.range(0.08, 0.2));
      }
      for (let i = 0; i < 10; i++) {
        let a = -Math.PI / 2 + R6.range(-1.6, 1.6), [x, y] = rim(a, RS), sp = R6.range(30, 80);
        puffs.spawn(PK.FLAME, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 30, R6.range(0.3, 0.6), R6.range(2, 3.6), 0, R6.chance(0.5));
      }
      ps.list.length = 0, puffs.list = puffs.list.filter((q) => q.delay > 0);
    }
    function pop() {
      light(0, Y, 56, WHITE, 0.9, 0.18), light(0, Y, 120, C[5], 0.8, 0.5), rings.push({ r0: 2, r1: 40, life: 0.28, max: 0.28, th: 2, hot: !0, delay: 0 });
      for (let i = 0; i < 26; i++) {
        let a = R6.range(0, TAU), sp = R6.range(120, 250);
        ps.spawn(P.SPARK, 0, Y, Math.cos(a) * sp, Math.sin(a) * sp - 40, R6.range(0.2, 0.6));
      }
      for (let i = 0; i < 14; i++) {
        let a = R6.range(0, TAU), sp = R6.range(20, 90);
        embers.spawn(P.EMBER, 0, Y, Math.cos(a) * sp, Math.sin(a) * sp - 30, R6.range(0.9, 1.6));
      }
      for (let i = 0; i < 10; i++) {
        let a = R6.range(0, TAU), sp = R6.range(20, 70);
        puffs.spawn(PK.SOOT, Math.cos(a) * 3, Y + Math.sin(a) * 3, Math.cos(a) * sp, Math.sin(a) * sp - 15, R6.range(1.1, 1.7), R6.range(3, 6), R6.range(0, 0.08));
      }
      for (let q of [...embers.list, ...puffs.list]) {
        let dx = q.x, dy = q.y - Y, d = Math.hypot(dx, dy) || 1, f = 90 * Math.max(0, 1 - d / 70);
        q.vx += dx / d * f, q.vy += dy / d * f - f * 0.3;
      }
      for (let i = 0; i < 12; i++)
        puffs.spawn(PK.SOOT, R6.range(-6, 6), Y + R6.range(-4, 6), R6.range(-10, 10), -R6.range(20, 55), R6.range(1.3, 1.8), R6.range(7, 12), R6.range(0.02, 0.2));
    }
    return {
      update(dt) {
        if (t += dt, flick = 0.88 + 0.12 * Math.sin(t * 37) * Math.sin(t * 23), t < REL - 0.06) {
          let k = t / REL;
          for (acc += dt * (90 + 150 * k); acc > 1; acc--) {
            let a = R6.range(0, TAU), D25 = R6.range(36, 84), x = Math.cos(a) * D25, y = Math.min(-3, Y + Math.sin(a) * D25), vt = R6.range(50, 110), vi = R6.range(10, 40);
            ps.spawn(P.MOTE, x, y, -Math.sin(a) * vt - Math.cos(a) * vi, Math.cos(a) * vt - Math.sin(a) * vi, 0.9, R6.pick([WHITE, C[6], C[6], C[5]]), R6.range(0.7, 1.2));
          }
          if (R6.chance(0.75)) {
            let a = R6.range(0, TAU), D25 = R6.range(28, 70), T2 = R6.range(0.18, 0.28), v = D25 * 3 / (Math.exp(3 * T2) - 1);
            ps.spawn(P.STREAK, Math.cos(a) * D25, Y + Math.sin(a) * D25, -Math.cos(a) * v, -Math.sin(a) * v, T2, R6.chance(0.5) ? C[7] : C[6]);
          }
          if (t < REL - 0.2 && R6.chance(0.16)) {
            let a = R6.range(0, TAU), D25 = R6.range(34, 60);
            puffs.spawn(PK.SOOT, Math.cos(a) * D25, Y + Math.sin(a) * D25, -Math.sin(a) * 40, Math.cos(a) * 40, R6.range(0.6, 0.9), R6.range(3, 6));
          }
          attract(ps.list, 0, Y, 22e5 * (0.3 + k), 110, 0.55, 2.5, dt, (q) => q.k === P.MOTE ? 1 : 0, 420), attract(puffs.list, 0, Y, 12e5 * (0.3 + k), 90, 0.7, 4, dt, () => 1, 160);
        }
        if (t >= REL && !released && (released = !0, release()), released && t < BURN) {
          let sr = sphereR(t);
          for (acc += dt * 34; acc > 1; acc--) {
            let a = -Math.PI / 2 + R6.gauss() * 1.1, [x, y] = rim(a, sr + 1), sp = R6.range(10, 35);
            puffs.spawn(PK.FLAME, x, y, Math.cos(a) * sp, Math.sin(a) * sp - R6.range(10, 30), R6.range(0.25, 0.45), R6.range(1.2, 2.2), 0, R6.chance(0.2));
          }
          if (R6.chance(dt * 10)) {
            let a = -Math.PI / 2 + R6.range(-1.4, 1.4), [x, y] = rim(a, sr * 0.9);
            puffs.spawn(PK.SOOT, x, y, Math.cos(a) * 20, -R6.range(15, 35), R6.range(1.2, 1.7), R6.range(5, 9));
          }
          if (R6.chance(dt * 8)) {
            let a = R6.range(0, TAU), [x, y] = rim(a, sr), sp = R6.range(110, 200);
            ps.spawn(P.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, R6.range(0.2, 0.5));
          }
          if (R6.chance(dt * 7)) {
            let a = -Math.PI / 2 + R6.range(-1.2, 1.2), [x, y] = rim(a, sr);
            embers.spawn(P.EMBER, x, y, Math.cos(a) * 30, -R6.range(20, 50), R6.range(0.9, 1.6));
          }
        }
        if (t >= BURN && !collapsing) {
          collapsing = !0;
          for (let i = 0; i < 14; i++) {
            let a = R6.range(0, TAU), D25 = R6.range(26, 48), T2 = R6.range(0.14, 0.2), v = D25 * 3 / (Math.exp(3 * T2) - 1);
            ps.spawn(P.STREAK, Math.cos(a) * D25, Y + Math.sin(a) * D25, -Math.cos(a) * v, -Math.sin(a) * v, T2, R6.chance(0.5) ? WHITE : C[6]);
          }
        }
        collapsing && !popped && attract(puffs.list, 0, Y, 14e5, 64, 0.6, 3, dt, (q) => q.k === PK.FLAME ? 1 : 0.35, 200), t >= POP && !popped && (popped = !0, pop());
        for (let r of rings) {
          if (r.delay > 0 || !r.hot || r.th < 3) continue;
          let rr = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(r.life / r.max, 3)), rf = rr > -Y ? Math.sqrt(rr * rr - Y * Y) : 0;
          if (rf > 0)
            for (dustAcc += dt * 60; dustAcc > 1; dustAcc--) {
              let s = R6.sign();
              ps.spawn(P.DUST, s * rf + R6.range(-2, 2), -R6.range(1, 3), s * R6.range(20, 50), -R6.range(4, 14), R6.range(0.4, 0.8), mix(C[2], C[3], R6.next()), R6.range(1.5, 3));
            }
        }
        for (let a of [lights, rings])
          for (let i = a.length - 1; i >= 0; i--) {
            let q = a[i];
            q.delay > 0 ? q.delay -= dt : (q.life -= dt) <= 0 && a.splice(i, 1);
          }
        bits.update(dt);
        for (let b of bits.list)
          b.rest && !b.flat && (b.flat = !0, b.a = Math.round(b.a / Math.PI) * Math.PI + R6.range(-0.2, 0.2), b.y = -1), b.life < 0.45 && !b.wisp && (b.wisp = !0, puffs.spawn(PK.SOOT, b.x, b.y - 1, R6.range(-4, 4), -R6.range(8, 16), R6.range(0.6, 0.9), R6.range(1.4, 2.4)));
        puffs.update(dt), ps.update(dt), embers.update(dt);
      },
      drawBack(p) {
        let k = burning(t);
        for (let r of rings) floorRing(p, C, r, !0);
        puffs.draw(p, PK.SOOT, { x: 0, y: Y, k: k * flick, reach: 84 }), ps.draw(p, "back"), k > 0 && p.glow(0, -3, 74, C[4], 0.24 * Math.min(1, k) * flick);
      },
      draw(p) {
        let sr = sphereR(t), k = burning(t), L = starL(t);
        for (let r of rings) floorRing(p, C, r, !1);
        let cr = 0;
        if (t < REL) {
          let q = t / REL, ring4 = 3 + 74 * (1 - ease.inQuad(q)), beat4 = 1 + 0.3 * Math.exp(-((t - REL * 0.5) ** 2) / 15e-4) + 0.4 * Math.exp(-((t - REL * 0.8) ** 2) / 15e-4);
          cr = coreR(t) * beat4, ringFast(p, 0, Y, ring4, 1, q > 0.7 ? C[6] : C[5], 0.2 + 0.7 * q), t > REL - 0.07 ? p.circle(0, Y, 1.6, WHITE) : sphere(p, C, cr, t, 0.3 + 0.3 * q), halo(p, 0, Y, cr, cr + 14 + 30 * q, C[5], (0.45 + 0.7 * q) * beat4), p.glow(0, Y, 60 + 30 * q, C[4], 0.12 + 0.3 * q);
        }
        let fu = (t - REL) / 0.12;
        if (fu >= 0 && fu < 1) {
          let r = 36 * (1 - 0.3 * fu);
          p.circle(0, Y, r + 1.5, C[5], 1.2 - fu), p.circle(0, Y, r, fu < 0.35 ? WHITE : C[6], 1.1 - fu), fu < 0.6 && p.circle(0, Y, r * 0.62, WHITE);
        }
        for (let r of rings) {
          if (r.delay > 0) continue;
          let q = r.life / r.max, rr = r.r0 + (r.r1 - r.r0) * (1 - q * q * q), th = Math.max(1, r.th * q + 0.4);
          ringFast(p, 0, Y, rr, th, (v) => r.hot ? v > 0.6 ? WHITE : v > 0.3 ? C[6] : C[5] : v > 0.5 ? C[5] : C[4], (v, g) => Y + Math.sin(g) * rr > 0.5 ? 0 : Math.min(1, q * 1.6)), r.hot && ringLight(p, 0, Y, rr, 4, C[5], 0.4 * q, (x, y) => y < 0.5);
        }
        sphere(p, C, sr, t, t < BURN ? 1 : 1 + 0.5 * clamp((t - BURN) / (POP - BURN)));
        let star3 = L > 0 ? blackStar(Y, L, starRot(t), 0.5, 0.4) : null;
        if (star3) {
          let age = t - REL, fr = age < 0.12 ? 36 * (1 - 0.3 * (age / 0.12)) + 1.5 : 0, cut2 = Math.max(fr, sr);
          star3.draw(p, C[0], age < 0.1 ? C[5] : C[4], (x, y) => x * x + (y - Y) ** 2 < cut2 * cut2);
        }
        puffs.draw(p, PK.FLAME);
        for (let b of bits.list) shard(p, b, C, 0, Y, Math.min(1, k) * 0.9);
        ps.draw(p, "front"), embers.draw(p, "front");
        let pu = (t - POP) / 0.2;
        pu >= 0 && pu < 1 && sparkle(p, 0, Y, 12 * (1 - pu), C[6], C[5], 0.7 * (1 - pu));
        for (let l of lights) {
          let q = l.life / l.max;
          p.glow(l.x, l.y, l.r * (0.55 + 0.45 * q), l.c, l.k * q * q);
        }
        sr > 1 && (halo(p, 0, Y, sr - 0.5, sr + 16, C[6], 0.5 * flick * Math.min(1, k)), p.glow(0, Y, sr + 54, C[4], 0.5 * flick * Math.min(1, k)));
        let B02 = Math.max(sr, cr) + 1;
        B02 > 2 && unlight(p, -B02, Y - B02, B02, Y + B02, (x, y) => x * x + (y - Y) ** 2 < (Math.max(sr, cr) - 0.5) ** 2), star3 && star3.unlight(p);
      }
    };
  }
  function floorRing(p, C, r, back) {
    if (r.delay > 0 || !r.hot || r.th < 3) return;
    let q = r.life / r.max, rr = r.r0 + (r.r1 - r.r0) * (1 - q * q * q);
    if (rr <= -Y) return;
    let rf = Math.sqrt(rr * rr - Y * Y);
    if (band(p, 0, 0.5, rf, 0.16, Math.max(1, 3 * q), Math.min(1, q * 1.5), [C[3], C[4], C[5], C[6]], (g) => Math.sin(g) < 0 === back), !back) for (let s of [-1, 1]) p.glow(s * rf, -2, 16, C[5], 0.4 * q);
  }
  var meta65, Y, RS, REL, BURN, POP, SMOKE, init_dark_explosion = __esm({
    "src/fx/shadow/dark-explosion.js"() {
      init_core();
      init_lib7();
      meta65 = {
        name: "Dark explosion",
        desc: "Motes swirl into a pulsing core, a black star cuts across a violet-white flash, and a black sphere burns at the rim, throws lit shards and smoke, then collapses.",
        tags: ["shadow", "explosion", "void", "dark", "magic", "impact", "one-shot"],
        size: [280, 248],
        origin: [140, 206],
        duration: 3.8,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: VOID, seed: 6 }
      }, Y = -54, RS = 16, REL = 0.52, BURN = 1.62, POP = 1.84, SMOKE = hex("#5d5468");
    }
  });

  // src/fx/shadow/necro-skulls.js
  var necro_skulls_exports = {};
  __export(necro_skulls_exports, {
    draw: () => draw26,
    drawBack: () => drawBack13,
    meta: () => meta66
  });
  function skullAt(i, t) {
    let a = TAU * t / D15 + i * TAU / N4, ex = Math.cos(a) * RX4, ey = Math.sin(a) * RY2, bob = Math.sin(TAU * 2 * t / D15 + i * 1.7) * 2;
    return { x: ex * Math.cos(TILT3) - ey * Math.sin(TILT3), y: CY6 + ex * Math.sin(TILT3) + ey * Math.cos(TILT3) + bob, z: Math.sin(a), a };
  }
  function tail(p, C, i, t) {
    for (let k = 8; k >= 1; k--) {
      let tt = t - k * 0.05, s = skullAt(i, tt), age = k / 8, r = 2 + age * 3.6, a = (1 - age) * 0.5 * (0.6 + 0.4 * (s.z + 1) / 2);
      p.disc(s.x, s.y - age * 7 + 2, r, age < 0.4 ? C[5] : age < 0.7 ? C[4] : C[3], a);
    }
  }
  function drawSkull(p, C, K2, s, t, i) {
    let front = s.z >= 0, depth = 0.55 + 0.45 * (s.z + 1) / 2, PAL3 = front ? { k: K2[0], d: K2[1], m: K2[2], l: K2[3], h: K2[4], e: C[0], n: C[0], t: K2[3], g: K2[0] } : { k: K2[0], d: K2[0], m: K2[1], l: K2[2], h: K2[3], e: C[0], n: C[0], t: K2[2], g: K2[0] }, x0 = Math.round(s.x) - 5, y0 = Math.round(s.y) - 6;
    p.sprite(SKULL2, PAL3, x0, y0);
    let k = (0.5 + 0.5 * Math.sin(TAU * 3 * t / D15 + i * 2.1)) * 0.5 + 0.5;
    for (let ex of [3, 7])
      p.px(x0 + ex + 0.5, y0 + 5.5, front ? k > 0.75 ? WHITE : C[7] : C[6]), front && p.px(x0 + ex + 0.5, y0 + 4.5, C[5]), p.glow(x0 + ex + 1, y0 + 6, 6, C[5], 0.45 * depth * k);
    p.glow(s.x, s.y, 11, C[4], 0.18 * depth);
  }
  function flame(p, C, t) {
    let scroll = t / D15;
    p.shade(-14, FB - FH - 4, 14, FB + 2, (x, y, out) => {
      let u = (FB - y) / FH;
      if (u < -0.04 || u >= 1) return;
      let n1 = tileNoise(x * 0.3, y * 0.2 + scroll * 8, 0, 8, 3), n2 = tileNoise(x * 0.6, y * 0.45 + scroll * 16, 0, 16, 5), w = 10 * (u < 0.22 ? 0.35 + 0.65 * Math.sqrt(Math.max(0, u) / 0.22) : Math.pow(1 - (u - 0.22) / 0.78, 0.85)) * (1 + 0.3 * n1) + n2 * 2.2 * u, sway = n1 * 3 * u * u, d = Math.abs(x - sway) / Math.max(0.6, w);
      if (d > 1) return;
      let heat2 = Math.pow(1 - d, 0.7) * Math.pow(Math.max(0, 1 - u), 0.55) + n2 * 0.12;
      return (Math.floor(x) + Math.floor(y) & 1) === 0 && (out.k = 0.16 * heat2), heat2 > 0.82 ? WHITE : heat2 > 0.66 ? C[7] : heat2 > 0.46 ? C[6] : heat2 > 0.27 ? C[5] : heat2 > 0.12 ? C[4] : C[3];
    }), p.glow(0, FB - FH * 0.35, 40, C[5], 0.45), p.glow(0, FB - 5, 12, C[7], 0.25);
  }
  function drawBack13(p, t, o) {
    let C = fit(o.palette, 8), K2 = fit(o.bone, 5);
    p.glow(0, -1, 40, C[4], 0.2);
    let order = Array.from({ length: N4 }, (_, i) => [i, skullAt(i, t)]).filter(([, s]) => s.z < 0).sort((a, b) => a[1].z - b[1].z);
    for (let [i] of order) tail(p, C, i, t);
    for (let [i, s] of order) drawSkull(p, C, K2, s, t, i);
  }
  function draw26(p, t, o) {
    let C = fit(o.palette, 8), K2 = fit(o.bone, 5), S = o.seed;
    cycle(t, D15, 18, S, (r) => r.range(0.8, 1.4), (age, L, r) => {
      let x0 = r.range(-6, 6), u = age / L, x = x0 + Math.sin(u * 5 + r.range(0, 6)) * 3 * u, y = FB - 6 - u * r.range(36, 56);
      p.dot(x, y, u < 0.5 ? C[7] : C[6], u < 0.7 ? 1 : (1 - u) * 3.3), p.glow(x, y, 3, C[6], 0.3 * (1 - u));
    }), flame(p, C, t);
    let order = Array.from({ length: N4 }, (_, i) => [i, skullAt(i, t)]).filter(([, s]) => s.z >= 0).sort((a, b) => a[1].z - b[1].z);
    for (let [i] of order) tail(p, C, i, t);
    for (let [i, s] of order) drawSkull(p, C, K2, s, t, i);
    halo(p, 0, CY6, 0, 46, C[4], 0.12);
  }
  var meta66, CY6, FB, FH, RX4, RY2, TILT3, D15, N4, SKULL2, init_necro_skulls = __esm({
    "src/fx/shadow/necro-skulls.js"() {
      init_core();
      init_lib7();
      meta66 = {
        name: "Necro skulls",
        desc: "Spectral skulls circle a cold green flame on a tilted orbit, passing behind and before it, eyes lit, trailing curls of ghost smoke.",
        tags: ["shadow", "necromancy", "skull", "orbit", "ghost", "spectral", "magic", "loop"],
        size: [136, 116],
        origin: [68, 108],
        duration: 3,
        loop: !0,
        fps: 30,
        bg: "ground",
        options: {
          palette: ["#040e10", "#0a2228", "#0f3d44", "#16615f", "#23907f", "#45c4a0", "#9af0c8", "#e8fff4"],
          bone: ["#0c1a1c", "#2c4a4a", "#5c847c", "#a6cdb8", "#e4fff0"],
          seed: 6
        }
      }, CY6 = -52, FB = -32, FH = 34, RX4 = 42, RY2 = 11, TILT3 = -0.12, D15 = 3, N4 = 5, SKULL2 = [
        "...kkkkk...",
        ".kkhhhllkk.",
        "khhhhlllmmk",
        "khhllllllmk",
        "kleeeleeemk",
        "kleeeleeedk",
        "kmleelleedk",
        ".kmllnllmk.",
        ".kmmlnlmdk.",
        "..kmmmmmk..",
        "..ktgtgtk..",
        "...kkkkk..."
      ];
    }
  });

  // src/fx/shadow/eclipse.js
  var eclipse_exports = {};
  __export(eclipse_exports, {
    draw: () => draw27,
    drawBack: () => drawBack14,
    meta: () => meta67
  });
  function drawBack14(p, t, o) {
    let C = fit(o.palette, 8), Q = fit(o.pearl, 4), S = o.seed;
    cycle(t, D16, 26, S, (r) => r.range(1.2, 2.6), (age, L, r) => {
      let x = r.range(-78, 78), y = r.range(-70, 70);
      if (Math.hypot(x, y) < R + 22) return;
      let k = Math.sin(Math.PI * age / L);
      p.dot(x, y, k > 0.7 ? WHITE : Q[1], k * 1.2), k > 0.85 && r.next() < 0.4 && (p.dot(x - 1, y, Q[0], 0.8), p.dot(x + 1, y, Q[0], 0.8));
    });
    let b = 1 + 0.08 * breathe(t, 1, 0);
    p.glow(0, 0, 72 * b, C[4], 0.38), p.glow(0, 0, 46 * b, Q[1], 0.34);
    for (let s of STREAMS) {
      let L = s.len * (1 + 0.18 * breathe(t, s.k, s.ph));
      for (let d = 4; d <= L; d += 0.5) {
        let u = d / L, a = s.a + s.curl * d * d, r = R + 1 + d, x = Math.cos(a) * r, y = Math.sin(a) * r;
        p.dot(x, y, u < 0.3 ? Q[2] : u < 0.65 ? Q[1] : C[5], u < 0.75 ? 1 : (1 - u) * 4);
      }
      p.glowLine(Math.cos(s.a) * (R + 4), Math.sin(s.a) * (R + 4), Math.cos(s.a) * (R + L * 0.6), Math.sin(s.a) * (R + L * 0.6), 3, Q[1], 0.12);
    }
  }
  function draw27(p, t, o) {
    let C = fit(o.palette, 8), Q = fit(o.pearl, 4), b = 1 + 0.08 * breathe(t, 1, 0), W4 = R + 10;
    p.shade(-W4, -W4, W4, W4, (x, y, out) => {
      let r = Math.sqrt(x * x + y * y);
      if (r < R - 0.5 || r > R + 9 * b) return;
      let a = Math.atan2(y, x), e = (r - R) / (9 * b), streak = 0.55 + 0.3 * Math.cos(a * 23 + Math.sin(a * 5) * 2) + 0.15 * Math.cos(a * 41 - TAU * t / D16), I = (1 - e) ** 2.2 * streak * (0.75 + 0.4 * Math.abs(Math.cos(a)));
      if (r < R + 0.9) return Q[3];
      if (!(I < 0.1))
        return I > 0.45 && (Math.floor(x) + Math.floor(y) & 1) === 0 && (out.k = 0.2 * I), I > 0.72 ? Q[2] : I > 0.42 ? Q[1] : I > 0.22 ? C[5] : C[4];
    }), p.shade(-R, -R, R, R, (x, y) => {
      let r = Math.sqrt(x * x + y * y);
      if (!(r >= R - 0.5))
        return r > R - 2.2 && x < -R * 0.45 ? C[1] : C[0];
    });
    let bx = Math.cos(BEAD) * (R + 0.4), by = Math.sin(BEAD) * (R + 0.4), k = 0.75 + 0.25 * breathe(t, 2, 1);
    for (let i = 0; i < 8; i++) {
      let a = i * Math.PI / 4 + 0.12, len2 = (i % 2 ? 7 : 22) * k * (i === 1 || i === 5 ? 1.6 : 1);
      for (let d = 1; d <= len2; d += 0.5) {
        let u = d / len2, x = bx + Math.cos(a) * d, y = by + Math.sin(a) * d;
        if (x * x + y * y < (R - 0.5) ** 2) break;
        p.dot(x, y, u < 0.35 ? WHITE : u < 0.7 ? Q[2] : Q[1], u < 0.5 ? 1 : (1 - u) * 2.2);
      }
    }
    p.circle(bx, by, 3 * k, Q[2]), p.circle(bx, by, 2.2 * k, Q[3]), p.circle(bx, by, 1.4, WHITE), p.glow(bx, by, 46 * k, Q[2], 0.8 * k), p.glow(bx, by, 14, WHITE, 0.8), halo(p, 0, 0, R - 0.5, R + 16, Q[2], 0.35 * b), unlight(p, -R, -R, R, R, (x, y) => x * x + y * y < (R - 0.6) ** 2);
  }
  var meta67, R, D16, BEAD, breathe, STREAMS, init_eclipse = __esm({
    "src/fx/shadow/eclipse.js"() {
      init_core();
      init_lib7();
      meta67 = {
        name: "Eclipse",
        desc: "A black moon over the sun: a breathing pearl corona with long streamers, a thin white rim, and one diamond bead blazing on its edge.",
        tags: ["shadow", "eclipse", "moon", "sun", "corona", "sky", "magic", "loop"],
        size: [160, 144],
        origin: [80, 72],
        duration: 4,
        loop: !0,
        fps: 30,
        bg: "sky",
        options: { palette: VOID, pearl: ["#5a4f8a", "#a99be0", "#e6defa", "#fffaf2"], seed: 3 }
      }, R = 19, D16 = 4, BEAD = -0.72, breathe = (t, k, ph) => Math.sin(TAU * k * t / D16 + ph), STREAMS = Array.from({ length: 30 }, (_, i) => {
        let side = i % 2 ? 0 : Math.PI, spread = (rand(i, 1) - 0.5) * (rand(i, 2) < 0.7 ? 1.3 : 3.1), a = side + spread, eq = Math.abs(Math.cos(a));
        return { a, len: (10 + rand(i, 3) * 28) * (0.45 + 0.75 * eq), curl: (rand(i, 4) - 0.5) * 18e-5, k: 1 + i % 3, ph: rand(i, 5) * TAU, w: rand(i, 6) };
      });
    }
  });

  // src/fx/shadow/life-steal.js
  var life_steal_exports = {};
  __export(life_steal_exports, {
    act: () => act23,
    create: () => create41,
    meta: () => meta68
  });
  function create41(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), A = o.actor, floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [WHITE, C[7], C[6], C[5]] }), drops = new Drops({ onLand: (x) => stains.push({ x, t0: t }) }), stains = [], lights = [], orbs = [];
    for (let i = 0; i < N5; i++) {
      let a = -Math.PI / 2 + (i - (N5 - 1) / 2) * 0.4 + R6.range(-0.12, 0.12), sp = R6.range(100, 170);
      orbs.push({ x: TX, y: TY, vx: Math.cos(a) * sp + 10, vy: Math.sin(a) * sp, home: 0.36 + i * 0.05 + R6.range(0, 0.04), trail: [], done: !1, at: 0, size: R6.range(1.6, 2.4) });
    }
    let t = 0, hit = !1, flush2 = 0, light = (x, y, r, c, k, life) => lights.push({ x, y, r, c, k, life, max: life });
    return {
      update(dt) {
        if (t += dt, !hit) {
          hit = !0, light(TX, TY, 54, C[5], 1, 0.35), light(TX, TY, 18, WHITE, 1, 0.08);
          for (let i = 0; i < 14; i++) drops.add(TX + R6.range(-3, 3), TY + R6.range(-3, 3), R6.range(-40, 90), R6.range(-140, -20), R6.chance(0.4) ? 2 : 1);
          for (let i = 0; i < 12; i++) {
            let a = R6.range(0, TAU), sp = R6.range(80, 170);
            ps.spawn(P.SPARK, TX, TY, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.15, 0.35));
          }
        }
        for (let b of orbs)
          if (!b.done) {
            if (t < b.home)
              b.vx -= b.vx * 5 * dt, b.vy -= b.vy * 5 * dt;
            else {
              let dx = HX2 - b.x, dy = HY3 - b.y, d = Math.hypot(dx, dy) || 1, pull = 2600 * Math.min(1, (t - b.home) * 3);
              if (b.vx += dx / d * pull * dt, b.vy += dy / d * pull * dt, b.vx -= b.vx * 2.2 * dt, b.vy -= b.vy * 2.2 * dt, d < 6) {
                b.done = !0, b.at = t, flush2 = Math.min(1.5, flush2 + 0.45), light(HX2, HY3, 30, C[5], 0.8, 0.25);
                for (let i = 0; i < 6; i++) {
                  let a = R6.range(0, TAU), sp = R6.range(40, 100);
                  ps.spawn(P.SPARK, HX2, HY3, Math.cos(a) * sp, Math.sin(a) * sp - 20, R6.range(0.12, 0.3));
                }
                for (let i = 0; i < 3; i++) ps.spawn(P.EMBER, HX2 + R6.range(-8, 8), HY3 + R6.range(-6, 14), R6.range(-10, 10), -R6.range(15, 35), R6.range(0.6, 1.1), C[6]);
              }
            }
            b.x += b.vx * dt, b.y += b.vy * dt, b.trail.unshift([b.x, b.y]), b.trail.length > 26 && b.trail.pop();
          }
        flush2 -= flush2 * 2.6 * dt;
        for (let i = lights.length - 1; i >= 0; i--) (lights[i].life -= dt) <= 0 && lights.splice(i, 1);
        for (let i = stains.length - 1; i >= 0; i--) t - stains[i].t0 > 0.8 && stains.splice(i, 1);
        drops.update(dt), ps.update(dt);
      },
      drawBack(p) {
        let k = 1 - smooth(0.1, 0.9, t);
        k > 0 && (p.disc(TX, TY, 6 + t * 10, C[2], 0.5 * k), p.glow(TX, TY, 30, C[4], 0.35 * k));
        for (let s of stains) p.dot(s.x, -0.5, C[3], 1 - (t - s.t0) / 0.8);
      },
      draw(p) {
        let fk = Math.min(1, flush2) * (1 - smooth(1.5, 2.05, t));
        if (A && fk > 0.03) {
          for (let my = 0; my < A.h; my++)
            for (let mx = 0; mx < A.w; mx++) {
              let c0 = A.pixels[my * A.w + mx];
              if (!c0) continue;
              let l = luma(c0);
              p.blend(A.x + mx, A.y + my, l > 0.6 ? C[6] : l > 0.4 ? C[5] : l > 0.2 ? C[4] : C[3], 0.45 * fk);
            }
          fk > 0.12 && p.outline(A.mask, A.x, A.y, fk > 0.6 ? C[6] : fk > 0.3 ? C[5] : C[3]), p.glow(HX2, HY3, 28, C[5], 0.45 * fk);
        }
        t < 0.12 && sparkle(p, TX, TY, 10 * (1 - t / 0.12), C[7], C[5], 0.6);
        let ru = t / 0.28;
        ru < 1 && ringFast(p, TX, TY, 4 + 16 * ease.outCubic(ru), Math.max(1, 2 * (1 - ru)), ru < 0.4 ? C[7] : C[5]), drops.draw(p, C[3], C[6]);
        for (let b of orbs) {
          if (b.done && t - b.at > 0.2) continue;
          let n = b.done ? Math.floor(b.trail.length * (1 - (t - b.at) / 0.2)) : b.trail.length;
          for (let i = n - 1; i >= 1; i--) {
            let u = i / 25, [x0, y0] = b.trail[i - 1], [x1, y1] = b.trail[i];
            p.line(x1, y1, x0, y0, u < 0.15 ? C[7] : u < 0.35 ? C[6] : u < 0.6 ? C[5] : u < 0.8 ? C[4] : C[2]), i < 7 && p.disc(x1, y1, (b.size + 0.4) * (1 - i / 7), u < 0.12 ? C[6] : C[5], 0.8), i % 6 === 3 && p.glow(x1, y1, 6, C[5], 0.2 * (1 - u));
          }
          if (b.done) continue;
          let pulse2 = t < b.home ? 0.8 + 0.2 * Math.sin(t * 30 + b.size * 9) : 1;
          p.circle(b.x, b.y, b.size + 0.9, C[4]), p.circle(b.x, b.y, b.size * pulse2, C[6]), p.px(b.x - 0.5, b.y - 0.5, WHITE), p.glow(b.x, b.y, 9, C[5], 0.5);
        }
        ps.draw(p);
        for (let l of lights) {
          let q = l.life / l.max;
          p.glow(l.x, l.y, l.r * (0.6 + 0.4 * q), l.c, l.k * q * q);
        }
      }
    };
  }
  var meta68, GRASP, FED, act23, TX, TY, HX2, HY3, N5, init_life_steal = __esm({
    "src/fx/shadow/life-steal.js"() {
      init_core();
      init_lib7();
      meta68 = {
        name: "Life steal",
        desc: "A target on the right is struck and bleeds red orbs; they hang a moment, then whip home as comet streaks and flood the caster crimson.",
        tags: ["shadow", "life-steal", "drain", "blood", "heal", "directional", "magic", "one-shot"],
        size: [184, 100],
        origin: [36, 92],
        duration: 2.2,
        loop: !1,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: { palette: ["#14040a", "#3a0a14", "#6a101c", "#a01824", "#d42a30", "#ff5a50", "#ff9a8a", "#ffe6de"], dark: "#2a1040", seed: 11 }
      }, GRASP = { ...READY, crouch: 3, lean: 3, fx: 17, fy: -28, bx: -6, by: -21, ffx: 10, fbx: -9 }, FED = { turn: 1.15, crouch: 0, lean: -3, hy: -1, fx: -13, fy: -37, bx: 14, by: -37, ffx: -3, fbx: 4 }, act23 = {
        onBody: !0,
        follow: 0,
        target: { x: 104 },
        poses: [
          [-0.46, READY],
          [-0.2, { ...READY, crouch: 4, lean: -2, fx: 3, fy: -27, bx: 8, by: -20 }],
          [0, GRASP, "snap"],
          [0.4, GRASP],
          [0.7, { ...GRASP, fx: 13, fy: -26, lean: 1 }],
          [0.8, { ...FED, crouch: 2 }, "snap"],
          [1.22, FED],
          [1.7, { turn: 1, crouch: 2, fx: -11, fy: -26, bx: 12, by: -26, ffx: -3, fbx: 4 }],
          [2.2, READY]
        ],
        hits: [
          { t: 0.01, stop: 0.07, shake: 0.12, amp: 1, push: 1.6, straw: 12, skin: "red", y: -24 },
          { t: 1.6, push: 0, straw: 0, flash: 0, skin: null }
        ]
      }, TX = 104, TY = -24, HX2 = 1, HY3 = -20, N5 = 7;
    }
  });

  // src/fx/shadow/grasping-hands.js
  var grasping_hands_exports = {};
  __export(grasping_hands_exports, {
    create: () => create42,
    meta: () => meta69
  });
  function arm(A, t) {
    let e = clamp((t - A.t0) / 0.22), d = clamp((t - A.td) / 0.34);
    if (e <= 0 || d >= 1) return null;
    let rise = ease.outBack(e, 1.6) * (1 - ease.inQuad(d)), hidden = (1 - rise) * A.L, grip = gripOf(A, t), strain = t > A.t0 + 0.5 && t < A.td ? Math.sin(t * 47 + A.ph) * 0.03 : 0, elbow = A.bend * (0.3 + 0.7 * grip) * (1 - d) + strain, lean = A.lean + 0.06 * Math.sin(t * 2.2 + A.ph) + d * A.lean * 0.6, th = -Math.PI / 2 + lean, x = A.x - Math.cos(th) * hidden, y = A.y - Math.sin(th) * hidden, pts = [], n = Math.ceil(A.L / 0.5);
    for (let i = 0; i <= n; i++) {
      let s = i * 0.5, u = s / A.L;
      pts.push({ x, y, th, w: A.W * (1 - 0.5 * u) + 0.4, u }), th += 0.5 * (elbow * Math.exp(-(((u - 0.52) / 0.07) ** 2)) / (0.07 * Math.sqrt(Math.PI) * A.L) + A.curve / A.L), x += Math.cos(th) * 0.5, y += Math.sin(th) * 0.5;
    }
    return pts;
  }
  function gripOf(A, t) {
    let shut2 = ease.outBack(clamp((t - A.t0 - 0.3) / 0.12), 2.2), splay = smooth(A.td, A.td + 0.12, t);
    return shut2 * (1 - splay) - 0.35 * splay;
  }
  function drawArm(p, A, pts, C) {
    let surf2 = A.y;
    for (let q of pts) {
      if (q.y > surf2) continue;
      let nx = -Math.sin(q.th), ny = Math.cos(q.th), ks = nx * LX3 + ny * LY3 >= 0 ? 1 : -1;
      for (let v = -q.w; v <= q.w; v += 0.5) {
        let x = q.x + nx * v, y = q.y + ny * v, u = v / q.w * ks;
        y <= surf2 && p.px(x, y, u > 0.55 ? C[2] : u > -0.45 ? C[1] : C[0]);
      }
    }
    for (let q of pts) {
      if (q.y > surf2) continue;
      let nx = -Math.sin(q.th), ny = Math.cos(q.th), f = nx * LX3 + ny * LY3, ks = f >= 0 ? 1 : -1, l = ks * q.w;
      q.y - ny * l <= surf2 && p.px(q.x - nx * l, q.y - ny * l, C[3]), q.y + ny * l <= surf2 && p.px(q.x + nx * l, q.y + ny * l, Math.abs(f) > 0.8 ? C[7] : C[6]);
    }
    let base = pts.find((q) => q.y <= surf2);
    base && p.line(base.x - base.w - 1.5, surf2, base.x + base.w + 1.5, surf2, C[5]);
  }
  function drawHand(p, A, pts, C, t) {
    let tip = pts[pts.length - 1];
    if (tip.y > A.y - 2) return;
    let th = tip.th, dx = Math.cos(th), dy = Math.sin(th), nx = -dy, ny = dx, g = gripOf(A, t), side = A.curl, cx = tip.x + dx * 2.6, cy = tip.y + dy * 2.6;
    p.shade(cx - 5, cy - 5, cx + 5, cy + 5, (x, y) => {
      let a = (x - cx) * dx + (y - cy) * dy, b = (x - cx) * nx + (y - cy) * ny, d = (a / 3) ** 2 + (b / 2.7) ** 2;
      if (!(d > 1.25))
        return d > 1 ? b * side < 0 ? C[6] : C[3] : b * side < -1 ? C[2] : C[1];
    });
    let bone = (x0, y0, ang, len2, last) => {
      let x1 = x0 + Math.cos(ang) * len2, y1 = y0 + Math.sin(ang) * len2, ox = Math.round(-Math.sin(ang) * side * -1), oy = Math.round(Math.cos(ang) * side * -1);
      return p.line(x0, y0, x1, y1, C[1]), p.line(x0 + ox, y0 + oy, x1 + ox, y1 + oy, C[5]), last && (p.px(x1, y1, WHITE), p.px(x1 + Math.cos(ang), y1 + Math.sin(ang), C[7])), [x1, y1];
    }, spread = 1 - 0.65 * Math.max(0, g), curl = g * 1.2;
    [-2.2, -0.75, 0.75, 2.2].forEach((o, i) => {
      let bx = cx + dx * 2.6 + nx * o * 0.9, by = cy + dy * 2.6 + ny * o * 0.9, len2 = i === 0 || i === 3 ? 2.6 : 3.2, a0 = th + o * 0.2 * spread, [jx2, jy2] = bone(bx, by, a0 + curl * side * 0.6, len2, !1);
      bone(jx2, jy2, a0 + curl * side * 1.5, len2 * 0.85, !0);
    });
    let [jx, jy] = bone(cx - nx * side * 2.4, cy - ny * side * 2.4, th - side * (1 - 0.6 * g), 2.4, !1);
    bone(jx, jy, th - side * (0.6 - 1.4 * g), 2, !0), p.glow(cx, cy, 8, C[5], 0.18 + 0.3 * Math.max(0, g));
  }
  function create42(o) {
    let C = fit(o.palette, 8), DIM = [C[0], C[0], C[1], C[1], C[3], C[4], C[5], C[6]], R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[4] }), puffs = new Puffs({ rng: R6, flame: [C[7], C[6], C[5], C[4], C[3], C[2], C[1], C[1], C[0]], soot: [mix(C[3], C[2], 0.55), mix(C[2], C[1], 0.5)], cap: mix(C[4], C[2], 0.5), rim: [C[6], C[5], C[4]], floor }), ripples = [], splats = [], lights = [], t = 0, acc = 0, rx = (tt) => RX5 * ease.outCubic(clamp(tt / OPEN4)) * (1 - ease.inCubic(clamp((tt - SHUT2) / 0.45))), drops = new Drops({ onLand: (x, y, v, s) => Math.abs(x) < rx(t) * 0.95 ? ripples.push({ x, t0: t, life: 0.5, w: 0.6 }) : splats.push({ x, t0: t, s }) }), arms = [[-20, -2.5, 1], [17, -2.5, -1], [-30, 2.5, 1], [28, 2.5, -1]].map(([x, y, toward], i) => ({
      x: x + R6.range(-3, 3),
      y,
      back: y < 0,
      L: y < 0 ? R6.range(44, 52) : R6.range(36, 44),
      W: y < 0 ? R6.range(3.2, 3.8) : R6.range(3.6, 4.2),
      lean: -toward * R6.range(0.16, 0.3),
      bend: toward * R6.range(0.35, 0.6),
      curve: toward * R6.range(0.05, 0.15),
      curl: toward,
      t0: 0.3 + [1, 3, 0, 2][i] * 0.06 + R6.range(0, 0.03),
      td: 1.45 + [2, 0, 3, 1][i] * 0.09 + R6.range(0, 0.05),
      ph: R6.range(0, TAU),
      up: !1,
      shut: !1,
      down: !1
    }));
    function splash(x, y, n, k) {
      for (let i = 0; i < n; i++) drops.add(x + R6.range(-2, 2), y - 1, R6.range(-70, 70) * k, -R6.range(90, 220) * k, R6.chance(0.4) ? 2 : 1);
      ripples.push({ x, t0: t, life: 0.7, w: 1 }), lights.push({ x, y: y - 7, r: 30, k: 0.55 * k, life: 0.25, max: 0.25 });
    }
    return {
      update(dt) {
        t += dt;
        for (let A of arms) {
          if (!A.up && t >= A.t0 && (A.up = !0, splash(A.x, A.y, 12, 1)), !A.shut && t >= A.t0 + 0.36) {
            A.shut = !0;
            let pts = arm(A, t);
            if (pts) {
              let q = pts[pts.length - 1];
              lights.push({ x: q.x, y: q.y, r: 22, k: 0.7, life: 0.2, max: 0.2 }), A.snap = { x: q.x + Math.cos(q.th) * 4, y: q.y + Math.sin(q.th) * 4, t0: t };
              for (let i = 0; i < 6; i++) {
                let a = R6.range(0, TAU), sp = R6.range(60, 130);
                ps.spawn(P.SPARK, A.snap.x, A.snap.y, Math.cos(a) * sp, Math.sin(a) * sp - 20, R6.range(0.12, 0.3));
              }
              puffs.spawn(PK.SOOT, A.snap.x, A.snap.y, 0, -12, 0.6, 3.5);
            }
          }
          !A.down && t >= A.td + 0.28 && (A.down = !0, splash(A.x, A.y, 8, 0.7));
        }
        let r = rx(t);
        if (r > 8 && t < SHUT2 - 0.4) {
          for (acc += dt * 8; acc > 1; acc--) puffs.spawn(PK.SOOT, R6.range(-0.8, 0.8) * r, -R6.range(1, 4), R6.range(-8, 8), -R6.range(14, 28), R6.range(0.6, 0.85), R6.range(3, 6));
          R6.chance(dt * 12) && ps.spawn(P.MOTE, R6.range(-0.8, 0.8) * r, -2, R6.range(-8, 8), -R6.range(30, 70), R6.range(0.5, 0.9), R6.pick([C[7], C[6], C[5]]), R6.range(0.6, 1)), R6.chance(dt * 6) && ps.spawn(P.VAPOUR, R6.range(-0.7, 0.7) * r, -R6.range(2, 8), R6.range(-6, 6), -R6.range(10, 22), R6.range(0.6, 0.9), R6.chance(0.5) ? C[3] : C[4], R6.range(3, 6)), R6.chance(dt * 3) && ripples.push({ x: R6.range(-0.7, 0.7) * r, t0: t, life: 0.6, w: 0.5 });
        }
        for (let a of [ripples, splats]) for (let i = a.length - 1; i >= 0; i--) t - a[i].t0 > (a[i].life ?? 0.6) && a.splice(i, 1);
        for (let i = lights.length - 1; i >= 0; i--) (lights[i].life -= dt) <= 0 && lights.splice(i, 1);
        drops.update(dt), puffs.update(dt), ps.update(dt);
      },
      drawBack(p) {
        let r = rx(t), k = r / RX5;
        floorPool(p, C, r, t, ripples), k > 0 && (p.glow(0, -16, 80, C[4], 0.2 * k), p.glow(0, -8, r * 1.7 + 12, C[4], 0.3 * k), p.glow(0, 0, r * 1.15, C[5], 0.16 * k)), puffs.draw(p, PK.SOOT, { x: 0, y: 6, k, reach: 70 }), ps.draw(p, "back");
        for (let A of arms) if (A.back) {
          let pts = arm(A, t);
          pts && (drawArm(p, A, pts, DIM), drawHand(p, A, pts, DIM, t));
        }
      },
      draw(p) {
        for (let A of arms) if (!A.back) {
          let pts = arm(A, t);
          pts && (drawArm(p, A, pts, C), drawHand(p, A, pts, C, t));
        }
        for (let A of arms) if (A.snap && t - A.snap.t0 < 0.22) {
          let u = (t - A.snap.t0) / 0.22;
          ringFast(p, A.snap.x, A.snap.y, 2 + 5 * ease.outCubic(u), 1, u < 0.4 ? C[6] : u < 0.7 ? C[5] : C[3]);
        }
        drops.draw(p, C[1], C[5]);
        for (let s of splats) {
          let a = 1 - (t - s.t0) / 0.6;
          p.dot(s.x, -0.5, C[1], a * 1.5), p.dot(s.x + 1, -0.5, C[2], a), p.dot(s.x, -1.5, C[5], a);
        }
        ps.draw(p, "front");
        for (let l of lights) {
          let q = l.life / l.max;
          p.glow(l.x, l.y, l.r * (0.6 + 0.4 * q), C[5], l.k * q * q);
        }
      }
    };
  }
  var meta69, RX5, OPEN4, SHUT2, LX3, LY3, init_grasping_hands = __esm({
    "src/fx/shadow/grasping-hands.js"() {
      init_core();
      init_lib7();
      meta69 = {
        name: "Grasping hands",
        desc: "Shadow arms burst up out of a dark pool with a splash, clench their hands into claws, strain, and are dragged back under, fingers clawing at the air.",
        tags: ["shadow", "hands", "arms", "grab", "ground", "dark", "magic", "one-shot"],
        size: [200, 116],
        origin: [100, 100],
        duration: 3.1,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: VOID, seed: 5 }
      }, RX5 = 42, OPEN4 = 0.32, SHUT2 = 2.35, LX3 = -0.6, LY3 = -0.8;
    }
  });

  // src/fx/shadow/shadow-tendrils.js
  var shadow_tendrils_exports = {};
  __export(shadow_tendrils_exports, {
    create: () => create43,
    meta: () => meta70
  });
  function spine(T2, t) {
    let e = clamp((t - T2.t0) / 0.2), s1 = clamp((t - T2.t1) / SINK5);
    if (e <= 0 || s1 >= 1) return null;
    let lift = 0.07 * Math.sin(Math.PI * clamp(s1 / 0.3)), down = ease.inOutCubic(clamp((s1 - 0.12) / 0.88)), rise = ease.outBack(e, 1.8) * (1 + lift) * (1 - down), hidden = (1 - rise) * T2.L, writhe = T2.A * (0.25 + 0.75 * smooth(T2.t0 + 0.08, T2.t0 + 0.5, t)), hook = (0.04 + T2.H * ease.outBack(clamp((t - T2.t0 - 0.1) / 0.32), 2.5)) * (1 + 0.5 * s1) * (1 + 0.18 * Math.sin(t * 2.3 + T2.ph)), lean = T2.lean + 0.12 * Math.sin(t * 1.6 + T2.ph);
    T2.whip && (lean += T2.whip.a * Math.exp(-(((t - T2.whip.t) / 0.14) ** 2)));
    let th = -Math.PI / 2 + lean, x = T2.x - Math.cos(th) * hidden, y = T2.y - Math.sin(th) * hidden, pts = [], n = Math.ceil(T2.L / 0.5);
    for (let i = 0; i <= n; i++) {
      let s = i * 0.5, u = s / T2.L;
      pts.push({ x, y, th, w: T2.W * Math.pow(1 - u, 0.75) + 0.45, u, s }), th += 0.5 * (writhe * Math.sin(s / T2.lam * TAU - T2.om * t + T2.ph) + T2.curl * hook * smooth(0.58, 1, u)), x += Math.cos(th) * 0.5, y += Math.sin(th) * 0.5;
    }
    return pts;
  }
  function tentacle(p, T2, pts, C, t) {
    let surf2 = T2.y;
    for (let q of pts) {
      if (q.y > surf2) continue;
      let nx = -Math.sin(q.th), ny = Math.cos(q.th), ks = nx * LX4 + ny * LY4 >= 0 ? 1 : -1;
      for (let v = -q.w; v <= q.w; v += 0.5) {
        let x = q.x + nx * v, y = q.y + ny * v, u = v / q.w * ks;
        y <= surf2 && p.px(x, y, u > 0.55 ? C[2] : u > -0.45 ? C[1] : C[0]);
      }
    }
    let pulse2 = (t - T2.t0) * 150, slow = (t - T2.t0) * 55 % (T2.L * 1.8) - 4;
    for (let q of pts) {
      if (q.y > surf2) continue;
      let nx = -Math.sin(q.th), ny = Math.cos(q.th), f = nx * LX4 + ny * LY4, lit = (f >= 0 ? 1 : -1) * q.w, x0 = q.x + nx * lit, y0 = q.y + ny * lit, x1 = q.x - nx * lit, y1 = q.y - ny * lit;
      y1 <= surf2 && p.px(x1, y1, C[3]), y0 <= surf2 && p.px(x0, y0, Math.abs(f) > 0.8 && q.u > 0.15 ? C[7] : q.u > 0.85 || Math.abs(f) > 0.3 ? C[6] : C[5]), q.u > 0.62 && q.u < 0.93 && q.s % 3 < 0.5 && p.px(q.x + nx * T2.curl * q.w * 0.45, q.y + ny * T2.curl * q.w * 0.45, C[4]);
      let dp = Math.min(Math.abs(q.s - pulse2), Math.abs(q.s - slow) * 1.6);
      dp < 2.5 && p.px(q.x, q.y, dp < 1 ? C[7] : C[5]);
    }
    let tip = pts[pts.length - 1];
    tip.y <= surf2 && (p.px(tip.x, tip.y, WHITE), p.glow(tip.x, tip.y, 6, C[6], 0.25));
    for (let i = 0; i < pts.length; i += 8) pts[i].y < surf2 && p.glow(pts[i].x, pts[i].y, 9, C[4], 0.1);
    let pq = pts[Math.min(pts.length - 1, Math.max(0, Math.round(pulse2 * 2)))];
    pulse2 < T2.L && pq.y < surf2 && p.glow(pq.x, pq.y, 10, C[6], 0.45);
    let base = pts.find((q) => q.y <= surf2);
    if (base) {
      let w = base.w + 1.5;
      p.line(base.x - w, surf2, base.x + w, surf2, C[5]), p.px(base.x - w - 1, surf2 + 0.5, C[3]), p.px(base.x + w + 1, surf2 + 0.5, C[3]);
    }
  }
  function create43(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), floor = () => 0, DIM = [C[0], C[0], C[1], C[1], C[3], C[4], C[5], C[6]], ps = new Particles({ rng: R6, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[4] }), puffs = new Puffs({ rng: R6, flame: [C[7], C[6], C[5], C[4], C[3], C[2], C[1], C[1], C[0]], soot: [mix(C[3], C[2], 0.55), mix(C[2], C[1], 0.5)], cap: mix(C[4], C[2], 0.5), rim: [C[6], C[5], C[4]], floor }), ripples = [], splats = [], lights = [], t = 0, acc = 0, rx = (tt) => RX6 * ease.outCubic(clamp(tt / OPEN5)) * (1 - ease.inCubic(clamp((tt - SHUT3) / 0.45))), inPool = (x, tt) => Math.abs(x) < rx(tt) * 0.95, drops = new Drops({
      onLand: (x, y, v, s) => {
        inPool(x, t) ? ripples.push({ x, t0: t, life: 0.5, w: 0.6 }) : splats.push({ x, t0: t, s });
      }
    }), rows = [[-22, -2.5], [-8, -3], [7, -3], [21, -2.5], [-28, 2.5], [-1, 3], [27, 2.5]], order = [3, 0, 5, 2, 4, 1, 6], last = [1, 5, 0, 6, 3, 2, 4], tents = rows.map(([x, y], i) => {
      let back = y < 0, sx = Math.sign(x) || 1;
      return {
        x: x + R6.range(-3, 3),
        y,
        back,
        L: back ? R6.range(46, 62) : R6.range(32, 46),
        W: back ? R6.range(3.2, 4) : R6.range(3.8, 4.6),
        lean: sx * (0.06 + Math.abs(x) / 120) + R6.range(-0.06, 0.06),
        curl: R6.chance(0.75) ? -sx : sx,
        lam: R6.range(36, 50),
        om: R6.range(4.5, 7) * R6.sign(),
        ph: R6.range(0, TAU),
        A: R6.range(0.06, 0.085),
        H: R6.range(0.15, 0.32),
        t0: 0.3 + order[i] * 0.045 + R6.range(0, 0.03),
        t1: 1.5 + last[i] * 0.1 + R6.range(0, 0.05),
        whip: R6.chance(0.45) ? { t: R6.range(0.9, 1.5), a: R6.range(0.28, 0.45) * R6.sign() } : null,
        up: !1,
        down: !1
      };
    });
    function splash(x, y, n, power) {
      for (let i = 0; i < n; i++) drops.add(x + R6.range(-2, 2), y - 1, R6.range(-70, 70) * power, -R6.range(90, 230) * power, R6.chance(0.4) ? 2 : 1);
      ripples.push({ x, t0: t, life: 0.7, w: 1 }), lights.push({ x, y: y - 7, r: 30, k: 0.6 * power, life: 0.25, max: 0.25 });
    }
    return {
      update(dt) {
        t += dt;
        for (let T2 of tents) {
          if (!T2.up && t >= T2.t0) {
            T2.up = !0, splash(T2.x, T2.y, 12, 1);
            for (let i = 0; i < 4; i++) ps.spawn(P.SPARK, T2.x, T2.y - 2, R6.range(-80, 80), -R6.range(120, 260), R6.range(0.2, 0.45));
          }
          if (!T2.down && t >= T2.t1 + SINK5 * 0.8 && (T2.down = !0, splash(T2.x, T2.y, 6, 0.6)), t > T2.t0 + 0.2 && t < T2.t1 && R6.chance(dt * 1.6)) {
            let pts = spine(T2, t), q = pts && pts[Math.floor(R6.range(0.3, 0.95) * pts.length)];
            q && q.y < T2.y && ps.spawn(P.STAR, q.x - Math.sin(q.th) * q.w, q.y + Math.cos(q.th) * q.w, 0, -4, R6.range(0.25, 0.5), C[6], R6.range(1, 2.2));
          }
        }
        let r = rx(t);
        if (r > 8 && t < SHUT3 - 0.4) {
          for (acc += dt * 9; acc > 1; acc--) puffs.spawn(PK.SOOT, R6.range(-0.8, 0.8) * r, -R6.range(1, 4), R6.range(-8, 8), -R6.range(14, 30), R6.range(0.6, 0.85), R6.range(3, 6));
          R6.chance(dt * 16) && ps.spawn(P.MOTE, R6.range(-0.8, 0.8) * r, -2, R6.range(-8, 8), -R6.range(30, 80), R6.range(0.5, 1), R6.pick([C[7], C[6], C[6], C[5]]), R6.range(0.6, 1.1)), R6.chance(dt * 5) && ps.spawn(P.EMBER, R6.range(-0.8, 0.8) * r, -3, R6.range(-10, 10), -R6.range(20, 45), R6.range(0.6, 1), C[6]), R6.chance(dt * 3) && ripples.push({ x: R6.range(-0.7, 0.7) * r, t0: t, life: 0.6, w: 0.5 }), R6.chance(dt * 7) && ps.spawn(P.VAPOUR, R6.range(-0.7, 0.7) * r, -R6.range(2, 8), R6.range(-6, 6), -R6.range(10, 22), R6.range(0.6, 0.9), R6.chance(0.5) ? C[3] : C[4], R6.range(3, 6));
        }
        for (let a of [ripples, splats]) for (let i = a.length - 1; i >= 0; i--) t - a[i].t0 > (a[i].life ?? 0.6) && a.splice(i, 1);
        for (let i = lights.length - 1; i >= 0; i--) (lights[i].life -= dt) <= 0 && lights.splice(i, 1);
        drops.update(dt), puffs.update(dt), ps.update(dt);
      },
      drawBack(p) {
        let r = rx(t), k = r / RX6;
        floorPool(p, C, r, t, ripples), k > 0 && (p.glow(0, -16, 86, C[4], 0.22 * k), p.glow(0, -8, r * 1.7 + 12, C[4], 0.32 * k * (0.9 + 0.1 * Math.sin(t * 5))), p.glow(0, 0, r * 1.15, C[5], 0.18 * k)), puffs.draw(p, PK.SOOT, { x: 0, y: 6, k, reach: 70 }), ps.draw(p, "back");
        for (let T2 of tents) if (T2.back) {
          let pts = spine(T2, t);
          pts && tentacle(p, T2, pts, DIM, t);
        }
      },
      draw(p) {
        for (let T2 of tents) if (!T2.back) {
          let pts = spine(T2, t);
          pts && tentacle(p, T2, pts, C, t);
        }
        drops.draw(p, C[1], C[5]);
        for (let s of splats) {
          let a = 1 - (t - s.t0) / 0.6;
          p.dot(s.x, -0.5, C[1], a * 1.5), p.dot(s.x + 1, -0.5, C[2], a), s.s > 1 && p.dot(s.x - 1, -0.5, C[2], a), p.dot(s.x, -1.5, C[5], a);
        }
        ps.draw(p, "front");
        for (let l of lights) {
          let q = l.life / l.max;
          p.glow(l.x, l.y, l.r * (0.6 + 0.4 * q), C[5], l.k * q * q);
        }
      }
    };
  }
  var meta70, RX6, OPEN5, SHUT3, SINK5, LX4, LY4, init_shadow_tendrils = __esm({
    "src/fx/shadow/shadow-tendrils.js"() {
      init_core();
      init_lib7();
      meta70 = {
        name: "Shadow tendrils",
        desc: "A dark pool opens on the floor; tentacles with lit rims and hooked tips lash up out of it with a splash, writhe, and sink back as it closes.",
        tags: ["shadow", "tentacle", "tendril", "ground", "dark", "magic", "one-shot"],
        size: [208, 130],
        origin: [104, 106],
        duration: 3.2,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: VOID, seed: 3 }
      }, RX6 = 40, OPEN5 = 0.34, SHUT3 = 2.5, SINK5 = 0.5, LX4 = -0.6, LY4 = -0.8;
    }
  });

  // src/fx/shadow/void-orb.js
  var void_orb_exports = {};
  __export(void_orb_exports, {
    draw: () => draw28,
    drawBack: () => drawBack15,
    meta: () => meta71
  });
  function tables() {
    if (TAB) return TAB;
    let n = VR * 2, N9 = n * n, r = new Float32Array(N9), th = new Float32Array(N9), ln = new Float32Array(N9), nz = new Float32Array(N9);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        let x = i - VR + 0.5, y = j - VR + 0.5, k = j * n + i, a = Math.atan2(y, x), d = Math.hypot(x, y), l = Math.log(Math.max(1, d));
        r[k] = d, th[k] = a, ln[k] = l, nz[k] = fbm(Math.cos(a) * 2.5 + l * 2.4, Math.sin(a) * 2.5 + l * 2.4, 17, 3);
      }
    return TAB = { n, r, th, ln, nz };
  }
  function vortex(p, C, t, g) {
    let T2 = tables(), n = T2.n, wf = TAU * 12 / D17;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        let k = j * n + i, r = T2.r[k];
        if (r < GAP2 || r > VR) continue;
        let env = smooth(VR, VR * 0.42, r) * smooth(GAP2, GAP2 + 4, r), ph = ARMS * T2.th[k] + K * T2.ln[k] + WIND4 * t + T2.nz[k] * 2.6, A = (0.5 + 0.5 * Math.cos(ph)) * env * (1 + 0.4 * g);
        if (A < 0.16) continue;
        let x = i - VR + 0.5, y = Y2 + j - VR + 0.5, hot = 1 - smooth(GAP2, GAP2 + 16, r), fil = Math.cos(12 * T2.th[k] + 28 * T2.ln[k] + wf * t + T2.nz[k] * 1.6), dash = Math.cos(9 * T2.ln[k] * 2.2 + 2.2 * T2.th[k] + wf * 0.75 * t);
        if (fil > 0.86 && A > 0.3 && dash > -0.55) {
          let c = hot > 0.6 ? C[7] : (hot > 0.25 || fil > 0.97) && dash > 0 ? C[6] : C[5];
          p.px(x, y, c), p.light(x, y, c, 0.1 + 0.2 * hot);
          continue;
        }
        if (A > 0.36 && A < 0.46 && Math.sin(ph) > 0) {
          p.px(x, y, hot > 0.4 ? C[6] : C[4]);
          continue;
        }
        p.blend(x, y, A > 0.6 ? C[3] : C[2], Math.min(0.75, (A - 0.16) * 1.4));
      }
  }
  function lensing(p, C, t, g) {
    for (let a = 0, st = 0.7 / E; a < TAU; a += st) {
      let f = 0.5 + 0.5 * Math.cos(5 * a - TAU * 2 * t / D17) + 0.5 * g;
      p.px(Math.cos(a) * E, Y2 + Math.sin(a) * E, f > 0.85 ? C[5] : f > 0.45 ? C[4] : C[3]);
    }
    for (let s of SOURCES) {
      let q = TAU * s.n * t / D17 + s.ph, sx = s.cx + s.rho * Math.cos(q), sy = s.cy + s.rho * Math.sin(q) * s.sy, b = Math.max(0.3, Math.hypot(sx, sy)), al = Math.atan2(sy, sx), root2 = Math.sqrt(b * b + 4 * E * E), images = [[(b + root2) / 2, al, 1], [(root2 - b) / 2, al + Math.PI, 0.55]];
      for (let [r, a0, w] of images) {
        if (r < R2 + 1.5) continue;
        let mag = r / b * w, hw = Math.min(Math.PI, s.s * 1.6 / (2 * b)), step2 = 0.6 / r;
        for (let a = a0 - hw; a <= a0 + hw + 1e-6; a += step2) {
          let u = hw > 0 ? Math.abs(a - a0) / hw : 0, x = Math.cos(a) * r, y = Y2 + Math.sin(a) * r;
          p.dot(x, y, u < 0.3 && mag > 0.8 ? WHITE : u < 0.65 ? C[7] : C[5], Math.min(1, mag * 1.4) * (1.15 - u)), mag > 1.2 && u < 0.6 && p.dot(x + Math.cos(a), y + Math.sin(a), C[6], 0.8);
        }
        p.glow(Math.cos(a0) * r, Y2 + Math.sin(a0) * r, 4 + Math.min(10, hw * r), C[6], Math.min(0.5, 0.18 * mag));
      }
    }
  }
  function orb(p, C, t, g) {
    p.shade(-R2 - 1, Y2 - R2 - 1, R2 + 1, Y2 + R2 + 1, (x, y) => {
      let dx = x, dy = y - Y2, d = Math.sqrt(dx * dx + dy * dy);
      if (d > R2 + 0.5) return;
      let a = Math.atan2(dy, dx);
      if (d > R2 - 0.6) {
        let f = 0.5 * Math.cos(3 * a - TAU * 2 * t / D17) + 0.3 * Math.cos(7 * a + TAU * 3 * t / D17 + 1) + 0.25 * Math.cos(13 * a - TAU * 5 * t / D17 + 2) + g;
        return f > 0.5 ? WHITE : f > 0.05 ? C[6] : f > -0.4 ? C[5] : C[4];
      }
      return R2 - d < 1.4 && Math.cos(a - 0.8) > 0.6 ? C[2] : (dx + R2 * 0.42) ** 2 + (dy + R2 * 0.45) ** 2 < 1.6 ? C[3] : C[0];
    });
  }
  function drawBack15(p, t, o) {
    let C = fit(o.palette, 8), g = gulp(t);
    p.glow(0, -1, 52, C[4], 0.22 + 0.1 * g), vortex(p, C, t, g), lensing(p, C, t, g);
  }
  function draw28(p, t, o) {
    let C = fit(o.palette, 8), g = gulp(t), S = o.seed;
    cycle(t, D17, 14, S + 2, (r) => r.range(1.6, 2.4), (age, L, r) => {
      let x0 = r.range(-44, 44), u = Math.pow(age / L, 1.7), side = Math.sign(x0) || 1, ea = Math.PI / 2 + side * r.range(0.3, 1), ex = Math.cos(ea) * R2, ey = Y2 + Math.sin(ea) * R2, mx = x0 * 0.2, my = -18 - r.range(0, 12), x = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * ex, y = (1 - u) * (1 - u) * -1 + 2 * (1 - u) * u * my + u * u * ey;
      age < 0.5 && p.disc(x0, -1.5, 2 + age * 6, C[3], 0.4 * (1 - age / 0.5)), p.dot(x, y, u > 0.6 ? C[7] : u > 0.25 ? C[6] : C[5], Math.min(1, age * 4)), u > 0.3 && p.glow(x, y, 3, C[5], 0.25);
    }), cycle(t, D17, 30, S, (r) => r.range(1.1, 1.8), (age, L, r) => {
      let th0 = r.range(0, TAU);
      Math.sin(th0) > 0.75 && (th0 = -th0);
      let r0 = r.range(30, 64), sw = r.range(1.4, 2.6), col = r.pick([WHITE, C[7], C[6], C[6], C[5]]), pos = (aa) => {
        let u = clamp(aa / L), k = Math.pow(u, 1.8), rr2 = R2 + 1 + (r0 - R2 - 1) * (1 - k), th = th0 - sw * (k + 0.5 * u);
        return [Math.cos(th) * rr2, Y2 + Math.sin(th) * rr2, rr2];
      }, [x, y, rr] = pos(age), [tx, ty] = pos(age - 0.05), a = Math.min(1, age * 5);
      if (rr < R2 + 3) {
        p.px(x, y, WHITE), p.glow(x, y, 5, C[6], 0.5);
        return;
      }
      p.line(tx, ty, (tx + x) / 2, (ty + y) / 2, C[4], a * 0.8), p.line((tx + x) / 2, (ty + y) / 2, x, y, col, a), p.glow(x, y, 3, col, 0.3 * a);
    }), cycle(t, D17, 9, S + 1, 0.42, (age, L, r) => {
      let th = r.range(0, TAU);
      Math.sin(th) > 0.45 && (th = -th);
      let r0 = r.range(56, 74), u = age / L, k = (Math.exp(3 * u) - 1) / (Math.exp(3) - 1), rr = r0 - (r0 - R2 - 1) * k, len2 = 2 + 10 * k, ca = Math.cos(th), sa = Math.sin(th);
      for (let d = 0; d <= len2; d += 0.5) p.dot(ca * (rr + d), Y2 + sa * (rr + d), d < 1 ? WHITE : d < len2 * 0.5 ? C[6] : C[4], d < len2 * 0.5 ? 1 : 1.2 - d / len2);
      p.glow(ca * rr, Y2 + sa * rr, 4, C[6], 0.4);
    });
    for (let gp of GULPS) {
      let u = wrap4(t / D17 - gp) / (0.4 / D17);
      if (u >= 1) continue;
      let rr = R2 + 2 + (VR - R2) * (1 - ease.inQuad(u));
      ringFast(p, 0, Y2, rr, 1, C[4], 0.35 * (1 - u)), ringLight(p, 0, Y2, rr, 4, C[5], 0.3 * (1 - u));
    }
    orb(p, C, t, g), halo(p, 0, Y2, R2 - 0.5, R2 + 7, C[6], 0.6 + 0.3 * g), halo(p, 0, Y2, R2 - 0.5, R2 + 46, C[4], 0.38 + 0.15 * g), unlight(p, -R2, Y2 - R2, R2, Y2 + R2, (x, y) => x * x + (y - Y2) ** 2 < (R2 - 0.6) ** 2);
  }
  var meta71, Y2, R2, VR, GAP2, E, D17, ARMS, K, WIND4, GULPS, wrap4, gulp, SOURCES, TAB, init_void_orb = __esm({
    "src/fx/shadow/void-orb.js"() {
      init_core();
      init_lib7();
      meta71 = {
        name: "Void orb",
        desc: "A black orb hangs in the air, a pale rim crawling round it; a dark vortex winds into it, motes and streaks are pulled in, and light bends round its edge.",
        tags: ["shadow", "void", "orb", "vortex", "dark", "magic", "loop"],
        size: [168, 160],
        origin: [84, 150],
        duration: 3.2,
        loop: !0,
        fps: 30,
        bg: "ground",
        options: { palette: VOID, seed: 5 }
      }, Y2 = -62, R2 = 12, VR = 48, GAP2 = R2 + 9, E = R2 + 4.5, D17 = 3.2, ARMS = 3, K = 7, WIND4 = TAU * 2 / D17, GULPS = [0.2, 0.68], wrap4 = (x) => x - Math.floor(x), gulp = (t) => GULPS.reduce((s, g) => s + Math.exp(-(((wrap4(t / D17 - g + 0.5) - 0.5) * D17 / 0.07) ** 2)), 0), SOURCES = [
        { cx: 0, cy: 0, rho: 6, n: 1, ph: 0, s: 2.6, sy: 0.75 },
        { cx: 1, cy: -1, rho: 8, n: -1, ph: 2.2, s: 2, sy: 0.6 },
        { cx: 18, cy: -6, rho: 24, n: 1, ph: 0.4, s: 2.4, sy: 0.7 },
        { cx: -26, cy: 10, rho: 30, n: 1, ph: 2.6, s: 2, sy: 0.55 },
        { cx: 8, cy: 22, rho: 20, n: 2, ph: 4.1, s: 1.6, sy: 0.8 },
        { cx: -12, cy: -26, rho: 34, n: 1, ph: 5.3, s: 1.8, sy: 0.6 },
        { cx: 34, cy: 18, rho: 16, n: 2, ph: 1.2, s: 1.4, sy: 0.9 }
      ], TAB = null;
    }
  });

  // src/fx/spawn/disintegrate.js
  var disintegrate_exports = {};
  __export(disintegrate_exports, {
    act: () => act24,
    actorAlpha: () => actorAlpha4,
    create: () => create44,
    meta: () => meta72
  });
  function create44(o) {
    let C = fit(o.palette, 8), A = fit(o.accent, 3), R6 = new Rng(o.seed), W4 = o.wind, floor = () => 0, COOL = [[C[6], C[5], C[5], C[4]], [A[2], A[1], A[1], A[0]], [WHITE, C[6], C[5], C[5]]], body4 = bodyOf(o.actor, C), rim = rimOf(body4), top = body4.y, H3 = body4.h, ps = new Particles({ rng: R6, ground: floor, sparks: [C[7], C[6], C[5], C[3]] }), lights = new Lights();
    for (let b of body4.list) {
      let u = (b.y - top) / H3;
      b.key = u + 0.14 * (rand(b.mx, b.my, 3) - 0.5) + 0.05 * noise(b.mx * 0.45, 7) - (b.edge ? 0.03 : 0), b.gone = !1;
    }
    let front = (t2) => -0.06 + 1.14 * ease.inOutSine(clamp((t2 - P0) / PEEL)), motes2 = [], gust2 = (t2) => 0.7 + 0.5 * (noise(t2 * 1.6, 11) * 0.5 + 0.5), t = 0, flashed = !1;
    function letGo(b) {
      b.gone = !0;
      let lo = b.y > -9 && R6.chance(0.22), kind = lo ? 2 : R6.chance(0.42) ? 1 : R6.chance(0.07) ? 3 : 0;
      if (kind === 3) {
        ps.spawn(P.STAR, b.x, b.y, R6.range(-6, 14) * W4, R6.range(-26, -8), R6.range(0.6, 1.1), R6.chance(0.5) ? C[6] : WHITE, R6.range(1, 2.2));
        return;
      }
      let life = kind === 2 ? R6.range(0.7, 1.2) : kind === 1 ? R6.range(0.25, 0.5) : R6.range(0.9, 1.7), out = (b.x + 0.5) * R6.range(2, 6);
      motes2.push({
        x: b.x + 0.5,
        y: b.y + 0.5,
        vx: (out + R6.range(-6, 16)) * (kind === 2 ? 0.4 : 1),
        vy: kind === 2 ? R6.range(-30, -8) : R6.range(-46, -8),
        life,
        max: life,
        c: b.c,
        kind,
        lift: R6.range(0.4, 1.4),
        cool: COOL[R6.chance(0.3) ? 1 : R6.chance(0.3) ? 2 : 0],
        own: R6.chance(0.2),
        rest: !1,
        seed: R6.range(0, 100)
      });
    }
    return {
      update(dt) {
        if (t += dt, t < FLASH3 - 0.05 && R6.chance(0.55)) {
          let a = R6.range(0, TAU), D25 = R6.range(22, 44), T2 = R6.range(0.16, 0.26), v = D25 * 3 / (Math.exp(3 * T2) - 1), x = Math.cos(a) * D25, y = Math.min(CORE_Y2 + Math.sin(a) * D25 * 0.9, -3), l = Math.hypot(x, y - CORE_Y2) || 1;
          ps.spawn(P.STREAK, x, y, -x / l * v, (CORE_Y2 - y) / l * v, T2, R6.chance(0.5) ? C[6] : C[5]);
        }
        if (!flashed && t >= FLASH3) {
          flashed = !0, lights.add(0, CORE_Y2, 64, C[4], 0.85, 0.6), lights.add(0, CORE_Y2, 30, WHITE, 0.8, 0.14);
          for (let i = 0; i < 14; i++) {
            let a = R6.range(0, TAU), sp = R6.range(50, 150);
            ps.spawn(P.STAR, R6.range(-6, 6), CORE_Y2 + R6.range(-10, 10), Math.cos(a) * sp, Math.sin(a) * sp * 0.7 - 25, R6.range(0.35, 0.8), R6.pick([WHITE, C[6], C[5]]), R6.range(0.6, 1.8));
          }
        }
        if (t >= P0) {
          let f = front(t);
          for (let b of body4.list) !b.gone && b.key < f && letGo(b);
        }
        let g = gust2(t) * (1 - 0.55 * smooth(P0 + PEEL, P0 + PEEL + 1.2, t));
        for (let i = motes2.length - 1; i >= 0; i--) {
          let m = motes2[i];
          if ((m.life -= dt) <= 0) {
            motes2.splice(i, 1);
            continue;
          }
          if (m.kind === 2) {
            if (m.rest) continue;
            m.vx += (W4 * 30 * g - m.vx * 1.2) * dt, m.vy += 260 * dt - m.vy * 1.2 * dt, m.x += m.vx * dt;
            let ny = m.y + m.vy * dt;
            m.vy > 0 && ny >= -0.5 ? m.vy > 50 ? (m.vy *= -0.35, m.vx *= 0.6, m.y = -0.6) : (m.rest = !0, m.y = -0.5) : m.y = ny;
            continue;
          }
          let age = m.max - m.life, k = Math.min(1, age / 0.15), fx = W4 * (100 * g + 30 * noise2(m.x * 0.07, m.y * 0.07 - t * 0.8, 3)) * k, fy = (-30 * m.lift + 42 * noise2(m.x * 0.06 + 40, m.y * 0.06 - t * 1.1, 5)) * k, drag = m.kind === 1 ? 3 : 1.5;
          m.vx += (fx - m.vx * drag) * dt, m.vy += (fy - m.vy * drag) * dt, m.x += m.vx * dt, m.y += m.vy * dt;
        }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let k = (t - FLASH3) / 0.5;
        k > 0 && k < 1 && band(p, 0, 0, 6 + 30 * ease.outCubic(k), 0.18, Math.max(1, 3.5 * (1 - k)), 1.15 - k, C, (g) => Math.sin(g) < 0, k < 0.12);
        let pool3 = smooth(0.1, FLASH3, t) * (1 - smooth(P0 + PEEL * 0.8, P0 + PEEL + 0.6, t));
        pool3 > 0 && p.glow(0, -1, 30, C[4], 0.22 * pool3);
      },
      draw(p) {
        let f = front(t);
        if (t < FLASH3) {
          let k2 = t / FLASH3, fr = Math.floor(t * 30);
          for (let c of rim) {
            let h = rand(c.mx * 61 + c.my, fr, 7);
            h < 0.12 + 0.62 * k2 * k2 && p.px(c.x, c.y, k2 > 0.72 && rand(c.mx, c.my, fr) < 0.5 ? WHITE : h < 0.2 ? C[6] : C[5]);
          }
          p.glow(0, CORE_Y2, 26, C[4], 0.42 * k2), p.glow(0, CORE_Y2, 12, C[6], 0.25 * k2 * k2);
        }
        if (t >= FLASH3 - 0.1) {
          let shake = t < FLASH3 ? (Math.floor(t * 60) % 2 ? 1 : -1) * 0.6 : 0, white = t >= FLASH3 && t < P0;
          for (let b of body4.list) {
            if (b.gone) continue;
            let c;
            if (white) c = b.edge ? C[6] : WHITE;
            else if (t < FLASH3) c = b.edge ? mix(b.c, C[6], 0.7) : mix(b.c, C[5], 0.25);
            else {
              let d = b.key - f;
              c = (!body4.on(b.mx, b.my - 1) || body4.cell(b.mx, b.my - 1).gone) && d < 0.06 ? WHITE : d < 0.03 ? mix(b.c, C[6], 0.7) : d < 0.1 ? mix(b.c, C[5], 0.4) : b.edge ? mix(b.c, C[5], 0.5) : mix(b.c, C[4], 0.16);
            }
            p.px(b.x + shake, b.y, c);
          }
          white && (p.glow(0, CORE_Y2, 34, C[5], 0.7), sparkle(p, 0, CORE_Y2 - 3, 9, C[6], C[4], 0.5));
        }
        if (t >= P0 && f < 1.05) {
          let fy = top + clamp(f) * H3, k2 = 1 - smooth(0.85, 1.05, f);
          p.glowLine(-10, fy, 10, fy, 8, C[5], 0.32 * k2), p.glow(0, fy, 22, C[4], 0.2 * k2);
        }
        let k = (t - FLASH3) / 0.5;
        k > 0 && k < 1 && band(p, 0, 0, 6 + 30 * ease.outCubic(k), 0.18, Math.max(1, 3.5 * (1 - k)), 1.15 - k, C, (g) => Math.sin(g) >= 0, k < 0.12);
        for (let m of motes2) {
          let age = m.max - m.life, k2 = m.life / m.max, a = k2 < 0.35 ? k2 / 0.35 : 1, c;
          if (age < 0.034) c = mix(m.c, WHITE, 0.55);
          else if (age < 0.06) c = WHITE;
          else if (age < 0.15) c = m.cool[0];
          else {
            let u = (age - 0.15) / Math.max(0.05, m.max - 0.15), cc = m.cool[1 + Math.min(2, Math.floor(u * 3))];
            c = m.own && u < 0.5 ? mix(m.c, cc, 0.55) : cc, m.kind === 0 && Math.sin(t * 21 + m.seed) > 0.8 && (c = m.cool[0]);
          }
          if (m.kind === 2) {
            p.dot(m.x, m.y, c, a), p.glow(m.x, m.y, 3, C[5], 0.3 * k2);
            continue;
          }
          let sp = Math.hypot(m.vx, m.vy), ux = m.vx / (sp || 1), uy = m.vy / (sp || 1);
          sp > 30 && m.kind === 0 && p.dot(m.x - ux * 1.2, m.y - uy * 1.2, scale(c, 0.6), a * 0.85), sp > 85 && m.kind === 0 && p.dot(m.x - ux * 2.4, m.y - uy * 2.4, scale(c, 0.4), a * 0.6), p.dot(m.x, m.y, c, a), k2 > 0.15 && p.glow(m.x, m.y, 2.5, c, (m.kind === 1 ? 0.16 : 0.11) * k2);
        }
        ps.draw(p), lights.draw(p);
      }
    };
  }
  var meta72, AGONY, act24, FLASH3, WHITE_T, P0, PEEL, CORE_Y2, actorAlpha4, init_disintegrate = __esm({
    "src/fx/spawn/disintegrate.js"() {
      init_core();
      init_lib9();
      meta72 = {
        name: "Disintegrate",
        desc: "The character crackles with light, flashes white, then peels away from the head down: each pixel flares white-hot and streams off on the wind as a cooling mote of light.",
        tags: ["spawn", "death", "disintegrate", "dissolve", "pixels", "energy", "light", "one-shot"],
        size: [176, 100],
        origin: [48, 86],
        duration: 3.4,
        loop: !1,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: {
          palette: ["#120a26", "#2a1658", "#3d2f9c", "#3f68d4", "#3fa8ec", "#86e0ff", "#d6f8ff", "#ffffff"],
          accent: ["#7a3ae4", "#b682ff", "#ecd2ff"],
          wind: 1,
          seed: 5
        }
      }, AGONY = { turn: 1.15, crouch: 0, hy: -1, fx: -14, fy: -36, bx: 15, by: -36, ffx: -3, fbx: 4 }, act24 = {
        onBody: !0,
        poses: [
          [-0.2, READY],
          [0.05, { turn: 1, crouch: 3, fx: -9, fy: -16, bx: 10, by: -16, ffx: -3, fbx: 4 }],
          [0.3, AGONY],
          [3.4, AGONY]
        ]
      }, FLASH3 = 0.42, WHITE_T = 0.07, P0 = FLASH3 + WHITE_T, PEEL = 1.2, CORE_Y2 = -20, actorAlpha4 = (t) => t < FLASH3 - 0.1 ? 1 : 0;
    }
  });

  // src/fx/status/charmed.js
  var charmed_exports = {};
  __export(charmed_exports, {
    act: () => act25,
    draw: () => draw29,
    drawBack: () => drawBack16,
    meta: () => meta73
  });
  function hearts(p, C, a, t, seed2, back) {
    cycle(t, D18, 12, seed2 + 4, (r) => r.range(1.3, 1.9), (age, life, r, i) => {
      if (i % 3 === 0 !== back) return;
      let u = age / life, side = r.next() < 0.5 ? -1 : 1, ph = r.range(0, TAU), big = r.next() < 0.3, x = side * r.range(4, 15) + Math.sin(age * 4 + ph) * 2.2, y = a.y + r.range(8, 30) - age * r.range(14, 22), k = Math.min(1, u * 6);
      if (u > 0.88) {
        let q = (u - 0.88) / 0.12;
        sparkle(p, x, y, Math.round(2 * (1 - q)), C[5], C[4], 0.4 * (1 - q));
        return;
      }
      let R6 = back ? [C[0], C[1], C[2], C[3]] : [C[0], C[2], C[3], C[4]];
      icon(p, x, y, 4, big ? HEART7 : HEART5, R6, k), back || p.px(x - (big ? 2 : 1), y - 1, C[6]), p.glow(x, y, 6, C[3], (back ? 0.12 : 0.22) * k);
    });
  }
  function drawBack16(p, t, o) {
    let C = fit(o.palette, 7), a = o.actor, ph = (t % BEAT2 + BEAT2) % BEAT2, th = thump(ph);
    p.glow(0, a.y - 8, 26 + 8 * th, C[3], 0.16 + 0.22 * th), hearts(p, C, a, t, o.seed, !0);
  }
  function draw29(p, t, o) {
    let C = fit(o.palette, 7), a = o.actor, ph = (t % BEAT2 + BEAT2) % BEAT2, th = thump(ph);
    for (let e of eyes(a)) {
      for (let [x, y] of e.px) p.px(a.x + x, a.y + y, y === e.y0 ? C[3] : C[2]);
      p.px(a.x + e.x0, a.y + e.y0 + 1, C[6]);
      let blush = mix(e.skin, C[3], 0.55), out = e.x0 < a.w / 2 ? -1 : 1, bx = out < 0 ? e.x0 - 1 : e.x1;
      p.px(a.x + bx, a.y + e.y1 + 1, blush), p.px(a.x + bx + 1, a.y + e.y1 + 1, blush);
    }
    hearts(p, C, a, t, o.seed, !1);
    let hx = 0, hy = a.y - 10, s = 5.6 * (1 + 0.24 * th);
    for (let [t0, kk] of [[0.04, 1], [0.26, 0.6]]) {
      let u = (ph - t0) / 0.5;
      if (u < 0 || u > 1) continue;
      let S13 = 5.6 * (1.25 + 1.3 * u), outer = shaped(heartShape, S13), inner = shaped(heartShape, S13 - 1.3), E2 = Math.ceil(S13 * 1.2) + 1;
      for (let dy = -E2; dy <= E2; dy++)
        for (let dx = -E2; dx <= E2; dx++) outer(dx, dy) && !inner(dx, dy) && p.dot(hx + dx, hy + dy, u < 0.3 ? C[5] : C[4], (1 - u) * kk * 1.3);
    }
    icon(p, hx, hy, 9, shaped(heartShape, s), [C[0], C[2], C[3], C[4]]), p.px(hx - Math.round(s * 0.55), hy - Math.round(s * 0.45), C[6]), p.px(hx - Math.round(s * 0.55) + 1, hy - Math.round(s * 0.45), C[5]), p.px(hx - Math.round(s * 0.55), hy - Math.round(s * 0.45) + 1, C[5]), p.glow(hx, hy, 12 + 6 * th, C[4], 0.3 + 0.4 * th), th > 0.5 && sparkle(p, hx + s * 0.9, hy - s * 0.8, Math.round(3 * th), C[5], C[4], 0.4 * th), cycle(t, D18, 8, o.seed + 2, (r) => r.range(0.3, 0.5), (age, life, r) => {
      let an = r.range(0, TAU), d = r.range(8, 15), u = age / life;
      sparkle(p, hx + Math.cos(an) * d, hy + Math.sin(an) * d * 0.8, Math.round(1.6 * Math.sin(Math.PI * u)), C[5], C[4], 0.3 * Math.sin(Math.PI * u));
    });
  }
  var meta73, SWOON, act25, D18, BEAT2, HEART5, HEART7, thump, init_charmed = __esm({
    "src/fx/status/charmed.js"() {
      init_core();
      init_lib8();
      meta73 = {
        name: "Charmed",
        desc: "Smitten: a big heart beats over the head, throwing a ring and a flush of light with every beat, little hearts float up, the eyes go pink and the cheeks blush.",
        tags: ["status", "charm", "love", "hearts", "debuff", "loop"],
        size: [60, 76],
        origin: [30, 68],
        duration: 2.4,
        loop: !0,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: { palette: ["#3a0a1e", "#7a1238", "#c4245a", "#f04e86", "#ff8ab0", "#ffc8da", "#ffffff"], seed: 8 }
      }, SWOON = { turn: 1.1, fx: -2, fy: -28, bx: 2, by: -28, armsFront: !0, ffx: -3, fbx: 4 }, act25 = {
        onBody: !0,
        poses: [[0, { ...SWOON, lean: -2 }], [0.6, { ...SWOON, lean: 0, crouch: 1 }], [1.2, { ...SWOON, lean: 2 }], [1.8, { ...SWOON, lean: 0, crouch: 1 }], [2.4, { ...SWOON, lean: -2 }]]
      }, D18 = meta73.duration, BEAT2 = D18 / 2, HEART5 = bitmap([".#.#.", "#####", "#####", ".###.", "..#.."]), HEART7 = bitmap([".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."]), thump = (ph) => Math.exp(-(((ph - 0.04) / 0.07) ** 2)) + 0.6 * Math.exp(-(((ph - 0.26) / 0.07) ** 2));
    }
  });

  // src/fx/status/confused.js
  var confused_exports = {};
  __export(confused_exports, {
    act: () => act26,
    draw: () => draw30,
    drawBack: () => drawBack17,
    meta: () => meta74
  });
  function spiral(p, C, cx, cy, t) {
    let rot = t / D19 * TAU * 2, turns = 1.8, n = 72, breathe2 = 1 + 0.08 * Math.sin(t / D19 * TAU * 4), at2 = (u) => {
      let th = u * turns * TAU - rot, r = (0.8 + 6.6 * u) * breathe2;
      return [cx + Math.cos(th) * r, cy + Math.sin(th) * r * 0.9];
    };
    for (let i = 1; i <= n; i++) {
      let u = i / n, [x0, y0] = at2((i - 1) / n), [x1, y1] = at2(u);
      u > 0.45 && p.line(x0 + 0.5, y0 + 0.7, x1 + 0.5, y1 + 0.7, C[1]);
    }
    for (let i = 1; i <= n; i++) {
      let u = i / n, [x0, y0] = at2((i - 1) / n), [x1, y1] = at2(u);
      p.line(x0, y0, x1, y1, u > 0.88 ? C[5] : u > 0.62 ? C[4] : u > 0.3 ? C[3] : C[2]), i % 6 === 0 && p.light(x1, y1, C[3], 0.4 * u);
    }
    let [hx, hy] = at2(1);
    sparkle(p, hx, hy, 2, C[4], C[3], 0.5), p.glow(cx, cy, 13, C[3], 0.28);
  }
  function drawBack17(p, t, o) {
    let C = fit(o.palette, 6), a = o.actor;
    p.glow(0, a.y - 7, 16, C[3], 0.22);
  }
  function draw30(p, t, o) {
    let C = fit(o.palette, 6), M2 = fit(o.marks, 4), a = o.actor, look = Math.floor(t / D19 * 6) % 2 ? 1 : -1;
    for (let e of eyes(a)) {
      for (let [x, y] of e.px) p.px(a.x + x, a.y + y, 4279702047);
      p.px(a.x + (look < 0 ? e.x0 : e.x1), a.y + e.y0, 4294967295);
    }
    spiral(p, C, 0, a.y - 7, t);
    for (let m of MARKS) {
      let age = ((t - m.t0) % D19 + D19) % D19, life = 1.9;
      if (age > life) continue;
      let u = age / life, pop = ease.outBack(clamp(age / 0.16), 3), out = clamp((u - 0.82) / 0.18), size = Math.max(0, Math.round(m.big * pop * (1 - out) + (pop > 1.1 ? 1 : 0))), bob = Math.sin(age * 5 + m.t0 * 3) * 1.6, tilt = Math.sin(age * 3.3 + m.t0) * 0.8;
      if (pop < 0.3 || out > 0 && size === 0 && out > 0.6) continue;
      let x = m.x + tilt, y = a.y + m.y + bob - age * 2;
      if (age < 0.2) {
        let k = age / 0.2;
        for (let j = 0; j < 8; j++) {
          let an = j / 8 * TAU + 0.2, d0 = 4 + 7 * k, d1 = d0 + 3 * (1 - k);
          p.line(x + Math.cos(an) * d0, y + Math.sin(an) * d0, x + Math.cos(an) * d1, y + Math.sin(an) * d1, j % 2 ? M2[2] : M2[3], 1 - k);
        }
        p.glow(x, y, 16, M2[2], 0.45 * (1 - k));
      }
      icon(p, x, y, 7, QS[Math.min(2, size)], [M2[0], M2[1], M2[2], M2[3]]), p.glow(x, y, 10 + size * 2, M2[2], 0.28 * (1 - out));
    }
    cycle(t, D19, 10, o.seed + 2, (r) => r.range(0.35, 0.6), (age, life, r) => {
      let th = r.range(0, TAU), u = age / life, d = 6 + age * r.range(12, 22), x = Math.cos(th) * d, y = a.y - 7 + Math.sin(th) * d * 0.8;
      Math.sin(Math.PI * u) > 0.6 && r.next() < 0.5 ? sparkle(p, x, y, 1, C[4], C[3], 0.3) : p.dot(x, y, u < 0.5 ? C[5] : C[4], 1.2 - u);
    });
  }
  var meta74, SHRUG, act26, D19, QS, MARKS, init_confused = __esm({
    "src/fx/status/confused.js"() {
      init_core();
      init_lib8();
      meta74 = {
        name: "Confused",
        desc: "Head in a spin: a glowing spiral whirls over the head, question marks pop up round it and bob, the eyes dart left and right.",
        tags: ["status", "confused", "confusion", "dizzy", "debuff", "loop"],
        size: [60, 78],
        origin: [30, 70],
        duration: 2.4,
        loop: !0,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: {
          palette: ["#1e0f2e", "#4b2070", "#8a3ab0", "#c66ae0", "#f0a8ff", "#ffffff"],
          marks: ["#2a1608", "#b0701a", "#ffd84a", "#fff4b8"],
          seed: 6
        }
      }, SHRUG = { turn: 1, fx: -13, fy: -26, bx: 14, by: -26, ffx: -3, fbx: 4 }, act26 = {
        onBody: !0,
        poses: [
          [0, { ...SHRUG, x: 0, lean: -2 }],
          [0.6, { ...SHRUG, x: 1, lean: 1, crouch: 1, fy: -23, by: -29, fbx: 5, fby: -6 }],
          [1.2, { ...SHRUG, x: 2, lean: 2 }],
          [1.8, { ...SHRUG, x: 1, lean: -1, crouch: 1, fy: -29, by: -23, ffx: -4, ffy: -6 }],
          [2.4, { ...SHRUG, x: 0, lean: -2 }]
        ]
      }, D19 = meta74.duration, QS = [
        [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
        [".####.", "##..##", "....##", "...##.", "..##..", "..##..", "......", "..##..", "..##.."],
        [".#####.", "##...##", "##...##", ".....##", "....##.", "...##..", "...##..", ".......", "...##..", "...##.."]
      ].map((rows) => bitmap(rows)), MARKS = [
        { x: -12, y: -5, t0: 0, big: 2 },
        { x: 12, y: -8, t0: 0.8, big: 1 },
        { x: 1, y: -17, t0: 1.6, big: 2 }
      ];
    }
  });

  // src/fx/status/stunned.js
  var stunned_exports = {};
  __export(stunned_exports, {
    act: () => act27,
    draw: () => draw31,
    drawBack: () => drawBack18,
    meta: () => meta75
  });
  function ring2(t, a) {
    let cy = a.y + 2, rx = a.w * 0.62, ry = 4.5;
    return Array.from({ length: N6 }, (_, i) => {
      let th = TAU * (TURNS * t / D20 + i / N6), s = Math.sin(th);
      return { i, th, x: Math.cos(th) * rx, y: cy + s * ry, near: s >= 0, depth: 0.5 + 0.5 * s, bird: i % 2 === 1, rx, ry, cy };
    });
  }
  function draw1(p, t, o, layer) {
    let C = fit(o.palette, 7), Bd = fit(o.birds, 4), a = o.actor, far2 = layer === "back", dim = (c) => far2 ? mix(c, Bd[0], 0.3) : c;
    for (let it of ring2(t, a))
      if (it.near !== far2) {
        if (!it.bird)
          for (let k = 1; k <= 12; k++) {
            let th = it.th - k * 0.085, x = Math.cos(th) * it.rx, y = it.cy - 1 + Math.sin(th) * it.ry;
            Math.sin(th) >= 0 === far2 || rand(it.i, k, Math.floor((t / D20 * TURNS + k * 0.37) * 9)) < 0.25 || (p.dot(x, y, dim(k < 4 ? C[6] : k < 8 ? C[5] : C[4]), 1.1 - k / 13), k < 6 && p.light(x, y, C[4], 0.3 * (1 - k / 6)));
          }
        if (it.bird) {
          let up = Math.floor(t * 8 + it.i * 0.5) % 2 === 0, bob = Math.sin(t / D20 * TAU * 4 + it.i) * 0.7, flip = it.near, f = BIRD[up ? 0 : 1], ins = flip ? (dx, dy) => f(-dx, dy) : f;
          icon(p, it.x, it.y - 3 + bob, 7, ins, [Bd[0], dim(Bd[1]), dim(Bd[2]), dim(Bd[3])], 1, { e: Bd[0], b: dim(hex(o.beak)), w: dim(Bd[1]) });
        } else {
          let spin = t / D20 * TAU * 3 + it.i, R6 = [C[0], dim(C[3]), dim(C[4]), dim(C[5])];
          it.depth > 0.55 ? icon(p, it.x, it.y - 1, 7, STAR(4 + 0.8 * it.depth, spin), R6) : icon(p, it.x, it.y - 1, 5, bitmap(STAR7), R6), p.px(it.x, it.y - 1, far2 ? C[5] : C[6]), p.glow(it.x, it.y - 1, 11, C[4], 0.24 + 0.3 * it.depth), p.glow(it.x, it.y - 1, 4, C[6], 0.3 * it.depth);
          let fr = Math.exp(-((Math.atan2(Math.sin(it.th - Math.PI / 2), Math.cos(it.th - Math.PI / 2)) / 0.32) ** 2));
          !far2 && fr > 0.08 && flare(p, it.x, it.y - 1, 9 * fr, fr, [C[3], C[4], C[5], C[6]]);
        }
      }
  }
  function drawBack18(p, t, o) {
    draw1(p, t, o, "back");
  }
  function draw31(p, t, o) {
    let C = fit(o.palette, 7), a = o.actor;
    draw1(p, t, o, "front"), cycle(t, D20, 14, o.seed + 3, (r) => r.range(0.25, 0.5), (age, life, r) => {
      let th = r.range(0, TAU), u = age / life, x = Math.cos(th) * a.w * r.range(0.45, 0.95), y = a.y + 1 + Math.sin(th) * 7 - r.range(0, 9), arm2 = Math.round(r.range(1, 2.6) * Math.sin(Math.PI * u));
      arm2 < 1 && p.dot(x, y, C[6], Math.sin(Math.PI * u) * 1.4), sparkle(p, x, y, arm2, C[5], C[4], 0.35 * Math.sin(Math.PI * u));
    }), p.glow(0, a.y + 1, 26, C[4], 0.13);
  }
  var meta75, DAZE, act27, D20, TURNS, N6, STAR7, BIRD, STAR, init_stunned = __esm({
    "src/fx/status/stunned.js"() {
      init_core();
      init_lib8();
      meta75 = {
        name: "Stunned",
        desc: "Seeing stars: three spinning stars and two little birds circle the head on a tilted ring, ducking behind it and sweeping round in front, trailing glitter.",
        tags: ["status", "stun", "dizzy", "daze", "stars", "birds", "debuff", "loop"],
        size: [60, 64],
        origin: [30, 56],
        duration: 2,
        loop: !0,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: {
          palette: ["#3a1e0c", "#8a4a12", "#d88a1c", "#f5c030", "#ffe36e", "#fff6c8", "#ffffff"],
          birds: ["#1a1422", "#6a7fae", "#b8c8e8", "#f4f8ff"],
          beak: "#ffae35",
          seed: 2
        }
      }, DAZE = { turn: 1, fx: -7, fy: -15, bx: 8, by: -15, ffx: -3, fbx: 4 }, act27 = {
        onBody: !0,
        poses: [
          [0, { ...DAZE, x: -1, lean: -3, hx: -1 }],
          [0.5, { ...DAZE, x: 0, lean: 0, crouch: 2, hy: 1, ffx: -2 }],
          [1, { ...DAZE, x: 1, lean: 3, hx: 1 }],
          [1.5, { ...DAZE, x: 0, lean: 0, crouch: 2, hy: 1, fbx: 3 }],
          [2, { ...DAZE, x: -1, lean: -3, hx: -1 }]
        ]
      }, D20 = meta75.duration, TURNS = 2, N6 = 5, STAR7 = ["...#...", "..###..", "#######", ".#####.", "..###..", ".##.##.", ".#...#."], BIRD = [!0, !1].map((up) => (dx, dy) => {
        let x = dx + 0.5, y = dy + 0.5;
        return dx === 3 && dy === -2 ? "e" : (dx === 5 || dx === 4) && dy === -1 ? dx === 5 ? "b" : "#" : (up ? [[-1, -1], [-1, -2], [-2, -2], [-2, -3], [-3, -3], [-3, -4]] : [[-1, 1], [-1, 2], [-2, 2], [-2, 3], [0, 1]]).some(([a, b]) => a === dx && b === dy) ? "w" : (x / 3.3) ** 2 + ((y - 0.6) / 1.9) ** 2 <= 1 || (x - 2.8) ** 2 + (y + 1.2) ** 2 <= 1.7 ** 2 || dx === -4 && (dy === -1 || dy === 0) || dx === -5 && dy === -1 ? "#" : "";
      }), STAR = shaped.bind(null, starShape(0.44));
    }
  });

  // src/fx/status/petrified.js
  var petrified_exports = {};
  __export(petrified_exports, {
    act: () => act28,
    actorAlpha: () => actorAlpha5,
    create: () => create45,
    meta: () => meta76
  });
  function create45(o) {
    let C = fit(o.palette, 8), a = o.actor, S = shape(a), H3 = S.h, R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [C[7], C[6], C[5], C[4]] }), bits = new Bits({ ground: floor }), lights = new Lights(), front = (mx) => level3(t) + 0.06 * tileFbm(mx * 0.4, 0.5, 0, 0, o.seed, 2), stone6 = S.body.map(([x, y]) => {
      let tone = clamp((luma(colorAt(a, x, y)) - 0.06) / 0.78), mottle = tileFbm(x * 0.32, y * 0.32, 0, 0, o.seed + 5, 2), i = 1 + Math.round(tone * 4.6 + mottle * 1.1);
      return !S.on(x - 1, y) || !S.on(x, y - 1) ? i += 1 : (!S.on(x + 1, y) || !S.on(x, y + 1)) && (i -= 1), { x, y, up: 1 - (y + 0.5) / H3, c: C[clamp(i, 1, 6)] };
    }), cracks5 = [], ox = Math.round(S.w * 0.55), oy = Math.round(H3 * 0.42), walk3 = (x, y, ang, len2) => {
      let pts = [[x, y]];
      for (let s = 0; s < len2 && (ang += R6.range(-0.55, 0.55), x += Math.cos(ang) * R6.range(1.4, 2.4), y += Math.sin(ang) * R6.range(1.4, 2.4), !!S.on(Math.floor(x), Math.floor(y))); s++)
        pts.push([x, y]), pts.length > 3 && cracks5.length < 16 && R6.chance(0.14) && walk3(x, y, ang + R6.sign() * R6.range(0.6, 1.2), len2 / 2);
      cracks5.push(pts);
    };
    for (let i = 0; i < 7; i++) walk3(ox, oy, i / 7 * TAU + R6.range(-0.3, 0.3), 14);
    let t = 0, broke = !1, settled = !1;
    return {
      update(dt) {
        if (t += dt, t < CREEP) {
          let rate = 60 * dt;
          for (let n = 0; n < rate; n++) {
            if (!R6.chance(0.5)) continue;
            let [mx, my] = S.body[R6.int(0, S.body.length - 1)];
            if (Math.abs(1 - (my + 0.5) / H3 - front(mx)) > 0.04) continue;
            let x = a.x + mx + 0.5, y = a.y + my, side = mx < S.w / 2 ? -1 : 1;
            ps.spawn(P.GRIT, x, y, side * R6.range(15, 60), -R6.range(30, 90), R6.range(0.6, 1.1), R6.pick([C[4], C[5], C[6]]), R6.chance(0.3) ? 2 : 1), R6.chance(0.3) && ps.spawn(P.DUST, x + side * 2, y, side * R6.range(10, 30), -R6.range(4, 14), R6.range(0.4, 0.7), C[4], R6.range(1.5, 2.6)), R6.chance(0.25) && ps.spawn(P.MOTE, x, y, side * R6.range(40, 90), -R6.range(20, 70), R6.range(0.15, 0.3), C[7], 0.5);
          }
        }
        if (!settled && t >= CREEP) {
          settled = !0, lights.add(0, a.y + H3 * 0.5, 34, C[6], 0.35, 0.3);
          for (let i = 0; i < 8; i++) ps.spawn(P.DUST, R6.range(-8, 8), -R6.range(0, 2), R6.sign() * R6.range(20, 50), -R6.range(2, 10), R6.range(0.6, 1), C[3], R6.range(2, 3.5));
        }
        if (t > CREEP + 0.2 && t < SHATTER2 && R6.chance(1.6 * dt)) {
          let [mx, my] = S.body[R6.int(0, S.body.length - 1)];
          S.on(mx, my + 1) || ps.spawn(P.GRIT, a.x + mx + 0.5, a.y + my + 1, R6.range(-8, 8), 0, R6.range(0.8, 1.2), C[3], 1);
        }
        if (t >= CRACK4 && t < SHATTER2 && R6.chance(12 * dt)) {
          let pts = R6.pick(cracks5), [x, y] = pts[Math.floor(R6.next() * pts.length)];
          ps.spawn(P.GRIT, a.x + x, a.y + y, R6.range(-40, 40), -R6.range(30, 80), R6.range(0.5, 0.9), R6.pick([C[5], C[6]]), 1);
        }
        if (!broke && t >= SHATTER2) {
          broke = !0, lights.add(0, a.y + H3 * 0.45, 46, C[6], 0.7, 0.5), lights.add(0, a.y + H3 * 0.45, 30, WHITE, 0.7, 0.12);
          let cx = a.x + ox, cy = a.y + oy;
          for (let i = 0; i < 18; i++) {
            let q = stone6[R6.int(0, stone6.length - 1)], x = a.x + q.x + 0.5, y = a.y + q.y + 0.5, dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, sp = R6.range(35, 110);
            bits.add({ kind: B.CHUNK, x, y, vx: dx / d * sp, vy: dy / d * sp * 0.6 - R6.range(60, 160), g: 1, drag: 0.4, bounce: 0.3, life: R6.range(1.1, 1.5), a: R6.range(0, TAU), va: R6.range(-14, 14), s: R6.range(1.3, 2.8), ramp: [C[0], C[2], C[3], C[5], C[6]] });
          }
          for (let q of stone6) {
            if (rand(q.x, q.y, 9) > 0.22) continue;
            let x = a.x + q.x + 0.5, y = a.y + q.y + 0.5, dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, sp = R6.range(40, 130);
            ps.spawn(P.GRIT, x, y, dx / d * sp, dy / d * sp * 0.6 - R6.range(40, 140), R6.range(0.9, 1.4), q.c, R6.chance(0.35) ? 2 : 1);
          }
          for (let i = 0; i < 16; i++) {
            let an = -Math.PI / 2 + R6.range(-1.4, 1.4), sp = R6.range(50, 120);
            bits.add({ kind: B.SHARD, x: cx + R6.range(-5, 5), y: cy + R6.range(-8, 8), vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, g: 0.8, drag: 0.6, bounce: 0.3, life: R6.range(0.9, 1.4), a: R6.range(0, TAU), va: R6.range(-18, 18), s: R6.range(1.5, 3), c: R6.pick([C[5], C[6], C[7]]) });
          }
          for (let i = 0; i < 6; i++) ps.spawn(P.STAR, cx + R6.range(-12, 12), cy + R6.range(-10, 14), R6.range(-10, 10), -R6.range(5, 20), R6.range(0.4, 0.9), C[6], R6.range(1, 2.2), R6.range(0.05, 0.4));
          for (let i = 0; i < 12; i++) {
            let side = R6.sign();
            ps.spawn(P.SMOKE, side * R6.range(0, 8), -R6.range(1, 6), side * R6.range(20, 60), -R6.range(4, 16), R6.range(0.9, 1.4), C[4], R6.range(2.4, 4), R6.range(0, 0.08), 0);
          }
          for (let i = 0; i < 6; i++) ps.spawn(P.SMOKE, R6.range(-6, 6), a.y + H3 * R6.range(0.3, 0.8), R6.range(-20, 20), -R6.range(10, 30), R6.range(1, 1.5), C[3], R6.range(3, 4.5), R6.range(0, 0.1), 0);
        }
        bits.update(dt);
        for (let b of bits.list)
          b.rest && !b.dusted && (b.dusted = !0, ps.spawn(P.DUST, b.x, -0.5, R6.range(-20, 20), -R6.range(2, 10), R6.range(0.3, 0.6), C[3], R6.range(1.2, 2.2)));
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        ps.draw(p, "back");
      },
      draw(p) {
        if (t < SHATTER2) {
          let sh = t >= CRACK4 ? Math.round(Math.sin(t * 90) * Math.min(1, (t - CRACK4) / (SHATTER2 - CRACK4)) * 1.2) : 0, white = t > SHATTER2 - 0.035;
          for (let q of stone6) {
            let f = front(q.x), d = f - q.up;
            if (d < 0) continue;
            let x = a.x + q.x + sh, y = a.y + q.y;
            d < 0.035 && t < CREEP ? p.px(x, y, rand(q.x, q.y, Math.floor(t * 24)) < 0.5 ? C[7] : C[6]) : d < 0.07 && t < CREEP ? p.px(x, y, C[5]) : p.px(x, y, white ? WHITE : q.c);
          }
          if (t < CREEP) for (let mx = 0; mx < S.w; mx += 2) {
            let my = Math.floor((1 - front(mx)) * H3);
            S.on(mx, my) && p.glow(a.x + mx, a.y + my, 5, C[6], 0.18);
          }
          if (t >= CRACK4) {
            let k = clamp((t - CRACK4) / 0.3);
            for (let pts of cracks5)
              for (let i = 0, n = Math.floor(pts.length * k); i < n; i++) {
                let [x, y] = pts[i], px = Math.floor(a.x + x) + sh, py = Math.floor(a.y + y), fresh = i > n - 3;
                p.px(px, py, fresh ? WHITE : C[0]), fresh || p.px(px, py - 1, C[6]);
              }
            p.glow(a.x + ox, a.y + oy, 12, C[6], 0.25 * k);
          }
        }
        bits.draw(p), ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta76, REACH_, act28, CREEP, CRACK4, SHATTER2, actorAlpha5, level3, init_petrified = __esm({
    "src/fx/status/petrified.js"() {
      init_core();
      init_lib8();
      meta76 = {
        name: "Petrified",
        desc: "Turned to stone: grey creeps up from the feet behind a crackling edge that spits grit, the statue holds, cracks run through it, and it bursts into tumbling chunks and dust.",
        tags: ["status", "stone", "petrify", "petrified", "debuff", "death", "one-shot"],
        size: [120, 74],
        origin: [60, 64],
        duration: 3.8,
        loop: !1,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: { palette: ["#16141c", "#2a2733", "#433f4d", "#5f5a6a", "#7d7889", "#a29dab", "#cdc8d2", "#f0edf3"], seed: 3 }
      }, REACH_ = { lean: 3, crouch: 2, fx: 14, fy: -29, bx: -4, by: -22, ffx: 8, fbx: -7, toeB: !0 }, act28 = {
        onBody: !0,
        poses: [[-0.16, READY], [0.08, { turn: 0.9, lean: -1, crouch: 2, fx: -8, fy: -24, bx: 9, by: -24 }, "snap"], [0.5, REACH_], [0.95, REACH_], [3.8, REACH_]],
        hits: [{ t: 2.2, stop: 0.08, shake: 0.24, amp: 2 }]
      }, CREEP = 0.95, CRACK4 = 1.75, SHATTER2 = 2.2, actorAlpha5 = (t) => t < CREEP ? 1 : 0, level3 = (t) => t >= CREEP ? 1.2 : 1.2 * smooth(0, CREEP, t) + 0.025 * Math.sin(t / CREEP * TAU * 3);
    }
  });

  // src/fx/status/slowed.js
  var slowed_exports = {};
  __export(slowed_exports, {
    act: () => act29,
    draw: () => draw32,
    drawBack: () => drawBack19,
    meta: () => meta77
  });
  function hand(t) {
    let k = Math.floor(t / STEP), ph = (t - k * STEP) / STEP, base = -Math.PI / 2 + k * TAU / TICKS, q = TAU / TICKS;
    if (ph < 0.62) return { ang: base, flash: 0, ph };
    if (ph < 0.72) return { ang: base - 0.1 * Math.sin((ph - 0.62) / 0.1 * Math.PI * 0.5), flash: 0, ph };
    let s = (ph - 0.72) / 0.28, snap = ease.outBack(clamp(s / 0.35), 2.2), wob = Math.exp(-s * 6) * Math.sin(s * 22) * 0.05;
    return { ang: base - 0.1 * (1 - clamp(s / 0.2)) + q * snap + wob, flash: Math.exp(-s * 5), ph };
  }
  function dial(p, C, cx, cy, t) {
    let h = hand(t), fl = Math.max(h.flash, afterglow(t));
    p.disc(cx, cy, R3 - 1, C[2], 0.2), p.disc(cx - R3 * 0.25, cy - R3 * 0.3, R3 * 0.5, C[4], 0.08), p.ring(cx, cy, R3 + 1, 1, C[0]), p.ring(cx, cy, R3, 2, (v, ang) => Math.sin(ang + 0.8) < -0.3 ? fl > 0.4 ? C[7] : C[6] : v > 0.5 ? C[5] : C[4]), p.ring(cx, cy, R3 - 3.5, 1, C[3], 0.6);
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      let a = i / 60 * TAU;
      p.dot(cx + Math.cos(a) * (R3 - 2.6), cy + Math.sin(a) * (R3 - 2.6), C[4], 0.8);
    }
    for (let i = 0; i < 12; i++) {
      let a = i / 12 * TAU, big = i % 3 === 0, r0 = R3 - 2.5, r1 = R3 - (big ? 6 : 4.5), c = Math.cos(a), s = Math.sin(a);
      p.line(cx + c * r0, cy + s * r0, cx + c * r1, cy + s * r1, big ? C[6] : C[5]);
    }
    let shud = h.flash * Math.sin(t * 60) * 0.06, ha = -Math.PI / 2 + 2.2 + shud;
    p.beam(cx, cy, cx + Math.cos(ha) * R3 * 0.5, cy + Math.sin(ha) * R3 * 0.5, 2.2, C[5]);
    let tx = cx + Math.cos(h.ang) * (R3 - 4), ty = cy + Math.sin(h.ang) * (R3 - 4);
    if (p.beam(cx, cy, tx, ty, 2.4, (u) => u > 0.8 ? C[7] : C[6]), p.circle(cx, cy, 2, C[6]), p.px(cx, cy, C[1]), p.glow(cx, cy, R3 + 8, C[4], 0.14 + 0.2 * fl), p.glowRing(cx, cy, R3, 3, C[5], 0.12 + 0.35 * fl), p.glow(tx, ty, 5, C[6], 0.3 + 0.3 * h.flash), h.flash > 0.02) {
      let s = 1 - h.flash;
      p.ring(cx, cy, R3 + 2 + 10 * s, 1, C[5], h.flash), p.glowRing(cx, cy, R3 + 2 + 10 * s, 3, C[4], 0.3 * h.flash);
    }
  }
  function drawBack19(p, t, o) {
    let C = fit(o.palette, 8), a = o.actor;
    dial(p, C, 0, a.y + 3, t);
    let lag = afterglow(t);
    lag > 0.05 && p.outline(a.mask, a.x - 1 - Math.round(2 * lag), a.y, C[5], 0.55 * lag);
  }
  function draw32(p, t, o) {
    let C = fit(o.palette, 8), a = o.actor, S = shape(a), fl = Math.max(hand(t).flash, afterglow(t));
    for (let [mx, my] of S.body) p.blend(a.x + mx, a.y + my, C[5], 0.08 + 0.12 * fl);
    cycle(t, D21, 6, o.seed + 3, (r) => r.range(1.6, 2.2), (age, life, r) => {
      let side = r.next() < 0.5 ? -1 : 1, x = side * r.range(10, 17), y0 = a.y + r.range(6, 22), v0 = r.range(18, 30), k = 1.1, yAt = (g) => y0 + v0 * (1 - Math.exp(-k * g)) / k + 4 * g, y = yAt(age), u = age / life;
      if (y < -1) {
        for (let [lag, al] of [[0.22, 0.35], [0.11, 0.6]]) age > lag && p.dot(x, yAt(age - lag), C[4], al);
        p.px(x, y - 1, C[5]), p.px(x, y, C[6]), p.px(x, y + 1, C[5]), p.px(x - 1, y + 1, C[4]), p.px(x - 1, y, C[7]), p.glow(x, y, 4, C[5], 0.3 * (1 - u));
      } else {
        let g = age;
        for (; g > 0 && yAt(g) >= -1; ) g -= 0.02;
        let s = clamp((age - g) / 0.9);
        if (s < 1) {
          let rx = 1 + 7 * Math.sqrt(s), c = s < 0.3 ? C[6] : C[5];
          for (let sd of [-1, 1]) p.line(x + sd * rx, -0.5, x + sd * (rx - 1.5), -0.5, c, (1 - s) * 1.2);
          for (let dx = -rx + 2; dx <= rx - 2; dx += 1) p.dot(x + dx, -1.5, C[4], (1 - s) * 0.5 * (1 - Math.abs(dx) / rx));
          p.glow(x, -1, 4 + rx, C[4], 0.12 * (1 - s));
        }
      }
    });
  }
  var meta77, S12, S2, act29, D21, TICKS, STEP, R3, afterglow, init_slowed = __esm({
    "src/fx/status/slowed.js"() {
      init_core();
      init_lib8();
      meta77 = {
        name: "Slowed",
        desc: "Dragged through time: a glassy clock dial behind the head ticks round in heavy steps, flashing with each, while drops sink in slow motion and spread slow rings.",
        tags: ["status", "slow", "time", "clock", "debuff", "loop"],
        size: [64, 76],
        origin: [32, 68],
        duration: 2.4,
        loop: !0,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: { palette: ["#081a24", "#0e3446", "#165a6e", "#2a8a9a", "#52bcc4", "#9ee6e0", "#e2fff8", "#ffffff"], seed: 7 }
      }, S12 = { turn: 0.3, lean: 3, crouch: 3, ffx: 11, ffy: -5, fbx: -9, fby: -5, toeB: !0, fx: -5, fy: -19, bx: 11, by: -26 }, S2 = { turn: 0.3, lean: 3, crouch: 3, ffx: -9, ffy: -5, toeF: !0, fbx: 11, fby: -5, fx: 13, fy: -26, bx: -4, by: -19 }, act29 = {
        onBody: !0,
        poses: [[0, S12], [1.2, S2], [2.4, S12]]
      }, D21 = meta77.duration, TICKS = 4, STEP = D21 / TICKS, R3 = 18;
      afterglow = (t) => {
        let s = ((t - STEP * 0.72) % STEP + STEP) % STEP;
        return Math.exp(-s * 4);
      };
    }
  });

  // src/fx/status/haste.js
  var haste_exports = {};
  __export(haste_exports, {
    act: () => act30,
    draw: () => draw33,
    drawBack: () => drawBack20,
    meta: () => meta78
  });
  function levels(a) {
    let l = LEVELS.get(a.mask);
    return l || (l = shape(a).body.map(([x, y]) => {
      let v = luma(colorAt(a, x, y));
      return [x, y, v < 0.24 ? 1 : v < 0.66 ? 2 : 3];
    }), LEVELS.set(a.mask, l), l);
  }
  function drawBack20(p, t, o) {
    let C = fit(o.palette, 7), a = o.actor, L = levels(a), S = shape(a), f = Math.floor(t * 30);
    for (let g = 3; g >= 1; g--) {
      let dx = -g * 14 - Math.round(rand(f >> 1, g, 3) * 1.6), every = [0, 3, 4, 0][g];
      if (p.outline(a.mask, a.x + dx, a.y, (mx, my) => g === 3 && (mx + my) % 2 ? 0 : C[5 - g]), every)
        for (let [x, y, v] of L)
          ((y + f) % every + every) % every || p.px(a.x + x + dx, a.y + y, C[Math.max(0, Math.min(6, 5 - g + v - 2))]);
      p.glow(a.x + a.w / 2 + dx, a.y + a.h * 0.45, 16, C[3], 0.12 * (1 - g * 0.25));
    }
    for (let [x, y, dir] of S.side) {
      if (dir > 0 || (y + (f >> 1)) % 3) continue;
      let len2 = 3 + Math.floor(rand(y, f >> 1, 5) * 6);
      for (let d = 1; d <= len2; d++) p.dot(a.x + x - d, a.y + y, d < 3 ? C[5] : C[4], 1 - d / (len2 + 1));
    }
    lines(p, C, a, t, o.seed, !1);
    let dust = hex(o.dust);
    cycle(t, D22, 12, o.seed + 5, (r) => r.range(0.45, 0.7), (age, life, r, i) => {
      let u = age / life, foot2 = i % 2 ? -7 : 3, x = foot2 + travel2(-r.range(50, 100), 0, 3.5, age), y = -1.5 - travel2(r.range(6, 18), 0, 3.5, age), rad = r.range(2.6, 4.6) * (0.6 + 1 * u), k = Math.pow(1 - u, 1.2) * Math.min(1, u * 10);
      p.disc(x, y, rad, dust, k * 0.5), p.disc(x + rad * 0.05, y + rad * 0.08, rad * 0.74, dust, k * 0.62), p.disc(x - rad * 0.22, y - rad * 0.3, rad * 0.5, C[5], k * 0.25);
    });
  }
  function lines(p, C, a, t, seed2, front) {
    cycle(t, D22, front ? 5 : 11, seed2 + (front ? 9 : 7), (r) => r.range(0.12, 0.26), (age, life, r) => {
      let u = age / life, y = a.y + r.range(2, a.h - 3), len2 = r.range(10, 26) * (front ? 0.7 : 1), x = r.range(-14, 4) - age * r.range(160, 240);
      for (let d = 0; d < len2; d++)
        d > len2 * 0.45 && d % 2 || p.dot(x + d, y, d < 2 ? C[6] : d < len2 * 0.4 ? C[5] : C[3], (1 - d / len2) * (1 - u) * (front ? 0.7 : 1.1));
      p.light(x, y, C[4], 0.4 * (1 - u));
    });
  }
  function draw33(p, t, o) {
    let C = fit(o.palette, 7), a = o.actor, S = shape(a);
    for (let [x, y, dir] of S.side) dir > 0 && rand(x, y, Math.floor(t * 15)) < 0.85 && p.px(a.x + x, a.y + y, rand(y, Math.floor(t * 15), 2) < 0.3 ? C[6] : C[5]);
    lines(p, C, a, t, seed(o), !0), p.glow(-6, a.y + a.h * 0.5, 22, C[3], 0.16), p.glow(0, a.y + a.h * 0.45, 30, C[3], 0.16), p.glow(a.x + a.w, a.y + a.h * 0.5, 10, C[5], 0.12 + 0.06 * Math.sin(t / D22 * TAU * 3));
  }
  var meta78, RUN2, R1, R22, R32, R4, act30, D22, LEVELS, seed, init_haste = __esm({
    "src/fx/status/haste.js"() {
      init_core();
      init_lib8();
      meta78 = {
        name: "Haste",
        desc: "Sped up: striped after-images stream out behind, speed lines whip past, dust kicks off the heels and the leading edge catches the wind. Faces right.",
        tags: ["status", "haste", "speed", "fast", "buff", "directional", "loop"],
        size: [100, 56],
        origin: [64, 48],
        duration: 1.2,
        loop: !0,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: { palette: ["#4c25ab", "#773ae4", "#5b6cff", "#5eb0ff", "#a3dcff", "#ccf6ff", "#ffffff"], dust: "#8a8090", seed: 4 }
      }, RUN2 = { turn: 0.25, lean: 4 }, R1 = { ...RUN2, crouch: 3, ffx: 12, ffy: -5, fbx: -10, fby: -8, toeB: !0, fx: -7, fy: -19, bx: 12, by: -27 }, R22 = { ...RUN2, crouch: 1, ffx: 4, ffy: -8, fbx: -1, fby: -5, fx: 3, fy: -18, bx: 5, by: -19 }, R32 = { ...RUN2, crouch: 3, ffx: -10, ffy: -8, toeF: !0, fbx: 12, fby: -5, fx: 14, fy: -27, bx: -5, by: -19 }, R4 = { ...RUN2, crouch: 1, ffx: -1, ffy: -5, fbx: 4, fby: -8, fx: 5, fy: -19, bx: 3, by: -18 }, act30 = {
        onBody: !0,
        follow: 0,
        poses: [[0, R1], [0.1, R22, "snap"], [0.2, R32, "snap"], [0.3, R4, "snap"], [0.4, R1, "snap"], [0.5, R22, "snap"], [0.6, R32, "snap"], [0.7, R4, "snap"], [0.8, R1, "snap"], [0.9, R22, "snap"], [1, R32, "snap"], [1.1, R4, "snap"], [1.2, R1, "snap"]]
      }, D22 = meta78.duration, LEVELS = /* @__PURE__ */ new WeakMap();
      seed = (o) => o.seed;
    }
  });

  // src/fx/status/rage.js
  var rage_exports = {};
  __export(rage_exports, {
    act: () => act31,
    actorAlpha: () => actorAlpha6,
    draw: () => draw34,
    drawBack: () => drawBack21,
    meta: () => meta79
  });
  function cracks3(a, seed2) {
    if (CRACKS2.has(seed2)) return CRACKS2.get(seed2);
    let S = shape(a), [fl, fr] = S.rows[S.h - 1], R6 = new Rng(seed2 * 31 + 7), out = [];
    for (let [x0, dir] of [[a.x + fl + 2, -1], [a.x + fr - 1, 1], [a.x + (fl + fr) / 2, -1], [a.x + (fl + fr) / 2 + 1, 1]]) {
      let x = x0, y = 0.5, pts = [[x, y]], n = R6.int(5, 9);
      for (let i = 0; i < n; i++)
        x += dir * R6.range(1.2, 2.4), y = clamp(y + R6.range(-0.9, 0.9), 0, 2.5), pts.push([x, y]), i > 1 && R6.chance(0.3) && out.push([[x, y], [x + dir * R6.range(1, 2), clamp(y + R6.sign() * R6.range(0.6, 1.4), 0, 3)]]);
      out.push(pts);
    }
    return CRACKS2.set(seed2, out), out;
  }
  function drawBack21(p, t, o) {
    let C = fit(o.palette, 8), Hh = fit(o.heat, 4), a = o.actor, b = beat3(t), stamp2 = Math.exp(-since3(t, LUB) / 0.18);
    cycle(t, D23, 9, o.seed + 2, (r) => r.range(0.7, 1.1), (age, life, r) => {
      let u = age / life, x0 = r.range(-16, 16), y = a.y + r.range(10, 40) - age * r.range(14, 22), len2 = r.range(6, 11), ph = r.range(0, TAU), k = Math.sin(Math.PI * u) * 0.55;
      for (let d = 0; d < len2; d++) p.dot(x0 - len2 / 2 + d, y + Math.round(Math.sin(d * 0.9 + ph + age * 12) * 0.8), d % 3 ? C[2] : C[1], k * (1 - Math.abs(d / len2 - 0.5) * 1.4));
    }), p.shade(-30, -4, 30, 8, (x, y, out) => {
      let d = Math.hypot(x / 28, (y - 0.5) / 4.5);
      d < 1 && (out.l = C[3], out.k = (0.2 + 0.3 * b) * (1 - d) * (1 - d));
    });
    let heat2 = 0.25 + 0.75 * stamp2;
    for (let pts of cracks3(a, o.seed))
      for (let i = 1; i < pts.length; i++) {
        let [x0, y0] = pts[i - 1], [x1, y1] = pts[i], far2 = i / pts.length;
        p.line(x0, y0, x1, y1, heat2 * (1 - far2 * 0.6) > 0.6 ? Hh[3] : heat2 * (1 - far2 * 0.5) > 0.35 ? Hh[2] : Hh[1]), i % 2 && p.glow(x1, y1, 4, Hh[2], 0.25 * heat2 * (1 - far2 * 0.5));
      }
  }
  function draw34(p, t, o) {
    let C = fit(o.palette, 8), Hh = fit(o.heat, 4), a = o.actor, S = shape(a), b = beat3(t), steam = hex(o.steam), shake = shaking(t), dx = shake ? Math.floor(t * 60) % 2 ? 1 : -1 : 0, dy = shake && since3(t, LUB - 0.02) < 0.06 ? -1 : 0;
    for (let [mx2, my2] of S.body) {
      let c = colorAt(a, mx2, my2);
      luma(c) > 0.55 && (c & 255) > (c >>> 16 & 255) + 30 ? p.px(a.x + mx2 + dx, a.y + my2 + dy, mix(c, C[4], 0.22 + 0.3 * b)) : shake && p.px(a.x + mx2 + dx, a.y + my2 + dy, c);
    }
    for (let e of eyes(a)) {
      let ex = a.x + dx, ey = a.y + dy, inner = (e.x0 + e.x1) / 2 < a.w / 2 ? 1 : -1;
      for (let [x, y] of e.px) p.px(ex + x, ey + y, y === e.y0 ? C[7] : y === e.y0 + 1 ? C[6] : C[4]);
      let xi = inner > 0 ? e.x1 : e.x0, xo = inner > 0 ? e.x0 : e.x1;
      p.px(ex + xo - inner, ey + e.y0 - 2, 4280227622), p.px(ex + xo, ey + e.y0 - 2, 4280227622), p.px(ex + xi, ey + e.y0 - 1, 4280227622), p.glow(ex + (e.x0 + e.x1 + 1) / 2, ey + e.y0 + 1, 5, C[5], 0.35 + 0.35 * b);
    }
    let big = pulse(t, LUB + 0.02, 0.05) > 0.35 || pulse(t, DUB + 0.02, 0.04) > 0.6, mx = a.x + a.w * 0.86 + dx, my = a.y + 3 + dy;
    icon(p, mx, my, 5, MARK3[big ? 1 : 0], [C[0], C[3], C[4], C[5]]), p.px(mx - (big ? 3 : 2), my - (big ? 3 : 2), C[6]), p.glow(mx, my, 8, C[4], 0.25 + 0.4 * b);
    for (let [at2, n, power] of [[LUB + 0.04, 7, 1], [DUB + 0.04, 4, 0.75]])
      for (let side of [-1, 1])
        for (let i = 0; i < n; i++) {
          let age = since3(t, at2 + i * 0.016), life = 0.22 + 0.12 * rand(i, side, 3);
          if (age >= life) continue;
          let u = age / life, ang = -Math.PI / 2 + side * (0.5 + 0.2 * rand(i, side, 5)), sp = (90 + 40 * rand(i, side, 7)) * power, x = side * a.w * 0.36 + Math.cos(ang) * travel2(sp, 0, 7, age), y = a.y + 3 + Math.sin(ang) * travel2(sp, 0, 7, age) - 8 * age, rad = (1 + 3.2 * Math.sqrt(u)) * (0.8 + 0.4 * rand(i, side, 9)), k = Math.min(1, u * 12) * Math.pow(1 - u, 2);
          p.disc(x, y, rad, steam, 0.7 * k), p.disc(x - rad * 0.2, y - rad * 0.25, rad * 0.6, 4294967295, 0.6 * k), u < 0.3 && p.dot(x, y, 4294967295, 1 - u / 0.3);
        }
    for (let [at2, n, len2] of [[LUB, 8, 7], [DUB, 6, 5]]) {
      let age = since3(t, at2);
      if (age > 0.2) continue;
      let k = age / 0.2;
      for (let i = 0; i < n; i++) {
        let ang = -Math.PI / 2 + ((i + 0.5) / n - 0.5) * 4.4, r0 = 15 + 6 * k, ca = Math.cos(ang), sa = Math.sin(ang), cx = 0, cy = a.y + 12, pts = [];
        for (let j = 0; j <= 3; j++) {
          let r = r0 + j / 3 * len2, off2 = j % 2 ? 1.3 : -0.4;
          pts.push([cx + ca * r - sa * off2, cy + sa * r + ca * off2]);
        }
        p.polyline(pts, (u) => u > 0.66 ? C[7] : u > 0.33 ? C[5] : C[4], 1.2 - k), p.glowLine(pts[0][0], pts[0][1], pts[3][0], pts[3][1], 3, C[4], 0.3 * (1 - k));
      }
    }
    let st = since3(t, LUB);
    for (let i = 0; i < 10; i++) {
      let life = 0.5 + 0.5 * rand(i, 11), age = st - 0.02 * rand(i, 12);
      if (age < 0 || age > life) continue;
      let x = (rand(i, 13) - 0.5) * 30 + Math.sin(age * 9 + i) * 1.5 * age, y = -1 + travel2(-(40 + 50 * rand(i, 14)), -20, 1.6, age);
      ember2(p, x, y, age / life, [Hh[3], Hh[2], Hh[1]], age + i);
    }
    for (let i = 0; i < 12; i++) {
      let vx = (rand(i, 21) - 0.5) * 90, vy = -(40 + 70 * rand(i, 22)), tt = st, x = (rand(i, 23) - 0.5) * 18 + vx * tt, y = -1 + vy * tt + 0.5 * G4 * tt * tt;
      tt > 0.6 || y > 0 || p.px(x, y, i % 3 ? C[2] : 4285161074);
    }
    p.glow(0, a.y + 10, 26, C[4], 0.12 + 0.4 * b), p.glow(0, a.y + 22, 34, C[3], 0.08 + 0.18 * b);
  }
  var meta79, SEETHE, THUD, act31, D23, LUB, DUB, G4, pulse, beat3, since3, shaking, actorAlpha6, MARK3, CRACKS2, init_rage = __esm({
    "src/fx/status/rage.js"() {
      init_core();
      init_lib8();
      meta79 = {
        name: "Rage",
        desc: "Seething: the body judders on every heartbeat, an anger mark throbs at the temple, eyes burn, steam jets off the head, stress lines flash out and the floor cracks hot underfoot.",
        tags: ["status", "rage", "berserk", "anger", "buff", "loop"],
        size: [80, 80],
        origin: [40, 70],
        duration: 1.2,
        loop: !0,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: {
          palette: ["#1a0208", "#4a0612", "#8a0c1c", "#c81828", "#ff3040", "#ff7a7a", "#ffc8c8", "#ffffff"],
          heat: ["#5a0a0a", "#c8281a", "#ff7a2a", "#ffd27a"],
          steam: "#f2e8ee",
          seed: 6
        }
      }, SEETHE = { turn: 1, crouch: 4, fx: -13, fy: -19, bx: 13, by: -19, ffx: -8, fbx: 9 }, THUD = { ...SEETHE, crouch: 6, fy: -23, by: -23 }, act31 = {
        onBody: !0,
        poses: [[0, SEETHE], [0.05, THUD, "snap"], [0.17, SEETHE, "snap"], [0.29, { ...THUD, crouch: 5 }, "snap"], [0.4, SEETHE, "snap"], [1.2, SEETHE]]
      }, D23 = meta79.duration, LUB = 0.05, DUB = 0.29, G4 = 760, pulse = (t, at2, w = 0.06) => Math.exp(-(((((t - at2) % D23 + D23 + D23 / 2) % D23 - D23 / 2) / w) ** 2)), beat3 = (t) => pulse(t, LUB) + 0.65 * pulse(t, DUB), since3 = (t, at2) => ((t - at2) % D23 + D23) % D23, shaking = (t) => since3(t, LUB - 0.02) < 0.13 || since3(t, DUB - 0.02) < 0.09, actorAlpha6 = (t) => shaking(t) ? 0 : 1, MARK3 = [
        bitmap(["..#.#..", "..#.#..", "##...##", ".......", "##...##", "..#.#..", "..#.#.."]),
        bitmap(["...#.#...", "...#.#...", "..##.##..", "###...###", ".........", "###...###", "..##.##..", "...#.#...", "...#.#..."])
      ], CRACKS2 = /* @__PURE__ */ new Map();
    }
  });

  // src/fx/arcane/_lib.js
  function mote(p, x, y, vx, vy, c, size = 1, k = 1, glow = 0.4) {
    let sp = Math.hypot(vx, vy) || 1, ux = vx / sp, uy = vy / sp, len2 = Math.min(16, 0.5 + sp * 0.026) * size, a = k < 0.35 ? k / 0.35 : 1;
    len2 > 1.2 && p.line(x - ux * len2, y - uy * len2, x - ux * len2 * 0.35, y - uy * len2 * 0.35, scale(c, 0.55), a), p.line(x - ux * len2 * 0.4, y - uy * len2 * 0.4, x, y, c, a), glow > 0 && p.glow(x, y, 2.5 + size, c, glow * k);
  }
  function floorRing2(p, cx, cy, r, sy, c, a = 1, keep2 = null) {
    if (r < 0.5) return;
    let fc = typeof c == "function", fa = typeof a == "function", ry = r * sy;
    p.shade(cx - r - 1, cy - ry - 1, cx + r + 1, cy + ry + 1, (x, y, o) => {
      let nx = (x - cx) / r, ny = (y - cy) / Math.max(0.3, ry), d = Math.hypot(nx, ny);
      if (d < 1e-6) return;
      let g = Math.hypot(nx / r, ny / Math.max(0.3, ry)) / d;
      if (Math.abs(d - 1) / g > 0.5) return;
      let ang = Math.atan2(ny, nx);
      keep2 && !keep2(ang) || (o.c = fc ? c(ang) : c, o.a = fa ? a(ang) : a);
    });
  }
  function glyph(p, i, x, y, c, a = 1, under = 0) {
    let g = GLYPHS[(i % GLYPHS.length + GLYPHS.length) % GLYPHS.length], X = Math.round(x) - 1, Y3 = Math.round(y) - g.length + 1;
    under && p.sprite(g, {}, X, Y3 + 1, { tint: under, a }), p.sprite(g, {}, X, Y3, { tint: c, a });
  }
  function sigil2(p, i, x, y, c, a = 1, edge = 0) {
    let g = SIGILS[(i % SIGILS.length + SIGILS.length) % SIGILS.length], X = Math.round(x) - 2, Y3 = Math.round(y) - 3;
    if (edge) for (let [dx, dy] of CROSS4) p.sprite(g, {}, X + dx, Y3 + dy, { tint: edge, a });
    p.sprite(g, {}, X, Y3, { tint: c, a });
  }
  function shades(A) {
    let s = new Uint8Array(A.w * A.h);
    for (let i = 0; i < s.length; i++) A.mask.data[i] && (s[i] = A.pixels ? luma(A.pixels[i]) < 0.24 ? 1 : luma(A.pixels[i]) < 0.62 ? 2 : 3 : 2);
    return s;
  }
  function squeezed(p, A, sh, sx, body4, edge, a = 1, dx = 0) {
    if (sx <= 0.02) return;
    let cx = A.x + A.w / 2, half = A.w / 2 + 1;
    for (let y = 0; y < A.h; y++)
      for (let x = Math.floor(cx - half * sx); x <= Math.ceil(cx + half * sx); x++) {
        let i = Math.round(cx + (x + 0.5 - cx) / sx - 0.5) - A.x, v = i < 0 || i >= A.w ? 0 : sh[y * A.w + i];
        v && p.dot(x + dx, A.y + y, v === 1 ? edge : body4, a);
      }
  }
  var BAYER2, CROSS4, GLYPHS, SIGILS, init_lib13 = __esm({
    "src/fx/arcane/_lib.js"() {
      init_core();
      BAYER2 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16), CROSS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      GLYPHS = [
        [".#.", "#.#", ".#.", ".#.", "#.#"],
        ["#.#", "#.#", ".#.", "#.#", "#.#"],
        ["##.", "#.#", "##.", "#..", "#.."],
        ["#..", "#.#", "###", "#.#", "..#"],
        [".##", "#..", ".#.", "..#", "##."],
        ["###", ".#.", "###", ".#.", ".#."],
        ["#.#", "###", "#.#", "..#", "..#"],
        [".#.", ".##", ".#.", "##.", ".#."]
      ];
      SIGILS = [
        ["..#..", ".#.#.", "#.#.#", "..#..", ".###.", "..#..", ".#.#."],
        ["#...#", ".#.#.", "..#..", ".###.", "..#..", ".#.#.", "#...#"],
        ["#....", "##...", "#.#..", "#..#.", "#.#..", "##...", "#...."],
        ["..#..", "#.#.#", ".###.", "..#..", "..#..", ".#.#.", "#...#"],
        ["#.#.#", "#.#.#", "#####", "..#..", "..#..", "..#..", ".###."],
        ["#...#", "##.##", "#.#.#", "#...#", "#.#.#", "##.##", "#...#"],
        ["..#..", ".#.#.", "#...#", ".#.#.", "..#..", "..#..", "..#.."],
        ["#..#.", "#.#..", "##...", "#....", "##...", "#.#..", "#..#."]
      ];
    }
  });

  // src/fx/arcane/mana-burst.js
  var mana_burst_exports = {};
  __export(mana_burst_exports, {
    create: () => create46,
    meta: () => meta80
  });
  function create46(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), ps = new Particles({ rng: R6, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights(), runes = Array.from({ length: N7 }, (_, i) => {
      let a = i / N7 * TAU + R6.range(-0.25, 0.25) - Math.PI / 2, sp = R6.range(150, 210);
      return { g: i, x: 0, y: CY7, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * (Math.sin(a) > 0 ? 0.42 : 0.85), pop: GATHER + 0.42 + i * 0.065 + R6.range(0, 0.05), popped: !1, ph: R6.range(0, TAU) };
    }), pops = [], t = 0, released = !1;
    return {
      update(dt) {
        if (t += dt, t < GATHER - 0.03)
          for (let i = 0; i < 2; i++) {
            let a = R6.range(0, TAU), D25 = R6.range(24, 52), T2 = R6.range(0.12, 0.18), v = D25 * 3 / (Math.exp(3 * T2) - 1), x = Math.cos(a) * D25, y = Math.min(-2, CY7 + Math.sin(a) * D25 * 0.85), l = Math.hypot(x, y - CY7) || 1;
            ps.spawn(P.STREAK, x, y, -x / l * v, (CY7 - y) / l * v, T2, R6.chance(0.5) ? C[6] : C[5]);
          }
        if (t >= GATHER && !released) {
          released = !0, lights.add(0, CY7 - 12, 96, C[5], 1, 0.5), lights.add(0, CY7, 40, WHITE, 0.9, 0.1);
          for (let i = 0; i < 96; i++) {
            let a = R6.range(0, TAU), sp = R6.range(100, 250), dn = Math.sin(a) > 0 ? 0.45 : 1;
            ps.spawn(R6.chance(0.65) ? P.MOTE : P.STAR, 0, CY7, Math.cos(a) * sp, Math.sin(a) * sp * dn, R6.range(0.25, 0.55), R6.pick([WHITE, C[6], C[5]]), R6.range(0.8, 1.8));
          }
          for (let i = 0; i < 20; i++) {
            let a = R6.range(0, TAU), sp = R6.range(130, 280);
            ps.spawn(P.SPARK, 0, CY7, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.2, 0.45));
          }
        }
        if (released) {
          for (let r of runes)
            if (!r.popped && (r.vx -= r.vx * 4.2 * dt, r.vy -= r.vy * 4.2 * dt + 8 * dt, r.x += r.vx * dt, r.y += r.vy * dt, R6.chance(0.35) && ps.spawn(P.MOTE, r.x + R6.range(-1.5, 1.5), r.y, r.vx * 0.2 + R6.range(-10, 10), r.vy * 0.2 - R6.range(5, 25), R6.range(0.2, 0.4), C[5], 0.5), t >= r.pop)) {
              r.popped = !0, pops.push({ t, x: r.x, y: r.y }), lights.add(r.x, r.y, 34, C[5], 0.9, 0.22), lights.add(r.x, r.y, 12, WHITE, 0.8, 0.06);
              for (let i = 0; i < 9; i++) {
                let a = R6.range(0, TAU), sp = R6.range(70, 200);
                ps.spawn(P.SPARK, r.x, r.y, Math.cos(a) * sp, Math.sin(a) * sp - 40, R6.range(0.15, 0.4));
              }
              for (let i = 0; i < 5; i++) {
                let a = R6.range(0, TAU), sp = R6.range(20, 80);
                ps.spawn(i % 2 ? P.STAR : P.MOTE, r.x, r.y, Math.cos(a) * sp, Math.sin(a) * sp - 20, R6.range(0.3, 0.6), R6.pick([WHITE, C[6]]), R6.range(0.8, 1.6));
              }
            }
        }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let k = t < GATHER ? 0.4 * (t / GATHER) : Math.max(0, 1 - (t - GATHER) / 1.1);
        k > 0 && p.glow(0, -1, 50, C[4], 0.3 * k);
      },
      draw(p) {
        if (t < GATHER) {
          let k = t / GATHER, r = 1 + 3.5 * k * k;
          p.circle(0, CY7, r + 1.2, C[4]), p.circle(0, CY7, r, C[6]), p.circle(0, CY7, r * 0.5, WHITE), p.glow(0, CY7, 10 + 20 * k, C[5], 0.4 + 0.4 * k);
          let q = clamp((t - GATHER * 0.35) / (GATHER * 0.65));
          q > 0 && q < 1 && p.ring(0, CY7, r + 2 + 16 * (1 - ease.outCubic(q)), 1, q > 0.6 ? WHITE : C[6], 1 - q * 0.5);
        } else {
          let q = (t - GATHER) / 0.6;
          if (q < 1) {
            let e = ease.outCubic(q);
            q < 0.12 && (p.circle(0, CY7, 12 * (1 - q / 0.12) + 2, C[5]), p.circle(0, CY7, 12 * (1 - q / 0.12), WHITE)), q < 0.32 && flare(p, 0, CY7, 30 * (1 - q / 0.32) + 4, 1 - q / 0.32, C), p.ring(0, CY7, 4 + 62 * e, Math.max(1, 5 * (1 - q)), q < 0.2 ? WHITE : C[6], (v, ang) => CY7 + Math.sin(ang) * (4 + 62 * e) > 0 ? 0 : 1.2 - q), p.ring(0, CY7, 2 + 38 * ease.outCubic(Math.min(1, q * 1.4)), Math.max(1, 2 * (1 - q)), C[5], (v, ang) => CY7 + Math.sin(ang) * 40 > 0 ? 0 : 1 - q), p.glow(0, CY7, 60 * (0.4 + 0.6 * e), C[5], 0.9 * (1 - q));
          }
        }
        for (let r of runes) {
          if (!released || r.popped) continue;
          let left = r.pop - t, hot = t - GATHER < 0.08 || left < 0.06, bob = Math.sin(t * 9 + r.ph) * 0.6;
          sigil2(p, r.g, r.x, r.y + bob, hot ? WHITE : C[6], 1, hot ? C[4] : C[3]), p.glow(r.x, r.y + bob, 10, C[5], hot ? 0.7 : 0.35), left < 0.06 && sparkle(p, r.x, r.y + bob, 3 + 4 * (1 - left / 0.06), C[6], C[5], 0.5);
        }
        for (let q of pops) {
          let k = (t - q.t) / 0.32;
          k >= 1 || (k < 0.35 && flare(p, q.x, q.y, 11 * (1 - k / 0.35) + 2, 1 - k / 0.35, C), p.ring(q.x, q.y, 2 + 11 * ease.outCubic(k), Math.max(1, 2 * (1 - k)), k < 0.3 ? WHITE : C[6], 1.15 - k));
        }
        ps.draw(p), lights.draw(p);
      }
    };
  }
  var CY7, GATHER, N7, meta80, init_mana_burst = __esm({
    "src/fx/arcane/mana-burst.js"() {
      init_core();
      init_lib13();
      CY7 = -28, GATHER = 0.22, N7 = 9, meta80 = {
        name: "Mana burst",
        desc: "Energy rushes into a point and blows out in a white flash and rings, flinging glowing runes that flare and pop into sparks one after another.",
        tags: ["arcane", "burst", "mana", "rune", "nova", "magic", "ground", "one-shot"],
        size: [208, 150],
        origin: [104, 124],
        duration: 1.8,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: PAL.arcane, seed: 9 }
      };
    }
  });

  // src/fx/arcane/blink-out.js
  var blink_out_exports = {};
  __export(blink_out_exports, {
    act: () => act32,
    actorAlpha: () => actorAlpha7,
    create: () => create47,
    meta: () => meta81
  });
  function create47(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), A = o.actor, sh = shades(A), ps = new Particles({ rng: R6, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights(), mx = A.x + A.w / 2, my = A.y + A.h * 0.55, COLS = [WHITE, C[6], C[6], C[5], C[4]], inside = (x, y) => x >= 0 && y >= 0 && x < A.w && y < A.h && A.mask.data[y * A.w + x], t = 0, out = !1, popped = !1;
    return {
      update(dt) {
        if (t += dt, t < OUT3 - 0.04 && R6.chance(0.7)) {
          let a = R6.range(0, TAU), D25 = R6.range(22, 44), T2 = R6.range(0.12, 0.18), v = D25 * 3 / (Math.exp(3 * T2) - 1), x = mx + Math.cos(a) * D25, y = Math.min(-2, my + Math.sin(a) * D25), l = Math.hypot(x - mx, y - my) || 1;
          ps.spawn(P.STREAK, x, y, (mx - x) / l * v, (my - y) / l * v, T2, R6.chance(0.5) ? C[6] : C[5]);
        }
        if (!out && t >= OUT3 && (out = !0, lights.add(mx, my - 6, 54, C[5], 0.9, 0.3), lights.add(mx, my, 26, WHITE, 0.8, 0.1)), !popped && t >= POP2) {
          popped = !0, lights.add(mx, my - 6, 58, C[5], 0.9, 0.35), lights.add(mx, my, 24, WHITE, 0.9, 0.08);
          for (let i = 0; i < 110; i++) {
            let y = A.y + R6.range(2, A.h - 2), s = R6.sign();
            ps.spawn(P.EMBER, mx + R6.range(-1, 1), y, s * R6.range(25, 105), R6.range(-70, 10), R6.range(0.5, 0.95), R6.pick(COLS), R6.chance(0.3) ? 2 : 1);
          }
          for (let i = 0; i < 18; i++) {
            let a = R6.range(0, TAU), sp = R6.range(80, 240);
            ps.spawn(P.SPARK, mx, my, Math.cos(a) * sp, Math.sin(a) * sp - 40, R6.range(0.2, 0.5));
          }
          for (let i = 0; i < 14; i++) {
            let a = R6.range(0, TAU), sp = R6.range(20, 110);
            ps.spawn(i % 2 ? P.STAR : P.MOTE, mx, my, Math.cos(a) * sp, Math.sin(a) * sp * 0.8 - 20, R6.range(0.4, 0.9), R6.pick([WHITE, C[6], C[5]]), R6.range(0.8, 1.8));
          }
        }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        if (t > POP2 && t < POP2 + 0.6) {
          let k2 = 0.5 * (1 - (t - POP2) / 0.6);
          for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) sh[y * A.w + x] && p.blend(A.x + x, A.y + y, sh[y * A.w + x] === 1 ? C[3] : C[4], k2);
        }
        let k = (t - POP2) / 0.5;
        k >= 0 && k < 1 && band(p, 0, 0, 4 + 30 * ease.outCubic(k), 0.2, Math.max(1, 3 * (1 - k)), 1.15 - k, [C[3], C[5], C[6], WHITE], (g) => Math.sin(g) < 0, k < 0.25), t < POP2 + 0.3 && p.glow(0, -1, 26, C[5], 0.3 * (t < OUT3 ? t / OUT3 : 1 - clamp((t - POP2) / 0.3)));
      },
      draw(p) {
        let f = Math.floor(t * 30);
        if (t < OUT3) {
          let k2 = t / OUT3;
          for (let y = 0; y < A.h; y++)
            for (let x = 0; x < A.w; x++)
              inside(x, y) ? p.light(A.x + x, A.y + y, C[6], k2 * k2 * (sh[y * A.w + x] === 1 ? 0.3 : 0.75)) : (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) && rand(x, y, f) < 0.25 + 0.65 * k2 && p.px(A.x + x, A.y + y, k2 > 0.6 && rand(x, y, 7) < 0.5 ? WHITE : C[6]);
          p.glow(mx, my, 30, C[5], 0.5 * k2);
        } else if (t < OUT3 + 0.05)
          squeezed(p, A, sh, 1, WHITE, C[6]), p.glow(mx, my, 40, C[5], 0.8);
        else if (t < OUT3 + SQUEEZE) {
          let q = ease.inCubic((t - OUT3 - 0.05) / (SQUEEZE - 0.05));
          squeezed(p, A, sh, 1 - q, WHITE, C[6]), p.glow(mx, my, 34, C[5], 0.8);
        } else if (t < POP2) {
          let q = (t - OUT3 - SQUEEZE) / COLLAPSE, hh = (A.h / 2 + 2) * (1 - ease.inQuad(q));
          for (let y = -hh - 3; y <= hh + 3; y++) p.dot(mx, my + y, Math.abs(y) < hh ? WHITE : C[6], Math.abs(y) < hh ? 1 : 0.7);
          if (hh > 4) for (let y = -hh * 0.7; y <= hh * 0.7; y++) p.dot(mx - 1, my + y, C[5], 0.6), p.dot(mx + 1, my + y, C[5], 0.6);
          p.glow(mx, my, 30, C[5], 0.9), p.glow(mx, my, 8, WHITE, 0.5);
        }
        if (t >= POP2 && t < POP2 + 0.22) {
          let q = (t - POP2) / 0.22;
          flare(p, mx, my, 22 * Math.pow(1 - q, 1.5) + 2, 1 - q, C), q < 0.3 && p.circle(mx, my, 4 * (1 - q / 0.3) + 1, WHITE);
        }
        let k = (t - POP2) / 0.5;
        k >= 0 && k < 1 && band(p, 0, 0, 4 + 30 * ease.outCubic(k), 0.2, Math.max(1, 3 * (1 - k)), 1.15 - k, [C[3], C[5], C[6], WHITE], (g) => Math.sin(g) >= 0, k < 0.25), t > POP2 && t < POP2 + 0.3 && sparkle(p, mx, my - 1, 3, C[6], C[5], 0.3 * (1 - (t - POP2) / 0.3)), ps.draw(p), lights.draw(p);
      }
    };
  }
  var OUT3, SQUEEZE, COLLAPSE, POP2, meta81, IN, act32, actorAlpha7, init_blink_out = __esm({
    "src/fx/arcane/blink-out.js"() {
      init_core();
      init_lib13();
      OUT3 = 0.32, SQUEEZE = 0.12, COLLAPSE = 0.08, POP2 = OUT3 + SQUEEZE + COLLAPSE, meta81 = {
        name: "Blink out",
        desc: "The caster crackles with gathering light, flashes white, squeezes into a line of light that collapses and pops away in sparks.",
        tags: ["arcane", "blink", "teleport", "vanish", "movement", "magic", "one-shot"],
        size: [136, 96],
        origin: [68, 80],
        duration: 1.6,
        loop: !1,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: { palette: PAL.arcane, seed: 11 }
      }, IN = { turn: 1, crouch: 4, fx: -2, fy: -25, bx: 2, by: -25, armsFront: !0, ffx: 0, fbx: 2 }, act32 = {
        onBody: !0,
        poses: [
          [-0.36, READY],
          [-0.1, IN],
          [0.2, { ...IN, crouch: 5 }],
          [0.32, { ...IN, crouch: 0 }, "snap"],
          [1.6, { ...IN, crouch: 0 }]
        ]
      }, actorAlpha7 = (t) => t < OUT3 ? 1 : 0;
    }
  });

  // src/fx/arcane/time-stop.js
  var time_stop_exports = {};
  __export(time_stop_exports, {
    create: () => create48,
    meta: () => meta82
  });
  function hand2(t) {
    let a = 0;
    for (let tk of TICKS2) t > tk && (a += ease.outBack(clamp((t - tk) / 0.07), 3));
    return -Math.PI / 2 + a * (TAU / 12);
  }
  function clockTime(t) {
    let s = 0;
    for (let u = 0; u < Math.min(t, FREEZE); u += 1 / 120) s += flow(u) / 120;
    return s;
  }
  function create48(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), G6 = C.map((c) => {
      let l = luma(c) * 255;
      return rgb(l * 0.92, l * 0.96, Math.min(255, l * 1.06));
    }), ps = new Particles({ rng: R6, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), bits = new Bits({ ground: () => 0 }), lights = new Lights(), motes2 = Array.from({ length: 14 }, (_, i) => ({ a: R6.range(0, TAU), r: RC2 + R6.range(5, 14), w: R6.range(1.4, 2.6) * (i % 2 ? 1 : -1), tilt: R6.range(-0.5, 0.5), c: R6.pick([WHITE, C[6], C[5]]) })), ix = R6.range(-6, 6), iy = R6.range(-6, 6), cracks5 = [], walk3 = (x, y, a, len2, depth) => {
      let pts = [[x, y]];
      for (let s = 0; s < len2 && (a += R6.range(-0.55, 0.55), x += Math.cos(a) * R6.range(1.6, 2.6), y += Math.sin(a) * R6.range(1.6, 2.6), !(Math.hypot(x, y) > RC2 - 0.5)); s++)
        pts.push([x, y]), depth < 1 && pts.length > 3 && R6.chance(0.14) && walk3(x, y, a + R6.sign() * R6.range(0.6, 1.1), len2 / 2, depth + 1);
      cracks5.push(pts);
    };
    for (let i = 0; i < 7; i++) walk3(ix, iy, i / 7 * TAU + R6.range(-0.3, 0.3), 16, 0);
    let t = 0, tc = 0, ticked = 0, shattered = !1, frozen = !1;
    function face(p, K2, s, cracked) {
      let cy = CY8, r = RC2 * s;
      if (r < 1) return;
      p.disc(0, cy, r, K2[1], (d) => 0.3 + 0.35 * d * d), p.ring(0, cy, r + 0.5, 1, K2[6]), p.ring(0, cy, r - 1.5, 1, K2[4]), p.ring(0, cy, r + 2, 1, K2[3], 0.6);
      for (let i = 0; i < 60; i++) {
        let a = i / 60 * TAU;
        if (i % 5) p.dot(Math.cos(a) * (r - 3.5), cy + Math.sin(a) * (r - 3.5), K2[4], 0.8);
        else {
          let q = i % 15 === 0, r0 = r - (q ? 8 : 6.5);
          p.line(Math.cos(a) * r0, cy + Math.sin(a) * r0, Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3), q ? K2[7] : K2[6]);
        }
      }
      p.ring(0, cy, r * 0.3, 1, K2[4], 0.8);
      let ha = -Math.PI / 2 + (hand2(t) + Math.PI / 2) / 12 + 0.9, sa = hand2(t) + (frozen ? Math.sin(t * 70) * 0.012 : 0);
      if (p.beam(0, cy, Math.cos(ha) * r * 0.48, cy + Math.sin(ha) * r * 0.48, 2.6, (u, v) => v < 0.5 ? K2[6] : K2[4]), p.line(-Math.cos(sa) * 5, cy - Math.sin(sa) * 5, Math.cos(sa) * (r - 4), cy + Math.sin(sa) * (r - 4), (u) => u > 0.75 ? K2[7] : K2[6]), p.line(-Math.cos(sa) * 5 + 0.5, cy - Math.sin(sa) * 5, -Math.cos(sa) * 2, cy - Math.sin(sa) * 2, K2[5]), p.circle(0, cy, 2.2, K2[5]), p.circle(0, cy, 1.2, K2[7]), cracked > 0)
        for (let pts of cracks5)
          for (let i = 0, n = Math.floor(pts.length * cracked); i < n; i++) {
            let [x, y] = pts[i], fresh = i > n - 3 && cracked < 1;
            p.px(x, cy + y, fresh ? WHITE : K2[7]), fresh || p.px(x, cy + y - 1, K2[2]);
          }
    }
    return {
      update(dt) {
        for (t += dt, tc = clockTime(t); ticked < TICKS2.length && t >= TICKS2[ticked]; ) {
          ticked++;
          let a = hand2(t + 0.1);
          lights.add(Math.cos(a) * (RC2 - 4), CY8 + Math.sin(a) * (RC2 - 4), 22, C[6], 0.6, 0.12);
          for (let i = 0; i < 3; i++) ps.spawn(P.STAR, Math.cos(a) * (RC2 + 1), CY8 + Math.sin(a) * (RC2 + 1), Math.cos(a) * 30 + R6.range(-15, 15), Math.sin(a) * 30 + R6.range(-15, 15), R6.range(0.2, 0.4), R6.pick([WHITE, C[6]]), R6.range(0.7, 1.3));
        }
        if (!frozen && t >= FREEZE && (frozen = !0, lights.add(0, CY8, 70, WHITE, 0.7, 0.2)), !shattered && t >= SHATTER3) {
          shattered = !0, lights.add(0, CY8, 80, WHITE, 0.8, 0.16), lights.add(0, CY8, 100, C[5], 0.6, 0.6);
          for (let i = 0; i < 64; i++) {
            let a = R6.range(0, TAU), d = R6.range(0, RC2), x = Math.cos(a) * d, y = CY8 + Math.sin(a) * d, sp = R6.range(40, 140), dx = x - ix, dy = y - CY8 - iy, l = Math.hypot(dx, dy) || 1;
            bits.add({ kind: B.SHARD, x, y, vx: dx / l * sp + R6.range(-25, 25), vy: dy / l * sp * 0.7 - R6.range(40, 120), g: 0.9, drag: 0.5, bounce: 0.25, life: R6.range(0.8, 1.15), a: R6.range(0, TAU), va: R6.range(-22, 22), s: R6.range(1.5, 3.6), c: R6.pick([G6[7], G6[6], G6[6], G6[5]]) });
          }
          for (let i = 0; i < 10; i++) {
            let a = R6.range(0, TAU), sp = R6.range(40, 110);
            bits.add({ kind: B.CHUNK, x: Math.cos(a) * RC2 * 0.6, y: CY8 + Math.sin(a) * RC2 * 0.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - R6.range(60, 130), g: 1, drag: 0.4, bounce: 0.3, life: R6.range(0.9, 1.15), a: R6.range(0, TAU), va: R6.range(-14, 14), s: R6.range(1.6, 3), ramp: [G6[1], G6[3], G6[4], G6[6], G6[7]] });
          }
          for (let i = 0; i < 26; i++) {
            let a = R6.range(0, TAU), sp = R6.range(30, 110);
            ps.spawn(i % 2 ? P.STAR : P.MOTE, 0, CY8, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.4, 0.8), R6.pick([WHITE, C[6], C[5]]), R6.range(0.8, 1.8));
          }
          for (let i = 0; i < 18; i++) {
            let a = R6.range(0, TAU), sp = R6.range(90, 200);
            ps.spawn(P.SPARK, 0, CY8, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.2, 0.45));
          }
          for (let i = 0; i < 12; i++) {
            let a = R6.range(0, TAU), d = R6.range(0, RC2 * 0.8);
            ps.spawn(P.VAPOUR, Math.cos(a) * d, CY8 + Math.sin(a) * d, Math.cos(a) * R6.range(10, 40), Math.sin(a) * R6.range(10, 30) - R6.range(5, 20), R6.range(0.6, 1), R6.chance(0.5) ? G6[5] : C[4], R6.range(3, 6));
          }
        }
        bits.update(dt), ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let k = smooth(0, OPEN6, t) * (1 - smooth(SHATTER3, SHATTER3 + 0.5, t)), cold = t >= FREEZE;
        if (k > 0 && p.glow(0, -1, 40, cold ? G6[5] : C[4], 0.25 * k), t < SHATTER3) for (let m of motes2) drawMote(p, m, !0);
      },
      draw(p) {
        let cold = t >= FREEZE, s = t < OPEN6 ? ease.outBack(t / OPEN6, 2.6) : 1;
        if (t < SHATTER3) {
          let white = t >= FREEZE && t < FREEZE + 0.06 || t >= SHATTER3 - 0.05;
          face(p, white ? G6.map(() => WHITE) : cold ? G6 : C, s, clamp((t - CRACK5) / 0.18)), p.glow(0, CY8, RC2 * 1.9, cold ? G6[5] : C[4], 0.32 * s), p.glowRing(0, CY8, RC2, 7, cold ? G6[6] : C[5], 0.28 * s);
          for (let m of motes2) drawMote(p, m, !1);
        }
        if (t < 0.35) {
          let q = t / 0.35;
          p.ring(0, CY8, RC2 * (0.4 + 1.2 * ease.outCubic(q)), Math.max(1, 3 * (1 - q)), q < 0.3 ? WHITE : C[6], 1.2 - q), q < 0.5 && flare(p, 0, CY8, 26 * (1 - q * 2) + 2, 1 - q * 2, C);
        }
        if (t < SHATTER3)
          for (let tk of TICKS2) {
            if (t < tk) continue;
            let q = (tc - clockTime(tk)) / 0.32;
            q >= 1 || p.ring(0, CY8, RC2 + 3 + 24 * ease.outCubic(q), 1, cold ? G6[5] : C[5], (cold ? 0.6 : 0.8) * Math.pow(1 - q, 1.6));
          }
        if (t >= SHATTER3 && t < SHATTER3 + 0.2) {
          let q = (t - SHATTER3) / 0.2;
          flare(p, 0, CY8, 34 * (1 - q) + 2, 1 - q, C), p.ring(0, CY8, RC2 + 30 * ease.outCubic(q), Math.max(1, 3 * (1 - q)), WHITE, 1.2 - q);
        }
        bits.draw(p), ps.draw(p), lights.draw(p);
      }
    };
    function drawMote(p, m, back) {
      let a = m.a + m.w * tc, z = Math.sin(a);
      if (z < 0 !== back) return;
      let x = Math.cos(a) * m.r, y = CY8 + Math.cos(a) * m.r * m.tilt + z * m.r * 0.3, cold = t >= FREEZE, v = flow(t) * m.w, c = cold ? G6[6] : m.c;
      if (p.dot(x, y, c, back ? 0.6 : 1), Math.abs(v) > 0.2) for (let k = 1; k <= 3; k++) {
        let b = a - Math.sign(m.w) * k * 0.05 * Math.min(1, Math.abs(v));
        p.dot(Math.cos(b) * m.r, CY8 + Math.cos(b) * m.r * m.tilt + Math.sin(b) * m.r * 0.3, k < 2 ? C[5] : C[4], (back ? 0.5 : 0.9) * (1 - k / 4));
      }
      back || p.glow(x, y, 5, cold ? G6[6] : C[6], 0.3);
    }
  }
  var CY8, RC2, OPEN6, FREEZE, CRACK5, SHATTER3, TICKS2, meta82, flow, init_time_stop = __esm({
    "src/fx/arcane/time-stop.js"() {
      init_core();
      CY8 = -42, RC2 = 26, OPEN6 = 0.3, FREEZE = 1.75, CRACK5 = 2.2, SHATTER3 = 2.42, TICKS2 = [0.36, 0.46, 0.57, 0.7, 0.85, 1.03, 1.24, 1.49], meta82 = {
        name: "Time stop",
        desc: "A clock face springs open, ticks slower and slower, freezes drained of colour, cracks, then shatters into falling shards.",
        tags: ["arcane", "time", "clock", "freeze", "stop", "shatter", "magic", "one-shot"],
        size: [196, 136],
        origin: [98, 118],
        duration: 3.6,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: PAL.arcane, seed: 14 }
      };
      flow = (t) => t < OPEN6 ? 1 : Math.max(0, 1 - (t - OPEN6) / (FREEZE - OPEN6)) ** 1.6;
    }
  });

  // src/fx/arcane/star-fall.js
  var star_fall_exports = {};
  __export(star_fall_exports, {
    create: () => create49,
    meta: () => meta83
  });
  function create49(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), ps = new Particles({ rng: R6, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights(), xs = Array.from({ length: N8 }, (_, i) => -SPREAD4 + (i + R6.range(0.2, 0.8)) * 2 * SPREAD4 / N8);
    for (let i = N8 - 1; i > 0; i--) {
      let j = R6.int(0, i);
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    let stars = xs.map((x, i) => {
      let y = R6.range(-3, 2), h = H2 * R6.range(0.85, 1);
      return { x, y, sx: x - h * SLANT, sy: y - h, t0: 0.04 + i * 0.105 + R6.range(0, 0.05), T: R6.range(0.3, 0.4), landed: !1, big: R6.chance(0.35), ph: R6.range(0, TAU) };
    }), hits = [], t = 0, at2 = (s, tt) => {
      let q = clamp((tt - s.t0) / s.T), e = q * (0.35 + 0.65 * q);
      return [s.sx + (s.x - s.sx) * e, s.sy + (s.y - s.sy) * e, q];
    };
    function star3(p, s) {
      let [x, y, q] = at2(s, t), n = 20;
      for (let k = n; k >= 1; k--) {
        let [ax, ay] = at2(s, t - k * TRAIL2 / n), [bx, by] = at2(s, t - (k - 1) * TRAIL2 / n), u = k / n;
        if (t - k * TRAIL2 / n < s.t0) continue;
        let c = u < 0.15 ? WHITE : u < 0.4 ? C[6] : u < 0.7 ? C[5] : C[4];
        u < (s.big ? 0.55 : 0.35) && p.line(ax + 1, ay, bx + 1, by, u < 0.2 ? C[6] : C[5], 1.1 - u * 1.4), p.line(ax, ay, bx, by, c, 1.3 - u), k % 3 === 0 && p.glow(ax, ay, 7 * (1 - u) + 2, C[5], 0.3 * (1 - u));
      }
      return s.big ? flare(p, x, y, 7 + 1.5 * Math.sin(t * 40 + s.ph), 0.8, C) : sparkle(p, x, y, 3.5 + Math.sin(t * 40 + s.ph), C[6], C[5], 0.6), p.circle(x, y, s.big ? 1.6 : 1.1, WHITE), p.glow(x, y, s.big ? 18 : 13, C[5], 0.6), p.glow(x, y, 5, WHITE, 0.35), q;
    }
    function hit(p, h, far2) {
      let k = (t - h.t) / 0.45;
      k < 0 || k >= 1 || band(p, h.x, h.y, 3 + (h.big ? 22 : 16) * ease.outCubic(k), 0.26, Math.max(1, 2.5 * (1 - k)), 1.15 - k, [C[3], C[5], C[6], WHITE], (g) => Math.sin(g) < 0 === far2, k < 0.2);
    }
    return {
      update(dt) {
        t += dt;
        for (let s of stars) {
          if (t < s.t0 || s.landed) continue;
          let [x, y, q] = at2(s, t);
          if (R6.chance(0.55) && ps.spawn(P.STAR, x + R6.range(-1.5, 1.5), y + R6.range(-1.5, 1.5), R6.range(-12, 12), R6.range(-8, 4), R6.range(0.35, 0.7), R6.pick([WHITE, C[6], C[5]]), R6.chance(0.7) ? R6.range(0.4, 0.9) : R6.range(1.2, 1.8)), q >= 1) {
            s.landed = !0, hits.push({ x: s.x, y: s.y, t, big: s.big }), lights.add(s.x, s.y - 12, s.big ? 46 : 38, C[5], 0.9, 0.32), lights.add(s.x, s.y - 3, 16, WHITE, 0.8, 0.08);
            for (let i = 0; i < (s.big ? 14 : 9); i++) {
              let a = -Math.PI / 2 + R6.range(-1.35, 1.35), sp = R6.range(50, 150);
              ps.spawn(P.SPARK, s.x, Math.min(-1, s.y - 1), Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.2, 0.5));
            }
            for (let i = 0; i < 4; i++) ps.spawn(P.STAR, s.x + R6.range(-4, 4), s.y - R6.range(2, 8), R6.range(-15, 15), -R6.range(10, 35), R6.range(0.4, 0.8), R6.pick([WHITE, C[6]]), R6.range(0.8, 2));
          }
        }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let k = clamp(t / 0.3) * (1 - clamp((t - 1.7) / 0.7));
        if (k > 0) for (let x of [-36, 0, 36]) p.glow(x, -1, 40, C[4], 0.14 * k);
        for (let h of hits) hit(p, h, !0);
        for (let h of hits) {
          let k2 = 1 - (t - h.t) / 0.7;
          if (!(k2 <= 0)) {
            p.dot(h.x, h.y, k2 > 0.6 ? WHITE : C[6], k2 * 1.5);
            for (let dx of [-1, 1]) p.dot(h.x + dx, h.y, C[5], k2 * 1.2);
            p.glow(h.x, h.y - 1, 10, C[5], 0.35 * k2);
          }
        }
        ps.draw(p, "back");
      },
      draw(p) {
        for (let s of stars) t >= s.t0 && !s.landed && star3(p, s);
        for (let h of hits) {
          hit(p, h, !1);
          let k = (t - h.t) / 0.22;
          k < 0 || k >= 1 || (k < 0.35 && p.circle(h.x, h.y - 2, 5 * (1 - k / 0.35) + 1, WHITE), flare(p, h.x, h.y - 2, (h.big ? 16 : 12) * Math.pow(1 - k, 1.5) + 2, 1 - k, C));
        }
        ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var N8, SPREAD4, H2, SLANT, TRAIL2, meta83, init_star_fall = __esm({
    "src/fx/arcane/star-fall.js"() {
      init_core();
      N8 = 11, SPREAD4 = 46, H2 = 124, SLANT = 0.38, TRAIL2 = 0.17, meta83 = {
        name: "Star fall",
        desc: "Stars streak down on long trails across an area, each landing with a white flash, a ring across the floor and a kick of sparks.",
        tags: ["arcane", "star", "meteor", "rain", "aoe", "magic", "ground", "one-shot"],
        size: [232, 172],
        origin: [124, 150],
        duration: 2.5,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: PAL.arcane, seed: 13 }
      };
    }
  });

  // src/fx/arcane/rune-circle.js
  var rune_circle_exports = {};
  __export(rune_circle_exports, {
    draw: () => draw35,
    drawBack: () => drawBack22,
    meta: () => meta84
  });
  function circle(p, C, t, far2) {
    let ph = t / D24, spin = ph * TAU / 4, keep2 = far2 ? (g) => Math.sin(g) < 0 : (g) => Math.sin(g) >= 0, chase = ph * TAU * 2, lit = (g, w) => gap(g, chase) < w || gap(g, chase + Math.PI) < w, tone = (g, hi, lo) => Math.sin(g) < 0 ? lo : hi;
    floorRing2(p, 0, 0, R5, SY11, (g) => lit(g, 0.22) ? WHITE : lit(g, 0.5) ? C[6] : tone(g, C[6], C[5]), 1, keep2), floorRing2(p, 0, 0, RI2, SY11, (g) => tone(g, C[5], C[4]), 1, keep2), floorRing2(p, 0, 0, RC3, SY11, (g) => tone(g, C[6], C[5]), 1, keep2);
    for (let j = 0; j < 16; j++) {
      let g = spin + (j + 0.5) * TAU / 16;
      if (Math.sin(g) < 0 !== far2) continue;
      let [x, y] = at(g, R5 + 3.5), hot = lit(g, 0.3);
      if (p.px(x, y, hot ? WHITE : tone(g, j % 2 ? C[5] : C[6], C[4])), j % 2 === 0) for (let [dx, dy] of [[1, 0], [-1, 0]]) p.px(x + dx, y + dy, hot ? C[6] : tone(g, C[4], C[3]));
    }
    let pts = [0, 1, 2, 3].map((k) => at(-spin + k * TAU / 4 + Math.PI / 4, RI2));
    for (let k = 0; k < 4; k++) {
      let [ax, ay] = pts[k], [bx, by] = pts[(k + 1) % 4];
      if (ay < 0 != by < 0) {
        let u = ay / (ay - by), mx = ax + (bx - ax) * u;
        ay < 0 === far2 ? (bx = mx, by = 0) : (ax = mx, ay = 0);
      } else if (ay < 0 !== far2) continue;
      p.line(ax, ay, bx, by, far2 ? C[4] : C[5]);
    }
    let gs = [...Array(NR).keys()].map((k) => [k, spin + (k + 0.5) * TAU / NR]).filter(([, g]) => Math.sin(g) < 0 === far2);
    gs.sort((a, b) => Math.sin(a[1]) - Math.sin(b[1]));
    for (let [k, g] of gs) {
      let [x, y] = at(g, RR2), hot = lit(g, 0.2), bob = Math.sin(ph * TAU * 4 + 4 * g) * 0.5;
      glyph(p, [0, 3, 5][k % 3], x, y - 1 + bob, hot ? WHITE : far2 ? C[5] : C[6], 1, hot ? C[5] : far2 ? C[2] : C[3]), p.glow(x, y - 3, hot ? 10 : 6, C[5], hot ? 0.5 : far2 ? 0.12 : 0.22), p.glow(x, y, 5, C[4], 0.15);
    }
  }
  function motes(p, C, t, S, far2) {
    cycle(t, D24, 76, S * 5 + 1, (g) => g.range(1.1, 1.9), (age, life, r) => {
      let g0 = r.range(0, TAU), r0 = r.pick([R5, R5, RR2, RR2, RI2]), q = age / life, g = g0 + q * r.range(0.6, 1.4);
      if (Math.sin(g) < 0 !== far2) return;
      let rr = r0 * (1 - 0.35 * q), h = 2 + ease.outQuad(q) * r.range(26, 52), x = Math.cos(g) * rr, y = Math.sin(g) * rr * SY11 - h, a = Math.min(1, q * 5) * (1 - smooth(0.65, 1, q)), big = r.chance(0.2);
      mote(p, x, y, -Math.sin(g) * rr * 0.8, -36 * (1 - q) - 10, r.chance(0.3) ? WHITE : r.chance(0.6) ? C[6] : C[5], big ? 1.1 : r.range(0.55, 0.9), a, big ? 0.5 : 0.3);
    }), cycle(t, D24, 14, S * 5 + 2, 0.45, (age, life, r) => {
      let g = r.range(0, TAU);
      if (Math.sin(g) < 0 !== far2) return;
      let rr = r.range(8, R5), x = Math.cos(g) * rr, y = Math.sin(g) * rr * SY11 - r.range(6, 34), k = Math.sin(age / life * Math.PI);
      sparkle(p, x, y, 1 + 2.4 * k, C[6], C[5], 0.35 * k);
    });
  }
  function drawBack22(p, t, o) {
    let C = fit(o.palette, 8), pulse2 = 0.85 + 0.15 * Math.sin(t / D24 * TAU * 4);
    p.glow(0, 0, R5 * 1.4, C[4], 0.24 * pulse2);
    for (let s of [-1, 1]) p.glow(s * R5 * 0.55, 1, R5 * 0.7, C[5], 0.12 * pulse2);
    for (let h = 0; h < 66; h += 6) p.glow(0, -h, 26, C[4], 0.11 * pulse2 * (1 - h / 80));
    circle(p, C, t, !0), motes(p, C, t, o.seed, !0);
  }
  function draw35(p, t, o) {
    let C = fit(o.palette, 8), chase = t / D24 * TAU * 2;
    circle(p, C, t, !1), motes(p, C, t, o.seed, !1);
    for (let g of [chase, chase + Math.PI]) {
      let [x, y] = at(g, R5);
      sparkle(p, x, y, 2.5 + Math.sin(t * 30) * 0.8, C[6], C[5], 0.5), p.glow(x, y, 14, C[5], 0.4);
    }
  }
  var D24, R5, RR2, RI2, RC3, SY11, NR, meta84, at, gap, init_rune_circle = __esm({
    "src/fx/arcane/rune-circle.js"() {
      init_core();
      init_lib13();
      D24 = 4, R5 = 46, RR2 = 39, RI2 = 23, RC3 = 7, SY11 = 0.3, NR = 12, meta84 = {
        name: "Rune circle",
        desc: "A rune circle turns on the floor in perspective: a carousel of runes lit by chasing light, a turning square, ticks, motes rising off it.",
        tags: ["arcane", "rune", "circle", "magic", "aura", "ground", "loop"],
        size: [136, 100],
        origin: [68, 80],
        duration: D24,
        loop: !0,
        fps: 30,
        bg: "ground",
        options: { palette: PAL.arcane, seed: 8 }
      }, at = (g, r) => [Math.cos(g) * r, Math.sin(g) * r * SY11], gap = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    }
  });

  // src/fx/scifi/_lib.js
  function move(q, dt, age, ground) {
    switch (q.k) {
      case P.FIRE:
        q.vy -= 95 * dt, q.vx += Math.sin(age * 17 + q.seed) * 30 * dt, q.vx -= q.vx * 5 * dt, q.vy -= q.vy * 3.2 * dt;
        break;
      case P.GRIT: {
        q.vy += GRAVITY * dt, q.vx -= q.vx * 0.8 * dt;
        let g = ground(q.x), ny = q.y + q.vy * dt;
        q.x += q.vx * dt, q.vy > 0 && q.y <= g && ny >= g ? (q.y = g - 0.25, q.vy > 130 && rand(q.seed * 1e3, q.hops++) < 0.4 ? (q.vy = -q.vy * 0.25, q.vx = q.vx * 0.5) : (q.vx = q.vy = 0, q.life = Math.min(q.life, 0.5))) : q.y = ny;
        return;
      }
      case P.SPARK: {
        q.vy += GRAVITY * 0.45 * dt, q.vx -= q.vx * 2.2 * dt, q.vy -= q.vy * 2.2 * dt;
        let g = ground(q.x), ny = q.y + q.vy * dt;
        q.x += q.vx * dt, q.vy > 0 && q.y <= g && ny >= g ? (q.vy = -q.vy * 0.45, q.vx *= 0.7, q.y = g - 0.25) : q.y = ny;
        return;
      }
      case P.STREAK:
        q.vx += q.vx * 3 * dt, q.vy += q.vy * 3 * dt;
        break;
      case P.FLAKE:
        q.vx -= q.vx * 2.2 * dt, q.vy -= q.vy * 2.2 * dt - 35 * dt, q.x += Math.sin(age * 2.5 + q.seed) * 7 * dt;
        break;
      case P.EMBER:
        q.vy += (-30 + Math.sin(age * 3 + q.seed) * 20) * dt, q.vx += Math.cos(age * 2.3 + q.seed) * 45 * dt, q.vx -= q.vx * 1.6 * dt, q.vy -= q.vy * 1.6 * dt;
        break;
      case P.SMOKE: {
        let big = q.flag & PF.BIG;
        q.vy -= (big ? 23 : 16) * dt, q.vx += Math.sin(age * 1.3 + q.seed) * 8 * dt, q.vx -= q.vx * 1.6 * dt, q.vy -= q.vy * 1.2 * dt;
        break;
      }
      case P.MOTE:
        q.vx -= q.vx * 0.6 * dt, q.vy -= q.vy * 0.6 * dt;
        break;
      default: {
        let drag = SOFT2.has(q.k) ? 4 : 1.6;
        q.vx -= q.vx * drag * dt, q.vy -= q.vy * drag * dt + 5 * dt;
      }
    }
    q.x += q.vx * dt, q.y += q.vy * dt;
  }
  function flash(p, t, t0, x, y, r, c, k, life) {
    let a = t - t0;
    if (a < 0 || a >= life) return;
    let q = 1 - a / life;
    p.glow(x, y, r * (0.55 + 0.45 * q), c, k * q * q);
  }
  var SOFT2, STEP2, Ghosts, since4, init_lib14 = __esm({
    "src/fx/scifi/_lib.js"() {
      init_core();
      SOFT2 = /* @__PURE__ */ new Set([P.VAPOUR, P.DUST, P.SMOKE]), STEP2 = 1 / 240;
      Ghosts = class {
        constructor(period, opts = {}) {
          this.D = period, this.ground = opts.ground ?? (() => 1 / 0), this.box = opts.box ?? null, this.ps = new Particles({ ground: this.ground, sparks: opts.sparks, haze: opts.haze }), this.specs = [];
        }
        add(born, k, x, y, vx, vy, life, col = WHITE, size = 1, flag = 0) {
          let n = this.specs.length, D25 = this.D, seed2 = rand(n, 41) * 100;
          if (k === P.STAR) {
            let m = Math.ceil(8 * D25 / TAU), f = TAU * m / D25 - 8;
            f < 5 && (seed2 = f + 5 * Math.floor(rand(n, 43) * 19));
          }
          this.specs.push({ born: (born % D25 + D25) % D25, k, x, y, vx, vy, life, col: col ? hex(col) : 0, size, flag, seed: seed2 });
        }
        get count() {
          return this.specs.length;
        }
        /** The state of one particle `age` seconds after its birth, or null if it's gone. */
        state(s, age) {
          let q = { k: s.k, x: s.x, y: s.y, vx: s.vx, vy: s.vy, life: s.life, max: s.life, col: s.col, size: s.size, seed: s.seed, delay: 0, flag: s.flag, hops: 0 }, a = 0;
          for (; a < age - 1e-9; ) {
            let dt = Math.min(STEP2, age - a);
            if (move(q, dt, a, this.ground), a += dt, q.life -= dt, q.life <= 0) {
              if (q.k !== P.FIRE || !(q.flag & PF.SMOKES)) return null;
              let big = q.flag & PF.BIG, L = big ? 1.3 + rand(s.seed * 7, 1) : 0.8 + rand(s.seed * 7, 1) * 0.6;
              Object.assign(q, { k: P.SMOKE, vx: q.vx * 0.6, vy: q.vy * 0.6 - 6, life: L, max: L, col: 0, size: q.size * (big ? 0.85 : 0.7), flag: big ? PF.BIG : 0 });
            }
          }
          if (this.box) {
            let [x0, y0, x1, y1] = this.box;
            if (q.x < x0 || q.x > x1 || q.y < y0 || q.y > y1) return null;
          }
          return q;
        }
        at(t) {
          let D25 = this.D, list = [];
          for (let s of this.specs) {
            let span = s.k === P.FIRE && s.flag & PF.SMOKES ? s.life + 2.4 : s.life;
            for (let age = ((t - s.born) % D25 + D25) % D25; age < span; age += D25) {
              let q = this.state(s, age);
              q && list.push(q);
            }
          }
          return this.ps.list = list, this.ps.t = t, this.ps;
        }
      };
      since4 = (t, t0, D25) => ((t - t0) % D25 + D25) % D25;
    }
  });

  // src/fx/scifi/force-field.js
  var force_field_exports = {};
  __export(force_field_exports, {
    act: () => act33,
    draw: () => draw36,
    drawBack: () => drawBack23,
    meta: () => meta85
  });
  function cell(gx, gy) {
    let fq = S3 / 3 * gx - gy / 3, fr = 2 / 3 * gy, fs = -fq - fr, q = Math.round(fq), r = Math.round(fr), s = Math.round(fs), dq = Math.abs(q - fq), dr = Math.abs(r - fr), ds = Math.abs(s - fs);
    dq > dr && dq > ds ? q = -r - s : dr > ds && (r = -q - s);
    let hx = S3 * (q + r / 2), hy = 1.5 * r, dx = gx - hx, dy = gy - hy, ax = Math.abs(dx), e = Math.max(ax, Math.abs(ax / 2 + dy * S3 / 2), Math.abs(ax / 2 - dy * S3 / 2)) / (S3 / 2), k = Math.round((Math.atan2(dy, dx) - Math.PI / 6) / (Math.PI / 3)), ca = Math.PI / 6 + k * Math.PI / 3;
    return { q, r, hx, hy, e, corner: Math.hypot(dx - Math.cos(ca), dy - Math.sin(ca)) };
  }
  function project(R6, lon, lat) {
    let X = Math.cos(lat) * Math.sin(lon), Y3 = Math.sin(lat), Z = Math.cos(lat) * Math.cos(lon);
    return [R6 * X, -R6 * (Y3 * CA - Z * SA), Y3 * SA + Z * CA];
  }
  function shell(R6) {
    let g = shells.get(R6);
    if (g) return g;
    let near2 = [], far2 = [], N9 = Math.ceil(R6) + 1, W4 = 2 * N9 + 1, ids = [/* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()];
    for (let y = -N9; y <= Math.ceil(R6 * SA) + 1; y++)
      for (let x = -N9; x <= N9; x++) {
        let u = (x + 0.5) / R6, vy = -(y + 0.5) / R6, q = u * u + vy * vy;
        if (q > 1) continue;
        let vz = Math.sqrt(1 - q);
        for (let s of [1, -1]) {
          let Y3 = vy * CA + s * vz * SA, Z = -vy * SA + s * vz * CA;
          if (Y3 < 0) continue;
          let lon = Math.atan2(u, Z), lat = Math.asin(Math.min(1, Y3)), c = cell(lon * G5, lat * G5 * KY), id = c.q * 1e3 + c.r;
          (s > 0 ? near2 : far2).push({ x, y, X: u, Y: Y3, Z, lon, lat, q: c.q, r: c.r, id, e: c.e, corner: c.corner, rim: 1 - vz, sil: (1 - Math.sqrt(q)) * R6 }), ids[s > 0 ? 0 : 1].set((y + N9) * W4 + x + N9, id);
        }
      }
    return [near2, far2].forEach((list, i) => {
      let at2 = (x, y) => ids[i].get((y + N9) * W4 + x + N9);
      for (let q of list) {
        let r = at2(q.x + 1, q.y), d = at2(q.x, q.y + 1), l = at2(q.x - 1, q.y), u = at2(q.x, q.y - 1);
        q.seam = r !== void 0 && r !== q.id || d !== void 0 && d !== q.id, q.bevel = !q.seam && (l !== void 0 && l !== q.id || u !== void 0 && u !== q.id);
      }
    }), shells.set(R6, g = { near: near2, far: far2 }), g;
  }
  function cracks4(R6, seed2, s) {
    let key = `${R6}:${seed2}`;
    if (crackCache.has(key)) return crackCache.get(key);
    let rn = new Rng(seed2 * 13 + 5), out = [], toScreen = (path2, u0, u1) => {
      let pts = [];
      for (let i = 0; i < path2.length; i++) {
        let [lon, lat] = path2[i];
        if (lat < 0.03 || lat > 1.52 || Math.abs(lon) > 1.5) break;
        pts.push([...project(R6, lon, lat), u0 + (u1 - u0) * i / (path2.length - 1)]);
      }
      return pts;
    };
    for (let i = 0; i < 5; i++) {
      let a = i / 5 * TAU + rn.range(-0.35, 0.35), L = rn.range(0.42, 0.8), path2 = bolt(rn, s.lon, s.lat, s.lon + Math.cos(a) * L / Math.cos(s.lat), s.lat + Math.sin(a) * L, { jag: 0.2, depth: 4 });
      out.push(toScreen(path2, 0, 1));
      for (let f of forks(rn, path2, { count: rn.int(0, 2), len: L * 0.5, jag: 0.25, spread: 0.9 })) {
        let j = path2.findIndex((q) => q[0] === f[0][0] && q[1] === f[0][1]), u0 = Math.max(0, j) / (path2.length - 1);
        out.push(toScreen(f, u0, u0 + 0.5));
      }
    }
    return crackCache.set(key, out), out;
  }
  function ghosts(o, C, R6) {
    let key = `${R6}:${o.seed}:${o.sparks.join()}:${o.palette.join()}`;
    if (ghostCache.has(key)) return ghostCache.get(key);
    let W4 = meta85.size[0] - meta85.origin[0], rn = new Rng(o.seed), D25 = meta85.duration, g = new Ghosts(D25, { ground: () => 0, sparks: o.sparks, box: [-70, -80, W4 - 6, 14] });
    for (let s of SHOTS) {
      let [hx, hy] = project(R6, s.lon, s.lat), n = s.big ? 1 : 0.55;
      for (let i = 0; i < 24 * n; i++) {
        let a = (s.big ? -0.9 : -0.55) + rn.range(-0.7, 0.65), sp = rn.range(100, 280) * (0.7 + 0.3 * n);
        g.add(s.t + rn.range(0, 0.02), P.SPARK, hx, hy, Math.cos(a) * sp, Math.sin(a) * sp - 30, rn.range(0.25, 0.75));
      }
      for (let i = 0; i < 7 * n; i++) {
        let a = -0.9 + rn.range(-1.2, 1.2), sp = rn.range(30, 90);
        g.add(s.t + rn.range(0, 0.05), P.MOTE, hx, hy, Math.cos(a) * sp, Math.sin(a) * sp - 15, rn.range(0.3, 0.6), rn.pick([C[5], C[6], C[4]]), 0.7);
      }
      for (let i = 0; i < 3 * n; i++) g.add(s.t + 0.04 + i * 0.07, P.STAR, hx + rn.range(-6, 6), hy + rn.range(-5, 5), 0, -4, rn.range(0.3, 0.5), C[6], rn.range(1, 2));
      for (let i = 0; i < 3 * n; i++) g.add(s.t + 0.03 + i * 0.04, P.SMOKE, hx + 2 + rn.range(-2, 2), hy - 1, rn.range(8, 22), rn.range(-14, -4), rn.range(0.9, 1.3), hex("#5b5f78"), rn.range(2.2, 3.4));
    }
    for (let r = 0; r < 12; r++)
      for (let q = -14; q <= 14; q++) {
        if (!glints(o.seed, q, r)) continue;
        let lon = S3 * (q + r / 2) / G5, lat = 1.5 * r / (G5 * KY), [x, y, f] = project(R6, lon, lat);
        f < 0.25 || lat < 0.15 || lat > 1.45 || Math.abs(lon) > 1.3 || g.add(glintAt(o.seed, q, r) + 0.03, P.STAR, x, y, 0, -3, 0.4, C[6], 1.4 + rand(q, r, 9));
      }
    return ghostCache.set(key, g), g;
  }
  function drawShell(p, t, o, C, near2) {
    let R6 = o.radius, D25 = meta85.duration, S = o.seed, ph = t / D25, { near: N9, far: F } = shell(R6), ages = SHOTS.map((s) => since4(t, s.t, D25)), sk = clamp((ph - 0.72) / 0.26), scanLat = -0.2 + sk * 2, scanK = Math.sin(Math.PI * sk);
    for (let q of near2 ? N9 : F) {
      let ff = q.rim * q.rim, rp = 0, hot = 0;
      for (let i = 0; i < SHOTS.length; i++) {
        let s = SHOTS[i], age = ages[i];
        if (age >= 1) continue;
        let d = Math.acos(clamp(q.X * s.N[0] + q.Y * s.N[1] + q.Z * s.N[2], -1, 1)), f = 0.06 + 3.1 * age, k = (1 - age) * (s.big ? 1 : 0.7);
        rp = Math.max(rp, Math.exp(-(((d - f) / 0.15) ** 2)) * k, d < f ? 0.22 * k * k * (1 - d / f) : 0);
        let hr = s.big ? 0.3 : 0.17;
        age < 0.55 && d < hr && (hot = Math.max(hot, age < 0.07 && d < hr * 0.75 ? 2 : (1 - age / 0.55) ** 1.5 * (1.1 - 0.6 * d / hr)));
      }
      let gl = 0;
      if (glints(S, q.q, q.r)) {
        let a = since4(t, glintAt(S, q.q, q.r), D25);
        a < 0.45 && (gl = 1 - a / 0.45);
      }
      let sc = scanK * Math.exp(-(((q.lat - scanLat) / 0.09) ** 2));
      if (!near2) {
        q.seam ? p.blend(q.x + 0.5, q.y + 0.5, rp > 0.3 ? C[5] : C[3], clamp(0.18 + 0.25 * ff + 0.6 * rp + 0.3 * sc)) : p.blend(q.x + 0.5, q.y + 0.5, C[2], 0.04 + 0.06 * ff + 0.15 * rp);
        continue;
      }
      if (q.sil < 1.15) {
        let lit = -q.X * 0.55 + q.Y * 0.85;
        p.px(q.x, q.y, rp > 0.4 || lit > 0.8 ? WHITE : lit > 0.3 ? C[6] : C[5]), p.light(q.x, q.y, C[4], 0.3);
        continue;
      }
      if (hot >= 2) {
        p.px(q.x, q.y, q.seam ? C[6] : WHITE);
        continue;
      }
      if (q.seam) {
        let I = 0.12 + 0.5 * ff + 0.08 * Math.sin(q.lon * 2.3 + q.lat * 3 - ph * TAU) + (q.corner < 0.32 ? 0.18 : 0) + 0.9 * gl + 0.7 * sc + 1.3 * rp + hot, c = gl > 0.6 || rp > 0.55 || hot > 0.5 ? WHITE : I > 0.8 ? C[6] : I > 0.55 ? C[5] : C[4];
        I > 0.36 ? p.px(q.x, q.y, c) : p.blend(q.x + 0.5, q.y + 0.5, c, 0.3 + I), p.light(q.x, q.y, C[4], 0.04 + 0.08 * I);
      } else {
        let a = 0.05 + 0.34 * ff * q.rim + 0.1 * q.e ** 4 + (q.bevel ? 0.12 + 0.2 * ff : 0) + 0.35 * gl + 0.1 * sc + 0.3 * rp + 0.6 * hot, c = hot > 0.6 ? WHITE : hot > 0.3 || gl > 0.5 ? C[6] : rp > 0.4 || q.bevel ? C[5] : ff > 0.5 ? C[4] : C[3];
        p.blend(q.x + 0.5, q.y + 0.5, c, clamp(a)), (rp > 0.1 || hot > 0 || gl > 0) && p.light(q.x, q.y, C[4], 0.06 * (rp + hot + gl));
      }
    }
  }
  function drawFoot(p, t, C, R6, near2) {
    let D25 = meta85.duration, keep2 = (g) => Math.sin(g) >= 0 === near2;
    band(p, 0, 0, R6 + 1, SA, 2, 1, [C[1], C[3], C[5], C[6]], keep2);
    for (let i = 0; i < 10; i++) {
      let g = i / 10 * TAU + 0.31;
      if (!keep2(g)) continue;
      let x = Math.cos(g) * (R6 - 0.5), y = Math.sin(g) * R6 * SA, k = 0.5 + 0.5 * Math.cos(TAU * (2 * (t / D25) - i / 10));
      p.px(x - 1, y, C[2]), p.px(x + 1, y, C[2]), p.px(x, y, k > 0.6 ? WHITE : C[5]), p.glow(x, y, 6 + 4 * k, C[4], (near2 ? 0.25 : 0.15) * (0.4 + k));
    }
  }
  function drawBack23(p, t, o) {
    let C = fit(o.palette, 8), R6 = o.radius;
    for (let x = -R6; x <= R6; x += R6 / 3) p.glow(x, -1, 22, C[3], 0.1);
    drawFoot(p, t, C, R6, !1), drawShell(p, t, o, C, !1);
  }
  function draw36(p, t, o) {
    let C = fit(o.palette, 8), SP = fit(o.sparks, 4), R6 = o.radius, D25 = meta85.duration, W4 = meta85.size[0] - meta85.origin[0];
    drawShell(p, t, o, C, !0), drawFoot(p, t, C, R6, !0);
    for (let s of SHOTS) {
      let age = since4(t, s.t, D25), [hx, hy] = project(R6, s.lon, s.lat), n = s.big ? 1 : 0.6;
      if (s.big && age < 0.9) {
        let fade = 1 - smooth(0.35, 0.9, age), reach = clamp(age / 0.09);
        for (let pass of [0, 1])
          for (let c of cracks4(R6, o.seed, s))
            for (let i = 1; i < c.length; i++) {
              let [x0, y0, f0] = c[i - 1], [x1, y1, f1, u] = c[i];
              if (u > reach || f0 < 0.05 || f1 < 0.05) continue;
              let k = fade * (1.2 - u * 0.4);
              if (pass === 0) {
                if (age < 0.32) for (let [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.line(x0 + ox, y0 + oy, x1 + ox, y1 + oy, age < 0.12 ? C[6] : C[5], k * (1 - age / 0.32));
                continue;
              }
              p.line(x0, y0, x1, y1, age < 0.12 + u * 0.08 ? WHITE : age < 0.3 + u * 0.1 ? C[6] : C[5], k), i % 3 === 0 && p.glow(x1, y1, 6, C[4], 0.35 * fade * (1 - u * 0.5));
            }
      }
      let tk = (t - (s.t - 0.1)) / 0.1;
      if (tk >= 0 && tk < 1) {
        let sx = W4 - 3, sy = hy - 12, L = Math.hypot(sx - hx, sy - hy), at2 = (d) => [sx + (hx - sx) * Math.max(0, d) / L, sy + (hy - sy) * Math.max(0, d) / L], h = L * tk, [x, y] = at2(h), [x2, y2] = at2(h - 2), [x7, y7] = at2(h - 7), [x16, y16] = at2(h - 16);
        p.line(x16, y16, x7, y7, SP[3]), p.line(x7, y7, x2, y2, SP[1]), p.line(x2, y2, x, y, SP[0]), p.px(x, y, WHITE), p.glow(x, y, 9, SP[1], 0.55);
      }
      age < 0.14 && sparkle(p, hx, hy, (7 * (1 - age / 0.14) + 1) * n, C[6], C[5], 0.4), flash(p, t, s.t, hx, hy, 56 * n, C[4], 0.45, 0.45), flash(p, t, s.t, hx, hy, 12, WHITE, 0.5 * n, 0.08), flash(p, t, s.t, hx + 3, hy, 22, SP[1], 0.4 * n, 0.15);
    }
    let a0 = since4(t, SHOTS[0].t, D25);
    p.glow(0, -R6 * 0.45, R6 * 1.3, C[3], 0.11 + 0.1 * Math.max(0, 1 - a0 * 2)), ghosts(o, C, R6).at(t).draw(p);
  }
  var meta85, HOLD5, HIT_, act33, S3, SA, CA, G5, KY, SHOTS, shells, crackCache, ghostCache, glints, glintAt, init_force_field = __esm({
    "src/fx/scifi/force-field.js"() {
      init_core();
      init_lib14();
      meta85 = {
        name: "Force field",
        desc: "A glassy dome of hex plates over the hero: plates glint, tracers from the right slam into it, a ripple and cracks of light race across, sparks glance off.",
        tags: ["scifi", "shield", "barrier", "dome", "hex", "hit", "defense", "loop"],
        size: [184, 104],
        origin: [76, 84],
        duration: 2.4,
        loop: !0,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: {
          palette: ["#0b1030", "#152a63", "#1d4f9e", "#2582d2", "#36b9ee", "#8ae8ff", "#d4fbff", "#ffffff"],
          sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
          radius: 44,
          seed: 5
        }
      }, HOLD5 = { turn: 1, crouch: 3, lean: 1, fx: -9, fy: -38, bx: 10, by: -38, ffx: -5, fbx: 6 }, HIT_ = { ...HOLD5, x: -2, crouch: 5, lean: -3 }, act33 = {
        poses: [
          [0, HOLD5],
          [0.42, HOLD5],
          [0.42, HIT_, "snap"],
          [0.7, { ...HOLD5, x: -1 }],
          [1.1, HOLD5],
          [1.5, HOLD5],
          [1.5, { ...HIT_, crouch: 4, lean: -2 }, "snap"],
          [1.75, HOLD5],
          [2.4, HOLD5]
        ],
        hits: [{ t: 0.42, stop: 0.07, shake: 0.16, amp: 2 }, { t: 1.5, stop: 0.03, shake: 0.08, amp: 1 }]
      }, S3 = Math.sqrt(3), SA = 0.13, CA = Math.sqrt(1 - SA * SA), G5 = 6.3, KY = 1.12, SHOTS = [
        { t: 0.42, lon: 0.66, lat: 0.62, big: !0 },
        { t: 1.5, lon: 0.95, lat: 0.26, big: !1 }
      ].map((s) => ({ ...s, N: [Math.cos(s.lat) * Math.sin(s.lon), Math.sin(s.lat), Math.cos(s.lat) * Math.cos(s.lon)] }));
      shells = /* @__PURE__ */ new Map();
      crackCache = /* @__PURE__ */ new Map();
      ghostCache = /* @__PURE__ */ new Map();
      glints = (S, q, r) => rand(S, q, r, 3) < 0.2, glintAt = (S, q, r) => {
        let g = rand(S, q, r) * 1.7;
        return g < 1.4 ? 1 + g : g - 1.4;
      };
    }
  });

  // src/fx/spawn/summon-rise.js
  var summon_rise_exports = {};
  __export(summon_rise_exports, {
    create: () => create50,
    meta: () => meta86
  });
  function beast() {
    let parts = PARTS.map(() => new Uint8Array(2116)), cur, put = (x, y) => {
      x = Math.round(x), y = Math.round(y), x >= 0 && y >= 0 && x < 46 && y < 46 && (cur[y * 46 + x] = 1);
    }, ell = (cx, cy, rx, ry) => {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          let dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          dx * dx + dy * dy <= 1 && put(x, y);
        }
    }, stroke2 = (pts, r0, r1) => {
      let L = [], total = 0;
      for (let i = 1; i < pts.length; i++) total += L[i - 1] = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      for (let i = 1, acc = 0; i < pts.length; acc += L[i - 1], i++) {
        let n = Math.ceil(L[i - 1] * 3) + 1;
        for (let j = 0; j <= n; j++) {
          let u = j / n, r = r0 + (r1 - r0) * ((acc + L[i - 1] * u) / total);
          ell(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u, r, r);
        }
      }
    }, [HEAD2, HORNS, ARMS2, SHOULDERS, CHEST, WAIST, LEGS, TAIL] = parts;
    for (let s of [-1, 1]) {
      let X = (d) => 22.5 + s * d;
      cur = HORNS, stroke2([[X(4), 11], [X(8), 8], [X(12), 6.5], [X(15), 4], [X(16), 1.5], [X(15.2), 0]], 2.3, 0.45), cur = SHOULDERS, ell(X(10), 16, 7, 5), ell(X(8.5), 19.5, 5.5, 4.2), cur = ARMS2, stroke2([[X(14.5), 16.5], [X(17.5), 22], [X(18.5), 28]], 4, 3.2), stroke2([[X(18.5), 28], [X(19), 33], [X(19.2), 36.5]], 3.4, 2.8), ell(X(19.2), 37.8, 3, 2.3), stroke2([[X(17.2), 39], [X(16.6), 41.8]], 0.9, 0.4), stroke2([[X(19.2), 39.5], [X(19.3), 42.6]], 0.9, 0.4), stroke2([[X(21.2), 38.8], [X(22), 41.4]], 0.9, 0.4), cur = LEGS, stroke2([[X(5.5), 31], [X(8), 37], [X(7.5), 42]], 4, 3), ell(X(8.5), 44.3, 4.2, 1.7);
    }
    cur = TAIL, stroke2([[22.5, 30], [22.5 + 0.5, 36], [22.5 + 2.5, 41.5], [22.5 + 7, 44.6], [22.5 + 12.5, 44.2], [22.5 + 14.5, 42.5]], 2.3, 0.6), cur = CHEST, ell(22.5, 22.5, 8.2, 7.5), cur = WAIST, ell(22.5, 29.5, 6.2, 4.5), cur = HEAD2, ell(22.5, 12.5, 5.2, 4.6), ell(22.5, 16, 4.2, 2.8);
    let part = new Uint8Array(2116);
    for (let i = 0; i < 2116; i++) for (let k = 0; k < parts.length; k++) if (parts[k][i]) {
      part[i] = k + 1;
      break;
    }
    let on2 = (x, y) => x >= 0 && y >= 0 && x < 46 && y < 46 && part[y * 46 + x] > 0, blur = (src) => {
      let a = Float32Array.from(src), b = new Float32Array(2116);
      for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < 46; y++)
          for (let x = 0; x < 46; x++) {
            let s = 0;
            for (let d = -2; d <= 2; d++) s += x + d >= 0 && x + d < 46 ? a[y * 46 + x + d] : 0;
            b[y * 46 + x] = s / 5;
          }
        for (let y = 0; y < 46; y++)
          for (let x = 0; x < 46; x++) {
            let s = 0;
            for (let d = -2; d <= 2; d++) s += y + d >= 0 && y + d < 46 ? b[(y + d) * 46 + x] : 0;
            a[y * 46 + x] = s / 5;
          }
      }
      return a;
    }, amb = new Float32Array(2116), down = new Float32Array(2116), rim = new Float32Array(2116), crease = new Uint8Array(2116);
    parts.forEach((pm, k) => {
      let B4 = blur(pm), at2 = (x, y) => x >= 0 && y >= 0 && x < 46 && y < 46 ? B4[y * 46 + x] : 0;
      for (let y = 0; y < 46; y++)
        for (let x = 0; x < 46; x++) {
          let i = y * 46 + x;
          if (part[i] !== k + 1) continue;
          let gx = at2(x + 1, y) - at2(x - 1, y), gy = at2(x, y + 1) - at2(x, y - 1), g = Math.hypot(gx, gy) || 1e-6, ox = -gx / g, oy = -gy / g, e = clamp(g / 0.28);
          amb[i] = 0.42 + e * (0.4 * Math.max(0, -oy) + 0.14 * Math.max(0, -ox) - 0.3 * Math.max(0, oy) - 0.08 * Math.max(0, ox)), down[i] = e * Math.max(0, oy) * (Math.abs(x + 0.5 - 22.5) < 7 && y > 27 ? 0.3 : 1);
          for (let [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            let j = (y + dy) * 46 + x + dx;
            on2(x + dx, y + dy) && part[j] > k + 1 && (crease[i] = 1);
          }
        }
    });
    for (let y = 0; y < 46; y++)
      for (let x = 0; x < 46; x++) {
        if (!on2(x, y)) continue;
        let k = on2(x, y + 1) ? on2(x, y + 2) ? 0 : 0.5 : 1;
        rim[y * 46 + x] = Math.abs(x + 0.5 - 22.5) < 7 && y > 27 ? k * 0.3 : k;
      }
    let outline = [];
    for (let y = -1; y <= 46; y++)
      for (let x = -1; x <= 46; x++) !on2(x, y) && (on2(x - 1, y) || on2(x + 1, y) || on2(x, y - 1) || on2(x, y + 1)) && outline.push([x, y]);
    let eyes2 = [], tusks = [];
    for (let s of [-1, 1])
      eyes2.push([Math.round(22.5 + s * 2.2 - 0.5), 12], [Math.round(22.5 + s * 3.2 - 0.5), 12]), tusks.push([Math.round(22.5 + s * 3.4 - 0.5), 16], [Math.round(22.5 + s * 3.6 - 0.5), 15]);
    return { w: 46, h: 46, part, amb, down, rim, crease, outline, eyes: eyes2, tusks, glints: [[Math.round(22.5 - 2.7 - 0.5) - 46 / 2, -34], [Math.round(22.5 + 2.7 - 0.5) - 46 / 2, -34]] };
  }
  function create50(o) {
    let C = fit(o.palette, 8), SH2 = fit(o.body, 5), HR = fit(o.horn, 5), ST = fit(o.stone, 5), DUST5 = mix(ST[2], hex("#7a6c78"), 0.45), R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [C[6], C[5], C[4], C[3]] }), RUB = [ST[0], ST[1], mix(ST[2], C[2], 0.3), mix(ST[3], C[4], 0.3), mix(ST[4], C[5], 0.35)], rocks = new Bits({ ground: floor }), lights = new Lights(), runes = Array.from({ length: 12 }, (_, i) => ({ a: i / 12 * TAU + 0.13, g: GLYPHS2[(i * 5 + 2) % GLYPHS2.length] })), cracks5 = [];
    for (let i = 0; i < 7; i++) {
      let a = i / 7 * TAU + R6.range(-0.25, 0.25), r = 3, pts = [[0, 0]], len2 = R6.range(R12 * 0.6, R12 * 1.05);
      for (; r < len2; )
        r += R6.range(2, 4), a += R6.range(-0.3, 0.3), pts.push([Math.cos(a) * r, Math.sin(a) * r * SY12]);
      cracks5.push(pts);
    }
    let rise = (t2) => {
      if (t2 < BREAK5) return 0;
      let a = ease.outCubic(clamp((t2 - BREAK5) / 0.4)) * 0.56, sag = 0.04 * Math.sin(Math.PI * clamp((t2 - BREAK5 - 0.42) / 0.3)), b = ease.outBack(clamp((t2 - BREAK5 - 0.62) / 0.45), 1.4) * 0.44;
      return a - sag + b;
    }, heat2 = (t2) => smooth(0, IGN, t2) * (1 - smooth(FADE2, FADE2 + 0.8, t2)) * (1 - 0.25 * smooth(EYES3 + 0.2, EYES3 + 0.9, t2)) * (0.85 + 0.15 * noise(t2 * 9, 3) + 0.5 * Math.exp(-((t2 - BREAK5) ** 2) / 0.02) + 0.3 * Math.exp(-((t2 - EYES3) ** 2) / 0.01)), t = 0, done = {}, left = (a, b) => Math.max(0.05, Math.min(R6.range(a, b), meta86.duration - 0.1 - t)), once = (k, at2) => !done[k] && t >= at2 && (done[k] = !0), topEdge = () => {
      let off2 = BEAST.h * (1 - rise(t)), pts = [];
      for (let x = 0; x < BEAST.w; x++)
        for (let y = 0; y < BEAST.h; y++)
          if (BEAST.part[y * BEAST.w + x]) {
            let ly = y - BEAST.h + off2;
            ly < 0 && pts.push([x - BEAST.w / 2, ly]);
            break;
          }
      return pts;
    };
    return {
      update(dt) {
        t += dt;
        let h = heat2(t);
        if (t < IGN) {
          let ph = t / IGN * Math.PI;
          for (let s of [-1, 1]) {
            let a = Math.PI / 2 + s * ph, y = Math.sin(a) * R02 * SY12;
            R6.chance(0.5) && (y < -0.5 ? ps.spawn(P.SPARK, Math.cos(a) * R02, y, R6.range(-40, 40), -R6.range(40, 130), R6.range(0.2, 0.45)) : ps.spawn(P.EMBER, Math.cos(a) * R02, y, R6.range(-20, 20), -R6.range(30, 70), R6.range(0.3, 0.6), C[6], 1.4));
          }
        }
        if (t > 0.2 && t < FADE2 + 0.6 && R6.chance(0.2 * h)) {
          let a = R6.range(0, TAU), r = R6.pick([R02, R12, R02]);
          ps.spawn(P.EMBER, Math.cos(a) * r, Math.sin(a) * r * SY12, R6.range(-10, 10), -R6.range(20, 50), left(0.8, 1.6), C[5], R6.range(1, 1.8));
        }
        if (t > 0.15 && R6.chance(0.4 * Math.min(1, h))) {
          let a = R6.range(0, TAU), r = R6.chance(0.7) ? R02 : R12;
          (!(t < IGN) || Math.abs((a - Math.PI / 2 + Math.PI * 3) % TAU - Math.PI) < t / IGN * Math.PI) && ps.spawn(P.FIRE, Math.cos(a) * r, Math.sin(a) * r * SY12 - 0.5, R6.range(-4, 4), -R6.range(6, 16), R6.range(0.18, 0.4), 0, R6.range(0.8, 1.6) * Math.min(1, h), 0, R6.chance(0.25) ? PF.SMOKES : 0);
        }
        if (t > 0.3 && t < FADE2 + 0.4 && R6.chance(0.05 * h)) {
          let a = R6.range(0, TAU);
          ps.spawn(P.SMOKE, Math.cos(a) * R02 * 0.9, Math.sin(a) * R02 * SY12 - 1, R6.range(-4, 4), -R6.range(12, 24), left(1.4, 2.2), 0, R6.range(2.2, 3.4));
        }
        if (once("ign", IGN) && lights.add(0, -4, 60, C[4], 0.55, 0.5), once("runes", RUNES) && lights.add(0, -4, 50, C[5], 0.5, 0.35), t > RUNES && t < BREAK5 && R6.chance(0.35) && ps.spawn(P.GRIT, R6.range(-R12, R12), -0.5, R6.range(-20, 20), -R6.range(40, 120), R6.range(0.5, 0.9), R6.pick([ST[2], ST[3], ST[4]]), 1), t > RUNES && t < BREAK5 && R6.chance(0.1) && ps.spawn(P.DUST, R6.range(-R12, R12), -1, R6.range(-12, 12), -R6.range(4, 12), R6.range(0.4, 0.7), DUST5, R6.range(1.5, 2.5)), once("break", BREAK5)) {
          lights.add(0, -18, 64, C[4], 0.9, 0.6), lights.add(0, -8, 26, C[6], 0.8, 0.14);
          for (let i = 0; i < 18; i++)
            rocks.add({ kind: B.CHUNK, x: R6.range(-14, 14), y: -2, vx: R6.range(-75, 75), vy: -R6.range(170, 320), g: 1, drag: 0.7, bounce: 0.32, life: R6.range(1.6, 2.4), a: R6.range(0, TAU), va: R6.range(-14, 14), s: R6.range(1.3, 3), ramp: RUB });
          for (let i = 0; i < 60; i++) {
            let u = R6.range(-1, 1), a = -Math.PI / 2 + u * 0.7, sp = R6.range(80, 230) * (1 - 0.4 * Math.abs(u));
            ps.spawn(P.GRIT, u * 10, -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(1, 1.8), R6.pick([ST[2], ST[3], ST[3], ST[4]]), R6.chance(0.4) ? 2 : 1);
          }
          for (let i = 0; i < 12; i++) {
            let s = R6.sign();
            ps.spawn(P.SMOKE, s * R6.range(2, 14), -R6.range(1, 5), s * R6.range(35, 100), -R6.range(4, 24), R6.range(1.2, 2), DUST5, R6.range(3.5, 6), R6.range(0, 0.1), PF.BIG);
          }
          for (let i = 0; i < 4; i++) {
            let s = R6.sign();
            ps.spawn(P.SMOKE, s * R6.range(10, 18), -R6.range(2, 8), s * R6.range(10, 30), -R6.range(40, 90), R6.range(1.4, 2.2), DUST5, R6.range(4, 6.5), R6.range(0, 0.12), PF.BIG);
          }
          for (let i = 0; i < 24; i++) {
            let a = -Math.PI / 2 + R6.range(-1.1, 1.1), sp = R6.range(150, 360);
            ps.spawn(P.SPARK, R6.range(-6, 6), -2, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.25, 0.65));
          }
        }
        let rv = rise(t) - rise(t - dt);
        if (t > BREAK5 && t < BREAK5 + 1.2 && rv > 0) {
          if (R6.chance(Math.min(0.9, rv * 140))) {
            let e = topEdge();
            if (e.length) {
              let [x, y] = R6.pick(e);
              ps.spawn(P.GRIT, x, y, R6.range(-25, 25), -R6.range(10, 60), R6.range(0.8, 1.4), R6.pick([ST[2], ST[3], ST[4]]), R6.chance(0.3) ? 2 : 1);
            }
          }
          if (R6.chance(Math.min(0.8, rv * 70))) {
            let s = R6.sign();
            ps.spawn(P.SMOKE, s * R6.range(10, 22), -R6.range(1, 4), s * R6.range(30, 80), -R6.range(2, 12), R6.range(1, 1.8), DUST5, R6.range(3, 5.5), 0, PF.BIG);
          }
        }
        if (once("heave2", BREAK5 + 0.64)) {
          lights.add(0, -10, 56, C[4], 0.6, 0.4);
          for (let i = 0; i < 8; i++)
            rocks.add({ kind: B.CHUNK, x: R6.sign() * R6.range(10, 22), y: -2, vx: R6.sign() * R6.range(25, 70), vy: -R6.range(90, 180), g: 1, drag: 0.7, bounce: 0.3, life: R6.range(1.2, 1.8), a: R6.range(0, TAU), va: R6.range(-12, 12), s: R6.range(1.2, 2.4), ramp: RUB });
        }
        if (once("eyes", EYES3)) {
          for (let [ex, ey] of BEAST.glints) {
            lights.add(ex, ey, 14, C[6], 0.7, 0.3);
            for (let i = 0; i < 5; i++) ps.spawn(P.SPARK, ex, ey, R6.range(-90, 90), R6.range(-90, 20), R6.range(0.15, 0.35));
          }
          for (let i = 0; i < 10; i++) {
            let s = R6.sign();
            ps.spawn(P.DUST, s * R6.range(8, 20), -1, s * R6.range(30, 80), -R6.range(3, 10), R6.range(0.4, 0.8), DUST5, R6.range(1.5, 3));
          }
        }
        if (t > FADE2 + 0.05 && t < FADE2 + 0.75 && R6.chance(0.45)) {
          let x = R6.int(4, BEAST.w - 5), y = R6.int(2, BEAST.h - 4);
          if (BEAST.part[y * BEAST.w + x]) {
            let lx = x - BEAST.w / 2, ly = y - BEAST.h;
            ps.spawn(P.SMOKE, lx, ly, R6.range(-6, 6), -R6.range(10, 26), left(0.9, 1.5), SOOT7, R6.range(2, 3.4)), R6.chance(0.3) && ps.spawn(P.EMBER, lx, ly, R6.range(-10, 10), -R6.range(15, 40), left(0.6, 1.2), C[4], 1);
          }
        }
        rocks.update(dt);
        for (let b of rocks.list)
          if (b.rest && !b.dusted) {
            b.dusted = !0;
            for (let i = 0; i < 2; i++) ps.spawn(P.DUST, b.x + R6.range(-1.5, 1.5), -0.5, R6.sign() * R6.range(6, 30), -R6.range(2, 12), R6.range(0.3, 0.6), DUST5, R6.range(1.2, 2.4));
          }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let h = heat2(t);
        if (h <= 0.01) return;
        p.glow(0, -2, 52, C[4], 0.28 * h), p.glow(0, -22, 72, C[4], 0.1 * h), p.glow(0, -1, 22, C[5], 0.2 * h);
        let ck = smooth(RUNES, BREAK5, t) * (1 - smooth(FADE2, FADE2 + 0.7, t));
        if (ck > 0)
          for (let pts of cracks5)
            for (let i = 1; i < pts.length; i++) {
              let u = i / pts.length;
              if (u > ck * 1.1) break;
              let cool = smooth(BREAK5 + 0.1, BREAK5 + 1.1, t), ci = Math.round(6 - u * 2 - cool * 2.6);
              p.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], C[clamp(ci, 2, 6)], 1);
            }
        let n = 220, prog = clamp(t / IGN) * Math.PI;
        for (let j = 0; j < n; j++) {
          let a = j / n * TAU, d = Math.abs((a - Math.PI / 2 + Math.PI * 3) % TAU - Math.PI);
          if (d > prog) continue;
          let fresh = prog - d < 0.25 && t < IGN + 0.1, f = noise(a * 6 + t * 5, 4) * 0.5 + 0.5, k = h * (0.7 + 0.5 * f), ca = Math.cos(a), sa = Math.sin(a);
          p.dot(ca * R02, sa * R02 * SY12, fresh ? WHITE : k > 0.95 ? C[6] : k > 0.6 ? C[5] : k > 0.35 ? C[4] : C[3]), p.dot(ca * (R02 + 2.2), sa * (R02 + 2.2) * SY12, k > 0.8 ? C[4] : C[3], 0.9), t > RUNES - 0.15 && p.dot(ca * R12, sa * R12 * SY12, k > 0.9 ? C[5] : k > 0.5 ? C[4] : C[3], smooth(RUNES - 0.15, RUNES + 0.05, t)), j % 11 === 0 && p.glow(ca * R02, sa * R02 * SY12, 9, C[4], 0.22 * k);
        }
        let rk = smooth(RUNES - 0.1, RUNES + 0.15, t);
        if (rk > 0)
          for (let r of runes) {
            let k = h * rk * (0.75 + 0.35 * noise(t * 4 + r.a * 5, 8)), mid = (R02 + R12) / 2 + 0.5, ta = [-Math.sin(r.a), Math.cos(r.a)], na = [Math.cos(r.a), Math.sin(r.a)], proj = ([u, v]) => [na[0] * mid + ta[0] * u * 1.1 + na[0] * v, (na[1] * mid + ta[1] * u * 1.1 + na[1] * v) * SY12];
            for (let stroke2 of r.g)
              for (let i = 1; i < stroke2.length; i++) {
                let [x0, y0] = proj(stroke2[i - 1]), [x1, y1] = proj(stroke2[i]);
                p.line(x0, y0, x1, y1, k > 0.9 ? C[6] : k > 0.55 ? C[5] : C[4], Math.min(1, k * 1.5));
              }
          }
        let hole2 = smooth(BREAK5 - 0.05, BREAK5 + 0.15, t) * (1 - smooth(BREAK5 + 0.95, BREAK5 + 1.5, t));
        if (hole2 > 0) {
          let hw = 15 * hole2;
          p.shade(-hw - 1, -1, hw + 1, 4, (x, y, out) => {
            let d = Math.hypot(x / hw, (y - 0.5) / 3.2);
            d > 1 || (out.c = d > 0.86 ? C[4] : d > 0.62 ? C[1] : C[0]);
          }), p.glow(0, 0, 24, C[5], 0.3 * hole2 * h);
        }
        ps.draw(p, "back");
      },
      draw(p) {
        let r = rise(t), off2 = BEAST.h * (1 - r), h = heat2(t), fade = smooth(FADE2 + 0.1, FADE2 + 0.8, t);
        if (r > 0) {
          let W4 = BEAST.w, H3 = BEAST.h, x0 = -W4 / 2, oy = off2 - H3, k = Math.min(1, h), gone = (x, y) => fade > 0 && fade > 0.06 + 0.86 * (0.55 * (1 - y / H3) + 0.45 * rand(x, y, 3));
          for (let [x, y] of BEAST.outline) y + oy < 0 && !gone(x, Math.min(H3 - 1, Math.max(0, y))) && p.px(x0 + x, y + oy, SH2[0]);
          for (let y = 0; y < H3; y++) {
            let ly = y + oy;
            if (ly >= 0) break;
            let upRim = Math.exp(ly / 17) * k, upPlane = Math.exp(ly / 19) * k;
            for (let x = 0; x < W4; x++) {
              let i = y * W4 + x, pt = BEAST.part[i];
              if (!pt || gone(x, y)) continue;
              let ramp2 = pt === 2 ? HR : SH2, a = BEAST.amb[i], si = BEAST.crease[i] ? 0 : a > 0.74 ? 4 : a > 0.56 ? 3 : a > 0.36 ? 2 : 1;
              pt === 2 && si > 0 && (si = Math.min(4, si + (y < 3 ? 2 : 1)));
              let Lr = BEAST.rim[i] * upRim, Lp = BEAST.down[i] * upPlane * 0.6, c = ramp2[si];
              Lr > 0.7 ? c = C[5] : Lr > 0.48 ? c = C[4] : Lr > 0.3 || Lp > 0.42 ? c = C[3] : Lr > 0.17 || Lp > 0.26 ? c = mix(C[2], ramp2[si], 0.3) : (Lr > 0.08 || Lp > 0.12) && (c = mix(ramp2[si], C[1], 0.6)), p.px(x0 + x, ly, c);
            }
          }
          for (let [x, y] of BEAST.tusks) y + oy < 0 && !gone(x, y) && p.px(x0 + x, y + oy, mix(HR[4], C[4], 0.35 * k));
          for (let [x, y] of BEAST.eyes) y + oy < 0 && !gone(x, y) && p.px(x0 + x, y + oy, t > EYES3 - 0.05 ? t < EYES3 + 0.1 ? WHITE : C[6] : t > BREAK5 + 0.5 ? C[2] : SH2[0]);
          if (t > EYES3 - 0.05) {
            let k2 = (1 - smooth(FADE2 + 0.6, FADE2 + 1, t)) * (0.85 + 0.15 * Math.sin(t * 13));
            for (let [ex, ey0] of BEAST.glints) {
              let ey = ey0 + off2;
              if (ey >= 0) continue;
              p.glow(ex + 0.5, ey, 6, C[5], 0.5 * k2);
              let g = (t - EYES3) / 0.3;
              if (g > 0 && g < 1) {
                let L = 9 * Math.pow(1 - g, 1.5);
                p.line(ex - L, ey, ex + L, ey, (u) => Math.abs(u - 0.5) < 0.18 ? WHITE : Math.abs(u - 0.5) < 0.35 ? C[6] : C[5]), g < 0.4 && p.line(ex, ey - 2 * (1 - g), ex, ey + 2 * (1 - g), C[6]);
              } else fade > 0.6 && k2 > 0.05 && p.px(ex, ey, C[6]);
            }
          }
          p.glow(0, -6, 30, C[4], 0.25 * h * r);
        }
        rocks.draw(p), ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta86, SOOT7, IGN, RUNES, BREAK5, EYES3, FADE2, SY12, R02, R12, PARTS, BEAST, GLYPHS2, init_summon_rise = __esm({
    "src/fx/spawn/summon-rise.js"() {
      init_core();
      meta86 = {
        name: "Summon rise",
        desc: "A rune circle burns into the floor, the ground bursts, and a horned brute heaves up out of it through dust and rubble, lit from below, until its eyes flare.",
        tags: ["spawn", "summon", "demon", "rise", "runes", "dust", "rubble", "ground", "one-shot"],
        size: [176, 116],
        origin: [88, 94],
        duration: 4.6,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: {
          palette: ["#1a0608", "#3d0c0c", "#7a1a10", "#c0381a", "#f06a1e", "#ffae3a", "#ffe08a", "#ffffff"],
          body: ["#060409", "#0e0913", "#170f1e", "#211628", "#2d2036"],
          horn: ["#0c080c", "#201820", "#352a32", "#4e3f48", "#6e5c64"],
          stone: ["#1a1424", "#2b2639", "#4a4263", "#6c6488", "#9a91b4"],
          seed: 9
        }
      }, SOOT7 = hex("#2a1e2a"), IGN = 0.5, RUNES = 0.78, BREAK5 = 1.05, EYES3 = 2.3, FADE2 = 3.4, SY12 = 0.3, R02 = 36, R12 = 27, PARTS = ["head", "horns", "arms", "shoulders", "chest", "waist", "legs", "tail"];
      BEAST = beast(), GLYPHS2 = [
        [[[0, -2], [0, 2]], [[-1.5, -1], [1.5, 1]]],
        [[[-1.5, 2], [0, -2], [1.5, 2]], [[-0.8, 0.4], [0.8, 0.4]]],
        [[[-1.5, -2], [-1.5, 2], [1.5, 2]], [[0, -2], [1.5, -0.5]]],
        [[[0, -2], [0, 2]], [[0, -2], [1.6, -0.6], [0, 0.6]]],
        [[[-1.5, -2], [1.5, 2]], [[1.5, -2], [-1.5, 2]], [[-1.5, 0], [1.5, 0]]],
        [[[-1.4, -2], [1.4, -2], [-1.4, 2], [1.4, 2]]]
      ];
    }
  });

  // src/fx/spawn/spawn-portal.js
  var spawn_portal_exports = {};
  __export(spawn_portal_exports, {
    create: () => create51,
    meta: () => meta87
  });
  function radius2(t, RX8) {
    if (t < OPEN7) return RX8 * ease.outBack(clamp(t / OPEN7), 2.2);
    if (t < SHUT4) return RX8 * (1 + 0.035 * Math.sin(t * 9) + 0.1 * Math.exp(-((t - BURST2 - 0.05) ** 2) / 6e-3));
    let k = clamp((t - SHUT4) / (POP3 - SHUT4));
    return RX8 * (k < 0.35 ? 1 + 0.1 * Math.sin(k / 0.35 * Math.PI * 0.5) : 1.1 * (1 - Math.pow((k - 0.35) / 0.65, 1.6)));
  }
  function hole(p, C, rx, spin, heat2, wind2 = 2.3) {
    if (rx < 1) return;
    let ry = rx * SY13;
    p.shade(-rx - 2, -ry - 2, rx + 2, ry + 2, (x, y, out) => {
      let u = x / rx, v = y / ry, q = Math.hypot(u, v), th = Math.atan2(v, u), lip2 = lipAt(th, spin);
      if (q > lip2) return;
      let w = q / lip2;
      out.c = v < 0 && w > 0.72 ? w > 0.86 ? C[2] : C[1] : w > 0.55 ? C[0] : VOID2;
    });
    let n = Math.max(40, Math.round(rx * 5));
    for (let i = 0; i < 3; i++)
      for (let j = 0; j <= n; j++) {
        let q = 0.14 + 0.82 * (j / n), th = spin + i * TAU / 3 - wind2 * Math.log(q), lip2 = lipAt(th, spin), x = Math.cos(th) * q * lip2 * rx, y = Math.sin(th) * q * lip2 * ry, c = q > 0.8 ? heat2 > 1.1 ? WHITE : C[6] : q > 0.55 ? C[5] : q > 0.32 ? C[4] : C[3];
        if (p.dot(x, y, c, q > 0.3 ? 1 : q / 0.3), q > 0.4 && j % 2 === 0) {
          let t2 = th - 0.32, x2 = Math.cos(t2) * q * 0.94 * lip2 * rx, y2 = Math.sin(t2) * q * 0.94 * lip2 * ry;
          p.dot(x2, y2, q > 0.7 ? C[4] : C[3], 0.85);
        }
      }
    p.glow(0, 0, rx * 0.45, C[3], 0.35 * heat2);
  }
  function lip(p, C, rx, spin, heat2, near2) {
    if (rx < 1) return;
    let ry = rx * SY13, n = Math.ceil(rx * 7);
    for (let j = 0; j < n; j++) {
      let th = j / n * TAU, s = Math.sin(th);
      if (s >= 0 !== near2) continue;
      let l = lipAt(th, spin), x = Math.cos(th) * rx * l, y = s * ry * l, f = noise(th * 9 + spin * 3, 13);
      p.dot(Math.cos(th) * (rx * l + 1.2), s * (ry * l + 1), C[1]), p.dot(x, y, near2 ? f > -0.3 || heat2 > 1.1 ? WHITE : C[6] : f > 0.2 ? C[6] : C[5]), j % 6 === 0 && p.glow(x, y, 7, C[5], (near2 ? 0.3 : 0.2) * Math.min(1.4, heat2));
    }
  }
  function create51(o) {
    let C = fit(o.palette, 8), RX8 = o.width, R6 = new Rng(o.seed), floor = () => 0, SM = [mix(C[4], FUME, 0.4), mix(C[3], FUME, 0.3), mix(C[5], FUME, 0.55)], ps = new Particles({ rng: R6, ground: floor, sparks: [C[7], C[6], C[5], C[3]] }), rocks = new Bits({ ground: floor }), lights = new Lights(), swirl2 = [], wisps = [], rings = [], done = {}, t = 0, addSwirl = (r0) => swirl2.push({ a: R6.range(0, TAU), r: r0, w: R6.range(2.2, 4), in: R6.range(0.3, 0.7), c: R6.pick([WHITE, C[6], C[6], C[5]]) }), pull = () => {
      let a = R6.range(Math.PI * 1.03, Math.PI * 1.97), D25 = R6.range(40, 86), T2 = R6.range(0.24, 0.42), x = Math.cos(a) * D25 * 1.08, y = Math.sin(a) * D25 * 0.85, l = Math.hypot(x, y), v = 0.6 * l / (1 - Math.exp(-0.6 * T2));
      ps.spawn(P.MOTE, x, y, -x / l * v, -y / l * v, T2, R6.pick([WHITE, C[6], C[5], C[5], C[4]]), R6.range(1, 1.7));
    }, puff2 = (n, big, sp) => {
      for (let i = 0; i < n; i++) {
        let a = R6.range(0, TAU), d = R6.range(0, 0.55) * RX8;
        ps.spawn(P.SMOKE, Math.cos(a) * d, Math.sin(a) * d * SY13 - 2, R6.range(-1, 1) * sp * 0.6, -R6.range(0.4, 1) * sp, R6.range(1.2, 2.2) * (big ? 1.15 : 0.8), R6.pick(SM), R6.range(2.8, 4.6) * (big ? 1.15 : 0.9), big ? R6.range(0, 0.3) : R6.range(0, 0.1), big ? PF.BIG : 0);
      }
    }, sparks = (n, up, spread) => {
      for (let i = 0; i < n; i++) {
        let a = -Math.PI / 2 + R6.range(-spread, spread), sp = R6.range(0.5, 1) * up;
        ps.spawn(P.SPARK, R6.range(-0.5, 0.5) * RX8, -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.35, 0.8));
      }
    }, once = (k, at2) => !done[k] && t >= at2 && (done[k] = !0);
    return {
      update(dt) {
        t += dt;
        let shutting = t > SHUT4 && t < POP3;
        if ((t < OPEN7 + 0.15 || shutting) && R6.chance(0.55)) {
          let s = R6.sign(), D25 = R6.range(RX8 * 1.3, RX8 * 2.4), T2 = R6.range(0.18, 0.3), v = D25 * 3 / (Math.exp(3 * T2) - 1);
          ps.spawn(P.STREAK, s * D25, -R6.range(0, 3), -s * v, R6.range(-2, 2), T2, R6.chance(0.5) ? C[6] : C[5]);
        }
        if (t > 0.1 && t < POP3 - 0.1 && R6.chance(shutting ? 0.85 : t < BURST2 ? 0.55 : 0.1) && pull(), t < POP3 && t > 0.12 && R6.chance(shutting ? 0.5 : 0.25) && addSwirl(R6.range(1.1, 1.5)), once("open", OPEN7 * 0.7)) {
          lights.add(0, -8, 50, C[4], 0.75, 0.45), rings.push({ t0: t, life: 0.42, r0: RX8 * 0.8, r1: RX8 * 1.9, th: 2.5, hot: !0 });
          for (let i = 0; i < 8; i++) ps.spawn(P.DUST, R6.sign() * R6.range(0.7, 1.1) * RX8, -1, R6.sign() * R6.range(10, 45), -R6.range(4, 14), R6.range(0.4, 0.7), DUST4, R6.range(1.5, 3));
        }
        if (once("b0", BELCH[0]) && (puff2(6, !1, 34), sparks(8, 210, 0.55), lights.add(0, -6, 44, C[4], 0.6, 0.3)), once("b1", BELCH[1]) && (puff2(8, !1, 40), sparks(12, 240, 0.6), lights.add(0, -6, 48, C[4], 0.65, 0.3)), once("burst", BURST2)) {
          lights.add(0, -26, 74, C[4], 1, 0.75), lights.add(0, -10, 40, WHITE, 0.85, 0.14), rings.push({ t0: t, life: 0.55, r0: RX8 * 1, r1: RX8 * 2.5, th: 3.5, hot: !0 }, { t0: t + 0.06, life: 0.45, r0: RX8 * 0.8, r1: RX8 * 1.8, th: 2, hot: !1 }), puff2(18, !0, 70), sparks(34, 400, 0.8);
          for (let i = 0; i < 5; i++) {
            let a = -Math.PI / 2 + (i - 2) * 0.27 + R6.range(-0.08, 0.08), sp = R6.range(185, 235);
            wisps.push({ x: R6.range(-4, 4), y: -2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: R6.range(0.75, 1), max: 1, tr: [], acc: 0, ph: R6.range(0, TAU) });
          }
          for (let i = 0; i < 12; i++)
            rocks.add({ kind: B.CHUNK, x: R6.sign() * R6.range(0.75, 1.05) * RX8, y: -1, vx: R6.range(-100, 100), vy: -R6.range(150, 280), g: 1, drag: 0.4, bounce: 0.3, life: R6.range(1.3, 1.9), a: R6.range(0, TAU), va: R6.range(-14, 14), s: R6.range(1, 2.4), ramp: STONE3 });
          for (let i = 0; i < 14; i++) ps.spawn(P.STAR, R6.range(-0.8, 0.8) * RX8, -R6.range(4, 34), R6.range(-30, 30), -R6.range(10, 60), R6.range(0.5, 1.1), R6.pick([WHITE, C[6], C[5]]), R6.range(0.8, 2));
        }
        if (t > OPEN7 && t < SHUT4 && R6.chance(0.16) && puff2(1, !1, 22), t > OPEN7 && t < SHUT4 + 0.1 && R6.chance(0.06) && sparks(1, 160, 0.4), once("pop", POP3)) {
          lights.add(0, -4, 50, C[4], 0.95, 0.5), lights.add(0, -2, 28, WHITE, 0.9, 0.12), rings.push({ t0: t, life: 0.35, r0: 2, r1: RX8 * 1.9, th: 2.5, hot: !0 });
          for (let i = 0; i < 18; i++) {
            let a = R6.range(-Math.PI, 0), sp = R6.range(90, 270);
            ps.spawn(P.SPARK, 0, -1, Math.cos(a) * sp, Math.sin(a) * sp * 0.8, R6.range(0.25, 0.6));
          }
          for (let i = 0; i < 9; i++) {
            let a = R6.range(0, TAU), sp = R6.range(30, 95);
            ps.spawn(P.STAR, 0, -2, Math.cos(a) * sp, Math.sin(a) * sp * 0.5 - 20, R6.range(0.4, 0.9), R6.pick([WHITE, C[6]]), R6.range(0.8, 1.8));
          }
          for (let i = 0; i < 6; i++) ps.spawn(P.SMOKE, R6.range(-6, 6), -R6.range(1, 4), R6.range(-34, 34), -R6.range(10, 30), R6.range(0.8, 1.3), SM[2], R6.range(2.5, 4.5));
          for (let i = 0; i < 14; i++) ps.spawn(P.STAR, R6.range(-1, 1) * RX8 * 0.9, -R6.range(0.5, 2), R6.range(-4, 4), -R6.range(0, 4), R6.range(0.6, 1.4), R6.pick([C[6], C[5], C[5]]), R6.range(0.4, 0.9), R6.range(0, 0.25));
        }
        for (let i = swirl2.length - 1; i >= 0; i--) {
          let s = swirl2[i], k = shutting ? 2.4 : 1;
          s.a += s.w * k * dt * (1.4 / Math.max(0.3, s.r)), s.r -= s.in * k * dt, (s.r < 0.25 || t > POP3) && swirl2.splice(i, 1);
        }
        for (let i = wisps.length - 1; i >= 0; i--) {
          let w = wisps[i];
          if (w.tr.unshift([w.x, w.y]), w.tr.length > 12 && w.tr.pop(), (w.life -= dt) <= 0 || w.vy > 0 && w.y > -2) {
            for (let j = 0; j < 8; j++) {
              let a = R6.range(0, TAU), sp = R6.range(30, 120);
              ps.spawn(P.SPARK, w.x, w.y, Math.cos(a) * sp + w.vx * 0.2, Math.sin(a) * sp + w.vy * 0.2, R6.range(0.2, 0.5));
            }
            ps.spawn(P.STAR, w.x, w.y, 0, -6, 0.45, WHITE, 2.4), lights.add(w.x, w.y, 24, C[5], 0.65, 0.25), wisps.splice(i, 1);
            continue;
          }
          for (w.vy += 360 * dt, w.vx += Math.sin((w.max - w.life) * 16 + w.ph) * 160 * dt, w.vx -= w.vx * 1.1 * dt, w.vy -= w.vy * 1.1 * dt, w.x += w.vx * dt, w.y += w.vy * dt, w.acc += dt; w.acc > 0.03; w.acc -= 0.03) ps.spawn(P.SMOKE, w.x, w.y, w.vx * 0.05, w.vy * 0.05 - 4, R6.range(0.6, 1), SM[0], R6.range(1.5, 2.4));
          R6.chance(0.3) && ps.spawn(P.MOTE, w.x, w.y, -w.vx * 0.2 + R6.range(-15, 15), -w.vy * 0.2 + R6.range(-15, 15), R6.range(0.2, 0.4), C[6], 0.6);
        }
        for (let i = rings.length - 1; i >= 0; i--) t - rings[i].t0 > rings[i].life && rings.splice(i, 1);
        rocks.update(dt);
        for (let b of rocks.list)
          if (b.rest && !b.dusted) {
            b.dusted = !0;
            for (let i = 0; i < 2; i++) ps.spawn(P.DUST, b.x + R6.range(-1.5, 1.5), -0.5, R6.sign() * R6.range(6, 30), -R6.range(2, 12), R6.range(0.3, 0.6), DUST4, R6.range(1.2, 2.4));
          }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let rx = radius2(t, RX8), spin = spinAt(t), heat2 = 0.85 + 0.15 * Math.sin(t * 7) + 0.6 * Math.exp(-((t - BURST2) ** 2) / 0.01);
        if (t < POP3 && (p.glow(0, -4, rx * 1.8 + 10, C[4], 0.32 * clamp(rx / RX8)), p.glowLine(0, -2, 0, -44, rx * 0.7 + 6, C[4], 0.16 * clamp(rx / RX8))), t < OPEN7 * 0.6) {
          let k = t / (OPEN7 * 0.6), L = RX8 * 1.1 * ease.outCubic(k);
          p.line(-L, 0, L, 0, (u) => Math.abs(u - 0.5) < 0.3 ? WHITE : C[6]), p.glowLine(-L, 0, L, 0, 7, C[5], 0.6);
        }
        t > OPEN7 * 0.35 && t < POP3 && (hole(p, C, rx, spin, heat2 + 0.4 * smooth(SHUT4, POP3, t), 2.3 + 2.6 * smooth(SHUT4, POP3 - 0.05, t)), lip(p, C, rx, spin, heat2, !1));
        for (let r of rings) ring3(p, C, r, t, !1);
        drawSwirl(p, !1), ps.draw(p, "back");
      },
      draw(p) {
        let rx = radius2(t, RX8), spin = spinAt(t), heat2 = 0.85 + 0.15 * Math.sin(t * 7) + 0.6 * Math.exp(-((t - BURST2) ** 2) / 0.01);
        t > OPEN7 * 0.35 && t < POP3 && lip(p, C, rx, spin, heat2, !0);
        for (let r of rings) ring3(p, C, r, t, !0);
        drawSwirl(p, !0);
        let b = t - BURST2;
        if (b > 0 && b < 0.45) {
          let k = b / 0.45, top = -84 * ease.outExpo(clamp(b / 0.14)), bot = -1 - 60 * ease.inQuad(k), w0 = RX8 * 0.55 * (1 - k * 0.8);
          p.shade(-w0 - 1, top, w0 + 1, bot, (x, y, out) => {
            let u = (y - bot) / (top - bot), half = w0 * Math.pow(1 - u, 0.8) * (0.85 + 0.15 * Math.sin(y * 0.7 + t * 40)), d = Math.abs(x) / Math.max(0.5, half);
            d > 1 || (out.c = d < 0.35 ? WHITE : d < 0.7 ? C[6] : C[5]);
          }), p.glowLine(0, bot, 0, top, w0 + 12, C[5], 0.55 * (1 - k)), b < 0.14 && flare(p, 0, -4, 36 * (1 - b / 0.14), 1 - b / 0.14, C);
        }
        let q = t - POP3;
        q > -0.08 && q < 0.25 && sparkle(p, 0, -1, Math.round((q < 0 ? 4 : 12) * (1 - clamp(q / 0.25))), WHITE, C[5], 0.7 * (1 - clamp(q / 0.25))), rocks.draw(p);
        for (let w of wisps) {
          let k = w.life / w.max;
          for (let i = 1; i < w.tr.length; i++) {
            let [x0, y0] = w.tr[i - 1], [x1, y1] = w.tr[i], u = i / w.tr.length;
            p.line(x0, y0, x1, y1, u < 0.25 ? WHITE : u < 0.55 ? C[6] : C[4], 1.15 - u), u < 0.35 && p.line(x0 + 1, y0, x1 + 1, y1, C[5], 1);
          }
          p.circle(w.x, w.y, 2, C[5]), p.circle(w.x, w.y, 1.2, C[6]), p.px(w.x, w.y, WHITE), p.glow(w.x, w.y, 12, C[5], 0.5 * k + 0.2);
        }
        ps.draw(p, "front"), lights.draw(p);
      }
    };
    function drawSwirl(p, near2) {
      let rx = radius2(t, RX8);
      for (let s of swirl2)
        for (let j = 0; j < 3; j++) {
          let a = s.a - j * 0.08 * (1.4 / Math.max(0.3, s.r)), x = Math.cos(a) * s.r * rx, y = Math.sin(a) * s.r * rx * SY13;
          Math.sin(a) >= 0 === near2 && (p.dot(x, y - 0.5, j ? C[5] : s.c, j ? 0.9 - j * 0.3 : 1), j || p.glow(x, y, 3, C[5], 0.35));
        }
    }
  }
  function ring3(p, C, r, t, near2) {
    let k = (t - r.t0) / r.life;
    k < 0 || k >= 1 || band(p, 0, 0, r.r0 + (r.r1 - r.r0) * ease.outCubic(k), SY13 * 0.62, Math.max(1, r.th * (1 - k)), 1.15 - k, C, (g) => Math.sin(g) >= 0 === near2, r.hot && k < 0.15);
  }
  var meta87, OPEN7, BELCH, BURST2, SHUT4, POP3, SY13, VOID2, FUME, STONE3, DUST4, spinAt, lipAt, init_spawn_portal = __esm({
    "src/fx/spawn/spawn-portal.js"() {
      init_core();
      meta87 = {
        name: "Spawn portal",
        desc: "A rift tears open on the floor and swirls, belches violet smoke and sparks, spits a fountain of wisps up out of itself, then twists shut with a pop.",
        tags: ["spawn", "portal", "summon", "rift", "arcane", "smoke", "ground", "one-shot"],
        size: [208, 150],
        origin: [104, 122],
        duration: 3.8,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: {
          palette: ["#12081f", "#2a0f4d", "#481b8c", "#7330d0", "#a35cff", "#cf9bff", "#f1dcff", "#ffffff"],
          width: 28,
          seed: 6
        }
      }, OPEN7 = 0.3, BELCH = [0.52, 0.76], BURST2 = 1, SHUT4 = 1.9, POP3 = 2.22, SY13 = 0.34, VOID2 = hex("#06030b"), FUME = hex("#3a3046"), STONE3 = ["#1a1424", "#2b2639", "#4a4263", "#6c6488", "#9a91b4"].map(hex), DUST4 = hex("#5a5070");
      spinAt = (t) => t * 2.4 + 1.5 * smooth(BURST2 - 0.1, BURST2 + 0.3, t) + 10 * Math.pow(clamp((t - SHUT4) / (POP3 - SHUT4)), 2.2), lipAt = (th, spin) => 1 + 0.05 * noise(th * 3 + spin * 0.6, 5) + 0.035 * noise(th * 8 - spin * 1.3, 9);
    }
  });

  // src/fx/melee/spin-slash.js
  var spin_slash_exports = {};
  __export(spin_slash_exports, {
    act: () => act34,
    create: () => create52,
    meta: () => meta88
  });
  function create52(o) {
    let C = fit(o.palette, 7), n = C.length, Rg = new Rng(o.seed), R05 = o.radius, ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), lights = new Lights(), A = swing({ cx: 0, cy: -17, R: R05, sy: 0.27, rot: -0.1, a0: 0.5, dir: -1, k: 0.15 }), E2 = { ...A, R: R05 * 0.8, k: 0.1 }, W4 = 16, WE = 5, DIM = [C[0], C[0], C[1], C[2], C[3], C[4], C[5]], t = 0, closed = !1, lastU = 0, body4 = (p, s, w0, lag, half, rim) => {
      let U = TAU * turn(t - lag), ramp2 = half < 0 ? DIM : C;
      U < 0.02 || t - lag > SW2 + 0.02 || smear(p, s, 0, U, w0, (u, r, out) => {
        let age = t - lag - passedAt2(u / TAU), lead = U - u, w = w0 * Math.pow(clamp(lead / 0.85), 0.5) * (0.3 + 0.7 * Math.exp(-age / 0.075)) * Math.pow(clamp(u / 1.3), 0.7);
        if (w < 0.45) return;
        let q = (s.R - r) / w;
        if (q < 0 || q > 1) return;
        let ci = rim && q < 0.26 && age < 0.06 ? 0 : Math.round(q * (n - 1) * 0.7 + age * 13 + (rim ? 0.4 : 1.4));
        out.c = ramp2[n - 1 - clamp(ci, 0, n - 1)], out.a = Math.min(1, u / 1.1 + 0.2);
      }, half);
    }, ring4 = (p, half) => {
      if (body4(p, E2, WE, 0.025, half, !1), body4(p, A, W4, 0, half, !0), t < SW2 + 0.04 && glowAlong(p, A, A.R - 5, 0, TAU * turn(t), 14, C[3], (u) => (half < 0 ? 0.2 : 0.3) * Math.exp(-(t - passedAt2(u / TAU)) / 0.08), half), t < SW2) return;
      let f = (t - SW2) / FLARE2, ramp2 = half < 0 ? DIM : C;
      if (f < 1) {
        let R6 = A.R + 6 * ease.outCubic(f), th = f < 0.13 ? 9 : Math.max(1, 6 * Math.pow(1 - f, 1.5) + 0.5), S = { ...A, R: R6 }, step2 = f < 0.13 ? 6 : f < 0.3 ? 5 : f < 0.55 ? 4 : 3;
        smear(p, S, 0, TAU, th, (u, r, out) => {
          let q = (R6 - r) / th;
          q < 0 || q > 1 || (out.c = f < 0.13 ? q < 0.6 ? WHITE : ramp2[5] : q < 0.45 ? ramp2[step2] : ramp2[step2 - 1], out.a = f < 0.4 ? 1 : 1.3 - f);
        }, half), glowAlong(p, S, R6 - 2, 0, TAU, 14, C[4], 0.32 * (1 - f) * (1 - f), half);
      }
      let k = 1 - clamp((t - SW2 - 0.06) / 0.4);
      k > 0 && trace(p, A, A.R - 0.5, 0, TAU, ramp2[4], (u) => clamp(k * 1.5 - rand(Math.floor(u * 30), 5) * 0.8) * 0.95, half);
    };
    return {
      update(dt) {
        t += dt;
        let U = TAU * turn(t);
        if (t < SW2) {
          for (let u = lastU; u < U; u += 0.3) {
            let tr = travel(A, u), ox = tr.x - A.cx, oy = tr.y - A.cy, l = Math.hypot(ox, oy) || 1, sp = Rg.range(40, 120);
            ps.spawn(P.MOTE, tr.x, tr.y, tr.dx * sp + ox / l * sp * 0.35, tr.dy * sp * 0.6 - Rg.range(5, 30), Rg.range(0.22, 0.45), C[4 + Rg.int(0, 1)], 0.55, 0, Math.sin(tr.a) < 0 ? PF.BACK : 0);
          }
          lastU = U;
        }
        if (!closed && t >= SW2) {
          closed = !0, lights.add(A.cx, A.cy + 4, 90, C[3], 0.4, 0.4);
          let end = travel(A, TAU);
          for (let i = 0; i < 9; i++) {
            let a = Math.atan2(end.dy, end.dx) + Rg.range(-0.45, 0.35), sp = Rg.range(160, 360);
            ps.spawn(P.SPARK, end.x, end.y, Math.cos(a) * sp, Math.sin(a) * sp - Rg.range(20, 70), Rg.range(0.14, 0.36));
          }
          for (let i = 0; i < 16; i++) {
            let u = Rg.range(0, TAU), tr = travel(A, u), sp = Rg.range(110, 260);
            ps.spawn(P.SPARK, tr.x, tr.y, tr.dx * sp, tr.dy * sp - Rg.range(20, 80), Rg.range(0.12, 0.32), 0, 1, 0, Math.sin(tr.a) < 0 ? PF.BACK : 0);
          }
          for (let i = 0; i < 6; i++) {
            let u = Rg.range(0, TAU), [x, y] = onSwing(A, A.R + Rg.range(-1, 3), u);
            ps.spawn(P.STAR, x, y, 0, -Rg.range(2, 8), Rg.range(0.25, 0.5), Rg.chance(0.5) ? C[5] : WHITE, Rg.range(1.2, 2.6), Rg.range(0.04, 0.16), Math.sin(A.a0 + A.dir * u) < 0 ? PF.BACK : 0);
          }
        }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        ring4(p, -1), ps.draw(p, "back");
      },
      draw(p) {
        if (ring4(p, 1), t < 0.06) {
          let [x, y] = onSwing(A, A.R - 3, 0);
          sparkle(p, x, y, 7 * (1 - t / 0.06), C[5], C[3], 0.5);
        }
        let g = t - SW2 * 0.85, tip = onSwing(A, A.R - 3, TAU);
        if (g > 0 && g < 0.24 && sparkle(p, tip[0], tip[1], 10 * ease.outBack(Math.min(1, g / 0.05)) * (1 - g / 0.24), C[5], C[3], 0.6), t < SW2 + 0.05) {
          let U = TAU * turn(t), [x, y] = onSwing(A, A.R - 5, U), far2 = Math.sin(A.a0 + A.dir * U) < 0;
          p.glow(x, y, far2 ? 26 : 38, C[3], (far2 ? 0.3 : 0.5) * (1 - smooth(SW2 - 0.04, SW2 + 0.05, t)));
        }
        ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta88, STANCE2, WOUND, WIDE2, act34, SW2, FLARE2, turn, passedAt2, init_spin_slash = __esm({
    "src/fx/melee/spin-slash.js"() {
      init_core();
      init_lib2();
      meta88 = {
        name: "Spin slash",
        desc: "The blade whirls once round the waist on a tilted plane, behind the body and back in front; the closed ring flares white, dissolves into a dotted trace and throws sparks.",
        tags: ["melee", "slash", "spin", "sword", "aoe", "combat", "one-shot"],
        size: [208, 104],
        origin: [104, 84],
        duration: 0.8,
        loop: !1,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: {
          palette: ["#16224a", "#1f4a86", "#2a7fc0", "#48b8ec", "#9fe2ff", "#e2f7ff", "#ffffff"],
          sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
          radius: 46,
          seed: 3
        }
      }, STANCE2 = { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 }, WOUND = { ...STANCE2, crouch: 6, lean: -2, yaw: 1.1, fx: 13, fy: -20, sa: 0.3, bx: 6, by: -24, ffx: 8, fbx: -8 }, WIDE2 = { ...STANCE2, crouch: 5, lean: 3, fx: 21, fy: -21, sa: 0.05, bx: -9, by: -23, ffx: 11, fbx: -11 }, act34 = {
        target: { x: 60 },
        poses: [
          [-0.46, STANCE2],
          [-0.2, WOUND],
          [-0.02, { ...WOUND, crouch: 7, yaw: 1.3 }],
          [0, { ...WIDE2, sa: -0.1, ghost: 1 }, "snap"],
          [0.05, { ...WIDE2, yaw: -1.57, ghost: 1 }, "snap"],
          [0.09, { ...WIDE2, yaw: -3.14, ghost: 1 }, "snap"],
          [0.13, { ...WIDE2, yaw: -4.71, ghost: 1 }, "snap"],
          [0.17, WIDE2, "snap"],
          [0.56, { ...WIDE2, crouch: 4, lean: 2 }],
          [0.92, STANCE2]
        ],
        hits: [{ t: 0.17, stop: 0.12, shake: 0.16, amp: 2, push: 2.4, straw: 16 }],
        dust: [{ t: 0, x: 0, n: 6 }, { t: 0.17, x: 12, n: 6, dir: 1 }]
      }, SW2 = 0.17, FLARE2 = 0.3, turn = (t) => 1 - Math.pow(1 - clamp(t / SW2), 1.6), passedAt2 = (f) => SW2 * (1 - Math.pow(1 - clamp(f), 1 / 1.6));
    }
  });

  // src/fx/melee/hammer-smash.js
  var hammer_smash_exports = {};
  __export(hammer_smash_exports, {
    act: () => act35,
    create: () => create53,
    meta: () => meta89
  });
  function create53(o) {
    let C = fit(o.palette, 8), n = C.length, R6 = new Rng(o.seed), st = stone2(o.stone), floor = () => 0, ps = new Particles({ rng: R6, ground: floor }), bits = new Bits({ ground: floor }), chips = new Bits({ ground: floor }), lights = new Lights(), A = swing({ cx: 5, cy: -25, R: 32, sy: 1, rot: 0, a0: -2.25, dir: 1 }), U1 = 0;
    for (; onSwing(A, A.R, U1)[1] < -0.5 && U1 < 4; ) U1 += 5e-3;
    let HW = 13, [X] = onSwing(A, A.R - HW / 2, U1), lines2 = cracks(R6, X, 5, 24, 6, 0), rays = [-0.95, -0.6, -0.3, -0.05, 0.22, 0.5, 0.85].map((d, i) => ({ a: -Math.PI / 2 + d + R6.range(-0.06, 0.06), L: (i === 3 ? 34 : i === 2 || i === 4 ? 26 : i === 1 || i === 5 ? 18 : 12) * R6.range(0.9, 1.1) })), t = 0, hit = !1, Rm = A.R - HW / 2, wedge = (p) => {
      let h = head3(t), U = U1 * h, after = smooth(DROP, DROP + 0.07, t), lagU = Math.max(0, U - (0.3 + 1.05 * h)), T2 = lagU + (U - lagU) * after * 0.8;
      if (U - T2 < 0.03 || after >= 1) return;
      let len2 = (U - T2) * Rm;
      if (smear(p, A, T2, U, HW + 1, (u, r, out) => {
        let lead = (U - u) * Rm, f = lead / len2, w = HW * (lead < 3 ? 1 : Math.pow(1 - (lead - 3) / Math.max(1, len2 - 3), 0.85)) * (1 - after * 0.5), off2 = (r - Rm) / (w / 2 + 0.01);
        if (w < 0.6 || Math.abs(off2) > 1) return;
        let ci = lead < 2 ? 0 : Math.round(1 + f * 3.4 + Math.abs(off2) * 1.4 - (off2 > 0.55 ? 1 : 0) + after * 3);
        ci > n - 3 || (out.c = C[n - 1 - Math.max(0, ci)]);
      }), after < 0.6)
        for (let [dr, l0, L] of [[-HW / 2 - 2, 3, 26], [-HW / 2 - 5, 9, 16], [HW / 2 + 2, 2, 30], [HW / 2 + 5, 8, 18], [-1, len2 + 2, 14], [3, len2 + 4, 9]]) {
          let r = Rm + dr;
          for (let d = l0; d < l0 + L * (1 - after); d += 0.5) {
            let u = U - d / r, k = (d - l0) / L;
            if (u < 0) break;
            p.dot(...onSwing(A, r, u), k < 0.25 ? C[6] : k < 0.6 ? C[5] : C[4], (1 - k) * (1 - after));
          }
        }
      let [hx, hy] = onSwing(A, Rm, U);
      p.glow(hx, hy, 34, C[4], 0.5 * (1 - smooth(DROP - 0.03, DROP, t)));
    };
    return {
      update(dt) {
        if (t += dt, !hit && t >= DROP) {
          hit = !0, lights.add(X, -5, 16, WHITE, 0.35, 0.08), lights.add(X, -10, 64, C[4], 0.42, 0.6);
          for (let i = 0; i < 15; i++) {
            let s = R6.sign();
            bits.add({ kind: B.CHUNK, x: X + s * R6.range(0, 5), y: -2, vx: s * R6.range(20, 105), vy: -R6.range(110, 300), g: 1, drag: 0.35, bounce: 0.38, life: R6.range(1.25, 1.65), a: R6.range(0, TAU), va: R6.range(-16, 16), s: R6.pick([1, 1, 2, 2, 3]) });
          }
          for (let i = 0; i < 11; i++) {
            let a = -Math.PI / 2 + R6.range(-1.2, 1.2), sp = R6.range(90, 230);
            chips.add({ kind: B.SHARD, x: X + R6.range(-4, 4), y: -2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.9, drag: 0.5, bounce: 0.35, life: R6.range(0.9, 1.5), s: 1 });
          }
          for (let i = 0; i < 40; i++) {
            let a = -Math.PI / 2 + R6.range(-1.1, 1.1), sp = R6.range(50, 210);
            ps.spawn(P.GRIT, X + R6.range(-4, 4), -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.9, 1.5), R6.pick([st.light, st.body, st.body, st.shade]), R6.chance(0.4) ? 2 : 1);
          }
          for (let i = 0; i < 14; i++) {
            let s = i % 2 ? -1 : 1, sp = R6.range(120, 260);
            ps.spawn(P.MOTE, X + s * 6, -R6.range(1, 4), s * sp, -R6.range(0, 30), R6.range(0.18, 0.34), R6.chance(0.5) ? C[6] : C[5], 0.8, R6.range(0.02, 0.05));
          }
          for (let i = 0; i < 24; i++) {
            let a = -Math.PI / 2 + R6.range(-1.4, 1.4), sp = R6.range(150, 380);
            ps.spawn(P.SPARK, X + Math.cos(a) * 6, -2 + Math.sin(a) * 4, Math.cos(a) * sp, Math.sin(a) * sp - 30, R6.range(0.12, 0.42), 0, 1, R6.range(0.035, 0.08));
          }
          for (let i = 0; i < 20; i++) {
            let s = i % 2 ? -1 : 1;
            ps.spawn(P.SMOKE, X + s * R6.range(2, 10), -R6.range(2, 7), s * R6.range(40, 125), -R6.range(2, 14), R6.range(0.95, 1.5), st.dust, R6.range(6, 9), R6.range(0.02, 0.08), PF.BIG);
          }
          for (let i = 0; i < 7; i++) ps.spawn(P.SMOKE, X + R6.range(-6, 6), -R6.range(3, 9), R6.range(-20, 20), -R6.range(30, 80), R6.range(1, 1.4), st.dust, R6.range(5, 7.5), R6.range(0.04, 0.14), PF.BIG);
          for (let i = 0; i < 8; i++) ps.spawn(P.DUST, X + R6.range(-6, 6), -R6.range(1, 4), R6.range(-70, 70), -R6.range(8, 30), R6.range(0.35, 0.7), st.dust, R6.range(2, 3.5));
        }
        if (bits.update(dt), chips.update(dt), hit && t > DROP + 0.4 && t < DROP + 1.2 && R6.chance(0.08)) {
          let b = R6.pick(bits.list);
          b && b.rest && ps.spawn(P.STAR, b.x + R6.range(-1, 1), b.y - 1.5 - b.s, 0, -2, R6.range(0.25, 0.45), R6.chance(0.5) ? HOT2[0] : WHITE, R6.range(0.6, 1.6));
        }
        for (let b of bits.list)
          if (b.rest && !b.dusted) {
            b.dusted = !0;
            for (let i = 0; i < 3; i++) ps.spawn(P.DUST, b.x + R6.range(-1.5, 1.5), -0.5, R6.sign() * R6.range(8, 35), -R6.range(2, 14), R6.range(0.3, 0.6), st.dust, R6.range(1.3, 2.6));
          }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let q = t - DROP;
        if (q >= 0) {
          let fade = 1 - smooth(1.3, 1.7, q);
          for (let x = -11; x <= 11; x++) {
            let u = x / 10, d = Math.abs(x) > 10 ? 0 : Math.round(3.2 * (1 - u * u) + (rand(x, 4) - 0.5) * 0.8);
            for (let y = 0; y < d; y++) p.dot(X + x, y, y === 0 ? SOOT8 : st.dark, fade);
            d > 0 && p.dot(X + x, d, Math.abs(x) < 7 ? st.light : st.body, fade), Math.abs(x) >= 8 && p.dot(X + x, -1, Math.abs(x) >= 10 ? st.body : st.light, fade), Math.abs(x) === 9 && rand(x, 7) < 0.7 && p.dot(X + x, -2, st.body, fade);
          }
          let k = q / 0.5;
          k < 1 && band(p, X, 0.5, 6 + 50 * ease.outCubic(k), 0.16, Math.max(1, 2 * (1 - k)), 1.15 - k, [st.body, C[3], C[5], C[7]], (g) => Math.sin(g) < 0);
        }
        ps.draw(p, "back");
      },
      draw(p) {
        let q = t - DROP;
        if (wedge(p), q >= 0) {
          let fade = 1 - smooth(1.3, 1.7, q);
          for (let c of lines2) {
            let reach = 30 * ease.outCubic(clamp((q - c.at * 0.06) / 0.08)) * (c.fork ? 0.3 : 1);
            reach > 0 && along(c.pts, reach, (x0, y0, x1, y1) => {
              q >= 0.12 && p.line(x0, y0 + 3, x1, y1 + 3, st.shade, fade), p.line(x0, y0 + 2, x1, y1 + 2, q < 0.05 ? WHITE : q < 0.12 ? C[5] : SOOT8, fade);
            });
          }
          let k = q / 0.5;
          k < 1 && band(p, X, 0.5, 6 + 50 * ease.outCubic(k), 0.16, Math.max(1, 2 * (1 - k)), 1.15 - k, [st.body, C[3], C[5], C[7]], (g) => Math.sin(g) >= 0);
          let d = (q - 0.045) / 0.4;
          if (d >= 0 && d < 1) {
            let r = 12 + 30 * ease.outCubic(d), th = Math.max(1, 3.6 * Math.pow(1 - d, 0.8)), a = d < 0.6 ? 1 : (1 - d) / 0.4;
            p.shade(X - r - 1, -r - 1, X + r + 1, 0, (x, y, out) => {
              let e = r - Math.hypot(x - X, y);
              if (e < 0 || e > th || y > -0.5) return;
              let v = e / th;
              out.c = d < 0.1 ? v < 0.6 ? WHITE : C[6] : v < 0.34 ? d < 0.45 ? WHITE : C[6] : v < 0.67 ? C[5] : C[4], out.a = a;
            });
            for (let i = 0; i < 7; i++) {
              let g = -Math.PI * (0.08 + i / 6 * 0.84);
              p.glow(X + Math.cos(g) * r, Math.sin(g) * r, 14, C[4], 0.36 * (1 - d));
            }
          }
          if (q < 0.2)
            for (let ry of rays) {
              let d1 = ry.L * ease.outCubic(Math.min(1, q / 0.05)), d0 = ry.L * smooth(0.04, 0.2, q), ca = Math.cos(ry.a), sa = Math.sin(ry.a);
              d1 - d0 < 1 || (p.line(X + ca * (2 + d0), -1 + sa * (2 + d0), X + ca * d1, -1 + sa * d1, (u) => u < 0.5 ? WHITE : u < 0.8 ? C[6] : C[5]), p.glowLine(X + ca * d0, -1 + sa * d0, X + ca * d1, -1 + sa * d1, 4, C[5], 0.18 * (1 - q / 0.2)));
            }
          if (q < 0.07) {
            let hot = q < 0.035, rx = hot ? 16 : 12, ry = hot ? 3 : 2;
            p.ellipse(X, 0, rx + 2, ry + 1, hot ? C[6] : C[5]), p.ellipse(X, 0, rx, ry, hot ? WHITE : C[7]);
          }
          if (q < 0.2) {
            let pop = Math.exp(-q / 0.05);
            p.glow(X, -5, 26, C[5], 0.3 * pop);
          }
          p.glow(X, -1, 16, HOT2[2], 0.28 * Math.exp(-q / 0.35));
        }
        for (let b of bits.list) rock2(p, b, st);
        for (let b of chips.list) {
          let k = b.life / b.max, c = k > 0.7 ? HOT2[0] : k > 0.45 ? HOT2[1] : k > 0.25 ? HOT2[2] : HOT2[3];
          p.dot(b.x, b.y, c, Math.min(1, k * 4)), b.rest || p.dot(b.x - b.vx * 0.012, b.y - b.vy * 0.012, HOT2[3], Math.min(1, k * 4)), p.glow(b.x, b.y, 4, c, 0.35 * k);
        }
        ps.draw(p, "front"), lights.draw(p);
      }
    };
  }
  var meta89, REST_2, TOP11, SLAM3, act35, SOOT8, HOT2, DROP, head3, init_hammer_smash = __esm({
    "src/fx/melee/hammer-smash.js"() {
      init_core();
      init_lib2();
      meta89 = {
        name: "Hammer smash",
        desc: "A hammer drops in front in a wedge of motion: a white slam with rays, a dome of force, a dent with cracks, rocks thrown up that bounce and settle, and dust.",
        tags: ["melee", "smash", "hammer", "heavy", "ground", "shockwave", "debris", "combat", "directional", "one-shot"],
        size: [208, 112],
        origin: [80, 92],
        duration: 2,
        loop: !1,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: {
          palette: ["#141834", "#242c5c", "#38479a", "#5a72d0", "#8fa8f0", "#c4d4ff", "#eef3ff", "#ffffff"],
          stone: "#4a3f69",
          seed: 9
        }
      }, REST_2 = { ...READY, weapon: "hammer", two: !0, sa: 0.62, fx: 11, fy: -21, crouch: 3 }, TOP11 = { ...REST_2, x: -3, crouch: 0, lean: -3, fx: 3, fy: -41, sa: -2.1, ffx: 8, ffy: -8, fbx: -5, toeB: !0 }, SLAM3 = { ...REST_2, x: -1, crouch: 7, lean: 6, fx: 14, fy: -19, sa: 0.62, ffx: 11, fbx: -10 }, act35 = {
        target: { x: 66 },
        poses: [
          [-0.72, { ...REST_2, x: -3 }],
          [-0.44, { ...REST_2, x: -3, crouch: 5, lean: -1, fx: 16, fy: -28, sa: -0.9 }],
          [-0.2, TOP11],
          [-0.03, { ...TOP11, y: -2 }],
          [0.06, { ...REST_2, x: 0, y: -3, crouch: -1, lean: 2, fx: 13, fy: -41, sa: -1.2, ffx: 11, ffy: -8, ghost: 1 }, "snap"],
          [0.11, { ...REST_2, x: 0, y: -1, crouch: 3, lean: 5, fx: 19, fy: -30, sa: -0.15, ffx: 13, ghost: 1 }, "snap"],
          [0.15, SLAM3, "snap"],
          [0.62, { ...SLAM3, crouch: 6, lean: 5 }],
          [1.02, { ...REST_2, x: -2, crouch: 5, lean: 2, fx: 14, fy: -24, sa: 0.3 }],
          [1.4, { ...REST_2, x: -3 }]
        ],
        hits: [{ t: 0.15, stop: 0.2, shake: 0.34, amp: 3, push: 3, straw: 26, y: -8 }],
        dust: [{ t: 0.15, x: 10, n: 8 }, { t: 0.15, x: -12, n: 5, dir: -1 }]
      }, SOOT8 = hex("#0d0a12"), HOT2 = ["#fff3a6", "#ffc23d", "#ff8a2a", "#c9281f"].map(hex), DROP = 0.15, head3 = (t) => {
        let x = clamp((t + 0.03) / (DROP + 0.03));
        return 0.28 * x + 0.72 * x * x;
      };
    }
  });

  // src/fx/impacts/ground-slam.js
  var ground_slam_exports = {};
  __export(ground_slam_exports, {
    create: () => create54,
    meta: () => meta90
  });
  function crater(p, st, hot, C, k) {
    for (let x = -12; x <= 11; x++) {
      let q = Math.abs(x + 0.5) / 12, dep = Math.round(2.6 * (1 - q * q));
      if (q < 0.84) {
        for (let y = 0; y < dep; y++) p.dot(x, y, SOOT, k);
        p.dot(x, dep, hot > 0.5 ? C[5] : hot > 0.2 ? C[4] : st.lip, k);
      } else
        p.dot(x, -1, q > 0.93 ? st.light : st.lip, k), q < 0.9 && p.dot(x, -2, st.light, k * 0.8);
    }
  }
  function create54(o) {
    let C = fit(o.palette, 7), st = stone(o.stone), REACH2 = o.reach, R6 = new Rng(o.seed), floor = () => 0, D25 = meta90.duration, ps = new Particles({ rng: R6, ground: floor, sparks: [C[6], C[5], C[4], C[3]] }), bits = new Bits({ ground: floor }), lights = new Lights(), HOT3 = [WHITE, C[5], C[4], C[3]], dustLit = mix(st.dust, WHITE, 0.2), cracks5 = makeCracks(R6, 10, { len: [22, 58], dive: 0.55, maxY: 22, forks: 0.7, x0: [2, 9] }), front = (t2) => 7 + (REACH2 - 7) * ease.outCubic(clamp((t2 - 0.015) / WAVE)), heat2 = (t2) => Math.pow(clamp(1 - t2 / 0.8), 1.4), crest = (u) => [6 + 28 * Math.pow(1 - u, 0.75), 1.5 + 5 * Math.pow(1 - u, 0.9)], burst = [
      { a: -0.07, len: R6.range(34, 40), w: 1.9 },
      { a: Math.PI + 0.07, len: R6.range(34, 40), w: 1.9 },
      { a: -0.42 + R6.range(-0.08, 0.08), len: R6.range(15, 20), w: 1.5 },
      { a: -Math.PI + 0.42 + R6.range(-0.08, 0.08), len: R6.range(15, 20), w: 1.5 },
      { a: -Math.PI / 2 + R6.range(-0.15, 0.15), len: R6.range(18, 24), w: 1.7 },
      { a: -1.05 + R6.range(-0.1, 0.1), len: R6.range(10, 14), w: 1.2 },
      { a: -Math.PI + 1.05 + R6.range(-0.1, 0.1), len: R6.range(10, 14), w: 1.2 }
    ], embers = [];
    for (let c of cracks5)
      for (let [x, y, d] of c.pts) d > 3 && d < 32 && R6.chance(0.25) && embers.push({ x, y, d, life: R6.range(0.8, 2.2), ph: R6.range(0, TAU) });
    lights.add(0, -12, 96, C[4], 0.6, 0.6), lights.add(0, -4, 50, WHITE, 0.9, 0.14);
    for (let i = 0; i < 56; i++) {
      let low = i < 14, s = R6.sign(), a = low ? s > 0 ? -R6.range(0.04, 0.6) : Math.PI + R6.range(0.04, 0.6) : -Math.PI / 2 + R6.range(-1.15, 1.15), sp = low ? R6.range(150, 380) : R6.range(200, 500);
      ps.spawn(P.SPARK, R6.range(-4, 4), -1, Math.cos(a) * sp, Math.sin(a) * sp, low ? R6.range(0.2, 0.5) : R6.range(0.25, 0.65), WHITE, 1, low ? 0 : R6.range(0, 0.05));
    }
    for (let i = 0; i < 20; i++) {
      let s = i < 3 ? 4 : R6.int(1, 3), a = -Math.PI / 2 + R6.range(-0.5, 0.5), sp = s > 3 ? R6.range(110, 190) : R6.range(170, 380) * (s > 2 ? 0.8 : 1);
      bits.add({ kind: B.CHUNK, x: R6.range(-7, 7), y: -2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 1, drag: 0.4, bounce: 0.38, life: R6.range(1.9, 2.7), a: R6.range(0, TAU), va: R6.range(-14, 14), s, pts: rockShape(R6), pvy: 0 });
    }
    for (let i = 0; i < 110; i++) {
      let u = R6.range(-1, 1), a = -Math.PI / 2 + u * 0.65, sp = R6.range(110, 380) * (1 - 0.35 * Math.abs(u));
      ps.spawn(P.GRIT, u * 6, -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(1, 2.2), R6.pick([st.light, st.body, st.body, st.shade, st.shade, st.lip]), R6.chance(0.35) ? 2 : 1);
    }
    for (let i = 0; i < 28; i++) {
      let core = i < 14, s = R6.sign();
      ps.spawn(P.SMOKE, core ? R6.range(-5, 5) : s * R6.range(4, 12), -R6.range(2, 10), core ? R6.range(-12, 12) : s * R6.range(14, 38), -R6.range(50, 130) * (core ? 1 : R6.range(0.3, 0.6)), R6.range(1.9, 2.7), R6.chance(0.35) ? dustLit : st.dust, core ? R6.range(4.5, 9) : R6.range(4, 7.5), R6.range(0.02, 0.22), PF.BIG);
    }
    for (let i = 0; i < 10; i++) {
      let s = R6.sign();
      ps.spawn(P.SMOKE, s * R6.range(2, 14), -R6.range(2, 6), s * R6.range(20, 70), -R6.range(4, 20), R6.range(1.4, 2.3), st.dust, R6.range(6, 9), R6.range(0, 0.08), PF.BIG);
    }
    for (let i = 0; i < 26; i++)
      ps.spawn(P.FLAKE, R6.range(-22, 22), -R6.range(14, 80), R6.range(-12, 12), R6.range(-10, 4), R6.range(1.2, 2), R6.chance(0.5) ? st.lip : dustLit, R6.range(0.5, 1.2), R6.range(0.25, 1));
    let t = 0, acc = [R6.next(), R6.next()], ring4 = (p, back) => {
      let u = clamp((t - 0.015) / (WAVE + 0.1));
      t < 0.015 || u >= 0.9 || band(
        p,
        0,
        0.5,
        front(t) + 1,
        0.16,
        Math.max(1, 4 * Math.pow(1 - u, 0.8)),
        u < 0.55 ? 1.1 : (0.9 - u) / 0.35,
        u < 0.35 ? [C[3], C[4], C[5], C[6]] : [st.body, st.light, C[4], C[5]],
        (g) => Math.sin(g) < 0 === back,
        t < 0.09
      );
    }, fronts = (p) => {
      let u = clamp((t - 0.03) / (WAVE + 0.16));
      if (t < 0.03 || u >= 1) return;
      let fr = front(t), [h, w] = crest(u), k = u < 0.7 ? 1 : (1 - u) / 0.3, cols = u < 0.14 ? [WHITE, C[6], C[5]] : u < 0.34 ? [C[6], C[5], C[4]] : u < 0.55 ? [C[5], C[4], st.lip] : [st.lip, st.light, st.dust];
      for (let s of [-1, 1])
        frontCrescent(p, s * fr, s, h, w, cols, k), p.glow(s * fr, -h * 0.3, 8 + h * 0.7, C[4], 0.5 * (1 - u) * k);
    };
    return {
      update(dt) {
        t += dt;
        let u = clamp((t - 0.015) / WAVE);
        if (u > 0 && u < 1) {
          let fr = front(t), [h] = crest(u);
          for (let k = 0; k < 2; k++) {
            let s = k ? 1 : -1;
            for (acc[k] += dt * 120 * (1 - u * 0.7); acc[k] > 1; acc[k]--)
              ps.spawn(P.SMOKE, s * (fr - R6.range(1, 7)), -R6.range(0.5, 3), s * R6.range(15, 70) * (1 - u), -R6.range(2, 12), R6.range(1, 2.1), R6.chance(0.3) ? dustLit : st.dust, R6.range(2.5, 6.5) * (1 - 0.4 * u), 0, PF.BIG), R6.chance(0.5) && ps.spawn(P.DUST, s * (fr - R6.range(0, 3)), -R6.range(0.3, 0.9) * h, s * R6.range(-15, 25), -R6.range(8, 35), R6.range(0.3, 0.6), R6.chance(0.5) ? dustLit : st.dust, R6.range(1.2, 2.4)), R6.chance(0.4) && ps.spawn(P.GRIT, s * fr, -1, s * R6.range(10, 60), -R6.range(40, 140) * (1 - u), R6.range(0.5, 1), R6.pick([st.light, st.body, st.lip]), 1), u < 0.45 && R6.chance(0.2) && ps.spawn(P.SPARK, s * fr, -1, s * R6.range(60, 200), -R6.range(30, 160), R6.range(0.12, 0.3));
          }
        }
        for (let b of bits.list) b.pvy = b.vy;
        bits.update(dt);
        for (let b of bits.list)
          if (b.pvy > 70 && b.vy <= 0) {
            let n = b.pvy > 200 ? 3 : 2;
            for (let i = 0; i < n; i++) ps.spawn(P.DUST, b.x + R6.range(-1.5, 1.5), -0.5, R6.sign() * R6.range(8, 35), -R6.range(2, 16), R6.range(0.3, 0.65), st.dust, R6.range(1.3, 2.4) * (0.7 + b.s * 0.25));
            b.pvy = 0;
          }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        let fade = 1 - smooth(D25 - 0.9, D25 - 0.15, t), H3 = heat2(t);
        t > 0.02 && crater(p, st, H3, C, fade), drawCracks(p, cracks5, (c) => c.len * ease.outCubic(clamp((t - c.t0) / 0.1)), (d) => H3 * clamp(1.2 - d / 40), HOT3, SOOT, st.light, fade);
        for (let e of embers) {
          let k = 1 - (t - 0.1) / e.life;
          if (t < 0.1 || k <= 0) continue;
          let f = 0.6 + 0.4 * Math.sin(t * 23 + e.ph);
          p.px(e.x, e.y, k * f > 0.55 ? C[5] : k * f > 0.25 ? C[4] : C[3]), p.glow(e.x, e.y, 4, C[4], 0.35 * k * f);
        }
        ring4(p, !0), ps.draw(p, "back");
      },
      draw(p) {
        ring4(p, !1), fronts(p);
        for (let b of bits.list) rock(p, b, st);
        ps.draw(p, "front"), t < 0.035 ? (p.ellipse(0, 0, 30, 4.5, (d) => d > 0.8 ? C[4] : d > 0.5 ? C[6] : WHITE), star(p, 0, -1, burst, 1, 1, [C[4], C[6], WHITE, WHITE])) : t < 0.07 && star(p, 0, -1, burst, 1.25, 0.5, [C[3], C[5], C[6], WHITE]), t < 0.14 && p.glowLine(-80, 0, 80, 0, 10, C[5], 0.55 * (1 - t / 0.14));
        let H3 = heat2(t);
        H3 > 0 && p.glow(0, 1, 46, C[4], 0.35 * H3), lights.draw(p);
      }
    };
  }
  var meta90, WAVE, init_ground_slam = __esm({
    "src/fx/impacts/ground-slam.js"() {
      init_core();
      init_lib();
      meta90 = {
        name: "Ground slam",
        desc: "Something lands hard: the floor flashes and cracks, two crescent shock waves race out along it, a dust wave and a tall dust cloud rise, rocks erupt, bounce and settle.",
        tags: ["impact", "ground", "slam", "shockwave", "quake", "rocks", "dust", "one-shot"],
        size: [288, 208],
        origin: [144, 164],
        duration: 3.2,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: ["#2a1712", "#5e2c1c", "#a4502a", "#e8893a", "#ffc764", "#fff0b4", "#ffffff"], stone: "#4a3f69", reach: 104, seed: 5 }
      }, WAVE = 0.6;
    }
  });

  // src/fx/melee/uppercut.js
  var uppercut_exports = {};
  __export(uppercut_exports, {
    act: () => act36,
    create: () => create55,
    meta: () => meta91
  });
  function create55(o) {
    let C = fit(o.palette, 7), INK4 = hex(o.outline), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), lights = new Lights(), A = swing({ cx: 8, cy: -25, R: 27, sy: 1, rot: 0, a0: 1.08, dir: -1, span: 2.5, W: 13, t0: 0.02, sweep: 0.07, hold: 0.05, trail: 0.22, ramp: C }), top = slashEnd(A), SX = top.x + 3, SY14 = top.y - 5, HIT9 = A.t0 + A.sweep * 0.8, spikes2 = Array.from({ length: 10 }, (_, i) => ({ a: i / 10 * TAU + Rg.range(-0.12, 0.12) - Math.PI / 2, len: (i % 2 ? 7 : 13) + Rg.range(0, 4), w: i % 2 ? 2.2 : 3 })), bursts = Array.from({ length: 8 }, (_, i) => ({ a: i / 8 * TAU + 0.2 + Rg.range(-0.15, 0.15), r0: Rg.range(15, 18), L: Rg.range(5, 9) })), t = 0, hit = !1, kicked = !1;
    return {
      update(dt) {
        if (t += dt, !kicked) {
          kicked = !0;
          for (let i = 0; i < 4; i++) ps.spawn(P.DUST, 18 + Rg.range(-4, 4), -1, Rg.range(-30, 30), -Rg.range(5, 20), Rg.range(0.3, 0.55), "#6a6080", Rg.range(1.5, 2.6));
        }
        if (!hit && t >= HIT9) {
          hit = !0, lights.add(SX, SY14, 56, C[4], 0.6, 0.4), lights.add(SX, SY14, 18, WHITE, 0.7, 0.08);
          for (let i = 0; i < 16; i++) {
            let a = -Math.PI / 2 + Rg.range(-1.6, 1.6), sp = Rg.range(120, 320);
            ps.spawn(P.SPARK, SX, SY14, Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.15, 0.45));
          }
          for (let i = 0; i < 6; i++) {
            let a = Rg.range(0, TAU), d = Rg.range(14, 24);
            ps.spawn(P.STAR, SX + Math.cos(a) * d, SY14 + Math.sin(a) * d, Math.cos(a) * 20, Math.sin(a) * 20 - 10, Rg.range(0.25, 0.5), Rg.chance(0.5) ? C[5] : WHITE, Rg.range(1.4, 2.6), Rg.range(0.04, 0.18));
          }
        }
        ps.update(dt), lights.update(dt);
      },
      draw(p) {
        slash(p, A, t);
        let u = t - A.t0;
        if (u > 0 && u < 0.16)
          for (let [dx, y0, L] of [[A.cx + A.R + 7, -16, 18], [A.cx + A.R + 11, -30, 12], [A.cx - 4, -40, 10]]) {
            let k = u / 0.16, y = y0 - 30 * k;
            for (let d = 0; d < L; d += 1) p.dot(dx, y + d, d < 3 ? WHITE : d < L * 0.5 ? C[5] : C[3], (1 - d / L) * (1 - k));
          }
        if (u > 0 && u < A.sweep + 0.06) {
          let [x, y] = onSwing(A, A.R - 5, A.span * ease.outExpo(clamp(u / A.sweep)));
          p.glow(x, y, 34, C[3], 0.45 * (1 - u / (A.sweep + 0.06)));
        }
        let q = t - HIT9;
        if (q >= 0 && q < 0.36) {
          let pop = ease.outBack(clamp(q / 0.05), 2.6), out = 1 - smooth(0.16, 0.36, q), sc = pop * (0.35 + 0.65 * out), turn2 = q * 1.2, sp = spikes2.map((s) => ({ ...s, a: s.a + turn2 }));
          sc > 0.08 && (star2(p, SX, SY14, sp, sc * 1.12, 1, INK4, INK4, INK4, INK4), star2(p, SX, SY14, sp, sc, 1, q < 0.05 ? WHITE : C[6], C[4], C[3], C[2])), p.glow(SX, SY14, 30, C[4], 0.45 * out);
        }
        if (q >= 0.02 && q < 0.24) {
          let k = (q - 0.02) / 0.22, r = 7 + 17 * ease.outCubic(k), th = Math.max(1, 2.2 * (1 - k)), col = k < 0.25 ? WHITE : k < 0.5 ? C[5] : k < 0.75 ? C[4] : C[3];
          for (let a = 0; a < TAU; a += 0.6 / r) for (let o2 = 0; o2 < th; o2 += 0.5) p.dot(SX + Math.cos(a) * (r - o2), SY14 + Math.sin(a) * (r - o2), col, 1.15 - k);
        }
        if (q >= 0.02 && q < 0.2) {
          let k = (q - 0.02) / 0.18;
          for (let b of bursts) {
            let r0 = b.r0 + 10 * ease.outCubic(k), ca = Math.cos(b.a), sa = Math.sin(b.a);
            p.line(SX + ca * r0, SY14 + sa * r0, SX + ca * (r0 + b.L * (1 - k)), SY14 + sa * (r0 + b.L * (1 - k)), k < 0.4 ? WHITE : C[5], 1.1 - k);
          }
        }
        ps.draw(p), lights.draw(p);
      }
    };
  }
  var meta91, FISTS, COIL, TOP12, act36, init_uppercut = __esm({
    "src/fx/melee/uppercut.js"() {
      init_core();
      init_lib2();
      meta91 = {
        name: "Uppercut",
        desc: "A crescent rises from the floor past the face, and at the top a comic impact star bursts: bold outline, hot core, burst lines, twinkles and sparks.",
        tags: ["melee", "uppercut", "punch", "rising", "launcher", "comic", "combat", "directional", "one-shot"],
        size: [132, 128],
        origin: [48, 110],
        duration: 0.85,
        loop: !1,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: {
          palette: ["#3a1408", "#7a2a10", "#c4501a", "#f08a2a", "#ffc94a", "#fff2a8", "#ffffff"],
          outline: "#2a0a08",
          sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
          seed: 11
        }
      }, FISTS = { ...READY, fx: 12, fy: -25, bx: 9, by: -27, crouch: 3, lean: 1 }, COIL = { ...FISTS, crouch: 7, lean: 3, fx: 8, fy: -11, bx: 8, by: -27, ffx: 10, fbx: -9 }, TOP12 = { ...FISTS, x: 1, y: -11, crouch: -1, lean: 2, fx: 12, fy: -42, bx: -6, by: -21, ffx: 8, ffy: -8, fbx: -3, fby: -2, toeB: !0, ghost: 1 }, act36 = {
        target: { x: 44 },
        poses: [
          [-0.42, FISTS],
          [-0.16, COIL],
          [0, { ...COIL, crouch: 8 }],
          [0.03, { ...FISTS, y: -4, crouch: 1, lean: 4, fx: 18, fy: -27, bx: -5, by: -23, ffx: 9, fbx: -7, toeB: !0, ghost: 1 }, "snap"],
          [0.076, TOP12, "snap"],
          [0.3, { ...TOP12, y: -13, ghost: void 0 }],
          [0.56, { ...TOP12, y: 0, crouch: 2, fx: 13, fy: -31, ffx: 7, ffy: -6, fbx: -5, fby: -5, ghost: void 0 }, "in"],
          [0.6, { ...FISTS, y: 0, crouch: 7, lean: 3, fx: 12, fy: -14, bx: -6, by: -16, ffx: 10, fbx: -9 }, "snap"],
          [0.98, FISTS]
        ],
        hits: [{ t: 0.076, stop: 0.13, shake: 0.18, amp: 2, push: -2.6, straw: 18, y: -34 }],
        dust: [{ t: 0.03, x: 8, n: 6 }, { t: 0.6, x: 0, n: 6 }]
      };
    }
  });

  // src/fx/melee/double-slash.js
  var double_slash_exports = {};
  __export(double_slash_exports, {
    act: () => act37,
    create: () => create56,
    meta: () => meta92
  });
  function create56(o) {
    let C = fit(o.palette, 7), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), lights = new Lights(), X = 34, Y3 = -23, down = cut(X, Y3, 0.72, 1, 0.84, { W: 10, t0: 0, sweep: 0.06, hold: 0.07, trail: 0.24, ramp: C, lens: !0 }), up = cut(X, Y3, -0.66, -1, 0.84, { W: 11, t0: UP4, sweep: 0.06, hold: 0.06, trail: 0.26, ramp: C, lens: !0 }), ends = [slashEnd(down), slashEnd(up)], slivers = [-2.4, -1.1, 0.2, 1.6].map((a) => ({ a: a + Rg.range(-0.2, 0.2), r: Rg.range(5, 8), v: Rg.range(70, 120), arc: Rg.range(0.4, 0.7) })), CLOSE3 = UP4 + 0.012, t = 0, cut1 = !1, cut2 = !1, closed = !1;
    return {
      update(dt) {
        if (t += dt, !cut1 && t >= down.sweep) {
          cut1 = !0, shavings(ps, Rg, down, 10, [C[4], C[5]]);
          for (let i = 0; i < 6; i++) {
            let a = Math.atan2(ends[0].dy, ends[0].dx) + Rg.range(-0.5, 0.5), sp = Rg.range(120, 300);
            ps.spawn(P.SPARK, ends[0].x, ends[0].y, Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.12, 0.3));
          }
        }
        if (!closed && t >= CLOSE3) {
          closed = !0, lights.add(X, Y3, 56, C[3], 0.45, 0.4), lights.add(X, Y3, 18, WHITE, 0.6, 0.08);
          for (let i = 0; i < 18; i++) {
            let a = Rg.range(-Math.PI, Math.PI) * 0.8, sp = Rg.range(140, 360);
            ps.spawn(P.SPARK, X, Y3, Math.cos(a) * sp, Math.sin(a) * sp - 40, Rg.range(0.14, 0.4));
          }
          for (let i = 0; i < 5; i++) ps.spawn(P.STAR, X + Rg.range(-14, 14), Y3 + Rg.range(-12, 12), 0, -4, Rg.range(0.2, 0.4), Rg.chance(0.5) ? C[5] : WHITE, Rg.range(1, 2.2), Rg.range(0.05, 0.2));
        }
        !cut2 && t >= UP4 + up.sweep && (cut2 = !0, shavings(ps, Rg, up, 12, [C[4], C[5]])), ps.update(dt), lights.update(dt);
      },
      draw(p) {
        let flash2 = t >= CLOSE3 && t < CLOSE3 + 0.07 ? 1 : 0;
        down.hot = up.hot = flash2, slash(p, down, t), slash(p, up, t);
        for (let [s, e] of [[down, ends[0]], [up, ends[1]]]) {
          let g = t - s.t0 - s.sweep * 0.6;
          g > 0 && g < 0.2 && sparkle(p, e.x, e.y, 7 * ease.outBack(Math.min(1, g / 0.05)) * (1 - g / 0.2), C[5], C[3], 0.5);
        }
        let q = t - CLOSE3;
        if (q >= 0 && q < 0.26) {
          let k = q / 0.26;
          flare(p, X, Y3, 22 * Math.pow(1 - k, 1.4), 1 - k, C), p.glow(X, Y3, 34, C[4], 0.35 * (1 - k));
        }
        if (q >= 0.03 && q < 0.15) {
          let k = (q - 0.03) / 0.12;
          for (let s of slivers) sliver(p, X, Y3, s.a, s.r + s.v * (q - 0.03), s.arc * (1 - 0.4 * k), k < 0.4 ? C[6] : k < 0.7 ? C[5] : C[4], 1 - k);
        }
        for (let s of [down, up]) {
          let u = t - s.t0;
          if (u <= 0 || u >= 0.25) continue;
          let e = slashEnd({ ...s, span: s.span * ease.outExpo(clamp(u / s.sweep)) });
          p.glow(e.x, e.y, 40, C[3], 0.5 * (1 - u / 0.25));
        }
        ps.draw(p), lights.draw(p);
      }
    };
  }
  var meta92, STANCE3, HIGH4, LOW, act37, UP4, R03, cut, init_double_slash = __esm({
    "src/fx/melee/double-slash.js"() {
      init_core();
      init_lib2();
      meta92 = {
        name: "Double slash",
        desc: "A down cut, then an up cut that crosses it: the moment the X closes both strokes flash white, the crossing bursts with light and sparks, and a dotted X lingers.",
        tags: ["melee", "slash", "combo", "sword", "cross", "combat", "directional", "one-shot"],
        size: [164, 108],
        origin: [44, 92],
        duration: 0.8,
        loop: !1,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: {
          palette: ["#2a0a22", "#5e1238", "#a01f4e", "#e0386a", "#ff86a6", "#ffd2dd", "#ffffff"],
          sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
          seed: 6
        }
      }, STANCE3 = { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 }, HIGH4 = { ...STANCE3, x: -7, crouch: 4, lean: -4, fx: -7, fy: -35, sa: -2.65, bx: 9, by: -25, armsFront: !0, ffx: 9, fbx: -8 }, LOW = { ...STANCE3, x: 3, crouch: 6, lean: 6, fx: 22, fy: -20, sa: 0.62, bx: -8, by: -24, ffx: 13, fbx: -10, toeB: !0 }, act37 = {
        target: { x: 62 },
        poses: [
          [-0.42, { ...STANCE3, x: -7 }],
          [-0.18, HIGH4],
          [-0.04, { ...HIGH4, crouch: 5 }],
          [0, { ...STANCE3, x: 0, crouch: 2, lean: 3, fx: 16, fy: -37, sa: -1.45, bx: -7, by: -24, ffx: 11, fbx: -9, ghost: 1 }, "snap"],
          [0.06, LOW, "snap"],
          [0.14, { ...LOW, x: 4, crouch: 6, lean: 5, fx: 20, fy: -17, sa: 0.85, ghost: 1 }],
          [0.17, { ...LOW, x: 5, crouch: 3, lean: 5, fx: 22, fy: -28, sa: 0.1, by: -18, toeB: !0, ghost: 1 }, "snap"],
          [0.21, { ...LOW, x: 6, crouch: 1, lean: 6, fx: 19, fy: -37, sa: -0.95, by: -18, ffx: 13, fby: -6 }, "snap"],
          [0.5, { ...LOW, x: 6, crouch: 3, lean: 3, fx: 18, fy: -36, sa: -1.05, by: -19, ffx: 12 }],
          [0.92, { ...STANCE3, x: -7 }]
        ],
        hits: [
          { t: 0.06, stop: 0.05, shake: 0.08, amp: 1, push: 1.4, straw: 8 },
          { t: 0.16, stop: 0.14, shake: 0.2, amp: 2, push: 2.8, straw: 18, y: -28 }
        ],
        dust: [{ t: 0.06, x: 16, n: 5, dir: 1 }, { t: 0.17, x: -8, n: 4, dir: -1 }]
      }, UP4 = 0.14, R03 = 62, cut = (x, y, th, dir, span, extra) => through(x, y, th, dir, R03, span, 0.55, extra);
    }
  });

  // src/fx/impacts/shield-block.js
  var shield_block_exports = {};
  __export(shield_block_exports, {
    act: () => act38,
    create: () => create57,
    meta: () => meta93
  });
  function create57(o) {
    let C = fit(o.palette, 8), S = fit(o.sparks, 4), R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: S }), lights = new Lights(), [hx, hy] = onDome(HIT8.lon, HIT8.lat), sp = spikes(R6, 8, 0.2, { len: [5, 8], w: [1.4, 1.9], fwd: 1.2, back: 0.3 });
    lights.add(hx, hy, 40, S[1], 0.7, 0.2), lights.add(hx, hy, 12, WHITE, 0.7, 0.06);
    let nA = Math.atan2(-Math.sin(HIT8.lat) / RY3, Math.cos(HIT8.lat) * Math.sin(HIT8.lon) / RX7);
    for (let i = 0; i < 14; i++) {
      let a = nA + R6.range(-1.2, 0.9), v = R6.range(130, 300);
      ps.spawn(P.SPARK, hx + 1, hy, Math.cos(a) * v, Math.sin(a) * v - 30, R6.range(0.15, 0.42), WHITE, 1, i > 10 ? R6.range(0.01, 0.04) : 0);
    }
    let t = 0, dome = (p, back) => {
      let fade = 1 - smooth(GONE4 + 0.35, GONE4 + 0.55, t);
      if (!(fade <= 0))
        for (let y = -RY3 - 1; y < 0; y++)
          for (let x = CX; x <= CX + RX7 + 1; x++) {
            let u = (x + 0.5 - CX) / RX7, v = -(y + 0.5) / RY3, q = u * u + v * v;
            if (q > 1 || u < 0 || v < 0) continue;
            let z = Math.sqrt(1 - q) * (back ? -1 : 1), lon = Math.atan2(u, z), lat = Math.asin(clamp(v)), a = (lon + lat) * GRID2, b = (lon - lat) * GRID2, fa = a - Math.floor(a), fb = b - Math.floor(b), cell2 = rand(Math.floor(a), Math.floor(b), 31), line2 = Math.min(fa, 1 - fa, fb, 1 - fb) < 0.13, gone = GONE4 + cell2 * 0.35;
            if (t > gone) continue;
            let d = Math.acos(clamp(Math.cos(lat) * Math.cos(HIT8.lat) * Math.cos(lon - HIT8.lon) + Math.sin(lat) * Math.sin(HIT8.lat), -1, 1)), hit = 0;
            for (let [t0, k0] of [[0, 1], [0.12, 0.55]]) {
              let k = t - t0, front = k * 3.6;
              k < 0 || k > 0.55 || (Math.abs(d - front) < 0.2 ? hit = Math.max(hit, k0 * (1 - k / 0.55)) : d < front && (hit = Math.max(hit, 0.3 * k0 * (1 - k / 0.55))));
            }
            let rim = 1 - Math.abs(z), flash2 = t < 0.05, blink = t > gone - 0.06, sheen2 = Math.abs(((lat * 0.8 - lon * 0.3 - t * 1.6) % 1 + 1) % 1 - 0.5) < 0.05;
            if (back) {
              line2 && p.dot(x, y, C[3], 0.5 * fade);
              continue;
            }
            q > 0.9 ? p.dot(x, y, flash2 || hit > 0.5 ? WHITE : C[6], fade) : line2 ? p.dot(x, y, flash2 || blink || hit > 0.5 ? WHITE : hit > 0.2 || sheen2 ? C[6] : rim > 0.7 ? C[5] : rim > 0.35 ? C[4] : C[3], fade) : p.blend(x, y, flash2 || hit > 0.35 ? C[6] : C[3], fade * Math.min(0.85, (flash2 ? 0.35 : 0.1 + 0.25 * rim * rim) + hit * 0.65)), (x * 7 + y * 3 & 15) === 0 && p.light(x, y, C[4], 0.15 + 0.5 * hit);
          }
    };
    return {
      update(dt) {
        if (t += dt, t > GONE4 && t < GONE4 + 0.38 && R6.chance(0.5)) {
          let lon = R6.range(0, Math.PI / 2), lat = R6.range(0.05, 1.4), [x, y] = onDome(lon, lat);
          ps.spawn(P.STAR, x, y, R6.range(-10, 10), -R6.range(10, 40), R6.range(0.2, 0.36), R6.chance(0.5) ? C[6] : C[5], R6.range(0.6, 1.4));
        }
        ps.update(dt), lights.update(dt);
      },
      drawBack(p) {
        dome(p, !0);
      },
      draw(p) {
        dome(p, !1);
        let fade = 1 - smooth(GONE4 + 0.3, GONE4 + 0.55, t);
        if (fade > 0) for (let x = CX; x <= CX + RX7; x++) p.dot(x, 0, t < 0.05 ? WHITE : C[5], fade * (0.6 + 0.4 * ((x - CX) / RX7)));
        t < 0.03 ? star(p, hx, hy, sp, 1, 1, [S[3], S[0], S[1], WHITE], 1, 2) : t < 0.06 && star(p, hx, hy, sp, 1.25, 0.55, [S[3], S[1], S[2], S[0]], 1, 2), ps.draw(p), p.glow(CX + RX7 * 0.5, -RY3 * 0.45, RY3 * 0.9, C[4], 0.2 * (1 - smooth(GONE4, GONE4 + 0.55, t)) + 0.35 * Math.exp(-t / 0.08)), lights.draw(p);
      }
    };
  }
  var meta93, BRACE2, act38, CX, RX7, RY3, GRID2, HIT8, GONE4, onDome, init_shield_block = __esm({
    "src/fx/impacts/shield-block.js"() {
      init_core();
      init_lib();
      meta93 = {
        name: "Shield block",
        desc: "A blow is caught on a half-dome of energy in front of the character: its diamond lattice flashes, a ripple runs over it, sparks glance off, then it blinks out cell by cell.",
        tags: ["impact", "block", "shield", "barrier", "energy", "ripple", "actor", "one-shot"],
        size: [148, 104],
        origin: [40, 88],
        duration: 1.1,
        loop: !1,
        fps: 30,
        bg: "ground",
        actor: 2,
        options: {
          palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"],
          sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
          seed: 12
        }
      }, BRACE2 = { ...READY, crouch: 4, lean: 2, fx: 13, fy: -28, bx: 6, by: -21, ffx: 9, fbx: -9 }, act38 = {
        poses: [
          [-0.36, READY],
          [-0.1, BRACE2],
          [0, { ...BRACE2, x: -3, crouch: 6, lean: -2, fx: 10, fy: -26 }, "snap"],
          [0.18, { ...BRACE2, x: -4, crouch: 5, lean: 0 }],
          [0.65, { ...BRACE2, x: -3 }],
          [1.1, { ...READY, x: 0 }]
        ],
        hits: [{ t: 5e-3, stop: 0.09, shake: 0.2, amp: 2 }],
        dust: [{ t: 0.01, x: -10, n: 6, dir: -1 }]
      }, CX = 3, RX7 = 28, RY3 = 44, GRID2 = 3.4, HIT8 = { lon: 1.18, lat: 0.5 }, GONE4 = 0.5, onDome = (lon, lat) => [CX + RX7 * Math.cos(lat) * Math.sin(lon), -RY3 * Math.sin(lat)];
    }
  });

  // src/fx/ice/snowflake-burst.js
  var snowflake_burst_exports = {};
  __export(snowflake_burst_exports, {
    create: () => create58,
    meta: () => meta94
  });
  function create58(o) {
    let C = fit(o.palette, 8), R6 = new Rng(o.seed), floor = () => 0, ps = new Particles({ rng: R6, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] }), lights = new Lights(), flakes = [], SIZES = [2, 0, 1, 0, 2, 0, 1, 0, 1];
    for (let i = 0; i < o.count; i++) {
      let z = SIZES[i % SIZES.length], r = z === 2 ? R6.range(9.5, 11.5) : z === 1 ? R6.range(6, 7.5) : R6.range(3, 4.5), a = i / o.count * TAU + R6.range(-0.3, 0.3) + 0.4, sp = R6.range(80, 120) * (1.4 - r / 14);
      flakes.push({
        x: 0,
        y: CY9,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.85 - 20,
        r,
        rot: R6.range(0, TAU),
        w0: R6.sign() * R6.range(7, 12),
        w1: R6.sign() * R6.range(0.4, 1),
        d: flakeDesign(R6),
        life: R6.range(2.1, 2.8),
        age: 0,
        ph: R6.range(0, TAU),
        tw: R6.range(0.5, 0.85),
        tw0: R6.range(0.15, 0.6),
        rest: !1,
        popped: !1
      });
    }
    let t = 0, popped = !1, sz = (f) => f.r * Math.min(1, ease.outBack(clamp(f.age / 0.18), 2)) * Math.min(1, (f.life - f.age) / 0.35);
    return {
      update(dt) {
        if (t += dt, t < POP4 - 0.03 && R6.chance(0.8)) {
          let a = R6.range(0, TAU), D25 = R6.range(22, 44), T2 = R6.range(0.12, 0.16), v = D25 * 3 / (Math.exp(3 * T2) - 1);
          ps.spawn(P.STREAK, Math.cos(a) * D25, CY9 + Math.sin(a) * D25, -Math.cos(a) * v, -Math.sin(a) * v, T2, R6.chance(0.5) ? C[6] : C[5]);
        }
        if (!popped && t >= POP4) {
          popped = !0, lights.add(0, CY9, 44, WHITE, 0.8, 0.1), lights.add(0, CY9, 72, C[4], 0.5, 0.6);
          for (let i = 0; i < 22; i++) {
            let a = R6.range(0, TAU), sp = R6.range(80, 150);
            ps.spawn(P.MOTE, 0, CY9, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.25, 0.5), R6.chance(0.5) ? C[6] : C[5], R6.range(0.6, 1));
          }
          for (let i = 0; i < 18; i++) {
            let a = R6.range(-Math.PI, 0.2), sp = R6.range(30, 110);
            ps.spawn(P.FLAKE, 0, CY9, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(1, 1.6), R6.chance(0.6) ? WHITE : C[6], R6.range(0.5, 1.5));
          }
          for (let i = 0; i < 12; i++) {
            let a = R6.range(0, TAU), d = R6.range(10, 44);
            ps.spawn(P.STAR, Math.cos(a) * d, CY9 + Math.sin(a) * d * 0.85, 0, R6.range(2, 6), R6.range(0.3, 0.6), R6.chance(0.5) ? WHITE : C[6], R6.range(0.8, 2.2), R6.range(0.08, 1.6));
          }
        }
        if (popped) {
          for (let f of flakes)
            if (f.age += dt, !(f.age >= f.life) && (f.rest || (f.vx -= f.vx * 2.8 * dt, f.vy -= f.vy * 2.8 * dt - 26 * dt, f.x += f.vx * dt + Math.sin(t * 1.8 + f.ph) * 5 * dt, f.y += f.vy * dt, f.rot += (f.w1 + (f.w0 - f.w1) * Math.exp(-f.age * 2.5)) * dt, f.y > -sz(f) * 0.3 && (f.rest = !0, f.y = -1, f.life = Math.min(f.life, f.age + 0.6))), !f.popped && f.life - f.age < 0.1)) {
              f.popped = !0;
              for (let i = 0; i < 2; i++) ps.spawn(P.STAR, f.x + R6.range(-2, 2), f.y + R6.range(-2, 2), R6.range(-6, 6), -R6.range(2, 8), R6.range(0.2, 0.4), R6.chance(0.5) ? WHITE : C[6], R6.range(0.8, 1.6));
            }
        }
        ps.update(dt), lights.update(dt), endBy(t, meta94.duration, ps);
      },
      draw(p) {
        if (t < POP4) {
          let k = t / POP4;
          snowflake(p, 0, CY9, 1 + 3.2 * k * k, t * 20, flakes[0].d, C, { hot: k }), p.glow(0, CY9, 8 + 14 * k, C[5], 0.3 + 0.4 * k);
        }
        let q = t - POP4;
        if (q >= 0 && q < 0.4) {
          q < 0.07 && p.circle(0, CY9, 6 * (1 - q / 0.07) + 1, WHITE), flare(p, 0, CY9, 28 * Math.pow(Math.max(0, 1 - q / 0.26), 1.5), 1 - q / 0.26, C);
          let e = ease.outCubic(q / 0.4), r = 5 + 34 * e;
          p.ring(0, CY9, r, Math.max(1, 2.4 * (1 - e)), q < 0.08 ? WHITE : q < 0.2 ? C[6] : C[5], 1.15 - e), p.glowRing(0, CY9, r, 5, C[5], 0.4 * (1 - e));
        }
        popped && p.glow(0, CY9, 46, C[4], 0.3 * (1 - smooth(POP4, POP4 + 1.6, t)));
        for (let f of flakes) {
          if (!popped || f.age >= f.life) continue;
          let r = sz(f), tw = Math.max(0, Math.sin((f.age - f.tw0) / f.tw * TAU)) ** 8 * (f.age > f.tw0 ? 1 : 0);
          if (f.rest) {
            let L = Math.max(1, Math.round(r * 1.2 * ((f.life - f.age) / 0.6)));
            for (let i = -L; i <= L; i++) p.px(f.x + i, -1, Math.abs(i) === L ? C[5] : i === 0 ? WHITE : C[6]);
            p.glow(f.x, -1, 3 + L, C[4], 0.3);
            continue;
          }
          snowflake(p, f.x, f.y, r, f.rot, f.d, C, { hot: Math.max(tw, 1 - clamp(f.age / 0.12)) }), p.glow(f.x, f.y, 6 + r * 1.4, C[4], 0.12), tw > 0.5 && flare(p, f.x, f.y, (3 + r * 0.7) * tw, tw, C);
        }
        ps.draw(p), lights.draw(p);
      }
    };
  }
  var meta94, POP4, CY9, init_snowflake_burst = __esm({
    "src/fx/ice/snowflake-burst.js"() {
      init_core();
      init_lib5();
      meta94 = {
        name: "Snowflake burst",
        desc: "A cold pop: frost gathers and flashes white in a ring, then crisp six-armed snowflakes spin out, slow, twinkle and drift down to settle and melt.",
        tags: ["ice", "snow", "snowflake", "burst", "magic", "one-shot"],
        size: [140, 120],
        origin: [70, 106],
        duration: 3.2,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], count: 9, seed: 8 }
      }, POP4 = 0.16, CY9 = -48;
    }
  });

  // src/fx/explosions/_lib.js
  function cull(ps, x0, y0, x1, y1) {
    let L = ps.list;
    for (let i = L.length - 1; i >= 0; i--) {
      let q = L[i];
      (q.x < x0 || q.x > x1 || q.y < y0 || q.y > y1) && L.splice(i, 1);
    }
  }
  function fadeEdges(ps, x0, x1, w = 30, y1 = 1 / 0) {
    let L = ps.list;
    for (let i = L.length - 1; i >= 0; i--) {
      let q = L[i];
      if (!SOFT3.has(q.k)) continue;
      let r = q.size * 1.65, e = Math.min((Math.min(q.x - x0, x1 - q.x) - r) / w, (y1 - q.y - r) / 6);
      e <= 0 ? L.splice(i, 1) : e < 1 && (q.life = Math.min(q.life, q.max * 0.42 * e));
    }
  }
  function pool2(p, x, y, rx, ry, c, k) {
    k <= 4e-3 || rx < 1 || ry < 0.5 || p.shade(x - rx, y - ry, x + rx, y + ry, (px, py, out) => {
      let dx = (px - x) / rx, dy = (py - y) / ry, d = dx * dx + dy * dy;
      if (d >= 1) return;
      let f = 1 - Math.sqrt(d);
      out.l = c, out.k = f * f * k;
    });
  }
  function lobe(p, x, y, r, FR, SM, fire, glow, a, z = 0, dark = 0, style = 0) {
    if (r < 0.7 || a <= 0.01) return;
    let n = FR.length, m = SM.length, back = z < -0.35 ? 1 : 0, rim = 1 - Math.min(0.35, 1.6 / r), seam = 1 - Math.min(0.3, 1.3 / r), D25 = (i) => SM[Math.min(m - 1, i + back + dark)], soft2 = 0.55 + 0.4 * (1 - Math.min(1, a)), px = (lx, ly, sx, sy) => {
      let dx = (lx - x) / r, dy = (ly - y) / r, d2 = dx * dx + dy * dy;
      if (d2 > 1) return;
      let d = Math.sqrt(d2), nz = Math.sqrt(1 - d2), sky = -0.5 * dx - 0.66 * dy + 0.56 * nz, v = fire * (1.32 - 0.78 * d) + 0.14 * sky * fire, c, k = 0, solid2 = !1;
      if (v > 0.44) {
        let i = Math.min(n - 3, Math.max(0, Math.floor((1.3 - v) * (n - 1) * 0.78)));
        d > seam ? i = Math.min(6, Math.max(4, i + 2)) : d > seam - 0.22 && (i = Math.min(n - 3, i + 1)), c = FR[i], k = 0.05 * fire, solid2 = !0;
      } else if (style) {
        let lam = -0.42 * dx - 0.78 * dy + 0.46 * nz;
        if (lam > 0.66 && d > 0.4) c = D25(0);
        else if (lam > 0.16) c = D25(1);
        else if (lam > -0.3) c = D25(2);
        else {
          c = D25(lam < -0.64 ? 4 : 3);
          let g = glow * (0.6 + 0.4 * dy);
          g > 0.55 ? (c = FR[g > 0.8 ? 5 : 6], k = 0.08 * g) : g > 0.34 ? c = mix(c, FR[6], 0.6) : g > 0.16 && (c = mix(c, FR[7], 0.45));
        }
      } else {
        let g = glow * (0.82 * dy + 0.3 * nz);
        if (g > 0.45) c = FR[g > 0.66 ? 4 : 5], k = 0.1 * glow;
        else if (g > 0.3) c = FR[6];
        else if (g > 0.2) c = FR[7];
        else {
          let s = sky * 0.5 + 0.5;
          c = D25(s > 0.8 ? 0 : s > 0.62 ? 1 : s > 0.42 ? 2 : s > 0.22 ? 3 : 4);
        }
      }
      p.blendPx(sx, sy, c, solid2 || d <= rim ? a : a * soft2), k > 0 && p.add(sx, sy, c, k);
    };
    if (p.sn !== 0 || p.cs !== 1) return p.each(x - r, y - r, x + r, y + r, px);
    let ax = p.tx + (x - r) * p.fx, bx = p.tx + (x + r) * p.fx, sx0 = Math.max(p.ox, Math.floor(Math.min(ax, bx))), sx1 = Math.min(p.ox + p.w - 1, Math.ceil(Math.max(ax, bx))), sy0 = Math.max(p.oy, Math.floor(p.ty + y - r)), sy1 = Math.min(p.oy + p.h - 1, Math.ceil(p.ty + y + r));
    for (let sy = sy0; sy <= sy1; sy++) {
      let ly = sy + 0.5 - p.ty, q = (ly - y) / r;
      if (q * q >= 1) continue;
      let hw = r * Math.sqrt(1 - q * q), cx = p.tx + x * p.fx;
      for (let sx = Math.max(sx0, Math.floor(cx - hw - 0.5)), e = Math.min(sx1, Math.ceil(cx + hw)); sx <= e; sx++) px((sx + 0.5 - p.tx) * p.fx, ly, sx, sy);
    }
  }
  var OUTLINE7, SOOT9, SOOT26, LIFTS, SOFT3, init_lib15 = __esm({
    "src/fx/explosions/_lib.js"() {
      init_core();
      OUTLINE7 = hex("#1a1422"), SOOT9 = hex("#0d0a12"), SOOT26 = hex("#17121d"), LIFTS = /* @__PURE__ */ new Set([P.SMOKE, P.DUST, P.FIRE, P.EMBER, P.VAPOUR]);
      SOFT3 = /* @__PURE__ */ new Set([P.SMOKE, P.DUST, P.VAPOUR]);
    }
  });

  // src/fx/explosions/smoke-bomb.js
  var smoke_bomb_exports = {};
  __export(smoke_bomb_exports, {
    create: () => create59,
    meta: () => meta95
  });
  function step(c, dt, hit) {
    c.rest || (c.vy += 900 * dt, c.x += c.vx * dt, c.y += c.vy * dt, c.y >= -R04 && c.vy > 0 && (c.y = -R04, c.vy > 80 ? (hit?.(c.x, c.vy), c.vy = -c.vy * 0.38, c.vx *= 0.78) : c.vy = 0), c.vy === 0 && c.y >= -R04 - 0.01 && (c.vx -= c.vx * 3 * dt, Math.abs(c.vx) < 2 && (c.vx = 0, c.rest = !0)), c.a += (c.vy === 0 ? c.vx / R04 : c.va) * dt);
  }
  function create59(o) {
    let C = fit(o.palette, 7), K2 = fit(o.canister, 5), R6 = new Rng(o.seed), floor = () => 0, SM = [C[5], C[4], C[3], C[2], C[1]], [W4, H3] = meta95.size, [OX2, OY2] = meta95.origin, X0 = -OX2 + 3, X1 = W4 - OX2 - 3, Y02 = -OY2 + 3, Y1 = H3 - OY2 - 3, ps = new Particles({ rng: R6, ground: floor, sparks: o.sparks }), lights = new Lights(), start = { x: -70, y: -60, vx: 125, vy: -80, va: 7, a: 0, rest: !1 }, sim = { ...start };
    for (let i = 0; i < 2400 && !sim.rest; i++) step(sim, 1 / 240);
    let can = { ...start, x: start.x - sim.x }, N9 = 52, lobes = Array.from({ length: N9 }, (_, i) => {
      let kind = [0, 0, 1, 1, 2, 3][i % 6], side = R6.sign(), ang = kind === 0 || kind === 3 ? side > 0 ? -R6.range(0, 0.25) : Math.PI + R6.range(0, 0.25) : -Math.PI / 2 + R6.range(-0.6, 0.6), sp = [R6.range(70, 170), R6.range(0, 25), R6.range(45, 95), R6.range(20, 60)][kind], r1 = [R6.range(12, 17), R6.range(16, 22), R6.range(13, 18), R6.range(14, 19)][kind], t0 = kind === 3 ? POP5 + R6.range(0.45, 1.5) : POP5 + 0.6 * Math.pow(i / (N9 - 1), 1.6) + R6.range(0, 0.03);
      return { kind, t0, vx: Math.cos(ang) * sp, vh: -Math.sin(ang) * sp, d: R6.range(-1, 1), r0: R6.range(5, 8), r1, f: R6.range(-0.45, 0.4), wob: R6.range(0, TAU), on: !1, x: 0, h: 0, age: 0 };
    }), t = 0, popped = !1, fuseTip = () => [can.x + Math.sin(can.a) * (R04 + 2.5), can.y - Math.cos(can.a) * (R04 + 2.5)], radius3 = (b) => (b.r0 + (b.r1 - b.r0) * (1 - Math.exp(-b.age / 0.28))) * (1 + 0.05 * Math.sin(t * 3 + b.wob)) * (1 + 0.35 * thin(b)), thin = (b) => smooth(2.5 + b.f, 3.9 + b.f * 0.6, t);
    return {
      update(dt) {
        if (t += dt, step(can, dt, (x, sp) => {
          for (let i = 0; i < 3; i++) ps.spawn(P.SPARK, x, -1, R6.range(-70, 70), -R6.range(40, 110), R6.range(0.06, 0.14));
          for (let i = 0; i < 3; i++) ps.spawn(P.DUST, x + R6.range(-2, 2), -0.5, R6.sign() * R6.range(10, 40), -R6.range(4, 14), R6.range(0.3, 0.55), GRIT[2], R6.range(1.4, 2.4));
        }), t < POP5) {
          let [fx, fy] = fuseTip(), hurry = smooth(POP5 - 0.4, POP5, t);
          R6.chance((26 + 50 * hurry) * dt) && ps.spawn(P.SPARK, fx, fy, R6.range(-50, 50), -R6.range(30, 100), R6.range(0.08, 0.18)), R6.chance(8 * dt) && ps.spawn(P.VAPOUR, fx, fy - 1, R6.range(-4, 4), -R6.range(10, 18), R6.range(0.5, 0.8), C[5], R6.range(1, 1.8));
        } else if (!popped) {
          popped = !0, lights.add(can.x, -9, 64, C[6], 0.75, 0.22), lights.add(can.x, -5, 22, WHITE, 0.7, 0.06);
          for (let i = 0; i < 30; i++) {
            let a = R6.range(-Math.PI - 0.35, 0.35), sp = R6.range(120, 300);
            ps.spawn(P.SPARK, can.x, -5, Math.cos(a) * sp, Math.sin(a) * sp - 40, R6.range(0.15, 0.4));
          }
          for (let i = 0; i < 26; i++) {
            let u = R6.range(-1, 1), a = -Math.PI / 2 + u * 0.9, sp = R6.range(80, 220) * (1 - 0.35 * Math.abs(u));
            ps.spawn(P.GRIT, can.x + u * 4, -1, Math.cos(a) * sp, Math.sin(a) * sp, R6.range(0.9, 1.6), R6.pick(GRIT), R6.chance(0.35) ? 2 : 1);
          }
          Object.assign(can, { vy: -95, vx: R6.range(-25, 25), va: R6.sign() * 9, rest: !1 });
        }
        let wind2 = 6 * smooth(1.8, 3.2, t);
        for (let b of lobes) {
          if (!b.on) {
            if (t < b.t0) continue;
            b.on = !0, b.x = can.x + R6.range(-2, 2), b.h = 1;
          }
          b.age += dt, b.vx -= b.vx * 2.4 * dt, b.vh += [14 * smooth(0.7, 1.6, b.age), 3 + 9 * smooth(0.8, 1.8, b.age), 6 + 12 * smooth(0.3, 1.4, b.age), 10 * smooth(0.8, 1.6, b.age)][b.kind] * dt, b.vh -= b.vh * 1.6 * dt, b.x += (b.vx + wind2) * dt, b.h = Math.max(0, b.h + b.vh * dt);
          let k = thin(b);
          if (k > 0.12 && k < 0.85 && R6.chance(1.8 * dt)) {
            let r = radius3(b), life = Math.min(R6.range(1, 1.6), meta95.duration - 0.15 - t);
            life > 0.3 && ps.spawn(P.VAPOUR, b.x + R6.range(-r, r) * 0.5, -(b.h + r * 1.4), wind2 + R6.range(-6, 10), -R6.range(8, 20), life, C[4], r * R6.range(0.3, 0.45));
          }
        }
        t > POP5 + 0.5 && t < 4.1 && R6.chance(4 * dt) && ps.spawn(P.VAPOUR, can.x, can.y - 3, R6.range(-3, 3), -R6.range(8, 16), R6.range(0.6, 0.9), C[4], R6.range(1.5, 2.5)), ps.update(dt), cull(ps, X0, Y02, X1, Y1), fadeEdges(ps, X0, X1, 20, Y1), lights.update(dt);
      },
      drawBack(p) {
        ps.draw(p, "back"), clouds(p, !0);
      },
      draw(p) {
        let fade = 1 - smooth(4.3, 4.8, t);
        if (fade > 0 && drawCanister(p, K2, can, t < POP5, fade), t < POP5) {
          let [fx, fy] = fuseTip();
          p.px(fx, fy, Math.sin(t * 50) > 0 ? WHITE : hex(o.sparks[1])), p.glow(fx, fy, 6, hex(o.sparks[2]), 0.45 + 0.2 * Math.sin(t * 37));
        }
        clouds(p, !1), ps.draw(p, "front");
        let u = t - POP5;
        u >= 0 && u < 0.067 && (p.circle(can.x, -5, 6.5, C[5]), p.circle(can.x, -5, 4.5, WHITE)), u >= 0 && u < 0.16 && flare(p, can.x, -5, 22 * (1 - u / 0.16), 1 - u / 0.16, [C[3], C[4], C[5], C[6]]), u >= 0 && u < 0.35 && pool2(p, can.x, 1, 50, 8, C[6], 0.5 * (1 - u / 0.35)), lights.draw(p);
      }
    };
    function clouds(p, back) {
      let on2 = lobes.filter((b) => b.on);
      if (!on2.length) return;
      let top = 0;
      for (let b of on2) top = Math.min(top, -(b.h + radius3(b) * 1.92));
      for (let b of on2.filter((b2) => b2.d < -0.35 === back).sort((a, b2) => a.d - b2.d)) {
        let r = radius3(b), y = -(b.h + r * 0.92) + b.d * 2.5, k = thin(b), a = Math.min(1, b.age / 0.05) * Math.pow(1 - k, 1.4) * 0.97 * (1 - smooth(-OY2 + 34, -OY2 + 6, y - r));
        if (a <= 0.01) continue;
        let shade = (y - top) / Math.max(20, -top) > 0.55 ? 1 : 0;
        lobe(p, b.x, y, r, SM, SM, 0, 0, a, b.d, Math.min(2, shade + (k > 0.6 ? 1 : 0)), 1);
      }
    }
  }
  function drawCanister(p, K2, c, live, a) {
    let ca = Math.cos(c.a), sa = Math.sin(c.a);
    p.shade(c.x - R04 - 2, c.y - R04 - 2, c.x + R04 + 2, c.y + R04 + 2, (px, py, out) => {
      let dx = px - c.x, dy = py - c.y, d = Math.hypot(dx, dy);
      if (d > R04 + 1) return;
      if (out.a = a, d > R04) return OUTLINE7;
      let v = -dx * sa + dy * ca, lit = -(dx * 0.6 + dy * 0.8) / R04;
      return Math.abs(v) < 0.9 ? BAND[lit > 0.3 ? 2 : lit > -0.4 ? 1 : 0] : d < R04 * 0.5 && lit > 0.45 ? K2[4] : K2[lit > 0.5 ? 3 : lit > 0 ? 2 : lit > -0.5 ? 1 : 0];
    });
    let cx = c.x + sa * R04, cy = c.y - ca * R04;
    live ? p.line(cx, cy, cx + sa * 2.5, cy - ca * 2.5, hex("#8a6a48"), a) : p.dot(cx, cy, K2[0], a);
  }
  var meta95, POP5, R04, BAND, GRIT, init_smoke_bomb = __esm({
    "src/fx/explosions/smoke-bomb.js"() {
      init_core();
      init_lib15();
      meta95 = {
        name: "Smoke bomb",
        desc: "A round canister clinks down, fuse sparking, and pops: thick grey-violet smoke gushes out, rolls along the floor, billows into a cloud that hides all, then thins to wisps.",
        tags: ["smoke", "smoke-bomb", "ninja", "vanish", "escape", "ground", "one-shot"],
        size: [260, 176],
        origin: [130, 156],
        duration: 5,
        loop: !1,
        fps: 30,
        bg: "ground",
        options: {
          palette: ["#0e0b14", "#1e1828", "#30283e", "#463c58", "#62567a", "#867a9e", "#aea4c4"],
          canister: ["#16121e", "#2a2434", "#443c52", "#686078", "#9c94ac"],
          sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
          seed: 3
        }
      }, POP5 = 0.95, R04 = 4, BAND = [hex("#3a1418"), hex("#7a2a24"), hex("#b84a34")], GRIT = [hex("#5a4f6b"), hex("#3e3650"), hex("#776c88")];
    }
  });

  // entry.js
  var require_entry = __commonJS({
    "entry.js"() {
      init_fx();
      init_hit_spark();
      init_crit_hit();
      init_blunt_hit();
      init_sword_slash();
      init_thrust();
      init_dagger_flurry();
      init_claw_swipe();
      init_heavy_cleave();
      init_arrow();
      init_fireball();
      init_ice_lance();
      init_heal();
      init_curse();
      init_bleeding();
      init_sleep();
      init_poof();
      init_soul_rise();
      init_collect_burst();
      init_campfire();
      init_candle();
      init_torch();
      init_small_explosion();
      init_ice_shatter();
      init_smite();
      init_acid_splash();
      init_magic_missile();
      init_meteor();
      init_flame_pillar();
      init_fire_tornado();
      init_fire_ring();
      init_fire_breath();
      init_burning();
      init_spirit_flame();
      init_icicle_fall();
      init_frost_breath();
      init_frost_nova();
      init_ice_spikes();
      init_blizzard_vortex();
      init_lightning_strike();
      init_chain_lightning();
      init_zap_hit();
      init_thunderclap();
      init_storm_cloud();
      init_poison_cloud();
      init_poisoned();
      init_spore_burst();
      init_root_snare();
      init_thorns();
      init_toxic_puddle();
      init_earth_spike();
      init_quake();
      init_tornado();
      init_leaf_storm();
      init_holy_pillar();
      init_sunburst();
      init_feather_burst();
      init_heal_aoe();
      init_healing_bloom();
      init_resurrection();
      init_blessing();
      init_halo();
      init_divine_shield();
      init_hex_sigil();
      init_soul_drain();
      init_dark_explosion();
      init_necro_skulls();
      init_eclipse();
      init_life_steal();
      init_grasping_hands();
      init_shadow_tendrils();
      init_void_orb();
      init_disintegrate();
      init_charmed();
      init_confused();
      init_stunned();
      init_petrified();
      init_slowed();
      init_haste();
      init_rage();
      init_mana_burst();
      init_blink_out();
      init_time_stop();
      init_star_fall();
      init_rune_circle();
      init_force_field();
      init_summon_rise();
      init_spawn_portal();
      init_spin_slash();
      init_hammer_smash();
      init_ground_slam();
      init_uppercut();
      init_double_slash();
      init_shield_block();
      init_snowflake_burst();
      init_smoke_bomb();
      G.PFX = { createFrame, clearFrame, createFx, mods: { "impacts/hit-spark": hit_spark_exports, "impacts/crit-hit": crit_hit_exports, "impacts/blunt-hit": blunt_hit_exports, "melee/sword-slash": sword_slash_exports, "melee/thrust": thrust_exports, "melee/dagger-flurry": dagger_flurry_exports, "melee/claw-swipe": claw_swipe_exports, "melee/heavy-cleave": heavy_cleave_exports, "projectiles/arrow": arrow_exports, "fire/fireball": fireball_exports, "ice/ice-lance": ice_lance_exports, "holy/heal": heal_exports, "shadow/curse": curse_exports, "status/bleeding": bleeding_exports, "status/sleep": sleep_exports, "spawn/poof": poof_exports, "spawn/soul-rise": soul_rise_exports, "pickups/collect-burst": collect_burst_exports, "fire/campfire": campfire_exports, "fire/candle": candle_exports, "fire/torch": torch_exports, "explosions/small-explosion": small_explosion_exports, "ice/ice-shatter": ice_shatter_exports, "holy/smite": smite_exports, "nature/acid-splash": acid_splash_exports, "projectiles/magic-missile": magic_missile_exports, "fire/meteor": meteor_exports, "fire/flame-pillar": flame_pillar_exports, "fire/fire-tornado": fire_tornado_exports, "fire/fire-ring": fire_ring_exports, "fire/fire-breath": fire_breath_exports, "status/burning": burning_exports, "fire/spirit-flame": spirit_flame_exports, "ice/icicle-fall": icicle_fall_exports, "ice/frost-breath": frost_breath_exports, "ice/frost-nova": frost_nova_exports, "ice/ice-spikes": ice_spikes_exports, "ice/blizzard-vortex": blizzard_vortex_exports, "lightning/lightning-strike": lightning_strike_exports, "lightning/chain-lightning": chain_lightning_exports, "lightning/zap-hit": zap_hit_exports, "lightning/thunderclap": thunderclap_exports, "lightning/storm-cloud": storm_cloud_exports, "nature/poison-cloud": poison_cloud_exports, "status/poisoned": poisoned_exports, "nature/spore-burst": spore_burst_exports, "nature/root-snare": root_snare_exports, "nature/thorns": thorns_exports, "nature/toxic-puddle": toxic_puddle_exports, "nature/earth-spike": earth_spike_exports, "nature/quake": quake_exports, "nature/tornado": tornado_exports, "nature/leaf-storm": leaf_storm_exports, "holy/holy-pillar": holy_pillar_exports, "holy/sunburst": sunburst_exports, "holy/feather-burst": feather_burst_exports, "holy/heal-aoe": heal_aoe_exports, "nature/healing-bloom": healing_bloom_exports, "holy/resurrection": resurrection_exports, "holy/blessing": blessing_exports, "holy/halo": halo_exports, "holy/divine-shield": divine_shield_exports, "shadow/hex-sigil": hex_sigil_exports, "shadow/soul-drain": soul_drain_exports, "shadow/dark-explosion": dark_explosion_exports, "shadow/necro-skulls": necro_skulls_exports, "shadow/eclipse": eclipse_exports, "shadow/life-steal": life_steal_exports, "shadow/grasping-hands": grasping_hands_exports, "shadow/shadow-tendrils": shadow_tendrils_exports, "shadow/void-orb": void_orb_exports, "spawn/disintegrate": disintegrate_exports, "status/charmed": charmed_exports, "status/confused": confused_exports, "status/stunned": stunned_exports, "status/petrified": petrified_exports, "status/slowed": slowed_exports, "status/haste": haste_exports, "status/rage": rage_exports, "arcane/mana-burst": mana_burst_exports, "arcane/blink-out": blink_out_exports, "arcane/time-stop": time_stop_exports, "arcane/star-fall": star_fall_exports, "arcane/rune-circle": rune_circle_exports, "scifi/force-field": force_field_exports, "spawn/summon-rise": summon_rise_exports, "spawn/spawn-portal": spawn_portal_exports, "melee/spin-slash": spin_slash_exports, "melee/hammer-smash": hammer_smash_exports, "impacts/ground-slam": ground_slam_exports, "melee/uppercut": uppercut_exports, "melee/double-slash": double_slash_exports, "impacts/shield-block": shield_block_exports, "ice/snowflake-burst": snowflake_burst_exports, "explosions/smoke-bomb": smoke_bomb_exports } };
    }
  });
  require_entry();
})();
