#!/usr/bin/env python3
"""
GTV签证文案制作 - 框架构建Agent
智能分析材料并构建GTV申请框架，支持MC/OC标准匹配和证据映射
"""

import os
import json
import sqlite3
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path
import copy

from utils.logger_config import setup_module_logger

logger = setup_module_logger("framework_building_agent", os.getenv("LOG_LEVEL", "INFO"))


# GTV申请框架模板
GTV_FRAMEWORK_TEMPLATE = {
    "领域定位": {
        "评估机构": "Tech Nation",
        "细分领域": "",
        "岗位定位": "",
        "核心论点": "",
        "申请路径": ""  # Exceptional Talent / Exceptional Promise
    },
    "MC_必选标准": {
        "选择的MC": "",
        "MC1_产品团队领导力": {
            "description": "领导产品导向的数字科技公司/产品/团队增长的证据",
            "applicable": False,
            "evidence_list": [],
            "summary": "",
            "strength_score": 0,
            "gaps": []
        },
        "MC2_商业发展": {
            "description": "领导营销或业务开发，实现收入/客户增长的证据",
            "applicable": False,
            "evidence_list": [],
            "summary": "",
            "strength_score": 0,
            "gaps": []
        },
        "MC3_非营利组织": {
            "description": "领导数字科技领域非营利组织或社会企业的证据",
            "applicable": False,
            "evidence_list": [],
            "summary": "",
            "strength_score": 0,
            "gaps": []
        },
        "MC4_专家评审": {
            "description": "担任评审同行工作的重要专家角色的证据",
            "applicable": False,
            "evidence_list": [],
            "summary": "",
            "strength_score": 0,
            "gaps": []
        }
    },
    "OC_可选标准": {
        "选择的OC": [],
        "OC1_创新": {
            "description": "创新/产品开发及市场验证证据",
            "applicable": False,
            "evidence_list": [],
            "summary": "",
            "strength_score": 0,
            "gaps": []
        },
        "OC2_行业认可": {
            "description": "作为领域专家获得的认可证据",
            "applicable": False,
            "evidence_list": [],
            "summary": "",
            "strength_score": 0,
            "gaps": []
        },
        "OC3_重大贡献": {
            "description": "对数字技术产品的重大技术/商业贡献",
            "applicable": False,
            "evidence_list": [],
            "summary": "",
            "strength_score": 0,
            "gaps": []
        },
        "OC4_学术贡献": {
            "description": "在数字技术领域的学术贡献",
            "applicable": False,
            "evidence_list": [],
            "summary": "",
            "strength_score": 0,
            "gaps": []
        }
    },
    "推荐信": {
        "推荐人1": {
            "suggested_profile": "行业资深人士",
            "name": "",
            "title": "",
            "organization": "",
            "relationship": "",
            "focus_points": [],
            "status": "待确定",
            "source_file": ""
        },
        "推荐人2": {
            "suggested_profile": "技术/学术专家",
            "name": "",
            "title": "",
            "organization": "",
            "relationship": "",
            "focus_points": [],
            "status": "待确定",
            "source_file": ""
        },
        "推荐人3": {
            "suggested_profile": "商业合作伙伴",
            "name": "",
            "title": "",
            "organization": "",
            "relationship": "",
            "focus_points": [],
            "status": "待确定",
            "source_file": ""
        }
    },
    "个人陈述要点": {
        "opening_hook": "",
        "technical_journey": "",
        "key_achievements": [],
        "uk_vision": "",
        "conclusion": ""
    },
    "证据清单": [],
    "申请策略": {
        "overall_strength": "",
        "recommended_approach": "",
        "key_risks": [],
        "preparation_priorities": []
    }
}


class FrameworkBuildingAgent:
    """
    框架构建Agent
    
    职责：
    1. 分析提取的内容，识别与GTV标准的匹配度
    2. 构建完整的申请框架
    3. 推荐最优的MC和OC标准组合
    4. 识别证据缺口并给出建议
    5. 导出为Markdown/XMind格式
    """
    
    def __init__(self, db_path: str = "copywriting.db"):
        self.db_path = db_path
        self.llm_client = None
        self._init_llm()
        self._ensure_tables()
        logger.info("框架构建Agent初始化完成")
    
    def _init_llm(self):
        """初始化LLM客户端"""
        try:
            from openai import OpenAI
            
            api_key = os.getenv("ENNCLOUD_API_KEY") or os.getenv("OPENAI_API_KEY")
            base_url = os.getenv("ENNCLOUD_BASE_URL") or os.getenv("OPENAI_BASE_URL")
            
            if api_key and base_url:
                self.llm_client = OpenAI(api_key=api_key, base_url=base_url)
                self.model = os.getenv("ENNCLOUD_MODEL", "glm-4.6-no-think")
                logger.info("LLM客户端初始化成功")
            else:
                logger.warning("未配置LLM，将使用规则模式")
        except Exception as e:
            logger.error(f"初始化LLM失败: {e}")
    
    def _get_connection(self):
        """获取数据库连接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _ensure_tables(self):
        """确保必要的表存在"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS gtv_frameworks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT UNIQUE NOT NULL,
                    framework_data TEXT,
                    version INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (project_id) REFERENCES projects(project_id)
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS client_profile_maps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT UNIQUE NOT NULL,
                    profile_data TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (project_id) REFERENCES projects(project_id)
                )
            ''')
            
            # 框架构建日志表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS framework_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT NOT NULL,
                    log_type TEXT,
                    action TEXT,
                    prompt TEXT,
                    response TEXT,
                    status TEXT DEFAULT 'success',
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"创建表失败: {e}")
    
    def _log_framework_action(self, project_id: str, log_type: str, action: str, 
                              prompt: str = None, response: str = None,
                              status: str = 'success', error_message: str = None,
                              prompt_version: int = None, prompt_name: str = None):
        """记录框架构建日志，包含提示词版本信息"""
        try:
            conn = sqlite3.connect(self.db_path, timeout=30)
            cursor = conn.cursor()
            
            # 检查并添加新列（数据库迁移）
            cursor.execute("PRAGMA table_info(framework_logs)")
            columns = [row[1] for row in cursor.fetchall()]
            if 'prompt_version' not in columns:
                cursor.execute('ALTER TABLE framework_logs ADD COLUMN prompt_version INTEGER')
            if 'prompt_name' not in columns:
                cursor.execute('ALTER TABLE framework_logs ADD COLUMN prompt_name TEXT')
            
            cursor.execute('''
                INSERT INTO framework_logs 
                (project_id, log_type, action, prompt, response, status, error_message, prompt_version, prompt_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (project_id, log_type, action, prompt, response, status, error_message, prompt_version, prompt_name))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"记录框架日志失败: {e}")
    
    def _get_prompt_from_db(self, prompt_type: str) -> tuple[Optional[str], Optional[int], Optional[str]]:
        """从数据库获取提示词（动态加载，每次取最新版本）
        
        Args:
            prompt_type: 提示词类型，如 'framework_domain', 'framework_mc1' 等
            
        Returns:
            (提示词内容, 版本号, 提示词名称) 元组，如果未找到返回 (None, None, None)
        """
        try:
            conn = sqlite3.connect(self.db_path, timeout=30)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT name, content, version FROM system_prompts 
                WHERE type = ? AND is_active = 1
                LIMIT 1
            ''', (prompt_type,))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                version = row['version'] or 1
                logger.debug(f"加载提示词 [{prompt_type}] 版本 {version}")
                return row['content'], version, row['name']
            return None, None, None
        except Exception as e:
            logger.error(f"获取提示词失败 ({prompt_type}): {e}")
            return None, None, None
    
    def get_framework_logs(self, project_id: str) -> List[Dict]:
        """获取项目的框架构建日志，包含提示词版本信息"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # 检查表是否有新列
            cursor.execute("PRAGMA table_info(framework_logs)")
            columns = [row[1] for row in cursor.fetchall()]
            
            # 根据列的存在情况选择查询
            if 'prompt_version' in columns and 'prompt_name' in columns:
                cursor.execute('''
                    SELECT id, log_type, action, prompt, response, status, error_message, 
                           prompt_version, prompt_name, created_at
                    FROM framework_logs
                    WHERE project_id = ?
                    ORDER BY created_at DESC
                    LIMIT 100
                ''', (project_id,))
            else:
                cursor.execute('''
                    SELECT id, log_type, action, prompt, response, status, error_message, created_at
                    FROM framework_logs
                    WHERE project_id = ?
                    ORDER BY created_at DESC
                    LIMIT 100
                ''', (project_id,))
            
            logs = []
            for row in cursor.fetchall():
                log_entry = {
                    "id": row['id'],
                    "log_type": row['log_type'],
                    "action": row['action'],
                    "prompt": row['prompt'],
                    "response": row['response'],
                    "status": row['status'],
                    "error_message": row['error_message'],
                    "created_at": row['created_at']
                }
                # 添加版本信息（如果存在）
                if 'prompt_version' in columns:
                    log_entry["prompt_version"] = row['prompt_version']
                if 'prompt_name' in columns:
                    log_entry["prompt_name"] = row['prompt_name']
                logs.append(log_entry)
            
            conn.close()
            return logs
        except Exception as e:
            logger.error(f"获取框架日志失败: {e}")
            return []
    
    def _call_llm(self, prompt: str, project_id: str, action: str, 
                  log_type: str = "framework", 
                  prompt_version: int = None, prompt_name: str = None) -> Optional[str]:
        """
        调用LLM并记录日志（在同一条日志中保存prompt和response及版本信息）
        
        Args:
            prompt: 提示词
            project_id: 项目ID
            action: 操作描述
            log_type: 日志类型
            prompt_version: 提示词版本号
            prompt_name: 提示词名称
            
        Returns:
            LLM响应文本，失败返回None
        """
        if not self.llm_client:
            return None
        
        try:
            version_info = f" (提示词版本: v{prompt_version})" if prompt_version else ""
            logger.info(f"开始{action}{version_info} - 项目: {project_id}")
            
            response = self.llm_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=3000,
                temperature=0.2
            )
            
            result_text = response.choices[0].message.content
            
            # 记录完整日志（包含prompt和response及版本信息）
            self._log_framework_action(
                project_id=project_id,
                log_type=log_type,
                action=f"{action}" + (f" [v{prompt_version}]" if prompt_version else ""),
                prompt=prompt[:8000] if len(prompt) > 8000 else prompt,
                response=result_text[:8000] if len(result_text) > 8000 else result_text,
                status="success",
                prompt_version=prompt_version,
                prompt_name=prompt_name
            )
            
            logger.info(f"{action}完成 - 项目: {project_id}")
            return result_text
            
        except Exception as e:
            logger.error(f"LLM调用失败 ({action}): {e}")
            self._log_framework_action(
                project_id=project_id,
                log_type=log_type,
                action=f"{action}" + (f" [v{prompt_version}]" if prompt_version else ""),
                prompt=prompt[:8000] if len(prompt) > 8000 else prompt,
                status="error",
                error_message=str(e),
                prompt_version=prompt_version,
                prompt_name=prompt_name
            )
            return None
    
    def _parse_json_response(self, text: str) -> Optional[Dict]:
        """解析LLM返回的JSON"""
        if not text:
            return None
        try:
            import re
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                return json.loads(json_match.group())
            return None
        except Exception as e:
            logger.error(f"解析JSON失败: {e}")
            return None
    
    def _get_classified_evidence(self, project_id: str) -> Dict[str, List[Dict]]:
        """
        获取项目的分类证据
        
        Returns:
            按类别组织的证据字典，如：
            {
                "MC/mc1_product_leadership": [...],
                "OC/oc1_innovation": [...],
                "RECOMMENDER/recommender_info": [...]
            }
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, category, subcategory, content, source_file, source_page,
                       relevance_score, evidence_type, key_points, subject_person
                FROM content_classifications
                WHERE project_id = ?
                ORDER BY category, subcategory, relevance_score DESC
            ''', (project_id,))
            
            rows = cursor.fetchall()
            conn.close()
            
            # 按类别组织
            evidence_by_category = {}
            for row in rows:
                key = f"{row['category']}/{row['subcategory']}"
                if key not in evidence_by_category:
                    evidence_by_category[key] = []
                
                evidence_by_category[key].append({
                    "id": row['id'],
                    "content": row['content'],
                    "source_file": row['source_file'],
                    "source_page": row['source_page'],
                    "relevance_score": row['relevance_score'],
                    "evidence_type": row['evidence_type'],
                    "key_points": json.loads(row['key_points']) if row['key_points'] else [],
                    "subject_person": row['subject_person'] or 'applicant'
                })
            
            logger.info(f"获取到 {len(rows)} 条分类证据，分为 {len(evidence_by_category)} 个类别")
            return evidence_by_category
            
        except Exception as e:
            logger.error(f"获取分类证据失败: {e}")
            return {}
    
    def _format_evidence_for_prompt(self, evidence_list: List[Dict], max_items: int = 10) -> str:
        """
        将证据列表格式化为提示词文本
        
        只包含申请人的证据，排除推荐人背景信息
        """
        if not evidence_list:
            return "暂无相关证据"
        
        # 过滤只保留申请人的证据
        applicant_evidence = [e for e in evidence_list if e.get('subject_person') == 'applicant']
        
        if not applicant_evidence:
            return "暂无申请人相关证据"
        
        formatted = []
        for i, e in enumerate(applicant_evidence[:max_items]):
            source = e.get('source_file', '未知来源')
            page = e.get('source_page')
            source_info = f"来源: {source}" + (f" 第{page}页" if page else "")
            
            formatted.append(f"""【证据{i+1}】
{e.get('content', '')}
（{source_info}）
""")
        
        return "\n".join(formatted)
    
    def _get_recommender_evidence(self, evidence_by_category: Dict) -> List[Dict]:
        """
        获取推荐人相关的证据
        """
        recommender_evidence = []
        
        # 从RECOMMENDER类别获取
        for key, evidence_list in evidence_by_category.items():
            if key.startswith("RECOMMENDER/"):
                recommender_evidence.extend(evidence_list)
        
        # 也包含标记为recommender的其他证据（推荐人背景）
        for key, evidence_list in evidence_by_category.items():
            for e in evidence_list:
                if e.get('subject_person') == 'recommender' and e not in recommender_evidence:
                    recommender_evidence.append(e)
        
        return recommender_evidence

    def build_framework(self, project_id: str, context: str, 
                       profile_data: Dict = None) -> Dict[str, Any]:
        """
        构建GTV申请框架 - 基于分类证据进行精准构建
        
        改进：
        1. 优先使用分类后的证据（content_classifications表）
        2. 结合原始材料内容作为补充
        3. 每条证据都标明来源文件
        4. 区分申请人和推荐人的信息
        
        Args:
            project_id: 项目ID
            context: 提取的上下文内容（作为备用）
            profile_data: 客户信息脉络图（可选）
            
        Returns:
            GTV申请框架
        """
        try:
            # 获取项目信息
            project_info = self._get_project_info(project_id)
            client_name = project_info.get("client_name", "申请人") if project_info else "申请人"
            
            # 初始化框架
            framework = copy.deepcopy(GTV_FRAMEWORK_TEMPLATE)
            
            # 获取分类后的证据
            evidence_by_category = self._get_classified_evidence(project_id)
            has_classified_evidence = bool(evidence_by_category)
            
            if has_classified_evidence:
                logger.info(f"使用分类证据构建框架 - 项目: {project_id}, 共 {sum(len(v) for v in evidence_by_category.values())} 条证据")
            else:
                logger.info(f"无分类证据，使用原始上下文构建框架 - 项目: {project_id}")
            
            # 限制原始上下文长度（作为补充）
            max_context = context[:8000] if context and len(context) > 8000 else (context or "")
            
            if self.llm_client:
                logger.info(f"开始分步骤构建GTV框架 - 项目: {project_id}")
                
                # 步骤1: 分析领域定位（使用所有申请人证据）
                all_applicant_evidence = self._collect_applicant_evidence(evidence_by_category)
                domain_result = self._analyze_domain_positioning_v2(
                    project_id, all_applicant_evidence, max_context, client_name
                )
                if domain_result:
                    framework["领域定位"] = domain_result
                
                # 步骤2: 分析MC标准（使用对应分类的证据）
                mc_mapping = {
                    "MC1_产品团队领导力": "MC/mc1_product_leadership",
                    "MC2_商业发展": "MC/mc2_business_development",
                    "MC3_非营利组织": "MC/mc3_nonprofit",
                    "MC4_专家评审": "MC/mc4_expert_review"
                }
                for mc_key, evidence_key in mc_mapping.items():
                    mc_evidence = evidence_by_category.get(evidence_key, [])
                    mc_result = self._analyze_mc_criteria_v2(
                        project_id, mc_evidence, max_context, mc_key, client_name
                    )
                    if mc_result:
                        framework["MC_必选标准"][mc_key] = mc_result
                
                # 步骤3: 分析OC标准（使用对应分类的证据）
                oc_mapping = {
                    "OC1_创新": "OC/oc1_innovation",
                    "OC2_行业认可": "OC/oc2_industry_recognition",
                    "OC3_重大贡献": "OC/oc3_significant_contribution",
                    "OC4_学术贡献": "OC/oc4_academic_contribution"
                }
                for oc_key, evidence_key in oc_mapping.items():
                    oc_evidence = evidence_by_category.get(evidence_key, [])
                    oc_result = self._analyze_oc_criteria_v2(
                        project_id, oc_evidence, max_context, oc_key, client_name
                    )
                    if oc_result:
                        framework["OC_可选标准"][oc_key] = oc_result
                
                # 步骤4: 分析推荐人（使用推荐人分类证据）
                recommender_evidence = self._get_recommender_evidence(evidence_by_category)
                recommenders_result = self._analyze_recommenders_v2(
                    project_id, recommender_evidence, max_context, client_name
                )
                if recommenders_result:
                    framework["推荐信"] = recommenders_result
                
                # 步骤5: 生成个人陈述要点
                ps_result = self._generate_personal_statement_v2(
                    project_id, all_applicant_evidence, client_name, framework
                )
                if ps_result:
                    framework["个人陈述要点"] = ps_result
                
                # 步骤6: 生成申请策略
                strategy_result = self._generate_strategy(project_id, framework, client_name)
                if strategy_result:
                    framework["申请策略"] = strategy_result
                
                # 确定推荐的MC和OC
                self._determine_best_mc_oc(framework)
            else:
                # 回退到规则模式
                framework = self._rule_based_framework(context, profile_data, client_name)
            
            # 添加元数据
            framework["_metadata"] = {
                "project_id": project_id,
                "client_name": client_name,
                "generated_at": datetime.now().isoformat(),
                "version": 1,
                "ai_generated": bool(self.llm_client),
                "build_mode": "evidence_based" if has_classified_evidence else "context_based",
                "evidence_count": sum(len(v) for v in evidence_by_category.values())
            }
            
            # 保存到数据库
            self._save_framework(project_id, framework)
            
            return {
                "success": True,
                "data": framework
            }
            
        except Exception as e:
            logger.error(f"构建GTV框架失败: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}
    
    def _collect_applicant_evidence(self, evidence_by_category: Dict) -> List[Dict]:
        """收集所有申请人的证据"""
        all_evidence = []
        for key, evidence_list in evidence_by_category.items():
            for e in evidence_list:
                if e.get('subject_person') == 'applicant':
                    all_evidence.append(e)
        return all_evidence
    
    def _analyze_domain_positioning_v2(self, project_id: str, evidence_list: List[Dict],
                                       context: str, client_name: str) -> Optional[Dict]:
        """基于分类证据分析领域定位"""
        # 格式化证据
        evidence_text = self._format_evidence_for_prompt(evidence_list, max_items=15)
        
        # 尝试从数据库获取提示词
        db_prompt, version, prompt_name = self._get_prompt_from_db("framework_domain")
        
        prompt = f"""你是GTV签证专家。请根据以下已分类的申请人证据，分析其领域定位。

## 申请人: {client_name}

## 已分类的证据材料
{evidence_text}

## 补充背景信息
{context[:3000] if context else "无补充信息"}

## 输出要求
严格根据以上证据材料分析，返回JSON格式：
{{
    "评估机构": "Tech Nation",
    "细分领域": "具体技术/行业领域（如：人工智能、金融科技、医疗科技等）",
    "岗位定位": "申请人的核心职业角色（如：技术专家、产品负责人、创业者等）",
    "核心论点": "一句话总结申请人的核心优势和价值主张",
    "申请路径": "Exceptional Talent 或 Exceptional Promise（根据经验年限和成就判断）"
}}

要求：
1. 必须基于证据材料中的真实信息，不要杜撰
2. 如果证据不足以判断某项，写"待补充"
3. 核心论点必须具体、有说服力"""

        result_text = self._call_llm(prompt, project_id, "领域定位分析v2", "domain_analysis",
                                     prompt_version=version, prompt_name=prompt_name)
        return self._parse_json_response(result_text)
    
    def _analyze_mc_criteria_v2(self, project_id: str, evidence_list: List[Dict],
                                context: str, mc_key: str, client_name: str) -> Optional[Dict]:
        """基于分类证据分析MC标准"""
        mc_descriptions = {
            "MC1_产品团队领导力": "领导产品导向的数字科技公司/产品/团队增长的证据",
            "MC2_商业发展": "领导营销或业务开发，实现收入/客户增长的证据",
            "MC3_非营利组织": "领导数字科技领域非营利组织或社会企业的证据",
            "MC4_专家评审": "担任评审同行工作的重要专家角色的证据"
        }
        
        mc_requirements = {
            "MC1_产品团队领导力": """
需要证明以下要点：
1. 在产品导向的数字科技公司/团队中担任领导角色
2. 领导团队规模、职责范围
3. 产品/团队增长的具体数据（用户量、收入、团队规模等）
4. 决策权和影响力的证据""",
            "MC2_商业发展": """
需要证明以下要点：
1. 在营销或业务开发中的领导角色
2. 具体的收入增长数据（百分比、金额）
3. 客户/用户增长数据
4. 市场拓展成果（新市场、新渠道等）""",
            "MC3_非营利组织": """
需要证明以下要点：
1. 在数字科技领域非营利组织或社会企业中的领导角色
2. 组织的规模和影响力
3. 社会影响力的具体数据
4. 技术或创新方面的贡献""",
            "MC4_专家评审": """
需要证明以下要点：
1. 作为评审专家的资格和邀请
2. 评审的会议/期刊/项目的级别和影响力
3. 评审的次数和持续时间
4. 评审领域与数字科技的关联"""
        }
        
        # 格式化证据
        evidence_text = self._format_evidence_for_prompt(evidence_list, max_items=8)
        
        prompt = f"""你是GTV签证专家。请根据以下已分类的证据，分析申请人是否符合MC标准：{mc_key}

## 标准描述
{mc_descriptions.get(mc_key, "")}

{mc_requirements.get(mc_key, "")}

## 申请人: {client_name}

## 该标准的相关证据
{evidence_text}

## 补充材料
{context[:2000] if context else "无补充材料"}

## 输出要求
严格根据以上证据分析，返回JSON格式：
{{
    "applicable": true或false（是否适用此标准）,
    "evidence_list": [
        {{
            "title": "证据标题（必须是材料中的真实内容）",
            "description": "具体描述（引用材料原文关键内容）",
            "source_file": "来源文件名",
            "strength": "强/中/弱",
            "key_data": "关键数据指标（如有）"
        }}
    ],
    "summary": "一段话概述如何满足此标准（必须基于实际证据）",
    "strength_score": 0-5（基于证据强度的评分：0=无证据，1-2=弱，3=中等，4-5=强）,
    "gaps": ["如有不足，列出需要补充的证据"]
}}

## 重要要求
1. evidence_list中的每项必须来自上述证据材料，带有明确的source_file
2. 如果没有相关证据，applicable应为false，evidence_list为空
3. 不要杜撰或假设任何信息
4. strength_score必须与证据质量相匹配"""

        result_text = self._call_llm(prompt, project_id, f"{mc_key}标准分析v2", "mc_analysis")
        return self._parse_json_response(result_text)
    
    def _analyze_oc_criteria_v2(self, project_id: str, evidence_list: List[Dict],
                                context: str, oc_key: str, client_name: str) -> Optional[Dict]:
        """基于分类证据分析OC标准"""
        oc_descriptions = {
            "OC1_创新": "创新/产品开发及市场验证证据（专利、产品发布、用户规模等）",
            "OC2_行业认可": "作为领域专家获得的认可证据（奖项、媒体报道、演讲邀请等）",
            "OC3_重大贡献": "对数字技术产品的重大技术/商业贡献（用户量、收入、技术突破等）",
            "OC4_学术贡献": "在数字技术领域的学术贡献（论文发表、引用、学术会议等）"
        }
        
        oc_requirements = {
            "OC1_创新": """
需要证明以下要点：
1. 创新产品/技术的开发（发明、专利、新产品）
2. 市场验证证据（用户反馈、市场份额、商业化成果）
3. 创新的独特性和技术难度
4. 创新对行业的影响""",
            "OC2_行业认可": """
需要证明以下要点：
1. 获得的奖项（奖项名称、颁发机构、级别）
2. 媒体报道（媒体名称、报道内容）
3. 演讲邀请（会议名称、级别、主题）
4. 专家身份的认可（评审、顾问等）""",
            "OC3_重大贡献": """
需要证明以下要点：
1. 对产品的具体贡献（功能、模块、系统）
2. 贡献的规模和影响（用户量、收入贡献）
3. 技术突破或创新点
4. 团队/公司对其贡献的认可""",
            "OC4_学术贡献": """
需要证明以下要点：
1. 论文发表（期刊/会议名称、CCF级别、引用数）
2. 学术会议参与（会议名称、角色）
3. 开源贡献（项目名称、Star数、影响力）
4. 学术合作和影响力"""
        }
        
        # 格式化证据
        evidence_text = self._format_evidence_for_prompt(evidence_list, max_items=8)
        
        prompt = f"""你是GTV签证专家。请根据以下已分类的证据，分析申请人是否符合OC标准：{oc_key}

## 标准描述
{oc_descriptions.get(oc_key, "")}

{oc_requirements.get(oc_key, "")}

## 申请人: {client_name}

## 该标准的相关证据
{evidence_text}

## 补充材料
{context[:2000] if context else "无补充材料"}

## 输出要求
严格根据以上证据分析，返回JSON格式：
{{
    "applicable": true或false（是否适用此标准）,
    "evidence_list": [
        {{
            "title": "证据标题",
            "description": "具体描述（引用材料原文关键内容）",
            "source_file": "来源文件名",
            "strength": "强/中/弱",
            "key_data": "关键数据指标（如有）"
        }}
    ],
    "summary": "一段话概述如何满足此标准",
    "strength_score": 0-5,
    "gaps": ["需要补充的证据"]
}}

## 重要要求
1. 每条证据必须有明确的source_file来源
2. 没有证据时applicable为false
3. 不要杜撰信息"""

        result_text = self._call_llm(prompt, project_id, f"{oc_key}标准分析v2", "oc_analysis")
        return self._parse_json_response(result_text)
    
    def _analyze_recommenders_v2(self, project_id: str, evidence_list: List[Dict],
                                 context: str, client_name: str) -> Optional[Dict]:
        """基于分类证据分析推荐人"""
        # 格式化推荐人相关证据
        formatted_evidence = []
        for e in evidence_list[:20]:
            source = e.get('source_file', '未知来源')
            formatted_evidence.append(f"""【推荐人信息】
{e.get('content', '')}
（来源: {source}）
""")
        
        evidence_text = "\n".join(formatted_evidence) if formatted_evidence else "暂无推荐人相关证据"
        
        prompt = f"""你是GTV签证专家。请根据以下推荐人相关证据，分析并组织推荐人信息。

## 申请人: {client_name}

## 推荐人相关证据
{evidence_text}

## 补充材料
{context[:2000] if context else "无补充材料"}

## GTV推荐信要求
- 需要3封推荐信
- 推荐人应来自不同背景：行业专家、技术专家、商业合作伙伴等
- 推荐人需要有足够的资历和认可度
- 每封推荐信应聚焦不同的能力维度

## 输出要求
返回JSON格式：
{{
    "推荐人1": {{
        "name": "推荐人姓名",
        "title": "职位",
        "organization": "机构/公司",
        "relationship": "与申请人的关系",
        "focus_points": ["推荐信应聚焦的要点1", "要点2"],
        "status": "已确认/待确认",
        "source_file": "信息来源文件"
    }},
    "推荐人2": {{...}},
    "推荐人3": {{...}}
}}

## 重要要求
1. 信息必须来自上述证据材料
2. 如果推荐人信息不完整，在status中标注"待补充"
3. focus_points应根据推荐人背景和申请策略来建议
4. 必须标注source_file来源"""

        result_text = self._call_llm(prompt, project_id, "推荐人分析v2", "recommender_analysis")
        return self._parse_json_response(result_text)
    
    def _generate_personal_statement_v2(self, project_id: str, evidence_list: List[Dict],
                                        client_name: str, framework: Dict) -> Optional[Dict]:
        """基于分类证据生成个人陈述要点"""
        # 格式化申请人证据
        evidence_text = self._format_evidence_for_prompt(evidence_list, max_items=20)
        
        # 从框架中提取已分析的信息
        domain_info = framework.get("领域定位", {})
        mc_info = framework.get("MC_必选标准", {})
        oc_info = framework.get("OC_可选标准", {})
        
        prompt = f"""你是GTV签证专家。请根据以下信息，生成个人陈述的核心要点。

## 申请人: {client_name}

## 领域定位
- 细分领域: {domain_info.get('细分领域', '待定')}
- 岗位定位: {domain_info.get('岗位定位', '待定')}
- 核心论点: {domain_info.get('核心论点', '待定')}
- 申请路径: {domain_info.get('申请路径', '待定')}

## 申请人证据概览
{evidence_text}

## 输出要求
返回JSON格式：
{{
    "opening_hook": "个人陈述开篇引言（吸引人的开头，展现独特价值）",
    "technical_journey": "技术/职业发展历程概述（关键转折点和成长）",
    "key_achievements": [
        {{
            "achievement": "核心成就1",
            "evidence": "支撑证据",
            "source_file": "来源文件"
        }},
        {{
            "achievement": "核心成就2",
            "evidence": "支撑证据",
            "source_file": "来源文件"
        }},
        {{
            "achievement": "核心成就3",
            "evidence": "支撑证据",
            "source_file": "来源文件"
        }}
    ],
    "uk_vision": "对英国数字科技领域的贡献愿景",
    "conclusion": "总结陈述"
}}

## 重要要求
1. key_achievements必须基于真实证据，标注来源
2. 内容应与GTV评估标准紧密对应
3. 语言应专业、有说服力，适合正式申请文书"""

        result_text = self._call_llm(prompt, project_id, "个人陈述要点v2", "ps_analysis")
        return self._parse_json_response(result_text)
    
    def _analyze_domain_positioning(self, project_id: str, context: str, 
                                    client_name: str) -> Optional[Dict]:
        """分析领域定位"""
        # 尝试从数据库获取提示词（动态加载最新版本）
        db_prompt, version, prompt_name = self._get_prompt_from_db("framework_domain")
        
        if db_prompt:
            # 使用数据库中的提示词，替换变量
            prompt = db_prompt.replace("{client_name}", client_name).replace("{context}", context[:6000])
        else:
            version = None
            prompt_name = None
            # 回退到默认提示词
            prompt = f"""你是GTV签证专家。请根据以下申请人材料，分析其领域定位。

申请人：{client_name}

材料内容：
{context[:6000]}

请严格根据材料内容分析，不要杜撰信息。按以下JSON格式返回：
{{
    "评估机构": "Tech Nation",
    "细分领域": "根据材料确定的具体技术/商业领域（如AI、金融科技、数字健康等）",
    "岗位定位": "根据材料确定的专业定位（如技术领导者、创业者、研究专家）",
    "核心论点": "一句话概括申请人的独特价值，必须基于材料中的事实",
    "申请路径": "Exceptional Talent（5年+经验）或 Exceptional Promise（早期职业）",
    "source_files": ["用于判断的来源文件列表"]
}}

重要：所有结论必须基于材料中的实际内容，标注来源文件。"""

        result_text = self._call_llm(prompt, project_id, "领域定位分析", "domain_analysis",
                                     prompt_version=version, prompt_name=prompt_name)
        return self._parse_json_response(result_text)
    
    def _analyze_mc_criteria(self, project_id: str, context: str, 
                            mc_key: str, client_name: str) -> Optional[Dict]:
        """分析单个MC标准"""
        mc_descriptions = {
            "MC1_产品团队领导力": "领导产品导向的数字科技公司/产品/团队增长的证据",
            "MC2_商业发展": "领导营销或业务开发，实现收入/客户增长的证据",
            "MC3_非营利组织": "领导数字科技领域非营利组织或社会企业的证据",
            "MC4_专家评审": "担任评审同行工作的重要专家角色的证据"
        }
        
        # MC编号映射到数据库类型
        mc_type_map = {
            "MC1_产品团队领导力": "framework_mc1",
            "MC2_商业发展": "framework_mc2",
            "MC3_非营利组织": "framework_mc3",
            "MC4_专家评审": "framework_mc4"
        }
        
        # 尝试从数据库获取提示词（动态加载最新版本）
        prompt_type = mc_type_map.get(mc_key, "framework_mc1")
        db_prompt, version, prompt_name = self._get_prompt_from_db(prompt_type)
        
        if db_prompt:
            # 使用数据库中的提示词，替换变量
            prompt = db_prompt.replace("{client_name}", client_name).replace("{context}", context[:6000])
        else:
            version = None
            prompt_name = None
            # 回退到默认提示词
            prompt = f"""你是GTV签证专家。请根据以下申请人材料，分析其是否符合MC标准：{mc_key}

标准描述：{mc_descriptions.get(mc_key, "")}

申请人：{client_name}

材料内容：
{context[:6000]}

请严格根据材料内容分析，不要杜撰信息。按以下JSON格式返回：
{{
    "applicable": true或false（是否适用此标准）,
    "evidence_list": [
        {{
            "title": "证据标题（必须是材料中的真实内容）",
            "description": "具体描述（引用材料原文或概述）",
            "source_file": "来源文件名（如CV_xxx.docx）",
            "strength": "强/中/弱"
        }}
    ],
    "summary": "如何证明满足此标准的概述（基于实际证据）",
    "strength_score": 0-5（基于证据强度的评分）,
    "gaps": ["如有不足，列出需要补充的证据"]
}}

重要要求：
1. evidence_list中的每项必须是材料中真实存在的内容
2. 必须标注source_file来源文件
3. 如果材料中没有相关证据，applicable应为false，evidence_list为空
4. 不要杜撰或假设任何信息"""

        result_text = self._call_llm(prompt, project_id, f"{mc_key}标准分析", "mc_analysis",
                                     prompt_version=version, prompt_name=prompt_name)
        return self._parse_json_response(result_text)
    
    def _analyze_oc_criteria(self, project_id: str, context: str, 
                            oc_key: str, client_name: str) -> Optional[Dict]:
        """分析单个OC标准"""
        oc_descriptions = {
            "OC1_创新": "创新/产品开发及市场验证证据（专利、产品发布、用户规模等）",
            "OC2_行业认可": "作为领域专家获得的认可证据（奖项、媒体报道、演讲邀请等）",
            "OC3_重大贡献": "对数字技术产品的重大技术/商业贡献（用户量、收入、技术突破等）",
            "OC4_学术贡献": "在数字技术领域的学术贡献（论文发表、引用、学术会议等）"
        }
        
        # OC编号映射到数据库类型
        oc_type_map = {
            "OC1_创新": "framework_oc1",
            "OC2_行业认可": "framework_oc2",
            "OC3_重大贡献": "framework_oc3",
            "OC4_学术贡献": "framework_oc4"
        }
        
        # 尝试从数据库获取提示词（动态加载最新版本）
        prompt_type = oc_type_map.get(oc_key, "framework_oc1")
        db_prompt, version, prompt_name = self._get_prompt_from_db(prompt_type)
        
        if db_prompt:
            # 使用数据库中的提示词，替换变量
            prompt = db_prompt.replace("{client_name}", client_name).replace("{context}", context[:6000])
        else:
            version = None
            prompt_name = None
            # 回退到默认提示词
            prompt = f"""你是GTV签证专家。请根据以下申请人材料，分析其是否符合OC标准：{oc_key}

标准描述：{oc_descriptions.get(oc_key, "")}

申请人：{client_name}

材料内容：
{context[:6000]}

请严格根据材料内容分析，不要杜撰信息。按以下JSON格式返回：
{{
    "applicable": true或false（是否适用此标准）,
    "evidence_list": [
        {{
            "title": "证据标题（必须是材料中的真实内容）",
            "description": "具体描述（引用材料原文或概述）",
            "source_file": "来源文件名",
            "strength": "强/中/弱"
        }}
    ],
    "summary": "如何证明满足此标准的概述（基于实际证据）",
    "strength_score": 0-5（基于证据强度的评分）,
    "gaps": ["如有不足，列出需要补充的证据"]
}}

重要要求：
1. evidence_list中的每项必须是材料中真实存在的内容
2. 必须标注source_file来源文件
3. 如果材料中没有相关证据，applicable应为false，evidence_list为空
4. 不要杜撰或假设任何信息"""

        result_text = self._call_llm(prompt, project_id, f"{oc_key}标准分析", "oc_analysis",
                                     prompt_version=version, prompt_name=prompt_name)
        return self._parse_json_response(result_text)
    
    def _analyze_recommenders(self, project_id: str, context: str, 
                             client_name: str) -> Optional[Dict]:
        """分析推荐人信息"""
        # 尝试从数据库获取提示词（动态加载最新版本）
        db_prompt, version, prompt_name = self._get_prompt_from_db("framework_recommenders")
        
        if db_prompt:
            # 使用数据库中的提示词，替换变量
            prompt = db_prompt.replace("{client_name}", client_name).replace("{context}", context[:8000])
        else:
            version = None
            prompt_name = None
            # 回退到默认提示词
            prompt = f"""你是GTV签证专家。请根据以下申请人材料，识别潜在的推荐人信息。

申请人：{client_name}

材料内容：
{context[:8000]}

请严格从材料中提取真实的人物信息，不要杜撰。按以下JSON格式返回：
{{
    "推荐人1": {{
        "name": "材料中提到的具体人名（如无则留空）",
        "title": "职位（必须从材料中提取）",
        "organization": "机构（必须从材料中提取）",
        "relationship": "与申请人的关系（如前老板、合作伙伴、导师等）",
        "focus_points": ["推荐信应重点提及的内容（基于材料中的合作经历）"],
        "status": "已确定（材料中有明确人选）或待确定",
        "source_file": "信息来源文件名",
        "suggested_profile": "如无具体人选，建议的推荐人类型"
    }},
    "推荐人2": {{ ... 同上结构 }},
    "推荐人3": {{ ... 同上结构 }}
}}

重要要求：
1. 仔细查找材料中提到的具体人物：
   - CV中的前老板、上级领导
   - 合作项目中的合作伙伴
   - 学术导师、教授
   - 投资人、客户高管
   - 行业组织负责人
2. 每个推荐人必须标注source_file来源
3. 如果材料中找不到具体人选，suggested_profile提供建议类型，name留空
4. 绝对不要编造人名或机构名"""

        result_text = self._call_llm(prompt, project_id, "推荐人分析", "recommender_analysis",
                                     prompt_version=version, prompt_name=prompt_name)
        return self._parse_json_response(result_text)
    
    def _generate_personal_statement(self, project_id: str, context: str, 
                                     client_name: str, framework: Dict) -> Optional[Dict]:
        """生成个人陈述要点"""
        # 准备已分析的框架信息
        domain_info = json.dumps(framework.get("领域定位", {}), ensure_ascii=False)
        framework_summary = json.dumps({
            "领域定位": framework.get("领域定位", {}),
            "推荐MC": framework.get("MC_必选标准", {}).get("选择的MC", ""),
            "推荐OC": framework.get("OC_可选标准", {}).get("选择的OC", [])
        }, ensure_ascii=False)
        
        # 尝试从数据库获取提示词（动态加载最新版本）
        db_prompt, version, prompt_name = self._get_prompt_from_db("framework_ps")
        
        if db_prompt:
            # 使用数据库中的提示词，替换变量
            prompt = db_prompt.replace("{client_name}", client_name)\
                             .replace("{context}", context[:6000])\
                             .replace("{framework_summary}", framework_summary)
        else:
            version = None
            prompt_name = None
            # 回退到默认提示词
            prompt = f"""你是GTV签证专家。请根据以下申请人材料和已分析的框架，生成个人陈述要点。

申请人：{client_name}
领域定位：{domain_info}

材料内容：
{context[:6000]}

请根据材料内容生成个人陈述要点，不要杜撰。按以下JSON格式返回：
{{
    "opening_hook": "开篇吸引点（基于申请人最突出的成就或经历）",
    "technical_journey": "技术/职业发展历程概述（基于材料中的时间线）",
    "key_achievements": [
        "核心成就1（必须是材料中的真实成就）",
        "核心成就2",
        "核心成就3"
    ],
    "uk_vision": "来英国发展的愿景（如材料中有提及，否则提供建议方向）",
    "conclusion": "总结性陈述要点",
    "source_files": ["参考的来源文件"]
}}

重要：所有内容必须基于材料中的实际信息。"""

        result_text = self._call_llm(prompt, project_id, "个人陈述要点生成", "ps_generation",
                                     prompt_version=version, prompt_name=prompt_name)
        return self._parse_json_response(result_text)
    
    def _generate_strategy(self, project_id: str, framework: Dict, 
                          client_name: str) -> Optional[Dict]:
        """生成申请策略"""
        # 计算MC和OC分数
        mc_scores = {k: framework["MC_必选标准"].get(k, {}).get("strength_score", 0) 
                    for k in ["MC1_产品团队领导力", "MC2_商业发展", "MC3_非营利组织", "MC4_专家评审"]}
        oc_scores = {k: framework["OC_可选标准"].get(k, {}).get("strength_score", 0) 
                    for k in ["OC1_创新", "OC2_行业认可", "OC3_重大贡献", "OC4_学术贡献"]}
        
        framework_summary = json.dumps({
            "领域定位": framework.get("领域定位", {}),
            "MC评分": mc_scores,
            "OC评分": oc_scores
        }, ensure_ascii=False, indent=2)
        
        # 尝试从数据库获取提示词（动态加载最新版本）
        db_prompt, version, prompt_name = self._get_prompt_from_db("framework_strategy")
        
        if db_prompt:
            # 使用数据库中的提示词，替换变量
            prompt = db_prompt.replace("{client_name}", client_name)\
                             .replace("{framework_summary}", framework_summary)
        else:
            version = None
            prompt_name = None
            # 回退到默认提示词
            prompt = f"""你是GTV签证专家。请根据以下分析结果，生成申请策略。

申请人：{client_name}

MC标准评分：
{json.dumps(mc_scores, ensure_ascii=False, indent=2)}

OC标准评分：
{json.dumps(oc_scores, ensure_ascii=False, indent=2)}

请按以下JSON格式返回申请策略：
{{
    "overall_strength": "强/中/需改进（基于评分综合判断）",
    "recommended_mc": "推荐选择的MC标准（评分最高的一个）",
    "recommended_ocs": ["推荐选择的OC标准（评分最高的两个）"],
    "recommended_approach": "具体的申请策略建议",
    "key_risks": ["主要风险点"],
    "preparation_priorities": ["优先准备事项1", "优先准备事项2", "优先准备事项3"]
}}"""

        result_text = self._call_llm(prompt, project_id, "申请策略生成", "strategy_generation",
                                     prompt_version=version, prompt_name=prompt_name)
        result = self._parse_json_response(result_text)
        
        if result:
            # 设置推荐的MC和OC
            if result.get("recommended_mc"):
                framework["MC_必选标准"]["选择的MC"] = result["recommended_mc"].split("_")[0] if "_" in result["recommended_mc"] else result["recommended_mc"]
            if result.get("recommended_ocs"):
                framework["OC_可选标准"]["选择的OC"] = [oc.split("_")[0] if "_" in oc else oc for oc in result["recommended_ocs"]]
        
        return result
    
    def _determine_best_mc_oc(self, framework: Dict):
        """根据评分确定最佳MC和OC选择"""
        # 确定最佳MC
        mc_scores = {}
        for key in ["MC1_产品团队领导力", "MC2_商业发展", "MC3_非营利组织", "MC4_专家评审"]:
            mc_scores[key] = framework["MC_必选标准"].get(key, {}).get("strength_score", 0)
        
        if mc_scores:
            best_mc = max(mc_scores, key=mc_scores.get)
            if not framework["MC_必选标准"].get("选择的MC"):
                framework["MC_必选标准"]["选择的MC"] = best_mc.split("_")[0]
        
        # 确定最佳OC（选2个）
        oc_scores = {}
        for key in ["OC1_创新", "OC2_行业认可", "OC3_重大贡献", "OC4_学术贡献"]:
            oc_scores[key] = framework["OC_可选标准"].get(key, {}).get("strength_score", 0)
        
        if oc_scores and not framework["OC_可选标准"].get("选择的OC"):
            sorted_ocs = sorted(oc_scores.items(), key=lambda x: x[1], reverse=True)
            framework["OC_可选标准"]["选择的OC"] = [oc[0].split("_")[0] for oc in sorted_ocs[:2] if oc[1] > 0]
    
    def _get_project_info(self, project_id: str) -> Optional[Dict]:
        """获取项目信息"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            for table in ["projects", "copywriting_projects"]:
                try:
                    cursor.execute(f"SELECT * FROM {table} WHERE project_id = ?", (project_id,))
                    row = cursor.fetchone()
                    if row:
                        conn.close()
                        return dict(row)
                except:
                    continue
            
            conn.close()
            return None
        except Exception as e:
            logger.error(f"获取项目信息失败: {e}")
            return None
    
    # 旧的_ai_build_framework方法已被分步骤方法取代
    
    def _rule_based_framework(self, context: str, profile_data: Dict, 
                             client_name: str) -> Dict:
        """基于规则构建框架（回退方案）"""
        framework = copy.deepcopy(GTV_FRAMEWORK_TEMPLATE)
        
        # 基础信息
        framework["领域定位"]["细分领域"] = "待AI分析确定"
        framework["领域定位"]["岗位定位"] = client_name
        framework["领域定位"]["核心论点"] = "待AI分析或手动填写"
        framework["领域定位"]["申请路径"] = "待确定"
        
        # 从上下文中提取关键词进行简单匹配
        context_lower = context.lower()
        
        # MC标准关键词匹配
        mc_keywords = {
            "MC1_产品团队领导力": ["领导", "团队", "产品", "lead", "team", "product", "cto", "ceo", "founder", "创始人", "技术总监"],
            "MC2_商业发展": ["营收", "收入", "客户", "revenue", "sales", "business", "marketing", "商业", "融资", "投资"],
            "MC3_非营利组织": ["非营利", "公益", "社会企业", "non-profit", "social", "charity", "开源", "open source"],
            "MC4_专家评审": ["评审", "评委", "专家", "reviewer", "judge", "advisor", "顾问", "导师", "mentor"]
        }
        
        for mc_key, keywords in mc_keywords.items():
            matches = [kw for kw in keywords if kw.lower() in context_lower]
            if matches:
                framework["MC_必选标准"][mc_key]["applicable"] = True
                framework["MC_必选标准"][mc_key]["strength_score"] = min(len(matches), 5)
                framework["MC_必选标准"][mc_key]["evidence_list"].append({
                    "title": f"关键词匹配: {', '.join(matches[:3])}",
                    "description": "基于关键词自动识别，请手动补充具体证据",
                    "strength": "待评估"
                })
        
        # OC标准关键词匹配
        oc_keywords = {
            "OC1_创新": ["专利", "创新", "发明", "patent", "innovation", "新技术", "研发", "r&d"],
            "OC2_行业认可": ["奖", "荣誉", "认可", "award", "recognition", "top", "best", "杰出", "入选"],
            "OC3_重大贡献": ["贡献", "影响", "contribution", "impact", "用户", "users", "规模"],
            "OC4_学术贡献": ["论文", "发表", "paper", "publication", "学术", "研究", "博士", "phd", "教授"]
        }
        
        for oc_key, keywords in oc_keywords.items():
            matches = [kw for kw in keywords if kw.lower() in context_lower]
            if matches:
                framework["OC_可选标准"][oc_key]["applicable"] = True
                framework["OC_可选标准"][oc_key]["strength_score"] = min(len(matches), 5)
                framework["OC_可选标准"][oc_key]["evidence_list"].append({
                    "title": f"关键词匹配: {', '.join(matches[:3])}",
                    "description": "基于关键词自动识别，请手动补充具体证据",
                    "strength": "待评估"
                })
        
        # 从profile_data提取更多信息
        if profile_data:
            # 从成就中提取证据
            achievements = profile_data.get("achievements", [])
            for ach in achievements[:10]:
                if isinstance(ach, dict):
                    evidence = {
                        "title": ach.get("title", ach.get("description", ""))[:50],
                        "description": ach.get("description", ""),
                        "source": ach.get("source", ""),
                        "strength": "待评估"
                    }
                    
                    # 分类
                    ach_text = str(ach).lower()
                    if "专利" in ach_text or "patent" in ach_text:
                        framework["OC_可选标准"]["OC1_创新"]["evidence_list"].append(evidence)
                        framework["OC_可选标准"]["OC1_创新"]["applicable"] = True
                    elif "论文" in ach_text or "paper" in ach_text or "发表" in ach_text:
                        framework["OC_可选标准"]["OC4_学术贡献"]["evidence_list"].append(evidence)
                        framework["OC_可选标准"]["OC4_学术贡献"]["applicable"] = True
                    elif "奖" in ach_text or "award" in ach_text:
                        framework["OC_可选标准"]["OC2_行业认可"]["evidence_list"].append(evidence)
                        framework["OC_可选标准"]["OC2_行业认可"]["applicable"] = True
                    else:
                        framework["MC_必选标准"]["MC1_产品团队领导力"]["evidence_list"].append(evidence)
            
            # 提取推荐人信息
            connections = profile_data.get("connections", {})
            recommenders = connections.get("recommenders", [])
            for i, rec in enumerate(recommenders[:3]):
                if isinstance(rec, dict):
                    key = f"推荐人{i+1}"
                    if key in framework["推荐信"]:
                        framework["推荐信"][key]["name"] = rec.get("name", "")
                        framework["推荐信"][key]["title"] = rec.get("title", "")
                        framework["推荐信"][key]["organization"] = rec.get("organization", "")
                        framework["推荐信"][key]["relationship"] = rec.get("relationship", "")
                        if rec.get("name"):
                            framework["推荐信"][key]["status"] = "已确定"
        
        # 确定推荐的MC和OC
        mc_scores = {}
        for key in ["MC1_产品团队领导力", "MC2_商业发展", "MC3_非营利组织", "MC4_专家评审"]:
            mc_scores[key] = framework["MC_必选标准"][key]["strength_score"]
        
        best_mc = max(mc_scores, key=mc_scores.get)
        framework["MC_必选标准"]["选择的MC"] = best_mc.split("_")[0]
        
        oc_scores = {}
        for key in ["OC1_创新", "OC2_行业认可", "OC3_重大贡献", "OC4_学术贡献"]:
            oc_scores[key] = framework["OC_可选标准"][key]["strength_score"]
        
        sorted_ocs = sorted(oc_scores.items(), key=lambda x: x[1], reverse=True)
        framework["OC_可选标准"]["选择的OC"] = [oc[0].split("_")[0] for oc in sorted_ocs[:2] if oc[1] > 0]
        
        return framework
    
    def _save_framework(self, project_id: str, framework: Dict):
        """保存框架到数据库"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # 获取当前版本
            cursor.execute('''
                SELECT version FROM gtv_frameworks WHERE project_id = ?
            ''', (project_id,))
            row = cursor.fetchone()
            new_version = (row['version'] + 1) if row else 1
            
            cursor.execute('''
                INSERT INTO gtv_frameworks (project_id, framework_data, version, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(project_id) 
                DO UPDATE SET 
                    framework_data = excluded.framework_data,
                    version = excluded.version,
                    updated_at = CURRENT_TIMESTAMP
            ''', (project_id, json.dumps(framework, ensure_ascii=False), new_version))
            
            conn.commit()
            conn.close()
            
            logger.info(f"保存框架: {project_id} v{new_version}")
            
        except Exception as e:
            logger.error(f"保存框架失败: {e}")
    
    def get_framework(self, project_id: str) -> Dict[str, Any]:
        """获取项目框架"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT framework_data, version, updated_at
                FROM gtv_frameworks WHERE project_id = ?
            ''', (project_id,))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                return {
                    "success": True,
                    "data": {
                        "framework_data": json.loads(row['framework_data']),
                        "version": row['version'],
                        "updated_at": row['updated_at']
                    }
                }
            
            return {"success": True, "data": None}
            
        except Exception as e:
            logger.error(f"获取框架失败: {e}")
            return {"success": False, "error": str(e)}
    
    def update_framework(self, project_id: str, updates: Dict) -> Dict[str, Any]:
        """更新框架的特定部分"""
        try:
            # 获取现有框架
            result = self.get_framework(project_id)
            if not result.get("success") or not result.get("data"):
                return {"success": False, "error": "未找到框架"}
            
            framework = result["data"]["framework_data"]
            
            # 深度合并更新
            self._deep_merge(framework, updates)
            
            # 更新元数据
            framework["_metadata"]["updated_at"] = datetime.now().isoformat()
            framework["_metadata"]["version"] = result["data"]["version"] + 1
            
            # 保存
            self._save_framework(project_id, framework)
            
            return {
                "success": True,
                "data": framework
            }
            
        except Exception as e:
            logger.error(f"更新框架失败: {e}")
            return {"success": False, "error": str(e)}
    
    def _deep_merge(self, base: Dict, updates: Dict):
        """深度合并字典"""
        for key, value in updates.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_merge(base[key], value)
            else:
                base[key] = value
    
    def analyze_client_profile(self, project_id: str, context: str) -> Dict[str, Any]:
        """
        分析客户信息，生成信息脉络图
        
        Args:
            project_id: 项目ID
            context: 提取的上下文内容
            
        Returns:
            客户信息脉络图
        """
        try:
            if not context or len(context.strip()) < 100:
                return {"success": False, "error": "上下文内容不足"}
            
            profile = None
            
            if self.llm_client:
                profile = self._ai_analyze_profile(context)
            
            if not profile:
                profile = self._rule_based_profile(context)
            
            # 保存到数据库
            self._save_profile(project_id, profile)
            
            return {
                "success": True,
                "data": profile
            }
            
        except Exception as e:
            logger.error(f"分析客户信息失败: {e}")
            return {"success": False, "error": str(e)}
    
    def _ai_analyze_profile(self, context: str) -> Optional[Dict]:
        """使用AI分析客户信息"""
        if not self.llm_client:
            return None
        
        try:
            prompt = f"""
请从以下材料中提取申请人的关键信息，生成结构化的信息脉络图。

材料内容：
{context[:12000]}

请以JSON格式返回：
{{
    "personal_info": {{
        "name": "姓名",
        "current_title": "当前职位",
        "current_company": "当前公司",
        "years_of_experience": 年数,
        "nationality": "国籍",
        "location": "所在地"
    }},
    "education": [
        {{
            "degree": "学位",
            "field": "专业",
            "institution": "学校",
            "year": "年份",
            "highlights": ["亮点1", "亮点2"]
        }}
    ],
    "career_timeline": [
        {{
            "period": "时间段",
            "company": "公司",
            "title": "职位",
            "responsibilities": ["职责1", "职责2"],
            "achievements": ["成就1", "成就2"]
        }}
    ],
    "technical_expertise": [
        {{
            "domain": "领域",
            "skills": ["技能1", "技能2"],
            "level": "专家/高级/中级"
        }}
    ],
    "achievements": [
        {{
            "type": "类型（专利/论文/奖项/产品等）",
            "title": "标题",
            "description": "描述",
            "impact": "影响力",
            "source": "来源"
        }}
    ],
    "connections": {{
        "recommenders": [
            {{
                "name": "姓名",
                "title": "职位",
                "organization": "机构",
                "relationship": "关系"
            }}
        ],
        "notable_collaborations": ["合作1", "合作2"]
    }},
    "uk_connections": {{
        "has_uk_experience": true/false,
        "uk_companies": ["公司1"],
        "uk_collaborations": ["合作1"],
        "uk_plans": "英国发展计划"
    }}
}}

只返回JSON，不要其他文字。
"""
            
            response = self.llm_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=3000,
                temperature=0.3
            )
            
            result_text = response.choices[0].message.content
            
            import re
            json_match = re.search(r'\{[\s\S]*\}', result_text)
            if json_match:
                profile = json.loads(json_match.group())
                profile["analyzed_at"] = datetime.now().isoformat()
                profile["ai_generated"] = True
                logger.info("AI成功分析客户信息")
                return profile
            
            return None
            
        except Exception as e:
            logger.error(f"AI分析客户信息失败: {e}")
            return None
    
    def _rule_based_profile(self, context: str) -> Dict:
        """基于规则提取客户信息"""
        profile = {
            "personal_info": {},
            "education": [],
            "career_timeline": [],
            "technical_expertise": [],
            "achievements": [],
            "connections": {"recommenders": [], "notable_collaborations": []},
            "uk_connections": {"has_uk_experience": False},
            "analyzed_at": datetime.now().isoformat(),
            "ai_generated": False
        }
        
        # 简单的关键词提取
        lines = context.split('\n')
        
        for line in lines:
            line_lower = line.lower()
            
            # 教育背景
            if any(kw in line_lower for kw in ['博士', 'phd', '硕士', 'master', '学士', 'bachelor', '大学', 'university']):
                profile["education"].append({"description": line.strip()[:200]})
            
            # 职业经历
            if any(kw in line_lower for kw in ['工作', 'work', '任职', '担任', 'position', 'role']):
                profile["career_timeline"].append({"description": line.strip()[:200]})
            
            # 成就
            if any(kw in line_lower for kw in ['专利', 'patent', '论文', 'paper', '奖', 'award', '发表', 'publish']):
                profile["achievements"].append({"description": line.strip()[:200]})
        
        return profile
    
    def _save_profile(self, project_id: str, profile: Dict):
        """保存信息脉络图到数据库"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO client_profile_maps (project_id, profile_data, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(project_id) 
                DO UPDATE SET 
                    profile_data = excluded.profile_data,
                    updated_at = CURRENT_TIMESTAMP
            ''', (project_id, json.dumps(profile, ensure_ascii=False)))
            
            conn.commit()
            conn.close()
            
            logger.info(f"保存信息脉络图: {project_id}")
            
        except Exception as e:
            logger.error(f"保存信息脉络图失败: {e}")
    
    def get_profile(self, project_id: str) -> Dict[str, Any]:
        """获取客户信息脉络图"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT profile_data, updated_at
                FROM client_profile_maps WHERE project_id = ?
            ''', (project_id,))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                return {
                    "success": True,
                    "data": {
                        "profile": json.loads(row['profile_data']),
                        "updated_at": row['updated_at']
                    }
                }
            
            return {"success": True, "data": None}
            
        except Exception as e:
            logger.error(f"获取信息脉络图失败: {e}")
            return {"success": False, "error": str(e)}
    
    def export_markdown(self, framework: Dict) -> str:
        """导出框架为Markdown格式"""
        md = []
        
        # 标题
        metadata = framework.get("_metadata", {})
        client_name = metadata.get("client_name", "申请人")
        md.append(f"# {client_name} - GTV签证申请框架\n")
        md.append(f"> 生成时间: {metadata.get('generated_at', datetime.now().isoformat())}")
        md.append(f"> 版本: v{metadata.get('version', 1)}\n\n")
        
        # 领域定位
        domain = framework.get("领域定位", {})
        md.append("## 1. 领域定位\n")
        md.append(f"| 项目 | 内容 |")
        md.append(f"|------|------|")
        md.append(f"| 评估机构 | {domain.get('评估机构', 'Tech Nation')} |")
        md.append(f"| 细分领域 | {domain.get('细分领域', '待确定')} |")
        md.append(f"| 岗位定位 | {domain.get('岗位定位', '待确定')} |")
        md.append(f"| 申请路径 | {domain.get('申请路径', '待确定')} |")
        md.append(f"| 核心论点 | {domain.get('核心论点', '待确定')} |")
        md.append("")
        
        # MC必选标准
        mc = framework.get("MC_必选标准", {})
        md.append("## 2. MC必选标准 (Mandatory Criteria)\n")
        selected_mc = mc.get("选择的MC", "待定")
        md.append(f"**推荐选择**: {selected_mc}\n")
        
        for key in ["MC1_产品团队领导力", "MC2_商业发展", "MC3_非营利组织", "MC4_专家评审"]:
            data = mc.get(key, {})
            applicable = data.get("applicable", False)
            score = data.get("strength_score", 0)
            is_selected = key.startswith(selected_mc)
            
            status = "✅ **已选择**" if is_selected else ("⚪ 适用" if applicable else "❌ 不适用")
            md.append(f"### {key.replace('_', ': ')} {status} (评分: {score}/5)\n")
            
            if data.get("description"):
                md.append(f"*{data['description']}*\n")
            
            if data.get("summary"):
                md.append(f"**概述**: {data['summary']}\n")
            
            evidence_list = data.get("evidence_list", [])
            if evidence_list:
                md.append("**证据列表**:")
                for i, ev in enumerate(evidence_list[:5], 1):
                    if isinstance(ev, dict):
                        strength = f" [{ev.get('strength', '')}]" if ev.get('strength') else ""
                        md.append(f"  {i}. **{ev.get('title', '证据')}**{strength}")
                        if ev.get('description'):
                            md.append(f"     {ev['description'][:150]}")
                    else:
                        md.append(f"  {i}. {ev}")
                md.append("")
            
            gaps = data.get("gaps", [])
            if gaps:
                md.append("**待补充**:")
                for gap in gaps:
                    md.append(f"  - ⚠️ {gap}")
                md.append("")
        
        # OC可选标准
        oc = framework.get("OC_可选标准", {})
        md.append("## 3. OC可选标准 (Optional Criteria)\n")
        selected_ocs = oc.get("选择的OC", [])
        if selected_ocs:
            md.append(f"**推荐选择**: {', '.join(selected_ocs)}\n")
        
        for key in ["OC1_创新", "OC2_行业认可", "OC3_重大贡献", "OC4_学术贡献"]:
            data = oc.get(key, {})
            applicable = data.get("applicable", False)
            score = data.get("strength_score", 0)
            is_selected = any(key.startswith(s) for s in selected_ocs)
            
            status = "⭐ **已选择**" if is_selected else ("⚪ 可选" if applicable else "❌ 不适用")
            md.append(f"### {key.replace('_', ': ')} {status} (评分: {score}/5)\n")
            
            if data.get("summary"):
                md.append(f"**概述**: {data['summary']}\n")
            
            evidence_list = data.get("evidence_list", [])
            if evidence_list:
                md.append("**证据列表**:")
                for i, ev in enumerate(evidence_list[:5], 1):
                    if isinstance(ev, dict):
                        md.append(f"  {i}. {ev.get('title', '证据')}")
                    else:
                        md.append(f"  {i}. {ev}")
                md.append("")
        
        # 推荐信
        refs = framework.get("推荐信", {})
        md.append("## 4. 三封推荐信\n")
        
        for key in ["推荐人1", "推荐人2", "推荐人3"]:
            ref = refs.get(key, {})
            name = ref.get("name") or ref.get("suggested_profile", "待确定")
            title = ref.get("title", "")
            org = ref.get("organization", "")
            status = ref.get("status", "待确定")
            
            status_icon = "✅" if status in ["已确定", "已准备"] else "⏳"
            md.append(f"### {key}: {name} {status_icon}")
            
            if title or org:
                md.append(f"- **职位**: {title} @ {org}")
            md.append(f"- **关系**: {ref.get('relationship', '待确定')}")
            md.append(f"- **状态**: {status}")
            
            focus = ref.get("focus_points", [])
            if focus:
                md.append("- **推荐重点**:")
                for f in focus:
                    md.append(f"  - {f}")
            md.append("")
        
        # 个人陈述要点
        ps = framework.get("个人陈述要点", {})
        md.append("## 5. 个人陈述要点\n")
        
        if ps.get("opening_hook"):
            md.append(f"**开篇吸引点**: {ps['opening_hook']}\n")
        if ps.get("technical_journey"):
            md.append(f"**职业发展历程**: {ps['technical_journey']}\n")
        
        key_ach = ps.get("key_achievements", [])
        if key_ach:
            md.append("**核心成就**:")
            for i, a in enumerate(key_ach, 1):
                md.append(f"  {i}. {a}")
            md.append("")
        
        if ps.get("uk_vision"):
            md.append(f"**英国愿景**: {ps['uk_vision']}\n")
        if ps.get("conclusion"):
            md.append(f"**总结要点**: {ps['conclusion']}\n")
        
        # 证据清单
        evidence = framework.get("证据清单", [])
        if evidence:
            md.append("## 6. 证据清单\n")
            md.append("| 分类 | 标题 | 状态 | 优先级 |")
            md.append("|------|------|------|--------|")
            for ev in evidence:
                if isinstance(ev, dict):
                    cat = ev.get("category", "-")
                    title = ev.get("title", "-")[:40]
                    status = ev.get("status", "待准备")
                    priority = ev.get("priority", "中")
                    md.append(f"| {cat} | {title} | {status} | {priority} |")
            md.append("")
        
        # 申请策略
        strategy = framework.get("申请策略", {})
        if strategy:
            md.append("## 7. 申请策略\n")
            
            strength = strategy.get("overall_strength", "待评估")
            strength_icon = "🟢" if strength == "强" else ("🟡" if strength == "中" else "🔴")
            md.append(f"**整体强度**: {strength_icon} {strength}\n")
            
            if strategy.get("recommended_approach"):
                md.append(f"**建议策略**: {strategy['recommended_approach']}\n")
            
            risks = strategy.get("key_risks", [])
            if risks:
                md.append("**风险点**:")
                for r in risks:
                    md.append(f"  - ⚠️ {r}")
                md.append("")
            
            priorities = strategy.get("preparation_priorities", [])
            if priorities:
                md.append("**准备优先级**:")
                for i, p in enumerate(priorities, 1):
                    md.append(f"  {i}. {p}")
        
        return "\n".join(md)


# 测试
if __name__ == "__main__":
    agent = FrameworkBuildingAgent("copywriting.db")
    
    test_context = """
    [来源: 简历.pdf, 第1页]
    张三，高级软件工程师
    教育背景：清华大学计算机硕士
    工作经历：
    - 字节跳动 - 技术总监 (2020-至今)
      领导20人团队开发推荐系统
      系统日活用户超过1亿
    
    [来源: 专利证书.pdf]
    发明专利：一种基于深度学习的推荐系统优化方法
    获得时间：2023年
    """
    
    # 测试框架构建
    result = agent.build_framework("TEST001", test_context)
    if result.get("success"):
        print("=== 框架构建成功 ===")
        print(agent.export_markdown(result["data"]))
