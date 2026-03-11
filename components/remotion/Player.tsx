"use client"

import { Player } from "@remotion/player"
import { HeroAnimation } from "./compositions/HeroAnimation"
import { GTVProcessAnimation } from "./compositions/GTVProcessAnimation"

interface RemotionPlayerProps {
  composition: "hero" | "gtv-process"
  width?: number | string
  height?: number | string
  loop?: boolean
  autoPlay?: boolean
  controls?: boolean
  style?: React.CSSProperties
  className?: string
}

export const RemotionPlayer: React.FC<RemotionPlayerProps> = ({
  composition,
  width = "100%",
  height = "100%",
  loop = true,
  autoPlay = true,
  controls = false,
  style,
  className
}) => {
  const compositionConfig = {
    hero: {
      component: HeroAnimation,
      durationInFrames: 300,
      fps: 30,
      compositionWidth: 1920,
      compositionHeight: 1080
    },
    "gtv-process": {
      component: GTVProcessAnimation,
      durationInFrames: 300,
      fps: 30,
      compositionWidth: 800,
      compositionHeight: 600
    }
  }

  const config = compositionConfig[composition]

  return (
    <Player
      component={config.component}
      durationInFrames={config.durationInFrames}
      fps={config.fps}
      compositionWidth={config.compositionWidth}
      compositionHeight={config.compositionHeight}
      style={{
        width,
        height,
        ...style
      }}
      className={className}
      loop={loop}
      autoPlay={autoPlay}
      controls={controls}
    />
  )
}

// 懒加载版本
import dynamic from "next/dynamic"

export const LazyRemotionPlayer = dynamic(
  () => Promise.resolve(RemotionPlayer),
  {
    ssr: false,
    loading: () => (
      <div 
        className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 animate-pulse flex items-center justify-center"
      >
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }
)
