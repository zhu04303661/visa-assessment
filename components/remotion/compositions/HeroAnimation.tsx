"use client"

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion"
import { ParticleField } from "../components/ParticleField"
import { DataFlow } from "../components/DataFlow"
import { CenterPulse } from "../components/CenterPulse"

export const HeroAnimation: React.FC = () => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  // 整体淡入效果
  const fadeIn = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp"
  })

  // 背景渐变动画
  const gradientShift = interpolate(
    frame,
    [0, durationInFrames],
    [0, 360],
    { extrapolateRight: "extend" }
  )

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(
          ${gradientShift}deg,
          rgba(139, 92, 246, 0.1) 0%,
          rgba(99, 102, 241, 0.05) 25%,
          rgba(59, 130, 246, 0.1) 50%,
          rgba(6, 182, 212, 0.05) 75%,
          rgba(16, 185, 129, 0.1) 100%
        )`,
        opacity: fadeIn
      }}
    >
      {/* 粒子背景 */}
      <ParticleField 
        particleCount={60} 
        colors={["#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4", "#10b981"]}
      />
      
      {/* 数据流效果 */}
      <div style={{ opacity: 0.4 }}>
        <DataFlow direction="up" streamCount={6} />
      </div>
      
      {/* 中心脉冲图标 */}
      <CenterPulse text="智能评估" icon="ai" />
    </AbsoluteFill>
  )
}

// 配置导出
export const heroAnimationConfig = {
  id: "HeroAnimation",
  component: HeroAnimation,
  durationInFrames: 300, // 10 秒 @ 30fps
  fps: 30,
  width: 1920,
  height: 1080
}
