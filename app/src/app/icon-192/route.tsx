import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
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
    { width: 192, height: 192 },
  );
}
