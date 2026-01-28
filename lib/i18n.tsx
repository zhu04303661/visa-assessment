"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type Language = "en" | "zh"

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations = {
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.assessment": "Assessment",
    "nav.about": "About",

    // Hero Section
    "hero.badge": "AI-Powered Visa Assessment",
    "hero.title": "UK Global Talent Visa",
    "hero.titleHighlight": "Eligibility Assessment",
    "hero.subtitle":
      "Get an instant AI-powered evaluation of your qualifications for the UK Global Talent Visa. Understand your chances and receive personalized recommendations.",
    "hero.cta.start": "Start Assessment",
    "hero.cta.learn": "Learn More",
    "hero.trust.ai": "AI-Powered Analysis",
    "hero.trust.instant": "Instant Results",
    "hero.trust.personalized": "Personalized Guidance",

    // Features Section
    "features.title": "Why Use Our Assessment Tool?",
    "features.subtitle":
      "Our AI-powered platform provides comprehensive evaluation based on official UK Home Office criteria",
    "features.ai.title": "AI-Powered Evaluation",
    "features.ai.desc":
      "Advanced AI analyzes your profile against official UK GTV criteria to provide accurate eligibility assessment.",
    "features.comprehensive.title": "Comprehensive Analysis",
    "features.comprehensive.desc":
      "Evaluate all aspects including achievements, recognition, impact, and documentation requirements.",
    "features.field.title": "Field-Specific Criteria",
    "features.field.desc": "Tailored assessment for Digital Technology, Arts & Culture, or Research & Academia fields.",
    "features.success.title": "Success Probability",
    "features.success.desc":
      "Get a clear percentage score indicating your likelihood of visa approval based on your profile.",
    "features.personalized.title": "Personalized Recommendations",
    "features.personalized.desc":
      "Receive specific suggestions on how to strengthen your application and improve your chances.",
    "features.secure.title": "Confidential & Secure",
    "features.secure.desc": "Your information is processed securely and never shared. Complete privacy guaranteed.",

    // Assessment CTA
    "cta.title": "Ready to Assess Your Eligibility?",
    "cta.subtitle": "Take our comprehensive assessment and get instant results with personalized recommendations",
    "cta.button": "Start Your Assessment",
    "cta.chatButton": "AI Chat Assessment",

    // Chat Assessment
    "chat.title": "AI Chat Assessment",
    "chat.subtitle": "Get professional GTV visa assessment advice through conversation",
    "chat.assistant": "Assessment Assistant",
    "chat.welcome": "Hello! I'm your UK GTV visa assessment assistant. I'll learn about your background through conversation and provide professional assessment advice. Please tell me your name and application field.",
    "chat.thinking": "Thinking...",
    "chat.inputPlaceholder": "Type your response...",
    "chat.assessmentInfo": "Assessment Info",
    "chat.name": "Name",
    "chat.field": "Application Field",
    "chat.currentScore": "Current Score",
    "chat.recommendedPathway": "Recommended Pathway",
    "chat.assessmentComplete": "Assessment Complete",
    "chat.assessmentCompleteDesc": "Congratulations! Your GTV visa assessment is complete.",
    "chat.viewFullReport": "View Full Report",
    "chat.actions": "Actions",
    "chat.resetAssessment": "Restart Assessment",
    "chat.error": "Sorry, an error occurred. Please try again later.",

    // Footer
    "footer.title": "UK GTV Assessment",
    "footer.description":
      "AI-powered eligibility assessment for UK Global Talent Visa applications. Get instant insights into your qualification status.",
    "footer.resources": "Resources",
    "footer.about": "About GTV",
    "footer.criteria": "Eligibility Criteria",
    "footer.faq": "FAQ",
    "footer.debug": "Debug Console",
    "footer.legal": "Legal",
    "footer.privacy": "Privacy Policy",
    "footer.terms": "Terms of Service",
    "footer.copyright":
      "UK GTV Assessment. This is an independent assessment tool and not affiliated with UK Home Office.",

    // Assessment Form
    "form.title": "Global Talent Visa Assessment",
    "form.subtitle": "Complete this comprehensive questionnaire to evaluate your eligibility",
    "form.q1.title": "1. Basic Information",
    "form.q1.name": "Full Name",
    "form.q1.name.placeholder": "e.g., John Smith",
    "form.q1.position": "Current Position",
    "form.q1.position.placeholder": "e.g., Vice President, Chief Technology Officer",
    "form.q1.company": "Current Organization",
    "form.q1.company.placeholder": "e.g., Tech Innovation Ltd.",
    "form.q1.location": "Current Location",
    "form.q1.location.placeholder": "e.g., London, UK",
    "form.q1.tech": "Digital Technology",
    "form.q1.arts": "Arts and Culture",
    "form.q1.research": "Research and Academia",

    "form.q2.title": "2. Professional Field & Positioning",
    "form.q2.desc": "Select your primary field and describe your unique expertise",
    "form.q2.field": "Primary Field",
    "form.q2.expertise": "Your Unique Expertise & Positioning",
    "form.q2.expertise.placeholder": "Describe your specialized area and what makes you exceptional in your field...",

    "form.q3.title": "3. Leadership in Renowned Organizations (Criterion 1)",
    "form.q3.desc": "Evidence of leadership or critical roles in well-known organizations",
    "form.q3.org": "Organization Name & Background",
    "form.q3.org.placeholder": "Describe the organization, its reputation, scale, and industry position...",
    "form.q3.role": "Your Role & Contributions",
    "form.q3.role.placeholder":
      "Describe your position, responsibilities, and key contributions to the organization...",
    "form.q3.impact": "Measurable Impact",
    "form.q3.impact.placeholder": "Quantify your impact: revenue growth, team size, projects delivered, etc...",

    "form.q4.title": "4. Outstanding Contributions to Your Field (Criterion 2)",
    "form.q4.desc": "Original contributions with significant impact on your industry",
    "form.q4.innovations": "Innovations & Methodologies",
    "form.q4.innovations.placeholder": "Describe unique methodologies, frameworks, or innovations you've developed...",
    "form.q4.adoption": "Industry Adoption & Recognition",
    "form.q4.adoption.placeholder":
      "How have your contributions been adopted? Number of organizations, users, citations...",
    "form.q4.business": "Business Model Innovations",
    "form.q4.business.placeholder": "Any unique business models or approaches you've pioneered...",

    "form.q5.title": "5. Media Coverage & Publications (Criterion 3)",
    "form.q5.desc": "Coverage in major media outlets or professional publications",
    "form.q5.print": "Print Media Coverage",
    "form.q5.print.placeholder": "List print media coverage (newspapers, magazines, journals)...",
    "form.q5.online": "Online Media & Interviews",
    "form.q5.online.placeholder": "List online media, interviews, podcasts, video features...",
    "form.q5.speaking": "Conference Speaking & Panels",
    "form.q5.speaking.placeholder": "Major conferences where you've spoken or participated in panels...",

    "form.q6.title": "6. Judging & Peer Review (Criterion 4)",
    "form.q6.desc": "Experience evaluating others' work as judge or reviewer",
    "form.q6.competitions": "Competition Judging",
    "form.q6.competitions.placeholder": "Competitions, awards, or contests where you served as judge...",
    "form.q6.technical": "Technical & Project Reviews",
    "form.q6.technical.placeholder": "Technical reviews, project evaluations, grant reviews...",
    "form.q6.peer": "Peer Review Activities",
    "form.q6.peer.placeholder": "Journal peer reviews, conference program committees, etc...",

    "form.q7.title": "7. Publications & Scholarly Work (Criterion 5)",
    "form.q7.desc": "Academic papers, books, or professional articles",
    "form.q7.papers": "Academic Papers & Citations",
    "form.q7.papers.placeholder": "Number of papers, citation count, h-index, notable publications...",
    "form.q7.books": "Books & Chapters",
    "form.q7.books.placeholder": "Books authored, book chapters, technical documentation...",
    "form.q7.industry": "Industry Publications",
    "form.q7.industry.placeholder": "White papers, technical blogs, industry reports...",

    "form.q8.title": "8. Awards & Recognition (Criterion 6)",
    "form.q8.desc": "National or international awards and recognition",
    "form.q8.awards": "Major Awards",
    "form.q8.awards.placeholder": "List significant awards, prizes, honors received...",
    "form.q8.nominations": "Nominations & Shortlists",
    "form.q8.nominations.placeholder": "Notable nominations or shortlists for prestigious awards...",
    "form.q8.fellowships": "Fellowships & Honorary Titles",
    "form.q8.fellowships.placeholder": "Fellowships, honorary degrees, distinguished titles...",

    "form.q9.title": "9. Professional Association Memberships (Criterion 7)",
    "form.q9.desc": "Membership in prestigious professional associations",
    "form.q9.associations": "Association Memberships",
    "form.q9.associations.placeholder": "List professional associations, membership levels, requirements...",
    "form.q9.leadership": "Leadership Roles in Associations",
    "form.q9.leadership.placeholder": "Board positions, committee chairs, special roles in associations...",

    "form.q10.title": "10. High Remuneration (Criterion 8)",
    "form.q10.desc": "Evidence of high salary or compensation relative to your field",
    "form.q10.salary": "Annual Compensation Range",
    "form.q10.salary.placeholder": "Select your compensation range",
    "form.q10.salary.range1": "Below £50,000",
    "form.q10.salary.range2": "£50,000 - £100,000",
    "form.q10.salary.range3": "£100,000 - £150,000",
    "form.q10.salary.range4": "£150,000 - £200,000",
    "form.q10.salary.range5": "Above £200,000",
    "form.q10.equity": "Equity & Additional Compensation",
    "form.q10.equity.placeholder": "Stock options, equity, bonuses, other compensation...",

    "form.submit": "Get Professional Assessment",
    "form.submitting": "Analyzing Your Profile...",
    "form.progress": "Assessment Progress",

    // Results Page
    "results.back": "Back to Assessment",
    "results.title": "Your Assessment Results",
    "results.subtitle": "Based on your responses, here's your UK Global Talent Visa eligibility analysis",
    "results.score.title": "Overall Eligibility Score",
    "results.score.desc": "Your likelihood of meeting GTV requirements",
    "results.score.high": "High Probability",
    "results.score.moderate": "Moderate Probability",
    "results.score.low": "Low Probability",
    "results.score.high.desc": "Strong candidate",
    "results.score.moderate.desc": "Potential candidate",
    "results.score.low.desc": "Needs improvement",
    "results.details.title": "Assessment Details",
    "results.details.field": "Field",
    "results.details.experience": "Years of Experience",
    "results.details.years": "years",
    "results.strengths.title": "Your Strengths",
    "results.strengths.desc": "Areas where your profile is strong",
    "results.improvements.title": "Areas for Improvement",
    "results.improvements.desc": "Suggestions to strengthen your application",
    "results.recommendations.title": "Personalized Recommendations",
    "results.recommendations.desc": "Next steps to improve your eligibility",
    "results.rec1.title": "Seek Endorsement",
    "results.rec1.desc":
      "Contact relevant endorsing bodies in your field (Tech Nation for digital technology, Arts Council for arts, Royal Society for research) to understand their specific requirements.",
    "results.rec2.title": "Document Everything",
    "results.rec2.desc":
      "Gather evidence letters, media coverage, awards certificates, and impact metrics. Strong documentation is crucial for a successful application.",
    "results.rec3.title": "Build Your Network",
    "results.rec3.desc":
      "Increase your visibility through speaking engagements, advisory roles, and collaborations with recognized experts in your field.",
    "results.action.retake": "Take Assessment Again",
    "results.action.download": "Download Report",
    "results.disclaimer": "Disclaimer:",
    "results.disclaimer.text":
      "This assessment is for informational purposes only and does not guarantee visa approval. The UK Global Talent Visa application process involves official endorsement from recognized bodies and final approval from UK Home Office. We recommend consulting with immigration professionals for personalized advice.",

    "results.criteria.title": "Criteria Assessment",
    "results.criteria.desc": "Evaluation against UK GTV 10 criteria (need to meet at least 3)",
    "results.criteria.met": "Criteria Met",
    "results.criteria.partial": "Partially Met",
    "results.criteria.notmet": "Not Met",

    "results.criterion1": "Leadership in Renowned Organizations",
    "results.criterion2": "Outstanding Contributions to Field",
    "results.criterion3": "Media Coverage & Publications",
    "results.criterion4": "Judging & Peer Review",
    "results.criterion5": "Scholarly Publications",
    "results.criterion6": "Awards & Recognition",
    "results.criterion7": "Professional Association Memberships",
    "results.criterion8": "High Remuneration",

    "results.materials.title": "Required Documentation",
    "results.materials.desc": "Materials you need to prepare for your application",
    "results.materials.company": "Company Evidence Letters",
    "results.materials.company.desc": "Letter from organization detailing your role, contributions, and impact",
    "results.materials.media": "Media Coverage Portfolio",
    "results.materials.media.desc": "2-3 print media interviews/features (budget: £20,000-25,000 per article)",
    "results.materials.reviews": "Peer Review Evidence",
    "results.materials.reviews.desc": "3-5 review invitations, review comments, and thank you letters",
    "results.materials.awards": "Award Certificates",
    "results.materials.awards.desc": "Certificates, nomination letters, and award documentation",
    "results.materials.references": "Reference Letters",
    "results.materials.references.desc": "Letters from recognized experts in your field",

    "results.strategy.title": "Application Strategy",
    "results.strategy.desc": "Recommended approach for your application",
    "results.strategy.strong": "Strong Foundation",
    "results.strategy.develop": "Areas to Develop",
    "results.strategy.optional": "Optional Enhancements",
    "results.strategy.ignore": "Not Required",

    "results.timeline.title": "Recommended Timeline",
    "results.timeline.desc": "Suggested timeline to strengthen your application",
    "results.timeline.immediate": "Immediate (0-3 months)",
    "results.timeline.short": "Short-term (3-6 months)",
    "results.timeline.medium": "Medium-term (6-12 months)",

    "results.budget.title": "服务方案推荐",
    "results.budget.desc": "根据您的申请成熟度与时间精力，推荐以下移民服务模式。",
    "results.budget.solution.coaching.title": "陪跑方案",
    "results.budget.solution.coaching.subtitle": "适合已有核心素材、希望专家全程把关并梳理申请逻辑的申请人。",
    "results.budget.solution.coaching.items": "制订一对一里程碑计划;每周进度跟进与问题诊断;材料清单与版本反馈;模拟背书审查点评",
    "results.budget.solution.coaching.fit": "适合自驱力强、需要专业陪跑与风险把控的申请人。",
    "results.budget.solution.full.title": "全案委托方案",
    "results.budget.solution.full.subtitle": "由顾问团队深度挖掘背景、统筹证据与叙事，输出交付整案申请。",
    "results.budget.solution.full.items": "背景访谈与策略共创;核心证据梳理与故事包装;推荐信与证明材料撰写辅导;提交节奏与关键节点管理",
    "results.budget.solution.full.fit": "适合时间紧张、追求成功率、希望全流程由专家操盘的申请人。",
    "results.budget.next": "不确定哪种方案更合适？欢迎预约策略沟通，由顾问为您定制组合方案。",
    "results.budget.cta": "联系顾问团队",

    "results.summary.title": "Executive Summary",
    "results.summary.qualified": "You have a strong foundation for UK GTV application",
    "results.summary.developing": "You have potential but need to strengthen certain areas",
    "results.summary.early": "You should develop your profile further before applying",

    "form.upload.basic.desc": "Provide your basic contact information",
    "form.upload.email": "Email Address",
    "form.upload.email.placeholder": "your.email@example.com",
    "form.upload.phone": "Phone Number",
    "form.upload.phone.placeholder": "+44 20 1234 5678",
    "form.upload.resume.title": "Paste Your Resume/CV",
    "form.upload.resume.paste": "Paste your resume text below for AI-powered analysis",
    "form.upload.resume.paste.hint": "Copy and paste your resume content as plain text",
    "form.upload.resume.paste.placeholder":
      "Paste your complete resume here including:\n- Education background\n- Work experience\n- Key achievements\n- Skills and expertise\n- Publications and awards\n- Any other relevant information...",
    "form.upload.resume.characters": "characters",
    "form.upload.resume.error": "Please provide a valid resume with at least 50 characters",
    "form.upload.additional.title": "Additional Information (Optional)",
    "form.upload.additional.desc": "Provide any additional context that may not be in your resume",
    "form.upload.additional.placeholder":
      "Any additional achievements, projects, or information you'd like us to consider...",
    "form.upload.additional.notice.title": "📋 Complete Your Profile Information",
    "form.upload.additional.notice.desc": "We noticed your resume information may be incomplete. To provide you with the most accurate assessment, please supplement with additional information not included in your resume, such as:",
    "form.upload.additional.notice.items": "• Specific achievements or metrics not mentioned\n• Additional projects or experiences\n• Industry recognition or awards\n• Media coverage or speaking engagements\n• Professional certifications\n• Any other relevant career milestones",
    "form.upload.additional.notice.consultation": "💬 Schedule a One-on-One Consultation",
    "form.upload.additional.notice.consultation.desc": "For a more personalized assessment and expert guidance, we invite you to schedule a one-on-one consultation with our visa assessment specialists. They can discuss your profile in detail, identify strengths you may have overlooked, and provide tailored recommendations.",
    "form.upload.additional.notice.consultation.button": "Book Consultation",
    "form.upload.submit": "Analyze My Profile",
    "form.upload.analyzing": "AI is analyzing your resume...",
    "form.upload.file": "Upload File",
    "form.upload.paste": "Paste Text",
    "form.upload.click": "Click to upload",
    "form.upload.or.drag": "or drag and drop",
    "form.upload.formats": "TXT, PDF, DOC, DOCX (max 10MB)",
    "form.upload.remove": "Remove",

    // Error Dialog
    "error.title": "Error",
    "error.failed": "Operation Failed",
    "error.invalidResume": "Invalid Resume",
    "error.networkError": "Network Connection Failed",
    "error.tryAgain": "Please try again later or check your network connection",
    "error.serviceUnavailable": "Service temporarily unavailable",
    "error.copy": "Copy Error",
    "error.copied": "Copied",
    "error.close": "OK",

    // Debug Page
    "debug.title": "Debug Console",
    "debug.subtitle": "View AI prompts and responses from assessment analyses for optimization",
  },
  zh: {
    // Navigation
    "nav.home": "首页",
    "nav.assessment": "评估",
    "nav.about": "关于",

    // Hero Section
    "hero.badge": "AI驱动的签证评估",
    "hero.title": "英国全球人才签证",
    "hero.titleHighlight": "资格评估",
    "hero.subtitle": "获取AI驱动的即时评估，了解您申请英国全球人才签证的资格。了解您的成功概率并获得个性化建议。",
    "hero.cta.start": "开始评估",
    "hero.cta.learn": "了解更多",
    "hero.trust.ai": "AI智能分析",
    "hero.trust.instant": "即时结果",
    "hero.trust.personalized": "个性化指导",

    // Features Section
    "features.title": "为什么使用我们的评估工具？",
    "features.subtitle": "我们的AI平台基于英国内政部官方标准提供全面评估",
    "features.ai.title": "AI智能评估",
    "features.ai.desc": "先进的AI技术根据英国GTV官方标准分析您的资料，提供准确的资格评估。",
    "features.comprehensive.title": "全面分析",
    "features.comprehensive.desc": "评估所有方面，包括成就、认可度、影响力和文档要求。",
    "features.field.title": "领域专属标准",
    "features.field.desc": "针对数字技术、艺术文化或研究学术领域的定制化评估。",
    "features.success.title": "成功概率",
    "features.success.desc": "获得清晰的百分比评分，显示您基于个人资料的签证批准可能性。",
    "features.personalized.title": "个性化建议",
    "features.personalized.desc": "获得具体建议，了解如何加强申请并提高成功率。",
    "features.secure.title": "保密安全",
    "features.secure.desc": "您的信息安全处理，绝不共享。完全保护隐私。",

    // Assessment CTA
    "cta.title": "准备好评估您的资格了吗？",
    "cta.subtitle": "进行全面评估，获得即时结果和个性化建议",
    "cta.button": "开始评估",
    "cta.chatButton": "AI 聊天评估",

    // Chat Assessment
    "chat.title": "AI 聊天评估",
    "chat.subtitle": "通过对话获得专业的GTV签证评估建议",
    "chat.assistant": "评估助手",
    "chat.welcome": "您好！我是英国GTV签证评估助手。我将通过对话来了解您的背景，并为您提供专业的评估建议。请告诉我您的姓名和申请领域。",
    "chat.thinking": "正在思考...",
    "chat.inputPlaceholder": "输入您的回复...",
    "chat.assessmentInfo": "评估信息",
    "chat.name": "姓名",
    "chat.field": "申请领域",
    "chat.currentScore": "当前评分",
    "chat.recommendedPathway": "推荐路径",
    "chat.assessmentComplete": "评估完成",
    "chat.assessmentCompleteDesc": "恭喜！您的GTV签证评估已完成。",
    "chat.viewFullReport": "查看完整报告",
    "chat.actions": "操作",
    "chat.resetAssessment": "重新开始评估",
    "chat.error": "抱歉，发生了错误。请稍后重试。",

    // Footer
    "footer.title": "英国GTV评估",
    "footer.description": "英国全球人才签证申请的AI智能资格评估。即时获取您的资格状态洞察。",
    "footer.resources": "资源",
    "footer.about": "关于GTV",
    "footer.criteria": "资格标准",
    "footer.faq": "常见问题",
    "footer.debug": "调试控制台",
    "footer.legal": "法律",
    "footer.privacy": "隐私政策",
    "footer.terms": "服务条款",
    "footer.copyright": "英国GTV评估。这是一个独立的评估工具，与英国内政部无关联。",

    // Assessment Form
    "form.title": "全球人才签证评估",
    "form.subtitle": "完成这份综合问卷以评估您的资格",
    "form.q1.title": "1. 基本信息",
    "form.q1.name": "姓名",
    "form.q1.name.placeholder": "例如：张总",
    "form.q1.position": "当前职位",
    "form.q1.position.placeholder": "例如：副总裁、首席技术官",
    "form.q1.company": "当前单位",
    "form.q1.company.placeholder": "例如：长城汽车股份有限公司",
    "form.q1.location": "现居地",
    "form.q1.location.placeholder": "例如：河北保定",
    "form.q1.tech": "数字技术",
    "form.q1.arts": "艺术文化",
    "form.q1.research": "研究学术",

    "form.q2.title": "2. 专业领域定位",
    "form.q2.desc": "选择您的主要领域并描述您的独特专长",
    "form.q2.field": "主要领域",
    "form.q2.expertise": "您的独特专长与定位",
    "form.q2.expertise.placeholder": "描述您的专业领域和在该领域的杰出能力...",

    "form.q3.title": "3. 知名组织领导力（标准1）",
    "form.q3.desc": "在知名组织担任领导或关键角色的证据",
    "form.q3.org": "组织名称与背景",
    "form.q3.org.placeholder": "描述组织的声誉、规模、行业地位等...",
    "form.q3.role": "您的角色与贡献",
    "form.q3.role.placeholder": "描述您的职位、职责以及对组织的关键贡献...",
    "form.q3.impact": "可衡量的影响",
    "form.q3.impact.placeholder": "量化您的影响：收入增长、团队规模、交付项目等...",

    "form.q4.title": "4. 对领域的突出贡献（标准2）",
    "form.q4.desc": "对行业有重大影响的原创贡献",
    "form.q4.innovations": "创新与方法论",
    "form.q4.innovations.placeholder": "描述您开发的独特方法论、框架或创新...",
    "form.q4.adoption": "行业采用与认可",
    "form.q4.adoption.placeholder": "您的贡献如何被采用？组织数量、用户数、引用次数...",
    "form.q4.business": "商业模式创新",
    "form.q4.business.placeholder": "您开创的任何独特商业模式或方法...",

    "form.q5.title": "5. 媒体报道与出版物（标准3）",
    "form.q5.desc": "在主要媒体或专业出版物中的报道",
    "form.q5.print": "纸媒报道",
    "form.q5.print.placeholder": "列出纸媒报道（报纸、杂志、期刊）...",
    "form.q5.online": "网络媒体与采访",
    "form.q5.online.placeholder": "列出网络媒体、采访、播客、视频专题...",
    "form.q5.speaking": "会议演讲与论坛",
    "form.q5.speaking.placeholder": "您演讲或参与的主要会议...",

    "form.q6.title": "6. 评审与同行评议（标准4）",
    "form.q6.desc": "作为评委或审稿人评估他人工作的经验",
    "form.q6.competitions": "竞赛评审",
    "form.q6.competitions.placeholder": "您担任评委的竞赛、奖项或比赛...",
    "form.q6.technical": "技术与项目评审",
    "form.q6.technical.placeholder": "技术评审、项目评估、资助评审...",
    "form.q6.peer": "同行评议活动",
    "form.q6.peer.placeholder": "期刊同行评审、会议程序委员会等...",

    "form.q7.title": "7. 出版物与学术工作（标准5）",
    "form.q7.desc": "学术论文、书籍或专业文章",
    "form.q7.papers": "学术论文与引用",
    "form.q7.papers.placeholder": "论文数量、引用次数、h指数、重要出版物...",
    "form.q7.books": "书籍与章节",
    "form.q7.books.placeholder": "著作、书籍章节、技术文档...",
    "form.q7.industry": "行业出版物",
    "form.q7.industry.placeholder": "白皮书、技术博客、行业报告...",

    "form.q8.title": "8. 奖项与认可（标准6）",
    "form.q8.desc": "国家或国际奖项和认可",
    "form.q8.awards": "主要奖项",
    "form.q8.awards.placeholder": "列出获得的重要奖项、奖励、荣誉...",
    "form.q8.nominations": "提名与入围",
    "form.q8.nominations.placeholder": "著名奖项的重要提名或入围...",
    "form.q8.fellowships": "院士与荣誉头衔",
    "form.q8.fellowships.placeholder": "院士资格、荣誉学位、杰出头衔...",

    "form.q9.title": "9. 专业协会会员资格（标准7）",
    "form.q9.desc": "在著名专业协会的会员资格",
    "form.q9.associations": "协会会员资格",
    "form.q9.associations.placeholder": "列出专业协会、会员级别、要求...",
    "form.q9.leadership": "协会领导角色",
    "form.q9.leadership.placeholder": "协会中的董事会职位、委员会主席、特殊角色...",

    "form.q10.title": "10. 高薪酬（标准8）",
    "form.q10.desc": "相对于您领域的高薪或报酬证据",
    "form.q10.salary": "年度薪酬范围",
    "form.q10.salary.placeholder": "选择您的薪酬范围",
    "form.q10.salary.range1": "低于50万元",
    "form.q10.salary.range2": "50万 - 100万元",
    "form.q10.salary.range3": "100万 - 150万元",
    "form.q10.salary.range4": "150万 - 200万元",
    "form.q10.salary.range5": "200万元以上",
    "form.q10.equity": "股权与额外报酬",
    "form.q10.equity.placeholder": "股票期权、股权、奖金、其他报酬...",

    "form.submit": "获取专业评估",
    "form.submitting": "正在分析您的资料...",
    "form.progress": "评估进度",

    // Results Page
    "results.back": "返回评估",
    "results.title": "您的评估结果",
    "results.subtitle": "根据您的回答，这是您的英国全球人才签证资格分析",
    "results.score.title": "总体资格评分",
    "results.score.desc": "您满足GTV要求的可能性",
    "results.score.high": "高概率",
    "results.score.moderate": "中等概率",
    "results.score.low": "低概率",
    "results.score.high.desc": "强有力的候选人",
    "results.score.moderate.desc": "潜在候选人",
    "results.score.low.desc": "需要改进",
    "results.details.title": "评估详情",
    "results.details.field": "领域",
    "results.details.experience": "工作年限",
    "results.details.years": "年",
    "results.strengths.title": "您的优势",
    "results.strengths.desc": "您的资料中表现强劲的领域",
    "results.improvements.title": "改进领域",
    "results.improvements.desc": "加强申请的建议",
    "results.recommendations.title": "个性化建议",
    "results.recommendations.desc": "提高资格的下一步行动",
    "results.rec1.title": "寻求背书",
    "results.rec1.desc":
      "联系您领域的相关背书机构（数字技术领域的Tech Nation，艺术领域的Arts Council，研究领域的Royal Society）了解其具体要求。",
    "results.rec2.title": "记录一切",
    "results.rec2.desc": "收集证明信、媒体报道、奖项证书和影响力指标。强有力的文档对于成功申请至关重要。",
    "results.rec3.title": "建立人脉网络",
    "results.rec3.desc": "通过演讲、顾问角色以及与该领域公认专家的合作来提高您的知名度。",
    "results.action.retake": "重新评估",
    "results.action.download": "下载报告",
    "results.disclaimer": "免责声明：",
    "results.disclaimer.text":
      "此评估仅供参考，不保证签证批准。英国全球人才签证申请流程涉及认可机构的官方背书和英国内政部的最终批准。我们建议咨询移民专业人士以获得个性化建议。",

    "results.criteria.title": "标准评估",
    "results.criteria.desc": "对照英国GTV 10项标准评估（需满足至少3项）",
    "results.criteria.met": "已满足",
    "results.criteria.partial": "部分满足",
    "results.criteria.notmet": "未满足",

    "results.criterion1": "知名组织领导力",
    "results.criterion2": "对领域的突出贡献",
    "results.criterion3": "媒体报道与出版物",
    "results.criterion4": "评审与同行评议",
    "results.criterion5": "学术出版物",
    "results.criterion6": "奖项与认可",
    "results.criterion7": "专业协会会员资格",
    "results.criterion8": "高薪酬",

    "results.materials.title": "所需文档材料",
    "results.materials.desc": "您需要为申请准备的材料",
    "results.materials.company": "公司证明信",
    "results.materials.company.desc": "组织出具的详细说明您的角色、贡献和影响的信函",
    "results.materials.media": "媒体报道作品集",
    "results.materials.media.desc": "2-3篇纸媒采访/专题报道（预算：每篇2-2.5万元）",
    "results.materials.reviews": "同行评审证据",
    "results.materials.reviews.desc": "3-5个评审邀请函、评审意见和感谢信",
    "results.materials.awards": "奖项证书",
    "results.materials.awards.desc": "证书、提名信和奖项文档",
    "results.materials.references": "推荐信",
    "results.materials.references.desc": "来自您领域公认专家的推荐信",

    "results.strategy.title": "申请策略",
    "results.strategy.desc": "为您的申请推荐的方法",
    "results.strategy.strong": "强项基础",
    "results.strategy.develop": "需要发展的领域",
    "results.strategy.optional": "可选增强项",
    "results.strategy.ignore": "无需考虑",

    "results.timeline.title": "建议时间表",
    "results.timeline.desc": "加强申请的建议时间表",
    "results.timeline.immediate": "立即行动（0-3个月）",
    "results.timeline.short": "短期（3-6个月）",
    "results.timeline.medium": "中期（6-12个月）",

    "results.budget.title": "服务方案推荐",
    "results.budget.desc": "根据您的申请成熟度与时间精力，推荐以下移民服务模式。",
    "results.budget.solution.coaching.title": "陪跑方案",
    "results.budget.solution.coaching.subtitle": "适合已有核心素材、希望专家全程把关并梳理申请逻辑的申请人。",
    "results.budget.solution.coaching.items": "制订一对一里程碑计划;每周进度跟进与问题诊断;材料清单与版本反馈;模拟背书审查点评",
    "results.budget.solution.coaching.fit": "适合自驱力强、需要专业陪跑与风险把控的申请人。",
    "results.budget.solution.full.title": "全案委托方案",
    "results.budget.solution.full.subtitle": "由顾问团队深度挖掘背景、统筹证据与叙事，输出交付整案申请。",
    "results.budget.solution.full.items": "背景访谈与策略共创;核心证据梳理与故事包装;推荐信与证明材料撰写辅导;提交节奏与关键节点管理",
    "results.budget.solution.full.fit": "适合时间紧张、追求成功率、希望全流程由专家操盘的申请人。",
    "results.budget.next": "不确定哪种方案更合适？欢迎预约策略沟通，由顾问为您定制组合方案。",
    "results.budget.cta": "联系顾问团队",

    "results.summary.title": "评估总结",
    "results.summary.qualified": "您具备申请英国GTV的强大基础",
    "results.summary.developing": "您有潜力，但需要加强某些领域",
    "results.summary.early": "建议您进一步发展个人资料后再申请",

    "form.upload.basic.desc": "提供您的基本联系信息",
    "form.upload.email": "电子邮箱",
    "form.upload.email.placeholder": "your.email@example.com",
    "form.upload.phone": "联系电话",
    "form.upload.phone.placeholder": "+86 138 0000 0000",
    "form.upload.resume.title": "粘贴您的简历",
    "form.upload.resume.paste": "在下方粘贴您的简历文本进行AI智能分析",
    "form.upload.resume.paste.hint": "复制并粘贴您的简历内容为纯文本",
    "form.upload.resume.paste.placeholder":
      "在此粘贴您的完整简历，包括：\n- 教育背景\n- 工作经历\n- 关键成就\n- 技能专长\n- 出版物和奖项\n- 其他相关信息...",
    "form.upload.resume.characters": "字符",
    "form.upload.resume.error": "请提供至少50个字符的有效简历",
    "form.upload.additional.title": "补充信息（可选）",
    "form.upload.additional.desc": "提供简历中可能未包含的任何额外信息",
    "form.upload.additional.placeholder": "您希望我们考虑的任何额外成就、项目或信息...",
    "form.upload.additional.notice.title": "📋 完善您的个人资料信息",
    "form.upload.additional.notice.desc": "我们注意到您的简历信息可能不完整。为了提供最准确的评估，请补充简历中未包含的额外信息，例如：",
    "form.upload.additional.notice.items": "• 未提及的具体成就或指标\n• 额外的项目或经验\n• 行业认可或奖项\n• 媒体报道或演讲经历\n• 专业认证\n• 任何其他相关的职业里程碑",
    "form.upload.additional.notice.consultation": "💬 预约一对一咨询",
    "form.upload.additional.notice.consultation.desc": "为了获得更个性化的评估和专家指导，我们邀请您预约与我们的签证评估专家进行一对一咨询。他们可以详细讨论您的个人资料，识别您可能忽略的强项，并提供量身定制的建议。",
    "form.upload.additional.notice.consultation.button": "预约咨询",
    "form.upload.submit": "分析我的资料",
    "form.upload.analyzing": "AI正在分析您的简历...",
    "form.upload.file": "上传文件",
    "form.upload.paste": "粘贴文本",
    "form.upload.click": "点击上传",
    "form.upload.or.drag": "或拖拽文件到此处",
    "form.upload.formats": "支持 TXT, PDF, DOC, DOCX（最大10MB）",
    "form.upload.remove": "移除",

    // Error Dialog
    "error.title": "错误",
    "error.failed": "操作失败",
    "error.invalidResume": "无效简历",
    "error.networkError": "网络连接失败",
    "error.tryAgain": "请稍后再试或检查您的网络连接",
    "error.serviceUnavailable": "服务暂时不可用",
    "error.copy": "复制失败",
    "error.copied": "已复制",
    "error.close": "确定",

    // Debug Page
    "debug.title": "调试控制台",
    "debug.subtitle": "查看评估分析的AI提示词和响应内容，用于优化评估能力",
  },
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("zh")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("language") as Language
    if (saved && (saved === "en" || saved === "zh")) {
      setLanguageState(saved)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("language", lang)
  }

  // 在客户端挂载完成前，使用默认语言来避免 hydration 不匹配
  const currentLanguage = mounted ? language : "zh"

  const t = (key: string): string => {
    return translations[currentLanguage][key as keyof typeof translations.en] || key
  }

  return <LanguageContext.Provider value={{ language: currentLanguage, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return context
}
