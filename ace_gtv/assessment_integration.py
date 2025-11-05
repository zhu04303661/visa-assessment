#!/usr/bin/env python3
"""
GTV评估系统集成模块
将新的细粒度评分引擎与现有系统集成
"""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from gtv_scoring_engine import GTVAssessmentEngine, GTVScoringRules

logger = logging.getLogger(__name__)


class GTVAssessmentIntegration:
    """GTV评估系统集成类"""
    
    def __init__(self):
        self.engine = GTVAssessmentEngine()
        self.scoring_rules = GTVScoringRules()
    
    def convert_legacy_profile_to_new_format(self, legacy_assessment: Dict[str, Any]) -> Dict[str, Any]:
        """
        将旧格式的评估数据转换为新评分引擎所需的格式
        
        Args:
            legacy_assessment: 旧格式的评估结果
        
        Returns:
            新格式的申请人数据
        """
        profile = {}
        
        # 教育背景转换
        profile["education"] = self._convert_education(legacy_assessment)
        
        # 工作经验转换
        profile["experience"] = self._convert_experience(legacy_assessment)
        
        # 技术能力转换
        profile["technical"] = self._convert_technical(legacy_assessment)
        
        # 领导力转换
        profile["leadership"] = self._convert_leadership(legacy_assessment)
        
        # 行业影响转换
        profile["impact"] = self._convert_impact(legacy_assessment)
        
        return profile
    
    def _convert_education(self, assessment: Dict[str, Any]) -> Dict[str, str]:
        """转换教育背景部分"""
        education = assessment.get("educationBackground", {})
        
        return {
            "university_tier": self._infer_university_tier(education.get("institutions", [])),
            "degree_level": self._infer_degree_level(education.get("degrees", [])),
            "major_relevance": "highly_relevant",  # 假设相关（可根据实际情况调整）
            "academic_achievement": self._infer_academic_achievement(education)
        }
    
    def _infer_university_tier(self, institutions: list) -> str:
        """推断大学等级"""
        if not institutions:
            return "unknown"
        
        # 简单的推断逻辑，可根据实际数据库扩展
        tier_keywords = {
            "top_global": ["harvard", "oxford", "cambridge", "stanford", "mit", "berkeley"],
            "top_country": ["清华", "北大", "tsinghua", "peking"],
            "strong_regional": ["imperial", "eth", "nus"],
        }
        
        institution = institutions[0].lower()
        for tier, keywords in tier_keywords.items():
            if any(kw in institution for kw in keywords):
                return tier
        
        return "good_regional"
    
    def _infer_degree_level(self, degrees: list) -> str:
        """推断学位等级"""
        if not degrees:
            return "unknown"
        
        degree_str = degrees[0].lower()
        if "phd" in degree_str or "doctorate" in degree_str:
            return "doctorate"
        elif "master" in degree_str or "msc" in degree_str:
            return "master"
        elif "bachelor" in degree_str or "bsc" in degree_str:
            return "bachelor"
        
        return "unknown"
    
    def _infer_academic_achievement(self, education: Dict[str, Any]) -> str:
        """推断学术成就"""
        analysis = education.get("analysis", "").lower()
        
        if "award" in analysis or "published" in analysis or "paper" in analysis:
            return "published_papers"
        elif "gpa" in analysis or "grade" in analysis:
            return "good_gpa"
        
        return "normal"
    
    def _convert_experience(self, assessment: Dict[str, Any]) -> Dict[str, Any]:
        """转换工作经验部分"""
        work = assessment.get("workExperience", {})
        company = assessment.get("applicantInfo", {}).get("company", "")
        years_str = assessment.get("applicantInfo", {}).get("yearsOfExperience", "0")
        
        # 推断工作年限（数字）
        try:
            years = int(''.join(filter(str.isdigit, str(years_str))) or "0")
        except:
            years = 0
        
        return {
            "years_of_experience": min(years, 50),  # 上限50年
            "company_caliber": self._infer_company_caliber(company, assessment),
            "position_level": self._infer_position_level(assessment),
            "tenure_stability": self._infer_tenure_stability(assessment),
            "cross_domain_breadth": self._infer_cross_domain(assessment)
        }
    
    def _infer_company_caliber(self, company: str, assessment: Dict[str, Any]) -> str:
        """推断公司级别"""
        company_lower = company.lower()
        
        fortune500_keywords = ["alibaba", "google", "amazon", "microsoft", "apple", "facebook", "tencent", "baidu"]
        if any(kw in company_lower for kw in fortune500_keywords):
            return "fortune500_unicorn"
        
        if "startup" in company_lower or "创业" in company:
            return "startup"
        
        analysis = assessment.get("industryBackground", {}).get("analysis", "").lower()
        if "leader" in analysis or "leading" in analysis:
            return "industry_leader"
        
        return "fast_growing"
    
    def _infer_position_level(self, assessment: Dict[str, Any]) -> str:
        """推断职位级别"""
        position = assessment.get("applicantInfo", {}).get("currentPosition", "").lower()
        
        c_level_keywords = ["ceo", "cto", "cfo", "coo", "vp", "vice president"]
        director_keywords = ["director", "总监"]
        manager_keywords = ["manager", "经理"]
        specialist_keywords = ["engineer", "specialist", "工程师"]
        
        if any(kw in position for kw in c_level_keywords):
            return "c_suite_vp"
        elif any(kw in position for kw in director_keywords):
            return "director"
        elif any(kw in position for kw in manager_keywords):
            return "manager"
        elif any(kw in position for kw in specialist_keywords):
            return "senior_specialist"
        
        return "general"
    
    def _infer_tenure_stability(self, assessment: Dict[str, Any]) -> str:
        """推断在职连续性"""
        work = assessment.get("workExperience", {})
        positions = work.get("positions", [])
        
        # 简单启发式：职位数量和年限
        if len(positions) <= 1:
            return "long_stable"
        elif len(positions) <= 3:
            return "stable"
        elif len(positions) <= 5:
            return "normal"
        else:
            return "short_jumps"
    
    def _infer_cross_domain(self, assessment: Dict[str, Any]) -> int:
        """推断跨界经验数量"""
        work = assessment.get("workExperience", {})
        positions = work.get("positions", [])
        
        # 简单估计：不同的职位类型
        if len(positions) >= 3:
            return 2
        elif len(positions) >= 2:
            return 1.5
        else:
            return 1
    
    def _convert_technical(self, assessment: Dict[str, Any]) -> Dict[str, Any]:
        """转换技术能力部分"""
        tech = assessment.get("technicalExpertise", {})
        skills = tech.get("coreSkills", [])
        innovations = tech.get("innovations", [])
        
        return {
            "technical_breadth": min(len(skills), 5),
            "innovation_output": self._infer_innovation_output(innovations),
            "patents_count": len(tech.get("specializations", [])),  # 简化：用specializations计数
            "technical_depth": self._infer_technical_depth(assessment)
        }
    
    def _infer_innovation_output(self, innovations: list) -> str:
        """推断创新成果"""
        if len(innovations) >= 3:
            return "own_product"
        elif len(innovations) >= 2:
            return "major_contribution"
        elif len(innovations) >= 1:
            return "architecture_optimization"
        else:
            return "maintenance"
    
    def _infer_technical_depth(self, assessment: Dict[str, Any]) -> str:
        """推断技术深度"""
        analysis = assessment.get("technicalExpertise", {}).get("analysis", "").lower()
        
        if "expert" in analysis or "深度" in analysis:
            return "industry_recognized"
        elif "proficient" in analysis or "专业" in analysis:
            return "proficient"
        
        return "learning"
    
    def _convert_leadership(self, assessment: Dict[str, Any]) -> Dict[str, Any]:
        """转换领导力部分"""
        return {
            "team_size": self._infer_team_size(assessment),
            "decision_impact": self._infer_decision_impact(assessment),
            "strategic_contribution": self._infer_strategic_contribution(assessment),
            "industry_recognition": self._infer_industry_recognition(assessment)
        }
    
    def _infer_team_size(self, assessment: Dict[str, Any]) -> int:
        """推断团队规模"""
        work = assessment.get("workExperience", {})
        achievements = work.get("keyAchievements", [])
        
        # 简单启发式
        for achievement in achievements:
            if "team" in achievement.lower():
                import re
                numbers = re.findall(r'\d+', achievement)
                if numbers:
                    return int(numbers[0])
        
        return 0
    
    def _infer_decision_impact(self, assessment: Dict[str, Any]) -> str:
        """推断决策影响力"""
        analysis = assessment.get("workExperience", {}).get("analysis", "").lower()
        
        if "strategic" in analysis:
            return "strategic_company"
        elif "decision" in analysis or "决策" in analysis:
            return "departmental"
        
        return "limited"
    
    def _infer_strategic_contribution(self, assessment: Dict[str, Any]) -> str:
        """推断战略贡献"""
        position = assessment.get("applicantInfo", {}).get("currentPosition", "").lower()
        
        if "vp" in position or "director" in position or "总监" in position:
            return "department_strategy"
        
        return "core_business"
    
    def _infer_industry_recognition(self, assessment: Dict[str, Any]) -> str:
        """推断业界认可"""
        analysis = assessment.get("industryBackground", {}).get("analysis", "").lower()
        
        if "keynote" in analysis or "speaker" in analysis:
            return "keynote_speaker"
        elif "interview" in analysis or "采访" in analysis:
            return "media_interview"
        
        return "industry_known"
    
    def _convert_impact(self, assessment: Dict[str, Any]) -> Dict[str, str]:
        """转换行业影响部分"""
        industry = assessment.get("industryAnalysis", {})
        
        return {
            "media_coverage": self._infer_media_coverage(assessment),
            "industry_status": self._infer_industry_status(assessment),
            "ecosystem_contribution": self._infer_ecosystem_contribution(assessment)
        }
    
    def _infer_media_coverage(self, assessment: Dict[str, Any]) -> str:
        """推断媒体报道"""
        analysis = assessment.get("industryAnalysis", {}).get("analysis", "").lower()
        
        if "international" in analysis or "global" in analysis:
            return "international_top"
        elif "media" in analysis or "报道" in analysis:
            return "domestic_professional"
        
        return "company_news"
    
    def _infer_industry_status(self, assessment: Dict[str, Any]) -> str:
        """推断行业地位"""
        analysis = assessment.get("industryAnalysis", {}).get("analysis", "").lower()
        
        if "leader" in analysis or "expert" in analysis:
            return "leading_expert"
        elif "known" in analysis or "known_practitioner" in analysis:
            return "known_practitioner"
        
        return "active_practitioner"
    
    def _infer_ecosystem_contribution(self, assessment: Dict[str, Any]) -> str:
        """推断生态贡献"""
        tech = assessment.get("technicalExpertise", {})
        innovations = tech.get("innovations", [])
        
        if len(innovations) >= 3:
            return "standard_setter"
        elif len(innovations) >= 2:
            return "opensource_major"
        
        return "knowledge_sharing"
    
    def enhance_assessment(self, legacy_assessment: Dict[str, Any]) -> Dict[str, Any]:
        """
        增强旧的评估报告，添加新的细粒度评分
        
        Args:
            legacy_assessment: 旧格式的评估结果
        
        Returns:
            增强后的评估报告
        """
        # 转换数据格式
        new_format_profile = self.convert_legacy_profile_to_new_format(legacy_assessment)
        
        # 使用新引擎进行评估
        detailed_assessment = self.engine.assess(new_format_profile)
        
        # 合并结果
        enhanced_assessment = {
            **legacy_assessment,
            "detailed_scoring": detailed_assessment,
            "legacy_score": legacy_assessment.get("overallScore", 0),
            "new_overall_score": detailed_assessment["overall_assessment"]["overall_score"],
            "new_grade": detailed_assessment["overall_assessment"]["grade"],
            "recommendations": detailed_assessment["recommendations"],
            "visa_pathway": detailed_assessment["visa_pathway"],
            "enhanced_at": datetime.now().isoformat()
        }
        
        return enhanced_assessment


# ============================================================================
# 使用示例
# ============================================================================

def test_integration():
    """测试集成模块"""
    integration = GTVAssessmentIntegration()
    
    # 模拟旧格式的评估数据
    legacy_assessment = {
        "applicantInfo": {
            "name": "王小明",
            "field": "Digital Technology",
            "currentPosition": "Senior Engineer",
            "company": "Alibaba",
            "yearsOfExperience": "8 years"
        },
        "educationBackground": {
            "degrees": ["Master's in Computer Science"],
            "institutions": ["Tsinghua University"],
            "analysis": "Strong academic background with published papers"
        },
        "workExperience": {
            "positions": ["Software Engineer", "Senior Engineer"],
            "keyAchievements": ["Led team of 10 engineers", "Developed cloud platform"],
            "leadershipRoles": ["Team Lead"],
            "projectImpact": ["Cloud computing platform", "Distributed systems"],
            "analysis": "Demonstrates both technical and people leadership"
        },
        "technicalExpertise": {
            "coreSkills": ["Cloud Computing", "Distributed Systems", "AI/ML", "Python", "Java"],
            "specializations": ["Cloud Architecture", "System Design"],
            "innovations": ["Platform optimization", "New algorithm"],
            "analysis": "Expertise in cutting-edge digital tech areas"
        },
        "industryBackground": {
            "sector": "Technology",
            "yearsInIndustry": "8",
            "keyCompanies": ["Alibaba"],
            "analysis": "Leading expert in cloud computing"
        },
        "industryAnalysis": {
            "industryImpact": 8,
            "sector": "Digital Technology",
            "analysis": "International recognition for technical contributions"
        }
    }
    
    # 增强评估
    enhanced = integration.enhance_assessment(legacy_assessment)
    
    print(json.dumps(enhanced, indent=2, ensure_ascii=False))
    
    return enhanced


if __name__ == "__main__":
    test_integration()
