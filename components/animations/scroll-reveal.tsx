"use client"

import { motion, useInView, Variants } from "framer-motion"
import { useRef, ReactNode } from "react"

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  direction?: "up" | "down" | "left" | "right" | "none"
  distance?: number
  once?: boolean
  threshold?: number
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className,
  delay = 0,
  duration = 0.6,
  direction = "up",
  distance = 40,
  once = true,
  threshold = 0.1
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, amount: threshold })

  const getInitialPosition = () => {
    switch (direction) {
      case "up":
        return { y: distance, x: 0 }
      case "down":
        return { y: -distance, x: 0 }
      case "left":
        return { x: distance, y: 0 }
      case "right":
        return { x: -distance, y: 0 }
      case "none":
        return { x: 0, y: 0 }
    }
  }

  const variants: Variants = {
    hidden: {
      opacity: 0,
      ...getInitialPosition()
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1] // cubic-bezier for smooth animation
      }
    }
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// 交错动画容器
interface StaggerContainerProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
  once?: boolean
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className,
  staggerDelay = 0.1,
  once = true
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, amount: 0.1 })

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1
      }
    }
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// 交错动画子项
interface StaggerItemProps {
  children: ReactNode
  className?: string
  direction?: "up" | "down" | "left" | "right"
}

export const StaggerItem: React.FC<StaggerItemProps> = ({
  children,
  className,
  direction = "up"
}) => {
  const getInitialPosition = () => {
    switch (direction) {
      case "up":
        return { y: 30 }
      case "down":
        return { y: -30 }
      case "left":
        return { x: 30 }
      case "right":
        return { x: -30 }
    }
  }

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      ...getInitialPosition()
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  }

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  )
}
