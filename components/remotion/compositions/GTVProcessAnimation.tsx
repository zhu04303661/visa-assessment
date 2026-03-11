"use client"

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Easing } from "remotion"

interface StepProps {
  title: string
  subtitle: string
  icon: string
  color: string
}

const ProcessStep: React.FC<StepProps & { delay: number }> = ({ 
  title, 
  subtitle, 
  icon, 
  color,
  delay 
}) => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()

  const localFrame = Math.max(0, frame - delay)
  
  // 入场动画
  const slideIn = spring({
    frame: localFrame,
    fps,
    config: { damping: 15, stiffness: 80 }
  })

  const scale = spring({
    frame: localFrame,
    fps,
    config: { damping: 12, stiffness: 100 }
  })

  // 图标脉冲
  const iconPulse = interpolate(
    localFrame % 60,
    [0, 30, 60],
    [1, 1.1, 1],
    { easing: Easing.inOut(Easing.sin) }
  )

  // 进度条动画
  const progressWidth = interpolate(
    localFrame,
    [0, 60],
    [0, 100],
    { extrapolateRight: "clamp" }
  )

  const opacity = interpolate(localFrame, [0, 15], [0, 1], {
    extrapolateRight: "clamp"
  })

  const iconPaths: Record<string, string> = {
    upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
    analyze: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    report: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
    success: "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3"
  }

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) translateY(${(1 - slideIn) * 50}px) scale(${scale})`,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24
      }}
    >
      {/* 图标容器 */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${color}20, ${color}40)`,
          border: `3px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${iconPulse})`,
          boxShadow: `0 0 40px ${color}40`
        }}
      >
        <svg width={48} height={48} viewBox="0 0 24 24">
          <path
            d={iconPaths[icon]}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* 标题 */}
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontSize: 36,
            fontWeight: "bold",
            color: "white",
            margin: 0,
            marginBottom: 8
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 18,
            color: "rgba(255, 255, 255, 0.7)",
            margin: 0
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* 进度条 */}
      <div
        style={{
          width: 200,
          height: 4,
          borderRadius: 2,
          background: "rgba(255, 255, 255, 0.2)",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width: `${progressWidth}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${color}, ${color}80)`,
            borderRadius: 2
          }}
        />
      </div>
    </div>
  )
}

export const GTVProcessAnimation: React.FC = () => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()

  const steps = [
    { title: "上传简历", subtitle: "Upload Resume", icon: "upload", color: "#8b5cf6" },
    { title: "AI 智能分析", subtitle: "AI Analysis", icon: "analyze", color: "#6366f1" },
    { title: "生成评估报告", subtitle: "Generate Report", icon: "report", color: "#3b82f6" },
    { title: "成功获签", subtitle: "Visa Approved", icon: "success", color: "#10b981" }
  ]

  const stepDuration = 75 // 每步 2.5 秒

  // 背景渐变
  const currentStep = Math.floor(frame / stepDuration)
  const stepProgress = (frame % stepDuration) / stepDuration
  
  const currentColor = steps[Math.min(currentStep, steps.length - 1)]?.color || steps[0].color
  const nextColor = steps[Math.min(currentStep + 1, steps.length - 1)]?.color || currentColor

  // 步骤指示器
  const renderStepIndicator = () => {
    return (
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 16
        }}
      >
        {steps.map((step, index) => {
          const isActive = index === currentStep
          const isCompleted = index < currentStep
          
          return (
            <div
              key={index}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: isCompleted ? step.color : isActive ? step.color : "rgba(255,255,255,0.3)",
                border: `2px solid ${step.color}`,
                transform: isActive ? "scale(1.3)" : "scale(1)",
                transition: "all 0.3s"
              }}
            />
          )
        })}
      </div>
    )
  }

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, 
          ${currentColor}20 0%, 
          #0f0f23 50%, 
          ${nextColor}20 100%
        )`
      }}
    >
      {/* 背景装饰 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)"
        }}
      />

      {/* 步骤动画 */}
      {steps.map((step, index) => (
        <Sequence
          key={index}
          from={index * stepDuration}
          durationInFrames={stepDuration}
        >
          <ProcessStep {...step} delay={0} />
        </Sequence>
      ))}

      {/* 步骤指示器 */}
      {renderStepIndicator()}

      {/* 标题 */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center"
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: "500",
            color: "rgba(255, 255, 255, 0.6)",
            margin: 0
          }}
        >
          GTV 签证评估流程
        </h1>
      </div>
    </AbsoluteFill>
  )
}

export const gtvProcessAnimationConfig = {
  id: "GTVProcessAnimation",
  component: GTVProcessAnimation,
  durationInFrames: 300, // 10 秒
  fps: 30,
  width: 800,
  height: 600
}
