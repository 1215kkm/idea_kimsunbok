import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #3B4CCA, #2D3A8C)",
          color: "#FFB800",
          fontSize: 110,
          fontWeight: 900,
          fontFamily: "sans-serif",
          letterSpacing: -2,
        }}
      >
        다
      </div>
    ),
    size,
  );
}
