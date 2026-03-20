// WebGL film-grain postprocessing.
// Uploads the 2D glyph canvas as a texture each frame and renders it
// with per-pixel film-grain noise added on the GPU.

export default class PostProcessing {
  constructor(glCanvas, opts = {}) {
    if (!glCanvas) throw new Error("PostProcessing: missing canvas");
    this.canvas = glCanvas;

    const gl = glCanvas.getContext("webgl", {
      alpha: false, antialias: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false,
    }) || glCanvas.getContext("webgl2", {
      alpha: false, antialias: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error("PostProcessing: WebGL not available");
    this.gl = gl;

    // Detect WebGL version by looking for a WebGL2-only method.
    this._gl2 = typeof gl.createVertexArray === "function";

    this.noiseEnabled  = opts.enabled  ?? true;
    this.noiseStrength = opts.strength ?? 0.15;

    this._initGL();
  }

  setNoiseStrength(v) { this.noiseStrength = Math.max(0, Math.min(1, v)); }
  setEnabled(v)       { this.noiseEnabled = !!v; }

  setSize(widthCssPx, heightCssPx, dpr = 1) {
    const gl = this.gl;
    const w  = Math.max(1, Math.floor(widthCssPx  * dpr));
    const h  = Math.max(1, Math.floor(heightCssPx * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width  = w;
      this.canvas.height = h;
    }
    this.canvas.style.width  = widthCssPx  + "px";
    this.canvas.style.height = heightCssPx + "px";
    gl.viewport(0, 0, w, h);
  }

  render(sourceCanvas2D, timeMs = performance.now()) {
    const gl = this.gl;

    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas2D);

    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(this.aUv);
    gl.vertexAttribPointer(this.aUv,  2, gl.FLOAT, false, 16, 8);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);

    gl.uniform1i(this.uTex,      0);
    gl.uniform1f(this.uTime,     timeMs * 0.001);
    gl.uniform1f(this.uStrength, this.noiseEnabled ? this.noiseStrength : 0.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  _initGL() {
    const gl  = this.gl;
    const gl2 = this._gl2;

    // ── Vertex shader ──────────────────────────────────────────────────────────
    const vs = gl2
      ? `#version 300 es
         in vec2 a_pos; in vec2 a_uv; out vec2 v_uv;
         void main(){ v_uv = a_uv; gl_Position = vec4(a_pos,0,1); }`
      : `attribute vec2 a_pos; attribute vec2 a_uv; varying vec2 v_uv;
         void main(){ v_uv = a_uv; gl_Position = vec4(a_pos,0,1); }`;

    // ── Fragment shader ────────────────────────────────────────────────────────
    //
    // Why this works correctly on mobile:
    //
    //  • highp float  — Mobile GPUs enforce mediump (16-bit) strictly, which
    //    causes fract/sin hash functions to alias into visible bands.
    //    highp gives 32-bit precision on all modern iOS/Android devices.
    //
    //  • fract(u_time * K)  — Keeps the time value in [0,1) at all times, so
    //    precision never degrades no matter how long the page has been open.
    //
    //  • DIFFERENT K values for x and y (7.3513 vs 11.6127)  — Using the same
    //    value adds the same delta to both axes each frame, which shifts the
    //    noise in a fixed diagonal direction → visible sweeping lines.
    //    Independent irrational rates completely de-correlate the two axes.
    //
    //  • Large coprime scales (3571 / 2971)  — Spreads the per-frame offset
    //    across thousands of pixels so adjacent frames use unrelated hash inputs.
    //
    //  • sin(dot) × 43758.5453  — Gold-standard spatial hash; uniform on every
    //    GPU vendor without banding or visible periodicity.

    const fs = gl2
      ? `#version 300 es
         precision highp float;
         in vec2 v_uv; out vec4 outColor;
         uniform sampler2D u_tex;
         uniform float u_time, u_strength;
         void main(){
           vec2 seed = gl_FragCoord.xy + vec2(
             fract(u_time *  7.3513) * 3571.0,
             fract(u_time * 11.6127) * 2971.0);
           float n = fract(sin(dot(seed, vec2(127.1, 311.7))) * 43758.5453);
           vec4 c = texture(u_tex, v_uv);
           outColor = vec4(clamp(c.rgb + (n - 0.5) * u_strength, 0.0, 1.0), c.a);
         }`
      : `precision highp float;
         varying vec2 v_uv;
         uniform sampler2D u_tex;
         uniform float u_time, u_strength;
         void main(){
           vec2 seed = gl_FragCoord.xy + vec2(
             fract(u_time *  7.3513) * 3571.0,
             fract(u_time * 11.6127) * 2971.0);
           float n = fract(sin(dot(seed, vec2(127.1, 311.7))) * 43758.5453);
           vec4 c = texture2D(u_tex, v_uv);
           gl_FragColor = vec4(clamp(c.rgb + (n - 0.5) * u_strength, 0.0, 1.0), c.a);
         }`;

    this.prog = this._link(vs, fs);
    gl.useProgram(this.prog);

    this.aPos     = gl.getAttribLocation(this.prog,  "a_pos");
    this.aUv      = gl.getAttribLocation(this.prog,  "a_uv");
    this.uTex     = gl.getUniformLocation(this.prog, "u_tex");
    this.uTime    = gl.getUniformLocation(this.prog, "u_time");
    this.uStrength= gl.getUniformLocation(this.prog, "u_strength");

    // Fullscreen quad (two triangles, position + uv interleaved, 4 floats each)
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1, 0,0,   1,-1, 1,0,  -1,1, 0,1,
      -1, 1, 0,1,   1,-1, 1,0,   1,1, 1,1,
    ]), gl.STATIC_DRAW);

    this.srcTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
  }

  _compile(type, src) {
    const gl = this.gl;
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const msg = gl.getShaderInfoLog(sh) || "shader compile error";
      gl.deleteShader(sh);
      throw new Error(msg);
    }
    return sh;
  }

  _link(vsSrc, fsSrc) {
    const gl   = this.gl;
    const prog = gl.createProgram();
    gl.attachShader(prog, this._compile(gl.VERTEX_SHADER,   vsSrc));
    gl.attachShader(prog, this._compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const msg = gl.getProgramInfoLog(prog) || "program link error";
      gl.deleteProgram(prog);
      throw new Error(msg);
    }
    return prog;
  }
}
