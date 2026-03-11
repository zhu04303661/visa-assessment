/**
 * OpenClaw Gateway WebSocket client for browser-side communication.
 * Connects to the local OpenClaw Gateway and provides chat.send / chat.history
 * functionality using the Gateway WebSocket protocol.
 */

type GatewayFrame =
  | { type: "req"; id: string; method: string; params: Record<string, unknown> }
  | { type: "res"; id: string; ok: boolean; payload?: unknown; error?: unknown }
  | { type: "event"; event: string; payload?: unknown; seq?: number; stateVersion?: number }

interface OpenClawClientOptions {
  url: string
  token: string
  sessionKey?: string
  onMessage?: (text: string, done: boolean) => void
  onError?: (error: string) => void
  onStatusChange?: (status: "connecting" | "connected" | "disconnected") => void
  onToolCall?: (tool: { name: string; input: string; output?: string }) => void
}

export class OpenClawClient {
  private ws: WebSocket | null = null
  private options: OpenClawClientOptions
  private reqId = 0
  private pendingRequests = new Map<string, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>()
  private connected = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private currentRunId: string | null = null
  private streamBuffer = ""

  constructor(options: OpenClawClientOptions) {
    this.options = {
      sessionKey: "agent:main:main",
      ...options,
    }
  }

  private nextId(): string {
    return `oc-${++this.reqId}-${Date.now()}`
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return
    }

    this.options.onStatusChange?.("connecting")

    try {
      this.ws = new WebSocket(this.options.url)
    } catch (err) {
      this.options.onStatusChange?.("disconnected")
      this.options.onError?.(`无法创建WebSocket连接: ${err}`)
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      // Wait for challenge or send connect immediately
    }

    this.ws.onmessage = (event) => {
      try {
        const frame: GatewayFrame = JSON.parse(event.data)
        this.handleFrame(frame)
      } catch {
        // ignore malformed frames
      }
    }

    this.ws.onerror = () => {
      this.options.onError?.("WebSocket连接错误")
    }

    this.ws.onclose = () => {
      this.connected = false
      this.options.onStatusChange?.("disconnected")
      this.rejectAllPending("连接已关闭")
      this.scheduleReconnect()
    }
  }

  private handleFrame(frame: GatewayFrame): void {
    if (frame.type === "event") {
      this.handleEvent(frame)
      return
    }

    if (frame.type === "res") {
      const pending = this.pendingRequests.get(frame.id)
      if (pending) {
        this.pendingRequests.delete(frame.id)
        if (frame.ok) {
          pending.resolve(frame.payload)
        } else {
          pending.reject(frame.error)
        }
      }
      return
    }
  }

  private handleEvent(frame: GatewayFrame & { type: "event" }): void {
    if (frame.event === "connect.challenge") {
      this.sendConnect()
      return
    }

    if (frame.event === "agent") {
      const payload = frame.payload as Record<string, unknown> | undefined
      if (!payload) return

      const stream = payload.stream as string | undefined
      const data = payload.data as Record<string, unknown> | undefined
      if (!data) return

      if (stream === "assistant") {
        const delta = data.delta as string | undefined
        if (delta) {
          this.streamBuffer += delta
          this.options.onMessage?.(this.streamBuffer, false)
        }
      }

      if (stream === "tool") {
        const phase = data.phase as string | undefined
        const toolName = (data.name as string) || (data.tool as string) || "unknown"

        if (phase === "start" || phase === "running") {
          this.options.onToolCall?.({
            name: toolName,
            input: typeof data.input === "string" ? data.input : JSON.stringify(data.input || {}),
          })
        }

        if (phase === "end" || phase === "done") {
          this.options.onToolCall?.({
            name: toolName,
            input: "",
            output: typeof data.output === "string" ? data.output : JSON.stringify(data.output || {}),
          })
        }
      }

      if (stream === "lifecycle") {
        const phase = data.phase as string | undefined
        if (phase === "end") {
          if (this.streamBuffer) {
            this.options.onMessage?.(this.streamBuffer, true)
            this.streamBuffer = ""
          }
          this.currentRunId = null
        }
        if (phase === "error") {
          const errorMsg = (data.error as string) || "Agent处理失败"
          this.options.onError?.(errorMsg)
          this.streamBuffer = ""
          this.currentRunId = null
        }
      }

      return
    }

    if (frame.event === "chat") {
      const payload = frame.payload as Record<string, unknown> | undefined
      if (!payload) return

      const state = payload.state as string | undefined
      const message = payload.message as Record<string, unknown> | undefined

      if (state === "final" && message) {
        const content = message.content as Array<{ type: string; text?: string }> | undefined
        const text = content?.[0]?.text || ""
        if (text && !this.streamBuffer) {
          this.streamBuffer = text
        }
        this.options.onMessage?.(this.streamBuffer || text, true)
        this.streamBuffer = ""
        this.currentRunId = null
      }

      return
    }
  }

  private async sendConnect(): Promise<void> {
    const id = this.nextId()

    const connectReq = {
      type: "req" as const,
      id,
      method: "connect",
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: "webchat",
          version: "1.0.0",
          platform: "web",
          mode: "webchat",
        },
        role: "operator",
        scopes: ["operator.read", "operator.write"],
        caps: [],
        commands: [],
        permissions: {},
        auth: { token: this.options.token },
        locale: "zh-CN",
        userAgent: "visa-assessment-web/1.0.0",
      },
    }

    this.ws?.send(JSON.stringify(connectReq))

    try {
      await this.waitForResponse(id, 10000)
      this.connected = true
      this.options.onStatusChange?.("connected")
    } catch (err) {
      this.options.onError?.(`连接认证失败: ${err}`)
      this.options.onStatusChange?.("disconnected")
    }
  }

  private waitForResponse(id: string, timeoutMs = 30000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error("请求超时"))
      }, timeoutMs)

      this.pendingRequests.set(id, {
        resolve: (v) => {
          clearTimeout(timer)
          resolve(v)
        },
        reject: (e) => {
          clearTimeout(timer)
          reject(e)
        },
      })
    })
  }

  private rejectAllPending(reason: string): void {
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error(reason))
    }
    this.pendingRequests.clear()
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 5000)
  }

  async sendMessage(text: string): Promise<{ runId: string; status: string }> {
    if (!this.connected || !this.ws) {
      throw new Error("未连接到OpenClaw Gateway")
    }

    this.streamBuffer = ""
    const id = this.nextId()
    const idempotencyKey = `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`

    const req = {
      type: "req" as const,
      id,
      method: "chat.send",
      params: {
        message: text,
        sessionKey: this.options.sessionKey,
        idempotencyKey,
      },
    }

    this.ws.send(JSON.stringify(req))

    const result = await this.waitForResponse(id) as Record<string, unknown>
    this.currentRunId = (result.runId as string) || null
    return {
      runId: this.currentRunId || "",
      status: (result.status as string) || "unknown",
    }
  }

  async abort(): Promise<void> {
    if (!this.connected || !this.ws) return

    const id = this.nextId()
    const req = {
      type: "req" as const,
      id,
      method: "chat.abort",
      params: {
        sessionKey: this.options.sessionKey,
      },
    }

    this.ws.send(JSON.stringify(req))
    this.streamBuffer = ""
    this.currentRunId = null

    try {
      await this.waitForResponse(id, 5000)
    } catch {
      // ignore abort timeout
    }
  }

  async getHistory(limit = 50): Promise<Array<{ role: string; content: string; timestamp?: string }>> {
    if (!this.connected || !this.ws) {
      throw new Error("未连接到OpenClaw Gateway")
    }

    const id = this.nextId()
    const req = {
      type: "req" as const,
      id,
      method: "chat.history",
      params: {
        sessionKey: this.options.sessionKey,
        limit,
      },
    }

    this.ws.send(JSON.stringify(req))

    const result = await this.waitForResponse(id) as Record<string, unknown>
    return (result.messages as Array<{ role: string; content: string; timestamp?: string }>) || []
  }

  get isConnected(): boolean {
    return this.connected
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
    this.connected = false
    this.rejectAllPending("客户端断开")
    this.options.onStatusChange?.("disconnected")
  }
}
