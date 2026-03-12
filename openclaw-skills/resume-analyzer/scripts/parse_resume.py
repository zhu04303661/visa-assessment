#!/usr/bin/env python3
"""解析简历纯文本，提取结构化信息，输出标准化 JSON 格式。

用法:
  python3 scripts/parse_resume.py resume_text.txt -o resume_analysis.json
  cat resume.txt | python3 scripts/parse_resume.py - -o resume_analysis.json
  python3 scripts/parse_resume.py resume.txt --name "申请人" --field digital-technology --path exceptional_talent

输入: 纯文本（文件路径或 - 表示 stdin）
输出: resume_analysis.json 格式，符合 output-schema.md 定义
"""
import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path


# 学历关键词（按层级）
DEGREE_KEYWORDS = {
    "博士": ["博士", "PhD", "Ph.D.", "Doctorate"],
    "硕士": ["硕士", "研究生", "MS", "MSc", "MA", "MBA", "Master"],
    "学士": ["学士", "本科", "BS", "BA", "BSc", "Bachelor"],
    "专科": ["专科", "大专", "Associate"],
}

# 职位级别关键词
LEVEL_KEYWORDS = {
    "c_level": ["CEO", "CTO", "CFO", "COO", "Chief", "创始人", "Founder"],
    "vp": ["VP", "Vice President", "副总裁"],
    "director": ["Director", "总监", "主任"],
    "manager": ["Manager", "主管", "经理"],
    "senior": ["Senior", "Principal", "Staff", "Lead", "高级", "资深"],
    "ic": ["Engineer", "Developer", "Analyst", "工程师", "专员"],
}

# 技术技能常见关键词
TECH_SKILLS = [
    "Python", "Java", "C++", "Go", "JavaScript", "TypeScript", "Rust",
    "React", "Vue", "TensorFlow", "PyTorch", "Django", "Spring",
    "AWS", "GCP", "Azure", "Kubernetes", "Docker",
    "MySQL", "PostgreSQL", "MongoDB", "Redis",
    "Git", "Linux", "Agile", "机器学习", "深度学习", "AI",
]

# 成就/量化模式
PATTERN_QUANTIFIED = re.compile(
    r"(?:提升|优化|提升|提高|实现|达成|带领|管理|负责|完成|获得).*?(?:\d+[%万千亿]|\d+[+.]?\d*)\s*(?:%|人|万|亿|倍)?",
    re.IGNORECASE
)
PATTERN_AWARD = re.compile(
    r"(?:获得|荣获|获|Award|Prize|Recognition|奖项|奖励|优秀|之星)",
    re.IGNORECASE
)
PATTERN_PATENT = re.compile(
    r"(?:专利|Patent|发明|实用新型|CN\d+|US\d+)",
    re.IGNORECASE
)
PATTERN_PAPER = re.compile(
    r"(?:论文|Paper|发表|Publication|顶会|顶刊|会议|期刊)",
    re.IGNORECASE
)


def read_input(path: str) -> str:
    """从文件或 stdin 读取文本。"""
    if path == "-":
        return sys.stdin.read()
    return Path(path).read_text(encoding="utf-8")


def extract_sections(text: str) -> dict:
    """按常见简历标题分段。"""
    section_headers = [
        r"教育背景|education|学历",
        r"工作经历|experience|工作|职业",
        r"技能|skills|技术",
        r"项目经历|projects|项目",
        r"成就|achievements|荣誉|荣誉奖项",
        r"论文|publications|发表",
        r"专利|patents",
        r"自我评价|个人简介|summary",
    ]
    patterns = [re.compile(p, re.IGNORECASE) for p in section_headers]

    sections = []
    lines = text.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        for j, pat in enumerate(patterns):
            if pat.search(line.strip()) and len(line.strip()) < 50:
                sections.append({"name": line.strip(), "start": i + 1})
                break
        i += 1

    result = {}
    for k, sec in enumerate(sections):
        start = sec["start"]
        end = sections[k + 1]["start"] - 1 if k + 1 < len(sections) else len(lines)
        content = "\n".join(lines[start:end]).strip()
        if content:
            result[sec["name"]] = content

    return result


def parse_education(text: str) -> list:
    """解析教育背景。"""
    items = []
    lines = text.split("\n")
    year_pattern = re.compile(r"20\d{2}|19\d{2}")
    degree_pattern = re.compile(
        r"(博士|硕士|学士|研究生|本科|专科|PhD|Ph\.D\.|MS|MSc|MA|MBA|BS|BA|BSc|Bachelor|Master)",
        re.IGNORECASE
    )

    for line in lines:
        line = line.strip()
        if len(line) < 10:
            continue
        degree_match = degree_pattern.search(line)
        years = year_pattern.findall(line)
        if degree_match or years:
            item = {"degree": "", "institution": "", "major": "", "raw_text": line}
            if degree_match:
                item["degree"] = degree_match.group(1)
            if years:
                years_int = [int(y) for y in years]
                if len(years_int) >= 2:
                    item["start_year"] = min(years_int)
                    item["end_year"] = max(years_int)
                else:
                    item["end_year"] = years_int[0]
            gpa_match = re.search(r"GPA\s*([\d.]+)/?([\d]*)", line, re.I)
            if gpa_match:
                item["gpa"] = f"{gpa_match.group(1)}/{gpa_match.group(2) or '4.0'}"
            rank_match = re.search(r"(?:前|top)\s*(\d+)\s*%?", line, re.I)
            if rank_match:
                item["rank"] = f"前{rank_match.group(1)}%"
            institution_match = re.search(
                r"(?:大学|学院|University|College|Institute|UCL|MIT|Stanford|清华|北大)[^\s,，]{0,20}",
                line
            )
            if institution_match:
                item["institution"] = institution_match.group(0).strip("，, ")
            if not item["institution"]:
                parts = re.split(r"[\s|\-–—]+", line)
                for p in parts:
                    if len(p) > 2 and p not in item["degree"]:
                        item["institution"] = p
                        break
            items.append(item)

    return items


def parse_experience(text: str) -> list:
    """解析工作经历。"""
    items = []
    lines = text.split("\n")
    date_pattern = re.compile(r"(\d{4})[.\-]?(\d{1,2})?\s*[-–—]\s*(\d{4}|至今|present|now)[.\-]?(\d{1,2})?", re.I)

    i = 0
    while i < len(lines):
        line = lines[i]
        date_match = date_pattern.search(line)
        if date_match:
            start_y, start_m = date_match.group(1), date_match.group(2) or "01"
            end_y, end_m = date_match.group(3), date_match.group(4) or "12"
            if end_y in ("至今", "present", "now"):
                end_y = str(datetime.now().year)
                end_m = str(datetime.now().month)
            start_date = f"{start_y}.{start_m.zfill(2)}"
            end_date = f"{end_y}.{end_m.zfill(2)}" if end_y.isdigit() else end_y

            duration = 0
            if end_y.isdigit():
                try:
                    start_d = datetime(int(start_y), int(start_m or 1), 1)
                    end_d = datetime(int(end_y), int(end_m or 12), 1)
                    duration = (end_d.year - start_d.year) * 12 + (end_d.month - start_d.month)
                except (ValueError, TypeError):
                    pass

            pos = "".join(line[:date_match.start()].split())
            company = ""
            if i > 0:
                prev = lines[i - 1].strip()
                if prev and len(prev) < 50 and not date_pattern.search(prev):
                    company = prev
                    pos = "".join(line[:date_match.start()].split()) or prev

            level = "ic"
            for lvl, kws in LEVEL_KEYWORDS.items():
                if any(kw in line or kw in pos for kw in kws):
                    level = lvl
                    break

            item = {
                "company": company or "未知",
                "position": pos or "未知",
                "level": level,
                "start_date": start_date,
                "end_date": end_date,
                "duration_months": duration if duration > 0 else None,
                "responsibilities": [],
                "raw_text": line,
            }
            j = i + 1
            while j < len(lines) and not date_pattern.search(lines[j]) and lines[j].strip():
                bullet = lines[j].strip().lstrip("•-*·")
                if len(bullet) > 5:
                    item["responsibilities"].append(bullet)
                j += 1
            items.append(item)
            i = j
        else:
            i += 1

    return items


def parse_skills(text: str) -> dict:
    """解析技能。"""
    technical = []
    soft = []
    all_text = text.lower()

    for skill in TECH_SKILLS:
        if skill.lower() in all_text or skill in text:
            technical.append(skill)

    soft_keywords = ["沟通", "团队", "领导", "协作", "沟通能力", "团队协作", "领导力"]
    for kw in soft_keywords:
        if kw in text:
            soft.append(kw)

    cert_pattern = re.compile(r"(?:认证|Certified|Certification)\s*[：:]\s*([^\n]+)", re.I)
    certs = cert_pattern.findall(text)

    return {
        "technical": technical if technical else [],
        "soft": soft if soft else [],
        "certifications": [c.strip() for c in certs] if certs else [],
    }


def parse_achievements(text: str) -> list:
    """解析成就。"""
    items = []
    sentences = re.split(r"[。；\n]", text)
    for s in sentences:
        s = s.strip()
        if len(s) < 8:
            continue
        item = {"type": "other", "description": s, "raw_text": s}
        if PATTERN_QUANTIFIED.search(s):
            item["type"] = "quantified"
        elif PATTERN_AWARD.search(s):
            item["type"] = "award"
        elif "开源" in s or "GitHub" in s or "star" in s.lower():
            item["type"] = "open_source"
        elif "带领" in s or "管理" in s or "负责" in s:
            item["type"] = "leadership"
        items.append(item)
    return items


def parse_publications(text: str) -> list:
    """解析论文。"""
    items = []
    lines = text.split("\n")
    for line in lines:
        line = line.strip()
        if PATTERN_PAPER.search(line) and len(line) > 20:
            year_match = re.search(r"20\d{2}|19\d{2}", line)
            items.append({
                "title": line[:100],
                "year": int(year_match.group(0)) if year_match else None,
                "raw_text": line,
            })
    return items


def parse_patents(text: str) -> list:
    """解析专利。"""
    items = []
    lines = text.split("\n")
    for line in lines:
        line = line.strip()
        if PATTERN_PATENT.search(line) and len(line) > 10:
            num_match = re.search(r"CN\d+|US\d+|\d{8,}", line)
            year_match = re.search(r"20\d{2}|19\d{2}", line)
            items.append({
                "title": line[:80],
                "number": num_match.group(0) if num_match else None,
                "year": int(year_match.group(0)) if year_match else None,
                "raw_text": line,
            })
    return items


def build_output(
    text: str,
    sections: dict,
    name: str = "",
    target_field: str = "",
    target_path: str = "",
) -> dict:
    """构建完整输出结构。"""
    education_text = ""
    experience_text = ""
    skills_text = ""
    achievements_text = ""
    publications_text = ""
    patents_text = ""

    for key, content in sections.items():
        if re.search(r"教育|education|学历", key, re.I):
            education_text += "\n" + content
        elif re.search(r"工作|experience|职业", key, re.I):
            experience_text += "\n" + content
        elif re.search(r"技能|skills|技术", key, re.I):
            skills_text += "\n" + content
        elif re.search(r"成就|achievements|荣誉", key, re.I):
            achievements_text += "\n" + content
        elif re.search(r"论文|publications|发表", key, re.I):
            publications_text += "\n" + content
        elif re.search(r"专利|patents", key, re.I):
            patents_text += "\n" + content

    if not education_text and not experience_text:
        education_text = experience_text = skills_text = achievements_text = text

    education = parse_education(education_text) if education_text else []
    experience = parse_experience(experience_text) if experience_text else []
    skills = parse_skills(skills_text) if skills_text else parse_skills(text)
    achievements = parse_achievements(achievements_text) if achievements_text else parse_achievements(text)
    publications = parse_publications(publications_text) if publications_text else []
    patents = parse_patents(patents_text) if patents_text else parse_patents(text)

    return {
        "applicant": {
            "name": name or "",
            "name_en": "",
            "target_field": target_field or "",
            "target_path": target_path or "",
        },
        "education": education,
        "experience": experience,
        "skills": skills,
        "achievements": achievements,
        "publications": publications,
        "patents": patents,
        "projects": [],
        "gtv_highlights": {"mc": [], "oc": []},
        "gap_analysis": [],
        "metadata": {
            "source_type": "file",
            "analysis_date": datetime.now().strftime("%Y-%m-%d"),
            "confidence": 0.7,
        },
    }


def main():
    parser = argparse.ArgumentParser(description="解析简历文本，输出结构化 JSON")
    parser.add_argument("input", help="简历文本文件路径，或 - 表示 stdin")
    parser.add_argument("-o", "--output", help="输出 JSON 文件路径")
    parser.add_argument("--name", help="申请人姓名")
    parser.add_argument("--field", help="目标申请领域")
    parser.add_argument("--path", help="目标路径 (exceptional_talent|exceptional_promise|startup_visa)")
    args = parser.parse_args()

    text = read_input(args.input)
    if not text.strip():
        print("错误：输入为空", file=sys.stderr)
        sys.exit(1)

    sections = extract_sections(text)
    result = build_output(
        text,
        sections,
        name=args.name or "",
        target_field=args.field or "",
        target_path=args.path or "",
    )

    output = json.dumps(result, ensure_ascii=False, indent=2)

    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
        print(f"已输出至: {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
