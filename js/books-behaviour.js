/* ============================================================
   book-2.js — Cosmic Cryptography
   All page scripts combined in a single file.

   Sections (in load order):
   1. Reveal + Footer
   2. Plates Auto Orientation
   3. Book Scroll Animation (3D model)
   4. Audio Player + Analyser
   5. Glyph Matrix Canvas
   6. Lightbox
   7. Poem Glyph Mutation (inactive — uncomment to enable)
   ============================================================ */


/* ============================================================
   1. REVEAL + FOOTER
   Intersection observer that adds .is-visible to .reveal
   elements as they scroll into view. Also sets footer year.
   ============================================================ */

const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
        }
    });
}, { threshold: 0.14 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

document.getElementById("year").textContent = new Date().getFullYear();


/* ============================================================
   2. PLATES AUTO ORIENTATION
   Reads natural image dimensions after load and adds
   .landscape or .portrait to each figure.plateAuto.
   ============================================================ */

(function () {
    const figures = document.querySelectorAll('#plates figure.plateAuto');
    figures.forEach(fig => {
        const img = fig.querySelector('img');
        if (!img) return;

        function apply() {
            const w = img.naturalWidth || 0;
            const h = img.naturalHeight || 0;
            fig.classList.remove('landscape', 'portrait');
            fig.classList.add((w && h && w < h) ? 'portrait' : 'landscape');
        }

        if (img.complete) apply();
        else img.addEventListener('load', apply, { once: true });
    });
})();


/* ============================================================
   3. BOOK SCROLL ANIMATION
   Drives the 3D model-viewer animation playhead from scroll
   position. Debounces resize, gates all work behind rAF.
   Stable against late-loading images and layout shifts.
   ============================================================ */

(function () {
    const model = document.getElementById("book");
    const stage = document.getElementById("stage");
    const enterRig = document.querySelector(".enterRig");
    const hint = document.querySelector(".hint");

    // On mobile: bring the camera moderately closer so the book fills more of the
    // full-height canvas. 0.72x is less aggressive than the previous 0.60x so the
    // book stays fully inside the canvas even on a tall dvh viewport.
    if (model && window.matchMedia("(max-width: 640px)").matches) {
        ["camera-orbit", "min-camera-orbit", "max-camera-orbit"].forEach(attr => {
            const val = model.getAttribute(attr);
            if (!val) return;
            const parts = val.split(" ");
            // radius is the third token (e.g. "0.85m") — scale it down by 28%
            parts[2] = (parseFloat(parts[2]) * 0.72).toFixed(2) + "m";
            model.setAttribute(attr, parts.join(" "));
        });
        // Swap hint text to match the touch gesture on mobile
        if (hint) hint.textContent = 'Swipe up and down to open the book';
    }

    let duration = 0;
    let hasAnimation = false;
    let rafId = null;
    let resizeTimer = null;
    let stageStart = 0;
    let stageEnd = 0;
    let viewportH = window.innerHeight;
    // Only update viewportH when the WIDTH changes — browser bar show/hide only
    // changes height, not width. Real layout events (orientation flip, desktop
    // window resize) change the width. This keeps animation bounds stable while
    // Chrome/Safari's address bar slides in and out.
    let lastResizeW = window.innerWidth;

    // True while a touch gesture is actively driving the animation.
    // Guards the scroll-based tick so the two paths don't race.
    let touchControlling = false;

    function clamp01(x) {
        return Math.max(0, Math.min(1, x));
    }

    // Original material roughness/metallic values from the .glb, saved before
    // applyGlossyCover() overwrites them so AR mode can revert to them.
    const _origMatProps = new Map();

    function applyGlossyCover() {
        try {
            const mvModel = model.model;
            if (!mvModel || !mvModel.materials) return;

            for (const mat of mvModel.materials) {
                const name = (mat.name || "").toLowerCase();
                const isGlossyCandidate =
                    name.includes("cover") ||
                    name.includes("spine") ||
                    name.includes("front") ||
                    name.includes("back") ||
                    name.includes("jacket") ||
                    name.includes("dust") ||
                    name.includes("wrapper") ||
                    name.includes("paper");

                if (!isGlossyCandidate) continue;

                const pbr = mat.pbrMetallicRoughness;
                if (!pbr) continue;

                // Save original values before first override
                if (!_origMatProps.has(mat.name)) {
                    _origMatProps.set(mat.name, {
                        roughness: pbr.roughnessFactor,
                        metallic:  pbr.metallicFactor
                    });
                }

                pbr.setRoughnessFactor(0.2);
                pbr.setMetallicFactor(0.1);
            }
        } catch (e) {
            /* fail silently */
        }
    }

    // In AR mode real-world lighting makes the studio-glossy material appear
    // pale/washed-out. Restore the .glb's original material values when
    // entering AR, and re-apply the glossy finish when returning to canvas.
    model.addEventListener('ar-status', (evt) => {
        const entering = evt.detail.status === 'session-started';
        if (entering) {
            // Restore original .glb material values
            try {
                const mvModel = model.model;
                if (!mvModel || !mvModel.materials) return;
                for (const mat of mvModel.materials) {
                    const pbr = mat.pbrMetallicRoughness;
                    if (!pbr) continue;
                    const orig = _origMatProps.get(mat.name);
                    pbr.setRoughnessFactor(orig ? orig.roughness : 1.0);
                    pbr.setMetallicFactor(orig  ? orig.metallic  : 0.0);
                }
            } catch (e) { /* fail silently */ }
        } else {
            // Back in canvas — re-apply glossy finish
            applyGlossyCover();
        }
    });

    function computeStageBounds() {
        const rect = stage.getBoundingClientRect();
        const pageY = window.scrollY || window.pageYOffset || 0;
        stageStart = rect.top + pageY;
        stageEnd = stageStart + stage.offsetHeight - viewportH;
    }

    function getScrollProgress() {
        const y = window.scrollY || window.pageYOffset || 0;
        const total = stageEnd - stageStart;
        if (total <= 0) return 1;
        return clamp01((y - stageStart) / total);
    }

    // Apply animation at an explicit 0..1 progress value.
    // Used by both the scroll path and the touch path.
    function applyAnimationAtProgress(p) {
        if (!hasAnimation || !duration) return;
        model.currentTime = Math.min(p * duration, duration - 0.001);
        if (hint) hint.classList.toggle("hide", p > 0.88);
    }

    function applyAnimationFromScroll() {
        applyAnimationAtProgress(getScrollProgress());
    }

    function tick() {
        rafId = null;
        // Skip scroll-based update while touch is in control to avoid racing.
        if (touchControlling) return;
        applyAnimationFromScroll();
    }

    function markReady() {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                model.classList.add("isReady");
                if (enterRig) enterRig.classList.add("entered");
                if (hint) setTimeout(() => hint.classList.add("show"), 700);
            });
        });
    }

    function requestTick() {
        if (rafId) return;
        rafId = requestAnimationFrame(tick);
    }

    function refreshBoundsSoon() {
        requestAnimationFrame(() => {
            computeStageBounds();
            requestTick();
        });
    }

    function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const newW = window.innerWidth;
            if (newW !== lastResizeW) {
                // Width changed → real layout event (orientation / window resize).
                // Update viewportH so the scroll range stays correct.
                lastResizeW = newW;
                viewportH = window.innerHeight;
            }
            // Always recompute stage position (it may have reflowed).
            computeStageBounds();
            requestTick();
        }, 100);
    }

    // ── Touch-driven animation (mobile only) ─────────────────────────────────
    // On touch devices we intercept touchmove with preventDefault().
    // This has two benefits over the scroll-driven path:
    //   1. No actual page scroll occurs → browser bars (Chrome top bar,
    //      Safari bottom toolbar) never hide, so the layout never jumps.
    //   2. Animation is driven directly from raw finger coordinates → perfectly
    //      1-to-1 with the finger, no momentum phase after lift, no jitter.
    //
    // A full upward swipe of SWIPE_RANGE_PX = 55% of screen height completes
    // the animation. Multiple swipes accumulate naturally: each touchstart
    // anchors to the current progress, so you can pause mid-swipe and continue.
    //
    // When animation reaches 1.0 (book fully open) we do a single programmatic
    // scrollTo(stageEnd) so the sticky element releases and the book content
    // below is reachable. We also re-enable interception when the user scrolls
    // back to the top.
    // ─────────────────────────────────────────────────────────────────────────
    function setupTouchAnimation() {
        if (!('ontouchstart' in window)) return; // desktop: use scroll path

        // How many px of upward drag = full 0→1 animation.
        // Doubled from the initial value so a casual rapid swipe only opens
        // the book partway — users need a deliberate, longer gesture.
        const SWIPE_RANGE = Math.max(480, Math.floor(viewportH * 1.1));

        let intercepting = true;  // false after animation completes once
        let draining = false;     // true for the tail of a gesture that just
                                  // finished the animation — we still call
                                  // preventDefault() to block the scroll race
                                  // but no longer drive animation progress
        let touchStartY = 0;
        let touchStartProgress = 0;
        let lastProgress = 0;     // survives across gesture cycles

        function onTouchStart(e) {
            draining = false; // new finger contact — clear any leftover drain state
            if (!intercepting) return;
            touchControlling = true;
            touchStartY = e.touches[0].clientY;
            touchStartProgress = lastProgress;
        }

        function onTouchMove(e) {
            // Drain phase: animation just finished but the finger is still moving.
            // Keep calling preventDefault() so the browser doesn't process these
            // remaining events as a scroll from scrollY=0, which would fire
            // intermediate scroll events and flash the animation.
            if (draining) {
                e.preventDefault();
                return;
            }

            if (!intercepting) return;
            // Prevent the browser from scrolling the page — this is what stops
            // the address / toolbar from hiding and eliminates momentum jitter.
            e.preventDefault();

            const dy = touchStartY - e.touches[0].clientY; // positive = swipe up
            const p = clamp01(touchStartProgress + dy / SWIPE_RANGE);
            lastProgress = p;
            applyAnimationAtProgress(p);

            if (p >= 1.0) {
                // Animation done. Enter drain mode for the remainder of this
                // gesture, release interception, and jump real scrollY to the
                // end of the stage so the sticky element releases and the
                // book content below is immediately accessible.
                draining = true;
                intercepting = false;
                touchControlling = false;
                // behavior:'instant' is critical — without it, scroll-behavior:smooth
                // (set on <html>) animates the scroll over dozens of frames, firing
                // intermediate scroll events that replay the animation as a flash.
                window.scrollTo({ top: Math.max(0, stageEnd), behavior: 'instant' });
            }
        }

        function onTouchEnd() {
            draining = false;       // gesture ended — next swipe scrolls freely
            touchControlling = false;
            // lastProgress is intentionally kept so the next touchstart
            // resumes from wherever the finger stopped.
        }

        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd, { passive: true });

        // Re-arm interception if the user scrolls back to the top
        // (e.g. after using the back button or a nav anchor).
        window.addEventListener('scroll', () => {
            const y = window.scrollY || window.pageYOffset || 0;
            if (!intercepting && y <= stageStart + 20) {
                intercepting = true;
                lastProgress = 0;
                applyAnimationAtProgress(0);
            }
        }, { passive: true });
    }

    model.addEventListener("load", () => {
        model.pause();
        model.loop = false;

        const anims = model.availableAnimations || [];
        hasAnimation = anims.length > 0;

        if (!hasAnimation) {
            refreshBoundsSoon();
            markReady();
            return;
        }

        model.animationName = anims[0];
        duration = model.duration;
        model.currentTime = 0;
        applyGlossyCover();
        refreshBoundsSoon();

        requestAnimationFrame(() => {
            applyAnimationFromScroll();
            markReady();
            setupTouchAnimation();
        });
    });

    window.addEventListener("load", refreshBoundsSoon, { once: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", requestTick, { passive: true });

    // NOTE: no per-image load listeners and no body ResizeObserver.
    // The stage sits at the top of the page — nothing loads above it that
    // could shift stageStart. Observing document.body fired on every lazy
    // mosaic image load (dozens of unthrottled getBoundingClientRect calls)
    // and caused the model-viewer stutter on scroll-back. window "load"
    // (once) + debounced window "resize" are the only bounds updates needed.

    refreshBoundsSoon();
})();

/* ============================================================
   4. AUDIO PLAYER + WEB AUDIO ANALYSER
   Handles play/pause, scrubbing, time display.
   Runs a Web Audio analyser and writes frequency data into
   window.__audioReactive, which glyph-matrix reads each frame.
   Must run before the Glyph Matrix section below.
   ============================================================ */

(() => {
    const audio = document.getElementById("glyphAudio");
    const playBtn = document.getElementById("glyphPlayBtn");
    const playIcon = document.getElementById("glyphPlayIcon");
    const progress = document.getElementById("glyphProgress");
    const timeEl = document.getElementById("glyphTime");

    // Shared reactive object — read by the glyph matrix animation loop
    const audioReactive = window.__audioReactive || (window.__audioReactive = { level: 0, fast: 0, bass: 0, mids: 0, highs: 0 });

    let isScrubbing = false;

    function fmtTime(sec) {
        if (!isFinite(sec) || sec < 0) return "0:00";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${String(s).padStart(2, "0")}`;
    }

    function setIcon(isPlaying) {
        if (isPlaying) {
            playIcon.innerHTML = `<path d="M7.5 6.5h3v11h-3v-11zM13.5 6.5h3v11h-3v-11z" fill="currentColor"/>`;
            playBtn.setAttribute("aria-label", "Pause");
        } else {
            playIcon.innerHTML = `<path d="M9 7.5v9l8-4.5-8-4.5z" fill="currentColor"/>`;
            playBtn.setAttribute("aria-label", "Play");
        }
    }

    function syncUI() {
        const dur = audio.duration || 0;
        const cur = audio.currentTime || 0;
        timeEl.textContent = `${fmtTime(cur)} / ${fmtTime(dur)}`;
        if (!isScrubbing && dur > 0) {
            progress.value = String(Math.round((cur / dur) * 1000));
        }
    }

    // ---- Web Audio analyser ----
    let audioCtx = null;
    let analyser = null;
    let dataTime = null;
    let dataFreq = null;
    let sourceNode = null;
    let analyserRafId = null;

    function initAnalyser() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        dataTime = new Uint8Array(analyser.fftSize);
        dataFreq = new Uint8Array(analyser.frequencyBinCount);

        sourceNode = audioCtx.createMediaElementSource(audio);
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
    }

    function computeRMS() {
        if (!analyser || !dataTime) return 0;
        analyser.getByteTimeDomainData(dataTime);
        let sum = 0;
        for (let i = 0; i < dataTime.length; i++) {
            const v = (dataTime[i] - 128) / 128;
            sum += v * v;
        }
        return Math.sqrt(sum / dataTime.length);
    }

    function analyzeFrequencies() {
        if (!analyser || !dataFreq) return { bass: 0, mids: 0, highs: 0 };
        analyser.getByteFrequencyData(dataFreq);
        const bins = dataFreq.length;
        const bassEnd = Math.floor(bins * 0.1);
        const midsEnd = Math.floor(bins * 0.4);
        let bassSum = 0, midsSum = 0, highsSum = 0;
        for (let i = 0; i < bassEnd; i++) bassSum += dataFreq[i];
        for (let i = bassEnd; i < midsEnd; i++) midsSum += dataFreq[i];
        for (let i = midsEnd; i < bins; i++) highsSum += dataFreq[i];
        return {
            bass: (bassSum / bassEnd) / 255,
            mids: (midsSum / (midsEnd - bassEnd)) / 255,
            highs: (highsSum / (bins - midsEnd)) / 255
        };
    }

    function analyserTick() {
        analyserRafId = null;
        const rms = computeRMS();
        const freqs = analyzeFrequencies();

        audioReactive.level = audioReactive.level + (rms - audioReactive.level) * 0.04;
        audioReactive.fast = audioReactive.fast + (rms - audioReactive.fast) * 0.12;
        audioReactive.bass = (audioReactive.bass || 0) + (freqs.bass - (audioReactive.bass || 0)) * 0.08;
        audioReactive.mids = (audioReactive.mids || 0) + (freqs.mids - (audioReactive.mids || 0)) * 0.10;
        audioReactive.highs = (audioReactive.highs || 0) + (freqs.highs - (audioReactive.highs || 0)) * 0.15;

        if (!audio.paused && !audio.ended) {
            analyserRafId = requestAnimationFrame(analyserTick);
        }
    }

    function startAnalyserLoop() {
        if (analyserRafId) return;
        analyserRafId = requestAnimationFrame(analyserTick);
    }

    // ---- Play / Pause ----

    playBtn.addEventListener("click", async () => {
        try {
            initAnalyser();
            if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
            if (audio.paused) await audio.play();
            else audio.pause();
        } catch (e) {
            console.warn(e);
        }
    });

    audio.addEventListener("play", () => {
        setIcon(true);
        window.__glyphAudioActive = true;
        startAnalyserLoop();
        window.dispatchEvent(new Event("glyphAudioPlay"));
    });

    audio.addEventListener("pause", () => {
        setIcon(false);
        window.__glyphAudioActive = false;
        window.dispatchEvent(new Event("glyphAudioStop"));
    });

    audio.addEventListener("ended", () => {
        setIcon(false);
        window.__glyphAudioActive = false;
        window.dispatchEvent(new Event("glyphAudioStop"));
        syncUI();
    });

    audio.addEventListener("timeupdate", syncUI);
    audio.addEventListener("loadedmetadata", syncUI);

    progress.addEventListener("input", () => {
        isScrubbing = true;
        const dur = audio.duration || 0;
        if (dur > 0) {
            const t = (Number(progress.value) / 1000) * dur;
            timeEl.textContent = `${fmtTime(t)} / ${fmtTime(dur)}`;
        }
    });

    progress.addEventListener("change", () => {
        const dur = audio.duration || 0;
        if (dur > 0) audio.currentTime = (Number(progress.value) / 1000) * dur;
        isScrubbing = false;
    });

    // Auto-pause when the audio player scrolls out of view
    const audioStage = document.getElementById("glyphStage");
    if (audioStage) {
        const audioPauseObserver = new IntersectionObserver((entries) => {
            if (!entries[0].isIntersecting && !audio.paused) {
                audio.pause();
            }
        }, { threshold: 0 });
        audioPauseObserver.observe(audioStage);
    }

    setIcon(false);
    syncUI();
})();


/* ============================================================
   5. GLYPH MATRIX CANVAS
   Full-canvas animated glyph field. Static on load, reacts to
   audio via window.__audioReactive (written by section 4).
   Uses Perlin / fBm noise for organic hole shapes and density.
   Animation loop only runs while audio is playing.
   ============================================================ */

(() => {
    const canvas = document.getElementById("glyphCanvas");
    const stage = document.getElementById("glyphStage");

    // Canvas context is created lazily on first play — no GPU layer during scrolling
    let ctx = null;

    // Shared with audio player — must be initialised after section 4
    const audioReactive = window.__audioReactive || (window.__audioReactive = { level: 0, fast: 0, bass: 0, mids: 0, highs: 0 });

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

    const CELL = 20;
    const FONT_SCALE = 0.95;
    const UPDATE_PROB = 0.06;
    const MIN_SWAP_MS = 110;
    const MAX_SWAP_MS = 1900;

    const FILL_BASE = 0.56;
    const FILL_VARIATION = 0.30;
    const FILL_SCALE = 0.09;

    const HOLE_SCALE = 0.05;
    const HOLE_THRESHOLD = 0.62;
    const HOLE_EDGE = 0.20;
    const DRIFT_SPEED = 0.018;
    const MORPH_SPEED = 0.010;
    const HOLE_LERP = 0.030;
    const HOLE_UPDATE_PER_FRAME = 0.22;
    const ACCENT_PROB = 0.16;
    const ACCENT_ALPHA = 0.95;
    const ACCENT_DIM_ALPHA = 0.70;
    const HUES = [
        { h: 137, s: 100, l: 73 },
        { h: 318, s: 100, l: 77 }
    ];
    const HUE_JITTER = 10;
    const LIGHT_JITTER = 6;

    let updateProbNow = UPDATE_PROB;
    let accentProbNow = ACCENT_PROB;
    let driftNow = DRIFT_SPEED;
    let wakeProbNow = 0.0008;

    let cols = 0, rows = 0, dpr = 1;
    let glyphIdx, filled, nextSwapAt;
    let holeValue, holeMask;
    let styleKind, accentHue, accentLum, accentColor;

    // CSS values cached once on resize — never called inside the draw loop
    let cachedFg = "#bdbdbd";
    let cachedFgDim = "#7a7a7a";
    let cachedBg = "#000";
    let cachedFontStr = "";

    function refreshCSSCache() {
        const root = getComputedStyle(document.documentElement);
        cachedFg = root.getPropertyValue("--fg").trim() || "#bdbdbd";
        cachedFgDim = root.getPropertyValue("--fgDim").trim() || "#7a7a7a";
        cachedBg = root.getPropertyValue("--bg").trim() || "#000";
        const fontPx = Math.floor(CELL * FONT_SCALE);
        cachedFontStr = `${fontPx}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
    }

    function randInt(n) { return (Math.random() * n) | 0; }
    function rand(a, b) { return a + Math.random() * (b - a); }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function smoothstep(a, b, x) {
        const t = clamp((x - a) / (b - a), 0, 1);
        return t * t * (3 - 2 * t);
    }

    // Perlin noise — permutation table
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
    // 4 octaves for richer, finer noise detail
    function fbm(x, y) {
        let n = 0, amp = 0.55, freq = 1.0;
        for (let i = 0; i < 4; i++) {
            n += amp * perlin(x * freq, y * freq);
            amp *= 0.55; freq *= 2.02;
        }
        return n;
    }

    function pickStyle(i, accentProb = ACCENT_PROB) {
        if (Math.random() < accentProb) {
            styleKind[i] = 2;
            const base = HUES[randInt(HUES.length)];
            const hj = base.h + rand(-HUE_JITTER, HUE_JITTER);
            const lj = base.l + rand(-LIGHT_JITTER, LIGHT_JITTER);
            const h = (Math.round((hj % 360 + 360) % 360));
            const l = clamp(Math.round(lj), 30, 85);
            accentHue[i] = h;
            accentLum[i] = l;
            // Alpha and string built once here — no allocation in the render loop
            const a = (Math.random() < 0.15) ? ACCENT_DIM_ALPHA : ACCENT_ALPHA;
            accentColor[i] = `hsla(${h},95%,${l}%,${a})`;
            return;
        }
        styleKind[i] = (Math.random() < 0.28) ? 1 : 0;
    }

    let resizeTimer = null;
    function scheduleResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 120);
    }

    function resize() {
        if (!ctx) return; // ctx is null until first audio play (lazy init) — guard all callers
        dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const rect = stage.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));

        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        cols = Math.max(1, Math.floor(w / CELL));
        rows = Math.max(1, Math.floor(h / CELL));
        const N = cols * rows;

        glyphIdx = new Uint16Array(N);
        filled = new Uint8Array(N);
        nextSwapAt = new Float64Array(N);
        holeValue = new Float32Array(N);
        holeMask = new Uint8Array(N);
        styleKind = new Uint8Array(N);
        accentHue = new Uint16Array(N);
        accentLum = new Uint8Array(N);
        accentColor = new Array(N).fill("");

        refreshCSSCache();
        seedGrid();
        seedHoles();
        drawStatic();
    }

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
            }
        }
    }

    function seedHoles() {
        const t = performance.now() * 0.001;
        const driftX = t * DRIFT_SPEED;
        const driftY = t * (DRIFT_SPEED * 0.77);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const i = r * cols + c;
                const n = fbm((c * HOLE_SCALE) + driftX, (r * HOLE_SCALE) + driftY);
                holeValue[i] = n;
                holeMask[i] = holeFromValue(n);
            }
        }
    }

    function holeFromValue(n) {
        const s = smoothstep(HOLE_THRESHOLD - HOLE_EDGE, HOLE_THRESHOLD + HOLE_EDGE, n);
        return (s > 0.58) ? 1 : 0;
    }

    function glyphChar(i) { return GLYPHS[glyphIdx[i] % GLYPHS.length]; }

    function cellColor(i) {
        if (styleKind[i] === 1) return cachedFgDim;
        if (styleKind[i] === 2) return accentColor[i];
        return cachedFg;
    }

    // Font/align set once per frame in tick(), not per cell
    function drawCell(i) {
        const c = i % cols;
        const r = (i / cols) | 0;
        const x = c * CELL, y = r * CELL;
        ctx.clearRect(x, y, CELL, CELL);
        if (holeMask[i] || !filled[i]) return;
        ctx.fillStyle = cellColor(i);
        ctx.fillText(glyphChar(i), x + CELL / 2, y + CELL / 2 + 0.5);
    }

    // Full grid render — used on load and when audio stops
    function drawStatic() {
        if (!ctx) return;
        ctx.fillStyle = cachedBg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = cachedFontStr;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let i = 0; i < cols * rows; i++) drawCell(i);
    }

    // ---- Animation loop — only active while audio plays ----

    let rafId = null;
    let lastFrame = 0;
    const FRAME_INTERVAL = 1000 / 30;

    function startLoop() {
        if (!glyphInitDone) return; // canvas not ready yet — initCanvas handles first play
        if (rafId) return;
        canvas.style.opacity = '1';
        lastFrame = 0;
        rafId = requestAnimationFrame(tick);
    }

    function stopLoop() {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        audioReactive.level = 0;
        audioReactive.fast = 0;
        audioReactive.bass = 0;
        audioReactive.mids = 0;
        audioReactive.highs = 0;
        canvas.style.opacity = '0';
    }

    window.addEventListener("glyphAudioPlay", startLoop);
    window.addEventListener("glyphAudioStop", stopLoop);

    let holeCursor = 0;
    function updateHolesSmooth(now) {
        const N = cols * rows;
        const voiceEnergy = clamp(audioReactive.mids * 20.0, 0, 1);
        const isSpeaking = voiceEnergy > 0.15 || audioReactive.level > 0.12;
        const speechIntensity = isSpeaking ? Math.max(voiceEnergy, audioReactive.level) : 0;
        const updateRate = isSpeaking ? HOLE_UPDATE_PER_FRAME * 2.0 : HOLE_UPDATE_PER_FRAME * 0.3;
        const count = Math.max(1, Math.floor(N * updateRate));

        const t = now * 0.001;
        const emphasis = clamp(audioReactive.fast * 25.0, 0, 1);
        const driftX = t * driftNow;
        const driftY = t * (driftNow * 0.77);
        const morphSpeedMultiplier = isSpeaking ? (1.0 + 35.0 * speechIntensity) : 0.05;
        const morphSpeed = MORPH_SPEED * morphSpeedMultiplier;
        const morphX = t * morphSpeed;
        const morphY = t * (morphSpeed * 1.13);

        for (let k = 0; k < count; k++) {
            const i = holeCursor;
            holeCursor = (holeCursor + 1) % N;
            const c = i % cols;
            const r = (i / cols) | 0;

            const n1 = fbm((c * HOLE_SCALE) + driftX, (r * HOLE_SCALE) + driftY);
            const n2 = fbm((c * HOLE_SCALE * 1.9) + 400 + morphX, (r * HOLE_SCALE * 1.9) - 200 + morphY);
            const n3 = fbm((c * HOLE_SCALE * 0.5) + morphX * 0.3, (r * HOLE_SCALE * 0.5) + morphY * 0.3);

            const blend1 = isSpeaking ? 0.60 - (0.40 * speechIntensity) : 0.70;
            const blend2 = isSpeaking ? 0.30 + (0.30 * speechIntensity) : 0.25;
            const blend3 = isSpeaking ? 0.10 + (0.25 * speechIntensity) : 0.05;
            const waveShift = isSpeaking ? Math.sin(t * 2.0 + emphasis * 10.0) * 0.15 * speechIntensity : 0;

            const target = clamp(
                (blend1 + waveShift) * n1 +
                (blend2 - waveShift * 0.5) * n2 +
                (blend3 + waveShift * 0.5) * n3,
                0, 1
            );
            const lerpSpeed = isSpeaking ? HOLE_LERP * (1.0 + 3.0 * speechIntensity) : HOLE_LERP * 0.2;
            const newVal = holeValue[i] + (target - holeValue[i]) * lerpSpeed;
            holeValue[i] = newVal;

            const prevMask = holeMask[i];
            const newMask = holeFromValue(newVal);
            if (newMask !== prevMask) { holeMask[i] = newMask; drawCell(i); }
        }
    }

    function tick(now) {
        if (now - lastFrame < FRAME_INTERVAL) {
            rafId = requestAnimationFrame(tick);
            return;
        }
        lastFrame = now;

        const a = clamp(audioReactive.level * 15.0, 0, 1);
        const mids = clamp(audioReactive.mids * 20.0, 0, 1);
        const isSpeaking = mids > 0.15 || a > 0.12;
        const speechIntensity = isSpeaking ? Math.max(mids, a) : 0;

        updateProbNow = isSpeaking ? UPDATE_PROB * (2.0 + 3.0 * speechIntensity) : UPDATE_PROB * 0.15;
        accentProbNow = isSpeaking ? clamp(0.5 + 1.00 * mids, 0, 0.80) : 0.04;
        driftNow = isSpeaking ? DRIFT_SPEED * (6.0 + 16.0 * speechIntensity) : DRIFT_SPEED * 0.8;
        wakeProbNow = isSpeaking ? 0.005 + 0.025 * speechIntensity : 0.0002;

        // Set canvas state once per frame
        ctx.font = cachedFontStr;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        updateHolesSmooth(now);

        const N = cols * rows;
        for (let i = 0; i < N; i++) {
            if (holeMask[i]) continue;
            if (Math.random() < wakeProbNow) {
                filled[i] = filled[i] ? 0 : 1;
                if (filled[i]) pickStyle(i, accentProbNow);
                drawCell(i);
                continue;
            }
            if (Math.random() < 0.0008) {
                filled[i] = Math.random() < 0.56 ? 1 : 0;
                pickStyle(i, accentProbNow);
                drawCell(i);
                continue;
            }
            if (now >= nextSwapAt[i]) {
                if (filled[i] && Math.random() < updateProbNow) {
                    glyphIdx[i] = randInt(GLYPHS.length);
                    pickStyle(i, accentProbNow);
                    drawCell(i);
                }
                nextSwapAt[i] = now + rand(MIN_SWAP_MS, MAX_SWAP_MS);
            }
        }

        rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("resize", scheduleResize, { passive: true });
    if (window.ResizeObserver) { new ResizeObserver(scheduleResize).observe(stage); }

    // Canvas is initialised lazily on first play press — zero GPU compositor
    // overhead during scrolling. getContext() is deferred until here.
    let glyphInitDone = false;
    function initCanvas() {
        if (glyphInitDone) return;
        glyphInitDone = true;
        ctx = canvas.getContext("2d", { alpha: false });
        resize();
        startLoop(); // kick off the loop immediately after first init
    }

    window.addEventListener("glyphAudioPlay", initCanvas, { once: true });
})();


/* ============================================================
   6. LIGHTBOX
   Click any mosaic image to open full-res in an overlay.
   Close by clicking the overlay, the X button, or Escape.
   ============================================================ */

(function () {
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = lightbox.querySelector("img");
    const closeBtn = lightbox.querySelector(".lightboxClose");

    document.querySelectorAll("#plates .mosaic img").forEach(img => {
        img.addEventListener("click", () => {
            lightboxImg.src = img.dataset.full || img.src;
            lightbox.classList.add("active");
        });
    });

    lightbox.addEventListener("click", () => {
        lightbox.classList.remove("active");
        lightboxImg.src = "";
    });

    closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        lightbox.classList.remove("active");
        lightboxImg.src = "";
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            lightbox.classList.remove("active");
            lightboxImg.src = "";
        }
    });
})();

/* ============================================================
   8. NAV TRANSITION
   Runs immediately on script execution (no defer wrapper
   needed — script tag is defer in HTML so DOM is ready).
   - Adds nav-ready after two rAFs for a clean first paint
   - Adds intro-ui-visible after 2000ms (waitlist compatibility)
   - Single click listener handles exit animation for all
     internal link navigation
   ============================================================ */

// Reveal after first paint: nav slides in, page veil fades out
requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.add('nav-ready');
    document.body.classList.add('page-ready');
}));

// Nav enter — delayed class for waitlist-style glyph reveal compatibility
setTimeout(function () {
    document.body.classList.add('intro-ui-visible');
}, 2000);

// Nav exit — slide up on any internal link click
document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || link.target === '_blank') return;
    if (link.origin && link.origin !== location.origin) return;
    e.preventDefault();
    document.body.classList.add('is-exiting');
    setTimeout(function () { window.location.href = href; }, 420);
});

/* ============================================================
   MOBILE NAV PANEL
   Toggle full-screen menu on narrow viewports (≤ 900px).
   ============================================================ */

(function () {
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
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeMenu();
    });
})();

/* ============================================================
   8. IMAGE COMPARISON SLIDER
   Drag the handle up/down to reveal before/after images.
   Supports mouse, touch, and keyboard (arrow keys).
   ============================================================ */

(function () {
    function initCompare(stage) {
        const overlay = stage.querySelector('.compareImgOverlay');
        const handle = stage.querySelector('.compareHandle');
        if (!overlay || !handle) return;

        const isH = stage.classList.contains('compareStage--h');

        let pct = 50;
        let dragging = false;

        function setPosition(clientX, clientY) {
            const rect = stage.getBoundingClientRect();
            let raw;
            if (isH) {
                raw = ((clientX - rect.left) / rect.width) * 100;
            } else {
                raw = ((clientY - rect.top) / rect.height) * 100;
            }
            pct = Math.min(100, Math.max(0, raw));
            if (isH) {
                // clip-path: inset(top right bottom left)
                // right = (100 - pct)% hides the right portion
                overlay.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
                handle.style.left = pct + '%';
            } else {
                overlay.style.height = pct + '%';
                handle.style.top = pct + '%';
            }
            handle.setAttribute('aria-valuenow', Math.round(pct));
        }

        // Initialise at 50%
        if (isH) {
            overlay.style.clipPath = 'inset(0 50% 0 0)';
            handle.style.left = '50%';
        } else {
            overlay.style.height = '50%';
            handle.style.top = '50%';
        }

        // Mouse
        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            dragging = true;
        });
        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            setPosition(e.clientX, e.clientY);
        });
        document.addEventListener('mouseup', function () {
            dragging = false;
        });

        // Touch — start drag anywhere on the stage (not just the handle) so
        // the full image area is a grab target. CSS touch-action:none on the
        // stage blocks page scroll for the duration of the touch sequence.
        stage.addEventListener('touchstart', function (e) {
            dragging = true;
            setPosition(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        document.addEventListener('touchmove', function (e) {
            if (!dragging) return;
            setPosition(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        document.addEventListener('touchend', function () {
            dragging = false;
        });

        // Click anywhere on stage to jump handle
        stage.addEventListener('click', function (e) {
            if (e.target === handle || handle.contains(e.target)) return;
            setPosition(e.clientX, e.clientY);
        });

        // Keyboard — arrows
        handle.addEventListener('keydown', function (e) {
            const step = e.shiftKey ? 10 : 2;
            if (isH) {
                if (e.key === 'ArrowLeft') { pct = Math.max(0, pct - step); }
                else if (e.key === 'ArrowRight') { pct = Math.min(100, pct + step); }
                else return;
                overlay.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
                handle.style.left = pct + '%';
            } else {
                if (e.key === 'ArrowUp') { pct = Math.max(0, pct - step); }
                else if (e.key === 'ArrowDown') { pct = Math.min(100, pct + step); }
                else return;
                overlay.style.height = pct + '%';
                handle.style.top = pct + '%';
            }
            handle.setAttribute('aria-valuenow', Math.round(pct));
        });
    }

    document.querySelectorAll('.compareStage').forEach(initCompare);
})();

/* ============================================================
   9. BFCACHE FLASH FIX
   When navigating back via bfcache the page is restored in its
   last-seen state (hint visible, navPanel open, is-exiting on
   body). The veil is already opaque (page-ready was removed when
   we left), so we get a clean black screen. Reset all state then
   re-add page-ready to fade the veil out normally.
   ============================================================ */

window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;

    // Snap the veil to black instantly (disable transition so there is no
    // 320ms window where stale page state bleeds through the fading veil)
    var veil = document.getElementById('pageVeil');
    if (veil) veil.style.transition = 'none';

    // Remove classes so the default #pageVeil { opacity:1 } rule applies
    document.body.classList.remove('page-ready');
    document.body.classList.remove('is-exiting');

    // Reset the swipe hint
    var hint = document.querySelector('.hint');
    if (hint) hint.classList.remove('show');

    // Close the nav panel (it may have been left open)
    var panel = document.getElementById('navPanel');
    if (panel) {
        panel.style.transition = 'none';
        panel.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        var toggle = document.getElementById('menuToggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }

    // Re-enable transitions, then trigger the fade-in
    requestAnimationFrame(function () {
        if (veil) veil.style.transition = '';
        if (panel) panel.style.transition = '';
        requestAnimationFrame(function () {
            document.body.classList.add('page-ready');
            if (hint) setTimeout(function () { hint.classList.add('show'); }, 700);
        });
    });
});