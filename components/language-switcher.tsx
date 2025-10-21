"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"
import { Languages } from "lucide-react"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <Button variant="outline" size="sm" onClick={() => setLanguage(language === "en" ? "zh" : "en")} className="gap-2">
      <Languages className="h-4 w-4" />
      <span>{language === "en" ? "中文" : "English"}</span>
    </Button>
  )
}
