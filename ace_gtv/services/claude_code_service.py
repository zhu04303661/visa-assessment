"""
Claude Code CLI 服务 - 简洁版

直接调用 Claude CLI 执行任务，不使用 PTY 或 WebSocket。
"""

import os
import subprocess
import logging
from pathlib import Path
from typing import Dict, Any, Iterator, Optional, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class SkillInfo:
    """技能信息"""
    name: str
    display_name: str
    path: str
    description: str = ""


class ClaudeCodeService:
    """Claude Code CLI 服务"""
    
    def __init__(self, cli_path: str = None, skills_dir: str = None):
        # CLI 路径
        self._cli_path = cli_path or self._find_cli_path()
        
        # Skills 目录
        project_root = Path(__file__).parent.parent.parent
        self._skills_dir = Path(skills_dir) if skills_dir else project_root / ".claude" / "skills"
        
        # Agent 系统提示
        self._agent_prompt_path = project_root / "ace_gtv" / "agents" / "gtv_copywriting_agent.md"
        
        # 可用技能
        self.available_skills: Dict[str, SkillInfo] = {}
        self._load_skills()
        
        logger.info(f"ClaudeCodeService 初始化: CLI={self._cli_path}, Skills={len(self.available_skills)}")
    
    def _find_cli_path(self) -> str:
        """查找 Claude CLI 路径"""
        possible_paths = [
            "/opt/homebrew/bin/claude",
            "/usr/local/bin/claude",
            os.path.expanduser("~/.local/bin/claude"),
        ]
        
        for path in possible_paths:
            if os.path.exists(path) and os.access(path, os.X_OK):
                return path
        
        # 尝试 which 命令
        try:
            result = subprocess.run(["which", "claude"], capture_output=True, text=True)
            if result.returncode == 0:
                return result.stdout.strip()
        except:
            pass
        
        return "/opt/homebrew/bin/claude"
    
    def _load_skills(self):
        """加载可用技能"""
        if not self._skills_dir.exists():
            return
        
        for skill_dir in self._skills_dir.iterdir():
            if skill_dir.is_dir():
                skill_file = skill_dir / "SKILL.md"
                if skill_file.exists():
                    skill_name = skill_dir.name
                    # 从文件名生成显示名称
                    display_name = skill_name.replace("-", " ").title()
                    
                    self.available_skills[skill_name] = SkillInfo(
                        name=skill_name,
                        display_name=display_name,
                        path=str(skill_file),
                        description=f"{display_name} 技能"
                    )
    
    def is_cli_available(self) -> bool:
        """检查 CLI 是否可用"""
        if not os.path.exists(self._cli_path):
            return False
        
        try:
            result = subprocess.run(
                [self._cli_path, "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except:
            return False
    
    def get_status(self) -> Dict[str, Any]:
        """获取服务状态"""
        cli_available = self.is_cli_available()
        
        return {
            "cli_available": cli_available,
            "cli_path": self._cli_path,
            "skills_count": len(self.available_skills),
            "available_modes": ["ask", "agent"] if cli_available else ["ask"],
            "current_mode": os.getenv("AI_EXECUTION_MODE", "ask"),
            "llm_provider": os.getenv("LLM_PROVIDER", "ENNCLOUD")
        }
    
    def list_skills(self) -> List[Dict[str, str]]:
        """列出可用技能"""
        return [
            {
                "name": skill.name,
                "display_name": skill.display_name,
                "description": skill.description
            }
            for skill in self.available_skills.values()
        ]
    
    def execute_with_skill(
        self,
        prompt: str,
        skill_name: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        stream: bool = True,
        mode: str = "ask"
    ) -> Iterator[str]:
        """
        执行带技能的请求
        
        Args:
            prompt: 用户输入
            skill_name: 技能名称（可选）
            context: 上下文信息
            stream: 是否流式输出
            mode: 执行模式 (ask/agent)
        
        Yields:
            输出文本块
        """
        context = context or {}
        
        # 根据模式选择执行方式
        if mode == "agent" and self.is_cli_available():
            yield from self._execute_with_cli(prompt, skill_name, context)
        else:
            yield from self._execute_with_api(prompt, skill_name, context)
    
    def _execute_with_cli(
        self,
        prompt: str,
        skill_name: Optional[str],
        context: Dict[str, Any]
    ) -> Iterator[str]:
        """
        使用 CLI 执行（Shell 管道模式）
        
        使用命令格式:
        echo "y" | claude -p "${TASK}" --allowedTools "..." --output-format stream-json ...
        """
        import json
        import shlex
        
        # 获取工作目录
        project_id = context.get("project_id")
        cwd = None
        
        if project_id:
            try:
                from ace_gtv.services.project_workspace_service import get_workspace_service
            except ImportError:
                from services.project_workspace_service import get_workspace_service
            workspace_service = get_workspace_service()
            if workspace_service.workspace_exists(project_id):
                cwd = str(workspace_service.get_workspace_path(project_id))
        
        if not cwd:
            cwd = os.getcwd()
        
        # 构建完整 prompt
        full_prompt = self._build_prompt(prompt, skill_name, context)
        
        # 转义 prompt（用于 shell）
        escaped_prompt = shlex.quote(full_prompt)
        
        # 定义允许的工具
        # 注意：非 Anthropic API（如智谱 GLM、EnnCloud）不支持 'document' 类型的内容块
        # Read 工具会将文件作为 document 类型发送，所以在非 Anthropic API 时需要排除
        llm_provider = os.getenv('LLM_PROVIDER', '').upper()
        is_anthropic = llm_provider in ['', 'ANTHROPIC', 'CLAUDE']
        
        if is_anthropic:
            allowed_tools = "Read,Write,Edit,Bash,TodoWrite,Glob,Grep"
        else:
            # 非 Anthropic API 不支持 document 类型，排除 Read 工具
            # CLI 会自动使用 Bash + cat 命令来读取文件内容
            allowed_tools = "Write,Edit,Bash,TodoWrite,Glob,Grep"
            logger.info(f"检测到非 Anthropic API (LLM_PROVIDER={llm_provider})，排除 Read 工具以避免 document 类型错误")
        
        # 构建完整的 shell 命令
        # echo "y" | claude -p "..." --allowedTools "..." --output-format stream-json ...
        # 注意：工作目录通过 subprocess 的 cwd 参数设置，不使用 --cwd
        shell_cmd = f'''echo "y" | {self._cli_path} -p {escaped_prompt} \\
            --allowedTools "{allowed_tools}" \\
            --output-format stream-json \\
            --permission-mode acceptEdits \\
            --verbose'''
        
        # 添加系统提示（如果存在）
        if self._agent_prompt_path.exists():
            shell_cmd = f'''echo "y" | {self._cli_path} -p {escaped_prompt} \\
                --allowedTools "{allowed_tools}" \\
                --output-format stream-json \\
                --permission-mode acceptEdits \\
                --system-prompt {shlex.quote(str(self._agent_prompt_path))} \\
                --verbose'''
        
        # 设置环境变量
        env = os.environ.copy()
        env['LANG'] = 'zh_CN.UTF-8'
        env['LC_ALL'] = 'zh_CN.UTF-8'
        env['PYTHONUNBUFFERED'] = '1'
        env['HOME'] = os.path.expanduser('~')
        
        logger.info(f"执行 CLI (Shell 管道模式): cwd={cwd}")
        logger.debug(f"Shell 命令: {shell_cmd[:200]}...")
        
        try:
            # 使用 shell=True 执行管道命令
            process = subprocess.Popen(
                shell_cmd,
                shell=True,
                executable='/bin/zsh',
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                cwd=cwd,
                env=env,
                bufsize=1,
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            
            # 逐行读取输出
            assistant_content_seen = False  # 避免 assistant 和 result 重复
            
            for line in iter(process.stdout.readline, ''):
                if not line:
                    break
                    
                line = line.strip()
                if not line:
                    continue
                
                # 尝试解析 JSON（stream-json 格式）
                try:
                    data = json.loads(line)
                    
                    # 处理不同类型的消息
                    msg_type = data.get('type', '')
                    
                    if msg_type == 'assistant':
                        # 助手消息（主要内容来源）
                        message = data.get('message', {})
                        content = message.get('content', [])
                        for item in content:
                            if item.get('type') == 'text':
                                text = item.get('text', '')
                                if text:
                                    yield text + '\n'
                                    assistant_content_seen = True
                    
                    elif msg_type == 'content_block_delta':
                        # 流式内容块
                        delta = data.get('delta', {})
                        if delta.get('type') == 'text_delta':
                            text = delta.get('text', '')
                            if text:
                                yield text
                                assistant_content_seen = True
                    
                    elif msg_type == 'result':
                        # 结果消息 - 只在没有收到 assistant 内容时输出
                        if not assistant_content_seen:
                            result = data.get('result', '')
                            if result:
                                yield result + '\n'
                    
                    elif msg_type == 'error':
                        # 错误消息
                        error = data.get('error', {})
                        message = error.get('message', str(error))
                        yield f"[错误] {message}\n"
                    
                    # 忽略 system 消息，只关注实际内容
                            
                except json.JSONDecodeError:
                    # 非 JSON 行，直接输出
                    if line:
                        yield line + '\n'
            
            # 等待进程结束
            process.wait()
            
            if process.returncode != 0:
                yield f"\n[错误] 进程退出码: {process.returncode}\n"
                
        except Exception as e:
            logger.error(f"CLI 执行失败: {e}")
            yield f"\n[错误] 执行失败: {str(e)}\n"
    
    def _execute_with_api(
        self,
        prompt: str,
        skill_name: Optional[str],
        context: Dict[str, Any]
    ) -> Iterator[str]:
        """使用 API 执行（Ask 模式）"""
        import requests
        
        # 构建完整 prompt
        full_prompt = self._build_prompt(prompt, skill_name, context)
        
        # 获取 API 配置
        api_key = os.getenv("ENNCLOUD_API_KEY")
        base_url = os.getenv("ENNCLOUD_BASE_URL", "https://ai.enncloud.cn/v1")
        model = os.getenv("ENNCLOUD_MODEL", "GLM-4.5-Air")
        
        if not api_key:
            yield "[错误] ENNCLOUD_API_KEY 未配置\n"
            return
        
        try:
            response = requests.post(
                f"{base_url}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": full_prompt}],
                    "temperature": 0.7,
                    "max_tokens": 4000,
                    "stream": False
                },
                timeout=120
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                yield content
            else:
                yield f"[错误] API 请求失败: {response.status_code}\n"
                
        except Exception as e:
            logger.error(f"API 调用失败: {e}")
            yield f"[错误] API 调用失败: {str(e)}\n"
    
    def _build_prompt(
        self,
        prompt: str,
        skill_name: Optional[str],
        context: Dict[str, Any]
    ) -> str:
        """构建完整 prompt"""
        parts = []
        
        # 添加项目上下文
        if context.get("client_name"):
            parts.append(f"客户: {context['client_name']}")
        
        if context.get("project_id"):
            parts.append(f"项目ID: {context['project_id']}")
        
        # 添加技能说明
        if skill_name and skill_name in self.available_skills:
            skill = self.available_skills[skill_name]
            parts.append(f"使用技能: {skill.display_name}")
        
        # 添加用户 prompt
        parts.append(f"\n用户请求:\n{prompt}")
        
        return "\n".join(parts)


# 全局服务实例
_service: Optional[ClaudeCodeService] = None


def get_claude_code_service() -> ClaudeCodeService:
    """获取服务实例"""
    global _service
    if _service is None:
        _service = ClaudeCodeService()
    return _service
