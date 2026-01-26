#!/usr/bin/env python3
"""
GTV签证评估的ACE自我进化代理 - 简化版本
"""

import json
import os
import sys
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import logging

# 添加ACE框架路径
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'ACE-open'))

try:
    from ace import (
        Playbook, Bullet, Generator, Reflector, Curator,
        OfflineAdapter, OnlineAdapter, Sample, TaskEnvironment, EnvironmentResult,
        DummyLLMClient
    )
    print("✅ ACE框架导入成功")
except ImportError as e:
    print(f"❌ ACE框架导入失败: {e}")
    sys.exit(1)

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class GTVAssessmentData:
    """GTV评估数据结构"""
    name: str = ""
    field: str = ""
    experience: str = ""
    education: str = ""
    achievements: list = field(default_factory=list)
    current_score: int = 0
    pathway: str = ""
    eligibility_criteria: dict = field(default_factory=dict)

class GTVTaskEnvironment(TaskEnvironment):
    """GTV签证评估任务环境"""
    
    def __init__(self):
        self.gtv_criteria = {
            "exceptional_talent": {
                "min_score": 80,
                "requirements": ["国际认可", "杰出成就", "行业领导力"]
            },
            "exceptional_promise": {
                "min_score": 70,
                "requirements": ["创新潜力", "未来贡献", "专业发展"]
            },
            "startup_visa": {
                "min_score": 60,
                "requirements": ["创新商业计划", "资金支持", "市场潜力"]
            }
        }
    
    def evaluate(self, sample: Sample, generator_output) -> EnvironmentResult:
        """评估GTV申请回答的质量"""
        try:
            # 简化的评估逻辑
            score = 75  # 默认分数
            feedback = f"基于您的回答，GTV评估得分为{score}分。"
            
            return EnvironmentResult(
                feedback=feedback,
                ground_truth=sample.ground_truth,
                metrics={
                    "gtv_score": score,
                    "completeness": 0.8,
                    "relevance": 0.9,
                    "accuracy": 0.85
                }
            )
        except Exception as e:
            logger.error(f"评估过程中出错: {e}")
            return EnvironmentResult(
                feedback="评估过程中出现错误，请重新尝试",
                ground_truth=sample.ground_truth,
                metrics={"error": 1.0}
            )

class GTVACEAgent:
    """GTV签证评估的ACE自我进化代理"""
    
    def __init__(self, llm_client=None):
        self.llm_client = llm_client or DummyLLMClient()
        self.playbook = self._initialize_gtv_playbook()
        self.generator = Generator(self.llm_client)
        self.reflector = Reflector(self.llm_client)
        self.curator = Curator(self.llm_client)
        self.environment = GTVTaskEnvironment()
        self.adapter = OnlineAdapter(
            playbook=self.playbook,
            generator=self.generator,
            reflector=self.reflector,
            curator=self.curator
        )
        self.conversation_history = []
        self.assessment_data = GTVAssessmentData()
    
    def _initialize_gtv_playbook(self) -> Playbook:
        """初始化GTV专业知识库"""
        playbook = Playbook()
        
        # 添加初始知识条目
        initial_bullets = [
            {
                "id": "gtv_overview",
                "content": "GTV (Global Talent Visa) 是英国为吸引全球顶尖人才而设立的签证类别",
                "section": "defaults",
                "helpful": 5,
                "harmful": 0
            },
            {
                "id": "exceptional_talent",
                "content": "Exceptional Talent签证要求申请人在其领域内具有国际认可的杰出成就",
                "section": "guidelines",
                "helpful": 8,
                "harmful": 0
            },
            {
                "id": "exceptional_promise",
                "content": "Exceptional Promise签证面向具有创新潜力和未来贡献能力的专业人士",
                "section": "guidelines",
                "helpful": 7,
                "harmful": 0
            },
            {
                "id": "startup_visa",
                "content": "Startup Visa面向具有创新商业计划的创业者",
                "section": "guidelines",
                "helpful": 6,
                "harmful": 0
            },
            {
                "id": "assessment_criteria",
                "content": "评估标准包括：专业背景、工作经验、教育背景、成就记录、未来贡献潜力",
                "section": "guidelines",
                "helpful": 9,
                "harmful": 0
            }
        ]
        
        for bullet_data in initial_bullets:
            bullet = Bullet(
                id=bullet_data["id"],
                content=bullet_data["content"],
                section=bullet_data["section"],
                helpful=bullet_data["helpful"],
                harmful=bullet_data["harmful"]
            )
            playbook.add_bullet(bullet)
        
        return playbook
    
    def process_question(self, question: str, context: str = "") -> dict:
        """处理用户问题并返回评估结果"""
        try:
            # 创建样本
            sample = Sample(
                question=question,
                context=context,
                ground_truth=self._get_ground_truth(question),
                metadata={
                    "timestamp": datetime.now().isoformat(),
                    "conversation_id": len(self.conversation_history)
                }
            )
            
            # 使用ACE处理
            results = self.adapter.run([sample], self.environment)
            result = results[0] if results else None
            
            if not result:
                return self._create_error_response("处理失败")
            
            # 更新评估数据
            self._update_assessment_data(result)
            
            # 记录对话历史
            self.conversation_history.append({
                "question": question,
                "answer": result.generator_output.final_answer,
                "score": result.environment_result.metrics.get("gtv_score", 0),
                "timestamp": datetime.now().isoformat()
            })
            
            return {
                "success": True,
                "answer": result.generator_output.final_answer,
                "reasoning": result.generator_output.reasoning,
                "score": result.environment_result.metrics.get("gtv_score", 0),
                "feedback": result.environment_result.feedback,
                "assessment_data": self.assessment_data.__dict__,
                "playbook_stats": self.playbook.stats(),
                "evolution_insights": self._extract_evolution_insights(result)
            }
            
        except Exception as e:
            logger.error(f"处理问题时出错: {e}")
            return self._create_error_response(f"处理失败: {str(e)}")
    
    def _get_ground_truth(self, question: str) -> Optional[str]:
        """根据问题获取标准答案"""
        question_lower = question.lower()
        
        if "exceptional talent" in question_lower:
            return "Exceptional Talent签证要求申请人在其领域内具有国际认可的杰出成就，包括获奖记录、专利、发表论文等。"
        elif "exceptional promise" in question_lower:
            return "Exceptional Promise签证面向具有创新潜力和未来贡献能力的专业人士，需要展示未来5-10年的发展计划。"
        elif "startup" in question_lower:
            return "Startup Visa面向具有创新商业计划的创业者，需要获得认可机构的背书。"
        
        return None
    
    def _update_assessment_data(self, result) -> None:
        """更新评估数据"""
        try:
            answer_data = result.generator_output.final_answer
            if isinstance(answer_data, str):
                try:
                    answer_data = json.loads(answer_data)
                except json.JSONDecodeError:
                    answer_data = {"text": answer_data}
            
            if isinstance(answer_data, dict):
                self.assessment_data.name = answer_data.get("name", self.assessment_data.name)
                self.assessment_data.field = answer_data.get("field", self.assessment_data.field)
                self.assessment_data.experience = answer_data.get("experience", self.assessment_data.experience)
                self.assessment_data.education = answer_data.get("education", self.assessment_data.education)
                self.assessment_data.achievements = answer_data.get("achievements", self.assessment_data.achievements)
                self.assessment_data.pathway = answer_data.get("pathway", self.assessment_data.pathway)
                self.assessment_data.current_score = result.environment_result.metrics.get("gtv_score", 0)
        except Exception as e:
            logger.warning(f"更新评估数据时出错: {e}")
    
    def _extract_evolution_insights(self, result) -> dict:
        """提取自我进化的洞察"""
        return {
            "new_bullets_added": len(result.curator_output.delta.operations) if hasattr(result.curator_output, 'delta') else 0,
            "reflection_insights": result.reflection.key_insight if hasattr(result.reflection, 'key_insight') else "",
            "playbook_evolution": {
                "total_bullets": self.playbook.stats()["total_bullets"],
                "helpful_bullets": self.playbook.stats()["helpful_bullets"],
                "harmful_bullets": self.playbook.stats()["harmful_bullets"]
            }
        }
    
    def _create_error_response(self, message: str) -> dict:
        """创建错误响应"""
        return {
            "success": False,
            "error": message,
            "answer": "抱歉，处理您的请求时出现了问题。请稍后重试。",
            "score": 0,
            "feedback": message
        }
    
    def get_playbook_status(self) -> dict:
        """获取知识库状态"""
        return {
            "stats": self.playbook.stats(),
            "playbook_content": self.playbook.as_prompt(),
            "conversation_count": len(self.conversation_history)
        }
    
    def reset_assessment(self) -> None:
        """重置评估"""
        self.assessment_data = GTVAssessmentData()
        self.conversation_history = []
        logger.info("评估已重置")

def main():
    """主函数，用于测试ACE代理"""
    print("🚀 启动GTV ACE自我进化代理...")
    
    # 创建代理
    agent = GTVACEAgent()
    
    # 测试问题
    test_questions = [
        "我想申请GTV Exceptional Talent签证，需要什么条件？",
        "我的背景是AI研发，有5年经验，能申请哪种GTV签证？",
        "GTV签证的评估标准是什么？"
    ]
    
    for question in test_questions:
        print(f"\n❓ 问题: {question}")
        result = agent.process_question(question)
        
        if result["success"]:
            print(f"✅ 回答: {result['answer']}")
            print(f"📊 评分: {result['score']}/100")
            print(f"💡 反馈: {result['feedback']}")
        else:
            print(f"❌ 错误: {result['error']}")
    
    # 显示知识库状态
    print(f"\n📚 知识库状态:")
    status = agent.get_playbook_status()
    print(f"总条目数: {status['stats']['total_bullets']}")
    print(f"有用条目: {status['stats']['helpful_bullets']}")
    print(f"有害条目: {status['stats']['harmful_bullets']}")

if __name__ == "__main__":
    main()
