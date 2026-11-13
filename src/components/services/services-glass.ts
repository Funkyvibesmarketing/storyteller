import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gsap } from "@/lib/gsap";
import { backgroundState } from "@/lib/background-state";

/**
 * WebGL glass for the service cards — ported from the old FunkyVibes "Our Expertise" cards.
 * Each DOM card stays the source of truth (its CSS transform / opacity / data-focus), and this
 * layer draws it as a thick rounded glass slab: the liquid background refracted through it,
 * the service video projected inside, lit bevel edges, a rim line, grain and a light-to-bold title.
 */

const NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;

const PANE_VS = /* glsl */ `
uniform float uTime;
uniform float uHover;
uniform vec2 uMouse;
uniform vec2 uSize;
uniform float uUnit;
uniform float uPhone;

varying vec2 vUv;
varying float vBackface;
varying vec3 vNormal;
varying vec3 vObjNormal;
varying vec3 vViewDir;
varying vec2 vLocal;

void main() {
  vec3 pos = position;
  vObjNormal = normal;
  vLocal = position.xy;
  vec2 n = pos.xy / uSize;

  pos.z += (sin(uTime * 0.5 + abs(n.x) * 3.0) * 0.1 + uHover * 0.2) * uUnit;
  pos.y -= n.x * mix(0.08, 0.14, uPhone) * uUnit;
  pos.x -= (uMouse.x - 0.5) * 0.03 * uUnit;

  vUv = n + 0.5;
  vUv.y += n.x * mix(0.08, 0.2, uPhone) * 0.2;

  vNormal = normalMatrix * normal;
  vViewDir = -vec3(modelViewMatrix * vec4(pos, 1.0)) / uUnit;

  vBackface = 0.0;
  if (normal.z < 0.0) {
    vUv.x = 1.0 - vUv.x;
    vBackface = 1.0;
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const PANE_FS = /* glsl */ `
uniform sampler2D tVideo;
uniform sampler2D tRefraction;
uniform float uTime;
uniform float uHover;
uniform vec2 uMouse;
uniform vec3 uColor;
uniform float uVideoBlend;
uniform vec2 uMediaSize;
uniform vec2 uSize;
uniform vec2 uResolution;
uniform float uOpacity;
uniform float uPass;
uniform float uRadius;
uniform float uRim;

varying vec2 vUv;
varying vec2 vLocal;
varying float vBackface;
varying vec3 vNormal;
varying vec3 vObjNormal;
varying vec3 vViewDir;

${NOISE}

vec2 scaleUV(vec2 uv, vec2 s) { return (uv - 0.5) / s + 0.5; }

vec3 radialBlur(sampler2D map, vec2 uv, float size, float quality) {
  vec3 color = vec3(0.0);
  float samples = 0.0;
  vec2 radius = size / vec2(1024.0);
  for (float d = 0.0; d < 6.283192; d += 6.283192 / 6.0) {
    vec2 t = radius * vec2(cos(d), sin(d));
    for (float i = 1.0; i <= 8.0; i += 1.0) {
      if (i >= quality) break;
      color += texture2D(map, uv + t * i / quality).rgb;
      samples += 1.0;
    }
  }
  return color / samples;
}

vec3 softVideo(vec2 uv, float split) {
  vec2 o = vec2(0.0035, 0.0);
  vec2 p = vec2(0.0, 0.0045);
  vec3 c = texture2D(tVideo, uv).rgb * 0.36;
  c += texture2D(tVideo, uv + o).rgb * 0.16;
  c += texture2D(tVideo, uv - o).rgb * 0.16;
  c += texture2D(tVideo, uv + p).rgb * 0.16;
  c += texture2D(tVideo, uv - p).rgb * 0.16;
  vec2 s = vec2(split, 0.0);
  c.r = mix(c.r, texture2D(tVideo, uv + s).r, 0.6);
  c.b = mix(c.b, texture2D(tVideo, uv - s).b, 0.6);
  return c;
}

float softLight(float b, float s) {
  return (s < 0.5) ? (2.0 * b * s + b * b * (1.0 - 2.0 * s)) : (sqrt(b) * (2.0 * s - 1.0) + 2.0 * b * (1.0 - s));
}
vec3 blendSoftLight(vec3 b, vec3 s, float o) {
  return vec3(softLight(b.r, s.r), softLight(b.g, s.g), softLight(b.b, s.b)) * o + b * (1.0 - o);
}
vec3 blendAdd(vec3 b, vec3 s, float o) {
  return min(b + s, vec3(1.0)) * o + b * (1.0 - o);
}

vec2 coverUV(vec2 uv) {
  float pa = uSize.x / uSize.y;
  float ma = uMediaSize.x / uMediaSize.y;
  vec2 r = vec2(min(pa / ma, 1.0), min(ma / pa, 1.0));
  return uv * r + (1.0 - r) * 0.5;
}

float grain(vec2 p, float t) {
  return fract(sin(dot(p + fract(t * 7.13) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  if (uPass > 0.5 && vBackface < 0.5) discard;

  vec2 screenUV = gl_FragCoord.xy / uResolution;
  float t = uTime;
  vec3 tint = uColor;

  vec2 flow = vec2(
    snoise(vUv * vec2(2.6, 1.8) + vec2(t * 0.07, -t * 0.05)),
    snoise(vUv * vec2(2.6, 1.8) + vec2(19.3 - t * 0.06, 7.1 + t * 0.04))
  );

  float edges = smoothstep(0.5, 6.0, abs(vViewDir.x - 0.5));
  vec3 viewN = normalize(vNormal);
  vec2 videoUV = coverUV(vUv) + flow * (0.012 + uHover * 0.006);
  videoUV -= viewN.xy * vec2(0.09, 0.06);
  videoUV = mix(videoUV, scaleUV(screenUV, vec2(0.7)), 0.18);
  videoUV = scaleUV(videoUV, vec2(1.04 + (1.0 - uVideoBlend) * 0.1));
  vec3 video = softVideo(videoUV, 0.003 + 0.006 * edges + uHover * 0.004);
  video = mix(tint * 0.35, video, uVideoBlend);

  float luma = dot(video, vec3(0.299, 0.587, 0.114));
  vec3 light = mix(vec3(luma), video, 0.55);
  light = smoothstep(0.04, 0.95, light) * 0.85;
  light = blendSoftLight(light, tint, 0.35);

  vec3 frost = vec3(0.3, 0.31, 0.33) + tint * 0.1;
  vec3 color = frost + light * 0.4;

  vec3 refraction = vec3(0.0);
  if (uPass < 0.5) {
    vec2 cell = floor(vUv * vec2(42.0, 24.0));
    vec2 chunk = vec2(snoise(cell * 0.21), snoise(cell * 0.21 + 13.7));
    vec2 ruv = screenUV - 0.02 * vNormal.xy - flow * (0.014 + uHover * 0.012) - chunk * 0.006;
    ruv = scaleUV(ruv, vec2(1.05 + uHover * 0.03));
    ruv += (uMouse - 0.5) * 0.015;
    vec2 disp = (vUv - 0.5) * 0.012;
    refraction = radialBlur(tRefraction, ruv, 1.6, 3.0);
    refraction.r = mix(refraction.r, texture2D(tRefraction, ruv + disp).r, 0.7);
    refraction.b = mix(refraction.b, texture2D(tRefraction, ruv - disp).b, 0.7);

    float sideFade = smoothstep(0.5, 0.12, abs(vUv.x - 0.5)) * smoothstep(0.5, 0.3, abs(vUv.y - 0.5));
    float transmit = mix(0.78, 0.4, luma * uVideoBlend * sideFade);
    vec3 through = refraction * 1.15;
    vec3 base = mix(frost, through + frost * 0.35, transmit);
    vec3 projected = light * mix(0.35, 0.85, sideFade) * mix(0.5, 1.0, uVideoBlend);
    color = 1.0 - (1.0 - base) * (1.0 - projected);
    color = blendSoftLight(color, tint, 0.25);
  }

  vec3 N = normalize(viewN + vec3(flow * 0.04, 0.0));
  vec3 V = normalize(vViewDir);
  vec3 R = reflect(-V, N);
  float fres = 0.04 + 0.96 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);
  float softbox = smoothstep(0.35, 0.95, R.y * 0.7 - R.x * 0.55 + 0.35);
  vec3 Rs = reflect(-V, viewN);
  float diag = Rs.x * 0.85 + Rs.y * 0.5;
  float strip = smoothstep(0.09, 0.0, abs(diag - 0.12));
  float strip2 = smoothstep(0.018, 0.0, abs(diag + 0.04));
  vec3 reflection = vec3(1.0, 0.97, 0.98) * (softbox * 0.5 + strip * 0.32 + strip2 * 0.38);
  color += reflection * mix(0.22, 0.9, fres) * (1.0 - vBackface * 0.6);

  color += smoothstep(0.85, 0.0, length((vUv - vec2(0.08, 0.98)) * vec2(1.0, 1.6))) * 0.07;


  vec2 offset = mix(vec2(0.5), vec2(uMouse.x, 1.0 - uMouse.y), uHover);
  color = blendAdd(color, tint, (0.1 + uHover * 0.22) * smoothstep(0.75, -0.1, length(vUv - offset)));
  color *= 1.0 + 0.25 * smoothstep(0.5, 0.0, abs(uHover - 0.5));

  vec2 q = abs(vLocal) - (uSize * 0.5 - uRadius);
  float sdf = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
  float band = 1.0 - smoothstep(-uRim - 1.0, -uRim + 0.5, sdf);
  float inner = smoothstep(-uRim - 2.0, -uRim - 0.5, sdf) * band;
  color *= 1.0 - inner * 0.22;

  float sideMask = smoothstep(0.12, 0.8, 1.0 - abs(vObjNormal.z));
  float frontBand = (1.0 - band) * (1.0 - sideMask);
  vec3 bandColor = mix(tint, vec3(1.0), 0.45) * 0.42 + refraction * 0.55;
  color = mix(color, bandColor, frontBand * 0.75);

  float lineW = max(1.5, uSize.x * 0.0035);
  float outer = smoothstep(-lineW - 1.0, -lineW + 0.2, sdf) * (1.0 - smoothstep(-0.6, 0.4, sdf));
  vec2 core = uSize * 0.5 - uRadius;
  vec2 edgeDir = vLocal - clamp(vLocal, -core, core);
  edgeDir = length(edgeDir) > 0.001 ? normalize(edgeDir) : vec2(0.0, 1.0);
  float lit = clamp(dot(edgeDir, normalize(vec2(-0.75, 0.66))) * 0.5 + 0.5, 0.0, 1.0);
  vec3 lineColor = mix(min(tint * 1.6 + 0.08, vec3(1.0)), vec3(1.0, 0.96, 0.96), pow(lit, 1.3) * 0.85);
  float lineMask = outer * (1.0 - sideMask);

  vec3 edgeGlass = vec3(0.3, 0.31, 0.34) + refraction * 0.6 + mix(tint, vec3(1.0), 0.6) * 0.1;
  float edgeLine = smoothstep(0.3, 0.0, abs(sideMask - 0.45));
  edgeGlass += mix(tint, vec3(1.0), 0.8) * edgeLine * 0.45;
  edgeGlass *= 0.9 + 0.25 * clamp(vObjNormal.y * 0.5 + 0.5, 0.0, 1.0);
  color = mix(color, edgeGlass, sideMask);

  color *= mix(0.78, 1.0, smoothstep(0.82, 0.22, length((vUv - 0.5) * vec2(1.0, 1.15))));

  color = mix(color, lineColor, lineMask);

  if (vBackface > 0.5) color = mix(color, vec3(0.3, 0.31, 0.34) + refraction * 0.6 + tint * 0.06, 0.45);

  color += (grain(gl_FragCoord.xy, 0.0) - 0.5) * 0.05;

  gl_FragColor = vec4(color, uPass > 0.5 ? 1.0 : uOpacity);
}
`;

const TEXT_VS = /* glsl */ `
uniform float uTime;
uniform float uHover;
uniform vec2 uMouse;
uniform vec2 uSize;
uniform float uUnit;
uniform float uPhone;
uniform float uLift;

varying vec2 vUv;

void main() {
  vec3 pos = position;
  vec2 n = pos.xy / uSize;

  pos.z += (sin(uTime * 0.5 + abs(n.x) * 3.0) * 0.1 + uHover * 0.2) * uUnit + uLift;
  pos.y -= n.x * mix(0.08, 0.14, uPhone) * uUnit;
  pos.x -= (uMouse.x - 0.5) * 0.03 * uUnit;

  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

// Two title textures — airy light caps and tight bold caps — cross-faded by focus.
const TEXT_FS = /* glsl */ `
uniform sampler2D tBold;
uniform sampler2D tLight;
uniform float uFocus;
uniform float uOpacity;
uniform float uGlitch;
uniform float uTime;

varying vec2 vUv;

float hash(float n) { return fract(sin(n) * 43758.5453); }
float alphaAt(vec2 uv) { return mix(texture2D(tLight, uv).a, texture2D(tBold, uv).a, uFocus); }

void main() {
  vec2 uv = vUv;
  float row = floor(uv.y * 22.0);
  float tick = floor(uTime * 14.0);
  float jump = step(0.62, hash(row * 1.73 + tick * 0.37));
  uv.x += (hash(row + tick) - 0.5) * jump * uGlitch * 0.06;

  float split = uGlitch * 0.012;
  float r = alphaAt(uv + vec2(split, 0.0));
  float g = alphaAt(uv);
  float b = alphaAt(uv - vec2(split, 0.0));
  float a = max(max(r, g), b);
  if (a < 0.004) discard;

  gl_FragColor = vec4(vec3(r, g, b) / a, a * uOpacity);
}
`;

const BG_VS = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Backdrop the glass refracts: drawn here in the liquid background's palette (diagonal silk
// bands), instead of copying the page's background canvas — that cross-canvas copy forced a GPU
// sync and made frame times uneven.
const BG_FS = /* glsl */ `
uniform float uTime;
uniform vec3 uPink;
uniform vec3 uPlum;
uniform float uAspect;
varying vec2 vUv;

${NOISE}

void main() {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  // Bands running along the background's ~152deg flow direction.
  float along = dot(p, normalize(vec2(-0.88, 0.47)));
  float warp = snoise(p * 0.9 + vec2(uTime * 0.05, -uTime * 0.03)) * 0.35;
  float bands = sin((along + warp) * 7.0 + uTime * 0.35) * 0.5 + 0.5;
  float sheen = smoothstep(0.78, 1.0, bands);
  vec3 deep = uPlum * 0.55;
  vec3 color = mix(deep, uPlum, bands * 0.8);
  color = mix(color, uPink, sheen * 0.55);
  gl_FragColor = vec4(color, 1.0);
}
`;

function roundedSlab(w: number, h: number, depth: number, radius: number, bevel: number) {
  const shape = new THREE.Shape();
  const x = -w / 2 + bevel;
  const y = -h / 2 + bevel;
  const iw = w - bevel * 2;
  const ih = h - bevel * 2;
  const r = Math.max(0.5, Math.min(radius - bevel, iw / 2, ih / 2));
  shape.moveTo(x + r, y);
  shape.lineTo(x + iw - r, y);
  shape.quadraticCurveTo(x + iw, y, x + iw, y + r);
  shape.lineTo(x + iw, y + ih - r);
  shape.quadraticCurveTo(x + iw, y + ih, x + iw - r, y + ih);
  shape.lineTo(x + r, y + ih);
  shape.quadraticCurveTo(x, y + ih, x, y + ih - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  let geo: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.1, depth - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 12,
  });
  geo.translate(0, 0, -(depth - bevel * 2) / 2);
  geo.deleteAttribute("uv");
  geo.deleteAttribute("normal");
  geo = mergeVertices(geo, 0.01);
  geo.computeVertexNormals();
  return geo;
}

export type GlassPointer = { u: number; v: number; strength: number; index: number };

type Pane = {
  index: number;
  el: HTMLElement;
  title: HTMLElement | null;
  lines: string[];
  media: HTMLVideoElement | HTMLImageElement | null;
  mesh: THREE.Mesh;
  uniforms: Record<string, THREE.IUniform>;
  textMesh: THREE.Mesh;
  textUniforms: Record<string, THREE.IUniform>;
  bold: { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture };
  light: { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture };
  textKey: string;
  hover: number;
};

export function createServicesGlass(opts: {
  section: HTMLElement;
  viewport: HTMLElement;
  cards: HTMLElement[];
  tints: string[];
  pointer: GlassPointer;
}) {
  const { section, viewport, cards, tints, pointer } = opts;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;

  const isSmall = () => window.innerWidth <= 767;
  const dpr = () => Math.min(window.devicePixelRatio || 1, isSmall() ? 1 : 1);

  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "pointer-events-none absolute inset-0 z-[1] h-full w-full";
  viewport.insertBefore(canvas, viewport.firstChild);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const onLost = (event: Event) => event.preventDefault();
  canvas.addEventListener("webglcontextlost", onLost, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 1, 20000);
  const refractionRT = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: true });

  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  blank.needsUpdate = true;

  // Backdrop refracted through the glass (liquid-background palette), drawn into the refraction pass.
  const bgUniforms = {
    uTime: { value: 0 },
    uAspect: { value: 1 },
    uPink: { value: new THREE.Color("#f874a0") },
    uPlum: { value: new THREE.Color("#782b81") },
  };
  // The backdrop eases to whatever palette the liquid background is heading to (per-service colours).
  const DEFAULT_GLOW = new THREE.Color("#f874a0");
  const DEFAULT_BASE = new THREE.Color("#782b81");
  const glowTarget = new THREE.Color();
  const baseTarget = new THREE.Color();
  const bgScene = new THREE.Scene();
  const bgMaterial = new THREE.ShaderMaterial({
    vertexShader: BG_VS,
    fragmentShader: BG_FS,
    uniforms: bgUniforms,
    depthTest: false,
    depthWrite: false,
  });
  const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMaterial);
  bgQuad.frustumCulled = false;
  bgScene.add(bgQuad);
  const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const shared = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    tRefraction: { value: refractionRT.texture },
    uPhone: { value: isSmall() ? 1 : 0 },
  };

  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [bgMaterial];
  const makeTextLayer = () => {
    const c = document.createElement("canvas");
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    textures.push(tex);
    return { canvas: c, tex };
  };

  const panes: Pane[] = cards.map((el, index) => {
    const media = el.querySelector<HTMLVideoElement | HTMLImageElement>("[data-svc-media]");
    let tex: THREE.Texture = blank;
    if (media instanceof HTMLVideoElement) {
      tex = new THREE.VideoTexture(media);
    } else if (media instanceof HTMLImageElement) {
      const imageTex = new THREE.Texture(media);
      const ready = () => (imageTex.needsUpdate = true);
      if (media.complete && media.naturalWidth) ready();
      else media.addEventListener("load", ready, { once: true });
      tex = imageTex;
    }
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    textures.push(tex);

    const uniforms: Record<string, THREE.IUniform> = {
      ...shared,
      tVideo: { value: tex },
      uVideoBlend: { value: 0 },
      uMediaSize: { value: new THREE.Vector2(16, 9) },
      uSize: { value: new THREE.Vector2(1, 1) },
      uUnit: { value: 1 },
      uRadius: { value: 20 },
      uRim: { value: 6 },
      uHover: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uColor: { value: new THREE.Color(tints[index % tints.length]) },
      uOpacity: { value: 1 },
      uPass: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: PANE_VS,
      fragmentShader: PANE_FS,
      uniforms,
      transparent: true,
      depthWrite: true,
      side: THREE.FrontSide,
    });
    materials.push(material);
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = false;
    scene.add(mesh);

    const bold = makeTextLayer();
    const light = makeTextLayer();
    const textUniforms: Record<string, THREE.IUniform> = {
      uTime: shared.uTime,
      uPhone: shared.uPhone,
      uHover: uniforms.uHover,
      uMouse: uniforms.uMouse,
      uSize: uniforms.uSize,
      uUnit: uniforms.uUnit,
      uLift: { value: 0 },
      tBold: { value: bold.tex },
      tLight: { value: light.tex },
      uFocus: { value: 1 },
      uOpacity: { value: 1 },
      uGlitch: { value: 0 },
    };
    const textMaterial = new THREE.ShaderMaterial({
      vertexShader: TEXT_VS,
      fragmentShader: TEXT_FS,
      uniforms: textUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    materials.push(textMaterial);
    const textMesh = new THREE.Mesh(new THREE.BufferGeometry(), textMaterial);
    textMesh.matrixAutoUpdate = false;
    textMesh.frustumCulled = false;
    textMesh.renderOrder = 10;
    scene.add(textMesh);

    const title = el.querySelector<HTMLElement>("[data-svc-title]");
    return {
      index,
      el,
      title,
      lines: (title?.dataset.lines ?? "").split("|"),
      media,
      mesh,
      uniforms,
      textMesh,
      textUniforms,
      bold,
      light,
      textKey: "",
      hover: 0,
    };
  });

  section.dataset.webgl = "true";

  const flipY = new THREE.Matrix4().makeScale(1, -1, 1);
  const tmp = new THREE.Matrix4();
  let width = 0;
  let height = 0;
  let inView = false;
  const io = new IntersectionObserver((entries) => (inView = entries[0].isIntersecting));
  io.observe(section);

  function resize() {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    const r = dpr();
    if (w === width && h === height && renderer.getPixelRatio() === r) return false;
    cachedPerspective = parseFloat(getComputedStyle(viewport).perspective) || 1000;
    bgUniforms.uAspect.value = w / Math.max(1, h);
    width = w;
    height = h;
    renderer.setPixelRatio(r);
    renderer.setSize(w, h, false);
    refractionRT.setSize(Math.max(2, Math.round(w * r * 0.3)), Math.max(2, Math.round(h * r * 0.3)));
    shared.uResolution.value.set(w * r, h * r);
    shared.uPhone.value = isSmall() ? 1 : 0;
    return true;
  }

  let geoKey = "";
  let cardW = 0;
  let cardH = 0;
  let geometry: THREE.BufferGeometry | null = null;
  let textGeometry: THREE.BufferGeometry | null = null;
  function syncGeometry(el: HTMLElement) {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (!w || !h) return;
    const key = `${w}x${h}`;
    if (key === geoKey) return;
    geoKey = key;
    cardW = w;
    cardH = h;
    for (const p of panes) p.textKey = "";
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || h * 0.1;
    const depth = Math.max(5, w * 0.02);
    geometry?.dispose();
    textGeometry?.dispose();
    geometry = roundedSlab(w, h, depth, radius, depth * 0.5);
    textGeometry = new THREE.PlaneGeometry(w, h, 32, 8);
    for (const p of panes) {
      p.mesh.geometry = geometry;
      p.textMesh.geometry = textGeometry;
      p.textUniforms.uLift.value = w * 0.045;
      p.uniforms.uSize.value.set(w, h);
      p.uniforms.uUnit.value = w / 4;
      p.uniforms.uRadius.value = radius;
      p.uniforms.uRim.value = Math.max(3, w * 0.011);
    }
  }

  let fontsReady = false;
  document.fonts?.ready.then(() => {
    fontsReady = true;
    for (const p of panes) p.textKey = "";
  });

  /** Paints the title (light + bold variants) using the DOM title's font family. */
  function drawTitle(p: Pane) {
    // Cached card size (no layout reads per frame).
    const w = cardW;
    const h = cardH;
    const text = p.title?.textContent ?? "";
    const key = `${text}|${w}x${h}|${fontsReady}`;
    if (!w || !h || key === p.textKey) return;
    p.textKey = key;

    // Split the title back into its lines (data-lines keeps the line breaks).
    let cursor = 0;
    const lines = p.lines.map((line) => {
      const part = text.replace(/\s+/g, "").slice(cursor, cursor + line.replace(/\s+/g, "").length);
      cursor += line.replace(/\s+/g, "").length;
      return part || line;
    });

    const family = p.title ? getComputedStyle(p.title).fontFamily : "sans-serif";
    const ratio = Math.min(1.5, 2048 / w);
    const variants: [typeof p.bold, number, number][] = [
      [p.bold, 700, 0.16],
      [p.light, 300, 0.16],
    ];
    for (const [layer, weight, trackingEm] of variants) {
      const c = layer.canvas;
      if (c.width !== Math.round(w * ratio) || c.height !== Math.round(h * ratio)) {
        c.width = Math.round(w * ratio);
        c.height = Math.round(h * ratio);
      }
      const ctx = c.getContext("2d");
      if (!ctx) continue;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);

      let size = w * 0.085;
      const measure = (str: string) => {
        ctx.font = `${weight} ${size}px ${family}`;
        let total = 0;
        for (const ch of str) total += ctx.measureText(ch).width + size * trackingEm;
        return Math.max(0, total - size * trackingEm);
      };
      const widest = Math.max(...lines.map(measure));
      if (widest > w * 0.84) size *= (w * 0.84) / widest;
      ctx.font = `${weight} ${size}px ${family}`;
      ctx.fillStyle = "#fff";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = size * 0.3;
      ctx.shadowOffsetY = size * 0.02;

      const lineHeight = size * 1.25;
      const top = h / 2 - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((str, i) => {
        let x = (w - measure(str)) / 2;
        const y = top + i * lineHeight;
        for (const ch of str) {
          ctx.fillText(ch, x, y);
          x += ctx.measureText(ch).width + size * trackingEm;
        }
      });
      layer.tex.needsUpdate = true;
    }
  }

  // Read once (and on resize) instead of every frame: getComputedStyle after the cards move forces a style recalc.
  let cachedPerspective = parseFloat(getComputedStyle(viewport).perspective) || 1000;

  function syncCamera() {
    const perspective = cachedPerspective;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(height / 2 / perspective));
    camera.aspect = width / height;
    camera.near = 1;
    camera.far = perspective + 20000;
    camera.position.set(0, 0, perspective);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  let last = performance.now();
  let backdropFrame = 0;

  function render() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!inView) return;

    // Size-dependent work (camera, slab geometry) only runs when the viewport actually changes.
    if (resize() || !geoKey) {
      syncCamera();
      if (panes[0]) syncGeometry(panes[0].el);
    }
    shared.uTime.value += dt;

    let anyVisible = false;
    for (const p of panes) {
      const opacity = parseFloat(p.el.style.opacity || "1");
      const visible = p.el.style.visibility !== "hidden" && opacity > 0.01;
      p.mesh.visible = visible;
      p.textMesh.visible = visible;
      if (!visible) continue;
      anyVisible = true;

      tmp.fromArray(new DOMMatrix(p.el.style.transform || "none").toFloat64Array());
      p.mesh.matrix.copy(flipY).multiply(tmp).multiply(flipY);
      p.mesh.matrixWorldNeedsUpdate = true;
      p.textMesh.matrix.copy(p.mesh.matrix);
      p.textMesh.matrixWorldNeedsUpdate = true;
      p.uniforms.uOpacity.value = opacity;

      const e = p.mesh.matrix.elements;
      const facing = e[10] / Math.hypot(e[8], e[9], e[10]);
      p.textUniforms.uGlitch.value = 0;
      p.textUniforms.uOpacity.value = opacity * (facing > 0 ? 1 : 0);
      p.textUniforms.uFocus.value = parseFloat(p.el.dataset.focus ?? "1");
      drawTitle(p);

      const media = p.media;
      if (media instanceof HTMLVideoElement) {
        const ready = media.readyState >= 2 && media.videoWidth > 0;
        if (ready) p.uniforms.uMediaSize.value.set(media.videoWidth, media.videoHeight);
        p.uniforms.uVideoBlend.value += ((ready ? 1 : 0) - p.uniforms.uVideoBlend.value) * Math.min(1, dt * 3);
      } else if (media instanceof HTMLImageElement && media.naturalWidth) {
        p.uniforms.uMediaSize.value.set(media.naturalWidth, media.naturalHeight);
        p.uniforms.uVideoBlend.value += (1 - p.uniforms.uVideoBlend.value) * Math.min(1, dt * 3);
      }

      const hovered = pointer.index === p.index ? pointer.strength : 0;
      p.hover += (hovered - p.hover) * Math.min(1, dt * 6);
      p.uniforms.uHover.value = p.hover;
      if (pointer.index === p.index) p.uniforms.uMouse.value.set(pointer.u, pointer.v);
    }

    if (!anyVisible) {
      renderer.setRenderTarget(null);
      renderer.clear();
      return;
    }

    bgUniforms.uTime.value = shared.uTime.value;
    const palette = backgroundState.colors;
    glowTarget.copy(DEFAULT_GLOW);
    baseTarget.copy(DEFAULT_BASE);
    if (palette) {
      glowTarget.set(palette[0]);
      baseTarget.set(palette[1]);
    }
    const ease = Math.min(1, dt * 1.6);
    bgUniforms.uPink.value.lerp(glowTarget, ease);
    bgUniforms.uPlum.value.lerp(baseTarget, ease);

    // Pass 1: the backdrop the glass refracts. It drifts slowly, so refresh it every other frame,
    // and skip the old second scene draw of the glass back faces (barely visible, doubled the GPU work).
    if (backdropFrame++ % 2 === 0) {
      renderer.setRenderTarget(refractionRT);
      renderer.render(bgScene, bgCamera);
    }

    // Pass 2: the glass itself, refracting pass 1.
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }

  gsap.ticker.add(render);

  return {
    dispose() {
      gsap.ticker.remove(render);
      io.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      geometry?.dispose();
      textGeometry?.dispose();
      bgQuad.geometry.dispose();
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
      refractionRT.dispose();
      renderer.dispose();
      canvas.remove();
      delete section.dataset.webgl;
    },
  };
}
