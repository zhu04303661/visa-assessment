#!/usr/bin/env python3
"""
GTV评分Agent轻量级版本 - 功能测试脚本
测试ScoringAgent的核心功能
"""

import json
import logging
import sys
from scoring_agent_lite import ScoringAgent

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def print_section(title):
    """打印分隔符"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)


def test_agent_initialization():
    """测试Agent初始化"""
    print_section("测试1: Agent初始化")
    
    try:
        agent = ScoringAgent()
        print(f"✅ Agent初始化成功")
        print(f"   LLM可用: {agent.llm is not None}")
        if not agent.llm:
            print(f"   ℹ️  将使用Mock模式（模拟数据）")
        return agent
    except Exception as e:
        print(f"❌ Agent初始化失败: {e}")
        sys.exit(1)


def test_single_item_analysis(agent):
    """测试单个项目分析"""
    print_section("测试2: 单个评分项分析")
    
    applicant_bg = {
        "name": "张三",
        "education": {
            "university": "清华大学",
            "degree": "硕士",
            "major": "计算机科学",
        },
        "work_experience": {
            "company": "阿里巴巴",
            "position": "高级工程师",
            "years": 8,
        },
    }
    
    try:
        print("\n📝 分析项目: 大学等级")
        result = agent.analyze_item(
            item_name="大学等级",
            item_value="top_country",
            score=5,
            max_score=5,
            percentage=100,
            applicant_background=applicant_bg,
        )
        
        print(f"\n✅ 分析完成")
        print(f"\n   官方要求分析:")
        if result.get('official_requirement'):
            req = result['official_requirement']
            print(f"   - 等级: {req.get('level')}")
            print(f"   - 描述: {req.get('description')[:60]}...")
            print(f"   - 官方依据: {req.get('gtv_official_basis')}")
        
        print(f"\n   偏差分析:")
        if result.get('deviation_analysis'):
            dev = result['deviation_analysis']
            print(f"   - 符合度: {dev.get('gap')}%")
            print(f"   - 类型: {dev.get('type')}")
            print(f"   - 距离说明: {dev.get('distance')}")
        
        print(f"\n   分析历史: {len(result.get('analysis_history', []))} 步")
        for step in result.get('analysis_history', []):
            print(f"   - {step}")
        
        return True
        
    except Exception as e:
        print(f"❌ 分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_dimension_analysis(agent):
    """测试维度分析"""
    print_section("测试3: 维度分析")
    
    applicant_bg = {
        "name": "王四",
        "education": {
            "university": "清华大学",
            "degree": "硕士",
        },
        "work_experience": {
            "company": "腾讯",
            "years": 6,
        },
    }
    
    items = [
        {
            "name": "大学等级",
            "value": "top_country",
            "score": 5,
            "maxScore": 5,
            "percentage": 100,
        },
        {
            "name": "学位等级",
            "value": "master",
            "score": 4,
            "maxScore": 5,
            "percentage": 80,
        },
        {
            "name": "专业相关性",
            "value": "highly_relevant",
            "score": 5,
            "maxScore": 5,
            "percentage": 100,
        },
    ]
    
    try:
        print("\n📝 分析维度: 教育背景")
        print(f"   包含 {len(items)} 个项目")
        
        result = agent.analyze_dimension(
            dimension_name="教育背景",
            items=items,
            applicant_background=applicant_bg,
        )
        
        print(f"\n✅ 维度分析完成")
        print(f"\n   维度: {result.get('dimension')}")
        print(f"   项目数: {len(result.get('items', []))}")
        print(f"   分析时间: {result.get('analyzed_at')}")
        
        for i, item_result in enumerate(result.get('items', []), 1):
            print(f"\n   项目 {i}:")
            if item_result.get('official_requirement'):
                print(f"   - 官方要求分析: ✓ 完成")
            if item_result.get('deviation_analysis'):
                print(f"   - 偏差分析: ✓ 完成 (符合度: {item_result['deviation_analysis'].get('gap')}%)")
        
        return True
        
    except Exception as e:
        print(f"❌ 维度分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_mock_mode(agent):
    """测试Mock模式"""
    print_section("测试4: Mock模式")
    
    try:
        print("\n📝 测试Mock数据生成")
        
        mock_req = agent._mock_official_requirement("工作年限", 8)
        print(f"\n✅ Mock官方要求生成成功")
        print(f"   - 等级: {mock_req.get('level')}")
        print(f"   - 示例数: {len(mock_req.get('examples', []))}")
        
        mock_dev = agent._mock_deviation_analysis("工作年限", 100)
        print(f"\n✅ Mock偏差分析生成成功")
        print(f"   - 符合度: {mock_dev.get('gap')}%")
        print(f"   - 类型: {mock_dev.get('type')}")
        print(f"   - 改进步骤数: {len(mock_dev.get('improvement_steps', []))}")
        
        return True
        
    except Exception as e:
        print(f"❌ Mock模式测试失败: {e}")
        return False


def test_data_structure():
    """测试数据结构"""
    print_section("测试5: 数据结构验证")
    
    try:
        from scoring_agent_lite import ScoringResult
        
        print("\n📝 测试ScoringResult数据结构")
        result = ScoringResult()
        result.official_requirement = {"level": "test"}
        result.deviation_analysis = {"gap": 90}
        result.analysis_history.append("Step 1")
        
        result_dict = result.to_dict()
        
        print(f"✅ 数据结构验证成功")
        print(f"   - official_requirement: {result_dict['official_requirement'] is not None}")
        print(f"   - deviation_analysis: {result_dict['deviation_analysis'] is not None}")
        print(f"   - analysis_history: {len(result_dict['analysis_history'])} 条")
        print(f"   - errors: {result_dict['errors'] is None}")
        
        return True
        
    except Exception as e:
        print(f"❌ 数据结构验证失败: {e}")
        return False


def main():
    """运行所有测试"""
    print("\n" + "█"*80)
    print("█  GTV评分Agent轻量级版本 - 功能测试")
    print("█"*80)
    
    results = {}
    
    # 测试1: 初始化
    agent = test_agent_initialization()
    results['初始化'] = agent is not None
    
    # 测试2: 单个项目分析
    results['单个项目分析'] = test_single_item_analysis(agent)
    
    # 测试3: 维度分析
    results['维度分析'] = test_dimension_analysis(agent)
    
    # 测试4: Mock模式
    results['Mock模式'] = test_mock_mode(agent)
    
    # 测试5: 数据结构
    results['数据结构'] = test_data_structure()
    
    # 总结
    print_section("测试总结")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, passed_flag in results.items():
        status = "✅ 通过" if passed_flag else "❌ 失败"
        print(f"{status} - {test_name}")
    
    print(f"\n总体: {passed}/{total} 个测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！系统已就绪。")
        return 0
    else:
        print(f"\n⚠️  {total - passed} 个测试失败，请检查日志。")
        return 1


if __name__ == "__main__":
    sys.exit(main())
