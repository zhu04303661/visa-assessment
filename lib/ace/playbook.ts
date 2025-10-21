import { Bullet, Playbook, PlaybookStats, DeltaOperation, DeltaBatch } from './types'

export class PlaybookImpl implements Playbook {
  bullets: Bullet[] = []
  sections: string[] = ['defaults', 'guidelines', 'examples', 'warnings']

  constructor(initialBullets: Bullet[] = []) {
    this.bullets = initialBullets
  }

  stats(): PlaybookStats {
    const total_bullets = this.bullets.length
    const helpful_bullets = this.bullets.filter(b => b.metadata.helpful > b.metadata.harmful).length
    const harmful_bullets = this.bullets.filter(b => b.metadata.harmful > b.metadata.helpful).length
    
    const sections: { [section: string]: number } = {}
    this.sections.forEach(section => {
      sections[section] = this.bullets.filter(b => b.section === section).length
    })

    return {
      total_bullets,
      helpful_bullets,
      harmful_bullets,
      sections
    }
  }

  as_prompt(): string {
    if (this.bullets.length === 0) {
      return ''
    }

    const sections: { [key: string]: Bullet[] } = {}
    this.sections.forEach(section => {
      sections[section] = this.bullets.filter(b => b.section === section)
    })

    let prompt = ''
    this.sections.forEach(section => {
      const bullets = sections[section]
      if (bullets.length > 0) {
        prompt += `\n## ${section.toUpperCase()}\n`
        bullets.forEach(bullet => {
          const helpful = bullet.metadata.helpful || 0
          const harmful = bullet.metadata.harmful || 0
          const score = helpful - harmful
          const scoreStr = score > 0 ? `+${score}` : score.toString()
          prompt += `[${bullet.id}] ${bullet.content} (${scoreStr})\n`
        })
      }
    })

    return prompt.trim()
  }

  get_bullet(id: string): Bullet | null {
    return this.bullets.find(b => b.id === id) || null
  }

  tag_bullet(id: string, tag: string): void {
    const bullet = this.get_bullet(id)
    if (bullet && !bullet.tags.includes(tag)) {
      bullet.tags.push(tag)
    }
  }

  apply_delta(delta: DeltaBatch): void {
    delta.operations.forEach(op => {
      switch (op.type) {
        case 'ADD':
          const newBullet: Bullet = {
            id: op.bullet_id || `bullet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: op.content,
            section: op.section,
            metadata: {
              helpful: 0,
              harmful: 0,
              ...op.metadata
            },
            tags: []
          }
          this.bullets.push(newBullet)
          break

        case 'UPDATE':
          const bullet = this.get_bullet(op.bullet_id || '')
          if (bullet) {
            bullet.content = op.content
            bullet.section = op.section
            bullet.metadata = { ...bullet.metadata, ...op.metadata }
          }
          break

        case 'DELETE':
          this.bullets = this.bullets.filter(b => b.id !== op.bullet_id)
          break
      }
    })
  }
}

export class DeltaBatchImpl implements DeltaBatch {
  operations: DeltaOperation[] = []

  constructor(operations: DeltaOperation[] = []) {
    this.operations = operations
  }

  static from_json(data: any): DeltaBatch {
    const operations: DeltaOperation[] = []
    
    if (data.operations && Array.isArray(data.operations)) {
      data.operations.forEach((op: any) => {
        if (op.type && op.section && op.content) {
          operations.push({
            type: op.type,
            section: op.section,
            content: op.content,
            metadata: op.metadata || {},
            bullet_id: op.bullet_id
          })
        }
      })
    }

    return new DeltaBatchImpl(operations)
  }
}
