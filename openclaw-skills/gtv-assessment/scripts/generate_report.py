#!/usr/bin/env python3
"""从评估数据 JSON 生成格式化的 GTV 评估报告 Markdown 文件。

适配 v2.0 指标体系：MC1-MC4 / OC1-OC4 编号。

输出：
- 格式化的 assessment_report.md
- 在 JSON 中增加 chart_data 字段（雷达图数据）

用法:
  python3 scripts/generate_report.py assessment_data.json -o assessment_report.md
  python3 scripts/generate_report.py assessment_data.json -o report.md --json-out report.json
"""
import argparse
import json
import sys
from pathlib import Path

MC_DIMENSIONS = [
    ("MC1", "专业成就与认可", 15),
    ("MC2", "领导角色与产品贡献", 18),
    ("MC3", "商业成功证据", 15),
    ("MC4", "行业影响力", 12),
]
OC_DIMENSIONS = [
    ("OC1", "创新贡献", 10),
    ("OC2", "学术与知识贡献", 10),
    ("OC3", "技术领导力", 10),
    ("OC4", "行业外贡献与社会影响", 10),
]

LEGACY_MC_MAP = {
    "education": "MC1", "experience": "MC2",
    "technical": "MC3", "industry_impact": "MC4",
}
LEGACY_OC_MAP = {
    "international": "OC1", "innovation": "OC2",
    "leadership": "OC3", "social_impact": "OC4",
}


def _normalize(raw: dict) -> dict:
    """统一不同格式的评估数据为 v2.0 格式。"""
    if "gtvAnalysis" in raw:
        raw = raw["gtvAnalysis"]

    data = {}
    data["overall_score"] = float(raw.get("overallScore", raw.get("overall_score", 0)) or 0)
    data["recommended_pathway"] = (
        raw.get("gtvPathway", {}).get("recommendedRoute", "")
        or raw.get("recommended_pathway", "待评估")
    )
    data["confidence"] = raw.get("confidence", 0.85)

    app = raw.get("applicantInfo", raw.get("applicant_info", {}))
    data["applicant_info"] = {
        "name": app.get("name", "N/A"),
        "field": app.get("field", "N/A"),
        "endorsing_body": app.get("endorsing_body", app.get("endorsingBody", "")),
        "current_position": app.get("currentPosition", app.get("current_position", "")),
        "company": app.get("company", ""),
        "years_of_experience": app.get("yearsOfExperience", app.get("years_of_experience", "")),
    }

    mc_raw = raw.get("mc_scores", raw.get("mcScores", {}))
    oc_raw = raw.get("oc_scores", raw.get("ocScores", {}))

    criteria = raw.get("criteriaAssessment", [])
    if criteria:
        for item in criteria:
            name = item.get("name", "")
            score = item.get("score", 0)
            evidence = item.get("evidence", item.get("comments", ""))
            level = item.get("level", 0)
            web_verified = item.get("web_verified", False)
            for code, label, _ in MC_DIMENSIONS:
                if code in name or label in name:
                    mc_raw[code] = {"score": score, "level": level, "evidence": evidence, "web_verified": web_verified}
                    break
            for code, label, _ in OC_DIMENSIONS:
                if code in name or label in name:
                    oc_raw[code] = {"score": score, "level": level, "evidence": evidence, "web_verified": web_verified}
                    break

    mc_scores = {}
    for code, label, max_val in MC_DIMENSIONS:
        v = mc_raw.get(code, None)
        if v is None:
            for legacy_key, mapped_code in LEGACY_MC_MAP.items():
                if mapped_code == code and legacy_key in mc_raw:
                    v = mc_raw[legacy_key]
                    break
        if v is None:
            v = 0
        if isinstance(v, dict):
            mc_scores[code] = v
        else:
            mc_scores[code] = {"score": float(v), "max": max_val, "level": 0, "evidence": "", "web_verified": False}
        mc_scores[code].setdefault("max", max_val)

    oc_scores = {}
    for code, label, max_val in OC_DIMENSIONS:
        v = oc_raw.get(code, None)
        if v is None:
            for legacy_key, mapped_code in LEGACY_OC_MAP.items():
                if mapped_code == code and legacy_key in oc_raw:
                    v = oc_raw[legacy_key]
                    break
        if v is None:
            v = 0
        if isinstance(v, dict):
            oc_scores[code] = v
        else:
            oc_scores[code] = {"score": float(v), "max": max_val, "level": 0, "evidence": "", "web_verified": False}
        oc_scores[code].setdefault("max", max_val)

    data["mc_scores"] = mc_scores
    data["oc_scores"] = oc_scores

    data["web_verification"] = raw.get("web_verification", {})

    def _list(items, key="description"):
        if not items:
            return []
        result = []
        for it in items:
            if isinstance(it, str):
                result.append(it)
            elif isinstance(it, dict):
                result.append(it.get(key, it.get("area", str(it))))
        return result

    data["strengths"] = _list(raw.get("strengths", []))
    data["weaknesses"] = _list(raw.get("weaknesses", []), "improvement")
    if not data["weaknesses"]:
        data["weaknesses"] = _list(raw.get("weaknesses", []), "description")
    data["recommendation"] = raw.get("recommendation", "")
    data["professional_advice"] = _list(raw.get("professionalAdvice", raw.get("professional_advice", [])), "action")
    data["path_analysis"] = raw.get("path_analysis", {})

    return data


def _score_val(entry) -> float:
    if isinstance(entry, dict):
        return float(entry.get("score", 0))
    return float(entry)


def build_chart_data(data: dict) -> dict:
    labels, values, max_values = [], [], []
    for code, label, max_val in MC_DIMENSIONS:
        labels.append(f"{code} {label}")
        values.append(min(_score_val(data["mc_scores"].get(code, 0)), max_val))
        max_values.append(max_val)
    for code, label, max_val in OC_DIMENSIONS:
        labels.append(f"{code} {label}")
        values.append(min(_score_val(data["oc_scores"].get(code, 0)), max_val))
        max_values.append(max_val)
    return {"labels": labels, "values": values, "max_values": max_values}


def _level_label(pct: int) -> str:
    if pct >= 80:
        return "优秀"
    if pct >= 60:
        return "良好"
    if pct >= 40:
        return "一般"
    return "需加强"


def generate_markdown(data: dict) -> str:
    lines = [
        "# GTV 资格评估报告",
        "",
        f"**评估版本**：v2.0（MC1-MC4 / OC1-OC4 指标体系）",
        "",
        "## 总体评分",
        "",
        f"- **总分**：{data['overall_score']:.1f}/100",
        f"- **推荐路径**：{data['recommended_pathway']}",
        f"- **信心指数**：{int(data.get('confidence', 0.85) * 100)}%",
        "",
    ]

    app = data.get("applicant_info", {})
    if app and any(app.values()):
        lines.extend(["## 申请人信息", "", "| 项目 | 内容 |", "|------|------|"])
        field_names = {
            "name": "姓名", "field": "申请领域", "endorsing_body": "背书机构",
            "current_position": "当前职位", "company": "公司",
            "years_of_experience": "工作年限",
        }
        for k, label in field_names.items():
            v = app.get(k, "")
            if v:
                lines.append(f"| {label} | {v} |")
        lines.extend(["", ""])

    mc_total = sum(_score_val(data["mc_scores"].get(c, 0)) for c, _, _ in MC_DIMENSIONS)
    oc_total = sum(_score_val(data["oc_scores"].get(c, 0)) for c, _, _ in OC_DIMENSIONS)

    lines.extend([
        "## 评分明细",
        "",
        f"**MC 总分**：{mc_total:.1f}/60 | **OC 总分**：{oc_total:.1f}/40",
        "",
        "### Mandatory Criteria (MC)",
        "",
        "| 编号 | 维度 | 得分 | 满分 | 级别 | 评价 | 证据摘要 | 网络验证 |",
        "|------|------|------|------|------|------|----------|----------|",
    ])

    for code, label, max_val in MC_DIMENSIONS:
        entry = data["mc_scores"].get(code, {})
        score = _score_val(entry)
        level = entry.get("level", 0) if isinstance(entry, dict) else 0
        evidence = (entry.get("evidence", "") if isinstance(entry, dict) else "")[:60]
        web = "✓" if (isinstance(entry, dict) and entry.get("web_verified")) else "—"
        pct = int(score / max_val * 100) if max_val else 0
        lines.append(f"| {code} | {label} | {score:.1f} | {max_val} | {level} | {_level_label(pct)} | {evidence} | {web} |")

    lines.extend([
        "",
        "### Optional Criteria (OC)",
        "",
        "| 编号 | 维度 | 得分 | 满分 | 级别 | 评价 | 证据摘要 | 网络验证 |",
        "|------|------|------|------|------|------|----------|----------|",
    ])

    for code, label, max_val in OC_DIMENSIONS:
        entry = data["oc_scores"].get(code, {})
        score = _score_val(entry)
        level = entry.get("level", 0) if isinstance(entry, dict) else 0
        evidence = (entry.get("evidence", "") if isinstance(entry, dict) else "")[:60]
        web = "✓" if (isinstance(entry, dict) and entry.get("web_verified")) else "—"
        pct = int(score / max_val * 100) if max_val else 0
        lines.append(f"| {code} | {label} | {score:.1f} | {max_val} | {level} | {_level_label(pct)} | {evidence} | {web} |")

    lines.extend(["", ""])

    wv = data.get("web_verification", {})
    if wv:
        lines.extend(["## 全网验证摘要", ""])
        for source, info in wv.items():
            if source in ("search_date", "discrepancies", "additional_findings"):
                continue
            if isinstance(info, dict):
                status = info.get("status", "未检查")
                lines.append(f"- **{source}**：{status}")
        discrepancies = wv.get("discrepancies", [])
        if discrepancies:
            lines.append("")
            lines.append("**发现差异**：")
            for d in discrepancies:
                lines.append(f"- ⚠️ {d}")
        additional = wv.get("additional_findings", [])
        if additional:
            lines.append("")
            lines.append("**额外发现**：")
            for a in additional:
                lines.append(f"- 💡 {a}")
        lines.extend(["", ""])

    pa = data.get("path_analysis", {})
    if pa:
        lines.extend([
            "## 路径分析",
            "",
            "| 路径 | 得分 | 门槛 | 达标 | 差距 |",
            "|------|------|------|------|------|",
        ])
        path_labels = {
            "exceptional_talent": "Exceptional Talent",
            "exceptional_promise": "Exceptional Promise",
            "startup_visa": "Startup Visa",
        }
        for key, label in path_labels.items():
            info = pa.get(key, {})
            if info:
                score = info.get("score", 0)
                threshold = {"exceptional_talent": 80, "exceptional_promise": 65, "startup_visa": 55}.get(key, 0)
                meets = "✓" if info.get("meets_threshold", score >= threshold) else "✗"
                gaps = "; ".join(info.get("gaps", [])) or "—"
                lines.append(f"| {label} | {score:.1f} | {threshold} | {meets} | {gaps} |")
        lines.extend(["", ""])

    lines.extend(["## 优势亮点", ""])
    for s in data.get("strengths", []):
        lines.append(f"- {s}")
    if not data.get("strengths"):
        lines.append("- （无）")

    lines.extend(["", "## 需要加强", ""])
    for w in data.get("weaknesses", []):
        lines.append(f"- {w}")
    if not data.get("weaknesses"):
        lines.append("- （无）")

    if data.get("recommendation"):
        lines.extend(["", "## 综合建议", "", data["recommendation"], ""])

    advice = data.get("professional_advice", [])
    if advice:
        lines.extend(["", "## 下一步建议", ""])
        for i, a in enumerate(advice, 1):
            lines.append(f"{i}. {a}")
        lines.append("")

    lines.extend([
        "",
        "---",
        "",
        "*本报告由 AI 系统生成，采用 MC1-MC4 / OC1-OC4 八维指标体系评分，仅供参考。*",
        "*评估参考了公开可用的网络信息进行交叉验证。最终申请决定请咨询专业移民顾问。*",
    ])

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="从评估数据 JSON 生成 GTV 评估报告 (v2.0)")
    parser.add_argument("input", help="评估数据 JSON 文件路径")
    parser.add_argument("-o", "--output", required=True, help="输出 Markdown 文件路径")
    parser.add_argument("--json-out", help="同时输出带 chart_data 的 JSON 文件路径")
    args = parser.parse_args()

    src = Path(args.input)
    if not src.exists():
        print(f"文件不存在: {src}", file=sys.stderr)
        sys.exit(1)

    raw = json.loads(src.read_text(encoding="utf-8"))
    data = _normalize(raw)
    chart_data = build_chart_data(data)
    data["chart_data"] = chart_data

    md = generate_markdown(data)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(md, encoding="utf-8")
    print(f"报告已生成: {out}")

    if args.json_out:
        json_out = Path(args.json_out)
        json_out.parent.mkdir(parents=True, exist_ok=True)
        full = {**raw, "assessment_report": data, "chart_data": chart_data}
        json_out.write_text(json.dumps(full, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"JSON 已输出: {json_out}")


if __name__ == "__main__":
    main()
