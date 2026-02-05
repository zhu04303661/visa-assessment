"use client"

import { motion, useInView, useSpring, useMotionValue, useTransform } from "framer-motion"
import { useRef, useEffect, useState } from "react"

interface CounterAnimationProps {
  value: number
  duration?: number
  delay?: number
  prefix?: string
  suffix?: string
  className?: string
  once?: boolean
}

export const CounterAnimation: React.FC<CounterAnimationProps> = ({
  value,
  duration = 2,
  delay = 0,
  prefix = "",
  suffix = "",
  className,
  once = true
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, amount: 0.5 })
  const [displayValue, setDisplayValue] = useState(0)
  
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
    duration: duration * 1000
  })

  useEffect(() => {
    if (isInView) {
      const timeout = setTimeout(() => {
        motionValue.set(value)
      }, delay * 1000)
      
      return () => clearTimeout(timeout)
    }
  }, [isInView, value, delay, motionValue])

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplayValue(Math.round(latest))
    })
    
    return () => unsubscribe()
  }, [springValue])

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.5, delay }}
    >
      {prefix}{displayValue.toLocaleString()}{suffix}
    </motion.span>
  )
}

// 统计卡片组件
interface StatCardProps {
  value: number
  label: string
  prefix?: string
  suffix?: string
  delay?: number
  icon?: React.ReactNode
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  prefix,
  suffix,
  delay = 0,
  icon
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay }}
      className="text-center p-6"
    >
      {icon && (
        <motion.div
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : { scale: 0 }}
          transition={{ duration: 0.5, delay: delay + 0.2, type: "spring" }}
          className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary"
        >
          {icon}
        </motion.div>
      )}
      <div className="text-4xl font-bold text-foreground mb-2">
        <CounterAnimation
          value={value}
          prefix={prefix}
          suffix={suffix}
          delay={delay + 0.3}
        />
      </div>
      <p className="text-muted-foreground">{label}</p>
    </motion.div>
  )
}
