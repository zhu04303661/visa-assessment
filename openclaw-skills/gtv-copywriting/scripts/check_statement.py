#!/usr/bin/env python3
"""个人陈述质量检查脚本。

对个人陈述进行多维度质量验证，包括：
- 字数统计（总字数、各段字数）
- 段落结构检查（五段结构完整性）
- 禁忌词检测（空洞形容词、未支撑主张）
- MC/OC 覆盖度检查

用法:
  python3 scripts/check_statement.py statement.txt --path talent
  python3 scripts/check_statement.py statement.txt --path promise
  python3 scripts/check_statement.py statement.txt --path startup
  python3 scripts/check_statement.py statement.txt --json
"""
import argparse
import json
import re
import sys
from pathlib import Path


# 段落结构关键词（用于检测五段结构）
SECTION_PATTERNS = [
    {"pattern": r"引言|介绍|intro|background|本人|我(是|于)|申请.*动机", "name": "引言"},
    {"pattern": r"专业背景|教育|经历|工作|项目|成就|核心.*成就|MC", "name": "专业背景与核心成就"},
    {"pattern": r"创新|贡献|行业影响|技术突破|OC|专利|论文|奖项", "name": "创新贡献与行业影响"},
    {"pattern": r"来英|英国|UK|计划|发展|贡献", "name": "来英计划"},
    {"pattern": r"总结|综上|因此|符合|标准|conclusion|summary", "name": "总结"},
]

# 禁忌词（空洞形容词、主观判断）
FORBIDDEN_TERMS = [
    "令人瞩目的", "极为突出的", "尤为令人敬佩", "卓越的", "杰出的", "优秀的",
    "显著的", "巨大的", "重要的", "广泛的", "深远的", "巨大的影响",
    "卓越成就", "杰出贡献", "优秀表现", "显著提升", "巨大成功",
    "remarkable", "outstanding", "exceptional", "significant", "major",  # 无数据支撑时
]

# MC/OC 关键词（用于覆盖度检测）
MC_OC_KEYWORDS = {
    "MC1": ["奖项", "媒体报道", "认可", "award", "recognition", "media"],
    "MC2": ["产品", "平台", "领导", "组织", "架构", "product", "leadership"],
    "MC3": ["商业", "市场", "收入", "用户", "增长", "commercial", "revenue"],
    "MC4": ["影响", "数据", "政府", "行业", "impact", "government"],
    "OC1": ["创新", "技术突破", "innovation", "breakthrough"],
    "OC2": ["论文", "专利", "学术", "paper", "patent", "academic"],
    "OC3": ["技术决策", "团队", "项目", "technical", "team"],
    "OC4": ["社会", "跨界", "social", "cross-domain"],
}


def count_chars(text: str) -> dict:
    """中英文混合字数统计。中文按字计，英文按词计（近似）。"""
    text_clean = text.replace("\n", " ").strip()
    chinese_chars = re.findall(r"[\u4e00-\u9fff]", text_clean)
    # 英文部分：按空格分词，或连续字母算一词
    english_part = re.sub(r"[\u4e00-\u9fff]", " ", text_clean)
    english_words = [w for w in re.split(r"\s+", english_part) if w]
    return {
        "chinese": len(chinese_chars),
        "english_words": len(english_words),
        "total": len(chinese_chars) + len(english_words),  # 有效字数
        "raw_chars": len(text_clean.replace(" ", "")),
    }


def read_text(filepath: str) -> str:
    """读取文件内容。支持 txt、md。"""
    p = Path(filepath)
    if not p.exists():
        raise FileNotFoundError(f"文件不存在: {filepath}")
    return p.read_text(encoding="utf-8")


def check_structure(text: str) -> list:
    """检查五段结构完整性。"""
    issues = []
    for sec in SECTION_PATTERNS:
        if not re.search(sec["pattern"], text, re.IGNORECASE):
            issues.append({
                "type": "structure",
                "severity": "warning",
                "message": f"可能缺少段落：{sec['name']}（未检测到相关关键词）",
            })
    return issues


def check_word_count(text: str) -> list:
    """检查字数是否符合 2000-3500 范围。"""
    issues = []
    counts = count_chars(text)
    total = counts["total"]

    if total < 2000:
        issues.append({
            "type": "format",
            "severity": "error",
            "message": f"字数不足（{total}字），建议 2000-3500 字",
        })
    elif total > 3500:
        issues.append({
            "type": "format",
            "severity": "error",
            "message": f"字数超限（{total}字），建议 2000-3500 字",
        })

    issues.append({
        "type": "format",
        "severity": "info",
        "message": f"字数统计：中文 {counts['chinese']} 字，英文约 {counts['english_words']} 词，总计约 {total} 字",
    })
    return issues


def check_forbidden(text: str) -> list:
    """检查禁忌词。"""
    issues = []
    found = []
    for term in FORBIDDEN_TERMS:
        if term in text:
            found.append(term)
    if found:
        issues.append({
            "type": "forbidden",
            "severity": "warning",
            "message": f"检测到空洞/主观表述，建议替换为具体数据：{', '.join(found[:5])}{'...' if len(found) > 5 else ''}",
        })
    return issues


def check_mc_oc_coverage(text: str) -> list:
    """检查 MC/OC 覆盖度。"""
    issues = []
    covered = []
    not_covered = []
    text_lower = text.lower()
    for code, keywords in MC_OC_KEYWORDS.items():
        if any(kw in text or kw.lower() in text_lower for kw in keywords):
            covered.append(code)
        else:
            not_covered.append(code)

    if len(covered) < 4:  # MC 至少 4 维
        issues.append({
            "type": "coverage",
            "severity": "warning",
            "message": f"MC 覆盖可能不足，建议覆盖 MC1-MC4 四个维度",
        })
    if len(not_covered) > 4:
        issues.append({
            "type": "coverage",
            "severity": "info",
            "message": f"以下标准可能未被明确体现：{', '.join(not_covered)}",
        })

    issues.append({
        "type": "coverage",
        "severity": "info",
        "message": f"MC/OC 覆盖率：{len(covered)}/8 ({100 * len(covered) // 8}%)，已覆盖 {', '.join(covered)}",
    })
    return issues


def check_paragraphs(text: str) -> list:
    """检查段落数和结构。"""
    issues = []
    paragraphs = [p for p in text.split("\n\n") if p.strip()]
    if len(paragraphs) < 4:
        issues.append({
            "type": "structure",
            "severity": "warning",
            "message": f"段落数偏少（{len(paragraphs)} 段），建议至少 5 段对应五段结构",
        })
    issues.append({
        "type": "structure",
        "severity": "info",
        "message": f"段落数：{len(paragraphs)}",
    })
    return issues


def run_checks(filepath: str, path_type: str = "talent") -> dict:
    """运行全部检查。"""
    text = read_text(filepath)
    all_issues = []
    all_issues.extend(check_word_count(text))
    all_issues.extend(check_paragraphs(text))
    all_issues.extend(check_structure(text))
    all_issues.extend(check_forbidden(text))
    all_issues.extend(check_mc_oc_coverage(text))

    errors = [i for i in all_issues if i["severity"] == "error"]
    warnings = [i for i in all_issues if i["severity"] == "warning"]
    infos = [i for i in all_issues if i["severity"] == "info"]

    return {
        "file": str(filepath),
        "path_type": path_type,
        "error_count": len(errors),
        "warning_count": len(warnings),
        "issues": all_issues,
        "passed": len(errors) == 0,
    }


def format_text_report(result: dict) -> str:
    """格式化为文本报告。"""
    lines = [
        "=" * 60,
        "个人陈述质量检查报告",
        f"文件: {result['file']}",
        f"路径: {result['path_type']}",
        "=" * 60,
        "",
    ]

    status = "✅ 通过" if result["passed"] else "❌ 存在问题"
    lines.append(f"检查结果: {status}")
    lines.append(f"错误: {result['error_count']}  |  警告: {result['warning_count']}")
    lines.append("")

    for severity_label, severity_key in [
        ("❌ 错误", "error"),
        ("⚠️ 警告", "warning"),
        ("ℹ️ 信息", "info"),
    ]:
        items = [i for i in result["issues"] if i["severity"] == severity_key]
        if items:
            lines.append(f"--- {severity_label} ---")
            for item in items:
                lines.append(f"  [{item['type']}] {item['message']}")
            lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="个人陈述质量检查")
    parser.add_argument("file", help="个人陈述文件路径（txt 或 md）")
    parser.add_argument("--path", choices=["talent", "promise", "startup"], default="talent",
                        help="目标路径类型")
    parser.add_argument("--json", action="store_true", help="输出 JSON 格式")
    args = parser.parse_args()

    try:
        result = run_checks(args.file, args.path)
    except FileNotFoundError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(format_text_report(result))

    sys.exit(0 if result["passed"] else 1)


if __name__ == "__main__":
    main()
