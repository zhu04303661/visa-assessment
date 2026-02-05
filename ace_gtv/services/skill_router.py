"""
Skill 路由器

根据用户输入自动检测并选择合适的 skill。
"""

import re
import logging
from typing import Optional, Dict, Any, List, Tuple

logger = logging.getLogger(__name__)


# Skill 关键词映射
SKILL_KEYWORDS: Dict[str, List[str]] = {
    "resume-analysis": [
        "简历", "cv", "resume", "履历", "工作经历", "教育背景",
        "职业经历", "技能", "资质", "工作经验"
    ],
    "gtv-eligibility-assessment": [
        "评估", "资格", "eligibility", "是否符合", "适合", "申请条件",
        "gtv要求", "签证要求", "是否可以申请"
    ],
    "scoring-calculation": [
        "评分", "分数", "score", "打分", "得分", "多少分",
        "评分标准", "mc", "oc"
    ],
    "evidence-validation": [
        "证据", "验证", "evidence", "证明", "材料验证", "真实性",
        "有效性", "完整性"
    ],
    "recommendations-generation": [
        "建议", "改进", "recommend", "提升", "优化", "怎么改",
        "如何提高", "改善", "策略", "方案"
    ],
    "document-processing": [
        "文档", "处理", "document", "提取", "分析文件", "解析",
        "文件处理", "内容提取"
    ]
}

# Skill 优先级（用于多个匹配时选择）
SKILL_PRIORITY: Dict[str, int] = {
    "recommendations-generation": 1,  # 最常用
    "document-processing": 2,
    "resume-analysis": 3,
    "gtv-eligibility-assessment": 4,
    "scoring-calculation": 5,
    "evidence-validation": 6
}


class SkillRouter:
    """Skill 路由器"""
    
    def __init__(self):
        self.keyword_map = SKILL_KEYWORDS
        self.priority_map = SKILL_PRIORITY
    
    def detect_skill(
        self,
        user_input: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Tuple[Optional[str], float]:
        """
        根据用户输入检测合适的 skill
        
        Args:
            user_input: 用户输入文本
            context: 上下文信息（可选）
            
        Returns:
            (skill_name, confidence) 元组，如果没有匹配则返回 (None, 0.0)
        """
        if not user_input:
            return None, 0.0
        
        input_lower = user_input.lower()
        matched_skills: List[Tuple[str, int, float]] = []  # (skill_name, priority, score)
        
        for skill_name, keywords in self.keyword_map.items():
            match_count = 0
            for keyword in keywords:
                if keyword.lower() in input_lower:
                    match_count += 1
            
            if match_count > 0:
                # 计算置信度：匹配关键词数 / 总关键词数
                confidence = match_count / len(keywords)
                priority = self.priority_map.get(skill_name, 99)
                matched_skills.append((skill_name, priority, confidence))
        
        if not matched_skills:
            # 如果没有匹配，尝试根据上下文推断
            return self._infer_from_context(context)
        
        # 按置信度和优先级排序
        matched_skills.sort(key=lambda x: (-x[2], x[1]))
        
        best_match = matched_skills[0]
        logger.info(f"检测到 skill: {best_match[0]} (confidence={best_match[2]:.2f})")
        
        return best_match[0], best_match[2]
    
    def _infer_from_context(
        self,
        context: Optional[Dict[str, Any]]
    ) -> Tuple[Optional[str], float]:
        """根据上下文推断 skill"""
        if not context:
            return None, 0.0
        
        active_document = context.get("active_document", "")
        
        # 根据当前文档类型推断
        if active_document:
            doc_lower = active_document.lower()
            
            if "cv" in doc_lower or "resume" in doc_lower:
                return "resume-analysis", 0.5
            
            if "recommendation" in doc_lower or "推荐" in active_document:
                return "recommendations-generation", 0.5
            
            if "evidence" in doc_lower or "证据" in active_document:
                return "evidence-validation", 0.5
            
            # 默认使用文档处理
            return "document-processing", 0.3
        
        return None, 0.0
    
    def get_skill_suggestions(
        self,
        user_input: str,
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        获取推荐的 skills 列表
        
        Args:
            user_input: 用户输入
            top_k: 返回的最大数量
            
        Returns:
            推荐的 skills 列表，包含名称和置信度
        """
        if not user_input:
            return []
        
        input_lower = user_input.lower()
        suggestions = []
        
        for skill_name, keywords in self.keyword_map.items():
            match_count = sum(1 for kw in keywords if kw.lower() in input_lower)
            
            if match_count > 0:
                confidence = match_count / len(keywords)
                suggestions.append({
                    "name": skill_name,
                    "confidence": confidence,
                    "matched_keywords": match_count
                })
        
        # 排序并返回 top_k
        suggestions.sort(key=lambda x: -x["confidence"])
        return suggestions[:top_k]
    
    def validate_skill(self, skill_name: str) -> bool:
        """验证 skill 名称是否有效"""
        return skill_name in self.keyword_map


# 全局实例
_router_instance: Optional[SkillRouter] = None


def get_skill_router() -> SkillRouter:
    """获取 Skill Router 单例"""
    global _router_instance
    if _router_instance is None:
        _router_instance = SkillRouter()
    return _router_instance


def auto_detect_skill(
    user_input: str,
    context: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    """
    便捷函数：自动检测 skill
    
    Args:
        user_input: 用户输入
        context: 上下文信息
        
    Returns:
        检测到的 skill 名称，如果没有匹配则返回 None
    """
    router = get_skill_router()
    skill_name, confidence = router.detect_skill(user_input, context)
    
    # 只有置信度超过阈值才返回
    if confidence >= 0.1:
        return skill_name
    
    return None
