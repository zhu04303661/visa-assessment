#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简历处理器测试演示脚本
展示如何使用测试代码进行快速验证
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# 添加当前目录到Python路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# 加载项目根目录的.env.local配置文件
project_root = current_dir.parent
env_local_path = project_root / ".env.local"
if env_local_path.exists():
    load_dotenv(env_local_path)
    print(f"✅ 已加载配置文件: {env_local_path}")
else:
    print(f"⚠️  配置文件不存在: {env_local_path}")
    print("💡 提示: 请确保项目根目录存在 .env.local 文件")

def demo_basic_test():
    """演示基本测试功能"""
    print("🎯 简历处理器基本功能演示")
    print("=" * 50)
    
    try:
        # 导入测试类
        from test_resume_processor import ResumeProcessorTester
        
        # 创建测试器实例
        tester = ResumeProcessorTester()
        
        # 创建测试文件
        print("📁 创建测试数据...")
        test_files = tester.create_test_files()
        print(f"✅ 测试文件创建完成: {list(test_files.values())}")
        
        # 运行基本测试
        print("\n🧪 运行基本功能测试...")
        
        # 测试文本提取
        print("\n1. 测试文本提取功能...")
        if tester.test_text_extraction(test_files):
            print("✅ 文本提取功能正常")
        else:
            print("❌ 文本提取功能异常")
            return False
        
        # 测试本地规则提取
        print("\n2. 测试本地规则信息提取...")
        if tester.test_local_rules_extraction(test_files):
            print("✅ 本地规则提取功能正常")
        else:
            print("❌ 本地规则提取功能异常")
            return False
        
        # 测试安全预览
        print("\n3. 测试安全预览功能...")
        if tester.test_safe_preview():
            print("✅ 安全预览功能正常")
        else:
            print("❌ 安全预览功能异常")
            return False
        
        print("\n🎉 基本功能演示完成！")
        return True
        
    except Exception as e:
        print(f"❌ 演示过程中出现错误: {e}")
        return False

def demo_ai_test():
    """演示AI功能测试（需要配置API密钥）"""
    print("\n🤖 AI功能演示")
    print("=" * 50)
    
    try:
        from test_resume_processor import ResumeProcessorTester
        
        tester = ResumeProcessorTester()
        test_files = tester.create_test_files()
        
        # 检查LLM配置
        print("🔍 检查LLM配置...")
        if tester.test_llm_client():
            print("✅ LLM客户端配置正常")
            
            # 测试AI提取
            print("\n🧪 测试AI信息提取...")
            if tester.test_ai_extraction(test_files):
                print("✅ AI信息提取功能正常")
            else:
                print("❌ AI信息提取功能异常")
        else:
            print("⚠️  LLM客户端未配置，跳过AI测试")
            print("💡 提示: 配置API密钥以启用AI功能")
        
        return True
        
    except Exception as e:
        print(f"❌ AI功能演示过程中出现错误: {e}")
        return False

def demo_knowledge_base_test():
    """演示知识库功能测试"""
    print("\n📚 知识库功能演示")
    print("=" * 50)
    
    try:
        from test_resume_processor import ResumeProcessorTester
        
        tester = ResumeProcessorTester()
        test_files = tester.create_test_files()
        
        # 测试知识库创建
        print("🧪 测试知识库创建...")
        if tester.test_knowledge_base_creation(test_files):
            print("✅ 知识库创建功能正常")
        else:
            print("❌ 知识库创建功能异常")
            return False
        
        # 测试主知识库更新
        print("\n🧪 测试主知识库更新...")
        if tester.test_main_knowledge_base_update(test_files):
            print("✅ 主知识库更新功能正常")
        else:
            print("❌ 主知识库更新功能异常")
            return False
        
        print("\n🎉 知识库功能演示完成！")
        return True
        
    except Exception as e:
        print(f"❌ 知识库功能演示过程中出现错误: {e}")
        return False

def main():
    """主演示函数"""
    print("🚀 简历处理器功能演示")
    print("=" * 60)
    
    # 检查环境
    if not Path("resume_processor.py").exists():
        print("❌ 错误: 请在ace_gtv目录下运行此脚本")
        return
    
    # 创建必要目录
    Path("data").mkdir(exist_ok=True)
    Path("personal_kb").mkdir(exist_ok=True)
    
    # 运行演示
    demos = [
        ("基本功能", demo_basic_test),
        ("AI功能", demo_ai_test),
        ("知识库功能", demo_knowledge_base_test),
    ]
    
    success_count = 0
    for demo_name, demo_func in demos:
        print(f"\n{'='*60}")
        print(f"🎯 演示: {demo_name}")
        print(f"{'='*60}")
        
        try:
            if demo_func():
                success_count += 1
                print(f"✅ {demo_name}演示成功")
            else:
                print(f"❌ {demo_name}演示失败")
        except Exception as e:
            print(f"❌ {demo_name}演示异常: {e}")
    
    # 输出总结
    print(f"\n{'='*60}")
    print(f"📊 演示结果总结")
    print(f"{'='*60}")
    print(f"总演示数: {len(demos)}")
    print(f"成功数: {success_count}")
    print(f"失败数: {len(demos) - success_count}")
    
    if success_count == len(demos):
        print("\n🎉 所有功能演示成功！")
        print("💡 提示: 运行 'python test_resume_processor.py' 进行完整测试")
    else:
        print(f"\n⚠️  有 {len(demos) - success_count} 个功能演示失败")
        print("💡 提示: 检查日志文件获取详细错误信息")
    
    # 询问是否清理
    print(f"\n{'='*60}")
    cleanup = input("是否清理演示数据？(y/N): ").strip().lower()
    if cleanup in ['y', 'yes']:
        try:
            from test_resume_processor import ResumeProcessorTester
            tester = ResumeProcessorTester()
            tester.cleanup_test_data()
            print("✅ 演示数据清理完成")
        except Exception as e:
            print(f"⚠️  清理数据时出现错误: {e}")

if __name__ == "__main__":
    main()
