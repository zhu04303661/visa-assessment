"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"
import { Languages } from "lucide-react"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 在客户端挂载前显示占位符，避免 hydration 不匹配
  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="gap-2" disabled>
        <Languages className="h-4 w-4" />
        <span>English</span>
      </Button>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setLanguage(language === "en" ? "zh" : "en")} className="gap-2">
      <Languages className="h-4 w-4" />
      <span>{language === "en" ? "中文" : "English"}</span>
    </Button>
  )
}
