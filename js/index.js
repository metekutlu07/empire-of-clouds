// No WebGL postprocessing — noise is a simple 2D canvas overlay.

// ============================================================
// reveal-and-overlay  (intro wipe + reveal observer)
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    // ── Standard reveal observer ────────────────────────────────────────────────
    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (e.isIntersecting) e.target.classList.add("is-visible");

            if (e.target.matches && e.target.matches('section[id^="model3d"]')) {
                const localOverlay = e.target.querySelector(".model3dOverlay");
                if (localOverlay) {
                    if (e.isIntersecting) localOverlay.classList.add("is-hidden");
                    else localOverlay.classList.remove("is-hidden");
                }
            }
        });
    }, { threshold: 0.04 });

    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    function classifyPlate(img) {
        const fig = img.closest("figure.plate");
        if (!fig) return;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w && h) fig.classList.add(w >= h ? "landscape" : "portrait");
    }

    document.querySelectorAll("#plates figure.plate img").forEach((img) => {
        if (img.complete) classifyPlate(img);
        else img.addEventListener("load", () => classifyPlate(img), { once: true });
    });

});


// ── Prelude uses the matrix itself, so the old Perlin intro wipe is disabled.
(() => { })();

// ============================================================
// Glyph Matrix Hero
// ============================================================


(() => {
    const canvas = document.getElementById("c");
    const ctx = canvas.getContext("2d", { alpha: false });

    // ---------- 2D output canvas + noise overlay ----------
    const glCanvas = document.getElementById("gl");
    const glCtx   = glCanvas.getContext("2d");
    const host     = document.getElementById("glyphHero");
    let hostW = 1, hostH = 1;

    // Noise: pre-generate 10 frames of random pixel data (CSS-pixel resolution),
    // store as offscreen canvases, cycle through at ~25 fps inside the 60fps loop.
    let noiseFrames   = [];
    let noiseFrameIdx = 0;
    let noiseTickCount = 0;
    const NOISE_FRAMES     = 10;
    const NOISE_FPS_EVERY  = 2; // advance noise frame every N animation frames ≈ 25fps at 60fps

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
                if      (Math.random() < 0.05) buf[i] = 0x080000ff; // red,   alpha 8
                else if (Math.random() < 0.10) buf[i] = 0x0800ff00; // green, alpha 8
                else if (Math.random() < 0.15) buf[i] = 0x08ff0000; // blue,  alpha 8
                else if (Math.random() < 0.20) buf[i] = 0xccdddddd; // gray,  alpha 204
            }
            nCtx.putImageData(idata, 0, 0);
            noiseFrames.push(nc);
        }
        noiseFrameIdx  = 0;
        noiseTickCount = 0;
    }


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

    // Hole field: TWO LAYERS (combined for richer voids)
    // Layer 1 = large, fast cloud-waves (your "big shapes" preset)
    const HOLE1_SCALE = 0.02;
    const HOLE1_THRESHOLD = 0.52;
    const HOLE1_EDGE = 0.10;
    const HOLE1_DRIFT_SPEED = 0.048;
    const HOLE1_MORPH_SPEED = 0.040;
    const HOLE1_LERP = 0.030;

    // Layer 2 = smaller, slower detail (your previous preset)
    const HOLE2_SCALE = 0.05;
    const HOLE2_THRESHOLD = 0.62;
    const HOLE2_EDGE = 0.20;
    const HOLE2_DRIFT_SPEED = 0.018;
    const HOLE2_MORPH_SPEED = 0.010;
    const HOLE2_LERP = 0.030;

    // How much of the grid to update per frame (performance + responsiveness)
    const HOLE_UPDATE_PER_FRAME = 0.22;


    // Interaction knobs (constructive, not chaotic)
    const PINK_DECAY = 0.986;                    // per-frame decay
    const PINK_ALPHA_MIN = 0.20;                 // how visible even at low levels

    // Click wave settings (step-based, halts at step 6)
    const WAVE_MAX_STEP = 6;
    const WAVE_STEP_RADIUS = 2.2;                // cells per step
    const WAVE_THICKNESS = 0.65;                 // cells
    const WAVE_STEP_MS = 92;                     // time between steps

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
    const INTRO_BLACK_MS = 0;        // no black pause — cells appear immediately
    const INTRO_DONE_MS = INTRO_STAGGER_MS + INTRO_RISE_MS + 250;

    let introStart = performance.now();
    let introDone = false;
    let lastNow = 0;

    // ---------- Collapse ----------
    let collapseStart = 0;

    // ---------- Fatal distortion (liquid warp on fatal error) ----------
    let fatalDistortion = 0;
    let fatalActive = false;
    let fatalStart = 0;

    function triggerFatalDistortion() {
        fatalActive = true;
        fatalStart = performance.now();
        fatalDistortion = 0;
    }
    // ---------- Grid crystallization (shield-grow mechanism, cells only) ----------
    let gridCellAlpha = null;
    let gridCrystalActive = false;
    let crystalLastTick = 0;

    const CRYSTAL_GROW_SPEED = 9.0;   // cells per second (same units as SHIELD_GROW_SPEED)
    const CRYSTAL_NOISE_FREQ = 0.18;  // spatial fbm frequency  (matches shield)
    const CRYSTAL_NOISE_AMP = 6.5;   // distortion in cells    (matches shield)
    const CRYSTAL_NOISE_FREQ2 = 0.52;
    const CRYSTAL_NOISE_AMP2 = 2.5;
    const CRYSTAL_ANIM_SPEED = 0.38;  // edge animation speed (radians/sec offset into noise)

    const crystalState = {
        active: false,
        radius: 0,
        maxRadius: 0,
        cx: 0,
        cy: 0,
        seed: 0,
        timeOff: 0,
        lastTick: 0
    };

    function crystalEdgeAt(c, r) {
        const t = crystalState.timeOff;
        const nx = (c + crystalState.seed) * CRYSTAL_NOISE_FREQ + t * 0.3;
        const ny = (r - crystalState.seed) * CRYSTAL_NOISE_FREQ + t * 0.2;
        const n1 = fbm(nx, ny);
        const n2 = fbm(nx * CRYSTAL_NOISE_FREQ2, ny * CRYSTAL_NOISE_FREQ2);
        return (n1 - 0.5) * 2 * CRYSTAL_NOISE_AMP + (n2 - 0.5) * 2 * CRYSTAL_NOISE_AMP2;
    }

    function startGridCrystallization() {
        const N = cols * rows;
        gridCellAlpha = new Float32Array(N);
        gridCrystalActive = true;

        crystalState.active = true;
        crystalState.radius = 0;
        crystalState.cx = Math.floor(cols / 2);
        crystalState.cy = Math.floor(rows / 2);
        crystalState.seed = Math.random() * 1000;
        crystalState.timeOff = 0;
        crystalState.lastTick = 0;
        crystalState.maxRadius = Math.sqrt(
            Math.max(crystalState.cx, cols - crystalState.cx) ** 2 +
            Math.max(crystalState.cy, rows - crystalState.cy) ** 2
        ) + CRYSTAL_NOISE_AMP + CRYSTAL_NOISE_AMP2 + 2;
    }

    function tickGridCrystallization(now) {
        if (!gridCrystalActive || !gridCellAlpha || !crystalState.active) return;

        const dt = crystalState.lastTick > 0 ? (now - crystalState.lastTick) / 1000 : 0;
        crystalState.lastTick = now;
        crystalState.timeOff += CRYSTAL_ANIM_SPEED * dt;

        const prev = crystalState.radius;
        crystalState.radius = Math.min(crystalState.maxRadius, prev + CRYSTAL_GROW_SPEED * dt);

        // Scan only the band that could be newly covered this tick
        const noiseMax = CRYSTAL_NOISE_AMP + CRYSTAL_NOISE_AMP2;
        const bandOuter = crystalState.radius + noiseMax + 2;
        const maxScan = Math.ceil(bandOuter);

        for (let dy = -maxScan; dy <= maxScan; dy++) {
            const r = crystalState.cy + dy;
            if (r < 0 || r >= rows) continue;
            for (let dx = -maxScan; dx <= maxScan; dx++) {
                const c = crystalState.cx + dx;
                if (c < 0 || c >= cols) continue;
                const i = r * cols + c;
                if (gridCellAlpha[i] > 0) continue;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= crystalState.radius + crystalEdgeAt(c, r)) {
                    gridCellAlpha[i] = 1;
                }
            }
        }

        if (crystalState.radius >= crystalState.maxRadius) {
            // Fill any remaining cells fully
            gridCellAlpha.fill(1);
            crystalState.active = false;
            gridCrystalActive = false;
        }
    }


    let cellReveal;   // Float32 0..1
    let spawnAt;      // Float32 ms delay per cell

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
    let glyphIdx, filled, nextSwapAt;
    let holeA, holeB, holeMask;
    let nebulaCollapsing = false;

    window.startNebulaCollapse = function () {
        nebulaCollapsing = true;
        collapseStart = performance.now();
    };


    // Base color style per cell (0 normal, 1 dim, 2 accent)
    let styleKind;    // kept only to drive cellColorStr in pickStyle
    let cellColorStr; // base color string cached at pickStyle() time

    // Persistent interaction layers
    let pink;          // Float32 0..1
    let ring;          // Uint8  0..255 (0 = none, else step index)
    let ringGlyph;     // Uint16 picks star glyph
    let waveFamilyMap = [];
    let familyColorMap = [];


    // ---------- Prelude state ----------
    const preludeLayer = document.getElementById("preludeLayer");
    const preludeStatusEl = document.getElementById("preludeStatus");
    const preludeTransmissionEl = document.getElementById("preludeTransmission");
    const preludeInstructionEl = document.getElementById("preludeInstruction");
    const preludeHoverEl = document.getElementById("preludeHover");

    const PRELUDE_LINES = [
        "You are approaching a forbidden archive.",
        "Beyond this threshold lie histories not curated by institutions.",
        "Here survive worlds, dreams and histories erased from the official record.",
        "This domain belongs to no government, no technocrat, no winner of history."
    ];

    const prelude = {
        active: true,
        mode: "hidden",
        patch: null,
        patchIndex: 0,
        nextPatchShuffle: 0,
        transmissionTimers: [],
        transmissionIntervals: [],
        hoverText: "",
        hoverVisible: false
    };

    let hintTimer = null;

    function scheduleHint(mode) {
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => {
            if (prelude.mode === mode) showPreludeInstruction("Click the code");
        }, 6500);
    }

    function cancelHint() {
        clearTimeout(hintTimer);
        hintTimer = null;
        if (preludeInstructionEl) {
            preludeInstructionEl.classList.remove("show");
            preludeInstructionEl.textContent = "";
        }
    }

    function clearPreludeTimers() {
        prelude.transmissionTimers.forEach(clearTimeout);
        prelude.transmissionTimers.length = 0;
        prelude.transmissionIntervals.forEach(clearTimeout);
        prelude.transmissionIntervals.length = 0;
    }

    function typeIntoElement(el, text = "", opts = {}) {
        if (!el) return;

        const {
            speed = 55,
            className = "",
            holdCursor = true,
            onDone = null
        } = opts;

        el.className = className;
        el.innerHTML = "";

        if (!text) {
            if (onDone) onDone();
            return;
        }

        const safe = String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        const tick = (index = 0) => {
            const body = safe.slice(0, index);
            el.innerHTML = `${body}<span class="cursor">_</span>`;

            if (index < safe.length) {
                const t = setTimeout(() => tick(index + 1), speed);
                prelude.transmissionIntervals.push(t);
                return;
            }

            if (!holdCursor) {
                const t = setTimeout(() => {
                    el.innerHTML = safe;
                    if (onDone) onDone();
                }, 350);
                prelude.transmissionIntervals.push(t);
                return;
            }

            if (onDone) onDone();
        };

        tick(0);
    }

    let statusBandOpened = false;

    function setPreludeStatus(text = "", opts = {}) {
        if (!preludeStatusEl) return;

        // Only fade out when intentionally hiding (empty text)
        if (!text) {
            preludeStatusEl.classList.remove("show", "solid", "alert", "red");
            preludeStatusEl.innerHTML = "";
            return;
        }

        // Swap modifier classes
        preludeStatusEl.classList.remove("solid", "alert", "red");
        if (opts.solid) preludeStatusEl.classList.add("solid");
        if (opts.alert) preludeStatusEl.classList.add("alert");
        if (opts.red) preludeStatusEl.classList.add("red");

        const narrow = preludeStatusEl.classList.contains("narrow") || opts.narrow;
        const cls = ["show", narrow && "narrow", opts.solid && "solid", opts.alert && "alert", opts.red && "red"].filter(Boolean).join(" ");

        const doType = () => {
            typeIntoElement(preludeStatusEl, text, {
                speed: opts.speed ?? 55,
                className: cls,
                holdCursor: true,
                onDone: opts.onDone || null
            });
        };

        if (!statusBandOpened) {
            statusBandOpened = true;
            // Band grows open first, then text types
            preludeStatusEl.classList.add("show");
            const tType = setTimeout(doType, 600);
            prelude.transmissionTimers.push(tType);
        } else {
            preludeStatusEl.classList.add("show");
            doType();
        }
    }

    function hidePreludeHover() {
        prelude.hoverText = "";
        prelude.hoverVisible = false;
        if (!preludeHoverEl) return;
        preludeHoverEl.classList.remove("show");
        preludeHoverEl.innerHTML = "";
    }

    // ── Hover tooltip offset from cursor (px) ────────────────────────────────
    const HOVER_OFFSET_X = 22;   // horizontal: positive = right of cursor
    const HOVER_OFFSET_Y = 32;   // vertical:   positive = below cursor

    function setPreludeHover(text, px, py) {
        if (!preludeHoverEl) return;

        preludeHoverEl.style.left = `${px + HOVER_OFFSET_X}px`;
        preludeHoverEl.style.top = `${py + HOVER_OFFSET_Y}px`;

        if (prelude.hoverText !== text || !prelude.hoverVisible) {
            prelude.hoverText = text;
            prelude.hoverVisible = true;
            preludeHoverEl.classList.add("show");
            // Show instantly — no typing effect on hover
            preludeHoverEl.innerHTML = String(text)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
        }
    }

    function clearPreludeTransmission() {
        clearPreludeTimers();

        if (preludeTransmissionEl) preludeTransmissionEl.innerHTML = "";

        hidePreludeHover();
    }

    function clearPreludeInstruction() {
        if (!preludeInstructionEl) return;
        preludeInstructionEl.classList.remove("show");
        preludeInstructionEl.innerHTML = "";
    }

    function showPreludeInstruction(text) {
        if (!preludeInstructionEl) return;
        preludeInstructionEl.textContent = text;
        preludeInstructionEl.classList.add("show");
    }

    function showTransmissionLines(lines, onDone) {
        clearPreludeTransmission();
        if (!preludeTransmissionEl) return;

        let delay = 0;

        lines.forEach((line, idx) => {
            const timer = setTimeout(() => {
                const el = document.createElement("div");
                el.className = "line show";
                preludeTransmissionEl.appendChild(el);

                typeIntoElement(el, line, {
                    speed: 45,
                    className: "line show",
                    holdCursor: true,
                    onDone: () => {
                        if (idx === lines.length - 1 && onDone) {
                            const doneTimer = setTimeout(onDone, 2200);
                            prelude.transmissionTimers.push(doneTimer);
                        }
                    }
                });
            }, delay);

            prelude.transmissionTimers.push(timer);
            delay += 3600;
        });
    }

    // ── Blob patch config ─────────────────────────────────────────────────────
    // radius   — base radius in cells (roughly matches old 13×11 rect area)
    // noiseAmp — how many cells the edge can bulge/indent (higher = more organic)
    // noiseFreq — angular frequency of noise deformation (higher = more wrinkles)
    const BLOB_RADIUS = 7;
    const BLOB_NOISE_AMP = 2.8;
    const BLOB_NOISE_FREQ = 1.6;
    // Growth / shrink speed in cells-per-second
    const BLOB_GROW_SPEED = 3.5;
    const BLOB_SHRINK_SPEED = 4.5;   // collapse speed after click (higher = faster)
    // Delay (ms) after click before the blob starts shrinking
    const BLOB_SHRINK_DELAY_MS = 700;
    // How fast the edge noise animates (radians-per-second offset into noise)
    const BLOB_EDGE_ANIM_SPEED = 0.38; // subtle slow drift; raise for more writhing
    // Delay (ms) before "Hacking into the matrix" text appears after first click
    const HACKING_TEXT_DELAY_MS = 2000;
    // Shield grow: how fast the protective layer spreads (cells/sec)
    const SHIELD_GROW_SPEED = 9.0;  // increase for faster cover, decrease for slower
    // Origin of shield growth: "center", "top", "bottom", "random"
    const SHIELD_ORIGIN = "center";

    function makePreludePatch(index) {
        const margin = 8;
        const leftZone = index === 0;
        const cxMin = leftZone ? margin : Math.max(margin, Math.floor(cols * 0.55));
        const cxMax = leftZone ? Math.max(cxMin, Math.floor(cols * 0.42)) : cols - margin;
        const cyMin = margin;
        const cyMax = rows - margin;
        return {
            cx: Math.floor(rand(cxMin, cxMax + 1)),
            cy: Math.floor(rand(cyMin, cyMax + 1)),
            radius: BLOB_RADIUS,
            currentRadius: 0,       // animated — grows from 0 to radius
            shrinking: false,       // true while collapsing after click
            seed: Math.random() * 1000,
            timeOffset: 0           // accumulates for animated edge noise
        };
    }

    function blobContainsCell(patch, c, r) {
        if (!patch) return false;
        const dx = c - patch.cx;
        const dy = r - patch.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        // Animated time offset shifts noise coordinates each frame for living edge
        const t = patch.timeOffset || 0;
        const n = perlin(
            patch.seed + Math.cos(angle) * BLOB_NOISE_FREQ + t,
            patch.seed + Math.sin(angle) * BLOB_NOISE_FREQ + t * 0.7
        );
        const n2 = perlin(
            patch.seed * 0.5 + Math.cos(angle * 2.1) * BLOB_NOISE_FREQ * 1.8 - t * 0.5,
            patch.seed * 0.5 + Math.sin(angle * 2.1) * BLOB_NOISE_FREQ * 1.8 + t * 0.3
        );
        // Use animated currentRadius so the blob grows / shrinks over time
        const liveRadius = patch.currentRadius !== undefined ? patch.currentRadius : patch.radius;
        const deformedRadius = liveRadius + (n - 0.5) * 2 * BLOB_NOISE_AMP
            + (n2 - 0.5) * BLOB_NOISE_AMP * 0.5;
        return dist <= deformedRadius;
    }

    // Keep old name as alias so references below still work
    function patchContainsCell(patch, c, r) {
        return blobContainsCell(patch, c, r);
    }

    function localPointToGrid(px, py) {
        const displayW = Math.max(1, glCanvas.clientWidth || hostW || window.innerWidth);
        const displayH = Math.max(1, glCanvas.clientHeight || hostH || window.innerHeight);

        const c = clamp(Math.floor((px / displayW) * cols), 0, Math.max(0, cols - 1));
        // 2D canvas drawImage preserves natural Y (top=0), no flip needed.
        const r = clamp(Math.floor((py / displayH) * rows), 0, Math.max(0, rows - 1));

        return { c, r };
    }

    function gridRowToWaveRow(r) {
        return clamp(r, 0, Math.max(0, rows - 1));
    }

    function patchContainsPoint(patch, px, py) {
        if (!patch) return false;
        const { c, r } = localPointToGrid(px, py);
        return blobContainsCell(patch, c, r);
    }

    function updatePreludeHover(px, py) {
        if (!prelude.active || !prelude.patch || !(prelude.mode === "patch1" || prelude.mode === "patch2")) {
            hidePreludeHover();
            glCanvas.classList.remove("patch-hover");
            return;
        }

        if (!patchContainsPoint(prelude.patch, px, py)) {
            hidePreludeHover();
            glCanvas.classList.remove("patch-hover");
            return;
        }

        glCanvas.classList.add("patch-hover");

        const text = prelude.mode === "patch1"
            ? "Backdoor"
            : "Firewall";

        setPreludeHover(text, px, py);
    }

    function isPreludeBaseVisible(i) {
        if (!prelude.active) return !holeMask[i];
        const c = i % cols;
        const r = (i / cols) | 0;
        if (prelude.mode === "patch1" || prelude.mode === "patch2") {
            return patchContainsCell(prelude.patch, c, r);
        }
        if (prelude.mode === "shield-grow") {
            return isShieldCovered(c, r);
        }
        if (prelude.mode === "shield" || prelude.mode === "transmission" || prelude.mode === "override") {
            return true;
        }
        if (prelude.mode === "unsealing") {
            return false; // base glyphs suppressed — only ring (gold) layer visible
        }
        return false;
    }

    function isPreludeForcedFilled(i) {
        if (!prelude.active) return false; // shield gone once prelude fully done
        if (!(prelude.mode === "patch1" || prelude.mode === "patch2" ||
            prelude.mode === "shield-grow" || prelude.mode === "shield" ||
            prelude.mode === "transmission" || prelude.mode === "override" ||
            prelude.mode === "unsealing")) {
            return false;
        }
        return isPreludeBaseVisible(i);
    }

    function triggerLeftWaveAt(cellX, cellY, familyIndex) {
        const family = glyphFamilies[familyIndex];
        waves.push({
            cx: cellX,
            cy: cellY,
            step: 0,
            max: WAVE_MAX_STEP,
            nextAt: performance.now() + 10,
            familyIndex,
            glyphs: family.glyphs,
            shape: family.shape
        });
        playWaveSound("left", familyIndex);
    }

    function triggerPreludeOverride(cellX, cellY) {
        const famIndex = 2;
        const baseSeed = Math.random() * 1000;
        const waveConfig = {
            cx: cellX,
            cy: cellY,
            maxRadius: Math.sqrt(cols * cols + rows * rows) + 4,
            speed: 1.15,
            seed: baseSeed,
            noiseFreq: 0.18,
            noiseAmp: 6.5,
            noiseFreq2: 0.52,
            noiseAmp2: 2.5,
            familyIndex: famIndex,
            glyphs: glyphFamilies[famIndex].glyphs,
            colorFn: goldColor
        };
        blobWaves.push({ ...waveConfig, mode: "wash", radius: 0 });
        setTimeout(() => blobWaves.push({ ...waveConfig, mode: "wash", radius: 0 }), 240);
        playWaveSound("right", famIndex);
    }

    function showMainUI() {
        // ── Invariant: preludeLayer must NEVER receive pointer events once the
        // main UI is live. Enforce it here regardless of which call site got us here.
        if (preludeLayer) preludeLayer.style.pointerEvents = "none";
        preludeDone = true;
        if (IS_MOBILE) {
            C_FG = `hsla(180, 90%, 50%, 0.4)`;
            C_FG_DIM = `hsla(318, 100%, 77%, 0.4)`;
            const N = cols * rows;
            for (let i = 0; i < N; i++) {
                if (cellColorStr && styleKind && styleKind[i] !== 2) {
                    cellColorStr[i] = styleKind[i] === 1 ? C_FG_DIM : C_FG;
                }
            }
        }
        const titleBlock = document.getElementById("titleBlock");
        const nebula = document.getElementById("scrollHint");
        const books = document.getElementById("booksHint");
        const instr = document.getElementById("matrixInstructions");
        const mobileInstr = document.getElementById("mobileInstructions");
        if (nebula) nebula.classList.remove("show");
        if (books) books.classList.remove("show");
        if (instr) instr.classList.remove("show");
        if (mobileInstr) mobileInstr.classList.remove("show");
        const GLYPH_WAIT = INTRO_DONE_MS + 800;
        setTimeout(() => {
            if (titleBlock) titleBlock.classList.add("show");
            const glow = document.getElementById("titleGlow");
            if (glow) glow.style.opacity = "1";
        }, GLYPH_WAIT);
        setTimeout(() => { if (nebula) nebula.classList.add("show"); }, GLYPH_WAIT + 900);
        setTimeout(() => { if (books) books.classList.add("show"); }, GLYPH_WAIT + 900);
        setTimeout(() => { if (instr) instr.classList.add("show"); }, GLYPH_WAIT + 1300);
        setTimeout(() => { if (mobileInstr) mobileInstr.classList.add("show"); }, GLYPH_WAIT + 900);
    }

    function unlockArchive() {
        // Rings have fully decayed — canvas is black under unsealing mode
        // prelude.active stays TRUE so holeMask/cloud-holes never show through
        prelude.patch = null;
        hidePreludeHover();
        if (preludeLayer) preludeLayer.style.pointerEvents = "none";

        // Hide skip button now that the unsealing text is about to appear
        const skipBtnEl = document.getElementById("skipIntro");
        if (skipBtnEl) skipBtnEl.classList.add("hidden");

        // Brief pause, then type "Archive unsealed" over pure black
        setTimeout(() => {
            const statusEl = document.getElementById("preludeStatus");
            if (statusEl) {
                // Wipe any lingering inline styles so the CSS transition is in full control
                statusEl.style.transition = "";
                statusEl.style.opacity = "";
                // narrow keeps the bar compact — no opacity manipulation, only clip-path
                statusEl.className = "show narrow";
                statusEl.innerHTML = "";
                typeIntoElement(statusEl, "Archive unsealed", {
                    speed: 40,
                    className: "show narrow",
                    holdCursor: true,
                    onDone: () => {
                        // Hold 2s, then trigger clip-path shrink (single animation, no opacity)
                        setTimeout(() => {
                            // Start grid darkening at the same moment the bar closes
                            gridDarkTarget = 1;
                            gridDarkSpeed = 1 / 1500;

                            // Remove .show — CSS clip-path transition handles the shrink (550ms)
                            statusEl.className = "narrow";

                            // Clean up after the clip-path transition finishes
                            setTimeout(() => {
                                statusEl.className = "";
                                statusEl.innerHTML = "";
                                prelude.active = false;
                                document.body.classList.add("archive-unsealed");

                                // Wait for grid to finish darkening, then start glyph emergence
                                setTimeout(() => {
                                    resetIntro(cols * rows);
                                    introStart = performance.now();
                                    introDone = false;
                                    showMainUI();
                                }, 800);
                            }, 600); // 550ms transition + small buffer
                        }, 2000);
                    }
                });
            }
        }, 400);
    }

    // ── Shield grow state ─────────────────────────────────────────────────────
    const shieldGrow = {
        active: false,
        radius: 0,
        cx: 0,
        cy: 0,
        lastTick: 0,
        maxRadius: 0,
        seed: 0
    };

    // Shield edge noise params — mirrors the right-click blob wave feel
    const SHIELD_NOISE_FREQ = 0.18;
    const SHIELD_NOISE_AMP = 6.5;
    const SHIELD_NOISE_FREQ2 = 0.52;
    const SHIELD_NOISE_AMP2 = 2.5;

    function shieldEdgeAt(x, y) {
        // Same spatial distortion formula as blobWaves / triggerPreludeOverride
        const nx = (x + shieldGrow.seed) * SHIELD_NOISE_FREQ;
        const ny = (y - shieldGrow.seed) * SHIELD_NOISE_FREQ;
        const n1 = fbm(nx, ny);
        const n2 = fbm(nx * SHIELD_NOISE_FREQ2, ny * SHIELD_NOISE_FREQ2);
        return (n1 - 0.5) * 2 * SHIELD_NOISE_AMP + (n2 - 0.5) * 2 * SHIELD_NOISE_AMP2;
    }

    function tickShieldGrow(now) {
        if (!shieldGrow.active) return;

        const dt = shieldGrow.lastTick > 0 ? (now - shieldGrow.lastTick) / 1000 : 0;
        shieldGrow.lastTick = now;

        const prev = shieldGrow.radius;
        shieldGrow.radius = Math.min(shieldGrow.maxRadius, prev + SHIELD_GROW_SPEED * dt);

        // Redraw the band that was newly covered this frame (includes noise overhang)
        const noiseMax = SHIELD_NOISE_AMP + SHIELD_NOISE_AMP2;
        const bandOuter = shieldGrow.radius + noiseMax + 2;
        const bandInner = prev - noiseMax - 2;
        const maxScan = Math.ceil(bandOuter);

        for (let dy = -maxScan; dy <= maxScan; dy++) {
            const r = shieldGrow.cy + dy;
            if (r < 0 || r >= rows) continue;
            for (let dx = -maxScan; dx <= maxScan; dx++) {
                const c = shieldGrow.cx + dx;
                if (c < 0 || c >= cols) continue;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < bandInner || dist > bandOuter) continue;
                drawCell(r * cols + c);
            }
        }

        if (shieldGrow.radius >= shieldGrow.maxRadius) {
            shieldGrow.active = false;
            prelude.mode = "shield";
            shieldGrow.onDone && shieldGrow.onDone();
        }
    }

    function isShieldCovered(c, r) {
        if (!shieldGrow.active && prelude.mode !== "shield-grow") return true;
        const dx = c - shieldGrow.cx;
        const dy = r - shieldGrow.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const distortion = shieldEdgeAt(c, r);
        return dist <= shieldGrow.radius + distortion;
    }

    // The clearing region ahead of the fill uses the same noise, shifted slightly
    // outward so the black-clearing edge is also ragged (not a clean circle)
    function isShieldClearing(c, r) {
        const dx = c - shieldGrow.cx;
        const dy = r - shieldGrow.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const distortion = shieldEdgeAt(c, r);
        const CLEAR_LEAD = 4; // cells ahead of fill edge that get cleared
        return dist <= shieldGrow.radius + distortion + CLEAR_LEAD;
    }

    // ── Transmission window ───────────────────────────────────────────────────
    // Typing speed for the transmission lines (ms per character)
    const TRANSMISSION_SPEED_MS = 49;

    // Short punchy sentences typed one per line, centered
    const TRANSMISSION_LINES = [
        "You are about to enter a forbidden archive.",
        "",
        "Here survives knowledge erased from official records.",
        "Here linger unheard memories and forgotten dreams.",
        "Here rules no government and no institution.",
        "",
        "Enter only if you are prepared to remember."
    ];

    function openTransmissionWindow() {
        const win = document.getElementById("transmissionWindow");
        const text = document.getElementById("transmissionText");
        if (!win || !text) return;

        win.classList.add("open");

        // Type each line sequentially after window opens
        const tStart = setTimeout(() => {
            let lineIdx = 0;

            function typeNextLine() {
                if (lineIdx >= TRANSMISSION_LINES.length) {
                    // All lines done — type footer invite, then enable override
                    const tFooter = setTimeout(() => {
                        const footer = document.getElementById("transmissionFooter");
                        const footerMobile = document.getElementById("transmissionFooterMobile");
                        const isMobile = window.innerWidth <= 640;
                        if (isMobile && footerMobile) {
                            footerMobile.style.display = "block";
                            footerMobile.style.marginTop = "40px";
                            footerMobile.style.textAlign = "center";
                            footerMobile.style.color = "rgba(255,255,255,0.32)";
                            footerMobile.style.fontSize = "13px";
                            footerMobile.style.letterSpacing = "0.14em";
                            footerMobile.style.lineHeight = "1.8";
                            typeIntoElement(footerMobile, "LONG PRESS ANYWHERE FOR FULL SYSTEM OVERRIDE", {
                                speed: 40,
                                holdCursor: false,
                                onDone: () => {
                                    prelude.mode = "override";
                                }
                            });
                        } else if (footer) {
                            typeIntoElement(footer, "RIGHT CLICK ANYWHERE FOR FULL SYSTEM OVERRIDE", {
                                speed: 40,
                                holdCursor: false,
                                onDone: () => {
                                    prelude.mode = "override";
                                }
                            });
                        } else {
                            prelude.mode = "override";
                        }
                    }, 1400);
                    prelude.transmissionTimers.push(tFooter);
                    return;
                }

                const lineText = TRANSMISSION_LINES[lineIdx];
                lineIdx++;

                // Each line is a <p> appended to the text div
                const p = document.createElement("p");
                p.style.margin = lineText === "" ? "0 0 1.6em 0" : "0 0 0.15em 0";
                p.style.opacity = "0";
                p.style.transition = "opacity 300ms ease";
                text.appendChild(p);

                // Fade in the line element
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => { p.style.opacity = "1"; });
                });

                typeIntoElement(p, lineText, {
                    speed: TRANSMISSION_SPEED_MS,
                    holdCursor: false,
                    onDone: () => {
                        const tNext = setTimeout(typeNextLine, 600);
                        prelude.transmissionTimers.push(tNext);
                    }
                });
            }

            typeNextLine();
        }, 700);
        prelude.transmissionTimers.push(tStart);
    }

    function startShieldSequence() {
        prelude.patch = null;
        prelude.mode = "shield-grow";

        // Determine origin based on SHIELD_ORIGIN setting
        let ox, oy;
        if (SHIELD_ORIGIN === "center") {
            ox = Math.floor(cols / 2);
            oy = Math.floor(rows / 2);
        } else if (SHIELD_ORIGIN === "top") {
            ox = Math.floor(cols / 2);
            oy = 0;
        } else if (SHIELD_ORIGIN === "bottom") {
            ox = Math.floor(cols / 2);
            oy = rows - 1;
        } else { // random
            ox = Math.floor(rand(0, cols));
            oy = Math.floor(rand(0, rows));
        }

        shieldGrow.active = true;
        shieldGrow.radius = 0;
        shieldGrow.cx = ox;
        shieldGrow.cy = oy;
        shieldGrow.lastTick = 0;
        shieldGrow.maxRadius = Math.sqrt(Math.max(ox, cols - ox) ** 2 + Math.max(oy, rows - oy) ** 2) + 1;
        shieldGrow.seed = Math.random() * 1000;
        shieldGrow.onDone = () => {
            // Shield fully grown — wait 2s then open transmission window
            const tWin = setTimeout(() => openTransmissionWindow(), 2000);
            prelude.transmissionTimers.push(tWin);
        };

        // Don't call drawAll here — at radius=0 all cells would go black for one frame.
        // tickShieldGrow starts painting cells immediately on the next frame.
    }

    // ── Timing after first patch click ──────────────────────────────────────────
    // Reading time (ms) for each status line before the next one types
    const POST_CLICK1_LINE1_STAY_MS = 4500;  // "Hacking into the matrix" stay time
    const POST_CLICK1_LINE2_STAY_MS = 2000;  // "Firewall detected" stay before patch appears
    // How long the text stays ON SCREEN after the second patch has grown in
    const PATCH2_TEXT_LINGER_MS = 1800;

    function advanceAfterFirstPatch() {
        hidePreludeHover();

        // Delay before blob starts shrinking
        const tShrink = setTimeout(() => {
            if (prelude.patch) prelude.patch.shrinking = true;
        }, BLOB_SHRINK_DELAY_MS);
        prelude.transmissionTimers.push(tShrink);

        const shrinkDuration = BLOB_SHRINK_DELAY_MS + Math.ceil((BLOB_RADIUS / BLOB_SHRINK_SPEED) * 1000) + 180;

        // Show "Archive perimeter breached" ~1s after click (not waiting for shrink)
        const tText1 = setTimeout(() => {
            setPreludeStatus("Archive perimeter breached");
            const tFD = setTimeout(() => {
                setPreludeStatus("Firewall detected");
                const tIS = setTimeout(() => {
                    setPreludeStatus("Installing spyware");
                    // Patch2 spawns exactly when "Installing spyware" appears
                    const tPatch = setTimeout(() => {
                        prelude.patchIndex = 1;
                        prelude.patch = makePreludePatch(1);
                        lastPatchTick = 0;
                        prelude.mode = "patch2";
                        prelude.nextPatchShuffle = performance.now() + 70;

                        // Hint after 4s of inactivity on patch2
                        // Hint after 4s of inactivity
                        scheduleHint("patch2");
                    }, 400); // tiny delay so text is visible first
                    prelude.transmissionTimers.push(tPatch);
                }, 3200);
                prelude.transmissionTimers.push(tIS);
            }, 3500); // "Archive perimeter breached" stays 3500ms
            prelude.transmissionTimers.push(tFD);
        }, 1000);
        prelude.transmissionTimers.push(tText1);

        // Blob shrinks independently — just clears patch1, no text/patch2 logic here
        const t1 = setTimeout(() => {
            prelude.patch = null;
            prelude.mode = "hidden";
        }, shrinkDuration);
        prelude.transmissionTimers.push(t1);
    }

    // ── Timing for the "interrupt" sequence after second patch click ────────────
    // Time (ms) after blob gone before "Spyware installed" starts typing
    const SPYWARE_TEXT_DELAY_MS = 800;
    // How long "Spyware installed" stays before "Initiating d..." begins
    const SPYWARE_STAY_MS = 2200;
    // How many chars of "Initiating d..." are typed before the interrupt fires
    const INTERRUPT_CHARS = 14;   // e.g. "Initiating d_"
    // How long (ms) per char while typing the fake decryption line
    const INTERRUPT_TYPE_SPEED_MS = 55;
    // How long the red ALERT text stays before shield grows (ms)
    const ALERT_STAY_MS = 7000;

    function advanceAfterSecondPatch() {
        hidePreludeHover();
        // Status NOT cleared — "Firewall detected" stays until "Initiating d" replaces it

        // Delayed shrink start
        const tShrink2 = setTimeout(() => {
            if (prelude.patch) prelude.patch.shrinking = true;
        }, BLOB_SHRINK_DELAY_MS);
        prelude.transmissionTimers.push(tShrink2);

        const shrinkDuration2 = BLOB_SHRINK_DELAY_MS + Math.ceil((BLOB_RADIUS / BLOB_SHRINK_SPEED) * 1000) + 180;

        // Show "Hacking into the matrix" ~1s after click (not waiting for shrink)
        const tText2 = setTimeout(() => {
            setPreludeStatus("Hacking into the matrix");
        }, 1000);
        prelude.transmissionTimers.push(tText2);

        const t1 = setTimeout(() => {
            // Blob gone — hidden mode, no drawAll (would flash black)
            prelude.patch = null;
            prelude.mode = "hidden";

            // Step A: wait for "Hacking into the matrix" to finish typing (~1s) + comfortable reading time
            const HACKING_STAY_MS = 3500; // reading time after text has finished typing
            const tA = setTimeout(() => {
                // Show "Fatal error_" in red
                triggerFatalDistortion();
                setPreludeStatus("Fatal error", {
                    red: true, onDone: () => {
                        const tPA = setTimeout(() => {
                            // "Protocol Apocalypse activated_" in red
                            setPreludeStatus("Protocol Apocalypse activated", {
                                red: true, onDone: () => {
                                    // Stay 3.5s, then clear and start shield
                                    const tShield = setTimeout(() => {
                                        setPreludeStatus("");
                                        setTimeout(() => startShieldSequence(), 1200);
                                    }, 3500);
                                    prelude.transmissionTimers.push(tShield);
                                }
                            });
                        }, 3500); // Fatal error stays 3.5s before next message
                        prelude.transmissionTimers.push(tPA);
                    }
                });
            }, SPYWARE_TEXT_DELAY_MS + HACKING_STAY_MS);
            prelude.transmissionTimers.push(tA);
        }, shrinkDuration2);
        prelude.transmissionTimers.push(t1);
    }

    function handlePreludeLeftClick(px, py) {
        if (!(prelude.mode === "patch1" || prelude.mode === "patch2")) return false;
        if (!patchContainsPoint(prelude.patch, px, py)) return true;

        const hit = localPointToGrid(px, py);
        const cx = clamp(hit.c, 0, cols - 1);
        const cy = clamp(hit.r, 0, rows - 1);

        if (prelude.mode === "patch1") {
            triggerLeftWaveAt(cx, cy, 0);
            cancelHint();
            advanceAfterFirstPatch();
        } else {
            triggerLeftWaveAt(cx, cy, 1);
            cancelHint();
            advanceAfterSecondPatch();
        }

        return true;
    }

    function handlePreludeRightClick(px, py) {
        if (prelude.mode !== "override") return prelude.active;

        const hit = localPointToGrid(px, py);

        clearPreludeTransmission();
        setPreludeStatus("");
        cancelHint();

        // Fade out transmission window
        const win = document.getElementById("transmissionWindow");
        if (win) {
            win.style.transition = "opacity 600ms ease, transform 600ms ease";
            win.style.opacity = "0";
            win.style.transform = "translate(-50%, -50%) scaleY(0.85)";
            setTimeout(() => { win.style.visibility = "hidden"; }, 620);
        }

        // Fire gold wave — prelude.active stays TRUE so shield renders beneath wave
        prelude.mode = "unsealing";
        triggerPreludeOverride(hit.c, hit.r);

        // Poll until wave has fully swept (blobWaves empty), then wait for ring decay
        const pollInterval = setInterval(() => {
            if (blobWaves.length === 0) {
                clearInterval(pollInterval);
                // Rings are still glowing gold — wait ~850ms for them to decay to black
                setTimeout(() => {
                    unlockArchive();
                }, 850);
            }
        }, 50);

        return true;
    }

    let lastPatchTick = 0;

    function tickPreludePatch(now) {
        if (!prelude.active || !(prelude.mode === "patch1" || prelude.mode === "patch2") || !prelude.patch) return;

        const patch = prelude.patch;
        const dt = lastPatchTick > 0 ? (now - lastPatchTick) / 1000 : 0;
        lastPatchTick = now;

        const prev = patch.currentRadius;
        let dirty = false;

        if (patch.shrinking) {
            // ── Collapse: shrink from outer edge inward ───────────────────────
            patch.currentRadius = Math.max(0, prev - BLOB_SHRINK_SPEED * dt);
            dirty = true;
            if (patch.currentRadius <= 0) {
                // Fully collapsed — let the caller handle mode transition
                patch.currentRadius = 0;
                dirty = true;
            }
        } else if (patch.currentRadius < patch.radius) {
            // ── Grow: expand from center outward ─────────────────────────────
            patch.currentRadius = Math.min(patch.radius, prev + BLOB_GROW_SPEED * dt);
            dirty = true;
        }

        // ── Always animate edge noise (living border) ─────────────────────────
        patch.timeOffset = (patch.timeOffset || 0) + BLOB_EDGE_ANIM_SPEED * dt;
        // Redraw only the border band each frame (cheap)
        const edgeDirty = true; // always redraw edge ring
        const maxR = Math.ceil(patch.radius + BLOB_NOISE_AMP + 2);
        for (let dy = -maxR; dy <= maxR; dy++) {
            const r = patch.cy + dy;
            if (r < 0 || r >= rows) continue;
            for (let dx = -maxR; dx <= maxR; dx++) {
                const c = patch.cx + dx;
                if (c < 0 || c >= cols) continue;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const liveR = patch.currentRadius;
                // Always redraw edge band; also redraw full interior during grow/shrink
                const inEdgeBand = dist >= liveR - BLOB_NOISE_AMP - 2 &&
                    dist <= liveR + BLOB_NOISE_AMP + 2;
                const inGrowBand = dirty && (dist > prev - 1 && dist <= liveR + BLOB_NOISE_AMP + 1);
                const inShrinkBand = dirty && patch.shrinking &&
                    (dist >= liveR - BLOB_NOISE_AMP - 1 && dist <= prev + BLOB_NOISE_AMP + 1);
                if (inEdgeBand || inGrowBand || inShrinkBand) {
                    drawCell(r * cols + c);
                }
            }
        }
    }

    // ── Prelude intro sequence config ──────────────────────────────────────────
    // Each step: { text, stay, idle, idleMs, speed }
    //   text   — what to type
    //   stay   — ms to hold after typing finishes before moving to next step
    //   idle   — if true, show a standalone blinking cursor for `idleMs` ms first
    //   idleMs — how long the idle cursor flickers before text begins
    //   speed  — optional per-step typing speed (ms/char); falls back to default 55
    const INTRO_SEQUENCE = [
        { text: "Analyzing security system", stay: 2700, idle: true, idleMs: 900, speed: 40 },
        { text: "Backdoor identified", stay: 2000, idle: false },
        { text: "Initiating quantum decryption", stay: 2000, idle: false, speed: 60 }
    ];

    function runIntroSequence(steps, onComplete) {
        let cursor = 0;

        function next() {
            if (cursor >= steps.length) {
                onComplete();
                return;
            }

            const step = steps[cursor++];
            const typingSpeed = step.speed !== undefined ? step.speed : 55;

            if (step.idle && step.idleMs > 0) {
                // Show standalone blinking cursor first, then type the text
                if (preludeStatusEl) {
                    const wasNarrow = preludeStatusEl.classList.contains("narrow");
                    preludeStatusEl.className = wasNarrow ? "show narrow" : "show";
                    preludeStatusEl.innerHTML = '<span class="cursor">_</span>';
                }
                const t = setTimeout(() => {
                    setPreludeStatus(step.text, {
                        speed: typingSpeed,
                        onDone: () => {
                            const t2 = setTimeout(next, step.stay);
                            prelude.transmissionTimers.push(t2);
                        }
                    });
                }, step.idleMs);
                prelude.transmissionTimers.push(t);
            } else {
                setPreludeStatus(step.text, {
                    speed: typingSpeed,
                    onDone: () => {
                        const t = setTimeout(next, step.stay);
                        prelude.transmissionTimers.push(t);
                    }
                });
            }
        }

        next();
    }

    function startPreludeSequence() {
        prelude.active = true;
        prelude.mode = "hidden";
        prelude.patch = null;
        prelude.patchIndex = 0;

        runIntroSequence(INTRO_SEQUENCE, () => {
            // "Initiating quantum decryption" stays visible — patch1 appears
            prelude.patch = makePreludePatch(0);
            lastPatchTick = 0;
            prelude.mode = "patch1";
            prelude.nextPatchShuffle = performance.now() + 70;

            // Hint after 4s of inactivity
            scheduleHint("patch1");
        });
    }

    const BOOT_SEQUENCE = [
        { text: "Connecting to planetary intelligence", stay: 3000 },
        { text: "Infiltrating the grid", stay: 2000 }
    ];

    function startBootSequence() {
        prelude.active = true;
        prelude.mode = "hidden"; // black canvas + noise, no grid yet

        if (preludeLayer) preludeLayer.style.opacity = "1";

        let cursor = 0;

        function nextBoot() {
            if (cursor >= BOOT_SEQUENCE.length) {
                // Wait until grid is fully covered, then start prelude sequence
                const waitForGrid = setInterval(() => {
                    if (!gridCrystalActive) {
                        clearInterval(waitForGrid);
                        startPreludeSequence();
                    }
                }, 50);
                return;
            }

            const step = BOOT_SEQUENCE[cursor++];
            if (step.text === "Infiltrating the grid") {
                if (preludeStatusEl) preludeStatusEl.classList.add("narrow");
            }
            setPreludeStatus(step.text, {
                speed: 50,
                onDone: () => {
                    if (step.text === "Infiltrating the grid") {
                        const tGrid = setTimeout(() => { startGridCrystallization(); }, 500);
                        prelude.transmissionTimers.push(tGrid);
                    }
                    const t = setTimeout(nextBoot, step.stay);
                    prelude.transmissionTimers.push(t);
                }
            });
        }

        // runMysticLoader() already handled the loader display and fade-out
        // before calling startBootSequence(), so kick off the boot text immediately.
        nextBoot();
    }

    // Active waves
    const waves = [];
    let blobWaves = [];

    glCanvas.addEventListener("pointerdown", (e) => {
        if (e.button === 2) {
            if (prelude.active) {
                const rect = glCanvas.getBoundingClientRect();
                const px = e.clientX - rect.left;
                const py = e.clientY - rect.top;
                if (handlePreludeRightClick(px, py)) return;
            }

            const rect = glCanvas.getBoundingClientRect();

            const mx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
            const my = clamp((e.clientY - rect.top) / rect.height, 0, 1);

            const cx = Math.floor(mx * cols);
            const cy = Math.floor(my * rows);

            // Lock the family for THIS wave, then advance the "next" family (same as left click)
            const famIndex = currentFamilyIndex;
            const fam = glyphFamilies[famIndex];

            const colorFn =
                famIndex === 0 ? greenColor :
                    famIndex === 1 ? pinkColor :
                        goldColor;

            const baseSeed = Math.random() * 1000;

            const waveConfig = {
                cx,
                cy,
                maxRadius: Math.max(cols, rows) * 0.8,
                speed: 0.8,
                seed: baseSeed,

                // NEW irregularity parameters
                noiseFreq: 0.12 + Math.random() * 0.18,
                noiseAmp: 3 + Math.random() * 6,
                noiseFreq2: 0.35 + Math.random() * 0.3,
                noiseAmp2: 1 + Math.random() * 3,

                familyIndex: famIndex,
                glyphs: fam.glyphs,
                colorFn
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


            playWaveSound("right", famIndex);

            // Advance "next family" indicator, like left click
            currentFamilyIndex = (currentFamilyIndex + 1) % glyphFamilies.length;

        }
    });



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
                        familyColorMap[i] = wave.colorFn;
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

        if (prelude.active) {
            updatePreludeHover(mousePX, mousePY);
            return;
        }

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

    // Shared left-click / short-tap logic called by both pointer and touch paths
    function fireLeftClick(clientX, clientY) {
        if (entryScreen && entryScreen.classList.contains("visible") && !entryScreen.classList.contains("fade-out")) return;

        const rect = glCanvas.getBoundingClientRect();
        if (prelude.active) {
            const px = clientX - rect.left;
            const py = clientY - rect.top;
            handlePreludeLeftClick(px, py);
            return;
        }

        const mx = clamp((clientX - rect.left) / rect.width, 0, 0.999999);
        const my = clamp((clientY - rect.top) / rect.height, 0, 1);
        const cellX = Math.floor(mx * cols);
        const cellY = Math.floor(my * rows);

        const family = glyphFamilies[currentFamilyIndex];
        waves.push({
            cx: cellX, cy: cellY,
            step: 0, max: WAVE_MAX_STEP,
            nextAt: performance.now() + 10,
            familyIndex: currentFamilyIndex,
            glyphs: family.glyphs,
            color: family.color,
            shape: family.shape
        });
        playWaveSound("left", currentFamilyIndex);
        currentFamilyIndex = (currentFamilyIndex + 1) % glyphFamilies.length;
    }

    function onPointerDown(e) {
        // Don't fire glyph interactions while the entry screen is still up
        if (entryScreen && entryScreen.classList.contains("visible") && !entryScreen.classList.contains("fade-out")) return;

        // Touch taps are handled by touchend (to avoid conflict with long-press)
        if (e.pointerType === "touch") return;

        if (e.button !== 0) return;
        onPointerMove(e);
        fireLeftClick(e.clientX, e.clientY);
    }

    glCanvas.addEventListener("pointermove", onPointerMove, { passive: true });
    glCanvas.addEventListener("pointerdown", onPointerDown, { passive: true });

    // Prevent browser right-click menu on canvas
    glCanvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });

    // ---------- Long press = right-click equivalent (mobile) ----------
    let longPressTimer = null;
    let longPressMoved = false;
    let longPressFired = false;   // true when the 500ms threshold was reached
    let lastTouchX = 0, lastTouchY = 0;
    const LONG_PRESS_MS = 500;

    function fireLongPress(clientX, clientY) {
        // Don't fire glyph interactions while the entry screen is still up
        if (entryScreen && entryScreen.classList.contains("visible") && !entryScreen.classList.contains("fade-out")) return;

        const rect = glCanvas.getBoundingClientRect();

        if (prelude.active) {
            const px = clientX - rect.left;
            const py = clientY - rect.top;
            if (handlePreludeRightClick(px, py)) return;
        }

        const mx = clamp((clientX - rect.left) / rect.width, 0, 1);
        const my = clamp((clientY - rect.top) / rect.height, 0, 1);
        const cx = Math.floor(mx * cols);
        const cy = Math.floor(my * rows);

        const famIndex = currentFamilyIndex;
        const fam = glyphFamilies[famIndex];
        const colorFn =
            famIndex === 0 ? greenColor :
                famIndex === 1 ? pinkColor :
                    goldColor;
        const baseSeed = Math.random() * 1000;

        const waveConfig = {
            cx, cy,
            maxRadius: Math.max(cols, rows) * 0.8,
            speed: 0.8,
            seed: baseSeed,
            noiseFreq: 0.12 + Math.random() * 0.18,
            noiseAmp: 3 + Math.random() * 6,
            noiseFreq2: 0.35 + Math.random() * 0.3,
            noiseAmp2: 1 + Math.random() * 3,
            familyIndex: famIndex,
            glyphs: fam.glyphs,
            colorFn
        };

        blobWaves.push({ ...waveConfig, mode: "wash", radius: 0 });
        setTimeout(() => {
            blobWaves.push({ ...waveConfig, mode: "wash", radius: 0 });
        }, 240);

        playWaveSound("right", famIndex);
        currentFamilyIndex = (currentFamilyIndex + 1) % glyphFamilies.length;
    }

    glCanvas.addEventListener("touchstart", (e) => {
        // preventDefault blocks iOS text-selection callout on long press
        e.preventDefault();
        longPressMoved = false;
        longPressFired = false;
        const touch = e.touches[0];
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
        longPressTimer = setTimeout(() => {
            longPressFired = true;
            fireLongPress(touch.clientX, touch.clientY);
        }, LONG_PRESS_MS);
    }, { passive: false }); // non-passive so preventDefault works

    glCanvas.addEventListener("touchmove", () => {
        longPressMoved = true;
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }, { passive: true });

    glCanvas.addEventListener("touchend", () => {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        // Short tap (no move, no long press) = left click
        if (!longPressMoved && !longPressFired) {
            fireLeftClick(lastTouchX, lastTouchY);
        }
    }, { passive: true });

    glCanvas.addEventListener("touchcancel", () => {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        longPressFired = false;
    }, { passive: true });


    // ---------- Holes (two-layer mask) ----------
    function holeAlpha1(n) {
        return smoothstep(HOLE1_THRESHOLD - HOLE1_EDGE, HOLE1_THRESHOLD + HOLE1_EDGE, n);
    }
    function holeAlpha2(n) {
        return smoothstep(HOLE2_THRESHOLD - HOLE2_EDGE, HOLE2_THRESHOLD + HOLE2_EDGE, n);
    }
    // Returns 0..1 "hole strength" after combining both layers
    function holeFromAlphas(a1, a2) {
        return (Math.max(a1, a2) > 0.58) ? 1 : 0;
    }

    // ---------- Colors ----------
    // cssVar is called only at resize/startup — never per draw call
    function cssVar(name, fallback) {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    }

    // Resolved once; refreshed in resize() so theme changes are picked up
    let C_BG = "#000";
    let C_FG = "#bdbdbd";
    let C_FG_DIM = "#7a7a7a";

    const IS_MOBILE = window.innerWidth <= 640;
    let preludeDone = false;

    function refreshCssVars() {
        C_BG = cssVar("--bg", "#000");
        C_FG = cssVar("--fg", "#bdbdbd");
        C_FG_DIM = cssVar("--fgDim", "#7a7a7a");
        // ── MOBILE COLOR OVERRIDES (only after prelude finishes) ──
        if (IS_MOBILE && preludeDone) {
            C_FG = `hsla(180, 90%, 50%, 0.4)`;
            C_FG_DIM = `hsla(318, 100%, 77%, 0.4)`;
        }
        // ─────────────────────────────────────────────────────
    }

    // Base animation accent system (keeps the original green/pink "alive" even with interaction)
    const ACCENT_PROB = 0.16;
    const ACCENT_ALPHA = 0.95;
    const ACCENT_DIM_ALPHA = 0.70;

    const HUES = [
        { h: 137, s: 100, l: 73 },   // green
        { h: 318, s: 100, l: 77 }    // pink
    ];
    const HUE_JITTER = 10;
    const LIGHT_JITTER = 6;

    function pickStyle(i, accentProb = ACCENT_PROB) {
        if (Math.random() < accentProb) {
            styleKind[i] = 2; // accent
            const base = HUES[randInt(HUES.length)];
            const hj = base.h + rand(-HUE_JITTER, HUE_JITTER);
            const lj = base.l + rand(-LIGHT_JITTER, LIGHT_JITTER);
            const h = Math.round((hj % 360 + 360) % 360);
            const l = clamp(Math.round(lj), 30, 85);
            // Pick alpha once at assignment — avoids the random coin-flip per draw call
            const a = (Math.random() < 0.15) ? ACCENT_DIM_ALPHA : ACCENT_ALPHA;
            cellColorStr[i] = `hsla(${h}, 95%, ${l}%, ${a})`;
            return;
        }
        // 0 = normal, 1 = dim
        styleKind[i] = (Math.random() < 0.28) ? 1 : 0;
        cellColorStr[i] = styleKind[i] === 1 ? C_FG_DIM : C_FG;
    }

    // cellBaseColor replaced by cellColorStr[i] — color string cached at pickStyle() time

    function pinkColor(alpha) {
        return `hsla(318, 100%, 77%, ${alpha})`;
    }

    function greenColor(alpha) {
        return `hsla(137, 100%, 73%, ${alpha})`;
    }

    function goldColor(alpha) {
        return `rgba(255,240,150,${alpha})`;
    }



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

    // Preload all audio
    for (const type in waveSounds) {
        waveSounds[type].forEach(a => {
            a.preload = "auto";
        });
    }

    // iOS Safari won't decode audio until the AudioContext is unlocked by a
    // user gesture. On first touch we silently play+pause every clip so the
    // browser pre-buffers them — eliminating the ~1s delay on subsequent taps.
    function warmUpAudio() {
        for (const type in waveSounds) {
            waveSounds[type].forEach(a => {
                const s = a.cloneNode();
                s.volume = 0;
                s.play().then(() => s.pause()).catch(() => { });
            });
        }
        document.removeEventListener("touchstart", warmUpAudio);
        document.removeEventListener("pointerdown", warmUpAudio);
    }
    document.addEventListener("touchstart", warmUpAudio, { once: true, passive: true });
    document.addEventListener("pointerdown", warmUpAudio, { once: true, passive: true });

    function playWaveSound(type, familyIndex) {
        const base = waveSounds[type][familyIndex];
        if (!base) return;

        // clone node so rapid clicks overlap
        const s = base.cloneNode();
        s.volume = 0.4;
        s.play().catch(() => { });
    }



    let currentFamilyIndex = 0;


    // ---------- Drawing ----------
    function drawCell(i) {
        const c = i % cols;
        const r = (i / cols) | 0;
        const x = c * CELL;
        const y = r * CELL;

        // Paint background — skip during shield-grow for cells outside clearing radius
        // so the black clearing edge is also noisy, not a clean circle
        if (prelude.mode === "shield-grow" && shieldGrow.active) {
            if (!isShieldClearing(c, r)) return; // outside clearing zone — leave untouched
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = C_BG;
        ctx.fillRect(x, y, CELL, CELL);

        let em;

        if (!introDone) {

            em = revealMult(i, lastNow);

        } else if (nebulaCollapsing) {

            const t = lastNow - collapseStart - spawnAt[i];

            em = 1 - clamp(t / INTRO_RISE_MS, 0, 1);

        } else {

            em = 1;

        }

        // Allow wave/ring layer even over procedural holes,
        // but keep the fixed title holes clean.
        const rVal = ring[i];
        if (rVal > 0.001) {
            const family = waveFamilyMap[i];
            const glyphSet = glyphFamilies[family].glyphs;
            const g = glyphSet[ringGlyph[i] % glyphSet.length];

            const alpha = clamp((0.15 + 0.85 * rVal) * em, 0, 0.95);
            ctx.globalAlpha = 1;
            ctx.fillStyle = familyColorMap[i](alpha);
            ctx.fillText(g, x + CELL / 2, y + CELL / 2 + 0.5);
            ctx.globalAlpha = 1;
            return;
        }

        // Prelude can override the procedural hole field.
        if (!isPreludeBaseVisible(i)) return;

        // font/textAlign/textBaseline are set once in resize() — not repeated here

        const preludeFilled = isPreludeForcedFilled(i);
        if (!filled[i] && !preludeFilled) return;

        // ---------- Base / Pink layer ----------
        const p = pink[i];

        // apply intro emergence alpha to base glyph (and pink overlay)
        ctx.globalAlpha = em;

        if (p > 0.02) {
            const a = clamp(PINK_ALPHA_MIN + 0.78 * p, 0, 0.95);
            ctx.fillStyle = pinkColor(a);
        } else {
            // cellColorStr[i] was pre-computed at pickStyle() time — no string building here
            ctx.fillStyle = cellColorStr[i];
        }

        const ch = GLYPHS[glyphIdx[i] % GLYPHS.length];
        ctx.fillText(ch, x + CELL / 2, y + CELL / 2 + 0.5);

        ctx.globalAlpha = 1;
    }

    function drawAll() {
        ctx.globalAlpha = 1;
        ctx.fillStyle = C_BG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const N = cols * rows;
        for (let i = 0; i < N; i++) drawCell(i);
        drawGridLines();
    }

    // Grid color state: 0 = white (normal), 1 = full green (glitch peak)
    let gridDark = false; // switch grid to near-black after archive unsealed
    let gridDarkLevel = 0; // 0 = white grid, 1 = dark grey grid
    let gridDarkTarget = 0;
    let gridDarkSpeed = 0;
    let gridGreen = 0; // 0..1
    let gridGreenTarget = 0;
    let gridGreenSpeed = 0; // units per ms

    function updateGridColor(now) {
        if (gridGreen !== gridGreenTarget) {
            const dir = gridGreenTarget > gridGreen ? 1 : -1;
            const step = gridGreenSpeed * 16;
            gridGreen = Math.max(0, Math.min(1, gridGreen + dir * step));
            if (Math.abs(gridGreen - gridGreenTarget) < 0.01) gridGreen = gridGreenTarget;
        }
        if (gridDarkLevel !== gridDarkTarget) {
            const dir = gridDarkTarget > gridDarkLevel ? 1 : -1;
            const step = gridDarkSpeed * 16;
            gridDarkLevel = Math.max(0, Math.min(1, gridDarkLevel + dir * step));
            if (Math.abs(gridDarkLevel - gridDarkTarget) < 0.01) gridDarkLevel = gridDarkTarget;
        }
    }

    function setGridGreen(target, durationMs) {
        gridGreenTarget = target;
        gridGreenSpeed = Math.abs(target - gridGreen) / durationMs;
    }

    function drawGridLines() {
        if (!gridCellAlpha) return;

        const g = gridGreen;
        const d = gridDarkLevel;
        const ch = Math.round(255 * (1 - g) * (1 - d) + 18 * d);
        const baseAlpha = (0.045 + g * 0.075) * (1 - d) + 0.55 * d;

        ctx.save();
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = `rgba(${ch},${ch},${ch},${baseAlpha})`;
        ctx.globalAlpha = 1;
        ctx.beginPath();

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!gridCellAlpha || gridCellAlpha[r * cols + c] <= 0) continue;
                const x = c * CELL;
                const y = r * CELL;
                ctx.moveTo(x, y);
                ctx.lineTo(x + CELL, y);
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + CELL);
                if (c === cols - 1) { ctx.moveTo(x + CELL, y); ctx.lineTo(x + CELL, y + CELL); }
                if (r === rows - 1) { ctx.moveTo(x, y + CELL); ctx.lineTo(x + CELL, y + CELL); }
            }
        }

        ctx.stroke();
        ctx.restore();
    }

    function drawTrailOverlay() {
        // 1) Clear previously drawn trail cells by redrawing the base cell
        for (let j = 0; j < trailPrev.length; j++) {
            const i = trailPrev[j];
            if (i >= 0 && i < cols * rows) drawCell(i);
        }
        trailPrev.length = 0;

        if (!trailMarks.length) return;

        // font/textAlign/textBaseline are stable — set once in resize()

        // Track which indices we draw this frame (avoid duplicates)
        const seen = new Set();

        for (let k = 0; k < trailMarks.length; k++) {
            const m = trailMarks[k];

            // 2) Decay alpha
            m.a *= TRAIL_DECAY;

            const i = m.i;
            const c = i % cols;
            const r = (i / cols) | 0;

            const x = c * CELL + CELL / 2;
            const y = r * CELL + CELL / 2 + 0.5;

            // Head stronger, tail weaker
            const taper = 1 - (k / Math.max(1, trailMarks.length - 1));
            const a = clamp(m.a * taper, 0, 0.9);

            if (a <= TRAIL_MIN_ALPHA) continue;

            // 3) Draw trail glyph
            ctx.fillStyle = `hsla(137, 100%, 73%, ${a})`;
            ctx.fillText(m.g, x, y);

            // 4) Remember we drew here so we can clear it next frame
            if (!seen.has(i)) {
                seen.add(i);
                trailPrev.push(i);
            }
        }

        // 5) Remove dead marks (after drawing)
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

                const nx = c * FILL_SCALE;
                const ny = r * FILL_SCALE;
                const density = clamp(FILL_BASE + (fbm(nx, ny) - 0.5) * 2 * FILL_VARIATION, 0.10, 0.92);
                filled[i] = (Math.random() < density) ? 1 : 0;

                pickStyle(i);

                pink[i] = 0;
                ring[i] = 0;
                ringGlyph[i] = randInt(STAR.length);
            }
        }
    }

    function seedHoles() {
        const t = performance.now() * 0.001;

        const drift1X = t * HOLE1_DRIFT_SPEED;
        const drift1Y = t * (HOLE1_DRIFT_SPEED * 0.77);
        const morph1X = t * HOLE1_MORPH_SPEED;
        const morph1Y = t * (HOLE1_MORPH_SPEED * 1.13);

        const drift2X = t * HOLE2_DRIFT_SPEED;
        const drift2Y = t * (HOLE2_DRIFT_SPEED * 0.77);
        const morph2X = t * HOLE2_MORPH_SPEED;
        const morph2Y = t * (HOLE2_MORPH_SPEED * 1.13);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const i = r * cols + c;

                const aBase = fbm((c * HOLE1_SCALE) + drift1X, (r * HOLE1_SCALE) + drift1Y);
                const aWarp = fbm((c * HOLE1_SCALE * 1.9) + 400 + morph1X, (r * HOLE1_SCALE * 1.9) - 200 + morph1Y);
                holeA[i] = clamp(0.72 * aBase + 0.28 * aWarp, 0, 1);

                const bBase = fbm((c * HOLE2_SCALE) + drift2X, (r * HOLE2_SCALE) + drift2Y);
                const bWarp = fbm((c * HOLE2_SCALE * 1.9) + 120 + morph2X, (r * HOLE2_SCALE * 1.9) - 60 + morph2Y);
                holeB[i] = clamp(0.72 * bBase + 0.28 * bWarp, 0, 1);

                const a1 = holeAlpha1(holeA[i]);
                const a2 = holeAlpha2(holeB[i]);
                holeMask[i] = holeFromAlphas(a1, a2);
            }
        }
    }





    // ---------- Resize ----------
    function resize() {
        hostW = Math.max(1, (host && host.clientWidth) ? host.clientWidth : window.innerWidth);
        hostH = Math.max(1, window.innerHeight);
        dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        // Size the visible output canvas at device resolution, same as glyph source
        glCanvas.width        = Math.floor(hostW * dpr);
        glCanvas.height       = Math.floor(hostH * dpr);
        glCanvas.style.width  = hostW + "px";
        glCanvas.style.height = hostH + "px";
        // Rebuild noise frames at CSS-pixel resolution (upscaled to glCanvas by drawImage)
        buildNoiseFrames(Math.floor(hostW), Math.floor(hostH));
        canvas.width = Math.floor(hostW * dpr);
        canvas.height = Math.floor(hostH * dpr);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        cols = Math.max(1, Math.ceil((canvas.width / dpr) / CELL));
        rows = Math.max(1, Math.ceil((canvas.height / dpr) / CELL));

        const N = cols * rows;
        glyphIdx = new Uint16Array(N);
        filled = new Uint8Array(N);
        nextSwapAt = new Float64Array(N);

        holeA = new Float32Array(N);
        holeB = new Float32Array(N);
        holeMask = new Uint8Array(N);

        styleKind = new Uint8Array(N);
        cellColorStr = new Array(N);

        refreshCssVars();

        pink = new Float32Array(N);
        ring = new Float32Array(N);
        ringGlyph = new Uint16Array(N);


        waveFamilyMap = new Uint8Array(N);
        familyColorMap = new Array(N);

        waves.length = 0;

        seedGrid();
        seedHoles();

        // Preserve grid crystallization state across resize
        if (gridCellAlpha) {
            gridCellAlpha = new Float32Array(N);
            if (!gridCrystalActive) {
                // Already fully crystallized — fill immediately at full alpha
                gridCellAlpha.fill(1);
            }
            // else: mid-crystallization — restart from seeds (acceptable edge case)
        }

        resetIntro(N);
        introDone = true;

        // Set once — drawCell and drawTrailOverlay rely on these being stable
        const fontPx = Math.floor(CELL * FONT_SCALE);
        ctx.font = `${fontPx}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        drawAll();
    }

    // ---------- Hole updates (smooth, very light mouse coupling) ----------
    let holeCursor = 0;
    function updateHolesSmooth(now) {
        const N = cols * rows;
        const count = Math.max(1, Math.floor(N * HOLE_UPDATE_PER_FRAME));
        const t = now * 0.001;

        // Subtle mouse coupling: nudges the void fields without scrambling.
        const mx = hasPointer ? ((mousePX / Math.max(1, window.innerWidth)) - 0.5) * 1.6 : 0;
        const my = hasPointer ? ((mousePY / Math.max(1, window.innerHeight)) - 0.5) * 1.6 : 0;

        const mx2 = mx * 0.6;
        const my2 = my * 0.6;

        const drift1X = t * HOLE1_DRIFT_SPEED + mx;
        const drift1Y = t * (HOLE1_DRIFT_SPEED * 0.77) + my;
        const morph1X = t * HOLE1_MORPH_SPEED + mx * 0.45;
        const morph1Y = t * (HOLE1_MORPH_SPEED * 1.13) + my * 0.45;

        const drift2X = t * HOLE2_DRIFT_SPEED + mx2;
        const drift2Y = t * (HOLE2_DRIFT_SPEED * 0.77) + my2;
        const morph2X = t * HOLE2_MORPH_SPEED + mx2 * 0.45;
        const morph2Y = t * (HOLE2_MORPH_SPEED * 1.13) + my2 * 0.45;

        for (let k = 0; k < count; k++) {
            const i = holeCursor;
            holeCursor = (holeCursor + 1) % N;

            const c = i % cols;
            const r = (i / cols) | 0;

            // Layer 1 (big, fast)
            const aBase = fbm((c * HOLE1_SCALE) + drift1X, (r * HOLE1_SCALE) + drift1Y);
            const aWarp = fbm((c * HOLE1_SCALE * 1.9) + 400 + morph1X, (r * HOLE1_SCALE * 1.9) - 200 + morph1Y);
            const aTarget = clamp(0.72 * aBase + 0.28 * aWarp, 0, 1);
            holeA[i] = holeA[i] + (aTarget - holeA[i]) * HOLE1_LERP;

            // Layer 2 (smaller, slower)
            const bBase = fbm((c * HOLE2_SCALE) + drift2X, (r * HOLE2_SCALE) + drift2Y);
            const bWarp = fbm((c * HOLE2_SCALE * 1.9) + 120 + morph2X, (r * HOLE2_SCALE * 1.9) - 60 + morph2Y);
            const bTarget = clamp(0.72 * bBase + 0.28 * bWarp, 0, 1);
            holeB[i] = holeB[i] + (bTarget - holeB[i]) * HOLE2_LERP;

            const prevMask = holeMask[i];
            const a1 = holeAlpha1(holeA[i]);
            const a2 = holeAlpha2(holeB[i]);
            const newMask = holeFromAlphas(a1, a2);

            if (newMask !== prevMask) {
                holeMask[i] = newMask;

                // If a hole appears, clear interaction layers there.
                if (newMask) { pink[i] = 0; }

                // Don't redraw during shield-grow or unsealing — those modes own their own painting
                if (prelude.active && (prelude.mode === "shield-grow" || prelude.mode === "unsealing")) continue;

                drawCell(i);
            }
        }
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

        // Pre-build star verts once per step (not per cell)
        let starzVerts = null;
        if (w.shape === "starz") {
            const spikes = 6;
            const innerRatio = 0.38;
            const angleOffset = -Math.PI / 2;
            starzVerts = [];
            for (let vi = 0; vi < spikes * 2; vi++) {
                const a = angleOffset + vi * Math.PI / spikes;
                const rLocal = (vi % 2 === 0) ? radius : radius * innerRatio;
                starzVerts.push({ x: w.cx + Math.cos(a) * rLocal, y: w.cy + Math.sin(a) * rLocal });
            }
        }

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

                if (w.shape === "starz" && starzVerts) {
                    // Distance from point to each pre-computed star edge
                    let minDist = Infinity;

                    for (let vi = 0; vi < starzVerts.length; vi++) {
                        const v1 = starzVerts[vi];
                        const v2 = starzVerts[(vi + 1) % starzVerts.length];

                        const ex = v2.x - v1.x;
                        const ey = v2.y - v1.y;
                        const px = x - v1.x;
                        const py = y - v1.y;

                        const len2 = ex * ex + ey * ey;
                        const tProj = Math.max(0, Math.min(1, (px * ex + py * ey) / len2));

                        const dxEdge = x - (v1.x + tProj * ex);
                        const dyEdge = y - (v1.y + tProj * ey);

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

                    // store a function reference for color
                    if (w.familyIndex === 0) {
                        familyColorMap[i] = greenColor;
                    }
                    else if (w.familyIndex === 1) {
                        familyColorMap[i] = pinkColor;
                    }
                    else {
                        familyColorMap[i] = goldColor;
                    }


                    pink[i] = 0;
                    filled[i] = 1;

                    // IMPORTANT: override draw color
                    // modify drawCell to read w.color (see below)

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

            // During unsealing, shield-grow, or hidden — skip redraws, canvas holds its last state
            if (prelude.active && (prelude.mode === "unsealing" || prelude.mode === "shield-grow" || prelude.mode === "hidden")) continue;

            // Pink decay everywhere too
            if (pink[i] > 0.001) {
                pink[i] *= PINK_DECAY;
                drawCell(i);
            }

            const preludeFilled = isPreludeForcedFilled(i);

            // After decay, skip procedural holes for regen/mutation logic only once the archive is unsealed.
            if (!prelude.active && holeMask[i]) continue;

            // Regenerate empty cells only in the normal post-prelude state.
            if (!preludeFilled && !filled[i]) {
                if (Math.random() < 0.0005) {
                    filled[i] = 1;
                    glyphIdx[i] = randInt(GLYPHS.length);
                    pickStyle(i);
                    drawCell(i);
                }
            }
            // --- Baseline mutation (merged into single pass) ---
            if (now >= nextSwapAt[i]) {

                if ((filled[i] || preludeFilled) && pink[i] < 0.02) {

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



    // ---------- Liquid warp pass (fatal error distortion) ----------
    // Applied as a post-draw compositing step on the finished 2D canvas frame.
    // Uses a per-scanline drawImage strip technique — glyph logic is untouched.
    let warpOffscreen = null;
    let warpOffCtx = null;

    function applyLiquidWarp(now) {
        if (!fatalActive && fatalDistortion === 0) return;

        const t = (now - fatalStart) * 0.001;

        if (fatalActive) {
            // Fast shock rise (peaks ~0.15s), then exponential liquid decay
            const rise = Math.min(1, t / 0.15);
            const decay = Math.exp(-t * 1.6);
            fatalDistortion = rise * decay;

            if (t > 3.0) {
                fatalActive = false;
                fatalDistortion = 0;
                return;
            }
        }

        const w = canvas.width;
        const h = canvas.height;

        // Allocate / resize offscreen buffer once
        if (!warpOffscreen || warpOffscreen.width !== w || warpOffscreen.height !== h) {
            warpOffscreen = new OffscreenCanvas(w, h);
            warpOffCtx = warpOffscreen.getContext("2d");
        }

        // Snapshot current canvas into offscreen buffer
        warpOffCtx.clearRect(0, 0, w, h);
        warpOffCtx.drawImage(canvas, 0, 0);

        // Wipe canvas to background
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // raw pixel space (undo dpr scale)
        ctx.fillStyle = C_BG;
        ctx.fillRect(0, 0, w, h);

        const cx = w * 0.5;
        const cy = h * 0.5;
        const amp = fatalDistortion;

        // Radial shockwave: each scanline strip is displaced by a ripple
        // that propagates outward from centre.
        const STRIP = 2; // pixels per strip (smaller = smoother, heavier)
        for (let sy = 0; sy < h; sy += STRIP) {
            // Distance from strip centre to canvas centre (normalised 0..1)
            const dy = sy + STRIP * 0.5 - cy;
            const normY = dy / h;

            // Primary ripple — radial wavefront moving outward
            const ripplePhase = Math.sqrt((sy / h - 0.5) ** 2) * 14 - t * 9;
            const ripple = Math.sin(ripplePhase) * amp * 28;

            // Secondary slower wobble — gives the "settling liquid" feel
            const wobble = Math.sin(normY * 7.5 + t * 3.5) * amp * 12;

            const offsetX = (ripple + wobble) | 0;

            ctx.drawImage(
                warpOffscreen,
                0, sy,           // src x, y
                w, STRIP,        // src w, h
                offsetX, sy,     // dst x, y
                w, STRIP         // dst w, h
            );
        }

        ctx.restore();
    }

    // ---------- Main loop (this was missing; without it the page stays black) ----------
    // In glyphHero.js — replace the boot requestAnimationFrame

    let heroVisible = true;
    let rafId = null;

    function frame(now) {
        if (!heroVisible) { rafId = null; return; } // stop loop
        lastNow = now;
        updateHolesSmooth(now);
        updateWaves(now);
        updateBlobWaves();
        baselineTick(now);
        tickPreludePatch(now);
        tickShieldGrow(now);

        if (nebulaCollapsing) {
            drawAll();   // force full progressive redraw
        }

        updateGridColor(lastNow);
        tickGridCrystallization(now);
        drawTrailOverlay();
        drawGridLines();

        applyLiquidWarp(now);

        // Composite: copy glyph canvas → visible canvas, then overlay noise frame
        glCtx.drawImage(canvas, 0, 0, glCanvas.width, glCanvas.height);
        noiseTickCount++;
        if (noiseTickCount >= NOISE_FPS_EVERY) {
            noiseTickCount = 0;
            noiseFrameIdx  = (noiseFrameIdx + 1) % NOISE_FRAMES;
        }
        if (noiseFrames.length) {
            glCtx.globalAlpha = 0.25; // overall noise intensity — tune this one value (0=none, 1=full)
            glCtx.drawImage(noiseFrames[noiseFrameIdx], 0, 0, glCanvas.width, glCanvas.height);
            glCtx.globalAlpha = 1.0;
        }
        rafId = requestAnimationFrame(frame);
    }

    const heroObs = new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        if (heroVisible && !rafId) rafId = requestAnimationFrame(frame);
    }, { threshold: 0.20 });
    heroObs.observe(host);

    resize();
    rafId = requestAnimationFrame(frame);

    // ── Responsive resize ─────────────────────────────────────────────────
    let _resizeTimer;
    const _ro = new ResizeObserver(() => {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(resize, 50);
    });
    _ro.observe(host);

    // ---------- Prelude boot ----------
    const titleBlock = document.getElementById("titleBlock");
    const nebulaBtn = document.getElementById("scrollHint");
    const booksBtn = document.getElementById("booksHint");
    const instr = document.getElementById("matrixInstructions");

    if (titleBlock) titleBlock.classList.remove("show");
    if (nebulaBtn) nebulaBtn.classList.remove("show");
    if (booksBtn) booksBtn.classList.remove("show");
    if (instr) instr.classList.remove("show");

    const closeBtn = document.getElementById("closeInstructions");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            const panel = document.getElementById("matrixInstructions");
            panel.style.opacity = "0";
            panel.style.transform = "translateY(10px)";
            setTimeout(() => panel.style.display = "none", 600);
        });
    }

    // ── Mystical loader ───────────────────────────────────────────────────────
    const ALL_LOADER_GLYPHS = [
        ...GLYPHS.slice(0, 30),   // main set — varied shapes
        ...STAR,                   // white/green stars
        ...SACRED.slice(0, 10),    // sacred script
    ];

    const LOADER_COLORS = [
        "rgba(255,255,255,0.92)",          // white
        "rgba(255,255,255,0.92)",          // white (weighted more)
        "hsla(137,100%,73%,0.92)",         // green
        "hsla(318,100%,77%,0.92)",         // pink
        "hsla(137,100%,73%,0.92)",         // green
    ];

    const LOADER_DURATION_MS = 4000;
    const LOADER_CYCLE_MS = 120;   // how fast glyphs shift

    function runMysticLoader(onDone) {
        const el = document.getElementById("mysticLoader");
        if (!el) { onDone(); return; }

        let interval = setInterval(() => {
            const g = ALL_LOADER_GLYPHS[Math.floor(Math.random() * ALL_LOADER_GLYPHS.length)];
            const c = LOADER_COLORS[Math.floor(Math.random() * LOADER_COLORS.length)];
            el.textContent = g;
            el.style.color = c;
        }, LOADER_CYCLE_MS);

        // Seed first glyph immediately
        el.textContent = ALL_LOADER_GLYPHS[0];
        el.style.color = LOADER_COLORS[0];

        setTimeout(() => {
            clearInterval(interval);
            el.classList.add("hide");
            setTimeout(onDone, 650); // wait for fade-out transition
        }, LOADER_DURATION_MS);
    }

    // ── Entry selection screen (language + sound) ─────────────────────────────
    (function initEntryScreen() {
        const entryScreen = document.getElementById("entryScreen");
        const langBtns = document.querySelectorAll(".entryOption[data-lang]");
        const soundToggle = document.getElementById("entrySoundToggle");
        const confirmBtn = document.getElementById("entryConfirm");
        const introAudio = document.getElementById("introAudio");

        let selectedLang = "en";

        const UI_STRINGS = {
            en: { language: "LANGUAGE", sound: "SOUND", enter: "ENTER" },
            fr: { language: "LANGUE", sound: "SON", enter: "ENTRER" },
            tr: { language: "DİL", sound: "SES", enter: "BAŞLA" },
            zh: { language: "语言", sound: "声音", enter: "进入" },
            ja: { language: "言語", sound: "サウンド", enter: "入る" },
        };

        function applyLang(lang) {
            const s = UI_STRINGS[lang] || UI_STRINGS.en;
            const labels = document.querySelectorAll(".entryLabel");
            if (labels[0]) labels[0].textContent = s.language;
            if (labels[1]) labels[1].textContent = s.sound;
            if (confirmBtn) confirmBtn.textContent = s.enter;
        }
        let soundEnabled = false;

        // Language selection
        langBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                langBtns.forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
                selectedLang = btn.dataset.lang;
                applyLang(selectedLang);
            });
        });

        // Sound toggle
        soundToggle.addEventListener("click", () => {
            soundEnabled = !soundEnabled;
            const iconOff = document.getElementById("iconSoundOff");
            const iconOn = document.getElementById("iconSoundOn");
            if (soundEnabled) {
                soundToggle.classList.add("sound-on", "selected");
                if (iconOff) iconOff.style.display = "none";
                if (iconOn) iconOn.style.display = "";
                if (introAudio) { introAudio.loop = true; introAudio.volume = 0.85; introAudio.play().catch(() => { }); }
            } else {
                soundToggle.classList.remove("sound-on", "selected");
                if (iconOff) iconOff.style.display = "";
                if (iconOn) iconOn.style.display = "none";
                if (introAudio) { introAudio.pause(); introAudio.currentTime = 0; }
            }
        });

        // Confirm — fade out entry screen, then start boot
        function confirm() {
            if (entryScreen) entryScreen.classList.add("fade-out");
            if (preludeLayer) preludeLayer.style.pointerEvents = "none";
            document.documentElement.dataset.lang = selectedLang;
            document.documentElement.dataset.soundEnabled = soundEnabled ? "1" : "0";
            setTimeout(() => {
                if (entryScreen) entryScreen.style.display = "none";
                startBootSequence();
            }, 520);
        }

        confirmBtn.addEventListener("click", confirm);

        // Show entry screen once loader fades out
        // — but skip entirely if ?skip=1 is in the URL
        if (new URLSearchParams(window.location.search).get("skip") === "1") {
            // hide loader element immediately so there's no flash
            const loaderEl = document.getElementById("mysticLoader");
            if (loaderEl) { loaderEl.style.display = "none"; }
        } else {
            runMysticLoader(() => {
                if (entryScreen) entryScreen.classList.add("visible");
                if (preludeLayer) preludeLayer.style.pointerEvents = "auto";
            });
        }
    })();

    // ── Skip intro button ─────────────────────────────────────────────────────
    const skipBtn = document.getElementById("skipIntro");

    function skipToFinalScene() {
        if (skipBtn) skipBtn.classList.add("hidden");

        // Kill all pending timers from the prelude sequence
        clearPreludeTimers();

        // Hide entry screen if still visible
        const entryScreenEl = document.getElementById("entryScreen");
        if (entryScreenEl) { entryScreenEl.style.display = "none"; }

        // Hide the prelude layer text / loader immediately
        const loaderEl = document.getElementById("mysticLoader");
        if (loaderEl) { loaderEl.style.opacity = "0"; }
        if (preludeLayer) {
            // Kill pointer events immediately — an invisible (opacity:0) but
            // still-interactive overlay is exactly the dead-scene bug.
            preludeLayer.style.pointerEvents = "none";
            preludeLayer.style.transition = "opacity 300ms ease";
            preludeLayer.style.opacity = "0";
        }

        // Close transmission window if open
        const win = document.getElementById("transmissionWindow");
        if (win) {
            win.style.transition = "opacity 300ms ease";
            win.style.opacity = "0";
            setTimeout(() => { win.style.visibility = "hidden"; }, 320);
        }

        // Ensure the grid is fully crystallized (filled)
        if (!gridCellAlpha) {
            const N = cols * rows;
            gridCellAlpha = new Float32Array(N).fill(1);
        } else {
            gridCellAlpha.fill(1);
        }
        gridCrystalActive = false;
        crystalState.active = false;

        // Snap to archive-unsealed state
        prelude.active = false;
        prelude.mode = "hidden";
        document.body.classList.add("archive-unsealed");

        // Dark grid (post-unsealing look)
        gridDarkTarget = 1;
        gridDarkLevel = 1;

        // Force holes to be computed from current time so cloud pattern appears
        seedHoles();

        // Run the proper emergence animation (cells fade in gradually over ~2s)
        // Initialise cellReveal to -1 so the first revealMult(0) call always
        // differs from it and triggers a drawCell redraw on the very first frame.
        resetIntro(cols * rows);
        if (cellReveal) cellReveal.fill(-1);
        introStart = performance.now();
        introDone = false;

        showMainUI();
    }

    if (skipBtn) {
        skipBtn.addEventListener("click", skipToFinalScene);
    }

    // If ?skip=1 is in the URL (e.g. coming from nav bar on other pages),
    // bypass the prelude entirely and go straight to the final scene.
    if (new URLSearchParams(window.location.search).get("skip") === "1") {
        skipToFinalScene();
    }

})();



// ==========================================
// NEBULA EXIT TRANSITION
// ==========================================

const nebulaLink = document.getElementById("scrollHint");

if (nebulaLink) {

    nebulaLink.addEventListener("click", (e) => {

        e.preventDefault();

        // 1. Fade out staged UI
        document.querySelectorAll(".glyphHero .stage").forEach(el => {
            el.classList.remove("show");
        });

        // 2. Fade out title block
        const titleBlock = document.getElementById("titleBlock");
        if (titleBlock) {
            titleBlock.classList.remove("show");
        }

        const UI_FADE_MS = 1400; // must match your 1.25s CSS

        // 3. AFTER UI fade → start glyph collapse
        setTimeout(() => {
            if (window.startNebulaCollapse) {
                window.startNebulaCollapse();
            }
        }, UI_FADE_MS);

        // 4. Navigate AFTER collapse completes
        setTimeout(() => {
            window.location.href = "introduction.html";
        }, UI_FADE_MS + 2200);

    });

}