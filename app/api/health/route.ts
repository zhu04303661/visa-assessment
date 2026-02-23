import { NextResponse } from 'next/server'

/**
 * 供反向代理做健康检查：确认 Next 应用已启动并能返回 JSON。
 * 若此接口返回 200，说明上游正常；502 多为代理配置或上游未启动/超时。
 */
export async function GET() {
  return NextResponse.json({ ok: true, service: 'next' })
}
