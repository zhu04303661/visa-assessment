"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function AssessmentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <Card>
        <CardHeader>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </CardHeader>
      </Card>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-12 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Skeleton */}
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((j) => (
              <div key={j}>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-full"></div>
                <div className="h-3 bg-gray-100 rounded w-5/6 mt-1"></div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
