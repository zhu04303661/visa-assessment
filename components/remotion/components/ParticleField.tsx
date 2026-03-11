"use client"

import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion"

interface Particle {
  id: number
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  color: string
}

interface ParticleFieldProps {
  particleCount?: number
  colors?: string[]
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  particleCount = 50,
  colors = ["#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4", "#10b981"]
}) => {
  const frame = useCurrentFrame()
  const { width, height, durationInFrames } = useVideoConfig()

  // 生成稳定的粒子数组
  const particles: Particle[] = Array.from({ length: particleCount }, (_, i) => {
    const seed = i * 12345
    const pseudoRandom = (n: number) => ((seed * n) % 1000) / 1000
    
    return {
      id: i,
      x: pseudoRandom(1) * width,
      y: pseudoRandom(2) * height,
      size: 2 + pseudoRandom(3) * 4,
      speed: 0.5 + pseudoRandom(4) * 1.5,
      opacity: 0.3 + pseudoRandom(5) * 0.7,
      color: colors[Math.floor(pseudoRandom(6) * colors.length)]
    }
  })

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
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {particles.map((particle) => {
        // 粒子移动动画
        const moveY = interpolate(
          frame,
          [0, durationInFrames],
          [particle.y, particle.y - height * particle.speed],
          { extrapolateRight: "wrap" }
        )
        
        // 透明度脉冲
        const pulseOpacity = interpolate(
          frame,
          [0, 30, 60],
          [particle.opacity * 0.5, particle.opacity, particle.opacity * 0.5],
          {
            extrapolateRight: "extend",
            easing: Easing.inOut(Easing.sin)
          }
        )
        
        // 让粒子循环回到底部
        const wrappedY = ((moveY % height) + height) % height

        return (
          <circle
            key={particle.id}
            cx={particle.x}
            cy={wrappedY}
            r={particle.size}
            fill={particle.color}
            opacity={pulseOpacity}
            filter="url(#glow)"
          />
        )
      })}
      
      {/* 连接线 - 连接相近的粒子 */}
      {particles.slice(0, 20).map((p1, i) => {
        const p1Y = ((interpolate(
          frame,
          [0, durationInFrames],
          [p1.y, p1.y - height * p1.speed],
          { extrapolateRight: "wrap" }
        ) % height) + height) % height

        return particles.slice(i + 1, i + 5).map((p2, j) => {
          const p2Y = ((interpolate(
            frame,
            [0, durationInFrames],
            [p2.y, p2.y - height * p2.speed],
            { extrapolateRight: "wrap" }
          ) % height) + height) % height

          const distance = Math.sqrt(
            Math.pow(p1.x - p2.x, 2) + Math.pow(p1Y - p2Y, 2)
          )
          
          if (distance < 150) {
            const lineOpacity = interpolate(distance, [0, 150], [0.3, 0])
            return (
              <line
                key={`${p1.id}-${p2.id}`}
                x1={p1.x}
                y1={p1Y}
                x2={p2.x}
                y2={p2Y}
                stroke={p1.color}
                strokeWidth={1}
                opacity={lineOpacity}
              />
            )
          }
          return null
        })
      })}
    </svg>
  )
}
