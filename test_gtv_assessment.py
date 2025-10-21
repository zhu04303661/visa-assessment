#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试GTV评估功能的脚本
"""

import requests
import json
import os
from pathlib import Path

def test_gtv_assessment():
    """测试GTV评估功能"""
    print("🧪 开始测试GTV评估功能...")
    
    # 测试数据
    test_data = {
        "extracted_info": {
            "name": "朱恩庆",
            "email": "zhuenqing@example.com",
            "phone": "+86 138 0013 8000",
            "experience": "新奥集团智能技术负责人，负责AI和大模型技术研发，带领90人技术团队。在携程、爱立信、阿尔卡特朗讯等公司有丰富经验。",
            "education": "南京理工大学计算机科学与技术专业学士学位",
            "skills": ["人工智能", "大模型技术", "智能体", "Python", "机器学习", "深度学习"],
            "achievements": ["2024年大模型工程和智能体技术相关专利6篇", "带领团队完成多个AI项目", "获得公司技术创新奖"],
            "projects": ["智能客服系统", "大模型应用平台", "AI决策支持系统"],
            "languages": ["中文", "英文"],
            "certifications": ["PMP项目管理认证", "AWS云架构师认证"],
            "summary": "在AI和大模型技术领域有12年经验，现任新奥集团智能技术负责人，带领90人团队，拥有多项专利和技术奖项。"
        },
        "field": "digital-technology",
        "name": "朱恩庆",
        "email": "zhuenqing@example.com"
    }
    
    try:
        # 调用GTV评估API
        print("📡 调用GTV评估API...")
        response = requests.post(
            'http://localhost:5002/api/resume/gtv-assessment',
            headers={'Content-Type': 'application/json'},
            json=test_data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ GTV评估API调用成功")
            print(f"📊 评估结果: {json.dumps(result, ensure_ascii=False, indent=2)}")
            
            if result.get('success'):
                gtv_analysis = result.get('gtvAnalysis', {})
                print(f"\n🎯 评估摘要:")
                print(f"  - 申请人: {gtv_analysis.get('applicantInfo', {}).get('name', 'N/A')}")
                print(f"  - 申请领域: {gtv_analysis.get('applicantInfo', {}).get('field', 'N/A')}")
                print(f"  - 推荐路径: {gtv_analysis.get('gtvPathway', {}).get('recommendedRoute', 'N/A')}")
                print(f"  - 资格等级: {gtv_analysis.get('gtvPathway', {}).get('eligibilityLevel', 'N/A')}")
                print(f"  - 总体评分: {gtv_analysis.get('overallScore', 'N/A')}")
                print(f"  - 申请建议: {gtv_analysis.get('recommendation', 'N/A')}")
                
                return True
            else:
                print(f"❌ GTV评估失败: {result.get('error', '未知错误')}")
                return False
        else:
            print(f"❌ API调用失败: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 测试过程中发生错误: {e}")
        return False

def test_resume_upload_and_gtv():
    """测试完整的简历上传和GTV评估流程"""
    print("\n🧪 开始测试完整的简历上传和GTV评估流程...")
    
    # 使用真实的简历文件
    resume_file = Path("ace_gtv/resumes/20251020_132537_ZHU_Enqings_resume_-202506.docx")
    
    if not resume_file.exists():
        print(f"❌ 简历文件不存在: {resume_file}")
        return False
    
    try:
        # 1. 上传简历
        print("📄 步骤1: 上传简历...")
        with open(resume_file, 'rb') as f:
            files = {'resume': f}
            response = requests.post(
                'http://localhost:5002/api/resume/upload',
                files=files,
                timeout=60
            )
        
        if response.status_code == 200:
            upload_result = response.json()
            print("✅ 简历上传成功")
            
            if upload_result.get('success'):
                extracted_info = upload_result.get('analysis', {})
                print(f"📊 提取的信息: {json.dumps(extracted_info, ensure_ascii=False, indent=2)}")
                
                # 2. 进行GTV评估
                print("\n🎯 步骤2: 进行GTV评估...")
                gtv_data = {
                    "extracted_info": extracted_info,
                    "field": "digital-technology",
                    "name": extracted_info.get('name', ''),
                    "email": extracted_info.get('email', '')
                }
                
                gtv_response = requests.post(
                    'http://localhost:5002/api/resume/gtv-assessment',
                    headers={'Content-Type': 'application/json'},
                    json=gtv_data,
                    timeout=60
                )
                
                if gtv_response.status_code == 200:
                    gtv_result = gtv_response.json()
                    print("✅ GTV评估成功")
                    
                    if gtv_result.get('success'):
                        gtv_analysis = gtv_result.get('gtvAnalysis', {})
                        print(f"\n🎯 完整评估结果:")
                        print(f"  - 申请人: {gtv_analysis.get('applicantInfo', {}).get('name', 'N/A')}")
                        print(f"  - 申请领域: {gtv_analysis.get('applicantInfo', {}).get('field', 'N/A')}")
                        print(f"  - 推荐路径: {gtv_analysis.get('gtvPathway', {}).get('recommendedRoute', 'N/A')}")
                        print(f"  - 资格等级: {gtv_analysis.get('gtvPathway', {}).get('eligibilityLevel', 'N/A')}")
                        print(f"  - 总体评分: {gtv_analysis.get('overallScore', 'N/A')}")
                        print(f"  - 申请建议: {gtv_analysis.get('recommendation', 'N/A')}")
                        
                        return True
                    else:
                        print(f"❌ GTV评估失败: {gtv_result.get('error', '未知错误')}")
                        return False
                else:
                    print(f"❌ GTV评估API调用失败: {gtv_response.status_code} - {gtv_response.text}")
                    return False
            else:
                print(f"❌ 简历上传失败: {upload_result.get('error', '未知错误')}")
                return False
        else:
            print(f"❌ 简历上传API调用失败: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 测试过程中发生错误: {e}")
        return False

def main():
    """主函数"""
    print("🚀 开始GTV评估功能测试...")
    
    # 检查服务状态
    try:
        health_response = requests.get('http://localhost:5002/health', timeout=5)
        if health_response.status_code == 200:
            print("✅ 简历处理服务运行正常")
        else:
            print("❌ 简历处理服务异常")
            return
    except Exception as e:
        print(f"❌ 无法连接到简历处理服务: {e}")
        return
    
    # 测试1: 直接GTV评估
    print("\n" + "="*50)
    print("测试1: 直接GTV评估")
    print("="*50)
    test1_success = test_gtv_assessment()
    
    # 测试2: 完整流程测试
    print("\n" + "="*50)
    print("测试2: 完整简历上传和GTV评估流程")
    print("="*50)
    test2_success = test_resume_upload_and_gtv()
    
    # 总结
    print("\n" + "="*50)
    print("测试总结")
    print("="*50)
    print(f"✅ 直接GTV评估: {'通过' if test1_success else '失败'}")
    print(f"✅ 完整流程测试: {'通过' if test2_success else '失败'}")
    
    if test1_success and test2_success:
        print("\n🎉 所有测试通过！GTV评估功能工作正常。")
    else:
        print("\n⚠️  部分测试失败，请检查日志。")

if __name__ == "__main__":
    main()
