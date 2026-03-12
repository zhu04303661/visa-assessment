#!/usr/bin/env python3
"""证据-推荐人关联分析脚本。

根据推荐人的专业领域和背景，分析每条MC/OC证据与该推荐人的关联度，
输出分级的证据使用建议，辅助阶段三「推荐信构思」的策略制定。

用法:
  python scripts/map_evidence.py --recommender recommender.json --evidence evidence_framework.json

  # 输出Markdown格式（可直接嵌入构思思路文件）
  python scripts/map_evidence.py --recommender recommender.json --evidence evidence_framework.json -o mapping.md

recommender.json 格式:
{
  "name": "推荐人姓名",
  "fields": ["专业领域1", "专业领域2"],
  "org_type": "高校|企业|政府|行业协会",
  "expertise_keywords": ["关键词1", "关键词2"],
  "relation_context": "与申请人的合作背景描述"
}

evidence_framework.json: extract_evidence.py 的 --json 输出
"""
import argparse
import json
import sys
from pathlib import Path

FIELD_EVIDENCE_AFFINITY = {
    "高校": {
        "MC2": 0.3, "MC3": 0.4, "MC4": 0.5,
        "OC1.1": 0.7, "OC1.2": 0.3,
        "OC3.1.1": 0.6, "OC3.1.2": 0.8, "OC3.3": 0.5,
    },
    "企业": {
        "MC2": 0.7, "MC3": 0.8, "MC4": 0.5,
        "OC1.1": 0.6, "OC1.2": 0.9,
        "OC3.1.1": 0.5, "OC3.1.2": 0.4, "OC3.3": 0.6,
    },
    "政府": {
        "MC2": 0.5, "MC3": 0.5, "MC4": 0.9,
        "OC1.1": 0.4, "OC1.2": 0.4,
        "OC3.1.1": 0.7, "OC3.1.2": 0.7, "OC3.3": 0.8,
    },
    "行业协会": {
        "MC2": 0.6, "MC3": 0.7, "MC4": 0.7,
        "OC1.1": 0.5, "OC1.2": 0.6,
        "OC3.1.1": 0.5, "OC3.1.2": 0.6, "OC3.3": 0.6,
    },
}

KEYWORD_EVIDENCE_BOOST = {
    "MC2": ["组织", "架构", "产品", "宣传", "团队"],
    "MC3": ["市场", "商业", "营收", "报道", "经济"],
    "MC4": ["数据", "统计", "监管", "政府", "G端", "平台"],
    "OC1.1": ["创新", "发明", "专利", "技术", "AI", "智能", "系统"],
    "OC1.2": ["营销", "收入", "合同", "增长", "业务"],
    "OC3.1.1": ["法律", "AI", "签发", "文件", "智能"],
    "OC3.1.2": ["国家", "项目", "科研", "研发", "课题"],
    "OC3.3": ["数据", "大屏", "管理", "展示", "监控"],
}


def compute_relevance(recommender: dict, evidence_code: str,
                      evidence_facts: list) -> dict:
    """计算单条证据与推荐人的关联度。"""
    org_type = recommender.get("org_type", "")
    base_score = FIELD_EVIDENCE_AFFINITY.get(org_type, {}).get(evidence_code, 0.5)

    expertise_kws = [kw.lower() for kw in recommender.get("expertise_keywords", [])]
    fields = [f.lower() for f in recommender.get("fields", [])]

    keyword_boost = 0.0
    boost_kws = KEYWORD_EVIDENCE_BOOST.get(evidence_code, [])
    for kw in boost_kws:
        if kw.lower() in expertise_kws or kw.lower() in fields:
            keyword_boost += 0.05

    fact_boost = 0.0
    matched_facts = []
    all_kws = expertise_kws + fields
    for fact in evidence_facts:
        fact_lower = fact.lower()
        match_count = sum(1 for k in all_kws if k in fact_lower)
        if match_count > 0:
            fact_boost += 0.02 * min(match_count, 3)
            matched_facts.append(fact[:80])

    relation = recommender.get("relation_context", "").lower()
    relation_boost = 0.0
    for kw in boost_kws:
        if kw.lower() in relation:
            relation_boost += 0.05

    total = min(1.0, base_score + keyword_boost + fact_boost + relation_boost)

    if total >= 0.7:
        level = "高"
    elif total >= 0.45:
        level = "中"
    else:
        level = "低"

    return {
        "score": round(total, 2),
        "level": level,
        "base_score": round(base_score, 2),
        "keyword_boost": round(keyword_boost, 2),
        "fact_boost": round(fact_boost, 2),
        "relation_boost": round(relation_boost, 2),
        "matched_facts": matched_facts[:5],
    }


def analyze_mapping(recommender: dict, framework: dict) -> dict:
    """分析全部证据与推荐人的关联度。"""
    results = {"high": [], "medium": [], "low": []}

    for section_key in ["mandatory_criteria", "optional_criteria"]:
        for item in framework.get(section_key, []):
            if "error" in item:
                continue
            code = item.get("code", "UNKNOWN")
            title = item.get("title", "")
            facts = item.get("key_facts", [])

            rel = compute_relevance(recommender, code, facts)

            entry = {
                "code": code,
                "title": title,
                "relevance": rel,
            }

            if rel["level"] == "高":
                results["high"].append(entry)
            elif rel["level"] == "中":
                results["medium"].append(entry)
            else:
                results["low"].append(entry)

    results["high"].sort(key=lambda x: x["relevance"]["score"], reverse=True)
    results["medium"].sort(key=lambda x: x["relevance"]["score"], reverse=True)

    return {
        "recommender": recommender.get("name", ""),
        "total_evidence": sum(len(v) for v in results.values()),
        "high_count": len(results["high"]),
        "medium_count": len(results["medium"]),
        "low_count": len(results["low"]),
        "mapping": results,
    }


def generate_markdown(mapping: dict) -> str:
    """生成Markdown格式的关联分析报告。"""
    lines = [
        f"## 证据-推荐人关联度分析",
        "",
        f"**推荐人**：{mapping['recommender']}",
        f"**证据总数**：{mapping['total_evidence']}项",
        f"**高关联**：{mapping['high_count']}项 | **中关联**：{mapping['medium_count']}项 | **低关联**：{mapping['low_count']}项",
        "",
        "### 使用建议",
        "",
        "- **高关联证据**：重点展开论述，用具体数据和事实支撑",
        "- **中关联证据**：简要提及，从推荐人视角切入",
        "- **低关联证据**：可省略或一笔带过",
        "",
    ]

    for level_name, level_key, emoji in [
        ("高关联证据（重点论述）", "high", "🔴"),
        ("中关联证据（简要提及）", "medium", "🟡"),
        ("低关联证据（可省略）", "low", "🟢"),
    ]:
        items = mapping["mapping"][level_key]
        lines.append(f"### {level_name}")
        lines.append("")
        if not items:
            lines.append("*（无）*")
            lines.append("")
            continue

        lines.append("| 证据编号 | 证据标题 | 关联得分 | 推荐人相关事实 |")
        lines.append("|----------|----------|----------|----------------|")
        for item in items:
            rel = item["relevance"]
            facts_str = "；".join(f[:40] for f in rel["matched_facts"][:2]) if rel["matched_facts"] else "—"
            lines.append(
                f"| {item['code']} | {item['title']} "
                f"| {rel['score']} | {facts_str} |"
            )
        lines.append("")

    lines.extend([
        "### 论证策略建议",
        "",
        "根据上述关联度分析，推荐信中建议：",
        "",
    ])
    high_codes = [i["code"] for i in mapping["mapping"]["high"]]
    med_codes = [i["code"] for i in mapping["mapping"]["medium"]]
    if high_codes:
        lines.append(f"1. **核心论证**围绕 {', '.join(high_codes)} 展开，这些证据与推荐人的专业背景高度吻合")
    if med_codes:
        lines.append(f"2. **辅助论证**可引用 {', '.join(med_codes)}，从推荐人独特视角做简要评述")
    lines.append("3. 低关联证据建议留给更合适的推荐人在其推荐信中论述")
    lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="证据-推荐人关联度分析")
    parser.add_argument("--recommender", required=True, help="推荐人信息JSON")
    parser.add_argument("--evidence", required=True, help="证据框架JSON（extract_evidence.py输出）")
    parser.add_argument("-o", "--output", help="输出文件路径")
    parser.add_argument("--json", action="store_true", help="输出JSON格式")
    args = parser.parse_args()

    recommender = json.loads(Path(args.recommender).read_text(encoding="utf-8"))
    framework = json.loads(Path(args.evidence).read_text(encoding="utf-8"))

    mapping = analyze_mapping(recommender, framework)

    if args.json:
        output = json.dumps(mapping, ensure_ascii=False, indent=2)
    else:
        output = generate_markdown(mapping)

    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
        print(f"关联分析报告已生成: {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
