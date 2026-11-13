declare module "troika-three-text" {
  import { Mesh } from "three";

  export class Text extends Mesh {
    text: string;
    font: string | null;
    fontSize: number;
    maxWidth: number;
    lineHeight: number | "normal";
    letterSpacing: number;
    anchorX: number | "left" | "center" | "right";
    anchorY: number | "top" | "top-baseline" | "top-cap" | "top-ex" | "middle" | "bottom-baseline" | "bottom";
    overflowWrap: "normal" | "break-word";
    textAlign: "left" | "right" | "center" | "justify";
    color: number | string;
    fillOpacity: number;
    outlineWidth: number | string;
    outlineColor: number | string;
    outlineOpacity: number;
    outlineBlur: number | string;
    outlineOffsetX: number | string;
    outlineOffsetY: number | string;
    depthOffset: number;
    sdfGlyphSize: number | null;
    textRenderInfo: { blockBounds: [number, number, number, number] } | null;
    sync(callback?: () => void): void;
    dispose(): void;
  }
}
