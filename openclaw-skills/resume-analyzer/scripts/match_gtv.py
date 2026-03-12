#!/usr/bin/env python3
"""按 MC/OC 维度匹配 GTV 亮点，输出匹配报告和差距分析。

用法:
  python3 scripts/match_gtv.py resume_analysis.json -o gtv_highlights.md
  python3 scripts/match_gtv.py resume_analysis.json --json -o gtv_highlights.json

输入: resume_analysis.json（parse_resume.py 输出）
输出: GTV 亮点匹配报告（Markdown 或 JSON）
"""
import argparse
import json
import re
import sys
from pathlib import Path


# MC 维度关键词与模式
MC_PATTERNS = {
    "MC1": {
        "keywords": ["奖项", "认可", "媒体报道", "行业认可", "award", "recognition", "media"],
        "title": "专业成就与认可",
    },
    "MC2": {
        "keywords": ["VP", "Director", "CTO", "CEO", "创始人", "负责", "领导", "lead", "architect"],
        "title": "领导角色",
    },
    "MC3": {
        "keywords": ["营收", "增长", "用户", "市场份额", "融资", "revenue", "growth", "user", "funding"],
        "title": "商业成功",
    },
    "MC4": {
        "keywords": ["政府", "行业", "数据统计", "标准", "government", "industry", "market"],
        "title": "行业影响力",
    },
}

# OC 维度关键词与模式
OC_PATTERNS = {
    "OC1": {
        "keywords": ["创新", "专利", "技术突破", "innovation", "patent", "breakthrough"],
        "title": "创新贡献",
    },
    "OC2": {
        "keywords": ["论文", "发表", "顶会", "顶刊", "paper", "publication", "conference"],
        "title": "学术贡献",
    },
    "OC3": {
        "keywords": ["架构", "技术决策", "团队", "技术方向", "architecture", "mentor", "lead"],
        "title": "技术领导力",
    },
    "OC4": {
        "keywords": ["开源", "社区", "社会影响", "open source", "community", "GitHub", "star"],
        "title": "行业外贡献",
    },
}

# 高价值加分关键词
HIGH_VALUE_KEYWORDS = [
    "国际", "International", "全球", "Global",
    "百万", "千万", "亿", "million", "billion",
    "国家级", "政府", "行业标准", "Top",
    "Principal", "Staff", "Architect", "Mentor",
]


def extract_text_from_data(data: dict) -> str:
    """从 resume_analysis 中提取所有可搜索文本。"""
    parts = []

    for edu in data.get("education", []):
        parts.append(json.dumps(edu, ensure_ascii=False))
    for exp in data.get("experience", []):
        parts.append(json.dumps(exp, ensure_ascii=False))
    for ach in data.get("achievements", []):
        parts.append(json.dumps(ach, ensure_ascii=False))
    for pub in data.get("publications", []):
        parts.append(json.dumps(pub, ensure_ascii=False))
    for pat in data.get("patents", []):
        parts.append(json.dumps(pat, ensure_ascii=False))
    for proj in data.get("projects", []):
        parts.append(json.dumps(proj, ensure_ascii=False))
    skills = data.get("skills", {})
    if isinstance(skills, dict):
        parts.append(json.dumps(skills, ensure_ascii=False))
    elif isinstance(skills, list):
        parts.append(" ".join(str(s) for s in skills))

    return "\n".join(parts)


def match_dimension(text: str, patterns: dict) -> list:
    """匹配单个维度集合（MC 或 OC）的亮点。"""
    text_lower = text.lower()
    results = []

    for dim_id, config in patterns.items():
        keywords = config["keywords"]
        title = config["title"]
        matches = []
        for kw in keywords:
            if kw.lower() in text_lower or kw in text:
                matches.append(kw)

        if matches:
            confidence = min(0.95, 0.5 + len(matches) * 0.1)
            high_value_boost = sum(1 for hv in HIGH_VALUE_KEYWORDS if hv in text or hv.lower() in text_lower)
            confidence = min(0.95, confidence + high_value_boost * 0.05)

            results.append({
                "dimension": dim_id,
                "evidence": f"匹配关键词: {', '.join(matches[:5])}",
                "source": "resume",
                "confidence": round(confidence, 2),
                "title": title,
            })

    return results


def compute_gap_analysis(data: dict, mc_matched: list, oc_matched: list) -> list:
    """计算差距分析：缺失或薄弱的维度。"""
    mc_dims = set(m["dimension"] for m in mc_matched)
    oc_dims = set(m["dimension"] for m in oc_matched)

    gaps = []

    for dim_id, config in MC_PATTERNS.items():
        if dim_id not in mc_dims:
            gaps.append({
                "dimension": dim_id,
                "suggestion": _get_gap_suggestion(dim_id, "MC"),
                "priority": "high" if dim_id in ("MC1", "MC2") else "medium",
            })

    for dim_id, config in OC_PATTERNS.items():
        if dim_id not in oc_dims:
            gaps.append({
                "dimension": dim_id,
                "suggestion": _get_gap_suggestion(dim_id, "OC"),
                "priority": "medium" if len(oc_dims) < 2 else "low",
            })

    return gaps


def _get_gap_suggestion(dim_id: str, category: str) -> str:
    """根据维度返回补强建议。"""
    suggestions = {
        "MC1": "可补充行业奖项、媒体报道、第三方认可材料",
        "MC2": "可突出领导职责、团队规模、决策权限",
        "MC3": "可补充商业数据：营收、用户规模、融资记录",
        "MC4": "可补充政府项目、行业标准参与、市场份额数据",
        "OC1": "可考虑申请专利、描述技术创新突破",
        "OC2": "可补充论文发表、顶会/顶刊、学术引用",
        "OC3": "可突出技术架构决策、团队建设、mentor 经历",
        "OC4": "可补充开源贡献、技术社区、社会影响力",
    }
    return suggestions.get(dim_id, "建议补充该维度的支撑证据")


def run_matching(data: dict) -> dict:
    """执行完整匹配流程。"""
    text = extract_text_from_data(data)

    mc_highlights = match_dimension(text, MC_PATTERNS)
    oc_highlights = match_dimension(text, OC_PATTERNS)

    gap_analysis = compute_gap_analysis(data, mc_highlights, oc_highlights)

    return {
        "mc": mc_highlights,
        "oc": oc_highlights,
        "gap_analysis": gap_analysis,
        "summary": {
            "mc_count": len(mc_highlights),
            "oc_count": len(oc_highlights),
            "gap_count": len(gap_analysis),
        },
    }


def generate_markdown(matching: dict, applicant_name: str = "") -> str:
    """生成 Markdown 格式报告。"""
    lines = [
        "# GTV 亮点匹配报告",
        "",
        f"**申请人**：{applicant_name or '（未指定）'}",
        f"**MC 亮点**：{matching['summary']['mc_count']} 项",
        f"**OC 亮点**：{matching['summary']['oc_count']} 项",
        f"**差距分析**：{matching['summary']['gap_count']} 项待补强",
        "",
        "---",
        "",
        "## Mandatory Criteria (MC) 亮点",
        "",
    ]

    if not matching["mc"]:
        lines.append("*（未识别到明显 MC 亮点，建议人工复核）*")
        lines.append("")
    else:
        lines.append("| 维度 | 标题 | 证据摘要 | 置信度 |")
        lines.append("|------|------|----------|--------|")
        for m in matching["mc"]:
            lines.append(f"| {m['dimension']} | {m['title']} | {m['evidence'][:40]}... | {m['confidence']} |")
        lines.append("")

    lines.extend([
        "## Optional Criteria (OC) 亮点",
        "",
    ])

    if not matching["oc"]:
        lines.append("*（未识别到明显 OC 亮点，建议人工复核）*")
        lines.append("")
    else:
        lines.append("| 维度 | 标题 | 证据摘要 | 置信度 |")
        lines.append("|------|------|----------|--------|")
        for m in matching["oc"]:
            lines.append(f"| {m['dimension']} | {m['title']} | {m['evidence'][:40]}... | {m['confidence']} |")
        lines.append("")

    lines.extend([
        "## 差距分析（待补强）",
        "",
        "| 维度 | 优先级 | 补强建议 |",
    ])
    lines.append("|------|--------|----------|")
    for g in matching["gap_analysis"]:
        lines.append(f"| {g['dimension']} | {g['priority']} | {g['suggestion']} |")
    lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="GTV 亮点匹配与差距分析")
    parser.add_argument("input", help="resume_analysis.json 文件路径")
    parser.add_argument("-o", "--output", help="输出文件路径")
    parser.add_argument("--json", action="store_true", help="输出 JSON 格式")
    parser.add_argument(
        "--update-input",
        dest="update_input",
        action="store_true",
        help="将匹配结果合并回输入文件，更新 gtv_highlights 和 gap_analysis",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"错误：文件不存在 {args.input}", file=sys.stderr)
        sys.exit(1)

    data = json.loads(input_path.read_text(encoding="utf-8"))
    matching = run_matching(data)

    if args.update_input:
        data["gtv_highlights"] = {"mc": matching["mc"], "oc": matching["oc"]}
        data["gap_analysis"] = matching["gap_analysis"]
        input_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"已更新: {args.input}")

    applicant_name = data.get("applicant", {}).get("name", "")

    if args.json:
        output = json.dumps(matching, ensure_ascii=False, indent=2)
    else:
        output = generate_markdown(matching, applicant_name)

    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
        print(f"已输出至: {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
