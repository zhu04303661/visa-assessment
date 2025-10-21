import { 
  GeneratorOutput, 
  ReflectorOutput, 
  CuratorOutput, 
  BulletTag, 
  Playbook, 
  LLMClient, 
  Sample, 
  EnvironmentResult 
} from './types'

export class Generator {
  constructor(
    private llm: LLMClient,
    private maxRetries: number = 3
  ) {}

  async generate(params: {
    question: string
    context?: string
    playbook: Playbook
    reflection?: string
  }): Promise<GeneratorOutput> {
    const { question, context = '', playbook, reflection = '' } = params

    const prompt = this.buildPrompt(question, context, playbook, reflection)
    
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.llm.complete(prompt)
        const data = JSON.parse(response.text)
        
        return {
          reasoning: data.reasoning || '',
          final_answer: data.final_answer || '',
          bullet_ids: data.bullet_ids || [],
          raw: data
        }
      } catch (error) {
        lastError = error as Error
        if (attempt + 1 >= this.maxRetries) {
          break
        }
      }
    }

    throw new Error(`Generator failed after ${this.maxRetries} attempts: ${lastError?.message}`)
  }

  private buildPrompt(question: string, context: string, playbook: Playbook, reflection: string): string {
    const playbookText = playbook.as_prompt() || '(empty playbook)'
    const reflectionText = reflection || '(none)'
    const contextText = context || '(none)'

    return `你是一个专业的英国GTV签证评估专家。请基于以下信息回答问题：

## 当前知识库
${playbookText}

## 反思上下文
${reflectionText}

## 问题
${question}

## 背景信息
${contextText}

请以JSON格式回答，包含以下字段：
- reasoning: 你的推理过程
- final_answer: 最终答案
- bullet_ids: 引用的知识库条目ID列表

回答：`
  }
}

export class Reflector {
  constructor(
    private llm: LLMClient,
    private maxRetries: number = 3
  ) {}

  async reflect(params: {
    question: string
    generator_output: GeneratorOutput
    playbook: Playbook
    ground_truth?: string
    feedback?: string
    max_refinement_rounds?: number
  }): Promise<ReflectorOutput> {
    const { 
      question, 
      generator_output, 
      playbook, 
      ground_truth, 
      feedback,
      max_refinement_rounds = 1 
    } = params

    const playbookExcerpt = this.makePlaybookExcerpt(playbook, generator_output.bullet_ids)
    const prompt = this.buildPrompt(
      question, 
      generator_output, 
      playbookExcerpt, 
      ground_truth, 
      feedback
    )

    let lastError: Error | null = null

    for (let round = 0; round < max_refinement_rounds; round++) {
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          const response = await this.llm.complete(prompt)
          const data = JSON.parse(response.text)
          
          const bulletTags: BulletTag[] = []
          if (data.bullet_tags && Array.isArray(data.bullet_tags)) {
            data.bullet_tags.forEach((tag: any) => {
              if (tag.id && tag.tag) {
                bulletTags.push({
                  id: tag.id,
                  tag: tag.tag.toLowerCase()
                })
              }
            })
          }

          return {
            reasoning: data.reasoning || '',
            error_identification: data.error_identification || '',
            root_cause_analysis: data.root_cause_analysis || '',
            correct_approach: data.correct_approach || '',
            key_insight: data.key_insight || '',
            bullet_tags: bulletTags,
            raw: data
          }
        } catch (error) {
          lastError = error as Error
          if (attempt + 1 >= this.maxRetries) {
            break
          }
        }
      }
    }

    throw new Error(`Reflector failed after ${this.maxRetries} attempts: ${lastError?.message}`)
  }

  private makePlaybookExcerpt(playbook: Playbook, bulletIds: string[]): string {
    const seen = new Set<string>()
    const lines: string[] = []
    
    bulletIds.forEach(id => {
      if (seen.has(id)) return
      const bullet = playbook.get_bullet(id)
      if (bullet) {
        seen.add(id)
        lines.push(`[${bullet.id}] ${bullet.content}`)
      }
    })

    return lines.join('\n')
  }

  private buildPrompt(
    question: string,
    generatorOutput: GeneratorOutput,
    playbookExcerpt: string,
    groundTruth?: string,
    feedback?: string
  ): string {
    const groundTruthText = groundTruth || '(none)'
    const feedbackText = feedback || '(none)'
    const playbookExcerptText = playbookExcerpt || '(no bullets referenced)'

    return `请分析以下GTV签证评估的回答，并提供改进建议：

## 问题
${question}

## 原始回答
推理过程：${generatorOutput.reasoning}
最终答案：${generatorOutput.final_answer}

## 引用的知识库条目
${playbookExcerptText}

## 正确答案
${groundTruthText}

## 环境反馈
${feedbackText}

请以JSON格式回答，包含以下字段：
- reasoning: 你的分析推理
- error_identification: 错误识别
- root_cause_analysis: 根本原因分析
- correct_approach: 正确方法
- key_insight: 关键洞察
- bullet_tags: 需要标记的知识库条目列表，格式为 [{"id": "条目ID", "tag": "标签"}]

分析：`
  }
}

export class Curator {
  constructor(
    private llm: LLMClient,
    private maxRetries: number = 3
  ) {}

  async curate(params: {
    reflection: ReflectorOutput
    playbook: Playbook
    question_context: string
    progress: string
  }): Promise<CuratorOutput> {
    const { reflection, playbook, question_context, progress } = params

    const prompt = this.buildPrompt(reflection, playbook, question_context, progress)
    
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.llm.complete(prompt)
        const data = JSON.parse(response.text)
        
        const delta = this.createDeltaFromJson(data)
        
        return {
          delta,
          raw: data
        }
      } catch (error) {
        lastError = error as Error
        if (attempt + 1 >= this.maxRetries) {
          break
        }
      }
    }

    throw new Error(`Curator failed after ${this.maxRetries} attempts: ${lastError?.message}`)
  }

  private buildPrompt(
    reflection: ReflectorOutput,
    playbook: Playbook,
    questionContext: string,
    progress: string
  ): string {
    const stats = JSON.stringify(playbook.stats())
    const reflectionJson = JSON.stringify(reflection.raw, null, 2)
    const playbookText = playbook.as_prompt() || '(empty playbook)'

    return `基于以下反思结果，请生成知识库更新操作：

## 进度
${progress}

## 当前知识库统计
${stats}

## 反思结果
${reflectionJson}

## 当前知识库
${playbookText}

## 问题上下文
${questionContext}

请以JSON格式回答，包含operations数组，每个操作包含：
- type: "ADD" | "UPDATE" | "DELETE"
- section: 知识库章节
- content: 内容
- metadata: 元数据
- bullet_id: 条目ID（UPDATE和DELETE时需要）

更新操作：`
  }

  private createDeltaFromJson(data: any): any {
    // 这里应该返回DeltaBatch实例
    // 简化实现，实际应该使用DeltaBatchImpl
    return {
      operations: data.operations || []
    }
  }
}
