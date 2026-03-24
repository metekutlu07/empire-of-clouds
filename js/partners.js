// partners.js — single module file
// Consolidates: topnav.js, reveal.js, glyphHero-partners.js, inline page scripts
// No WebGL postprocessing — noise is a simple 2D canvas overlay (same as index.js)

// ── Year footer ───────────────────────────────────────────────────────────────
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ── Topnav: show after scrolling past hero ────────────────────────────────────
const topnav = document.getElementById("topnav");
const heroEl = document.querySelector(".hero");
function updateTopnav() {
    const heroH = heroEl ? heroEl.offsetHeight : window.innerHeight;
    const show = window.scrollY > Math.max(120, heroH - 120);
    topnav.classList.toggle("is-visible", show);
}
window.addEventListener("scroll", updateTopnav, { passive: true });
window.addEventListener("resize", updateTopnav);
updateTopnav();

// ── Reveal observer ───────────────────────────────────────────────────────────
const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("is-visible");
    });
}, { threshold: 0.14 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// ── Nav intro: topnav visible at 3200ms (same as country menu) ────────────────
(() => {
    const veil = document.createElement("div");
    veil.style.cssText = "position:fixed;inset:0;z-index:9999;background:#000;opacity:1;pointer-events:none;transition:opacity 900ms ease;";
    document.body.appendChild(veil);
    setTimeout(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
            veil.style.opacity = "0";
        }));
        setTimeout(() => veil.remove(), 1000);
    }, 900);
})();

setTimeout(() => {
    document.body.classList.add("intro-ui-visible");
}, 3200);

// =========================================================================
// GLYPH HERO
// =========================================================================

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { alpha: false });

// ---------- 2D noise overlay (same system as index.js) ----------
const glCanvas = document.getElementById("gl");
const glCtx = glCanvas.getContext("2d");
const host = document.getElementById("glyphHero");
let hostW = 1, hostH = 1;

const NOISE_FRAMES = 10;
const NOISE_FPS_EVERY = 2;
let noiseFrames = [];
let noiseFrameIdx = 0;
let noiseTickCount = 0;

function buildNoiseFrames(w, h) {
    noiseFrames = [];
    for (let f = 0; f < NOISE_FRAMES; f++) {
        const oc   = document.createElement("canvas");
        oc.width   = w; oc.height = h;
        const ox   = oc.getContext("2d");
        const idata = ox.createImageData(w, h);
        const buf  = new Uint32Array(idata.data.buffer);
        for (let i = 0; i < buf.length; i++) {
            if      (Math.random() < 0.05) buf[i] = 0x080000ff; // red,   alpha 8
            else if (Math.random() < 0.10) buf[i] = 0x0800ff00; // green, alpha 8
            else if (Math.random() < 0.15) buf[i] = 0x08ff0000; // blue,  alpha 8
            else if (Math.random() < 0.20) buf[i] = 0xccdddddd; // gray,  alpha 204
        }
        ox.putImageData(idata, 0, 0);
        noiseFrames.push(oc);
    }
    noiseFrameIdx  = 0;
    noiseTickCount = 0;
}

// const GLYPHS = [

// /* Chorasmian — flowing archaic curves */
// "𐾰", "𐾱", "𐾲", "𐾳", "𐾴", "𐾵", "𐾶", "𐾷", "𐾸", "𐾹",
// "𐾺", "𐾻", "𐾼", "𐾽", "𐾾", "𐾿", "𐿀", "𐿁", "𐿂", "𐿃",

// /* Linear A — proto-linear but soft */
// "𐘀", "𐘁", "𐘂", "𐘃", "𐘄", "𐘅", "𐘆", "𐘇", "𐘈", "𐘉",
// "𐘊", "𐘋", "𐘌", "𐘍", "𐘎", "𐘏", "𐘐", "𐘑", "𐘒", "𐘓",

// /* Khojki — rhythmic sacred curves */
// "𑈀", "𑈁", "𑈂", "𑈃", "𑈄", "𑈅", "𑈆", "𑈇", "𑈈", "𑈉",
// "𑈊", "𑈋", "𑈌", "𑈍", "𑈎", "𑈏", "𑈐", "𑈑", "𑈒", "𑈓",

// /* Loops and arcs */
// "∿", "≀", "≋", "≌", "≍",
// "≈", "≊", "≏",

// /* Wave-like */
// "∽", "∼", "⋒", "⋓", "⋔",

// /* Astral Stars — geometric and radiant */
// "✦", "✧", "✩", "✪", "✫", "✬", "✭", "✮", "✯",
// "✰", "✱", "✲", "✳", "✴", "✵", "✶", "✷", "✸",
// "✹", "✺", "✻", "✼", "✽", "✾", "✿",

// /* Heavy and outlined stars */
// "★", "☆", "✡", "✦", "✧",

// /* Asterisms and stellar marks */
// "⁂", "⁑", "⁕"





// ];


// const GLYPHS = [

//   /* Tifinagh */
//   "ⴰ", "ⴱ", "ⴲ", "ⴳ", "ⴴ", "ⴵ", "ⴶ", "ⴷ", "ⴸ", "ⴹ",
//   "ⴺ", "ⴻ", "ⴼ", "ⴽ", "ⴾ", "ⴿ", "ⵀ", "ⵁ", "ⵂ", "ⵃ",

//   /* Cosmological / Radiant */
//   "✦", "✧", "✶", "✷", "✸", "✹", "✺", "✴", "❇", "❈",
//   "⊙", "⦿", "◎", "◉", "∴", "∵", "∷", "∺", "∻", "≋",

//   /* Computational / Structural */
//   "⟐", "⟑", "⟒", "⟓", "⟔", "⟕", "⟖", "⟗", "⟘", "⟙",
//   "⟦", "⟧", "⟨", "⟩", "⟪", "⟫", "⟬", "⟭", "⟮", "⟯",

//   /* Atmospheric / Curvilinear */
//   "≈", "∽", "∿", "⸜", "⸝", "⸠", "⸡", "⸢", "⸣", "⸤",
//   "⸥", "⸦", "⸧", "⁘", "⁙", "⁚", "⁛", "⁝", "※", "⁂"

// ];

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

// Green "star" glyphs for click waves (kept simple for font support)
const STAR = ["✳", "✶", "✷", "✸", "✹", "✺", "✻", "✼", "✽", "✾", "✴", "❇", "❈", "❉", "❊", "❋", "✦", "✧", "✩", "✪"];

const SACRED = [
    "𑈀", "𑈁", "𑈂", "𑈃", "𑈄", "𑈅", "𑈆", "𑈇", "𑈈", "𑈉",
    "𑈊", "𑈋", "𑈌", "𑈍", "𑈎", "𑈏", "𑈐", "𑈑", "𑈒", "𑈓"
];

const CLOUD = [
    "𐹷", "𐹰", "𑂔", "𑃘", "𑅀", "𑇛", "𑈁", "𑈼", "𑈿", "𐘊", "𐘋", "𑍈", "𑖰", "𑜸"];

const CELL = 20;
const FONT_SCALE = 0.95;

// Baseline behavior (very calm)
const UPDATE_PROB = 0.016;
const MIN_SWAP_MS = 180;
const MAX_SWAP_MS = 2600;

// Density field
const FILL_BASE = 0.56;
const FILL_VARIATION = 0.28;
const FILL_SCALE = 0.09;

// Interaction knobs (constructive, not chaotic)
const PUSH_RADIUS_CELLS = 7;                 // brush radius
const PUSH_TOUCHES_MIN = 6;
const PUSH_TOUCHES_MAX = 52;
const PINK_DECAY = 0.986;                    // per-frame decay
const PINK_STRENGTH = 0.72;                  // trail intensity on push
const PINK_ALPHA_MIN = 0.20;                 // how visible even at low levels

// Click wave settings (step-based, halts at step 6)
const WAVE_MAX_STEP = 6;
const WAVE_STEP_RADIUS = 2.2;                // cells per step
const WAVE_THICKNESS = 0.65;                 // cells
const WAVE_STEP_MS = 92;                     // time between steps

// ---------- Sweep animation ----------
const SWEEP_INTERVAL = 10000;   // every 10 seconds
const SWEEP_DURATION = 3000;    // 3 seconds to cross screen


// ---------- Hover trail (overlay, not per-cell fill) ----------
const TRAIL_LENGTH = 40;          // number of glyphs in the trail
const TRAIL_DECAY = 0.95;         // per-frame alpha multiplier (smaller = faster fade)
const TRAIL_MIN_ALPHA = 0.03;     // remove when below this

let trailMarks = [];              // [{ i, a, g }]
let lastTrailIndex = -1;
let trailPrev = [];               // indices drawn last frame (to clear)


// ---------- Intro emergence ----------
const INTRO_STAGGER_MS = 1500;   // random start delay per cell
const INTRO_RISE_MS = 250;      // fade-in time per cell
const INTRO_BLACK_MS = 1000;     // initial pure black before any glyphs
const INTRO_DONE_MS = INTRO_STAGGER_MS + INTRO_RISE_MS + 250;

let introStart = performance.now();
let introDone = false;
let lastNow = 0;

let cellReveal;   // Float32 0..1
let spawnAt;      // Float32 ms delay per cell
let currentShape = "circle";
let targetShape = "circle";
let morphActive = false;
let morphStart = 0;
let morphDuration = 900;
let morphT = 1;

let currentScale = window.innerWidth <= 640 ? 0.57 : 0.30;
window.morphToShape = function (shapeName, scale = 0.30) {
    if (window.innerWidth <= 640) scale *= 1.5;

    // If we are already morphing, ignore new requests
    if (morphActive) return;

    // If already in that shape, do nothing
    if (shapeName === currentShape) return;

    currentScale = scale;

    targetShape = shapeName;
    morphActive = true;
    morphStart = performance.now();
};

function resetIntro(N) {
    introStart = performance.now();
    introDone = false;
    cellReveal = new Float32Array(N);
    spawnAt = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        // Spread emergence evenly, avoid harsh clumps
        spawnAt[i] = Math.random() * INTRO_STAGGER_MS;
        cellReveal[i] = 0;
    }
}

function revealMult(i, now) {
    if (introDone) return 1;
    const t = now - introStart - INTRO_BLACK_MS - spawnAt[i];
    return clamp(t / INTRO_RISE_MS, 0, 1);
}


function randInt(n) { return (Math.random() * n) | 0; }
function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function smoothstep(a, b, x) {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
}

function starMask(dx, dy, radius, spikes, innerRatio) {
    const a = Math.atan2(dy, dx);
    const r = radius *
        (1 - innerRatio * Math.abs(Math.sin(spikes * a)));
    return Math.sqrt(dx * dx + dy * dy) <= r;
}




function shapeDistance(shape, dx, dy, dist, radius) {

    switch (shape) {

        case "circle":
            return dist - radius;

        case "square":
            return Math.max(Math.abs(dx), Math.abs(dy)) - radius;

        case "diamond":
            return (Math.abs(dx) + Math.abs(dy)) - radius;

        case "star5":
            return dist - (
                radius * (1 - 0.42 * Math.abs(Math.sin(5 * Math.atan2(dy, dx))))
            );

        case "star8":
            return dist - (
                radius * (1 - 0.45 * Math.abs(Math.sin(8 * Math.atan2(dy, dx))))
            );

        case "star10":
            return dist - (
                radius * (1 - 0.5 * Math.abs(Math.sin(10 * Math.atan2(dy, dx))))
            );

        case "plus":
            return Math.min(
                Math.abs(dx) - radius * 0.3,
                Math.abs(dy) - radius * 0.3
            );

        case "cross":
            return Math.min(
                Math.max(Math.abs(dx) - radius * 0.22, Math.abs(dy) - radius),
                Math.max(Math.abs(dy) - radius * 0.22, Math.abs(dx) - radius)
            );


        case "flower": {
            const angle = Math.atan2(dy, dx);
            const petals = 6;
            const rLocal = radius * (0.6 + 0.4 * Math.sin(petals * angle));
            return dist - rLocal;
        }

        case "plus8": {

            const armWidth = radius * 0.15;
            const invSqrt2 = 1 / Math.sqrt(2);

            const verticalDist = Math.abs(dx) - armWidth;
            const horizontalDist = Math.abs(dy) - armWidth;

            const diag1Dist = Math.abs(dx - dy) * invSqrt2 - armWidth;
            const diag2Dist = Math.abs(dx + dy) * invSqrt2 - armWidth;

            return Math.min(
                verticalDist,
                horizontalDist,
                diag1Dist,
                diag2Dist
            );
        }

        case "radialBurst": {

            const coreRadius = radius * 0.2;   // central empty circle
            const rayCount = 12;                // number of rays
            const rayWidth = 0.2;              // angular thickness (0.1–0.25 good)

            const angle = Math.atan2(dy, dx);
            const r = dist;

            // --- central empty circle ---
            const coreDist = r - coreRadius;

            if (coreDist <= 0) {
                return coreDist;  // proper signed interior
            }

            // --- angular repetition for rays ---
            const sector = (Math.PI * 2) / rayCount;
            const localAngle = ((angle % sector) + sector) % sector - sector / 2;

            const angularDist = Math.abs(localAngle) - (sector * rayWidth);

            // Combine radial and angular distance
            const rayDist = Math.max(angularDist * radius, -r + coreRadius);

            return rayDist;
        }


        case "lotus": {

            const coreRadius = radius * 0.22;
            const petalCount = 8;
            const petalDepth = 0.75;

            const angle = Math.atan2(dy, dx);
            const r = dist;

            const petalRadius =
                radius * (1 - petalDepth * Math.abs(Math.sin(petalCount * angle)));

            const shapeDist = r - petalRadius;
            const coreDist = r - coreRadius;

            if (coreDist <= 0) return coreDist;

            return shapeDist;
        }


        case "rings": {

            const coreRadius = radius * 0.22;
            const spacing = radius * 0.18;
            const thickness = spacing * 0.35;

            const r = dist;

            if (r <= coreRadius) return r - coreRadius;

            const m = (r - coreRadius) / spacing;
            const nearest = Math.round(m);
            const bandCenter = nearest * spacing + coreRadius;

            return Math.abs(r - bandCenter) - thickness;
        }

        case "diamondStar": {

            const coreRadius = radius * 0.22;
            const spikes = 6;

            const angle = Math.atan2(dy, dx);
            const r = dist;

            const spikeRadius =
                radius * (1 - 0.4 * Math.abs(Math.cos(spikes * angle)));

            const shapeDist = r - spikeRadius;
            const coreDist = r - coreRadius;

            if (coreDist <= 0) return coreDist;

            return shapeDist;
        }

        case "noiseBurst": {

            const coreRadius = radius * 0.22;
            const angle = Math.atan2(dy, dx);
            const r = dist;

            const noise = 0.15 * Math.sin(8 * angle + r * 0.15);

            const outer = radius * (1 + noise);

            const shapeDist = r - outer;
            const coreDist = r - coreRadius;

            if (coreDist <= 0) return coreDist;

            return shapeDist;
        }


        default:
            return dist - radius;
    }
}
// ---------- Perlin + fbm ----------
const perm = new Uint8Array(512);
const p = new Uint8Array(256);
for (let i = 0; i < 256; i++) p[i] = i;
for (let i = 255; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [p[i], p[j]] = [p[j], p[i]];
}
for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + (b - a) * t; }
function grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
}
function perlin(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);

    const aa = perm[X + perm[Y]];
    const ab = perm[X + perm[Y + 1]];
    const ba = perm[X + 1 + perm[Y]];
    const bb = perm[X + 1 + perm[Y + 1]];

    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return (lerp(x1, x2, v) * 0.5) + 0.5;
}
function fbm(x, y) {
    let n = 0, amp = 0.55, freq = 1.0;
    for (let i = 0; i < 4; i++) {
        n += amp * perlin(x * freq, y * freq);
        amp *= 0.55;
        freq *= 2.02;
    }
    return n;
}

// ---------- Grid state ----------
let cols = 0, rows = 0, dpr = 1;
let glyphIdx, filled, holeMask, nextSwapAt;


// Base color style per cell (0 normal, 1 dim, 2 accent)
let styleKind, accentHue, accentLum, cachedColor;

// Persistent interaction layers
let pink;          // Float32 0..1
let ring;          // Uint8  0..255 (0 = none, else step index)
let ringGlyph;     // Uint16 picks star glyph
let waveFamilyMap = [];
let familyLUTMap = [];   // Uint8Array: 0=green, 1=pink, 2=gold (replaces closure array)
// let hoverAlpha;





// Active waves
const waves = [];
let blobWaves = [];

// Sweep state
let sweepStart = 0;
let sweepActive = false;
let lastSweepTime = 0;

// Sweep oscillation memory
let sweepPhase = null;   // Int8Array

glCanvas.addEventListener("pointerdown", (e) => {
    if (e.button === 2) {

        const rect = glCanvas.getBoundingClientRect();

        const mx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        const my = clamp((e.clientY - rect.top) / rect.height, 0, 1);

        const cx = Math.floor(mx * cols);
        const cy = Math.floor(my * rows);

        // Lock the family for THIS wave, then advance the "next" family (same as left click)
        const famIndex = currentFamilyIndex;
        const fam = glyphFamilies[famIndex];

        const waveConfig = {
            cx,
            cy,
            maxRadius: Math.max(cols, rows) * 0.8,
            speed: 0.8,
            seed: baseSeed,

            noiseFreq: 0.12 + Math.random() * 0.18,
            noiseAmp: 3 + Math.random() * 6,
            noiseFreq2: 0.35 + Math.random() * 0.3,
            noiseAmp2: 1 + Math.random() * 3,

            familyIndex: famIndex,
            glyphs: fam.glyphs,
            lutIndex: famIndex   // 0=green, 1=pink, 2=gold
        };

        // First wave: family wash
        blobWaves.push({
            ...waveConfig,
            mode: "wash",
            radius: 0
        });

        // Second wave: another wash pulse (same family), adds depth without rewriting base
        setTimeout(() => {
            blobWaves.push({
                ...waveConfig,
                mode: "wash",
                radius: 0
            });
        }, 240);

        // Third wave (later): a clean sweep that clears remaining wash and reveals the live base field
        //  setTimeout(() => {
        //  blobWaves.push({
        //   ...waveConfig,
        //     mode: "clear",
        // radius: 0
        //   });
        //}, 1000);

        playWaveSound("right", famIndex);

        // Advance "next family" indicator, like left click
        currentFamilyIndex = (currentFamilyIndex + 1) % glyphFamilies.length;
        updateFamilyIndicator();
    }
});

function blobNoise(x, y, seed) {
    return Math.sin(x * 0.25 + seed) * Math.cos(y * 0.25 - seed);
}


function updateBlobWaves() {
    if (blobWaves.length === 0) return;

    // We stamp ONLY the newly-covered band each frame.
    // This makes the wash stable (no jitter) and lets the opacity decay exactly like left-click rings.
    for (let w = blobWaves.length - 1; w >= 0; w--) {
        const wave = blobWaves[w];

        const prevR = wave.radius || 0;
        const r = prevR + wave.speed;
        wave.radius = r;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {

                const dx = x - wave.cx;
                const dy = y - wave.cy;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Fluid edge distortion (kept)
                // Spatial noise based edge distortion
                const nx = (x + wave.seed) * wave.noiseFreq;
                const ny = (y - wave.seed) * wave.noiseFreq;

                const n1 = fbm(nx, ny);
                const n2 = fbm(nx * wave.noiseFreq2, ny * wave.noiseFreq2);

                const distortion =
                    (n1 - 0.5) * 2 * wave.noiseAmp +
                    (n2 - 0.5) * 2 * wave.noiseAmp2;

                const edge = r + distortion;
                const prevEdge = prevR + distortion;

                // Band: just entered the wave this frame
                const newlyCovered = (dist <= edge) && (dist > prevEdge);

                if (!newlyCovered) continue;

                const i = y * cols + x;

                if (wave.mode === "clear") {
                    if (ring[i] !== 0) {
                        ring[i] = 0;
                        drawCell(i);
                    }
                    continue;
                }

                // "wash" mode (family overlay)
                // Re-energize alpha when a second pulse passes, but do NOT re-roll glyphs (prevents jitter).
                if (ring[i] > 0.02 && waveFamilyMap[i] === wave.familyIndex) {
                    ring[i] = 1.0;
                } else {
                    ring[i] = 1.0;
                    ringGlyph[i] = randInt(wave.glyphs.length);
                    waveFamilyMap[i] = wave.familyIndex;
                    familyLUTMap[i] = wave.lutIndex;
                }

                // do not rewrite base field
                pink[i] = 0;
                drawCell(i);
            }
        }

        if (wave.radius > wave.maxRadius) {
            blobWaves.splice(w, 1);
        }
    }
}


// ---------- Mouse ----------
let mousePX = 0, mousePY = 0;      // pixels
let lastPX = 0, lastPY = 0;
let hasPointer = false;
let vNorm = 0;                     // 0..1-ish
let vDx = 0, vDy = 0;              // normalized direction

function onPointerMove(e) {

    const rect = glCanvas.getBoundingClientRect();

    mousePX = e.clientX - rect.left;
    mousePY = e.clientY - rect.top;


    if (!hasPointer) {
        lastPX = mousePX;
        lastPY = mousePY;
        hasPointer = true;
    }

    const dx = mousePX - lastPX;
    const dy = mousePY - lastPY;
    lastPX = mousePX;
    lastPY = mousePY;

    const v = Math.sqrt(dx * dx + dy * dy);

    // speed normalized to something usable
    vNorm = vNorm + (clamp(v / 28, 0, 1) - vNorm) * 0.22;

    // direction from dx/dy (stable even when slow)
    const m = Math.max(1e-6, Math.abs(dx) + Math.abs(dy));
    vDx = dx / m;
    vDy = dy / m;

    // ---------- Hover trail stamping ----------
    const mx = clamp(mousePX / Math.max(1, hostW), 0, 0.999999);
    const my = clamp(mousePY / Math.max(1, window.innerHeight), 0, 0.999999);

    const cx = Math.floor(mx * cols);
    const cy = Math.floor(my * rows);

    if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
        const idx = cy * cols + cx;

        // Only add when we enter a new cell (prevents stacking on one tile)
        if (idx !== lastTrailIndex) {
            lastTrailIndex = idx;

            // Choose glyph from the current cell's glyph index (stable, not random flicker)
            const g = GLYPHS[glyphIdx[idx] % GLYPHS.length];

            trailMarks.unshift({ i: idx, a: 1, g });

            if (trailMarks.length > TRAIL_LENGTH) trailMarks.pop();
        }
    }

}

function onPointerDown(e) {

    if (e.button !== 0) return;
    onPointerMove(e);

    const rect = glCanvas.getBoundingClientRect();

    const mx = clamp((e.clientX - rect.left) / rect.width, 0, 0.999999);
    const my = clamp((e.clientY - rect.top) / rect.height, 0, 1);

    const cellX = Math.floor(mx * cols);
    const cellY = Math.floor(my * rows);


    const family = glyphFamilies[currentFamilyIndex];

    waves.push({
        cx: cellX,
        cy: cellY,
        step: 0,
        max: WAVE_MAX_STEP,
        nextAt: performance.now() + 10,
        familyIndex: currentFamilyIndex,
        glyphs: family.glyphs,
        color: family.color,
        shape: family.shape
    });

    playWaveSound("left", currentFamilyIndex);


    currentFamilyIndex = (currentFamilyIndex + 1) % glyphFamilies.length;
    updateFamilyIndicator();

}

glCanvas.addEventListener("pointermove", onPointerMove, { passive: true });
glCanvas.addEventListener("pointerdown", onPointerDown, { passive: true });

glCanvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

// ------------------------------
// Prevent form clicks from triggering glyph waves
// ------------------------------
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
// ---------- Colors ----------
function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
}

// ── Cached CSS variables — read once at boot, never per-cell ─────────────
let C_BG = "#000";
let C_FG = "#fff";
let C_FG_DIM = "#7a7a7a";
function refreshCssVars() {
    C_BG = cssVar("--bg", "#000");
    C_FG = cssVar("--fg", "#fff");
    C_FG_DIM = cssVar("--fgDim", "#7a7a7a");
}
refreshCssVars();

// ── Pre-baked alpha LUTs (256 steps) — avoids template-string per draw ───
// Usage: PINK_LUT[Math.round(alpha * 255)]  → "hsla(318,100%,77%,0.xxx)"
const LUT_STEPS = 256;
function buildAlphaLUT(h, s, l) {
    const lut = new Array(LUT_STEPS);
    for (let i = 0; i < LUT_STEPS; i++) {
        lut[i] = `hsla(${h},${s}%,${l}%,${(i / (LUT_STEPS - 1)).toFixed(3)})`;
    }
    return lut;
}
const GREEN_LUT = buildAlphaLUT(137, 100, 73);
const PINK_LUT = buildAlphaLUT(318, 100, 77);
const GOLD_LUT = buildAlphaLUT(46, 100, 78);

function lutColor(lut, alpha) {
    return lut[Math.round(clamp(alpha, 0, 1) * (LUT_STEPS - 1))];
}

function pinkColor(alpha) { return lutColor(PINK_LUT, alpha); }
function greenColor(alpha) { return lutColor(GREEN_LUT, alpha); }

// familyLUTMap stores a LUT index per cell (0=green, 1=pink, 2=gold)
const FAMILY_LUTS = [GREEN_LUT, PINK_LUT, GOLD_LUT];

// ── Base animation accent system ─────────────────────────────────────────
const ACCENT_PROB = 0.16;
const ACCENT_ALPHA = 0.95;
const ACCENT_DIM_ALPHA = 0.70;

const HUES = [
    { h: 137, s: 100, l: 73 },   // green
    { h: 318, s: 100, l: 77 }    // pink
];
const HUE_JITTER = 10;
const LIGHT_JITTER = 6;

// cachedColor: pre-built color string per cell, rebuilt only in pickStyle
// (declared at top-level, line 494)

function pickStyle(i, accentProb = ACCENT_PROB) {
    if (Math.random() < accentProb) {
        styleKind[i] = 2; // accent
        const base = HUES[randInt(HUES.length)];
        const hj = base.h + rand(-HUE_JITTER, HUE_JITTER);
        const lj = base.l + rand(-LIGHT_JITTER, LIGHT_JITTER);
        accentHue[i] = Math.round((hj % 360 + 360) % 360);
        accentLum[i] = clamp(Math.round(lj), 30, 85);
        // Bake the color string now — random dim/bright decided once per style pick
        const a = (Math.random() < 0.15) ? ACCENT_DIM_ALPHA : ACCENT_ALPHA;
        cachedColor[i] = `hsla(${accentHue[i]},95%,${accentLum[i]}%,${a})`;
        return;
    }
    styleKind[i] = (Math.random() < 0.28) ? 1 : 0;
    cachedColor[i] = styleKind[i] === 1 ? C_FG_DIM : C_FG;
}

// cellBaseColor now just reads the pre-baked string
function cellBaseColor(i) { return cachedColor[i]; }


// ---------- Glyph Families ----------
const glyphFamilies = [
    {
        name: "Astral Script",
        icon: "✷",
        glyphs: STAR,        // keep star wave
        shape: "circle"
    },
    {
        name: "Sacred Script",
        icon: "𑈇",
        glyphs: SACRED,
        shape: "starz"
    },
    {
        name: "Cloud Script",
        icon: "𑃘",
        glyphs: CLOUD,
        shape: "diamond"
    }
];



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

// Optional: allow overlap (important)
for (const type in waveSounds) {
    waveSounds[type].forEach(a => {
        a.preload = "auto";
    });
}

function playWaveSound(type, familyIndex) {
    const base = waveSounds[type][familyIndex];
    if (!base) return;

    // clone node so rapid clicks overlap
    const s = base.cloneNode();
    s.volume = 0.4;
    s.play().catch(() => { });
}



let currentFamilyIndex = 0;

function updateFamilyIndicator() {
    const family = glyphFamilies[currentFamilyIndex];

    const iconEl = document.getElementById("familyIcon");
    const nameEl = document.getElementById("familyName");

    if (iconEl) iconEl.textContent = family.icon;
    if (nameEl) nameEl.textContent = family.name;

    // Assign preview color based on family index
    let color;

    if (currentFamilyIndex === 0) {
        color = "hsla(137, 100%, 73%, 1)";      // green
    }
    else if (currentFamilyIndex === 1) {
        color = "hsla(318, 100%, 77%, 1)";      // pink
    }
    else {
        color = "rgba(255, 240, 150, 1)";       // gold
    }

    if (iconEl) iconEl.style.color = color;
    if (nameEl) nameEl.style.color = color;
}



// Pre-bake font string once — never rebuilt per cell
const CELL_FONT = `${Math.floor(CELL * FONT_SCALE)}px "IBM Plex Mono", "Noto Sans Symbols 2", "Noto Sans Symbols", "Noto Sans Linear A", "Noto Sans Sora Sompeng", "Noto Sans Chakma", "Noto Sans Khojki", "Noto Sans Kaithi", "Noto Sans Sharada", "Noto Sans Khudawadi", "Noto Sans Grantha", "Noto Sans Mahajani", "Noto Sans Zanabazar Square", "Noto Sans Siddham", ui-monospace, monospace`;

// ---------- Drawing ----------
function drawCell(i) {
    const c = i % cols;
    const r = (i / cols) | 0;
    const x = c * CELL;
    const y = r * CELL;

    ctx.font = CELL_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 1;

    // Paint background
    ctx.fillStyle = C_BG;
    ctx.fillRect(x, y, CELL, CELL);

    const em = introDone ? 1 : revealMult(i, lastNow);

    const rVal = ring[i];
    if (rVal > 0.001) {
        const family = waveFamilyMap[i];
        const glyphSet = glyphFamilies[family].glyphs;
        const g = glyphSet[ringGlyph[i] % glyphSet.length];
        const alpha = clamp((0.15 + 0.85 * rVal) * em, 0, 0.95);
        ctx.fillStyle = lutColor(FAMILY_LUTS[familyLUTMap[i]], alpha);
        ctx.fillText(g, x + CELL / 2, y + CELL / 2 + 0.5);
        return;
    }

    if (holeMask[i] || !filled[i]) return;

    // ---------- Base / Pink layer ----------
    const p = pink[i];
    ctx.globalAlpha = em;

    ctx.fillStyle = p > 0.02
        ? lutColor(PINK_LUT, clamp(PINK_ALPHA_MIN + 0.78 * p, 0, 0.95))
        : cachedColor[i];

    ctx.fillText(GLYPHS[glyphIdx[i] % GLYPHS.length], x + CELL / 2, y + CELL / 2 + 0.5);
    ctx.globalAlpha = 1;
}

function drawAll() {
    ctx.font = CELL_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 1;
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < cols * rows; i++) drawCell(i);
}

function drawTrailOverlay() {
    for (let j = 0; j < trailPrev.length; j++) {
        const i = trailPrev[j];
        if (i >= 0 && i < cols * rows) drawCell(i);
    }
    trailPrev.length = 0;

    if (!trailMarks.length) return;

    // font/align already set by drawAll; reaffirm in case it drifted
    ctx.font = CELL_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const seen = new Set();

    for (let k = 0; k < trailMarks.length; k++) {
        const m = trailMarks[k];
        m.a *= TRAIL_DECAY;

        const i = m.i;
        const c = i % cols;
        const r = (i / cols) | 0;
        const x = c * CELL + CELL / 2;
        const y = r * CELL + CELL / 2 + 0.5;

        const taper = 1 - (k / Math.max(1, trailMarks.length - 1));
        const a = clamp(m.a * taper, 0, 0.9);
        if (a <= TRAIL_MIN_ALPHA) continue;

        ctx.fillStyle = lutColor(GREEN_LUT, a);
        ctx.fillText(m.g, x, y);

        if (!seen.has(i)) {
            seen.add(i);
            trailPrev.push(i);
        }
    }

    trailMarks = trailMarks.filter(m => m.a > TRAIL_MIN_ALPHA);
}



// ---------- Seeding ----------

function seedGrid() {
    const now = performance.now();

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const i = r * cols + c;

            glyphIdx[i] = randInt(GLYPHS.length);
            nextSwapAt[i] = now + rand(MIN_SWAP_MS, MAX_SWAP_MS);

            // fbm density field — creates organic sparse patches
            const nx = c * FILL_SCALE;
            const ny = r * FILL_SCALE;
            const density = clamp(fbm(nx, ny) - (1 - FILL_BASE), 0, 1);
            filled[i] = Math.random() < (FILL_BASE - FILL_VARIATION + density) ? 1 : 0;

            pickStyle(i);

            pink[i] = 0;
            ring[i] = 0;
            ringGlyph[i] = randInt(STAR.length);

            waveFamilyMap[i] = 0;
            familyLUTMap[i] = 0;  // green
        }
    }
}
function seedHoles(progress = 1) {

    const cx = (cols - 1) / 2;
    const mobileOffset = window.innerWidth <= 640 ? -3 : 0;
    const cy = (rows - 1) / 2 + mobileOffset;
    const base = Math.min(cols, rows);
    const radius = base * currentScale;

    const isGridTarget = targetShape === "squareGrid";

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {

            const i = r * cols + c;
            const dx = c - cx;
            const dy = r - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const dFrom = shapeDistance(currentShape, dx, dy, dist, radius);
            const dTo = shapeDistance(targetShape, dx, dy, dist, radius);

            let d;

            // --- Special handling for squareGrid ---
            if (isGridTarget && progress > 0.85) {
                // snap cleanly to pure squareGrid near end
                d = dTo;
            } else {
                d = dFrom * (1 - progress) + dTo * progress;
            }

            holeMask[i] = d <= 0 ? 1 : 0;
        }
    }
}
updateFamilyIndicator();


// ---------- Resize ----------
function resize() {
    hostW = Math.max(1, (host && host.clientWidth) ? host.clientWidth : window.innerWidth);
    hostH = Math.max(1, (host && host.clientHeight) ? host.clientHeight : window.innerHeight);
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    // Size the 2D noise canvas to match the host
    glCanvas.width = Math.floor(hostW);
    glCanvas.height = Math.floor(hostH);
    glCanvas.style.width = hostW + "px";
    glCanvas.style.height = hostH + "px";
    buildNoiseFrames(Math.floor(hostW), Math.floor(hostH));
    canvas.width = Math.floor(hostW * dpr);
    canvas.height = Math.floor(hostH * dpr);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    cols = Math.max(1, Math.floor((canvas.width / dpr) / CELL));
    rows = Math.max(1, Math.floor((canvas.height / dpr) / CELL));

    const N = cols * rows;
    glyphIdx = new Uint16Array(N);
    filled = new Uint8Array(N);
    holeMask = new Uint8Array(N);
    nextSwapAt = new Float64Array(N);

    sweepPhase = new Int8Array(N);

    styleKind = new Uint8Array(N);
    accentHue = new Uint16Array(N);
    accentLum = new Uint8Array(N);
    cachedColor = new Array(N);

    pink = new Float32Array(N);
    ring = new Float32Array(N);
    ringGlyph = new Uint16Array(N);

    waveFamilyMap = new Uint8Array(N);
    familyLUTMap = new Uint8Array(N);   // default 0 = green

    waves.length = 0;

    seedGrid();
    seedHoles();

    resetIntro(N);

    drawAll();
}



// ---------- Click wave stamping ----------


function stampWaveStep(w) {
    const step = w.step;
    if (step <= 0) return;

    const radius = step * WAVE_STEP_RADIUS;
    const thickness = WAVE_THICKNESS;

    const minX = Math.floor(w.cx - radius - thickness - 2);
    const maxX = Math.ceil(w.cx + radius + thickness + 2);
    const minY = Math.floor(w.cy - radius - thickness - 2);
    const maxY = Math.ceil(w.cy + radius + thickness + 2);

    for (let y = minY; y <= maxY; y++) {
        if (y < 0 || y >= rows) continue;
        for (let x = minX; x <= maxX; x++) {
            if (x < 0 || x >= cols) continue;

            const dx = x - w.cx;
            const dy = y - w.cy;
            const d = Math.sqrt(dx * dx + dy * dy);

            let activate = false;

            // ---------- Geometry selection ----------

            if (w.shape === "circle") {
                activate = Math.abs(d - radius) <= thickness;
            }

            if (w.shape === "starz") {

                const spikes = 6;
                const innerRatio = 0.38;   // sharp star (0.35–0.4 good)

                const angleOffset = -Math.PI / 2; // rotate so one spike is up

                // Build star vertices
                const verts = [];
                for (let i = 0; i < spikes * 2; i++) {
                    const a = angleOffset + i * Math.PI / spikes;
                    const rLocal = (i % 2 === 0) ? radius : radius * innerRatio;
                    verts.push({
                        x: w.cx + Math.cos(a) * rLocal,
                        y: w.cy + Math.sin(a) * rLocal
                    });
                }

                // Distance from point to each edge
                let minDist = Infinity;

                for (let i = 0; i < verts.length; i++) {
                    const v1 = verts[i];
                    const v2 = verts[(i + 1) % verts.length];

                    // Edge vector
                    const ex = v2.x - v1.x;
                    const ey = v2.y - v1.y;

                    // Vector from v1 to point
                    const px = x - v1.x;
                    const py = y - v1.y;

                    // Project onto edge
                    const len2 = ex * ex + ey * ey;
                    const t = Math.max(0, Math.min(1, (px * ex + py * ey) / len2));

                    const projX = v1.x + t * ex;
                    const projY = v1.y + t * ey;

                    const dxEdge = x - projX;
                    const dyEdge = y - projY;

                    const dist = Math.sqrt(dxEdge * dxEdge + dyEdge * dyEdge);

                    if (dist < minDist) minDist = dist;
                }

                activate = minDist <= thickness;
            }

            if (w.shape === "diamond") {
                const ax = Math.abs(dx);
                const ay = Math.abs(dy);

                // Four-pointed star using Manhattan metric
                const manhattan = ax + ay;

                activate = Math.abs(manhattan - radius) <= thickness;
            }

            // ---------- Apply family glyph + color ----------

            if (activate) {
                const i = y * cols + x;

                ring[i] = 1.0;   // full strength like pink


                // choose from wave's glyph family
                ringGlyph[i] = randInt(w.glyphs.length);

                waveFamilyMap[i] = w.familyIndex;

                familyLUTMap[i] = w.familyIndex;  // 0=green, 1=pink, 2=gold

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

        w.step += 1;
        w.nextAt = now + WAVE_STEP_MS;

        if (w.step <= w.max) {
            stampWaveStep(w);
        }

        // Halt at max step, keep the ring in place
        if (w.step >= w.max) {
            waves.splice(k, 1);
        }
    }
}

/* function hoverScramble(now) {
  if (!hasPointer || cols <= 0 || rows <= 0) return;
  if (vNorm < 0.01) return;
 
  const mx = clamp(mousePX / Math.max(1, window.innerWidth), 0, 1);
  const my = clamp(mousePY / Math.max(1, window.innerHeight), 0, 1);
 
  const cx = Math.floor(mx * cols);
  const cy = Math.floor(my * rows);
 
  // MUCH smaller radius
  const R = 3;                     // previously 7
  const r2 = R * R;
 
  // Fewer touches
  const touches = 18 + Math.floor(vNorm * 30);
 
  for (let t = 0; t < touches; t++) {
    const ox = ((Math.random() * 2 - 1) * R) | 0;
    const oy = ((Math.random() * 2 - 1) * R) | 0;
    if (ox * ox + oy * oy > r2) continue;
 
    const x = cx + ox;
    const y = cy + oy;
    if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
 
    const i = y * cols + x;
    if (holeMask[i]) continue;
 
    // quick scramble only
    glyphIdx[i] = randInt(GLYPHS.length);
    pickStyle(i);
 
    nextSwapAt[i] = now + rand(120, 500);
    drawCell(i);
  }
} */





// ---------- Baseline calm swapping + decay ----------
function baselineTick(now) {
    const N = cols * rows;

    if (!introDone && (now - introStart) > INTRO_DONE_MS) introDone = true;

    for (let i = 0; i < N; i++) {
        // Intro emergence: fade-in filled cells gradually
        if (!introDone && filled[i]) {
            const r = revealMult(i, now);
            if (r !== cellReveal[i]) {
                cellReveal[i] = r;
                // Redraw only when it actually changes
                drawCell(i);
            }
        }

        // Ring decay should happen everywhere (including procedural holes)
        if (ring[i] > 0.001) {
            ring[i] *= 0.93;
            drawCell(i);
        }

        // Pink decay everywhere too
        if (pink[i] > 0.001) {
            pink[i] *= PINK_DECAY;
            drawCell(i);
        }

        // After decay, skip procedural holes for regen/mutation logic
        if (holeMask[i]) continue;

        // Regenerate empty
        if (!filled[i]) {
            if (Math.random() < 0.0005) {
                filled[i] = 1;
                glyphIdx[i] = randInt(GLYPHS.length);
                pickStyle(i);
                drawCell(i);
            }
        }
        // --- Baseline mutation (merged into single pass) ---
        if (now >= nextSwapAt[i]) {

            if (filled[i] && pink[i] < 0.02) {

                if (Math.random() < UPDATE_PROB) {
                    glyphIdx[i] = randInt(GLYPHS.length);
                    pickStyle(i);
                    drawCell(i);
                }
            }

            nextSwapAt[i] = now + rand(MIN_SWAP_MS, MAX_SWAP_MS);
        }
    }
}

// ---------- Radial Sweep Effect ----------
function updateSweep(now) {

    // Start new sweep
    if (!sweepActive && now - lastSweepTime > SWEEP_INTERVAL) {
        sweepActive = true;
        sweepStart = now;
        lastSweepTime = now;
    }

    if (!sweepActive) return;

    const elapsed = now - sweepStart;
    const progress = elapsed / SWEEP_DURATION;

    if (progress >= 1) {
        sweepActive = false;
        return;
    }

    // Perform oscillation shifts
    for (let i = 0; i < cols * rows; i++) {

        if (sweepPhase[i] > 0) {

            glyphIdx[i] = randInt(GLYPHS.length);
            pickStyle(i);
            drawCell(i);

            sweepPhase[i]--;

        }
    }

    const cx = (cols - 1) / 2;
    const mobileOffset = window.innerWidth <= 640 ? -3 : 0;
    const cy = (rows - 1) / 2 + mobileOffset;

    const maxRadius = Math.sqrt(cx * cx + cy * cy);

    // Current expanding radius
    const radius = progress * maxRadius;

    // Thickness of the sweeping band
    const band = 1.2;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {

            const dx = c - cx;
            const dy = r - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (Math.abs(dist - radius) <= band) {

                const i = r * cols + c;

                if (holeMask[i]) continue;

                // Trigger oscillation if not already active
                if (sweepPhase[i] === 0) {
                    sweepPhase[i] = 4;   // number of shifts
                }
            }
        }
    }
}
// ---------- Main loop (this was missing; without it the page stays black) ----------
// In glyphHero.js — replace the boot requestAnimationFrame


function frame(now) {
    lastNow = now;

    updateWaves(now);
    updateBlobWaves();
    baselineTick(now);
    updateSweep(now);
    if (morphActive) {
        const t = (now - morphStart) / morphDuration;
        const p = clamp(t, 0, 1);

        // Snapshot hole state before update
        const N = cols * rows;
        const prevHole = new Uint8Array(holeMask);

        seedHoles(p);

        // Only redraw cells whose hole status actually changed
        for (let i = 0; i < N; i++) {
            if (holeMask[i] !== prevHole[i]) drawCell(i);
        }

        if (p >= 1) {
            morphActive = false;
            currentShape = targetShape;
        }
    }
    drawTrailOverlay();

    // Composite glyph canvas then noise overlay onto glCanvas
    glCtx.drawImage(canvas, 0, 0, glCanvas.width, glCanvas.height);
    noiseTickCount++;
    if (noiseTickCount >= NOISE_FPS_EVERY) {
        noiseTickCount = 0;
        noiseFrameIdx = (noiseFrameIdx + 1) % NOISE_FRAMES;
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
    document.fonts.load(`${_fPx}px "Noto Sans Symbols"`,          String.fromCodePoint(0x10E77) + "⟐⧖※"),
    document.fonts.load(`${_fPx}px "Noto Sans Linear A"`,         String.fromCodePoint(0x1060A)),
    document.fonts.load(`${_fPx}px "Noto Sans Sora Sompeng"`,     String.fromCodePoint(0x110D8)),
    document.fonts.load(`${_fPx}px "Noto Sans Chakma"`,           String.fromCodePoint(0x11140)),
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

// ---------- UI reveal sequence ----------
const titleBlock = document.getElementById("titleBlock");
const unifiedControls = document.getElementById("unifiedControls");
const hint = document.getElementById("scrollHint");
const countri = document.querySelector(".countryIndex");

// Start with all UI hidden
if (unifiedControls) unifiedControls.classList.remove("show");
if (hint) hint.classList.remove("show");
if (countri) countri.classList.remove("show");

// 1. Central text (partnersIntro lives inside titleBlock)
setTimeout(() => {
    if (titleBlock) titleBlock.classList.add("show");
}, 2500);

// 2. Country menu arrives
setTimeout(() => {
    if (countri) countri.classList.add("show");
}, 3200);

// 3. Unified controls (audio + family indicator)
setTimeout(() => {
    if (unifiedControls) unifiedControls.classList.add("show");
}, 3800);



// =========================================================================
// PARTNERS: country index, content, sounds, exit sequence
// =========================================================================
// Audio control
const audioCtrl = document.getElementById("audioControl");
const bgm = document.getElementById("bgm");
const audioStatus = document.getElementById("audioStatus");
let isPlaying = false;
if (audioCtrl) {
    audioCtrl.addEventListener("click", () => {
        if (!isPlaying) {
            bgm?.play().catch(e => console.log("Audio play blocked by browser."));
            if (audioStatus) audioStatus.textContent = "Sound On";
            isPlaying = true;
        } else {
            bgm?.pause();
            if (audioStatus) audioStatus.textContent = "Sound Off";
            isPlaying = false;
        }
    });
}

const intro = document.getElementById("partnersIntro");
const layout = document.querySelector(".partnersLayout");
setTimeout(() => intro.classList.add("show"), 100);
let introHidden = false;

const countryButtons = document.querySelectorAll(".countryIndex button");
const countryTitle = document.getElementById("countryTitle");
const partnerList = document.getElementById("partnerList");
const countryLabelKeys = {
    china: "partners.countryChina",
    france: "partners.countryFrance",
    germany: "partners.countryGermany",
    italy: "partners.countryItaly",
    japan: "partners.countryJapan",
    kyrgyzstan: "partners.countryKyrgyzstan",
    lebanon: "partners.countryLebanon",
    korea: "partners.countryKorea",
    tunisia: "partners.countryTunisia",
    turkey: "partners.countryTurkey",
    uk: "partners.countryUk",
    usa: "partners.countryUsa",
    uzbekistan: "partners.countryUzbekistan"
};

const countries = {
    china: {
        shape: "diamond", scale: 0.38,
        partners: ["Shanghai Tongji University", "Dalian International Academy of Arts"]
    },
    france: {
        shape: "hexagon", scale: 0.36,
        partners: [
            "French Ministry of Culture", "Castle of Chaumont-sur-Loire",
            "Philippe Auguste Foundation", "French Center of Color",
            "UNESCO Club Volubilis", "Comet Lab",
            "Quai d'Orsay \u2013 Jacques Chirac Museum", "Provence-Alpes-C\u00f4te d'Azur Region",
            "University of Paris-Est", "Labex Futurs Urbains",
            "Strasbourg University", "AUSser Laboratory",
            "IPRAUS Laboratory", "ENSA Paris-Belleville", "ENSA Strasbourg"
        ]
    },
    germany: {
        shape: "plus", scale: 0.34,
        partners: ["Karlsruhe Institute of Technology", "University of Freiburg"]
    },
    italy: {
        shape: "star5", scale: 0.42,
        partners: [
            "Villa Medici", "Vatican Apostolic Library",
            "French School of Rome", "French Academy in Rome",
            "German Historical Institute in Rome", "La Sapienza University",
            "Giorgio Cini Foundation", "Marciana Library"
        ]
    },
    japan: { shape: "circle", scale: 0.40, partners: ["Tokyo University of Science"] },
    kyrgyzstan: { shape: "diamondStar", scale: 0.30, partners: ["French Institute of Studies on Central Asia"] },
    lebanon: { shape: "radialBurst", scale: 1, partners: ["ALBA \u2013 Academy of Fine Arts"] },
    korea: { label: "SOUTH KOREA", shape: "star10", scale: 0.34, partners: ["Hanyang University"] },
    tunisia: {
        shape: "noiseBurst", scale: 0.37,
        partners: ["Tunisian Ministry of Culture", "National Institute of Heritage", "Municipality of Carthage", "Bardo Museum"]
    },
    turkey: {
        shape: "plus8", scale: 0.41,
        partners: [
            "French Institute of Anatolian Studies", "Pera Museum",
            "Topkap\u0131 Palace", "Istanbul University Library of Rare Manuscripts"
        ]
    },
    uk: { shape: "plus", scale: 0.32, partners: ["Colour Group"] },
    usa: { shape: "diamond", scale: 0.24, partners: ["International Color Association"] },
    uzbekistan: { shape: "rings", scale: 1, partners: ["Biruni Institute of Oriental Studies"] }
};

function updateContent(countryKey, animate = true) {
    const data = countries[countryKey];
    const content = document.getElementById("countryContent");
    const label = window.i18n?.get(countryLabelKeys[countryKey]) || data.label || countryKey.toUpperCase();
    if (!animate) {
        countryTitle.textContent = label;
        partnerList.innerHTML = "";
        data.partners.forEach(p => {
            const li = document.createElement("li");
            li.textContent = p;
            partnerList.appendChild(li);
        });
    } else {
        content.classList.add("is-hidden");
        setTimeout(() => {
            countryTitle.textContent = label;
            partnerList.innerHTML = "";
            data.partners.forEach(p => {
                const li = document.createElement("li");
                li.textContent = p;
                partnerList.appendChild(li);
            });
            requestAnimationFrame(() => requestAnimationFrame(() => {
                content.classList.remove("is-hidden");
            }));
        }, 520);
    }
    if (window.morphToShape) window.morphToShape(data.shape, data.scale);
}

const countrySounds = {
    china: new Audio("audio/partners/waitlist.mp3"), france: new Audio("audio/partners/waitlist2.mp3"),
    germany: new Audio("audio/partners/waitlist3.mp3"), italy: new Audio("audio/partners/waitlist4.mp3"),
    japan: new Audio("audio/partners/country1.mp3"), korea: new Audio("audio/partners/country2.mp3"),
    kyrgyzstan: new Audio("audio/partners/country3.mp3"), lebanon: new Audio("audio/partners/country4.mp3"),
    tunisia: new Audio("audio/partners/country6.mp3"), turkey: new Audio("audio/partners/country5.mp3"),
    uk: new Audio("audio/partners/country7.mp3"), usa: new Audio("audio/partners/country8.mp3"),
    uzbekistan: new Audio("audio/partners/country9.mp3")
};
Object.values(countrySounds).forEach(a => { a.preload = "auto"; });

countryButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        countryButtons.forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const key = btn.dataset.country;
        const sound = countrySounds[key];
        if (sound) { const s = sound.cloneNode(); s.volume = 0.15; s.play().catch(() => { }); }
        updateContent(key);
        if (!introHidden) {
            intro.classList.add("is-hidden");
            layout.classList.add("is-active");
            introHidden = true;
        }
    });
});

const firstButton = document.querySelector(".countryIndex button");
if (firstButton) {
    window.startPartners = function () {
        firstButton.classList.add("is-active");
        updateContent(firstButton.dataset.country, false);
    };
}

window.addEventListener("i18n:updated", () => {
    const activeButton = document.querySelector(".countryIndex button.is-active, .mobileCountryGrid button.is-active");
    if (activeButton) updateContent(activeButton.dataset.country, false);
});

setTimeout(() => { layout.classList.add("is-active"); }, 4500);

// ── Page exit sequence ────────────────────────────────────────────────────────
document.querySelectorAll(".navLinks a, .navPanelLinks a, .brand").forEach(link => {
    link.addEventListener("click", function (e) {
        if (this.target === "_blank") return;
        if (this.origin !== location.origin) return;
        if (this.href === location.href) return;
        e.preventDefault();
        const dest = this.href;
        const unified = document.getElementById("unifiedControls");
        const countri = document.querySelector(".countryIndex");
        const mobileGrid = document.getElementById("mobileCountryGrid");
        const titleBlock = document.getElementById("titleBlock");
        if (unified) unified.classList.remove("show");
        setTimeout(() => {
            if (countri) countri.classList.remove("show");
            if (mobileGrid) mobileGrid.classList.remove("show");
            document.body.classList.add("is-exiting");
        }, 400);
        setTimeout(() => { if (titleBlock) titleBlock.classList.remove("show"); }, 750);
        const veil = document.createElement("div");
        veil.style.cssText = "position:fixed;inset:0;z-index:9999;background:#000;opacity:0;pointer-events:none;transition:opacity 600ms ease;";
        document.body.appendChild(veil);
        setTimeout(() => { requestAnimationFrame(() => requestAnimationFrame(() => { veil.style.opacity = "1"; })); }, 1100);
        setTimeout(() => { window.location.href = dest; }, 1800);
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

// ── Mobile country grid ───────────────────────────────────────────────────────
(() => {
    const mobileGrid = document.getElementById("mobileCountryGrid");
    if (!mobileGrid) return;

    // Show with the same timing as the desktop panel
    setTimeout(() => { mobileGrid.classList.add("show"); }, 3200);

    const mobileButtons = mobileGrid.querySelectorAll("button");
    const allButtons = document.querySelectorAll(".countryIndex button, .mobileCountryGrid button");

    mobileButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            // Sync active state across both desktop and mobile buttons
            allButtons.forEach(b => b.classList.remove("is-active"));
            // Mark matching buttons in both panels active
            document.querySelectorAll(`[data-country="${btn.dataset.country}"]`)
                .forEach(b => b.classList.add("is-active"));

            const key = btn.dataset.country;
            const sound = countrySounds[key];
            if (sound) { const s = sound.cloneNode(); s.volume = 0.15; s.play().catch(() => { }); }
            updateContent(key);
            if (!introHidden) {
                intro.classList.add("is-hidden");
                layout.classList.add("is-active");
                introHidden = true;
            }
        });
    });
})();

// ── Keep desktop + mobile button active states in sync ────────────────────────
// Patch the existing countryButtons loop to also sync mobile
countryButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        // Also clear/set mobile buttons
        document.querySelectorAll(".mobileCountryGrid button").forEach(b => b.classList.remove("is-active"));
        const mobileMatch = document.querySelector(`.mobileCountryGrid [data-country="${btn.dataset.country}"]`);
        if (mobileMatch) mobileMatch.classList.add("is-active");
    });
});

// ── Rewrite index.html nav links to skip prelude ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.topnav a[href="index.html"], a.brand[href="index.html"]').forEach(a => {
        a.setAttribute('href', 'index.html?skip=1');
    });
});
