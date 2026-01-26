#!/usr/bin/env python3
"""
GTV签证文案项目管理器
管理用户项目、材料包和文件夹结构
"""

import os
import json
import shutil
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

from utils.logger_config import setup_module_logger

logger = setup_module_logger("copywriting_project_manager", os.getenv("LOG_LEVEL", "INFO"))


class CopywritingProjectManager:
    """文案项目管理器 - 管理用户项目和材料包文件夹"""
    
    # 材料包类型定义
    MATERIAL_PACKAGES = {
        "personal_statement": {
            "name": "个人陈述",
            "name_en": "Personal Statement",
            "description": "申请人的个人背景、职业发展和申请动机",
            "required": True,
            "templates": ["personal_statement_template.md"],
            "output_files": ["personal_statement_draft.md", "personal_statement_final.docx"]
        },
        "cv_resume": {
            "name": "简历/CV",
            "name_en": "CV/Resume",
            "description": "详细的学术和职业经历",
            "required": True,
            "templates": ["cv_template.md"],
            "output_files": ["cv_draft.md", "cv_final.docx"]
        },
        "recommendation_letters": {
            "name": "推荐信",
            "name_en": "Recommendation Letters",
            "description": "专业推荐信（通常需要3封）",
            "required": True,
            "templates": ["recommendation_letter_template.md"],
            "output_files": ["recommendation_1.md", "recommendation_2.md", "recommendation_3.md"]
        },
        "evidence_portfolio": {
            "name": "证据材料集",
            "name_en": "Evidence Portfolio",
            "description": "支持申请的各类证据文件",
            "required": True,
            "templates": ["evidence_checklist.md"],
            "output_files": ["evidence_summary.md"]
        },
        "cover_letter": {
            "name": "申请信",
            "name_en": "Cover Letter",
            "description": "正式的签证申请信",
            "required": True,
            "templates": ["cover_letter_template.md"],
            "output_files": ["cover_letter_draft.md", "cover_letter_final.docx"]
        },
        "endorsement_letter": {
            "name": "背书信",
            "name_en": "Endorsement Letter",
            "description": "Tech Nation或其他机构的背书申请材料",
            "required": True,
            "templates": ["endorsement_template.md"],
            "output_files": ["endorsement_application.md"]
        },
        "business_plan": {
            "name": "商业计划书",
            "name_en": "Business Plan",
            "description": "创业者路径所需的商业计划",
            "required": False,
            "templates": ["business_plan_template.md"],
            "output_files": ["business_plan_draft.md", "business_plan_final.docx"]
        },
        "supplementary_docs": {
            "name": "补充材料",
            "name_en": "Supplementary Documents",
            "description": "其他支持性材料",
            "required": False,
            "templates": [],
            "output_files": []
        }
    }
    
    # 文件夹结构
    PROJECT_STRUCTURE = {
        "01_原始资料": {
            "description": "用户上传的原始材料",
            "subfolders": ["简历", "证书", "推荐人信息", "工作成果", "其他"]
        },
        "02_分析报告": {
            "description": "AI分析和评估报告",
            "subfolders": ["资质评估", "案例匹配", "差距分析"]
        },
        "03_文案草稿": {
            "description": "AI生成的文案草稿",
            "subfolders": list(MATERIAL_PACKAGES.keys())
        },
        "04_优化版本": {
            "description": "优化后的文案版本",
            "subfolders": list(MATERIAL_PACKAGES.keys())
        },
        "05_最终文档": {
            "description": "最终提交版本",
            "subfolders": list(MATERIAL_PACKAGES.keys())
        },
        "06_参考案例": {
            "description": "匹配的成功案例参考",
            "subfolders": ["案例1", "案例2", "案例3"]
        },
        "logs": {
            "description": "处理日志",
            "subfolders": []
        }
    }
    
    def __init__(self, base_path: str = None):
        """
        初始化项目管理器
        
        Args:
            base_path: 项目存储的基础路径，默认为 ./copywriting_projects
        """
        self.base_path = Path(base_path or os.getenv("COPYWRITING_PROJECTS_PATH", "./copywriting_projects"))
        self.base_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"文案项目管理器初始化完成，基础路径: {self.base_path}")
    
    def create_project(self, case_id: str, client_name: str, visa_type: str = "GTV") -> Dict[str, Any]:
        """
        创建新的文案项目
        
        Args:
            case_id: 案件ID
            client_name: 客户姓名
            visa_type: 签证类型
            
        Returns:
            项目信息字典
        """
        try:
            # 生成项目ID和文件夹名称
            project_id = str(uuid.uuid4())[:8].upper()
            timestamp = datetime.now().strftime("%Y%m%d")
            safe_name = "".join(c for c in client_name if c.isalnum() or c in "._- ")
            folder_name = f"{timestamp}_{project_id}_{safe_name}_{visa_type}"
            
            project_path = self.base_path / folder_name
            
            # 创建项目文件夹结构
            project_path.mkdir(parents=True, exist_ok=True)
            
            for folder_name_cn, folder_config in self.PROJECT_STRUCTURE.items():
                folder_path = project_path / folder_name_cn
                folder_path.mkdir(exist_ok=True)
                
                # 创建子文件夹
                for subfolder in folder_config.get("subfolders", []):
                    subfolder_path = folder_path / subfolder
                    subfolder_path.mkdir(exist_ok=True)
                    
                    # 创建 .gitkeep 文件保持空文件夹
                    (subfolder_path / ".gitkeep").touch()
            
            # 创建项目元数据文件
            project_metadata = {
                "project_id": project_id,
                "case_id": case_id,
                "client_name": client_name,
                "visa_type": visa_type,
                "folder_name": folder_name,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "status": "created",
                "material_packages": {
                    pkg_key: {
                        **pkg_info,
                        "status": "pending",
                        "progress": 0,
                        "files": []
                    }
                    for pkg_key, pkg_info in self.MATERIAL_PACKAGES.items()
                },
                "workflow_history": [
                    {
                        "action": "project_created",
                        "timestamp": datetime.now().isoformat(),
                        "details": "项目创建完成"
                    }
                ]
            }
            
            metadata_path = project_path / "project_metadata.json"
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(project_metadata, f, ensure_ascii=False, indent=2)
            
            # 创建README文件
            readme_content = self._generate_readme(project_metadata)
            readme_path = project_path / "README.md"
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(readme_content)
            
            logger.info(f"项目创建成功: {folder_name}")
            
            return {
                "success": True,
                "project_id": project_id,
                "project_path": str(project_path),
                "folder_name": folder_name,
                "metadata": project_metadata
            }
            
        except Exception as e:
            logger.error(f"创建项目失败: {e}")
            return {"success": False, "error": str(e)}
    
    def _generate_readme(self, metadata: Dict[str, Any]) -> str:
        """生成项目README文件"""
        content = f"""# GTV签证申请项目 - {metadata['client_name']}

## 项目信息
- **项目ID**: {metadata['project_id']}
- **案件ID**: {metadata['case_id']}
- **签证类型**: {metadata['visa_type']}
- **创建时间**: {metadata['created_at']}
- **状态**: {metadata['status']}

## 文件夹结构

| 文件夹 | 说明 |
|--------|------|
"""
        for folder_name, folder_config in self.PROJECT_STRUCTURE.items():
            content += f"| `{folder_name}` | {folder_config['description']} |\n"
        
        content += """
## 材料包清单

| 材料包 | 说明 | 必需 | 状态 |
|--------|------|------|------|
"""
        for pkg_key, pkg_info in metadata['material_packages'].items():
            required = "✓" if pkg_info.get('required') else ""
            content += f"| {pkg_info['name']} | {pkg_info['description']} | {required} | {pkg_info['status']} |\n"
        
        content += """
## 使用说明

1. 将原始资料上传到 `01_原始资料` 文件夹
2. AI系统会自动分析并生成报告到 `02_分析报告`
3. 文案草稿会生成到 `03_文案草稿`
4. 优化后的版本在 `04_优化版本`
5. 最终提交版本在 `05_最终文档`

---
*此文件由系统自动生成，请勿手动修改*
"""
        return content
    
    def get_project(self, project_id: str = None, case_id: str = None) -> Dict[str, Any]:
        """
        获取项目信息
        
        Args:
            project_id: 项目ID
            case_id: 案件ID
            
        Returns:
            项目信息
        """
        try:
            # 遍历所有项目文件夹查找
            for project_folder in self.base_path.iterdir():
                if not project_folder.is_dir():
                    continue
                
                metadata_path = project_folder / "project_metadata.json"
                if not metadata_path.exists():
                    continue
                
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                
                if project_id and metadata.get('project_id') == project_id:
                    return {"success": True, "data": metadata, "path": str(project_folder)}
                
                if case_id and metadata.get('case_id') == case_id:
                    return {"success": True, "data": metadata, "path": str(project_folder)}
            
            return {"success": False, "error": "项目不存在"}
            
        except Exception as e:
            logger.error(f"获取项目失败: {e}")
            return {"success": False, "error": str(e)}
    
    def list_projects(self, limit: int = 100, status: str = None) -> Dict[str, Any]:
        """
        列出所有项目
        
        Args:
            limit: 限制数量
            status: 过滤状态
            
        Returns:
            项目列表
        """
        try:
            projects = []
            
            for project_folder in sorted(self.base_path.iterdir(), reverse=True):
                if not project_folder.is_dir():
                    continue
                
                metadata_path = project_folder / "project_metadata.json"
                if not metadata_path.exists():
                    continue
                
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                
                if status and metadata.get('status') != status:
                    continue
                
                metadata['path'] = str(project_folder)
                projects.append(metadata)
                
                if len(projects) >= limit:
                    break
            
            return {"success": True, "data": projects, "total": len(projects)}
            
        except Exception as e:
            logger.error(f"列出项目失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def update_project_status(self, project_id: str, status: str, details: str = None) -> Dict[str, Any]:
        """
        更新项目状态
        
        Args:
            project_id: 项目ID
            status: 新状态
            details: 详细信息
            
        Returns:
            更新结果
        """
        try:
            project = self.get_project(project_id=project_id)
            if not project.get('success'):
                return project
            
            project_path = Path(project['path'])
            metadata_path = project_path / "project_metadata.json"
            metadata = project['data']
            
            # 更新状态
            metadata['status'] = status
            metadata['updated_at'] = datetime.now().isoformat()
            
            # 添加工作流历史
            metadata['workflow_history'].append({
                "action": "status_updated",
                "status": status,
                "timestamp": datetime.now().isoformat(),
                "details": details or f"状态更新为: {status}"
            })
            
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            logger.info(f"项目状态更新成功: {project_id} -> {status}")
            return {"success": True, "data": metadata}
            
        except Exception as e:
            logger.error(f"更新项目状态失败: {e}")
            return {"success": False, "error": str(e)}
    
    def upload_raw_material(self, project_id: str, file_path: str, category: str, 
                            content: str = None, filename: str = None) -> Dict[str, Any]:
        """
        上传原始材料到项目
        
        Args:
            project_id: 项目ID
            file_path: 源文件路径（如果从文件上传）
            category: 材料类别（简历/证书/推荐人信息/工作成果/其他）
            content: 文件内容（如果是文本内容）
            filename: 文件名（如果是文本内容）
            
        Returns:
            上传结果
        """
        try:
            project = self.get_project(project_id=project_id)
            if not project.get('success'):
                return project
            
            project_path = Path(project['path'])
            target_folder = project_path / "01_原始资料" / category
            target_folder.mkdir(parents=True, exist_ok=True)
            
            if content and filename:
                # 直接写入文本内容
                target_path = target_folder / filename
                with open(target_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            elif file_path:
                # 复制文件
                source_path = Path(file_path)
                if not source_path.exists():
                    return {"success": False, "error": "源文件不存在"}
                
                target_path = target_folder / source_path.name
                shutil.copy2(source_path, target_path)
            else:
                return {"success": False, "error": "未提供文件或内容"}
            
            # 更新项目元数据
            metadata_path = project_path / "project_metadata.json"
            metadata = project['data']
            metadata['updated_at'] = datetime.now().isoformat()
            metadata['workflow_history'].append({
                "action": "material_uploaded",
                "category": category,
                "file": str(target_path.name),
                "timestamp": datetime.now().isoformat(),
                "details": f"上传原始材料到 {category}"
            })
            
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            logger.info(f"材料上传成功: {target_path}")
            return {
                "success": True,
                "file_path": str(target_path),
                "category": category
            }
            
        except Exception as e:
            logger.error(f"上传材料失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_raw_materials(self, project_id: str) -> Dict[str, Any]:
        """
        获取项目的所有原始材料
        
        Args:
            project_id: 项目ID
            
        Returns:
            原始材料列表
        """
        try:
            project = self.get_project(project_id=project_id)
            if not project.get('success'):
                return project
            
            project_path = Path(project['path'])
            raw_folder = project_path / "01_原始资料"
            
            materials = {}
            for category_folder in raw_folder.iterdir():
                if not category_folder.is_dir():
                    continue
                
                category_name = category_folder.name
                materials[category_name] = []
                
                for file_path in category_folder.iterdir():
                    if file_path.name.startswith('.'):
                        continue
                    
                    file_info = {
                        "name": file_path.name,
                        "path": str(file_path),
                        "size": file_path.stat().st_size,
                        "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                    }
                    
                    # 尝试读取文本文件内容
                    if file_path.suffix.lower() in ['.txt', '.md', '.json']:
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                file_info['content'] = f.read()
                        except:
                            pass
                    
                    materials[category_name].append(file_info)
            
            return {"success": True, "data": materials}
            
        except Exception as e:
            logger.error(f"获取原始材料失败: {e}")
            return {"success": False, "error": str(e)}
    
    def save_generated_document(self, project_id: str, package_type: str, 
                                stage: str, filename: str, content: str) -> Dict[str, Any]:
        """
        保存生成的文档
        
        Args:
            project_id: 项目ID
            package_type: 材料包类型
            stage: 阶段（draft/optimized/final）
            filename: 文件名
            content: 文件内容
            
        Returns:
            保存结果
        """
        try:
            project = self.get_project(project_id=project_id)
            if not project.get('success'):
                return project
            
            project_path = Path(project['path'])
            
            # 确定目标文件夹
            stage_folders = {
                "draft": "03_文案草稿",
                "optimized": "04_优化版本",
                "final": "05_最终文档"
            }
            
            stage_folder = stage_folders.get(stage, "03_文案草稿")
            target_folder = project_path / stage_folder / package_type
            target_folder.mkdir(parents=True, exist_ok=True)
            
            # 保存文件
            target_path = target_folder / filename
            with open(target_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # 更新材料包状态
            metadata_path = project_path / "project_metadata.json"
            metadata = project['data']
            
            if package_type in metadata['material_packages']:
                pkg = metadata['material_packages'][package_type]
                pkg['files'].append({
                    "stage": stage,
                    "filename": filename,
                    "path": str(target_path),
                    "created_at": datetime.now().isoformat()
                })
                
                # 更新进度
                if stage == "draft":
                    pkg['status'] = "draft"
                    pkg['progress'] = 33
                elif stage == "optimized":
                    pkg['status'] = "optimized"
                    pkg['progress'] = 66
                elif stage == "final":
                    pkg['status'] = "completed"
                    pkg['progress'] = 100
            
            metadata['updated_at'] = datetime.now().isoformat()
            metadata['workflow_history'].append({
                "action": "document_saved",
                "package": package_type,
                "stage": stage,
                "file": filename,
                "timestamp": datetime.now().isoformat(),
                "details": f"保存{stage}版本文档"
            })
            
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            logger.info(f"文档保存成功: {target_path}")
            return {
                "success": True,
                "file_path": str(target_path),
                "package_type": package_type,
                "stage": stage
            }
            
        except Exception as e:
            logger.error(f"保存文档失败: {e}")
            return {"success": False, "error": str(e)}
    
    def save_analysis_report(self, project_id: str, report_type: str, 
                            filename: str, content: str) -> Dict[str, Any]:
        """
        保存分析报告
        
        Args:
            project_id: 项目ID
            report_type: 报告类型（资质评估/案例匹配/差距分析）
            filename: 文件名
            content: 报告内容
            
        Returns:
            保存结果
        """
        try:
            project = self.get_project(project_id=project_id)
            if not project.get('success'):
                return project
            
            project_path = Path(project['path'])
            target_folder = project_path / "02_分析报告" / report_type
            target_folder.mkdir(parents=True, exist_ok=True)
            
            target_path = target_folder / filename
            with open(target_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # 更新项目元数据
            metadata_path = project_path / "project_metadata.json"
            metadata = project['data']
            metadata['updated_at'] = datetime.now().isoformat()
            metadata['workflow_history'].append({
                "action": "analysis_saved",
                "report_type": report_type,
                "file": filename,
                "timestamp": datetime.now().isoformat(),
                "details": f"保存{report_type}分析报告"
            })
            
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            logger.info(f"分析报告保存成功: {target_path}")
            return {
                "success": True,
                "file_path": str(target_path),
                "report_type": report_type
            }
            
        except Exception as e:
            logger.error(f"保存分析报告失败: {e}")
            return {"success": False, "error": str(e)}
    
    def link_reference_case(self, project_id: str, case_info: Dict[str, Any], 
                           case_number: int = 1) -> Dict[str, Any]:
        """
        链接参考案例到项目
        
        Args:
            project_id: 项目ID
            case_info: 案例信息
            case_number: 案例编号（1-3）
            
        Returns:
            链接结果
        """
        try:
            project = self.get_project(project_id=project_id)
            if not project.get('success'):
                return project
            
            project_path = Path(project['path'])
            target_folder = project_path / "06_参考案例" / f"案例{case_number}"
            target_folder.mkdir(parents=True, exist_ok=True)
            
            # 保存案例信息
            case_file = target_folder / "case_info.json"
            with open(case_file, 'w', encoding='utf-8') as f:
                json.dump(case_info, f, ensure_ascii=False, indent=2)
            
            # 生成案例摘要
            summary_content = f"""# 参考案例 {case_number}

## 案例概要
- **案例ID**: {case_info.get('id', 'N/A')}
- **签证类型**: {case_info.get('visa_type', 'GTV')}
- **申请路径**: {case_info.get('pathway', 'N/A')}
- **匹配度**: {case_info.get('match_score', 'N/A')}%

## 申请人背景
{case_info.get('background_summary', '暂无信息')}

## 关键成功因素
{case_info.get('success_factors', '暂无信息')}

## 可借鉴要点
{case_info.get('key_takeaways', '暂无信息')}
"""
            summary_file = target_folder / "案例摘要.md"
            with open(summary_file, 'w', encoding='utf-8') as f:
                f.write(summary_content)
            
            # 更新项目元数据
            metadata_path = project_path / "project_metadata.json"
            metadata = project['data']
            metadata['updated_at'] = datetime.now().isoformat()
            metadata['workflow_history'].append({
                "action": "case_linked",
                "case_number": case_number,
                "case_id": case_info.get('id'),
                "match_score": case_info.get('match_score'),
                "timestamp": datetime.now().isoformat(),
                "details": f"链接参考案例{case_number}"
            })
            
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            logger.info(f"参考案例链接成功: 案例{case_number}")
            return {
                "success": True,
                "case_number": case_number,
                "folder_path": str(target_folder)
            }
            
        except Exception as e:
            logger.error(f"链接参考案例失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_project_progress(self, project_id: str) -> Dict[str, Any]:
        """
        获取项目整体进度
        
        Args:
            project_id: 项目ID
            
        Returns:
            进度信息
        """
        try:
            project = self.get_project(project_id=project_id)
            if not project.get('success'):
                return project
            
            metadata = project['data']
            
            # 计算整体进度
            total_packages = 0
            completed_progress = 0
            
            package_status = []
            for pkg_key, pkg_info in metadata['material_packages'].items():
                if pkg_info.get('required'):
                    total_packages += 1
                    completed_progress += pkg_info.get('progress', 0)
                
                package_status.append({
                    "key": pkg_key,
                    "name": pkg_info['name'],
                    "status": pkg_info.get('status', 'pending'),
                    "progress": pkg_info.get('progress', 0),
                    "required": pkg_info.get('required', False)
                })
            
            overall_progress = completed_progress / total_packages if total_packages > 0 else 0
            
            return {
                "success": True,
                "data": {
                    "project_id": project_id,
                    "status": metadata.get('status'),
                    "overall_progress": round(overall_progress, 1),
                    "packages": package_status,
                    "last_updated": metadata.get('updated_at'),
                    "recent_actions": metadata.get('workflow_history', [])[-5:]
                }
            }
            
        except Exception as e:
            logger.error(f"获取项目进度失败: {e}")
            return {"success": False, "error": str(e)}
    
    def log_action(self, project_id: str, action: str, details: str = None) -> Dict[str, Any]:
        """
        记录项目操作日志
        
        Args:
            project_id: 项目ID
            action: 操作类型
            details: 详细信息
            
        Returns:
            记录结果
        """
        try:
            project = self.get_project(project_id=project_id)
            if not project.get('success'):
                return project
            
            project_path = Path(project['path'])
            
            # 记录到日志文件
            log_file = project_path / "logs" / f"{datetime.now().strftime('%Y%m%d')}.log"
            log_entry = f"[{datetime.now().isoformat()}] {action}: {details or ''}\n"
            
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(log_entry)
            
            # 更新项目元数据
            metadata_path = project_path / "project_metadata.json"
            metadata = project['data']
            metadata['updated_at'] = datetime.now().isoformat()
            metadata['workflow_history'].append({
                "action": action,
                "timestamp": datetime.now().isoformat(),
                "details": details
            })
            
            # 限制历史记录数量
            if len(metadata['workflow_history']) > 100:
                metadata['workflow_history'] = metadata['workflow_history'][-100:]
            
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            return {"success": True}
            
        except Exception as e:
            logger.error(f"记录操作日志失败: {e}")
            return {"success": False, "error": str(e)}


# 测试代码
if __name__ == "__main__":
    manager = CopywritingProjectManager("./test_projects")
    
    # 创建测试项目
    result = manager.create_project(
        case_id="test-case-001",
        client_name="张三",
        visa_type="GTV"
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
    if result['success']:
        project_id = result['project_id']
        
        # 上传测试材料
        manager.upload_raw_material(
            project_id=project_id,
            file_path=None,
            category="简历",
            content="这是测试简历内容...",
            filename="resume.txt"
        )
        
        # 获取项目进度
        progress = manager.get_project_progress(project_id)
        print(json.dumps(progress, ensure_ascii=False, indent=2))
