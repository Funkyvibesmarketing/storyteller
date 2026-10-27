const PLAY_FALLBACK = 3000;

type Entry = {
  src: string;
  video: HTMLVideoElement;
  started: boolean;
  settled: boolean;
};

const entries = new Map<string, Entry>();
const pending: Entry[] = [];
let downloading: Entry | null = null;

function entryFor(src: string) {
  let entry = entries.get(src);
  if (!entry) {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "none";
    video.setAttribute("webkit-playsinline", "true");
    video.disablePictureInPicture = true;
    entry = { src, video, started: false, settled: false };
    entries.set(src, entry);
  }
  return entry;
}

function fullyBuffered(video: HTMLVideoElement) {
  const { buffered, duration } = video;
  if (!duration || !buffered.length) return false;
  return buffered.start(0) <= 0.25 && buffered.end(buffered.length - 1) >= duration - 0.25;
}

function next() {
  downloading = null;
  const entry = pending.shift();
  if (entry) begin(entry, true);
}

function settle(entry: Entry) {
  if (entry.settled) return;
  entry.settled = true;
  if (downloading === entry) next();
}

function begin(entry: Entry, owns: boolean) {
  if (entry.started) return;
  entry.started = true;
  if (owns) downloading = entry;
  const index = pending.indexOf(entry);
  if (index >= 0) pending.splice(index, 1);

  const { video } = entry;
  const markReady = () => {
    video.dataset.ready = "1";
  };
  const check = () => {
    if (fullyBuffered(video)) settle(entry);
  };

  video.addEventListener("canplaythrough", markReady, { once: true });
  video.addEventListener("canplay", () => window.setTimeout(markReady, PLAY_FALLBACK), { once: true });
  video.addEventListener("progress", check);
  video.addEventListener("canplaythrough", check);
  video.addEventListener("suspend", () => {
    if (video.readyState >= 4) settle(entry);
  });
  video.addEventListener(
    "error",
    () => {
      markReady();
      settle(entry);
    },
    { once: true },
  );

  video.preload = "auto";
  video.src = entry.src;
  video.load();
}

export function getCaseVideo(src: string) {
  return entryFor(src).video;
}

export function isCaseVideoReady(video: HTMLVideoElement) {
  return video.dataset.ready === "1";
}

export function loadCaseVideo(src: string, urgent = false) {
  const entry = entryFor(src);
  if (entry.started) return;
  if (!downloading) {
    begin(entry, true);
    return;
  }
  if (urgent) {
    begin(entry, false);
    return;
  }
  if (!pending.includes(entry)) pending.push(entry);
}

export function primeCaseVideo(src: string, timeout: number) {
  const entry = entryFor(src);
  loadCaseVideo(src, true);
  return new Promise<void>((resolve) => {
    const { video } = entry;
    if (video.readyState >= 3) {
      resolve();
      return;
    }
    const finish = () => {
      window.clearTimeout(timer);
      video.removeEventListener("canplay", finish);
      video.removeEventListener("error", finish);
      resolve();
    };
    const timer = window.setTimeout(finish, timeout);
    video.addEventListener("canplay", finish);
    video.addEventListener("error", finish);
  });
}
