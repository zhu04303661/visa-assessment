#!/usr/bin/env python3
"""
测试详细日志功能
"""

import requests
import json
import time

def test_file_upload():
    """测试文件上传的详细日志"""
    print("🧪 测试文件上传详细日志功能")
    
    # 创建测试文件
    test_content = """测试简历内容
姓名：张三
邮箱：zhangsan@example.com
电话：+86 138 0013 8000
技能：Python, JavaScript, React
经验：5年软件开发经验
教育：计算机科学学士学位"""
    
    with open('test_resume_detailed.txt', 'w', encoding='utf-8') as f:
        f.write(test_content)
    
    print("📄 创建测试文件: test_resume_detailed.txt")
    
    # 准备文件上传数据
    files = {
        'resume': ('test_resume_detailed.txt', open('test_resume_detailed.txt', 'rb'), 'text/plain')
    }
    
    data = {
        'name': '张三',
        'email': 'zhangsan@example.com',
        'field': 'digital-technology',
        'additionalInfo': '这是一个测试请求，用于验证详细日志功能'
    }
    
    print("🚀 发送文件上传请求...")
    print(f"📊 请求数据: {data}")
    
    try:
        response = requests.post(
            'http://localhost:5002/api/resume/upload',
            files=files,
            data=data,
            timeout=30
        )
        
        print(f"📡 响应状态码: {response.status_code}")
        print(f"📄 响应内容: {response.json()}")
        
        if response.status_code == 200:
            print("✅ 文件上传测试成功")
        else:
            print("❌ 文件上传测试失败")
            
    except Exception as e:
        print(f"❌ 请求失败: {e}")
    
    finally:
        # 清理测试文件
        import os
        try:
            os.remove('test_resume_detailed.txt')
            print("🧹 清理测试文件")
        except:
            pass

def test_nextjs_api():
    """测试Next.js API的详细日志"""
    print("\n🧪 测试Next.js API详细日志功能")
    
    # 准备JSON数据
    data = {
        'name': '李四',
        'email': 'lisi@example.com',
        'field': 'digital-technology',
        'resumeText': '李四\n邮箱：lisi@example.com\n电话：+86 139 0013 9000\n技能：Java, Spring Boot, MySQL\n经验：3年后端开发经验\n教育：软件工程学士学位',
        'additionalInfo': '这是一个测试请求，用于验证Next.js API的详细日志功能'
    }
    
    print("🚀 发送JSON请求到Next.js API...")
    print(f"📊 请求数据: {data}")
    
    try:
        response = requests.post(
            'http://localhost:3000/api/analyze-resume',
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"📡 响应状态码: {response.status_code}")
        print(f"📄 响应内容: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Next.js API测试成功")
        else:
            print("❌ Next.js API测试失败")
            
    except Exception as e:
        print(f"❌ 请求失败: {e}")

def check_services():
    """检查服务状态"""
    print("🔍 检查服务状态...")
    
    services = [
        ('Python简历处理服务', 'http://localhost:5002/health'),
        ('ACE API服务', 'http://localhost:5001/health'),
        ('Next.js应用', 'http://localhost:3000')
    ]
    
    for name, url in services:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print(f"✅ {name}: 运行正常")
            else:
                print(f"⚠️ {name}: 状态码 {response.status_code}")
        except Exception as e:
            print(f"❌ {name}: 无法连接 - {e}")

if __name__ == "__main__":
    print("🔬 开始测试详细日志功能")
    print("=" * 50)
    
    # 检查服务状态
    check_services()
    print()
    
    # 测试文件上传
    test_file_upload()
    print()
    
    # 测试Next.js API
    test_nextjs_api()
    print()
    
    print("🎯 测试完成！请查看日志文件以验证详细日志功能：")
    print("📄 Python简历处理服务日志: ace_gtv/resume_processor.log")
    print("📄 Next.js应用日志: 在运行Next.js的终端中查看")
    print("📄 ACE API服务日志: ace_gtv/ace_server.log")
