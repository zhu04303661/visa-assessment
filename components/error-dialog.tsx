"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertCircle, Copy, Check } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"

interface ErrorDialogProps {
  isOpen: boolean
  title: string
  message: string
  errorDetails?: string
  onClose: () => void
  showCopyButton?: boolean
}

export function ErrorDialog({
  isOpen,
  title,
  message,
  errorDetails,
  onClose,
  showCopyButton = true,
}: ErrorDialogProps) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const fullError = `${title}\n\n${message}${errorDetails ? `\n\nDetails: ${errorDetails}` : ""}`
    navigator.clipboard.writeText(fullError)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="mt-4 space-y-3">
            <p className="text-sm text-foreground font-medium">{message}</p>
            {errorDetails && (
              <div className="mt-3 rounded-lg bg-muted p-3">
                <p className="text-xs font-mono text-muted-foreground break-words">
                  {errorDetails}
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3 justify-end mt-6">
          {showCopyButton && errorDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  {t("error.copied")}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {t("error.copy")}
                </>
              )}
            </Button>
          )}
          <AlertDialogAction onClick={onClose} className="gap-2">
            {t("error.close")}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
