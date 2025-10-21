#!/usr/bin/env python3
"""
GTV签证评估的ACE自我进化代理 - 带预定义响应版本
"""

import json
import os
import sys
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
from pathlib import Path

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

class GTVAssessmentData:
    """GTV评估数据结构"""
    def __init__(self):
        self.name = ""
        self.field = ""
        self.experience = ""
        self.education = ""
        self.achievements = []
        self.current_score = 0
        self.pathway = ""
        self.eligibility_criteria = {}

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
    
    def __init__(self, llm_client=None, data_dir="data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        self.llm_client = llm_client or self._create_dummy_client()
        self.playbook = self._load_or_initialize_playbook()
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
        self.conversation_history = self._load_conversation_history()
        self.assessment_data = self._load_assessment_data()
    
    def _create_dummy_client(self):
        """创建带有预定义响应的DummyLLMClient"""
        client = DummyLLMClient()
        
        # 预定义生成器响应
        generator_responses = [
            json.dumps({
                "reasoning": "基于GTV Exceptional Talent签证要求，申请人需要在其领域内具有国际认可的杰出成就。",
                "final_answer": "GTV Exceptional Talent签证要求：1) 国际认可的杰出成就 2) 获奖记录或专利 3) 发表论文或作品 4) 行业领导地位 5) 未来贡献潜力",
                "bullet_ids": ["exceptional_talent", "assessment_criteria"]
            }),
            json.dumps({
                "reasoning": "AI研发背景结合5年经验，可以考虑Exceptional Promise签证路径。",
                "final_answer": "基于您的AI研发背景和5年经验，建议申请GTV Exceptional Promise签证。需要展示：1) 创新技术项目 2) 未来5-10年发展计划 3) 对AI领域的贡献潜力",
                "bullet_ids": ["exceptional_promise", "assessment_criteria"]
            }),
            json.dumps({
                "reasoning": "GTV签证评估标准包括多个维度的综合评估。",
                "final_answer": "GTV签证评估标准：1) 专业背景匹配度 2) 工作经验相关性 3) 教育背景质量 4) 成就记录重要性 5) 未来贡献潜力 6) 创新性和影响力",
                "bullet_ids": ["assessment_criteria", "gtv_overview"]
            }),
            # 添加更多响应
            json.dumps({
                "reasoning": "用户询问测试问题，需要提供基本的GTV签证信息。",
                "final_answer": "欢迎使用GTV签证评估系统！我是您的AI评估助手，可以帮您分析GTV签证申请条件。请告诉我您的专业背景、工作经验和具体问题。",
                "bullet_ids": ["welcome", "gtv_overview"]
            }),
            json.dumps({
                "reasoning": "研发总监在AI领域具有领导地位，符合GTV Exceptional Talent签证要求。",
                "final_answer": "作为AI领域的研发总监，您具备申请GTV Exceptional Talent签证的潜力。建议重点展示：1) 团队领导经验 2) 技术创新成果 3) 行业影响力 4) 未来发展规划",
                "bullet_ids": ["exceptional_talent", "leadership", "ai_field"]
            }),
            json.dumps({
                "reasoning": "需要提供更详细的GTV签证申请指导。",
                "final_answer": "GTV签证申请需要准备：1) 详细简历 2) 成就证明材料 3) 推荐信 4) 未来计划书 5) 相关证书和奖项。建议咨询专业移民律师获得更详细的指导。",
                "bullet_ids": ["application_guide", "documentation"]
            })
        ]
        
        # 预定义反思器响应
        reflector_responses = [
            json.dumps({
                "reasoning": "回答准确且全面，符合GTV Exceptional Talent签证要求。",
                "error_identification": "无明显错误",
                "root_cause_analysis": "回答质量良好",
                "correct_approach": "继续使用当前方法",
                "key_insight": "GTV Exceptional Talent签证需要国际认可的杰出成就",
                "bullet_tags": [{"id": "exceptional_talent", "tag": "helpful"}]
            }),
            json.dumps({
                "reasoning": "回答针对性强，为AI研发背景提供了合适的建议。",
                "error_identification": "无错误",
                "root_cause_analysis": "回答符合用户背景",
                "correct_approach": "建议路径正确",
                "key_insight": "AI研发人员适合Exceptional Promise路径",
                "bullet_tags": [{"id": "exceptional_promise", "tag": "helpful"}]
            }),
            json.dumps({
                "reasoning": "回答全面覆盖了GTV评估的各个维度。",
                "error_identification": "无错误",
                "root_cause_analysis": "回答完整",
                "correct_approach": "评估标准清晰",
                "key_insight": "GTV评估需要多维度综合考量",
                "bullet_tags": [{"id": "assessment_criteria", "tag": "helpful"}]
            }),
            # 添加更多反思器响应
            json.dumps({
                "reasoning": "欢迎回答友好且信息丰富，为用户提供了良好的开始体验。",
                "error_identification": "无错误",
                "root_cause_analysis": "回答恰当",
                "correct_approach": "保持友好和专业",
                "key_insight": "用户需要清晰的指导来开始评估过程",
                "bullet_tags": [{"id": "welcome", "tag": "helpful"}]
            }),
            json.dumps({
                "reasoning": "对研发总监背景的分析准确，提供了针对性的建议。",
                "error_identification": "无错误",
                "root_cause_analysis": "分析深入",
                "correct_approach": "继续提供针对性建议",
                "key_insight": "领导经验是GTV申请的重要优势",
                "bullet_tags": [{"id": "leadership", "tag": "helpful"}]
            }),
            json.dumps({
                "reasoning": "申请指导详细且实用，帮助用户了解具体步骤。",
                "error_identification": "无错误",
                "root_cause_analysis": "指导全面",
                "correct_approach": "提供具体可操作的建议",
                "key_insight": "用户需要详细的申请流程指导",
                "bullet_tags": [{"id": "application_guide", "tag": "helpful"}]
            })
        ]
        
        # 预定义策展人响应
        curator_responses = [
            json.dumps({
                "operations": [
                    {
                        "type": "ADD",
                        "section": "examples",
                        "content": "GTV Exceptional Talent签证需要国际认可的杰出成就，如获奖记录、专利、发表论文等",
                        "metadata": {"helpful": 1}
                    }
                ]
            }),
            json.dumps({
                "operations": [
                    {
                        "type": "ADD",
                        "section": "examples",
                        "content": "AI研发人员适合申请GTV Exceptional Promise签证，需要展示创新技术项目和未来贡献潜力",
                        "metadata": {"helpful": 1}
                    }
                ]
            }),
            json.dumps({
                "operations": [
                    {
                        "type": "ADD",
                        "section": "guidelines",
                        "content": "GTV评估需要从专业背景、工作经验、教育背景、成就记录、未来贡献潜力等多个维度综合考量",
                        "metadata": {"helpful": 1}
                    }
                ]
            }),
            # 添加更多策展人响应
            json.dumps({
                "operations": [
                    {
                        "type": "ADD",
                        "section": "welcome",
                        "content": "欢迎用户使用GTV签证评估系统，提供友好的开始体验",
                        "metadata": {"helpful": 1}
                    }
                ]
            }),
            json.dumps({
                "operations": [
                    {
                        "type": "ADD",
                        "section": "leadership",
                        "content": "研发总监等领导职位在GTV申请中具有优势，需要重点展示团队管理和技术创新能力",
                        "metadata": {"helpful": 1}
                    }
                ]
            }),
            json.dumps({
                "operations": [
                    {
                        "type": "ADD",
                        "section": "application_guide",
                        "content": "GTV签证申请需要准备详细材料，包括简历、成就证明、推荐信等，建议咨询专业律师",
                        "metadata": {"helpful": 1}
                    }
                ]
            })
        ]
        
        # 添加所有响应到客户端，并重复多次以确保有足够的响应
        all_responses = generator_responses + reflector_responses + curator_responses
        
        # 重复添加响应以确保有足够的响应
        for _ in range(10):  # 重复10次
            for response in all_responses:
                client.queue(response)
        
        return client
    
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
            playbook.add_bullet(
                section=bullet_data["section"],
                content=bullet_data["content"],
                bullet_id=bullet_data["id"],
                metadata={
                    "helpful": bullet_data["helpful"],
                    "harmful": bullet_data["harmful"]
                }
            )
        
        return playbook
    
    def _load_or_initialize_playbook(self) -> Playbook:
        """加载或初始化知识库"""
        playbook_file = self.data_dir / "playbook.json"
        
        if playbook_file.exists():
            try:
                with open(playbook_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                playbook = Playbook.from_dict(data)
                logger.info(f"已加载知识库，包含 {len(playbook.bullets())} 个条目")
                return playbook
            except Exception as e:
                logger.error(f"加载知识库失败: {e}")
        
        # 如果加载失败，初始化新的知识库
        return self._initialize_gtv_playbook()
    
    def _save_playbook(self) -> None:
        """保存知识库"""
        try:
            playbook_file = self.data_dir / "playbook.json"
            with open(playbook_file, 'w', encoding='utf-8') as f:
                json.dump(self.playbook.to_dict(), f, ensure_ascii=False, indent=2)
            logger.info("知识库已保存")
        except Exception as e:
            logger.error(f"保存知识库失败: {e}")
    
    def _load_conversation_history(self) -> List[Dict]:
        """加载对话历史"""
        history_file = self.data_dir / "conversation_history.json"
        
        if history_file.exists():
            try:
                with open(history_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"加载对话历史失败: {e}")
        
        return []
    
    def _save_conversation_history(self) -> None:
        """保存对话历史"""
        try:
            history_file = self.data_dir / "conversation_history.json"
            with open(history_file, 'w', encoding='utf-8') as f:
                json.dump(self.conversation_history, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存对话历史失败: {e}")
    
    def _load_assessment_data(self) -> GTVAssessmentData:
        """加载评估数据"""
        assessment_file = self.data_dir / "assessment_data.json"
        
        if assessment_file.exists():
            try:
                with open(assessment_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                return GTVAssessmentData(**data)
            except Exception as e:
                logger.error(f"加载评估数据失败: {e}")
        
        return GTVAssessmentData()
    
    def _save_assessment_data(self) -> None:
        """保存评估数据"""
        try:
            assessment_file = self.data_dir / "assessment_data.json"
            with open(assessment_file, 'w', encoding='utf-8') as f:
                json.dump(self.assessment_data.__dict__, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存评估数据失败: {e}")
    
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
                logger.error("ACE适配器没有返回结果")
                return self._create_error_response("处理失败")
            
            # 检查结果的有效性
            if not hasattr(result, 'generator_output') or not hasattr(result.generator_output, 'final_answer'):
                logger.error(f"ACE结果格式无效: {result}")
                # 使用回退响应
                fallback_response = self._get_fallback_response(question)
                return {
                    "success": True,
                    "answer": fallback_response,
                    "reasoning": "使用回退响应",
                    "score": 75,
                    "feedback": "基于您的背景，GTV评估得分为75分。",
                    "assessment_data": self.assessment_data.__dict__,
                    "playbook_stats": self.playbook.stats(),
                    "evolution_insights": {"fallback_used": True}
                }
            
            # 更新评估数据
            self._update_assessment_data(result)
            
            # 记录对话历史
            self.conversation_history.append({
                "question": question,
                "answer": result.generator_output.final_answer,
                "score": result.environment_result.metrics.get("gtv_score", 0),
                "timestamp": datetime.now().isoformat()
            })
            
            # 自动保存数据
            self._save_playbook()
            self._save_conversation_history()
            self._save_assessment_data()
            
            # 返回结构化的知识和推理结果，而不是直接回复
            return {
                "success": True,
                "knowledge_base": {
                    "relevant_bullets": self._get_relevant_bullets(question),
                    "playbook_stats": self.playbook.stats(),
                    "evolution_insights": self._extract_evolution_insights(result)
                },
                "reasoning": {
                    "ace_reasoning": result.generator_output.reasoning,
                    "score": result.environment_result.metrics.get("gtv_score", 0),
                    "feedback": result.environment_result.feedback,
                    "assessment_data": self.assessment_data.__dict__
                },
                "context": {
                    "question": question,
                    "user_context": context,
                    "conversation_history": self.conversation_history[-5:]  # 最近5条对话
                }
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
    
    def _get_relevant_bullets(self, question: str) -> List[Dict]:
        """根据问题获取相关的知识条目"""
        question_lower = question.lower()
        relevant_bullets = []
        
        # 简单的关键词匹配逻辑
        keywords = {
            "exceptional talent": ["exceptional_talent", "gtv_overview"],
            "exceptional promise": ["exceptional_promise", "gtv_overview"],
            "startup": ["startup_visa", "gtv_overview"],
            "评估": ["assessment_criteria", "exceptional_talent", "exceptional_promise"],
            "要求": ["assessment_criteria", "exceptional_talent", "exceptional_promise"],
            "申请": ["assessment_criteria", "gtv_overview"],
            "签证": ["gtv_overview", "exceptional_talent", "exceptional_promise", "startup_visa"]
        }
        
        matched_ids = set()
        for keyword, bullet_ids in keywords.items():
            if keyword in question_lower:
                matched_ids.update(bullet_ids)
        
        # 如果没有匹配到关键词，返回所有条目
        if not matched_ids:
            matched_ids = set(bullet.id for bullet in self.playbook.bullets())
        
        # 获取匹配的条目
        for bullet in self.playbook.bullets():
            if bullet.id in matched_ids:
                relevant_bullets.append({
                    "id": bullet.id,
                    "section": bullet.section,
                    "content": bullet.content,
                    "helpful": bullet.helpful,
                    "harmful": bullet.harmful,
                    "neutral": bullet.neutral
                })
        
        return relevant_bullets
    
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
                "total_bullets": self.playbook.stats()["bullets"],
                "helpful_bullets": self.playbook.stats()["tags"]["helpful"],
                "harmful_bullets": self.playbook.stats()["tags"]["harmful"]
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
    
    def _get_fallback_response(self, question: str) -> str:
        """获取回退响应"""
        question_lower = question.lower()
        
        if "test" in question_lower or "测试" in question_lower:
            return "欢迎使用GTV签证评估系统！我是您的AI评估助手，可以帮您分析GTV签证申请条件。请告诉我您的专业背景、工作经验和具体问题。"
        elif "研发" in question_lower and "总监" in question_lower:
            return "作为AI领域的研发总监，您具备申请GTV Exceptional Talent签证的潜力。建议重点展示：1) 团队领导经验 2) 技术创新成果 3) 行业影响力 4) 未来发展规划"
        elif "ai" in question_lower or "人工智能" in question_lower:
            return "AI领域是GTV签证的热门申请领域。建议申请GTV Exceptional Promise签证，需要展示：1) 创新技术项目 2) 未来5-10年发展计划 3) 对AI领域的贡献潜力"
        else:
            return "GTV Exceptional Talent签证要求：1) 国际认可的杰出成就 2) 获奖记录或专利 3) 发表论文或作品 4) 行业领导地位 5) 未来贡献潜力"
    
    def get_playbook_status(self) -> dict:
        """获取知识库状态"""
        stats = self.playbook.stats()
        return {
            "stats": stats,
            "playbook_content": self.playbook.as_prompt(),
            "conversation_count": len(self.conversation_history)
        }
    
    def get_all_bullets(self) -> List[Dict]:
        """获取所有知识条目"""
        bullets = []
        for bullet in self.playbook.bullets():
            bullets.append({
                "id": bullet.id,
                "section": bullet.section,
                "content": bullet.content,
                "helpful": bullet.helpful,
                "harmful": bullet.harmful,
                "neutral": bullet.neutral,
                "created_at": bullet.created_at,
                "updated_at": bullet.updated_at
            })
        return bullets
    
    def add_bullet_manual(self, section: str, content: str, bullet_id: str = None) -> Dict:
        """手动添加知识条目"""
        try:
            bullet = self.playbook.add_bullet(
                section=section,
                content=content,
                bullet_id=bullet_id
            )
            self._save_playbook()
            return {
                "success": True,
                "bullet": {
                    "id": bullet.id,
                    "section": bullet.section,
                    "content": bullet.content,
                    "helpful": bullet.helpful,
                    "harmful": bullet.harmful,
                    "neutral": bullet.neutral
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def update_bullet_manual(self, bullet_id: str, content: str = None, section: str = None) -> Dict:
        """手动更新知识条目"""
        try:
            bullet = self.playbook.get_bullet(bullet_id)
            if not bullet:
                return {"success": False, "error": "知识条目不存在"}
            
            if content:
                bullet.content = content
            if section:
                bullet.section = section
            
            bullet.updated_at = datetime.now().isoformat()
            self._save_playbook()
            
            return {
                "success": True,
                "bullet": {
                    "id": bullet.id,
                    "section": bullet.section,
                    "content": bullet.content,
                    "helpful": bullet.helpful,
                    "harmful": bullet.harmful,
                    "neutral": bullet.neutral
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def delete_bullet_manual(self, bullet_id: str) -> Dict:
        """手动删除知识条目"""
        try:
            bullet = self.playbook.get_bullet(bullet_id)
            if not bullet:
                return {"success": False, "error": "知识条目不存在"}
            
            self.playbook.remove_bullet(bullet_id)
            self._save_playbook()
            
            return {"success": True, "message": "知识条目已删除"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def reset_playbook(self) -> Dict:
        """重置知识库"""
        try:
            self.playbook = self._initialize_gtv_playbook()
            self.conversation_history = []
            self.assessment_data = GTVAssessmentData()
            
            self._save_playbook()
            self._save_conversation_history()
            self._save_assessment_data()
            
            return {"success": True, "message": "知识库已重置"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
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
            print(f"🧠 推理: {result['reasoning']}")
        else:
            print(f"❌ 错误: {result['error']}")
    
    # 显示知识库状态
    print(f"\n📚 知识库状态:")
    status = agent.get_playbook_status()
    stats = status['stats']
    print(f"总条目数: {stats['bullets']}")
    print(f"有用条目: {stats['tags']['helpful']}")
    print(f"有害条目: {stats['tags']['harmful']}")
    print(f"对话次数: {status['conversation_count']}")

if __name__ == "__main__":
    main()
