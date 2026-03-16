export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
  preview: string
  userId?: string
  userEmail?: string
}

function sessionsKey(userId: string) {
  return `visa-chat-sessions:${userId}`
}
function activeKey(userId: string) {
  return `visa-chat-active:${userId}`
}

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
    // quota exceeded
  }
}

export function getSessions(userId: string): ChatSession[] {
  const sessions = readStorage<ChatSession[]>(sessionsKey(userId), [])
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getAllUsersSessions(): ChatSession[] {
  if (typeof window === "undefined") return []
  const all: ChatSession[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith("visa-chat-sessions:")) continue
    try {
      const sessions: ChatSession[] = JSON.parse(localStorage.getItem(key) || "[]")
      all.push(...sessions)
    } catch { /* skip */ }
  }
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getSession(userId: string, id: string): ChatSession | undefined {
  return getSessions(userId).find(s => s.id === id)
}

export function createSession(userId: string, userEmail?: string, title?: string): ChatSession {
  const session: ChatSession = {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title || "新对话",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
    preview: "",
    userId,
    userEmail,
  }
  const sessions = getSessions(userId)
  sessions.unshift(session)
  writeStorage(sessionsKey(userId), sessions)
  setActiveSessionId(userId, session.id)
  return session
}

export function updateSession(userId: string, id: string, updates: Partial<Omit<ChatSession, "id" | "createdAt" | "userId">>) {
  const sessions = getSessions(userId)
  const idx = sessions.findIndex(s => s.id === id)
  if (idx === -1) return
  sessions[idx] = { ...sessions[idx], ...updates, updatedAt: updates.updatedAt ?? Date.now() }
  writeStorage(sessionsKey(userId), sessions)
}

export function deleteSession(userId: string, id: string) {
  const sessions = getSessions(userId).filter(s => s.id !== id)
  writeStorage(sessionsKey(userId), sessions)
  if (getActiveSessionId(userId) === id) {
    setActiveSessionId(userId, sessions[0]?.id || null)
  }
}

export function getActiveSessionId(userId: string): string | null {
  return readStorage<string | null>(activeKey(userId), null)
}

export function setActiveSessionId(userId: string, id: string | null) {
  writeStorage(activeKey(userId), id)
}

export function sessionKeyFor(sessionId: string): string {
  return `agent:main:visa-${sessionId}`
}

export function groupSessionsByDate(sessions: ChatSession[]): { label: string; labelEn: string; sessions: ChatSession[] }[] {
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
