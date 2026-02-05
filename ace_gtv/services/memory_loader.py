"""
Memory Loader - 加载项目记忆文件 (CLAUDE.md / AGENTS.md)

支持两个层级的记忆文件：
1. 项目级：{project_path}/CLAUDE.md 或 AGENTS.md
2. 全局级：~/.claude/CLAUDE.md

合并规则：项目级优先，全局级补充
"""

import os
import logging
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class MemoryLoader:
    """加载和管理项目记忆文件"""
    
    # 支持的记忆文件名（按优先级排序）
    MEMORY_FILES = ["CLAUDE.md", "AGENTS.md", "claude.md", "agents.md"]
    
    def __init__(self):
        self.home_dir = Path.home()
        self.global_claude_dir = self.home_dir / ".claude"
        self._cache: Dict[str, Optional[str]] = {}
    
    def load(self, project_path: Optional[str] = None, use_cache: bool = True) -> Optional[str]:
        """
        加载记忆内容
        
        Args:
            project_path: 项目路径（可选）
            use_cache: 是否使用缓存
            
        Returns:
            合并后的记忆内容，如果没有找到记忆文件则返回 None
        """
        cache_key = project_path or "__global__"
        
        if use_cache and cache_key in self._cache:
            return self._cache[cache_key]
        
        memories = []
        
        # 1. 加载项目级记忆
        if project_path:
            project_memory = self._load_project_memory(project_path)
            if project_memory:
                memories.append(("project", project_memory))
        
        # 2. 加载全局级记忆
        global_memory = self._load_global_memory()
        if global_memory:
            memories.append(("global", global_memory))
        
        if not memories:
            self._cache[cache_key] = None
            return None
        
        # 合并记忆
        result = self._merge_memories(memories)
        self._cache[cache_key] = result
        
        logger.info(f"已加载记忆: {len(memories)} 个文件, 总长度 {len(result)} 字符")
        return result
    
    def _load_project_memory(self, project_path: str) -> Optional[str]:
        """加载项目级记忆"""
        project_dir = Path(project_path)
        
        if not project_dir.exists():
            return None
        
        for filename in self.MEMORY_FILES:
            memory_file = project_dir / filename
            if memory_file.exists() and memory_file.is_file():
                try:
                    content = memory_file.read_text(encoding="utf-8").strip()
                    if content:
                        logger.debug(f"加载项目记忆: {memory_file}")
                        return content
                except Exception as e:
                    logger.warning(f"读取项目记忆文件失败 {memory_file}: {e}")
        
        return None
    
    def _load_global_memory(self) -> Optional[str]:
        """加载全局级记忆"""
        for filename in self.MEMORY_FILES:
            memory_file = self.global_claude_dir / filename
            if memory_file.exists() and memory_file.is_file():
                try:
                    content = memory_file.read_text(encoding="utf-8").strip()
                    if content:
                        logger.debug(f"加载全局记忆: {memory_file}")
                        return content
                except Exception as e:
                    logger.warning(f"读取全局记忆文件失败 {memory_file}: {e}")
        
        return None
    
    def _merge_memories(self, memories: list) -> str:
        """
        合并多个记忆源
        
        Args:
            memories: [(source, content), ...] 列表
            
        Returns:
            合并后的内容
        """
        parts = []
        
        for source, content in memories:
            if source == "project":
                parts.append(f"# Project Instructions\n\n{content}")
            elif source == "global":
                parts.append(f"# Global Instructions\n\n{content}")
            else:
                parts.append(content)
        
        return "\n\n---\n\n".join(parts)
    
    def clear_cache(self, project_path: Optional[str] = None):
        """
        清除缓存
        
        Args:
            project_path: 如果指定，只清除该项目的缓存；否则清除所有缓存
        """
        if project_path:
            cache_key = project_path
            if cache_key in self._cache:
                del self._cache[cache_key]
        else:
            self._cache.clear()
        
        logger.debug("记忆缓存已清除")
    
    def get_memory_files(self, project_path: Optional[str] = None) -> Dict[str, Any]:
        """
        获取记忆文件信息（用于前端显示）
        
        Args:
            project_path: 项目路径
            
        Returns:
            包含记忆文件信息的字典
        """
        files = []
        
        # 检查项目级记忆
        if project_path:
            project_dir = Path(project_path)
            for filename in self.MEMORY_FILES:
                memory_file = project_dir / filename
                if memory_file.exists() and memory_file.is_file():
                    files.append({
                        "type": "project",
                        "name": filename,
                        "path": str(memory_file),
                        "size": memory_file.stat().st_size
                    })
                    break  # 只取第一个找到的
        
        # 检查全局级记忆
        for filename in self.MEMORY_FILES:
            memory_file = self.global_claude_dir / filename
            if memory_file.exists() and memory_file.is_file():
                files.append({
                    "type": "global",
                    "name": filename,
                    "path": str(memory_file),
                    "size": memory_file.stat().st_size
                })
                break  # 只取第一个找到的
        
        return {
            "files": files,
            "has_memory": len(files) > 0
        }


# 全局实例
_memory_loader: Optional[MemoryLoader] = None


def get_memory_loader() -> MemoryLoader:
    """获取全局 MemoryLoader 实例"""
    global _memory_loader
    if _memory_loader is None:
        _memory_loader = MemoryLoader()
    return _memory_loader
