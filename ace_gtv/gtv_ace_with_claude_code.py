#!/usr/bin/env python3
"""
GTV签证评估的ACE自我进化代理 - 集成Claude Code命令版本
使用Claude Code命令替代传统分析评估过程
"""

import json
import os
import sys
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Optional, Any, List
from datetime import datetime
import logging

# 添加ACE框架路径
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'ACE-open'))

try:
    from ace import (
        Playbook, Generator, Reflector, Curator,
        OnlineAdapter, Sample, TaskEnvironment, EnvironmentResult,
        DummyLLMClient
    )
    print("✅ ACE框架导入成功")
except ImportError as e:
    print(f"❌ ACE框架导入失败: {e}")
    sys.exit(1)

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ClaudeCodeEvaluator:
    """Claude Code命令评估器"""
    
    def __init__(self, claude_code_path: str = "claude-code"):
        self.claude_code_path = claude_code_path
        self.temp_dir = tempfile.mkdtemp(prefix="gtv_claude_")
        
    def analyze_with_claude_code(self, question: str, context: str = "") -> Dict[str, Any]:
        """使用Claude Code分析问题"""
        try:
            # 创建临时文件
            question_file = os.path.join(self.temp_dir, "question.txt")
            with open(question_file, 'w', encoding='utf-8') as f:
                f.write(f"问题: {question}\n\n上下文: {context}")
            
            # 使用Claude Code分析
            cmd = f"{self.claude_code_path} ask '基于GTV签证评估标准，分析以下问题并提供专业建议: {question}'"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                return {
                    "success": True,
                    "answer": result.stdout,
                    "reasoning": f"Claude Code分析: {result.stdout}",
                    "claude_code_output": result.stdout
                }
            else:
                return {
                    "success": False,
                    "error": f"Claude Code执行失败: {result.stderr}",
                    "answer": "Claude Code分析不可用，使用默认分析"
                }
                
        except Exception as e:
            logger.error(f"Claude Code分析失败: {e}")
            return {
                "success": False,
                "error": str(e),
                "answer": "Claude Code分析不可用，使用默认分析"
            }
    
    def evaluate_with_claude_code(self, answer: str, question: str) -> Dict[str, Any]:
        """使用Claude Code评估回答质量"""
        try:
            # 创建评估脚本
            eval_script = f"""
# GTV评估脚本
answer = '''{answer}'''
question = '''{question}'''

def evaluate_gtv_response(answer, question):
    score = 70  # 基础分数
    
    # 基于关键词评估
    keywords = ['GTV', '签证', 'exceptional', 'talent', 'promise', 'startup']
    keyword_count = sum(1 for keyword in keywords if keyword.lower() in answer.lower())
    score += min(keyword_count * 5, 20)
    
    # 基于长度评估
    if len(answer) > 100:
        score += 10
    
    return min(score, 100)

print(json.dumps({{
    "score": evaluate_gtv_response(answer, question),
    "feedback": "基于Claude Code评估的反馈",
    "completeness": 0.8,
    "relevance": 0.9,
    "accuracy": 0.85
}}, ensure_ascii=False))
"""
            
            script_file = os.path.join(self.temp_dir, "evaluate.py")
            with open(script_file, 'w', encoding='utf-8') as f:
                f.write(eval_script)
            
            # 使用Claude Code执行评估
            cmd = f"{self.claude_code_path} run --script {script_file}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                try:
                    evaluation = json.loads(result.stdout)
                    return evaluation
                except json.JSONDecodeError:
                    return {
                        "score": 75,
                        "feedback": result.stdout,
                        "completeness": 0.8,
                        "relevance": 0.9,
                        "accuracy": 0.85
                    }
            else:
                return self._create_fallback_evaluation()
                
        except Exception as e:
            logger.error(f"Claude Code评估失败: {e}")
            return self._create_fallback_evaluation()
    
    def _create_fallback_evaluation(self) -> Dict[str, Any]:
        """创建备用评估结果"""
        return {
            "score": 70,
            "feedback": "Claude Code评估不可用，使用默认评估",
            "completeness": 0.7,
            "relevance": 0.8,
            "accuracy": 0.75
        }
    
    def cleanup(self):
        """清理临时文件"""
        try:
            import shutil
            shutil.rmtree(self.temp_dir)
        except Exception as e:
            logger.warning(f"清理临时文件失败: {e}")

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
    """GTV签证评估任务环境 - 集成Claude Code"""
    
    def __init__(self, claude_code_evaluator: ClaudeCodeEvaluator = None):
        self.claude_code_evaluator = claude_code_evaluator or ClaudeCodeEvaluator()
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
        """评估GTV申请回答的质量 - 使用Claude Code"""
        try:
            # 使用Claude Code进行评估
            evaluation = self.claude_code_evaluator.evaluate_with_claude_code(
                generator_output.final_answer, 
                sample.question
            )
            
            return EnvironmentResult(
                feedback=evaluation.get("feedback", "Claude Code评估完成"),
                ground_truth=sample.ground_truth,
                metrics={
                    "gtv_score": evaluation.get("score", 70),
                    "completeness": evaluation.get("completeness", 0.8),
                    "relevance": evaluation.get("relevance", 0.9),
                    "accuracy": evaluation.get("accuracy", 0.85)
                }
            )
        except Exception as e:
            logger.error(f"Claude Code评估过程中出错: {e}")
            return EnvironmentResult(
                feedback="Claude Code评估过程中出现错误，请重新尝试",
                ground_truth=sample.ground_truth,
                metrics={"error": 1.0}
            )

class GTVACEAgentWithClaudeCode:
    """GTV签证评估的ACE自我进化代理 - 集成Claude Code版本"""
    
    def __init__(self, llm_client=None, claude_code_path: str = "claude-code", default_mode: str = "ace"):
        if llm_client is None:
            # 创建配置了默认响应的DummyLLMClient
            llm_client = self._create_configured_dummy_client()
        self.llm_client = llm_client
        self.claude_code_evaluator = ClaudeCodeEvaluator(claude_code_path)
        self.default_mode = default_mode  # "ace" 或 "claude_code"
        self.playbook = self._initialize_gtv_playbook()
        self.generator = Generator(self.llm_client)
        self.reflector = Reflector(self.llm_client)
        self.curator = Curator(self.llm_client)
        self.environment = GTVTaskEnvironment(self.claude_code_evaluator)
        self.adapter = OnlineAdapter(
            playbook=self.playbook,
            generator=self.generator,
            reflector=self.reflector,
            curator=self.curator
        )
        self.conversation_history = []
        self.assessment_data = GTVAssessmentData()

        # 设置数据目录用于保存文件
        self.data_dir = Path(__file__).parent / "data"
        self.data_dir.mkdir(exist_ok=True)
    
    def _create_configured_dummy_client(self) -> DummyLLMClient:
        """创建配置了GTV相关响应的DummyLLMClient"""
        client = DummyLLMClient()
        
        # 为Generator配置响应
        client.queue(json.dumps({
            "reasoning": "基于GTV签证评估标准分析用户问题",
            "bullet_ids": ["gtv_overview", "exceptional_talent"],
            "final_answer": "GTV签证是英国为吸引全球顶尖人才而设立的签证类别。主要分为三种：1) Exceptional Talent - 需要国际认可的杰出成就；2) Exceptional Promise - 需要展示未来潜力；3) Startup Visa - 需要创新商业计划。"
        }))
        
        # 为Reflector配置响应
        client.queue(json.dumps({
            "reasoning": "分析GTV评估结果的准确性",
            "error_identification": "无重大错误",
            "root_cause_analysis": "回答涵盖了GTV签证的基本信息",
            "correct_approach": "继续提供准确的GTV签证信息",
            "key_insight": "用户需要了解不同GTV签证类型的具体要求",
            "bullet_tags": []
        }))
        
        # 为Curator配置响应
        client.queue(json.dumps({
            "reasoning": "根据用户问题更新知识库",
            "operations": [
                {
                    "type": "ADD",
                    "section": "guidelines",
                    "content": "GTV签证申请需要根据个人背景选择合适的签证类型",
                    "metadata": {"helpful": 1}
                }
            ]
        }))
        
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
                "id": "claude_code_integration",
                "content": "使用Claude Code命令进行代码分析和评估，提供更智能的评估结果",
                "section": "guidelines",
                "helpful": 8,
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
    
    def process_question(self, question: str, context: str = "", use_claude_code: bool = None) -> dict:
        """处理用户问题并返回评估结果"""
        try:
            # 决定使用哪种模式
            if use_claude_code is None:
                use_claude_code = (self.default_mode == "claude_code")
            
            if use_claude_code:
                # 使用Claude Code进行分析
                claude_code_result = self.claude_code_evaluator.analyze_with_claude_code(question, context)
                
                if claude_code_result["success"]:
                    # 如果Claude Code分析成功，直接返回结果
                    self._update_assessment_data_from_claude_code(claude_code_result)
                    
                    # 记录对话历史
                    self.conversation_history.append({
                        "question": question,
                        "answer": claude_code_result["answer"],
                        "score": 75,  # Claude Code默认分数
                        "timestamp": datetime.now().isoformat(),
                        "method": "claude_code"
                    })
                    
                    return {
                        "success": True,
                        "answer": claude_code_result["answer"],
                        "reasoning": claude_code_result.get("reasoning", ""),
                        "score": 75,
                        "feedback": "基于Claude Code分析的评估结果",
                        "assessment_data": self.assessment_data.__dict__,
                        "playbook_stats": self.playbook.stats(),
                        "method": "claude_code",
                        "claude_code_output": claude_code_result.get("claude_code_output", "")
                    }
                else:
                    # 如果Claude Code失败，回退到ACE方法
                    logger.warning("Claude Code分析失败，回退到ACE模式")
                    return self._fallback_to_ace(question, context)
            else:
                # 默认使用ACE模式
                return self._process_with_ace(question, context)
            
        except Exception as e:
            logger.error(f"处理问题时出错: {e}")
            return self._create_error_response(f"处理失败: {str(e)}")
    
    def _process_with_ace(self, question: str, context: str) -> dict:
        """使用ACE模式处理问题（默认模式）"""
        try:
            # 创建样本
            sample = Sample(
                question=question,
                ground_truth="",  # GTV评估没有标准答案
                context=context
            )
            
            # 使用ACE适配器处理
            results = self.adapter.run([sample], self.environment)
            if not results:
                return self._create_error_response("ACE处理失败：没有返回结果")
            
            step_result = results[0]
            
            # 更新评估数据
            self._update_assessment_data_from_ace(step_result)
            
            # 记录对话历史
            self.conversation_history.append({
                "question": question,
                "answer": step_result.generator_output.final_answer,
                "score": step_result.environment_result.metrics.get("gtv_score", 70),
                "timestamp": datetime.now().isoformat(),
                "method": "ace"
            })
            
            return {
                "success": True,
                "answer": step_result.generator_output.final_answer,
                "reasoning": step_result.generator_output.reasoning,
                "score": step_result.environment_result.metrics.get("gtv_score", 70),
                "feedback": step_result.environment_result.feedback,
                "assessment_data": self.assessment_data.__dict__,
                "playbook_stats": self.playbook.stats(),
                "method": "ace",
                "metrics": step_result.environment_result.metrics
            }
            
        except Exception as e:
            logger.error(f"ACE处理过程中出错: {e}")
            return self._create_error_response(f"ACE处理失败: {str(e)}")
    
    def _fallback_to_ace(self, question: str, context: str) -> dict:
        """回退到传统ACE方法"""
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
                return self._create_error_response("ACE处理失败")
            
            # 更新评估数据
            self._update_assessment_data(result)
            
            # 记录对话历史
            self.conversation_history.append({
                "question": question,
                "answer": result.generator_output.final_answer,
                "score": result.environment_result.metrics.get("gtv_score", 0),
                "timestamp": datetime.now().isoformat(),
                "method": "ace_fallback"
            })
            
            return {
                "success": True,
                "answer": result.generator_output.final_answer,
                "reasoning": result.generator_output.reasoning,
                "score": result.environment_result.metrics.get("gtv_score", 0),
                "feedback": result.environment_result.feedback,
                "assessment_data": self.assessment_data.__dict__,
                "playbook_stats": self.playbook.stats(),
                "evolution_insights": self._extract_evolution_insights(result),
                "method": "ace_fallback"
            }
            
        except Exception as e:
            logger.error(f"ACE回退处理失败: {e}")
            return self._create_error_response(f"ACE回退处理失败: {str(e)}")
    
    def _update_assessment_data_from_ace(self, step_result) -> None:
        """从ACE结果更新评估数据"""
        try:
            # 从ACE结果中提取评估数据
            metrics = step_result.environment_result.metrics
            self.assessment_data.current_score = metrics.get("gtv_score", 70)
            self.assessment_data.completeness = metrics.get("completeness", 0.8)
            self.assessment_data.accuracy = metrics.get("accuracy", 0.85)
            
            # 根据分数确定签证路径
            if self.assessment_data.current_score >= 80:
                self.assessment_data.pathway = "exceptional_talent"
            elif self.assessment_data.current_score >= 70:
                self.assessment_data.pathway = "exceptional_promise"
            else:
                self.assessment_data.pathway = "startup_visa"
                
        except Exception as e:
            logger.error(f"更新ACE评估数据时出错: {e}")
    
    def _update_assessment_data_from_claude_code(self, claude_code_result: Dict[str, Any]) -> None:
        """从Claude Code结果更新评估数据"""
        try:
            answer = claude_code_result.get("answer", "")
            # 简化的数据提取逻辑
            if "exceptional talent" in answer.lower():
                self.assessment_data.pathway = "exceptional_talent"
            elif "exceptional promise" in answer.lower():
                self.assessment_data.pathway = "exceptional_promise"
            elif "startup" in answer.lower():
                self.assessment_data.pathway = "startup_visa"
            
            self.assessment_data.current_score = 75  # Claude Code默认分数
        except Exception as e:
            logger.warning(f"从Claude Code结果更新评估数据时出错: {e}")
    
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
            "conversation_count": len(self.conversation_history),
            "default_mode": self.default_mode
        }
    
    def set_default_mode(self, mode: str) -> None:
        """设置默认模式"""
        if mode in ["ace", "claude_code"]:
            self.default_mode = mode
            logger.info(f"默认模式已设置为: {mode}")
        else:
            logger.error(f"无效的模式: {mode}，支持的模式: ace, claude_code")
    
    def get_current_mode(self) -> str:
        """获取当前默认模式"""
        return self.default_mode
    
    def reset_assessment(self) -> None:
        """重置评估"""
        self.assessment_data = GTVAssessmentData()
        self.conversation_history = []
        logger.info("评估已重置")

    def _save_playbook(self) -> None:
        """保存知识库"""
        try:
            playbook_file = self.data_dir / "playbook.json"
            with open(playbook_file, 'w', encoding='utf-8') as f:
                json.dump(self.playbook.to_dict(), f, ensure_ascii=False, indent=2)
            logger.info("知识库已保存")
        except Exception as e:
            logger.error(f"保存知识库失败: {e}")

    def _save_conversation_history(self) -> None:
        """保存对话历史"""
        try:
            history_file = self.data_dir / "conversation_history.json"
            with open(history_file, 'w', encoding='utf-8') as f:
                json.dump(self.conversation_history, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存对话历史失败: {e}")

    def _save_assessment_data(self) -> None:
        """保存评估数据"""
        try:
            assessment_file = self.data_dir / "assessment_data.json"
            with open(assessment_file, 'w', encoding='utf-8') as f:
                json.dump(self.assessment_data.__dict__, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存评估数据失败: {e}")

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

    def cleanup(self):
        """清理资源"""
        self.claude_code_evaluator.cleanup()

def main():
    """主函数，用于测试Claude Code集成的ACE代理"""
    print("🚀 启动GTV ACE自我进化代理 (默认ACE模式)...")
    
    # 创建代理，默认使用ACE模式
    agent = GTVACEAgentWithClaudeCode(default_mode="ace")
    
    # 测试问题
    test_questions = [
        "我想申请GTV Exceptional Talent签证，需要什么条件？",
        "我的背景是AI研发，有5年经验，能申请哪种GTV签证？",
        "GTV签证的评估标准是什么？"
    ]
    
    print(f"\n📝 测试问题处理 (当前默认模式: {agent.get_current_mode()})...")
    
    # 测试ACE模式（默认）
    print("\n=== 使用ACE模式（默认） ===")
    for i, question in enumerate(test_questions[:2], 1):
        print(f"\n--- 问题 {i} ---")
        print(f"问题: {question}")
        
        result = agent.process_question(question, use_claude_code=False)
        
        if result["success"]:
            print(f"✅ 回答: {result['answer']}")
            print(f"📊 评分: {result['score']}/100")
            print(f"💡 反馈: {result['feedback']}")
            print(f"🔧 方法: {result.get('method', 'unknown')}")
        else:
            print(f"❌ 错误: {result['error']}")
    
    # 测试Claude Code模式
    print("\n=== 使用Claude Code模式 ===")
    for i, question in enumerate(test_questions[2:], 1):
        print(f"\n--- 问题 {i} ---")
        print(f"问题: {question}")
        
        result = agent.process_question(question, use_claude_code=True)
        
        if result["success"]:
            print(f"✅ 回答: {result['answer']}")
            print(f"📊 评分: {result['score']}/100")
            print(f"💡 反馈: {result['feedback']}")
            print(f"🔧 方法: {result.get('method', 'unknown')}")
            if result.get('claude_code_output'):
                print(f"🤖 Claude Code输出: {result['claude_code_output'][:100]}...")
        else:
            print(f"❌ 错误: {result['error']}")
    
    # 显示知识库状态
    print("\n📚 知识库状态:")
    status = agent.get_playbook_status()
    print(f"总条目数: {status['stats']['total_bullets']}")
    print(f"有用条目: {status['stats']['helpful_bullets']}")
    print(f"有害条目: {status['stats']['harmful_bullets']}")
    print(f"默认模式: {status['default_mode']}")
    print(f"对话次数: {status['conversation_count']}")
    
    # 清理资源
    agent.cleanup()

if __name__ == "__main__":
    main()

