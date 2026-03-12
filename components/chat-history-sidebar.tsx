"use client"

import { useState, useRef, useEffect } from "react"
import { useLanguage } from "@/lib/i18n"
import {
  Plus, MessageSquare, Trash2, Pencil, Check, X,
  PanelLeftClose, PanelLeftOpen, MoreHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ChatSession,
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  groupSessionsByDate,
} from "@/lib/chat-sessions"

interface ChatHistorySidebarProps {
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
  refreshTrigger?: number
}

export default function ChatHistorySidebar({
  activeSessionId,
  onSelectSession,
  onNewSession,
  refreshTrigger,
}: ChatHistorySidebarProps) {
  const { language } = useLanguage()
  const [collapsed, setCollapsed] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSessions(getSessions())
  }, [refreshTrigger])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    if (menuOpenId) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpenId])

  const handleNewSession = () => {
    onNewSession()
    setSessions(getSessions())
  }

  const handleDelete = (id: string) => {
    deleteSession(id)
    setSessions(getSessions())
    setMenuOpenId(null)
  }

  const startRename = (session: ChatSession) => {
    setEditingId(session.id)
    setEditTitle(session.title)
    setMenuOpenId(null)
  }

  const confirmRename = () => {
    if (editingId && editTitle.trim()) {
      updateSession(editingId, { title: editTitle.trim() })
      setSessions(getSessions())
    }
    setEditingId(null)
  }

  const cancelRename = () => {
    setEditingId(null)
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  const groups = groupSessionsByDate(sessions)

  if (collapsed) {
    return (
      <div className="w-12 flex flex-col items-center py-3 gap-2 border-r bg-muted/30 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(false)}
          title={language === "en" ? "Expand history" : "展开历史"}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleNewSession}
          title={language === "en" ? "New chat" : "新建对话"}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex flex-col items-center gap-1 mt-2 overflow-y-auto">
          {sessions.slice(0, 10).map(s => (
            <button
              key={s.id}
              className={`w-8 h-8 rounded-md flex items-center justify-center text-xs transition-colors ${
                s.id === activeSessionId
                  ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => onSelectSession(s.id)}
              title={s.title}
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 flex flex-col border-r bg-muted/20 shrink-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <span className="text-sm font-medium">
          {language === "en" ? "Chat History" : "对话历史"}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleNewSession}
            title={language === "en" ? "New chat" : "新建对话"}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed(true)}
            title={language === "en" ? "Collapse" : "收起"}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-1">
        {sessions.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            {language === "en" ? "No conversations yet" : "暂无对话记录"}
          </div>
        )}

        {groups.map(group => (
          <div key={group.label}>
            <div className="px-3 pt-3 pb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {language === "en" ? group.labelEn : group.label}
              </span>
            </div>
            {group.sessions.map(session => (
              <div
                key={session.id}
                className={`group relative mx-1.5 mb-0.5 rounded-lg cursor-pointer transition-colors ${
                  session.id === activeSessionId
                    ? "bg-emerald-100/80 dark:bg-emerald-900/30"
                    : "hover:bg-muted/60"
                }`}
                onClick={() => {
                  if (editingId !== session.id) onSelectSession(session.id)
                }}
              >
                <div className="flex items-start gap-2 px-2.5 py-2">
                  <MessageSquare className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                    session.id === activeSessionId ? "text-emerald-600" : "text-muted-foreground"
                  }`} />
                  <div className="flex-1 min-w-0">
                    {editingId === session.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={editInputRef}
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") confirmRename()
                            if (e.key === "Escape") cancelRename()
                          }}
                          className="flex-1 bg-white dark:bg-gray-800 border rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                          onClick={e => e.stopPropagation()}
                        />
                        <button onClick={(e) => { e.stopPropagation(); confirmRename() }} className="p-0.5 hover:text-emerald-600">
                          <Check className="h-3 w-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); cancelRename() }} className="p-0.5 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-medium truncate leading-tight">
                          {session.title}
                        </div>
                        {session.preview && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5 leading-tight">
                            {session.preview}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTime(session.updatedAt)}
                    </span>
                    <div className="relative">
                      <button
                        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpenId(menuOpenId === session.id ? null : session.id)
                        }}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      {menuOpenId === session.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-6 z-50 bg-popover border rounded-md shadow-lg py-1 w-28"
                        >
                          <button
                            className="w-full px-3 py-1.5 text-xs text-left hover:bg-muted flex items-center gap-2"
                            onClick={(e) => { e.stopPropagation(); startRename(session) }}
                          >
                            <Pencil className="h-3 w-3" />
                            {language === "en" ? "Rename" : "重命名"}
                          </button>
                          <button
                            className="w-full px-3 py-1.5 text-xs text-left hover:bg-muted flex items-center gap-2 text-red-600"
                            onClick={(e) => { e.stopPropagation(); handleDelete(session.id) }}
                          >
                            <Trash2 className="h-3 w-3" />
                            {language === "en" ? "Delete" : "删除"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
