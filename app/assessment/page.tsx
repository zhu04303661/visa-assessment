"use client"

import { AssessmentForm } from "@/components/assessment-form"
import { useLanguage } from "@/lib/i18n"

export default function AssessmentPage() {
  const { t } = useLanguage()

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {t("form.title")}
            </h1>
            <p className="text-pretty text-lg text-muted-foreground">{t("form.subtitle")}</p>
          </div>

          <AssessmentForm />
        </div>
      </div>
    </main>
  )
}
