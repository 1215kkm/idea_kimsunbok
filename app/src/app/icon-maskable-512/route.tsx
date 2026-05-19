import { ImageResponse } from "next/og";

export const runtime = "edge";

// Maskable 아이콘: 안드로이드가 적응형 아이콘으로 잘라낼 때
// 안전 영역(80%) 안에 콘텐츠가 들어가도록 패딩을 더 크게 줌.
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
          background: "#3B4CCA",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 360,
            height: 360,
            borderRadius: 80,
            background: "linear-gradient(135deg, #3B4CCA, #2D3A8C)",
            color: "#FFB800",
            fontSize: 220,
            fontWeight: 900,
            fontFamily: "sans-serif",
            letterSpacing: -4,
          }}
        >
          다
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
