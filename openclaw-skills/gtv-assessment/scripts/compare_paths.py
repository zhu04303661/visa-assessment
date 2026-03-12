#!/usr/bin/env python3
"""对三条 GTV 路径进行评估对比，输出路径对比表和推荐理由。

接受评估数据 JSON，对 Exceptional Talent、Exceptional Promise、Startup Visa 分别打分，
并输出对比表和推荐理由。

用法:
  python3 scripts/compare_paths.py assessment_data.json -o path_comparison.md
  python3 scripts/compare_paths.py assessment_data.json -o 评估报告/path_comparison.md
"""
import argparse
import json
import sys
from pathlib import Path

PATH_THRESHOLDS = {
    "exceptional_talent": 80,
    "exceptional_promise": 70,
    "startup_visa": 60,
}

PATH_LABELS = {
    "exceptional_talent": "Exceptional Talent（杰出人才）",
    "exceptional_promise": "Exceptional Promise（杰出潜力）",
    "startup_visa": "Startup Visa（创业签证）",
}

PATH_FOCUS = {
    "exceptional_talent": "已取得的成就、行业地位、可验证的影响力",
    "exceptional_promise": "潜力、成长轨迹、早期成就",
    "startup_visa": "商业计划可行性、创新性、团队与资源",
}


def get_overall_score(data: dict) -> float:
    """从数据中提取总分。"""
    if "gtvAnalysis" in data:
        d = data["gtvAnalysis"]
    else:
        d = data
    return float(d.get("overallScore", d.get("overall_score", 0)))


def compute_path_scores(overall_score: float, mc_oc_balance: dict) -> dict:
    """
    根据总分和 MC/OC 均衡性，估算三条路径的适用分数。
    Talent 更看重 OC 中的成就类；Promise 更均衡；Startup 更看重商业和创新。
    """
    base = overall_score
    talent_adj = 0
    promise_adj = 0
    startup_adj = 0

    mc = mc_oc_balance.get("mc_score", base * 0.6)
    oc = mc_oc_balance.get("oc_score", base * 0.4)
    if mc and oc:
        if oc > mc * 0.8:
            talent_adj = 3
        promise_adj = 0
        startup_adj = -2 if oc < mc * 0.5 else 0

    return {
        "exceptional_talent": min(100, max(0, base + talent_adj)),
        "exceptional_promise": min(100, max(0, base + promise_adj)),
        "startup_visa": min(100, max(0, base + startup_adj)),
    }


def get_recommended_pathway(data: dict) -> str:
    """从数据中提取推荐路径。"""
    if "gtvAnalysis" in data:
        d = data["gtvAnalysis"]
    else:
        d = data
    pathway = d.get("gtvPathway", {}).get("recommendedRoute", "") or d.get("recommended_pathway", "")
    pathway_lower = pathway.lower().replace(" ", "_")
    if "talent" in pathway_lower:
        return "exceptional_talent"
    if "promise" in pathway_lower:
        return "exceptional_promise"
    if "startup" in pathway_lower:
        return "startup_visa"
    return ""


def infer_path_from_score(score: float) -> str:
    """根据总分推断推荐路径。"""
    if score >= PATH_THRESHOLDS["exceptional_talent"]:
        return "exceptional_talent"
    if score >= PATH_THRESHOLDS["exceptional_promise"]:
        return "exceptional_promise"
    if score >= PATH_THRESHOLDS["startup_visa"]:
        return "startup_visa"
    return ""


def generate_comparison_md(data: dict, path_scores: dict, recommended: str) -> str:
    """生成路径对比 Markdown。"""
    lines = [
        "# GTV 路径对比分析",
        "",
        "## 三条路径得分对比",
        "",
        "| 路径 | 得分 | 最低参考分 | 是否达标 | 评审侧重点 |",
        "|------|------|-----------|----------|------------|",
    ]

    for path_key, threshold in PATH_THRESHOLDS.items():
        score = path_scores.get(path_key, 0)
        passed = "✓" if score >= threshold else "✗"
        label = PATH_LABELS[path_key]
        focus = PATH_FOCUS[path_key]
        lines.append(f"| {label} | {score:.1f} | {threshold} | {passed} | {focus} |")

    lines.extend([
        "",
        "## 推荐路径",
        "",
    ])

    if recommended:
        label = PATH_LABELS.get(recommended, recommended)
        score = path_scores.get(recommended, 0)
        threshold = PATH_THRESHOLDS.get(recommended, 0)
        lines.append(f"**推荐**：{label}")
        lines.append("")
        lines.append(f"- 当前估算得分：{score:.1f}/100")
        lines.append(f"- 最低参考分：{threshold}")
        lines.append(f"- 评审侧重点：{PATH_FOCUS.get(recommended, '')}")
        lines.append("")
    else:
        lines.append("根据当前评估，暂无明确达标路径。建议强化相关维度后再评估。")
        lines.append("")

    lines.extend([
        "## 路径说明",
        "",
        "- **Exceptional Talent**：适合已在行业取得杰出成就的领军人物，需强证据支撑。",
        "- **Exceptional Promise**：适合展现杰出潜力的早期职业人才，看重成长轨迹。",
        "- **Startup Visa**：适合有创新商业计划的创业者，需清晰的商业模式和团队。",
        "",
    ])

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="GTV 路径对比分析")
    parser.add_argument("input", help="评估数据 JSON 文件路径")
    parser.add_argument("-o", "--output", required=True, help="输出 Markdown 文件路径")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"文件不存在: {args.input}", file=sys.stderr)
        sys.exit(1)

    raw = json.loads(input_path.read_text(encoding="utf-8"))
    overall = get_overall_score(raw)
    mc_oc = {}
    path_scores = compute_path_scores(overall, mc_oc)
    recommended = get_recommended_pathway(raw) or infer_path_from_score(overall)

    md_content = generate_comparison_md(raw, path_scores, recommended)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(md_content, encoding="utf-8")
    print(f"路径对比已生成: {output_path}")


if __name__ == "__main__":
    main()
