"use client"

import { HeroAnimated } from "@/components/hero-animated"
import { ServicesSection } from "@/components/services-section"
import { CompanyValues } from "@/components/company-values"
import { AboutSection } from "@/components/about-section"
import { AssessmentCTA } from "@/components/assessment-cta"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroAnimated />
      <CompanyValues />
      <ServicesSection />
      <AboutSection />
      <AssessmentCTA />
      <Footer />
    </main>
  )
}
