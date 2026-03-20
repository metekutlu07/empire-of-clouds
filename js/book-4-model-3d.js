/* ============================================================
   model3d.js — Three.js scroll-driven 3D scene
   Loaded as <script type="module"> — own module scope,
   fully isolated from model-viewer's bundled Three.js.
   ============================================================ */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";


const SUFFIX = "-b";

const section = document.getElementById(`model3d${SUFFIX}`);
const stage = document.getElementById(`model3dStage${SUFFIX}`);
const sticky = document.getElementById(`model3dSticky${SUFFIX}`);
const canvas = document.getElementById(`model3dCanvas${SUFFIX}`);
const hint = document.getElementById(`model3dHint${SUFFIX}`);
const overlay = document.getElementById(`model3dOverlay${SUFFIX}`);

if (!section || !stage || !sticky || !canvas) {
    console.warn("model3d: required DOM elements not found, skipping.");
} else {

    // ── Scene ──────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(-0.5, 0, 2.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.localClippingEnabled = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // ── Clipping planes ────────────────────────────────────────
    const bluePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const redPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

    // ── State ──────────────────────────────────────────────────
    let texturedModel = null, whiteModel = null;
    let height = 4;
    const modelSize = new THREE.Vector3();
    let startAngle = 0, startY = 0;
    let ready = false;

    // ── Helpers ────────────────────────────────────────────────
    function applyWireframe(model) {
        model.traverse((child) => {
            if (!child.isMesh) return;
            child.material = new THREE.MeshBasicMaterial({
                map: child.material.map || null,
                wireframe: true,
                color: new THREE.Color(4, 4, 4),
                clippingPlanes: [bluePlane],
                clipShadows: true,
            });
        });
    }

    function applyBasicTextured(model) {
        model.traverse((child) => {
            if (!child.isMesh) return;
            child.material = new THREE.MeshBasicMaterial({
                map: child.material.map || null,
                clippingPlanes: [redPlane],
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

    // ── Resize ─────────────────────────────────────────────────
    function resize() {
        const vp = document.querySelector(".model3dViewport");
        if (!vp) return;
        const rect = vp.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));
        if (w < 2 || h < 2) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
    }

    if (window.ResizeObserver) new ResizeObserver(resize).observe(sticky);
    window.addEventListener("resize", resize, { passive: true });

    // ── Render at scroll progress ──────────────────────────────
    function renderAt(p) {
        if (!ready) return;
        p = Math.max(0, Math.min(1, p));

        bluePlane.constant = height / 2 - p * height;
        redPlane.constant = -height / 2 + p * height;

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
        texturedModel = gltf.scene;
        height = centerAndMeasure(texturedModel, true);
        applyWireframe(texturedModel);
        bluePlane.constant = height / 2;
        scene.add(texturedModel);
        startAngle = Math.atan2(camera.position.z, camera.position.x);
        startY = camera.position.y;
        resize();
        checkReady();
    }, undefined, (err) => console.error("model3d texturedModel load error:", err));

    loader.load(MODEL_URL, (gltf) => {
        whiteModel = gltf.scene;
        centerAndMeasure(whiteModel, false);
        applyBasicTextured(whiteModel);
        redPlane.constant = -height / 2;
        scene.add(whiteModel);
        resize();
        checkReady();
    }, undefined, (err) => console.error("model3d whiteModel load error:", err));

    function checkReady() {
        if (!texturedModel || !whiteModel) return;
        ready = true;
        updateStageMetrics();
        const ip = getProgress();
        renderAt(ip);
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
        if (rawProgress <= 0.85) return rawProgress / 0.85;
        return 1.0;
    }

    let rafId = null, lastProgress = -1;

    function tick() {
        rafId = null;
        const p = getProgress();
        if (Math.abs(p - lastProgress) > 0.003) {
            renderAt(p);
            lastProgress = p;
            if (hint) hint.classList.toggle("hide", p > 0.85);
        }
    }

    function requestTick() {
        if (rafId) return;
        rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("scroll", requestTick, { passive: true });
    window.addEventListener("resize", () => { updateStageMetrics(); lastProgress = -1; requestTick(); });

    updateStageMetrics();
    requestTick();
}