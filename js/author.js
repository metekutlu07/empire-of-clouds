import PostProcessing from "./postprocessing-noise.js";

(() => {
    const canvas = document.getElementById("c");
    const ctx = canvas.getContext("2d", { alpha: false });

    // ── WebGL output + post-processing ─────────────────────────────────────
    const glCanvas = document.getElementById("gl");
    const host = document.getElementById("glyphHero");
    let hostW = 1, hostH = 1;
    let post;

    try {
        post = new PostProcessing(glCanvas, { enabled: true, strength: 0.15 });
    } catch (e) {
        console.error(e);
        const box = document.createElement("div");
        Object.assign(box.style, {
            position: "fixed", inset: "16px", zIndex: "9999",
            padding: "12px 14px", border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(0,0,0,0.75)", color: "#fff",
            font: "12px/1.35 ui-monospace, Menlo, Monaco, Consolas, monospace"
        });
        box.textContent = "PostProcessing init failed: " + (e?.message ?? String(e));
        document.body.appendChild(box);
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
    const FILL_BASE = 0.05;
    const FILL_VARIATION = 0.05;
    const FILL_SCALE = 0.09;
    const PUSH_RADIUS_CELLS = 7;
    const PINK_DECAY = 0.986;
    const PINK_STRENGTH = 0.72;    // eslint-disable-line no-unused-vars
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

    // ── Cloud hole field (two-layer animated Perlin) ───────────────────────
    // Same values as index.js clouds
    const HOLE1_SCALE = 0.02;
    const HOLE1_THRESHOLD = 0.52;
    const HOLE1_EDGE = 0.10;
    const HOLE1_DRIFT_SPEED = 0.048;
    const HOLE1_MORPH_SPEED = 0.040;
    const HOLE1_LERP = 0.030;
    const HOLE2_SCALE = 0.05;
    const HOLE2_THRESHOLD = 0.62;
    const HOLE2_EDGE = 0.20;
    const HOLE2_DRIFT_SPEED = 0.018;
    const HOLE2_MORPH_SPEED = 0.010;
    const HOLE2_LERP = 0.030;
    const HOLE_UPDATE_PER_FRAME = 0.22;

    // ── Intro emergence ────────────────────────────────────────────────────
    const INTRO_STAGGER_MS = 1500;
    const INTRO_RISE_MS = 250;
    const INTRO_BLACK_MS = 1000;
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
    function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

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
    let holeA, holeB;
    let styleKind, accentHue, accentLum;
    let pink, ring, ringGlyph;
    let waveFamilyMap, familyColorMap;

    // (mask/morph removed — using animated cloud holes)

    // ── Trail ─────────────────────────────────────────────────────────────
    let trailMarks = [];
    let lastTrailIndex = -1;
    let trailPrev = [];

    // ── Waves ─────────────────────────────────────────────────────────────
    const waves = [];
    let blobWaves = [];
    let sweepStart = 0, sweepActive = false, lastSweepTime = 0;
    let sweepPhase;

    // ── Colors ────────────────────────────────────────────────────────────
    // Resolved once; refreshed on resize (theme never changes at runtime)
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

    function pinkColor(a) { return `hsla(318,100%,77%,${a})`; }
    function greenColor(a) { return `hsla(137,100%,73%,${a})`; }

    // Per-cell cached color string — set once in pickStyle, reused in drawCell
    let cellColor;   // allocated in resize()

    function pickStyle(i, prob = ACCENT_PROB) {
        if (Math.random() < prob) {
            styleKind[i] = 2;
            const base = HUES[randInt(HUES.length)];
            accentHue[i] = Math.round(((base.h + rand(-HUE_JITTER, HUE_JITTER)) % 360 + 360) % 360);
            accentLum[i] = clamp(Math.round(base.l + rand(-LIGHT_JITTER, LIGHT_JITTER)), 30, 85);
            const a = (Math.random() < 0.15) ? ACCENT_DIM_ALPHA : ACCENT_ALPHA;
            cellColor[i] = `hsla(${accentHue[i]},95%,${accentLum[i]}%,${a})`;
        } else {
            styleKind[i] = (Math.random() < 0.28) ? 1 : 0;
            cellColor[i] = styleKind[i] === 1 ? CSS_FG_DIM : CSS_FG;
        }
    }

    function cellBaseColor(i) {
        return cellColor[i];
    }

    // ── Glyph families ────────────────────────────────────────────────────
    const glyphFamilies = [
        { name: "Astral Script", icon: "✷", glyphs: STAR, shape: "circle" },
        { name: "Sacred Script", icon: "𑈇", glyphs: SACRED, shape: "starz" },
        { name: "Cloud Script", icon: "𑃘", glyphs: CLOUD, shape: "diamond" }
    ];

    let currentFamilyIndex = 0;

    function updateFamilyIndicator() {
        const family = glyphFamilies[currentFamilyIndex];
        const iconEl = document.getElementById("familyIcon");
        const nameEl = document.getElementById("familyName");
        const colors = ["hsla(137,100%,73%,1)", "hsla(318,100%,77%,1)", "rgba(255,240,150,1)"];
        const color = colors[currentFamilyIndex];
        iconEl.textContent = family.icon;
        nameEl.textContent = family.name;
        iconEl.style.color = color;
        nameEl.style.color = color;
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
        s.volume = 0.8;
        s.play().catch(() => { });
    }

    // ── Drawing ───────────────────────────────────────────────────────────
    const fontPx = Math.floor(CELL * FONT_SCALE);
    const CELL_FONT = `${fontPx}px "IBM Plex Mono", "Noto Sans Symbols 2", "Noto Sans Symbols", "Noto Sans Khojki", "Noto Sans Kaithi", "Noto Sans Sharada", "Noto Sans Khudawadi", "Noto Sans Grantha", "Noto Sans Mahajani", "Noto Sans Zanabazar Square", "Noto Sans Siddham", ui-monospace, monospace`;

    function drawCell(i) {
        const c = i % cols, r = (i / cols) | 0;
        const x = c * CELL, y = r * CELL;

        ctx.globalAlpha = 1;
        ctx.fillStyle = CSS_BG;
        ctx.fillRect(x, y, CELL, CELL);

        const em = introDone ? 1 : revealMult(i, lastNow);
        const rVal = ring[i];

        if (rVal > 0.001) {
            const fam = waveFamilyMap[i];
            const glyphSet = glyphFamilies[fam].glyphs;
            const g = glyphSet[ringGlyph[i] % glyphSet.length];
            ctx.globalAlpha = 1;
            ctx.fillStyle = FAMILY_COLOR_FNS[familyColorMap[i]](clamp((0.15 + 0.85 * rVal) * em, 0, 0.95));
            ctx.fillText(g, x + CELL / 2, y + CELL / 2 + 0.5);
            ctx.globalAlpha = 1;
            return;
        }

        if (!holeMask[i]) return;  // only draw inside cloud patches

        const p = pink[i];
        ctx.globalAlpha = em;
        ctx.fillStyle = p > 0.02
            ? pinkColor(clamp(PINK_ALPHA_MIN + 0.78 * p, 0, 0.95))
            : cellColor[i];
        ctx.fillText(GLYPHS[glyphIdx[i] % GLYPHS.length], x + CELL / 2, y + CELL / 2 + 0.5);
        ctx.globalAlpha = 1;
    }

    function drawGridLines() {
        ctx.save();
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.globalAlpha = 1;
        ctx.beginPath();
        for (let r = 0; r <= rows; r++) {
            ctx.moveTo(0, r * CELL);
            ctx.lineTo(cols * CELL, r * CELL);
        }
        for (let c = 0; c <= cols; c++) {
            ctx.moveTo(c * CELL, 0);
            ctx.lineTo(c * CELL, rows * CELL);
        }
        ctx.stroke();
        ctx.restore();
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
        drawGridLines();
    }

    function drawTrailOverlay() {
        for (let j = 0; j < trailPrev.length; j++) {
            const i = trailPrev[j];
            if (i >= 0 && i < cols * rows) drawCell(i);
        }
        trailPrev.length = 0;
        if (!trailMarks.length) return;

        const seen = new Set();
        let writeHead = 0;
        const trailLen = trailMarks.length;

        for (let k = 0; k < trailLen; k++) {
            const m = trailMarks[k];
            m.a *= TRAIL_DECAY;
            const i = m.i;
            const taper = 1 - (k / Math.max(1, trailLen - 1));
            const a = clamp(m.a * taper, 0, 0.9);
            if (a > TRAIL_MIN_ALPHA) {
                const c = i % cols, r = (i / cols) | 0;
                ctx.fillStyle = `hsla(137,100%,73%,${a})`;
                ctx.fillText(m.g, c * CELL + CELL / 2, r * CELL + CELL / 2 + 0.5);
                if (!seen.has(i)) { seen.add(i); trailPrev.push(i); }
                trailMarks[writeHead++] = m;   // compact in-place
            }
        }
        trailMarks.length = writeHead;
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
                familyColorMap[i] = 0;   // index 0 = greenColor
            }
        }
    }

    // ── Hole helpers ──────────────────────────────────────────────────────
    function holeAlpha1(n) { return smoothstep(HOLE1_THRESHOLD - HOLE1_EDGE, HOLE1_THRESHOLD + HOLE1_EDGE, n); }
    function holeAlpha2(n) { return smoothstep(HOLE2_THRESHOLD - HOLE2_EDGE, HOLE2_THRESHOLD + HOLE2_EDGE, n); }
    function holeFromAlphas(a1, a2) { return (Math.max(a1, a2) > 0.58) ? 1 : 0; }

    function seedHoles() {
        const t = performance.now() * 0.001;
        const d1X = t * HOLE1_DRIFT_SPEED, d1Y = t * (HOLE1_DRIFT_SPEED * 0.77);
        const m1X = t * HOLE1_MORPH_SPEED, m1Y = t * (HOLE1_MORPH_SPEED * 1.13);
        const d2X = t * HOLE2_DRIFT_SPEED, d2Y = t * (HOLE2_DRIFT_SPEED * 0.77);
        const m2X = t * HOLE2_MORPH_SPEED, m2Y = t * (HOLE2_MORPH_SPEED * 1.13);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const i = r * cols + c;
                const aBase = fbm(c * HOLE1_SCALE + d1X, r * HOLE1_SCALE + d1Y);
                const aWarp = fbm(c * HOLE1_SCALE * 1.9 + 400 + m1X, r * HOLE1_SCALE * 1.9 - 200 + m1Y);
                holeA[i] = clamp(0.72 * aBase + 0.28 * aWarp, 0, 1);
                const bBase = fbm(c * HOLE2_SCALE + d2X, r * HOLE2_SCALE + d2Y);
                const bWarp = fbm(c * HOLE2_SCALE * 1.9 + 120 + m2X, r * HOLE2_SCALE * 1.9 - 60 + m2Y);
                holeB[i] = clamp(0.72 * bBase + 0.28 * bWarp, 0, 1);
                holeMask[i] = holeFromAlphas(holeAlpha1(holeA[i]), holeAlpha2(holeB[i]));
            }
        }
    }

    // ── Per-frame smooth hole update (rolling cursor) ─────────────────────
    let holeCursor = 0;
    function updateHolesSmooth(now) {
        const N = cols * rows;
        const count = Math.max(1, Math.floor(N * HOLE_UPDATE_PER_FRAME));
        const t = now * 0.001;
        const mx = hasPointer ? ((mousePX / Math.max(1, hostW)) - 0.5) * 1.6 : 0;
        const my = hasPointer ? ((mousePY / Math.max(1, hostH)) - 0.5) * 1.6 : 0;
        const d1X = t * HOLE1_DRIFT_SPEED + mx, d1Y = t * (HOLE1_DRIFT_SPEED * 0.77) + my;
        const m1X = t * HOLE1_MORPH_SPEED + mx * 0.45, m1Y = t * (HOLE1_MORPH_SPEED * 1.13) + my * 0.45;
        const d2X = t * HOLE2_DRIFT_SPEED + mx * 0.6, d2Y = t * (HOLE2_DRIFT_SPEED * 0.77) + my * 0.6;
        const m2X = t * HOLE2_MORPH_SPEED + mx * 0.27, m2Y = t * (HOLE2_MORPH_SPEED * 1.13) + my * 0.27;
        for (let k = 0; k < count; k++) {
            const i = holeCursor; holeCursor = (holeCursor + 1) % N;
            const c = i % cols, r = (i / cols) | 0;
            const aBase = fbm(c * HOLE1_SCALE + d1X, r * HOLE1_SCALE + d1Y);
            const aWarp = fbm(c * HOLE1_SCALE * 1.9 + 400 + m1X, r * HOLE1_SCALE * 1.9 - 200 + m1Y);
            holeA[i] += (clamp(0.72 * aBase + 0.28 * aWarp, 0, 1) - holeA[i]) * HOLE1_LERP;
            const bBase = fbm(c * HOLE2_SCALE + d2X, r * HOLE2_SCALE + d2Y);
            const bWarp = fbm(c * HOLE2_SCALE * 1.9 + 120 + m2X, r * HOLE2_SCALE * 1.9 - 60 + m2Y);
            holeB[i] += (clamp(0.72 * bBase + 0.28 * bWarp, 0, 1) - holeB[i]) * HOLE2_LERP;
            const prev = holeMask[i];
            const newMask = holeFromAlphas(holeAlpha1(holeA[i]), holeAlpha2(holeB[i]));
            if (newMask !== prev) {
                holeMask[i] = newMask;
                if (!newMask) pink[i] = 0;
                drawCell(i);
            }
        }
    }

    // ── Resize ────────────────────────────────────────────────────────────
    function resize() {
        hostW = Math.max(1, host?.clientWidth || window.innerWidth);
        hostH = Math.max(1, host?.clientHeight || window.innerHeight);
        dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        if (post) post.setSize(hostW, hostH, dpr);
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
        holeA = new Float32Array(N);
        holeB = new Float32Array(N);
        nextSwapAt = new Float64Array(N);
        sweepPhase = new Int8Array(N);
        styleKind = new Uint8Array(N);
        accentHue = new Uint16Array(N);
        accentLum = new Uint8Array(N);
        pink = new Float32Array(N);
        ring = new Float32Array(N);
        ringGlyph = new Uint16Array(N);
        waveFamilyMap = new Uint8Array(N);
        familyColorMap = new Uint8Array(N);   // index into FAMILY_COLOR_FNS
        cellColor = new Array(N);
        waves.length = 0;
        refreshCssVars();
        updateSweepCache();
        seedGrid();
        seedHoles();
        resetIntro(N);
        drawAll();
    }

    // familyColorMap stores a color function per cell — replaced with a Uint8 index
    // 0 = green, 1 = pink, 2 = gold
    const FAMILY_COLOR_FNS = [
        greenColor,
        pinkColor,
        (a) => `rgba(255,240,150,${a})`
    ];

    function applyFamilyColor(i, famIdx) {
        waveFamilyMap[i] = famIdx;        // already stored; reuse as color index
        familyColorMap[i] = famIdx;       // now a Uint8 index, not a closure
    }

    function stampWaveStep(w) {
        if (w.step <= 0) return;
        const radius = w.step * WAVE_STEP_RADIUS;
        const t = WAVE_THICKNESS;
        const minX = Math.floor(w.cx - radius - t - 2), maxX = Math.ceil(w.cx + radius + t + 2);
        const minY = Math.floor(w.cy - radius - t - 2), maxY = Math.ceil(w.cy + radius + t + 2);

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
                    const spikes = 6, innerRatio = 0.38, offset = -Math.PI / 2;
                    const verts = [];
                    for (let k = 0; k < spikes * 2; k++) {
                        const a = offset + k * Math.PI / spikes;
                        const rLocal = (k % 2 === 0) ? radius : radius * innerRatio;
                        verts.push({ x: w.cx + Math.cos(a) * rLocal, y: w.cy + Math.sin(a) * rLocal });
                    }
                    let minD = Infinity;
                    for (let k = 0; k < verts.length; k++) {
                        const v1 = verts[k], v2 = verts[(k + 1) % verts.length];
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
                    waveFamilyMap[i] = w.familyIndex;
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

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const dx = x - wave.cx, dy = y - wave.cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
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
                    familyColorMap[i] = wave.familyIndex;   // index into FAMILY_COLOR_FNS
                    pink[i] = 0;
                    drawCell(i);
                }
            }
            if (wave.radius > wave.maxRadius) blobWaves.splice(w, 1);
        }
    }

    // ── Baseline tick ─────────────────────────────────────────────────────
    function baselineTick(now) {
        const N = cols * rows;
        if (!introDone && now - introStart > INTRO_DONE_MS) introDone = true;
        for (let i = 0; i < N; i++) {
            if (!introDone && filled[i]) {
                const rv = revealMult(i, now);
                if (rv !== cellReveal[i]) { cellReveal[i] = rv; drawCell(i); }
            }
            if (ring[i] > 0.001) { ring[i] *= 0.93; drawCell(i); }
            if (pink[i] > 0.001) { pink[i] *= PINK_DECAY; drawCell(i); }
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
    // Pre-computed sweep geometry (updated on resize via sweepCache)
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
        const rLo = (radius - 1.2), rHi = (radius + 1.2);
        const rLoSq = rLo * rLo, rHiSq = rHi * rHi;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const dxS = (c - sweepCX), dyS = (r - sweepCY);
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
        updateHolesSmooth(now);
        drawTrailOverlay();
        drawGridLines();
        if (post) post.render(canvas, now);
        requestAnimationFrame(frame);
    }

    const _fPx = Math.round(CELL * FONT_SCALE);
    Promise.all([
        document.fonts.load(`${_fPx}px "Noto Sans Symbols 2"`,        "⟐⧖⸜Ⳁ꙳"),
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

    function onPointerMove(e) {
        const rect = glCanvas.getBoundingClientRect();
        mousePX = e.clientX - rect.left;
        mousePY = e.clientY - rect.top;
        if (!hasPointer) { lastPX = mousePX; lastPY = mousePY; hasPointer = true; }
        const dx = mousePX - lastPX, dy = mousePY - lastPY;
        lastPX = mousePX; lastPY = mousePY;
        vNorm += (clamp(Math.sqrt(dx * dx + dy * dy) / 28, 0, 1) - vNorm) * 0.22;
        const mx = clamp(mousePX / Math.max(1, hostW), 0, 0.999999);
        const my = 1 - clamp(mousePY / Math.max(1, window.innerHeight), 0, 0.999999);
        const cx = Math.floor(mx * cols), cy = Math.floor(my * rows);
        if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
            const idx = cy * cols + cx;
            if (idx !== lastTrailIndex) {
                lastTrailIndex = idx;
                trailMarks.unshift({ i: idx, a: 1, g: GLYPHS[glyphIdx[idx] % GLYPHS.length] });
                if (trailMarks.length > TRAIL_LENGTH) trailMarks.pop();
            }
        }
    }

    function onPointerDown(e) {
        if (e.button !== 0) return;
        onPointerMove(e);
        const rect = glCanvas.getBoundingClientRect();
        const mx = clamp((e.clientX - rect.left) / rect.width, 0, 0.999999);
        const my = 1 - clamp((e.clientY - rect.top) / rect.height, 0, 1);
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
        const rect = glCanvas.getBoundingClientRect();
        const mx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        const my = 1 - clamp((e.clientY - rect.top) / rect.height, 0, 1);
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

    // Prevent form/button clicks triggering glyph waves
    document.querySelectorAll("input, textarea, button, form").forEach(el => {
        el.addEventListener("pointerdown", e => e.stopPropagation());
        el.addEventListener("pointermove", e => e.stopPropagation());
        el.addEventListener("click", e => e.stopPropagation());
    });
    // ── UI reveal sequence ────────────────────────────────────────────────
    const titleBlock = document.getElementById("titleBlock");
    const unifiedControls = document.getElementById("unifiedControls");
    const instr = document.getElementById("matrixInstructions");

    updateFamilyIndicator();

    setTimeout(() => titleBlock?.classList.add("show"), 2500);
    setTimeout(() => { instr?.classList.add("show"); }, 3200);
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
            bgm.play().catch(() => { });
            audioStatus.textContent = "Sound On";
        } else {
            bgm.pause();
            audioStatus.textContent = "Sound Off";
        }
        isPlaying = !isPlaying;
    });

    // ── Reveal nav after glyph field emerges ─────────────────────────────
    setTimeout(() => document.body.classList.add("intro-ui-visible"), 3200);

    // ── Exit sequence (nav links → fade-to-black → navigate) ─────────────
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

    // ── Bio glyph dividers ───────────────────────────────────────────────────
    // Fills each .bioGlyphDivider with a row of fixed-width cells that
    // independently cycle through the same glyph / color palette as the matrix.
    // Each cell is forced to a constant pixel width so the row never shifts
    // when a glyph swaps in — the layout stays perfectly stable.
    (function () {
        const ALL_DIV = [
            ...GLYPHS.slice(0, 40),
            "✳", "✶", "✷", "✸", "✹", "✺", "✻", "✼", "✽", "✾",
            "∴", "∵", "∷", "≈", "∽",
        ];
        const COLORS_DIV = [
            "rgba(255,255,255,0.55)",  // white — weighted 3×
            "rgba(255,255,255,0.55)",
            "rgba(255,255,255,0.55)",
            "rgba(255,255,255,0.20)",  // dim white
            "hsla(137,100%,73%,0.80)", // green
            "hsla(137,100%,73%,0.50)", // green faint
            "hsla(318,100%,77%,0.75)", // pink
            "hsla(318,100%,77%,0.45)", // pink faint
        ];
        const CELL_PX = 20;

        function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

        function buildRow(div) {
            const w = div.getBoundingClientRect().width || 600;
            const count = Math.max(1, Math.floor(w / CELL_PX));
            div.innerHTML = "";
            for (let i = 0; i < count; i++) {
                const span = document.createElement("span");
                span.className = "bioGlyphCell";
                span.textContent = pick(ALL_DIV);
                span.style.color = pick(COLORS_DIV);
                div.appendChild(span);

                // Each cell picks its own interval so rows feel alive, not
                // like a synchronized ticker — staggered start avoids all
                // cells swapping on the same frame.
                const ms = 900 + Math.random() * 1300;
                setTimeout(() => {
                    setInterval(() => {
                        if (Math.random() < 0.4) {
                            span.textContent = pick(ALL_DIV);
                            span.style.color = pick(COLORS_DIV);
                        }
                    }, ms);
                }, Math.random() * ms);
            }
        }

        // Measure after one paint so getBoundingClientRect() is reliable.
        requestAnimationFrame(() => {
            document.querySelectorAll(".bioGlyphDivider").forEach(div => buildRow(div));
        });
    }());

})();

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