"use client"

import { DebugPanel } from "@/components/debug-panel"
import { useLanguage } from "@/lib/i18n"

export default function DebugPage() {
  const { t } = useLanguage()

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {t("debug.title")}
            </h1>
            <p className="text-pretty text-lg text-muted-foreground">{t("debug.subtitle")}</p>
          </div>

          <DebugPanel />
        </div>
      </div>
    </main>
  )
}
