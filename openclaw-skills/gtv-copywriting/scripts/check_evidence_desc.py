#!/usr/bin/env python3
"""证据描述质量检查脚本。

对证据描述进行多维度质量验证，包括：
- 每份描述字数统计（建议 200-500 字）
- 是否包含量化数据
- MC/OC 标准对应检查

用法:
  python3 scripts/check_evidence_desc.py evidence_descriptions.txt
  python3 scripts/check_evidence_desc.py evidence_descriptions.txt --json

文件格式：多份证据用 "==========" 或 "---" 分隔，或每份独立成段。
"""
import argparse
import json
import re
import sys
from pathlib import Path


# 段落分隔符（用于识别多份证据）
SEPARATOR_PATTERN = re.compile(r"^={5,}\s*.*\s*={5,}$|^={10,}$|^---+\s*$", re.MULTILINE)

# MC/OC 标准编号模式
MC_OC_PATTERN = re.compile(
    r"MC[1-4]|OC[1-4](?:\.\d+(?:\.\d+)?)?|"
    r"对应\s*(?:MC|OC)[\d\.]+|"
    r"满足\s*(?:MC|OC)|"
    r"符合\s*(?:MC|OC)",
    re.IGNORECASE
)

# 量化数据模式（数字、百分比、单位等）
QUANTIFY_PATTERN = re.compile(
    r"\d+[\d,\.]*\s*(?:%|万|亿|人|个|项|篇|次|年|月|万笔|亿次|倍)|"
    r"\d+[\d,\.]*\s*(?:users?|projects?|team|members?|employees?)|"
    r"增长\s*\d+|提升\s*\d+|达到\s*\d+|超过\s*\d+|"
    r"\d+\s*倍|\d+\s*%",
    re.IGNORECASE
)


def count_chars(text: str) -> int:
    """中英文混合字数统计。"""
    text_clean = text.replace("\n", " ").strip()
    chinese_chars = re.findall(r"[\u4e00-\u9fff]", text_clean)
    english_part = re.sub(r"[\u4e00-\u9fff]", " ", text_clean)
    english_words = [w for w in re.split(r"\s+", english_part) if w]
    return len(chinese_chars) + len(english_words)


def split_evidence_descriptions(text: str) -> list:
    """按分隔符分割多份证据描述。"""
    if not text.strip():
        return []

    # 尝试按分隔符分割
    parts = re.split(SEPARATOR_PATTERN, text)
    parts = [p.strip() for p in parts if p.strip()]


    if len(parts) <= 1:
        # 无分隔符时，按双换行分割
        parts = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]

    return parts


def check_single_desc(desc: str, index: int) -> list:
    """检查单份证据描述。"""
    issues = []
    word_count = count_chars(desc)

    if word_count < 200:
        issues.append({
            "type": "format",
            "severity": "warning",
            "message": f"证据 {index + 1} 字数不足（{word_count} 字），建议 200-500 字",
        })
    elif word_count > 500:
        issues.append({
            "type": "format",
            "severity": "warning",
            "message": f"证据 {index + 1} 字数超限（{word_count} 字），建议 200-500 字",
        })

    if not QUANTIFY_PATTERN.search(desc):
        issues.append({
            "type": "content",
            "severity": "warning",
            "message": f"证据 {index + 1} 可能缺少量化数据（如用户量、百分比、团队规模等）",
        })

    if not MC_OC_PATTERN.search(desc):
        issues.append({
            "type": "content",
            "severity": "error",
            "message": f"证据 {index + 1} 未明确标注 MC/OC 标准对应（如「对应 MC2」）",
        })

    # 检查 What-Why-How 结构
    has_what = bool(re.search(r"【What】|what|是什么|证据.*为", desc, re.IGNORECASE))
    has_how = bool(re.search(r"【How】|how|如何证明|对应|MC|OC", desc, re.IGNORECASE))
    if not has_how:
        issues.append({
            "type": "structure",
            "severity": "warning",
            "message": f"证据 {index + 1} 建议明确写出与 MC/OC 的对应关系",
        })

    return issues


def read_text(filepath: str) -> str:
    """读取文件内容。"""
    p = Path(filepath)
    if not p.exists():
        raise FileNotFoundError(f"文件不存在: {filepath}")
    return p.read_text(encoding="utf-8")


def run_checks(filepath: str) -> dict:
    """运行全部检查。"""
    text = read_text(filepath)
    descriptions = split_evidence_descriptions(text)

    if not descriptions:
        return {
            "file": str(filepath),
            "error_count": 1,
            "warning_count": 0,
            "issues": [{"type": "format", "severity": "error", "message": "未检测到有效证据描述，请检查文件格式"}],
            "passed": False,
            "evidence_count": 0,
        }

    all_issues = []
    for i, desc in enumerate(descriptions):
        all_issues.extend(check_single_desc(desc, i))
        all_issues.append({
            "type": "info",
            "severity": "info",
            "message": f"证据 {i + 1}：{count_chars(desc)} 字",
        })

    errors = [i for i in all_issues if i["severity"] == "error"]
    warnings = [i for i in all_issues if i["severity"] == "warning"]
    infos = [i for i in all_issues if i["severity"] == "info"]

    return {
        "file": str(filepath),
        "evidence_count": len(descriptions),
        "error_count": len(errors),
        "warning_count": len(warnings),
        "issues": all_issues,
        "passed": len(errors) == 0,
    }


def format_text_report(result: dict) -> str:
    """格式化为文本报告。"""
    lines = [
        "=" * 60,
        "证据描述质量检查报告",
        f"文件: {result['file']}",
        f"证据数量: {result['evidence_count']}",
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
    parser = argparse.ArgumentParser(description="证据描述质量检查")
    parser.add_argument("file", help="证据描述文件路径（txt 或 md）")
    parser.add_argument("--json", action="store_true", help="输出 JSON 格式")
    args = parser.parse_args()

    try:
        result = run_checks(args.file)
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
