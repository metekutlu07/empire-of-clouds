import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

// ------------------------------------------------------------
//  MULTI SECTION CONFIG
//  Change SUFFIX + MODEL_URL per duplicated file.
//  SUFFIX must match your HTML ids: model3d-a, model3dStage-a, ...
// ------------------------------------------------------------
const SUFFIX = "-a";
const MODEL_URL = "3d/book-5-dragon.glb";

const section = document.getElementById(`model3d${SUFFIX}`);
const stage = document.getElementById(`model3dStage${SUFFIX}`);
const sticky = document.getElementById(`model3dSticky${SUFFIX}`);
const canvas = document.getElementById(`model3dCanvas${SUFFIX}`);
const hint = document.getElementById(`model3dHint${SUFFIX}`);
const overlay = document.getElementById(`model3dOverlay${SUFFIX}`);

if (!section || !stage || !sticky || !canvas) {
  // Section missing.
} else {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  camera.up.set(0, 1, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1); // cap at 1 — halves pixel fill on retina
  renderer.localClippingEnabled = true;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 5, 5);
  scene.add(light);

  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
  loader.setDRACOLoader(dracoLoader);

  // Two complementary clipping planes.
  // The wireframe model is clipped by bluePlane, the textured model by redPlane.
  const bluePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const redPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

  let wireModel = null;   // (actually uses wireframe material)
  let texModel = null;    // (basic textured)

  let height = 4; // fallback until model loads
  const modelSize = new THREE.Vector3();

  let ready = false;

  // Cached camera path (pos + quaternion) to avoid discontinuities.
  let CAM_POINTS = null;
  let CAM_FRAMES = null;
  let TIMELINE = null; // { segments, boundaries, clipMoveIndex, hintHideAt }
  const CAM_UP = new THREE.Vector3(0, 1, 0);

  // ---------------------------
  //  EDIT THESE: point selection + timing
  // ---------------------------

  // Choose the number of active points: 2, 3, or 4.
  // If ACTIVE_POINT_INDICES is not null, it overrides this.
  const ACTIVE_POINTS = 4;

  // Optional explicit selection (indices from the full P1..P4 list).
  // Must include 0 (Point 1) as the first element.
  // Examples:
  //   [0,1]     -> P1 -> P2
  //   [0,1,2]   -> P1 -> P2 -> P3
  //   [0,2,3]   -> P1 -> P3 -> P4 (skip P2)
  const ACTIVE_POINT_INDICES = null;

  // Where the clipping reveal should happen:
  // "last" means it happens only on the final move (recommended).
  // Or set to 0,1,2... meaning: reveal during move 0 (P1->P2), move 1 (P2->P3), etc.
  const CLIP_ON_MOVE = "last";

  // Timeline weights. These do not need to sum to 1.0 (we normalize).
  // The "1 second freeze" is represented as a scroll dead-zone (a hold segment).
  // For 2 points: uses MOVES[0] and HOLDS[0..1]
  // For 3 points: uses MOVES[0..1] and HOLDS[0..2]
  // For 4 points: uses MOVES[0..2] and HOLDS[0..3]
  const TIMING = {
    REVEAL_HOLD: 0.05,            // Point 1: no camera + no clipping animation (opacity reveal handled elsewhere)
    HOLDS: [0.01, 0.02, 0.05, 0.02],
    MOVES: [0.34, 0.23, 0.28]
  };

  // FIX #4+5+6: Reusable scratch objects — avoids per-frame heap allocations
  const _lerpScratch = new THREE.Vector3();
  const _slerpScratch = new THREE.Quaternion();
  const _lookMatrix = new THREE.Matrix4();

  // Camera path points (pos + lookAt). Expressed relative to loaded model size.
  function buildCameraPoints() {
    const sx = modelSize.x || 1;
    const sy = modelSize.y || 1;
    const sz = modelSize.z || 1;

    // Point 1: inside the dragon head / neck, looking upward-ish.
    const P1 = {
      pos: new THREE.Vector3(0.04 * sx, -0.15 * sy, 0.00 * sz),
      look: new THREE.Vector3(0.04 * sx, 0.08 * sy, -0.20 * sz)
    };

    // Point 2: outside, lower-left, side and below.
    const P2 = {
      pos: new THREE.Vector3(0.04 * sx, -0.25 * sy, 0.5 * sz),
      look: new THREE.Vector3(0.04 * sx, 0.06 * sy, 0.00 * sz)
    };

    // Point 3: outside, to the right.
    const P3 = {
      pos: new THREE.Vector3(-0.15 * sx, -0.30 * sy, 0.25 * sz),
      look: new THREE.Vector3(0.00 * sx, -0.10 * sy, 0.00 * sz)
    };

    // Point 4: further back, framing the whole model.
    const P4 = {
      pos: new THREE.Vector3(0.30 * sx, -0.32 * sy, 0.6 * sz),
      look: new THREE.Vector3(0.00 * sx, 0.00 * sy, 0.00 * sz)
    };

    return [P1, P2, P3, P4];
  }

  // ---------------------------
  //  Materials + clipping
  // ---------------------------

  function applyWireframe(model) {
    model.traverse((child) => {
      if (!child.isMesh) return;

      const original = child.material;
      const basic = new THREE.MeshBasicMaterial({
        map: (original && original.map) ? original.map : null,
        wireframe: true,
        color: new THREE.Color(4, 4, 4) // brightness boost
      });

      basic.clippingPlanes = original && original.clippingPlanes ? original.clippingPlanes : null;
      basic.clipShadows = true;
      child.material = basic;
    });
  }

  function applyBasicTextured(model) {
    model.traverse((child) => {
      if (!child.isMesh) return;

      const original = child.material;
      const basic = new THREE.MeshBasicMaterial({
        map: (original && original.map) ? original.map : null
      });

      basic.clippingPlanes = original && original.clippingPlanes ? original.clippingPlanes : null;
      basic.clipShadows = true;
      child.material = basic;
    });
  }

  function applyClipping(model, plane) {
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.material.clippingPlanes = [plane];
      child.material.clipShadows = true;
      child.material.needsUpdate = true;
    });
  }

  function centerAndMeasure(model, shouldSetSize = true) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    model.position.sub(center);

    if (shouldSetSize) modelSize.copy(size);
    return size.y;
  }

  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }

  function clampInt(x, lo, hi) {
    const n = Number.isFinite(x) ? Math.floor(x) : lo;
    return Math.max(lo, Math.min(hi, n));
  }

  // Smooth easing for camera moves.
  function easeInOutCubic(t) {
    const x = clamp01(t);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  // FIX #4: writes into reusable scratch — no heap allocation per scroll event
  function lerpVec3(a, b, t) {
    return _lerpScratch.copy(a).lerp(b, t);
  }

  // FIX #6: reuses _lookMatrix scratch
  function quatFromLookAt(pos, look) {
    _lookMatrix.lookAt(pos, look, CAM_UP);
    return new THREE.Quaternion().setFromRotationMatrix(_lookMatrix);
  }

  // FIX #5: writes into reusable scratch — no heap allocation per scroll event
  function slerpQuat(a, b, t) {
    return _slerpScratch.copy(a).slerp(b, t);
  }

  function pickActivePoints(allPoints) {
    if (Array.isArray(ACTIVE_POINT_INDICES) && ACTIVE_POINT_INDICES.length >= 2) {
      const idx = ACTIVE_POINT_INDICES.map((v) => clampInt(v, 0, allPoints.length - 1));
      if (idx[0] !== 0) idx.unshift(0);
      const unique = [];
      idx.forEach((i) => {
        if (!unique.includes(i)) unique.push(i);
      });
      return unique.map((i) => allPoints[i]);
    }

    const n = clampInt(ACTIVE_POINTS, 2, 4);
    return allPoints.slice(0, n);
  }

  function buildTimeline(nPoints) {
    const segments = [];

    // Segment 0: reveal hold at Point 0 (P1)
    segments.push({ type: "hold", at: 0, weight: TIMING.REVEAL_HOLD, tag: "reveal" });

    // Segment 1: hold at Point 0
    segments.push({ type: "hold", at: 0, weight: (TIMING.HOLDS[0] ?? 0.05), tag: "hold0" });

    // Then: for each move i, add move and hold at next point
    for (let i = 0; i < nPoints - 1; i++) {
      segments.push({
        type: "move",
        from: i,
        to: i + 1,
        weight: (TIMING.MOVES[i] ?? 0.2),
        tag: `move${i}`
      });

      segments.push({
        type: "hold",
        at: i + 1,
        weight: (TIMING.HOLDS[i + 1] ?? 0.05),
        tag: `hold${i + 1}`
      });
    }

    // Boundaries (normalized)
    let acc = 0;
    const boundaries = [0];
    for (const s of segments) {
      acc += Math.max(0, Number(s.weight) || 0);
      boundaries.push(acc);
    }
    const last = boundaries[boundaries.length - 1] || 1;
    for (let i = 0; i < boundaries.length; i++) boundaries[i] /= last;

    // Clipping move index
    let clipMoveIndex = nPoints - 2; // last by default
    if (CLIP_ON_MOVE !== "last") {
      const req = clampInt(CLIP_ON_MOVE, 0, nPoints - 2);
      clipMoveIndex = req;
    }

    // Hide hint when movement begins (start of the first move, which is boundary[2])
    const hintHideAt = boundaries[2] ?? 0.0;

    return { segments, boundaries, clipMoveIndex, hintHideAt };
  }

  function cacheCameraPath() {
    const all = buildCameraPoints();
    CAM_POINTS = pickActivePoints(all);

    CAM_FRAMES = CAM_POINTS.map((pt) => ({
      pos: pt.pos.clone(),
      quat: quatFromLookAt(pt.pos, pt.look)
    }));

    TIMELINE = buildTimeline(CAM_FRAMES.length);
  }

  function resize() {
    // FIX #2: use the scoped sticky element — not querySelector(".model3dViewport")
    // which always returns the first instance on the page (wrong for -b/-c/-d).
    const w = Math.max(1, Math.floor(sticky.clientWidth));
    const h = Math.max(1, Math.floor(sticky.clientHeight));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // FIX #10: don't render synchronously here; let the scroll RAF handle it.
  }

  let _initDone = false;

  function initScene() {
    if (_initDone) return;
    _initDone = true;

    if (window.ResizeObserver) {
      new ResizeObserver(() => {
        resize();
        updateStageMetrics();
        lastP = -1;
        requestTick();
      }).observe(sticky);
    }

    // FIX #8+9: debounce window resize
    let _resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(() => {
        resize();
        updateStageMetrics();
        lastP = -1;
        requestTick();
      }, 120);
    }, { passive: true });

    // ---------------------------
    //  Scroll mapping
    // ---------------------------

    let stageTop = 0;
    let stageHeight = 0;
    let viewportHeight = 0;

    function updateStageMetrics() {
      const rect = stage.getBoundingClientRect();
      stageTop = rect.top + window.scrollY;
      stageHeight = rect.height;
      viewportHeight = window.innerHeight;
    }

    function getRawProgress() {
      const scrollY = window.scrollY;
      const total = stageHeight - viewportHeight;
      const scrolled = scrollY - stageTop;
      const raw = scrolled / total;

      if (raw <= 0) return 0;
      if (raw >= 1) return 1;
      return raw;
    }

    function evaluateTimeline(rawProgress, frames, timeline) {
      const p = clamp01(rawProgress);

      const { segments, boundaries: B, clipMoveIndex } = timeline;

      // Find current segment
      let segIndex = segments.length - 1;
      for (let i = 0; i < segments.length; i++) {
        if (p < B[i + 1]) { segIndex = i; break; }
      }

      const seg = segments[segIndex];
      const t0 = B[segIndex];
      const t1 = B[segIndex + 1];
      const localT = (t1 > t0) ? clamp01((p - t0) / (t1 - t0)) : 0;
      const tEase = easeInOutCubic(localT);

      let camPos = frames[0].pos;
      let camQuat = frames[0].quat;

      // Clip state:
      // 0 before the clip move starts
      // t during the clip move
      // 1 after it completes
      let clip = 0;

      if (seg.type === "move") {
        const A = frames[seg.from];
        const C = frames[seg.to];
        camPos = lerpVec3(A.pos, C.pos, tEase);
        camQuat = slerpQuat(A.quat, C.quat, tEase);

        if (seg.from === clipMoveIndex) clip = tEase;
        else if (seg.from > clipMoveIndex) clip = 1;
      } else {
        const P = frames[seg.at];
        camPos = P.pos;
        camQuat = P.quat;

        if (seg.at >= clipMoveIndex + 1) clip = 1;
      }

      return { camPos, camQuat, clip, segment: segIndex };
    }

    function applyCameraFrame(pos, quat) {
      camera.position.copy(pos);
      camera.quaternion.copy(quat);
      camera.updateMatrixWorld();
    }

    function applyClippingProgress(clipProgress) {
      const c = clamp01(clipProgress);
      bluePlane.constant = height / 2 - c * height;
      redPlane.constant = -height / 2 + c * height;
    }

    // Dynamically add/remove scroll listener based on visibility
    let scrollListenerActive = false;

    // model-viewer bundles its own Three.js — two WebGL contexts rendering
    // simultaneously causes GPU contention and the scroll freeze/jump.
    // We suspend our renderer entirely while the book's scrollStage is visible.
    let modelViewerVisible = true;
    let threeJsSuspended = false;

    function setSuspended(suspended) {
      threeJsSuspended = suspended;
      if (!suspended) {
        updateStageMetrics();
        lastP = -1;
        requestTick();
      } else {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      }
    }

    const bookStage = document.getElementById("stage");
    if (bookStage) {
      new IntersectionObserver((entries) => {
        modelViewerVisible = entries[0].isIntersecting;
        if (modelViewerVisible) {
          setSuspended(true);
        } else if (scrollListenerActive) {
          setSuspended(false);
        }
      }, { rootMargin: "0px" }).observe(bookStage);
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
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    const _visObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        addScrollListener();
        if (!modelViewerVisible) setSuspended(false);
      } else {
        removeScrollListener();
      }
    }, { rootMargin: "0px" });
    _visObserver.observe(section);

    function renderAt(rawProgress) {
      if (!ready || !wireModel || !texModel) return;
      if (!CAM_FRAMES || !TIMELINE) cacheCameraPath();

      const state = evaluateTimeline(rawProgress, CAM_FRAMES, TIMELINE);

      applyCameraFrame(state.camPos, state.camQuat);
      applyClippingProgress(state.clip);

      renderer.render(scene, camera);

      if (hint) {
        if (rawProgress >= TIMELINE.hintHideAt) hint.classList.add("hide");
        else hint.classList.remove("hide");
      }
    }

    // ----------- Load model ONCE, clone for wireframe + textured -----------
    loader.load(MODEL_URL, (gltf) => {
      wireModel = gltf.scene;
      height = centerAndMeasure(wireModel, true);

      // Clone the parsed scene instead of fetching + parsing twice
      texModel = THREE.SkeletonUtils
        ? THREE.SkeletonUtils.clone(gltf.scene)
        : wireModel.clone(true);
      centerAndMeasure(texModel, false);

      applyWireframe(wireModel);
      applyBasicTextured(texModel);

      bluePlane.constant = height / 2;
      redPlane.constant = -height / 2;
      applyClipping(wireModel, bluePlane);
      applyClipping(texModel, redPlane);

      scene.add(wireModel);
      scene.add(texModel);
      resize();

      const waitReady = () => {
        if (wireModel && texModel) {
          ready = true;
          updateStageMetrics();

          // Start on Point 1, fully frozen, clipping locked.
          cacheCameraPath();
          applyCameraFrame(CAM_FRAMES[0].pos, CAM_FRAMES[0].quat);
          applyClippingProgress(0);

          const initial = getRawProgress();
          renderAt(initial);
          requestAnimationFrame(() => {
            renderAt(initial);
            requestAnimationFrame(() => renderAt(initial));
          });

          if (hint) hint.classList.add("show");
          if (overlay) overlay.classList.add("is-hidden");

          window.__book5Model3D = {
            camera,
            modelSize,
            getPoints: () => (CAM_POINTS ? CAM_POINTS : pickActivePoints(buildCameraPoints())),
            getFrames: () => CAM_FRAMES,
            timeline: () => TIMELINE,
            config: { ACTIVE_POINTS, ACTIVE_POINT_INDICES, CLIP_ON_MOVE, TIMING }
          };
        } else {
          requestAnimationFrame(waitReady);
        }
      };
      waitReady();
    });

    // ---------------------------
    //  Scroll + RAF scheduling
    // ---------------------------

    let rafId = null;
    let lastP = -1;

    function tick() {
      rafId = null;
      if (threeJsSuspended) return;
      const p = getRawProgress();

      if (Math.abs(p - lastP) > 0.001) {
        renderAt(p);
        lastP = p;
      }
    }

    function requestTick() {
      if (rafId) return;
      rafId = requestAnimationFrame(tick);
    }

    updateStageMetrics();
  } // end initScene

  // Defer heavy init until section enters viewport scrolling downward only.
  // Using rootMargin "0px" so the load doesn't spike while user is still
  // reading #bookIntro above — only fires when the section is truly on screen.
  let _initScheduled = false;
  const _loadObserver = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (!entry.isIntersecting) return;
    // Only trigger when scrolling down (section entering from bottom)
    if (entry.boundingClientRect.top > 0) {
      if (!_initScheduled) {
        _initScheduled = true;
        _loadObserver.disconnect();
        // Small yield so scroll paint finishes first
        setTimeout(initScene, 80);
      }
    }
  }, { rootMargin: "0px", threshold: 0 });
  _loadObserver.observe(section);
}