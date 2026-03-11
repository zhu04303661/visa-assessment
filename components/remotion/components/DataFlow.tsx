"use client"

import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion"

interface DataFlowProps {
  direction?: "up" | "down" | "left" | "right"
  streamCount?: number
}

export const DataFlow: React.FC<DataFlowProps> = ({
  direction = "up",
  streamCount = 8
}) => {
  const frame = useCurrentFrame()
  const { width, height, fps, durationInFrames } = useVideoConfig()

  const streams = Array.from({ length: streamCount }, (_, i) => {
    const seed = i * 7890
    const pseudoRandom = (n: number) => ((seed * n) % 1000) / 1000
    
    return {
      id: i,
      offset: pseudoRandom(1) * 100,
      speed: 0.8 + pseudoRandom(2) * 0.4,
      width: 2 + pseudoRandom(3) * 3
    }
  })

  const isVertical = direction === "up" || direction === "down"
  const spacing = isVertical ? width / (streamCount + 1) : height / (streamCount + 1)

  return (
    <svg
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        opacity: 0.6
      }}
    >
      <defs>
        <linearGradient id="dataGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
          <stop offset="50%" stopColor="#6366f1" stopOpacity="1" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
        
        <linearGradient id="dataGradientHorizontal" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
          <stop offset="50%" stopColor="#6366f1" stopOpacity="1" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {streams.map((stream, index) => {
        const pos = spacing * (index + 1)
        const streamLength = isVertical ? height * 0.3 : width * 0.3
        
        // 计算流动位置
        const progress = interpolate(
          frame,
          [0, durationInFrames],
          [0, (isVertical ? height : width) + streamLength],
          { extrapolateRight: "wrap" }
        ) * stream.speed + stream.offset

        const wrappedProgress = progress % ((isVertical ? height : width) + streamLength)

        if (isVertical) {
          const y = direction === "up" 
            ? height - wrappedProgress + streamLength
            : wrappedProgress - streamLength
            
          return (
            <rect
              key={stream.id}
              x={pos - stream.width / 2}
              y={y}
              width={stream.width}
              height={streamLength}
              fill="url(#dataGradient)"
              rx={stream.width / 2}
            />
          )
        } else {
          const x = direction === "left"
            ? width - wrappedProgress + streamLength
            : wrappedProgress - streamLength
            
          return (
            <rect
              key={stream.id}
              x={x}
              y={pos - stream.width / 2}
              width={streamLength}
              height={stream.width}
              fill="url(#dataGradientHorizontal)"
              ry={stream.width / 2}
            />
          )
        }
      })}

      {/* 数据节点 */}
      {streams.slice(0, 5).map((stream, index) => {
        const pos = spacing * (index + 1)
        const nodeProgress = interpolate(
          frame,
          [0, durationInFrames],
          [0, (isVertical ? height : width)],
          { extrapolateRight: "wrap" }
        ) * stream.speed + stream.offset * 2

        const wrappedNodeProgress = nodeProgress % (isVertical ? height : width)
        
        const scale = spring({
          frame: frame % 60,
          fps,
          config: { damping: 12, stiffness: 100 }
        })

        return (
          <circle
            key={`node-${stream.id}`}
            cx={isVertical ? pos : wrappedNodeProgress}
            cy={isVertical ? (direction === "up" ? height - wrappedNodeProgress : wrappedNodeProgress) : pos}
            r={4 + scale * 2}
            fill="#8b5cf6"
            opacity={0.8}
          />
        )
      })}
    </svg>
  )
}
