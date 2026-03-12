#!/usr/bin/env python3
"""从证据文件夹批量提取MC/OC证据，输出结构化证据框架。

用法:
  python scripts/extract_evidence.py "证据目录/"

  # 输出JSON
  python scripts/extract_evidence.py "证据目录/" --json

  # 指定输出文件
  python scripts/extract_evidence.py "证据目录/" --json -o evidence_framework.json

  # 指定申请人相关关键词（用于提取与申请人直接相关的事实）
  python scripts/extract_evidence.py "证据目录/" --applicant-keywords "张三,公司名"
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

from docx import Document

EVIDENCE_MAP = {
    "MC2": {"keywords": ["MC2"], "category": "MC", "title": "产品领导力与组织架构"},
    "MC3": {"keywords": ["MC3"], "category": "MC", "title": "商业成功的市场报道"},
    "MC4": {"keywords": ["MC4"], "category": "MC", "title": "G端数据统计与市场影响"},
    "OC1.1": {"keywords": ["OC1.1"], "category": "OC", "title": "创新产品的证明"},
    "OC1.2": {"keywords": ["OC1.2"], "category": "OC", "title": "领导市场营销实现收入增长"},
    "OC3.1.1": {"keywords": ["OC3.1.1"], "category": "OC", "title": "技术领导力—法律AI签发文件"},
    "OC3.1.2": {"keywords": ["OC3.1.2"], "category": "OC", "title": "参与国家级项目"},
    "OC3.3": {"keywords": ["OC3.3"], "category": "OC", "title": "数据管理与大屏展示"},
}


def classify_file(filename: str) -> tuple:
    """根据文件名分类证据编号和类别。"""
    for code, info in EVIDENCE_MAP.items():
        for kw in info["keywords"]:
            if kw in filename:
                return code, info["category"], info["title"]
    return "UNKNOWN", "OTHER", filename


GENERIC_EVIDENCE_KEYWORDS = [
    '获得', '平台', '服务', '创新', '技术', '数据', '系统',
    '合同', '项目', '国家', 'AI', '人工智能', '软件',
    '负责', '领导', '设计', '开发', '专利', '论文',
    '奖项', '认证', '用户', '客户', '收入', '增长',
]

_applicant_keywords = []


def extract_key_facts(text: str) -> list:
    """从文本中提取关键事实（包含数字、百分比、金额等的句子）。"""
    facts = []
    sentences = re.split(r'[。；\n]', text)
    all_keywords = GENERIC_EVIDENCE_KEYWORDS + _applicant_keywords
    for s in sentences:
        s = s.strip()
        if not s or len(s) < 10:
            continue
        has_number = bool(re.search(r'\d+', s))
        has_keyword = any(kw in s for kw in all_keywords)
        if has_number or has_keyword:
            facts.append(s)
    return facts


def extract_urls(text: str) -> list:
    """提取文本中的URL链接。"""
    return re.findall(r'https?://[^\s\u3000\uff0c\u3001\u300a\u300b]+', text)


def process_file(filepath: str) -> dict:
    """处理单个docx文件，返回结构化证据。"""
    filename = os.path.basename(filepath)
    code, category, title = classify_file(filename)

    try:
        doc = Document(filepath)
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        full_text = "\n".join(paragraphs)
    except Exception as e:
        return {
            "code": code,
            "category": category,
            "title": title,
            "file": filename,
            "error": str(e),
        }

    key_facts = extract_key_facts(full_text)
    urls = extract_urls(full_text)

    applicant_mentions = [f for f in key_facts
                          if _applicant_keywords and
                          any(kw in f for kw in _applicant_keywords)]

    return {
        "code": code,
        "category": category,
        "title": title,
        "file": filename,
        "path": str(filepath),
        "paragraph_count": len(paragraphs),
        "full_text": full_text,
        "key_facts": key_facts,
        "key_fact_count": len(key_facts),
        "applicant_related_facts": applicant_mentions,
        "urls": urls,
    }


def build_framework(evidence_list: list) -> dict:
    """从证据列表构建完整的MC/OC证据框架。"""
    mc_items = [e for e in evidence_list if e["category"] == "MC"]
    oc_items = [e for e in evidence_list if e["category"] == "OC"]
    other_items = [e for e in evidence_list if e["category"] == "OTHER"]

    mc_items.sort(key=lambda x: x["code"])
    oc_items.sort(key=lambda x: x["code"])

    return {
        "summary": {
            "total_files": len(evidence_list),
            "mc_count": len(mc_items),
            "oc_count": len(oc_items),
            "other_count": len(other_items),
            "total_key_facts": sum(e.get("key_fact_count", 0) for e in evidence_list),
            "total_applicant_facts": sum(len(e.get("applicant_related_facts", [])) for e in evidence_list),
        },
        "mandatory_criteria": mc_items,
        "optional_criteria": oc_items,
        "other": other_items,
    }


def format_text_output(framework: dict) -> str:
    """格式化为可读的文本报告。"""
    lines = [
        "=" * 70,
        "GTV申请证据框架分析报告",
        "=" * 70,
        "",
        f"文件总数: {framework['summary']['total_files']}",
        f"MC证据: {framework['summary']['mc_count']}项  |  OC证据: {framework['summary']['oc_count']}项",
        f"关键事实总数: {framework['summary']['total_key_facts']}",
        f"申请人相关事实: {framework['summary']['total_applicant_facts']}",
        "",
    ]

    for section_name, section_key in [
        ("Mandatory Criteria (MC)", "mandatory_criteria"),
        ("Optional Criteria (OC)", "optional_criteria"),
    ]:
        lines.append(f"\n{'─' * 50}")
        lines.append(f"  {section_name}")
        lines.append(f"{'─' * 50}")

        for item in framework[section_key]:
            if "error" in item:
                lines.append(f"\n[{item['code']}] {item['title']}  *** ERROR: {item['error']} ***")
                continue

            lines.append(f"\n[{item['code']}] {item['title']}")
            lines.append(f"  来源文件: {item['file']}")
            lines.append(f"  关键事实数: {item['key_fact_count']}")

            if item.get("applicant_related_facts"):
                lines.append(f"  申请人相关事实:")
                for fact in item["applicant_related_facts"][:5]:
                    lines.append(f"    • {fact[:120]}{'...' if len(fact) > 120 else ''}")

            if item["key_facts"]:
                lines.append(f"  核心事实摘要:")
                for fact in item["key_facts"][:8]:
                    lines.append(f"    - {fact[:120]}{'...' if len(fact) > 120 else ''}")

            if item["urls"]:
                lines.append(f"  相关链接:")
                for url in item["urls"]:
                    lines.append(f"    {url}")

    return "\n".join(lines)


def main():
    global _applicant_keywords
    parser = argparse.ArgumentParser(description="从证据文件夹提取MC/OC证据框架")
    parser.add_argument("path", help="证据文件夹路径")
    parser.add_argument("--json", action="store_true", help="输出JSON格式")
    parser.add_argument("-o", "--output", help="输出到文件")
    parser.add_argument("--applicant-keywords", help="申请人相关关键词（逗号分隔），用于提取与申请人直接相关的事实")
    args = parser.parse_args()

    if args.applicant_keywords:
        _applicant_keywords = [kw.strip() for kw in args.applicant_keywords.split(",") if kw.strip()]

    target = Path(args.path)
    if not target.is_dir():
        print(f"目录不存在: {args.path}", file=sys.stderr)
        sys.exit(1)

    evidence_list = []
    for f in sorted(target.glob("*.docx")):
        if f.name.startswith("~$"):
            continue
        evidence_list.append(process_file(str(f)))

    framework = build_framework(evidence_list)

    if args.json:
        output = json.dumps(framework, ensure_ascii=False, indent=2)
    else:
        output = format_text_output(framework)

    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
        print(f"已输出至: {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
