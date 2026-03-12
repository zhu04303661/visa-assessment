#!/usr/bin/env python3
"""推荐人身份验证脚本（增强版）。

核心能力：
1) 同名排除：姓名、单位、职务、城市、领域多维度加权比对
2) 来源可信度：自动评估信息源等级（官网/百科/媒体/自媒体）
3) 时间线检查：提取年份并检查异常时间与潜在矛盾
4) 跨来源矛盾检测：识别不同来源之间的关键冲突
5) 事实置信度分级：A/B/C 级，便于CV写作时只采信高可信事实
"""
import argparse
import json
import re
import sys
from pathlib import Path


DIMENSION_WEIGHTS = {
    "name": 3,
    "org": 3,
    "title": 2,
    "city": 2,
    "field": 2,
}
MIN_MATCH_SCORE = 7  # 满分12，至少需要7分才可采信
CURRENT_YEAR = 2026

SOURCE_TRUST_RULES = [
    ("官网", 1.00, ["gov.cn", "edu.cn", ".org", "official", "官网"]),
    ("百科", 0.90, ["baike.baidu.com", "wikipedia.org", "百科"]),
    ("权威媒体", 0.80, ["人民网", "新华社", "央视", "经济观察网", "澎湃"]),
    ("一般媒体", 0.65, ["news", "日报", "晚报", "门户"]),
    ("自媒体/论坛", 0.45, ["weibo", "公众号", "知乎", "blog", "forum"]),
]


def normalize(text: str) -> str:
    if not text:
        return ""
    return text.strip().lower().replace(" ", "")


def estimate_source_trust(source: dict) -> dict:
    label = source.get("label", "")
    url = source.get("url", "")
    text = f"{label} {url}"
    for level, score, tokens in SOURCE_TRUST_RULES:
        if any(tok.lower() in text.lower() for tok in tokens):
            return {"level": level, "score": score}
    return {"level": "未知来源", "score": 0.55}


def extract_years(source: dict) -> list:
    text_parts = [
        source.get("extracted_title", ""),
        source.get("extracted_org", ""),
        source.get("extracted_field", ""),
        " ".join(source.get("extracted_facts", [])),
    ]
    text = " ".join(text_parts)
    years = [int(y) for y in re.findall(r"(19\d{2}|20\d{2})", text)]
    return sorted(set(years))


def check_timeline(source: dict) -> tuple:
    years = extract_years(source)
    if not years:
        return False, "未提取到年份，无法进行时间线校验", years
    for y in years:
        if y < 1950 or y > CURRENT_YEAR + 1:
            return False, f"发现异常年份：{y}", years
    if len(years) >= 2 and years[-1] - years[0] > 60:
        return False, f"时间跨度异常（{years[0]}-{years[-1]}）", years
    return True, f"时间线基本合理（{years[0]}-{years[-1]}）", years


def check_name_match(anchor_name: str, source_name: str) -> tuple:
    if not source_name:
        return False, "来源未提供姓名"
    if normalize(anchor_name) == normalize(source_name):
        return True, "完全匹配"
    if anchor_name in source_name or source_name in anchor_name:
        return True, "部分包含匹配"
    return False, f"不匹配（锚点={anchor_name}，来源={source_name}）"


def check_org_match(anchor_orgs: list, source_org: str) -> tuple:
    if not source_org:
        return False, "来源未提供单位"
    source_norm = normalize(source_org)
    for org in anchor_orgs:
        if normalize(org) in source_norm or source_norm in normalize(org):
            return True, f"匹配（{org}）"
    return False, f"不匹配（锚点={anchor_orgs}，来源={source_org}）"


def check_title_match(anchor_titles: list, source_title: str) -> tuple:
    if not source_title:
        return False, "来源未提供职务"
    source_norm = normalize(source_title)
    for t in anchor_titles:
        if normalize(t) in source_norm or source_norm in normalize(t):
            return True, f"匹配（{t}）"
    return False, f"不匹配（锚点={anchor_titles}，来源={source_title}）"


def check_city_match(anchor_city: str, source_city: str) -> tuple:
    if not source_city:
        return False, "来源未提供城市"
    if not anchor_city:
        return False, "锚点未提供城市"
    if normalize(anchor_city) in normalize(source_city) or normalize(source_city) in normalize(anchor_city):
        return True, f"匹配（{source_city}）"
    return False, f"不匹配（锚点={anchor_city}，来源={source_city}）"


def check_field_match(anchor_fields: list, source_field: str) -> tuple:
    if not source_field:
        return False, "来源未提供领域"
    source_norm = normalize(source_field)
    matched = []
    for f in anchor_fields:
        if normalize(f) in source_norm:
            matched.append(f)
    if matched:
        return True, f"匹配（{', '.join(matched)}）"
    return False, f"不匹配（锚点={anchor_fields}，来源={source_field}）"


def verify_source(anchor: dict, source: dict) -> dict:
    checks = {}
    total_score = 0
    max_score = sum(DIMENSION_WEIGHTS.values())

    name_ok, name_note = check_name_match(anchor.get("name", ""), source.get("extracted_name", ""))
    checks["name"] = {"match": name_ok, "note": name_note, "weight": DIMENSION_WEIGHTS["name"]}
    if name_ok:
        total_score += DIMENSION_WEIGHTS["name"]

    org_ok, org_note = check_org_match(anchor.get("known_orgs", []), source.get("extracted_org", ""))
    checks["org"] = {"match": org_ok, "note": org_note, "weight": DIMENSION_WEIGHTS["org"]}
    if org_ok:
        total_score += DIMENSION_WEIGHTS["org"]

    title_ok, title_note = check_title_match(anchor.get("known_titles", []), source.get("extracted_title", ""))
    checks["title"] = {"match": title_ok, "note": title_note, "weight": DIMENSION_WEIGHTS["title"]}
    if title_ok:
        total_score += DIMENSION_WEIGHTS["title"]

    city_ok, city_note = check_city_match(anchor.get("known_city", ""), source.get("extracted_city", ""))
    checks["city"] = {"match": city_ok, "note": city_note, "weight": DIMENSION_WEIGHTS["city"]}
    if city_ok:
        total_score += DIMENSION_WEIGHTS["city"]

    field_ok, field_note = check_field_match(anchor.get("known_fields", []), source.get("extracted_field", ""))
    checks["field"] = {"match": field_ok, "note": field_note, "weight": DIMENSION_WEIGHTS["field"]}
    if field_ok:
        total_score += DIMENSION_WEIGHTS["field"]

    timeline_ok, timeline_note, timeline_years = check_timeline(source)
    checks["timeline"] = {"match": timeline_ok, "note": timeline_note, "weight": 0}

    trust = estimate_source_trust(source)
    matched_dims = sum(1 for k, c in checks.items() if k != "timeline" and c["match"])

    weighted_score = round(total_score * trust["score"], 2)
    weighted_max = round(max_score * trust["score"], 2)

    if total_score >= MIN_MATCH_SCORE and trust["score"] >= 0.65 and timeline_ok:
        verdict = "确认同一人"
    elif total_score >= MIN_MATCH_SCORE - 1 and name_ok:
        verdict = "可能同一人（需人工复核）"
    else:
        verdict = "疑似非目标人物"

    return {
        "source_id": source.get("id"),
        "source_label": source.get("label", ""),
        "source_url": source.get("url", ""),
        "checks": checks,
        "matched_dimensions": matched_dims,
        "total_dimensions": len(DIMENSION_WEIGHTS),
        "raw_score": total_score,
        "raw_max": max_score,
        "weighted_score": weighted_score,
        "weighted_max": weighted_max,
        "source_trust": trust,
        "timeline_years": timeline_years,
        "verdict": verdict,
        "extracted_facts": source.get("extracted_facts", []),
        "extracted_org": source.get("extracted_org", ""),
        "extracted_title": source.get("extracted_title", ""),
    }


def detect_cross_source_conflicts(results: list) -> list:
    """检测不同来源之间的单位/职务冲突。"""
    confirmed_or_maybe = [r for r in results if "非目标" not in r["verdict"]]
    conflicts = []
    for i in range(len(confirmed_or_maybe)):
        for j in range(i + 1, len(confirmed_or_maybe)):
            a = confirmed_or_maybe[i]
            b = confirmed_or_maybe[j]
            if a["timeline_years"] and b["timeline_years"]:
                overlap = set(a["timeline_years"]).intersection(set(b["timeline_years"]))
            else:
                overlap = set()
            if not overlap:
                continue

            org_conflict = (
                a["extracted_org"] and b["extracted_org"]
                and normalize(a["extracted_org"]) != normalize(b["extracted_org"])
            )
            title_conflict = (
                a["extracted_title"] and b["extracted_title"]
                and normalize(a["extracted_title"]) != normalize(b["extracted_title"])
            )
            if org_conflict or title_conflict:
                conflicts.append({
                    "source_a": a["source_label"],
                    "source_b": b["source_label"],
                    "overlap_years": sorted(list(overlap)),
                    "org_a": a["extracted_org"],
                    "org_b": b["extracted_org"],
                    "title_a": a["extracted_title"],
                    "title_b": b["extracted_title"],
                })
    return conflicts


def build_fact_confidence(results: list) -> list:
    """对事实进行A/B/C置信度评级。"""
    fact_index = {}
    for r in results:
        if "非目标" in r["verdict"]:
            continue
        trust_score = r["source_trust"]["score"]
        for fact in r.get("extracted_facts", []):
            key = normalize(fact)
            if not key:
                continue
            if key not in fact_index:
                fact_index[key] = {
                    "fact": fact,
                    "support_sources": [],
                    "trust_scores": [],
                }
            fact_index[key]["support_sources"].append(r["source_label"])
            fact_index[key]["trust_scores"].append(trust_score)

    rated = []
    for item in fact_index.values():
        support_count = len(set(item["support_sources"]))
        avg_trust = sum(item["trust_scores"]) / len(item["trust_scores"])
        if support_count >= 2 and avg_trust >= 0.8:
            level = "A（高可信，可直接入CV）"
        elif support_count >= 1 and avg_trust >= 0.65:
            level = "B（中可信，建议保守表述）"
        else:
            level = "C（低可信，不建议入CV）"
        rated.append({
            "fact": item["fact"],
            "support_count": support_count,
            "avg_trust": round(avg_trust, 2),
            "level": level,
            "sources": sorted(set(item["support_sources"])),
        })
    rated.sort(key=lambda x: (x["level"], -x["support_count"]))
    return rated


def generate_markdown_report(anchor: dict, results: list) -> str:
    confirmed = [r for r in results if r["verdict"] == "确认同一人"]
    maybe = [r for r in results if "可能" in r["verdict"]]
    rejected = [r for r in results if "非目标" in r["verdict"]]
    conflicts = detect_cross_source_conflicts(results)
    fact_confidence = build_fact_confidence(results)

    lines = [
        "## 身份验证报告",
        "",
        f"**目标人物**：{anchor.get('name', '未知')}",
        f"**已知单位**：{'、'.join(anchor.get('known_orgs', []))}",
        f"**已知职务**：{'、'.join(anchor.get('known_titles', []))}",
        f"**已知领域**：{'、'.join(anchor.get('known_fields', []))}",
        f"**与申请人关系**：{anchor.get('relation_to_applicant', '未知')}",
        "",
        "### 搜索来源清单与验证状态",
        "",
        "| # | 来源 | URL | 原始得分 | 可信度加权后得分 | 匹配维度 | 来源可信度 | 结论 |",
        "|---|------|-----|----------|------------------|----------|------------|------|",
    ]

    for r in results:
        url_short = r["source_url"][:50] + "..." if len(r["source_url"]) > 50 else r["source_url"]
        lines.append(
            f"| {r['source_id']} | {r['source_label']} | {url_short} "
            f"| {r['raw_score']}/{r['raw_max']} "
            f"| {r['weighted_score']}/{r['weighted_max']} "
            f"| {r['matched_dimensions']}/{r['total_dimensions']} "
            f"| {r['source_trust']['level']}({r['source_trust']['score']}) "
            f"| {r['verdict']} |"
        )

    if rejected:
        lines.extend([
            "",
            "### 排除的同名信息",
            "",
            "| # | 来源 | 排除原因 |",
            "|---|------|----------|",
        ])
        for r in rejected:
            failed = [f"{k}:{v['note']}" for k, v in r["checks"].items() if not v["match"]]
            lines.append(f"| {r['source_id']} | {r['source_label']} | {'; '.join(failed[:3])} |")

    lines.extend([
        "",
        "### 跨来源矛盾检测",
        "",
    ])
    if conflicts:
        lines.extend([
            "| 来源A | 来源B | 重叠年份 | 单位冲突 | 职务冲突 |",
            "|------|------|----------|----------|----------|",
        ])
        for c in conflicts:
            lines.append(
                f"| {c['source_a']} | {c['source_b']} | {','.join(map(str, c['overlap_years']))} "
                f"| {c['org_a']} ↔ {c['org_b']} | {c['title_a']} ↔ {c['title_b']} |"
            )
    else:
        lines.append("- 未发现明显跨来源冲突")

    lines.extend([
        "",
        "### 事实置信度评级（用于CV采信）",
        "",
        "| 事实 | 支持来源数 | 平均来源可信度 | 评级 | 来源列表 |",
        "|------|------------|----------------|------|----------|",
    ])
    if fact_confidence:
        for f in fact_confidence:
            lines.append(
                f"| {f['fact'][:40]}{'...' if len(f['fact']) > 40 else ''} "
                f"| {f['support_count']} | {f['avg_trust']} | {f['level']} | {'、'.join(f['sources'])} |"
            )
    else:
        lines.append("| 无可评级事实 | 0 | 0 | C（低可信） | - |")

    lines.extend([
        "",
        "### 身份确认结论",
        "",
        f"- 搜索来源总数：{len(results)}个",
        f"- 通过验证采信：{len(confirmed)}个",
        f"- 需人工复核：{len(maybe)}个",
        f"- 排除的同名信息：{len(rejected)}条",
        f"- 跨来源矛盾项：{len(conflicts)}项",
    ])

    if conflicts:
        lines.append("- **结论**：存在跨来源矛盾，建议仅采信A/B级事实并人工复核冲突项")
    elif maybe:
        lines.append(f"- **结论**：基本确认为同一人，但有{len(maybe)}条需人工复核")
    elif rejected and not confirmed:
        lines.append("- **结论**：所有来源均未通过验证，请检查锚点信息是否正确")
    else:
        lines.append("- **结论**：确认为同一人，信息可信度高")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="推荐人身份验证（增强版）")
    parser.add_argument("--anchor", required=True, help="身份锚点JSON文件")
    parser.add_argument("--sources", help="搜索来源JSON文件（批量模式）")
    parser.add_argument("-o", "--output", help="输出验证报告（Markdown）")
    parser.add_argument("--json", action="store_true", help="输出JSON格式")
    args = parser.parse_args()

    anchor = json.loads(Path(args.anchor).read_text(encoding="utf-8"))
    if not args.sources:
        print("请使用 --sources 参数指定搜索来源JSON文件", file=sys.stderr)
        sys.exit(1)
    sources = json.loads(Path(args.sources).read_text(encoding="utf-8"))
    results = [verify_source(anchor, s) for s in sources]

    if args.json:
        output = json.dumps({
            "anchor": anchor,
            "results": results,
            "conflicts": detect_cross_source_conflicts(results),
            "fact_confidence": build_fact_confidence(results),
        }, ensure_ascii=False, indent=2)
    else:
        output = generate_markdown_report(anchor, results)

    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
        print(f"验证报告已生成: {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
