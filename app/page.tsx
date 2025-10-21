"use client"

import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { AssessmentCTA } from "@/components/assessment-cta"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <AssessmentCTA />
      <Footer />
    </main>
  )
}
