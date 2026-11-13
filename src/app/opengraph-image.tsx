import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name}: We tell your story`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

/** Link preview: the FVM mark, the brand name and the hero line, on the site's pink-to-plum gradient. */
export default async function OpengraphImage() {
  const mark = await readFile(join(process.cwd(), "public/images/fvm-mark.svg"));
  const markSrc = `data:image/svg+xml;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 72,
          padding: "0 96px",
          background: "linear-gradient(152deg, #f874a0 0%, #782b81 55%, #3d1242 100%)",
          color: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og, not the browser */}
        <img src={markSrc} width={300} height={300} alt="" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 10, textTransform: "uppercase", opacity: 0.85 }}>
            We tell
          </div>
          <div style={{ display: "flex", fontSize: 104, fontWeight: 700, lineHeight: 1, letterSpacing: 6, marginTop: 14 }}>
            YOUR STORY
          </div>
          <div style={{ display: "flex", fontSize: 32, marginTop: 44, opacity: 0.9 }}>{siteConfig.name}</div>
          <div style={{ display: "flex", fontSize: 24, marginTop: 12, opacity: 0.7, letterSpacing: 2 }}>
            Film &amp; photo · Websites · Social · Strategy · Branding
          </div>
        </div>
      </div>
    ),
    size,
  );
}
