#!/usr/bin/env python3
"""
GTV LangGraph 评分Agent - 知识库驱动的多轮分析
支持：
1. 知识库加载和管理
2. 多轮LLM调用进行深度分析
3. 基于知识库的实时更新
4. 详细的评分推理过程记录
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional, TypedDict
from datetime import datetime
from enum import Enum

try:
    from langgraph.graph import StateGraph, START, END
    from langgraph.prebuilt import create_react_agent
    HAS_LANGGRAPH = True
except ImportError:
    HAS_LANGGRAPH = False
    logging.warning("⚠️ LangGraph not installed, using fallback mode")

try:
    from langchain_openai import ChatOpenAI
    from langchain.tools import tool, StructuredTool
    HAS_LANGCHAIN = True
except ImportError:
    HAS_LANGCHAIN = False
    logging.warning("⚠️ LangChain not installed")

# ============================================================================
# 日志配置
# ============================================================================

from utils.logger_config import setup_module_logger

logger = setup_module_logger("scoring_agent", os.getenv("LOG_LEVEL", "INFO"))

# ============================================================================
# 状态定义
# ============================================================================

class KnowledgeBaseState(TypedDict):
    """知识库状态"""
    rules: Dict[str, Any]  # 所有知识库规则
    rule_index: Dict[str, List[str]]  # 规则索引（按维度和分类）

class ScoringAgentState(TypedDict):
    """评分Agent状态"""
    # 基本信息
    applicant_data: Dict[str, Any]
    current_score: float
    evaluation_stage: str  # current_stage
    
    # 知识库状态
    knowledge_base: KnowledgeBaseState
    relevant_rules: List[Dict[str, Any]]
    
    # 多轮交互
    conversation_history: List[Dict[str, str]]  # LLM交互历史
    llm_calls: List[Dict[str, Any]]  # LLM调用记录
    
    # 分析结果
    criteria_analysis: Dict[str, Any]  # 标准分析结果
    evidence_assessment: Dict[str, Any]  # 证据评估
    recommendations: List[str]  # 改进建议
    
    # 最终报告
    final_score: float
    final_reasoning: str
    execution_time: float

# ============================================================================
# 知识库管理器
# ============================================================================

class KnowledgeBaseManager:
    """知识库管理器 - 加载和管理GTV评估规则"""
    
    def __init__(self, kb_dir: str = "./public"):
        """初始化知识库管理器"""
        self.kb_dir = kb_dir
        self.rules = {}
        self.rule_index = {}
        self._load_all_rules()
    
    def _load_all_rules(self):
        """加载所有知识库文件"""
        kb_files = [
            "kb-gtv-assessment-rules.json",
            "kb-checklist-rules.json",
            "kb-checklist-detailed-rules.json",
            "kb-actual-scoring-items.json",
            "kb-init-rules.json"
        ]
        
        for filename in kb_files:
            filepath = os.path.join(self.kb_dir, filename)
            if os.path.exists(filepath):
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        rules = json.load(f)
                        if isinstance(rules, list):
                            for rule in rules:
                                rule_id = rule.get('id', rule.get('title', f'rule_{len(self.rules)}'))
                                self.rules[rule_id] = rule
                                self._index_rule(rule)
                    logger.info(f"✅ 加载知识库文件: {filename} ({len(rules)} 条规则)")
                except Exception as e:
                    logger.error(f"❌ 加载 {filename} 失败: {e}")
        
        logger.info(f"📚 知识库加载完成，总共 {len(self.rules)} 条规则")
    
    def _index_rule(self, rule: Dict[str, Any]):
        """为规则创建索引"""
        dimension = rule.get('dimension', 'general')
        category = rule.get('category', 'general')
        
        # 按维度索引
        if dimension not in self.rule_index:
            self.rule_index[dimension] = []
        rule_id = rule.get('id', rule.get('title'))
        if rule_id not in self.rule_index[dimension]:
            self.rule_index[dimension].append(rule_id)
        
        # 按分类索引
        if category not in self.rule_index:
            self.rule_index[category] = []
        if rule_id not in self.rule_index[category]:
            self.rule_index[category].append(rule_id)
    
    def search_rules(self, dimension: Optional[str] = None, 
                    category: Optional[str] = None,
                    keywords: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """搜索相关规则"""
        result = []
        
        for rule_id, rule in self.rules.items():
            # 维度匹配
            if dimension and rule.get('dimension') != dimension:
                continue
            
            # 分类匹配
            if category and rule.get('category') != category:
                continue
            
            # 关键词匹配
            if keywords:
                rule_text = f"{rule.get('title', '')} {rule.get('content', '')}".lower()
                if not any(kw.lower() in rule_text for kw in keywords):
                    continue
            
            result.append(rule)
        
        return result
    
    def get_state(self) -> KnowledgeBaseState:
        """获取知识库状态"""
        return {
            "rules": self.rules,
            "rule_index": self.rule_index
        }

# ============================================================================
# LangGraph 评分Agent
# ============================================================================

class LangGraphScoringAgent:
    """基于LangGraph的多轮交互评分Agent"""
    
    def __init__(self, llm=None, kb_manager: Optional[KnowledgeBaseManager] = None):
        """初始化Agent"""
        self.llm = llm or self._init_llm()
        self.kb_manager = kb_manager or KnowledgeBaseManager()
        self.tools = self._create_tools()
        
        if HAS_LANGGRAPH:
            self.graph = self._build_langgraph()
        else:
            logger.warning("⚠️ LangGraph 未安装，使用简化模式")
        
        logger.info("✅ LangGraph评分Agent初始化完成")
    
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
            temperature=0.7
        )
    
    def _create_tools(self) -> List:
        """创建LLM可用的工具"""
        tools = []
        
        # 工具1: 搜索知识库规则
        @tool
        def search_knowledge_base(dimension: str = None, 
                                  category: str = None,
                                  keywords: List[str] = None) -> str:
            """搜索知识库中的相关规则"""
            rules = self.kb_manager.search_rules(dimension, category, keywords)
            return json.dumps([
                {
                    "title": r.get("title"),
                    "content": r.get("content"),
                    "dimension": r.get("dimension"),
                    "category": r.get("category")
                } for r in rules
            ], ensure_ascii=False, indent=2)
        
        tools.append(search_knowledge_base)
        
        # 工具2: 获取完整规则内容
        @tool
        def get_rule_details(rule_id: str) -> str:
            """获取具体规则的详细内容"""
            rule = self.kb_manager.rules.get(rule_id)
            if rule:
                return json.dumps(rule, ensure_ascii=False, indent=2)
            return f"规则 {rule_id} 不存在"
        
        tools.append(get_rule_details)
        
        # 工具3: 获取维度相关的所有规则
        @tool
        def get_dimension_rules(dimension: str) -> str:
            """获取特定维度的所有规则"""
            rule_ids = self.kb_manager.rule_index.get(dimension, [])
            rules = [self.kb_manager.rules[rid] for rid in rule_ids if rid in self.kb_manager.rules]
            return json.dumps({
                "dimension": dimension,
                "rule_count": len(rules),
                "rules": [
                    {
                        "title": r.get("title"),
                        "category": r.get("category"),
                        "summary": r.get("content", "")[:200] + "..."
                    } for r in rules
                ]
            }, ensure_ascii=False, indent=2)
        
        tools.append(get_dimension_rules)
        
        return tools
    
    def _build_langgraph(self) -> StateGraph:
        """构建LangGraph工作流"""
        if not HAS_LANGGRAPH:
            logger.warning("⚠️ LangGraph不可用")
            return None
        
        graph = StateGraph(ScoringAgentState)
        
        # 定义节点
        graph.add_node("load_kb", self._load_kb_node)
        graph.add_node("search_relevant_rules", self._search_rules_node)
        graph.add_node("analyze_criteria", self._analyze_criteria_node)
        graph.add_node("assess_evidence", self._assess_evidence_node)
        graph.add_node("refine_analysis", self._refine_analysis_node)
        graph.add_node("generate_recommendations", self._generate_recommendations_node)
        graph.add_node("calculate_final_score", self._calculate_score_node)
        
        # 定义边
        graph.add_edge(START, "load_kb")
        graph.add_edge("load_kb", "search_relevant_rules")
        graph.add_edge("search_relevant_rules", "analyze_criteria")
        graph.add_edge("analyze_criteria", "assess_evidence")
        graph.add_edge("assess_evidence", "refine_analysis")
        graph.add_edge("refine_analysis", "generate_recommendations")
        graph.add_edge("generate_recommendations", "calculate_final_score")
        graph.add_edge("calculate_final_score", END)
        
        return graph.compile()
    
    def _load_kb_node(self, state: ScoringAgentState) -> ScoringAgentState:
        """加载知识库节点"""
        logger.info("📚 开始加载知识库...")
        state["knowledge_base"] = self.kb_manager.get_state()
        state["evaluation_stage"] = "knowledge_loading"
        return state
    
    def _search_rules_node(self, state: ScoringAgentState) -> ScoringAgentState:
        """搜索相关规则节点"""
        logger.info("🔍 搜索相关规则...")
        
        # 根据申请人数据搜索相关规则
        applicant_data = state.get("applicant_data", {})
        keywords = []
        
        # 提取关键词
        if applicant_data.get("field"):
            keywords.append(applicant_data["field"])
        if applicant_data.get("position"):
            keywords.append(applicant_data["position"])
        
        # 搜索规则
        relevant_rules = self.kb_manager.search_rules(
            keywords=keywords if keywords else None
        )
        
        state["relevant_rules"] = relevant_rules
        state["evaluation_stage"] = "rules_search"
        
        logger.info(f"✅ 找到 {len(relevant_rules)} 条相关规则")
        
        return state
    
    def _analyze_criteria_node(self, state: ScoringAgentState) -> ScoringAgentState:
        """分析标准节点 - 第一轮LLM调用"""
        logger.info("📋 第一轮分析：标准评估...")
        
        if not self.llm:
            logger.warning("⚠️ LLM不可用，跳过此阶段")
            return state
        
        # 构建提示
        relevant_rules_text = self._format_rules_for_llm(state["relevant_rules"])
        applicant_text = json.dumps(state.get("applicant_data", {}), ensure_ascii=False, indent=2)
        
        prompt = f"""
您是GTV（英国全球人才签证）评估专家。
根据以下知识库规则和申请人信息，进行标准符合性分析。

【知识库规则】
{relevant_rules_text}

【申请人信息】
{applicant_text}

请进行以下分析：
1. 申请人是否满足强制要求(MC)？具体理由是什么？
2. 申请人可能满足哪些可选要求(OC)？为什么？
3. 在这些标准中，申请人最强的方面是什么？

请用JSON格式返回分析结果：
{{
  "mc_status": "满足/不满足",
  "mc_reasoning": "具体理由",
  "potential_oc": ["OC1", "OC2", ...],
  "oc_reasoning": {{"OC1": "理由", ...}},
  "strengths": ["优势1", "优势2", ...],
  "confidence": 0.0-1.0
}}
"""
        
        try:
            response = self.llm.invoke(prompt)
            criteria_analysis = json.loads(response.content)
            state["criteria_analysis"] = criteria_analysis
            
            # 记录LLM调用
            state["llm_calls"].append({
                "stage": "analyze_criteria",
                "timestamp": datetime.now().isoformat(),
                "prompt_length": len(prompt),
                "response_length": len(response.content)
            })
            
            # 记录对话历史
            state["conversation_history"].append({
                "role": "assistant",
                "content": f"完成标准分析: {criteria_analysis.get('mc_status', 'N/A')}"
            })
            
            logger.info(f"✅ 标准分析完成")
        except Exception as e:
            logger.error(f"❌ 标准分析失败: {e}")
            state["criteria_analysis"] = {"error": str(e)}
        
        state["evaluation_stage"] = "criteria_analysis"
        return state
    
    def _assess_evidence_node(self, state: ScoringAgentState) -> ScoringAgentState:
        """评估证据节点 - 第二轮LLM调用"""
        logger.info("📝 第二轮分析：证据评估...")
        
        if not self.llm:
            return state
        
        # 获取之前的分析结果
        criteria = state.get("criteria_analysis", {})
        applicant_data = state.get("applicant_data", {})
        
        # 搜索相关证据要求
        evidence_rules = self.kb_manager.search_rules(
            keywords=["证据", "证明", "文件"]
        )
        
        evidence_text = self._format_rules_for_llm(evidence_rules)
        
        prompt = f"""
基于之前的分析结果，现在需要评估申请人的证据充分性。

【之前的分析结果】
{json.dumps(criteria, ensure_ascii=False, indent=2)}

【证据要求规则】
{evidence_text}

【申请人提交的证据】
{json.dumps(applicant_data.get('evidence', {}), ensure_ascii=False, indent=2)}

请进行以下评估：
1. 申请人提交的证据是否充分？
2. 缺少哪些关键证据？
3. 现有证据的质量如何？
4. 建议如何补充或改进证据？

请用JSON格式返回：
{{
  "evidence_completeness": 0.0-1.0,
  "provided_evidence": {{"证据类型": "质量评分(1-5)"}},
  "missing_evidence": ["缺失1", "缺失2", ...],
  "quality_assessment": {{"证据": "评价"}},
  "improvement_suggestions": ["建议1", "建议2", ...]
}}
"""
        
        try:
            response = self.llm.invoke(prompt)
            evidence_assessment = json.loads(response.content)
            state["evidence_assessment"] = evidence_assessment
            
            # 记录LLM调用
            state["llm_calls"].append({
                "stage": "assess_evidence",
                "timestamp": datetime.now().isoformat(),
                "prompt_length": len(prompt),
                "response_length": len(response.content)
            })
            
            state["conversation_history"].append({
                "role": "assistant",
                "content": f"证据评估完成: 完整性 {evidence_assessment.get('evidence_completeness', 0):.1%}"
            })
            
            logger.info(f"✅ 证据评估完成")
        except Exception as e:
            logger.error(f"❌ 证据评估失败: {e}")
            state["evidence_assessment"] = {"error": str(e)}
        
        state["evaluation_stage"] = "evidence_assessment"
        return state
    
    def _refine_analysis_node(self, state: ScoringAgentState) -> ScoringAgentState:
        """精细化分析节点 - 第三轮LLM调用"""
        logger.info("🔬 第三轮分析：精细化评估...")
        
        if not self.llm or not state.get("criteria_analysis") or not state.get("evidence_assessment"):
            return state
        
        # 综合前两轮的分析
        combined_analysis = {
            "criteria": state["criteria_analysis"],
            "evidence": state["evidence_assessment"]
        }
        
        relevant_rules_text = self._format_rules_for_llm(state["relevant_rules"])
        
        prompt = f"""
基于前两轮的分析，现在需要进行精细化评估。

【相关规则】
{relevant_rules_text}

【之前的分析结果】
{json.dumps(combined_analysis, ensure_ascii=False, indent=2)}

请进行精细化分析：
1. 综合标准符合性和证据充分性，申请人的整体资格如何？
2. 在评估过程中发现了哪些关键问题或潜在风险？
3. 申请人与GTV标准的契合度是多少？
4. 是否有需要进一步澄清的方面？

请用JSON格式返回：
{{
  "overall_assessment": "强/中等/弱",
  "key_issues": ["问题1", "问题2", ...],
  "alignment_score": 0.0-1.0,
  "risk_factors": ["风险1", "风险2", ...],
  "clarification_needed": ["需澄清1", "需澄清2", ...],
  "analysis_confidence": 0.0-1.0
}}
"""
        
        try:
            response = self.llm.invoke(prompt)
            refined_analysis = json.loads(response.content)
            
            # 合并到evidence_assessment中
            state["evidence_assessment"]["refined_analysis"] = refined_analysis
            
            # 记录LLM调用
            state["llm_calls"].append({
                "stage": "refine_analysis",
                "timestamp": datetime.now().isoformat(),
                "prompt_length": len(prompt),
                "response_length": len(response.content)
            })
            
            state["conversation_history"].append({
                "role": "assistant",
                "content": f"精细化分析完成: 整体评估 {refined_analysis.get('overall_assessment', 'N/A')}"
            })
            
            logger.info(f"✅ 精细化分析完成")
        except Exception as e:
            logger.error(f"❌ 精细化分析失败: {e}")
        
        state["evaluation_stage"] = "refine_analysis"
        return state
    
    def _generate_recommendations_node(self, state: ScoringAgentState) -> ScoringAgentState:
        """生成建议节点 - 第四轮LLM调用"""
        logger.info("💡 第四轮分析：生成改进建议...")
        
        if not self.llm:
            return state
        
        # 基于所有之前的分析生成建议
        all_analysis = {
            "criteria": state.get("criteria_analysis", {}),
            "evidence": state.get("evidence_assessment", {})
        }
        
        relevant_rules_text = self._format_rules_for_llm(state["relevant_rules"])
        
        prompt = f"""
基于完整的分析过程，现在需要为申请人生成具体的改进建议。

【相关规则】
{relevant_rules_text}

【完整分析结果】
{json.dumps(all_analysis, ensure_ascii=False, indent=2)}

请生成具体的、可执行的改进建议：
1. 立即可采取的行动（短期）
2. 需要长期投入的改进方向（长期）
3. 如何更好地展示现有优势
4. 哪些领域的改进会最大化成功概率

请用JSON格式返回：
{{
  "immediate_actions": [
    {{
      "action": "具体行动",
      "impact": "预期影响",
      "priority": "高/中/低",
      "timeline": "实施时间"
    }},
    ...
  ],
  "long_term_improvements": [
    {{
      "area": "改进领域",
      "goal": "目标",
      "estimated_timeline": "预计周期"
    }},
    ...
  ],
  "leverage_existing_strengths": ["如何展示优势1", ...],
  "success_probability_impact": {{
    "improvement": "改进",
    "estimated_probability_increase": "0.0-1.0"
  }}
}}
"""
        
        try:
            response = self.llm.invoke(prompt)
            recommendations_data = json.loads(response.content)
            
            # 提取建议列表
            state["recommendations"] = [
                r["action"] for r in recommendations_data.get("immediate_actions", [])
            ]
            state["recommendations"].extend([
                r["area"] for r in recommendations_data.get("long_term_improvements", [])
            ])
            
            # 记录LLM调用
            state["llm_calls"].append({
                "stage": "generate_recommendations",
                "timestamp": datetime.now().isoformat(),
                "prompt_length": len(prompt),
                "response_length": len(response.content)
            })
            
            state["conversation_history"].append({
                "role": "assistant",
                "content": f"生成了 {len(state['recommendations'])} 条建议"
            })
            
            logger.info(f"✅ 改进建议生成完成: {len(state['recommendations'])} 条建议")
        except Exception as e:
            logger.error(f"❌ 生成建议失败: {e}")
            state["recommendations"] = []
        
        state["evaluation_stage"] = "recommendations"
        return state
    
    def _calculate_score_node(self, state: ScoringAgentState) -> ScoringAgentState:
        """计算最终分数节点"""
        logger.info("🎯 计算最终分数...")
        
        # 基于多轮分析计算最终分数
        criteria = state.get("criteria_analysis", {})
        evidence = state.get("evidence_assessment", {})
        
        # 分数计算逻辑
        mc_score = 50 if criteria.get("mc_status") == "满足" else 0
        oc_count = len(criteria.get("potential_oc", []))
        oc_score = min(50, oc_count * 10)
        evidence_score = evidence.get("evidence_completeness", 0) * 50 if evidence else 0
        
        final_score = (mc_score + oc_score + evidence_score) / 150 * 100
        
        state["final_score"] = final_score
        state["final_reasoning"] = f"""
最终评分: {final_score:.1f}/100

评分构成:
- 强制要求符合性: {mc_score}/50 ({criteria.get('mc_status', 'N/A')})
- 可选要求覆盖: {oc_score}/50 (满足{oc_count}个)
- 证据充分性: {evidence_score:.0f}/50 ({evidence.get('evidence_completeness', 0):.1%})

关键发现:
- 优势: {', '.join(criteria.get('strengths', []))}
- 缺陷: {', '.join(evidence.get('missing_evidence', []))}
- 建议: {len(state.get('recommendations', []))}条改进建议

下一步: {state.get('recommendations', ['无'])[0] if state.get('recommendations') else '无'}
"""
        
        state["evaluation_stage"] = "completed"
        
        logger.info(f"✅ 最终评分: {final_score:.1f}/100")
        
        return state
    
    def _format_rules_for_llm(self, rules: List[Dict[str, Any]]) -> str:
        """格式化规则供LLM使用"""
        if not rules:
            return "（无相关规则）"
        
        formatted = []
        for i, rule in enumerate(rules[:5], 1):  # 限制为5条规则，避免超长prompt
            formatted.append(f"""
规则{i}: {rule.get('title', 'N/A')}
分类: {rule.get('category', 'N/A')} | 维度: {rule.get('dimension', 'N/A')}
内容摘要: {rule.get('content', '')[:300]}...
""")
        
        return "\n".join(formatted)
    
    def analyze(self, applicant_data: Dict[str, Any]) -> Dict[str, Any]:
        """执行完整的多轮分析"""
        logger.info("=" * 80)
        logger.info("🚀 开始GTV评分分析流程（LangGraph）")
        logger.info("=" * 80)
        
        start_time = datetime.now()
        
        # 初始化状态
        initial_state: ScoringAgentState = {
            "applicant_data": applicant_data,
            "current_score": 0.0,
            "evaluation_stage": "initialized",
            "knowledge_base": {"rules": {}, "rule_index": {}},
            "relevant_rules": [],
            "conversation_history": [],
            "llm_calls": [],
            "criteria_analysis": {},
            "evidence_assessment": {},
            "recommendations": [],
            "final_score": 0.0,
            "final_reasoning": "",
            "execution_time": 0.0
        }
        
        try:
            if HAS_LANGGRAPH and self.graph:
                # 使用LangGraph执行
                logger.info("使用LangGraph执行流程...")
                final_state = self.graph.invoke(initial_state)
            else:
                # 回退：按顺序执行节点
                logger.info("使用顺序执行模式...")
                final_state = initial_state
                final_state = self._load_kb_node(final_state)
                final_state = self._search_rules_node(final_state)
                final_state = self._analyze_criteria_node(final_state)
                final_state = self._assess_evidence_node(final_state)
                final_state = self._refine_analysis_node(final_state)
                final_state = self._generate_recommendations_node(final_state)
                final_state = self._calculate_score_node(final_state)
        except Exception as e:
            logger.error(f"❌ 分析过程出错: {e}")
            final_state = initial_state
            final_state["final_reasoning"] = f"分析失败: {str(e)}"
        
        # 计算执行时间
        execution_time = (datetime.now() - start_time).total_seconds()
        final_state["execution_time"] = execution_time
        
        logger.info("=" * 80)
        logger.info(f"✅ 分析完成，执行时间: {execution_time:.2f}秒")
        logger.info(f"最终评分: {final_state['final_score']:.1f}/100")
        logger.info(f"LLM调用次数: {len(final_state['llm_calls'])}")
        logger.info("=" * 80)
        
        return {
            "score": final_state["final_score"],
            "reasoning": final_state["final_reasoning"],
            "criteria_analysis": final_state.get("criteria_analysis", {}),
            "evidence_assessment": final_state.get("evidence_assessment", {}),
            "recommendations": final_state.get("recommendations", []),
            "llm_interactions": len(final_state["llm_calls"]),
            "execution_time": execution_time,
            "conversation_history": final_state["conversation_history"]
        }

# ============================================================================
# 主函数
# ============================================================================

if __name__ == "__main__":
    # 示例申请人数据
    applicant = {
        "name": "张三",
        "field": "数字技术",
        "position": "首席技术官",
        "experience_years": 10,
        "evidence": {
            "推荐信": 3,
            "媒体报道": 5,
            "专利": 2,
            "学术论文": 4
        }
    }
    
    # 创建Agent并执行分析
    agent = LangGraphScoringAgent()
    result = agent.analyze(applicant)
    
    # 输出结果
    print("\n" + "=" * 80)
    print("分析结果")
    print("=" * 80)
    print(json.dumps(result, ensure_ascii=False, indent=2))

