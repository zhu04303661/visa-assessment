#!/usr/bin/env python3
"""从评估数据 JSON 生成专业的 GTV 评估 PDF 报告。

依赖：reportlab（pip install reportlab）
字体：WenQuanYi（sudo apt install fonts-wqy-microhei fonts-wqy-zenhei）
     或 Noto CID 字体（内置 fallback）

用法:
  python3 scripts/generate_pdf_report.py assessment_data.json \
    -o /home/xichi/workspace/visa-assessment/public/downloads/assessment/assessment_report.pdf
"""
import argparse
import json
import math
import os
import sys
from datetime import datetime
from pathlib import Path

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm, mm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        PageBreak, KeepTogether, ListFlowable, ListItem,
    )
    from reportlab.platypus.flowables import HRFlowable
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.graphics.shapes import Drawing, Polygon, String, Line, Circle, Rect
    from reportlab.graphics import renderPDF
except ImportError:
    print("错误: 需要安装 reportlab — pip install reportlab", file=sys.stderr)
    sys.exit(1)

PAGE_W, PAGE_H = A4
MARGIN = 2 * cm

BRAND_PRIMARY = colors.HexColor("#1e40af")
BRAND_DARK = colors.HexColor("#1f2937")
BRAND_GRAY = colors.HexColor("#6b7280")
BRAND_LIGHT_GRAY = colors.HexColor("#f3f4f6")
BRAND_BORDER = colors.HexColor("#e5e7eb")
COLOR_GREEN = colors.HexColor("#059669")
COLOR_GREEN_LIGHT = colors.HexColor("#d1fae5")
COLOR_AMBER = colors.HexColor("#d97706")
COLOR_AMBER_LIGHT = colors.HexColor("#fef3c7")
COLOR_RED = colors.HexColor("#dc2626")
COLOR_RED_LIGHT = colors.HexColor("#fee2e2")
COLOR_BLUE_LIGHT = colors.HexColor("#dbeafe")
COLOR_EMERALD = colors.HexColor("#10b981")
BRAND_ACCENT = colors.HexColor("#0ea5e9")

MC_DIMS = [
    ("MC1 专业成就与认可", "MC1", 15),
    ("MC2 领导角色与产品贡献", "MC2", 18),
    ("MC3 商业成功证据", "MC3", 15),
    ("MC4 行业影响力", "MC4", 12),
]
OC_DIMS = [
    ("OC1 创新贡献", "OC1", 10),
    ("OC2 学术与知识贡献", "OC2", 10),
    ("OC3 技术领导力", "OC3", 10),
    ("OC4 行业外贡献", "OC4", 10),
]

LEGACY_MC_MAP = {
    "education": "MC1", "experience": "MC2",
    "technical": "MC3", "industry_impact": "MC4",
}
LEGACY_OC_MAP = {
    "international": "OC1", "innovation": "OC2",
    "leadership": "OC3", "social_impact": "OC4",
}

WQY_FONT_PATHS = [
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
]


def _register_fonts():
    """注册中文字体。优先 WenQuanYi TrueType，回退到 CID 字体。"""
    regular, bold = "Helvetica", "Helvetica-Bold"

    # 尝试 WQY MicroHei (regular) + ZenHei (bold)
    for path in WQY_FONT_PATHS:
        if not os.path.exists(path):
            continue
        try:
            base = os.path.basename(path)
            if "zenhei" in base.lower():
                pdfmetrics.registerFont(TTFont("WQYBold", path))
                bold = "WQYBold"
            else:
                pdfmetrics.registerFont(TTFont("WQY", path))
                regular = "WQY"
                # subfontIndex=1 for bold variant
                try:
                    pdfmetrics.registerFont(TTFont("WQYBold", path, subfontIndex=1))
                    bold = "WQYBold"
                except Exception:
                    pass
        except Exception as e:
            print(f"字体加载警告: {path} - {e}", file=sys.stderr)
            continue

    if regular == "Helvetica":
        # Fallback: CID 字体
        try:
            from reportlab.pdfbase.cidfonts import UnicodeCIDFont
            pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
            regular = "STSong-Light"
            bold = "STSong-Light"
        except Exception:
            print("警告: 无法加载中文字体，中文可能显示异常", file=sys.stderr)

    return regular, bold


def _score_color(score: int):
    if score >= 80:
        return COLOR_GREEN
    if score >= 65:
        return COLOR_AMBER
    return COLOR_RED


def _score_bg(score: int):
    if score >= 80:
        return COLOR_GREEN_LIGHT
    if score >= 65:
        return COLOR_AMBER_LIGHT
    return COLOR_RED_LIGHT


def _score_level(score: int) -> str:
    if score >= 80:
        return "Exceptional Talent (杰出人才)"
    if score >= 65:
        return "Exceptional Promise (杰出潜力)"
    if score >= 55:
        return "Startup Visa (创业签证)"
    return "Needs Improvement (需提升)"


def _eligibility_label(level: str) -> str:
    mapping = {
        "Strong": "强竞争力 (Strong)",
        "Good": "较好竞争力 (Good)",
        "Moderate": "一般竞争力 (Moderate)",
        "Weak": "较弱竞争力 (Weak)",
    }
    return mapping.get(level, level or "待评估")


def _status_label(status: str) -> str:
    mapping = {
        "Met": "已满足 ✓",
        "Partially Met": "部分满足 △",
        "Not Met": "未满足 ✗",
    }
    return mapping.get(status, status)


def _status_color(status: str):
    if status == "Met":
        return COLOR_GREEN
    if status == "Partially Met":
        return COLOR_AMBER
    return COLOR_RED


def _safe(text) -> str:
    if text is None:
        return ""
    text = str(text)
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _build_radar_chart(mc_scores: dict, oc_scores: dict, width=320, height=320) -> Drawing:
    dims = MC_DIMS + OC_DIMS
    n = len(dims)
    d = Drawing(width, height)
    cx, cy = width / 2, height / 2
    radius = min(width, height) / 2 - 36

    for ring in [0.2, 0.4, 0.6, 0.8, 1.0]:
        r = radius * ring
        pts = []
        for i in range(n):
            angle = math.pi / 2 - 2 * math.pi * i / n
            pts.extend([cx + r * math.cos(angle), cy + r * math.sin(angle)])
        poly = Polygon(pts)
        poly.strokeColor = colors.Color(0.85, 0.85, 0.85)
        poly.strokeWidth = 0.4
        poly.fillColor = None
        d.add(poly)

    for i in range(n):
        angle = math.pi / 2 - 2 * math.pi * i / n
        x = cx + radius * math.cos(angle)
        y = cy + radius * math.sin(angle)
        d.add(Line(cx, cy, x, y, strokeColor=colors.Color(0.9, 0.9, 0.9), strokeWidth=0.3))
        label_r = radius + 22
        lx = cx + label_r * math.cos(angle)
        ly = cy + label_r * math.sin(angle)
        label, key, max_val = dims[i]
        short = key
        s = String(lx, ly - 4, short, fontSize=8, textAnchor="middle",
                    fillColor=BRAND_DARK)
        d.add(s)

    mc_keys_set = {k for _, k, _ in MC_DIMS}
    data_pts = []
    for label, key, max_val in dims:
        scores = mc_scores if key in mc_keys_set else oc_scores
        raw = scores.get(key, 0)
        try:
            val = float(raw)
        except (ValueError, TypeError):
            val = 0
        ratio = min(val / max_val, 1.0) if max_val else 0
        data_pts.append(ratio)

    # Fill area
    pts = []
    for i, ratio in enumerate(data_pts):
        angle = math.pi / 2 - 2 * math.pi * i / n
        r = radius * ratio
        pts.extend([cx + r * math.cos(angle), cy + r * math.sin(angle)])

    poly = Polygon(pts)
    poly.fillColor = colors.Color(0.12, 0.25, 0.69, 0.15)
    poly.strokeColor = BRAND_PRIMARY
    poly.strokeWidth = 2
    d.add(poly)

    for i, ratio in enumerate(data_pts):
        angle = math.pi / 2 - 2 * math.pi * i / n
        r = radius * ratio
        x = cx + r * math.cos(angle)
        y = cy + r * math.sin(angle)
        dot = Circle(x, y, 3.5)
        dot.fillColor = BRAND_PRIMARY
        dot.strokeColor = colors.white
        dot.strokeWidth = 1.5
        d.add(dot)

    return d


def _build_score_bar(score: int, max_score: int, width=120, height=12) -> Drawing:
    d = Drawing(width, height)
    bg = Rect(0, 1, width, height - 2, fillColor=colors.Color(0.93, 0.93, 0.93),
              strokeColor=None, strokeWidth=0)
    d.add(bg)
    ratio = min(score / max_score, 1.0) if max_score else 0
    bar_w = width * ratio
    bar_color = COLOR_GREEN if ratio >= 0.7 else (COLOR_AMBER if ratio >= 0.5 else COLOR_RED)
    bar = Rect(0, 1, bar_w, height - 2, fillColor=bar_color, strokeColor=None, strokeWidth=0)
    d.add(bar)
    return d


def _normalize(raw: dict) -> dict:
    """统一不同格式的评估数据（兼容 API 返回 / v1 / v2 / sample 格式）。"""
    if "gtvAnalysis" in raw:
        raw = raw["gtvAnalysis"]
    if "assessment_report" in raw:
        raw = raw["assessment_report"]

    data = {}
    data["overall_score"] = int(float(raw.get("overallScore", raw.get("overall_score", 0)) or 0))

    # === 申请人信息 ===
    app = raw.get("applicantInfo", raw.get("applicant_info", {}))
    data["applicant"] = {
        "name": app.get("name", "N/A"),
        "field": app.get("field", "N/A"),
        "position": app.get("currentPosition", app.get("current_position", "N/A")),
        "company": app.get("company", "N/A"),
        "years": str(app.get("yearsOfExperience", app.get("years_of_experience", "N/A"))),
    }

    # === GTV 路径 ===
    pw = raw.get("gtvPathway", {})
    data["pathway"] = pw.get("recommendedRoute", raw.get("recommended_pathway", "N/A"))
    data["eligibility"] = pw.get("eligibilityLevel", raw.get("eligibility_level", ""))
    data["pathway_analysis"] = pw.get("analysis", raw.get("pathway_analysis", ""))

    # === 教育背景 ===
    edu = raw.get("educationBackground", {})
    data["education"] = {
        "degrees": edu.get("degrees", []),
        "institutions": edu.get("institutions", []),
        "analysis": edu.get("analysis", ""),
    }

    # === 行业背景 ===
    ind = raw.get("industryBackground", {})
    data["industry"] = {
        "sector": ind.get("sector", ""),
        "years": ind.get("yearsInIndustry", ""),
        "companies": ind.get("keyCompanies", []),
        "impact_score": ind.get("industryImpact", ""),
        "analysis": ind.get("analysis", ""),
    }

    # === 工作经验 ===
    work = raw.get("workExperience", {})
    data["work"] = {
        "positions": work.get("positions", []),
        "achievements": work.get("keyAchievements", []),
        "leadership": work.get("leadershipRoles", []),
        "project_impact": work.get("projectImpact", []),
        "analysis": work.get("analysis", ""),
    }

    # === 技术专长 ===
    tech = raw.get("technicalExpertise", {})
    data["technical"] = {
        "skills": tech.get("coreSkills", []),
        "specializations": tech.get("specializations", []),
        "innovations": tech.get("innovations", []),
        "recognition": tech.get("industryRecognition", []),
        "analysis": tech.get("analysis", ""),
    }

    # === 行业影响力 ===
    ia = raw.get("industryAnalysis", {})
    data["industry_analysis"] = {
        "impact_score": ia.get("industryImpact", ""),
        "sector": ia.get("sector", ""),
        "market_position": ia.get("marketPosition", ""),
        "analysis": ia.get("analysis", ""),
    }

    # === 公司贡献 ===
    cc = raw.get("companyContribution", {})
    data["company_contribution"] = {
        "impact_score": cc.get("impact", ""),
        "achievements": cc.get("achievements", []),
        "innovations": cc.get("innovations", []),
        "analysis": cc.get("analysis", ""),
    }

    # === 行业地位 ===
    ist = raw.get("industryStatus", {})
    data["industry_status"] = {
        "status_score": ist.get("status", ""),
        "awards": ist.get("awards", []),
        "analysis": ist.get("analysis", ""),
    }

    # === MC/OC 评分 ===
    raw_mc = raw.get("mc_scores", raw.get("mcScores", {}))
    raw_oc = raw.get("oc_scores", raw.get("ocScores", {}))

    def _make_entry(v):
        if isinstance(v, dict):
            return {
                "score": v.get("score", v.get("level", 0)),
                "evidence": v.get("evidence", ""),
                "scoring_justification": v.get("scoring_justification", ""),
                "official_standard": v.get("official_standard", ""),
                "level": v.get("level", ""),
                "web_verified": v.get("web_verified", None),
                "sub_scores": v.get("sub_scores", {}),
                "score_range": v.get("score_range", None),
            }
        return {"score": v, "evidence": "", "scoring_justification": "", "official_standard": "", "level": "", "web_verified": None, "sub_scores": {}, "score_range": None}

    mc, oc = {}, {}
    for _, key, _ in MC_DIMS:
        v = raw_mc.get(key, None)
        if v is None:
            for legacy_key, mapped in LEGACY_MC_MAP.items():
                if mapped == key and legacy_key in raw_mc:
                    v = raw_mc[legacy_key]
                    break
        if v is None:
            v = 0
        mc[key] = _make_entry(v)

    for _, key, _ in OC_DIMS:
        v = raw_oc.get(key, None)
        if v is None:
            for legacy_key, mapped in LEGACY_OC_MAP.items():
                if mapped == key and legacy_key in raw_oc:
                    v = raw_oc[legacy_key]
                    break
        if v is None:
            v = 0
        oc[key] = _make_entry(v)

    # 从 criteriaAssessment 补充
    mc_keys = {k for _, k, _ in MC_DIMS}
    oc_keys = {k for _, k, _ in OC_DIMS}
    criteria = raw.get("criteriaAssessment", [])
    data["criteria_assessment"] = []
    if criteria:
        for item in criteria:
            name = item.get("name", "")
            score = item.get("score", 0)
            evidence = item.get("evidence", item.get("comments", ""))
            status = item.get("status", "")
            recommendations = item.get("recommendations", "")
            official = item.get("officialRequirement", "")
            data["criteria_assessment"].append({
                "name": name,
                "score": score,
                "status": status,
                "evidence": evidence,
                "recommendations": recommendations,
                "official_requirement": official,
            })
            for _, key, _ in MC_DIMS + OC_DIMS:
                if key in name:
                    target = mc if key in mc_keys else oc
                    target[key] = {
                        "score": score,
                        "evidence": evidence,
                        "scoring_justification": item.get("scoring_justification", ""),
                        "official_standard": item.get("official_standard", item.get("officialRequirement", "")),
                        "level": item.get("level", ""),
                        "web_verified": item.get("web_verified", None),
                        "sub_scores": item.get("sub_scores", target.get(key, {}).get("sub_scores", {})),
                        "score_range": item.get("score_range", target.get(key, {}).get("score_range", None)),
                    }
                    break

    data["mc"] = mc
    data["oc"] = oc

    data["pending_questions"] = raw.get("pending_questions", [])
    data["field_analysis"] = raw.get("field_analysis", {})

    # === 背书机构与非背书风险 ===
    eb_rec = raw.get("endorsing_body_recommendation", raw.get("endorsing_body", ""))
    if isinstance(eb_rec, dict):
        data["endorsing_body"] = eb_rec.get("body", eb_rec.get("name", eb_rec.get("endorsing_body", "")))
    else:
        data["endorsing_body"] = eb_rec or raw.get("endorsing_body", "")
    data["non_endorsement_risks"] = raw.get("non_endorsement_risk_factors", [])

    # === 优劣势 ===
    def _extract_strengths(items):
        if not items:
            return []
        result = []
        for it in items:
            if isinstance(it, str):
                result.append({"area": "", "description": it, "evidence": "", "gtv_relevance": ""})
            elif isinstance(it, dict):
                result.append({
                    "area": it.get("area", ""),
                    "description": it.get("description", str(it)),
                    "evidence": it.get("evidence", ""),
                    "gtv_relevance": it.get("gtvRelevance", ""),
                })
        return result

    def _extract_weaknesses(items):
        if not items:
            return []
        result = []
        for it in items:
            if isinstance(it, str):
                result.append({"area": "", "description": it, "improvement": "", "priority": "", "timeframe": ""})
            elif isinstance(it, dict):
                result.append({
                    "area": it.get("area", ""),
                    "description": it.get("description", str(it)),
                    "improvement": it.get("improvement", ""),
                    "priority": it.get("priority", ""),
                    "timeframe": it.get("timeframe", ""),
                })
        return result

    data["strengths"] = _extract_strengths(raw.get("strengths", []))
    data["weaknesses"] = _extract_weaknesses(raw.get("weaknesses", []))

    data["recommendation"] = raw.get("recommendation", "")

    advice = raw.get("professionalAdvice", raw.get("professional_advice", []))
    data["advice"] = []
    for a in (advice or []):
        if isinstance(a, str):
            data["advice"].append(a)
        elif isinstance(a, dict):
            data["advice"].append(a.get("action", a.get("description", str(a))))

    data["timeline"] = raw.get("timeline", "")

    # 所需文档
    data["required_documents"] = raw.get("requiredDocuments", [])

    # 预算
    budget = raw.get("estimatedBudget", {})
    data["budget"] = budget if isinstance(budget, dict) else {}

    # 全网验证
    web_v = raw.get("web_verification", {})
    data["web_verification"] = web_v

    # 路径分析
    data["path_analysis"] = raw.get("path_analysis", {})

    # confidence
    data["confidence"] = raw.get("confidence", None)

    return data


class GTVPDFReport:
    def __init__(self, data: dict, output_path: str):
        self.data = data
        self.output_path = output_path
        self.font_r, self.font_b = _register_fonts()
        self.styles = getSampleStyleSheet()
        self._add_styles()

    def _add_styles(self):
        defs = {
            "CoverTitle": dict(fontSize=26, spaceAfter=6, alignment=TA_CENTER, textColor=BRAND_DARK, fontName=self.font_b, leading=34),
            "CoverSub": dict(fontSize=12, spaceAfter=16, alignment=TA_CENTER, textColor=BRAND_GRAY, fontName=self.font_r, leading=18),
            "H1": dict(fontSize=15, spaceBefore=16, spaceAfter=8, textColor=BRAND_PRIMARY, fontName=self.font_b, leading=22),
            "H2": dict(fontSize=12, spaceBefore=10, spaceAfter=5, textColor=BRAND_DARK, fontName=self.font_b, leading=18),
            "H3": dict(fontSize=10, spaceBefore=8, spaceAfter=4, textColor=BRAND_DARK, fontName=self.font_b, leading=15),
            "Body": dict(fontSize=9, spaceAfter=4, leading=15, alignment=TA_JUSTIFY, textColor=BRAND_DARK, fontName=self.font_r),
            "BodyBold": dict(fontSize=9, spaceAfter=4, leading=15, textColor=BRAND_DARK, fontName=self.font_b),
            "BodySmall": dict(fontSize=8, spaceAfter=3, leading=12, textColor=BRAND_GRAY, fontName=self.font_r),
            "Bullet": dict(fontSize=9, spaceAfter=3, leading=14, textColor=BRAND_DARK, fontName=self.font_r, leftIndent=12),
            "ScoreBig": dict(fontSize=42, alignment=TA_CENTER, textColor=COLOR_GREEN, fontName=self.font_b, leading=50),
            "Small": dict(fontSize=7, textColor=BRAND_GRAY, fontName=self.font_r),
            "TableHeader": dict(fontSize=8, textColor=colors.white, fontName=self.font_b, leading=12),
            "TableCell": dict(fontSize=8, textColor=BRAND_DARK, fontName=self.font_r, leading=12),
            "TableCellBold": dict(fontSize=8, textColor=BRAND_DARK, fontName=self.font_b, leading=12),
        }
        for name, kw in defs.items():
            if name not in [s.name for s in self.styles.byName.values()]:
                self.styles.add(ParagraphStyle(name, parent=self.styles["Normal"], **kw))

    def _hr(self):
        return HRFlowable(width="100%", thickness=0.6, color=BRAND_BORDER, spaceAfter=8, spaceBefore=4)

    def _section_header(self, title: str, number: str = ""):
        prefix = f"{number}. " if number else ""
        return [
            Paragraph(_safe(f"{prefix}{title}"), self.styles["H1"]),
            self._hr(),
        ]

    def _bullet_list(self, items: list, style_name="Bullet"):
        elements = []
        for item in items:
            text = str(item) if not isinstance(item, dict) else (item.get("description", str(item)))
            elements.append(Paragraph(_safe(f"\u2022 {text}"), self.styles[style_name]))
        return elements

    def _info_table(self, rows, col_widths=None):
        """创建信息表格（左键值右值）。"""
        table_data = [[Paragraph(_safe(k), self.styles["TableCellBold"]),
                        Paragraph(_safe(str(v)), self.styles["TableCell"])]
                       for k, v in rows]
        cw = col_widths or [4 * cm, 12.5 * cm]
        t = Table(table_data, colWidths=cw)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), COLOR_BLUE_LIGHT),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.4, BRAND_BORDER),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        return t

    def _score_table(self, dims, scores_dict, show_bar=True):
        header = [
            Paragraph(_safe("维度"), self.styles["TableHeader"]),
            Paragraph(_safe("得分"), self.styles["TableHeader"]),
            Paragraph(_safe("满分"), self.styles["TableHeader"]),
            Paragraph(_safe("%"), self.styles["TableHeader"]),
            Paragraph(_safe("评分依据与理由"), self.styles["TableHeader"]),
        ]
        rows = [header]
        for label, key, max_val in dims:
            entry = scores_dict.get(key, {})
            score = entry.get("score", entry) if isinstance(entry, dict) else entry
            evidence = entry.get("evidence", "") if isinstance(entry, dict) else ""
            justification = entry.get("scoring_justification", "") if isinstance(entry, dict) else ""
            official_std = entry.get("official_standard", "") if isinstance(entry, dict) else ""
            verified = entry.get("web_verified", None) if isinstance(entry, dict) else None
            try:
                score = round(float(score), 1)
            except (ValueError, TypeError):
                score = 0
            pct = int(score / max_val * 100) if max_val else 0
            pct_str = f"{pct}%"
            parts = [str(evidence)] if evidence else []
            if justification:
                parts.append(f"评分理由: {justification}")
            if official_std:
                parts.append(f"官方标准: {official_std}")
            ev_text = "\n".join(parts)
            if verified:
                ev_text += "\n[已验证]"
            rows.append([
                Paragraph(_safe(label), self.styles["TableCell"]),
                Paragraph(_safe(str(score)), self.styles["TableCellBold"]),
                Paragraph(_safe(str(max_val)), self.styles["TableCell"]),
                Paragraph(_safe(pct_str), self.styles["TableCell"]),
                Paragraph(_safe(ev_text), self.styles["TableCell"]),
            ])
        t = Table(rows, colWidths=[3 * cm, 1.2 * cm, 1.2 * cm, 1 * cm, 10.1 * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (1, 0), (3, -1), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("GRID", (0, 0), (-1, -1), 0.3, BRAND_BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BRAND_LIGHT_GRAY]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        return t

    def _sub_score_table(self, sub_scores: dict) -> list:
        """为单个维度生成子评分项详细表格"""
        if not sub_scores:
            return []

        s = self.styles
        elements = []

        rows = [[
            Paragraph(_safe("子项"), s["TableHeader"]),
            Paragraph(_safe("得分"), s["TableHeader"]),
            Paragraph(_safe("满分"), s["TableHeader"]),
            Paragraph(_safe("状态"), s["TableHeader"]),
            Paragraph(_safe("依据"), s["TableHeader"]),
        ]]

        for sub_key, sub_data in sorted(sub_scores.items()):
            if not isinstance(sub_data, dict):
                continue
            score = sub_data.get("score", 0)
            max_score = sub_data.get("max", 0)
            status = sub_data.get("status", "confirmed")
            evidence = sub_data.get("evidence", "")
            justification = sub_data.get("justification", "")
            score_range = sub_data.get("score_range", None)
            pending_q = sub_data.get("pending_question", "")

            score_display = f"{score} [{score_range[0]}-{score_range[1]}]" if score_range else str(score)

            status_map = {
                "confirmed": "✓ 已确认",
                "pending_info": "⚠ 待补充",
                "missing": "✗ 缺失",
            }
            status_display = status_map.get(status, status)

            ev_parts = []
            if evidence:
                ev_parts.append(str(evidence))
            if justification:
                ev_parts.append(f"理由: {justification}")
            if pending_q:
                ev_parts.append(f"📝 待补充: {pending_q}")
            ev_text = "\n".join(ev_parts) if ev_parts else "-"

            display_key = sub_key.replace("_", " ").split(" ")[0] if "_" in sub_key else sub_key

            rows.append([
                Paragraph(_safe(display_key), s["TableCell"]),
                Paragraph(_safe(str(score_display)), s["TableCell"]),
                Paragraph(_safe(str(max_score)), s["TableCell"]),
                Paragraph(_safe(status_display), s["TableCell"]),
                Paragraph(_safe(ev_text), s["TableCell"]),
            ])

        t = Table(rows, colWidths=[2.2*cm, 1.5*cm, 1*cm, 1.8*cm, 10*cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.85, 0.88, 0.95)),
            ("TEXTCOLOR", (0, 0), (-1, 0), BRAND_DARK),
            ("ALIGN", (1, 0), (3, -1), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("GRID", (0, 0), (-1, -1), 0.2, BRAND_BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.Color(0.97, 0.97, 1.0)]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 4))

        return elements

    def _pending_questions(self, data):
        questions = data.get("pending_questions", [])
        if not questions:
            return []

        s = self.styles
        story = [
            Paragraph(_safe("待补充信息"), s["H2"]),
            Paragraph(_safe("以下信息如能补充提供，可能显著提升您的评估得分："), s["Body"]),
        ]

        rows = [[
            Paragraph(_safe("维度"), s["TableHeader"]),
            Paragraph(_safe("子项"), s["TableHeader"]),
            Paragraph(_safe("需补充的信息"), s["TableHeader"]),
            Paragraph(_safe("预计影响"), s["TableHeader"]),
        ]]

        for q in questions:
            rows.append([
                Paragraph(_safe(q.get("dimension", "")), s["TableCell"]),
                Paragraph(_safe(q.get("sub_item", "")), s["TableCell"]),
                Paragraph(_safe(q.get("question", "")), s["TableCell"]),
                Paragraph(_safe(q.get("impact", "")), s["TableCell"]),
            ])

        t = Table(rows, colWidths=[2*cm, 2*cm, 9.5*cm, 3*cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.Color(1, 0.85, 0.3)),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("GRID", (0, 0), (-1, -1), 0.3, BRAND_BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.Color(1, 0.98, 0.9)]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(t)
        story.append(Spacer(1, 8))

        return story

    def _field_analysis(self, data):
        fa = data.get("field_analysis", {})
        if not fa:
            return []

        s = self.styles
        story = [Paragraph(_safe("申请者领域分析"), s["H2"])]

        fields = [
            ("所属领域", fa.get("sector", "")),
            ("细分方向", fa.get("sub_field", "")),
            ("市场现状", fa.get("market_status", "")),
            ("行业层级", fa.get("industry_level", "")),
            ("领域前沿度", fa.get("field_relevance", "")),
            ("人才基准", fa.get("talent_benchmark", "")),
            ("申请者定位", fa.get("applicant_positioning", "")),
        ]

        rows = [[Paragraph(_safe("分析项"), s["TableHeader"]), Paragraph(_safe("内容"), s["TableHeader"])]]
        for label, value in fields:
            if value:
                rows.append([
                    Paragraph(_safe(label), s["BodyBold"]),
                    Paragraph(_safe(str(value)), s["TableCell"]),
                ])

        if len(rows) > 1:
            t = Table(rows, colWidths=[3.5*cm, 13*cm])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("GRID", (0, 0), (-1, -1), 0.3, BRAND_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]))
            story.append(t)

        key_players = fa.get("key_players", [])
        if key_players:
            story.append(Spacer(1, 4))
            story.append(Paragraph(_safe(f"领域头部企业: {', '.join(str(p) for p in key_players)}"), s["BodySmall"]))

        story.append(Spacer(1, 8))
        return story

    def build(self):
        Path(self.output_path).parent.mkdir(parents=True, exist_ok=True)
        doc = SimpleDocTemplate(
            self.output_path, pagesize=A4,
            leftMargin=MARGIN, rightMargin=MARGIN,
            topMargin=MARGIN, bottomMargin=1.5 * cm,
        )
        story = []
        story += self._cover()
        story.append(PageBreak())
        story += self._executive_summary()
        story += self._field_analysis(self.data)
        story.append(PageBreak())
        story += self._score_details()
        story += self._pending_questions(self.data)
        story.append(PageBreak())
        story += self._background_analysis()
        story.append(PageBreak())
        story += self._strengths_weaknesses()
        story += self._pathway_analysis()
        story += self._recommendations()
        story += self._appendix()
        story += self._footer_disclaimer()

        doc.build(story, onFirstPage=self._header_footer, onLaterPages=self._header_footer)
        size = os.path.getsize(self.output_path)
        print(f"PDF 已生成: {self.output_path} ({size / 1024:.1f} KB)")
        return self.output_path

    # ========================= 封面 =========================
    def _cover(self):
        d = self.data
        s = self.styles
        score = d["overall_score"]
        story = [
            Spacer(1, 80),
            Paragraph(_safe("UK Global Talent Visa"), s["CoverTitle"]),
            Paragraph(_safe("资格评估报告"), s["CoverTitle"]),
            Spacer(1, 12),
            Paragraph(_safe("Assessment Report"), s["CoverSub"]),
            Spacer(1, 30),
        ]

        score_style = ParagraphStyle("ScoreDisplay", parent=s["ScoreBig"],
                                     textColor=_score_color(score))
        story.append(Paragraph(_safe(f"{score}/100"), score_style))
        story.append(Spacer(1, 6))
        story.append(Paragraph(_safe(_score_level(score)),
                                ParagraphStyle("LevelCenter", parent=s["CoverSub"],
                                               fontSize=11, textColor=_score_color(score))))
        story.append(Spacer(1, 8))
        story.append(Paragraph(_safe(f"推荐路径: {d['pathway']}"),
                                ParagraphStyle("PathwayCenter", parent=s["CoverSub"],
                                               fontSize=11, textColor=BRAND_PRIMARY)))
        if d.get("eligibility"):
            story.append(Paragraph(_safe(f"竞争力评级: {_eligibility_label(d['eligibility'])}"),
                                    ParagraphStyle("EligCenter", parent=s["CoverSub"],
                                                   fontSize=10)))
        if d.get("confidence"):
            story.append(Paragraph(_safe(f"评估置信度: {int(d['confidence'] * 100)}%"),
                                    ParagraphStyle("ConfCenter", parent=s["CoverSub"],
                                                   fontSize=9)))
        story.append(Spacer(1, 30))

        info_rows = [
            ["申请人", d["applicant"]["name"]],
            ["申请领域", d["applicant"]["field"]],
            ["当前职位", d["applicant"]["position"]],
            ["所在公司", d["applicant"]["company"]],
            ["工作年限", f"{d['applicant']['years']} 年"],
            ["评估日期", datetime.now().strftime("%Y-%m-%d")],
        ]
        story.append(self._info_table(info_rows, col_widths=[4 * cm, 9 * cm]))
        story.append(Spacer(1, 30))
        story.append(Paragraph(
            _safe("本报告由惜池集团 AI 评估系统生成，基于申请人提供的材料及公开信息综合分析。"),
            ParagraphStyle("Disclaimer", parent=s["Small"], alignment=TA_CENTER),
        ))
        story.append(Paragraph(
            _safe("最终申请决定请咨询专业移民顾问。报告内容严格保密，仅供内部评估使用。"),
            ParagraphStyle("Disclaimer2", parent=s["Small"], alignment=TA_CENTER),
        ))
        return story

    # ========================= 总体评估摘要 =========================
    def _executive_summary(self):
        d = self.data
        s = self.styles
        score = d["overall_score"]
        story = self._section_header("总体评估摘要", "一")

        mc_flat = {k: (v.get("score", v) if isinstance(v, dict) else v) for k, v in d["mc"].items()}
        oc_flat = {k: (v.get("score", v) if isinstance(v, dict) else v) for k, v in d["oc"].items()}
        mc_total = sum(float(v) for v in mc_flat.values())
        oc_total = sum(float(v) for v in oc_flat.values())
        mc_max = sum(m for _, _, m in MC_DIMS)
        oc_max = sum(m for _, _, m in OC_DIMS)

        summary_rows = [
            [Paragraph(_safe("指标"), s["TableHeader"]),
             Paragraph(_safe("得分"), s["TableHeader"]),
             Paragraph(_safe("评估等级"), s["TableHeader"])],
            [Paragraph(_safe("总分"), s["TableCellBold"]),
             Paragraph(_safe(f"{score}/100"), s["TableCellBold"]),
             Paragraph(_safe(_score_level(score)), s["TableCell"])],
            [Paragraph(_safe("MC 强制标准"), s["TableCellBold"]),
             Paragraph(_safe(f"{mc_total:.1f}/{mc_max}"), s["TableCell"]),
             Paragraph(_safe(f"达成率 {int(mc_total / mc_max * 100)}%"), s["TableCell"])],
            [Paragraph(_safe("OC 可选标准"), s["TableCellBold"]),
             Paragraph(_safe(f"{oc_total:.1f}/{oc_max}"), s["TableCell"]),
             Paragraph(_safe(f"达成率 {int(oc_total / oc_max * 100)}%"), s["TableCell"])],
            [Paragraph(_safe("推荐路径"), s["TableCellBold"]),
             Paragraph(_safe(d["pathway"]), s["TableCell"]),
             Paragraph(_safe(_eligibility_label(d.get("eligibility", ""))), s["TableCell"])],
        ]
        t = Table(summary_rows, colWidths=[4 * cm, 5 * cm, 7.5 * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BACKGROUND", (0, 1), (0, -1), BRAND_LIGHT_GRAY),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.4, BRAND_BORDER),
        ]))
        story.append(t)
        story.append(Spacer(1, 14))

        if d.get("endorsing_body"):
            story.append(Paragraph(_safe(f"推荐背书机构: {d['endorsing_body']}"), s["Body"]))
            story.append(Spacer(1, 6))

        chart = _build_radar_chart(mc_flat, oc_flat)
        story.append(Paragraph(_safe("八维能力雷达图"), s["H2"]))
        story.append(chart)
        story.append(Spacer(1, 10))

        if d.get("recommendation"):
            story.append(Paragraph(_safe("综合评估意见"), s["H2"]))
            story.append(Paragraph(_safe(d["recommendation"]), s["Body"]))
            story.append(Spacer(1, 6))

        return story

    # ========================= 评分明细 =========================
    def _score_details(self):
        d = self.data
        s = self.styles
        story = self._section_header("评分明细", "二")

        story.append(Paragraph(_safe("2.1 Mandatory Criteria (MC) — 强制标准"), s["H2"]))
        story.append(Paragraph(
            _safe("MC 标准是 GTV 申请的核心评审维度。根据 GOV.UK 官方标准（Appendix Global Talent, GTE 8.1-8.10），申请人须展示在数字技术领域被认可为杰出人才（Exceptional Talent）或潜在领导者（Exceptional Promise）的证据，并满足至少 2 项'其他必要技能'。"),
            s["BodySmall"]))
        story.append(Spacer(1, 4))
        story.append(self._score_table(MC_DIMS, d["mc"]))
        story.append(Spacer(1, 8))
        story.append(Paragraph(_safe("MC 各维度子评分明细"), s["H3"]))
        for _, key, max_val in MC_DIMS:
            entry = d["mc"].get(key, {})
            sub_scores = entry.get("sub_scores", {}) if isinstance(entry, dict) else {}
            if sub_scores:
                score_range = entry.get("score_range", None)
                range_text = f" (区间: {score_range[0]}-{score_range[1]})" if score_range else ""
                story.append(Paragraph(_safe(f"{key}{range_text}"), s["H3"]))
                story.extend(self._sub_score_table(sub_scores))
        story.append(Spacer(1, 14))

        story.append(Paragraph(_safe("2.2 Optional Criteria (OC) — 可选标准"), s["H2"]))
        story.append(Paragraph(
            _safe("OC 标准评估申请人的创新、学术、技术领导和社会贡献。根据官方标准，申请人须在以下技能中展示至少 2 项：研究发表、产品主导贡献、工作外贡献、创新记录。"),
            s["BodySmall"]))
        story.append(Spacer(1, 4))
        story.append(self._score_table(OC_DIMS, d["oc"]))
        story.append(Spacer(1, 8))
        story.append(Paragraph(_safe("OC 各维度子评分明细"), s["H3"]))
        for _, key, max_val in OC_DIMS:
            entry = d["oc"].get(key, {})
            sub_scores = entry.get("sub_scores", {}) if isinstance(entry, dict) else {}
            if sub_scores:
                score_range = entry.get("score_range", None)
                range_text = f" (区间: {score_range[0]}-{score_range[1]})" if score_range else ""
                story.append(Paragraph(_safe(f"{key}{range_text}"), s["H3"]))
                story.extend(self._sub_score_table(sub_scores))
        story.append(Spacer(1, 14))

        # 标准评估详情
        if d.get("criteria_assessment"):
            story.append(Paragraph(_safe("2.3 各标准评审详情"), s["H2"]))
            for i, item in enumerate(d["criteria_assessment"], 1):
                name = item.get("name", f"标准 {i}")
                score_val = item.get("score", 0)
                status = item.get("status", "")
                evidence = item.get("evidence", "")
                recs = item.get("recommendations", "")
                official = item.get("official_requirement", "")

                story.append(Paragraph(_safe(f"{i}. {name}"), s["H3"]))
                rows = []
                if status:
                    rows.append(["状态", _status_label(status)])
                try:
                    rows.append(["评分", f"{int(float(score_val))}/100"])
                except (ValueError, TypeError):
                    rows.append(["评分", str(score_val)])
                if official:
                    rows.append(["官方要求", str(official)[:200]])
                if evidence:
                    rows.append(["评估证据", str(evidence)[:200]])
                if recs:
                    rows.append(["补强建议", str(recs)[:200]])
                if rows:
                    story.append(self._info_table(rows, col_widths=[3 * cm, 13.5 * cm]))
                    story.append(Spacer(1, 6))

        return story

    # ========================= 背景深度分析 =========================
    def _background_analysis(self):
        d = self.data
        s = self.styles
        story = self._section_header("背景深度分析", "三")

        # 教育背景
        edu = d.get("education", {})
        if edu.get("analysis") or edu.get("degrees"):
            story.append(Paragraph(_safe("3.1 教育背景"), s["H2"]))
            if edu.get("degrees"):
                story.append(Paragraph(_safe(f"学位: {', '.join(edu['degrees'])}"), s["Body"]))
            if edu.get("institutions"):
                story.append(Paragraph(_safe(f"院校: {', '.join(edu['institutions'])}"), s["Body"]))
            if edu.get("analysis"):
                story.append(Paragraph(_safe(edu["analysis"]), s["Body"]))
            story.append(Spacer(1, 6))

        # 行业背景
        ind = d.get("industry", {})
        if ind.get("analysis") or ind.get("sector"):
            story.append(Paragraph(_safe("3.2 行业背景"), s["H2"]))
            rows = []
            if ind.get("sector"):
                rows.append(["行业领域", ind["sector"]])
            if ind.get("years"):
                rows.append(["行业经验", f"{ind['years']} 年"])
            if ind.get("companies"):
                rows.append(["关键公司", ", ".join(ind["companies"])])
            if ind.get("impact_score"):
                rows.append(["影响力评分", f"{ind['impact_score']}/10"])
            if rows:
                story.append(self._info_table(rows, col_widths=[3 * cm, 13.5 * cm]))
            if ind.get("analysis"):
                story.append(Spacer(1, 4))
                story.append(Paragraph(_safe(ind["analysis"]), s["Body"]))
            story.append(Spacer(1, 6))

        # 工作经验
        work = d.get("work", {})
        if work.get("analysis") or work.get("positions"):
            story.append(Paragraph(_safe("3.3 工作经验"), s["H2"]))
            if work.get("positions"):
                story.append(Paragraph(_safe(f"职位经历: {', '.join(work['positions'][:5])}"), s["Body"]))
            if work.get("leadership"):
                story.append(Paragraph(_safe(f"领导角色: {', '.join(work['leadership'][:5])}"), s["Body"]))
            if work.get("achievements"):
                story.append(Paragraph(_safe("关键成就:"), s["BodyBold"]))
                for a in work["achievements"][:6]:
                    story.append(Paragraph(_safe(f"\u2022 {a}"), s["Bullet"]))
            if work.get("project_impact"):
                story.append(Paragraph(_safe("项目影响:"), s["BodyBold"]))
                for p in work["project_impact"][:5]:
                    story.append(Paragraph(_safe(f"\u2022 {p}"), s["Bullet"]))
            if work.get("analysis"):
                story.append(Spacer(1, 4))
                story.append(Paragraph(_safe(work["analysis"]), s["Body"]))
            story.append(Spacer(1, 6))

        # 技术专长
        tech = d.get("technical", {})
        if tech.get("analysis") or tech.get("skills"):
            story.append(Paragraph(_safe("3.4 技术专长"), s["H2"]))
            if tech.get("skills"):
                story.append(Paragraph(_safe(f"核心技能: {', '.join(tech['skills'][:8])}"), s["Body"]))
            if tech.get("specializations"):
                story.append(Paragraph(_safe(f"专业领域: {', '.join(tech['specializations'][:5])}"), s["Body"]))
            if tech.get("innovations"):
                story.append(Paragraph(_safe("创新成果:"), s["BodyBold"]))
                for inv in tech["innovations"][:5]:
                    story.append(Paragraph(_safe(f"\u2022 {inv}"), s["Bullet"]))
            if tech.get("recognition"):
                story.append(Paragraph(_safe("行业认可:"), s["BodyBold"]))
                for r in tech["recognition"][:5]:
                    story.append(Paragraph(_safe(f"\u2022 {r}"), s["Bullet"]))
            if tech.get("analysis"):
                story.append(Spacer(1, 4))
                story.append(Paragraph(_safe(tech["analysis"]), s["Body"]))
            story.append(Spacer(1, 6))

        # 行业影响力
        ia = d.get("industry_analysis", {})
        if ia.get("analysis"):
            story.append(Paragraph(_safe("3.5 行业影响力分析"), s["H2"]))
            rows = []
            if ia.get("impact_score"):
                rows.append(["影响力评分", f"{ia['impact_score']}/10"])
            if ia.get("sector"):
                rows.append(["细分领域", ia["sector"]])
            if ia.get("market_position"):
                rows.append(["市场地位", ia["market_position"]])
            if rows:
                story.append(self._info_table(rows, col_widths=[3 * cm, 13.5 * cm]))
            story.append(Spacer(1, 4))
            story.append(Paragraph(_safe(ia["analysis"]), s["Body"]))
            story.append(Spacer(1, 6))

        # 公司贡献
        cc = d.get("company_contribution", {})
        if cc.get("analysis"):
            story.append(Paragraph(_safe("3.6 公司贡献分析"), s["H2"]))
            if cc.get("impact_score"):
                story.append(Paragraph(_safe(f"贡献评分: {cc['impact_score']}/10"), s["Body"]))
            if cc.get("achievements"):
                for a in cc["achievements"][:5]:
                    story.append(Paragraph(_safe(f"\u2022 {a}"), s["Bullet"]))
            if cc.get("innovations"):
                story.append(Paragraph(_safe("创新贡献:"), s["BodyBold"]))
                for inv in cc["innovations"][:5]:
                    story.append(Paragraph(_safe(f"\u2022 {inv}"), s["Bullet"]))
            story.append(Spacer(1, 4))
            story.append(Paragraph(_safe(cc["analysis"]), s["Body"]))
            story.append(Spacer(1, 6))

        # 行业地位
        ist = d.get("industry_status", {})
        if ist.get("analysis"):
            story.append(Paragraph(_safe("3.7 行业地位分析"), s["H2"]))
            if ist.get("status_score"):
                story.append(Paragraph(_safe(f"行业地位评分: {ist['status_score']}/10"), s["Body"]))
            if ist.get("awards"):
                story.append(Paragraph(_safe("荣誉与认可:"), s["BodyBold"]))
                for aw in ist["awards"][:5]:
                    story.append(Paragraph(_safe(f"\u2022 {aw}"), s["Bullet"]))
            story.append(Spacer(1, 4))
            story.append(Paragraph(_safe(ist["analysis"]), s["Body"]))
            story.append(Spacer(1, 6))

        return story

    # ========================= 优劣势分析 =========================
    def _strengths_weaknesses(self):
        d = self.data
        s = self.styles
        story = self._section_header("优劣势分析", "四")

        if d.get("strengths"):
            story.append(Paragraph(_safe("4.1 核心优势"), s["H2"]))
            for i, item in enumerate(d["strengths"], 1):
                area = item.get("area", "")
                desc = item.get("description", "")
                evidence = item.get("evidence", "")
                gtv_rel = item.get("gtv_relevance", "")

                title = f"{i}. {area}" if area else f"{i}. 优势 {i}"
                story.append(Paragraph(_safe(title), s["H3"]))
                story.append(Paragraph(_safe(desc), s["Body"]))
                if evidence:
                    story.append(Paragraph(_safe(f"证据支撑: {evidence}"), s["BodySmall"]))
                if gtv_rel:
                    story.append(Paragraph(_safe(f"GTV 关联: {gtv_rel}"), s["BodySmall"]))
                story.append(Spacer(1, 3))

        if d.get("weaknesses"):
            story.append(Paragraph(_safe("4.2 待提升领域"), s["H2"]))
            for i, item in enumerate(d["weaknesses"], 1):
                area = item.get("area", "")
                desc = item.get("description", "")
                improvement = item.get("improvement", "")
                priority = item.get("priority", "")
                timeframe = item.get("timeframe", "")

                title = f"{i}. {area}" if area else f"{i}. 不足 {i}"
                story.append(Paragraph(_safe(title), s["H3"]))
                story.append(Paragraph(_safe(desc), s["Body"]))
                details = []
                if improvement:
                    details.append(f"改进方案: {improvement}")
                if priority:
                    details.append(f"优先级: {priority}")
                if timeframe:
                    details.append(f"时间框架: {timeframe}")
                if details:
                    for det in details:
                        story.append(Paragraph(_safe(det), s["BodySmall"]))
                story.append(Spacer(1, 3))

        return story

    # ========================= 路径分析 =========================
    def _pathway_analysis(self):
        d = self.data
        s = self.styles
        story = self._section_header("GTV 路径分析", "五")

        if d.get("pathway_analysis"):
            story.append(Paragraph(_safe(d["pathway_analysis"]), s["Body"]))
            story.append(Spacer(1, 8))

        pa = d.get("path_analysis", {})
        if pa:
            header = [
                Paragraph(_safe("路径"), s["TableHeader"]),
                Paragraph(_safe("评分"), s["TableHeader"]),
                Paragraph(_safe("达标"), s["TableHeader"]),
                Paragraph(_safe("主要差距"), s["TableHeader"]),
            ]
            rows = [header]
            path_names = {
                "exceptional_talent": "Exceptional Talent (杰出人才)",
                "exceptional_promise": "Exceptional Promise (杰出潜力)",
                "startup_visa": "Startup Visa (创业签证)",
            }
            for pkey, plabel in path_names.items():
                info = pa.get(pkey, {})
                if not info:
                    continue
                pscore = info.get("score", "N/A")
                meets = "是" if info.get("meets_threshold") else "否"
                gaps = info.get("gaps", [])
                gaps_text = "; ".join(gaps[:3]) if gaps else "无明显差距"
                rows.append([
                    Paragraph(_safe(plabel), s["TableCell"]),
                    Paragraph(_safe(str(pscore)), s["TableCellBold"]),
                    Paragraph(_safe(meets), s["TableCell"]),
                    Paragraph(_safe(gaps_text[:150]), s["TableCell"]),
                ])
            if len(rows) > 1:
                t = Table(rows, colWidths=[4.5 * cm, 1.5 * cm, 1.5 * cm, 9 * cm])
                t.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("ALIGN", (1, 0), (2, -1), "CENTER"),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("GRID", (0, 0), (-1, -1), 0.3, BRAND_BORDER),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BRAND_LIGHT_GRAY]),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]))
                story.append(t)
                story.append(Spacer(1, 8))

        return story

    # ========================= 建议与行动计划 =========================
    def _recommendations(self):
        d = self.data
        s = self.styles
        story = self._section_header("建议与行动计划", "六")

        if d["advice"]:
            story.append(Paragraph(_safe("6.1 专业行动建议"), s["H2"]))
            for i, item in enumerate(d["advice"], 1):
                story.append(Paragraph(_safe(f"{i}. {item}"), s["Body"]))
            story.append(Spacer(1, 8))

        if d.get("timeline"):
            story.append(Paragraph(_safe("6.2 时间规划"), s["H2"]))
            story.append(Paragraph(_safe(d["timeline"]), s["Body"]))
            story.append(Spacer(1, 8))

        if d.get("required_documents"):
            story.append(Paragraph(_safe("6.3 所需文档"), s["H2"]))
            for doc_item in d["required_documents"]:
                story.append(Paragraph(_safe(f"\u2022 {doc_item}"), s["Bullet"]))
            story.append(Spacer(1, 8))

        budget = d.get("budget", {})
        if budget and (budget.get("min") or budget.get("max")):
            story.append(Paragraph(_safe("6.4 预算估算"), s["H2"]))
            currency = budget.get("currency", "GBP")
            min_b = budget.get("min", "N/A")
            max_b = budget.get("max", "N/A")
            story.append(Paragraph(_safe(f"预计费用: {currency} {min_b} - {max_b}"), s["Body"]))
            story.append(Spacer(1, 8))

        non_risks = d.get("non_endorsement_risks", [])
        if non_risks:
            story.append(Paragraph(_safe("6.5 非背书风险因素"), s["H2"]))
            story.append(Paragraph(_safe("⚠ 以下因素可能影响背书机构对申请的评估，请予以关注："), s["BodyBold"]))
            for risk in non_risks:
                risk_text = risk if isinstance(risk, str) else risk.get("description", risk.get("risk", str(risk)))
                story.append(Paragraph(_safe(f"\u2022 {risk_text}"), s["Bullet"]))
            story.append(Spacer(1, 8))

        return story

    # ========================= 附录 =========================
    def _appendix(self):
        d = self.data
        s = self.styles
        story = []

        web_v = d.get("web_verification", {})
        if web_v and any(k for k in web_v if k not in ("search_date", "discrepancies", "additional_findings")):
            story += self._section_header("附录: 全网信息验证", "七")

            search_date = web_v.get("search_date", "")
            if search_date:
                story.append(Paragraph(_safe(f"搜索日期: {search_date}"), s["BodySmall"]))
                story.append(Spacer(1, 4))

            verification_rows = []
            source_labels = {
                "linkedin": "LinkedIn",
                "github": "GitHub",
                "scholar": "Google Scholar",
                "patents": "专利数据库",
                "media": "媒体报道",
            }
            for src_key, src_label in source_labels.items():
                info = web_v.get(src_key, {})
                if not info:
                    continue
                status = info.get("status", "未搜索")
                findings = info.get("findings", "")

                detail_parts = []
                if findings:
                    detail_parts.append(str(findings))
                # GitHub specific
                if src_key == "github":
                    if info.get("total_stars"):
                        detail_parts.append(f"总 Stars: {info['total_stars']}")
                    top = info.get("top_project", {})
                    if top:
                        detail_parts.append(f"Top 项目: {top.get('name', '')} ({top.get('stars', 0)} stars)")
                # Scholar specific
                if src_key == "scholar":
                    if info.get("total_papers"):
                        detail_parts.append(f"论文: {info['total_papers']} 篇")
                    if info.get("total_citations"):
                        detail_parts.append(f"引用: {info['total_citations']} 次")
                    if info.get("h_index"):
                        detail_parts.append(f"h-index: {info['h_index']}")
                # Patents specific
                if src_key == "patents":
                    if info.get("count"):
                        detail_parts.append(f"专利总数: {info['count']}")
                    if info.get("invention"):
                        detail_parts.append(f"发明专利: {info['invention']}")
                # Media specific
                if src_key == "media":
                    articles = info.get("articles", [])
                    if articles:
                        for art in articles[:3]:
                            if isinstance(art, dict):
                                detail_parts.append(
                                    f"{art.get('source', '')}: {art.get('title', '')} ({art.get('date', '')})")

                detail_text = "; ".join(detail_parts) if detail_parts else "无详细信息"
                verification_rows.append([src_label, status, detail_text])

            if verification_rows:
                header = [
                    Paragraph(_safe("信息源"), s["TableHeader"]),
                    Paragraph(_safe("状态"), s["TableHeader"]),
                    Paragraph(_safe("详情"), s["TableHeader"]),
                ]
                rows = [header]
                for src, st, det in verification_rows:
                    rows.append([
                        Paragraph(_safe(src), s["TableCellBold"]),
                        Paragraph(_safe(st), s["TableCell"]),
                        Paragraph(_safe(det[:200]), s["TableCell"]),
                    ])
                t = Table(rows, colWidths=[3 * cm, 2.5 * cm, 11 * cm])
                t.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("GRID", (0, 0), (-1, -1), 0.3, BRAND_BORDER),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BRAND_LIGHT_GRAY]),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]))
                story.append(t)
                story.append(Spacer(1, 6))

            discrepancies = web_v.get("discrepancies", [])
            if discrepancies:
                story.append(Paragraph(_safe("信息差异:"), s["H3"]))
                for disc in discrepancies:
                    story.append(Paragraph(_safe(f"\u2022 {disc}"), s["Bullet"]))
                story.append(Spacer(1, 4))

            additional = web_v.get("additional_findings", [])
            if additional:
                story.append(Paragraph(_safe("补充发现:"), s["H3"]))
                for af in additional:
                    story.append(Paragraph(_safe(f"\u2022 {af}"), s["Bullet"]))
                story.append(Spacer(1, 4))

        return story

    # ========================= 页脚声明 =========================
    def _footer_disclaimer(self):
        s = self.styles
        story = [
            Spacer(1, 20),
            self._hr(),
            Paragraph(
                _safe("免责声明: 本报告由 AI 系统基于申请人提供的材料自动生成，仅供参考。"
                       "评估结果不构成任何法律建议或申请承诺。"
                       "建议申请人在正式提交申请前咨询专业移民律师或顾问。"),
                ParagraphStyle("FinalDisclaimer", parent=s["BodySmall"], alignment=TA_CENTER)
            ),
            Spacer(1, 8),
            Paragraph(
                _safe(f"报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M')} | 惜池集团 · 英国移民服务 | www.xichigroup.com.cn"),
                ParagraphStyle("Footer", parent=s["Small"], alignment=TA_CENTER),
            ),
        ]
        return story

    def _header_footer(self, canvas, doc):
        canvas.saveState()
        canvas.setFont(self.font_r, 7)
        canvas.setFillColor(BRAND_GRAY)
        canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 1 * cm,
                               "UK Global Talent Visa Assessment Report")
        canvas.drawString(MARGIN, 0.8 * cm,
                          f"Generated {datetime.now().strftime('%Y-%m-%d')}")
        canvas.drawCentredString(PAGE_W / 2, 0.8 * cm, f"Page {doc.page}")
        canvas.drawRightString(PAGE_W - MARGIN, 0.8 * cm, "Confidential")
        # Top line
        canvas.setStrokeColor(BRAND_PRIMARY)
        canvas.setLineWidth(2)
        canvas.line(MARGIN, PAGE_H - 1.4 * cm, PAGE_W - MARGIN, PAGE_H - 1.4 * cm)
        canvas.restoreState()


def main():
    parser = argparse.ArgumentParser(description="从评估 JSON 生成 GTV 评估 PDF 报告")
    parser.add_argument("input", help="评估数据 JSON 文件")
    parser.add_argument("-o", "--output", required=True, help="输出 PDF 文件路径")
    args = parser.parse_args()

    src = Path(args.input)
    if not src.exists():
        print(f"文件不存在: {src}", file=sys.stderr)
        sys.exit(1)

    raw = json.loads(src.read_text(encoding="utf-8"))
    data = _normalize(raw)
    report = GTVPDFReport(data, args.output)
    report.build()


if __name__ == "__main__":
    main()
