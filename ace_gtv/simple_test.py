#!/usr/bin/env python3
"""
简单的ACE测试脚本
"""

import json
import os
import sys
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime

# 添加ACE框架路径
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'ACE-open'))

try:
    from ace import Playbook, Bullet, DummyLLMClient
    print("✅ ACE框架导入成功")
except ImportError as e:
    print(f"❌ ACE框架导入失败: {e}")
    sys.exit(1)

@dataclass
class SimpleData:
    name: str = ""
    items: List[str] = field(default_factory=lambda: [])

def test_ace_basic():
    """测试ACE基本功能"""
    print("🧪 测试ACE基本功能...")
    
    # 创建简单的数据结构
    data = SimpleData(name="测试", items=["项目1", "项目2"])
    print(f"✅ 数据结构创建成功: {data}")
    
    # 测试Playbook
    playbook = Playbook()
    print(f"✅ Playbook创建成功: {playbook}")
    
    # 测试Bullet
    bullet = Bullet(
        id="test_bullet",
        content="这是一个测试条目",
        section="defaults",
        metadata={"helpful": 5, "harmful": 0}
    )
    print(f"✅ Bullet创建成功: {bullet}")
    
    # 测试DummyLLMClient
    client = DummyLLMClient()
    print(f"✅ DummyLLMClient创建成功: {client}")
    
    print("🎉 所有测试通过！")

if __name__ == "__main__":
    test_ace_basic()
