"""
项目工作空间服务

为每个项目创建独立的 Claude Code 工作空间：
1. 创建项目专属的 workspace 目录
2. 复制用户上传的材料到 workspace
3. 复制默认的 skill 文件
4. 生成项目上下文文件 (CLAUDE.md)
5. 准备好环境后才能使用 Agent 模式
"""

import os
import shutil
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)


class ProjectWorkspaceService:
    """
    项目工作空间服务
    
    管理每个项目的独立工作空间
    """
    
    def __init__(
        self,
        base_workspace_dir: str = None,
        skills_source_dir: str = None,
        uploads_dir: str = None
    ):
        # 获取项目根目录（通过文件位置推断）
        project_root = Path(__file__).parent.parent.parent
        
        # 工作空间根目录
        if base_workspace_dir:
            self.base_workspace_dir = Path(base_workspace_dir)
        else:
            self.base_workspace_dir = project_root / "project_workspaces"
        
        # Skill 源目录
        if skills_source_dir:
            self.skills_source_dir = Path(skills_source_dir)
        else:
            self.skills_source_dir = project_root / ".claude" / "skills"
        
        # 用户上传目录（在 ace_gtv 下）
        if uploads_dir:
            self.uploads_dir = Path(uploads_dir)
        else:
            self.uploads_dir = project_root / "ace_gtv" / "uploads"
        
        # 确保目录存在
        self.base_workspace_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"项目工作空间服务初始化: base_dir={self.base_workspace_dir}")
    
    def get_workspace_path(self, project_id: str) -> Path:
        """获取项目工作空间路径"""
        return self.base_workspace_dir / project_id
    
    def workspace_exists(self, project_id: str) -> bool:
        """检查工作空间是否存在"""
        return self.get_workspace_path(project_id).exists()
    
    def create_workspace(
        self,
        project_id: str,
        project_info: Dict[str, Any] = None,
        force: bool = False
    ) -> Dict[str, Any]:
        """
        创建项目工作空间
        
        Args:
            project_id: 项目ID
            project_info: 项目信息（客户名称、项目类型等）
            force: 强制重建（删除已存在的工作空间）
        
        Returns:
            工作空间信息
        """
        workspace_path = self.get_workspace_path(project_id)
        
        # 如果已存在
        if workspace_path.exists():
            if force:
                logger.warning(f"删除已存在的工作空间: {workspace_path}")
                shutil.rmtree(workspace_path)
            else:
                logger.info(f"工作空间已存在: {workspace_path}")
                return self.get_workspace_info(project_id)
        
        # 创建目录结构
        workspace_path.mkdir(parents=True, exist_ok=True)
        
        # 创建子目录
        (workspace_path / "materials").mkdir(exist_ok=True)      # 用户上传的材料
        (workspace_path / "documents").mkdir(exist_ok=True)      # 生成的文档
        (workspace_path / "output").mkdir(exist_ok=True)         # Claude 输出
        (workspace_path / ".claude").mkdir(exist_ok=True)        # Claude 配置
        (workspace_path / ".claude" / "skills").mkdir(parents=True, exist_ok=True)
        
        # 复制默认 skills
        self._copy_skills(workspace_path)
        
        # 生成 CLAUDE.md 项目上下文文件
        self._generate_claude_md(workspace_path, project_id, project_info)
        
        # 生成 README.md
        self._generate_readme(workspace_path, project_id, project_info)
        
        logger.info(f"工作空间已创建: {workspace_path}")
        
        return self.get_workspace_info(project_id)
    
    def _copy_skills(self, workspace_path: Path):
        """复制 skill 文件到工作空间"""
        target_skills_dir = workspace_path / ".claude" / "skills"
        
        if not self.skills_source_dir.exists():
            logger.warning(f"Skills 源目录不存在: {self.skills_source_dir}")
            return
        
        # 复制所有 skill 目录
        for skill_dir in self.skills_source_dir.iterdir():
            if skill_dir.is_dir():
                target_skill_dir = target_skills_dir / skill_dir.name
                if not target_skill_dir.exists():
                    shutil.copytree(skill_dir, target_skill_dir)
                    logger.info(f"已复制 skill: {skill_dir.name}")
    
    def _generate_claude_md(
        self,
        workspace_path: Path,
        project_id: str,
        project_info: Dict[str, Any] = None
    ):
        """生成 CLAUDE.md 项目上下文文件"""
        info = project_info or {}
        client_name = info.get("client_name", "未知客户")
        project_type = info.get("project_type", "GTV签证申请")
        
        content = f"""# 项目上下文

## 语言设置
**请始终使用中文回复用户。** All responses should be in Chinese (Simplified).

## 项目信息
- **项目ID**: {project_id}
- **客户名称**: {client_name}
- **项目类型**: {project_type}
- **创建时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 目录结构
- `materials/` - 用户上传的原始材料（简历、推荐信、证书等）
- `documents/` - 生成的文档（个人陈述、申请信等）
- `output/` - Claude 的输出结果

## 工作指南

### 材料分析
当分析 materials/ 目录中的文件时，请：
1. 识别文件类型（简历、推荐信、证书等）
2. 提取关键信息
3. 评估与 GTV 签证要求的匹配度

### 文档生成
当生成文档时，请：
1. 基于 materials/ 中的材料
2. 遵循 .claude/skills/ 中的技能指南
3. 输出到 documents/ 目录

### GTV 签证评估标准
- **Exceptional Talent**: 在领域内有突出成就和认可
- **Exceptional Promise**: 有潜力成为领域内的领导者
- **关键证据**: 奖项、出版物、媒体报道、专利、行业认可等

## 可用技能
{self._list_skills_content()}

## 重要提示
- 所有分析和生成都应基于 materials/ 中的实际材料
- 生成的文档应保存到 documents/ 目录
- 遵循 GTV 签证官方指南的要求
"""
        
        claude_md_path = workspace_path / "CLAUDE.md"
        claude_md_path.write_text(content, encoding='utf-8')
        logger.info(f"已生成 CLAUDE.md: {claude_md_path}")
    
    def _list_skills_content(self) -> str:
        """列出可用的 skills"""
        if not self.skills_source_dir.exists():
            return "- 无可用技能"
        
        skills = []
        for skill_dir in self.skills_source_dir.iterdir():
            if skill_dir.is_dir():
                skill_md = skill_dir / "SKILL.md"
                if skill_md.exists():
                    # 读取第一行作为描述
                    try:
                        first_line = skill_md.read_text(encoding='utf-8').split('\n')[0]
                        if first_line.startswith('#'):
                            first_line = first_line.lstrip('#').strip()
                        skills.append(f"- **{skill_dir.name}**: {first_line}")
                    except:
                        skills.append(f"- **{skill_dir.name}**")
        
        return '\n'.join(skills) if skills else "- 无可用技能"
    
    def _generate_readme(
        self,
        workspace_path: Path,
        project_id: str,
        project_info: Dict[str, Any] = None
    ):
        """生成 README.md"""
        info = project_info or {}
        client_name = info.get("client_name", "未知客户")
        
        content = f"""# {client_name} - GTV 签证申请项目

项目ID: `{project_id}`

## 目录说明

| 目录 | 说明 |
|------|------|
| materials/ | 用户上传的原始材料 |
| documents/ | 生成的申请文档 |
| output/ | 分析和处理结果 |
| .claude/ | Claude 配置和技能 |

## 使用说明

1. 将材料文件放入 `materials/` 目录
2. 使用 Agent 模式进行材料分析
3. 生成的文档会保存到 `documents/` 目录

## 材料清单

*待添加*
"""
        
        readme_path = workspace_path / "README.md"
        readme_path.write_text(content, encoding='utf-8')
    
    def copy_materials(
        self,
        project_id: str,
        source_files: List[str] = None,
        from_upload_dir: bool = True
    ) -> Dict[str, Any]:
        """
        复制材料到工作空间
        
        Args:
            project_id: 项目ID
            source_files: 源文件列表（绝对路径）
            from_upload_dir: 从上传目录复制
        
        Returns:
            复制结果
        """
        workspace_path = self.get_workspace_path(project_id)
        materials_dir = workspace_path / "materials"
        
        if not workspace_path.exists():
            raise ValueError(f"工作空间不存在: {project_id}")
        
        copied_files = []
        errors = []
        
        # 从上传目录复制
        if from_upload_dir:
            project_upload_dir = self.uploads_dir / project_id
            if project_upload_dir.exists():
                for file_path in project_upload_dir.rglob('*'):
                    if file_path.is_file():
                        try:
                            # 保持相对目录结构
                            relative_path = file_path.relative_to(project_upload_dir)
                            target_path = materials_dir / relative_path
                            target_path.parent.mkdir(parents=True, exist_ok=True)
                            shutil.copy2(file_path, target_path)
                            copied_files.append(str(relative_path))
                        except Exception as e:
                            errors.append(f"{file_path}: {e}")
        
        # 从指定文件列表复制
        if source_files:
            for file_path in source_files:
                try:
                    src = Path(file_path)
                    if src.exists() and src.is_file():
                        target_path = materials_dir / src.name
                        shutil.copy2(src, target_path)
                        copied_files.append(src.name)
                except Exception as e:
                    errors.append(f"{file_path}: {e}")
        
        # 更新材料清单
        self._update_materials_list(workspace_path, copied_files)
        
        return {
            "copied": copied_files,
            "errors": errors,
            "total": len(copied_files),
        }
    
    def _update_materials_list(self, workspace_path: Path, files: List[str]):
        """更新材料清单"""
        materials_dir = workspace_path / "materials"
        
        # 列出所有材料
        all_files = []
        for f in materials_dir.rglob('*'):
            if f.is_file():
                all_files.append(str(f.relative_to(materials_dir)))
        
        # 更新 README 中的材料清单
        readme_path = workspace_path / "README.md"
        if readme_path.exists():
            content = readme_path.read_text(encoding='utf-8')
            
            # 生成材料清单
            materials_list = "\n".join([f"- {f}" for f in all_files]) if all_files else "*暂无材料*"
            
            # 替换材料清单部分
            if "## 材料清单" in content:
                parts = content.split("## 材料清单")
                if len(parts) == 2:
                    # 找到下一个 ## 或结尾
                    rest = parts[1]
                    next_section = rest.find("\n## ")
                    if next_section > 0:
                        rest = rest[next_section:]
                    else:
                        rest = ""
                    
                    content = parts[0] + f"## 材料清单\n\n{materials_list}\n{rest}"
                    readme_path.write_text(content, encoding='utf-8')
    
    def get_workspace_info(self, project_id: str) -> Dict[str, Any]:
        """获取工作空间信息"""
        workspace_path = self.get_workspace_path(project_id)
        
        if not workspace_path.exists():
            return {
                "exists": False,
                "project_id": project_id,
                "path": str(workspace_path),
            }
        
        # 统计文件
        materials_count = len(list((workspace_path / "materials").rglob('*'))) if (workspace_path / "materials").exists() else 0
        documents_count = len(list((workspace_path / "documents").rglob('*'))) if (workspace_path / "documents").exists() else 0
        
        # 检查 CLAUDE.md
        has_claude_md = (workspace_path / "CLAUDE.md").exists()
        
        # 检查 skills
        skills_dir = workspace_path / ".claude" / "skills"
        skills = [d.name for d in skills_dir.iterdir() if d.is_dir()] if skills_dir.exists() else []
        
        return {
            "exists": True,
            "project_id": project_id,
            "path": str(workspace_path),
            "materials_count": materials_count,
            "documents_count": documents_count,
            "has_claude_md": has_claude_md,
            "skills": skills,
            "ready": has_claude_md and len(skills) > 0,
        }
    
    def prepare_workspace(
        self,
        project_id: str,
        project_info: Dict[str, Any] = None,
        copy_uploads: bool = True
    ) -> Dict[str, Any]:
        """
        准备项目工作空间（一站式）
        
        Args:
            project_id: 项目ID
            project_info: 项目信息
            copy_uploads: 是否复制上传的文件
        
        Returns:
            工作空间信息
        """
        # 1. 创建工作空间
        self.create_workspace(project_id, project_info)
        
        # 2. 复制材料
        copy_result = None
        if copy_uploads:
            try:
                copy_result = self.copy_materials(project_id, from_upload_dir=True)
            except Exception as e:
                logger.warning(f"复制材料失败: {e}")
        
        # 3. 获取工作空间信息
        info = self.get_workspace_info(project_id)
        info["copy_result"] = copy_result
        
        return info
    
    def cleanup_workspace(self, project_id: str) -> bool:
        """清理工作空间"""
        workspace_path = self.get_workspace_path(project_id)
        
        if workspace_path.exists():
            shutil.rmtree(workspace_path)
            logger.info(f"已清理工作空间: {workspace_path}")
            return True
        
        return False


# 全局实例
_workspace_service: Optional[ProjectWorkspaceService] = None


def get_workspace_service() -> ProjectWorkspaceService:
    """获取工作空间服务实例"""
    global _workspace_service
    if _workspace_service is None:
        _workspace_service = ProjectWorkspaceService()
    return _workspace_service
