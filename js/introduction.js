/**
 * introduction.js
 * Merged from:
 *   - book5-model3d-b-snap-2overlay5-end.js  (3D scene, clipping reveal)
 *   - book5-model3d-d-snap-2overlay5-end-noclip.js  (3D scene, wireframe only)
 *   - reveal-and-overlay_multi3d.js  (reveal observer + FBM intro wipe)
 *   - topnav.js  (topnav init — simplified: only hides on load; reveal does the show)
 *   - scroll-controller.js  (section sequencing, keyboard/wheel, progress nav)
 *
 * The two model scripts shared ~85% identical code. They are now one factory
 * function `createModel3DScene(cfg)` called twice with different configs.
 *
 * window.modelB_* / window.modelD_* APIs are exposed so scroll-controller
 * logic can query and drive each scene independently.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";


// ─────────────────────────────────────────────────────────────────────────────
//  SHARED 3D MODEL FACTORY
//  cfg = {
//    suffix        string    e.g. "-b"
//    modelUrl      string    path to .glb / .gltf
//    activePoints  int       1–4 camera stops
//    clipOnMove    "last"|int  which move animates the clipping plane
//    useClipping   bool      true = load two meshes + clipping reveal
//    useDraco      bool      true = attach DracoLoader
//    windowPrefix  string    e.g. "modelB" → window.modelB_stepBy(dir)
//    camPoints     fn(modelSize) → [{pos, look}, ...]  camera path
//  }
// ─────────────────────────────────────────────────────────────────────────────

function createModel3DScene(cfg) {

    const SUFFIX = cfg.suffix;
    const WIN = cfg.windowPrefix;  // "modelB" or "modelD"
    const STEP_TWEEN_MS = 1300;

    const section = document.getElementById(`model3d${SUFFIX}`);
    const sticky = document.getElementById(`model3dSticky${SUFFIX}`);
    const canvas = document.getElementById(`model3dCanvas${SUFFIX}`);
    const hint = document.getElementById(`model3dHint${SUFFIX}`);

    if (!section || !sticky || !canvas) return;

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.up.set(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.localClippingEnabled = !!cfg.useClipping;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    const loader = new GLTFLoader();
    if (cfg.useDraco) {
        const draco = new DRACOLoader();
        draco.setDecoderPath("https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/");
        loader.setDRACOLoader(draco);
    }

    // ── Clipping planes (model-b only) ─────────────────────────────────────────
    const bluePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const redPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

    let wireModel = null;
    let texModel = null;
    let height = 4;
    const modelSize = new THREE.Vector3();

    // ── Camera state ───────────────────────────────────────────────────────────
    const CAM_UP = new THREE.Vector3(0, 1, 0);
    let CAM_POINTS = null;
    let CAM_FRAMES = null;

    let ready = false;
    let currentIndex = 0;
    let currentClip = 0;
    let isAnimating = false;
    let hasFinished = false;

    let statsParts = [];

    // ── Math helpers ──────────────────────────────────────────────────────────
    function clamp01(x) { return Math.max(0, Math.min(1, x)); }
    function clampInt(x, lo, hi) {
        const n = Number.isFinite(x) ? Math.floor(x) : lo;
        return Math.max(lo, Math.min(hi, n));
    }
    function easeInOutCubic(t) {
        const x = clamp01(t);
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }
    function quatFromLookAt(pos, look) {
        const m = new THREE.Matrix4();
        m.lookAt(pos, look, CAM_UP);
        return new THREE.Quaternion().setFromRotationMatrix(m);
    }

    // ── Camera path ────────────────────────────────────────────────────────────
    function pickActivePoints(all) {
        const n = clampInt(cfg.activePoints ?? 4, 2, 4);
        return all.slice(0, n);
    }

    function cacheCameraPath() {
        const all = cfg.camPoints(modelSize);
        CAM_POINTS = pickActivePoints(all);
        CAM_FRAMES = CAM_POINTS.map(pt => ({
            pos: pt.pos.clone(),
            quat: quatFromLookAt(pt.pos, pt.look)
        }));
    }

    function applyCameraFrame(pos, quat) {
        camera.position.copy(pos);
        camera.quaternion.copy(quat);
        camera.updateMatrixWorld();
    }

    // ── Clipping helpers ───────────────────────────────────────────────────────
    function getClipMoveIndex(nPoints) {
        if (cfg.clipOnMove === "last") return Math.max(0, nPoints - 2);
        return clampInt(cfg.clipOnMove, 0, Math.max(0, nPoints - 2));
    }

    function targetClipForIndex(idx) {
        if (!CAM_FRAMES) return 0;
        return idx >= getClipMoveIndex(CAM_FRAMES.length) + 1 ? 1 : 0;
    }

    function applyClippingProgress(p) {
        currentClip = clamp01(p);
        if (cfg.useClipping) {
            bluePlane.constant = height / 2 - currentClip * height;
            redPlane.constant = -height / 2 + currentClip * height;
        }
    }

    // ── Materials ──────────────────────────────────────────────────────────────
    function applyWireframe(model) {
        model.traverse(child => {
            if (!child.isMesh) return;
            child.material = new THREE.MeshBasicMaterial({
                map: child.material?.map ?? null,
                wireframe: true,
                color: new THREE.Color(4, 4, 4)
            });
            child.material.clipShadows = true;
        });
    }

    function applyBasicTextured(model) {
        model.traverse(child => {
            if (!child.isMesh) return;
            child.material = new THREE.MeshBasicMaterial({
                map: child.material?.map ?? null
            });
            child.material.clipShadows = true;
        });
    }

    function applyClipping(model, plane) {
        model.traverse(child => {
            if (!child.isMesh) return;
            child.material.clippingPlanes = [plane];
            child.material.clipShadows = true;
            child.material.needsUpdate = true;
        });
    }

    // Scratch objects reused across centerAndMeasure calls — avoids per-call GC
    const _cmBox = new THREE.Box3();
    const _cmCenter = new THREE.Vector3();
    const _cmSize = new THREE.Vector3();

    function centerAndMeasure(model, setSize = true) {
        _cmBox.setFromObject(model);
        _cmBox.getCenter(_cmCenter);
        _cmBox.getSize(_cmSize);
        model.position.sub(_cmCenter);
        if (setSize) modelSize.copy(_cmSize);
        return _cmSize.y;
    }

    // ── Render ────────────────────────────────────────────────────────────────
    function isVisible() { return section.classList.contains("is-active"); }
    function render() {
        if (!isVisible()) return;
        renderer.render(scene, camera);
    }

    // ── Resize ────────────────────────────────────────────────────────────────
    function resize() {
        const vp = canvas.closest(".model3dViewport") || sticky;
        const rect = vp.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        render();
    }

    if (window.ResizeObserver) new ResizeObserver(resize).observe(sticky);
    window.addEventListener("resize", resize, { passive: true });



    // ── Stats overlay ─────────────────────────────────────────────────────────
    function initStatsParts() {
        const overlay = section.querySelector(".model3dStatsOverlay");
        if (!overlay) return;
        overlay.querySelectorAll(".revealManual").forEach(el => {
            statsParts.push({
                el,
                showAt: parseInt(el.dataset.showStep ?? "1", 10),
                hideAt: parseInt(el.dataset.hideStep ?? String(cfg.activePoints ?? 4), 10)
            });
        });
    }

    function updateStatsParts(idx) {
        statsParts.forEach(({ el, showAt, hideAt }) => {
            el.classList.toggle("is-visible", idx >= showAt && idx < hideAt);
        });
    }

    // ── Camera animation ──────────────────────────────────────────────────────
    function animateToIndex(nextIndex) {
        if (!CAM_FRAMES || nextIndex === currentIndex) return;
        isAnimating = true;

        const startPos = camera.position.clone();
        const startQuat = camera.quaternion.clone();
        const endPos = CAM_FRAMES[nextIndex].pos.clone();
        const endQuat = CAM_FRAMES[nextIndex].quat.clone();

        const clipMoveIndex = getClipMoveIndex(CAM_FRAMES.length);
        const forward = nextIndex > currentIndex;
        const startClip = currentClip;
        const endClip = targetClipForIndex(nextIndex);
        const animateClip = cfg.useClipping && (
            (forward && currentIndex === clipMoveIndex && nextIndex === clipMoveIndex + 1) ||
            (!forward && nextIndex === clipMoveIndex && currentIndex === clipMoveIndex + 1)
        );

        updateStatsParts(nextIndex);

        const t0 = performance.now();
        const step = now => {
            const t = clamp01((now - t0) / STEP_TWEEN_MS);
            const e = easeInOutCubic(t);

            camera.position.copy(startPos).lerp(endPos, e);
            camera.quaternion.copy(startQuat).slerp(endQuat, e);
            camera.updateMatrixWorld();

            if (cfg.useClipping) {
                applyClippingProgress(animateClip
                    ? startClip + (endClip - startClip) * e
                    : endClip);
            }

            render();

            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                currentIndex = nextIndex;
                isAnimating = false;
                hint?.classList.add("hide");
                if (currentIndex === CAM_FRAMES.length - 1) hasFinished = true;
            }
        };
        requestAnimationFrame(step);
    }

    function stepBy(dir) {
        if (!CAM_FRAMES) return false;
        const next = clampInt(currentIndex + dir, 0, CAM_FRAMES.length - 1);
        if (next === currentIndex) return false;
        if (dir < 0 && hasFinished) hasFinished = false;
        animateToIndex(next);
        return true;
    }

    // Instant cut to a substep (used by progress nav via flashAndJump)
    function jumpTo(subStep) {
        if (!CAM_FRAMES) return;
        const idx = clampInt(subStep, 0, CAM_FRAMES.length - 1);
        currentIndex = idx;
        hasFinished = idx === CAM_FRAMES.length - 1;
        applyCameraFrame(CAM_FRAMES[idx].pos, CAM_FRAMES[idx].quat);
        if (cfg.useClipping) applyClippingProgress(targetClipForIndex(idx));
        updateStatsParts(idx);
        render();
    }

    // ── Wheel handling ────────────────────────────────────────────────────────
    // Wheel is owned entirely by the scroll-controller in the merged file.
    // hasFinished / isAnimating are still used by stepBy() via the window API.

    // ── Expose API for scroll-controller ──────────────────────────────────────
    window[`${WIN}_stepBy`] = dir => stepBy(dir);
    window[`${WIN}_jumpTo`] = sub => jumpTo(sub);
    window[`${WIN}_isAnimating`] = () => isAnimating;
    window[`${WIN}_isFinished`] = () => hasFinished;
    window[`${WIN}_isAtStart`] = () => currentIndex === 0;

    // ── Shared on-ready callback ───────────────────────────────────────────────
    function onReady() {
        ready = true;
        cacheCameraPath();
        initStatsParts();
        updateStatsParts(0);
        currentIndex = 0;
        applyCameraFrame(CAM_FRAMES[0].pos, CAM_FRAMES[0].quat);
        if (cfg.useClipping) applyClippingProgress(0);
        render();
        requestAnimationFrame(render);
        requestAnimationFrame(render);
        hint?.classList.add("show");
    }

    // ── Load models ───────────────────────────────────────────────────────────
    if (cfg.useClipping) {
        // Load the GLB once; clone the parsed scene for the second mesh
        // so the file is fetched and decoded only once.
        loader.load(cfg.modelUrl, gltf => {
            wireModel = gltf.scene;
            texModel = wireModel.clone();

            height = centerAndMeasure(wireModel, true);
            applyWireframe(wireModel);
            bluePlane.constant = height / 2;
            applyClipping(wireModel, bluePlane);
            scene.add(wireModel);

            centerAndMeasure(texModel, false);
            applyBasicTextured(texModel);
            redPlane.constant = -(height / 2);
            applyClipping(texModel, redPlane);
            scene.add(texModel);

            resize();
            onReady();
        });

    } else {
        // Single wireframe load
        loader.load(cfg.modelUrl, gltf => {
            wireModel = gltf.scene;
            height = centerAndMeasure(wireModel, true);
            applyWireframe(wireModel);
            scene.add(wireModel);
            resize();
            onReady();
        });
    }

}


// ─────────────────────────────────────────────────────────────────────────────
//  MODEL B — wireframe + textured with clipping plane reveal (Draco compressed)
// ─────────────────────────────────────────────────────────────────────────────

createModel3DScene({
    suffix: "-b",
    modelUrl: "3d/intro-golden.glb",
    activePoints: 4,
    useClipping: true,
    useDraco: true,
    clipOnMove: "last",
    windowPrefix: "modelB",
    camPoints: s => [
        {
            pos: new THREE.Vector3(-0.20 * s.x, 0.02 * s.y, 0.06 * s.z),
            look: new THREE.Vector3(0.00 * s.x, 0.30 * s.y, -0.40 * s.z)
        },
        {
            pos: new THREE.Vector3(0.30 * s.x, 0.10 * s.y, 0.06 * s.z),
            look: new THREE.Vector3(0.30 * s.x, 0.30 * s.y, -0.40 * s.z)
        },
        {
            pos: new THREE.Vector3(0.50 * s.x, 0.10 * s.y, 0.15 * s.z),
            look: new THREE.Vector3(0.40 * s.x, 0.10 * s.y, 0.00 * s.z)
        },
        {
            pos: new THREE.Vector3(0.00 * s.x, 0.02 * s.y, 3.50 * s.z),
            look: new THREE.Vector3(0.00 * s.x, 0.00 * s.y, 0.00 * s.z)
        },
    ]
});


// ─────────────────────────────────────────────────────────────────────────────
//  MODEL D — wireframe only, no clipping
// ─────────────────────────────────────────────────────────────────────────────

createModel3DScene({
    suffix: "-d",
    modelUrl: "3d/intro-palace.glb",
    activePoints: 4,
    useClipping: false,
    useDraco: true,
    windowPrefix: "modelD",
    camPoints: s => [
        {
            pos: new THREE.Vector3(0.033 * s.x, -0.66 * s.y, 0.06 * s.z),
            look: new THREE.Vector3(0.033 * s.x, 0.30 * s.y, 0.06 * s.z)
        },
        {
            pos: new THREE.Vector3(0.033 * s.x, -0.36 * s.y, 0.58 * s.z),
            look: new THREE.Vector3(0.033 * s.x, 0.50 * s.y, -0.26 * s.z)
        },
        {
            pos: new THREE.Vector3(0.35 * s.x, -0.30 * s.y, 0.25 * s.z),
            look: new THREE.Vector3(0.10 * s.x, 0.10 * s.y, 0.00 * s.z)
        },
        {
            pos: new THREE.Vector3(0.033 * s.x, 0.06 * s.y, 0.06 * s.z),
            look: new THREE.Vector3(0.033 * s.x, 0.30 * s.y, -0.36 * s.z)
        },
    ]
});


// ─────────────────────────────────────────────────────────────────────────────
//  REVEAL OBSERVER + COPYRIGHT YEAR
//  (from reveal-and-overlay_multi3d.js)
//  classifyPlate removed — no #plates in introduction.html
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) e.target.classList.add("is-visible");

            if (e.target.matches?.('section[id^="model3d"]')) {
                const ov = e.target.querySelector(".model3dOverlay");
                if (ov) ov.classList.toggle("is-hidden", e.isIntersecting);
            }
        });
    }, { threshold: 0.04 });

    document.querySelectorAll(".reveal").forEach(el => io.observe(el));

    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});


// ─────────────────────────────────────────────────────────────────────────────
//  FBM / PERLIN INTRO WIPE
//  (from reveal-and-overlay_multi3d.js — IIFE preserved as-is)
// ─────────────────────────────────────────────────────────────────────────────

(function () {

    // topnav starts with is-visible in HTML, but the CSS hides it via
    // body:not(.intro-ui-visible). We also strip the class here defensively
    // so the 3500ms revealUI() call is the sole moment it reappears.
    const topnav = document.getElementById("topnav");
    if (topnav) topnav.classList.remove("is-visible");

    const canvas = document.createElement("canvas");
    canvas.id = "introPerlinCanvas";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let W, H, cols, rows, noiseField, imageData;
    const CELL = 8;

    // Permutation table
    const PERM = new Uint8Array(512);
    const P = new Uint8Array(256);
    for (let i = 0; i < 256; i++) P[i] = i;
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [P[i], P[j]] = [P[j], P[i]];
    }
    for (let i = 0; i < 512; i++) PERM[i] = P[i & 255];

    const GRADS = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + t * (b - a); }
    function grad(h, x, y) { const g = GRADS[h & 7]; return g[0] * x + g[1] * y; }

    function perlin(x, y) {
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x), yf = y - Math.floor(y);
        const u = fade(xf), v = fade(yf);
        const aa = PERM[PERM[X] + Y], ab = PERM[PERM[X] + Y + 1];
        const ba = PERM[PERM[X + 1] + Y], bb = PERM[PERM[X + 1] + Y + 1];
        return lerp(
            lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
            lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
            v
        );
    }

    function fbm(x, y) {
        let val = 0, amp = 0.5, freq = 1.0, max = 0;
        for (let i = 0; i < 5; i++) {
            val += perlin(x * freq, y * freq) * amp;
            max += amp; amp *= 0.5; freq *= 2.0;
        }
        return (val / max) * 0.5 + 0.5;
    }

    function buildNoiseField() {
        const SCALE = 2.5;
        noiseField = new Float32Array(cols * rows);
        for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++)
                noiseField[r * cols + c] = fbm((c / cols) * SCALE, (r / rows) * SCALE);
    }

    function resize() {
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = W; canvas.height = H;
        cols = Math.ceil(W / CELL); rows = Math.ceil(H / CELL);
        buildNoiseField();
        imageData = ctx.createImageData(W, H);
    }

    resize();
    window.addEventListener("resize", resize);

    const UI_REVEAL_DELAY = 3500;
    const HINT_EXTRA_DELAY = 2000;
    const REVEAL_DURATION = 5000;
    const FADE_OUT_DURATION = 200;

    setTimeout(revealUI, UI_REVEAL_DELAY);

    let startTime = null, done = false;

    function renderFrame(now) {
        if (!startTime) startTime = now;
        const t = Math.min((now - startTime) / REVEAL_DURATION, 1);
        const progress = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const SOFTBAND = 0.08;
        const lo = progress - SOFTBAND, hi = progress + SOFTBAND;
        const data = imageData.data;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const n = noiseField[r * cols + c];
                // Fully transparent — buffer is pre-zeroed each frame, skip write
                if (n <= lo) continue;

                let alpha;
                if (n >= hi) {
                    alpha = 255;
                } else {
                    const f = (n - lo) / (hi - lo);
                    alpha = Math.round(f * f * (3 - 2 * f) * 255);
                }
                const x0 = c * CELL, y0 = r * CELL;
                const x1 = Math.min(x0 + CELL, W), y1 = Math.min(y0 + CELL, H);
                for (let y = y0; y < y1; y++)
                    for (let x = x0; x < x1; x++) {
                        const idx = (y * W + x) * 4;
                        data[idx] = data[idx + 1] = data[idx + 2] = 0;
                        data[idx + 3] = alpha;
                    }
            }
        }
        ctx.putImageData(imageData, 0, 0);
        // Zero buffer so transparent-skipped cells are clean next frame
        imageData.data.fill(0);

        if (t < 1) {
            requestAnimationFrame(renderFrame);
        } else if (!done) {
            done = true;
            canvas.style.transition = `opacity ${FADE_OUT_DURATION}ms ease`;
            canvas.style.opacity = "0";
            setTimeout(() => canvas.remove(), FADE_OUT_DURATION);
        }
    }

    requestAnimationFrame(renderFrame);

    function revealUI() {
        document.body.classList.add("intro-ui-visible");
        const nav = document.getElementById("topnav");
        if (nav) nav.classList.add("is-visible");
        const capB = document.getElementById("captionB");
        if (capB) capB.classList.add("is-visible");
        setTimeout(() => document.body.classList.add("hint-unlocked"), HINT_EXTRA_DELAY);
    }

})();


// ─────────────────────────────────────────────────────────────────────────────
//  SCROLL CONTROLLER
//  (from scroll-controller.js — logic identical, topnav.js removed entirely
//   since its only job was: hide-on-load (done above) and listen to scroll
//   (not needed on this fixed-section page))
// ─────────────────────────────────────────────────────────────────────────────

let globalStep = 0;
let globalSubStep = 0;
let wheelConsumed = false;

// Delegate to the authoritative window.* versions set by introduction.html's
// inline <script>; fall back to a DOM query if they haven't run yet.
function hintIsOpen() {
    return typeof window.hintIsOpen === "function"
        ? window.hintIsOpen()
        : !!document.querySelector('[id^="model3dHint-"].show');
}
function closeAllHints() {
    if (typeof window.closeAllHints === "function") window.closeAllHints();
    else document.querySelectorAll('[id^="model3dHint-"].show').forEach(h => {
        h.classList.remove("show"); h.classList.add("hide");
    });
}

function activateSection(step, subStep = 0) {
    document.querySelectorAll(".scrollSection").forEach((s, i) => {
        s.classList.toggle("is-active", i === step);
    });

    globalSubStep = subStep;
    updateProgressNav(step, subStep);
    updateCaptions(step);
}

function globalSequenceIndex(step, subStep) {
    if (step === 0) return subStep;       // 0-3
    if (step === 1) return 4;             // 4
    if (step === 2) return 5 + subStep;   // 5-8
    return 0;
}

function updateProgressNav(step, subStep) {
    const curIdx = globalSequenceIndex(step, subStep);
    progressDots.forEach(({ el, step: s, sub: ss }) => {
        const elIdx = globalSequenceIndex(s, ss);
        el.classList.toggle("is-active", elIdx === curIdx);
        el.classList.toggle("is-visited", elIdx < curIdx);
    });
}

function updateCaptions(step) {
    document.getElementById("captionB")?.classList.toggle("is-visible", step === 0);
    document.getElementById("captionD")?.classList.toggle("is-visible", step === 2);
}

function flashAndJump(overlayId, jumpFn) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) { jumpFn(); return; }
    overlay.style.transition = "none";
    overlay.classList.remove("is-hidden");
    requestAnimationFrame(() => {
        jumpFn();
        requestAnimationFrame(() => {
            overlay.style.transition = "";
            overlay.classList.add("is-hidden");
        });
    });
}

// Progress dot clicks — cache dataset integers once at init
const progressDots = Array.from(document.querySelectorAll(".progressDot")).map(el => ({
    el,
    step: parseInt(el.dataset.step, 10),
    sub: parseInt(el.dataset.substep, 10),
}));

progressDots.forEach(({ el, step: targetStep, sub: targetSub }) => {
    el.addEventListener("click", () => {
        if (wheelConsumed) return;
        wheelConsumed = true;
        globalStep = targetStep;
        globalSubStep = targetSub;
        activateSection(targetStep, targetSub);
        if (targetStep === 0 && window.modelB_jumpTo)
            flashAndJump("model3dOverlay-b", () => window.modelB_jumpTo(targetSub));
        if (targetStep === 2 && window.modelD_jumpTo)
            flashAndJump("model3dOverlay-d", () => window.modelD_jumpTo(targetSub));
        setTimeout(() => { wheelConsumed = false; }, 600);
    });
});

// Init
updateProgressNav(0, 0);
updateCaptions(0);

// ── Shared step logic (wheel + keyboard both use this) ────────────────────
function handleStep(dir) {
    if (wheelConsumed) return;

    if (globalStep === 0) {
        if (window.modelB_isAnimating?.()) return;
        if (dir > 0 && window.modelB_isFinished?.()) {
            wheelConsumed = true; globalStep = 1;
            activateSection(1, 0);
            setTimeout(() => { wheelConsumed = false; }, 1500);
            return;
        }
        wheelConsumed = true;
        window.modelB_stepBy?.(dir);
        const nextSub = Math.max(0, Math.min(3, globalSubStep + dir));
        updateProgressNav(0, nextSub);
        globalSubStep = nextSub;
        setTimeout(() => { wheelConsumed = false; }, 1400);

    } else if (globalStep === 1) {
        wheelConsumed = true;
        if (dir > 0) { globalStep = 2; globalSubStep = 0; activateSection(2, 0); window.modelD_jumpTo?.(0); }
        else { globalStep = 0; globalSubStep = 3; activateSection(0, 3); window.modelB_jumpTo?.(3); }
        setTimeout(() => { wheelConsumed = false; }, 1500);

    } else if (globalStep === 2) {
        if (window.modelD_isAnimating?.()) return;
        if (dir > 0 && window.modelD_isFinished?.()) {
            // Navigate directly to books.html with exit transition
            wheelConsumed = true;
            document.body.classList.add('is-exiting');
            const veil = document.createElement('div');
            veil.style.cssText = 'position:fixed;inset:0;z-index:998;background:#000;opacity:0;pointer-events:none;transition:opacity 600ms ease;';
            document.body.appendChild(veil);
            setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => { veil.style.opacity = '1'; })), 200);
            setTimeout(() => { window.location.href = 'books.html'; }, 950);
            return;
        }
        if (dir < 0 && window.modelD_isAtStart?.()) {
            wheelConsumed = true; globalStep = 1;
            activateSection(1, 0);
            setTimeout(() => { wheelConsumed = false; }, 1500);
            return;
        }
        wheelConsumed = true;
        window.modelD_stepBy?.(dir);
        const nextSub = Math.max(0, Math.min(3, globalSubStep + dir));
        updateProgressNav(2, nextSub);
        globalSubStep = nextSub;
        setTimeout(() => { wheelConsumed = false; }, 1400);

    }
}

// Capture phase: intercept hint-dismissal before model wheel handlers
window.addEventListener("wheel", e => {
    if (hintIsOpen()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeAllHints();
    }
}, { passive: false, capture: true });

window.addEventListener("keydown", e => {
    const arrows = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"];
    if (arrows.includes(e.key) && hintIsOpen()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeAllHints();
    }
}, { capture: true });

// Bubble phase: drive section transitions
window.addEventListener("wheel", e => {
    e.preventDefault();
    if (hintIsOpen()) { closeAllHints(); return; }
    handleStep(e.deltaY > 0 ? 1 : -1);
}, { passive: false });

window.addEventListener("keydown", e => {
    const arrows = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"];
    if (!arrows.includes(e.key)) return;
    e.preventDefault();
    if (hintIsOpen()) { closeAllHints(); return; }
    const dir = (e.key === "ArrowDown" || e.key === "ArrowRight") ? 1 : -1;
    handleStep(dir);
});


// ─────────────────────────────────────────────────────────────────────────────
//  HINT DISMISS LOGIC
//  Tracks explicitly dismissed hints so the 3D scroll-controller cannot
//  re-open them. window.closeAllHints / window.hintIsOpen are used above.
// ─────────────────────────────────────────────────────────────────────────────

const _dismissedHints = new Set();
const _backdrop = document.getElementById('hintBackdrop');
const _progressNav = document.getElementById('progressNav');

function _maybeRevealProgressNav() {
    if (!document.querySelector('[id^="model3dHint-"].show')) {
        if (_progressNav) _progressNav.classList.add('hint-dismissed');
    }
}

function closeHint(hint) {
    if (!hint) return;
    _dismissedHints.add(hint.id);
    hint.classList.remove('show');
    hint.classList.add('hide');
    if (!document.querySelector('[id^="model3dHint-"].show')) {
        _backdrop.classList.remove('active');
        _maybeRevealProgressNav();
    }
}

// MutationObserver: prevent 3D script from re-opening dismissed hints
const _hintObserver = new MutationObserver(mutations => {
    mutations.forEach(m => {
        if (m.type !== 'attributes' || m.attributeName !== 'class') return;
        const el = m.target;
        if (_dismissedHints.has(el.id) && el.classList.contains('show')) {
            el.classList.remove('show');
            el.classList.add('hide');
            return;
        }
        if (el.classList.contains('show'))
            _backdrop.classList.add('active');
    });
});
document.querySelectorAll('[id^="model3dHint-"]').forEach(hint => {
    _hintObserver.observe(hint, { attributes: true });
});

// Close on ✕ button
document.querySelectorAll('.hintClose').forEach(btn => {
    btn.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        closeHint(btn.closest('[id^="model3dHint-"]'));
    });
});

// Close on backdrop click
_backdrop.addEventListener('click', () => {
    document.querySelectorAll('[id^="model3dHint-"].show').forEach(closeHint);
});

// Close on any tap anywhere on the viewport (mobile: tap outside panel)
window.addEventListener('pointerdown', e => {
    const hint = e.target.closest('[id^="model3dHint-"]');
    if (!hint && document.querySelector('[id^="model3dHint-"].show')) {
        document.querySelectorAll('[id^="model3dHint-"].show').forEach(closeHint);
    }
}, { passive: true });

// Global API consumed by the scroll-controller above
window.closeAllHints = function () {
    document.querySelectorAll('[id^="model3dHint-"].show').forEach(closeHint);
};
window.hintIsOpen = function () {
    return !!document.querySelector('[id^="model3dHint-"].show');
};

// ─────────────────────────────────────────────────────────────────────────────
//  MOBILE NAV PANEL
// ─────────────────────────────────────────────────────────────────────────────

(function initMobileNav() {
    const toggle = document.getElementById('menuToggle');
    const panel = document.getElementById('navPanel');
    const closeBtn = document.getElementById('navPanelClose');
    if (!toggle || !panel) return;

    function openMenu() {
        panel.classList.add('is-open');
        panel.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        panel.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    toggle.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
})();


// ─────────────────────────────────────────────────────────────────────────────
//  PARTNER LOGOS MARQUEE
// ─────────────────────────────────────────────────────────────────────────────

(function () {
    const PARTNERS = [
        { file: "partner-logo-1.png", alt: "Partner 1" },
        { file: "partner-logo-2.png", alt: "Partner 2" },
        { file: "partner-logo-3.png", alt: "Partner 3" },
        { file: "partner-logo-4.png", alt: "Partner 4" },
        { file: "partner-logo-5.png", alt: "Partner 5" },
        { file: "partner-logo-6.png", alt: "Partner 6" },
        { file: "partner-logo-7.png", alt: "Partner 7" },
        { file: "partner-logo-8.png", alt: "Partner 8" },
        { file: "partner-logo-9.png", alt: "Partner 9" },
    ];

    const track = document.getElementById("logoTrack");
    if (!track) return;

    // Scale factor: 1px in the original PNG = SCALE px on screen.
    // Increase to make everything bigger, decrease to make it smaller.
    const SCALE = 0.38;

    function applyNaturalSize(img) {
        img.style.width = (img.naturalWidth * SCALE) + "px";
        img.style.height = (img.naturalHeight * SCALE) + "px";
    }

    function buildItems() {
        return PARTNERS.map(p => {
            const item = document.createElement("div");
            item.className = "marqueeItem";
            const img = document.createElement("img");
            img.src = `/images/partners/${p.file}`;
            img.alt = p.alt;
            img.className = "marqueeImg";
            // Apply size immediately if cached, otherwise on load
            if (img.complete && img.naturalWidth) {
                applyNaturalSize(img);
            } else {
                img.addEventListener("load", () => applyNaturalSize(img), { once: true });
            }
            item.appendChild(img);
            return item;
        });
    }

    // Build both copies
    buildItems().forEach(el => track.appendChild(el));

    const sep = document.createElement("span");
    sep.className = "marqueeSep";
    sep.textContent = "·";
    track.appendChild(sep);

    buildItems().forEach(el => track.appendChild(el));

    // #about is position:fixed and opacity:0 at load, so scrollWidth=0 until
    // the section becomes active. Poll every 200ms until we get real width.
    function startMarquee() {
        track.querySelectorAll(".marqueeImg").forEach(img => {
            if (img.naturalWidth) applyNaturalSize(img);
        });
        const trackW = track.scrollWidth / 2;
        if (trackW < 10) { setTimeout(startMarquee, 200); return; }
        const duration = trackW / 55;
        track.style.animationDuration = `${duration}s`;
        track.classList.add("is-running");
    }
    window.addEventListener("load", () => setTimeout(startMarquee, 100));

    // Pause on hover
    const marqueeEl = track.closest(".aboutMarquee");
    if (marqueeEl) {
        marqueeEl.addEventListener("mouseenter", () => track.classList.add("is-paused"));
        marqueeEl.addEventListener("mouseleave", () => track.classList.remove("is-paused"));
    }
})();

// ── Nav link exit transitions ─────────────────────────────────────────────
// Intercept all topnav anchor clicks and animate out before navigating.
(function initNavExits() {
    function navigateWithExit(href) {
        // 1. Add exiting class — CSS slides topnav up
        document.body.classList.add('is-exiting');

        // 2. Black veil fades in over content (below nav)
        const veil = document.createElement('div');
        veil.style.cssText = 'position:fixed;inset:0;z-index:998;background:#000;opacity:0;pointer-events:none;transition:opacity 600ms ease;';
        document.body.appendChild(veil);
        requestAnimationFrame(() => requestAnimationFrame(() => { veil.style.opacity = '1'; }));

        // 3. After veil is opaque, slide nav up and navigate
        setTimeout(() => {
            window.location.href = href;
        }, 950);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const topnav = document.querySelector('.topnav');
        if (!topnav) return;
        topnav.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', e => {
                const href = a.getAttribute('href');
                if (!href || href.startsWith('#') || href.startsWith('mailto')) return;
                e.preventDefault();
                navigateWithExit(href);
            });
        });
    });
})();


// ── Rewrite index.html nav links to skip prelude ─────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.topnav a[href="index.html"], .brand[href="index.html"]').forEach(a => {
        a.setAttribute('href', 'index.html?skip=1');
    });
});