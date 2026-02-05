"use client"

import { useState, useMemo } from "react"
import { Select, Tag, Switch, Space, Typography } from "@douyinfe/semi-ui"
import { IconSetting, IconBolt } from "@douyinfe/semi-icons"
import { useAssistant, AVAILABLE_SKILLS } from "./AssistantContext"

const { Text } = Typography

export function SemiSkillSelector() {
  const { 
    skillMode, 
    setSkillMode, 
    selectedSkill, 
    setSelectedSkill 
  } = useAssistant()

  const skillOptions = useMemo(() => 
    AVAILABLE_SKILLS.map(skill => ({
      value: skill.name,
      label: (
        <Space>
          <span>{skill.icon}</span>
          <span>{skill.displayName}</span>
        </Space>
      ),
      skill
    })), 
  [])

  const currentSkill = AVAILABLE_SKILLS.find(s => s.name === selectedSkill)

  return (
    <Space align="center">
      {/* 自动/手动模式切换 */}
      <Space align="center" spacing={4}>
        <IconBolt style={{ color: skillMode === 'auto' ? 'var(--semi-color-primary)' : 'var(--semi-color-text-2)' }} />
        <Switch
          checked={skillMode === 'manual'}
          onChange={(checked) => {
            setSkillMode(checked ? 'manual' : 'auto')
            if (!checked) {
              setSelectedSkill(null)
            }
          }}
          size="small"
        />
        <IconSetting style={{ color: skillMode === 'manual' ? 'var(--semi-color-primary)' : 'var(--semi-color-text-2)' }} />
      </Space>

      {/* Skill 选择器 */}
      <Select
        placeholder="选择技能"
        style={{ width: 180 }}
        value={selectedSkill || undefined}
        onChange={(value) => setSelectedSkill(value as string)}
        disabled={skillMode === 'auto'}
        showClear
        optionList={skillOptions}
        renderSelectedItem={(optionNode: { value?: string }) => {
          const skill = AVAILABLE_SKILLS.find(s => s.name === optionNode?.value)
          if (!skill) return null
          return (
            <Space>
              <span>{skill.icon}</span>
              <span>{skill.displayName}</span>
            </Space>
          )
        }}
        renderOptionItem={(renderProps) => {
          const { disabled, selected, label, value, focused, onMouseEnter, onClick } = renderProps
          const skill = AVAILABLE_SKILLS.find(s => s.name === value)
          
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
                  <span style={{ fontSize: 16 }}>{skill?.icon}</span>
                  <Text strong>{skill?.displayName}</Text>
                  {selected && <Tag color="blue" size="small">已选</Tag>}
                </Space>
                <Text type="tertiary" size="small" style={{ marginLeft: 24 }}>
                  {skill?.description}
                </Text>
              </Space>
            </div>
          )
        }}
      />

      {/* 模式提示 */}
      {skillMode === 'auto' && (
        <Tag color="blue" size="small">AI 自动匹配</Tag>
      )}
    </Space>
  )
}
