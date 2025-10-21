import { 
  Sample, 
  EnvironmentResult, 
  AdapterStepResult, 
  TaskEnvironment, 
  GeneratorOutput, 
  Playbook 
} from './types'
import { Generator, Reflector, Curator } from './roles'
import { PlaybookImpl } from './playbook'

export class GTVTaskEnvironment implements TaskEnvironment {
  async evaluate(sample: Sample, generator_output: GeneratorOutput): Promise<EnvironmentResult> {
    // 简化的GTV评估逻辑
    // 实际实现应该调用真实的GTV评估API
    const isCorrect = this.evaluateGTVResponse(sample, generator_output)
    const feedback = isCorrect 
      ? "回答正确，符合GTV签证要求" 
      : "回答需要改进，请参考GTV签证官方指南"
    
    return {
      feedback,
      ground_truth: sample.ground_truth,
      metrics: {
        correctness: isCorrect ? 1 : 0,
        completeness: this.calculateCompleteness(generator_output),
        relevance: this.calculateRelevance(sample, generator_output)
      }
    }
  }

  private evaluateGTVResponse(sample: Sample, output: GeneratorOutput): boolean {
    // 简化的正确性评估
    // 实际应该使用更复杂的GTV专业知识评估
    const answer = output.final_answer.toLowerCase()
    const question = sample.question.toLowerCase()
    
    // 基本关键词匹配
    if (question.includes('gtv') && answer.includes('global talent visa')) {
      return true
    }
    if (question.includes('eligibility') && answer.includes('criteria')) {
      return true
    }
    if (question.includes('application') && answer.includes('process')) {
      return true
    }
    
    return false
  }

  private calculateCompleteness(output: GeneratorOutput): number {
    // 基于回答长度和内容丰富度计算完整性
    const reasoningLength = output.reasoning.length
    const answerLength = output.final_answer.length
    const bulletCount = output.bullet_ids.length
    
    // 归一化到0-1范围
    const reasoningScore = Math.min(reasoningLength / 500, 1)
    const answerScore = Math.min(answerLength / 200, 1)
    const bulletScore = Math.min(bulletCount / 5, 1)
    
    return (reasoningScore + answerScore + bulletScore) / 3
  }

  private calculateRelevance(sample: Sample, output: GeneratorOutput): number {
    // 基于关键词匹配计算相关性
    const questionWords = sample.question.toLowerCase().split(/\s+/)
    const answerWords = output.final_answer.toLowerCase().split(/\s+/)
    
    const commonWords = questionWords.filter(word => 
      answerWords.includes(word) && word.length > 3
    )
    
    return Math.min(commonWords.length / questionWords.length, 1)
  }
}

export class ACEAdapter {
  private playbook: PlaybookImpl
  private recentReflections: string[] = []
  private reflectionWindow = 3

  constructor(
    private generator: Generator,
    private reflector: Reflector,
    private curator: Curator,
    initialPlaybook?: PlaybookImpl
  ) {
    this.playbook = initialPlaybook || new PlaybookImpl()
  }

  async processSample(
    sample: Sample,
    environment: TaskEnvironment,
    progress: string
  ): Promise<AdapterStepResult> {
    // 1. 生成回答
    const generatorOutput = await this.generator.generate({
      question: sample.question,
      context: sample.context,
      playbook: this.playbook,
      reflection: this.getReflectionContext()
    })

    // 2. 环境评估
    const environmentResult = await environment.evaluate(sample, generatorOutput)

    // 3. 反思
    const reflection = await this.reflector.reflect({
      question: sample.question,
      generator_output: generatorOutput,
      playbook: this.playbook,
      ground_truth: environmentResult.ground_truth,
      feedback: environmentResult.feedback
    })

    // 4. 应用反思标签
    this.applyBulletTags(reflection)
    this.updateRecentReflections(reflection)

    // 5. 策展更新
    const curatorOutput = await this.curator.curate({
      reflection,
      playbook: this.playbook,
      question_context: this.buildQuestionContext(sample, environmentResult),
      progress
    })

    // 6. 应用知识库更新
    this.playbook.apply_delta(curatorOutput.delta)

    return {
      sample,
      generator_output: generatorOutput,
      environment_result: environmentResult,
      reflection,
      curator_output: curatorOutput,
      playbook_snapshot: this.playbook.as_prompt()
    }
  }

  private getReflectionContext(): string {
    return this.recentReflections.join('\n---\n')
  }

  private updateRecentReflections(reflection: any): void {
    const serialized = JSON.stringify(reflection.raw)
    this.recentReflections.push(serialized)
    
    if (this.recentReflections.length > this.reflectionWindow) {
      this.recentReflections = this.recentReflections.slice(-this.reflectionWindow)
    }
  }

  private applyBulletTags(reflection: any): void {
    if (reflection.bullet_tags && Array.isArray(reflection.bullet_tags)) {
      reflection.bullet_tags.forEach((tag: any) => {
        try {
          this.playbook.tag_bullet(tag.id, tag.tag)
        } catch (error) {
          // 忽略标签错误
        }
      })
    }
  }

  private buildQuestionContext(sample: Sample, environmentResult: EnvironmentResult): string {
    return [
      `question: ${sample.question}`,
      `context: ${sample.context}`,
      `metadata: ${JSON.stringify(sample.metadata)}`,
      `feedback: ${environmentResult.feedback}`,
      `ground_truth: ${environmentResult.ground_truth || 'none'}`
    ].join('\n')
  }

  getPlaybook(): PlaybookImpl {
    return this.playbook
  }

  getStats() {
    return this.playbook.stats()
  }
}
