// Minimal, self-contained WebGL NoisePass-style postprocessing.
// Place this file next to your HTML and import it with:
//   import PostProcessing from "./PostProcessing.noise.js";
//
// It takes a 2D canvas (your glyph matrix) as the source each frame,
// uploads it as a texture, and renders a fullscreen quad with film-grain noise.
//
// Supports WebGL1 (GLSL 100) and WebGL2 (GLSL 300 es).

export default class PostProcessing {
  constructor(glCanvas, opts = {}) {
    if (!glCanvas) throw new Error("PostProcessing: missing canvas");
    this.canvas = glCanvas;

    // Prefer WebGL1 first because the simplest fullscreen-quad shader stack is GLSL 100.
    // If WebGL1 is unavailable, fall back to WebGL2 and compile GLSL 300.
    const gl1 = glCanvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });

    const gl2 = !gl1
      ? glCanvas.getContext("webgl2", {
          alpha: false,
          antialias: false,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false,
        })
      : null;

    const gl = gl1 || gl2;
    if (!gl) throw new Error("PostProcessing: WebGL not available");

    this.gl = gl;
    this.isWebGL2 = !!gl2;

    // Parameter names aligned with your old config:
    // noisePass.strength.value defaulted to 0.15
    this.noiseEnabled = opts.enabled ?? true;
    this.noiseStrength = opts.strength ?? 0.15;
    this._dpr = 1;
    this.uDpr = null;

    this._init();
  }

  setNoiseStrength(v) {
    this.noiseStrength = Math.max(0, Math.min(1, v));
  }

  setEnabled(v) {
    this.noiseEnabled = !!v;
  }

  setSize(widthCssPx, heightCssPx, dpr = 1) {
    const gl = this.gl;
    const w = Math.max(1, Math.floor(widthCssPx * dpr));
    const h = Math.max(1, Math.floor(heightCssPx * dpr));

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.canvas.style.width = widthCssPx + "px";
    this.canvas.style.height = heightCssPx + "px";

    this._dpr = dpr;
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.prog);
    gl.uniform2f(this.uResolution, w, h);
    if (this.uDpr !== null) gl.uniform1f(this.uDpr, dpr);
  }

  render(sourceCanvas2D, timeMs = performance.now()) {
    const gl = this.gl;

    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);

    // WebGL1 and WebGL2 both accept the "HTMLCanvasElement" overload.
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      sourceCanvas2D
    );

    gl.useProgram(this.prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(this.aUv);
    gl.vertexAttribPointer(this.aUv, 2, gl.FLOAT, false, 16, 8);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.uniform1i(this.uTex, 0);

    gl.uniform1f(this.uTime, timeMs * 0.001);
    gl.uniform1f(this.uNoiseStrength, this.noiseEnabled ? this.noiseStrength : 0.0);
    if (this.uDpr !== null) gl.uniform1f(this.uDpr, this._dpr || 1.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  _init() {
    const gl = this.gl;

    const vs100 = `
      attribute vec2 a_pos;
      attribute vec2 a_uv;
      varying vec2 v_uv;
      void main(){
        v_uv = a_uv;
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;

    const fs100 = `
      precision highp float;
      varying vec2 v_uv;
      uniform sampler2D u_tex;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float u_noiseStrength;
      uniform float u_dpr;

      float hash21(vec2 p){
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main(){
        vec4 col = texture2D(u_tex, v_uv);
        float frame = mod(floor(u_time * 60.0), 997.0);
        float n = hash21(gl_FragCoord.xy + vec2(frame * 131.7, frame * 79.3));
        float g = (n - 0.5) * 2.0;
        col.rgb = clamp(col.rgb + g * u_noiseStrength, 0.0, 1.0);
        gl_FragColor = col;
      }
    `;

    const vs300 = `#version 300 es
      in vec2 a_pos;
      in vec2 a_uv;
      out vec2 v_uv;
      void main(){
        v_uv = a_uv;
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;

    const fs300 = `#version 300 es
      precision highp float;
      in vec2 v_uv;
      uniform sampler2D u_tex;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float u_noiseStrength;
      uniform float u_dpr;
      out vec4 outColor;

      float hash21(vec2 p){
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main(){
        vec4 col = texture(u_tex, v_uv);
        float frame = mod(floor(u_time * 60.0), 997.0);
        float n = hash21(gl_FragCoord.xy + vec2(frame * 131.7, frame * 79.3));
        float g = (n - 0.5) * 2.0;
        col.rgb = clamp(col.rgb + g * u_noiseStrength, 0.0, 1.0);
        outColor = col;
      }
    `;

    const vs = this.isWebGL2 ? vs300 : vs100;
    const fs = this.isWebGL2 ? fs300 : fs100;

    this.prog = this._link(vs, fs);
    gl.useProgram(this.prog);

    this.aPos = gl.getAttribLocation(this.prog, "a_pos");
    this.aUv = gl.getAttribLocation(this.prog, "a_uv");
    this.uTex = gl.getUniformLocation(this.prog, "u_tex");
    this.uResolution = gl.getUniformLocation(this.prog, "u_resolution");
    this.uTime = gl.getUniformLocation(this.prog, "u_time");
    this.uNoiseStrength = gl.getUniformLocation(this.prog, "u_noiseStrength");
    this.uDpr = gl.getUniformLocation(this.prog, "u_dpr");

    const quad = new Float32Array([
      -1, -1,  0, 0,
       1, -1,  1, 0,
      -1,  1,  0, 1,
      -1,  1,  0, 1,
       1, -1,  1, 0,
       1,  1,  1, 1
    ]);

    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    this.srcTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.uniform2f(this.uResolution, this.canvas.width || 1, this.canvas.height || 1);

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
    const gl = this.gl;
    const vs = this._compile(gl.VERTEX_SHADER, vsSrc);
    const fs = this._compile(gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const msg = gl.getProgramInfoLog(prog) || "program link error";
      gl.deleteProgram(prog);
      throw new Error(msg);
    }
    return prog;
  }
}
