#!/usr/bin/env python3
"""GTV 签证评估 PDF 报告生成器。

使用 ReportLab 生成专业的多页 PDF 报告。
字体优先级：WenQuanYi(Linux) > macOS系统字体 > CID回退。
"""

import logging
import math
import os
from datetime import datetime
from typing import Any, Dict, List

try:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_RIGHT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import (
        PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
    )
    from reportlab.platypus.flowables import HRFlowable
    from reportlab.graphics.shapes import Circle, Drawing, Line, Polygon, String
    print("✅ ReportLab 导入成功")
except ImportError as e:
    print(f"❌ ReportLab 导入失败: {e}")
    raise

_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
_level = getattr(logging, _level_name, logging.INFO)
logger = logging.getLogger("resume_processor")
logger.setLevel(_level)

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
COLOR_RED = colors.HexColor("#dc2626")
COLOR_BLUE_LIGHT = colors.HexColor("#dbeafe")

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


def _register_fonts():
    """注册中文字体。Linux WQY > macOS > CID fallback。"""
    regular, bold = "Helvetica", "Helvetica-Bold"

    font_candidates = [
        # Linux WenQuanYi (TrueType TTC, ReportLab 兼容)
        ("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc", "WQY", None),
        ("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc", "WQYBold", 1),
        ("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc", "WQYZen", None),
        # macOS
        ("/System/Library/Fonts/PingFang.ttc", "PingFang", None),
        ("/System/Library/Fonts/STHeiti Light.ttc", "STHeiti", None),
    ]

    for path, name, subfont in font_candidates:
        if not os.path.exists(path):
            continue
        try:
            if subfont is not None:
                pdfmetrics.registerFont(TTFont(name, path, subfontIndex=subfont))
            else:
                pdfmetrics.registerFont(TTFont(name, path))

            if regular == "Helvetica":
                regular = name
            elif bold == "Helvetica-Bold":
                bold = name
        except Exception as e:
            logger.warning(f"字体加载跳过 {path}({name}): {e}")
            continue

    if bold == "Helvetica-Bold" and regular != "Helvetica":
        bold = regular

    if regular == "Helvetica":
        try:
            from reportlab.pdfbase.cidfonts import UnicodeCIDFont
            pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
            regular = bold = "STSong-Light"
        except Exception:
            logger.warning("无可用中文字体，中文将显示异常")

    logger.info(f"字体: regular={regular}, bold={bold}")
    return regular, bold


def _safe(text) -> str:
    if text is None:
        return ""
    text = str(text)
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _score_color(score: int):
    if score >= 80:
        return COLOR_GREEN
    if score >= 65:
        return COLOR_AMBER
    return COLOR_RED


def _score_level(score: int) -> str:
    if score >= 80:
        return "Exceptional Talent"
    if score >= 65:
        return "Exceptional Promise"
    if score >= 55:
        return "Startup Visa"
    return "Needs Improvement"


def _build_radar_chart(mc_scores: dict, oc_scores: dict, width=320, height=320) -> Drawing:
    dims = MC_DIMS + OC_DIMS
    n = len(dims)
    d = Drawing(width, height)
    cx, cy = width / 2, height / 2
    radius = min(width, height) / 2 - 36
    mc_keys_set = {k for _, k, _ in MC_DIMS}

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
        _, key, _ = dims[i]
        d.add(String(lx, ly - 4, key, fontSize=8, textAnchor="middle", fillColor=BRAND_DARK))

    data_pts = []
    for _, key, max_val in dims:
        scores = mc_scores if key in mc_keys_set else oc_scores
        raw = scores.get(key, 0)
        try:
            val = float(raw)
        except (ValueError, TypeError):
            val = 0
        ratio = min(val / max_val, 1.0) if max_val else 0
        data_pts.append(ratio)

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


class GTVPDFReportGenerator:
    def __init__(self):
        self.font_r, self.font_b = _register_fonts()
        self.styles = getSampleStyleSheet()
        self._setup_styles()

    def _setup_styles(self):
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
            "TH": dict(fontSize=8, textColor=colors.white, fontName=self.font_b, leading=12),
            "TD": dict(fontSize=8, textColor=BRAND_DARK, fontName=self.font_r, leading=12),
            "TDB": dict(fontSize=8, textColor=BRAND_DARK, fontName=self.font_b, leading=12),
        }
        for name, kw in defs.items():
            if name not in [s.name for s in self.styles.byName.values()]:
                self.styles.add(ParagraphStyle(name, parent=self.styles["Normal"], **kw))

    def _hr(self):
        return HRFlowable(width="100%", thickness=0.6, color=BRAND_BORDER, spaceAfter=8, spaceBefore=4)

    def _section(self, title, num=""):
        prefix = f"{num}. " if num else ""
        return [Paragraph(_safe(f"{prefix}{title}"), self.styles["H1"]), self._hr()]

    def _info_table(self, rows, cw=None):
        cw = cw or [4 * cm, 12.5 * cm]
        data = [[Paragraph(_safe(k), self.styles["TDB"]),
                  Paragraph(_safe(str(v)), self.styles["TD"])] for k, v in rows]
        t = Table(data, colWidths=cw)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), COLOR_BLUE_LIGHT),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.4, BRAND_BORDER),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        return t

    def _dim_table(self, dims, scores_dict):
        header = [Paragraph(_safe(h), self.styles["TH"])
                   for h in ["维度", "得分", "满分", "%", "评分依据与理由"]]
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
            parts = [str(evidence)] if evidence else []
            if justification:
                parts.append(f"评分理由: {justification}")
            if official_std:
                parts.append(f"官方标准: {official_std}")
            ev_text = "\n".join(parts)
            if verified:
                ev_text += "\n[已验证]"
            rows.append([
                Paragraph(_safe(label), self.styles["TD"]),
                Paragraph(_safe(str(score)), self.styles["TDB"]),
                Paragraph(_safe(str(max_val)), self.styles["TD"]),
                Paragraph(_safe(f"{pct}%"), self.styles["TD"]),
                Paragraph(_safe(ev_text), self.styles["TD"]),
            ])
        t = Table(rows, colWidths=[3*cm, 1.2*cm, 1.2*cm, 1*cm, 10.1*cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (1, 0), (3, -1), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("GRID", (0, 0), (-1, -1), 0.3, BRAND_BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BRAND_LIGHT_GRAY]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        return t

    def _extract_mc_oc(self, data):
        raw_mc = data.get("mc_scores", data.get("mcScores", {}))
        raw_oc = data.get("oc_scores", data.get("ocScores", {}))

        def _make_entry(v):
            if isinstance(v, dict):
                return {
                    "score": v.get("score", v.get("level", 0)),
                    "evidence": v.get("evidence", ""),
                    "scoring_justification": v.get("scoring_justification", ""),
                    "official_standard": v.get("official_standard", ""),
                    "level": v.get("level", ""),
                    "web_verified": v.get("web_verified", None),
                }
            return {"score": v, "evidence": "", "scoring_justification": "", "official_standard": "", "level": "", "web_verified": None}

        mc, oc = {}, {}
        for _, key, _ in MC_DIMS:
            v = raw_mc.get(key, 0)
            mc[key] = _make_entry(v)
        for _, key, _ in OC_DIMS:
            v = raw_oc.get(key, 0)
            oc[key] = _make_entry(v)

        criteria = data.get("criteriaAssessment", [])
        mc_keys = {k for _, k, _ in MC_DIMS}
        for item in criteria:
            name = item.get("name", "")
            for _, key, _ in MC_DIMS + OC_DIMS:
                if key in name:
                    target = mc if key in mc_keys else oc
                    target[key] = {
                        "score": item.get("score", 0),
                        "evidence": item.get("evidence", ""),
                        "scoring_justification": item.get("scoring_justification", ""),
                        "official_standard": item.get("official_standard", item.get("officialRequirement", "")),
                        "level": item.get("level", ""),
                        "web_verified": item.get("web_verified", None),
                    }
                    break
        return mc, oc

    def _flat_scores(self, scores):
        return {k: (v.get("score", v) if isinstance(v, dict) else v) for k, v in scores.items()}

    def generate_report(self, data: Dict[str, Any], output_path: str = None) -> str:
        logger.info("开始生成PDF报告...")

        if not output_path:
            name = data.get("applicantInfo", {}).get("name", "Applicant")
            safe_name = "".join(c for c in name if c.isalnum() or c in (" ", "-", "_")).rstrip().replace(" ", "-")
            if not safe_name or any("\u4e00" <= c <= "\u9fff" for c in safe_name):
                safe_name = "Applicant"
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"reports/GTV-Assessment-{safe_name}-{ts}.pdf"

        out_dir = os.path.dirname(output_path)
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)

        doc = SimpleDocTemplate(output_path, pagesize=A4,
                                leftMargin=MARGIN, rightMargin=MARGIN,
                                topMargin=MARGIN, bottomMargin=1.5*cm)

        mc, oc = self._extract_mc_oc(data)
        story = []
        story += self._cover(data, mc, oc)
        story.append(PageBreak())
        story += self._summary(data, mc, oc)
        story.append(PageBreak())
        story += self._score_details(data, mc, oc)
        story.append(PageBreak())
        story += self._background(data)
        story.append(PageBreak())
        story += self._strengths_weaknesses(data)
        story += self._pathway(data)
        story += self._recommendations(data)
        story += self._appendix(data)
        story += self._disclaimer()

        doc.build(story, onFirstPage=self._header_footer, onLaterPages=self._header_footer)

        if os.path.exists(output_path):
            size = os.path.getsize(output_path)
            logger.info(f"PDF已生成: {output_path} ({size/1024:.1f} KB)")
        return output_path

    # ======================== 封面 ========================
    def _cover(self, data, mc, oc):
        s = self.styles
        score = int(float(data.get("overallScore", 0) or 0))
        app = data.get("applicantInfo", {})
        pw = data.get("gtvPathway", {})

        story = [
            Spacer(1, 80),
            Paragraph(_safe("UK Global Talent Visa"), s["CoverTitle"]),
            Paragraph(_safe("资格评估报告"), s["CoverTitle"]),
            Spacer(1, 12),
            Paragraph(_safe("Assessment Report"), s["CoverSub"]),
            Spacer(1, 30),
        ]
        sc_style = ParagraphStyle("ScD", parent=s["ScoreBig"], textColor=_score_color(score))
        story.append(Paragraph(_safe(f"{score}/100"), sc_style))
        story.append(Spacer(1, 6))
        story.append(Paragraph(_safe(_score_level(score)),
                     ParagraphStyle("Lvl", parent=s["CoverSub"], fontSize=11, textColor=_score_color(score))))
        route = pw.get("recommendedRoute", "N/A")
        eligibility = pw.get("eligibilityLevel", "")
        story.append(Spacer(1, 6))
        story.append(Paragraph(_safe(f"推荐路径: {route}"),
                     ParagraphStyle("Pw", parent=s["CoverSub"], fontSize=11, textColor=BRAND_PRIMARY)))
        if eligibility:
            story.append(Paragraph(_safe(f"竞争力评级: {eligibility}"),
                         ParagraphStyle("El", parent=s["CoverSub"], fontSize=10)))
        story.append(Spacer(1, 30))

        info_rows = [
            ["申请人", app.get("name", "N/A")],
            ["申请领域", app.get("field", "N/A")],
            ["当前职位", app.get("currentPosition", "N/A")],
            ["所在公司", app.get("company", "N/A")],
            ["工作年限", f"{app.get('yearsOfExperience', 'N/A')} 年"],
            ["评估日期", datetime.now().strftime("%Y-%m-%d")],
        ]
        story.append(self._info_table(info_rows, cw=[4*cm, 9*cm]))
        story.append(Spacer(1, 30))
        story.append(Paragraph(
            _safe("本报告由惜池集团 AI 评估系统生成，基于申请人提供的材料综合分析。最终申请决定请咨询专业移民顾问。"),
            ParagraphStyle("Disc", parent=s["Small"], alignment=TA_CENTER)))
        return story

    # ======================== 总体评估 ========================
    def _summary(self, data, mc, oc):
        s = self.styles
        score = int(float(data.get("overallScore", 0) or 0))
        mc_flat = self._flat_scores(mc)
        oc_flat = self._flat_scores(oc)
        mc_total = sum(float(v) for v in mc_flat.values())
        oc_total = sum(float(v) for v in oc_flat.values())
        mc_max = sum(m for _, _, m in MC_DIMS)
        oc_max = sum(m for _, _, m in OC_DIMS)
        pw = data.get("gtvPathway", {})

        story = self._section("总体评估摘要", "一")

        summary_rows = [
            [Paragraph(_safe("指标"), s["TH"]), Paragraph(_safe("得分"), s["TH"]), Paragraph(_safe("评估等级"), s["TH"])],
            [Paragraph(_safe("总分"), s["TDB"]), Paragraph(_safe(f"{score}/100"), s["TDB"]),
             Paragraph(_safe(_score_level(score)), s["TD"])],
            [Paragraph(_safe("MC 强制标准"), s["TDB"]), Paragraph(_safe(f"{mc_total:.1f}/{mc_max}"), s["TD"]),
             Paragraph(_safe(f"达成率 {int(mc_total/mc_max*100)}%"), s["TD"])],
            [Paragraph(_safe("OC 可选标准"), s["TDB"]), Paragraph(_safe(f"{oc_total:.1f}/{oc_max}"), s["TD"]),
             Paragraph(_safe(f"达成率 {int(oc_total/oc_max*100)}%"), s["TD"])],
            [Paragraph(_safe("推荐路径"), s["TDB"]), Paragraph(_safe(pw.get("recommendedRoute", "N/A")), s["TD"]),
             Paragraph(_safe(pw.get("eligibilityLevel", "")), s["TD"])],
        ]
        t = Table(summary_rows, colWidths=[4*cm, 5*cm, 7.5*cm])
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

        raw = data.get("gtvAnalysis", data)
        eb_rec = raw.get("endorsing_body_recommendation", raw.get("endorsing_body", ""))
        if isinstance(eb_rec, dict):
            endorsing_body = eb_rec.get("body", eb_rec.get("name", eb_rec.get("endorsing_body", "")))
        else:
            endorsing_body = eb_rec or raw.get("endorsing_body", "")
        if endorsing_body:
            story.append(Paragraph(_safe(f"推荐背书机构: {endorsing_body}"), s["Body"]))
            story.append(Spacer(1, 6))

        chart = _build_radar_chart(mc_flat, oc_flat)
        story.append(Paragraph(_safe("八维能力雷达图"), s["H2"]))
        story.append(chart)
        story.append(Spacer(1, 10))

        rec = data.get("recommendation", "")
        if rec:
            story.append(Paragraph(_safe("综合评估意见"), s["H2"]))
            story.append(Paragraph(_safe(rec), s["Body"]))
        return story

    # ======================== 评分明细 ========================
    def _score_details(self, data, mc, oc):
        s = self.styles
        story = self._section("评分明细", "二")

        story.append(Paragraph(_safe("2.1 Mandatory Criteria (MC) — 强制标准"), s["H2"]))
        story.append(Paragraph(
            _safe("MC 标准是 GTV 申请的核心评审维度。根据 GOV.UK 官方标准（Appendix Global Talent, GTE 8.1-8.10），申请人须展示在数字技术领域被认可为杰出人才（Exceptional Talent）或潜在领导者（Exceptional Promise）的证据，并满足至少 2 项'其他必要技能'。"),
            s["BodySmall"]))
        story.append(Spacer(1, 4))
        story.append(self._dim_table(MC_DIMS, mc))
        story.append(Spacer(1, 14))

        story.append(Paragraph(_safe("2.2 Optional Criteria (OC) — 可选标准"), s["H2"]))
        story.append(Paragraph(
            _safe("OC 标准评估申请人的创新、学术、技术领导和社会贡献。根据官方标准，申请人须在以下技能中展示至少 2 项：研究发表、产品主导贡献、工作外贡献、创新记录。"),
            s["BodySmall"]))
        story.append(Spacer(1, 4))
        story.append(self._dim_table(OC_DIMS, oc))
        story.append(Spacer(1, 14))

        criteria = data.get("criteriaAssessment", [])
        if criteria:
            story.append(Paragraph(_safe("2.3 各标准评审详情"), s["H2"]))
            for i, item in enumerate(criteria, 1):
                name = item.get("name", f"标准 {i}")
                status = item.get("status", "")
                sc = item.get("score", 0)
                evidence = item.get("evidence", "")
                recs = item.get("recommendations", "")
                official = item.get("officialRequirement", "")

                story.append(Paragraph(_safe(f"{i}. {name}"), s["H3"]))
                rows = []
                if status:
                    rows.append(["状态", status])
                try:
                    rows.append(["评分", f"{int(float(sc))}/100"])
                except (ValueError, TypeError):
                    rows.append(["评分", str(sc)])
                if official:
                    rows.append(["官方要求", str(official)[:200]])
                if evidence:
                    rows.append(["评估证据", str(evidence)[:200]])
                if recs:
                    rows.append(["补强建议", str(recs)[:200]])
                if rows:
                    story.append(self._info_table(rows, cw=[3*cm, 13.5*cm]))
                    story.append(Spacer(1, 6))
        return story

    # ======================== 背景分析 ========================
    def _background(self, data):
        s = self.styles
        story = self._section("背景深度分析", "三")

        # 教育
        edu = data.get("educationBackground", {})
        if edu and (edu.get("analysis") or edu.get("degrees")):
            story.append(Paragraph(_safe("3.1 教育背景"), s["H2"]))
            if edu.get("degrees"):
                story.append(Paragraph(_safe(f"学位: {', '.join(edu['degrees'])}"), s["Body"]))
            if edu.get("institutions"):
                story.append(Paragraph(_safe(f"院校: {', '.join(edu['institutions'])}"), s["Body"]))
            if edu.get("analysis"):
                story.append(Paragraph(_safe(edu["analysis"]), s["Body"]))
            story.append(Spacer(1, 6))

        # 行业
        ind = data.get("industryBackground", {})
        if ind and (ind.get("analysis") or ind.get("sector")):
            story.append(Paragraph(_safe("3.2 行业背景"), s["H2"]))
            rows = []
            if ind.get("sector"): rows.append(["行业领域", ind["sector"]])
            if ind.get("yearsInIndustry"): rows.append(["行业经验", f"{ind['yearsInIndustry']} 年"])
            if ind.get("keyCompanies"): rows.append(["关键公司", ", ".join(ind["keyCompanies"])])
            if ind.get("industryImpact"): rows.append(["影响力评分", f"{ind['industryImpact']}/10"])
            if rows:
                story.append(self._info_table(rows, cw=[3*cm, 13.5*cm]))
            if ind.get("analysis"):
                story.append(Spacer(1, 4))
                story.append(Paragraph(_safe(ind["analysis"]), s["Body"]))
            story.append(Spacer(1, 6))

        # 工作
        work = data.get("workExperience", {})
        if work and (work.get("analysis") or work.get("positions")):
            story.append(Paragraph(_safe("3.3 工作经验"), s["H2"]))
            if work.get("positions"):
                story.append(Paragraph(_safe(f"职位: {', '.join(work['positions'][:5])}"), s["Body"]))
            if work.get("leadershipRoles"):
                story.append(Paragraph(_safe(f"领导角色: {', '.join(work['leadershipRoles'][:5])}"), s["Body"]))
            if work.get("keyAchievements"):
                story.append(Paragraph(_safe("关键成就:"), s["BodyBold"]))
                for a in work["keyAchievements"][:6]:
                    story.append(Paragraph(_safe(f"\u2022 {a}"), s["Bullet"]))
            if work.get("projectImpact"):
                story.append(Paragraph(_safe("项目影响:"), s["BodyBold"]))
                for p in work["projectImpact"][:5]:
                    story.append(Paragraph(_safe(f"\u2022 {p}"), s["Bullet"]))
            if work.get("analysis"):
                story.append(Spacer(1, 4))
                story.append(Paragraph(_safe(work["analysis"]), s["Body"]))
            story.append(Spacer(1, 6))

        # 技术
        tech = data.get("technicalExpertise", {})
        if tech and (tech.get("analysis") or tech.get("coreSkills")):
            story.append(Paragraph(_safe("3.4 技术专长"), s["H2"]))
            if tech.get("coreSkills"):
                story.append(Paragraph(_safe(f"核心技能: {', '.join(tech['coreSkills'][:8])}"), s["Body"]))
            if tech.get("specializations"):
                story.append(Paragraph(_safe(f"专业领域: {', '.join(tech['specializations'][:5])}"), s["Body"]))
            if tech.get("innovations"):
                story.append(Paragraph(_safe("创新成果:"), s["BodyBold"]))
                for inv in tech["innovations"][:5]:
                    story.append(Paragraph(_safe(f"\u2022 {inv}"), s["Bullet"]))
            if tech.get("industryRecognition"):
                story.append(Paragraph(_safe("行业认可:"), s["BodyBold"]))
                for r in tech["industryRecognition"][:5]:
                    story.append(Paragraph(_safe(f"\u2022 {r}"), s["Bullet"]))
            if tech.get("analysis"):
                story.append(Spacer(1, 4))
                story.append(Paragraph(_safe(tech["analysis"]), s["Body"]))
            story.append(Spacer(1, 6))

        # 行业影响力
        ia = data.get("industryAnalysis", {})
        if ia and ia.get("analysis"):
            story.append(Paragraph(_safe("3.5 行业影响力"), s["H2"]))
            if ia.get("industryImpact"):
                story.append(Paragraph(_safe(f"影响力评分: {ia['industryImpact']}/10"), s["Body"]))
            story.append(Paragraph(_safe(ia["analysis"]), s["Body"]))
            story.append(Spacer(1, 6))

        # 公司贡献
        cc = data.get("companyContribution", {})
        if cc and cc.get("analysis"):
            story.append(Paragraph(_safe("3.6 公司贡献"), s["H2"]))
            if cc.get("impact"):
                story.append(Paragraph(_safe(f"贡献评分: {cc['impact']}/10"), s["Body"]))
            if cc.get("achievements"):
                for a in cc["achievements"][:5]:
                    story.append(Paragraph(_safe(f"\u2022 {a}"), s["Bullet"]))
            story.append(Paragraph(_safe(cc["analysis"]), s["Body"]))
            story.append(Spacer(1, 6))

        # 行业地位
        ist = data.get("industryStatus", {})
        if ist and ist.get("analysis"):
            story.append(Paragraph(_safe("3.7 行业地位"), s["H2"]))
            if ist.get("status"):
                story.append(Paragraph(_safe(f"地位评分: {ist['status']}/10"), s["Body"]))
            if ist.get("awards"):
                for aw in ist["awards"][:5]:
                    story.append(Paragraph(_safe(f"\u2022 {aw}"), s["Bullet"]))
            story.append(Paragraph(_safe(ist["analysis"]), s["Body"]))
            story.append(Spacer(1, 6))

        return story

    # ======================== 优劣势 ========================
    def _strengths_weaknesses(self, data):
        s = self.styles
        story = self._section("优劣势分析", "四")

        strengths = data.get("strengths", [])
        if strengths:
            story.append(Paragraph(_safe("4.1 核心优势"), s["H2"]))
            for i, item in enumerate(strengths, 1):
                if isinstance(item, str):
                    story.append(Paragraph(_safe(f"{i}. {item}"), s["Body"]))
                elif isinstance(item, dict):
                    area = item.get("area", "")
                    desc = item.get("description", "")
                    evidence = item.get("evidence", "")
                    gtv_rel = item.get("gtvRelevance", "")
                    title = f"{i}. {area}" if area else f"{i}."
                    story.append(Paragraph(_safe(title), s["H3"]))
                    story.append(Paragraph(_safe(desc), s["Body"]))
                    if evidence:
                        story.append(Paragraph(_safe(f"证据: {evidence}"), s["BodySmall"]))
                    if gtv_rel:
                        story.append(Paragraph(_safe(f"GTV 关联: {gtv_rel}"), s["BodySmall"]))
                    story.append(Spacer(1, 3))

        weaknesses = data.get("weaknesses", [])
        if weaknesses:
            story.append(Paragraph(_safe("4.2 待提升领域"), s["H2"]))
            for i, item in enumerate(weaknesses, 1):
                if isinstance(item, str):
                    story.append(Paragraph(_safe(f"{i}. {item}"), s["Body"]))
                elif isinstance(item, dict):
                    area = item.get("area", "")
                    desc = item.get("description", "")
                    improvement = item.get("improvement", "")
                    priority = item.get("priority", "")
                    timeframe = item.get("timeframe", "")
                    title = f"{i}. {area}" if area else f"{i}."
                    story.append(Paragraph(_safe(title), s["H3"]))
                    story.append(Paragraph(_safe(desc), s["Body"]))
                    if improvement:
                        story.append(Paragraph(_safe(f"改进方案: {improvement}"), s["BodySmall"]))
                    if priority:
                        story.append(Paragraph(_safe(f"优先级: {priority}"), s["BodySmall"]))
                    if timeframe:
                        story.append(Paragraph(_safe(f"时间框架: {timeframe}"), s["BodySmall"]))
                    story.append(Spacer(1, 3))

        return story

    # ======================== 路径分析 ========================
    def _pathway(self, data):
        s = self.styles
        story = self._section("GTV 路径分析", "五")

        pw = data.get("gtvPathway", {})
        if pw.get("analysis"):
            story.append(Paragraph(_safe(pw["analysis"]), s["Body"]))
            story.append(Spacer(1, 8))

        pa = data.get("path_analysis", {})
        if pa:
            header = [Paragraph(_safe(h), s["TH"]) for h in ["路径", "评分", "达标", "主要差距"]]
            rows = [header]
            path_names = {
                "exceptional_talent": "Exceptional Talent",
                "exceptional_promise": "Exceptional Promise",
                "startup_visa": "Startup Visa",
            }
            for pkey, plabel in path_names.items():
                info = pa.get(pkey, {})
                if not info:
                    continue
                pscore = info.get("score", "N/A")
                meets = "是" if info.get("meets_threshold") else "否"
                gaps = info.get("gaps", [])
                gaps_text = "; ".join(gaps[:3]) if gaps else "无"
                rows.append([
                    Paragraph(_safe(plabel), s["TD"]),
                    Paragraph(_safe(str(pscore)), s["TDB"]),
                    Paragraph(_safe(meets), s["TD"]),
                    Paragraph(_safe(gaps_text[:150]), s["TD"]),
                ])
            if len(rows) > 1:
                t = Table(rows, colWidths=[4.5*cm, 1.5*cm, 1.5*cm, 9*cm])
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
        return story

    # ======================== 建议 ========================
    def _recommendations(self, data):
        s = self.styles
        story = self._section("建议与行动计划", "六")

        advice = data.get("professionalAdvice", [])
        if advice:
            story.append(Paragraph(_safe("6.1 专业行动建议"), s["H2"]))
            for i, item in enumerate(advice, 1):
                story.append(Paragraph(_safe(f"{i}. {item}"), s["Body"]))
            story.append(Spacer(1, 8))

        timeline = data.get("timeline", "")
        if timeline:
            story.append(Paragraph(_safe("6.2 时间规划"), s["H2"]))
            story.append(Paragraph(_safe(timeline), s["Body"]))
            story.append(Spacer(1, 8))

        documents = data.get("requiredDocuments", [])
        if documents:
            story.append(Paragraph(_safe("6.3 所需文档"), s["H2"]))
            for doc in documents:
                story.append(Paragraph(_safe(f"\u2022 {doc}"), s["Bullet"]))
            story.append(Spacer(1, 8))

        budget = data.get("estimatedBudget", {})
        if budget and (budget.get("min") or budget.get("max")):
            story.append(Paragraph(_safe("6.4 预算估算"), s["H2"]))
            currency = budget.get("currency", "GBP")
            story.append(Paragraph(_safe(f"预计费用: {currency} {budget.get('min', 'N/A')} - {budget.get('max', 'N/A')}"), s["Body"]))
            story.append(Spacer(1, 8))

        raw = data.get("gtvAnalysis", data)
        non_risks = raw.get("non_endorsement_risk_factors", [])
        if non_risks:
            story.append(Paragraph(_safe("6.5 非背书风险因素"), s["H2"]))
            story.append(Paragraph(_safe("⚠ 以下因素可能影响背书机构对申请的评估，请予以关注："), s["BodyBold"]))
            for risk in non_risks:
                risk_text = risk if isinstance(risk, str) else risk.get("description", risk.get("risk", str(risk)))
                story.append(Paragraph(_safe(f"\u2022 {risk_text}"), s["Bullet"]))
            story.append(Spacer(1, 8))

        return story

    # ======================== 附录 ========================
    def _appendix(self, data):
        s = self.styles
        story = []
        web_v = data.get("web_verification", {})
        if not web_v:
            return story

        sources = {k: v for k, v in web_v.items()
                   if k not in ("search_date", "discrepancies", "additional_findings") and isinstance(v, dict)}
        if not sources:
            return story

        story += self._section("附录: 全网信息验证", "七")

        if web_v.get("search_date"):
            story.append(Paragraph(_safe(f"搜索日期: {web_v['search_date']}"), s["BodySmall"]))
            story.append(Spacer(1, 4))

        labels = {"linkedin": "LinkedIn", "github": "GitHub", "scholar": "Google Scholar",
                  "patents": "专利数据库", "media": "媒体报道"}
        header = [Paragraph(_safe(h), s["TH"]) for h in ["信息源", "状态", "详情"]]
        rows = [header]
        for src_key, src_label in labels.items():
            info = web_v.get(src_key, {})
            if not info:
                continue
            status = info.get("status", "未搜索")
            parts = []
            if info.get("findings"):
                parts.append(str(info["findings"]))
            if src_key == "github":
                if info.get("total_stars"): parts.append(f"Stars: {info['total_stars']}")
                top = info.get("top_project", {})
                if top: parts.append(f"Top: {top.get('name', '')} ({top.get('stars', 0)}★)")
            if src_key == "scholar":
                if info.get("total_papers"): parts.append(f"论文: {info['total_papers']}")
                if info.get("total_citations"): parts.append(f"引用: {info['total_citations']}")
                if info.get("h_index"): parts.append(f"h-index: {info['h_index']}")
            if src_key == "patents":
                if info.get("count"): parts.append(f"专利: {info['count']}")
            if src_key == "media":
                for art in info.get("articles", [])[:2]:
                    if isinstance(art, dict):
                        parts.append(f"{art.get('source', '')}: {art.get('title', '')}")
            det = "; ".join(parts) if parts else "-"
            rows.append([Paragraph(_safe(src_label), s["TDB"]),
                         Paragraph(_safe(status), s["TD"]),
                         Paragraph(_safe(det[:200]), s["TD"])])

        if len(rows) > 1:
            t = Table(rows, colWidths=[3*cm, 2.5*cm, 11*cm])
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

        for disc in web_v.get("discrepancies", []):
            story.append(Paragraph(_safe(f"\u2022 差异: {disc}"), s["Bullet"]))
        for af in web_v.get("additional_findings", []):
            story.append(Paragraph(_safe(f"\u2022 补充: {af}"), s["Bullet"]))

        return story

    # ======================== 免责声明 ========================
    def _disclaimer(self):
        s = self.styles
        return [
            Spacer(1, 20),
            self._hr(),
            Paragraph(_safe("免责声明: 本报告由 AI 系统自动生成，仅供参考。评估结果不构成法律建议。建议咨询专业移民顾问。"),
                       ParagraphStyle("FD", parent=s["BodySmall"], alignment=TA_CENTER)),
            Spacer(1, 8),
            Paragraph(_safe(f"报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M')} | 惜池集团 · 英国移民服务"),
                       ParagraphStyle("Ft", parent=s["Small"], alignment=TA_CENTER)),
        ]

    def _header_footer(self, canvas, doc):
        canvas.saveState()
        canvas.setFont(self.font_r, 7)
        canvas.setFillColor(BRAND_GRAY)
        canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 1*cm, "UK Global Talent Visa Assessment Report")
        canvas.drawString(MARGIN, 0.8*cm, f"Generated {datetime.now().strftime('%Y-%m-%d')}")
        canvas.drawCentredString(PAGE_W / 2, 0.8*cm, f"Page {doc.page}")
        canvas.drawRightString(PAGE_W - MARGIN, 0.8*cm, "Confidential")
        canvas.setStrokeColor(BRAND_PRIMARY)
        canvas.setLineWidth(2)
        canvas.line(MARGIN, PAGE_H - 1.4*cm, PAGE_W - MARGIN, PAGE_H - 1.4*cm)
        canvas.restoreState()


def generate_gtv_pdf_report(assessment_data: Dict[str, Any], output_path: str = None) -> str:
    """生成GTV评估PDF报告的便捷函数"""
    logger.info("调用 generate_gtv_pdf_report...")
    generator = GTVPDFReportGenerator()
    result = generator.generate_report(assessment_data, output_path)
    logger.info(f"PDF生成完成: {result}")
    return result


if __name__ == "__main__":
    test_data = {
        "applicantInfo": {
            "name": "测试用户",
            "field": "Digital Technology",
            "currentPosition": "Senior Engineer",
            "company": "Tech Corp",
            "yearsOfExperience": 8,
        },
        "overallScore": 72,
        "gtvPathway": {
            "recommendedRoute": "Exceptional Promise",
            "eligibilityLevel": "Good",
            "analysis": "综合分析认为申请人适合走 Exceptional Promise 路径。",
        },
        "recommendation": "推荐走 Exceptional Promise 路径。",
    }
    try:
        output_file = generate_gtv_pdf_report(test_data)
        print(f"测试PDF生成成功: {output_file}")
    except Exception as e:
        print(f"测试PDF生成失败: {e}")
