#!/usr/bin/env python3
"""
Claude Code命令集成到GTV评估系统
使用Claude Code命令替代传统分析评估过程
"""

import subprocess
import json
import os
import tempfile
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ClaudeCodeEvaluator:
    """使用Claude Code命令进行GTV评估的类"""
    
    def __init__(self, claude_code_path: str = "claude-code"):
        self.claude_code_path = claude_code_path
        self.temp_dir = tempfile.mkdtemp(prefix="gtv_claude_")
        
    def analyze_resume_with_claude_code(self, resume_text: str, candidate_info: Dict[str, Any]) -> Dict[str, Any]:
        """使用Claude Code分析简历"""
        try:
            # 创建临时文件
            resume_file = os.path.join(self.temp_dir, "resume.txt")
            with open(resume_file, 'w', encoding='utf-8') as f:
                f.write(resume_text)
            
            # 使用Claude Code分析简历
            analysis_commands = [
                f"{self.claude_code_path} analyze --file {resume_file} --focus 'extract_skills_experience'",
                f"{self.claude_code_path} ask '基于这份简历，分析候选人的专业背景和成就，评估是否符合GTV签证要求'",
                f"{self.claude_code_path} find --pattern 'experience|education|achievement|skill' --context 'resume_analysis'"
            ]
            
            results = {}
            for i, cmd in enumerate(analysis_commands):
                try:
                    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
                    results[f"analysis_step_{i+1}"] = {
                        "command": cmd,
                        "stdout": result.stdout,
                        "stderr": result.stderr,
                        "return_code": result.returncode
                    }
                except subprocess.TimeoutExpired:
                    results[f"analysis_step_{i+1}"] = {
                        "command": cmd,
                        "error": "Command timeout"
                    }
            
            return self._parse_claude_code_results(results, candidate_info)
            
        except Exception as e:
            logger.error(f"Claude Code分析失败: {e}")
            return self._create_fallback_analysis(candidate_info)
    
    def evaluate_gtv_eligibility_with_claude_code(self, extracted_info: Dict[str, Any], field: str) -> Dict[str, Any]:
        """使用Claude Code评估GTV资格"""
        try:
            # 创建评估数据文件
            eval_data_file = os.path.join(self.temp_dir, "evaluation_data.json")
            with open(eval_data_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "candidate_info": extracted_info,
                    "field": field,
                    "evaluation_criteria": self._get_gtv_criteria()
                }, f, ensure_ascii=False, indent=2)
            
            # 使用Claude Code进行评估
            evaluation_commands = [
                f"{self.claude_code_path} ask '基于提供的候选人信息，评估其GTV签证资格，包括Exceptional Talent、Exceptional Promise和Startup Visa的适用性'",
                f"{self.claude_code_path} run --script {eval_data_file} --task 'gtv_evaluation'",
                f"{self.claude_code_path} evaluate --data {eval_data_file} --criteria 'gtv_visa_requirements'"
            ]
            
            results = {}
            for i, cmd in enumerate(evaluation_commands):
                try:
                    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=45)
                    results[f"evaluation_step_{i+1}"] = {
                        "command": cmd,
                        "stdout": result.stdout,
                        "stderr": result.stderr,
                        "return_code": result.returncode
                    }
                except subprocess.TimeoutExpired:
                    results[f"evaluation_step_{i+1}"] = {
                        "command": cmd,
                        "error": "Command timeout"
                    }
            
            return self._parse_evaluation_results(results, extracted_info, field)
            
        except Exception as e:
            logger.error(f"Claude Code评估失败: {e}")
            return self._create_fallback_evaluation(extracted_info, field)
    
    def generate_recommendations_with_claude_code(self, assessment_data: Dict[str, Any]) -> Dict[str, Any]:
        """使用Claude Code生成改进建议"""
        try:
            # 创建建议生成脚本
            script_content = f"""
# GTV签证申请建议生成脚本
candidate_data = {json.dumps(assessment_data, ensure_ascii=False, indent=2)}

def generate_recommendations(data):
    recommendations = []
    
    # 基于当前评分生成建议
    current_score = data.get('current_score', 0)
    
    if current_score < 60:
        recommendations.append("建议提升专业背景和成就记录")
    elif current_score < 80:
        recommendations.append("建议加强国际认可度和行业影响力")
    else:
        recommendations.append("当前背景符合GTV签证要求，建议准备详细申请材料")
    
    return recommendations

print(json.dumps(generate_recommendations(candidate_data), ensure_ascii=False))
"""
            
            script_file = os.path.join(self.temp_dir, "recommendations.py")
            with open(script_file, 'w', encoding='utf-8') as f:
                f.write(script_content)
            
            # 使用Claude Code执行建议生成
            cmd = f"{self.claude_code_path} run --script {script_file} --input {json.dumps(assessment_data)}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                try:
                    recommendations = json.loads(result.stdout)
                    return {
                        "success": True,
                        "recommendations": recommendations,
                        "claude_code_output": result.stdout
                    }
                except json.JSONDecodeError:
                    return {
                        "success": True,
                        "recommendations": [result.stdout],
                        "claude_code_output": result.stdout
                    }
            else:
                return self._create_fallback_recommendations(assessment_data)
                
        except Exception as e:
            logger.error(f"Claude Code建议生成失败: {e}")
            return self._create_fallback_recommendations(assessment_data)
    
    def _parse_claude_code_results(self, results: Dict[str, Any], candidate_info: Dict[str, Any]) -> Dict[str, Any]:
        """解析Claude Code分析结果"""
        extracted_info = {
            "name": candidate_info.get("name", ""),
            "field": candidate_info.get("field", ""),
            "experience": "",
            "education": "",
            "skills": [],
            "achievements": [],
            "claude_code_analysis": results
        }
        
        # 从Claude Code输出中提取信息
        for step, result in results.items():
            if result.get("stdout"):
                stdout = result["stdout"]
                # 这里可以添加更复杂的解析逻辑
                if "experience" in stdout.lower():
                    extracted_info["experience"] = stdout
                elif "education" in stdout.lower():
                    extracted_info["education"] = stdout
                elif "skill" in stdout.lower():
                    extracted_info["skills"].append(stdout)
        
        return extracted_info
    
    def _parse_evaluation_results(self, results: Dict[str, Any], extracted_info: Dict[str, Any], field: str) -> Dict[str, Any]:
        """解析Claude Code评估结果"""
        evaluation = {
            "field": field,
            "exceptional_talent_score": 0,
            "exceptional_promise_score": 0,
            "startup_visa_score": 0,
            "recommended_pathway": "",
            "overall_score": 0,
            "feedback": "",
            "claude_code_evaluation": results
        }
        
        # 从Claude Code输出中提取评估信息
        for step, result in results.items():
            if result.get("stdout"):
                stdout = result["stdout"]
                # 简化的评分提取逻辑
                if "exceptional talent" in stdout.lower():
                    evaluation["exceptional_talent_score"] = 75
                elif "exceptional promise" in stdout.lower():
                    evaluation["exceptional_promise_score"] = 70
                elif "startup" in stdout.lower():
                    evaluation["startup_visa_score"] = 65
                
                evaluation["feedback"] += stdout + "\n"
        
        # 确定推荐路径
        scores = [
            ("exceptional_talent", evaluation["exceptional_talent_score"]),
            ("exceptional_promise", evaluation["exceptional_promise_score"]),
            ("startup_visa", evaluation["startup_visa_score"])
        ]
        best_pathway = max(scores, key=lambda x: x[1])
        evaluation["recommended_pathway"] = best_pathway[0]
        evaluation["overall_score"] = best_pathway[1]
        
        return evaluation
    
    def _get_gtv_criteria(self) -> Dict[str, Any]:
        """获取GTV评估标准"""
        return {
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
    
    def _create_fallback_analysis(self, candidate_info: Dict[str, Any]) -> Dict[str, Any]:
        """创建备用分析结果"""
        return {
            "name": candidate_info.get("name", ""),
            "field": candidate_info.get("field", ""),
            "experience": "Claude Code分析不可用，使用默认分析",
            "education": "需要进一步分析",
            "skills": [],
            "achievements": [],
            "claude_code_analysis": {"error": "Claude Code不可用"}
        }
    
    def _create_fallback_evaluation(self, extracted_info: Dict[str, Any], field: str) -> Dict[str, Any]:
        """创建备用评估结果"""
        return {
            "field": field,
            "exceptional_talent_score": 60,
            "exceptional_promise_score": 55,
            "startup_visa_score": 50,
            "recommended_pathway": "exceptional_promise",
            "overall_score": 55,
            "feedback": "Claude Code评估不可用，使用默认评估",
            "claude_code_evaluation": {"error": "Claude Code不可用"}
        }
    
    def _create_fallback_recommendations(self, assessment_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建备用建议"""
        return {
            "success": True,
            "recommendations": [
                "建议完善专业背景",
                "建议提升国际认可度",
                "建议准备详细申请材料"
            ],
            "claude_code_output": "Claude Code不可用，使用默认建议"
        }
    
    def cleanup(self):
        """清理临时文件"""
        try:
            import shutil
            shutil.rmtree(self.temp_dir)
        except Exception as e:
            logger.warning(f"清理临时文件失败: {e}")

# 使用示例
def main():
    """测试Claude Code集成"""
    evaluator = ClaudeCodeEvaluator()
    
    # 测试简历分析
    resume_text = """
    张三
    软件工程师
    5年AI/ML开发经验
    清华大学计算机科学学士
    发表3篇国际会议论文
    获得2项技术专利
    """
    
    candidate_info = {
        "name": "张三",
        "field": "digital-technology",
        "email": "zhangsan@example.com"
    }
    
    print("🔍 使用Claude Code分析简历...")
    analysis_result = evaluator.analyze_resume_with_claude_code(resume_text, candidate_info)
    print(f"分析结果: {json.dumps(analysis_result, ensure_ascii=False, indent=2)}")
    
    print("\n📊 使用Claude Code评估GTV资格...")
    evaluation_result = evaluator.evaluate_gtv_eligibility_with_claude_code(analysis_result, "digital-technology")
    print(f"评估结果: {json.dumps(evaluation_result, ensure_ascii=False, indent=2)}")
    
    print("\n💡 使用Claude Code生成建议...")
    recommendations = evaluator.generate_recommendations_with_claude_code(evaluation_result)
    print(f"建议: {json.dumps(recommendations, ensure_ascii=False, indent=2)}")
    
    evaluator.cleanup()

if __name__ == "__main__":
    main()
