import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["600"], display: "swap" });

export const STATUS_BAR = {
  pointsWide: 430,
  pointsTall: 59,
  pixelScale: 4,
} as const;

const CENTER_Y = 29.5;
const TIME_CENTER_X = 70;
const RIGHT_EDGE = 400;

function fontSpec() {
  return `600 17px ${inter.style.fontFamily}, -apple-system, "SF Pro Text", system-ui, sans-serif`;
}

export function loadStatusBarFont() {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  return document.fonts
    .load(`600 17px ${inter.style.fontFamily}`)
    .then(() => undefined)
    .catch(() => undefined);
}

function formatTime(date: Date) {
  const hours = date.getHours() % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawCellular(ctx: CanvasRenderingContext2D, right: number) {
  const width = 3;
  const gap = 1.7;
  const heights = [4, 6.3, 8.7, 11];
  const total = heights.length * width + (heights.length - 1) * gap;
  const left = right - total;
  const bottom = CENTER_Y + 5.5;
  heights.forEach((height, i) => {
    roundedRect(ctx, left + i * (width + gap), bottom - height, width, height, 1);
    ctx.fill();
  });
  return left;
}

function drawWifi(ctx: CanvasRenderingContext2D, right: number) {
  const width = 15.3;
  const cx = right - width / 2;
  const tipY = CENTER_Y + 5.6;
  const start = Math.PI * 1.25;
  const end = Math.PI * 1.75;
  const bands = [
    { outer: 11, inner: 8.4 },
    { outer: 7, inner: 4.4 },
  ];

  bands.forEach(({ outer, inner }) => {
    ctx.beginPath();
    ctx.arc(cx, tipY, outer, start, end);
    ctx.arc(cx, tipY, inner, end, start, true);
    ctx.closePath();
    ctx.fill();
  });

  ctx.beginPath();
  ctx.moveTo(cx, tipY);
  ctx.arc(cx, tipY, 3, start, end);
  ctx.closePath();
  ctx.fill();

  return right - width;
}

function drawBattery(ctx: CanvasRenderingContext2D, right: number, level: number) {
  const capWidth = 1.4;
  const bodyWidth = 25.5;
  const bodyHeight = 12;
  const left = right - capWidth - 1 - bodyWidth;
  const top = CENTER_Y - bodyHeight / 2;

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  roundedRect(ctx, left + 0.5, top + 0.5, bodyWidth - 1, bodyHeight - 1, 3.6);
  ctx.stroke();
  ctx.globalAlpha = 0.4;
  roundedRect(ctx, left + bodyWidth + 1, CENTER_Y - 2, capWidth, 4, 0.7);
  ctx.fill();
  ctx.restore();

  const inset = 2;
  roundedRect(ctx, left + inset, top + inset, (bodyWidth - inset * 2) * level, bodyHeight - inset * 2, 1.8);
  ctx.fill();

  return left;
}

export function drawStatusBar(canvas: HTMLCanvasElement, date = new Date()) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { pointsWide, pointsTall, pixelScale } = STATUS_BAR;
  if (canvas.width !== pointsWide * pixelScale) canvas.width = pointsWide * pixelScale;
  if (canvas.height !== pointsTall * pixelScale) canvas.height = pointsTall * pixelScale;

  ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
  ctx.clearRect(0, 0, pointsWide, pointsTall);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";

  ctx.font = fontSpec();
  if ("letterSpacing" in ctx) ctx.letterSpacing = "-0.3px";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(formatTime(date), TIME_CENTER_X, CENTER_Y + 0.5);

  let edge = drawBattery(ctx, RIGHT_EDGE, 0.82);
  edge = drawWifi(ctx, edge - 5.5);
  drawCellular(ctx, edge - 5.5);
}
