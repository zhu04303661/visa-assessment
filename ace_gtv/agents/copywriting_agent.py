#!/usr/bin/env python3
"""
GTV签证文案制作Agent
使用Claude/OpenAI进行智能文案制作，支持多阶段工作流
"""

import os
import json
import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable
from pathlib import Path

from utils.logger_config import setup_module_logger

logger = setup_module_logger("copywriting_agent", os.getenv("LOG_LEVEL", "INFO"))


class CopywritingAgent:
    """文案制作Agent - 使用LLM进行智能文案制作"""
    
    # 材料包模板
    DOCUMENT_TEMPLATES = {
        "personal_statement": {
            "name": "个人陈述",
            "system_prompt": """你是一位专业的英国GTV签证申请文案专家，专门帮助申请人撰写个人陈述。

个人陈述要求：
1. 清晰展示申请人的专业背景和成就
2. 突出与GTV签证要求相关的技术创新和影响力
3. 说明为什么选择英国以及未来发展计划
4. 语言专业、有说服力，符合英国移民局要求

结构建议：
- 开篇：个人定位和核心竞争力
- 主体：专业成就、技术创新、行业影响力
- 结尾：英国发展计划和能带来的价值
""",
            "user_prompt_template": """请根据以下申请人信息，撰写一份专业的个人陈述：

## 申请人基本信息
{applicant_info}

## 原始简历内容
{resume_content}

## 主要成就和证据
{achievements}

## 参考案例要点
{reference_points}

请撰写一份800-1200词的个人陈述，要求：
1. 使用第一人称
2. 结构清晰，逻辑连贯
3. 突出技术创新和影响力
4. 展示与英国科技生态的关联
5. 体现专业性和说服力

请用英文撰写。"""
        },
        
        "cv_resume": {
            "name": "简历/CV",
            "system_prompt": """你是一位专业的简历优化专家，专门帮助GTV签证申请人优化CV。

CV要求：
1. 格式专业，符合英国标准
2. 突出技术成就和量化指标
3. 清晰展示职业发展轨迹
4. 强调国际影响力和行业认可

结构建议：
- Personal Profile: 2-3句话概括
- Professional Experience: 按时间倒序
- Key Achievements: 量化的成就
- Technical Skills: 分类列出
- Publications/Patents: 如有
- Awards & Recognition: 如有
""",
            "user_prompt_template": """请根据以下信息，优化并生成专业的CV：

## 原始简历
{resume_content}

## 补充信息
{additional_info}

## 参考案例CV结构
{reference_cv}

请生成一份专业的GTV签证申请CV，要求：
1. 格式清晰，易于阅读
2. 突出技术成就，使用数据量化
3. 强调国际影响力
4. 长度控制在2页以内
5. 使用专业英文表述

请使用Markdown格式输出。"""
        },
        
        "recommendation_letter": {
            "name": "推荐信",
            "system_prompt": """你是一位专业的推荐信撰写专家，帮助准备GTV签证申请的推荐信。

推荐信要求：
1. 推荐人角度出发，展示对申请人的专业评价
2. 具体事例支持，避免空洞赞美
3. 突出申请人的技术能力和行业影响力
4. 说明为什么认为申请人符合GTV标准

结构建议：
- 开篇：推荐人自我介绍和与申请人的关系
- 主体：具体事例展示申请人能力
- 评价：对申请人专业水平的评估
- 结尾：明确推荐和联系方式
""",
            "user_prompt_template": """请根据以下信息，撰写一封推荐信：

## 推荐人信息
{recommender_info}

## 申请人信息
{applicant_info}

## 推荐人与申请人的关系
{relationship}

## 希望突出的要点
{key_points}

## 参考案例
{reference_letter}

请撰写一封专业的推荐信，要求：
1. 使用推荐人的口吻
2. 包含具体事例和成就
3. 表达明确的推荐意向
4. 长度适中（1页左右）
5. 使用专业英文

请使用正式书信格式。"""
        },
        
        "cover_letter": {
            "name": "申请信",
            "system_prompt": """你是一位专业的签证申请信撰写专家。

申请信要求：
1. 正式的书信格式
2. 清晰说明申请目的
3. 概述申请人资质
4. 表达对申请的信心
""",
            "user_prompt_template": """请根据以下信息，撰写GTV签证申请信：

## 申请人信息
{applicant_info}

## 申请路径
{pathway}

## 主要资质概述
{qualifications}

请撰写一封正式的申请信，要求：
1. 正式书信格式
2. 简洁明了
3. 包含必要的申请信息
4. 使用专业英文"""
        },
        
        "endorsement_letter": {
            "name": "背书申请材料",
            "system_prompt": """你是一位专业的Tech Nation背书申请专家。

背书申请要求：
1. 符合Tech Nation的评估标准
2. 清晰展示Mandatory Criteria和Optional Criteria
3. 提供充分的证据支持
4. 结构化呈现申请人资质
""",
            "user_prompt_template": """请根据以下信息，准备Tech Nation背书申请材料：

## 申请人信息
{applicant_info}

## 申请路径
{pathway}

## Mandatory Criteria证据
{mandatory_evidence}

## Optional Criteria证据
{optional_evidence}

## 参考成功案例
{reference_case}

请准备背书申请材料，包括：
1. 申请概述
2. Mandatory Criteria说明
3. Optional Criteria说明（选择最强的2个）
4. 证据清单和说明

使用专业英文，结构清晰。"""
        },
        
        "evidence_summary": {
            "name": "证据材料摘要",
            "system_prompt": """你是一位专业的签证证据材料整理专家。

证据摘要要求：
1. 清晰分类所有证据
2. 说明每项证据的作用
3. 关联到评估标准
4. 提供完整的证据清单
""",
            "user_prompt_template": """请根据以下证据材料，生成证据摘要：

## 已有证据列表
{evidence_list}

## 评估标准
{criteria}

## 参考案例证据结构
{reference_evidence}

请生成证据材料摘要，包括：
1. 证据分类和编号
2. 每项证据的说明
3. 与评估标准的关联
4. 证据强度评估
5. 建议补充的证据

使用清晰的表格或列表格式。"""
        }
    }
    
    def __init__(self):
        """初始化文案Agent"""
        self.llm_provider = os.getenv("LLM_PROVIDER", "OPENAI")
        self._init_llm_client()
        logger.info(f"文案Agent初始化完成，使用 {self.llm_provider}")
    
    def _init_llm_client(self):
        """初始化LLM客户端"""
        try:
            if self.llm_provider == "OPENAI":
                from openai import OpenAI
                api_key = os.getenv("OPENAI_API_KEY")
                if api_key:
                    self.client = OpenAI(api_key=api_key)
                    self.model = os.getenv("OPENAI_MODEL", "gpt-4o")
                else:
                    logger.warning("OPENAI_API_KEY未配置")
                    self.client = None
            
            elif self.llm_provider == "AZURE":
                from openai import AzureOpenAI
                self.client = AzureOpenAI(
                    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                    api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
                    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
                )
                self.model = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4")
            
            elif self.llm_provider == "ENNCLOUD":
                # 使用直接 HTTP 请求连接 enncloud 代理（不使用 Bearer 前缀）
                import requests
                api_key = os.getenv("ENNCLOUD_API_KEY")
                base_url = os.getenv("ENNCLOUD_BASE_URL", "https://ai.enncloud.cn/v1")
                if api_key:
                    self.enncloud_api_key = api_key
                    self.enncloud_base_url = base_url
                    self.client = "ENNCLOUD"  # 标记为特殊处理
                    self.model = os.getenv("ENNCLOUD_MODEL", "GLM-4.5-Air")
                    logger.info(f"使用EnnCloud代理: {base_url}, 模型: {self.model}")
                else:
                    logger.warning("ENNCLOUD_API_KEY未配置")
                    self.client = None
            
            elif self.llm_provider == "ANTHROPIC":
                import anthropic
                api_key = os.getenv("ANTHROPIC_API_KEY")
                base_url = os.getenv("ANTHROPIC_BASE_URL")
                if api_key:
                    # 支持自定义 base_url（用于代理服务器）
                    if base_url:
                        self.client = anthropic.Anthropic(api_key=api_key, base_url=base_url)
                        logger.info(f"使用Anthropic代理: {base_url}")
                    else:
                        self.client = anthropic.Anthropic(api_key=api_key)
                    self.model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
                else:
                    logger.warning("ANTHROPIC_API_KEY未配置")
                    self.client = None
            else:
                logger.warning(f"不支持的LLM提供商: {self.llm_provider}")
                self.client = None
                
        except Exception as e:
            logger.error(f"初始化LLM客户端失败: {e}")
            self.client = None
    
    def _call_llm(self, system_prompt: str, user_prompt: str, 
                  temperature: float = 0.7) -> Dict[str, Any]:
        """调用LLM"""
        if not self.client:
            return {"success": False, "error": "LLM客户端未初始化"}
        
        try:
            if self.llm_provider == "ENNCLOUD":
                # 使用直接 HTTP 请求（不带 Bearer 前缀）
                import requests
                url = f"{self.enncloud_base_url}/chat/completions"
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.enncloud_api_key}"
                }
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": temperature,
                    "max_tokens": 4096,
                    "stream": False
                }
                response = requests.post(url, headers=headers, json=payload, timeout=120)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
            elif self.llm_provider == "ANTHROPIC":
                message = self.client.messages.create(
                    model=self.model,
                    max_tokens=4096,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}]
                )
                content = message.content[0].text
            else:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=temperature
                )
                content = response.choices[0].message.content
            
            return {"success": True, "content": content}
            
        except Exception as e:
            logger.error(f"LLM调用失败: {e}")
            return {"success": False, "error": str(e)}
    
    def analyze_raw_materials(self, raw_materials: Dict[str, Any]) -> Dict[str, Any]:
        """
        分析原始材料，提取关键信息
        
        Args:
            raw_materials: 原始材料字典
            
        Returns:
            分析结果
        """
        system_prompt = """你是一位专业的GTV签证申请材料分析专家。
请分析提供的原始材料，提取关键信息，并评估申请人的资质。

分析维度：
1. 个人背景信息
2. 教育和职业经历
3. 技术成就和创新
4. 行业影响力和认可
5. 符合GTV标准的证据
6. 潜在的弱点和补充建议"""
        
        # 构建材料内容
        material_content = ""
        for category, files in raw_materials.items():
            material_content += f"\n## {category}\n"
            for file_info in files:
                if 'content' in file_info:
                    material_content += f"\n### {file_info['name']}\n{file_info['content']}\n"
                else:
                    material_content += f"\n### {file_info['name']} (文件)\n"
        
        user_prompt = f"""请分析以下原始材料：

{material_content}

请提供以下信息（JSON格式）：
{{
    "applicant_profile": {{
        "name": "姓名",
        "nationality": "国籍",
        "current_role": "当前职位",
        "industry": "行业领域",
        "experience_years": "工作年限"
    }},
    "education": [
        {{"degree": "学位", "institution": "学校", "year": "年份"}}
    ],
    "career_highlights": ["职业亮点1", "职业亮点2"],
    "technical_achievements": ["技术成就1", "技术成就2"],
    "industry_recognition": ["行业认可1", "行业认可2"],
    "gtv_evidence": {{
        "mandatory_criteria": ["证据1", "证据2"],
        "optional_criteria": ["证据1", "证据2"]
    }},
    "strengths": ["优势1", "优势2"],
    "weaknesses": ["不足1", "不足2"],
    "recommendations": ["建议1", "建议2"],
    "recommended_pathway": "Exceptional Talent/Exceptional Promise",
    "overall_assessment": "整体评估说明"
}}"""
        
        result = self._call_llm(system_prompt, user_prompt, temperature=0.3)
        
        if result["success"]:
            # 尝试解析JSON
            try:
                content = result["content"]
                # 提取JSON部分
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    analysis = json.loads(json_match.group())
                    return {"success": True, "data": analysis}
                else:
                    return {"success": True, "data": {"raw_analysis": content}}
            except json.JSONDecodeError:
                return {"success": True, "data": {"raw_analysis": result["content"]}}
        
        return result
    
    def generate_document(self, document_type: str, 
                         context: Dict[str, Any],
                         reference_samples: List[str] = None) -> Dict[str, Any]:
        """
        生成指定类型的文档
        
        Args:
            document_type: 文档类型
            context: 上下文信息
            reference_samples: 参考样本
            
        Returns:
            生成的文档
        """
        if document_type not in self.DOCUMENT_TEMPLATES:
            return {"success": False, "error": f"不支持的文档类型: {document_type}"}
        
        template = self.DOCUMENT_TEMPLATES[document_type]
        system_prompt = template["system_prompt"]
        
        # 填充用户提示模板
        user_prompt = template["user_prompt_template"]
        
        # 替换模板变量
        for key, value in context.items():
            placeholder = "{" + key + "}"
            if placeholder in user_prompt:
                if isinstance(value, (dict, list)):
                    value = json.dumps(value, ensure_ascii=False, indent=2)
                user_prompt = user_prompt.replace(placeholder, str(value))
        
        # 添加参考样本
        if reference_samples:
            user_prompt += "\n\n## 参考样本\n"
            for i, sample in enumerate(reference_samples, 1):
                user_prompt += f"\n### 样本 {i}\n{sample}\n"
        
        # 清理未填充的占位符
        user_prompt = re.sub(r'\{[^}]+\}', '（暂无信息）', user_prompt)
        
        result = self._call_llm(system_prompt, user_prompt)
        
        if result["success"]:
            return {
                "success": True,
                "document_type": document_type,
                "content": result["content"],
                "generated_at": datetime.now().isoformat()
            }
        
        return result
    
    def optimize_document(self, content: str, 
                         optimization_type: str = "comprehensive",
                         specific_instructions: str = None) -> Dict[str, Any]:
        """
        优化文档内容
        
        Args:
            content: 原始内容
            optimization_type: 优化类型
            specific_instructions: 特定指导
            
        Returns:
            优化后的内容
        """
        optimization_prompts = {
            "comprehensive": "请全面优化以下文档，包括语法、表达、结构和说服力：",
            "grammar": "请检查并修正以下文档的语法和拼写错误：",
            "clarity": "请优化以下文档，使其更加清晰易读：",
            "professional": "请使以下文档更加专业和正式：",
            "persuasive": "请增强以下文档的说服力，突出申请人的优势：",
            "concise": "请精简以下文档，保留核心内容，去除冗余："
        }
        
        system_prompt = """你是一位专业的英文文案编辑，专门优化GTV签证申请材料。
请根据要求优化提供的文档，确保：
1. 语法正确，表达地道
2. 结构清晰，逻辑连贯
3. 内容专业，有说服力
4. 符合签证申请的正式要求"""
        
        base_prompt = optimization_prompts.get(optimization_type, optimization_prompts["comprehensive"])
        
        user_prompt = f"""{base_prompt}

{content}

"""
        if specific_instructions:
            user_prompt += f"\n特别注意：{specific_instructions}\n"
        
        user_prompt += """
请提供：
1. 优化后的完整文档
2. 主要修改说明（用<!-- CHANGES -->标记）"""
        
        result = self._call_llm(system_prompt, user_prompt)
        
        if result["success"]:
            content = result["content"]
            # 分离优化内容和修改说明
            if "<!-- CHANGES -->" in content:
                parts = content.split("<!-- CHANGES -->")
                optimized_content = parts[0].strip()
                changes = parts[1].strip() if len(parts) > 1 else ""
            else:
                optimized_content = content
                changes = ""
            
            return {
                "success": True,
                "optimized_content": optimized_content,
                "changes": changes,
                "optimization_type": optimization_type
            }
        
        return result
    
    def review_document(self, content: str, 
                       document_type: str,
                       criteria: List[str] = None) -> Dict[str, Any]:
        """
        审核文档质量
        
        Args:
            content: 文档内容
            document_type: 文档类型
            criteria: 审核标准
            
        Returns:
            审核结果
        """
        system_prompt = """你是一位专业的GTV签证申请材料审核专家。
请根据标准审核提供的文档，给出详细评估。"""
        
        default_criteria = [
            "语法和拼写正确性",
            "专业性和正式程度",
            "结构和逻辑清晰度",
            "与GTV要求的相关性",
            "说服力和影响力",
            "完整性"
        ]
        
        review_criteria = criteria or default_criteria
        
        user_prompt = f"""请审核以下{document_type}文档：

{content}

审核标准：
{chr(10).join(f'- {c}' for c in review_criteria)}

请提供（JSON格式）：
{{
    "overall_score": 85,  // 0-100分
    "criteria_scores": {{
        "标准1": {{"score": 90, "comment": "评价"}},
        ...
    }},
    "strengths": ["优点1", "优点2"],
    "improvements": ["改进建议1", "改进建议2"],
    "critical_issues": ["严重问题（如有）"],
    "recommendation": "通过/需要修改/需要重写"
}}"""
        
        result = self._call_llm(system_prompt, user_prompt, temperature=0.3)
        
        if result["success"]:
            try:
                content = result["content"]
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    review = json.loads(json_match.group())
                    return {"success": True, "data": review}
                else:
                    return {"success": True, "data": {"raw_review": content}}
            except json.JSONDecodeError:
                return {"success": True, "data": {"raw_review": result["content"]}}
        
        return result
    
    def generate_batch(self, document_types: List[str], 
                      context: Dict[str, Any],
                      callback: Callable = None) -> Dict[str, Any]:
        """
        批量生成多个文档
        
        Args:
            document_types: 文档类型列表
            context: 上下文信息
            callback: 进度回调函数
            
        Returns:
            生成结果
        """
        results = {}
        total = len(document_types)
        
        for i, doc_type in enumerate(document_types, 1):
            logger.info(f"生成文档 {i}/{total}: {doc_type}")
            
            result = self.generate_document(doc_type, context)
            results[doc_type] = result
            
            if callback:
                callback({
                    "current": i,
                    "total": total,
                    "document_type": doc_type,
                    "success": result.get("success", False)
                })
        
        successful = sum(1 for r in results.values() if r.get("success"))
        
        return {
            "success": True,
            "results": results,
            "summary": {
                "total": total,
                "successful": successful,
                "failed": total - successful
            }
        }
    
    def compare_with_reference(self, content: str, 
                              reference_content: str,
                              aspect: str = "quality") -> Dict[str, Any]:
        """
        与参考案例对比分析
        
        Args:
            content: 当前内容
            reference_content: 参考内容
            aspect: 对比维度
            
        Returns:
            对比分析结果
        """
        system_prompt = """你是一位专业的文案对比分析专家。
请对比分析两份文档，找出差距和改进空间。"""
        
        user_prompt = f"""请对比以下两份文档：

## 当前文档
{content}

## 参考成功案例
{reference_content}

对比维度：{aspect}

请分析：
1. 两份文档的主要差异
2. 参考案例的优秀之处
3. 当前文档可以借鉴的地方
4. 具体的改进建议

请以JSON格式输出：
{{
    "differences": ["差异1", "差异2"],
    "reference_strengths": ["参考优点1", "参考优点2"],
    "learnings": ["可借鉴点1", "可借鉴点2"],
    "improvement_suggestions": [
        {{"area": "领域", "current": "当前状态", "suggestion": "改进建议"}}
    ],
    "gap_score": 75  // 差距评分，0-100，100表示完全匹配
}}"""
        
        result = self._call_llm(system_prompt, user_prompt, temperature=0.3)
        
        if result["success"]:
            try:
                content = result["content"]
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    comparison = json.loads(json_match.group())
                    return {"success": True, "data": comparison}
                else:
                    return {"success": True, "data": {"raw_comparison": content}}
            except json.JSONDecodeError:
                return {"success": True, "data": {"raw_comparison": result["content"]}}
        
        return result
    
    def suggest_improvements(self, analysis: Dict[str, Any],
                            target_pathway: str = "Exceptional Talent") -> Dict[str, Any]:
        """
        基于分析结果提供改进建议
        
        Args:
            analysis: 材料分析结果
            target_pathway: 目标申请路径
            
        Returns:
            改进建议
        """
        system_prompt = """你是一位资深的GTV签证申请顾问。
请基于材料分析结果，提供具体、可操作的改进建议。"""
        
        user_prompt = f"""基于以下分析结果，请提供改进建议：

## 材料分析
{json.dumps(analysis, ensure_ascii=False, indent=2)}

## 目标路径
{target_pathway}

请提供：
1. 短期可执行的改进（1周内）
2. 中期可执行的改进（1-3个月）
3. 长期建议（如适用）
4. 优先级排序
5. 预期改进效果

以JSON格式输出：
{{
    "immediate_actions": [
        {{"action": "行动", "priority": "高/中/低", "expected_impact": "预期效果"}}
    ],
    "short_term_improvements": [...],
    "medium_term_improvements": [...],
    "long_term_suggestions": [...],
    "priority_ranking": ["最重要的改进1", "最重要的改进2", ...],
    "success_probability_increase": "预计提升百分比"
}}"""
        
        result = self._call_llm(system_prompt, user_prompt, temperature=0.5)
        
        if result["success"]:
            try:
                content = result["content"]
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    suggestions = json.loads(json_match.group())
                    return {"success": True, "data": suggestions}
                else:
                    return {"success": True, "data": {"raw_suggestions": content}}
            except json.JSONDecodeError:
                return {"success": True, "data": {"raw_suggestions": result["content"]}}
        
        return result
    
    def translate_document(self, content: str, 
                          source_lang: str = "zh",
                          target_lang: str = "en") -> Dict[str, Any]:
        """
        翻译文档
        
        Args:
            content: 原始内容
            source_lang: 源语言
            target_lang: 目标语言
            
        Returns:
            翻译结果
        """
        lang_names = {
            "zh": "中文",
            "en": "英文",
            "ja": "日文"
        }
        
        system_prompt = f"""你是一位专业的{lang_names.get(source_lang, source_lang)}到{lang_names.get(target_lang, target_lang)}翻译专家。
请准确翻译签证申请相关文档，确保：
1. 专业术语准确
2. 表达地道自然
3. 保持原文的专业性和说服力
4. 适当本地化，符合目标语言习惯"""
        
        user_prompt = f"""请将以下内容从{lang_names.get(source_lang, source_lang)}翻译成{lang_names.get(target_lang, target_lang)}：

{content}

请直接输出翻译结果，不需要额外说明。"""
        
        result = self._call_llm(system_prompt, user_prompt, temperature=0.3)
        
        if result["success"]:
            return {
                "success": True,
                "translated_content": result["content"],
                "source_lang": source_lang,
                "target_lang": target_lang
            }
        
        return result


# 测试代码
if __name__ == "__main__":
    agent = CopywritingAgent()
    
    if agent.client:
        # 测试分析功能
        test_materials = {
            "简历": [{
                "name": "resume.txt",
                "content": """
张三
高级软件工程师
5年AI/ML经验

工作经历：
- 某科技公司 AI工程师 2020-至今
- 参与开源项目，获得1000+ Stars
- 发表2篇机器学习论文
                """
            }]
        }
        
        print("测试材料分析...")
        result = agent.analyze_raw_materials(test_materials)
        print(json.dumps(result, ensure_ascii=False, indent=2)[:500])
    else:
        print("LLM客户端未初始化，请检查API密钥配置")
