/* ============================================================
   model3d.js — Three.js scroll-driven 3D scene
   Loaded as <script type="module"> — own module scope,
   fully isolated from model-viewer's bundled Three.js.
   ============================================================ */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";


const SUFFIX = "-b";
const REVEAL_HOLD = 0.32;
const HINT_HIDE_PROGRESS = 0.08;
const ACTIVE_INTERSECTION_RATIO = 0.65;

const section = document.getElementById(`model3d${SUFFIX}`);
const stage = document.getElementById(`model3dStage${SUFFIX}`);
const sticky = document.getElementById(`model3dSticky${SUFFIX}`);
const canvas = document.getElementById(`model3dCanvas${SUFFIX}`);
const hint = document.getElementById(`model3dHint${SUFFIX}`);
const overlay = document.getElementById(`model3dOverlay${SUFFIX}`);
const viewport = sticky ? sticky.querySelector(".model3dViewport") : null;

if (!section || !stage || !sticky || !canvas || !viewport) {
    console.warn("model3d: required DOM elements not found, skipping.");
} else {

    // ── Scene ──────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(-0.5, 0, 2.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
    renderer.setPixelRatio(1);
    renderer.localClippingEnabled = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // ── Clipping planes ────────────────────────────────────────
    const wirePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const texPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

    // ── State ──────────────────────────────────────────────────
    let wireModel = null, texModel = null;
    let height = 4;
    const modelSize = new THREE.Vector3();
    let startAngle = 0, startY = 0;
    let ready = false;
    let clipTop = 2;
    let clipBottom = -2;
    let viewportVisible = false;

    // ── Helpers ────────────────────────────────────────────────
    function applyWireframe(model) {
        model.traverse((child) => {
            if (!child.isMesh) return;
            child.material = new THREE.MeshBasicMaterial({
                map: child.material.map || null,
                wireframe: true,
                color: new THREE.Color(4, 4, 4),
                clippingPlanes: [wirePlane],
                clipShadows: true,
            });
        });
    }

    function applyBasicTextured(model) {
        model.traverse((child) => {
            if (!child.isMesh) return;
            child.material = new THREE.MeshBasicMaterial({
                map: child.material.map || null,
                clippingPlanes: [texPlane],
                clipShadows: true,
            });
        });
    }

    function centerAndMeasure(model, shouldSetSize) {
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        model.position.sub(center);
        if (shouldSetSize) modelSize.copy(size);
        return size.y;
    }

    function updateClipBounds() {
        const margin = Math.max(height * 0.02, 0.02);
        clipTop = (height / 2) + margin;
        clipBottom = (-height / 2) - margin;
    }

    function applyClippingProgress(p) {
        const progress = Math.max(0, Math.min(1, p));
        const clipSpan = clipTop - clipBottom;

        // Start: full wireframe, no texture.
        // End: no wireframe, full texture.
        wirePlane.constant = clipTop - (progress * clipSpan);
        texPlane.constant = clipBottom + (progress * clipSpan);
    }

    // ── Resize ─────────────────────────────────────────────────
    function resize(shouldRender = true) {
        const rect = viewport.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));
        if (w < 2 || h < 2) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (shouldRender && ready && viewportVisible) renderer.render(scene, camera);
    }

    function setViewportVisibility(isVisible) {
        viewportVisible = isVisible;
        canvas.style.visibility = isVisible ? "visible" : "hidden";
    }

    if (window.ResizeObserver) {
        new ResizeObserver(() => {
            resize(viewportVisible);
            updateStageMetrics();
            lastProgress = -1;
            if (scrollListenerActive) requestTick();
        }).observe(sticky);
    }
    window.addEventListener("resize", () => resize(viewportVisible), { passive: true });

    // ── Render at scroll progress ──────────────────────────────
    function renderAt(p) {
        if (!ready) return;
        p = Math.max(0, Math.min(1, p));

        applyClippingProgress(p);

        const angle = startAngle + (-THREE.MathUtils.degToRad(60) * p);
        const dist = THREE.MathUtils.lerp(2.5, 4.5, p);
        camera.position.set(
            dist * Math.cos(angle),
            THREE.MathUtils.lerp(startY, modelSize.y * 0.1, p),
            dist * Math.sin(angle)
        );
        camera.lookAt(0, THREE.MathUtils.lerp(0, 1, p), 0);
        renderer.render(scene, camera);
    }

    // ── Load models ────────────────────────────────────────────
    const MODEL_URL = "3d/book-4-mosaic.glb";
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
    loader.setDRACOLoader(dracoLoader);


    loader.load(MODEL_URL, (gltf) => {
        wireModel = gltf.scene;
        height = centerAndMeasure(wireModel, true);
        texModel = wireModel.clone(true);
        centerAndMeasure(texModel, false);
        updateClipBounds();
        applyWireframe(wireModel);
        applyBasicTextured(texModel);
        applyClippingProgress(0);
        scene.add(wireModel);
        scene.add(texModel);
        startAngle = Math.atan2(camera.position.z, camera.position.x);
        startY = camera.position.y;
        resize();
        checkReady();
    }, undefined, (err) => console.error("model3d model load error:", err));

    function checkReady() {
        if (!wireModel || !texModel) return;
        ready = true;
        updateStageMetrics();
        renderAt(getProgress());
        requestAnimationFrame(() => renderAt(getProgress()));
        if (hint) hint.classList.add("show");
        // Fade out the black overlay so the canvas becomes visible
        if (overlay) overlay.classList.add("is-hidden");
    }

    // ── Scroll progress ────────────────────────────────────────
    let stageTop = 0, stageHeight = 0, viewportH = 0;

    function updateStageMetrics() {
        const rect = stage.getBoundingClientRect();
        stageTop = rect.top + window.scrollY;
        stageHeight = rect.height;
        viewportH = window.innerHeight;
    }

    function getProgress() {
        const total = stageHeight - viewportH;
        const rawProgress = (window.scrollY - stageTop) / total;
        if (rawProgress <= 0) return 0;
        if (rawProgress >= 1) return 1;
        if (rawProgress <= REVEAL_HOLD) return 0;
        return (rawProgress - REVEAL_HOLD) / (1 - REVEAL_HOLD);
    }

    function getRawProgress() {
        const total = stageHeight - viewportH;
        if (total <= 0) return 0;
        return Math.max(0, Math.min(1, (window.scrollY - stageTop) / total));
    }

    let rafId = null, lastProgress = -1;
    let scrollListenerActive = false;

    function tick() {
        rafId = null;
        const p = getProgress();
        if (Math.abs(p - lastProgress) > 0.003) {
            renderAt(p);
            lastProgress = p;
            if (hint) hint.classList.toggle("hide", getRawProgress() > HINT_HIDE_PROGRESS);
        }
    }

    function requestTick() {
        if (rafId || !ready) return;
        rafId = requestAnimationFrame(tick);
    }

    function addScrollListener() {
        if (scrollListenerActive) return;
        scrollListenerActive = true;
        window.addEventListener("scroll", requestTick, { passive: true });
    }

    function removeScrollListener() {
        if (!scrollListenerActive) return;
        scrollListenerActive = false;
        window.removeEventListener("scroll", requestTick);
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    if (window.IntersectionObserver) {
        new IntersectionObserver((entries) => {
            const entry = entries[0];
            setViewportVisibility(entry.isIntersecting && entry.intersectionRatio > 0);
            if (entry.isIntersecting && entry.intersectionRatio >= ACTIVE_INTERSECTION_RATIO) {
                updateStageMetrics();
                addScrollListener();
                lastProgress = -1;
                requestTick();
            } else {
                removeScrollListener();
            }
        }, { threshold: [0, ACTIVE_INTERSECTION_RATIO] }).observe(viewport);
    } else {
        setViewportVisibility(true);
        addScrollListener();
    }

    window.addEventListener("resize", () => { updateStageMetrics(); lastProgress = -1; requestTick(); });

    updateStageMetrics();
    requestTick();
}
