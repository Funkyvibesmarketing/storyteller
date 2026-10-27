import type { Group, Material, Mesh, Object3D, PerspectiveCamera, VideoTexture, WebGLRenderer } from "three";
import type { Text } from "troika-three-text";
import type { CaseStudy } from "@/config/case-studies";
import { caseDepth, clamp, fadeByDistance, JOURNEY, storyDepth } from "./journey";
import { drawStatusBar, loadStatusBarFont, STATUS_BAR } from "./status-bar";

const MODEL_URL = "/GLB/iphone_14_pro_max.glb";
const SCREEN_NODE = "YbXWdqEcjbfTKuN_0";
const SCREEN_MATERIAL = "GFNYbWjyDVGUwJd";
const FONT_REGULAR = "/fonts/montserrat-latin-400-normal.woff";
const FONT_LIGHT = "/fonts/montserrat-latin-300-normal.woff";

export type JourneyFrame = {
  camX: number;
  camY: number;
  camZ: number;
  time: number;
  entry: number;
  speed: number;
  pointer: { x: number; y: number; inside: boolean };
};

export type JourneyScene = {
  resize: (width: number, height: number) => void;
  render: (frame: JourneyFrame) => void;
  setVideo: (index: number, playing: boolean) => void;
  setMuted: (muted: boolean) => void;
  dispose: () => void;
};

type Fader = {
  object: Object3D;
  materials: Material[];
  opacity: number;
};

type Pose = { x: number; y: number; z: number; rx: number; ry: number; rz: number; scale: number };

type CaseItem = {
  phones: Fader[];
  poses: Pose[];
  speeds: number[];
  media: Fader | null;
  mediaBase: { x: number; y: number };
  title: Text;
  body: Text;
  side: number;
};

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

function createVideo(src: string) {
  const video = document.createElement("video");
  video.src = encodeURI(src);
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "none";
  video.setAttribute("webkit-playsinline", "true");
  video.disablePictureInPicture = true;
  return video;
}

function drawRoundedMask(canvas: HTMLCanvasElement, aspect: number, radius: number) {
  const height = 512;
  const width = Math.round(height * aspect);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#fff";
    context.beginPath();
    context.roundRect(0, 0, width, height, radius * Math.min(width, height));
    context.fill();
  }
  return canvas;
}

export async function createJourneyScene(canvas: HTMLCanvasElement, studies: CaseStudy[]): Promise<JourneyScene | null> {
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

  const camera: PerspectiveCamera = new THREE.PerspectiveCamera(JOURNEY.fov, 1, 0.1, 200);
  const disposables: { dispose: () => void }[] = [environment, pmrem];
  const videos = studies.map((study) => (study.video ? createVideo(study.video) : null));
  let muted = true;
  let activeVideo = -1;
  let mobile = false;

  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  const source = gltf.scene;
  const box = new THREE.Box3().setFromObject(source);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

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


  let screenUv = { min: 0, max: 1, aspect: 9 / 19.5 };
  source.traverse((child: Object3D) => {
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

  const mediaFits: (((aspect: number) => void) | null)[] = studies.map(() => null);
  const mediaAspects = studies.map(() => 9 / 16);
  const videoTextures: (VideoTexture | null)[] = videos.map((video, index) => {
    if (!video) return null;
    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(-1 / (screenUv.max - screenUv.min), 1);
    texture.offset.set(screenUv.max / (screenUv.max - screenUv.min), 0);
    const applyCover = () => {
      const videoAspect = video.videoWidth / video.videoHeight || 9 / 16;
      const range = screenUv.max - screenUv.min;
      let visibleX = 1;
      let visibleY = 1;
      if (videoAspect > screenUv.aspect) visibleX = screenUv.aspect / videoAspect;
      else visibleY = videoAspect / screenUv.aspect;
      texture.repeat.set(-visibleX / range, visibleY);
      texture.offset.set((1 - visibleX) / 2 + (visibleX * screenUv.max) / range, (1 - visibleY) / 2);
      mediaAspects[index] = videoAspect;
      mediaFits[index]?.(videoAspect);
    };
    if (video.readyState >= 1) queueMicrotask(applyCover);
    else video.addEventListener("loadedmetadata", applyCover, { once: true });
    disposables.push(texture);
    return texture;
  });

  const createPhone = (index: number): Fader => {
    const model = source.clone(true);
    const materials: Material[] = [];
    let screen: Mesh | null = null;

    model.traverse((child: Object3D) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;
      const original = mesh.material as Material;
      if (mesh.name === SCREEN_NODE || original?.name === SCREEN_MATERIAL) screen = mesh;
      const material = original.clone();
      material.userData.alwaysTransparent = material.transparent;
      mesh.material = material;
      materials.push(material);
    });

    model.position.sub(center);
    const holder = new THREE.Group();
    holder.rotation.y = Math.PI;
    holder.scale.setScalar(1 / size.y);
    holder.add(model);
    const phone: Group = new THREE.Group();
    phone.add(holder);
    scene.add(phone);

    const screenMesh = screen as Mesh | null;
    const screenBox = screenMesh?.geometry.boundingBox;
    if (screenMesh && screenBox) {
      const screenSize = screenBox.getSize(new THREE.Vector3());
      const texture = videoTextures[index];
      if (texture) {
        const screenMaterial = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
        screenMaterial.userData.alwaysTransparent = false;
        const replaced = materials.indexOf(screenMesh.material as Material);
        if (replaced >= 0) materials.splice(replaced, 1);
        screenMesh.material = screenMaterial;
        materials.push(screenMaterial);
      }

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
    return { object: phone, materials, opacity: 1 };
  };

  const createMedia = (index: number): Fader | null => {
    const source = videoTextures[index];
    if (!source) return null;
    const texture = source.clone();
    texture.repeat.set(1, 1);
    texture.offset.set(0, 0);
    const maskCanvas = document.createElement("canvas");
    const mask = new THREE.CanvasTexture(maskCanvas);
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      alphaMap: mask,
      transparent: true,
      toneMapped: false,
    });
    material.userData.alwaysTransparent = true;
    const mesh = new THREE.Mesh(geometry, material);
    const fit = (aspect: number) => {
      drawRoundedMask(maskCanvas, aspect, 0.06);
      mask.needsUpdate = true;
      mesh.scale.x = mesh.scale.y * aspect;
    };
    fit(mediaAspects[index]);
    mediaFits[index] = fit;
    scene.add(mesh);
    disposables.push(geometry, material, texture, mask);
    return { object: mesh, materials: [material], opacity: 1 };
  };

  const createText = (
    value: string,
    options: { font: string; fontSize: number; letterSpacing?: number; lineHeight?: number },
  ) => {
    const text = new TroikaText();
    text.text = value;
    text.font = options.font;
    text.fontSize = options.fontSize;
    text.letterSpacing = options.letterSpacing ?? 0;
    text.lineHeight = options.lineHeight ?? 1.2;
    text.color = 0xffffff;
    text.textAlign = "left";
    scene.add(text);
    disposables.push(text);
    return text;
  };

  const items: CaseItem[] = studies.map((study, index) => {
    const phones = [createPhone(index), createPhone(index)];
    const media = createMedia(index);
    const title = createText(study.title.toUpperCase(), {
      font: FONT_LIGHT,
      fontSize: 3.4,
      letterSpacing: 0.02,
      lineHeight: 1.05,
    });
    const body = createText(study.paragraphs.join("\n\n"), { font: FONT_REGULAR, fontSize: 1, lineHeight: 1.45 });
    return {
      phones,
      poses: [],
      speeds: (() => {
        const fast = Math.random() < 0.5 ? 0 : 1;
        return [0, 1].map((p) => (p === fast ? -(0.28 + Math.random() * 0.14) : 0.22 + Math.random() * 0.14));
      })(),
      media,
      mediaBase: { x: 0, y: 0 },
      title,
      body,
      side: index % 2 === 0 ? 1 : -1,
    };
  });

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

  const layout = (aspect: number) => {
    const scale = clamp(aspect / 1.6, 0.62, 1.15);
    const size = Math.min(scale, 1);

    items.forEach((item, index) => {
      const titleZ = -caseDepth(index);
      const storyZ = -storyDepth(index);
      const s = item.side;

      item.title.anchorX = "center";
      item.title.anchorY = "middle";
      item.title.textAlign = "center";
      item.title.position.set(0, 0, titleZ);

      if (mobile) {
        item.title.fontSize = 1.9;
        item.title.maxWidth = 13;
        item.poses = [
          { x: -4.2 * s, y: 10, z: titleZ, rx: -0.35, ry: 0.5 * s, rz: 1.15 * s, scale: 12 },
          { x: 4.6 * s, y: -10.5, z: titleZ, rx: 0.15, ry: -0.45 * s, rz: -0.3 * s, scale: 12 },
        ];
        item.body.anchorX = "center";
        item.body.anchorY = "top";
        item.body.textAlign = "center";
        item.body.fontSize = 0.62;
        item.body.maxWidth = 13.4;
        item.body.position.set(0, item.media ? -1.5 : 4, storyZ);
        item.mediaBase = { x: 3.2 * s, y: 7.6 };
        if (item.media) item.media.object.scale.set(10 * mediaAspects[index], 10, 1);
        item.media?.object.position.set(item.mediaBase.x, item.mediaBase.y, storyZ + 6);
      } else {
        item.title.fontSize = 3.4 * size;
        item.title.maxWidth = 40 * scale;
        item.poses = [
          { x: -21 * scale * s, y: -3, z: titleZ, rx: -0.35, ry: 0.55 * s, rz: 1.15 * s, scale: 19 * size },
          { x: 21 * scale * s, y: 2.5, z: titleZ, rx: 0.15, ry: -0.5 * s, rz: -0.32 * s, scale: 19 * size },
        ];
        const textSide = item.media ? -s : 0;
        item.body.anchorX = textSide === 0 ? "center" : textSide < 0 ? "right" : "left";
        item.body.anchorY = "middle";
        item.body.textAlign = textSide === 0 ? "center" : "left";
        item.body.fontSize = 0.85 * size;
        item.body.maxWidth = 21 * scale;
        item.body.position.set(textSide * 1.5 * scale, 0, storyZ);
        item.mediaBase = { x: 9 * scale * s, y: 0.5 };
        if (item.media) item.media.object.scale.set(19 * size * mediaAspects[index], 19 * size, 1);
        item.media?.object.position.set(item.mediaBase.x, item.mediaBase.y, storyZ + 2);
      }

      item.phones.forEach((phone, p) => {
        const pose = item.poses[p];
        phone.object.position.set(pose.x, pose.y, pose.z);
        phone.object.rotation.set(pose.rx, pose.ry, pose.rz);
        phone.object.scale.setScalar(pose.scale);
      });

      item.title.sync();
      item.body.sync();
    });
  };

  const warm = (index: number) => {
    [index, index + 1].forEach((i) => {
      const video = videos[i];
      if (video && video.preload !== "auto") {
        video.preload = "auto";
        video.load();
      }
    });
  };
  warm(0);

  const streakCount = 520;
  const streakPositions = new Float32Array(streakCount * 6);
  const streakColors = new Float32Array(streakCount * 6);
  const white = new THREE.Color(0xffffff);
  const pink = new THREE.Color(0xff5fa8);
  const violet = new THREE.Color(0xb98cff);
  for (let i = 0; i < streakCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 5 + Math.pow(Math.random(), 0.6) * 38;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = 4 - Math.random() * 110;
    const length = 3 + Math.random() * 9;
    streakPositions.set([x, y, z, x, y, z - length], i * 6);
    const tone = Math.random();
    const color = tone < 0.45 ? white : tone < 0.8 ? pink : violet;
    streakColors.set([color.r * 0.15, color.g * 0.15, color.b * 0.15, color.r, color.g, color.b], i * 6);
  }
  const streakGeometry = new THREE.BufferGeometry();
  streakGeometry.setAttribute("position", new THREE.BufferAttribute(streakPositions, 3));
  streakGeometry.setAttribute("color", new THREE.BufferAttribute(streakColors, 3));
  const streakMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const streaks = new THREE.LineSegments(streakGeometry, streakMaterial);
  streaks.frustumCulled = false;
  scene.add(streaks);
  disposables.push(streakGeometry, streakMaterial);

  const fadeFor = (z: number) => {
    const ahead = camera.position.z - z;
    if (ahead < -2) return 0;
    return fadeByDistance(ahead);
  };

  return {
    resize: (width, height) => {
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      mobile = width < 768;
      layout(camera.aspect);
    },
    render: ({ camX, camY, camZ, time, entry, speed }) => {
      camera.position.set(camX, camY, camZ);
      const arrive = easeOutCubic(clamp(entry, 0, 1));
      const away = 1 - arrive;
      const fov = JOURNEY.fov + away * away * 48;
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      camera.rotation.z = away * away * 0.42;
      const glow = clamp(entry * 7, 0, 1) * clamp(1 - entry * 1.15, 0, 1);
      streaks.visible = glow > 0.003;
      streakMaterial.opacity = glow * clamp(0.45 + speed * 0.06, 0, 1);
      streaks.scale.z = 1 + glow * clamp(speed * 0.08, 0, 1.6);

      items.forEach((item, index) => {
        item.phones.forEach((phone, p) => {
          const pose = item.poses[p];
          const anchor = -(caseDepth(index) - JOURNEY.read);
          const z = pose.z + (camera.position.z - anchor) * item.speeds[p];
          phone.object.position.z = z;
          setOpacity(phone, fadeFor(z));
          if (!phone.object.visible) return;
          const wave = time * 0.9 + index * 1.7 + p * 2.3;
          const spin = index === 0 ? away : 0;
          const turn = p === 0 ? -1 : 1;
          phone.object.position.x = pose.x * (1 + spin * 1.5);
          phone.object.position.y = pose.y + Math.sin(wave) * 0.35 + spin * turn * 6;
          phone.object.rotation.set(
            pose.rx + Math.sin(wave * 0.8) * 0.04 + spin * 0.9,
            pose.ry + Math.cos(wave * 0.7) * 0.05 + spin * turn * 1.6,
            pose.rz + Math.sin(wave * 0.6) * 0.03 + spin * turn * Math.PI * 1.5,
          );
        });

        if (item.media) {
          setOpacity(item.media, fadeFor(item.media.object.position.z));
          if (item.media.object.visible) {
            item.media.object.position.y = item.mediaBase.y + Math.sin(time * 0.8 + index) * 0.2;
          }
        }

        if (index === 0) item.title.scale.setScalar(0.45 + 0.55 * arrive);

        [item.title, item.body].forEach((text) => {
          const opacity = fadeFor(text.position.z) * (index === 0 && text === item.title ? arrive : 1);
          text.visible = opacity > 0.003 && text.position.z < camera.position.z - 0.5;
          text.fillOpacity = opacity;
        });
      });

      renderer.render(scene, camera);
    },
    setVideo: (index, playing) => {
      if (index !== activeVideo) {
        activeVideo = index;
        warm(index);
        const video = videos[index];
        if (video) video.currentTime = 0;
      }
      videos.forEach((video, i) => {
        if (!video) return;
        if (i === activeVideo && playing) {
          video.muted = muted;
          if (video.paused) video.play().catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      });
    },
    setMuted: (value) => {
      muted = value;
      const video = videos[activeVideo];
      if (!video) return;
      video.muted = value;
      if (!value) video.play().catch(() => {});
    },
    dispose: () => {
      window.clearInterval(clock);
      videos.forEach((video) => {
        if (!video) return;
        video.pause();
        video.removeAttribute("src");
        video.load();
      });
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
    },
  };
}
