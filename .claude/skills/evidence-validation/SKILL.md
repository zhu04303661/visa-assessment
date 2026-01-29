---
name: evidence-validation
description: 验证GTV签证申请所需的证据文档的真实性、完整性和相关性，包括四维验证框架
---

# 证据验证技能 (Evidence Validation Skill)

## 功能描述

此技能实现了GTV签证申请证据的四维验证框架：

### 维度1: 身份验证
- 验证推荐者身份的真实性
- 检查推荐者资质和权威性
- 验证推荐者与申请人的关系

### 维度2: 内容真实性验证
- 检查文档内容的真实性
- 识别可能的伪造或篡改
- 验证时间戳和签名

### 维度3: 关系合理性验证
- 验证推荐者与申请人的工作关系
- 检查推荐内容的合理性
- 评估推荐的可信度

### 维度4: 多源交叉验证
- 交叉验证不同来源的信息
- 检查信息一致性
- 识别矛盾或异常

## 使用方法

### 基本用法

```python
# 在Claude Agent中使用此技能
# 技能会自动识别需要验证证据的请求并调用相应的验证逻辑
```

### 输入参数

- `evidence_documents`: 证据文档列表（必需）
  - `type`: 文档类型（推荐信、证书、专利等）
  - `content`: 文档内容
  - `source`: 文档来源
  - `metadata`: 元数据（时间、签名等）
- `candidate_info`: 候选人信息（必需）
- `recommender_info`: 推荐者信息（可选）

### 输出格式

```json
{
  "validation_results": [
    {
      "document_id": "doc_001",
      "document_type": "推荐信",
      "dimension1_identity": {
        "verified": true,
        "recommender_authority": "high",
        "recommender_credentials": "verified",
        "score": 0.95
      },
      "dimension2_content": {
        "verified": true,
        "authenticity_score": 0.90,
        "tampering_detected": false,
        "timestamp_valid": true,
        "score": 0.90
      },
      "dimension3_relationship": {
        "verified": true,
        "relationship_type": "direct_supervisor",
        "relationship_duration": "3_years",
        "reasonableness_score": 0.88,
        "score": 0.88
      },
      "dimension4_cross_validation": {
        "verified": true,
        "consistency_score": 0.92,
        "contradictions_found": false,
        "score": 0.92
      },
      "overall_score": 0.91,
      "status": "valid",
      "warnings": [],
      "recommendations": []
    }
  ],
  "overall_validation": {
    "all_documents_valid": true,
    "average_score": 0.91,
    "risk_level": "low",
    "needs_manual_review": false
  }
}
```

## 验证标准

### 身份验证标准
- 推荐者必须是行业专家或权威人士
- 推荐者资质可验证（LinkedIn、公司官网等）
- 推荐者与申请人有直接工作关系

### 内容真实性标准
- 文档格式符合标准
- 时间戳合理且可验证
- 签名真实有效
- 无明显的伪造痕迹

### 关系合理性标准
- 推荐者与申请人的关系合理
- 推荐内容与关系匹配
- 推荐时间合理

### 多源交叉验证标准
- 不同来源信息一致
- 无重大矛盾
- 信息相互印证

## 集成说明

此技能与以下模块集成：

- `ace_gtv/document_analyzer.py`: 文档分析模块
- `ace_gtv/assessment_database.py`: 评估数据库
- `BACKEND_FUNCTIONALITY_DESIGN.md`: 后端功能设计文档

## 相关文件

- `COMPREHENSIVE_ASSESSMENT_ARCHITECTURE.md`: 评估架构文档
- `BACKEND_FUNCTIONALITY_DESIGN.md`: 后端功能设计

## 注意事项

- 验证结果仅供参考，不能替代官方审核
- 建议结合人工审查进行最终判断
- 验证过程符合GDPR合规要求

