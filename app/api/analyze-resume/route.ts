import { generateText } from "ai"
import { getAIModel, getAIOptions, validateAIConfig } from "@/lib/ai-config"

// Next.js Route Segment Config - 设置更长的超时时间（5分钟）
export const maxDuration = 300 // 5分钟
export const dynamic = 'force-dynamic'

const PYTHON_API_BASE_URL =
  process.env.RESUME_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5005"

// 创建带超时的fetch包装函数
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 120000 // 默认2分钟超时
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`请求超时 (${timeoutMs}ms): ${url}`)
    }
    throw error
  }
}

export async function POST(request: Request) {
  const serverRequestId = Date.now().toString()
  const startTime = Date.now()
  
  console.log(`[上传全链路][${serverRequestId}] ========== 后端API开始处理请求 ==========`)
  console.log(`[上传全链路][${serverRequestId}] 时间戳: ${new Date().toISOString()}`)
  console.log(`[${serverRequestId}] 开始处理简历分析请求`)
  
  try {
    // 检查请求类型
    const contentType = request.headers.get('content-type') || ''
    console.log(`[上传全链路][${serverRequestId}] 📥 请求头信息:`, {
      contentType: contentType,
      userAgent: request.headers.get('user-agent') || 'N/A',
      referer: request.headers.get('referer') || 'N/A',
      origin: request.headers.get('origin') || 'N/A'
    })
    console.log(`[${serverRequestId}] 请求内容类型: ${contentType}`)
    
    if (contentType.includes('multipart/form-data')) {
      // 处理文件上传 - 调用Python服务
      console.log(`[上传全链路][${serverRequestId}] ========== 处理文件上传请求 ==========`)
      console.log(`[${serverRequestId}] 处理文件上传请求`)
      
      const formDataParseStart = Date.now()
      const formData = await request.formData()
      const formDataParseTime = Date.now() - formDataParseStart
      console.log(`[上传全链路][${serverRequestId}] ✅ FormData解析完成，耗时: ${formDataParseTime}ms`)
      
      const resumeFile = formData.get('resume') as File
      const name = formData.get('name') as string || "N/A"
      const email = formData.get('email') as string || "N/A"
      const field = formData.get('field') as string || "digital-technology"
      const additionalInfo = formData.get('additionalInfo') as string || ""
      const clientRequestId = formData.get('requestId') as string || serverRequestId // 使用客户端请求ID或生成新的

      console.log(`[上传全链路][${clientRequestId}] 📋 请求参数提取完成`)
      console.log(`[上传全链路][${clientRequestId}] 客户端请求ID: ${clientRequestId}`)
      console.log(`[上传全链路][${clientRequestId}] 服务端请求ID: ${serverRequestId}`)
      console.log(`[上传全链路][${clientRequestId}] 文件信息:`, {
        fileName: resumeFile?.name,
        fileSize: resumeFile?.size,
        fileType: resumeFile?.type,
        name,
        email,
        field,
        additionalInfoLength: additionalInfo.length
      })
      console.log(`[${serverRequestId}] 文件信息:`, {
        fileName: resumeFile?.name,
        fileSize: resumeFile?.size,
        fileType: resumeFile?.type,
        name,
        email,
        field,
        additionalInfoLength: additionalInfo.length
      })

      // 基础内容健康检查（防乱码/二进制误传）
      if (resumeFile && typeof resumeFile.arrayBuffer === 'function') {
        try {
          console.log(`[上传全链路][${clientRequestId}] 🔍 开始文件内容健康检查`)
          const healthCheckStart = Date.now()
          const buf = await resumeFile.arrayBuffer()
          const bytes = new Uint8Array(buf).slice(0, 64)
          const nonTextRatio = Array.from(bytes).filter(b => b === 0 || b > 127).length / Math.max(1, bytes.length)
          const healthCheckTime = Date.now() - healthCheckStart
          console.log(`[上传全链路][${clientRequestId}] 📊 文件内容健康检查完成，耗时: ${healthCheckTime}ms`)
          console.log(`[上传全链路][${clientRequestId}] 文件内容前64字节非ASCII比例: ${nonTextRatio.toFixed(2)}`)
          console.log(`[${serverRequestId}] 文件内容前64字节非ASCII比例: ${nonTextRatio.toFixed(2)}`)
          if (nonTextRatio > 0.3) {
            console.warn(`[上传全链路][${clientRequestId}] ⚠️ 警告: 上传文件可能为二进制/包含较多非文本字节，建议检查源文件或转为TXT/PDF`)
            console.warn(`[${serverRequestId}] 警告: 上传文件可能为二进制/包含较多非文本字节，建议检查源文件或转为TXT/PDF`)
          }
        } catch (e) {
          console.warn(`[上传全链路][${clientRequestId}] ⚠️ 无法读取文件字节用于健康检查`, e)
          console.warn(`[${serverRequestId}] 无法读取文件字节用于健康检查`, e)
        }
      }
      
      if (!resumeFile) {
        console.error(`[上传全链路][${clientRequestId}] ❌ 错误: 没有提供简历文件`)
        console.error(`[${serverRequestId}] 错误: 没有提供简历文件`)
        return Response.json(
          { error: "No resume file provided" },
          { status: 400 }
        )
      }
      
      // 转发到Python简历处理服务
      console.log(`[上传全链路][${clientRequestId}] ========== 转发请求到Python服务 ==========`)
      console.log(`[上传全链路][${clientRequestId}] 🌐 准备调用Python API`)
      console.log(`[${serverRequestId}] 转发请求到Python简历处理服务`)
      
      const pythonFormData = new FormData()
      pythonFormData.append('resume', resumeFile)
      pythonFormData.append('name', name)
      pythonFormData.append('email', email)
      pythonFormData.append('field', field)
      pythonFormData.append('additionalInfo', additionalInfo)
      pythonFormData.append('requestId', clientRequestId) // 传递请求ID到Python服务
      
      try {
        const uploadUrl = `${PYTHON_API_BASE_URL.replace(/\/$/, '')}/api/resume/upload`
        console.log(`[上传全链路][${clientRequestId}] 📡 Python API URL: ${uploadUrl}`)
        console.log(`[上传全链路][${clientRequestId}] 请求ID: ${clientRequestId}`)
        console.log(`[${serverRequestId}] 调用Python API: ${uploadUrl}`)
        
        const pythonApiStart = Date.now()
        // 使用带超时的fetch，设置3分钟超时（简历处理可能需要较长时间）
        const pythonResponse = await fetchWithTimeout(
          uploadUrl,
          {
            method: 'POST',
            body: pythonFormData
          },
          180000 // 3分钟超时
        )
        const pythonApiTime = Date.now() - pythonApiStart
        
        console.log(`[上传全链路][${clientRequestId}] 📥 Python API响应接收，耗时: ${pythonApiTime}ms`)
        console.log(`[上传全链路][${clientRequestId}] HTTP状态: ${pythonResponse.status} ${pythonResponse.statusText}`)
        console.log(`[${serverRequestId}] Python API响应状态: ${pythonResponse.status}`)
        
        if (!pythonResponse.ok) {
          const errorText = await pythonResponse.text()
          console.error(`[上传全链路][${clientRequestId}] ❌ Python服务错误`)
          console.error(`[上传全链路][${clientRequestId}] HTTP状态: ${pythonResponse.status}`)
          console.error(`[上传全链路][${clientRequestId}] 错误内容: ${errorText.substring(0, 500)}`)
          console.error(`[${serverRequestId}] Python服务错误: ${pythonResponse.status} - ${errorText}`)
          throw new Error(`Python服务错误: ${pythonResponse.status}`)
        }
        
        console.log(`[上传全链路][${clientRequestId}] ✅ Python API调用成功，开始解析响应`)
        const parseStart = Date.now()
        const pythonData = await pythonResponse.json()
        const parseTime = Date.now() - parseStart
        console.log(`[上传全链路][${clientRequestId}] 📄 JSON解析完成，耗时: ${parseTime}ms`)
        
        // 打印安全预览，避免控制台乱码
        const _preview = (obj: any) => {
          try {
            const s = JSON.stringify(obj)
            return s.replace(/[^\x20-\x7E\n\r\t]/g, '.').slice(0, 400)
          } catch {
            return '<unprintable>'
          }
        }
        console.log(`[上传全链路][${clientRequestId}] 📊 Python服务响应摘要:`, {
          success: pythonData.success,
          hasAnalysis: !!pythonData.analysis,
          hasError: !!pythonData.error,
          message: pythonData.message?.substring(0, 100) || 'N/A'
        })
        console.log(`[${serverRequestId}] Python服务响应(预览):`, _preview(pythonData))
        // 后端返回数据健康检查
        const fieldsToCheck = ['name','email','phone'] as const
        for (const key of fieldsToCheck) {
          const val = pythonData?.analysis?.[key]
          if (typeof val === 'string' && /PK\x01\x02|\x00\x00\xFF\xFF/.test(val)) {
            console.warn(`[${serverRequestId}] 警告: 字段 ${key} 疑似包含二进制/乱码片段，原值截断预览:`, val.slice(0, 120))
          }
        }
        console.log(`[${serverRequestId}] Python服务响应(完整对象已上方预览)`)
        
        if (!pythonData.success) {
          console.error(`[${serverRequestId}] Python服务处理失败:`, pythonData.error)
          return Response.json(
            { error: pythonData.error || "简历处理失败" },
            { status: 500 }
          )
        }
        
        console.log(`[上传全链路][${clientRequestId}] ✅ 文件上传处理成功`)
        console.log(`[${serverRequestId}] 文件上传处理成功`)
        
        // 转换Python服务的结果为前端期望的格式
        const extractedInfo = pythonData.analysis || {}
        console.log(`[上传全链路][${clientRequestId}] 📋 提取的信息字段:`, Object.keys(extractedInfo))

        // 调用Python服务的GTV评估API
        console.log(`[上传全链路][${clientRequestId}] ========== 开始调用GTV评估API ==========`)
        console.log("[v0] 开始调用GTV评估API...")
        const gtvUrl = `${PYTHON_API_BASE_URL.replace(/\/$/, '')}/api/resume/gtv-assessment`
        console.log(`[上传全链路][${clientRequestId}] 📡 GTV评估API URL: ${gtvUrl}`)
        
        const gtvApiStart = Date.now()
        // 使用带超时的fetch，设置2分钟超时
        const gtvResponse = await fetchWithTimeout(
          gtvUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              extracted_info: extractedInfo,
              field: field,
              name: name,
              email: email,
              requestId: clientRequestId // 传递请求ID
            })
          },
          120000 // 2分钟超时
        )
        const gtvApiTime = Date.now() - gtvApiStart

        if (!gtvResponse.ok) {
          console.error(`[上传全链路][${clientRequestId}] ❌ GTV评估API调用失败`)
          console.error(`[上传全链路][${clientRequestId}] HTTP状态: ${gtvResponse.status} ${gtvResponse.statusText}`)
          console.error("[v0] GTV评估API调用失败:", gtvResponse.status, gtvResponse.statusText)
          throw new Error(`GTV评估失败: ${gtvResponse.statusText}`)
        }

        console.log(`[上传全链路][${clientRequestId}] 📥 GTV评估API响应接收，耗时: ${gtvApiTime}ms`)
        const gtvParseStart = Date.now()
        const gtvData = await gtvResponse.json()
        const gtvParseTime = Date.now() - gtvParseStart
        console.log(`[上传全链路][${clientRequestId}] 📄 GTV评估JSON解析完成，耗时: ${gtvParseTime}ms`)
        console.log(`[上传全链路][${clientRequestId}] 📊 GTV评估结果摘要:`, {
          success: gtvData.success,
          hasGtvAnalysis: !!gtvData.gtvAnalysis,
          hasError: !!gtvData.error
        })
        console.log("[v0] GTV评估结果:", gtvData)

        if (!gtvData.success) {
          console.error("[v0] GTV评估返回失败:", gtvData.error)
          throw new Error(`GTV评估失败: ${gtvData.error}`)
        }

        const gtvAnalysis = gtvData.gtvAnalysis
        
        // 注意：OC 评估现在通过独立的按钮触发，不在简历上传时进行
        // 这样可以避免简历分析时间过长
        console.log("[v0] OC 评估已独立为按钮触发")
        
        // 返回转换后的结果（不包含OC评估）
        const responseData = {
          success: true,
          analysis: {
            name: extractedInfo.name || name || "N/A",
            email: extractedInfo.email || email || "N/A",
            phone: extractedInfo.phone || "N/A",
            experience: extractedInfo.experience || "工作经验分析完成",
            education: extractedInfo.education || "教育背景分析完成",
            skills: extractedInfo.skills || [],
            achievements: extractedInfo.achievements || [],
            projects: extractedInfo.projects || [],
            languages: extractedInfo.languages || [],
            certifications: extractedInfo.certifications || [],
            summary: extractedInfo.summary || "简历分析完成"
          },
          gtvAnalysis: gtvAnalysis,
          ocAssessment: null,  // OC 评估现在通过按钮单独触发，初始为 null
          personal_kb_path: pythonData.personal_kb_path,
          message: gtvData.message || pythonData.message,
          // 添加PDF文件信息
          pdf_file_path: gtvData.pdf_file_path,
          pdf_filename: gtvData.pdf_filename
        }
        
        const totalTime = Date.now() - startTime
        console.log(`[上传全链路][${clientRequestId}] ⏱️ 后端API总耗时: ${totalTime}ms`)
        console.log(`[上传全链路][${clientRequestId}] 📊 返回数据摘要:`, {
          hasGtvAnalysis: !!responseData.gtvAnalysis,
          hasOcAssessment: !!responseData.ocAssessment,
          ocAssessmentType: typeof responseData.ocAssessment,
          ocResultsCount: (responseData.ocAssessment as any)?.oc_results?.length || 0
        })
        console.log("[v0] 📤 返回数据摘要:", {
          hasGtvAnalysis: !!responseData.gtvAnalysis,
          hasOcAssessment: !!responseData.ocAssessment,
          ocAssessmentType: typeof responseData.ocAssessment,
          ocResultsCount: (responseData.ocAssessment as any)?.oc_results?.length || 0
        })
        console.log(`[上传全链路][${clientRequestId}] ========== 后端API处理成功完成 ==========`)
        
        return Response.json(responseData)
        
      } catch (pythonError) {
        const errorTime = Date.now() - startTime
        console.error(`[上传全链路][${clientRequestId}] ❌ ========== Python服务调用失败 ==========`)
        console.error(`[上传全链路][${clientRequestId}] 异常耗时: ${errorTime}ms`)
        console.error(`[上传全链路][${clientRequestId}] 异常类型:`, pythonError instanceof Error ? pythonError.constructor.name : typeof pythonError)
        console.error(`[上传全链路][${clientRequestId}] 异常信息:`, pythonError)
        
        // 检查是否是超时错误
        const errorMessage = pythonError instanceof Error ? pythonError.message : String(pythonError)
        const isTimeout = errorMessage.includes('超时') || errorMessage.includes('timeout') || errorMessage.includes('AbortError')
        
        if (isTimeout) {
          console.error(`[上传全链路][${clientRequestId}] ⏱️ 请求超时，后端服务响应时间过长`)
          console.error(`[${serverRequestId}] Python服务调用超时:`, pythonError)
          return Response.json(
            { 
              error: "请求超时",
              message: "后端服务处理时间过长，请稍后重试或联系管理员",
              details: `处理耗时: ${errorTime}ms，已超过超时限制`
            },
            { status: 504 } // 504 Gateway Timeout
          )
        }
        
        // 检查是否是连接错误
        const isConnectionError = errorMessage.includes('ECONNREFUSED') || 
                                 errorMessage.includes('fetch failed') ||
                                 errorMessage.includes('Failed to fetch')
        
        if (isConnectionError) {
          console.error(`[上传全链路][${clientRequestId}] 🔌 连接错误，后端服务可能未启动`)
          console.error(`[${serverRequestId}] Python服务连接失败:`, pythonError)
          return Response.json(
            { 
              error: "后端服务不可用",
              message: "无法连接到后端服务，请检查服务是否正常运行",
              details: `连接URL: ${PYTHON_API_BASE_URL}`
            },
            { status: 503 } // 503 Service Unavailable
          )
        }
        
        console.error(`[${serverRequestId}] Python服务调用失败:`, pythonError)
        return Response.json(
          { 
            error: "简历处理服务暂时不可用",
            message: errorMessage || "后端服务处理失败，请稍后重试",
            details: `错误类型: ${pythonError instanceof Error ? pythonError.constructor.name : typeof pythonError}`
          },
          { status: 503 }
        )
      }
    } else {
      // 处理JSON请求 - 保持原有逻辑
      console.log(`[上传全链路][${serverRequestId}] ========== 处理JSON文本输入请求 ==========`)
      console.log(`[${serverRequestId}] 处理JSON文本输入请求`)
      
      const configValidation = validateAIConfig()
      if (!configValidation.isValid) {
        console.error(`[${serverRequestId}] AI配置错误:`, configValidation.errors)
        return Response.json(
          {
            error: "AI configuration error",
            details: configValidation.errors
          },
          { status: 500 }
        )
      }

      const body = await request.json()
      const name = body.name
      const email = body.email
      const field = body.field
      const resumeText = body.resumeText
      const additionalInfo = body.additionalInfo

      console.log(`[上传全链路][${serverRequestId}] 📋 JSON请求信息:`, {
        name,
        email,
        field,
        resumeTextLength: resumeText?.length || 0,
        additionalInfoLength: additionalInfo?.length || 0
      })
      console.log(`[${serverRequestId}] JSON请求信息:`, {
        name,
        email,
        field,
        resumeTextLength: resumeText?.length || 0,
        additionalInfoLength: additionalInfo?.length || 0
      })

      if (!resumeText || resumeText.trim().length < 50) {
        return Response.json(
          {
            error: "Invalid resume",
            message: "Please provide a valid resume with at least 50 characters.",
          },
          { status: 400 },
        )
      }

      const maxResumeLength = 2500
      const truncatedResume = resumeText?.slice(0, maxResumeLength) || ""
      const resumeTruncated = resumeText?.length > maxResumeLength

      const fallbackResult = {
        applicantInfo: {
          name: name || "N/A",
          field:
            field === "digital-technology"
              ? "Digital Technology"
              : field === "arts-culture"
                ? "Arts & Culture"
                : "Research & Academia",
          currentPosition: "To be determined from resume",
          company: "To be determined from resume",
          yearsOfExperience: "To be determined from resume",
        },
        educationBackground: {
          degrees: [],
          institutions: [],
          analysis: "Education background analysis pending AI processing.",
        },
        industryBackground: {
          sector: "To be analyzed",
          yearsInIndustry: "To be determined",
          keyCompanies: [],
          industryImpact: 5,
          analysis: "Industry background analysis pending.",
        },
        workExperience: {
          positions: [],
          keyAchievements: [],
          leadershipRoles: [],
          projectImpact: [],
          analysis: "Work experience analysis pending.",
        },
        technicalExpertise: {
          coreSkills: [],
          specializations: [],
          innovations: [],
          industryRecognition: [],
          analysis: "Technical expertise analysis pending.",
        },
        gtvPathway: {
          recommendedRoute: "To be determined",
          eligibilityLevel: "To be assessed",
          yearsOfExperience: "To be determined",
          analysis: "GTV pathway analysis pending.",
        },
        strengths: [
          {
            area: "Professional Background",
            description:
              "Based on the field selected: " +
              (field === "digital-technology"
                ? "Digital Technology"
                : field === "arts-culture"
                  ? "Arts & Culture"
                  : "Research & Academia"),
            evidence: "Resume submitted for review",
          },
        ],
        weaknesses: [
          {
            area: "Documentation",
            description: "Complete documentation required for assessment",
            improvement: "Submit comprehensive supporting documents",
            priority: "High",
          },
        ],
        criteriaAssessment: [
          {
            name: "Exceptional Talent/Promise",
            status: "To be assessed",
            score: 0,
            evidence: "Pending AI analysis",
          },
        ],
        overallScore: 0,
        recommendation: "Complete AI analysis required for accurate assessment",
        professionalAdvice: [
          "Submit comprehensive supporting documents",
          "Provide detailed project descriptions",
          "Include evidence of recognition and impact",
        ],
        timeline: "To be determined",
        requiredDocuments: [
          "Resume/CV",
          "Supporting documents",
          "Evidence of achievements",
        ],
        estimatedBudget: {
          min: 5000,
          max: 15000,
          currency: "GBP",
        },
        debug: {
          prompt: "AI analysis not performed - using fallback data",
          rawResponse: "No AI response - fallback data returned",
          timestamp: new Date().toISOString(),
        },
      }

      try {
        const fieldName =
          field === "digital-technology"
            ? "Digital Technology"
            : field === "arts-culture"
              ? "Arts & Culture"
              : "Research & Academia"

        const systemPrompt = `You are a UK Global Talent Visa assessment consultant. Analyze resumes based on official GTV criteria.

CRITERIA:
- Exceptional Talent: 5+ years, established leader
- Exceptional Promise: <5 years, emerging leader
- Evidence: Innovation, recognition, leadership, contributions

SCORING: 90-100 (Strong), 75-89 (Good), 60-74 (Moderate), 50-59 (Weak), <50 (Not recommended)

Respond with valid JSON only (no markdown).`

        const userPrompt = `Analyze for UK GTV eligibility:

NAME: ${name}
FIELD: ${fieldName}
RESUME:
${truncatedResume}

${additionalInfo ? `NOTES: ${additionalInfo}` : ""}

Return JSON with:
{
  "applicantInfo": {"name", "field", "position", "company", "experienceYears"},
  "gtvPathway": {"recommendedRoute", "eligibilityLevel", "analysis"},
  "educationBackground": {"degrees": [], "institutions": [], "analysis"},
  "industryBackground": {"sector", "yearsInIndustry", "keyCompanies": [], "industryImpact", "analysis"},
  "workExperience": {"positions": [], "keyAchievements": [], "analysis"},
  "technicalExpertise": {"coreSkills": [], "innovations": [], "analysis"},
  "strengths": [{"area", "description", "evidence"}],
  "weaknesses": [{"area", "description", "improvement", "priority"}],
  "criteriaAssessment": [{"name", "status", "score", "evidence"}],
  "overallScore": 0-100,
  "recommendation": "string",
  "professionalAdvice": ["string"],
  "timeline": "string",
  "requiredDocuments": ["string"],
  "estimatedBudget": {"min", "max", "currency"}
}`

        const { text } = await generateText({
          model: getAIModel(),
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          ...getAIOptions(),
        })

        console.log("[v0] AI response received, attempting to parse JSON")

        let cleanedText = text.trim()
        if (cleanedText.startsWith("```json")) {
          cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "")
        } else if (cleanedText.startsWith("```")) {
          cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "")
        }

        if (!cleanedText.endsWith("}")) {
          console.log("[v0] Detected incomplete JSON, attempting to fix...")
          // Try to find the last complete object and close it
          const lastCompleteObject = cleanedText.lastIndexOf("},")
          if (lastCompleteObject > 0) {
            cleanedText = cleanedText.substring(0, lastCompleteObject + 1) + "}"
          } else {
            // If we can't fix it, throw error to use fallback
            throw new Error("Incomplete JSON response from AI")
          }
        }

        let analysisResult
        try {
          analysisResult = JSON.parse(cleanedText)
        } catch (parseError) {
          console.error("[v0] JSON parse error, raw response:", cleanedText.substring(0, 500))
          console.error("[v0] Parse error details:", parseError)
          throw new Error("Invalid JSON response from AI")
        }

        console.log("[v0] Validating AI response structure...")

        analysisResult.applicantInfo = analysisResult.applicantInfo || {
          name: name || "N/A",
          field: fieldName,
          currentPosition: "To be determined",
          company: "To be determined",
          yearsOfExperience: "To be determined",
        }

        analysisResult.gtvPathway = analysisResult.gtvPathway || {
          recommendedRoute: "To be determined",
          eligibilityLevel: "To be assessed",
          yearsOfExperience: "To be determined",
          analysis: "GTV pathway analysis pending.",
        }

        analysisResult.educationBackground = analysisResult.educationBackground || {
          degrees: [],
          institutions: [],
          analysis: "Education background analysis pending.",
        }

        analysisResult.industryBackground = analysisResult.industryBackground || {
          sector: "To be analyzed",
          yearsInIndustry: "To be determined",
          keyCompanies: [],
          industryImpact: 5,
          analysis: "Industry background analysis pending.",
        }

        analysisResult.workExperience = analysisResult.workExperience || {
          positions: [],
          keyAchievements: [],
          leadershipRoles: [],
          projectImpact: [],
          analysis: "Work experience analysis pending.",
        }

        analysisResult.technicalExpertise = analysisResult.technicalExpertise || {
          coreSkills: [],
          specializations: [],
          innovations: [],
          industryRecognition: [],
          analysis: "Technical expertise analysis pending.",
        }

        analysisResult.strengths = analysisResult.strengths || []
        analysisResult.weaknesses = analysisResult.weaknesses || []
        analysisResult.criteriaAssessment = analysisResult.criteriaAssessment || []
        analysisResult.professionalAdvice = analysisResult.professionalAdvice || []

        analysisResult.overallScore = analysisResult.overallScore || 0
        analysisResult.recommendation = analysisResult.recommendation || "Assessment pending"
        analysisResult.timeline = analysisResult.timeline || "To be determined"

        analysisResult.requiredDocuments = analysisResult.requiredDocuments || []
        if (!Array.isArray(analysisResult.requiredDocuments)) {
          analysisResult.requiredDocuments = []
        }

        analysisResult.estimatedBudget = analysisResult.estimatedBudget || {
          min: 5000,
          max: 15000,
          currency: "GBP",
        }

        analysisResult.debug = {
          prompt: systemPrompt + "\n\n" + userPrompt,
          rawResponse: text,
          timestamp: new Date().toISOString(),
        }

        console.log("[v0] Successfully parsed and validated comprehensive GTV analysis")
        
        // 解析提取的信息（如果存在）
        let extractedInfo: any = {}
        try {
          if (additionalInfo.includes("提取的信息：")) {
            const extractedData = additionalInfo.replace("提取的信息：", "")
            extractedInfo = JSON.parse(extractedData)
          }
        } catch (e) {
          console.log("无法解析提取的信息，使用默认值")
        }

        // 转换为前端期望的格式
        const response = {
          success: true,
          analysis: {
            name: extractedInfo.name || analysisResult.applicantInfo?.name || name,
            email: extractedInfo.email || email,
            phone: extractedInfo.phone || "",
            experience: extractedInfo.experience || analysisResult.workExperience?.analysis || "工作经验待分析",
            education: extractedInfo.education || analysisResult.educationBackground?.analysis || "教育背景待分析",
            skills: extractedInfo.skills || analysisResult.technicalExpertise?.coreSkills || [],
            achievements: extractedInfo.achievements || analysisResult.workExperience?.keyAchievements || [],
            projects: extractedInfo.projects || [],
            languages: extractedInfo.languages || [],
            certifications: extractedInfo.certifications || [],
            summary: extractedInfo.summary || analysisResult.recommendation || "简历分析完成"
          },
          gtvAnalysis: analysisResult
        }
        
        return Response.json(response)
      } catch (aiError) {
        console.error("[v0] AI analysis failed, returning fallback data:", aiError)
        
        // 解析提取的信息（如果存在）
        let extractedInfo: any = {}
        try {
          if (additionalInfo.includes("提取的信息：")) {
            const extractedData = additionalInfo.replace("提取的信息：", "")
            extractedInfo = JSON.parse(extractedData)
          }
        } catch (e) {
          console.log("无法解析提取的信息，使用默认值")
        }

        // 转换为前端期望的格式
        const fallbackResponse = {
          success: true,
          analysis: {
            name: extractedInfo.name || fallbackResult.applicantInfo?.name || name,
            email: extractedInfo.email || email,
            phone: extractedInfo.phone || "",
            experience: extractedInfo.experience || fallbackResult.workExperience?.analysis || "工作经验待分析",
            education: extractedInfo.education || fallbackResult.educationBackground?.analysis || "教育背景待分析",
            skills: extractedInfo.skills || fallbackResult.technicalExpertise?.coreSkills || [],
            achievements: extractedInfo.achievements || fallbackResult.workExperience?.keyAchievements || [],
            projects: extractedInfo.projects || [],
            languages: extractedInfo.languages || [],
            certifications: extractedInfo.certifications || [],
            summary: extractedInfo.summary || fallbackResult.recommendation || "简历分析完成（使用备用数据）"
          },
          gtvAnalysis: fallbackResult
        }
        
        return Response.json(fallbackResponse)
      }
    }
  } catch (error) {
    const errorTime = Date.now() - startTime
    console.error(`[上传全链路][${serverRequestId}] ❌ ========== 后端API处理异常 ==========`)
    console.error(`[上传全链路][${serverRequestId}] 异常耗时: ${errorTime}ms`)
    console.error(`[上传全链路][${serverRequestId}] 异常类型:`, error instanceof Error ? error.constructor.name : typeof error)
    console.error(`[上传全链路][${serverRequestId}] 异常信息:`, error)
    if (error instanceof Error) {
      console.error(`[上传全链路][${serverRequestId}] 错误堆栈:`, error.stack)
    }
    console.error(`[${serverRequestId}] 简历分析错误:`, error)
    return Response.json(
      {
        error: "Analysis failed",
        message: "Unable to process the request. Please try again.",
      },
      { status: 500 },
    )
  }
}