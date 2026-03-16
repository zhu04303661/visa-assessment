#!/usr/bin/env python3
"""对三条 GTV 路径进行差异化评估对比（v2.0 指标体系）。

接受评估数据 JSON（MC1-MC4 / OC1-OC4），按三条路径的不同权重重新加权打分，
输出路径对比表、达标分析和改进建议。

用法:
  python3 scripts/compare_paths.py assessment_data.json -o path_comparison.md
"""
import argparse
import json
import sys
from pathlib import Path

MC_DIMS = [("MC1", 15), ("MC2", 18), ("MC3", 15), ("MC4", 12)]
OC_DIMS = [("OC1", 10), ("OC2", 10), ("OC3", 10), ("OC4", 10)]

PATH_THRESHOLDS = {
    "exceptional_talent": 80,
    "exceptional_promise": 65,
    "startup_visa": 55,
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

# 各路径对 MC/OC 维度的权重调整系数（1.0 = 标准权重）
PATH_WEIGHTS = {
    "exceptional_talent": {
        "MC1": 1.2, "MC2": 1.0, "MC3": 1.1, "MC4": 1.0,
        "OC1": 1.0, "OC2": 1.0, "OC3": 1.0, "OC4": 0.8,
    },
    "exceptional_promise": {
        "MC1": 0.8, "MC2": 1.1, "MC3": 1.1, "MC4": 0.8,
        "OC1": 1.0, "OC2": 0.9, "OC3": 1.1, "OC4": 0.9,
    },
    "startup_visa": {
        "MC1": 0.6, "MC2": 0.9, "MC3": 1.4, "MC4": 0.7,
        "OC1": 1.3, "OC2": 0.5, "OC3": 0.8, "OC4": 0.7,
    },
}

OC_MIN_LEVELS = {
    "exceptional_talent": 4,
    "exceptional_promise": 3,
    "startup_visa": 2,
}


def _score_val(entry) -> float:
    if isinstance(entry, dict):
        return float(entry.get("score", 0))
    return float(entry or 0)


def _level_val(entry) -> int:
    if isinstance(entry, dict):
        return int(entry.get("level", 0))
    return 0


def _normalize_scores(raw: dict) -> dict:
    """从 raw JSON 提取 mc_scores 和 oc_scores。"""
    if "gtvAnalysis" in raw:
        raw = raw["gtvAnalysis"]
    if "assessment_report" in raw:
        raw = raw["assessment_report"]

    mc = raw.get("mc_scores", raw.get("mcScores", {}))
    oc = raw.get("oc_scores", raw.get("ocScores", {}))
    overall = float(raw.get("overall_score", raw.get("overallScore", 0)) or 0)
    return {"mc": mc, "oc": oc, "overall": overall, "raw": raw}


def compute_path_score(mc: dict, oc: dict, path: str) -> float:
    """按路径权重计算加权得分。"""
    weights = PATH_WEIGHTS[path]
    total, max_total = 0.0, 0.0

    for code, max_val in MC_DIMS:
        w = weights.get(code, 1.0)
        score = _score_val(mc.get(code, 0))
        total += score * w
        max_total += max_val * w

    for code, max_val in OC_DIMS:
        w = weights.get(code, 1.0)
        score = _score_val(oc.get(code, 0))
        total += score * w
        max_total += max_val * w

    if max_total == 0:
        return 0.0
    return total / max_total * 100


def check_oc_requirement(oc: dict, path: str) -> tuple:
    """检查 OC 是否满足路径要求的最低级别数。"""
    min_level = OC_MIN_LEVELS.get(path, 3)
    qualified = []
    for code, _ in OC_DIMS:
        level = _level_val(oc.get(code, {}))
        if level >= min_level:
            qualified.append(code)
    meets = len(qualified) >= 2
    return meets, qualified


def identify_gaps(mc: dict, oc: dict, path: str) -> list:
    """识别该路径下的薄弱维度。"""
    weights = PATH_WEIGHTS[path]
    gaps = []

    for code, max_val in MC_DIMS:
        w = weights.get(code, 1.0)
        if w < 0.8:
            continue
        score = _score_val(mc.get(code, 0))
        pct = score / max_val * 100 if max_val else 0
        if pct < 60:
            gaps.append(f"{code} 得分偏低（{score:.1f}/{max_val}，{pct:.0f}%）")

    min_level = OC_MIN_LEVELS.get(path, 3)
    weak_ocs = []
    for code, max_val in OC_DIMS:
        level = _level_val(oc.get(code, {}))
        if level < min_level:
            weak_ocs.append(code)
    if len(weak_ocs) > 2:
        gaps.append(f"OC 达标不足：仅 {4 - len(weak_ocs)} 项达到 {min_level} 级（需≥2项）")

    return gaps


def generate_comparison_md(data: dict, path_scores: dict, oc_checks: dict, gap_map: dict) -> str:
    overall = data["overall"]
    raw = data["raw"]

    lines = [
        "# GTV 路径对比分析",
        "",
        f"**基础总分**：{overall:.1f}/100（未加权）",
        "",
        "## 三条路径加权得分对比",
        "",
        "| 路径 | 加权得分 | 门槛 | 达标 | OC≥2项达标 | 评审侧重点 |",
        "|------|---------|------|------|-----------|------------|",
    ]

    recommended = None
    for path_key in ["exceptional_talent", "exceptional_promise", "startup_visa"]:
        score = path_scores[path_key]
        threshold = PATH_THRESHOLDS[path_key]
        passed = score >= threshold
        oc_met, oc_qualified = oc_checks[path_key]
        oc_str = f"✓ ({','.join(oc_qualified)})" if oc_met else f"✗ (仅{len(oc_qualified)}项)"
        label = PATH_LABELS[path_key]
        focus = PATH_FOCUS[path_key]
        tick = "✓" if passed and oc_met else "✗"
        lines.append(f"| {label} | {score:.1f} | {threshold} | {tick} | {oc_str} | {focus} |")

        if passed and oc_met and recommended is None:
            recommended = path_key

    lines.extend(["", "## 推荐路径", ""])

    if recommended:
        label = PATH_LABELS[recommended]
        score = path_scores[recommended]
        lines.extend([
            f"**推荐**：{label}",
            "",
            f"- 加权得分：{score:.1f}/100（门槛 {PATH_THRESHOLDS[recommended]}）",
            f"- 评审侧重点：{PATH_FOCUS[recommended]}",
            "",
        ])
    else:
        lines.extend([
            "根据当前评估，**暂无路径完全达标**。建议重点加强以下方面后再申请。",
            "",
        ])

    lines.extend(["## 各路径差距分析", ""])
    for path_key in ["exceptional_talent", "exceptional_promise", "startup_visa"]:
        label = PATH_LABELS[path_key]
        gaps = gap_map[path_key]
        lines.append(f"### {label}")
        lines.append("")
        if gaps:
            for g in gaps:
                lines.append(f"- ⚠️ {g}")
        else:
            lines.append("- ✓ 各维度达标")
        lines.append("")

    lines.extend([
        "## 权重说明",
        "",
        "各路径对 MC/OC 维度采用不同的权重系数，反映该路径评审官的侧重点差异：",
        "",
        "| 维度 | Talent 权重 | Promise 权重 | Startup 权重 |",
        "|------|-----------|-------------|-------------|",
    ])
    for code, _ in MC_DIMS + OC_DIMS:
        t = PATH_WEIGHTS["exceptional_talent"].get(code, 1.0)
        p = PATH_WEIGHTS["exceptional_promise"].get(code, 1.0)
        s = PATH_WEIGHTS["startup_visa"].get(code, 1.0)
        lines.append(f"| {code} | {t:.1f}x | {p:.1f}x | {s:.1f}x |")

    lines.extend([
        "",
        "---",
        "",
        "*加权得分 = Σ(维度得分 × 路径权重) / Σ(维度满分 × 路径权重) × 100*",
    ])

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="GTV 路径对比分析 (v2.0)")
    parser.add_argument("input", help="评估数据 JSON 文件路径")
    parser.add_argument("-o", "--output", required=True, help="输出 Markdown 文件路径")
    args = parser.parse_args()

    src = Path(args.input)
    if not src.exists():
        print(f"文件不存在: {src}", file=sys.stderr)
        sys.exit(1)

    raw = json.loads(src.read_text(encoding="utf-8"))
    data = _normalize_scores(raw)
    mc, oc = data["mc"], data["oc"]

    path_scores = {}
    oc_checks = {}
    gap_map = {}
    for path_key in PATH_THRESHOLDS:
        path_scores[path_key] = compute_path_score(mc, oc, path_key)
        oc_checks[path_key] = check_oc_requirement(oc, path_key)
        gap_map[path_key] = identify_gaps(mc, oc, path_key)

    md = generate_comparison_md(data, path_scores, oc_checks, gap_map)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(md, encoding="utf-8")
    print(f"路径对比已生成: {out}")


if __name__ == "__main__":
    main()
