import { useState, useCallback } from "react"

export type AssessmentStage = "idle" | "resume" | "analyzing" | "generating" | "preparing" | "complete"

interface AssessmentLoadingState {
  isLoading: boolean
  stage: AssessmentStage
  progress: number
  message: string
}

export function useAssessmentLoading(initialStage: AssessmentStage = "idle") {
  const [state, setState] = useState<AssessmentLoadingState>({
    isLoading: false,
    stage: initialStage,
    progress: 0,
    message: "",
  })

  const startLoading = useCallback((initialMessage: string = "开始处理...") => {
    setState({
      isLoading: true,
      stage: "resume",
      progress: 0,
      message: initialMessage,
    })
  }, [])

  const setStage = useCallback((stage: AssessmentStage, message?: string) => {
    setState((prev) => {
      const stageProgress: Record<AssessmentStage, number> = {
        idle: 0,
        resume: 15,
        analyzing: 40,
        generating: 70,
        preparing: 90,
        complete: 100,
      }

      return {
        ...prev,
        stage,
        progress: stageProgress[stage],
        message: message || prev.message,
      }
    })
  }, [])

  const setProgress = useCallback((progress: number) => {
    setState((prev) => ({
      ...prev,
      progress: Math.min(Math.max(progress, 0), 100),
    }))
  }, [])

  const complete = useCallback(() => {
    setState({
      isLoading: false,
      stage: "complete",
      progress: 100,
      message: "完成！",
    })
  }, [])

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      stage: "idle",
      progress: 0,
      message: "",
    })
  }, [])

  return {
    ...state,
    startLoading,
    setStage,
    setProgress,
    complete,
    reset,
  }
}
