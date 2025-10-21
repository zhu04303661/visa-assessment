import { openai } from "@ai-sdk/openai"
import { azure } from "@ai-sdk/azure"

export type AIProvider = "openai" | "azure"

export interface AIConfig {
  provider: AIProvider
  model: string
  maxTokens: number
  temperature: number
}

export function getAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER as AIProvider) || "openai"
  const maxTokens = parseInt(process.env.MAX_TOKENS || "4000")
  const temperature = parseFloat(process.env.TEMPERATURE || "0.7")

  let model: string
  if (provider === "azure") {
    model = process.env.AZURE_MODEL || "gpt-4o"
  } else {
    model = process.env.OPENAI_MODEL || "gpt-4o"
  }

  return {
    provider,
    model,
    maxTokens,
    temperature
  }
}

export function getAIModel() {
  const config = getAIConfig()
  
  if (config.provider === "azure") {
    return azure(config.model, {
      apiKey: process.env.AZURE_API_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview"
    })
  } else {
    return openai(config.model, {
      apiKey: process.env.OPENAI_API_KEY
    })
  }
}

export function getAIOptions() {
  const config = getAIConfig()
  
  return {
    maxTokens: config.maxTokens,
    temperature: config.temperature
  }
}

// 验证配置
export function validateAIConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  const config = getAIConfig()

  if (config.provider === "azure") {
    if (!process.env.AZURE_API_KEY) {
      errors.push("AZURE_API_KEY is required for Azure provider")
    }
    if (!process.env.AZURE_OPENAI_ENDPOINT) {
      errors.push("AZURE_OPENAI_ENDPOINT is required for Azure provider")
    }
    if (!process.env.AZURE_OPENAI_DEPLOYMENT_NAME) {
      errors.push("AZURE_OPENAI_DEPLOYMENT_NAME is required for Azure provider")
    }
    if (!process.env.AZURE_RESOURCE_NAME) {
      errors.push("AZURE_RESOURCE_NAME is required for Azure provider")
    }
  } else {
    if (!process.env.OPENAI_API_KEY) {
      errors.push("OPENAI_API_KEY is required for OpenAI provider")
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
