"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface TypewriterProps {
  /** 要显示的文字或文字数组（多个文字会循环显示） */
  texts: string | string[]
  /** 打字速度（毫秒/字符） */
  speed?: number
  /** 删除速度（毫秒/字符） */
  deleteSpeed?: number
  /** 打完后等待时间（毫秒） */
  pauseDuration?: number
  /** 是否循环 */
  loop?: boolean
  /** 是否显示光标 */
  cursor?: boolean
  /** 光标字符 */
  cursorChar?: string
  /** 自定义类名 */
  className?: string
  /** 打字完成回调 */
  onComplete?: () => void
}

export const Typewriter: React.FC<TypewriterProps> = ({
  texts,
  speed = 80,
  deleteSpeed = 50,
  pauseDuration = 2000,
  loop = true,
  cursor = true,
  cursorChar = "|",
  className = "",
  onComplete
}) => {
  const textArray = Array.isArray(texts) ? texts : [texts]
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)

  const currentFullText = textArray[currentTextIndex]

  useEffect(() => {
    if (isWaiting) return

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // 打字阶段
        if (displayText.length < currentFullText.length) {
          setDisplayText(currentFullText.slice(0, displayText.length + 1))
        } else {
          // 打字完成
          if (textArray.length > 1 || loop) {
            setIsWaiting(true)
            setTimeout(() => {
              setIsWaiting(false)
              setIsDeleting(true)
            }, pauseDuration)
          } else {
            onComplete?.()
          }
        }
      } else {
        // 删除阶段
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1))
        } else {
          setIsDeleting(false)
          // 切换到下一个文字
          const nextIndex = (currentTextIndex + 1) % textArray.length
          if (nextIndex === 0 && !loop) {
            onComplete?.()
            return
          }
          setCurrentTextIndex(nextIndex)
        }
      }
    }, isDeleting ? deleteSpeed : speed)

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, isWaiting, currentFullText, currentTextIndex, textArray, speed, deleteSpeed, pauseDuration, loop, onComplete])

  return (
    <span className={className}>
      {displayText}
      {cursor && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          className="inline-block ml-1"
        >
          {cursorChar}
        </motion.span>
      )}
    </span>
  )
}

/** 单次打字效果（不循环，适合标题） */
interface TypewriterOnceProps {
  text: string
  speed?: number
  delay?: number
  cursor?: boolean
  cursorChar?: string
  className?: string
  onComplete?: () => void
}

export const TypewriterOnce: React.FC<TypewriterOnceProps> = ({
  text,
  speed = 60,
  delay = 0,
  cursor = true,
  cursorChar = "|",
  className = "",
  onComplete
}) => {
  const [displayText, setDisplayText] = useState("")
  const [started, setStarted] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    const delayTimeout = setTimeout(() => {
      setStarted(true)
    }, delay)
    return () => clearTimeout(delayTimeout)
  }, [delay])

  useEffect(() => {
    if (!started || completed) return

    if (displayText.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(text.slice(0, displayText.length + 1))
      }, speed)
      return () => clearTimeout(timeout)
    } else {
      setCompleted(true)
      onComplete?.()
    }
  }, [displayText, text, speed, started, completed, onComplete])

  return (
    <span className={className}>
      {displayText}
      {cursor && !completed && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          className="inline-block ml-1"
        >
          {cursorChar}
        </motion.span>
      )}
    </span>
  )
}

/** 多行打字效果 */
interface TypewriterLinesProps {
  lines: string[]
  speed?: number
  lineDelay?: number
  className?: string
  lineClassName?: string
}

export const TypewriterLines: React.FC<TypewriterLinesProps> = ({
  lines,
  speed = 50,
  lineDelay = 500,
  className = "",
  lineClassName = ""
}) => {
  const [currentLine, setCurrentLine] = useState(0)
  const [completedLines, setCompletedLines] = useState<string[]>([])

  const handleLineComplete = useCallback(() => {
    setCompletedLines(prev => [...prev, lines[currentLine]])
    if (currentLine < lines.length - 1) {
      setTimeout(() => {
        setCurrentLine(prev => prev + 1)
      }, lineDelay)
    }
  }, [currentLine, lines, lineDelay])

  return (
    <div className={className}>
      {completedLines.map((line, index) => (
        <div key={index} className={lineClassName}>
          {line}
        </div>
      ))}
      {currentLine < lines.length && (
        <div className={lineClassName}>
          <TypewriterOnce
            text={lines[currentLine]}
            speed={speed}
            cursor={currentLine === lines.length - 1}
            onComplete={handleLineComplete}
          />
        </div>
      )}
    </div>
  )
}
