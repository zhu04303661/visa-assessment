#!/usr/bin/env python3
"""从评估数据 JSON 生成格式化的 GTV 评估报告 Markdown 文件。

支持多种输入格式：
- API 返回的 gtvAnalysis 格式
- 手动整理的 assessment_report 格式（含 assessment_report.json 的 schema）

输出：
- 格式化的 assessment_report.md
- 在 JSON 中增加 chart_data 字段（雷达图数据，供前端可视化）

用法:
  python3 scripts/generate_report.py assessment_data.json -o assessment_report.md
  python3 scripts/generate_report.py assessment_data.json -o 评估报告/assessment_report.md --json-out 评估报告/assessment_report.json
"""
import argparse
import json
import sys
from pathlib import Path

# MC/OC 维度定义（用于雷达图和报告）
MC_DIMENSIONS = [
    ("教育背景", "education", 25),
    ("工作经验", "experience", 30),
    ("技术专长", "technical", 20),
    ("行业影响力", "industry_impact", 25),
]
OC_DIMENSIONS = [
    ("国际认可度", "international", 30),
    ("创新贡献", "innovation", 25),
    ("领导力", "leadership", 25),
    ("社会影响", "social_impact", 20),
]


def extract_score_from_criteria(criteria_assessment: list, name: str) -> tuple:
    """从 criteriaAssessment 中提取指定维度的得分。"""
    for item in criteria_assessment:
        item_name = item.get("name", "")
        if name in item_name or item_name in name:
            return item.get("score", 0), item.get("evidence", "")
    return 0, ""


def parse_api_format(data: dict) -> dict:
    """解析 API 返回的 gtvAnalysis 格式。"""
    normalized = {
        "overall_score": data.get("overallScore", 0),
        "recommended_pathway": "待评估",
        "confidence": 0.85,
        "applicant_info": {},
        "mc_scores": {},
        "oc_scores": {},
        "strengths": [],
        "weaknesses": [],
        "recommendation": data.get("recommendation", ""),
        "professional_advice": data.get("professionalAdvice", []),
        "timeline": data.get("timeline", ""),
    }

    # 申请人信息
    app_info = data.get("applicantInfo", {})
    if app_info:
        normalized["applicant_info"] = {
            "name": app_info.get("name", ""),
            "field": app_info.get("field", ""),
            "current_position": app_info.get("currentPosition", ""),
            "company": app_info.get("company", ""),
            "years_of_experience": app_info.get("yearsOfExperience", ""),
        }

    # 推荐路径
    gtv_pathway = data.get("gtvPathway", {})
    if gtv_pathway:
        normalized["recommended_pathway"] = gtv_pathway.get("recommendedRoute", "待评估")
        normalized["eligibility_level"] = gtv_pathway.get("eligibilityLevel", "")

    # 从 criteriaAssessment 提取 MC/OC 得分
    criteria = data.get("criteriaAssessment", [])
    if criteria:
        for label, key, _ in MC_DIMENSIONS:
            score, _ = extract_score_from_criteria(criteria, label)
            normalized["mc_scores"][key] = score
        for label, key, _ in OC_DIMENSIONS:
            score, _ = extract_score_from_criteria(criteria, label)
            normalized["oc_scores"][key] = score

    # 若 criteriaAssessment 为空，尝试从其他字段推断
    if not normalized["mc_scores"]:
        industry_impact = data.get("industryAnalysis", {}).get("industryImpact", 0)
        company_impact = data.get("companyContribution", {}).get("impact", 0)
        industry_status = data.get("industryStatus", {}).get("status", 0)
        if industry_impact or company_impact or industry_status:
            normalized["mc_scores"] = {
                "education": 0,
                "experience": 0,
                "technical": 0,
                "industry_impact": (industry_impact + company_impact + industry_status) / 3 * 10 if (industry_impact or company_impact or industry_status) else 0,
            }

    # 优势与不足
    strengths = data.get("strengths", [])
    if strengths and isinstance(strengths[0], dict):
        normalized["strengths"] = [
            s.get("description", "") or s.get("area", "") for s in strengths
        ]
    else:
        normalized["strengths"] = [str(s) for s in strengths] if strengths else []

    weaknesses = data.get("weaknesses", [])
    if weaknesses and isinstance(weaknesses[0], dict):
        normalized["weaknesses"] = [
            w.get("description", "") or w.get("improvement", "") or w.get("area", "") for w in weaknesses
        ]
    else:
        normalized["weaknesses"] = [str(w) for w in weaknesses] if weaknesses else []

    return normalized


def parse_assessment_format(data: dict) -> dict:
    """解析手动整理的 assessment_report 格式。"""
    return {
        "overall_score": data.get("overall_score", data.get("overallScore", 0)),
        "recommended_pathway": data.get("recommended_pathway", data.get("recommendedPathway", "待评估")),
        "confidence": data.get("confidence", 0.85),
        "applicant_info": data.get("applicant_info", data.get("applicantInfo", {})),
        "mc_scores": data.get("mc_scores", data.get("mcScores", {})),
        "oc_scores": data.get("oc_scores", data.get("ocScores", {})),
        "strengths": data.get("strengths", []),
        "weaknesses": data.get("weaknesses", []),
        "recommendation": data.get("recommendation", ""),
        "professional_advice": data.get("professional_advice", data.get("professionalAdvice", [])),
        "timeline": data.get("timeline", ""),
    }


def build_chart_data(normalized: dict) -> dict:
    """构建雷达图数据。"""
    labels = []
    values = []
    max_values = []

    for label, key, weight in MC_DIMENSIONS:
        labels.append(label)
        score = normalized.get("mc_scores", {}).get(key, 0)
        max_val = weight  # 假设满分等于权重
        values.append(min(score, max_val))
        max_values.append(max_val)

    for label, key, weight in OC_DIMENSIONS:
        labels.append(label)
        score = normalized.get("oc_scores", {}).get(key, 0)
        max_val = weight
        values.append(min(score, max_val))
        max_values.append(max_val)

    return {
        "labels": labels,
        "values": values,
        "max_values": max_values,
    }


def generate_markdown(normalized: dict) -> str:
    """生成 Markdown 格式报告。"""
    lines = [
        "# GTV 资格评估报告",
        "",
        "## 总体评分",
        "",
        f"- **总分**：{normalized['overall_score']}/100",
        f"- **推荐路径**：{normalized['recommended_pathway']}",
        f"- **信心指数**：{int(normalized.get('confidence', 0.85) * 100)}%",
        "",
    ]

    # 申请人信息
    app_info = normalized.get("applicant_info", {})
    if app_info and any(app_info.values()):
        lines.extend([
            "## 申请人信息",
            "",
            "| 项目 | 内容 |",
            "|------|------|",
        ])
        for k, v in app_info.items():
            if v:
                lines.append(f"| {k} | {v} |")
        lines.extend(["", ""])

    # 评分明细
    lines.extend(["## 评分明细", "", "| 维度 | 得分 | 满分 | 评价 |", "|------|------|------|------|"])

    mc_scores = normalized.get("mc_scores", {})
    for label, key, max_score in MC_DIMENSIONS:
        score = mc_scores.get(key, 0)
        pct = int(score / max_score * 100) if max_score else 0
        comment = "优秀" if pct >= 80 else "良好" if pct >= 60 else "一般" if pct >= 40 else "需加强"
        lines.append(f"| {label} | {score} | {max_score} | {comment} |")

    oc_scores = normalized.get("oc_scores", {})
    for label, key, max_score in OC_DIMENSIONS:
        score = oc_scores.get(key, 0)
        pct = int(score / max_score * 100) if max_score else 0
        comment = "优秀" if pct >= 80 else "良好" if pct >= 60 else "一般" if pct >= 40 else "需加强"
        lines.append(f"| {label} | {score} | {max_score} | {comment} |")

    lines.extend(["", "## 优势亮点", ""])
    for s in normalized.get("strengths", []):
        lines.append(f"- {s}")
    if not normalized.get("strengths"):
        lines.append("- （无）")

    lines.extend(["", "## 需要加强", ""])
    for w in normalized.get("weaknesses", []):
        lines.append(f"- {w}")
    if not normalized.get("weaknesses"):
        lines.append("- （无）")

    if normalized.get("recommendation"):
        lines.extend(["", "## 综合建议", "", normalized["recommendation"], ""])

    advice = normalized.get("professional_advice", [])
    if advice:
        lines.extend(["", "## 下一步建议", ""])
        if isinstance(advice[0], dict):
            for i, a in enumerate(advice, 1):
                action = a.get("action", a.get("description", str(a)))
                priority = a.get("priority", "")
                lines.append(f"{i}. {action}" + (f"（优先级：{priority}）" if priority else ""))
        else:
            for i, a in enumerate(advice, 1):
                lines.append(f"{i}. {a}")
        lines.append("")

    if normalized.get("timeline"):
        lines.extend(["", "## 时间规划", "", normalized["timeline"], ""])

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="从评估数据 JSON 生成 GTV 评估报告")
    parser.add_argument("input", help="评估数据 JSON 文件路径")
    parser.add_argument("-o", "--output", required=True, help="输出 Markdown 文件路径")
    parser.add_argument("--json-out", help="同时输出带 chart_data 的 JSON 文件路径")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"文件不存在: {args.input}", file=sys.stderr)
        sys.exit(1)

    raw = json.loads(input_path.read_text(encoding="utf-8"))

    # 兼容 gtvAnalysis 包装
    if "gtvAnalysis" in raw:
        data = raw["gtvAnalysis"]
    else:
        data = raw

    # 判断格式并解析
    if "applicantInfo" in data or "overallScore" in data or "criteriaAssessment" in data:
        normalized = parse_api_format(data)
    else:
        normalized = parse_assessment_format(data)

    # 构建雷达图数据
    chart_data = build_chart_data(normalized)
    normalized["chart_data"] = chart_data

    # 生成 Markdown
    md_content = generate_markdown(normalized)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(md_content, encoding="utf-8")
    print(f"报告已生成: {output_path}")

    # 可选：输出带 chart_data 的 JSON
    if args.json_out:
        json_out_path = Path(args.json_out)
        json_out_path.parent.mkdir(parents=True, exist_ok=True)
        full_output = {
            **raw,
            "assessment_report": normalized,
            "chart_data": chart_data,
        }
        if "gtvAnalysis" in raw:
            full_output["gtvAnalysis"] = {**raw["gtvAnalysis"], "chart_data": chart_data}
        json_out_path.write_text(json.dumps(full_output, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"JSON 已输出: {json_out_path}")


if __name__ == "__main__":
    main()
