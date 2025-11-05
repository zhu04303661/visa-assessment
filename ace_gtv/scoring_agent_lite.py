#!/usr/bin/env python3
"""
GTV评分Agent - 统一版本
结合LangGraph的结构化方式和轻量级实现的简洁性
支持分阶段LLM调用：官方要求分析 → 偏差分析 → 结果整合
"""

import json
import logging
import os
import time
from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum

try:
    from langchain_openai import ChatOpenAI
    HAS_LANGCHAIN = True
except ImportError:
    HAS_LANGCHAIN = False
    logging.warning("⚠️ LangChain not properly installed, using mock mode")

# ============================================================================
# 日志配置
# ============================================================================

logger = logging.getLogger(__name__)

class ScoringAgentLogger:
    """评分Agent日志记录器"""
    
    @staticmethod
    def setup_logger(name: str = __name__, level: str = "INFO") -> logging.Logger:
        """设置日志记录器"""
        logger = logging.getLogger(name)
        logger.setLevel(getattr(logging, level.upper(), logging.INFO))
        
        # 如果已经有处理器，就不再添加
        if logger.handlers:
            return logger
        
        # 控制台处理器
        console_handler = logging.StreamHandler()
        console_handler.setLevel(getattr(logging, level.upper(), logging.INFO))
        
        # 日志格式
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        return logger

# 初始化日志
log_level = os.getenv('LOG_LEVEL', 'INFO')
logger = ScoringAgentLogger.setup_logger(__name__, log_level)

# ============================================================================
# 数据结构定义
# ============================================================================

class AnalysisPhase(Enum):
    """分析阶段"""
    OFFICIAL_REQUIREMENT = "官方要求分析"
    DEVIATION_ANALYSIS = "偏差分析"
    FINALIZE = "结果整合"

class OfficialRequirement:
    """官方要求数据"""
    def __init__(self, data: Dict[str, Any]):
        self.level = data.get("level", "推荐标准")
        self.description = data.get("description", "")
        self.examples = data.get("examples", [])
        self.gtv_official_basis = data.get("gtv_official_basis", "")
        self.reasoning = data.get("reasoning", "")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "level": self.level,
            "description": self.description,
            "examples": self.examples,
            "gtv_official_basis": self.gtv_official_basis,
            "reasoning": self.reasoning,
        }

class DeviationAnalysis:
    """偏差分析数据"""
    def __init__(self, data: Dict[str, Any]):
        self.gap = data.get("gap", 0)
        self.type = data.get("type", "meet")
        self.distance = data.get("distance", "")
        self.industry_context = data.get("industry_context", "")
        self.gtv_rules_alignment = data.get("gtv_rules_alignment", "")
        self.user_specific_analysis = data.get("user_specific_analysis", "")
        self.improvement_steps = data.get("improvement_steps", [])
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "gap": self.gap,
            "type": self.type,
            "distance": self.distance,
            "industry_context": self.industry_context,
            "gtv_rules_alignment": self.gtv_rules_alignment,
            "user_specific_analysis": self.user_specific_analysis,
            "improvement_steps": self.improvement_steps,
        }

class ScoringResult:
    """评分结果"""
    def __init__(self):
        self.official_requirement: Optional[OfficialRequirement] = None
        self.deviation_analysis: Optional[DeviationAnalysis] = None
        self.analysis_history: List[str] = []
        self.errors: List[str] = []
        self.execution_time: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'official_requirement': self.official_requirement.to_dict() if self.official_requirement else None,
            'deviation_analysis': self.deviation_analysis.to_dict() if self.deviation_analysis else None,
            'analysis_history': self.analysis_history,
            'errors': self.errors if self.errors else None,
            'execution_time_ms': round(self.execution_time * 1000, 2),
        }

# ============================================================================
# LLM 提示词模板
# ============================================================================

OFFICIAL_REQUIREMENT_PROMPT = """
You are an expert in UK Global Talent Visa (GTV) assessment.

Analyze the OFFICIAL GTV requirements for this scoring item:

Item: {item_name}
Current Value: {item_value}

Provide ONLY valid JSON (no markdown, no explanation) with these exact fields:
- level: string (最低要求/推荐标准/理想标准)
- description: string (GTV官方要求描述，详细说明)
- examples: array of 3-4 strings (具体真实例子)
- gtv_official_basis: string (GTV官方依据和标准)
- reasoning: string (为什么这是官方要求)

JSON Output ONLY:
"""

DEVIATION_ANALYSIS_PROMPT = """
You are an expert in GTV assessment analyzing applicant profiles.

Analyze how the applicant's materials deviate from official requirements:

Item: {item_name}
Applicant Value: {item_value}
Current Score: {score}/{max_score}
Compliance Percentage: {percentage}%

Official Requirement:
- Level: {official_level}
- Description: {official_description}

Applicant Background:
{applicant_background}

Provide ONLY valid JSON (no markdown, no explanation) with these exact fields:
- gap: integer (0-100, where 100 = fully compliant)
- type: string (exceed/meet/gap)
- distance: string (specific gap explanation or distance from requirement)
- industry_context: string (how does applicant's background compare in their industry?)
- gtv_rules_alignment: string (how does it align with GTV assessment criteria?)
- user_specific_analysis: string (analysis specific to this applicant's profile)
- improvement_steps: array of 3-5 strings (concrete, actionable improvement steps)

JSON Output ONLY:
"""

# ============================================================================
# 评分Agent类 - 统一版本
# ============================================================================

class ScoringAgent:
    """
    GTV评分Agent - 统一版本
    
    支持分阶段LLM调用：
    1. 官方要求分析 - 获取GTV标准和官方依据
    2. 偏差分析 - 分析申请人与要求的差距
    3. 结果整合 - 合并所有分析数据
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        """初始化Agent"""
        logger.info("🚀 初始化 ScoringAgent (统一版本)...")
        
        self.api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.llm = None
        
        if HAS_LANGCHAIN and self.api_key:
            try:
                logger.debug(f"📡 正在连接 OpenAI API...")
                self.llm = ChatOpenAI(
                    api_key=self.api_key,
                    model="gpt-4-turbo-preview",
                    temperature=0.7,
                )
                logger.info("✅ LLM 初始化成功 (GPT-4-turbo-preview)")
            except Exception as e:
                logger.error(f"❌ LLM初始化失败: {e}")
                self.llm = None
        else:
            logger.warning("⚠️ LLM 不可用，将使用 Mock 模式生成数据")
    
    # ========================================================================
    # 阶段1：官方要求分析
    # ========================================================================
    
    def _phase1_official_requirement(
        self,
        item_name: str,
        item_value: Any,
        applicant_background: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        阶段1：分析官方要求
        
        使用LLM生成：
        - GTV官方标准
        - 官方依据
        - 具体例子
        - 推理过程
        """
        start_time = time.time()
        logger.info(f"📜 [阶段1] 分析官方要求: {item_name}")
        logger.debug(f"   项目值: {item_value}")
        
        # 如果没有LLM，使用Mock数据
        if not self.llm:
            logger.debug("   使用Mock数据生成...")
            result = self._mock_official_requirement(item_name, item_value)
            elapsed = time.time() - start_time
            logger.info(f"✅ 官方要求分析完成 (Mock模式, {elapsed:.2f}秒)")
            return result
        
        try:
            logger.debug("   正在调用LLM...")
            prompt = OFFICIAL_REQUIREMENT_PROMPT.format(
                item_name=item_name,
                item_value=item_value,
            )
            
            response = self.llm.invoke(prompt)
            
            try:
                result = json.loads(response.content)
                elapsed = time.time() - start_time
                logger.info(f"✅ 官方要求分析完成 ({elapsed:.2f}秒)")
                logger.debug(f"   等级: {result.get('level')}")
                logger.debug(f"   依据: {result.get('gtv_official_basis')}")
                return result
            except json.JSONDecodeError as e:
                logger.warning(f"⚠️ LLM响应不是有效JSON: {e}")
                logger.debug("   使用Mock数据作为备份...")
                return self._mock_official_requirement(item_name, item_value)
                
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"❌ LLM调用失败: {e} (耗时: {elapsed:.2f}秒)")
            logger.debug("   使用Mock数据作为备份...")
            return self._mock_official_requirement(item_name, item_value)
    
    # ========================================================================
    # 阶段2：偏差分析
    # ========================================================================
    
    def _phase2_deviation_analysis(
        self,
        item_name: str,
        item_value: Any,
        score: int,
        max_score: int,
        percentage: int,
        official_requirement: Dict[str, Any],
        applicant_background: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        阶段2：分析偏差程度
        
        使用LLM生成：
        - 符合度评分 (0-100)
        - 符合类型 (exceed/meet/gap)
        - 具体差距说明
        - 行业背景分析
        - 改进步骤
        """
        start_time = time.time()
        logger.info(f"⚠️ [阶段2] 分析偏差程度: {item_name}")
        logger.debug(f"   当前分数: {score}/{max_score} ({percentage}%)")
        
        # 如果没有LLM，使用Mock数据
        if not self.llm:
            logger.debug("   使用Mock数据生成...")
            result = self._mock_deviation_analysis(item_name, percentage)
            elapsed = time.time() - start_time
            logger.info(f"✅ 偏差分析完成 (Mock模式, {elapsed:.2f}秒)")
            return result
        
        try:
            bg_str = json.dumps(applicant_background, ensure_ascii=False, indent=2)
            
            logger.debug("   正在调用LLM...")
            prompt = DEVIATION_ANALYSIS_PROMPT.format(
                item_name=item_name,
                item_value=item_value,
                score=score,
                max_score=max_score,
                percentage=percentage,
                official_level=official_requirement.get('level', ''),
                official_description=official_requirement.get('description', ''),
                applicant_background=bg_str,
            )
            
            response = self.llm.invoke(prompt)
            
            try:
                result = json.loads(response.content)
                elapsed = time.time() - start_time
                logger.info(f"✅ 偏差分析完成 ({elapsed:.2f}秒)")
                logger.debug(f"   符合度: {result.get('gap')}%")
                logger.debug(f"   类型: {result.get('type')}")
                logger.debug(f"   改进步骤数: {len(result.get('improvement_steps', []))}")
                return result
            except json.JSONDecodeError as e:
                logger.warning(f"⚠️ LLM响应不是有效JSON: {e}")
                logger.debug("   使用Mock数据作为备份...")
                return self._mock_deviation_analysis(item_name, percentage)
                
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"❌ LLM调用失败: {e} (耗时: {elapsed:.2f}秒)")
            logger.debug("   使用Mock数据作为备份...")
            return self._mock_deviation_analysis(item_name, percentage)
    
    # ========================================================================
    # 阶段3：结果整合
    # ========================================================================
    
    def _phase3_finalize(
        self,
        item_name: str,
        official_requirement: Optional[OfficialRequirement],
        deviation_analysis: Optional[DeviationAnalysis],
    ) -> None:
        """
        阶段3：整合所有分析结果
        
        - 验证数据完整性
        - 准备最终输出
        - 记录分析历史
        """
        logger.info(f"🎯 [阶段3] 整合分析结果: {item_name}")
        
        # 验证数据
        if official_requirement:
            logger.debug(f"   ✓ 官方要求已生成")
        if deviation_analysis:
            logger.debug(f"   ✓ 偏差分析已生成")
        
        logger.info(f"✅ {item_name} 分析完成")
    
    # ========================================================================
    # 主要公共方法
    # ========================================================================
    
    def analyze_item(
        self,
        item_name: str,
        item_value: Any,
        score: int,
        max_score: int,
        percentage: int,
        applicant_background: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        分析单个评分项 - 执行完整的三阶段分析
        
        Args:
            item_name: 项目名称
            item_value: 项目值
            score: 当前分数
            max_score: 最高分
            percentage: 符合度百分比
            applicant_background: 申请人背景信息
        
        Returns:
            包含官方要求和偏差分析的结果字典
        """
        overall_start = time.time()
        logger.info(f"\n{'='*80}")
        logger.info(f"🎯 开始分析评分项: {item_name}")
        logger.info(f"{'='*80}")
        logger.debug(f"申请人: {applicant_background.get('name', '未知')}")
        
        result = ScoringResult()
        
        try:
            # 阶段1: 官方要求分析
            logger.info("")
            phase1_start = time.time()
            official_req_data = self._phase1_official_requirement(
                item_name, item_value, applicant_background
            )
            result.official_requirement = OfficialRequirement(official_req_data)
            phase1_time = time.time() - phase1_start
            result.analysis_history.append(
                f"✓ 完成官方要求分析: {item_name} ({phase1_time:.2f}秒)"
            )
            
            # 阶段2: 偏差分析
            logger.info("")
            phase2_start = time.time()
            deviation_data = self._phase2_deviation_analysis(
                item_name, item_value, score, max_score, percentage,
                official_req_data, applicant_background
            )
            result.deviation_analysis = DeviationAnalysis(deviation_data)
            phase2_time = time.time() - phase2_start
            result.analysis_history.append(
                f"✓ 完成偏差分析: {item_name} (符合度: {deviation_data.get('gap', 0)}%) ({phase2_time:.2f}秒)"
            )
            
            # 阶段3: 结果整合
            logger.info("")
            self._phase3_finalize(item_name, result.official_requirement, result.deviation_analysis)
            result.analysis_history.append(f"✓ 完成{item_name}的完整分析")
            
            overall_time = time.time() - overall_start
            result.execution_time = overall_time
            
            logger.info(f"✅ {item_name} 分析完成")
            logger.info(f"   总耗时: {overall_time:.2f}秒 (P1: {phase1_time:.2f}s, P2: {phase2_time:.2f}s)")
            logger.debug(f"   分析步骤: {len(result.analysis_history)} 步")
            logger.info(f"{'='*80}\n")
            
        except Exception as e:
            overall_time = time.time() - overall_start
            logger.error(f"❌ 分析失败: {e} (耗时: {overall_time:.2f}秒)")
            result.errors.append(str(e))
            result.execution_time = overall_time
        
        return result.to_dict()
    
    def analyze_dimension(
        self,
        dimension_name: str,
        items: List[Dict[str, Any]],
        applicant_background: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        分析整个维度的所有项目
        
        Args:
            dimension_name: 维度名称
            items: 要评分的项目列表
            applicant_background: 申请人背景信息
        
        Returns:
            包含所有项目分析结果的维度字典
        """
        logger.info(f"\n{'#'*80}")
        logger.info(f"📊 开始分析维度: {dimension_name}")
        logger.info(f"{'#'*80}")
        logger.info(f"   包含 {len(items)} 个项目")
        logger.debug(f"   申请人: {applicant_background.get('name', '未知')}")
        
        dimension_start = time.time()
        results = []
        
        for i, item in enumerate(items, 1):
            logger.info(f"\n   [{i}/{len(items)}] 分析: {item['name']}")
            
            result = self.analyze_item(
                item_name=item['name'],
                item_value=item['value'],
                score=item['score'],
                max_score=item['maxScore'],
                percentage=item['percentage'],
                applicant_background=applicant_background,
            )
            results.append(result)
            
            # 显示进度
            if result.get('deviation_analysis'):
                gap = result['deviation_analysis']['gap']
                logger.info(f"       ✓ 符合度: {gap}%")
        
        dimension_time = time.time() - dimension_start
        logger.info(f"\n✅ 维度分析完成: {dimension_name}")
        logger.info(f"   总耗时: {dimension_time:.2f}秒 ({len(items)}项)")
        logger.info(f"{'#'*80}\n")
        
        return {
            'dimension': dimension_name,
            'items': results,
            'analyzed_at': datetime.now().isoformat(),
            'execution_time_ms': round(dimension_time * 1000, 2),
        }
    
    # ========================================================================
    # Mock 数据生成（无网络时使用）
    # ========================================================================
    
    @staticmethod
    def _mock_official_requirement(item_name: str, item_value: Any) -> Dict[str, Any]:
        """生成模拟的官方要求"""
        logger.debug(f"   生成Mock官方要求数据...")
        return {
            "level": "推荐标准",
            "description": f"GTV官方推荐{item_name}应达到{item_value}或更高标准",
            "examples": [
                f"示例1: {item_value}",
                "示例2: 更高水平",
                "示例3: 国际认可",
                "示例4: 行业领先"
            ],
            "gtv_official_basis": "UK Global Talent Visa Assessment Guidelines",
            "reasoning": f"基于GTV官方标准，{item_name}是评估申请人能力的重要指标。"
        }
    
    @staticmethod
    def _mock_deviation_analysis(item_name: str, percentage: int) -> Dict[str, Any]:
        """生成模拟的偏差分析"""
        logger.debug(f"   生成Mock偏差分析数据...")
        if percentage >= 90:
            type_val = "exceed"
            distance = "完全符合或超出官方要求标准"
        elif percentage >= 70:
            type_val = "meet"
            distance = "符合官方要求标准"
        else:
            type_val = "gap"
            distance = "低于官方要求标准，需要改进"
        
        return {
            "gap": percentage,
            "type": type_val,
            "distance": distance,
            "industry_context": "在相关行业中，申请人的背景代表该领域的水平。",
            "gtv_rules_alignment": "申请人的材料符合GTV评估的相关标准。",
            "user_specific_analysis": "基于申请人的个人背景和经历的特定分析。",
            "improvement_steps": [
                "第一步：继续发展相关领域的专业知识",
                "第二步：获得行业认可和证书",
                "第三步：建立该领域的领导地位"
            ]
        }


# ============================================================================
# 测试函数
# ============================================================================

def test_scoring_agent():
    """测试ScoringAgent"""
    logger.info("\n" + "█"*80)
    logger.info("█  GTV评分Agent - 统一版本功能测试")
    logger.info("█"*80)
    
    # 初始化Agent
    agent = ScoringAgent()
    
    # 示例申请人背景
    applicant_bg = {
        "name": "张三",
        "education": {
            "university": "清华大学",
            "degree": "硕士",
            "major": "计算机科学",
            "gpa": 3.8,
        },
        "work_experience": {
            "company": "阿里巴巴",
            "position": "高级工程师",
            "years": 8,
        },
        "certifications": ["ACE认证", "Kubernetes认证"],
        "awards": ["年度最佳工程师"],
    }
    
    # 示例项目
    items = [
        {
            "name": "最高学历",
            "value": "计算机科学硕士",
            "score": 5,
            "maxScore": 5,
            "percentage": 100,
        },
        {
            "name": "工作年限",
            "value": "8年",
            "score": 5,
            "maxScore": 5,
            "percentage": 100,
        },
    ]
    
    # 分析维度
    result = agent.analyze_dimension(
        dimension_name="教育背景和工作经验",
        items=items,
        applicant_background=applicant_bg,
    )
    
    # 输出结果
    logger.info("\n" + "█"*80)
    logger.info("█  分析结果")
    logger.info("█"*80)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    return result


if __name__ == "__main__":
    test_scoring_agent()
