#!/usr/bin/env python3
"""
LLM辅助文案处理模块
使用LLM帮助处理、优化和生成签证申请文案
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from utils.logger_config import setup_module_logger

logger = setup_module_logger("document_llm_assistant", os.getenv("LOG_LEVEL", "INFO"))


class DocumentLLMAssistant:
    """LLM辅助文案处理助手"""
    
    def __init__(self):
        """初始化LLM客户端"""
        self.llm_provider = os.getenv("LLM_PROVIDER", "OPENAI")
        self._init_llm_client()
    
    def _init_llm_client(self):
        """初始化LLM客户端"""
        try:
            if self.llm_provider == "OPENAI":
                from openai import OpenAI
                api_key = os.getenv("OPENAI_API_KEY")
                if api_key:
                    self.client = OpenAI(api_key=api_key)
                    self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
                else:
                    logger.warning("OPENAI_API_KEY未配置，LLM功能将不可用")
                    self.client = None
            
            elif self.llm_provider == "AZURE":
                from openai import AzureOpenAI
                self.client = AzureOpenAI(
                    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                    api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
                    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
                )
                self.model = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4")
            
            elif self.llm_provider == "ANTHROPIC":
                import anthropic
                self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
                self.model = "claude-3-5-sonnet-20241022"
            else:
                logger.warning(f"不支持的LLM提供商: {self.llm_provider}")
                self.client = None
        except Exception as e:
            logger.error(f"初始化LLM客户端失败: {e}")
            self.client = None
    
    def process_raw_document(self, raw_content: str, document_type: str = "resume") -> Dict[str, Any]:
        """处理原始文档，提取关键信息"""
        if not self.client:
            return {"success": False, "error": "LLM客户端未初始化"}
        
        try:
            if self.llm_provider == "ANTHROPIC":
                prompt = f"""你是一位专业的英国GTV签证申请文案处理专家。请分析以下原始材料，提取关键信息并结构化输出。

文档类型: {document_type}
原始内容:
{raw_content}

请提取以下信息（如果存在）:
1. 个人信息（姓名、国籍、护照号等）
2. 教育背景
3. 工作经历
4. 专业技能和成就
5. 与GTV签证相关的关键信息
6. 需要补充的材料

请以JSON格式输出，包含extracted_info和missing_info两个字段。"""
                
                message = self.client.messages.create(
                    model=self.model,
                    max_tokens=4000,
                    messages=[{"role": "user", "content": prompt}]
                )
                response_text = message.content[0].text
            else:
                prompt = f"""你是一位专业的英国GTV签证申请文案处理专家。请分析以下原始材料，提取关键信息并结构化输出。

文档类型: {document_type}
原始内容:
{raw_content}

请提取以下信息（如果存在）:
1. 个人信息（姓名、国籍、护照号等）
2. 教育背景
3. 工作经历
4. 专业技能和成就
5. 与GTV签证相关的关键信息
6. 需要补充的材料

请以JSON格式输出，包含extracted_info和missing_info两个字段。"""
                
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3
                )
                response_text = response.choices[0].message.content
            
            # 尝试解析JSON
            try:
                result = json.loads(response_text)
            except:
                # 如果不是纯JSON，尝试提取JSON部分
                import re
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                else:
                    result = {"extracted_info": response_text, "missing_info": ""}
            
            return {"success": True, "data": result}
        except Exception as e:
            logger.error(f"处理原始文档失败: {e}")
            return {"success": False, "error": str(e)}
    
    def generate_application_document(self, case_info: Dict[str, Any], raw_documents: list) -> Dict[str, Any]:
        """基于案件信息和原始材料生成申请文档"""
        if not self.client:
            return {"success": False, "error": "LLM客户端未初始化"}
        
        try:
            # 构建提示词
            case_context = f"""
案件信息:
- 客户姓名: {case_info.get('client_name', 'N/A')}
- 签证类型: {case_info.get('visa_type', 'GTV')}
- 案件描述: {case_info.get('description', '')}
"""
            
            raw_content = "\n\n".join([doc.get('content', '') for doc in raw_documents])
            
            prompt = f"""你是一位专业的英国GTV签证申请文案撰写专家。请基于以下信息，撰写一份专业的签证申请文档。

{case_context}

原始材料:
{raw_content}

请撰写一份结构化的申请文档，包括:
1. 申请人背景介绍
2. 符合GTV签证条件的详细说明
3. 专业成就和贡献
4. 申请理由和目标
5. 其他支持信息

请使用专业、清晰、有说服力的语言，确保符合英国移民局的要求。"""
            
            if self.llm_provider == "ANTHROPIC":
                message = self.client.messages.create(
                    model=self.model,
                    max_tokens=4000,
                    messages=[{"role": "user", "content": prompt}]
                )
                generated_content = message.content[0].text
            else:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7
                )
                generated_content = response.choices[0].message.content
            
            return {"success": True, "content": generated_content}
        except Exception as e:
            logger.error(f"生成申请文档失败: {e}")
            return {"success": False, "error": str(e)}
    
    def optimize_document(self, document_content: str, optimization_type: str = "grammar") -> Dict[str, Any]:
        """优化文档内容"""
        if not self.client:
            return {"success": False, "error": "LLM客户端未初始化"}
        
        try:
            optimization_prompts = {
                "grammar": "请检查并修正以下文档的语法错误、拼写错误和标点符号问题:",
                "clarity": "请优化以下文档，使其更加清晰、简洁、易读:",
                "professional": "请将以下文档改写得更专业、正式，符合官方文件要求:",
                "persuasive": "请优化以下文档，使其更有说服力，突出申请人的优势:"
            }
            
            prompt = f"""{optimization_prompts.get(optimization_type, optimization_prompts['grammar'])}

{document_content}

请提供优化后的版本，并简要说明主要改进点。"""
            
            if self.llm_provider == "ANTHROPIC":
                message = self.client.messages.create(
                    model=self.model,
                    max_tokens=4000,
                    messages=[{"role": "user", "content": prompt}]
                )
                optimized_content = message.content[0].text
            else:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.5
                )
                optimized_content = response.choices[0].message.content
            
            return {"success": True, "content": optimized_content}
        except Exception as e:
            logger.error(f"优化文档失败: {e}")
            return {"success": False, "error": str(e)}
    
    def check_completeness(self, case_info: Dict[str, Any], documents: list) -> Dict[str, Any]:
        """检查申请材料完整性"""
        if not self.client:
            return {"success": False, "error": "LLM客户端未初始化"}
        
        try:
            prompt = f"""你是一位专业的英国GTV签证申请材料审核专家。请检查以下申请材料是否完整。

案件信息:
{json.dumps(case_info, ensure_ascii=False, indent=2)}

已有文档:
{json.dumps([{'type': d.get('document_type'), 'title': d.get('title')} for d in documents], ensure_ascii=False, indent=2)}

请检查:
1. 必需材料是否齐全
2. 材料质量是否符合要求
3. 缺少哪些材料
4. 需要改进的地方

请以JSON格式输出，包含:
- completeness_score: 完整性评分 (0-100)
- missing_documents: 缺少的材料列表
- recommendations: 改进建议列表"""
            
            if self.llm_provider == "ANTHROPIC":
                message = self.client.messages.create(
                    model=self.model,
                    max_tokens=2000,
                    messages=[{"role": "user", "content": prompt}]
                )
                response_text = message.content[0].text
            else:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3
                )
                response_text = response.choices[0].message.content
            
            # 尝试解析JSON
            try:
                result = json.loads(response_text)
            except:
                import re
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                else:
                    result = {
                        "completeness_score": 50,
                        "missing_documents": [],
                        "recommendations": [response_text]
                    }
            
            return {"success": True, "data": result}
        except Exception as e:
            logger.error(f"检查完整性失败: {e}")
            return {"success": False, "error": str(e)}

