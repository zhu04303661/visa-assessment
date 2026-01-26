#!/usr/bin/env python3
"""
GTV评估详细评分说明模块
提供逐项评分解释、标准说明和改进建议
"""

import json
from typing import Dict, List, Any, Optional
from datetime import datetime


class ScoringExplainer:
    """
    评分说明生成器
    为每一个评分项提供详细的判定逻辑和改进建议
    """
    
    def __init__(self):
        """初始化评分说明器"""
        self.suggestion_map = self._initialize_suggestions()
    
    def _initialize_suggestions(self) -> Dict[str, str]:
        """初始化改进建议映射表"""
        return {
            # 大学等级
            "top_global": "申请顶级全球大学（QS前50）或英国传统名校（牛剑）或中国清北",
            "top_country": "申请国内顶尖大学或海外顶级大学",
            "strong_regional": "申请欧澳顶级大学或中国重点大学",
            "good_regional": "申请国家重点大学或区域强势高校",
            
            # 学位等级
            "doctorate": "攻读博士学位，深化专业研究",
            "master": "攻读硕士学位，提升学历背景",
            "bachelor": "完成学士学位，为进阶奠定基础",
            
            # 专业相关性
            "highly_relevant": "已在完全相关的专业领域，继续深耕",
            "relevant": "在相关或基础学科领域，关联性良好",
            "somewhat_relevant": "选择更加相关的专业方向",
            "tangential": "寻求更直接相关的学科或应用领域",
            
            # 学术成就
            "international_award": "继续争取国际学术奖项或最佳论文",
            "published_papers": "发表更多期刊或会议论文",
            "excellent_gpa": "获得优异成绩（GPA 3.8+）",
            "good_gpa": "提升成绩至优异水平（GPA 3.8+）",
            
            # 工作年限
            # （使用阈值，见下方）
            
            # 公司级别
            "fortune500_unicorn": "继续在Fortune500或独角兽企业工作",
            "industry_leader": "加入Fortune500公司或独角兽企业",
            "fast_growing": "加入行业领先或快速成长的公司",
            "startup": "加入或创办有潜力的初创公司",
            "small_business": "加入更大规模或知名度更高的公司",
            
            # 职位级别
            "c_suite_vp": "保持或进一步提升C-level或VP职位",
            "director": "晋升至总监级职位或更高",
            "senior_manager": "晋升至总监级职位",
            "manager": "晋升至高级经理或总监职位",
            "senior_specialist": "晋升至经理级职位",
            
            # 在职连续性
            "long_stable": "继续在当前职位或领域保持稳定贡献",
            "stable": "争取达到3-5年以上的稳定期",
            "normal": "建立更稳定的职业轨迹，减少频繁跳槽",
            "short_jumps": "选择稳定且长期的职位",
            "unstable": "立即寻求稳定的职位，至少2-3年",
            
            # 技术广度
            # （使用阈值，见下方）
            
            # 创新成果
            "own_product": "继续创造自主创新产品或平台",
            "major_contribution": "争取做出自主创新产品",
            "architecture_optimization": "做出重大功能或核心模块贡献",
            "solution_improvement": "进行技术架构或系统优化",
            "maintenance": "转向创新工作而非维护性工作",
            
            # 专利数量
            # （使用阈值，见下方）
            
            # 技术深度
            "global_expert": "保持全球顶级专家地位",
            "industry_recognized": "争取成为全球顶级专家",
            "deep_knowledge": "获得行业深度认可和建立技术领导力",
            "proficient": "积累深厚的专业知识，获得认可",
            "learning": "深化专业知识，成为该领域专家",
            
            # 团队规模
            # （使用阈值，见下方）
            
            # 决策影响力
            "strategic_company": "保持战略决策影响力",
            "product_strategic": "争取战略决策影响公司方向的机会",
            "departmental": "寻求更高层级的决策权（产品或战略级）",
            "limited": "争取部门运营决策权",
            "advisory": "从建议权升级到正式决策权",
            
            # 战略贡献
            "company_strategy": "保持公司级战略贡献",
            "department_strategy": "争取公司级战略制定机会",
            "core_business": "制定部门级或核心业务战略",
            "execution": "从执行转向战略制定",
            "tactical": "参与执行层战略或项目战略",
            
            # 业界认可
            "association_chair": "保持或寻求更高层的业界角色",
            "committee_member": "晋升至行业协会主席或高级评委",
            "keynote_speaker": "加入标准委员会或顾问团",
            "media_interview": "寻求在顶级峰会做主旨演讲机会",
            "industry_known": "接受主流媒体采访，建立业界知名度",
            
            # 媒体报道
            "international_top": "继续获得国际顶级媒体报道",
            "domestic_professional": "争取国际顶级媒体报道",
            "industry_media": "争取国内专业媒体报道",
            "internet_media": "争取行业媒体报道",
            "company_news": "通过媒体报道提升知名度",
            
            # 行业地位
            "recognized_leader": "保持行业公认领袖地位",
            "leading_expert": "成为行业公认领袖",
            "known_practitioner": "获得一线企业或国际机构认可",
            "active_practitioner": "成为知名从业者，获得业界认可",
            "newcomer": "积极参与行业活动，建立认知",
            
            # 生态贡献
            "standard_setter": "继续建立或维护行业标准",
            "opensource_major": "建立行业标准或技术规范",
            "conference_organizer": "成为开源项目主要贡献者（Star 1000+）",
            "knowledge_sharing": "组织或参与行业峰会，担任关键角色",
            "passive_participant": "主动进行知识分享和传播"
        }
    
    def explain_item_score(self, category_name: str, value: Any, score: int, 
                          max_score: int, criteria_list: List[tuple]) -> Dict[str, Any]:
        """
        解释单个评分项
        
        Args:
            category_name: 类别名称
            value: 用户提供的值
            score: 得到的分数
            max_score: 最高分
            criteria_list: 评分标准列表 [(threshold/option, points), ...]
        
        Returns:
            详细的评分解释
        """
        result = {
            "category": category_name,
            "value": value,
            "score": score,
            "max_score": max_score,
            "percentage": round((score / max_score * 100) if max_score > 0 else 0, 1),
            "criteria": self._build_criteria_text(criteria_list, value, score),
            "reasoning": self._build_reasoning(category_name, value, score, max_score),
            "improvement": self._build_improvement(category_name, value, score, max_score, criteria_list)
        }
        return result
    
    def _build_criteria_text(self, criteria_list: List[tuple], value: Any, current_score: int) -> str:
        """构建标准说明文本"""
        text = "📋 评分标准：\n"
        
        for item, points in criteria_list:
            is_current = False
            
            # 判断是否是当前选中的标准
            if isinstance(item, (int, float)):  # 阈值标准
                is_current = value >= item and points == current_score
                text += f"  {'✓' if is_current else ' '} 当前值 ≥ {item}: {points}分\n"
            else:  # 选项标准
                is_current = value == item and points == current_score
                text += f"  {'✓' if is_current else ' '} {item}: {points}分\n"
        
        return text
    
    def _build_reasoning(self, category_name: str, value: Any, score: int, max_score: int) -> str:
        """构建得分理由"""
        reasoning = f"💡 判定逻辑:\n"
        reasoning += f"  • 项目: {category_name}\n"
        reasoning += f"  • 提供的值: {value}\n"
        reasoning += f"  • 得到的分数: {score}/{max_score}\n"
        
        if score == max_score:
            reasoning += f"  • 状态: 已达到该项最高水平\n"
        elif score == 0:
            reasoning += f"  • 状态: 未提供相关信息或不符合任何标准\n"
        else:
            percentage = round((score / max_score * 100), 1)
            reasoning += f"  • 状态: {percentage}% 的水平\n"
        
        return reasoning
    
    def _build_improvement(self, category_name: str, value: Any, score: int, 
                          max_score: int, criteria_list: List[tuple]) -> str:
        """构建改进建议"""
        if score >= max_score:
            return f"✨ 该项已达到最高水平，无需改进！"
        
        # 找出下一个更高的标准
        next_suggestion = None
        next_points = None
        
        for item, points in criteria_list:
            if points > score:
                if next_points is None or points < next_points:
                    next_suggestion = item
                    next_points = points
        
        if next_suggestion is not None:
            improvement_points = next_points - score
            specific_suggestion = self.suggestion_map.get(str(next_suggestion), f"提升至{next_suggestion}水平")
            
            if isinstance(next_suggestion, (int, float)):
                return f"📈 改进建议 (可增加 +{improvement_points}分):\n     将'{category_name}'从 {value} 提升至 {next_suggestion} 或以上\n     具体建议: {specific_suggestion}"
            else:
                return f"📈 改进建议 (可增加 +{improvement_points}分):\n     {specific_suggestion}"
        
        return "已达到该分类的最高水平"
    
    def generate_dimension_report(self, dimension_name: str, dimension_data: Dict[str, Any],
                                 dimension_scores: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """
        生成维度详细报告
        
        Args:
            dimension_name: 维度名称
            dimension_data: 该维度的数据
            dimension_scores: 该维度的评分结果
        
        Returns:
            维度详细报告
        """
        report = {
            "dimension": dimension_name,
            "total_score": dimension_scores.get("total_score", 0),
            "max_score": dimension_scores.get("max_score", 0),
            "percentage": dimension_scores.get("percentage", 0),
            "timestamp": datetime.now().isoformat(),
            "items": []
        }
        
        # 添加每个子项的详细信息
        if "subscores" in dimension_scores:
            for item_name, item_score in dimension_scores["subscores"].items():
                item_detail = {
                    "name": item_score.get("name", item_name),
                    "value": dimension_data.get(item_name),
                    "score": item_score.get("score", 0),
                    "max_score": item_score.get("max_score", 0)
                }
                item_detail["percentage"] = round(
                    (item_detail["score"] / item_detail["max_score"] * 100) 
                    if item_detail["max_score"] > 0 else 0, 1
                )
                report["items"].append(item_detail)
        
        return report


class ScoringReportFormatter:
    """
    评分报告格式化器
    将评分结果格式化为易于阅读的报告
    """
    
    @staticmethod
    def format_full_report(assessment_result: Dict[str, Any]) -> str:
        """格式化完整的评估报告"""
        report = []
        report.append("=" * 80)
        report.append("GTV签证评估详细评分报告")
        report.append("=" * 80)
        report.append("")
        
        # 总体评分
        overall = assessment_result.get("overall_assessment", {})
        report.append(f"📊 总体评分: {overall.get('overall_score', 0)}/100")
        report.append(f"   等级: {overall.get('grade', 'N/A')}")
        report.append(f"   置信度: {overall.get('confidence', 'N/A')}")
        report.append("")
        
        # 维度评分详解
        report.append("-" * 80)
        report.append("维度评分详解")
        report.append("-" * 80)
        
        dimension_results = assessment_result.get("dimension_results", {})
        for dimension, result in dimension_results.items():
            report.append(f"\n📌 {dimension.upper()}")
            report.append(f"   总分: {result.get('total_score', 0)}/{result.get('max_score', 0)} "
                         f"({result.get('percentage', 0)}%)")
            
            subscores = result.get("subscores", {})
            for item_name, item_score in subscores.items():
                report.append(f"\n   • {item_score.get('name', item_name)}")
                report.append(f"     分数: {item_score.get('score', 0)}/{item_score.get('max_score', 0)}")
        
        report.append("")
        report.append("=" * 80)
        
        return "\n".join(report)
    
    @staticmethod
    def format_json_report(assessment_result: Dict[str, Any]) -> str:
        """格式化为JSON报告"""
        return json.dumps(assessment_result, ensure_ascii=False, indent=2)


# ============================================================================
# 测试示例
# ============================================================================

def test_scoring_explainer():
    """测试评分说明器"""
    explainer = ScoringExplainer()
    
    # 示例：大学等级评分
    criteria = [
        ("top_global", 5),
        ("top_country", 5),
        ("strong_regional", 4),
        ("good_regional", 3),
        ("general", 2)
    ]
    
    result = explainer.explain_item_score(
        category_name="大学等级",
        value="top_country",
        score=5,
        max_score=5,
        criteria_list=criteria
    )
    
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print("\n")
    
    # 示例：工作年限评分
    years_criteria = [
        (8, 5),
        (6, 4),
        (4, 3),
        (2, 2),
        (1, 1),
        (0, 0)
    ]
    
    result2 = explainer.explain_item_score(
        category_name="工作年限",
        value=6,
        score=4,
        max_score=5,
        criteria_list=years_criteria
    )
    
    print(json.dumps(result2, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    test_scoring_explainer()
