import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 22,
          fontWeight: 900,
          fontFamily: "sans-serif",
          letterSpacing: -1,
        }}
      >
        다
      </div>
    ),
    size,
  );
}
