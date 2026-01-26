#!/usr/bin/env python3
"""
GTV签证文案制作工作流管理
协调项目管理、案例匹配、文档生成的完整流程
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable
from pathlib import Path
import asyncio
from concurrent.futures import ThreadPoolExecutor

from utils.logger_config import setup_module_logger
from services.copywriting_project_manager import CopywritingProjectManager
from services.success_case_library import SuccessCaseLibrary
from agents.copywriting_agent import CopywritingAgent

logger = setup_module_logger("copywriting_workflow", os.getenv("LOG_LEVEL", "INFO"))


class CopywritingWorkflow:
    """文案制作工作流 - 协调整个文案制作流程"""
    
    # 工作流阶段
    WORKFLOW_STAGES = {
        "1_material_collection": {
            "name": "材料收集",
            "description": "收集和上传申请人原始材料",
            "required_actions": ["upload_resume", "upload_certificates", "upload_achievements"],
            "next_stage": "2_material_analysis"
        },
        "2_material_analysis": {
            "name": "材料分析",
            "description": "AI分析原始材料，提取关键信息",
            "required_actions": ["analyze_materials", "generate_profile"],
            "next_stage": "3_case_matching"
        },
        "3_case_matching": {
            "name": "案例匹配",
            "description": "匹配相似成功案例，提供参考",
            "required_actions": ["match_cases", "link_references"],
            "next_stage": "4_draft_generation"
        },
        "4_draft_generation": {
            "name": "文案草稿",
            "description": "AI生成各类文档草稿",
            "required_actions": ["generate_personal_statement", "generate_cv", 
                                "generate_recommendation_letters", "generate_cover_letter"],
            "next_stage": "5_optimization"
        },
        "5_optimization": {
            "name": "文案优化",
            "description": "优化和完善文档内容",
            "required_actions": ["review_documents", "optimize_documents"],
            "next_stage": "6_final_review"
        },
        "6_final_review": {
            "name": "最终审核",
            "description": "最终审核和质量检查",
            "required_actions": ["final_review", "completeness_check"],
            "next_stage": "7_completed"
        },
        "7_completed": {
            "name": "完成",
            "description": "文案制作完成，准备提交",
            "required_actions": [],
            "next_stage": None
        }
    }
    
    def __init__(self, projects_path: str = None, cases_path: str = None):
        """
        初始化工作流管理器
        
        Args:
            projects_path: 项目存储路径
            cases_path: 案例库路径
        """
        self.project_manager = CopywritingProjectManager(projects_path)
        self.case_library = SuccessCaseLibrary(cases_path)
        self.agent = CopywritingAgent()
        
        # 进度回调
        self.progress_callbacks: List[Callable] = []
        
        logger.info("文案工作流管理器初始化完成")
    
    def register_progress_callback(self, callback: Callable):
        """注册进度回调函数"""
        self.progress_callbacks.append(callback)
    
    def _notify_progress(self, project_id: str, stage: str, 
                        action: str, status: str, details: str = None):
        """通知进度更新"""
        progress_info = {
            "project_id": project_id,
            "stage": stage,
            "action": action,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        
        for callback in self.progress_callbacks:
            try:
                callback(progress_info)
            except Exception as e:
                logger.error(f"进度回调失败: {e}")
    
    def start_new_project(self, case_id: str, client_name: str, 
                         visa_type: str = "GTV") -> Dict[str, Any]:
        """
        启动新的文案项目
        
        Args:
            case_id: 案件ID
            client_name: 客户姓名
            visa_type: 签证类型
            
        Returns:
            项目创建结果
        """
        logger.info(f"启动新项目: {client_name} - {visa_type}")
        
        # 创建项目
        result = self.project_manager.create_project(case_id, client_name, visa_type)
        
        if result["success"]:
            project_id = result["project_id"]
            
            # 更新状态为材料收集阶段
            self.project_manager.update_project_status(
                project_id, 
                "1_material_collection",
                "项目创建完成，等待上传材料"
            )
            
            self._notify_progress(
                project_id, 
                "1_material_collection",
                "project_created",
                "completed",
                f"项目 {project_id} 创建成功"
            )
            
            return {
                "success": True,
                "project_id": project_id,
                "project_path": result["project_path"],
                "current_stage": "1_material_collection",
                "message": "项目创建成功，请上传原始材料"
            }
        
        return result
    
    def upload_material(self, project_id: str, category: str, 
                       filename: str, content: str) -> Dict[str, Any]:
        """
        上传材料到项目
        
        Args:
            project_id: 项目ID
            category: 材料类别
            filename: 文件名
            content: 文件内容
            
        Returns:
            上传结果
        """
        result = self.project_manager.upload_raw_material(
            project_id=project_id,
            file_path=None,
            category=category,
            content=content,
            filename=filename
        )
        
        if result["success"]:
            self._notify_progress(
                project_id,
                "1_material_collection",
                "upload_material",
                "completed",
                f"上传材料: {filename}"
            )
        
        return result
    
    def run_material_analysis(self, project_id: str) -> Dict[str, Any]:
        """
        运行材料分析
        
        Args:
            project_id: 项目ID
            
        Returns:
            分析结果
        """
        logger.info(f"开始材料分析: {project_id}")
        
        self._notify_progress(
            project_id,
            "2_material_analysis",
            "analyze_materials",
            "started",
            "开始分析原始材料"
        )
        
        # 获取原始材料
        materials_result = self.project_manager.get_raw_materials(project_id)
        if not materials_result["success"]:
            return materials_result
        
        raw_materials = materials_result["data"]
        
        # 使用Agent分析材料
        analysis_result = self.agent.analyze_raw_materials(raw_materials)
        
        if analysis_result["success"]:
            analysis_data = analysis_result["data"]
            
            # 保存分析报告
            report_content = f"""# 材料分析报告

生成时间: {datetime.now().isoformat()}

## 申请人概况
```json
{json.dumps(analysis_data.get('applicant_profile', {}), ensure_ascii=False, indent=2)}
```

## 教育背景
{json.dumps(analysis_data.get('education', []), ensure_ascii=False, indent=2)}

## 职业亮点
{chr(10).join('- ' + h for h in analysis_data.get('career_highlights', []))}

## 技术成就
{chr(10).join('- ' + a for a in analysis_data.get('technical_achievements', []))}

## 行业认可
{chr(10).join('- ' + r for r in analysis_data.get('industry_recognition', []))}

## GTV证据分析

### Mandatory Criteria
{chr(10).join('- ' + e for e in analysis_data.get('gtv_evidence', {}).get('mandatory_criteria', []))}

### Optional Criteria
{chr(10).join('- ' + e for e in analysis_data.get('gtv_evidence', {}).get('optional_criteria', []))}

## 优势
{chr(10).join('- ' + s for s in analysis_data.get('strengths', []))}

## 不足
{chr(10).join('- ' + w for w in analysis_data.get('weaknesses', []))}

## 建议
{chr(10).join('- ' + r for r in analysis_data.get('recommendations', []))}

## 推荐路径
{analysis_data.get('recommended_pathway', 'N/A')}

## 整体评估
{analysis_data.get('overall_assessment', 'N/A')}
"""
            
            self.project_manager.save_analysis_report(
                project_id,
                "资质评估",
                "材料分析报告.md",
                report_content
            )
            
            # 更新项目状态
            self.project_manager.update_project_status(
                project_id,
                "2_material_analysis",
                "材料分析完成"
            )
            
            self._notify_progress(
                project_id,
                "2_material_analysis",
                "analyze_materials",
                "completed",
                "材料分析完成"
            )
            
            return {
                "success": True,
                "analysis": analysis_data,
                "report_saved": True
            }
        
        return analysis_result
    
    def run_case_matching(self, project_id: str, 
                         applicant_profile: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        运行案例匹配
        
        Args:
            project_id: 项目ID
            applicant_profile: 申请人档案（可选，如果不提供则从分析报告读取）
            
        Returns:
            匹配结果
        """
        logger.info(f"开始案例匹配: {project_id}")
        
        self._notify_progress(
            project_id,
            "3_case_matching",
            "match_cases",
            "started",
            "开始匹配成功案例"
        )
        
        # 如果没有提供档案，尝试从项目读取
        if not applicant_profile:
            project = self.project_manager.get_project(project_id=project_id)
            if project["success"]:
                project_path = Path(project["path"])
                analysis_file = project_path / "02_分析报告" / "资质评估" / "材料分析报告.md"
                # 这里简化处理，实际应该解析文件内容
                applicant_profile = {
                    "industry": "人工智能/机器学习",
                    "experience_level": "高级（5-10年）",
                    "pathway": "Exceptional Talent",
                    "achievements": ["开源项目贡献", "学术论文发表"]
                }
        
        # 匹配案例
        match_result = self.case_library.match_cases(applicant_profile, top_k=3)
        
        if match_result["success"]:
            matched_cases = match_result["data"]
            
            # 链接匹配的案例到项目
            for i, case in enumerate(matched_cases, 1):
                self.project_manager.link_reference_case(
                    project_id,
                    case,
                    case_number=i
                )
            
            # 保存案例匹配报告
            match_report = f"""# 案例匹配报告

生成时间: {datetime.now().isoformat()}

## 匹配结果概览

共匹配到 {len(matched_cases)} 个相似案例

"""
            for i, case in enumerate(matched_cases, 1):
                match_report += f"""
### 案例 {i}
- **案例ID**: {case.get('id')}
- **匹配度**: {case.get('match_score')}%
- **行业**: {case.get('industry')}
- **申请路径**: {case.get('pathway')}
- **经验水平**: {case.get('experience_level')}

**成功因素**:
{case.get('success_factors', '暂无信息')}

**可借鉴要点**:
{case.get('key_takeaways', '暂无信息')}

---
"""
            
            self.project_manager.save_analysis_report(
                project_id,
                "案例匹配",
                "案例匹配报告.md",
                match_report
            )
            
            # 更新项目状态
            self.project_manager.update_project_status(
                project_id,
                "3_case_matching",
                f"匹配到 {len(matched_cases)} 个相似案例"
            )
            
            self._notify_progress(
                project_id,
                "3_case_matching",
                "match_cases",
                "completed",
                f"匹配到 {len(matched_cases)} 个相似案例"
            )
            
            return {
                "success": True,
                "matched_cases": matched_cases,
                "total_matched": len(matched_cases)
            }
        
        return match_result
    
    def run_draft_generation(self, project_id: str, 
                            document_types: List[str] = None,
                            context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        运行草稿生成
        
        Args:
            project_id: 项目ID
            document_types: 要生成的文档类型列表
            context: 上下文信息
            
        Returns:
            生成结果
        """
        logger.info(f"开始草稿生成: {project_id}")
        
        default_types = [
            "personal_statement",
            "cv_resume", 
            "cover_letter",
            "evidence_summary"
        ]
        
        doc_types = document_types or default_types
        
        self._notify_progress(
            project_id,
            "4_draft_generation",
            "generate_drafts",
            "started",
            f"开始生成 {len(doc_types)} 个文档草稿"
        )
        
        # 获取项目信息构建上下文
        project = self.project_manager.get_project(project_id=project_id)
        if not project["success"]:
            return project
        
        project_data = project["data"]
        
        # 构建上下文
        if not context:
            context = {
                "applicant_info": json.dumps(project_data, ensure_ascii=False),
                "resume_content": "（请从原始材料中读取）",
                "achievements": "（请从分析报告中读取）",
                "reference_points": "（请从匹配案例中读取）",
                "additional_info": "",
                "reference_cv": "",
                "pathway": project_data.get("visa_type", "GTV")
            }
        
        results = {}
        
        for doc_type in doc_types:
            self._notify_progress(
                project_id,
                "4_draft_generation",
                f"generate_{doc_type}",
                "started",
                f"生成 {doc_type}"
            )
            
            # 生成文档
            gen_result = self.agent.generate_document(doc_type, context)
            
            if gen_result["success"]:
                # 保存草稿
                filename = f"{doc_type}_draft.md"
                self.project_manager.save_generated_document(
                    project_id,
                    doc_type,
                    "draft",
                    filename,
                    gen_result["content"]
                )
                
                results[doc_type] = {
                    "success": True,
                    "filename": filename
                }
                
                self._notify_progress(
                    project_id,
                    "4_draft_generation",
                    f"generate_{doc_type}",
                    "completed",
                    f"{doc_type} 草稿生成完成"
                )
            else:
                results[doc_type] = gen_result
        
        # 更新项目状态
        successful = sum(1 for r in results.values() if r.get("success"))
        self.project_manager.update_project_status(
            project_id,
            "4_draft_generation",
            f"生成完成: {successful}/{len(doc_types)}"
        )
        
        self._notify_progress(
            project_id,
            "4_draft_generation",
            "generate_drafts",
            "completed",
            f"草稿生成完成: {successful}/{len(doc_types)}"
        )
        
        return {
            "success": True,
            "results": results,
            "summary": {
                "total": len(doc_types),
                "successful": successful
            }
        }
    
    def run_optimization(self, project_id: str, 
                        document_types: List[str] = None) -> Dict[str, Any]:
        """
        运行文档优化
        
        Args:
            project_id: 项目ID
            document_types: 要优化的文档类型列表
            
        Returns:
            优化结果
        """
        logger.info(f"开始文档优化: {project_id}")
        
        self._notify_progress(
            project_id,
            "5_optimization",
            "optimize_documents",
            "started",
            "开始优化文档"
        )
        
        # 获取项目路径
        project = self.project_manager.get_project(project_id=project_id)
        if not project["success"]:
            return project
        
        project_path = Path(project["path"])
        draft_folder = project_path / "03_文案草稿"
        
        results = {}
        
        # 遍历草稿文件夹
        for doc_folder in draft_folder.iterdir():
            if not doc_folder.is_dir():
                continue
            
            doc_type = doc_folder.name
            
            if document_types and doc_type not in document_types:
                continue
            
            # 读取草稿内容
            draft_files = list(doc_folder.glob("*_draft.md"))
            for draft_file in draft_files:
                try:
                    with open(draft_file, 'r', encoding='utf-8') as f:
                        draft_content = f.read()
                    
                    # 优化文档
                    opt_result = self.agent.optimize_document(
                        draft_content,
                        optimization_type="comprehensive"
                    )
                    
                    if opt_result["success"]:
                        # 保存优化版本
                        filename = draft_file.stem.replace("_draft", "_optimized") + ".md"
                        self.project_manager.save_generated_document(
                            project_id,
                            doc_type,
                            "optimized",
                            filename,
                            opt_result["optimized_content"]
                        )
                        
                        results[doc_type] = {
                            "success": True,
                            "filename": filename,
                            "changes": opt_result.get("changes", "")
                        }
                    else:
                        results[doc_type] = opt_result
                        
                except Exception as e:
                    results[doc_type] = {"success": False, "error": str(e)}
        
        # 更新项目状态
        successful = sum(1 for r in results.values() if r.get("success"))
        self.project_manager.update_project_status(
            project_id,
            "5_optimization",
            f"优化完成: {successful}/{len(results)}"
        )
        
        self._notify_progress(
            project_id,
            "5_optimization",
            "optimize_documents",
            "completed",
            f"文档优化完成: {successful}/{len(results)}"
        )
        
        return {
            "success": True,
            "results": results
        }
    
    def run_final_review(self, project_id: str) -> Dict[str, Any]:
        """
        运行最终审核
        
        Args:
            project_id: 项目ID
            
        Returns:
            审核结果
        """
        logger.info(f"开始最终审核: {project_id}")
        
        self._notify_progress(
            project_id,
            "6_final_review",
            "final_review",
            "started",
            "开始最终审核"
        )
        
        # 获取项目路径
        project = self.project_manager.get_project(project_id=project_id)
        if not project["success"]:
            return project
        
        project_path = Path(project["path"])
        optimized_folder = project_path / "04_优化版本"
        
        review_results = {}
        overall_scores = []
        
        # 审核所有优化后的文档
        for doc_folder in optimized_folder.iterdir():
            if not doc_folder.is_dir():
                continue
            
            doc_type = doc_folder.name
            
            for doc_file in doc_folder.glob("*.md"):
                try:
                    with open(doc_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # 审核文档
                    review_result = self.agent.review_document(content, doc_type)
                    
                    if review_result["success"]:
                        review_data = review_result["data"]
                        score = review_data.get("overall_score", 0)
                        overall_scores.append(score)
                        
                        review_results[doc_type] = review_data
                        
                        # 如果通过审核，复制到最终文档
                        if review_data.get("recommendation") == "通过" or score >= 80:
                            final_folder = project_path / "05_最终文档" / doc_type
                            final_folder.mkdir(parents=True, exist_ok=True)
                            
                            final_file = final_folder / doc_file.name.replace("_optimized", "_final")
                            with open(final_file, 'w', encoding='utf-8') as f:
                                f.write(content)
                    else:
                        review_results[doc_type] = review_result
                        
                except Exception as e:
                    review_results[doc_type] = {"success": False, "error": str(e)}
        
        # 计算整体得分
        avg_score = sum(overall_scores) / len(overall_scores) if overall_scores else 0
        
        # 生成审核报告
        review_report = f"""# 最终审核报告

生成时间: {datetime.now().isoformat()}

## 整体评分: {avg_score:.1f}/100

## 各文档审核结果

"""
        for doc_type, result in review_results.items():
            if isinstance(result, dict) and "overall_score" in result:
                review_report += f"""
### {doc_type}
- **评分**: {result.get('overall_score', 'N/A')}/100
- **建议**: {result.get('recommendation', 'N/A')}
- **优点**: {', '.join(result.get('strengths', []))}
- **改进建议**: {', '.join(result.get('improvements', []))}

"""
        
        self.project_manager.save_analysis_report(
            project_id,
            "差距分析",
            "最终审核报告.md",
            review_report
        )
        
        # 更新项目状态
        if avg_score >= 80:
            self.project_manager.update_project_status(
                project_id,
                "7_completed",
                f"审核通过，平均分: {avg_score:.1f}"
            )
            final_status = "completed"
        else:
            self.project_manager.update_project_status(
                project_id,
                "5_optimization",
                f"需要继续优化，当前平均分: {avg_score:.1f}"
            )
            final_status = "needs_improvement"
        
        self._notify_progress(
            project_id,
            "6_final_review",
            "final_review",
            "completed",
            f"审核完成，平均分: {avg_score:.1f}"
        )
        
        return {
            "success": True,
            "average_score": avg_score,
            "review_results": review_results,
            "status": final_status
        }
    
    def run_full_workflow(self, case_id: str, client_name: str,
                         visa_type: str = "GTV",
                         raw_materials: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        运行完整工作流
        
        Args:
            case_id: 案件ID
            client_name: 客户姓名
            visa_type: 签证类型
            raw_materials: 原始材料
            
        Returns:
            工作流执行结果
        """
        logger.info(f"开始完整工作流: {client_name}")
        
        workflow_results = {
            "stages": {},
            "started_at": datetime.now().isoformat()
        }
        
        try:
            # 1. 创建项目
            project_result = self.start_new_project(case_id, client_name, visa_type)
            if not project_result["success"]:
                return project_result
            
            project_id = project_result["project_id"]
            workflow_results["project_id"] = project_id
            workflow_results["stages"]["project_created"] = project_result
            
            # 2. 上传材料
            if raw_materials:
                for category, files in raw_materials.items():
                    for file_info in files:
                        self.upload_material(
                            project_id,
                            category,
                            file_info.get("name", "unnamed"),
                            file_info.get("content", "")
                        )
            workflow_results["stages"]["materials_uploaded"] = {"success": True}
            
            # 3. 材料分析
            analysis_result = self.run_material_analysis(project_id)
            workflow_results["stages"]["analysis"] = analysis_result
            
            if not analysis_result["success"]:
                return workflow_results
            
            # 4. 案例匹配
            match_result = self.run_case_matching(
                project_id,
                analysis_result.get("analysis", {}).get("applicant_profile")
            )
            workflow_results["stages"]["case_matching"] = match_result
            
            # 5. 草稿生成
            draft_result = self.run_draft_generation(project_id)
            workflow_results["stages"]["draft_generation"] = draft_result
            
            # 6. 文档优化
            opt_result = self.run_optimization(project_id)
            workflow_results["stages"]["optimization"] = opt_result
            
            # 7. 最终审核
            review_result = self.run_final_review(project_id)
            workflow_results["stages"]["final_review"] = review_result
            
            workflow_results["completed_at"] = datetime.now().isoformat()
            workflow_results["success"] = True
            workflow_results["final_status"] = review_result.get("status", "unknown")
            
            return workflow_results
            
        except Exception as e:
            logger.error(f"工作流执行失败: {e}")
            workflow_results["success"] = False
            workflow_results["error"] = str(e)
            return workflow_results
    
    def get_workflow_status(self, project_id: str) -> Dict[str, Any]:
        """
        获取工作流状态
        
        Args:
            project_id: 项目ID
            
        Returns:
            工作流状态
        """
        # 获取项目进度
        progress = self.project_manager.get_project_progress(project_id)
        
        if not progress["success"]:
            return progress
        
        progress_data = progress["data"]
        current_status = progress_data.get("status", "unknown")
        
        # 确定当前阶段
        current_stage = None
        for stage_key, stage_info in self.WORKFLOW_STAGES.items():
            if current_status == stage_key or current_status == stage_info["name"]:
                current_stage = stage_key
                break
        
        # 计算各阶段状态
        stages_status = {}
        stage_keys = list(self.WORKFLOW_STAGES.keys())
        current_index = stage_keys.index(current_stage) if current_stage else 0
        
        for i, stage_key in enumerate(stage_keys):
            stage_info = self.WORKFLOW_STAGES[stage_key]
            if i < current_index:
                status = "completed"
            elif i == current_index:
                status = "in_progress"
            else:
                status = "pending"
            
            stages_status[stage_key] = {
                "name": stage_info["name"],
                "description": stage_info["description"],
                "status": status
            }
        
        return {
            "success": True,
            "data": {
                "project_id": project_id,
                "current_stage": current_stage,
                "overall_progress": progress_data.get("overall_progress", 0),
                "stages": stages_status,
                "packages": progress_data.get("packages", []),
                "recent_actions": progress_data.get("recent_actions", [])
            }
        }


# 测试代码
if __name__ == "__main__":
    workflow = CopywritingWorkflow("./test_projects", "./test_cases")
    
    # 添加示例案例
    workflow.case_library.add_sample_cases()
    
    # 启动测试项目
    result = workflow.start_new_project(
        case_id="test-001",
        client_name="测试用户",
        visa_type="GTV"
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
    if result["success"]:
        project_id = result["project_id"]
        
        # 获取工作流状态
        status = workflow.get_workflow_status(project_id)
        print(json.dumps(status, ensure_ascii=False, indent=2))
