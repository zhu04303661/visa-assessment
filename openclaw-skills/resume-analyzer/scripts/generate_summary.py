#!/usr/bin/env python3
"""根据 resume_analysis.json 生成人类可读的简历分析报告（Markdown 格式）。

用法:
  python3 scripts/generate_summary.py resume_analysis.json -o resume_report.md
  python3 scripts/generate_summary.py resume_analysis.json

输入: resume_analysis.json
输出: Markdown 格式分析报告
"""
import argparse
import json
import sys
from pathlib import Path


def format_education(edu_list: list) -> str:
    """格式化教育背景。"""
    if not edu_list:
        return "*（无）*"
    lines = []
    for e in edu_list:
        parts = []
        if e.get("degree"):
            parts.append(e["degree"])
        if e.get("institution"):
            parts.append(e["institution"])
        if e.get("major"):
            parts.append(e["major"])
        if e.get("end_year"):
            parts.append(str(e["end_year"]) + "年")
        if e.get("gpa"):
            parts.append(f"GPA {e['gpa']}")
        if e.get("rank"):
            parts.append(e["rank"])
        lines.append(" - ".join(parts) if parts else e.get("raw_text", ""))
    return "\n".join(f"- {l}" for l in lines if l)


def format_experience(exp_list: list) -> str:
    """格式化工作经历。"""
    if not exp_list:
        return "*（无）*"
    lines = []
    for e in exp_list:
        header = f"**{e.get('position', '')}** @ {e.get('company', '')}"
        if e.get("start_date") or e.get("end_date"):
            header += f" ({e.get('start_date', '')} - {e.get('end_date', '')})"
        lines.append(header)
        for r in e.get("responsibilities", [])[:5]:
            lines.append(f"  - {r}")
    return "\n".join(lines)


def format_skills(skills) -> str:
    """格式化技能。"""
    if not skills or not isinstance(skills, dict):
        return "*（无）*"
    lines = []
    if skills.get("technical"):
        lines.append(f"- **技术**：{', '.join(skills['technical'][:15])}")
    if skills.get("soft"):
        lines.append(f"- **软技能**：{', '.join(skills['soft'])}")
    if skills.get("certifications"):
        lines.append(f"- **认证**：{', '.join(skills['certifications'])}")
    return "\n".join(lines) if lines else "*（无）*"


def format_achievements(ach_list: list) -> str:
    """格式化成就。"""
    if not ach_list:
        return "*（无）*"
    return "\n".join(f"- [{a.get('type', 'other')}] {a.get('description', '')}" for a in ach_list[:15])


def format_publications(pub_list: list) -> str:
    """格式化论文。"""
    if not pub_list:
        return "*（无）*"
    return "\n".join(f"- {p.get('title', '')} ({p.get('year', '')})" for p in pub_list)


def format_patents(pat_list: list) -> str:
    """格式化专利。"""
    if not pat_list:
        return "*（无）*"
    return "\n".join(f"- {p.get('title', '')} ({p.get('number', '')})" for p in pat_list)


def format_gtv_highlights(highlights: dict) -> str:
    """格式化 GTV 亮点。"""
    mc = highlights.get("mc", [])
    oc = highlights.get("oc", [])
    if not mc and not oc:
        return "*（运行 match_gtv.py 可生成亮点匹配）*"
    lines = []
    if mc:
        lines.append("**MC 亮点**：")
        for m in mc[:8]:
            ev = m.get("evidence", "")
            lines.append(f"  - [{m.get('dimension', '')}] {ev[:60]}{'...' if len(ev) > 60 else ''}")
    if oc:
        lines.append("**OC 亮点**：")
        for o in oc[:8]:
            ev = o.get("evidence", "")
            lines.append(f"  - [{o.get('dimension', '')}] {ev[:60]}{'...' if len(ev) > 60 else ''}")
    return "\n".join(lines)


def format_gap_analysis(gap_list: list) -> str:
    """格式化差距分析。"""
    if not gap_list:
        return "*（运行 match_gtv.py 可生成差距分析）*"
    return "\n".join(f"- **{g.get('dimension', '')}** [{g.get('priority', '')}]：{g.get('suggestion', '')}" for g in gap_list)


def generate_report(data: dict) -> str:
    """生成完整 Markdown 报告。"""
    applicant = data.get("applicant", {})
    name = applicant.get("name") or applicant.get("name_en") or "（未指定）"
    field = applicant.get("target_field") or "（未指定）"
    path = applicant.get("target_path") or "（未指定）"

    meta = data.get("metadata", {})
    date_str = meta.get("analysis_date", "")
    confidence = meta.get("confidence", 0)

    lines = [
        "# 简历分析报告",
        "",
        "## 基本信息",
        "",
        f"- **姓名**：{name}",
        f"- **目标领域**：{field}",
        f"- **目标路径**：{path}",
        f"- **分析日期**：{date_str}",
        f"- **置信度**：{confidence:.0%}",
        "",
        "---",
        "",
        "## 教育背景",
        "",
        format_education(data.get("education", [])),
        "",
        "## 工作经历",
        "",
        format_experience(data.get("experience", [])),
        "",
        "## 技能",
        "",
        format_skills(data.get("skills") or {}),
        "",
        "## 成就与荣誉",
        "",
        format_achievements(data.get("achievements", [])),
        "",
        "## 论文发表",
        "",
        format_publications(data.get("publications", [])),
        "",
        "## 专利",
        "",
        format_patents(data.get("patents", [])),
        "",
        "## GTV 证据亮点",
        "",
        format_gtv_highlights(data.get("gtv_highlights", {})),
        "",
        "## 差距分析（待补强）",
        "",
        format_gap_analysis(data.get("gap_analysis", [])),
        "",
        "---",
        "",
        "*本报告由 resume-analyzer skill 自动生成。建议结合 match_gtv.py 输出进行人工复核。*",
    ]

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="生成简历分析报告（Markdown）")
    parser.add_argument("input", help="resume_analysis.json 文件路径")
    parser.add_argument("-o", "--output", help="输出文件路径")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"错误：文件不存在 {args.input}", file=sys.stderr)
        sys.exit(1)

    data = json.loads(input_path.read_text(encoding="utf-8"))
    report = generate_report(data)

    if args.output:
        Path(args.output).write_text(report, encoding="utf-8")
        print(f"已输出至: {args.output}")
    else:
        print(report)


if __name__ == "__main__":
    main()
