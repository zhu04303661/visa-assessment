# 简历处理器测试说明

## 概述

`test_resume_processor.py` 是一个独立的测试脚本，用于测试简历处理器的各个功能模块。该脚本可以单独运行，无需启动Web服务器。

## 功能特性

### 测试模块
1. **文本提取功能测试** - 测试从不同格式文件中提取文本
2. **本地规则信息提取测试** - 测试基于规则的信息提取
3. **LLM客户端配置测试** - 测试AI客户端配置
4. **AI信息提取测试** - 测试使用AI进行信息提取
5. **知识库创建测试** - 测试个人知识库创建
6. **主知识库更新测试** - 测试主知识库更新
7. **安全预览功能测试** - 测试文本安全预览

### 测试数据
- 自动创建详细的测试简历文件
- 自动创建简化的测试简历文件
- 支持多种文件格式（txt, pdf, docx等）

## 使用方法

### 1. 快速测试（推荐）
```bash
cd ace_gtv
python quick_test.py
```

### 2. 完整测试
```bash
cd ace_gtv
python test_resume_processor.py
```

### 3. 配置检查
```bash
cd ace_gtv
python check_config.py
```

### 4. 演示脚本
```bash
cd ace_gtv
python demo_test.py
```

### 5. 环境配置
测试脚本会自动从项目根目录的 `.env.local` 文件中加载配置。如果该文件不存在，会回退到环境变量。

#### 配置文件方式（推荐）
在项目根目录创建或编辑 `.env.local` 文件：

```bash
# LLM提供商配置
LLM_PROVIDER=OPENAI

# OpenAI配置
OPENAI_API_KEY=your_openai_api_key
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Azure OpenAI配置（可选）
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
# AZURE_OPENAI_API_KEY=your_azure_api_key
# AZURE_OPENAI_API_VERSION=2024-02-15-preview
# AZURE_OPENAI_DEPLOYMENT=your_deployment_name

# Anthropic配置（可选）
# ANTHROPIC_API_KEY=your_anthropic_api_key
```

#### 环境变量方式（备选）
如果 `.env.local` 文件不存在，也可以使用环境变量：

```bash
export LLM_PROVIDER=OPENAI
export OPENAI_API_KEY=your_openai_api_key
export OPENAI_API_BASE=https://api.openai.com/v1
export OPENAI_MODEL=gpt-4o-mini
```

### 6. 超时配置
```bash
export PARSE_TIMEOUT_SEC=15      # 文件解析超时（秒）
export LLM_TIMEOUT_SEC=45        # LLM调用超时（秒）
export TOTAL_TIMEOUT_SEC=60      # 总超时（秒）
```

### 7. 日志配置
```bash
export LOG_LEVEL=INFO            # 日志级别：DEBUG, INFO, WARNING, ERROR
```

## 测试流程

1. **环境检查** - 检查必要的目录和依赖
2. **创建测试数据** - 自动生成测试简历文件
3. **运行功能测试** - 依次测试各个功能模块
4. **输出测试结果** - 显示测试通过率和详细结果
5. **清理测试数据** - 可选择清理生成的测试文件

## 测试输出

### 控制台输出
```
🧪 简历处理器独立测试脚本
==================================================
🔍 检查运行环境...
✅ 确保目录存在: data
✅ 确保目录存在: personal_kb
📁 创建测试文件...
✅ 创建测试简历文件: test_data/test_resume.txt
✅ 创建简化测试简历文件: test_data/simple_resume.txt

==================================================
🧪 运行测试: 文本提取功能
==================================================
✅ 详细简历文本提取成功，长度: 1234 字符
✅ 简化简历文本提取成功，长度: 567 字符
✅ 文本提取功能测试通过

...

==================================================
📊 测试结果汇总
==================================================
总测试数: 7
通过数: 7
失败数: 0
通过率: 100.0%
🎉 所有测试通过！
```

### 日志文件
- `test_resume_processor.log` - 详细的测试日志
- `resume_processor.log` - 简历处理器的运行日志

## 测试数据说明

### 详细测试简历
包含完整的简历信息：
- 个人信息（姓名、联系方式）
- 工作经验（多段经历）
- 教育背景
- 技能列表
- 成就和荣誉
- 项目经验
- 语言能力
- 认证证书

### 简化测试简历
包含基本的简历信息：
- 姓名和职位
- 联系方式
- 基本技能
- 简单经验描述

## 故障排除

### 常见问题

1. **模块导入失败**
   ```
   ❌ 简历处理器模块导入失败: No module named 'resume_processor'
   ```
   **解决方案**: 确保在 `ace_gtv` 目录下运行脚本

2. **LLM客户端配置失败**
   ```
   ⚠️  LLM客户端未配置，跳过AI提取测试
   ```
   **解决方案**: 配置相应的API密钥，或使用本地规则提取

3. **文件解析失败**
   ```
   ❌ PDF解析失败: 未安装 pdfminer.six
   ```
   **解决方案**: 安装必要的依赖包
   ```bash
   pip install pdfminer.six python-docx
   ```

4. **权限错误**
   ```
   ❌ 创建个人知识库失败: Permission denied
   ```
   **解决方案**: 检查目录权限，确保有写入权限

### 调试模式

启用详细日志：
```bash
export LOG_LEVEL=DEBUG
python test_resume_processor.py
```

## 扩展测试

### 添加自定义测试
可以在 `ResumeProcessorTester` 类中添加新的测试方法：

```python
def test_custom_function(self) -> bool:
    """自定义测试函数"""
    logger.info("🧪 测试自定义功能...")
    try:
        # 测试逻辑
        return True
    except Exception as e:
        logger.error(f"❌ 自定义测试失败: {e}")
        return False
```

### 测试特定文件格式
可以修改 `create_test_files` 方法添加更多文件格式的测试：

```python
# 添加PDF测试文件
pdf_file = self.test_data_dir / "test_resume.pdf"
# 创建PDF文件...
```

## 依赖要求

### 必需依赖
- Python 3.7+
- Flask
- requests
- python-dotenv

### 可选依赖
- `pdfminer.six` - PDF文件解析
- `python-docx` - DOCX文件解析
- `openai` - OpenAI API
- `anthropic` - Anthropic API

### 安装依赖
```bash
pip install -r requirements.txt
```

## 注意事项

1. **测试数据隔离**: 测试会创建独立的测试数据，不会影响生产数据
2. **自动清理**: 测试完成后可以选择清理测试数据
3. **环境变量**: 某些测试需要配置相应的API密钥
4. **文件权限**: 确保有足够的文件读写权限
5. **网络连接**: AI提取测试需要网络连接

## 贡献

如需添加新的测试用例或改进现有测试，请：
1. 在 `ResumeProcessorTester` 类中添加新的测试方法
2. 在 `run_all_tests` 方法中注册新测试
3. 更新本文档说明
4. 确保测试可以独立运行
