import { ImageResponse } from "next/og"

export const alt = "惜池集团 Xichi Group - 专业英国移民服务"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "white",
            marginBottom: 20,
            display: "flex",
          }}
        >
          惜池集团
        </div>
        <div
          style={{
            fontSize: 36,
            color: "#a0aec0",
            marginBottom: 40,
            display: "flex",
          }}
        >
          Xichi Group
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#e2e8f0",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.5,
            display: "flex",
          }}
        >
          专业英国移民服务 | AI智能评估 | 全球人才签证
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 20,
            color: "#718096",
            display: "flex",
          }}
        >
          xichigroup.com.cn
        </div>
      </div>
    ),
    { ...size },
  )
}
