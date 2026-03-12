export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
  preview: string
}

const SESSIONS_KEY = "visa-chat-sessions"
const ACTIVE_KEY = "visa-chat-active"

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota exceeded — silently ignore
  }
}

export function getSessions(): ChatSession[] {
  const sessions = readStorage<ChatSession[]>(SESSIONS_KEY, [])
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getSession(id: string): ChatSession | undefined {
  return getSessions().find(s => s.id === id)
}

export function createSession(title?: string): ChatSession {
  const session: ChatSession = {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title || "新对话",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
    preview: "",
  }
  const sessions = getSessions()
  sessions.unshift(session)
  writeStorage(SESSIONS_KEY, sessions)
  setActiveSessionId(session.id)
  return session
}

export function updateSession(id: string, updates: Partial<Omit<ChatSession, "id" | "createdAt">>) {
  const sessions = getSessions()
  const idx = sessions.findIndex(s => s.id === id)
  if (idx === -1) return
  sessions[idx] = { ...sessions[idx], ...updates, updatedAt: updates.updatedAt ?? Date.now() }
  writeStorage(SESSIONS_KEY, sessions)
}

export function deleteSession(id: string) {
  const sessions = getSessions().filter(s => s.id !== id)
  writeStorage(SESSIONS_KEY, sessions)
  if (getActiveSessionId() === id) {
    setActiveSessionId(sessions[0]?.id || null)
  }
}

export function getActiveSessionId(): string | null {
  return readStorage<string | null>(ACTIVE_KEY, null)
}

export function setActiveSessionId(id: string | null) {
  writeStorage(ACTIVE_KEY, id)
}

export function sessionKeyFor(sessionId: string): string {
  return `agent:main:visa-${sessionId}`
}

export function groupSessionsByDate(sessions: ChatSession[]): { label: string; labelEn: string; sessions: ChatSession[] }[] {
  const now = Date.now()
  const todayStart = new Date().setHours(0, 0, 0, 0)
  const weekAgo = todayStart - 6 * 24 * 60 * 60 * 1000

  const today: ChatSession[] = []
  const week: ChatSession[] = []
  const older: ChatSession[] = []

  for (const s of sessions) {
    if (s.updatedAt >= todayStart) today.push(s)
    else if (s.updatedAt >= weekAgo) week.push(s)
    else older.push(s)
  }

  const groups: { label: string; labelEn: string; sessions: ChatSession[] }[] = []
  if (today.length > 0) groups.push({ label: "今天", labelEn: "Today", sessions: today })
  if (week.length > 0) groups.push({ label: "最近7天", labelEn: "Last 7 days", sessions: week })
  if (older.length > 0) groups.push({ label: "更早", labelEn: "Older", sessions: older })
  return groups
}
