import type { Group, Material, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, VideoTexture, WebGLRenderer } from "three";
import type { Text } from "troika-three-text";
import type { CaseStudy } from "@/config/case-studies";
import { caseDepth, clamp, fadeByDistance, JOURNEY, storyDepth } from "./journey";
import { getCaseVideo, isCaseVideoReady, loadCaseVideo } from "@/lib/case-video";
import { drawStatusBar, loadStatusBarFont, STATUS_BAR } from "./status-bar";

const MODEL_URL = "/GLB/iphone_14_pro_max.glb";
const SCREEN_NODE = "YbXWdqEcjbfTKuN_0";
const SCREEN_MATERIAL = "GFNYbWjyDVGUwJd";
const ISLAND_MATERIAL = "YiceMpFVTpnmoaq";
const FONT_REGULAR = "/fonts/montserrat-latin-400-normal.woff";
const FONT_LIGHT = "/fonts/montserrat-latin-300-normal.woff";
// How far the story video sits behind its text. One full fade length (10) means
// the text finishes fading in just as the video starts.
const MEDIA_BEHIND = 20;

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
  pauseAll: () => void;
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
  const videos = studies.map((study) => (study.video ? getCaseVideo(study.video) : null));
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

  const videoTextures: (VideoTexture | null)[] = videos.map((video) => {
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
    };
    if (video.readyState >= 1) queueMicrotask(applyCover);
    else video.addEventListener("loadedmetadata", applyCover, { once: true });
    disposables.push(texture);
    return texture;
  });

  // Small front-facing parts at the top of the screen (Dynamic Island, front camera, speaker).
  const isIslandPart = (mesh: Mesh) => {
    if (mesh.name === SCREEN_NODE) return false;
    mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox;
    return !!b && b.min.y > 14.9 && Math.abs(b.min.x) < 1.2 && b.min.z < -0.3 && b.max.x - b.min.x < 2.5;
  };

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

  const createMedia = (index: number): Fader | null => (videoTextures[index] ? createPhone(index) : null);

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
        return [0, 1].map((p) => (p === fast ? -(0.3 + Math.random() * 0.1) : -(0.1 + Math.random() * 0.08)));
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
        // Mobile: the video phone is the main visual — big and centred in the upper
        // part of the screen, with the story text below, slightly overlapping it.
        item.body.fontSize = item.media ? 0.56 : 0.62;
        item.body.maxWidth = 13.4;
        item.body.position.set(0, item.media ? -3 : 4, storyZ);
        item.mediaBase = { x: 0.6 * s, y: 9 };
        item.media?.object.scale.setScalar(37);
        item.media?.object.rotation.set(0, -0.08 * s, 0);
        item.media?.object.position.set(item.mediaBase.x, item.mediaBase.y, storyZ - MEDIA_BEHIND);
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
        item.body.position.set(textSide === 0 ? 0 : 2.5 * scale * s, 0, storyZ);
        item.mediaBase = { x: 8.3 * scale * s, y: 2.5 };
        item.media?.object.scale.setScalar(30 * size);
        item.media?.object.rotation.set(0, -0.18 * s, 0);
        item.media?.object.position.set(item.mediaBase.x, item.mediaBase.y, storyZ - MEDIA_BEHIND);
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
      const src = studies[i]?.video;
      if (src) loadCaseVideo(src, i === index);
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

  // A video plays while any phone showing it is on screen (so it never freezes
  // mid zoom), plus the active case's video during its reading window.
  // Only the active case may have sound.
  const shown = studies.map(() => false);
  let activePlaying = false;
  const syncVideos = () => {
    videos.forEach((video, i) => {
      if (!video) return;
      const active = i === activeVideo;
      if (isCaseVideoReady(video) && (shown[i] || (active && activePlaying))) {
        const silent = active ? muted : true;
        if (video.muted !== silent) video.muted = silent;
        if (video.paused) video.play().catch(() => {});
      } else if (!video.paused) {
        video.pause();
      }
    });
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
      camera.rotation.z = 0;
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
          // Intro for the first case: phones start small and upright in the screen centre,
          // then zoom up and slide out to their resting poses.
          const out = index === 0 ? arrive : 1;
          phone.object.position.x = pose.x * out;
          phone.object.position.y = pose.y * out + Math.sin(wave) * 0.35 * out;
          phone.object.scale.setScalar(pose.scale * (0.3 + 0.7 * out));
          phone.object.rotation.set(
            (pose.rx + Math.sin(wave * 0.8) * 0.04) * out,
            (pose.ry + Math.cos(wave * 0.7) * 0.05) * out,
            (pose.rz + Math.sin(wave * 0.6) * 0.03) * out,
          );
        });

        if (item.media) {
          setOpacity(item.media, fadeFor(item.media.object.position.z));
          if (item.media.object.visible) {
            item.media.object.position.y = item.mediaBase.y + Math.sin(time * 0.8 + index) * 0.2;
          }
        }

        shown[index] = item.phones.some((phone) => phone.object.visible) || !!item.media?.object.visible;

        if (index === 0) item.title.scale.setScalar(0.45 + 0.55 * arrive);

        [item.title, item.body].forEach((text) => {
          const opacity = fadeFor(text.position.z) * (index === 0 && text === item.title ? arrive : 1);
          text.visible = opacity > 0.003 && text.position.z < camera.position.z - 0.5;
          text.fillOpacity = opacity;
        });
      });

      syncVideos();
      renderer.render(scene, camera);
    },
    setVideo: (index, playing) => {
      if (index !== activeVideo) {
        activeVideo = index;
        warm(index);
      }
      activePlaying = playing;
      syncVideos();
    },
    pauseAll: () => {
      shown.fill(false);
      activePlaying = false;
      syncVideos();
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
      });
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
    },
  };
}
