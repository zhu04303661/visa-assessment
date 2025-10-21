# GTV ACE自我进化系统

基于Agentic Context Engineering (ACE)框架的GTV签证评估自我进化代理系统。

## 🚀 快速开始

### 一键启动
```bash
./start_ace_system.sh
```

这将同时启动：
- Python ACE服务器 (端口5001)
- Next.js应用 (端口3000)

### 手动启动

1. **启动ACE服务器**
```bash
cd ace_gtv
python3 api_server_working.py
```

2. **启动Next.js应用**
```bash
pnpm dev
```

## 🌟 功能特性

- **自我学习**: 基于每次对话不断优化知识库
- **智能评估**: 专业的GTV签证评估和建议
- **实时进化**: 通过反思和策展机制持续改进
- **多路径支持**: 支持Exceptional Talent、Exceptional Promise、Startup Visa等路径

## 📡 API接口

### 健康检查
```
GET http://localhost:5001/health
```

### ACE聊天
```
POST http://localhost:5001/api/ace/chat
Content-Type: application/json

{
  "message": "我想申请GTV签证",
  "context": "我是AI研发工程师",
  "conversationHistory": []
}
```

### 知识库状态
```
GET http://localhost:5001/api/ace/playbook
```

## 🧠 ACE工作原理

### 1. 生成器 (Generator)
- 基于当前知识库生成回答
- 引用相关的知识条目
- 提供推理过程

### 2. 反思器 (Reflector)
- 分析生成器输出的质量
- 识别错误和不足
- 提取关键洞察

### 3. 策展人 (Curator)
- 将反思结果转化为知识库更新
- 添加、修改或删除知识条目
- 维护知识库的质量

### 4. 任务环境 (TaskEnvironment)
- 评估生成器输出的质量
- 提供反馈和评分
- 支持GTV特定的评估逻辑

## 🔄 自我进化流程

1. **接收问题** → 用户提问
2. **生成回答** → 基于知识库生成回答
3. **环境评估** → 评估回答质量
4. **反思分析** → 分析回答的优缺点
5. **知识更新** → 更新知识库
6. **持续学习** → 为下次对话做准备

## 📊 知识库结构

知识库包含以下章节：

- **defaults**: 基础定义和概念
- **guidelines**: 评估指南和标准
- **examples**: 示例和案例
- **warnings**: 注意事项和常见错误

每个知识条目包含：
- 内容描述
- 有用性评分 (helpful)
- 有害性评分 (harmful)
- 标签分类

## 🛠️ 开发指南

### 添加新的评估标准

在 `ace_gtv/gtv_ace_with_responses.py` 中的 `GTVTaskEnvironment` 类中修改评估逻辑：

```python
def evaluate(self, sample: Sample, generator_output) -> EnvironmentResult:
    # 添加您的评估逻辑
    pass
```

### 扩展知识库

在 `_initialize_gtv_playbook` 方法中添加新的知识条目：

```python
initial_bullets = [
    {
        "id": "your_bullet_id",
        "content": "知识内容",
        "section": "guidelines",
        "helpful": 5,
        "harmful": 0
    }
]
```

## 🐛 故障排除

### ACE服务无法启动
1. 检查Python版本 (需要3.9+)
2. 确保依赖已安装: `pip install -r ace_gtv/requirements.txt`
3. 检查ACE-open文件夹是否存在

### API连接失败
1. 检查ACE服务器是否运行在5001端口
2. 确认防火墙设置
3. 检查环境变量配置

### 知识库不更新
1. 检查反思器输出
2. 确认策展人逻辑
3. 查看服务器日志

## 📈 性能优化

- 使用连接池管理数据库连接
- 实现知识库缓存机制
- 优化LLM调用频率
- 添加请求限流

## 🔒 安全考虑

- API密钥管理
- 输入验证和清理
- 防止恶意输入
- 访问控制和认证

## 📝 日志和监控

系统提供详细的日志记录：

- 对话历史
- 知识库更新
- 错误和异常
- 性能指标

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

## 📄 许可证

MIT License

## 🙏 致谢

- ACE框架原作者
- OpenAI GPT模型
- Flask和Next.js社区
