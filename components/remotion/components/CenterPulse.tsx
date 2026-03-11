"use client"

import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "remotion"

interface CenterPulseProps {
  text?: string
  icon?: "ai" | "document" | "check" | "visa"
}

export const CenterPulse: React.FC<CenterPulseProps> = ({
  text = "AI",
  icon = "ai"
}) => {
  const frame = useCurrentFrame()
  const { width, height, fps } = useVideoConfig()

  const centerX = width / 2
  const centerY = height / 2

  // 脉冲效果
  const pulse1 = interpolate(
    frame % 90,
    [0, 90],
    [0, 1],
    { easing: Easing.out(Easing.ease) }
  )
  
  const pulse2 = interpolate(
    (frame + 30) % 90,
    [0, 90],
    [0, 1],
    { easing: Easing.out(Easing.ease) }
  )
  
  const pulse3 = interpolate(
    (frame + 60) % 90,
    [0, 90],
    [0, 1],
    { easing: Easing.out(Easing.ease) }
  )

  // 中心图标旋转
  const rotation = interpolate(frame, [0, 300], [0, 360], {
    extrapolateRight: "extend"
  })

  // 中心缩放呼吸效果
  const breathe = interpolate(
    frame % 60,
    [0, 30, 60],
    [1, 1.05, 1],
    { easing: Easing.inOut(Easing.sin) }
  )

  const iconPaths: Record<string, string> = {
    ai: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    document: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
    check: "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3",
    visa: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z"
  }

  return (
    <svg
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0
      }}
    >
      <defs>
        <radialGradient id="pulseGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
        
        <linearGradient id="centerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        <filter id="centerGlow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 脉冲圆环 */}
      <circle
        cx={centerX}
        cy={centerY}
        r={60 + pulse1 * 100}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth={2}
        opacity={1 - pulse1}
      />
      <circle
        cx={centerX}
        cy={centerY}
        r={60 + pulse2 * 100}
        fill="none"
        stroke="#6366f1"
        strokeWidth={2}
        opacity={1 - pulse2}
      />
      <circle
        cx={centerX}
        cy={centerY}
        r={60 + pulse3 * 100}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        opacity={1 - pulse3}
      />

      {/* 中心圆形背景 */}
      <circle
        cx={centerX}
        cy={centerY}
        r={60 * breathe}
        fill="url(#centerGradient)"
        filter="url(#centerGlow)"
      />

      {/* 旋转装饰环 */}
      <g transform={`translate(${centerX}, ${centerY}) rotate(${rotation})`}>
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <circle
            key={i}
            cx={70 * Math.cos((angle * Math.PI) / 180)}
            cy={70 * Math.sin((angle * Math.PI) / 180)}
            r={4}
            fill="#fff"
            opacity={0.8}
          />
        ))}
      </g>

      {/* 中心图标 */}
      <g transform={`translate(${centerX - 12}, ${centerY - 12})`}>
        <path
          d={iconPaths[icon]}
          fill="none"
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* 文字标签 */}
      <text
        x={centerX}
        y={centerY + 90}
        textAnchor="middle"
        fill="white"
        fontSize={14}
        fontWeight="bold"
        opacity={0.9}
      >
        {text}
      </text>
    </svg>
  )
}
