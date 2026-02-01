'use client'

import React from 'react'
import DeepAssessmentPage from '@/components/deep-assessment-page'
import { AuthGuard } from '@/components/auth-guard'

export default function Page() {
  return (
    <AuthGuard requireAuth={true}>
      <main className="min-h-screen">
        <DeepAssessmentPage />
      </main>
    </AuthGuard>
  )
}
