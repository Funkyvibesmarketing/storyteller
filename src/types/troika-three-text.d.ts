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
    anchorY: number | "top" | "top-baseline" | "middle" | "bottom-baseline" | "bottom";
    textAlign: "left" | "right" | "center" | "justify";
    color: number | string;
    fillOpacity: number;
    depthOffset: number;
    sdfGlyphSize: number | null;
    textRenderInfo: { blockBounds: [number, number, number, number] } | null;
    sync(callback?: () => void): void;
    dispose(): void;
  }
}
