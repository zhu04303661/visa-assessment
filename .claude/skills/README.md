# GTV评估系统 Claude Code Skills

本文档介绍GTV评估系统中可用的Claude Code Skills。

## 概述

本项目包含6个专门的skills，用于支持GTV签证评估系统的各个功能模块：

1. **resume-analysis**: 简历分析
2. **gtv-eligibility-assessment**: GTV资格评估
3. **scoring-calculation**: 评分计算
4. **evidence-validation**: 证据验证
5. **recommendations-generation**: 建议生成
6. **document-processing**: 文档处理

## 安装和配置

### 1. 安装Claude Agent SDK

```bash
pip install claude-agent-sdk
```

### 2. 配置API密钥

设置环境变量：

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

或在`.env.local`文件中：

```env
ANTHROPIC_API_KEY=your_api_key_here
```

### 3. 验证Skills目录

确保`.claude/skills/`目录存在，并且每个skill都有对应的`SKILL.md`文件。

## 使用方法

### 基本使用

```python
from claude_agent_sdk_integration import GTVClaudeAgentManager

# 初始化管理器
manager = GTVClaudeAgentManager()

# 使用简历分析skill
result = manager.analyze_resume(
    resume_text="简历内容...",
    candidate_info={"name": "张三", "field": "digital-technology"}
)

# 使用GTV资格评估skill
result = manager.assess_gtv_eligibility(
    extracted_info={...},
    field="digital-technology"
)

# 使用评分计算skill
result = manager.calculate_score(
    candidate_data={...},
    field="digital-technology"
)
```

### 直接使用Skill

```python
# 直接调用skill
result = manager.use_skill(
    skill_name="resume-analysis",
    input_data={
        "resume_text": "简历内容...",
        "candidate_info": {...}
    }
)
```

## Skills详细说明

### 1. resume-analysis (简历分析)

**功能**: 分析简历内容，提取关键信息

**输入**:
- `resume_text`: 简历文本
- `candidate_info`: 候选人基本信息（可选）

**输出**: 结构化的简历信息，包括教育、工作、技能、成就等

### 2. gtv-eligibility-assessment (GTV资格评估)

**功能**: 评估候选人是否符合GTV签证要求

**输入**:
- `extracted_info`: 从简历提取的信息
- `field`: 申请领域
- `evidence_documents`: 证据文档列表（可选）

**输出**: 评估结果，包括各路径评分和推荐路径

### 3. scoring-calculation (评分计算)

**功能**: 基于三层框架计算GTV签证评分

**输入**:
- `candidate_data`: 候选人数据
- `field`: 申请领域
- `evidence_documents`: 证据文档（可选）

**输出**: 详细的评分结果，包括各层评分和最终分数

### 4. evidence-validation (证据验证)

**功能**: 验证证据文档的真实性和完整性

**输入**:
- `evidence_documents`: 证据文档列表
- `candidate_info`: 候选人信息
- `recommender_info`: 推荐者信息（可选）

**输出**: 验证结果，包括各维度评分和总体验证状态

### 5. recommendations-generation (建议生成)

**功能**: 生成个性化的改进建议和申请策略

**输入**:
- `assessment_data`: 评估数据
- `candidate_info`: 候选人信息（可选）
- `target_pathway`: 目标申请路径（可选）

**输出**: 改进建议、申请策略和时间表

### 6. document-processing (文档处理)

**功能**: 处理和分析各种格式的文档

**输入**:
- `document_path`: 文档路径
- `document_type`: 文档类型（可选）
- `extraction_focus`: 提取重点（可选）

**输出**: 提取的结构化数据和知识条目

## 集成到现有代码

### 方式1: 作为独立服务使用

```python
from claude_agent_sdk_integration import GTVClaudeAgentManager

# 在现有代码中集成
manager = GTVClaudeAgentManager()

# 替换原有的分析逻辑
def analyze_resume_with_claude_skill(resume_text, candidate_info):
    result = manager.analyze_resume(resume_text, candidate_info)
    return result.get("result", {})
```

### 方式2: 与现有模块结合

```python
from claude_agent_sdk_integration import GTVClaudeAgentManager
from ace_gtv.resume_processor import ResumeProcessor

# 结合使用
manager = GTVClaudeAgentManager()
processor = ResumeProcessor()

# 先用Claude Skill进行初步分析
claude_result = manager.analyze_resume(resume_text, candidate_info)

# 再用现有模块进行详细处理
detailed_result = processor.process_resume(resume_text, candidate_info)
```

## 注意事项

1. **API密钥**: 确保正确配置ANTHROPIC_API_KEY
2. **Skills目录**: 确保`.claude/skills/`目录结构正确
3. **错误处理**: 所有方法都返回包含`success`字段的结果字典
4. **性能**: Claude Agent调用可能需要一些时间，建议添加超时处理
5. **成本**: 注意API调用成本，合理使用缓存机制

## 故障排除

### 问题1: SDK未安装

```
ImportError: Claude Agent SDK未安装
```

**解决方案**: 
```bash
pip install claude-agent-sdk
```

### 问题2: API密钥未配置

```
ValueError: 未找到ANTHROPIC_API_KEY
```

**解决方案**: 设置环境变量或传入api_key参数

### 问题3: Skill未找到

```
ValueError: 未知的skill: xxx
```

**解决方案**: 检查`.claude/skills/`目录，确保skill存在

## 相关文档

- [Claude Agent SDK官方文档](https://docs.claude.com/zh-CN/api/agent-sdk)
- [GTV评估系统架构文档](../COMPREHENSIVE_ASSESSMENT_ARCHITECTURE.md)
- [后端功能设计文档](../BACKEND_FUNCTIONALITY_DESIGN.md)

## 更新日志

- **2025-01-XX**: 初始版本，创建6个基础skills
- 后续更新将在此记录

