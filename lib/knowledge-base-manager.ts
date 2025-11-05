/**
 * 知识库管理器 - 处理规则的ID、时间戳、验证和集成
 */

export interface KnowledgeRule {
  id: string
  title: string
  category: string
  dimension?: string
  content: string
  scoringRules?: string[]
  createdAt: string
  updatedAt: string
  source?: string
  isActive?: boolean
  tags?: string[]
  metadata?: Record<string, any>
}

export interface KnowledgeBaseIndex {
  totalRules: number
  lastUpdated: string
  categories: Record<string, number>
  dimensions: Record<string, number>
  rules: KnowledgeRule[]
}

class KnowledgeBaseManager {
  private storageKey = "gtv-knowledge-base"
  private indexKey = "gtv-knowledge-base-index"

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取当前时间戳 (ISO格式)
   */
  private getCurrentTimestamp(): string {
    return new Date().toISOString()
  }

  /**
   * 验证规则的必需字段
   */
  validateRule(rule: Partial<KnowledgeRule>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!rule.title || rule.title.trim().length === 0) {
      errors.push("标题不能为空")
    }

    if (!rule.content || rule.content.trim().length === 0) {
      errors.push("内容不能为空")
    }

    if (!rule.category || rule.category.trim().length === 0) {
      errors.push("分类不能为空")
    }

    if (rule.title && rule.title.length > 200) {
      errors.push("标题过长（最多200字符）")
    }

    if (rule.content && rule.content.length > 5000) {
      errors.push("内容过长（最多5000字符）")
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 规范化规则（添加ID和时间戳）
   */
  normalizeRule(rule: Partial<KnowledgeRule>): KnowledgeRule {
    const now = this.getCurrentTimestamp()

    return {
      id: rule.id || this.generateId(),
      title: rule.title || "未命名",
      category: rule.category || "其他",
      dimension: rule.dimension || "",
      content: rule.content || "",
      scoringRules: rule.scoringRules || [],
      createdAt: rule.createdAt || now,
      updatedAt: rule.updatedAt || now,
      source: rule.source || "manual",
      isActive: rule.isActive !== false,
      tags: rule.tags || [],
      metadata: rule.metadata || {},
    }
  }

  /**
   * 从localStorage加载所有规则
   */
  loadRules(): KnowledgeRule[] {
    try {
      const saved = localStorage.getItem(this.storageKey)
      if (!saved) return []

      const rules = JSON.parse(saved)
      // 确保所有规则都有必需的字段
      return rules.map((rule: any) => this.normalizeRule(rule))
    } catch (e) {
      console.error("加载知识库失败:", e)
      return []
    }
  }

  /**
   * 保存规则到localStorage
   */
  saveRules(rules: KnowledgeRule[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(rules))
      this.updateIndex(rules)
    } catch (e) {
      console.error("保存知识库失败:", e)
    }
  }

  /**
   * 生成知识库索引
   */
  private updateIndex(rules: KnowledgeRule[]): void {
    const categories: Record<string, number> = {}
    const dimensions: Record<string, number> = {}

    rules.forEach((rule) => {
      categories[rule.category] = (categories[rule.category] || 0) + 1
      if (rule.dimension) {
        dimensions[rule.dimension] = (dimensions[rule.dimension] || 0) + 1
      }
    })

    const index: KnowledgeBaseIndex = {
      totalRules: rules.length,
      lastUpdated: this.getCurrentTimestamp(),
      categories,
      dimensions,
      rules,
    }

    try {
      localStorage.setItem(this.indexKey, JSON.stringify(index))
    } catch (e) {
      console.error("更新索引失败:", e)
    }
  }

  /**
   * 获取知识库索引
   */
  getIndex(): KnowledgeBaseIndex | null {
    try {
      const saved = localStorage.getItem(this.indexKey)
      return saved ? JSON.parse(saved) : null
    } catch (e) {
      console.error("加载索引失败:", e)
      return null
    }
  }

  /**
   * 添加新规则
   */
  addRule(rule: Partial<KnowledgeRule>): { success: boolean; rule?: KnowledgeRule; error?: string } {
    const validation = this.validateRule(rule)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join("; "),
      }
    }

    const normalized = this.normalizeRule(rule)
    const rules = this.loadRules()
    rules.push(normalized)
    this.saveRules(rules)

    return {
      success: true,
      rule: normalized,
    }
  }

  /**
   * 更新规则
   */
  updateRule(id: string, updates: Partial<KnowledgeRule>): { success: boolean; rule?: KnowledgeRule; error?: string } {
    const rules = this.loadRules()
    const index = rules.findIndex((r) => r.id === id)

    if (index === -1) {
      return {
        success: false,
        error: "规则不存在",
      }
    }

    const current = rules[index]
    const updated: KnowledgeRule = {
      ...current,
      ...updates,
      id: current.id, // 保持ID不变
      createdAt: current.createdAt, // 保持创建时间不变
      updatedAt: this.getCurrentTimestamp(), // 更新修改时间
    }

    const validation = this.validateRule(updated)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join("; "),
      }
    }

    rules[index] = updated
    this.saveRules(rules)

    return {
      success: true,
      rule: updated,
    }
  }

  /**
   * 删除规则
   */
  deleteRule(id: string): { success: boolean; error?: string } {
    const rules = this.loadRules()
    const filtered = rules.filter((r) => r.id !== id)

    if (filtered.length === rules.length) {
      return {
        success: false,
        error: "规则不存在",
      }
    }

    this.saveRules(filtered)
    return { success: true }
  }

  /**
   * 按维度获取规则
   */
  getRulesByDimension(dimension: string): KnowledgeRule[] {
    return this.loadRules().filter((r) => r.dimension === dimension && r.isActive)
  }

  /**
   * 按分类获取规则
   */
  getRulesByCategory(category: string): KnowledgeRule[] {
    return this.loadRules().filter((r) => r.category === category && r.isActive)
  }

  /**
   * 搜索规则
   */
  searchRules(keyword: string): KnowledgeRule[] {
    const lowerKeyword = keyword.toLowerCase()
    return this.loadRules().filter(
      (r) =>
        r.isActive &&
        (r.title.toLowerCase().includes(lowerKeyword) || r.content.toLowerCase().includes(lowerKeyword))
    )
  }

  /**
   * 获取所有活跃规则
   */
  getActiveRules(): KnowledgeRule[] {
    return this.loadRules().filter((r) => r.isActive)
  }

  /**
   * 导出规则为JSON
   */
  exportRules(filter?: { dimension?: string; category?: string }): string {
    let rules = this.loadRules()

    if (filter?.dimension) {
      rules = rules.filter((r) => r.dimension === filter.dimension)
    }
    if (filter?.category) {
      rules = rules.filter((r) => r.category === filter.category)
    }

    return JSON.stringify(rules, null, 2)
  }

  /**
   * 导入规则
   */
  importRules(jsonData: string, merge = true): { success: boolean; count?: number; error?: string } {
    try {
      const imported = JSON.parse(jsonData)
      if (!Array.isArray(imported)) {
        return {
          success: false,
          error: "导入数据必须是JSON数组",
        }
      }

      const normalized = imported.map((rule) => this.normalizeRule(rule))
      let rules = merge ? this.loadRules() : []

      // 检查ID冲突
      const existingIds = new Set(rules.map((r) => r.id))
      const newRules = normalized.filter((rule) => {
        if (existingIds.has(rule.id)) {
          rule.id = this.generateId() // 生成新ID避免冲突
        }
        return true
      })

      rules = [...rules, ...newRules]
      this.saveRules(rules)

      return {
        success: true,
        count: newRules.length,
      }
    } catch (e) {
      return {
        success: false,
        error: `导入失败: ${e instanceof Error ? e.message : "未知错误"}`,
      }
    }
  }

  /**
   * 生成规则统计信息
   */
  getStatistics(): {
    total: number
    active: number
    byCategory: Record<string, number>
    byDimension: Record<string, number>
    bySource: Record<string, number>
  } {
    const rules = this.loadRules()
    const active = rules.filter((r) => r.isActive)

    const byCategory: Record<string, number> = {}
    const byDimension: Record<string, number> = {}
    const bySource: Record<string, number> = {}

    rules.forEach((rule) => {
      byCategory[rule.category] = (byCategory[rule.category] || 0) + 1
      if (rule.dimension) {
        byDimension[rule.dimension] = (byDimension[rule.dimension] || 0) + 1
      }
      const source = rule.source || "manual"
      bySource[source] = (bySource[source] || 0) + 1
    })

    return {
      total: rules.length,
      active: active.length,
      byCategory,
      byDimension,
      bySource,
    }
  }
}

// 导出单例实例
export const knowledgeBaseManager = new KnowledgeBaseManager()

// 导出类供测试使用
export default KnowledgeBaseManager
