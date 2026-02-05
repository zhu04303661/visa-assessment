"use client"

import { Select, Space, Tag, Typography } from "@douyinfe/semi-ui"
import { IconServer } from "@douyinfe/semi-icons"
import { useAssistant } from "./AssistantContext"

const { Text } = Typography

// 可用的模型列表
export const AVAILABLE_MODELS = [
  {
    value: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    description: "最新版本，平衡性能与成本",
    tag: "推荐",
    tagColor: "green"
  },
  {
    value: "claude-3-5-sonnet-20241022",
    label: "Claude 3.5 Sonnet",
    description: "高性能，适合复杂任务",
    tag: "高性能",
    tagColor: "blue"
  },
  {
    value: "claude-3-opus-20240229",
    label: "Claude 3 Opus",
    description: "最强大的模型，适合最复杂的任务",
    tag: "最强",
    tagColor: "purple"
  },
  {
    value: "claude-3-haiku-20240307",
    label: "Claude 3 Haiku",
    description: "快速响应，适合简单任务",
    tag: "快速",
    tagColor: "orange"
  }
]

export function SemiModelSelector() {
  const { selectedModel, setSelectedModel } = useAssistant()

  const currentModel = AVAILABLE_MODELS.find(m => m.value === selectedModel) || AVAILABLE_MODELS[0]

  return (
    <Select
      prefix={<IconServer />}
      placeholder="选择模型"
      style={{ width: 200 }}
      value={selectedModel || AVAILABLE_MODELS[0].value}
      onChange={(value) => setSelectedModel(value as string)}
      optionList={AVAILABLE_MODELS.map(model => ({
        value: model.value,
        label: model.label,
        model
      }))}
      renderSelectedItem={(optionNode: { value?: string }) => {
        const model = AVAILABLE_MODELS.find(m => m.value === optionNode?.value)
        if (!model) return null
        return (
          <Space>
            <span>{model.label}</span>
            {model.tag && (
              <Tag color={model.tagColor as any} size="small">{model.tag}</Tag>
            )}
          </Space>
        )
      }}
      renderOptionItem={(renderProps) => {
        const { disabled, selected, value, focused, onMouseEnter, onClick } = renderProps
        const model = AVAILABLE_MODELS.find(m => m.value === value)
        
        return (
          <div
            style={{
              padding: '8px 12px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              backgroundColor: focused ? 'var(--semi-color-fill-0)' : 'transparent',
            }}
            onMouseEnter={onMouseEnter}
            onClick={onClick}
          >
            <Space vertical align="start" spacing={2}>
              <Space>
                <Text strong>{model?.label}</Text>
                {model?.tag && (
                  <Tag color={model.tagColor as any} size="small">{model.tag}</Tag>
                )}
                {selected && <Tag color="blue" size="small">当前</Tag>}
              </Space>
              <Text type="tertiary" size="small">
                {model?.description}
              </Text>
            </Space>
          </div>
        )
      }}
    />
  )
}
