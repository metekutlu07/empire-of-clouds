// No WebGL postprocessing — noise is a simple 2D canvas overlay (same as index page).

(() => {
    const canvas = document.getElementById("c");
    const ctx = canvas.getContext("2d", { alpha: false });

    // ── 2D output canvas + noise overlay (same system as index page) ────────
    const glCanvas = document.getElementById("gl");
    const glCtx    = glCanvas.getContext("2d");
    const host = document.getElementById("glyphHero");
    let hostW = 1, hostH = 1;

    // Noise: pre-generate 10 frames of random pixel data, cycle at ~25 fps.
    let noiseFrames    = [];
    let noiseFrameIdx  = 0;
    let noiseTickCount = 0;
    const NOISE_FRAMES    = 10;
    const NOISE_FPS_EVERY = 2; // advance every N animation frames ≈ 25 fps at 60 fps

    function buildNoiseFrames(w, h) {
        noiseFrames = [];
        for (let f = 0; f < NOISE_FRAMES; f++) {
            const nc   = document.createElement("canvas");
            nc.width   = w;
            nc.height  = h;
            const nCtx = nc.getContext("2d");
            const idata = nCtx.createImageData(w, h);
            const buf   = new Uint32Array(idata.data.buffer);
            for (let i = 0; i < buf.length; i++) {
                if      (Math.random() < 0.05) buf[i] = 0x080000ff; // red,  alpha 8
                else if (Math.random() < 0.10) buf[i] = 0x0800ff00; // green,alpha 8
                else if (Math.random() < 0.15) buf[i] = 0x08ff0000; // blue, alpha 8
                else if (Math.random() < 0.20) buf[i] = 0xccdddddd; // gray, alpha 204
            }
            nCtx.putImageData(idata, 0, 0);
            noiseFrames.push(nc);
        }
        noiseFrameIdx  = 0;
        noiseTickCount = 0;
    }

    // ── Glyph sets ─────────────────────────────────────────────────────────
    const GLYPHS = [
        "⸜", "⸝", "⸠", "⸡", "⸢", "⸣", "⸤", "⸥", "⸦", "⸧",
        "⸨", "⸩", "⸪", "⸫", "⸬", "⸭", "⸮", "ⸯ", "⸰", "⸱",
        "⸲", "⸳", "⸴", "⸵", "⸶", "⸷", "⸸", "⸹", "⸺", "⸻",
        "※", "⁂", "⁑", "⁕", "⁜", "⁘", "⁙", "⁚", "⁛", "⁝",
        "⟆", "⟇", "⟈", "⟉", "⟊", "⟋", "⟌", "⟍", "⟎", "⟏",
        "⧖", "⧗", "⧘", "⧙", "⧚", "⧛", "⧜", "⧝", "⧞", "⧟",
        "⧠", "⧡", "⧢", "⧣", "⧤", "⧥", "⧦", "⧧", "⧨", "⧩",
        "Ⳁ", "ⳁ", "Ⳃ", "ⳃ", "Ⳅ", "ⳅ", "Ⳇ", "ⳇ", "Ⳉ", "ⳉ",
        "Ⳋ", "ⳋ", "Ⳍ", "ⳍ", "Ⳏ", "ⳏ", "Ⳑ", "ⳑ", "Ⳓ", "ⳓ",
        "Ⳕ", "ⳕ", "Ⳗ", "ⳗ", "Ⳙ", "ⳙ", "Ⳛ", "ⳛ", "Ⳝ", "ⳝ",
        "꙳", "꙰", "꙱", "꙲", "ꙴ", "ꙵ", "ꙶ", "ꙷ", "ꙸ", "ꙹ",
        "ꙺ", "ꙻ", "꙼", "꙽", "꙾", "ꙿ",
        "⟐", "⟑", "⟒", "⟓", "⟔", "⟕", "⟖", "⟗", "⟘", "⟙",
        "∴", "∵", "∷", "∺", "∻", "∽", "≋", "≈",
        "⟜", "⟝", "⟞", "⟟", "⟠", "⟡", "⟢", "⟣",
        "⍜", "⍝", "⍞", "⍟", "⍠", "⍡", "⍢", "⍣", "⍤", "⍥",
        "⍦", "⍧", "⍨", "⍩", "⍪", "⍫", "⍬", "⍭", "⍮", "⍯"
    ];

    const STAR = [
        "✳", "✶", "✷", "✸", "✹", "✺", "✻", "✼", "✽", "✾",
        "✴", "❇", "❈", "❉", "❊", "❋", "✦", "✧", "✩", "✪"
    ];

    const SACRED = [
        "𑈀", "𑈁", "𑈂", "𑈃", "𑈄", "𑈅", "𑈆", "𑈇", "𑈈", "𑈉",
        "𑈊", "𑈋", "𑈌", "𑈍", "𑈎", "𑈏", "𑈐", "𑈑", "𑈒", "𑈓"
    ];

    const CLOUD = [
        "𐹷", "𐹰", "𑂔", "𑃘", "𑅀", "𑇛", "𑈁", "𑈼", "𑈿",
        "𐘊", "𐘋", "𑍈", "𑖰", "𑜸"
    ];

    // ── Constants ──────────────────────────────────────────────────────────
    const CELL = 20;
    const FONT_SCALE = 0.95;
    const UPDATE_PROB = 0.016;
    const MIN_SWAP_MS = 180;
    const MAX_SWAP_MS = 2600;
    const FILL_BASE = 0.56;
    const FILL_VARIATION = 0.28;
    const FILL_SCALE = 0.09;
    const PUSH_RADIUS_CELLS = 7;           // eslint-disable-line no-unused-vars
    const PINK_DECAY = 0.986;
    const PINK_ALPHA_MIN = 0.20;
    const WAVE_MAX_STEP = 6;
    const WAVE_STEP_RADIUS = 2.2;
    const WAVE_THICKNESS = 0.65;
    const WAVE_STEP_MS = 92;
    const SWEEP_INTERVAL = 10000;
    const SWEEP_DURATION = 3000;
    const TRAIL_LENGTH = 40;
    const TRAIL_DECAY = 0.95;
    const TRAIL_MIN_ALPHA = 0.03;
    const ACCENT_PROB = 0.16;
    const ACCENT_ALPHA = 0.95;
    const ACCENT_DIM_ALPHA = 0.70;
    const HUE_JITTER = 10;
    const LIGHT_JITTER = 6;
    const HUES = [
        { h: 137, s: 100, l: 73 },  // green
        { h: 318, s: 100, l: 77 }   // pink
    ];

    // ── Intro emergence ────────────────────────────────────────────────────
    const INTRO_STAGGER_MS = 800;
    const INTRO_RISE_MS = 250;
    const INTRO_BLACK_MS = 300;
    const INTRO_DONE_MS = INTRO_STAGGER_MS + INTRO_RISE_MS + 250;

    let introStart = performance.now();
    let introDone = false;
    let lastNow = 0;
    let cellReveal, spawnAt;

    function resetIntro(N) {
        introStart = performance.now();
        introDone = false;
        cellReveal = new Float32Array(N);
        spawnAt = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            spawnAt[i] = Math.random() * INTRO_STAGGER_MS;
            cellReveal[i] = 0;
        }
    }

    function revealMult(i, now) {
        if (introDone) return 1;
        return clamp((now - introStart - INTRO_BLACK_MS - spawnAt[i]) / INTRO_RISE_MS, 0, 1);
    }

    // ── Utilities ──────────────────────────────────────────────────────────
    function randInt(n) { return (Math.random() * n) | 0; }
    function rand(a, b) { return a + Math.random() * (b - a); }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

    // ── Perlin + fBm ──────────────────────────────────────────────────────
    const perm = new Uint8Array(512);
    {
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            [p[i], p[j]] = [p[j], p[i]];
        }
        for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    }

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function grad(hash, x, y) {
        const h = hash & 7;
        const u = h < 4 ? x : y, v = h < 4 ? y : x;
        return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
    }
    function perlin(x, y) {
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x), yf = y - Math.floor(y);
        const u = fade(xf), v = fade(yf);
        const aa = perm[X + perm[Y]], ab = perm[X + perm[Y + 1]];
        const ba = perm[X + 1 + perm[Y]], bb = perm[X + 1 + perm[Y + 1]];
        const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
        const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
        return lerp(x1, x2, v) * 0.5 + 0.5;
    }
    function fbm(x, y) {
        let n = 0, amp = 0.55, freq = 1.0;
        for (let i = 0; i < 4; i++) { n += amp * perlin(x * freq, y * freq); amp *= 0.55; freq *= 2.02; }
        return n;
    }

    // ── Grid state ────────────────────────────────────────────────────────
    let cols = 0, rows = 0, dpr = 1;
    let glyphIdx, filled, holeMask, nextSwapAt;
    let pink, ring, ringGlyph;
    let waveFamilyMap, familyColorMap;

    // ── Mask / morph ──────────────────────────────────────────────────────
    let maskMode = "circle";
    let morphActive = false;
    let morphStart = 0;
    const morphDuration = 1500;
    let morphFrom = "circle";
    let morphTo = "star";

    // ── Trail — circular buffer (O(1) insert vs O(n) unshift) ────────────
    const trailBuf = new Array(TRAIL_LENGTH).fill(null).map(() => ({ i: -1, a: 0, g: "" }));
    let trailHead = 0;    // next write slot (mod TRAIL_LENGTH)
    let trailCount = 0;    // how many slots are populated (up to TRAIL_LENGTH)
    let trailPrev = [];   // cell indices drawn last frame (to redraw base)
    let trailDirty = null; // Uint8Array — dirty flags, avoids Set per frame

    let lastTrailIndex = -1;

    // ── Waves ─────────────────────────────────────────────────────────────
    const waves = [];
    let blobWaves = [];
    let sweepStart = 0, sweepActive = false, lastSweepTime = 0;
    let sweepPhase;

    // ── Rect cache ────────────────────────────────────────────────────────
    let _cachedRect = null;   // refreshed on resize, not per pointer event

    // ── Colors ────────────────────────────────────────────────────────────
    // Resolved once at startup; refreshed on resize
    let CSS_BG = "#000";
    let CSS_FG = "#fff";
    let CSS_FG_DIM = "#7a7a7a";
    function refreshCssVars() {
        const cs = getComputedStyle(document.documentElement);
        CSS_BG = cs.getPropertyValue("--bg").trim() || "#000";
        CSS_FG = cs.getPropertyValue("--fg").trim() || "#fff";
        CSS_FG_DIM = cs.getPropertyValue("--fgDim").trim() || "#7a7a7a";
    }
    refreshCssVars();

    // Quantized alpha lookup tables — 64 levels covers all visible steps.
    // Eliminates string interpolation inside drawCell (called at 60fps × N cells).
    const ALPHA_LEVELS = 64;

    function _buildColorLUT(templateFn) {
        const lut = new Array(ALPHA_LEVELS + 1);
        for (let i = 0; i <= ALPHA_LEVELS; i++) {
            lut[i] = templateFn((i / ALPHA_LEVELS).toFixed(3));
        }
        return lut;
    }

    const LUT_GREEN = _buildColorLUT(a => `hsla(137,100%,73%,${a})`);
    const LUT_PINK = _buildColorLUT(a => `hsla(318,100%,77%,${a})`);
    const LUT_GOLD = _buildColorLUT(a => `rgba(255,240,150,${a})`);

    // Index matches familyColorMap values: 0=green, 1=pink, 2=gold
    const FAMILY_LUTS = [LUT_GREEN, LUT_PINK, LUT_GOLD];

    function lutColor(lut, a) {
        return lut[(clamp(a, 0, 1) * ALPHA_LEVELS + 0.5) | 0];
    }

    function pinkColor(a) { return lutColor(LUT_PINK, a); }
    function greenColor(a) { return lutColor(LUT_GREEN, a); }

    // ── Style / accent ────────────────────────────────────────────────────
    // Per-cell cached color string — computed once in pickStyle.
    // Accent string cache: avoids rebuilding the same hsla string for identical h/l/a combos.
    let cellColor;
    const _accentCache = new Map();

    function _accentColor(h, l, a) {
        const key = (h << 16) | (l << 8) | (a > 0.8 ? 1 : 0);  // compact integer key
        let s = _accentCache.get(key);
        if (!s) { s = `hsla(${h},95%,${l}%,${a})`; _accentCache.set(key, s); }
        return s;
    }

    function pickStyle(i, prob = ACCENT_PROB) {
        if (Math.random() < prob) {
            const base = HUES[randInt(HUES.length)];
            const h = Math.round(((base.h + rand(-HUE_JITTER, HUE_JITTER)) % 360 + 360) % 360);
            const l = clamp(Math.round(base.l + rand(-LIGHT_JITTER, LIGHT_JITTER)), 30, 85);
            const a = (Math.random() < 0.15) ? ACCENT_DIM_ALPHA : ACCENT_ALPHA;
            cellColor[i] = _accentColor(h, l, a);
        } else {
            cellColor[i] = (Math.random() < 0.28) ? CSS_FG_DIM : CSS_FG;
        }
    }

    // ── Glyph families ────────────────────────────────────────────────────
    const glyphFamilies = [
        { name: "Astral Script", icon: "✷", glyphs: STAR, shape: "circle" },
        { name: "Sacred Script", icon: "𑈇", glyphs: SACRED, shape: "starz" },
        { name: "Cloud Script", icon: "𑃘", glyphs: CLOUD, shape: "diamond" }
    ];

    let currentFamilyIndex = 0;

    // Cache once — these elements never move
    const _iconEl = document.getElementById("familyIcon");
    const _nameEl = document.getElementById("familyName");
    const FAM_COLORS = ["hsla(137,100%,73%,1)", "hsla(318,100%,77%,1)", "rgba(255,240,150,1)"];

    function updateFamilyIndicator() {
        const family = glyphFamilies[currentFamilyIndex];
        const color = FAM_COLORS[currentFamilyIndex];
        if (_iconEl) { _iconEl.textContent = family.icon; _iconEl.style.color = color; }
        if (_nameEl) { _nameEl.textContent = family.name; _nameEl.style.color = color; }
    }

    // ---------- Wave Sounds ----------
    const waveSounds = {
        left: [
            new Audio("audio/glyph-interaction/astral_left.mp3"),
            new Audio("audio/glyph-interaction/sacred_left.mp3"),
            new Audio("audio/glyph-interaction/cloud_left.mp3")
        ],
        right: [
            new Audio("audio/glyph-interaction/astral_right.mp3"),
            new Audio("audio/glyph-interaction/sacred_right.mp3"),
            new Audio("audio/glyph-interaction/cloud_right.mp3")
        ]
    };
    for (const type in waveSounds) waveSounds[type].forEach(a => a.preload = "auto");

    function playWaveSound(type, famIdx) {
        const base = waveSounds[type][famIdx];
        if (!base) return;
        const s = base.cloneNode();
        s.volume = 0.4;
        s.play().catch(() => { });
    }

    // ── Drawing ───────────────────────────────────────────────────────────
    const fontPx = Math.floor(CELL * FONT_SCALE);
    const CELL_FONT = `${fontPx}px "IBM Plex Mono", "Noto Sans Symbols 2", "Noto Sans Symbols", "Noto Sans Khojki", "Noto Sans Kaithi", "Noto Sans Sharada", "Noto Sans Khudawadi", "Noto Sans Grantha", "Noto Sans Mahajani", "Noto Sans Zanabazar Square", "Noto Sans Siddham", ui-monospace, monospace`;
    const CELL_HALF = CELL / 2;        // constant — avoid recomputing per drawCell call
    const CELL_MID = CELL_HALF + 0.5; // text y-offset

    function drawCell(i) {
        const c = i % cols, r = (i / cols) | 0;
        const x = c * CELL, y = r * CELL;
        const tx = x + CELL_HALF, ty = y + CELL_MID;

        // Invariant: ctx.globalAlpha === 1 on entry and exit
        ctx.fillStyle = CSS_BG;
        ctx.fillRect(x, y, CELL, CELL);

        const em = introDone ? 1 : revealMult(i, lastNow);
        const rVal = ring[i];

        if (rVal > 0.001) {
            // globalAlpha stays 1 throughout ring branch
            ctx.fillStyle = lutColor(FAMILY_LUTS[familyColorMap[i]], clamp((0.15 + 0.85 * rVal) * em, 0, 0.95));
            const glyphSet = glyphFamilies[waveFamilyMap[i]].glyphs;
            ctx.fillText(glyphSet[ringGlyph[i] % glyphSet.length], tx, ty);
            return;
        }

        if (holeMask[i]) return;
        if (!filled[i]) return;

        const p = pink[i];
        if (em !== 1) ctx.globalAlpha = em;   // only pay for state change during intro
        ctx.fillStyle = p > 0.02
            ? lutColor(LUT_PINK, clamp(PINK_ALPHA_MIN + 0.78 * p, 0, 0.95))
            : cellColor[i];
        ctx.fillText(GLYPHS[glyphIdx[i] % GLYPHS.length], tx, ty);
        if (em !== 1) ctx.globalAlpha = 1;    // restore only if we changed it
    }

    function drawAll() {
        ctx.font = CELL_FONT;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 1;
        ctx.fillStyle = CSS_BG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const N = cols * rows;
        for (let i = 0; i < N; i++) drawCell(i);
    }

    function drawTrailOverlay() {
        // Erase previous frame's trail cells
        for (let j = 0; j < trailPrev.length; j++) {
            const i = trailPrev[j];
            if (i >= 0 && i < cols * rows) { drawCell(i); trailDirty[i] = 0; }
        }
        trailPrev.length = 0;
        if (!trailCount) return;

        // Iterate newest → oldest; decay alpha; stop drawing when faded out
        let alive = 0;
        for (let k = 0; k < trailCount; k++) {
            const slot = (trailHead - 1 - k + TRAIL_LENGTH) % TRAIL_LENGTH;
            const m = trailBuf[slot];
            if (m.a <= 0) continue;          // slot already dead
            m.a *= TRAIL_DECAY;
            const taper = 1 - (k / Math.max(1, trailCount - 1));
            const a = clamp(m.a * taper, 0, 0.9);
            if (a > TRAIL_MIN_ALPHA) {
                alive++;
                const i = m.i;
                const c = i % cols, r = (i / cols) | 0;
                ctx.fillStyle = lutColor(LUT_GREEN, a);
                ctx.fillText(m.g, c * CELL + CELL_HALF, r * CELL + CELL_MID);
                if (!trailDirty[i]) { trailDirty[i] = 1; trailPrev.push(i); }
            } else {
                m.a = 0;   // mark slot dead
            }
        }
        trailCount = alive;
    }

    // ── Grid seeding ──────────────────────────────────────────────────────
    function seedGrid() {
        const now = performance.now();
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const i = r * cols + c;
                glyphIdx[i] = randInt(GLYPHS.length);
                nextSwapAt[i] = now + rand(MIN_SWAP_MS, MAX_SWAP_MS);
                const density = clamp(fbm(c * FILL_SCALE, r * FILL_SCALE) - (1 - FILL_BASE), 0, 1);
                filled[i] = Math.random() < (FILL_BASE - FILL_VARIATION + density) ? 1 : 0;
                pickStyle(i);
                pink[i] = 0;
                ring[i] = 0;
                ringGlyph[i] = randInt(STAR.length);
                waveFamilyMap[i] = 0;
                familyColorMap[i] = 0;  // index 0 = greenColor
            }
        }
    }

    // ── Hole geometry cache ───────────────────────────────────────────────
    // Recomputed in resize(); used every morph frame.
    let _holeCellLen = null;  // Float32Array — Euclidean dist from grid centre per cell
    let _holeCellStarR = null; // Float32Array — star radius per cell (static wrt angle)
    let _holeCircleR = 0;
    let _holeStarRadBase = 0;

    function rebuildHoleGeometry() {
        const N = cols * rows;
        const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
        const base = Math.min(cols, rows);
        const isMobile = window.innerWidth <= 640;
        _holeCircleR     = base * (isMobile ? 0.50 : 0.30);
        _holeStarRadBase = base * (isMobile ? 0.50 : 0.30);
        const spikes = 5;
        const innerRatio = 0.55;
        _holeCellLen = new Float32Array(N);
        _holeCellStarR = new Float32Array(N);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const i = r * cols + c;
                const dx = c - cx, dy = r - cy;
                _holeCellLen[i] = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                _holeCellStarR[i] = _holeStarRadBase * (1 - innerRatio * Math.abs(Math.sin(spikes * angle)));
            }
        }
    }

    function seedHoles(progress = 1) {
        const circleR = _holeCircleR;
        const fromCircle = (morphFrom === "circle");

        if (morphActive) {
            for (let i = 0, N = cols * rows; i < N; i++) {
                const len = _holeCellLen[i];
                const starR = _holeCellStarR[i];
                const rFrom = fromCircle ? circleR : starR;
                const rTo = fromCircle ? starR : circleR;
                holeMask[i] = len <= rFrom + (rTo - rFrom) * progress + 1 ? 1 : 0;
            }
        } else {
            const thresh = (maskMode === "circle" ? circleR : 0) + 1;  // 0 means use starR
            const useCircle = (maskMode === "circle");
            for (let i = 0, N = cols * rows; i < N; i++) {
                holeMask[i] = _holeCellLen[i] <= (useCircle ? thresh : _holeCellStarR[i] + 1) ? 1 : 0;
            }
        }
    }

    function toggleMaskShape() {
        morphFrom = maskMode;
        morphTo = maskMode === "circle" ? "star" : "circle";
        maskMode = morphTo;
        morphActive = true;
        morphStart = performance.now();
    }
    window.toggleMaskShape = toggleMaskShape;

    // ── Resize ────────────────────────────────────────────────────────────
    let _prevHole = null;

    function resize() {
        hostW = Math.max(1, host?.clientWidth || window.innerWidth);
        hostH = Math.max(1, host?.clientHeight || window.innerHeight);
        dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        glCanvas.width        = Math.floor(hostW);
        glCanvas.height       = Math.floor(hostH);
        glCanvas.style.width  = hostW + "px";
        glCanvas.style.height = hostH + "px";
        buildNoiseFrames(Math.floor(hostW), Math.floor(hostH));
        canvas.width = Math.floor(hostW * dpr);
        canvas.height = Math.floor(hostH * dpr);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctx.font = CELL_FONT;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        cols = Math.max(1, Math.floor(canvas.width / dpr / CELL));
        rows = Math.max(1, Math.floor(canvas.height / dpr / CELL));
        const N = cols * rows;
        glyphIdx = new Uint16Array(N);
        filled = new Uint8Array(N);
        holeMask = new Uint8Array(N);
        nextSwapAt = new Float64Array(N);
        sweepPhase = new Int8Array(N);
        pink = new Float32Array(N);
        ring = new Float32Array(N);
        ringGlyph = new Uint16Array(N);
        waveFamilyMap = new Uint8Array(N);
        familyColorMap = new Uint8Array(N);  // index into FAMILY_LUTS
        cellColor = new Array(N);
        trailDirty = new Uint8Array(N);
        trailCount = 0;
        trailHead = 0;
        lastTrailIndex = -1;
        waves.length = 0;
        invalidateRect();
        refreshCssVars();
        updateSweepCache();
        rebuildHoleGeometry();
        seedGrid();
        seedHoles();
        resetIntro(N);
        drawAll();
    }

    // ── Wave stamping ─────────────────────────────────────────────────────
    function applyFamilyColor(i, famIdx) {
        waveFamilyMap[i] = famIdx;
        familyColorMap[i] = famIdx;
    }

    function stampWaveStep(w) {
        if (w.step <= 0) return;
        const radius = w.step * WAVE_STEP_RADIUS;
        const t = WAVE_THICKNESS;
        const minX = Math.floor(w.cx - radius - t - 2), maxX = Math.ceil(w.cx + radius + t + 2);
        const minY = Math.floor(w.cy - radius - t - 2), maxY = Math.ceil(w.cy + radius + t + 2);

        // Precompute star vertices once per step (not per cell)
        let starzVerts = null;
        if (w.shape === "starz") {
            const spikes = 6, innerRatio = 0.38, offset = -Math.PI / 2;
            starzVerts = new Array(spikes * 2);
            for (let k = 0; k < spikes * 2; k++) {
                const a = offset + k * Math.PI / spikes;
                const rLocal = (k % 2 === 0) ? radius : radius * innerRatio;
                starzVerts[k] = { x: w.cx + Math.cos(a) * rLocal, y: w.cy + Math.sin(a) * rLocal };
            }
        }

        for (let y = minY; y <= maxY; y++) {
            if (y < 0 || y >= rows) continue;
            for (let x = minX; x <= maxX; x++) {
                if (x < 0 || x >= cols) continue;
                const dx = x - w.cx, dy = y - w.cy;
                const d = Math.sqrt(dx * dx + dy * dy);
                let activate = false;

                if (w.shape === "circle") {
                    activate = Math.abs(d - radius) <= t;
                } else if (w.shape === "starz") {
                    let minD = Infinity;
                    for (let k = 0; k < starzVerts.length; k++) {
                        const v1 = starzVerts[k], v2 = starzVerts[(k + 1) % starzVerts.length];
                        const ex = v2.x - v1.x, ey = v2.y - v1.y;
                        const px = x - v1.x, py = y - v1.y;
                        const len2 = ex * ex + ey * ey;
                        const tt = Math.max(0, Math.min(1, (px * ex + py * ey) / len2));
                        const dist = Math.hypot(x - (v1.x + tt * ex), y - (v1.y + tt * ey));
                        if (dist < minD) minD = dist;
                    }
                    activate = minD <= t;
                } else if (w.shape === "diamond") {
                    activate = Math.abs(Math.abs(dx) + Math.abs(dy) - radius) <= t;
                }

                if (activate) {
                    const i = y * cols + x;
                    ring[i] = 1.0;
                    ringGlyph[i] = randInt(w.glyphs.length);
                    applyFamilyColor(i, w.familyIndex);
                    pink[i] = 0;
                    drawCell(i);
                }
            }
        }
    }

    function updateWaves(now) {
        for (let k = waves.length - 1; k >= 0; k--) {
            const w = waves[k];
            if (now < w.nextAt) continue;
            w.step++;
            w.nextAt = now + WAVE_STEP_MS;
            if (w.step <= w.max) stampWaveStep(w);
            if (w.step >= w.max) waves.splice(k, 1);
        }
    }

    function updateBlobWaves() {
        if (!blobWaves.length) return;
        for (let w = blobWaves.length - 1; w >= 0; w--) {
            const wave = blobWaves[w];
            const prevR = wave.radius || 0;
            wave.radius = prevR + wave.speed;
            const r = wave.radius;
            // Maximum possible distortion for this wave — skip cells beyond it entirely
            const maxDistort = wave.noiseAmp + wave.noiseAmp2;
            const outerEdgeSq = (r + maxDistort + 1) * (r + maxDistort + 1);
            const innerEdge = prevR - maxDistort - 1;
            const innerEdgeSq = innerEdge > 0 ? innerEdge * innerEdge : 0;

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const dx = x - wave.cx, dy = y - wave.cy;
                    const distSq = dx * dx + dy * dy;
                    // Cheap bounding-circle reject before any sqrt or fbm
                    if (distSq > outerEdgeSq || distSq < innerEdgeSq) continue;
                    const dist = Math.sqrt(distSq);
                    const nx = (x + wave.seed) * wave.noiseFreq;
                    const ny = (y - wave.seed) * wave.noiseFreq;
                    const n1 = fbm(nx, ny);
                    const n2 = fbm(nx * wave.noiseFreq2, ny * wave.noiseFreq2);
                    const distortion = (n1 - 0.5) * 2 * wave.noiseAmp + (n2 - 0.5) * 2 * wave.noiseAmp2;
                    const edge = r + distortion;
                    const prevEdge = prevR + distortion;
                    if (!(dist <= edge && dist > prevEdge)) continue;
                    const i = y * cols + x;
                    if (wave.mode === "clear") { if (ring[i]) { ring[i] = 0; drawCell(i); } continue; }
                    ring[i] = 1.0;
                    ringGlyph[i] = randInt(wave.glyphs.length);
                    waveFamilyMap[i] = wave.familyIndex;
                    familyColorMap[i] = wave.familyIndex;
                    pink[i] = 0;
                    drawCell(i);
                }
            }
            if (wave.radius > wave.maxRadius) blobWaves.splice(w, 1);
        }
    }

    function baselineTick(now) {
        const N = cols * rows;
        if (!introDone && now - introStart > INTRO_DONE_MS) introDone = true;
        for (let i = 0; i < N; i++) {
            let dirty = false;

            if (!introDone && filled[i]) {
                const rv = revealMult(i, now);
                if (rv !== cellReveal[i]) { cellReveal[i] = rv; dirty = true; }
            }

            // Decay both ring and pink, mark dirty once if either changed
            if (ring[i] > 0.001) { ring[i] *= 0.93; dirty = true; }
            if (pink[i] > 0.001) { pink[i] *= PINK_DECAY; dirty = true; }

            if (dirty) drawCell(i);

            if (holeMask[i]) continue;
            if (!filled[i]) {
                if (Math.random() < 0.0005) {
                    filled[i] = 1;
                    glyphIdx[i] = randInt(GLYPHS.length);
                    pickStyle(i);
                    drawCell(i);
                }
            }
            if (now >= nextSwapAt[i]) {
                if (filled[i] && pink[i] < 0.02 && Math.random() < UPDATE_PROB) {
                    glyphIdx[i] = randInt(GLYPHS.length);
                    pickStyle(i);
                    drawCell(i);
                }
                nextSwapAt[i] = now + rand(MIN_SWAP_MS, MAX_SWAP_MS);
            }
        }
    }

    // ── Sweep ─────────────────────────────────────────────────────────────
    let sweepCX = 0, sweepCY = 0, sweepMaxRadius = 0;
    function updateSweepCache() {
        sweepCX = (cols - 1) / 2;
        sweepCY = (rows - 1) / 2;
        sweepMaxRadius = Math.sqrt(sweepCX * sweepCX + sweepCY * sweepCY);
    }

    function updateSweep(now) {
        if (!sweepActive && now - lastSweepTime > SWEEP_INTERVAL) {
            sweepActive = true; sweepStart = now; lastSweepTime = now;
        }
        if (!sweepActive) return;
        const elapsed = now - sweepStart;
        const progress = elapsed / SWEEP_DURATION;
        if (progress >= 1) { sweepActive = false; return; }
        const N = cols * rows;
        for (let i = 0; i < N; i++) {
            if (sweepPhase[i] > 0) { glyphIdx[i] = randInt(GLYPHS.length); pickStyle(i); drawCell(i); sweepPhase[i]--; }
        }
        const radius = progress * sweepMaxRadius;
        const rLo = radius - 1.2, rHi = radius + 1.2;
        const rLoSq = rLo * rLo, rHiSq = rHi * rHi;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const dxS = c - sweepCX, dyS = r - sweepCY;
                const distSq = dxS * dxS + dyS * dyS;
                if (distSq >= rLoSq && distSq <= rHiSq) {
                    const i = r * cols + c;
                    if (!holeMask[i] && sweepPhase[i] === 0) sweepPhase[i] = 4;
                }
            }
        }
    }

    // ── Main loop ─────────────────────────────────────────────────────────
    function frame(now) {
        lastNow = now;
        updateWaves(now);
        updateBlobWaves();
        baselineTick(now);
        updateSweep(now);
        if (morphActive) {
            const p = clamp((now - morphStart) / morphDuration, 0, 1);
            const N = cols * rows;
            if (!_prevHole || _prevHole.length !== N) _prevHole = new Uint8Array(N);
            _prevHole.set(holeMask);
            seedHoles(p);
            for (let i = 0; i < N; i++) { if (holeMask[i] !== _prevHole[i]) drawCell(i); }
            if (p >= 1) morphActive = false;
        }
        drawTrailOverlay();
        // Composite: copy glyph canvas → visible canvas, then overlay noise frame
        glCtx.drawImage(canvas, 0, 0, glCanvas.width, glCanvas.height);
        noiseTickCount++;
        if (noiseTickCount >= NOISE_FPS_EVERY) {
            noiseTickCount = 0;
            noiseFrameIdx  = (noiseFrameIdx + 1) % NOISE_FRAMES;
        }
        if (noiseFrames.length) {
            glCtx.globalAlpha = 0.25;
            glCtx.drawImage(noiseFrames[noiseFrameIdx], 0, 0, glCanvas.width, glCanvas.height);
            glCtx.globalAlpha = 1.0;
        }
        requestAnimationFrame(frame);
    }

    const _fPx = Math.round(CELL * FONT_SCALE);
    Promise.all([
        document.fonts.load(`${_fPx}px "Noto Sans Symbols 2"`,        "∴⍜※⸜"),
        document.fonts.load(`${_fPx}px "Noto Sans Symbols"`,          "⟐⧖"),
        document.fonts.load(`${_fPx}px "Noto Sans Khojki"`,           "𑈀𑈁"),
        document.fonts.load(`${_fPx}px "Noto Sans Kaithi"`,           String.fromCodePoint(0x11083)),
        document.fonts.load(`${_fPx}px "Noto Sans Sharada"`,          String.fromCodePoint(0x11183)),
        document.fonts.load(`${_fPx}px "Noto Sans Siddham"`,          String.fromCodePoint(0x11580)),
        document.fonts.load(`${_fPx}px "Noto Sans Grantha"`,          String.fromCodePoint(0x11305)),
    ]).then(() => {
        resize();
        requestAnimationFrame(frame);
    });

    // ── Responsive resize ─────────────────────────────────────────────────
    let _resizeTimer;
    const _ro = new ResizeObserver(() => {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(resize, 50);
    });
    _ro.observe(host);

    // ── Pointer input ─────────────────────────────────────────────────────
    let mousePX = 0, mousePY = 0, lastPX = 0, lastPY = 0;
    let hasPointer = false, vNorm = 0;
    function invalidateRect() { _cachedRect = null; }
    function getRect() { return _cachedRect || (_cachedRect = glCanvas.getBoundingClientRect()); }

    function onPointerMove(e) {
        const rect = getRect();
        mousePX = e.clientX - rect.left;
        mousePY = e.clientY - rect.top;
        if (!hasPointer) { lastPX = mousePX; lastPY = mousePY; hasPointer = true; }
        const dx = mousePX - lastPX, dy = mousePY - lastPY;
        lastPX = mousePX; lastPY = mousePY;
        vNorm += (clamp(Math.sqrt(dx * dx + dy * dy) / 28, 0, 1) - vNorm) * 0.22;
        const mx = clamp(mousePX / Math.max(1, hostW), 0, 0.999999);
        const my = clamp(mousePY / Math.max(1, window.innerHeight), 0, 0.999999);
        const cx = Math.floor(mx * cols), cy = Math.floor(my * rows);
        if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
            const idx = cy * cols + cx;
            if (idx !== lastTrailIndex) {
                lastTrailIndex = idx;
                const slot = trailHead % TRAIL_LENGTH;
                trailBuf[slot].i = idx;
                trailBuf[slot].a = 1;
                trailBuf[slot].g = GLYPHS[glyphIdx[idx] % GLYPHS.length];
                trailHead = slot + 1;   // advance (wraps naturally via modulo on read)
                if (trailCount < TRAIL_LENGTH) trailCount++;
            }
        }
    }

    function onPointerDown(e) {
        if (e.button !== 0) return;
        onPointerMove(e);
        const rect = getRect();
        const mx = clamp((e.clientX - rect.left) / rect.width, 0, 0.999999);
        const my = clamp((e.clientY - rect.top) / rect.height, 0, 1);
        const family = glyphFamilies[currentFamilyIndex];
        waves.push({
            cx: Math.floor(mx * cols), cy: Math.floor(my * rows),
            step: 0, max: WAVE_MAX_STEP, nextAt: performance.now() + 10,
            familyIndex: currentFamilyIndex,
            glyphs: family.glyphs, color: family.color, shape: family.shape
        });
        playWaveSound("left", currentFamilyIndex);
        currentFamilyIndex = (currentFamilyIndex + 1) % glyphFamilies.length;
        updateFamilyIndicator();
    }

    glCanvas.addEventListener("pointermove", onPointerMove, { passive: true });
    glCanvas.addEventListener("pointerdown", onPointerDown, { passive: true });
    glCanvas.addEventListener("contextmenu", e => e.preventDefault());

    glCanvas.addEventListener("pointerdown", e => {
        if (e.button !== 2) return;
        const rect = getRect();
        const mx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        const my = clamp((e.clientY - rect.top) / rect.height, 0, 1);
        const famIndex = currentFamilyIndex;
        const fam = glyphFamilies[famIndex];
        const seed = Math.random() * 1000;
        const cfg = {
            cx: Math.floor(mx * cols), cy: Math.floor(my * rows),
            maxRadius: Math.max(cols, rows) * 0.8, speed: 0.8, seed,
            noiseFreq: 0.12 + Math.random() * 0.18, noiseAmp: 3 + Math.random() * 6,
            noiseFreq2: 0.35 + Math.random() * 0.3, noiseAmp2: 1 + Math.random() * 3,
            familyIndex: famIndex, glyphs: fam.glyphs
        };
        blobWaves.push({ ...cfg, mode: "wash", radius: 0 });
        setTimeout(() => blobWaves.push({ ...cfg, mode: "wash", radius: 0 }), 240);
        playWaveSound("right", famIndex);
        currentFamilyIndex = (currentFamilyIndex + 1) % glyphFamilies.length;
        updateFamilyIndicator();
    });

    // Prevent form/button clicks from triggering glyph waves
    document.querySelectorAll("input, textarea, button, form").forEach(el => {
        el.addEventListener("pointerdown", e => e.stopPropagation());
        el.addEventListener("pointermove", e => e.stopPropagation());
        el.addEventListener("click", e => e.stopPropagation());
    });
    const scrollHintBtn = document.getElementById("scrollHint");
    if (scrollHintBtn) {
        scrollHintBtn.addEventListener("pointerdown", e => e.stopPropagation());
        scrollHintBtn.addEventListener("pointermove", e => e.stopPropagation());
        scrollHintBtn.addEventListener("click", e => e.stopPropagation());
    }

    // ── UI reveal sequence ────────────────────────────────────────────────
    const titleBlock = document.getElementById("titleBlock");
    const unifiedControls = document.getElementById("unifiedControls");
    const hint = document.getElementById("scrollHint");
    const instr = document.getElementById("matrixInstructions");

    updateFamilyIndicator();

    setTimeout(() => titleBlock?.classList.add("show"), 2500);
    setTimeout(() => { hint?.classList.add("show"); instr?.classList.add("show"); }, 3200);
    setTimeout(() => unifiedControls?.classList.add("show"), 4200);

    document.getElementById("closeInstructions")?.addEventListener("click", () => {
        const panel = document.getElementById("matrixInstructions");
        if (!panel) return;
        panel.style.opacity = "0";
        panel.style.transform = "translateY(10px)";
        setTimeout(() => panel.style.display = "none", 600);
    });

    // ── Audio control ─────────────────────────────────────────────────────
    const audioCtrl = document.getElementById("audioControl");
    const bgm = document.getElementById("bgm");
    const audioStatus = document.getElementById("audioStatus");
    let isPlaying = false;

    audioCtrl?.addEventListener("click", () => {
        if (!isPlaying) {
            bgm?.play().catch(() => { });
            if (audioStatus) audioStatus.textContent = "Sound On";
        } else {
            bgm?.pause();
            if (audioStatus) audioStatus.textContent = "Sound Off";
        }
        isPlaying = !isPlaying;
    });

})(); // end of main IIFE

// ─────────────────────────────────────────────────────────────────────────────
//  NAV REVEAL
// ─────────────────────────────────────────────────────────────────────────────

setTimeout(() => document.body.classList.add("intro-ui-visible"), 3200);

// ─────────────────────────────────────────────────────────────────────────────
//  PANEL TOGGLE (CONTACT / WAITLIST button)
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("scrollHint");
    const text = btn.querySelector(".scrollText");
    const waitlist = document.getElementById("waitlistHero");
    const contact = document.getElementById("contactHero");

    const DELAY_FORM_OUT = 0;
    const DELAY_MORPH = 400;
    const DELAY_FORM_IN = 1600;

    const clickSound = new Audio("audio/waitlist/waitlist4.mp3");
    clickSound.preload = "auto";
    clickSound.volume = 0.3;

    let locked = false;

    btn.addEventListener("click", () => {
        if (locked) return;
        locked = true;

        setTimeout(() => { clickSound.currentTime = 0; clickSound.play().catch(() => { }); }, 520);

        const goingToContact = text.textContent === "Contact the Author";

        setTimeout(() => {
            (goingToContact ? waitlist : contact).classList.remove("is-active");
        }, DELAY_FORM_OUT);

        setTimeout(() => { if (window.toggleMaskShape) window.toggleMaskShape(); }, DELAY_MORPH);

        setTimeout(() => {
            text.textContent = goingToContact ? "Back to Waitlist" : "Contact the Author";
            (goingToContact ? contact : waitlist).classList.add("is-active");
            locked = false;
        }, DELAY_FORM_IN);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
//  EXIT SEQUENCE
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".navLinks a, .brand").forEach(link => {
        link.addEventListener("click", function (e) {
            if (this.target === "_blank") return;
            if (this.origin !== location.origin) return;
            if (this.href === location.href) return;

            e.preventDefault();
            const dest = this.href;

            const stages = [
                [0, () => document.getElementById("unifiedControls")?.classList.remove("show")],
                [150, () => document.getElementById("matrixInstructions")?.classList.remove("show")],
                [300, () => document.getElementById("scrollHint")?.classList.remove("show")],
                [500, () => document.body.classList.add("is-exiting")],
                [800, () => document.getElementById("titleBlock")?.classList.remove("show")],
            ];
            stages.forEach(([ms, fn]) => setTimeout(fn, ms));

            const veil = document.createElement("div");
            Object.assign(veil.style, {
                position: "fixed", inset: "0", zIndex: "9999",
                background: "#000", opacity: "0", pointerEvents: "none",
                transition: "opacity 600ms ease"
            });
            document.body.appendChild(veil);
            setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => veil.style.opacity = "1")), 1100);
            setTimeout(() => window.location.href = dest, 1800);
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
//  FORM SUBMISSION — waitlist + contact
//  Backend: Google Apps Script web app (see apps-script/backend.gs)
//  Update ENDPOINT below after deploying the Apps Script.
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    const ENDPOINT = "https://script.google.com/macros/s/AKfycbyDsD7VRchxtzGtm8YOaEcrg5o4QfH9RMC9u6TS2UtNeMknmB4a1sewVrMPYbMwM6np/exec";

    // ── Waitlist form ──────────────────────────────────────────────────────
    const waitlistForm  = document.getElementById("waitlistForm");
    const waitlistInput = document.getElementById("waitlistEmail");

    waitlistForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = waitlistInput.value.trim();
        if (!email) return;

        const btn = waitlistForm.querySelector("button");
        btn.textContent = "Sending…";
        btn.disabled = true;

        const body = new URLSearchParams({
            type:     "waitlist",
            email,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locale:   navigator.language || "",
        });

        try {
            await fetch(ENDPOINT, { method: "POST", body, mode: "no-cors", redirect: "follow" });
        } catch (_) { /* response is opaque — data still reaches Apps Script */ }

        waitlistForm.closest(".waitlistBox").innerHTML = `
            <h2>You're on the list</h2>
            <p>A confirmation has been sent to <strong>${email}</strong>.<br>
            You'll hear from us soon.</p>
        `;
    });

    // ── Contact form ───────────────────────────────────────────────────────
    const contactForm = document.getElementById("contactForm");

    contactForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name    = document.getElementById("contactName").value.trim();
        const email   = document.getElementById("contactEmail").value.trim();
        const message = document.getElementById("contactMessage").value.trim();
        if (!name || !email || !message) return;

        const btn = contactForm.querySelector("button");
        btn.textContent = "Sending…";
        btn.disabled = true;

        const body = new URLSearchParams({
            type:     "contact",
            name,
            email,
            message,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locale:   navigator.language || "",
        });

        try {
            await fetch(ENDPOINT, { method: "POST", body, mode: "no-cors", redirect: "follow" });
        } catch (_) { /* response is opaque — data still reaches Apps Script */ }

        contactForm.closest(".contactBox").innerHTML = `
            <h2>Message Sent</h2>
            <p>Thank you, ${name}.<br>Your message has been received and a confirmation
            has been sent to <strong>${email}</strong>.</p>
        `;
    });
});

// ── Rewrite index.html nav links to skip prelude ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.topnav a[href="index.html"], a.brand[href="index.html"]').forEach(a => {
        a.setAttribute('href', 'index.html?skip=1');
    });
});
// ── Mobile nav panel ─────────────────────────────────────────────────────────
(() => {
    const toggle = document.getElementById("menuToggle");
    const panel = document.getElementById("navPanel");
    const closeBtn = document.getElementById("navPanelClose");
    if (!toggle || !panel) return;

    function openMenu() {
        panel.classList.add("is-open");
        panel.setAttribute("aria-hidden", "false");
        toggle.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
    }

    function closeMenu() {
        panel.classList.remove("is-open");
        panel.setAttribute("aria-hidden", "true");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
    }

    toggle.addEventListener("click", openMenu);
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
})();