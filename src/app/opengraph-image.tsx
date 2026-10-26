import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "linear-gradient(152deg, #f874a0 0%, #782b81 60%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", fontSize: 36, fontWeight: 600 }}>
          {siteConfig.name}
          <span style={{ color: "#ffffff" }}>.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 96, fontWeight: 700, lineHeight: 1 }}>
          <span>We craft digital</span>
          <span style={{ color: "#ffd6e5" }}>stories that move.</span>
        </div>
      </div>
    ),
    size,
  );
}
