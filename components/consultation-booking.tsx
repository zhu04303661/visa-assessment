"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Loader2 } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

type ConsultationBookingProps = {
  isOpen: boolean
  onClose: () => void
  userName?: string
  userEmail?: string
}

export function ConsultationBooking({ isOpen, onClose, userName = "", userEmail = "" }: ConsultationBookingProps) {
  const { t } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: userName,
    email: userEmail,
    date: "",
    time: "",
    timezone: "UTC",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // TODO: Implement actual consultation booking API call
      console.log("Consultation booking data:", formData)
      
      // For now, just show a success message and close
      setTimeout(() => {
        alert("感谢您的预约！我们将很快与您联系。")
        setIsSubmitting(false)
        onClose()
      }, 500)
    } catch (error) {
      console.error("Error booking consultation:", error)
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>预约一对一咨询</DialogTitle>
          <DialogDescription>
            选择您方便的时间，我们的专家将与您进行一对一咨询，为您的签证申请提供个性化建议。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="consultation-name">姓名</Label>
            <Input
              id="consultation-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入您的姓名"
              required
            />
          </div>

          <div>
            <Label htmlFor="consultation-email">电子邮箱</Label>
            <Input
              id="consultation-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="请输入您的电子邮箱"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="consultation-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                日期
              </Label>
              <Input
                id="consultation-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="consultation-time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                时间
              </Label>
              <Input
                id="consultation-time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="consultation-timezone">时区</Label>
            <Select value={formData.timezone} onValueChange={(value) => setFormData({ ...formData, timezone: value })}>
              <SelectTrigger id="consultation-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="UTC+8">UTC+8 (北京时间)</SelectItem>
                <SelectItem value="EST">EST (美国东部)</SelectItem>
                <SelectItem value="PST">PST (美国太平洋)</SelectItem>
                <SelectItem value="GMT">GMT (伦敦)</SelectItem>
                <SelectItem value="CET">CET (中欧)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="consultation-notes">备注 (可选)</Label>
            <Textarea
              id="consultation-notes"
              placeholder="请描述您的需求或问题..."
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                "确认预约"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
