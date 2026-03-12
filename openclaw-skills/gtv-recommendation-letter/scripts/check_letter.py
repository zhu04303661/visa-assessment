#!/usr/bin/env python3
"""推荐信质量检查脚本。

对已生成的推荐信进行多维度质量验证，包括：
- 结构完整性检查（是否包含必需章节）
- 证据覆盖度检查（MC/OC是否被引用）
- 事实一致性检查（是否引用了不存在的事实）
- 格式规范检查（字数、段落数、签名块等）
- 禁忌项检查（是否误用了范本内容）

用法:
  # 检查推荐信文件（docx 或 md 格式）
  python scripts/check_letter.py "推荐材料/[姓名]/推荐信_[姓名].docx" --applicant "申请人姓名"

  # 同时提供证据框架进行覆盖度验证
  python scripts/check_letter.py "推荐信.docx" --applicant "张三,San Zhang" --evidence evidence_framework.json

  # 输出JSON格式
  python scripts/check_letter.py letter.docx --applicant "张三" --json

  # 检查md格式的推荐信
  python scripts/check_letter.py "推荐信.md" --applicant "张三"
"""
import argparse
import json
import re
import sys
from pathlib import Path

try:
    from docx import Document
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False


REQUIRED_SECTIONS = [
    {"pattern": r"推荐人.*介绍|自我介绍|我是|本人\w{2,3}[，,]", "name": "推荐人自我介绍"},
    {"pattern": r"认识|结识|合作|关系", "name": "与申请人的关系/认识经过"},
    {"pattern": r"能力|成就|贡献|创新|技术", "name": "申请人专业能力/成就评价"},
    {"pattern": r"推荐|总结|综上|基于以上", "name": "总结推荐"},
]

DEFAULT_FORBIDDEN_TERMS = [
    "SONG Yan", "Song Yan",
    "Nexus Frontier Tech",
]

MC_CODES = ["MC2", "MC3", "MC4"]
OC_CODES = ["OC1.1", "OC1.2", "OC3.1.1", "OC3.1.2", "OC3.3"]


def read_text(filepath: str) -> str:
    """读取文件文本内容（支持docx和md/txt）。"""
    p = Path(filepath)
    if p.suffix.lower() == ".docx":
        if not HAS_DOCX:
            print("需要安装 python-docx: pip install python-docx", file=sys.stderr)
            sys.exit(1)
        doc = Document(filepath)
        return "\n".join(para.text for para in doc.paragraphs)
    else:
        return p.read_text(encoding="utf-8")


def check_structure(text: str) -> list:
    """检查推荐信结构完整性。"""
    issues = []
    for sec in REQUIRED_SECTIONS:
        if not re.search(sec["pattern"], text):
            issues.append({
                "type": "structure",
                "severity": "error",
                "message": f"缺少必需章节：{sec['name']}",
            })
    return issues


def check_format(text: str, applicant_names: list = None) -> list:
    """检查格式规范。"""
    issues = []
    char_count = len(text.replace("\n", "").replace(" ", ""))
    paragraphs = [p for p in text.split("\n") if p.strip()]

    if char_count < 2400:
        issues.append({
            "type": "format",
            "severity": "error",
            "message": f"推荐信字数不足（{char_count}字），必须≥2400字",
        })
    elif char_count > 3100:
        issues.append({
            "type": "format",
            "severity": "error",
            "message": f"推荐信字数超限（{char_count}字），必须≤3000字（约3页A4）",
        })

    if len(paragraphs) < 8:
        issues.append({
            "type": "format",
            "severity": "warning",
            "message": f"段落数偏少（{len(paragraphs)}段），内容可能不够充实",
        })

    if applicant_names:
        has_applicant = any(t in text for t in applicant_names)
        if not has_applicant:
            issues.append({
                "type": "format",
                "severity": "error",
                "message": f"推荐信中未提及申请人姓名（{'/'.join(applicant_names)}）",
            })

    has_signature = bool(re.search(r"日期：|电子邮箱：|Date:|Email:|Signature", text, re.IGNORECASE))
    if not has_signature:
        issues.append({
            "type": "format",
            "severity": "warning",
            "message": "缺少签名落款块（日期：/电子邮箱：等）",
        })

    estimated_pages = char_count / 900
    if estimated_pages > 3.5:
        issues.append({
            "type": "format",
            "severity": "error",
            "message": f"预估超过3页（约{estimated_pages:.1f}页），必须精简",
        })

    issues.append({
        "type": "format",
        "severity": "info",
        "message": f"统计：{char_count}字，{len(paragraphs)}段",
    })

    return issues


def check_forbidden(text: str, extra_forbidden: list = None) -> list:
    """检查是否误用了范本内容。"""
    issues = []
    forbidden = DEFAULT_FORBIDDEN_TERMS + (extra_forbidden or [])
    for term in forbidden:
        if term in text:
            issues.append({
                "type": "forbidden",
                "severity": "error",
                "message": f"推荐信中包含范本专属内容「{term}」，请移除",
            })
    return issues


def check_evidence_coverage(text: str, evidence_framework: dict = None) -> list:
    """检查证据覆盖度。"""
    issues = []

    evidence_keywords = {
        "MC2": ["产品", "组织架构", "宣传"],
        "MC3": ["商业", "市场", "报道", "经济观察"],
        "MC4": ["数据", "统计", "G端", "监管"],
        "OC1.1": ["创新", "发明", "产品"],
        "OC1.2": ["营销", "收入", "合同", "增长"],
        "OC3.1.1": ["法律", "AI", "签发"],
        "OC3.1.2": ["国家", "项目", "课题"],
        "OC3.3": ["大屏", "管理", "数据展示"],
    }

    covered = []
    not_covered = []
    for code, keywords in evidence_keywords.items():
        if any(kw in text for kw in keywords):
            covered.append(code)
        else:
            not_covered.append(code)

    if not_covered:
        issues.append({
            "type": "evidence",
            "severity": "warning",
            "message": f"以下证据可能未被引用：{', '.join(not_covered)}",
        })

    issues.append({
        "type": "evidence",
        "severity": "info",
        "message": f"证据覆盖率：{len(covered)}/{len(evidence_keywords)} "
                   f"({100*len(covered)//len(evidence_keywords)}%)",
    })

    if evidence_framework:
        framework_facts = []
        for section in ["mandatory_criteria", "optional_criteria"]:
            for item in evidence_framework.get(section, []):
                framework_facts.extend(item.get("applicant_related_facts", item.get("cheng_related_facts", [])))

        if framework_facts:
            matched = sum(1 for f in framework_facts
                         if any(w in text for w in f.split()[:3]))
            issues.append({
                "type": "evidence",
                "severity": "info",
                "message": f"申请人相关事实引用率：约{matched}/{len(framework_facts)}条",
            })

    return issues


def check_consistency(text: str) -> list:
    """基本一致性检查。"""
    issues = []

    first_person = bool(re.search(r"我[是与在]|本人", text))
    if not first_person:
        issues.append({
            "type": "consistency",
            "severity": "warning",
            "message": "推荐信可能不是以推荐人第一人称撰写",
        })

    chinese_ratio = len(re.findall(r'[\u4e00-\u9fff]', text)) / max(len(text), 1)
    if chinese_ratio < 0.5:
        issues.append({
            "type": "consistency",
            "severity": "warning",
            "message": f"中文字符占比偏低（{chinese_ratio:.0%}），要求使用中文撰写",
        })

    return issues


def run_checks(filepath: str, evidence_path: str = None,
               applicant_names: list = None,
               extra_forbidden: list = None) -> dict:
    """运行全部检查。"""
    text = read_text(filepath)
    evidence_fw = None
    if evidence_path:
        evidence_fw = json.loads(Path(evidence_path).read_text(encoding="utf-8"))

    all_issues = []
    all_issues.extend(check_structure(text))
    all_issues.extend(check_format(text, applicant_names))
    all_issues.extend(check_forbidden(text, extra_forbidden))
    all_issues.extend(check_evidence_coverage(text, evidence_fw))
    all_issues.extend(check_consistency(text))

    errors = [i for i in all_issues if i["severity"] == "error"]
    warnings = [i for i in all_issues if i["severity"] == "warning"]
    infos = [i for i in all_issues if i["severity"] == "info"]

    return {
        "file": str(filepath),
        "error_count": len(errors),
        "warning_count": len(warnings),
        "issues": all_issues,
        "passed": len(errors) == 0,
    }


def format_text_report(result: dict) -> str:
    """格式化为文本报告。"""
    lines = [
        "=" * 60,
        f"推荐信质量检查报告",
        f"文件: {result['file']}",
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
    parser = argparse.ArgumentParser(description="推荐信质量检查")
    parser.add_argument("file", help="推荐信文件路径（docx或md）")
    parser.add_argument("--evidence", help="证据框架JSON文件（可选）")
    parser.add_argument("--applicant", help="申请人姓名（逗号分隔多个，如：张三,San Zhang,张总）")
    parser.add_argument("--forbidden", help="额外禁忌词（逗号分隔）")
    parser.add_argument("--json", action="store_true", help="输出JSON格式")
    args = parser.parse_args()

    if not Path(args.file).exists():
        print(f"文件不存在: {args.file}", file=sys.stderr)
        sys.exit(1)

    applicant_names = args.applicant.split(",") if args.applicant else None
    extra_forbidden = args.forbidden.split(",") if args.forbidden else None

    result = run_checks(args.file, args.evidence, applicant_names, extra_forbidden)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(format_text_report(result))

    sys.exit(0 if result["passed"] else 1)


if __name__ == "__main__":
    main()
