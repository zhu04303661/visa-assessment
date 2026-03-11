"use client"

import { useEffect, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"

const TRACKING_API = "/api/copywriting/tracking"

export function PageTracker() {
  const pathname = usePathname()
  const visitRef = useRef<{ id: string; start: number } | null>(null)

  const reportDuration = useCallback(() => {
    const visit = visitRef.current
    if (!visit) return
    const duration = Date.now() - visit.start
    if (duration < 500) return

    const payload = JSON.stringify({
      visit_id: visit.id,
      duration_ms: duration,
    })

    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${TRACKING_API}/duration`, new Blob([payload], { type: "application/json" }))
    } else {
      fetch(`${TRACKING_API}/duration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }
    visitRef.current = null
  }, [])

  const recordVisit = useCallback(
    async (path: string) => {
      reportDuration()

      try {
        const ua = navigator.userAgent
        const isMobile = /Mobi|Android/i.test(ua)
        const res = await fetch(`${TRACKING_API}/visit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path,
            user_agent: ua,
            referer: document.referrer,
            device_type: isMobile ? "mobile" : "desktop",
          }),
        })
        const data = await res.json()
        if (data.success && data.id) {
          visitRef.current = { id: data.id, start: Date.now() }
        }
      } catch {
        // silently fail
      }
    },
    [reportDuration],
  )

  useEffect(() => {
    if (!pathname || pathname.startsWith("/api/")) return
    recordVisit(pathname)
  }, [pathname, recordVisit])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        reportDuration()
      }
    }
    const onBeforeUnload = () => {
      reportDuration()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("beforeunload", onBeforeUnload)
      reportDuration()
    }
  }, [reportDuration])

  return null
}
