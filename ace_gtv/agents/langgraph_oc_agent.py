#!/usr/bin/env python3
"""
LangGraph OC评估Agent - 基于知识库规则和LLM的真实OC评估
使用多轮LLM调用，根据知识库中的OC规则，对简历内容进行详细匹配和分析
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional, TypedDict
from datetime import datetime
import time

try:
    from langgraph.graph import StateGraph, START, END
    HAS_LANGGRAPH = True
except ImportError:
    HAS_LANGGRAPH = False
    logging.warning("⚠️ LangGraph not installed, using fallback mode")

try:
    from langchain_openai import ChatOpenAI
    from langchain.tools import tool
    HAS_LANGCHAIN = True
except ImportError:
    HAS_LANGCHAIN = False
    logging.warning("⚠️ LangChain not installed")

from langgraph_scoring_agent import KnowledgeBaseManager
from utils.logger_config import setup_module_logger, log_execution_time, log_step, log_oc_assessment_start, log_oc_assessment_complete, log_llm_call

# ============================================================================
# 日志配置
# ============================================================================

logger = setup_module_logger("oc_agent", os.getenv("LOG_LEVEL", "INFO"))

# ============================================================================
# 状态定义
# ============================================================================

class OCAssessmentState(TypedDict):
    """OC评估状态"""
    # 输入数据
    applicant_data: Dict[str, Any]  # 申请人基本信息
    resume_content: Dict[str, Any]  # 简历内容（从assessmentData提取）
    
    # 知识库状态
    oc_rules: List[Dict[str, Any]]  # 4个OC规则
    current_oc_index: int  # 当前评估的OC索引
    
    # 分析结果
    oc_assessments: List[Dict[str, Any]]  # 每个OC的评估结果
    current_assessment: Optional[Dict[str, Any]]  # 当前OC的详细分析
    
    # LLM交互
    conversation_history: List[Dict[str, str]]  # LLM交互历史
    llm_calls: List[Dict[str, Any]]  # LLM调用记录
    
    # 最终结果
    final_summary: Dict[str, Any]
    execution_time: float

# ============================================================================
# LangGraph OC评估Agent
# ============================================================================

class LangGraphOCAgent:
    """基于LangGraph的OC评估Agent"""
    
    def __init__(self, llm=None, kb_manager: Optional[KnowledgeBaseManager] = None):
        """初始化Agent"""
        self.llm = llm or self._init_llm()
        self.kb_manager = kb_manager or KnowledgeBaseManager(kb_dir="./public")
        self.tools = self._create_tools()
        
        if HAS_LANGGRAPH:
            self.graph = self._build_langgraph()
        else:
            logger.warning("⚠️ LangGraph 未安装，使用简化模式")
        
        logger.info("✅ LangGraph OC评估Agent初始化完成")
    
    def _init_llm(self):
        """初始化LLM"""
        if not HAS_LANGCHAIN:
            logger.warning("⚠️ LangChain未安装")
            return None
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("⚠️ OPENAI_API_KEY未设置")
            return None
        
        return ChatOpenAI(
            api_key=api_key,
            model="gpt-4-turbo-preview",
            temperature=0.3  # 降低温度以获得更一致的分析
        )
    
    def _create_tools(self) -> List:
        """创建LLM可用的工具"""
        tools = []
        
        if not HAS_LANGCHAIN:
            # 如果没有LangChain，返回空工具列表
            logger.warning("⚠️ LangChain未安装，工具功能不可用")
            return tools
        
        try:
            @tool
            def get_oc_rules() -> str:
                """获取所有OC规则（OC 1-4）"""
                # 从知识库中获取OC规则
                rules = self.kb_manager.search_rules(
                    category="Optional",
                    keywords=["OC", "可选要求", "创新", "行业贡献", "技术贡献", "学术研究"]
                )
                
                # 筛选出OC 1-4
                oc_rules = []
                for rule in rules:
                    title = rule.get("title", "").lower()
                    if any(f"oc {i}" in title or f"oc-{i}" in title for i in range(1, 5)):
                        oc_rules.append(rule)
                
                return json.dumps(oc_rules, ensure_ascii=False, indent=2)
            
            tools.append(get_oc_rules)
            
            @tool
            def get_specific_oc_rule(oc_number: int) -> str:
                """获取特定OC规则的详细内容"""
                rules = self.kb_manager.search_rules(
                    category="Optional",
                    keywords=[f"OC {oc_number}", f"OC-{oc_number}"]
                )
                if rules:
                    return json.dumps(rules[0], ensure_ascii=False, indent=2)
                return f"OC {oc_number} 规则未找到"
            
            tools.append(get_specific_oc_rule)
        except NameError as e:
            logger.warning(f"⚠️ 工具创建失败: {e}")
        
        return tools
    
    def _build_langgraph(self) -> StateGraph:
        """构建LangGraph工作流"""
        if not HAS_LANGGRAPH:
            logger.warning("⚠️ LangGraph不可用")
            return None
        
        graph = StateGraph(OCAssessmentState)
        
        # 定义节点
        graph.add_node("load_oc_rules", self._load_oc_rules_node)
        graph.add_node("extract_resume_evidence", self._extract_evidence_node)
        graph.add_node("assess_oc1", self._assess_oc_node)
        graph.add_node("assess_oc2", self._assess_oc_node)
        graph.add_node("assess_oc3", self._assess_oc_node)
        graph.add_node("assess_oc4", self._assess_oc_node)
        graph.add_node("generate_summary", self._generate_summary_node)
        
        # 定义边
        graph.add_edge(START, "load_oc_rules")
        graph.add_edge("load_oc_rules", "extract_resume_evidence")
        graph.add_edge("extract_resume_evidence", "assess_oc1")
        graph.add_edge("assess_oc1", "assess_oc2")
        graph.add_edge("assess_oc2", "assess_oc3")
        graph.add_edge("assess_oc3", "assess_oc4")
        graph.add_edge("assess_oc4", "generate_summary")
        graph.add_edge("generate_summary", END)
        
        return graph.compile()
    
    def _load_oc_rules_node(self, state: OCAssessmentState) -> OCAssessmentState:
        """加载OC规则节点"""
        logger.info("📚 开始加载OC规则...")
        
        # 从知识库获取OC规则
        all_rules = self.kb_manager.search_rules(
            category="Optional",
            keywords=["OC", "可选要求"]
        )
        
        # 筛选出OC 1-4并排序
        oc_rules = []
        for i in range(1, 5):
            for rule in all_rules:
                title = rule.get("title", "")
                if f"OC {i}" in title or f"OC-{i}" in title:
                    oc_rules.append(rule)
                    break
        
        state["oc_rules"] = oc_rules
        state["oc_assessments"] = []
        state["current_oc_index"] = 0
        
        logger.info(f"✅ 加载了 {len(oc_rules)} 个OC规则")
        return state
    
    def _extract_evidence_node(self, state: OCAssessmentState) -> OCAssessmentState:
        """提取简历证据节点"""
        logger.info("📄 提取简历证据...")
        
        resume_content = state.get("resume_content", {})
        
        # 结构化提取证据
        evidence = {
            "education": resume_content.get("educationBackground", {}).get("degrees", []),
            "experience": resume_content.get("workExperience", {}).get("positions", []),
            "projects": resume_content.get("workExperience", {}).get("projectImpact", []),
            "certifications": resume_content.get("technicalExpertise", {}).get("specializations", []),
            "skills": resume_content.get("technicalExpertise", {}).get("coreSkills", []),
            "achievements": [],
            "publications": [],
            "awards": [],
            "strengths": resume_content.get("strengths", []),
        }
        
        # 从strengths中提取更多信息
        for strength in resume_content.get("strengths", []):
            area = strength.get("area", "").lower()
            desc = strength.get("description", "")
            if "award" in area or "award" in desc.lower():
                evidence["awards"].append(desc)
            if "publication" in area or "paper" in desc.lower():
                evidence["publications"].append(desc)
            if "achievement" in area:
                evidence["achievements"].append(desc)
        
        state["resume_content"] = evidence
        logger.info(f"✅ 提取了 {sum(len(v) if isinstance(v, list) else 1 for v in evidence.values())} 条证据")
        
        return state
    
    def _assess_oc_node(self, state: OCAssessmentState) -> OCAssessmentState:
        """评估单个OC节点"""
        current_index = state.get("current_oc_index", 0)
        oc_rules = state.get("oc_rules", [])
        
        if current_index >= len(oc_rules):
            return state
        
        oc_rule = oc_rules[current_index]
        oc_number = current_index + 1
        
        logger.info(f"🔍 开始评估 OC {oc_number}: {oc_rule.get('title', '')}")
        
        # 使用LLM进行详细分析
        assessment = self._llm_assess_oc(oc_rule, state.get("resume_content", {}), state.get("applicant_data", {}), state, oc_number)
        
        state["current_assessment"] = assessment
        state["oc_assessments"].append(assessment)
        state["current_oc_index"] = current_index + 1
        
        logger.info(f"✅ OC {oc_number} 评估完成: {assessment.get('status', '未知')}")
        
        return state
    
    def _llm_assess_oc(self, oc_rule: Dict[str, Any], evidence: Dict[str, Any], applicant_data: Dict[str, Any], state: OCAssessmentState, oc_number: int = 1) -> Dict[str, Any]:
        """使用LLM评估单个OC"""
        llm_start = time.time()
        
        if not self.llm:
            # Fallback: 简单规则匹配
            logger.debug(f"🤖 OC {oc_number} 无 LLM 可用，使用规则匹配")
            return self._simple_oc_assessment(oc_rule, evidence, oc_number)
        
        # 构建prompt
        oc_title = oc_rule.get("title", "")
        oc_content = oc_rule.get("content", "")
        
        logger.debug(f"🤖 OC {oc_number} 构建 LLM prompt...")
        
        prompt = f"""你是一位GTV签证评估专家。请根据知识库中的OC规则，详细评估申请人是否满足该OC要求。

## OC规则信息
标题: {oc_title}

规则内容:
{oc_content[:2000]}  # 限制长度避免token过多

## 申请人简历证据
教育背景: {', '.join(evidence.get('education', []))}
工作经验: {', '.join(evidence.get('experience', []))}
项目经历: {', '.join(evidence.get('projects', []))}
认证证书: {', '.join(evidence.get('certifications', []))}
技能: {', '.join(evidence.get('skills', []))}
成就: {', '.join(evidence.get('achievements', []))}
奖项: {', '.join(evidence.get('awards', []))}
出版物: {', '.join(evidence.get('publications', []))}
优势: {json.dumps(evidence.get('strengths', []), ensure_ascii=False)[:500]}

## 评估任务
请详细分析：
1. 申请人的简历证据与OC规则的具体要求如何匹配？
2. 哪些证据明确支持满足该OC？
3. 哪些证据缺失或不足？
4. 匹配程度如何？（完全满足/部分满足/不满足）
5. 评分（0-100分）
6. 具体的改进建议

请以JSON格式返回，包含以下字段：
{{
  "ocId": "oc-{oc_number}",
  "title": "{oc_title}",
  "category": "{oc_rule.get('category', '')}",
  "status": "满足" | "部分满足" | "不满足",
  "score": 0-100,
  "maxScore": 100,
  "percentage": 0-1,
  "evidence": ["匹配的证据列表"],
  "reasoning": "详细的匹配分析，说明为什么是这个状态，具体哪些证据匹配了哪些要求",
  "improvement_suggestions": ["具体的改进建议"],
  "matched_keywords": ["匹配的关键词"],
  "llm_analysis": "LLM的详细分析过程"
}}
"""
        
        try:
            logger.debug(f"🤖 OC {oc_number} 调用 LLM API...")
            llm_call_start = time.time()
            response = self.llm.invoke(prompt)
            llm_response_time = time.time() - llm_call_start
            
            logger.debug(f"🤖 OC {oc_number} LLM 响应耗时: {llm_response_time:.2f}秒")
            log_llm_call(logger, "OpenAI", "gpt-4-turbo-preview", response_time=llm_response_time)
            
            content = response.content if hasattr(response, 'content') else str(response)
            logger.debug(f"🤖 OC {oc_number} LLM 响应长度: {len(content)} 字符")
            
            # 解析JSON响应
            parse_start = time.time()
            try:
                # 尝试提取JSON
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    assessment = json.loads(json_match.group())
                else:
                    assessment = json.loads(content)
                parse_time = time.time() - parse_start
                logger.debug(f"🤖 OC {oc_number} JSON 解析成功，耗时: {parse_time:.2f}秒")
            except Exception as parse_err:
                # 如果解析失败，使用简单评估
                parse_time = time.time() - parse_start
                logger.warning(f"⚠️ OC {oc_number} LLM 响应解析失败 (耗时: {parse_time:.2f}秒): {str(parse_err)[:100]}")
                logger.warning(f"⚠️ OC {oc_number} 响应内容预览: {content[:200]}")
                assessment = self._simple_oc_assessment(oc_rule, evidence, oc_number)
                assessment["llm_analysis"] = content[:500]
            
            # 确保必要字段存在
            assessment.setdefault("ocId", f"oc-{oc_number}")
            assessment.setdefault("title", oc_title)
            assessment.setdefault("category", oc_rule.get("category", "Optional"))
            assessment.setdefault("status", "不满足")
            assessment.setdefault("score", 0)
            assessment.setdefault("maxScore", 100)
            assessment.setdefault("percentage", 0.0)
            assessment.setdefault("evidence", [])
            assessment.setdefault("reasoning", "评估中...")
            assessment.setdefault("improvement_suggestions", [])
            assessment.setdefault("matched_keywords", [])
            
            total_llm_time = time.time() - llm_start
            logger.debug(f"✅ OC {oc_number} LLM 评估完成，总耗时: {total_llm_time:.2f}秒")
            
            return assessment
            
        except Exception as e:
            elapsed = time.time() - llm_start
            logger.error(f"❌ OC {oc_number} LLM 评估失败 (耗时: {elapsed:.2f}秒): {str(e)}")
            return self._simple_oc_assessment(oc_rule, evidence, oc_number)
    
    def _simple_oc_assessment(self, oc_rule: Dict[str, Any], evidence: Dict[str, Any], oc_number: int = 1) -> Dict[str, Any]:
        """简单规则匹配评估（fallback）"""
        oc_title = oc_rule.get("title", f"OC {oc_number}")
        category = oc_rule.get("category", "Optional")
        content = oc_rule.get("content", "").lower()
        
        # 简单关键词匹配
        status = "不满足"
        score = 0
        evidence_list = []
        reasoning = "未找到匹配的证据"
        
        # OC 1: 创新记录
        if "oc 1" in oc_title.lower() or "创新" in oc_title.lower():
            if evidence.get("projects") or evidence.get("achievements"):
                status = "部分满足"
                score = 60
                evidence_list = evidence.get("projects", [])[:3]
                reasoning = "发现项目经历，但需要更多财务和商业成功证明"
        
        # OC 2: 行业贡献
        elif "oc 2" in oc_title.lower() or "行业贡献" in oc_title.lower():
            if evidence.get("projects") or evidence.get("certifications"):
                status = "部分满足"
                score = 50
                evidence_list = evidence.get("certifications", [])[:2]
                reasoning = "发现认证和技能，但需要开源贡献或会议演讲证明"
        
        # OC 3: 技术贡献
        elif "oc 3" in oc_title.lower() or "技术贡献" in oc_title.lower():
            if evidence.get("skills") or evidence.get("projects"):
                status = "部分满足"
                score = 55
                evidence_list = evidence.get("skills", [])[:3]
                reasoning = "发现技术技能，但需要GitHub贡献或技术架构证明"
        
        # OC 4: 学术研究
        elif "oc 4" in oc_title.lower() or "学术研究" in oc_title.lower():
            if evidence.get("publications") or evidence.get("education"):
                status = "部分满足"
                score = 40
                evidence_list = evidence.get("publications", [])[:2]
                reasoning = "发现教育背景，但需要顶级期刊论文或研究资助证明"
        
        return {
            "ocId": f"oc-{oc_number}",
            "title": oc_title,
            "category": category,
            "status": status,
            "score": score,
            "maxScore": 100,
            "percentage": score / 100.0,
            "evidence": evidence_list,
            "reasoning": reasoning,
            "improvement_suggestions": ["获取更多相关证据以满足OC要求"],
            "matched_keywords": [],
            "llm_analysis": "使用简单规则匹配（LLM不可用）"
        }
    
    def _generate_summary_node(self, state: OCAssessmentState) -> OCAssessmentState:
        """生成汇总节点"""
        logger.info("📊 生成OC评估汇总...")
        
        oc_assessments = state.get("oc_assessments", [])
        
        satisfied = sum(1 for a in oc_assessments if a.get("status") == "满足")
        partially_satisfied = sum(1 for a in oc_assessments if a.get("status") == "部分满足")
        unsatisfied = sum(1 for a in oc_assessments if a.get("status") == "不满足")
        
        total_score = sum(a.get("score", 0) for a in oc_assessments)
        average_score = total_score / len(oc_assessments) if oc_assessments else 0
        
        fulfillment_rate = round((satisfied / len(oc_assessments) * 100)) if oc_assessments else 0
        
        # 生成建议
        if self.llm:
            recommendation = self._generate_llm_recommendation(oc_assessments)
        else:
            recommendation = f"申请人满足 {satisfied} 个OC，部分满足 {partially_satisfied} 个OC。建议根据缺失的证据类型进行补充。"
        
        state["final_summary"] = {
            "total": len(oc_assessments),
            "satisfied": satisfied,
            "partially_satisfied": partially_satisfied,
            "unsatisfied": unsatisfied,
            "average_score": round(average_score),
            "fulfillment_rate": f"{fulfillment_rate}%",
            "recommendation": recommendation
        }
        
        logger.info(f"✅ 汇总完成: {satisfied}满足, {partially_satisfied}部分满足, {unsatisfied}不满足")
        
        return state
    
    def _generate_llm_recommendation(self, oc_assessments: List[Dict[str, Any]]) -> str:
        """使用LLM生成建议"""
        if not self.llm:
            return "建议根据评估结果补充相关证据。"
        
        prompt = f"""根据以下OC评估结果，生成一份针对性的改进建议：

{json.dumps(oc_assessments, ensure_ascii=False, indent=2)}

请生成一段中文建议，说明：
1. 整体OC满足情况
2. 哪些OC需要重点关注
3. 具体的改进方向

控制在100字以内。"""
        
        try:
            response = self.llm.invoke(prompt)
            return response.content if hasattr(response, 'content') else str(response)
        except:
            return "建议根据评估结果补充相关证据。"
    
    def assess(self, applicant_data: Dict[str, Any], assessment_data: Dict[str, Any]) -> Dict[str, Any]:
        """执行完整的OC评估"""
        start_time = datetime.now()
        overall_start = time.time()
        request_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
        
        log_oc_assessment_start(logger, request_id, applicant_data.get('name', 'N/A'), 4)
        logger.info(f"[{request_id}] 申请人字段: {applicant_data.get('field', 'N/A')}")
        logger.info(f"[{request_id}] 评估数据键: {list(assessment_data.keys())}")
        
        # 初始化状态
        initial_state: OCAssessmentState = {
            "applicant_data": applicant_data,
            "resume_content": assessment_data,
            "oc_rules": [],
            "current_oc_index": 0,
            "oc_assessments": [],
            "current_assessment": None,
            "conversation_history": [],
            "llm_calls": [],
            "final_summary": {},
            "execution_time": 0.0
        }
        
        try:
            # 加载 OC 规则
            logger.debug(f"[{request_id}] 开始加载 OC 规则...")
            load_rules_start = time.time()
            if HAS_LANGGRAPH and self.graph:
                # 使用LangGraph执行
                logger.info(f"[{request_id}] 使用 LangGraph 模式执行 OC 评估")
                final_state = self.graph.invoke(initial_state)
            else:
                # 简化模式：直接执行节点
                logger.warning(f"[{request_id}] ⚠️ 使用简化模式执行OC评估 (LangGraph={HAS_LANGGRAPH})")
                final_state = initial_state
                
                # 加载规则
                logger.debug(f"[{request_id}] 执行 _load_oc_rules_node...")
                final_state = self._load_oc_rules_node(final_state)
                load_rules_time = time.time() - load_rules_start
                logger.info(f"[{request_id}] ✅ 加载 OC 规则完成，耗时: {load_rules_time:.2f}秒")
                
                # 提取证据
                logger.debug(f"[{request_id}] 执行 _extract_evidence_node...")
                extract_start = time.time()
                final_state = self._extract_evidence_node(final_state)
                extract_time = time.time() - extract_start
                logger.info(f"[{request_id}] ✅ 提取证据完成，耗时: {extract_time:.2f}秒")
                
                # 评估4个OC
                oc_rules_count = len(final_state.get("oc_rules", []))
                logger.info(f"[{request_id}] 开始评估 {oc_rules_count} 个 OC...")
                
                for i in range(oc_rules_count):
                    oc_start = time.time()
                    log_step(logger, i + 1, oc_rules_count, f"评估 OC {i + 1}")
                    
                    final_state["current_oc_index"] = i
                    logger.debug(f"[{request_id}] 开始评估 OC {i + 1}...")
                    
                    final_state = self._assess_oc_node(final_state)
                    
                    oc_time = time.time() - oc_start
                    assessment = final_state.get("oc_assessments", [{}])[-1] if final_state.get("oc_assessments") else {}
                    status = assessment.get("status", "未知")
                    score = assessment.get("score", 0)
                    log_step(logger, i + 1, oc_rules_count, f"OC {i + 1} 完成 | 状态: {status} | 评分: {score} | 耗时: {oc_time:.2f}秒", "success")
                
                # 生成总结
                logger.debug(f"[{request_id}] 执行 _generate_summary_node...")
                summary_start = time.time()
                final_state = self._generate_summary_node(final_state)
                summary_time = time.time() - summary_start
                logger.info(f"[{request_id}] ✅ 生成总结完成，耗时: {summary_time:.2f}秒")
            
            execution_time = (datetime.now() - start_time).total_seconds()
            overall_time = time.time() - overall_start
            final_state["execution_time"] = execution_time
            
            oc_results = final_state.get("oc_assessments", [])
            llm_calls = final_state.get("llm_calls", [])
            
            log_oc_assessment_complete(
                logger, 
                request_id, 
                overall_time, 
                len(oc_results),
                errors=0
            )
            
            logger.info(f"[{request_id}] 📊 评估统计:")
            logger.info(f"[{request_id}]   - 总耗时: {overall_time:.2f}秒")
            logger.info(f"[{request_id}]   - OC 结果数: {len(oc_results)}")
            logger.info(f"[{request_id}]   - LLM 调用数: {len(llm_calls)}")
            
            # 统计状态
            status_counts = {}
            for result in oc_results:
                status = result.get("status", "未知")
                status_counts[status] = status_counts.get(status, 0) + 1
            logger.info(f"[{request_id}]   - 状态分布: {status_counts}")
            
            return {
                "success": True,
                "oc_results": oc_results,
                "summary": final_state.get("final_summary", {}),
                "execution_time": overall_time,
                "llm_calls": len(llm_calls),
                "request_id": request_id
            }
            
        except Exception as e:
            elapsed = time.time() - overall_start
            logger.error(f"[{request_id}] ❌ OC评估失败: {str(e)}", exc_info=True)
            logger.error(f"[{request_id}] 错误发生时已耗时: {elapsed:.2f}秒")
            return {
                "success": False,
                "error": str(e),
                "oc_results": [],
                "summary": {},
                "request_id": request_id
            }

