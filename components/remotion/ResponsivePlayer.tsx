"use client"

import { Player } from "@remotion/player"
import { HeroAnimation } from "./compositions/HeroAnimation"
import { GTVProcessAnimation } from "./compositions/GTVProcessAnimation"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

interface ResponsivePlayerProps {
  composition: "hero" | "gtv-process"
  className?: string
  style?: React.CSSProperties
  /** 是否立即加载（不使用懒加载） */
  eager?: boolean
}

// 检测是否为移动设备或低性能设备
const useDeviceCapabilities = () => {
  const [capabilities, setCapabilities] = useState({
    isMobile: false,
    isLowPerformance: false,
    prefersReducedMotion: false
  })

  useEffect(() => {
    const checkCapabilities = () => {
      // 检测移动设备
      const isMobile = window.innerWidth < 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      // 检测低性能设备 (基于硬件并发数)
      const isLowPerformance = navigator.hardwareConcurrency 
        ? navigator.hardwareConcurrency < 4 
        : false
      
      // 检测用户偏好减少动画
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

      setCapabilities({ isMobile, isLowPerformance, prefersReducedMotion })
    }

    checkCapabilities()
    window.addEventListener("resize", checkCapabilities)
    return () => window.removeEventListener("resize", checkCapabilities)
  }, [])

  return capabilities
}

// 简化版动画背景（用于移动端/低性能设备）
const SimplifiedBackground: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ 
  className, 
  style 
}) => {
  return (
    <div 
      className={`absolute inset-0 ${className || ""}`}
      style={{
        background: `
          radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 70%)
        `,
        ...style
      }}
    >
      {/* 简化的动画点 */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/30 animate-pulse"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}

// 主响应式播放器组件
const ResponsivePlayerInner: React.FC<ResponsivePlayerProps> = ({
  composition,
  className,
  style,
  eager = false
}) => {
  const { isMobile, isLowPerformance, prefersReducedMotion } = useDeviceCapabilities()
  // 如果是 eager 模式，立即设置为可见
  const [isVisible, setIsVisible] = useState(eager)

  // 使用 Intersection Observer 实现懒加载（仅在非 eager 模式下）
  useEffect(() => {
    if (eager) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    const element = document.getElementById(`remotion-player-${composition}`)
    if (element) {
      observer.observe(element)
    }

    return () => observer.disconnect()
  }, [composition, eager])

  // 对于低性能设备或用户偏好减少动画，显示简化背景
  if (isLowPerformance || prefersReducedMotion) {
    return <SimplifiedBackground className={className} style={style} />
  }

  const compositionConfig = {
    hero: {
      component: HeroAnimation,
      durationInFrames: 300,
      fps: isMobile ? 24 : 30, // 移动端降低帧率
      compositionWidth: isMobile ? 960 : 1920,
      compositionHeight: isMobile ? 540 : 1080
    },
    "gtv-process": {
      component: GTVProcessAnimation,
      durationInFrames: 300,
      fps: isMobile ? 24 : 30,
      compositionWidth: isMobile ? 400 : 800,
      compositionHeight: isMobile ? 300 : 600
    }
  }

  const config = compositionConfig[composition]

  return (
    <div 
      id={`remotion-player-${composition}`}
      className={className}
      style={style}
    >
      {isVisible ? (
        <Player
          component={config.component}
          durationInFrames={config.durationInFrames}
          fps={config.fps}
          compositionWidth={config.compositionWidth}
          compositionHeight={config.compositionHeight}
          style={{
            width: "100%",
            height: "100%"
          }}
          loop
          autoPlay
          controls={false}
        />
      ) : (
        <SimplifiedBackground />
      )}
    </div>
  )
}

// 动态导入以避免 SSR 问题
export const ResponsivePlayer = dynamic(
  () => Promise.resolve(ResponsivePlayerInner),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 animate-pulse" />
    )
  }
)

export default ResponsivePlayer
