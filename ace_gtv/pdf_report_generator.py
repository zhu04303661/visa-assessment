#!/usr/bin/env python3
"""
GTV签证评估PDF报告生成器
使用ReportLab生成专业的PDF报告
"""

import os
import logging
from datetime import datetime
from typing import Dict, Any, List

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.platypus.flowables import HRFlowable
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    print("✅ ReportLab 导入成功")
except ImportError as e:
    print(f"❌ ReportLab 导入失败: {e}")
    raise

# 导入Markdown保存器
try:
    from markdown_saver import GTVMarkdownSaver, load_assessment_from_markdown
    print("✅ Markdown保存器导入成功")
except ImportError as e:
    print(f"❌ Markdown保存器导入失败: {e}")
    GTVMarkdownSaver = None
    load_assessment_from_markdown = None

# 配置日志（支持环境变量 LOG_LEVEL）
_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
_level = getattr(logging, _level_name, logging.INFO)
# 统一日志（UTF-8、文件+控制台、包含文件与行号）
logger = logging.getLogger("resume_processor")
logger.setLevel(_level)

class GTVPDFReportGenerator:
    """GTV签证评估PDF报告生成器"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._register_chinese_fonts()
        self._setup_custom_styles()
    
    def _register_chinese_fonts(self):
        """注册中文字体"""
        logger.info("🔤 开始注册中文字体...")
        try:
            # 尝试注册系统中文字体 - 重新排序，优先使用PingFang
            font_paths = [
                # macOS 系统字体 - 优先使用PingFang，它对中文支持最好
                '/System/Library/Fonts/PingFang.ttc',
                '/System/Library/Fonts/STHeiti Light.ttc',
                '/System/Library/Fonts/STHeiti Medium.ttc',
                '/System/Library/Fonts/STSong.ttc',
                '/System/Library/Fonts/STKaiti.ttc',
                '/System/Library/Fonts/Arial Unicode MS.ttf',
                '/Library/Fonts/Arial Unicode MS.ttf',
                '/System/Library/Fonts/AppleGothic.ttf',
            ]
            
            logger.info(f"🔍 检查 {len(font_paths)} 个字体路径...")
            chinese_font_registered = False
            
            for i, font_path in enumerate(font_paths, 1):
                logger.info(f"🔍 检查字体 {i}/{len(font_paths)}: {font_path}")
                if os.path.exists(font_path):
                    logger.info(f"✅ 字体文件存在: {font_path}")
                    try:
                        # 注册中文字体
                        logger.info(f"🔄 正在注册字体: {font_path}")
                        pdfmetrics.registerFont(TTFont('ChineseFont', font_path))
                        pdfmetrics.registerFont(TTFont('ChineseFontBold', font_path))
                        chinese_font_registered = True
                        logger.info(f"✅ 中文字体注册成功: {font_path}")
                        
                        # 测试字体是否真的支持中文
                        try:
                            from reportlab.pdfgen import canvas
                            test_canvas = canvas.Canvas('/tmp/font_test.pdf')
                            test_canvas.setFont('ChineseFont', 12)
                            test_canvas.drawString(100, 100, "测试中文")
                            test_canvas.save()
                            logger.info("✅ 字体中文测试成功")
                        except Exception as test_e:
                            logger.warning(f"⚠️ 字体中文测试失败: {test_e}")
                        
                        break
                    except Exception as e:
                        logger.warning(f"⚠️ 字体注册失败 {font_path}: {e}")
                        continue
                else:
                    logger.info(f"❌ 字体文件不存在: {font_path}")
            
            if not chinese_font_registered:
                # 如果没有找到系统字体，使用ReportLab内置的字体
                logger.warning("⚠️ 未找到系统中文字体，使用默认字体")
                self.chinese_font = 'Helvetica'
                self.chinese_font_bold = 'Helvetica-Bold'
            else:
                self.chinese_font = 'ChineseFont'
                self.chinese_font_bold = 'ChineseFontBold'
            
            logger.info(f"🎨 最终字体设置: 中文={self.chinese_font}, 中文粗体={self.chinese_font_bold}")
                
        except Exception as e:
            logger.error(f"❌ 中文字体注册失败: {e}")
            self.chinese_font = 'Helvetica'
            self.chinese_font_bold = 'Helvetica-Bold'
    
    def _safe_text(self, text):
        """安全处理文本，确保中文字符正确显示"""
        if not text:
            return ""
        
        # 确保文本是字符串
        text = str(text)
        
        # 处理特殊字符
        text = text.replace('&', '&amp;')
        text = text.replace('<', '&lt;')
        text = text.replace('>', '&gt;')
        
        # 确保文本编码正确
        try:
            # 尝试编码为UTF-8
            text.encode('utf-8')
            logger.debug(f"✅ 文本编码正常: {text[:50]}...")
        except UnicodeEncodeError as e:
            logger.warning(f"⚠️ 文本编码失败: {e}, 原始文本: {text[:50]}...")
            # 如果编码失败，使用ASCII安全字符
            text = text.encode('ascii', 'ignore').decode('ascii')
            logger.warning(f"⚠️ 使用ASCII安全字符: {text[:50]}...")
        
        return text
    
    def _setup_custom_styles(self):
        """设置自定义样式"""
        logger.info("🎨 开始设置自定义样式...")
        # 检查样式是否已存在，避免重复定义
        style_names = ['CustomTitle', 'SectionTitle', 'SubSectionTitle', 'BodyText', 'Emphasis', 'Score']
        
        logger.info(f"📝 需要设置的样式: {style_names}")
        
        for style_name in style_names:
            if style_name not in self.styles:
                logger.debug(f"➕ 添加样式: {style_name}")
                if style_name == 'CustomTitle':
                    self.styles.add(ParagraphStyle(
                        name='CustomTitle',
                        parent=self.styles['Title'],
                        fontSize=24,
                        spaceAfter=30,
                        alignment=TA_CENTER,
                        textColor=colors.HexColor('#1f2937'),
                        fontName=self.chinese_font_bold
                    ))
                elif style_name == 'SectionTitle':
                    self.styles.add(ParagraphStyle(
                        name='SectionTitle',
                        parent=self.styles['Heading1'],
                        fontSize=16,
                        spaceAfter=12,
                        spaceBefore=20,
                        textColor=colors.HexColor('#374151'),
                        fontName=self.chinese_font_bold,
                        borderWidth=0,
                        borderColor=colors.HexColor('#e5e7eb'),
                        borderPadding=5
                    ))
                elif style_name == 'SubSectionTitle':
                    self.styles.add(ParagraphStyle(
                        name='SubSectionTitle',
                        parent=self.styles['Heading2'],
                        fontSize=14,
                        spaceAfter=8,
                        spaceBefore=12,
                        textColor=colors.HexColor('#4b5563'),
                        fontName=self.chinese_font_bold
                    ))
                elif style_name == 'BodyText':
                    self.styles.add(ParagraphStyle(
                        name='BodyText',
                        parent=self.styles['Normal'],
                        fontSize=11,
                        spaceAfter=6,
                        alignment=TA_JUSTIFY,
                        textColor=colors.HexColor('#374151'),
                        fontName=self.chinese_font
                    ))
                elif style_name == 'Emphasis':
                    self.styles.add(ParagraphStyle(
                        name='Emphasis',
                        parent=self.styles['Normal'],
                        fontSize=11,
                        spaceAfter=6,
                        textColor=colors.HexColor('#1f2937'),
                        fontName=self.chinese_font_bold
                    ))
                elif style_name == 'Score':
                    self.styles.add(ParagraphStyle(
                        name='Score',
                        parent=self.styles['Normal'],
                        fontSize=18,
                        spaceAfter=10,
                        alignment=TA_CENTER,
                        textColor=colors.HexColor('#059669'),
                        fontName=self.chinese_font_bold
                    ))
                logger.debug(f"✅ 样式 {style_name} 添加成功")
            else:
                logger.debug(f"⚠️ 样式 {style_name} 已存在，跳过")
        
            logger.info("✅ 自定义样式设置完成，共 %d 个样式", len(style_names))
    
    def generate_report(self, assessment_data: Dict[str, Any], output_path: str = None) -> str:
        """生成PDF报告"""
        logger.info("🚀 开始生成PDF报告...")
        logger.info(f"📊 评估数据概览: 申请人={assessment_data.get('applicantInfo', {}).get('name', 'N/A')}, 总分={assessment_data.get('overallScore', 0)}")
        
        try:
            # 步骤1: 生成输出路径
            if not output_path:
                logger.info("📁 生成默认输出路径...")
                applicant_name = assessment_data.get('applicantInfo', {}).get('name', 'Applicant')
                logger.info(f"👤 申请人姓名: {applicant_name}")
                
                # 将中文名转换为拼音或使用英文标识
                if any('\u4e00' <= char <= '\u9fff' for char in applicant_name):
                    # 包含中文字符，使用英文标识
                    safe_name = "Applicant"
                    logger.info("🈶 检测到中文字符，使用英文标识")
                else:
                    safe_name = "".join(c for c in applicant_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
                    safe_name = safe_name.replace(' ', '-')
                    logger.info(f"🔤 使用原始姓名: {safe_name}")
                
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                output_path = f"reports/GTV-Assessment-{safe_name}-{timestamp}.pdf"
                logger.info(f"📄 输出路径: {output_path}")
            else:
                logger.info(f"📄 使用指定输出路径: {output_path}")
            
            # 步骤2: 确保输出目录存在
            logger.info("📂 确保输出目录存在...")
            output_dir = os.path.dirname(output_path)
            if output_dir:  # 只有当目录路径不为空时才创建
                os.makedirs(output_dir, exist_ok=True)
                logger.info(f"✅ 输出目录已确认: {output_dir}")
            else:
                logger.info("📁 输出文件在当前目录，无需创建目录")
            
            # 步骤3: 创建PDF文档
            logger.info("📋 创建PDF文档模板...")
            doc = SimpleDocTemplate(
                output_path,
                pagesize=A4,
                rightMargin=2*cm,
                leftMargin=2*cm,
                topMargin=2*cm,
                bottomMargin=2*cm
            )
            logger.info("✅ PDF文档模板创建成功")
            
            # 步骤4: 构建内容
            logger.info("📝 开始构建PDF内容...")
            story = []
            
            # 添加封面
            logger.info("📄 添加封面页...")
            cover_content = self._create_cover_page(assessment_data)
            story.extend(cover_content)
            story.append(PageBreak())
            logger.info(f"✅ 封面页添加完成，内容元素数量: {len(cover_content)}，页面内容：{cover_content}")
            
            # 添加执行摘要
            logger.info("📊 添加执行摘要...")
            summary_content = self._create_executive_summary(assessment_data)
            story.extend(summary_content)
            story.append(PageBreak())
            logger.info(f"✅ 执行摘要添加完成，内容元素数量: {len(summary_content)}，页面内容：{summary_content}")
            
            # 添加申请人信息
            logger.info("👤 添加申请人信息...")
            applicant_content = self._create_applicant_info(assessment_data)
            story.extend(applicant_content)
            story.append(PageBreak())
            logger.info(f"✅ 申请人信息添加完成，内容元素数量: {len(applicant_content)}，页面内容：{applicant_content}")
            
            # 添加评估结果
            logger.info("📈 添加评估结果...")
            results_content = self._create_assessment_results(assessment_data)
            story.extend(results_content)
            story.append(PageBreak())
            logger.info(f"✅ 评估结果添加完成，内容元素数量: {len(results_content)}，页面内容：{results_content}")
            
            # 添加详细分析
            logger.info("🔍 添加详细分析...")
            analysis_content = self._create_detailed_analysis(assessment_data)
            story.extend(analysis_content)
            story.append(PageBreak())
            logger.info(f"✅ 详细分析添加完成，内容元素数量: {len(analysis_content)}，页面内容：{analysis_content}")
            
            # 添加建议和行动计划
            logger.info("💡 添加建议和行动计划...")
            recommendations_content = self._create_recommendations(assessment_data)
            story.extend(recommendations_content)
            logger.info(f"✅ 建议和行动计划添加完成，内容元素数量: {len(recommendations_content)}，页面内容：{recommendations_content}")
            
            # 统计总内容
            total_elements = len(story)
            logger.info(f"📊 内容构建完成，总元素数量: {total_elements}，页面内容：{story}")
            
            # 步骤5: 生成PDF
            logger.info("🖨️ 开始生成PDF文件...")
            logger.info(f"🎨 使用字体: 中文={self.chinese_font}, 中文粗体={self.chinese_font_bold}")
            
            doc.build(story, onFirstPage=self._add_header_footer, onLaterPages=self._add_header_footer)
            
            # 步骤6: 验证生成的文件
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                logger.info("✅ PDF文件生成成功!")
                logger.info(f"📄 文件路径: {output_path}")
                logger.info(f"📏 文件大小: {file_size:,} 字节 ({file_size/1024:.1f} KB)")
                logger.info(f"🎯 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            else:
                logger.error(f"❌ PDF文件生成失败，文件不存在: {output_path}")
                raise FileNotFoundError(f"PDF文件未生成: {output_path}")
            
            logger.info("🎉 PDF报告生成流程完成!")
            return output_path
            
        except Exception as e:
            logger.error(f"❌ PDF报告生成失败: {e}")
            logger.error(f"🔍 错误类型: {type(e).__name__}")
            logger.error(f"📍 错误位置: {e.__traceback__.tb_frame.f_code.co_filename}:{e.__traceback__.tb_lineno}")
            raise
    

    def _create_cover_page(self, data: Dict[str, Any]) -> List:
        """创建封面页"""
        logger.debug("📄 开始创建封面页...")
        story = []
        
        # 标题
        logger.debug("📝 添加标题...")
        story.append(Paragraph(self._safe_text("UK Global Talent Visa"), self.styles['CustomTitle']))
        story.append(Paragraph(self._safe_text("Assessment Report"), self.styles['CustomTitle']))
        story.append(Spacer(1, 30))
        
        # 申请人姓名
        applicant_name = data.get('applicantInfo', {}).get('name', 'N/A')
        logger.debug(f"👤 添加申请人姓名: {applicant_name}")
        story.append(Paragraph(self._safe_text(f"Applicant: {applicant_name}"), self.styles['SectionTitle']))
        story.append(Spacer(1, 20))
        
        # 评估日期
        assessment_date = datetime.now().strftime('%B %d, %Y')
        logger.debug(f"📅 添加评估日期: {assessment_date}")
        story.append(Paragraph(self._safe_text(f"Assessment Date: {assessment_date}"), self.styles['BodyText']))
        story.append(Spacer(1, 20))
        
        # 总体评分
        overall_score = data.get('overallScore', 0)
        try:
            overall_score = int(float(overall_score)) if overall_score else 0
        except (ValueError, TypeError):
            logger.warning(f"⚠️ overallScore转换失败: {overall_score}，使用默认值0")
            overall_score = 0
        score_color = self._get_score_color(overall_score)
        logger.debug(f"📊 添加总体评分: {overall_score}/100, 颜色: {score_color}")
        story.append(Paragraph(self._safe_text(f"Overall Score: {overall_score}/100"), 
                              ParagraphStyle('Score', parent=self.styles['Score'], textColor=score_color)))
        story.append(Spacer(1, 30))
        
        # 推荐路径
        pathway = data.get('gtvPathway', {}).get('recommendedRoute', 'N/A')
        logger.debug(f"🛤️ 添加推荐路径: {pathway}")
        story.append(Paragraph(self._safe_text(f"Recommended Pathway: {pathway}"), self.styles['Emphasis']))
        story.append(Spacer(1, 20))
        
        # 免责声明
        logger.debug("⚠️ 添加免责声明...")
        disclaimer = """
        <i>This assessment report is generated by an AI-powered system and is for informational purposes only. 
        It should not be considered as official immigration advice. Please consult with qualified immigration 
        professionals for official guidance on UK visa applications.</i>
        """
        story.append(Paragraph(disclaimer, self.styles['BodyText']))
        
        logger.debug(f"✅ 封面页创建完成，元素数量: {len(story)}")
        return story
    
    def _create_executive_summary(self, data: Dict[str, Any]) -> List:
        """创建执行摘要"""
        logger.debug("📊 开始创建执行摘要...")
        story = []
        
        logger.debug("📝 添加执行摘要标题...")
        story.append(Paragraph(self._safe_text("Executive Summary"), self.styles['SectionTitle']))
        story.append(HRFlowable(width="100%", thickness=1, lineCap='round', color=colors.HexColor('#e5e7eb')))
        story.append(Spacer(1, 12))
        
        # 总体评估
        overall_score = data.get('overallScore', 0)
        try:
            overall_score = int(float(overall_score)) if overall_score else 0
        except (ValueError, TypeError):
            logger.warning(f"⚠️ overallScore转换失败: {overall_score}，使用默认值0")
            overall_score = 0
        pathway = data.get('gtvPathway', {})
        recommendation = data.get('recommendation', '')
        
        logger.debug(f"📈 添加总体评估，分数: {overall_score}, 等级: {self._get_score_level(overall_score)}")
        summary_text = f"""
        The applicant has achieved an overall assessment score of <b>{overall_score}/100</b>, 
        indicating a <b>{self._get_score_level(overall_score)}</b> level of qualification for the UK Global Talent Visa.
        """
        story.append(Paragraph(self._safe_text(summary_text), self.styles['BodyText']))
        story.append(Spacer(1, 12))
        
        # 推荐路径分析
        if pathway:
            route = pathway.get('recommendedRoute', 'N/A')
            eligibility = pathway.get('eligibilityLevel', 'N/A')
            analysis = pathway.get('analysis', '')
            
            logger.debug(f"🛤️ 添加推荐路径分析: {route}, 资格等级: {eligibility}")
            story.append(Paragraph(self._safe_text(f"<b>Recommended Pathway:</b> {route}"), self.styles['Emphasis']))
            story.append(Paragraph(self._safe_text(f"<b>Eligibility Level:</b> {eligibility}"), self.styles['Emphasis']))
            story.append(Spacer(1, 8))
            
            if analysis:
                logger.debug(f"📝 添加路径分析: {analysis[:50]}...")
                story.append(Paragraph(self._safe_text(analysis), self.styles['BodyText']))
                story.append(Spacer(1, 12))
        else:
            logger.debug("⚠️ 未找到推荐路径数据")
        
        # 最终建议
        if recommendation:
            logger.debug(f"💡 添加最终建议: {recommendation[:50]}...")
            story.append(Paragraph(self._safe_text("<b>Final Recommendation:</b>"), self.styles['Emphasis']))
            story.append(Paragraph(self._safe_text(recommendation), self.styles['BodyText']))
        else:
            logger.debug("⚠️ 未找到最终建议数据")
        
        logger.debug(f"✅ 执行摘要创建完成，元素数量: {len(story)}")
        return story
    
    def _create_applicant_info(self, data: Dict[str, Any]) -> List:
        """创建申请人信息部分"""
        logger.debug("👤 开始创建申请人信息...")
        story = []
        
        logger.debug("📝 添加申请人信息标题...")
        story.append(Paragraph(self._safe_text("Applicant Information"), self.styles['SectionTitle']))
        story.append(HRFlowable(width="100%", thickness=1, lineCap='round', color=colors.HexColor('#e5e7eb')))
        story.append(Spacer(1, 12))
        
        applicant_info = data.get('applicantInfo', {})
        logger.debug(f"📋 申请人信息数据: {list(applicant_info.keys())}")
        
        # 基本信息表格
        logger.debug("📊 创建基本信息表格...")
        info_data = [
            ['Name', self._safe_text(applicant_info.get('name', 'N/A'))],
            ['Field', self._safe_text(applicant_info.get('field', 'N/A'))],
            ['Current Position', self._safe_text(applicant_info.get('currentPosition', 'N/A'))],
            ['Company', self._safe_text(applicant_info.get('company', 'N/A'))],
            ['Years of Experience', self._safe_text(str(applicant_info.get('yearsOfExperience', 'N/A')))]
        ]
        
        logger.debug(f"📝 表格数据行数: {len(info_data)}")
        info_table = Table(info_data, colWidths=[4*cm, 10*cm])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f9fafb')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), self.chinese_font_bold),
            ('FONTNAME', (1, 0), (1, -1), self.chinese_font),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb'))
        ]))
        
        story.append(info_table)
        story.append(Spacer(1, 20))
        
        # 教育背景
        education = data.get('educationBackground', {})
        if education:
            logger.debug("🎓 添加教育背景...")
            story.append(Paragraph(self._safe_text("Education Background"), self.styles['SubSectionTitle']))
            education_analysis = education.get('analysis', '')
            logger.debug(f"📝 教育背景分析: {education_analysis[:50] if education_analysis else 'N/A'}...")
            story.append(Paragraph(self._safe_text(education_analysis), self.styles['BodyText']))
            story.append(Spacer(1, 12))
        else:
            logger.debug("⚠️ 未找到教育背景数据")
        
        # 行业背景
        industry = data.get('industryBackground', {})
        if industry:
            logger.debug("🏭 添加行业背景...")
            story.append(Paragraph(self._safe_text("Industry Background"), self.styles['SubSectionTitle']))
            industry_analysis = industry.get('analysis', '')
            logger.debug(f"📝 行业背景分析: {industry_analysis[:50] if industry_analysis else 'N/A'}...")
            story.append(Paragraph(self._safe_text(industry_analysis), self.styles['BodyText']))
            story.append(Spacer(1, 12))
        else:
            logger.debug("⚠️ 未找到行业背景数据")
        
        logger.debug(f"✅ 申请人信息创建完成，元素数量: {len(story)}")
        return story
    
    def _create_assessment_results(self, data: Dict[str, Any]) -> List:
        """创建评估结果部分"""
        logger.debug("📈 开始创建评估结果...")
        story = []
        
        logger.debug("📝 添加评估结果标题...")
        story.append(Paragraph(self._safe_text("Assessment Results"), self.styles['SectionTitle']))
        story.append(HRFlowable(width="100%", thickness=1, lineCap='round', color=colors.HexColor('#e5e7eb')))
        story.append(Spacer(1, 12))
        
        # 总体评分
        overall_score = data.get('overallScore', 0)
        try:
            overall_score = int(float(overall_score)) if overall_score else 0
        except (ValueError, TypeError):
            logger.warning(f"⚠️ overallScore转换失败: {overall_score}，使用默认值0")
            overall_score = 0
        score_color = self._get_score_color(overall_score)
        logger.debug(f"📊 添加总体评分: {overall_score}/100, 颜色: {score_color}")
        story.append(Paragraph(self._safe_text(f"Overall Assessment Score: {overall_score}/100"), 
                              ParagraphStyle('Score', parent=self.styles['Score'], textColor=score_color)))
        story.append(Spacer(1, 20))
        
        # 评估标准
        criteria = data.get('criteriaAssessment', [])
        if criteria:
            logger.debug(f"📋 添加评估标准，数量: {len(criteria)}")
            story.append(Paragraph(self._safe_text("Assessment Criteria"), self.styles['SubSectionTitle']))
            
            criteria_data = [[self._safe_text('Criteria'), self._safe_text('Score'), self._safe_text('Comments')]]
            for i, criterion in enumerate(criteria):
                name = criterion.get('name', 'N/A')
                score = criterion.get('score', 0)
                comments = criterion.get('comments', 'N/A')
                logger.debug(f"📝 标准 {i+1}: {name}, 分数: {score}/10")
                criteria_data.append([
                    self._safe_text(name),
                    self._safe_text(f"{score}/10"),
                    self._safe_text(comments)
                ])
            
            logger.debug(f"📊 创建评估标准表格，行数: {len(criteria_data)}")
            criteria_table = Table(criteria_data, colWidths=[5*cm, 2*cm, 7*cm])
            criteria_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#374151')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), self.chinese_font_bold),
                ('FONTNAME', (0, 1), (-1, -1), self.chinese_font),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb'))
            ]))
            
            story.append(criteria_table)
            story.append(Spacer(1, 20))
        else:
            logger.debug("⚠️ 未找到评估标准数据")
        
        logger.debug(f"✅ 评估结果创建完成，元素数量: {len(story)}")
        return story
    
    def _create_detailed_analysis(self, data: Dict[str, Any]) -> List:
        """创建详细分析部分"""
        logger.debug("🔍 开始创建详细分析...")
        story = []
        
        logger.debug("📝 添加详细分析标题...")
        story.append(Paragraph(self._safe_text("Detailed Analysis"), self.styles['SectionTitle']))
        story.append(HRFlowable(width="100%", thickness=1, lineCap='round', color=colors.HexColor('#e5e7eb')))
        story.append(Spacer(1, 12))
        
        # 技术专长
        technical = data.get('technicalExpertise', {})
        if technical:
            logger.debug("💻 添加技术专长...")
            story.append(Paragraph(self._safe_text("Technical Expertise"), self.styles['SubSectionTitle']))
            technical_analysis = technical.get('analysis', '')
            logger.debug(f"📝 技术专长分析: {technical_analysis[:50] if technical_analysis else 'N/A'}...")
            story.append(Paragraph(self._safe_text(technical_analysis), self.styles['BodyText']))
            story.append(Spacer(1, 8))
            
            # 核心技术技能
            core_skills = technical.get('coreSkills', [])
            if core_skills:
                logger.debug(f"🔧 添加核心技能，数量: {len(core_skills)}")
                story.append(Paragraph(self._safe_text("<b>Core Skills:</b>"), self.styles['Emphasis']))
                for skill in core_skills:
                    logger.debug(f"📝 技能: {skill[:30] if skill else 'N/A'}...")
                    story.append(Paragraph(self._safe_text(f"• {skill}"), self.styles['BodyText']))
                story.append(Spacer(1, 8))
            
            # 专业领域
            specializations = technical.get('specializations', [])
            if specializations:
                logger.debug(f"🎯 添加专业领域，数量: {len(specializations)}")
                story.append(Paragraph(self._safe_text("<b>Specializations:</b>"), self.styles['Emphasis']))
                for spec in specializations:
                    logger.debug(f"📝 专业领域: {spec[:30] if spec else 'N/A'}...")
                    story.append(Paragraph(self._safe_text(f"• {spec}"), self.styles['BodyText']))
                story.append(Spacer(1, 8))
            
            # 创新成果
            innovations = technical.get('innovations', [])
            if innovations:
                logger.debug(f"💡 添加创新成果，数量: {len(innovations)}")
                story.append(Paragraph(self._safe_text("<b>Innovations:</b>"), self.styles['Emphasis']))
                for innovation in innovations:
                    logger.debug(f"📝 创新成果: {innovation[:30] if innovation else 'N/A'}...")
                    story.append(Paragraph(self._safe_text(f"• {innovation}"), self.styles['BodyText']))
                story.append(Spacer(1, 8))
            
            # 行业认可
            industry_recognition = technical.get('industryRecognition', [])
            if industry_recognition:
                logger.debug(f"🏆 添加行业认可，数量: {len(industry_recognition)}")
                story.append(Paragraph(self._safe_text("<b>Industry Recognition:</b>"), self.styles['Emphasis']))
                for recognition in industry_recognition:
                    logger.debug(f"📝 行业认可: {recognition[:30] if recognition else 'N/A'}...")
                    story.append(Paragraph(self._safe_text(f"• {recognition}"), self.styles['BodyText']))
                story.append(Spacer(1, 8))
            
            story.append(Spacer(1, 12))
        else:
            logger.debug("⚠️ 未找到技术专长数据")
        
        # 工作经验
        work_exp = data.get('workExperience', {})
        if work_exp:
            logger.debug("💼 添加工作经验...")
            story.append(Paragraph(self._safe_text("Work Experience"), self.styles['SubSectionTitle']))
            work_analysis = work_exp.get('analysis', '')
            logger.debug(f"📝 工作经验分析: {work_analysis[:50] if work_analysis else 'N/A'}...")
            story.append(Paragraph(self._safe_text(work_analysis), self.styles['BodyText']))
            story.append(Spacer(1, 12))
        else:
            logger.debug("⚠️ 未找到工作经验数据")
        
        # 优势
        strengths = data.get('strengths', [])
        if strengths:
            logger.debug(f"💪 添加优势，数量: {len(strengths)}")
            story.append(Paragraph(self._safe_text("Key Strengths"), self.styles['SubSectionTitle']))
            for i, strength in enumerate(strengths):
                description = strength.get('description', '')
                logger.debug(f"📝 优势 {i+1}: {description[:30] if description else 'N/A'}...")
                story.append(Paragraph(self._safe_text(f"• {description}"), self.styles['BodyText']))
            story.append(Spacer(1, 12))
        else:
            logger.debug("⚠️ 未找到优势数据")
        
        # 需要改进的地方
        weaknesses = data.get('weaknesses', [])
        if weaknesses:
            logger.debug(f"🔧 添加需要改进的地方，数量: {len(weaknesses)}")
            story.append(Paragraph(self._safe_text("Areas for Improvement"), self.styles['SubSectionTitle']))
            for i, weakness in enumerate(weaknesses):
                description = weakness.get('description', '')
                logger.debug(f"📝 改进点 {i+1}: {description[:30] if description else 'N/A'}...")
                story.append(Paragraph(self._safe_text(f"• {description}"), self.styles['BodyText']))
            story.append(Spacer(1, 12))
        else:
            logger.debug("⚠️ 未找到需要改进的地方数据")
        
        logger.debug(f"✅ 详细分析创建完成，元素数量: {len(story)}")
        return story
    
    def _create_recommendations(self, data: Dict[str, Any]) -> List:
        """创建建议和行动计划部分"""
        logger.debug("💡 开始创建建议和行动计划...")
        story = []
        
        logger.debug("📝 添加建议和行动计划标题...")
        story.append(Paragraph(self._safe_text("Recommendations & Action Plan"), self.styles['SectionTitle']))
        story.append(HRFlowable(width="100%", thickness=1, lineCap='round', color=colors.HexColor('#e5e7eb')))
        story.append(Spacer(1, 12))
        
        # 专业建议
        advice = data.get('professionalAdvice', [])
        if advice:
            logger.debug(f"💼 添加专业建议，数量: {len(advice)}")
            story.append(Paragraph(self._safe_text("Professional Advice"), self.styles['SubSectionTitle']))
            for i, item in enumerate(advice, 1):
                logger.debug(f"📝 建议 {i}: {item[:50] if item else 'N/A'}...")
                story.append(Paragraph(self._safe_text(f"{i}. {item}"), self.styles['BodyText']))
            story.append(Spacer(1, 12))
        else:
            logger.debug("⚠️ 未找到专业建议数据")
        
        # 所需文件
        documents = data.get('requiredDocuments', [])
        if documents:
            logger.debug(f"📄 添加所需文件，数量: {len(documents)}")
            story.append(Paragraph(self._safe_text("Required Documents"), self.styles['SubSectionTitle']))
            for i, doc in enumerate(documents, 1):
                logger.debug(f"📝 文件 {i}: {doc[:50] if doc else 'N/A'}...")
                story.append(Paragraph(self._safe_text(f"{i}. {doc}"), self.styles['BodyText']))
            story.append(Spacer(1, 12))
        else:
            logger.debug("⚠️ 未找到所需文件数据")
        
        # 时间线和预算
        timeline = data.get('timeline', '')
        budget = data.get('estimatedBudget', {})
        
        if timeline or budget:
            logger.debug("⏰ 添加时间线和预算...")
            story.append(Paragraph(self._safe_text("Timeline & Budget"), self.styles['SubSectionTitle']))
            
            if timeline:
                logger.debug(f"📅 时间线: {timeline}")
                story.append(Paragraph(self._safe_text(f"<b>Estimated Timeline:</b> {timeline}"), self.styles['BodyText']))
            else:
                logger.debug("⚠️ 未找到时间线数据")
            
            if budget:
                min_budget = budget.get('min', 0)
                max_budget = budget.get('max', 0)
                currency = budget.get('currency', 'GBP')
                logger.debug(f"💰 预算: {min_budget} - {max_budget} {currency}")
                story.append(Paragraph(self._safe_text(f"<b>Estimated Budget:</b> {min_budget} - {max_budget} {currency}"), 
                                      self.styles['BodyText']))
            else:
                logger.debug("⚠️ 未找到预算数据")
            story.append(Spacer(1, 12))
        else:
            logger.debug("⚠️ 未找到时间线和预算数据")
        
        logger.debug(f"✅ 建议和行动计划创建完成，元素数量: {len(story)}")
        return story
    
    def _add_header_footer(self, canvas, doc):
        """添加页眉页脚"""
        logger.debug(f"📄 添加页眉页脚，页码: {doc.page}")
        canvas.saveState()
        
        # 页眉
        logger.debug("📝 绘制页眉...")
        canvas.setFont(self.chinese_font, 9)
        canvas.setFillColor(colors.HexColor('#6b7280'))
        header_text = self._safe_text("UK Global Talent Visa Assessment")
        canvas.drawRightString(A4[0] - 2*cm, A4[1] - 1.5*cm, header_text)
        logger.debug(f"✅ 页眉绘制完成: {header_text}")
        
        # 页脚
        logger.debug("📝 绘制页脚...")
        canvas.setFont(self.chinese_font, 8)
        canvas.setFillColor(colors.HexColor('#9ca3af'))
        page_text = self._safe_text(f"Page {doc.page}")
        date_text = self._safe_text(f"Generated on {datetime.now().strftime('%B %d, %Y')}")
        canvas.drawCentredString(A4[0]/2, 1*cm, page_text)
        canvas.drawString(2*cm, 1*cm, date_text)
        logger.debug(f"✅ 页脚绘制完成: {page_text}, {date_text}")
        
        canvas.restoreState()
    
    def _get_score_color(self, score) -> colors.Color:
        """根据分数获取颜色"""
        try:
            score = float(score) if isinstance(score, str) else score
            score = int(score)
        except (ValueError, TypeError):
            logger.warning(f"⚠️ 分数转换失败: {score}，使用默认分数0")
            score = 0
        
        if score >= 80:
            color = colors.HexColor('#059669')  # 绿色
            logger.debug(f"🎨 分数 {score} 使用绿色")
        elif score >= 70:
            color = colors.HexColor('#d97706')  # 橙色
            logger.debug(f"🎨 分数 {score} 使用橙色")
        else:
            color = colors.HexColor('#dc2626')  # 红色
            logger.debug(f"🎨 分数 {score} 使用红色")
        return color
    
    def _get_score_level(self, score) -> str:
        """根据分数获取等级"""
        try:
            score = float(score) if isinstance(score, str) else score
            score = int(score)
        except (ValueError, TypeError):
            logger.warning(f"⚠️ 分数转换失败: {score}，使用默认分数0")
            score = 0
        
        if score >= 80:
            level = "Strong"
        elif score >= 70:
            level = "Good"
        elif score >= 60:
            level = "Fair"
        else:
            level = "Needs Improvement"
        return level

def generate_gtv_pdf_report(assessment_data: Dict[str, Any], output_path: str = None) -> str:
    """生成GTV评估PDF报告的便捷函数"""
    logger.info("🚀 调用便捷函数生成PDF报告...")
    generator = GTVPDFReportGenerator()
    result = generator.generate_report(assessment_data, output_path)
    logger.info(f"✅ 便捷函数PDF生成完成: {result}")
    return result

if __name__ == "__main__":
    # 测试代码
    logger.info("🧪 开始PDF生成器测试...")
    test_data = {
        "applicantInfo": {
            "name": "John Doe",
            "field": "Digital Technology",
            "currentPosition": "Senior Software Engineer",
            "company": "Tech Corp",
            "yearsOfExperience": 8
        },
        "overallScore": 85,
        "gtvPathway": {
            "recommendedRoute": "Exceptional Talent",
            "eligibilityLevel": "Strong",
            "analysis": "The applicant demonstrates exceptional talent in digital technology."
        },
        "recommendation": "Strongly recommended for UK Global Talent Visa application."
    }
    
    logger.info(f"📊 测试数据: 申请人={test_data['applicantInfo']['name']}, 分数={test_data['overallScore']}")
    
    try:
        output_file = generate_gtv_pdf_report(test_data)
        logger.info(f"🎉 测试PDF生成成功: {output_file}")
        print(f"测试PDF生成成功: {output_file}")
    except Exception as e:
        logger.error(f"❌ 测试PDF生成失败: {e}")
        print(f"测试PDF生成失败: {e}")
