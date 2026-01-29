#!/usr/bin/env python3
"""
GTV签证文案制作Agent
支持参考材料结构理解和自定义提示词的可配置Agent
"""

import os
import json
import sqlite3
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

from utils.logger_config import setup_module_logger

logger = setup_module_logger("material_agent", os.getenv("LOG_LEVEL", "INFO"))


# 默认提示词模板
DEFAULT_PROMPTS = {
    "personal_statement": {
        "system": """你是一位专业的GTV签证个人陈述(Personal Statement)撰写专家。
你的任务是帮助申请人撰写一份有说服力的个人陈述，展示其在数字科技领域的卓越才能。

个人陈述要求：
1. 长度：1000-1500字（英文）
2. 结构清晰：开篇吸引、背景介绍、核心成就、英国愿景、总结
3. 突出技术领导力和创新贡献
4. 展示对英国科技生态的了解和贡献计划
5. 语言专业、有说服力，避免空洞陈述

写作风格：
- 使用第一人称
- 具体数据和案例支撑
- 突出独特性和差异化
- 展示热情和专业性""",
        "user_template": """请基于以下申请人信息，撰写一份GTV签证个人陈述：

{context}

{custom_instructions}

请用英文撰写，确保内容真实、具体、有说服力。"""
    },
    
    "cv": {
        "system": """你是一位专业的简历优化专家，专注于GTV签证申请的简历准备。
你的任务是帮助申请人优化简历，使其符合Tech Nation的评估标准。

简历要求：
1. 长度：2-3页A4纸
2. 突出技术领导力和创新成果
3. 量化成就（数据、指标）
4. 清晰的时间线
5. 专业的格式和排版

重点展示：
- 技术专长和领域专业性
- 领导经验和团队管理
- 创新成果和产品影响
- 行业认可和奖项
- 开源贡献和学术成果""",
        "user_template": """请基于以下申请人信息，生成优化后的英文简历：

{context}

{custom_instructions}

请确保简历格式清晰、内容专业，突出GTV相关的成就。"""
    },
    
    "rl_1": {
        "system": """你是一位专业的推荐信撰写专家。
你的任务是帮助起草一封有说服力的GTV签证推荐信（第一封：行业专家推荐）。

推荐信要求：
1. 长度：1-1.5页
2. 推荐人应为行业知名人士
3. 具体描述申请人的贡献和能力
4. 说明推荐人与申请人的关系
5. 提供具体案例和数据支撑

推荐信结构：
1. 推荐人自我介绍
2. 与申请人的关系
3. 申请人的核心能力和成就
4. 具体案例和证据
5. 为什么申请人符合GTV标准
6. 强烈推荐的结论""",
        "user_template": """请基于以下信息，起草一封GTV签证推荐信：

申请人信息：
{context}

推荐人信息（如有）：
{recommender_info}

{custom_instructions}

请用英文撰写，确保推荐内容具体、有说服力。"""
    },
    
    "rl_2": {
        "system": """你是一位专业的推荐信撰写专家。
你的任务是帮助起草一封有说服力的GTV签证推荐信（第二封：技术/学术推荐）。

推荐信要求：
1. 长度：1-1.5页
2. 推荐人应为技术或学术领域专家
3. 重点突出申请人的技术能力和创新贡献
4. 提供技术层面的具体评价
5. 说明申请人在技术领域的影响力""",
        "user_template": """请基于以下信息，起草一封GTV签证技术推荐信：

申请人信息：
{context}

推荐人信息（如有）：
{recommender_info}

{custom_instructions}

请用英文撰写，重点突出技术贡献和创新能力。"""
    },
    
    "rl_3": {
        "system": """你是一位专业的推荐信撰写专家。
你的任务是帮助起草一封有说服力的GTV签证推荐信（第三封：商业/合作推荐）。

推荐信要求：
1. 长度：1-1.5页
2. 推荐人应为商业合作伙伴、客户或投资人
3. 重点突出申请人的商业影响力和领导能力
4. 提供商业成果的具体证据
5. 说明申请人对行业发展的贡献""",
        "user_template": """请基于以下信息，起草一封GTV签证商业推荐信：

申请人信息：
{context}

推荐人信息（如有）：
{recommender_info}

{custom_instructions}

请用英文撰写，突出商业成就和行业影响力。"""
    },
    
    "mc_evidence": {
        "system": """你是一位GTV签证必选标准(Mandatory Criteria)证据整理专家。
你的任务是帮助申请人整理和描述MC标准的证据材料。

MC标准包括：
- MC1: 产品/团队领导力
- MC2: 商业发展/营销
- MC3: 非营利组织领导
- MC4: 专家评审角色

证据描述要求：
1. 清晰说明证据如何证明满足标准
2. 提供具体数据和指标
3. 说明证据的真实性和可验证性
4. 链接到申请人的整体叙事""",
        "user_template": """请基于以下信息，整理MC标准的证据描述：

申请人信息：
{context}

目标MC标准：{mc_type}

{custom_instructions}

请用英文撰写证据描述，确保清晰、具体、有说服力。"""
    },
    
    "oc_evidence": {
        "system": """你是一位GTV签证可选标准(Optional Criteria)证据整理专家。
你的任务是帮助申请人整理和描述OC标准的证据材料。

OC标准包括：
- OC1: 创新/产品开发
- OC2: 行业专家认可
- OC3: 重大技术/商业贡献
- OC4: 学术贡献

证据描述要求：
1. 清晰说明证据如何证明满足标准
2. 提供具体数据和影响指标
3. 说明证据的独特性和重要性
4. 链接到申请人的专业领域""",
        "user_template": """请基于以下信息，整理OC标准的证据描述：

申请人信息：
{context}

目标OC标准：{oc_type}

{custom_instructions}

请用英文撰写证据描述，确保清晰、具体、有说服力。"""
    }
}


class MaterialAgent:
    """可配置的材料制作Agent"""
    
    def __init__(self, db_path: str = None):
        # 使用环境变量配置的路径，或传入的参数
        self.db_path = db_path or os.getenv("COPYWRITING_DB_PATH", "copywriting.db")
        self.llm_client = None
        self._init_llm()
        logger.info("材料制作Agent初始化完成")
    
    def _init_llm(self):
        """初始化LLM客户端"""
        try:
            from openai import OpenAI
            
            api_key = os.getenv("ENNCLOUD_API_KEY") or os.getenv("OPENAI_API_KEY")
            base_url = os.getenv("ENNCLOUD_BASE_URL") or os.getenv("OPENAI_BASE_URL")
            
            if api_key and base_url:
                self.llm_client = OpenAI(api_key=api_key, base_url=base_url)
                self.model = os.getenv("ENNCLOUD_MODEL", "glm-4.6-no-think")
                logger.info(f"LLM客户端初始化成功")
            else:
                logger.warning("未配置LLM")
        except Exception as e:
            logger.error(f"初始化LLM失败: {e}")
    
    def _get_connection(self):
        """获取数据库连接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def get_prompt_template(self, package_type: str) -> Dict[str, str]:
        """获取指定材料包的提示词模板"""
        prompts = DEFAULT_PROMPTS.get(package_type, {})
        
        if not prompts:
            # 通用模板
            prompts = {
                "system": f"你是一位专业的GTV签证文案撰写专家，正在帮助准备{package_type}材料。",
                "user_template": "请基于以下申请人信息，生成{package_type}材料：\n\n{context}\n\n{custom_instructions}"
            }
        
        return prompts
    
    def get_custom_prompt(self, project_id: str, package_type: str) -> Optional[Dict]:
        """获取项目的自定义提示词配置"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM agent_prompts 
                WHERE project_id = ? AND package_type = ?
            ''', (project_id, package_type))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                return {
                    "system_prompt": row['system_prompt'],
                    "user_prompt_template": row['user_prompt_template'],
                    "reference_doc_id": row['reference_doc_id'],
                    "reference_structure": row['reference_structure'],
                    "custom_instructions": row['custom_instructions']
                }
            
            return None
            
        except Exception as e:
            logger.error(f"获取自定义提示词失败: {e}")
            return None
    
    def update_prompt_template(self, project_id: str, package_type: str,
                              system_prompt: str = None,
                              user_prompt_template: str = None,
                              custom_instructions: str = None) -> Dict[str, Any]:
        """更新提示词模板"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO agent_prompts 
                (project_id, package_type, system_prompt, user_prompt_template, custom_instructions, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(project_id, package_type) 
                DO UPDATE SET 
                    system_prompt = COALESCE(excluded.system_prompt, system_prompt),
                    user_prompt_template = COALESCE(excluded.user_prompt_template, user_prompt_template),
                    custom_instructions = COALESCE(excluded.custom_instructions, custom_instructions),
                    updated_at = CURRENT_TIMESTAMP
            ''', (project_id, package_type, system_prompt, user_prompt_template, custom_instructions))
            
            conn.commit()
            conn.close()
            
            return {"success": True}
            
        except Exception as e:
            logger.error(f"更新提示词模板失败: {e}")
            return {"success": False, "error": str(e)}
    
    def set_reference_material(self, project_id: str, package_type: str,
                               reference_content: str) -> Dict[str, Any]:
        """设置参考材料"""
        try:
            # 分析参考材料结构
            structure = self.analyze_reference_structure(reference_content)
            
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO agent_prompts 
                (project_id, package_type, reference_structure, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(project_id, package_type) 
                DO UPDATE SET 
                    reference_structure = excluded.reference_structure,
                    updated_at = CURRENT_TIMESTAMP
            ''', (project_id, package_type, json.dumps(structure, ensure_ascii=False)))
            
            conn.commit()
            conn.close()
            
            return {"success": True, "structure": structure}
            
        except Exception as e:
            logger.error(f"设置参考材料失败: {e}")
            return {"success": False, "error": str(e)}
    
    def analyze_reference_structure(self, reference_content: str) -> Dict[str, Any]:
        """分析参考材料的结构"""
        if not reference_content:
            return {"error": "无参考内容"}
        
        structure = {
            "total_length": len(reference_content),
            "word_count": len(reference_content.split()),
            "sections": [],
            "key_patterns": [],
            "tone": "",
            "analyzed_at": datetime.now().isoformat()
        }
        
        # 使用AI分析结构
        if self.llm_client:
            try:
                prompt = f"""
请分析以下文案材料的结构和写作特点：

{reference_content[:8000]}

请以JSON格式返回分析结果：
{{
    "sections": [
        {{"name": "章节名", "description": "章节描述", "word_count_approx": 数字}}
    ],
    "key_patterns": ["写作模式1", "写作模式2"],
    "tone": "语调描述",
    "strengths": ["优点1", "优点2"],
    "structure_summary": "整体结构概述"
}}

只返回JSON，不要其他文字。
"""
                
                response = self.llm_client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=1500,
                    temperature=0.3
                )
                
                result_text = response.choices[0].message.content
                
                import re
                json_match = re.search(r'\{[\s\S]*\}', result_text)
                if json_match:
                    ai_structure = json.loads(json_match.group())
                    structure.update(ai_structure)
                    
            except Exception as e:
                logger.warning(f"AI分析参考结构失败: {e}")
        
        return structure
    
    def generate(self, project_id: str, package_type: str, context: str,
                reference_content: str = None, custom_prompt: str = None,
                custom_instructions: str = None,
                additional_params: Dict = None) -> Dict[str, Any]:
        """
        生成材料内容
        
        Args:
            project_id: 项目ID
            package_type: 材料包类型
            context: 申请人上下文信息
            reference_content: 参考材料内容（可选）
            custom_prompt: 自定义系统提示词（可选）
            custom_instructions: 自定义指令（可选）
            additional_params: 额外参数（如推荐人信息等）
            
        Returns:
            生成结果
        """
        try:
            if not self.llm_client:
                return {"success": False, "error": "LLM未初始化"}
            
            if not context or len(context.strip()) < 50:
                return {"success": False, "error": "上下文信息不足"}
            
            # 获取提示词配置
            saved_config = self.get_custom_prompt(project_id, package_type)
            default_prompts = self.get_prompt_template(package_type)
            
            # 确定系统提示词
            system_prompt = (
                custom_prompt or
                (saved_config.get("system_prompt") if saved_config else None) or
                default_prompts.get("system", "")
            )
            
            # 确定用户提示词模板
            user_template = (
                (saved_config.get("user_prompt_template") if saved_config else None) or
                default_prompts.get("user_template", "{context}")
            )
            
            # 确定自定义指令
            instructions = (
                custom_instructions or
                (saved_config.get("custom_instructions") if saved_config else None) or
                ""
            )
            
            # 处理参考材料
            reference_section = ""
            if reference_content:
                # 分析参考材料结构
                ref_structure = self.analyze_reference_structure(reference_content)
                
                reference_section = f"""
---
参考材料（请学习其结构和风格）：

结构分析：
{json.dumps(ref_structure, ensure_ascii=False, indent=2)}

参考内容：
{reference_content[:5000]}
---
"""
            
            # 构建用户提示词
            user_prompt = user_template.format(
                context=context[:15000],
                custom_instructions=instructions,
                recommender_info=additional_params.get("recommender_info", "") if additional_params else "",
                mc_type=additional_params.get("mc_type", "") if additional_params else "",
                oc_type=additional_params.get("oc_type", "") if additional_params else "",
                package_type=package_type
            )
            
            # 添加参考材料
            if reference_section:
                user_prompt = reference_section + "\n\n" + user_prompt
            
            # 调用LLM
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            response = self.llm_client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=4000,
                temperature=0.7
            )
            
            generated_content = response.choices[0].message.content
            
            # 保存生成结果
            self._save_generated_content(project_id, package_type, generated_content)
            
            return {
                "success": True,
                "data": {
                    "content": generated_content,
                    "word_count": len(generated_content.split()),
                    "generated_at": datetime.now().isoformat(),
                    "package_type": package_type,
                    "used_reference": bool(reference_content)
                }
            }
            
        except Exception as e:
            logger.error(f"生成材料失败: {e}")
            return {"success": False, "error": str(e)}
    
    def _save_generated_content(self, project_id: str, package_type: str, 
                                content: str):
        """保存生成的内容"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # 获取当前版本号
            cursor.execute('''
                SELECT current_version FROM package_contents 
                WHERE project_id = ? AND package_type = ?
            ''', (project_id, package_type))
            
            row = cursor.fetchone()
            new_version = (row['current_version'] + 1) if row else 1
            
            # 保存版本历史
            cursor.execute('''
                INSERT INTO document_versions 
                (project_id, package_type, version, content, edit_type, edit_summary, editor, word_count)
                VALUES (?, ?, ?, ?, 'ai_generate', 'AI生成内容', 'material_agent', ?)
            ''', (project_id, package_type, new_version, content, len(content.split())))
            
            # 更新当前内容
            cursor.execute('''
                INSERT INTO package_contents 
                (project_id, package_type, current_version, content, status, last_edited_by, ai_generated, updated_at)
                VALUES (?, ?, ?, ?, 'draft', 'material_agent', 1, CURRENT_TIMESTAMP)
                ON CONFLICT(project_id, package_type) 
                DO UPDATE SET 
                    current_version = excluded.current_version,
                    content = excluded.content,
                    status = 'draft',
                    last_edited_by = 'material_agent',
                    ai_generated = 1,
                    updated_at = CURRENT_TIMESTAMP
            ''', (project_id, package_type, new_version, content))
            
            conn.commit()
            conn.close()
            
            logger.info(f"保存生成内容: {project_id}/{package_type} v{new_version}")
            
        except Exception as e:
            logger.error(f"保存生成内容失败: {e}")
    
    def regenerate_with_feedback(self, project_id: str, package_type: str,
                                 previous_content: str, feedback: str,
                                 context: str) -> Dict[str, Any]:
        """根据反馈重新生成内容"""
        try:
            if not self.llm_client:
                return {"success": False, "error": "LLM未初始化"}
            
            prompt = f"""
请根据以下反馈，修改并改进材料内容：

原始内容：
{previous_content[:10000]}

用户反馈：
{feedback}

申请人信息：
{context[:8000]}

请保持原有结构，根据反馈进行修改和改进。
"""
            
            response = self.llm_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=4000,
                temperature=0.7
            )
            
            new_content = response.choices[0].message.content
            
            # 保存新版本
            self._save_generated_content(project_id, package_type, new_content)
            
            return {
                "success": True,
                "data": {
                    "content": new_content,
                    "word_count": len(new_content.split()),
                    "generated_at": datetime.now().isoformat(),
                    "based_on_feedback": True
                }
            }
            
        except Exception as e:
            logger.error(f"根据反馈重新生成失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_available_references(self, package_type: str, 
                                 exclude_project: str = None) -> Dict[str, Any]:
        """获取可用的参考材料列表"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            query = '''
                SELECT pc.project_id, pc.package_type, pc.status, pc.updated_at,
                       p.client_name, LENGTH(pc.content) as content_length
                FROM package_contents pc
                JOIN projects p ON pc.project_id = p.project_id
                WHERE pc.content IS NOT NULL AND pc.content != ''
                AND pc.package_type = ?
            '''
            params = [package_type]
            
            if exclude_project:
                query += ' AND pc.project_id != ?'
                params.append(exclude_project)
            
            query += ' ORDER BY pc.updated_at DESC LIMIT 20'
            
            cursor.execute(query, params)
            
            references = []
            for row in cursor.fetchall():
                references.append({
                    "id": f"{row['project_id']}_{row['package_type']}",
                    "project_id": row['project_id'],
                    "package_type": row['package_type'],
                    "client_name": row['client_name'],
                    "status": row['status'],
                    "content_length": row['content_length'],
                    "updated_at": row['updated_at']
                })
            
            conn.close()
            
            return {
                "success": True,
                "data": references
            }
            
        except Exception as e:
            logger.error(f"获取参考材料列表失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_reference_content(self, reference_id: str) -> Dict[str, Any]:
        """获取参考材料内容"""
        try:
            parts = reference_id.split("_", 1)
            if len(parts) != 2:
                return {"success": False, "error": "无效的参考ID格式"}
            
            project_id, package_type = parts
            
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT pc.content, pc.status, p.client_name
                FROM package_contents pc
                JOIN projects p ON pc.project_id = p.project_id
                WHERE pc.project_id = ? AND pc.package_type = ?
            ''', (project_id, package_type))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                return {
                    "success": True,
                    "data": {
                        "content": row['content'],
                        "client_name": row['client_name'],
                        "status": row['status']
                    }
                }
            
            return {"success": False, "error": "未找到参考材料"}
            
        except Exception as e:
            logger.error(f"获取参考材料内容失败: {e}")
            return {"success": False, "error": str(e)}


# 测试
if __name__ == "__main__":
    agent = MaterialAgent("copywriting.db")
    
    # 测试获取提示词模板
    prompts = agent.get_prompt_template("personal_statement")
    print("Personal Statement Prompts:")
    print(json.dumps(prompts, ensure_ascii=False, indent=2))
    
    # 测试分析参考结构
    sample_ref = """
    Personal Statement
    
    I am a senior software engineer with over 10 years of experience...
    
    Technical Background:
    - Led development of AI systems
    - Published 5 research papers
    
    Vision for UK:
    I plan to contribute to the UK's digital economy...
    """
    
    structure = agent.analyze_reference_structure(sample_ref)
    print("\nReference Structure:")
    print(json.dumps(structure, ensure_ascii=False, indent=2))
