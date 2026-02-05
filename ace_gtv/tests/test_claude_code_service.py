"""
ClaudeCodeService 测试脚本

测试 Claude Code CLI 服务的各项功能。
"""

import os
import sys
import time
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# 添加项目路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from ace_gtv.services.claude_code_service import (
    ClaudeCodeService,
    get_claude_code_service,
    SkillInfo
)


class TestClaudeCodeServiceInit(unittest.TestCase):
    """测试服务初始化"""
    
    def test_singleton_pattern(self):
        """测试单例模式"""
        service1 = get_claude_code_service()
        service2 = get_claude_code_service()
        self.assertIs(service1, service2)
    
    def test_cli_path_detection(self):
        """测试 CLI 路径检测"""
        service = ClaudeCodeService()
        self.assertIsNotNone(service._cli_path)
        print(f"检测到 CLI 路径: {service._cli_path}")
    
    def test_skills_directory_setup(self):
        """测试技能目录设置"""
        service = ClaudeCodeService()
        self.assertIsNotNone(service._skills_dir)
        print(f"技能目录: {service._skills_dir}")
    
    def test_custom_cli_path(self):
        """测试自定义 CLI 路径"""
        custom_path = "/custom/path/claude"
        service = ClaudeCodeService(cli_path=custom_path)
        self.assertEqual(service._cli_path, custom_path)


class TestCLIAvailability(unittest.TestCase):
    """测试 CLI 可用性检查"""
    
    def test_is_cli_available(self):
        """测试 CLI 是否可用"""
        service = get_claude_code_service()
        is_available = service.is_cli_available()
        print(f"CLI 可用: {is_available}")
        # 不断言结果，因为 CLI 可能未安装
        self.assertIsInstance(is_available, bool)
    
    def test_get_status(self):
        """测试获取服务状态"""
        service = get_claude_code_service()
        status = service.get_status()
        
        self.assertIn("cli_available", status)
        self.assertIn("cli_path", status)
        self.assertIn("skills_count", status)
        self.assertIn("available_modes", status)
        
        print(f"服务状态: {status}")


class TestSkillsManagement(unittest.TestCase):
    """测试技能管理"""
    
    def test_load_skills(self):
        """测试加载技能"""
        service = get_claude_code_service()
        skills = service.available_skills
        
        print(f"已加载 {len(skills)} 个技能:")
        for name, info in skills.items():
            print(f"  - {name}: {info.display_name}")
    
    def test_list_skills(self):
        """测试列出技能"""
        service = get_claude_code_service()
        skill_list = service.list_skills()
        
        self.assertIsInstance(skill_list, list)
        
        if skill_list:
            skill = skill_list[0]
            self.assertIn("name", skill)
            self.assertIn("display_name", skill)
            self.assertIn("description", skill)
    
    def test_skill_info_dataclass(self):
        """测试 SkillInfo 数据类"""
        skill = SkillInfo(
            name="test-skill",
            display_name="Test Skill",
            path="/path/to/skill.md",
            description="A test skill"
        )
        
        self.assertEqual(skill.name, "test-skill")
        self.assertEqual(skill.display_name, "Test Skill")


class TestPromptBuilding(unittest.TestCase):
    """测试 Prompt 构建"""
    
    def test_build_prompt_basic(self):
        """测试基本 prompt 构建"""
        service = get_claude_code_service()
        
        prompt = service._build_prompt(
            prompt="分析这份简历",
            skill_name=None,
            context={}
        )
        
        self.assertIn("分析这份简历", prompt)
        print(f"基本 prompt:\n{prompt}")
    
    def test_build_prompt_with_context(self):
        """测试带上下文的 prompt 构建"""
        service = get_claude_code_service()
        
        context = {
            "client_name": "张三",
            "project_id": "TEST123"
        }
        
        prompt = service._build_prompt(
            prompt="请帮我评估",
            skill_name=None,
            context=context
        )
        
        self.assertIn("张三", prompt)
        self.assertIn("TEST123", prompt)
        print(f"带上下文 prompt:\n{prompt}")
    
    def test_build_prompt_with_skill(self):
        """测试带技能的 prompt 构建"""
        service = get_claude_code_service()
        
        # 添加一个测试技能
        service.available_skills["test-skill"] = SkillInfo(
            name="test-skill",
            display_name="Test Skill",
            path="/test/path"
        )
        
        prompt = service._build_prompt(
            prompt="测试请求",
            skill_name="test-skill",
            context={}
        )
        
        self.assertIn("Test Skill", prompt)
        print(f"带技能 prompt:\n{prompt}")


class TestExecutionModes(unittest.TestCase):
    """测试执行模式"""
    
    def test_execute_with_skill_ask_mode(self):
        """测试 Ask 模式执行（需要 API Key）"""
        service = get_claude_code_service()
        
        # 检查是否配置了 API Key
        api_key = os.getenv("ENNCLOUD_API_KEY")
        if not api_key:
            self.skipTest("ENNCLOUD_API_KEY 未配置，跳过 Ask 模式测试")
        
        result = list(service.execute_with_skill(
            prompt="你好，请用一句话介绍自己",
            skill_name=None,
            context={},
            stream=True,
            mode="ask"
        ))
        
        self.assertTrue(len(result) > 0)
        print(f"Ask 模式响应: {result}")
    
    def test_execute_with_skill_agent_mode(self):
        """测试 Agent 模式执行（需要 Claude CLI）"""
        service = get_claude_code_service()
        
        if not service.is_cli_available():
            self.skipTest("Claude CLI 不可用，跳过 Agent 模式测试")
        
        # 使用简单的测试命令
        result = list(service.execute_with_skill(
            prompt="请输出: Hello Test",
            skill_name=None,
            context={},
            stream=True,
            mode="agent"
        ))
        
        print(f"Agent 模式响应: {result}")
    
    @patch('subprocess.Popen')
    def test_cli_execution_mock(self, mock_popen):
        """模拟 CLI 执行（不实际调用 CLI）"""
        # 设置 mock
        mock_process = MagicMock()
        mock_process.stdout.readline.side_effect = [
            b"Line 1\n",
            b"Line 2\n",
            b""
        ]
        mock_process.wait.return_value = None
        mock_process.returncode = 0
        mock_popen.return_value = mock_process
        
        service = ClaudeCodeService()
        service._cli_path = "/mock/claude"
        
        # 模拟 CLI 存在
        with patch('os.path.exists', return_value=True):
            with patch('os.access', return_value=True):
                result = list(service._execute_with_cli(
                    prompt="test",
                    skill_name=None,
                    context={}
                ))
        
        self.assertEqual(len(result), 2)
        self.assertIn("Line 1", result[0])


class TestErrorHandling(unittest.TestCase):
    """测试错误处理"""
    
    def test_api_missing_key(self):
        """测试 API Key 缺失"""
        service = get_claude_code_service()
        
        # 临时移除 API Key
        original_key = os.environ.pop("ENNCLOUD_API_KEY", None)
        
        try:
            result = list(service._execute_with_api(
                prompt="test",
                skill_name=None,
                context={}
            ))
            
            self.assertTrue(any("[错误]" in r for r in result))
        finally:
            # 恢复 API Key
            if original_key:
                os.environ["ENNCLOUD_API_KEY"] = original_key
    
    @patch('subprocess.Popen')
    def test_cli_execution_error(self, mock_popen):
        """测试 CLI 执行错误"""
        mock_process = MagicMock()
        mock_process.stdout.readline.side_effect = [b""]
        mock_process.wait.return_value = None
        mock_process.returncode = 1
        mock_popen.return_value = mock_process
        
        service = ClaudeCodeService()
        
        result = list(service._execute_with_cli(
            prompt="test",
            skill_name=None,
            context={}
        ))
        
        # 应该包含错误信息
        self.assertTrue(any("[错误]" in r for r in result))


class TestSkillRouter(unittest.TestCase):
    """测试技能路由器"""
    
    def setUp(self):
        from ace_gtv.services.skill_router import get_skill_router, auto_detect_skill
        self.router = get_skill_router()
        self.auto_detect = auto_detect_skill
    
    def test_detect_resume_skill(self):
        """测试检测简历分析技能"""
        skill, confidence = self.router.detect_skill("请帮我分析这份简历")
        self.assertEqual(skill, "resume-analysis")
        self.assertGreater(confidence, 0)
    
    def test_detect_recommendation_skill(self):
        """测试检测建议生成技能"""
        skill, confidence = self.router.detect_skill("给我一些改进建议")
        self.assertEqual(skill, "recommendations-generation")
    
    def test_detect_scoring_skill(self):
        """测试检测评分计算技能"""
        skill, confidence = self.router.detect_skill("帮我计算一下评分")
        self.assertEqual(skill, "scoring-calculation")
    
    def test_auto_detect_skill(self):
        """测试自动检测技能便捷函数"""
        skill = self.auto_detect("我想了解如何提升申请成功率")
        self.assertIsNotNone(skill)
        print(f"自动检测到技能: {skill}")
    
    def test_skill_suggestions(self):
        """测试获取技能推荐"""
        suggestions = self.router.get_skill_suggestions(
            "我需要分析简历并给出评估建议",
            top_k=3
        )
        
        self.assertIsInstance(suggestions, list)
        self.assertLessEqual(len(suggestions), 3)
        
        for s in suggestions:
            print(f"推荐技能: {s['name']} (置信度: {s['confidence']:.2f})")


class TestIntegration(unittest.TestCase):
    """集成测试"""
    
    def test_full_workflow_ask_mode(self):
        """测试完整工作流程（Ask 模式）"""
        api_key = os.getenv("ENNCLOUD_API_KEY")
        if not api_key:
            self.skipTest("ENNCLOUD_API_KEY 未配置")
        
        from ace_gtv.services.skill_router import auto_detect_skill
        
        # 1. 自动检测技能
        user_input = "请给我一些GTV签证申请的建议"
        skill = auto_detect_skill(user_input)
        print(f"检测到技能: {skill}")
        
        # 2. 获取服务
        service = get_claude_code_service()
        
        # 3. 执行请求
        start_time = time.time()
        result = list(service.execute_with_skill(
            prompt=user_input,
            skill_name=skill,
            context={"client_name": "测试用户"},
            mode="ask"
        ))
        elapsed = time.time() - start_time
        
        print(f"执行时间: {elapsed:.2f}s")
        print(f"响应内容: {result[:100] if result else 'None'}...")
        
        self.assertTrue(len(result) > 0)


def run_quick_test():
    """快速测试脚本 - 不需要 unittest"""
    print("=" * 60)
    print("ClaudeCodeService 快速测试")
    print("=" * 60)
    
    # 1. 初始化服务
    print("\n[1] 初始化服务...")
    service = get_claude_code_service()
    print(f"    ✓ 服务初始化成功")
    
    # 2. 检查 CLI
    print("\n[2] 检查 Claude CLI...")
    print(f"    CLI 路径: {service._cli_path}")
    print(f"    CLI 可用: {service.is_cli_available()}")
    
    # 3. 获取状态
    print("\n[3] 服务状态...")
    status = service.get_status()
    for key, value in status.items():
        print(f"    {key}: {value}")
    
    # 4. 列出技能
    print("\n[4] 可用技能...")
    skills = service.list_skills()
    for skill in skills:
        print(f"    - {skill['name']}: {skill['display_name']}")
    
    # 5. 测试技能路由
    print("\n[5] 技能路由测试...")
    from ace_gtv.services.skill_router import auto_detect_skill
    
    test_inputs = [
        "请分析这份简历",
        "给我一些申请建议",
        "帮我计算评分",
        "验证这些证据材料",
    ]
    
    for input_text in test_inputs:
        skill = auto_detect_skill(input_text)
        print(f"    '{input_text}' → {skill}")
    
    # 6. 测试 prompt 构建
    print("\n[6] Prompt 构建测试...")
    prompt = service._build_prompt(
        prompt="请帮我分析",
        skill_name="resume-analysis" if "resume-analysis" in service.available_skills else None,
        context={"client_name": "测试用户", "project_id": "TEST001"}
    )
    print(f"    构建的 Prompt:\n    {prompt[:200]}...")
    
    print("\n" + "=" * 60)
    print("快速测试完成!")
    print("=" * 60)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="ClaudeCodeService 测试")
    parser.add_argument("--quick", action="store_true", help="运行快速测试")
    parser.add_argument("--verbose", "-v", action="store_true", help="详细输出")
    args = parser.parse_args()
    
    if args.quick:
        run_quick_test()
    else:
        # 运行 unittest
        verbosity = 2 if args.verbose else 1
        unittest.main(argv=[""], verbosity=verbosity, exit=False)
