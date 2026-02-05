"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"

interface CardHoverProps {
  children: ReactNode
  className?: string
  hoverScale?: number
  hoverRotate?: number
  tapScale?: number
}

export const CardHover: React.FC<CardHoverProps> = ({
  children,
  className,
  hoverScale = 1.02,
  hoverRotate = 0,
  tapScale = 0.98
}) => {
  return (
    <motion.div
      className={className}
      whileHover={{
        scale: hoverScale,
        rotate: hoverRotate,
        transition: { duration: 0.2 }
      }}
      whileTap={{
        scale: tapScale,
        transition: { duration: 0.1 }
      }}
    >
      {children}
    </motion.div>
  )
}

// 3D 卡片效果
interface Card3DProps {
  children: ReactNode
  className?: string
  perspective?: number
  maxRotation?: number
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  className,
  perspective = 1000,
  maxRotation = 10
}) => {
  return (
    <motion.div
      className={className}
      style={{ perspective }}
      whileHover="hover"
    >
      <motion.div
        variants={{
          hover: {
            rotateX: 0,
            rotateY: 0,
            transition: { duration: 0.3 }
          }
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const centerX = rect.width / 2
          const centerY = rect.height / 2
          const rotateX = ((y - centerY) / centerY) * -maxRotation
          const rotateY = ((x - centerX) / centerX) * maxRotation
          
          e.currentTarget.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "rotateX(0deg) rotateY(0deg)"
        }}
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.1s ease-out"
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

// 发光边框效果
interface GlowCardProps {
  children: ReactNode
  className?: string
  glowColor?: string
}

export const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className,
  glowColor = "rgba(139, 92, 246, 0.5)"
}) => {
  return (
    <motion.div
      className={`relative ${className}`}
      whileHover="hover"
      initial="rest"
    >
      {/* 发光层 */}
      <motion.div
        className="absolute inset-0 rounded-xl blur-xl"
        style={{ background: glowColor }}
        variants={{
          rest: { opacity: 0, scale: 0.8 },
          hover: { opacity: 0.6, scale: 1 }
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* 内容层 */}
      <motion.div
        className="relative"
        variants={{
          rest: { y: 0 },
          hover: { y: -4 }
        }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

// 浮动动画
interface FloatingProps {
  children: ReactNode
  className?: string
  duration?: number
  distance?: number
}

export const Floating: React.FC<FloatingProps> = ({
  children,
  className,
  duration = 3,
  distance = 10
}) => {
  return (
    <motion.div
      className={className}
      animate={{
        y: [-distance / 2, distance / 2, -distance / 2]
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  )
}
