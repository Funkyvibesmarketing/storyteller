import type {
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Texture,
  VideoTexture,
  WebGLRenderer,
} from "three";
import type { Text } from "troika-three-text";
import type { Direction, Fx, Scene, SceneBlock, TextBlock } from "@/config/case-studies";
import {
  cameraTravel,
  clamp,
  directionVector,
  easeOutCubic,
  easeOutQuart,
  smoothExit,
  FRAMES,
  JOURNEY,
  LIST,
  pickDirections,
  Q_START,
  SCATTER,
  sceneDepth,
  TYPE,
} from "./journey";
import { getCaseVideo, isCaseVideoReady, loadCaseVideo } from "@/lib/case-video";
import { drawStatusBar, loadStatusBarFont, STATUS_BAR } from "./status-bar";

const MODEL_URL = "/GLB/iphone_14_pro_max.glb";
const SCREEN_NODE = "YbXWdqEcjbfTKuN_0";
const SCREEN_MATERIAL = "GFNYbWjyDVGUwJd";
const ISLAND_MATERIAL = "YiceMpFVTpnmoaq";
const FONTS = {
  400: "/fonts/montserrat-latin-400-normal.woff",
  600: "/fonts/montserrat-latin-600-normal.woff",
  700: "/fonts/montserrat-latin-700-normal.woff",
} as const;
/** How far past the screen edge a block must be before it counts as "off screen". */
const OFFSCREEN = 1.12;
/** How far behind its rest spot a "depth" block starts. */
const DEPTH_ENTER = 40;
/** Lens distortion strength. */
const LENS = {
  /** Peak strength, reached partway through the exit. */
  desktop: 0.32,
  mobile: 0.22,
};
/** Incoming blocks start from just behind the active slide, relative to the reading distance. */
const ENTRY_DISTANCE = 1.15;
/** Largest tilt any block makes while flying in: 45% of 45° (≈20°). No spins or flips. */
const MAX_TILT = (Math.PI / 4) * 0.45;
/** How far a flight path bows sideways, as a share of the visible height. */
const ARC = 0.18;
/**
 * Inline bold words (list leads) are drawn twice: the regular glyphs, plus an outlined
 * copy on top that thickens them to a bold weight. Troika can't mix fonts in one line.
 */
const FAUX_BOLD = "3.5%";

export type JourneyFrame = {
  camX: number;
  camY: number;
  /** Scene clock: k = scene k at rest. */
  q: number;
  time: number;
};

export type JourneyStatus = {
  /** A video is playing in the centre — show the sound button. */
  sound: boolean;
};

export type JourneyScene = {
  resize: (width: number, height: number) => void;
  render: (frame: JourneyFrame) => JourneyStatus;
  pauseAll: () => void;
  setMuted: (muted: boolean) => void;
  dispose: () => void;
};

type Fader = {
  object: Object3D;
  materials: Material[];
  opacity: number;
};

type TextPart = {
  text: Text;
  role: "title" | "para" | "lead" | "marker";
  /** Paragraph index, -1 for the title. */
  para: number;
  bullet: boolean;
  /** Laid-out position inside the block (parts move away from it while scattering). */
  base: { x: number; y: number };
};

/** One flying piece of a "scatter" block: the title, or a paragraph with its marker/lead. */
type Unit = {
  para: number;
  center: { x: number; y: number };
  half: { x: number; y: number };
  enter: Direction;
  exit: Direction;
};

type Item = {
  block: SceneBlock;
  scene: number;
  order: number;
  group: Group;
  /** Media only — text never fades. */
  fader: Fader | null;
  parts: TextPart[];
  units: Unit[];
  /** Parts are currently moved off their base positions. */
  scattered: boolean;
  fxIn: Fx;
  fxOut: Fx;
  /** False until the text has been measured and laid out. */
  ready: boolean;
  layoutId: number;
  /** Width / height of the media content. */
  aspect: number;
  video: HTMLVideoElement | null;
  videoTexture: VideoTexture | null;
  /** Text: the camera flies through a paragraph gap of this block (nothing in its path). */
  gapAligned: boolean;
  /** Text: scale that keeps a depth-layered block at its design size. */
  layerScale: number;
  /** Fly-through: current text opacity (to skip redundant updates). */
  textOpacity: number;
  /** "browser" videos: the window drawn around the video. */
  browser?: { chrome: Mesh; redraw: () => void };
  /** Images only: how rolled-up into a tube the picture is (0 flat → 1 full pipe). */
  curl: { value: number } | null;
  screen: MeshBasicMaterial | null;
  /** The video has been started for this visit (stays on through the exit). */
  playing: boolean;
  /** Fully arrived and not yet leaving. */
  atRest: boolean;
  enter: Direction;
  exit: Direction;
  spin: number;
  rest: { x: number; y: number; z: number; ry: number };
  /** World offset from the first resting point to `via`. */
  drift: { x: number; y: number };
  half: { x: number; y: number };
  shown: boolean;
};

export type JourneyOptions = {
  /** Start muted? Default false: videos play with sound while active. */
  muted?: boolean;
  /** The browser refused sound (no click on the page yet) — videos fell back to muted. */
  onSoundBlocked?: () => void;
};

export async function createJourneyScene(
  canvas: HTMLCanvasElement,
  scenes: Scene[],
  options: JourneyOptions = {},
): Promise<JourneyScene | null> {
  const [THREE, { GLTFLoader }, { RoomEnvironment }, { Text: TroikaText }] = await Promise.all([
    import("three"),
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/environments/RoomEnvironment.js"),
    import("troika-three-text"),
  ]);

  let renderer: WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;

  const camera: PerspectiveCamera = new THREE.PerspectiveCamera(JOURNEY.fov, 1, 0.1, 400);
  const disposables: { dispose: () => void }[] = [environment, pmrem];
  let muted = options.muted ?? false;
  let mobile = false;
  let viewport = { w: 1, h: 1 };
  let disposed = false;

  // Fly-through depth of each scene: per-scene gaps (default 1 × spacing) add up.
  const scenePos: number[] = [0];
  for (let k = 1; k < scenes.length; k++) {
    scenePos.push(scenePos[k - 1] + JOURNEY.spacing * (scenes[k].gap ?? 1));
  }
  const depthOfScene = (index: number) =>
    JOURNEY.mode === "flythrough" ? JOURNEY.read + scenePos[index] : sceneDepth(index);
  const travelAt = (q: number) => {
    const last = scenes.length - 1;
    if (q <= 0) return q * JOURNEY.spacing;
    if (q >= last) return scenePos[last] + (q - last) * JOURNEY.spacing;
    const k = Math.floor(q);
    return scenePos[k] + (q - k) * (scenePos[k + 1] - scenePos[k]);
  };

  const needsPhone = scenes.some((s) => s.blocks.some((b) => b.kind === "video" && b.frame === "phone"));
  const gltf = needsPhone ? await new GLTFLoader().loadAsync(MODEL_URL) : null;

  /* ---------- iPhone model (video frame) ---------- */

  const barCanvas = document.createElement("canvas");
  drawStatusBar(barCanvas);
  const barTexture = new THREE.CanvasTexture(barCanvas);
  barTexture.colorSpace = THREE.SRGBColorSpace;
  barTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  disposables.push(barTexture);
  loadStatusBarFont().then(() => {
    drawStatusBar(barCanvas);
    barTexture.needsUpdate = true;
  });
  let shownMinute = new Date().getMinutes();
  const clock = window.setInterval(() => {
    const now = new Date();
    if (now.getMinutes() === shownMinute) return;
    shownMinute = now.getMinutes();
    drawStatusBar(barCanvas, now);
    barTexture.needsUpdate = true;
  }, 15000);

  const source = gltf?.scene ?? null;
  const box = source ? new THREE.Box3().setFromObject(source) : null;
  const size = box ? box.getSize(new THREE.Vector3()) : new THREE.Vector3(9, 19.5, 1);
  const center = box ? box.getCenter(new THREE.Vector3()) : new THREE.Vector3();
  const phoneAspect = size.x / size.y;

  let screenUv = { min: 0, max: 1, aspect: 9 / 19.5 };
  source?.traverse((child: Object3D) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as Material;
    if (mesh.name !== SCREEN_NODE && material?.name !== SCREEN_MATERIAL) return;
    mesh.geometry.computeBoundingBox();
    const screenBox = mesh.geometry.boundingBox;
    const uv = mesh.geometry.getAttribute("uv");
    let min = 0;
    let max = 1;
    if (uv) {
      min = Infinity;
      max = -Infinity;
      for (let i = 0; i < uv.count; i++) {
        const u = uv.getX(i);
        if (u < min) min = u;
        if (u > max) max = u;
      }
    }
    if (screenBox) {
      const screenSize = screenBox.getSize(new THREE.Vector3());
      screenUv = { min, max, aspect: screenSize.x / screenSize.y };
    }
  });

  /** Fit a texture to the phone screen like CSS `object-fit: cover` (the screen UVs are mirrored). */
  const coverScreen = (texture: Texture, mediaAspect: number) => {
    const range = screenUv.max - screenUv.min;
    let visibleX = 1;
    let visibleY = 1;
    if (mediaAspect > screenUv.aspect) visibleX = screenUv.aspect / mediaAspect;
    else visibleY = mediaAspect / screenUv.aspect;
    texture.repeat.set(-visibleX / range, visibleY);
    texture.offset.set((1 - visibleX) / 2 + (visibleX * screenUv.max) / range, (1 - visibleY) / 2);
  };

  const prepareScreenTexture = (texture: Texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    coverScreen(texture, 9 / 16);
    disposables.push(texture);
  };

  const createVideoTexture = (video: HTMLVideoElement): VideoTexture => {
    const texture = new THREE.VideoTexture(video);
    prepareScreenTexture(texture);
    const fit = () => coverScreen(texture, video.videoWidth / video.videoHeight || 9 / 16);
    if (video.readyState >= 1) queueMicrotask(fit);
    else video.addEventListener("loadedmetadata", fit, { once: true });
    return texture;
  };

  // Small front-facing parts at the top of the screen (Dynamic Island, front camera, speaker).
  const isIslandPart = (mesh: Mesh) => {
    if (mesh.name === SCREEN_NODE) return false;
    mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox;
    return !!b && b.min.y > 14.9 && Math.abs(b.min.x) < 1.2 && b.min.z < -0.3 && b.max.x - b.min.x < 2.5;
  };

  const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });
  disposables.push(depthOnly);

  const createPhone = () => {
    const model = source!.clone(true);
    const materials: Material[] = [];
    let screen: Mesh | null = null;

    model.traverse((child: Object3D) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;
      const original = mesh.material as Material;
      if (mesh.name === SCREEN_NODE || original?.name === SCREEN_MATERIAL) screen = mesh;
      const material = original.clone();
      material.userData.alwaysTransparent = material.transparent;
      if (isIslandPart(mesh)) {
        // The Dynamic Island sits in the same plane as the screen; without this the
        // video shows through it as a white pill. Draw it on top, matte black.
        material.polygonOffset = true;
        material.polygonOffsetFactor = -2;
        material.polygonOffsetUnits = -2;
        mesh.renderOrder = 3;
        if (material.name === ISLAND_MATERIAL) {
          const standard = material as MeshStandardMaterial;
          standard.color.setRGB(0, 0, 0);
          standard.metalness = 0;
          standard.roughness = 0.6;
        }
      }
      mesh.material = material;
      materials.push(material);
    });

    // Depth pre-pass: draw the phone's shape into the depth buffer first (no colour), so
    // while it fades only its front-most surface is coloured — otherwise the rear camera
    // and body show through the screen when the materials turn semi-transparent.
    const solid: Mesh[] = [];
    model.traverse((child: Object3D) => {
      if ((child as Mesh).isMesh) solid.push(child as Mesh);
    });
    solid.forEach((mesh) => {
      const depth = new THREE.Mesh(mesh.geometry, depthOnly);
      depth.renderOrder = -1;
      mesh.add(depth);
    });

    model.position.sub(center);
    const holder = new THREE.Group();
    holder.rotation.y = Math.PI;
    holder.scale.setScalar(1 / size.y);
    holder.add(model);
    const phone: Group = new THREE.Group();
    phone.add(holder);

    let screenMaterial: MeshBasicMaterial | null = null;
    const screenMesh = screen as Mesh | null;
    const screenBox = screenMesh?.geometry.boundingBox;
    if (screenMesh && screenBox) {
      const screenSize = screenBox.getSize(new THREE.Vector3());
      // Black until the poster arrives.
      screenMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
      screenMaterial.userData.alwaysTransparent = false;
      const replaced = materials.indexOf(screenMesh.material as Material);
      if (replaced >= 0) materials.splice(replaced, 1);
      screenMesh.material = screenMaterial;
      materials.push(screenMaterial);

      const barMaterial = new THREE.MeshBasicMaterial({
        map: barTexture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      });
      barMaterial.userData.alwaysTransparent = true;
      const barWidth = screenSize.x;
      const barHeight = barWidth * (STATUS_BAR.pointsTall / STATUS_BAR.pointsWide);
      const barGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
      const statusBar = new THREE.Mesh(barGeometry, barMaterial);
      statusBar.rotation.y = Math.PI;
      statusBar.position.set(
        (screenBox.min.x + screenBox.max.x) / 2,
        screenBox.max.y - barHeight / 2,
        screenBox.min.z - screenSize.y * 0.002,
      );
      statusBar.renderOrder = 2;
      screenMesh.add(statusBar);
      materials.push(barMaterial);
      disposables.push(barGeometry);
    }

    materials.forEach((material) => disposables.push(material));
    return { object: phone, materials, screen: screenMaterial };
  };

  const textureLoader = new THREE.TextureLoader();
  const showOnScreen = (screen: MeshBasicMaterial, texture: Texture) => {
    screen.map = texture;
    screen.color.setRGB(1, 1, 1);
    screen.needsUpdate = true;
  };

  /* ---------- Images (logos) ---------- */

  // Many columns so an image can bend smoothly into a round pipe.
  const planeGeometry = new THREE.PlaneGeometry(1, 1, 64, 1);
  disposables.push(planeGeometry);

  const drawFallback = (text: string) => {
    const fontFamily = getComputedStyle(document.body).fontFamily || "sans-serif";
    const canvasEl = document.createElement("canvas");
    const ctx = canvasEl.getContext("2d")!;
    const px = 512;
    ctx.font = `600 ${px}px ${fontFamily}`;
    const width = Math.ceil(ctx.measureText(text).width) + 8;
    canvasEl.width = width;
    canvasEl.height = Math.round(px * 1.05);
    ctx.font = `600 ${px}px ${fontFamily}`;
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(text, 4, px * 0.78);
    return canvasEl;
  };

  const loadImage = (src: string) =>
    new Promise<HTMLCanvasElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        // Redraw at a fixed, crisp resolution so small SVGs don't blur when zoomed.
        const height = Math.max(img.naturalHeight || 512, 1024);
        const width = Math.round(height * ((img.naturalWidth || 1) / (img.naturalHeight || 1)));
        const canvasEl = document.createElement("canvas");
        canvasEl.width = width;
        canvasEl.height = height;
        canvasEl.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvasEl);
      };
      img.onerror = reject;
      img.src = src;
    });

  const createImage = (item: Item, src: string, fallbackText?: string) => {
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      // Images hide what is behind them (text further back slides behind a photo instead
      // of being drawn over it); fully transparent pixels (logo backgrounds) are skipped.
      depthWrite: true,
      // Only skip pixels that are (almost) fully transparent — a high threshold here made
      // images pop in at half opacity instead of fading.
      alphaTest: 0.01,
      toneMapped: false,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    material.userData.alwaysTransparent = true;
    // Roll the picture around a vertical axis: at curl 1 its width wraps into a full tube.
    const curl = { value: 0 };
    item.curl = curl;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uCurl = curl;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uCurl;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          if (uCurl > 0.001) {
            float radius = 1.0 / (6.2831853 * uCurl);
            float angle = transformed.x / radius;
            transformed.x = radius * sin(angle);
            transformed.z = -radius * (1.0 - cos(angle));
          }`,
        );
      // The inside of the pipe reads darker, like the back of a print.
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        "if (!gl_FrontFacing) outgoingLight *= 0.45;\n#include <opaque_fragment>",
      );
    };
    material.customProgramCacheKey = () => "journey-image-curl";
    disposables.push(material);
    const mesh = new THREE.Mesh(planeGeometry, material);
    // Images draw before text, so captions sitting on a picture always show on top.
    const backdrop = item.block.kind === "image" && item.block.backdrop === true;
    // Backdrops draw first and never hide anything; other images draw before text.
    mesh.renderOrder = backdrop ? -10 : -1;
    if (backdrop) {
      material.depthWrite = false;
      material.alphaTest = 0;
    }
    item.group.add(mesh);
    item.fader = { object: item.group, materials: [material], opacity: 0 };

    loadImage(src)
      .catch(async () => {
        if (!fallbackText) throw new Error(`Missing image ${src}`);
        await document.fonts?.ready;
        return drawFallback(fallbackText);
      })
      .then((canvasEl) => {
        if (disposed) return;
        const texture = new THREE.CanvasTexture(canvasEl);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        disposables.push(texture);
        material.map = texture;
        material.needsUpdate = true;
        item.aspect = canvasEl.width / canvasEl.height;
        if (viewport.w > 1) layoutItem(item);
      })
      .catch(() => {});
  };

  /* ---------- Flat video (a plain panel, e.g. a screen recording) ---------- */

  /** Browser window chrome around a "browser" video, as a share of the video width. */
  const BROWSER = { bar: 0.045, border: 0.005, radius: 0.012 };

  const drawBrowser = (canvasEl: HTMLCanvasElement, aspect: number, url: string) => {
    // Canvas covers the whole window: border + title bar + video area.
    const W = 2048;
    const border = W * BROWSER.border;
    const bar = W * BROWSER.bar;
    const H = Math.round(W / aspect + bar + border * 2);
    canvasEl.width = W + Math.round(border * 2);
    canvasEl.height = H;
    const ctx = canvasEl.getContext("2d")!;
    const w = canvasEl.width;
    const r = W * BROWSER.radius;
    ctx.clearRect(0, 0, w, H);
    ctx.beginPath();
    ctx.roundRect(0, 0, w, H, r);
    ctx.fillStyle = "#1c1b22";
    ctx.fill();
    // Title bar.
    ctx.beginPath();
    ctx.roundRect(0, 0, w, bar + border, [r, r, 0, 0]);
    ctx.fillStyle = "#2a2932";
    ctx.fill();
    // Window dots.
    const cy = (bar + border) / 2;
    const dot = bar * 0.16;
    ["#ff5f57", "#febc2e", "#28c840"].forEach((colour, i) => {
      ctx.beginPath();
      ctx.arc(border + bar * 0.55 + i * dot * 3.2, cy, dot, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.fill();
    });
    // Address bar.
    const pillW = w * 0.42;
    const pillH = bar * 0.56;
    ctx.beginPath();
    ctx.roundRect((w - pillW) / 2, cy - pillH / 2, pillW, pillH, pillH / 2);
    ctx.fillStyle = "#3a3943";
    ctx.fill();
    const fontFamily = getComputedStyle(document.body).fontFamily || "sans-serif";
    ctx.font = `400 ${Math.round(pillH * 0.5)}px ${fontFamily}`;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(url, w / 2, cy + 1);
  };

  const createFlatVideo = (item: Item, poster: string, src?: string, browserUrl?: string) => {
    const material = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, toneMapped: false, opacity: 0 });
    material.userData.alwaysTransparent = true;
    disposables.push(material);
    const screenMesh = new THREE.Mesh(planeGeometry, material);
    item.group.add(screenMesh);
    const materials: Material[] = [material];

    if (browserUrl !== undefined) {
      // The window sits just behind the video; redrawn whenever the video's shape is known.
      const chromeCanvas = document.createElement("canvas");
      const chromeTexture = new THREE.CanvasTexture(chromeCanvas);
      chromeTexture.colorSpace = THREE.SRGBColorSpace;
      chromeTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const chromeMaterial = new THREE.MeshBasicMaterial({
        map: chromeTexture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        opacity: 0,
      });
      chromeMaterial.userData.alwaysTransparent = true;
      const chrome = new THREE.Mesh(planeGeometry, chromeMaterial);
      chrome.renderOrder = -2;
      chrome.position.z = -0.02;
      item.group.add(chrome);
      materials.push(chromeMaterial);
      disposables.push(chromeTexture, chromeMaterial);
      item.browser = {
        chrome,
        redraw: () => {
          drawBrowser(chromeCanvas, item.aspect, browserUrl);
          chromeTexture.needsUpdate = true;
        },
      };
      item.browser.redraw();
      document.fonts?.ready.then(() => !disposed && item.browser?.redraw());
    }
    item.fader = { object: item.group, materials, opacity: 0 };
    item.screen = material;
    item.aspect = 16 / 9;

    const fitTo = (aspect: number) => {
      if (!aspect || Math.abs(aspect - item.aspect) < 0.001) return;
      item.aspect = aspect;
      item.browser?.redraw();
      if (viewport.w > 1) layoutItem(item);
    };

    if (src) {
      const video = getCaseVideo(src);
      const texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      disposables.push(texture);
      item.video = video;
      item.videoTexture = texture;
      const fromVideo = () => fitTo(video.videoWidth / video.videoHeight);
      if (video.readyState >= 1) queueMicrotask(fromVideo);
      else video.addEventListener("loadedmetadata", fromVideo, { once: true });
    }

    textureLoader.load(poster, (texture) => {
      if (disposed) return;
      texture.colorSpace = THREE.SRGBColorSpace;
      disposables.push(texture);
      const image = texture.image as { width: number; height: number };
      if (!item.video || item.video.readyState < 1) fitTo(image.width / image.height);
      if (material.map !== item.videoTexture || !item.videoTexture) showOnScreen(material, texture);
    });
  };

  /* ---------- Text ---------- */

  /** Resolves once troika has laid the text out (it skips the callback when nothing changed). */
  const synced = (text: Text) =>
    new Promise<void>((resolve) => {
      const state = text as unknown as {
        _needsSync?: boolean;
        _isSyncing?: boolean;
        addEventListener: (type: string, listener: () => void) => void;
        removeEventListener: (type: string, listener: () => void) => void;
      };
      if (state._needsSync) {
        text.sync(() => resolve());
      } else if (state._isSyncing) {
        const done = () => {
          state.removeEventListener("synccomplete", done);
          resolve();
        };
        state.addEventListener("synccomplete", done);
      } else {
        resolve();
      }
    });

  const createText = (item: Item, block: TextBlock) => {
    const add = (value: string, weight: 400 | 600 | 700, role: TextPart["role"], para: number, bullet = false) => {
      const text = new TroikaText();
      text.text = value;
      text.font = FONTS[weight];
      text.color = block.color ?? 0xffffff;
      text.anchorX = "left";
      text.anchorY = "top-cap";
      text.textAlign = "left";
      text.overflowWrap = "break-word";
      if (block.shadow && role !== "lead") {
        // Figma text-shadow 0 6px 17px rgba(0,0,0,0.35), as a soft offset blur.
        text.outlineWidth = 0;
        text.outlineBlur = "35%";
        text.outlineOffsetY = "-12%";
        text.outlineColor = 0x000000;
        text.outlineOpacity = 0.35;
      }
      if (role === "lead") {
        text.outlineWidth = FAUX_BOLD;
        text.outlineColor = block.color ?? 0xffffff;
        text.renderOrder = 1;
      }
      item.group.add(text);
      disposables.push(text);
      item.parts.push({ text, role, para, bullet, base: { x: 0, y: 0 } });
    };

    if (block.title) add(block.title, 700, "title", -1);
    block.paragraphs?.forEach((paragraph, index) => {
      if (typeof paragraph === "string") {
        add(paragraph, block.weight ?? 400, "para", index);
        return;
      }
      add(`${paragraph.lead ?? ""}${paragraph.text}`, 400, "para", index);
      if (paragraph.lead) add(paragraph.lead, 400, "lead", index);
      if (paragraph.marker) add(paragraph.marker, 700, "marker", index, paragraph.marker === "•");
    });
  };

  /* ---------- Build every block ---------- */

  const items: Item[] = [];
  scenes.forEach((sceneData, sceneIndex) => {
    sceneData.blocks.forEach((block, order) => {
      const { enter, exit } = pickDirections(`${sceneIndex}:${order}:${block.kind}`, block.enter, block.exit);
      const group: Group = new THREE.Group();
      group.visible = false;
      scene.add(group);
      const item: Item = {
        block,
        scene: sceneIndex,
        order,
        group,
        fader: null,
        parts: [],
        units: [],
        scattered: false,
        fxIn: block.fx ?? "auto",
        fxOut: block.fxOut ?? "auto",
        ready: block.kind !== "text",
        layoutId: 0,
        aspect: 1,
        video: null,
        videoTexture: null,
        curl: null,
        layerScale: 1,
        gapAligned: false,
        textOpacity: -1,
        screen: null,
        playing: false,
        atRest: false,
        enter,
        exit,
        spin: block.spin ?? 1,
        rest: { x: 0, y: 0, z: -depthOfScene(sceneIndex), ry: 0 },
        drift: { x: 0, y: 0 },
        half: { x: 1, y: 1 },
        shown: false,
      };

      if (block.kind === "text") {
        createText(item, block);
      } else if (block.kind === "image") {
        createImage(item, block.src, block.fallbackText);
      } else if (block.kind === "video" && (block.frame === "flat" || block.frame === "browser")) {
        createFlatVideo(item, block.poster, block.src, block.frame === "browser" ? (block.url ?? "") : undefined);
      } else if (block.kind === "video" && source) {
        const phone = createPhone();
        group.add(phone.object);
        item.aspect = phoneAspect;
        item.screen = phone.screen;
        item.fader = { object: group, materials: phone.materials, opacity: 1 };
        if (block.src) {
          item.video = getCaseVideo(block.src);
          item.videoTexture = createVideoTexture(item.video);
        }
        textureLoader.load(block.poster, (texture) => {
          if (disposed || !item.screen) return;
          prepareScreenTexture(texture);
          const image = texture.image as { width: number; height: number };
          coverScreen(texture, image.width / image.height || 9 / 16);
          // Don't cover a video that already started.
          if (item.screen.map !== item.videoTexture || !item.videoTexture) showOnScreen(item.screen, texture);
        });
      }

      items.push(item);
    });
  });

  /** Images of one slide that share a single rolling pipe on the way in ("pipe" fx). */
  const pipes = scenes.map((_, index) =>
    items.filter((item) => item.scene === index && item.curl && item.fxIn === "pipe"),
  );

  /**
   * Depth layer of a block (world units behind its scene). In the fly-through, blocks of
   * one scene are spread in depth automatically so the camera passes them one by one.
   */
  const layerOf = (item: Item) => {
    if (item.block.depth !== undefined) return item.block.depth;
    if (JOURNEY.mode !== "flythrough") return 0;
    const count = items.filter((other) => other.scene === item.scene).length;
    const gap = count > 1 ? Math.min(JOURNEY.blockGap, JOURNEY.blockSpread / (count - 1)) : 0;
    return item.order * gap;
  };

  /**
   * Fly-through lane (desktop): a slide's single centred block moves into the left or
   * right half, inner edge just past the centre line. Then perspective alone makes it
   * arrive from the centre and leave out of its own side — exactly like the reference,
   * where only headlines sit dead centre.
   */
  const laneOf = (item: Item): "left" | "right" | "center" => {
    const { block } = item;
    // Slides stay centred (they arrive from the middle); only an explicit `lane` moves one.
    return block.lane ?? "center";
  };
  const applyLane = (item: Item, centred: boolean) => {
    if (JOURNEY.mode !== "flythrough" || mobile || !centred) return;
    if (items.filter((other) => other.scene === item.scene).length > 1) return;
    const lane = laneOf(item);
    if (lane === "center") return;
    item.rest.x = (lane === "right" ? 1 : -1) * (item.half.x + JOURNEY.laneGap);
  };

  /* ---------- Layout: Figma px → world at rest distance ---------- */

  const metrics = () => {
    const { w, h } = viewport;
    const frame = mobile ? FRAMES.mobile : FRAMES.desktop;
    const scale = mobile
      ? clamp(Math.min(w / frame.w, h / 700), 0.85, 1.6)
      : Math.max(Math.min(w / frame.w, h / frame.h), 0.625);
    const worldPerPx = (2 * JOURNEY.read * Math.tan((JOURNEY.fov * Math.PI) / 360)) / h;
    const toWorld = (x: number, y: number) => ({
      x: ((x / frame.w) * w - w / 2) * worldPerPx,
      y: (h / 2 - (y / frame.h) * h) * worldPerPx,
    });
    return { frame, scale, worldPerPx, toWorld };
  };

  const layoutText = (item: Item, block: TextBlock) => {
    const { frame, scale, worldPerPx, toWorld } = metrics();
    const place = mobile ? block.mobile : block.desktop;
    const typo = TYPE[mobile ? "mobile" : "desktop"];
    const list = LIST[mobile ? "mobile" : "desktop"];
    const unit = scale * worldPerPx;
    const lineH = typo.line * unit;
    const maxWidth = place.w * unit;
    const listed = new Set(item.parts.filter((p) => p.role === "marker").map((p) => p.para));

    item.parts.forEach(({ text, role, para }) => {
      text.fontSize = typo.size * unit * (block.scale ?? 1);
      text.letterSpacing = typo.tracking / typo.size;
      text.lineHeight = typo.line / typo.size;
      text.maxWidth = role === "marker" ? Infinity : maxWidth - (listed.has(para) ? list.indent * unit : 0);
    });

    const id = ++item.layoutId;
    Promise.all(item.parts.map(({ text }) => synced(text))).then(() => {
      if (disposed || id !== item.layoutId) return;

      const lines = (text: Text) => {
        const b = text.textRenderInfo?.blockBounds;
        return b ? Math.max(1, Math.round((b[3] - b[1]) / lineH)) : 1;
      };

      // Stack title and paragraphs with one blank line between them, like the Figma frames.
      let y = 0;
      const title = item.parts.find((p) => p.role === "title");
      if (title) {
        title.text.position.set(0, 0, 0);
        y -= (lines(title.text) + (block.titleGap ?? 1)) * lineH;
      }
      const paragraphs = [...new Set(item.parts.filter((p) => p.para >= 0).map((p) => p.para))].sort((a, b) => a - b);
      paragraphs.forEach((index) => {
        const indent = listed.has(index) ? list.indent * unit : 0;
        let height = 1;
        item.parts
          .filter((p) => p.para === index)
          .forEach((part) => {
            if (part.role === "marker") {
              part.text.position.set((part.bullet ? list.bullet : list.number) * unit, y, 0);
              return;
            }
            part.text.position.set(indent, y, 0);
            if (part.role === "para") height = lines(part.text);
          });
        y -= (height + 1) * lineH;
      });

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      item.parts.forEach(({ text }) => {
        const b = text.textRenderInfo?.blockBounds;
        if (!b) return;
        minX = Math.min(minX, text.position.x + b[0]);
        maxX = Math.max(maxX, text.position.x + b[2]);
        minY = Math.min(minY, text.position.y + b[1]);
        maxY = Math.max(maxY, text.position.y + b[3]);
      });
      if (!Number.isFinite(minX)) return;

      // Centre the parts on the group so it spins around the middle of the block.
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      item.parts.forEach((part) => {
        part.text.position.x -= cx;
        part.text.position.y -= cy;
        part.text.rotation.set(0, 0, 0);
        part.base = { x: part.text.position.x, y: part.text.position.y };
      });
      item.scattered = false;

      // Scatter pieces: the title and each paragraph (with its marker and lead).
      const groups = [...new Set(item.parts.map((p) => p.para))].sort((a, b) => a - b);
      item.units = groups.map((para, k) => {
        let x0 = Infinity;
        let x1 = -Infinity;
        let y0 = Infinity;
        let y1 = -Infinity;
        item.parts
          .filter((p) => p.para === para)
          .forEach(({ text }) => {
            const b = text.textRenderInfo?.blockBounds;
            if (!b) return;
            x0 = Math.min(x0, text.position.x + b[0]);
            x1 = Math.max(x1, text.position.x + b[2]);
            y0 = Math.min(y0, text.position.y + b[1]);
            y1 = Math.max(y1, text.position.y + b[3]);
          });
        const turn = item.scene * 3 + k * 3;
        return {
          para,
          center: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 },
          half: { x: (x1 - x0) / 2, y: (y1 - y0) / 2 },
          enter: SCATTER[turn % SCATTER.length],
          exit: SCATTER[(turn + 4) % SCATTER.length],
        };
      });

      const anchor = toWorld(place.x ?? frame.w / 2, place.y ?? frame.h / 2);
      item.rest.x = place.x === undefined ? 0 : anchor.x + cx;
      item.rest.y = place.y === undefined ? 0 : anchor.y + cy;
      // Exit like the reference: line up the paragraph gap nearest the middle with the
      // camera's path, so the camera flies through the gap — text above rises out the top,
      // text below sinks out the bottom. Shifts the block by at most half a paragraph.
      item.gapAligned = false;
      if (JOURNEY.mode === "flythrough" && place.y === undefined && item.units.length > 1) {
        const stack = [...item.units].sort((a, b) => b.center.y - a.center.y);
        let best: number | null = null;
        for (let i = 0; i < stack.length - 1; i++) {
          const upper = stack[i].center.y - stack[i].half.y;
          const lower = stack[i + 1].center.y + stack[i + 1].half.y;
          if (upper - lower <= 0) continue;
          const mid = (upper + lower) / 2;
          if (best === null || Math.abs(mid) < Math.abs(best)) best = mid;
        }
        if (best !== null) {
          item.rest.y = -best;
          item.gapAligned = true;
        }
      }
      item.half = { x: (maxX - minX) / 2, y: (maxY - minY) / 2 };
      applyLane(item, place.x === undefined);
      // Depth layer: further back but scaled up, so at rest it still matches the design.
      const layer = layerOf(item);
      const grow = (JOURNEY.read + layer) / JOURNEY.read;
      item.layerScale = grow;
      item.rest.x *= grow;
      item.rest.y *= grow;
      item.rest.z = -depthOfScene(item.scene) - layer;
      item.half = { x: item.half.x * grow, y: item.half.y * grow };
      item.ready = true;
    });
  };

  const layoutItem = (item: Item) => {
    const { frame, scale, worldPerPx, toWorld } = metrics();
    const { block } = item;
    const place = mobile ? block.mobile : block.desktop;
    if (place.via) {
      const from = toWorld(place.x ?? frame.w / 2, place.y ?? frame.h / 2);
      const to = toWorld(place.via.x, place.via.y);
      item.drift = { x: to.x - from.x, y: to.y - from.y };
    } else {
      item.drift = { x: 0, y: 0 };
    }

    if (block.kind === "text") {
      layoutText(item, block);
      return;
    }

    const media = mobile ? block.mobile : block.desktop;
    // Depth layer: push the block further back (or forward) but grow it to match, so at
    // rest it still sits exactly at its design spot and size — only parallax changes.
    const layer = layerOf(item);
    const grow = (JOURNEY.read + layer) / JOURNEY.read;
    item.rest.z = -depthOfScene(item.scene) - layer;
    const height = media.h * scale * worldPerPx * grow;
    const width = height * item.aspect;
    const at = toWorld(media.x, media.y);
    item.rest.x = at.x * grow;
    item.rest.y = at.y * grow;
    item.half = { x: width / 2, y: height / 2 };
    const child = item.group.children[0];
    if (block.kind === "image" || block.frame !== "phone") {
      // z scales with the width so a rolled-up image pipe stays round.
      child?.scale.set(width, height, block.kind === "image" ? width : 1);
      if (item.browser) {
        // Window = video + border on every side + title bar on top; centred as a whole.
        const border = width * BROWSER.border;
        const bar = width * BROWSER.bar;
        const totalW = width + border * 2;
        const totalH = height + bar + border * 2;
        item.browser.chrome.scale.set(totalW, totalH, 1);
        child?.position.set(0, -(bar / 2), 0);
        item.half = { x: totalW / 2, y: totalH / 2 };
      }
    } else {
      child?.scale.setScalar(height);
      item.rest.ry = (media as { tilt?: number }).tilt ?? 0;
    }
    applyLane(item, Math.abs(media.x - (mobile ? FRAMES.mobile.w : FRAMES.desktop.w) / 2) < 40);
  };

  /* ---------- Helpers ---------- */

  const setOpacity = (fader: Fader, opacity: number) => {
    fader.object.visible = opacity > 0.003;
    if (Math.abs(opacity - fader.opacity) < 0.003) return;
    const wasOpaque = fader.opacity >= 0.999;
    const isOpaque = opacity >= 0.999;
    fader.opacity = opacity;
    fader.materials.forEach((material) => {
      material.opacity = opacity;
      if (wasOpaque !== isOpaque) {
        material.transparent = !isOpaque || material.userData.alwaysTransparent === true;
        material.needsUpdate = true;
      }
    });
  };

  /**
   * The pose a block has at the far end of its flight (scaled down to nothing as it
   * lands). Sides swing in like a door, top/bottom flip like a card, corners tumble,
   * depth spirals — and phones do a full turn so the GLB shows off its back.
   */
  const flightPose = (direction: Direction, sign: number, curl: number) => {
    // One main axis per move, like a real camera/card tilt — never all three at once.
    const v = directionVector(direction);
    if (v.camera || v.depth) return { rx: 0, ry: 0, rz: MAX_TILT * 0.6 * curl * sign, scale: 0 };
    if (v.x && v.y) return { rx: -v.y * MAX_TILT * 0.6, ry: v.x * MAX_TILT * 0.6, rz: 0, scale: 0.15 };
    if (v.x) return { rx: 0, ry: v.x * MAX_TILT, rz: v.x * MAX_TILT * 0.2 * sign, scale: 0.15 };
    return { rx: -v.y * MAX_TILT, ry: 0, rz: 0.05 * curl * sign, scale: 0.15 };
  };

  const warm = (sceneIndex: number) => {
    [sceneIndex, sceneIndex + 1].forEach((s) => {
      scenes[s]?.blocks.forEach((block) => {
        if (block.kind === "video" && block.src) loadCaseVideo(block.src, s === sceneIndex);
      });
    });
  };
  warm(0);

  const blockSound = (video: HTMLVideoElement) => {
    muted = true;
    video.muted = true;
    video.play().catch(() => {});
    options.onSoundBlocked?.();
  };

  let current = -1;
  const syncVideos = () => {
    items.forEach((item) => {
      const video = item.video;
      if (!video) return;
      if (item.playing && item.shown && isCaseVideoReady(video)) {
        // Sound on while the phone is active in the centre; muted on the way out.
        const silent =
          !(item.atRest && item.scene === current) || muted || (item.block.kind === "video" && item.block.sound === false);
        if (video.muted !== silent) {
          video.muted = silent;
          if (!silent) {
            // Without a click on the page, browsers pause a video that turns its sound
            // on. Then keep it playing muted and let the sound button offer the sound.
            window.setTimeout(() => {
              if (!video.muted && video.paused && item.playing) blockSound(video);
            }, 0);
          }
        }
        if (video.paused) {
          video.play().catch((error: unknown) => {
            if ((error as { name?: string })?.name === "NotAllowedError" && !video.muted) blockSound(video);
          });
        }
        if (item.screen && item.videoTexture && item.screen.map !== item.videoTexture && video.readyState >= 2) {
          showOnScreen(item.screen, item.videoTexture);
        }
      } else if (!video.paused) {
        video.pause();
      }
    });
  };

  /* ---------- Lens distortion ---------- */

  // The scene is rendered normally first; while a lens slide is active, that finished frame
  // is copied and redrawn through a magnifying-glass bulge (no colour fringing).
  // Colours stay identical because the copy is already tone-mapped and encoded.
  const drawingSize = new THREE.Vector2();
  const createFrameCopy = (width: number, height: number) => {
    const texture = new THREE.FramebufferTexture(width, height);
    // Smooth sampling — the distortion reads between pixels.
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  };
  let frameCopy = createFrameCopy(1, 1);
  const lensMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tFrame: { value: frameCopy },
      uStrength: { value: 0 },
      uAspect: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tFrame;
      uniform float uStrength;
      uniform float uAspect;
      varying vec2 vUv;
      // Magnifying-glass bulge around the centre of the screen, where the active
      // content sits. Fades to no distortion at the lens edge, so there is no seam.
      const float RADIUS = 0.62;
      vec2 bend(vec2 uv, float k) {
        vec2 c = uv - 0.5;
        float r = length(vec2(c.x * uAspect, c.y));
        if (r >= RADIUS || r < 1e-5) return uv;
        float t = r / RADIUS;
        float f = mix(1.0, pow(t, k), 1.0 - t * t);
        return 0.5 + c * f;
      }
      void main() {
        gl_FragColor = texture2D(tFrame, bend(vUv, uStrength));
      }
    `,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    toneMapped: false,
  });
  const lensGeometry = new THREE.PlaneGeometry(2, 2);
  const lensScene = new THREE.Scene();
  lensScene.add(new THREE.Mesh(lensGeometry, lensMaterial));
  const lensCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  disposables.push(lensMaterial, lensGeometry, { dispose: () => frameCopy.dispose() });
  const lensScenes = scenes.map((s) => s.lens === true);

  const smooth = (a: number, b: number, t: number) => {
    const x = clamp((t - a) / (b - a), 0, 1);
    return x * x * (3 - 2 * x);
  };

  /**
   * Lens strength for a lens slide: none while the content is active in the middle; it
   * starts once the slide begins to exit, grows, then is gone by the time it has left.
   */
  const lensAt = (q: number) => {
    let strength = 0;
    lensScenes.forEach((on, index) => {
      if (!on) return;
      const exit = clamp((q - index - JOURNEY.exit[0]) / (JOURNEY.exit[1] - JOURNEY.exit[0]), 0, 1);
      strength = Math.max(strength, smooth(0, 0.55, exit) * (1 - smooth(0.7, 1, exit)));
    });
    return strength;
  };

  /* ---------- Frame ---------- */

  return {
    resize: (width, height) => {
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      viewport = { w: width, h: height };
      mobile = width < 768;
      renderer.getDrawingBufferSize(drawingSize);
      frameCopy.dispose();
      frameCopy = createFrameCopy(drawingSize.x, drawingSize.y);
      lensMaterial.uniforms.tFrame.value = frameCopy;
      lensMaterial.uniforms.uAspect.value = width / height;
      items.forEach(layoutItem);
    },
    render: ({ camX, camY, q, time }) => {
      const travel =
        JOURNEY.mode === "flythrough"
          ? travelAt(q)
          : JOURNEY.spacing * (q - (JOURNEY.hold * Math.sin(2 * Math.PI * q)) / (2 * Math.PI));
      const camZ = -travel;
      camera.position.set(camX, camY, camZ);

      // Intro: the first scene arrives with a wide-angle "warp" that settles to normal.
      const fly = JOURNEY.mode === "flythrough";
      const arrive = fly ? 1 : easeOutCubic(clamp((q - Q_START) / 0.42, 0, 1));
      const away = 1 - arrive;
      const fov = JOURNEY.fov + away * away * 48;
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      // A slight banking roll while rushing between scenes, alternating side each time.
      camera.rotation.z = fly ? 0 : Math.sin(Math.PI * q) * 0.025;

      const nearest = clamp(Math.round(q), 0, scenes.length - 1);
      if (nearest !== current) {
        current = nearest;
        warm(nearest);
      }

      const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
      let sound = false;

      items.forEach((item) => {
        const u = q - item.scene;
        const delay = item.order * JOURNEY.stagger;
        const inDelay = item.fxIn === "pipe" ? 0 : delay;
        const enterStart = JOURNEY.enter[0] + inDelay;
        const enterEnd = JOURNEY.enter[1] + inDelay * 0.6;
        const exitStart = JOURNEY.exit[0] + delay;
        const exitEnd = JOURNEY.exit[1];

        const hide = () => {
          item.group.visible = false;
          item.shown = false;
          item.atRest = false;
          item.playing = false;
        };

        if (fly) {
          // Fly-through: the block never moves — the camera flies past it. A held block
          // travels slowly with the camera for a few slides first, then stays put.
          const holdSlides = item.block.hold ?? 0;
          let holdZ = item.rest.z;
          // A held block fades away quickly once its hold is over (it doesn't linger into
          // the next slide).
          let holdFade = 1;
          if (holdSlides > 0) {
            const startCam = item.rest.z + JOURNEY.read + layerOf(item);
            const moved = startCam - camZ;
            const travelled = clamp(moved, 0, holdSlides * JOURNEY.spacing);
            holdZ = item.rest.z - travelled * JOURNEY.holdFollow;
            holdFade = clamp(1 - (moved - holdSlides * JOURNEY.spacing) / JOURNEY.holdFade, 0, 1);
            if (holdFade <= 0.003) {
              hide();
              return;
            }
          }
          const rest = { ...item.rest, z: holdZ };
          if (!item.ready || camZ - rest.z < 0.5) {
            hide();
            return;
          }
          // Fade by depth, so items placed far to the side appear together with centred ones.
          // Text ignores its own depth layer (a far-back caption appears with its slide);
          // images and videos don't, so a deeper one arrives later — one after another.
          const isBackdrop = item.block.kind === "image" && item.block.backdrop === true;
          const dist = camZ - rest.z - (item.fader && !isBackdrop ? 0 : layerOf(item)) + (item.block.appear ?? 0);
          const fadeLength = item.block.fade ?? JOURNEY.fadeEnd - JOURNEY.fadeStart;
          let opacity = clamp((JOURNEY.fadeEnd - dist) / fadeLength, 0, 1);
          // Blocks right in the camera's path (no gap to fly through) fade out over the last
          // few units instead of filling the screen and vanishing in one frame.
          if (isBackdrop) {
            // Slow blend in after the previous slide, fade away before the camera reaches it.
            const [inFar, inNear] = JOURNEY.backdropIn;
            opacity = clamp((inFar - dist) / (inFar - inNear), 0, 1);
            const [far, near] = JOURNEY.backdropNear;
            opacity *= clamp((camZ - rest.z - near) / (far - near), 0, 1);
          }
          const inPath =
            !isBackdrop &&
            !item.gapAligned &&
            !((item.block.drift ?? JOURNEY.exitDrift) > 0) &&
            Math.abs(rest.x - camX) < item.half.x &&
            Math.abs(rest.y - camY) < item.half.y;
          if (inPath) opacity *= clamp((camZ - rest.z - 0.5) / JOURNEY.passFade, 0, 1);
          opacity *= holdFade;
          if (opacity <= 0.003) {
            hide();
            return;
          }
          if (item.curl) item.curl.value = 0;
          if (item.scattered) {
            item.parts.forEach((part) => {
              part.text.position.set(part.base.x, part.base.y, 0);
              part.text.rotation.set(0, 0, 0);
            });
            item.scattered = false;
          }
          const isPhone = item.block.kind === "video" && item.block.frame === "phone";
          // Phones float gently, like objects hanging in the space.
          const bob = isPhone ? Math.sin(time * 0.8 + item.scene * 1.7) * 0.18 : 0;

          // Exit like the reference: nothing is pushed off screen. After the reading point the
          // block drifts steadily sideways in 3D while the camera keeps flying at it, so
          // perspective does the rest — it grows and slides out, slowly at first, then faster,
          // staying fully opaque. "depth"/"camera" exits keep flying straight through.
          const ahead = camZ - rest.z;
          const reading = JOURNEY.read + layerOf(item);
          const past = Math.max(0, reading - ahead);
          let exitX = 0;
          let exitY = 0;
          const out = directionVector(item.exit);
          const drift = item.block.drift ?? JOURNEY.exitDrift;
          if (past > 0 && drift > 0 && !out.depth && !out.camera) {
            const length = Math.hypot(out.x, out.y) || 1;
            exitX = (out.x / length) * past * drift;
            exitY = (out.y / length) * past * drift * 0.7;
          }
          item.group.position.set(rest.x + exitX, rest.y + bob + exitY, rest.z);
          item.group.scale.setScalar(item.fader ? 1 : item.layerScale);
          item.group.rotation.set(
            isPhone ? Math.sin(time * 0.6 + item.scene) * 0.03 : 0,
            // Phones face straight ahead in the middle; their `tilt` (side view) only builds
            // up as they slide out.
            rest.ry * clamp(past / (reading * 0.5), 0, 1) + (isPhone ? Math.cos(time * 0.5 + item.scene) * 0.05 : 0),
            item.block.kind === "text" ? ((item.block.rotate ?? 0) * Math.PI) / 180 : 0,
          );
          if (item.fader) {
            setOpacity(item.fader, opacity);
            item.shown = item.group.visible;
          } else {
            item.group.visible = true;
            item.shown = true;
            if (Math.abs(opacity - item.textOpacity) > 0.003) {
              item.textOpacity = opacity;
              item.parts.forEach(({ text }) => {
                text.fillOpacity = opacity;
                text.outlineOpacity = opacity * (item.block.kind === "text" && item.block.shadow ? 0.35 : 1);
              });
            }
          }
          // Videos play with sound while their scene is the one in front of the camera.
          // …and are muted (sound button hidden) as soon as they start drifting out.
          item.atRest = opacity >= 0.999 && item.scene === nearest && past === 0 && ahead < reading + 12;
          if (item.atRest) item.playing = true;
          const hasSound = item.block.kind === "video" && item.block.sound !== false;
          if (item.video && hasSound && item.atRest) sound = true;
          return;
        }

        if (!item.ready || u <= enterStart || u >= exitEnd) {
          hide();
          return;
        }

        const e = clamp((u - enterStart) / (enterEnd - enterStart), 0, 1);
        const x = clamp((u - exitStart) / (exitEnd - exitStart), 0, 1);
        const entering = e < 1;
        const fx = entering ? item.fxIn : item.fxOut;
        const isPhone = item.block.kind === "video";
        // Which way this block's path bows / spirals — alternates from block to block.
        const curl = (item.scene + item.order) % 2 === 0 ? 1 : -1;
        // Glide towards `via` from mid-entry to mid-exit, so the corners of the path round off.
        const driftStart = (enterStart + enterEnd) / 2;
        const driftEnd = (exitStart + exitEnd) / 2;
        const g = clamp((u - driftStart) / (driftEnd - driftStart), 0, 1);
        const glide = g * g * (3 - 2 * g);
        const rest = {
          ...item.rest,
          x: item.rest.x + item.drift.x * glide,
          y: item.rest.y + item.drift.y * glide,
        };
        const ahead = Math.max(camZ - rest.z, 0.5);
        const visH = ahead * tanHalf * OFFSCREEN;
        const visW = visH * camera.aspect;

        if (camZ - rest.z < 0.6) {
          hide();
          return;
        }

        const pipe = pipes[item.scene];
        if (entering && fx === "pipe" && item.curl && pipe.length > 0) {
          // All images of the slide wrap around ONE pipe that comes out of the screen
          // turning (half a turn), then each peels off, unrolls flat and lands in place.
          const members = [...pipe].sort((a, b) => a.rest.x - b.rest.x);
          const spacing = 1.1;
          const widths = members.map((m) => m.half.x * 2 * spacing);
          const radius = widths.reduce((sum, w) => sum + w, 0) / (Math.PI * 2);
          const angleOf = (i: number) => (widths.slice(0, i).reduce((sum, w) => sum + w, 0) + widths[i] / 2) / radius;
          const mid = Math.floor((members.length - 1) / 2);
          const index = members.indexOf(item);
          const fly = easeOutCubic(clamp(e / 0.6, 0, 1));
          const spin = Math.PI * (1 - easeOutCubic(clamp(e / 0.8, 0, 1)));
          const unroll = smooth(0.5, 1, e);
          const angle = angleOf(index) - angleOf(mid) + spin;
          const center = { x: 0, y: 0, z: rest.z - DEPTH_ENTER * (1 - fly) };
          const onPipe = {
            x: center.x + radius * Math.sin(angle),
            y: center.y,
            z: center.z + radius * Math.cos(angle),
          };
          item.curl.value = ((item.half.x * 2) / (Math.PI * 2 * radius)) * (1 - unroll);
          const z = onPipe.z + (rest.z - onPipe.z) * unroll;
          if (camZ - z < 0.6) {
            hide();
            return;
          }
          item.group.position.set(onPipe.x + (rest.x - onPipe.x) * unroll, onPipe.y + (rest.y - onPipe.y) * unroll, z);
          item.group.scale.setScalar(1);
          item.group.rotation.set(0, angle + (rest.ry - angle) * unroll, 0);
        } else if (fx === "scatter" && item.units.length > 1) {
          // The block stays put; its title and paragraphs fly in from different sides
          // one after another and assemble in the middle (or explode apart on exit).
          item.group.position.set(rest.x, rest.y, rest.z);
          item.group.scale.setScalar(1);
          item.group.rotation.set(0, 0, 0);
          item.scattered = true;
          const n = item.units.length;
          const spread = Math.min(0.45, 0.12 * (n - 1));
          const progress = entering ? e : x;
          item.units.forEach((unit, k) => {
            const p = clamp((progress - (k / (n - 1)) * spread) / (1 - spread), 0, 1);
            const amt = entering ? 1 - easeOutCubic(p) : smoothExit(p);
            const vv = directionVector(entering ? unit.enter : unit.exit);
            const cx = rest.x + unit.center.x;
            const cy = rest.y + unit.center.y;
            let ox = 0;
            let oy = 0;
            if (vv.x < 0) ox = camX - visW - (cx + unit.half.x);
            if (vv.x > 0) ox = camX + visW - (cx - unit.half.x);
            if (vv.y > 0) oy = camY + visH - (cy - unit.half.y);
            if (vv.y < 0) oy = camY - visH - (cy + unit.half.y);
            const length = Math.hypot(vv.x, vv.y) || 1;
            const bend = k % 2 === 0 ? 1 : -1;
            const arc = Math.sin(Math.PI * clamp(amt, 0, 1)) * ARC * 0.6 * visH * bend;
            ox = ox * amt + (-vv.y / length) * arc;
            oy = oy * amt + (vv.x / length) * arc;
            item.parts.forEach((part) => {
              if (part.para !== unit.para) return;
              part.text.position.set(part.base.x + ox, part.base.y + oy, 0);
              const r = entering ? amt : 0;
              part.text.rotation.set(-vv.y * 0.6 * r, vv.x * 0.7 * r, (vv.x * 0.4 - vv.y * 0.3) * r * bend);
            });
          });
        } else {
          if (item.scattered) {
            item.parts.forEach((part) => {
              part.text.position.set(part.base.x, part.base.y, 0);
              part.text.rotation.set(0, 0, 0);
            });
            item.scattered = false;
          }

          // Smooth curves only: glide in and settle softly, ease away on the way out.
          // (No overshoot or bounce — scrubbed by scroll, those read as jerks.)
          // "pipe": fly in rolled up as a tube, then unroll flat in place.
          const pipeIn = entering && fx === "pipe";
          const travel = pipeIn ? clamp(e / 0.6, 0, 1) : e;
          if (item.curl) item.curl.value = pipeIn ? 1 - smooth(0.5, 1, e) : 0;
          const amount = entering
            ? 1 - (fx === "bounce" ? easeOutQuart(travel) : easeOutCubic(travel))
            : smoothExit(x);
          const flight = clamp(amount, 0, 1);
          const direction = entering ? item.enter : item.exit;
          const exitDistance = cameraTravel(item.scene + exitStart) * -1 - rest.z;
          const v = directionVector(direction);
          const length = Math.hypot(v.x, v.y) || 1;
          const pose = flightPose(direction, entering ? 1 : -1, curl);
          // Side/top entries: from just past the screen edge into the centre.
          const peeking = entering && !v.depth && !v.camera;
          const tilt = MAX_TILT * curl;
          if (fx === "roll") Object.assign(pose, { rx: 0, ry: 0, rz: tilt });
          if (fx === "flip") Object.assign(pose, v.x && !v.y ? { rx: 0, ry: tilt, rz: 0 } : { rx: tilt, ry: 0, rz: 0 });
          if (fx === "bounce") Object.assign(pose, { rx: pose.rx * 0.4, ry: pose.ry * 0.4, rz: pose.rz * 0.4 });
          // Stretch never rotates, and nothing rotates on the way out.
          if (fx === "stretch" || !entering) Object.assign(pose, { rx: 0, ry: 0, rz: 0 });
          // Safety net: never more than ~45° on any axis.
          pose.rx = clamp(pose.rx * item.spin, -MAX_TILT, MAX_TILT);
          pose.ry = clamp(pose.ry * item.spin, -MAX_TILT, MAX_TILT);
          pose.rz = clamp(pose.rz * item.spin, -MAX_TILT, MAX_TILT);

          // "slide" exits keep the exact size the block had while active.
          const slideOut = !entering && fx === "slide";
          const scale = slideOut || peeking ? 1 : 1 + pose.scale * amount;
          // Rubber-band stretch along the direction of travel, squash across it.
          // No rubber-band squash: it deforms the content and looks unreal.
          const pull = 0;
          let sx = scale * (1 + pull * Math.abs(v.x / length)) * (1 - pull * 0.18 * Math.abs(v.y / length));
          let sy = scale * (1 + pull * Math.abs(v.y / length)) * (1 - pull * 0.18 * Math.abs(v.x / length));
          if (v.depth || v.camera) {
            // Coming straight out of the screen: stretch tall and thin, then snap back.
            sx *= 1 - pull * 0.15;
            sy *= 1 + pull * 0.6;
          }
          const half = { x: item.half.x * Math.max(sx, 1), y: item.half.y * Math.max(sy, 1) };

          let offX = 0;
          let offY = 0;
          let offZ = 0;
          if (amount !== 0) {
            if (v.camera) {
              // From behind the camera (huge) into place, or out through the screen.
              offZ = amount * (camZ - rest.z + (entering ? -0.5 : 3));
            } else if (v.depth) {
              offZ = -DEPTH_ENTER * amount;
              if (fx === "auto") {
                // Spiral in/out around the rest spot.
                const angle = flight * Math.PI * 1.5;
                offX = Math.cos(angle) * flight * visH * 0.5 * curl;
                offY = Math.sin(angle) * flight * visH * 0.35;
              }
            } else if (peeking) {
              // From just past the edge (riding just behind the active slide) to the centre.
              const land = 1 - amount;
              const zPeek = camZ - JOURNEY.read * ENTRY_DISTANCE;
              offZ = (zPeek - rest.z) * (1 - land);
              const edgeH = Math.max(camZ - (rest.z + offZ), 0.5) * tanHalf * OFFSCREEN;
              const edgeW = edgeH * camera.aspect;
              let fullX = 0;
              let fullY = 0;
              if (v.x < 0) fullX = camX - edgeW - (rest.x + half.x);
              if (v.x > 0) fullX = camX + edgeW - (rest.x - half.x);
              if (v.y > 0) fullY = camY + edgeH - (rest.y - half.y);
              if (v.y < 0) fullY = camY - edgeH - (rest.y + half.y);
              const arc = fx === "auto" ? Math.sin(Math.PI * flight) * ARC * visH * curl : 0;
              offX = fullX * amount + (-v.y / length) * arc;
              offY = fullY * amount + (v.x / length) * arc;
            } else {
              // "slide" exits ride along with the camera so the block never grows — it just slides out.
              if (slideOut) offZ = camZ - exitDistance - rest.z;
              // Push the block exactly past the visible edge at its depth, however big it
              // has grown — so text can stay fully opaque and still never pop in or out.
              const edgeH = Math.max(camZ - (rest.z + offZ), 0.5) * tanHalf * OFFSCREEN;
              const edgeW = edgeH * camera.aspect;
              if (v.x < 0) offX = camX - edgeW - (rest.x + half.x);
              if (v.x > 0) offX = camX + edgeW - (rest.x - half.x);
              if (v.y > 0) offY = camY + edgeH - (rest.y - half.y);
              if (v.y < 0) offY = camY - edgeH - (rest.y + half.y);
              // Entries arrive on a slight curve; exits leave in a straight line.
              const arc = fx === "auto" && entering ? Math.sin(Math.PI * flight) * ARC * visH * curl : 0;
              offX = offX * amount + (-v.y / length) * arc;
              offY = offY * amount + (v.x / length) * arc;
            }
          }

          const z = rest.z + offZ;
          if (camZ - z < 0.6) {
            hide();
            return;
          }

          // Entering blocks tilt only mid-flight, straight at both ends.
          const s = peeking ? Math.sin(Math.PI * flight) : amount;
          const settled = clamp(1 - amount, 0, 1);
          const float = item.block.kind === "text" ? 0 : (item.block.float ?? 1);
          const phase = item.scene * 1.7 + item.order * 2.3;
          const bob = item.fader ? Math.sin(time * 0.8 + phase) * 0.18 * float * settled : 0;
          // Floating media also drift sideways and sway a touch (≈2° at float 1.5), each out of step.
          const drift = float > 1 ? Math.sin(time * 0.55 + phase * 1.3) * 0.12 * float * settled : 0;
          const sway = float > 1 ? Math.sin(time * 0.45 + phase) * 0.022 * float * settled : 0;
          item.group.position.set(rest.x + offX + drift, rest.y + offY + bob, z);
          item.group.scale.set(sx, sy, scale);
          item.group.rotation.set(
            pose.rx * s + (isPhone ? Math.sin(time * 0.6 + item.scene) * 0.03 * settled : 0),
            rest.ry + pose.ry * s + (isPhone ? Math.cos(time * 0.5 + item.scene) * 0.05 * settled : 0) + sway * 0.6,
            pose.rz * s + sway,
          );
        }

        if (item.fader) {
          // Media: 0% → 100% on the way in, 100% → 0% on the way out.
          const arriving = entering && item.fxIn === "pipe" ? clamp(e / 0.6, 0, 1) : e;
          setOpacity(item.fader, entering ? arriving : 1 - x);
          item.shown = item.group.visible;
        } else {
          // Text: always fully opaque.
          item.group.visible = true;
          item.shown = true;
        }

        // Videos: poster while arriving, play once in the centre, keep playing (muted) on the way out.
        item.atRest = !entering && x <= 0;
        if (item.atRest) item.playing = true;
        const hasSound = item.block.kind === "video" && item.block.sound !== false;
        if (item.video && hasSound && item.atRest && item.scene === nearest) sound = true;
      });

      syncVideos();
      renderer.render(scene, camera);

      const lens = fly ? 0 : lensAt(q) * (mobile ? LENS.mobile : LENS.desktop);
      if (lens > 0.002) {
        renderer.copyFramebufferToTexture(frameCopy);
        lensMaterial.uniforms.uStrength.value = lens;
        renderer.render(lensScene, lensCamera);
      }
      return { sound };
    },
    pauseAll: () => {
      items.forEach((item) => {
        item.shown = false;
        item.playing = false;
      });
      syncVideos();
    },
    setMuted: (value) => {
      muted = value;
      syncVideos();
    },
    dispose: () => {
      disposed = true;
      window.clearInterval(clock);
      items.forEach((item) => item.video?.pause());
      disposables.forEach((entry) => entry.dispose());
      renderer.dispose();
    },
  };
}
