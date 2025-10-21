// ACE (Agentic Context Engineering) Types
// 基于论文 "Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models"

export interface Bullet {
  id: string
  content: string
  section: string
  metadata: {
    helpful: number
    harmful: number
    [key: string]: any
  }
  tags: string[]
}

export interface Playbook {
  bullets: Bullet[]
  sections: string[]
  stats(): PlaybookStats
  as_prompt(): string
  get_bullet(id: string): Bullet | null
  tag_bullet(id: string, tag: string): void
  apply_delta(delta: DeltaBatch): void
}

export interface PlaybookStats {
  total_bullets: number
  helpful_bullets: number
  harmful_bullets: number
  sections: { [section: string]: number }
}

export interface DeltaOperation {
  type: 'ADD' | 'UPDATE' | 'DELETE'
  section: string
  content: string
  metadata: { [key: string]: any }
  bullet_id?: string
}

export interface DeltaBatch {
  operations: DeltaOperation[]
  from_json(data: any): DeltaBatch
}

export interface Sample {
  question: string
  context: string
  ground_truth?: string
  metadata: { [key: string]: any }
}

export interface EnvironmentResult {
  feedback: string
  ground_truth?: string
  metrics: { [key: string]: number }
}

export interface GeneratorOutput {
  reasoning: string
  final_answer: string
  bullet_ids: string[]
  raw: { [key: string]: any }
}

export interface ReflectorOutput {
  reasoning: string
  error_identification: string
  root_cause_analysis: string
  correct_approach: string
  key_insight: string
  bullet_tags: BulletTag[]
  raw: { [key: string]: any }
}

export interface BulletTag {
  id: string
  tag: string
}

export interface CuratorOutput {
  delta: DeltaBatch
  raw: { [key: string]: any }
}

export interface AdapterStepResult {
  sample: Sample
  generator_output: GeneratorOutput
  environment_result: EnvironmentResult
  reflection: ReflectorOutput
  curator_output: CuratorOutput
  playbook_snapshot: string
}

export interface LLMClient {
  complete(prompt: string, options?: any): Promise<{ text: string }>
}

export interface TaskEnvironment {
  evaluate(sample: Sample, generator_output: GeneratorOutput): Promise<EnvironmentResult>
}
