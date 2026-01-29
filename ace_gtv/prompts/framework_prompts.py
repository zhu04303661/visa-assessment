"""
框架构建提示词模板
这些模板存储在数据库中，支持变量替换和版本管理

变量说明:
- {client_name}: 申请人姓名
- {evidence_text}: 格式化的证据文本
- {context}: 补充背景信息
- {role_options}: 工作岗位选项
- {mc_key}: MC标准键值
- {mc_description}: MC标准描述
- {mc_requirement}: MC标准要求
- {oc_key}: OC标准键值
- {oc_description}: OC标准描述
- {oc_requirement}: OC标准要求
- {domain_info}: 领域定位信息
- {mc_info}: MC标准信息
- {oc_info}: OC标准信息
"""

# 领域定位分析提示词
DOMAIN_POSITIONING_PROMPT = """你是资深GTV签证顾问。请根据以下已分类的申请人证据，深度分析其领域定位。

## 申请人: {client_name}

## 已分类的证据材料
{evidence_text}

## 补充背景信息
{context}

## Tech Nation 工作岗位选项（可多选）
{role_options}

## 输出要求
基于证据材料进行专业分析，返回JSON格式：
{{
    "评估机构": "Tech Nation",
    "细分领域": "根据Tech Nation官方分类选择（如：AI & Machine Learning, FinTech, Hardware & Devices, Digital Health, Cyber Security, Gaming, Creative Industries等）",
    "岗位定位": "申请人的核心职业定位（如：创业者/创始人、技术领导者、投资人、产品专家等）",
    "工作岗位选择": ["从上面的选项中选择1-3个最匹配的岗位"],
    "核心论点": "一句话精炼概括申请人的独特价值主张，必须具体、有数据支撑、有说服力（如：拥有10年AI领域研发经验的技术领导者，主导开发了服务百万用户的智能系统）",
    "申请路径": "Exceptional Talent（5年+资深经验、行业领导者）或 Exceptional Promise（早期职业、有突出潜力）",
    "论证重点": "申请中需要特别论证的关键点（如：如何将投资经历与科技公司运营关联起来）",
    "背书论证要点": [
        "需要向Tech Nation论证的核心要点1（如：产品是数字科技导向的产品）",
        "需要向Tech Nation论证的核心要点2（如：申请人在行业里的先进性和领先地位）"
    ],
    "source_files": ["用于判断的主要来源文件"]
}}

## 重要要求
1. 所有结论必须基于证据材料中的真实信息，不要杜撰
2. 核心论点必须具体、量化、有说服力，避免空泛表述
3. 论证重点要识别申请材料中的"割裂点"或需要解释的地方
4. 背书论证要点要明确列出需要重点向Tech Nation证明的内容"""

# MC标准分析提示词
MC_CRITERIA_PROMPT = """你是GTV签证专家。请根据以下已分类的证据，分析申请人是否符合MC标准：{mc_key}

## 标准描述
{mc_description}

{mc_requirement}

## 申请人: {client_name}

## 该标准的相关证据
{evidence_text}

## 补充材料
{context}

## 输出要求
严格根据以上证据分析，返回JSON格式：
{{
    "applicable": true或false（是否适用此标准）,
    "evidence_list": [
        {{
            "title": "证据标题（必须是材料中的真实内容）",
            "description": "具体描述（引用材料原文关键内容）",
            "source_file": "来源文件名",
            "strength": "强/中/弱",
            "key_data": "关键数据指标（如有）"
        }}
    ],
    "summary": "一段话概述如何满足此标准（必须基于实际证据）",
    "strength_score": 0-5（基于证据强度的评分：0=无证据，1-2=弱，3=中等，4-5=强）,
    "gaps": ["如有不足，列出需要补充的证据"]
}}

## 重要要求
1. evidence_list中的每项必须来自上述证据材料，带有明确的source_file
2. 如果没有相关证据，applicable应为false，evidence_list为空
3. 不要杜撰或假设任何信息
4. strength_score必须与证据质量相匹配"""

# OC标准分析提示词
OC_CRITERIA_PROMPT = """你是GTV签证专家。请根据以下已分类的证据，分析申请人是否符合OC标准：{oc_key}

## 标准描述
{oc_description}

{oc_requirement}

## 申请人: {client_name}

## 该标准的相关证据
{evidence_text}

## 补充材料
{context}

## 输出要求
严格根据以上证据分析，返回JSON格式：
{{
    "applicable": true或false（是否适用此标准）,
    "evidence_list": [
        {{
            "title": "证据标题",
            "description": "具体描述（引用材料原文关键内容）",
            "source_file": "来源文件名",
            "strength": "强/中/弱",
            "key_data": "关键数据指标（如有）"
        }}
    ],
    "summary": "一段话概述如何满足此标准",
    "strength_score": 0-5,
    "gaps": ["需要补充的证据"]
}}

## 重要要求
1. 每条证据必须有明确的source_file来源
2. 没有证据时applicable为false
3. 不要杜撰信息"""

# 推荐人分析提示词
RECOMMENDER_ANALYSIS_PROMPT = """你是资深GTV签证顾问。请根据以下推荐人相关证据，专业分析并组织推荐人策略。

## 申请人: {client_name}

## 推荐人相关证据
{evidence_text}

## 补充材料
{context}

## GTV推荐信要求
- 需要3封推荐信，每封应聚焦不同能力维度
- 推荐人应是"领先行业专家"(leading industry expert)
- 推荐人背景应多元化：学术专家、行业领袖、商业合作伙伴等
- 每位推荐人需要有明确的推荐角度和论点

## 输出要求
返回JSON格式（每位推荐人都要有明确的推荐角度）：
{{
    "推荐人1": {{
        "name": "推荐人姓名",
        "title": "职位/职称",
        "organization": "机构/公司",
        "field": "推荐人的专业领域（如：人工智能、光学工程、投资等）",
        "relationship": "与申请人的具体关系（如：博士导师、投资合作伙伴、技术顾问）",
        "recommendation_angle": "推荐角度/论点（如：从AI技术研发创新能力角度推荐申请人）",
        "focus_points": [
            "推荐信中应重点阐述的论点1（具体到可操作）",
            "推荐信中应重点阐述的论点2"
        ],
        "supports_criteria": ["支持的MC/OC标准，如MC1, OC1"],
        "status": "已确认/待确认",
        "source_file": "信息来源文件"
    }},
    "推荐人2": {{
        "name": "",
        "title": "",
        "organization": "",
        "field": "",
        "relationship": "",
        "recommendation_angle": "",
        "focus_points": [],
        "supports_criteria": [],
        "status": "",
        "source_file": ""
    }},
    "推荐人3": {{
        "name": "",
        "title": "",
        "organization": "",
        "field": "",
        "relationship": "",
        "recommendation_angle": "",
        "focus_points": [],
        "supports_criteria": [],
        "status": "",
        "source_file": ""
    }}
}}

## 重要要求
1. 信息必须来自上述证据材料，不要杜撰推荐人
2. recommendation_angle必须具体明确，如"从被投资企业角度论证申请人对数字科技企业的商业敏感度"
3. focus_points要具体到推荐信撰写可以直接参考
4. supports_criteria要明确每位推荐人的推荐信可以支持哪些MC/OC标准
5. 三位推荐人的角度应互补，覆盖不同维度"""

# 个人陈述要点生成提示词
PERSONAL_STATEMENT_PROMPT = """你是GTV签证专家。请根据以下信息，生成个人陈述的核心要点。

## 申请人: {client_name}

## 领域定位
{domain_info}

## 申请人证据概览
{evidence_text}

## 输出要求
返回JSON格式：
{{
    "opening_hook": "个人陈述开篇引言（吸引人的开头，展现独特价值）",
    "technical_journey": "技术/职业发展历程概述（关键转折点和成长）",
    "key_achievements": [
        {{
            "achievement": "核心成就1",
            "evidence": "支撑证据",
            "source_file": "来源文件"
        }},
        {{
            "achievement": "核心成就2",
            "evidence": "支撑证据",
            "source_file": "来源文件"
        }},
        {{
            "achievement": "核心成就3",
            "evidence": "支撑证据",
            "source_file": "来源文件"
        }}
    ],
    "uk_vision": "对英国数字科技领域的贡献愿景",
    "conclusion": "总结陈述"
}}

## 重要要求
1. key_achievements必须基于真实证据，标注来源
2. 内容应与GTV评估标准紧密对应
3. 语言应专业、有说服力，适合正式申请文书"""

# 申请策略生成提示词
APPLICATION_STRATEGY_PROMPT = """你是GTV签证专家。请根据以下框架分析结果，生成整体申请策略。

## 申请人: {client_name}

## 已分析的框架信息
{framework_summary}

## 输出要求
返回JSON格式：
{{
    "overall_strength": "整体申请强度评估（强/中/弱）",
    "recommended_path": "推荐的申请路径（Exceptional Talent/Exceptional Promise）",
    "key_strengths": [
        "核心优势1",
        "核心优势2",
        "核心优势3"
    ],
    "areas_to_strengthen": [
        {{
            "area": "需要加强的领域",
            "suggestion": "具体建议",
            "priority": "高/中/低"
        }}
    ],
    "evidence_priorities": [
        {{
            "criteria": "MC1/OC1等",
            "current_strength": "当前强度",
            "action_items": ["需要采取的行动"]
        }}
    ],
    "timeline_suggestion": "建议的申请时间线",
    "risk_factors": ["潜在风险因素"],
    "success_probability": "成功概率评估（高/中/低）"
}}

## 重要要求
1. 策略必须基于实际分析结果
2. 建议要具体可执行
3. 风险评估要客观真实"""

# MC标准描述
MC_DESCRIPTIONS = {
    "MC1_产品团队领导力": "领导产品导向的数字科技公司/产品/团队增长的证据",
    "MC2_商业发展": "领导营销或业务开发，实现收入/客户增长的证据",
    "MC3_非营利组织": "领导数字科技领域非营利组织或社会企业的证据",
    "MC4_专家评审": "担任评审同行工作的重要专家角色的证据"
}

MC_REQUIREMENTS = {
    "MC1_产品团队领导力": """
需要证明以下要点：
1. 在产品导向的数字科技公司/团队中担任领导角色
2. 领导团队规模、职责范围
3. 产品/团队增长的具体数据（用户量、收入、团队规模等）
4. 决策权和影响力的证据""",
    "MC2_商业发展": """
需要证明以下要点：
1. 在营销或业务开发中的领导角色
2. 具体的收入增长数据（百分比、金额）
3. 客户/用户增长数据
4. 市场拓展成果（新市场、新渠道等）""",
    "MC3_非营利组织": """
需要证明以下要点：
1. 在数字科技领域非营利组织或社会企业中的领导角色
2. 组织的规模和影响力
3. 社会影响力的具体数据
4. 技术或创新方面的贡献""",
    "MC4_专家评审": """
需要证明以下要点：
1. 作为评审专家的资格和邀请
2. 评审的会议/期刊/项目的级别和影响力
3. 评审的次数和持续时间
4. 评审领域与数字科技的关联"""
}

# OC标准描述
OC_DESCRIPTIONS = {
    "OC1_创新": "创新/产品开发及市场验证证据（专利、产品发布、用户规模等）",
    "OC2_行业认可": "作为领域专家获得的认可证据（奖项、媒体报道、演讲邀请等）",
    "OC3_重大贡献": "对数字技术产品的重大技术/商业贡献（用户量、收入、技术突破等）",
    "OC4_学术贡献": "在数字技术领域的学术贡献（论文发表、引用、学术会议等）"
}

OC_REQUIREMENTS = {
    "OC1_创新": """
需要证明以下要点：
1. 创新产品/技术的开发（发明、专利、新产品）
2. 市场验证证据（用户反馈、市场份额、商业化成果）
3. 创新的独特性和技术难度
4. 创新对行业的影响""",
    "OC2_行业认可": """
需要证明以下要点：
1. 获得的奖项（奖项名称、颁发机构、级别）
2. 媒体报道（媒体名称、报道内容）
3. 演讲邀请（会议名称、级别、主题）
4. 专家身份的认可（评审、顾问等）""",
    "OC3_重大贡献": """
需要证明以下要点：
1. 对产品的具体贡献（功能、模块、系统）
2. 贡献的规模和影响（用户量、收入贡献）
3. 技术突破或创新点
4. 团队/公司对其贡献的认可""",
    "OC4_学术贡献": """
需要证明以下要点：
1. 论文发表（期刊/会议名称、CCF级别、引用数）
2. 学术会议参与（会议名称、角色）
3. 开源贡献（项目名称、Star数、影响力）
4. 学术合作和影响力"""
}

# 所有提示词配置，用于同步到数据库
FRAMEWORK_PROMPTS_CONFIG = [
    {
        "name": "领域定位分析",
        "type": "framework_domain",
        "description": "分析申请人的领域定位、岗位定位和核心论点",
        "content": DOMAIN_POSITIONING_PROMPT,
        "category": "framework"
    },
    {
        "name": "MC1产品团队领导力分析",
        "type": "framework_mc1",
        "description": "分析MC1标准：领导产品导向的数字科技公司/产品/团队增长的证据",
        "content": MC_CRITERIA_PROMPT,
        "category": "framework"
    },
    {
        "name": "MC2商业发展分析",
        "type": "framework_mc2",
        "description": "分析MC2标准：领导营销或业务开发，实现收入/客户增长的证据",
        "content": MC_CRITERIA_PROMPT,
        "category": "framework"
    },
    {
        "name": "MC3非营利组织分析",
        "type": "framework_mc3",
        "description": "分析MC3标准：领导数字科技领域非营利组织或社会企业的证据",
        "content": MC_CRITERIA_PROMPT,
        "category": "framework"
    },
    {
        "name": "MC4专家评审分析",
        "type": "framework_mc4",
        "description": "分析MC4标准：担任评审同行工作的重要专家角色的证据",
        "content": MC_CRITERIA_PROMPT,
        "category": "framework"
    },
    {
        "name": "OC1创新分析",
        "type": "framework_oc1",
        "description": "分析OC1标准：创新/产品开发及市场验证证据",
        "content": OC_CRITERIA_PROMPT,
        "category": "framework"
    },
    {
        "name": "OC2行业认可分析",
        "type": "framework_oc2",
        "description": "分析OC2标准：作为领域专家获得的认可证据",
        "content": OC_CRITERIA_PROMPT,
        "category": "framework"
    },
    {
        "name": "OC3重大贡献分析",
        "type": "framework_oc3",
        "description": "分析OC3标准：对数字技术产品的重大技术/商业贡献",
        "content": OC_CRITERIA_PROMPT,
        "category": "framework"
    },
    {
        "name": "OC4学术贡献分析",
        "type": "framework_oc4",
        "description": "分析OC4标准：在数字技术领域的学术贡献",
        "content": OC_CRITERIA_PROMPT,
        "category": "framework"
    },
    {
        "name": "推荐人分析",
        "type": "framework_recommenders",
        "description": "分析并组织推荐人策略",
        "content": RECOMMENDER_ANALYSIS_PROMPT,
        "category": "framework"
    },
    {
        "name": "个人陈述要点生成",
        "type": "framework_ps",
        "description": "生成个人陈述的核心要点",
        "content": PERSONAL_STATEMENT_PROMPT,
        "category": "framework"
    },
    {
        "name": "申请策略生成",
        "type": "framework_strategy",
        "description": "生成整体申请策略",
        "content": APPLICATION_STRATEGY_PROMPT,
        "category": "framework"
    }
]


def get_prompt_variables(prompt_type: str) -> list:
    """获取提示词可用的变量列表"""
    variable_map = {
        "framework_domain": ["client_name", "evidence_text", "context", "role_options"],
        "framework_mc1": ["mc_key", "mc_description", "mc_requirement", "client_name", "evidence_text", "context"],
        "framework_mc2": ["mc_key", "mc_description", "mc_requirement", "client_name", "evidence_text", "context"],
        "framework_mc3": ["mc_key", "mc_description", "mc_requirement", "client_name", "evidence_text", "context"],
        "framework_mc4": ["mc_key", "mc_description", "mc_requirement", "client_name", "evidence_text", "context"],
        "framework_oc1": ["oc_key", "oc_description", "oc_requirement", "client_name", "evidence_text", "context"],
        "framework_oc2": ["oc_key", "oc_description", "oc_requirement", "client_name", "evidence_text", "context"],
        "framework_oc3": ["oc_key", "oc_description", "oc_requirement", "client_name", "evidence_text", "context"],
        "framework_oc4": ["oc_key", "oc_description", "oc_requirement", "client_name", "evidence_text", "context"],
        "framework_recommenders": ["client_name", "evidence_text", "context"],
        "framework_ps": ["client_name", "domain_info", "evidence_text"],
        "framework_strategy": ["client_name", "framework_summary"],
    }
    return variable_map.get(prompt_type, [])
