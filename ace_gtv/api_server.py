#!/usr/bin/env python3
"""
GTV评估统一API服务
聚合所有后端服务到单一Flask应用:
- 评分分析 (/api/scoring/*)
- 文档分析 (/api/documents/*)
- 材料收集 (/api/material-collection/*, /api/projects/*/material-collection/*)
- 内容提取 (/api/projects/*/extraction/*)
- 框架构建 (/api/projects/*/framework/*)
- 文案生成 (/api/copywriting/*)

运行在单一端口上（默认5005）
"""

import os
import sys
import json
import logging
import tempfile
from typing import Optional
from pathlib import Path
from datetime import datetime

# 确保可以导入本地模块
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from flask_socketio import SocketIO

# 加载环境变量
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / '.env.local'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"已加载环境变量: {env_path}")
    else:
        load_dotenv()
except ImportError:
    pass

# 导入统一日志系统
try:
    from utils.logger_config import setup_module_logger
    logger = setup_module_logger("api_server", os.getenv("LOG_LEVEL", "INFO"))
except ImportError:
    logging.basicConfig(level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO))
    logger = logging.getLogger("api_server")

# Supabase 路由已弃用，认证功能已迁移到 copywriting_routes.py
SUPABASE_ROUTES_AVAILABLE = False

# 导入Agent和分析器
try:
    from agents.scoring_agent_lite import ScoringAgent
except ImportError:
    logging.error("无法导入ScoringAgent")
    ScoringAgent = None

try:
    from processors.document_analyzer import KnowledgeExtractor, DocumentExtractor
except ImportError:
    logging.error("无法导入DocumentAnalyzer")
    KnowledgeExtractor = None
    DocumentExtractor = None

# 导入简历处理的必要函数
try:
    from processors.resume_processor import (
        extract_text_from_file,
        call_ai_for_extraction,
        call_ai_for_gtv_assessment,
        create_personal_knowledge_base,
        update_main_knowledge_base,
        allowed_file,
        generate_gtv_pdf_report,
        safe_preview
    )
    logging.info("✅ 简历处理模块导入成功")
    RESUME_PROCESSING_AVAILABLE = True
except ImportError as e:
    logging.warning(f"⚠️ 简历处理模块导入失败: {e}")
    RESUME_PROCESSING_AVAILABLE = False
    # 定义占位函数
    def allowed_file(f): return True
    def safe_preview(s): return str(s)[:200]
    extract_text_from_file = None
    call_ai_for_extraction = None
    call_ai_for_gtv_assessment = None
    create_personal_knowledge_base = None
    update_main_knowledge_base = None
    generate_gtv_pdf_report = None

# 导入LangGraph评分Agent
try:
    from agents.langgraph_scoring_agent import LangGraphScoringAgent, KnowledgeBaseManager
    logging.info("✅ LangGraph评分Agent导入成功")
    LANGGRAPH_SCORING_AVAILABLE = True
except ImportError as e:
    logging.warning(f"⚠️ LangGraph评分Agent导入失败: {e}")
    LANGGRAPH_SCORING_AVAILABLE = False

# 导入LangGraph OC评估Agent
LANGGRAPH_OC_AVAILABLE = False  # 默认值，如果导入成功会被设置为True
try:
    from agents.langgraph_oc_agent import LangGraphOCAgent
    logging.info("✅ LangGraph OC评估Agent导入成功")
    LANGGRAPH_OC_AVAILABLE = True
except ImportError as e:
    logging.warning(f"⚠️ LangGraph OC评估Agent导入失败: {e}")
    LANGGRAPH_OC_AVAILABLE = False
except Exception as e:
    logging.error(f"❌ LangGraph OC评估Agent导入异常: {e}", exc_info=True)
    LANGGRAPH_OC_AVAILABLE = False

# 创建Flask应用
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# 创建 SocketIO 实例（支持 WebSocket 终端）
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='threading',
    logger=False,
    engineio_logger=False,
)

# 配置上传文件夹
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB (支持大型zip文件)

# 认证功能已迁移到 copywriting_routes.py 中的 /api/auth/* 路由
logger.info("✅ 认证功能通过 copywriting_routes 提供 (/api/auth/*)")

# 注册文案系统路由
COPYWRITING_ROUTES_AVAILABLE = False
try:
    from api.copywriting_routes import copywriting_bp
    app.register_blueprint(copywriting_bp, url_prefix='/api')
    COPYWRITING_ROUTES_AVAILABLE = True
    logger.info("✅ 文案系统路由注册成功 (/api/*)")
except ImportError as e:
    logger.warning(f"⚠️ 文案系统路由导入失败: {e}")
    
# 注册终端路由
TERMINAL_ROUTES_AVAILABLE = False
try:
    from api.terminal_routes import terminal_bp, register_terminal_events
    app.register_blueprint(terminal_bp)
    register_terminal_events(socketio)
    TERMINAL_ROUTES_AVAILABLE = True
    logger.info("✅ 终端 WebSocket 路由注册成功 (/terminal)")
except ImportError as e:
    logger.warning(f"⚠️ 终端路由导入失败: {e}")

# 全局Agent实例（不使用类型提示以避免导入失败时的NameError）
scoring_agent = None
knowledge_extractor = None
langgraph_scoring_agent = None
langgraph_oc_agent = None
kb_manager = None

# ============================================================================
# 初始化和配置
# ============================================================================

@app.before_request
def initialize_services():
    """初始化所有服务 - 仅在首次请求时"""
    # 健康检查不需要初始化
    if request.path == '/health':
        return
    
    global scoring_agent, knowledge_extractor, langgraph_scoring_agent, langgraph_oc_agent, kb_manager, LANGGRAPH_SCORING_AVAILABLE, LANGGRAPH_OC_AVAILABLE
    
    # 初始化评分Agent
    if scoring_agent is None and ScoringAgent is not None:
        try:
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if openai_api_key:
                # ScoringAgent 构造函数期望接收 openai_api_key 字符串，而不是 llm 对象
                scoring_agent = ScoringAgent(openai_api_key=openai_api_key)
                logger.info("✅ ScoringAgent 初始化成功")
            else:
                logger.warning("⚠️ OPENAI_API_KEY 未设置，评分Agent使用Mock模式")
                scoring_agent = ScoringAgent()  # 使用默认的Mock模式
            
        except Exception as e:
            logger.error(f"❌ 评分Agent初始化错误: {e}", exc_info=True)
    
    # 初始化知识提取器
    if knowledge_extractor is None and KnowledgeExtractor is not None:
        try:
            knowledge_extractor = KnowledgeExtractor()
            logger.info("✅ KnowledgeExtractor 初始化成功")
        except Exception as e:
            logger.error(f"❌ KnowledgeExtractor初始化错误: {e}")

    if langgraph_scoring_agent is None and LANGGRAPH_SCORING_AVAILABLE:
        try:
            # 初始化知识库管理器
            if kb_manager is None:
                kb_manager = KnowledgeBaseManager(kb_dir="./public")
            
            # 初始化LangGraph评分Agent
            langgraph_scoring_agent = LangGraphScoringAgent(
                llm=llm if 'llm' in locals() else None,
                kb_manager=kb_manager
            )
            logger.info("✅ LangGraph评分Agent初始化成功")
        except Exception as e:
            logger.error(f"❌ LangGraph评分Agent初始化失败: {e}")
            LANGGRAPH_SCORING_AVAILABLE = False

    if langgraph_oc_agent is None and LANGGRAPH_OC_AVAILABLE:
        try:
            logger.info("🔧 开始初始化LangGraph OC评估Agent...")
            # 初始化知识库管理器（如果还没有初始化）
            if kb_manager is None:
                kb_manager = KnowledgeBaseManager(kb_dir="./public")
                logger.info(f"✅ 知识库管理器初始化成功，规则数: {len(kb_manager.rules)}")
            
            # 初始化LLM（如果还没有初始化）
            oc_llm = None
            try:
                from langchain_openai import ChatOpenAI
                openai_api_key = os.getenv("OPENAI_API_KEY")
                if openai_api_key:
                    oc_llm = ChatOpenAI(
                        api_key=openai_api_key,
                        model="gpt-4-turbo-preview",
                        temperature=0.3,
                    )
                    logger.info("✅ LLM初始化成功")
                else:
                    logger.warning("⚠️ OPENAI_API_KEY未设置，OC评估Agent使用Mock模式（无LLM）")
            except ImportError as e:
                logger.warning(f"⚠️ LangChain导入失败: {e}，OC评估Agent使用Mock模式（无LLM）")
                oc_llm = None
            
            # 初始化LangGraph OC评估Agent
            logger.info("🔧 创建LangGraphOCAgent实例...")
            langgraph_oc_agent = LangGraphOCAgent(
                llm=oc_llm,
                kb_manager=kb_manager
            )
            logger.info("✅ LangGraph OC评估Agent初始化成功")
            logger.info(f"✅ OC评估Agent状态: llm={oc_llm is not None}, kb_manager={kb_manager is not None}")
        except Exception as e:
            logger.error(f"❌ LangGraph OC评估Agent初始化失败: {e}", exc_info=True)
            LANGGRAPH_OC_AVAILABLE = False
            langgraph_oc_agent = None


# ============================================================================
# 健康检查
# ============================================================================

@app.route('/health', methods=['GET'])
def health():
    """健康检查 - 返回所有服务的状态和已注册路由"""
    skip_prefixes = ('/static',)
    skip_methods = {'HEAD', 'OPTIONS'}

    routes = []
    for rule in app.url_map.iter_rules():
        if rule.endpoint == 'static':
            continue
        if any(rule.rule.startswith(p) for p in skip_prefixes):
            continue
        methods = sorted(rule.methods - skip_methods)
        if not methods:
            continue
        routes.append({
            'path': rule.rule,
            'methods': methods,
            'endpoint': rule.endpoint,
            'has_params': bool(rule.arguments),
        })

    routes.sort(key=lambda r: r['path'])

    groups: dict[str, list] = {}
    for r in routes:
        parts = r['path'].strip('/').split('/')
        if len(parts) >= 2 and parts[0] == 'api':
            group = parts[1]
        elif r['path'] == '/health':
            group = 'system'
        else:
            group = parts[0] if parts[0] else 'root'
        groups.setdefault(group, []).append(r)

    return jsonify({
        'status': 'healthy',
        'message': 'GTV统一API服务运行中',
        'timestamp': datetime.now().isoformat(),
        'services': {
            'scoring_agent': 'enabled' if scoring_agent else 'disabled',
            'document_analyzer': 'enabled' if knowledge_extractor else 'disabled',
            'copywriting': 'enabled' if COPYWRITING_ROUTES_AVAILABLE else 'disabled',
            'supabase': 'enabled' if SUPABASE_ROUTES_AVAILABLE else 'disabled',
        },
        'route_groups': groups,
        'total_routes': len(routes),
    }), 200


# ============================================================================
# 评分分析API端点
# ============================================================================

@app.route('/api/scoring/analyze-item', methods=['POST'])
def analyze_item():
    """分析单个评分项"""
    try:
        if scoring_agent is None:
            return jsonify({'error': '评分服务不可用'}), 503
        
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '请求体为空'}), 400
        
        required_fields = ['item_name', 'item_value', 'score', 'max_score', 'percentage', 'applicant_background']
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return jsonify({
                'error': f'缺少必需字段: {", ".join(missing_fields)}'
            }), 400
        
        logger.info(f"📊 开始分析项目: {data['item_name']}")
        
        result = scoring_agent.analyze_item(
            item_name=data['item_name'],
            item_value=data['item_value'],
            score=data['score'],
            max_score=data['max_score'],
            percentage=data['percentage'],
            applicant_background=data['applicant_background'],
        )
        
        logger.info(f"✅ 分析完成: {data['item_name']}")
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"❌ 分析失败: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/api/scoring/analyze-stream', methods=['POST'])
def analyze_stream():
    """流式分析单个评分项"""
    try:
        if scoring_agent is None:
            return jsonify({'error': '评分服务不可用'}), 503
        
        data = request.get_json()
        
        required_fields = ['item_name', 'item_value', 'score', 'max_score', 'percentage', 'applicant_background']
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return jsonify({
                'error': f'缺少必需字段: {", ".join(missing_fields)}'
            }), 400
        
        def generate():
            """生成流式响应"""
            yield f"data: {json.dumps({'status': 'starting', 'message': '开始分析...'})}\n\n"
            
            try:
                item_name = data.get("item_name", "未知项目")
                status_data_1 = {'status': 'analyzing_official', 'message': f'分析官方要求: {item_name}'}
                yield f"data: {json.dumps(status_data_1)}\n\n"
                
                status_data_2 = {'status': 'analyzing_deviation', 'message': '分析偏差程度'}
                yield f"data: {json.dumps(status_data_2)}\n\n"
                
                result = scoring_agent.analyze_item(
                    item_name=data['item_name'],
                    item_value=data['item_value'],
                    score=data['score'],
                    max_score=data['max_score'],
                    percentage=data['percentage'],
                    applicant_background=data['applicant_background'],
                )
                
                yield f"data: {json.dumps({'status': 'complete', 'result': result})}\n\n"
                
            except Exception as e:
                logger.error(f"❌ 流式分析失败: {e}")
                yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
        
        return Response(generate(), mimetype='text/event-stream')
        
    except Exception as e:
        logger.error(f"❌ 流式分析端点错误: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================================================
# LangGraph评分Agent端点
# ============================================================================

@app.route('/api/scoring/langgraph-analyze', methods=['POST'])
def langgraph_analyze():
    """使用LangGraph Agent进行多轮交互评分分析"""
    
    if not LANGGRAPH_SCORING_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'LangGraph评分服务不可用'
        }), 503
    
    request_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
    logger.info(f"[{request_id}] 开始LangGraph多轮分析请求")
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '请求体为空'}), 400
        
        # 提取申请人数据
        applicant_data = data.get('applicant_data', {})
        
        logger.info(f"[{request_id}] 申请人数据: {applicant_data.get('name', 'N/A')}")
        
        # 执行多轮分析
        start_time = datetime.now()
        result = langgraph_scoring_agent.analyze(applicant_data)
        execution_time = (datetime.now() - start_time).total_seconds()
        
        logger.info(f"[{request_id}] 分析完成，最终评分: {result['score']:.1f}")
        logger.info(f"[{request_id}] LLM调用次数: {result['llm_interactions']}")
        logger.info(f"[{request_id}] 执行时间: {execution_time:.2f}秒")
        
        return jsonify({
            'success': True,
            'data': result,
            'message': f"多轮分析完成，评分: {result['score']:.1f}/100"
        }), 200
        
    except Exception as e:
        logger.error(f"[{request_id}] LangGraph分析失败: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/knowledge-base/rules', methods=['GET'])
def get_knowledge_base_rules():
    """获取知识库规则统计信息"""
    
    if not kb_manager:
        return jsonify({
            'success': False,
            'error': '知识库管理器不可用'
        }), 503
    
    try:
        # 统计规则信息
        total_rules = len(kb_manager.rules)
        
        # 按维度统计
        dimension_stats = {}
        for dimension, rule_ids in kb_manager.rule_index.items():
            if dimension not in dimension_stats and len(rule_ids) > 0:
                if any(rid in kb_manager.rules for rid in rule_ids):
                    dimension_stats[dimension] = len(rule_ids)
        
        return jsonify({
            'success': True,
            'data': {
                'total_rules': total_rules,
                'dimension_stats': dimension_stats,
                'last_updated': datetime.now().isoformat()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"获取知识库规则失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/knowledge-base/search', methods=['POST'])
def search_knowledge_base():
    """搜索知识库规则"""
    
    if not kb_manager:
        return jsonify({
            'success': False,
            'error': '知识库管理器不可用'
        }), 503
    
    try:
        data = request.get_json()
        
        # 提取搜索参数
        dimension = data.get('dimension')
        category = data.get('category')
        keywords = data.get('keywords', [])
        
        # 搜索规则
        rules = kb_manager.search_rules(dimension, category, keywords)
        
        return jsonify({
            'success': True,
            'data': {
                'rules_found': len(rules),
                'rules': [
                    {
                        'title': r.get('title'),
                        'dimension': r.get('dimension'),
                        'category': r.get('category'),
                        'content': r.get('content', '')[:300] + '...'
                    } for r in rules
                ]
            }
        }), 200
        
    except Exception as e:
        logger.error(f"知识库搜索失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============================================================================
# OC评估API端点
# ============================================================================

@app.route('/api/assessment/oc-evaluation', methods=['POST'])
def oc_evaluation():
    """使用LangGraph和LLM进行OC评估"""
    
    logger.info(f"🔍 OC评估端点检查: LANGGRAPH_OC_AVAILABLE={LANGGRAPH_OC_AVAILABLE}, langgraph_oc_agent={langgraph_oc_agent is not None}")
    
    if not LANGGRAPH_OC_AVAILABLE:
        logger.warning("⚠️ LANGGRAPH_OC_AVAILABLE为False")
        return jsonify({
            'success': False,
            'error': 'OC评估服务不可用（LANGGRAPH_OC_AVAILABLE=False）'
        }), 503
    
    if not langgraph_oc_agent:
        logger.warning("⚠️ langgraph_oc_agent为None")
        return jsonify({
            'success': False,
            'error': 'OC评估服务不可用（langgraph_oc_agent未初始化）'
        }), 503
    
    request_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
    logger.info(f"[{request_id}] 开始OC评估请求")
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '请求体为空'}), 400
        
        applicant_data = data.get('applicantData', {})
        assessment_data = data.get('assessmentData', {})
        
        logger.info(f"[{request_id}] 申请人: {applicant_data.get('name', 'N/A')}")
        
        # 执行OC评估
        start_time = datetime.now()
        result = langgraph_oc_agent.assess(applicant_data, assessment_data)
        execution_time = (datetime.now() - start_time).total_seconds()
        
        logger.info(f"[{request_id}] OC评估完成，耗时: {execution_time:.2f}秒")
        logger.info(f"[{request_id}] OC结果数: {len(result.get('oc_results', []))}")
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"[{request_id}] OC评估失败: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============================================================================
# 文档分析API端点
# ============================================================================

@app.route('/api/documents/analyze', methods=['POST'])
def analyze_document():
    """分析上传的文档（Excel/Word/TXT）"""
    try:
        if knowledge_extractor is None:
            return jsonify({'error': '文档分析服务不可用'}), 503
        
        if 'file' not in request.files:
            return jsonify({'error': '未提供文件'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': '文件名为空'}), 400
        
        # 允许的文件类型
        ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'docx', 'doc', 'txt'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in ALLOWED_EXTENSIONS:
            return jsonify({
                'error': f'不支持的文件格式。支持: {",".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # 保存临时文件
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"analysis_{file.filename}")
        file.save(temp_path)
        
        logger.info(f"📄 分析文档: {file.filename}")
        
        try:
            result = knowledge_extractor.analyze_and_extract(temp_path)
            return jsonify(result), 200
        finally:
            # 清理临时文件
            try:
                os.remove(temp_path)
            except:
                pass
        
    except Exception as e:
        logger.error(f"❌ 文档分析失败: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/api/documents/extract', methods=['POST'])
def extract_document_text():
    """仅提取文档文本内容"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': '未提供文件'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': '文件名为空'}), 400
        
        ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'docx', 'doc', 'txt'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in ALLOWED_EXTENSIONS:
            return jsonify({
                'error': f'不支持的文件格式。支持: {",".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # 保存临时文件
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"extract_{file.filename}")
        file.save(temp_path)
        
        try:
            content = DocumentExtractor.extract_from_file(temp_path)
            return jsonify({
                'success': True,
                'filename': file.filename,
                'content': content,
                'content_length': len(content)
            }), 200
        finally:
            try:
                os.remove(temp_path)
            except:
                pass
        
    except Exception as e:
        logger.error(f"❌ 文本提取失败: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/api/documents/formats', methods=['GET'])
def supported_formats():
    """获取支持的文件格式"""
    return jsonify({
        'formats': ['xlsx', 'xls', 'docx', 'doc', 'txt'],
        'max_size_mb': 10,
        'description': {
            'xlsx': 'Excel 工作簿 (2007+)',
            'xls': 'Excel 工作簿 (97-2003)',
            'docx': 'Word 文档 (2007+)',
            'doc': 'Word 文档 (97-2003)',
            'txt': '纯文本文件'
        }
    }), 200


# ============================================================================
# 简历处理API端点
# ============================================================================

@app.route('/api/resume/upload', methods=['POST'])
def upload_resume():
    """处理简历上传"""
    if not RESUME_PROCESSING_AVAILABLE:
        return jsonify({'success': False, 'error': '简历处理服务不可用'}), 503
    
    request_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
    logger.info(f"[{request_id}] 开始处理简历上传请求")
    
    try:
        # 获取表单数据
        form_name = request.form.get('name', '').strip()
        form_email = request.form.get('email', '').strip()
        form_field = request.form.get('field', 'digital-technology').strip()
        form_additional_info = request.form.get('additionalInfo', '').strip()
        
        logger.info(f"[{request_id}] 表单数据 - 姓名: {form_name}, 邮箱: {form_email}, 领域: {form_field}")
        
        # 检查文件是否存在
        if 'resume' not in request.files:
            logger.error(f"[{request_id}] 错误: 没有上传文件")
            return jsonify({"success": False, "error": "没有上传文件"}), 400
            
        file = request.files['resume']
        if file.filename == '':
            logger.error(f"[{request_id}] 错误: 没有选择文件")
            return jsonify({"success": False, "error": "没有选择文件"}), 400
            
        logger.info(f"[{request_id}] 上传文件名: {file.filename}")
        
        # 检查文件类型
        if not allowed_file(file.filename):
            logger.error(f"[{request_id}] 错误: 不支持的文件类型 {file.filename}")
            return jsonify({"success": False, "error": "不支持的文件类型"}), 400
            
        logger.info(f"[{request_id}] 文件类型检查通过")
        
        # 保存文件
        from werkzeug.utils import secure_filename
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        logger.info(f"[{request_id}] 保存文件到: {file_path}")
        file.save(file_path)
        logger.info(f"[{request_id}] 文件保存成功")
        
        # 提取文本内容
        logger.info(f"[{request_id}] 开始提取文件文本内容")
        content = extract_text_from_file(file_path)
        if not content:
            logger.error(f"[{request_id}] 错误: 无法读取文件内容")
            return jsonify({"success": False, "error": "无法读取文件内容"}), 400
            
        logger.info(f"[{request_id}] 文本提取成功，内容长度: {len(content)} 字符")
            
        # 使用AI提取信息
        logger.info(f"[{request_id}] 开始AI信息提取")
        extracted_info = call_ai_for_extraction(content)
        if not extracted_info:
            logger.error(f"[{request_id}] 错误: AI信息提取失败")
            return jsonify({"success": False, "error": "信息提取失败"}), 500
            
        logger.info(f"[{request_id}] AI信息提取成功")
        
        # 优先使用表单中的姓名
        ai_name = extracted_info.get("name", "").strip()
        final_name = form_name if form_name else ai_name
        if not final_name:
            final_name = "未知用户"
            
        logger.info(f"[{request_id}] 最终使用的姓名: {final_name}")
        
        # 如果表单提供了邮箱，更新到提取信息中
        if form_email:
            extracted_info["email"] = form_email
            
        # 创建个人知识库
        logger.info(f"[{request_id}] 开始创建个人知识库")
        personal_kb_path = create_personal_knowledge_base(final_name, extracted_info)
        if not personal_kb_path:
            logger.error(f"[{request_id}] 错误: 创建个人知识库失败")
            return jsonify({"success": False, "error": "创建个人知识库失败"}), 500
            
        logger.info(f"[{request_id}] 个人知识库创建成功: {personal_kb_path}")
            
        # 更新主知识库
        logger.info(f"[{request_id}] 开始更新主知识库")
        update_result = update_main_knowledge_base(personal_kb_path, final_name)
        logger.info(f"[{request_id}] 主知识库更新结果: {update_result}")
        
        # 清理临时文件
        try:
            os.remove(file_path)
            logger.info(f"[{request_id}] 临时文件清理成功: {file_path}")
        except Exception as cleanup_error:
            logger.warning(f"[{request_id}] 临时文件清理失败: {cleanup_error}")
            
        logger.info(f"[{request_id}] 简历上传处理完成")
        return jsonify({
            "success": True,
            "analysis": extracted_info,
            "personal_kb_path": personal_kb_path,
            "message": f"简历分析完成，已为 {final_name} 创建个人知识库"
        })
        
    except Exception as e:
        logger.error(f"[{request_id}] 简历上传失败: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/resume/gtv-assessment', methods=['POST'])
def gtv_assessment():
    """GTV资格评估"""
    if not RESUME_PROCESSING_AVAILABLE:
        return jsonify({'success': False, 'error': 'GTV评估服务不可用'}), 503
    
    request_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
    logger.info(f"[{request_id}] 开始GTV资格评估请求")
    
    try:
        # 获取请求数据
        data = request.get_json()
        if not data:
            logger.error(f"[{request_id}] 错误: 没有提供评估数据")
            return jsonify({"success": False, "error": "没有提供评估数据"}), 400
            
        # 提取必要参数
        extracted_info = data.get('extracted_info', {})
        field = data.get('field', 'digital-technology')
        form_name = data.get('name', '').strip()
        form_email = data.get('email', '').strip()
        
        # 优先使用表单中的姓名
        ai_name = extracted_info.get("name", "").strip()
        final_name = form_name if form_name else ai_name
        if not final_name:
            final_name = "未知用户"
            
        logger.info(f"[{request_id}] 评估参数 - 最终姓名: {final_name}, 邮箱: {form_email}, 领域: {field}")
        
        # 如果表单提供了姓名，更新到提取信息中
        if form_name:
            extracted_info["name"] = form_name
        
        # 如果表单提供了邮箱，更新到提取信息中
        if form_email:
            extracted_info["email"] = form_email
        
        # 使用AI进行GTV评估
        logger.info(f"[{request_id}] 开始AI GTV评估")
        gtv_analysis = call_ai_for_gtv_assessment(extracted_info, field)
        
        logger.info(f"[{request_id}] GTV评估完成")
        
        # 评估完成后自动生成PDF
        pdf_file_path = None
        pdf_filename = None
        try:
            logger.info(f"[{request_id}] 开始自动生成PDF报告...")
            if generate_gtv_pdf_report:
                pdf_file_path = generate_gtv_pdf_report(gtv_analysis)
                pdf_filename = os.path.basename(pdf_file_path)
                logger.info(f"[{request_id}] PDF报告自动生成成功: {pdf_filename}")
            else:
                logger.warning(f"[{request_id}] PDF报告生成器未可用，跳过自动生成")
        except Exception as pdf_error:
            logger.error(f"[{request_id}] 自动生成PDF报告失败: {pdf_error}")
            # PDF生成失败不影响评估结果返回
        
        # 构建响应数据
        response_data = {
            "success": True,
            "gtvAnalysis": gtv_analysis,
            "message": f"GTV资格评估完成"
        }
        
        # 如果PDF生成成功，添加到响应中
        if pdf_file_path and pdf_filename:
            response_data["pdf_file_path"] = pdf_file_path
            response_data["pdf_filename"] = pdf_filename
            response_data["message"] = f"GTV资格评估完成，PDF报告已自动生成"
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"[{request_id}] GTV评估失败: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================================
# 错误处理
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    """404处理"""
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """500处理"""
    return jsonify({'error': 'Internal server error'}), 500


# ============================================================================
# 主程序
# ============================================================================

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5005))
    debug = os.getenv('DEBUG', 'true').lower() == 'true'
    
    print("")
    print("=" * 60)
    print("  GTV签证评估系统 - 统一API服务")
    print("=" * 60)
    print("")
    logger.info(f"🚀 启动GTV统一API服务")
    logger.info(f"   端口: {port}")
    logger.info(f"   调试模式: {debug}")
    logger.info(f"   包含服务:")
    logger.info(f"     - 评分分析 (/api/scoring/*)")
    logger.info(f"     - 文档分析 (/api/documents/*)")
    if COPYWRITING_ROUTES_AVAILABLE:
        logger.info(f"     - 项目管理 (/api/projects/*)")
        logger.info(f"     - 材料收集 (/api/material-collection/*)")
        logger.info(f"     - 内容提取 (/api/projects/*/extraction/*)")
        logger.info(f"     - 框架构建 (/api/projects/*/framework/*)")
        logger.info(f"     - 文件服务 (/api/files/*)")
    print("")
    print(f"  服务地址: http://localhost:{port}")
    print(f"  健康检查: http://localhost:{port}/health")
    print("")
    print("=" * 60)
    
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=debug,
        use_reloader=debug,
        allow_unsafe_werkzeug=True,
    )
