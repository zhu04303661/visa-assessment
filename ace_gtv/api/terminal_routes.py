"""
终端 WebSocket 路由
"""

import logging
from flask import Blueprint, request, jsonify
from flask_socketio import emit, join_room, leave_room

logger = logging.getLogger(__name__)

# 创建 Blueprint（用于 REST API）
terminal_bp = Blueprint('terminal', __name__, url_prefix='/api/terminal')

# 终端服务实例引用
_terminal_service = None


def get_terminal_service():
    """获取终端服务实例"""
    global _terminal_service
    if _terminal_service is None:
        from services.terminal_service import get_terminal_service as get_service
        _terminal_service = get_service()
    return _terminal_service


def register_terminal_events(socketio):
    """注册终端相关的 SocketIO 事件"""
    
    @socketio.on('connect', namespace='/terminal')
    def handle_connect():
        """客户端连接"""
        logger.info(f"终端客户端连接: {request.sid}")
        emit('connected', {'sid': request.sid})
    
    @socketio.on('disconnect', namespace='/terminal')
    def handle_disconnect():
        """客户端断开"""
        logger.info(f"终端客户端断开: {request.sid}")
    
    @socketio.on('start_terminal', namespace='/terminal')
    def handle_start_terminal(data):
        """启动终端会话"""
        project_id = data.get('project_id')
        session_id = data.get('session_id') or request.sid
        cols = data.get('cols', 120)
        rows = data.get('rows', 30)
        
        if not project_id:
            emit('error', {'message': '缺少 project_id'})
            return
        
        logger.info(f"启动终端: project_id={project_id}, session_id={session_id}")
        
        try:
            # 获取项目工作空间路径
            from services.project_workspace_service import get_workspace_service
            workspace_service = get_workspace_service()
            
            # 检查工作空间是否存在
            if not workspace_service.workspace_exists(project_id):
                emit('error', {'message': f'项目工作空间不存在: {project_id}'})
                return
            
            cwd = str(workspace_service.get_workspace_path(project_id))
            
            # 加入房间
            join_room(session_id)
            
            # 创建输出回调
            def output_callback(text):
                socketio.emit('output', {'data': text}, room=session_id, namespace='/terminal')
            
            # 创建终端会话
            service = get_terminal_service()
            session = service.create_session(
                session_id=session_id,
                project_id=project_id,
                cwd=cwd,
                output_callback=output_callback,
                cols=cols,
                rows=rows,
            )
            
            emit('terminal_started', {
                'session_id': session_id,
                'project_id': project_id,
                'cwd': cwd,
            })
            
        except Exception as e:
            logger.error(f"启动终端失败: {e}", exc_info=True)
            emit('error', {'message': f'启动终端失败: {str(e)}'})
    
    @socketio.on('input', namespace='/terminal')
    def handle_input(data):
        """处理终端输入"""
        session_id = data.get('session_id') or request.sid
        input_data = data.get('data', '')
        
        service = get_terminal_service()
        success = service.write_input(session_id, input_data)
        
        if not success:
            emit('error', {'message': '发送输入失败，终端可能已关闭'})
    
    @socketio.on('resize', namespace='/terminal')
    def handle_resize(data):
        """调整终端大小"""
        session_id = data.get('session_id') or request.sid
        cols = data.get('cols', 120)
        rows = data.get('rows', 30)
        
        service = get_terminal_service()
        service.resize(session_id, cols, rows)
    
    @socketio.on('stop_terminal', namespace='/terminal')
    def handle_stop_terminal(data):
        """停止终端会话"""
        session_id = data.get('session_id') or request.sid
        
        service = get_terminal_service()
        service.close_session(session_id)
        
        leave_room(session_id)
        emit('terminal_stopped', {'session_id': session_id})


# REST API 端点
@terminal_bp.route('/status/<session_id>', methods=['GET'])
def get_terminal_status(session_id):
    """获取终端状态"""
    service = get_terminal_service()
    status = service.get_session_status(session_id)
    
    if not status:
        return jsonify({'error': '会话不存在'}), 404
    
    return jsonify(status)


@terminal_bp.route('/chat', methods=['POST'])
def claude_chat():
    """
    Claude Code CLI 聊天端点 - 同步 REST API
    
    POST /api/terminal/chat
    {
        "project_id": "项目ID",
        "user_message": "用户消息",
        "skill_name": "可选的技能名称",
        "mode": "可选的模式 (ask/agent)"
    }
    """
    try:
        try:
            from ace_gtv.services.claude_code_service import ClaudeCodeService
        except ImportError:
            from services.claude_code_service import ClaudeCodeService
        
        data = request.get_json()
        project_id = data.get('project_id')
        user_message = data.get('user_message')
        skill_name = data.get('skill_name')
        mode = data.get('mode', 'agent')  # 默认使用 agent 模式
        
        if not project_id:
            return jsonify({'error': '缺少 project_id'}), 400
        if not user_message:
            return jsonify({'error': '缺少 user_message'}), 400
        
        # 创建 Claude Code 服务实例
        claude_service = ClaudeCodeService()
        
        # 上下文信息
        context = {
            'project_id': project_id
        }
        
        # 收集所有输出
        response_parts = []
        for chunk in claude_service.execute_with_skill(
            prompt=user_message,
            skill_name=skill_name,
            context=context,
            stream=True,
            mode=mode
        ):
            response_parts.append(chunk)
        
        response_text = ''.join(response_parts).strip()
        
        return jsonify({
            'success': True,
            'response': response_text,
            'project_id': project_id
        })
        
    except Exception as e:
        logger.error(f"Claude chat 错误: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@terminal_bp.route('/stream-chat', methods=['POST'])
def claude_stream_chat():
    """
    Claude Code CLI 流式聊天端点 - SSE 流式响应
    
    POST /api/terminal/stream-chat
    {
        "project_id": "项目ID",
        "user_message": "用户消息",
        "skill_name": "可选的技能名称",
        "mode": "可选的模式 (ask/agent)"
    }
    """
    from flask import Response
    
    try:
        try:
            from ace_gtv.services.claude_code_service import ClaudeCodeService
        except ImportError:
            from services.claude_code_service import ClaudeCodeService
        
        data = request.get_json()
        project_id = data.get('project_id')
        user_message = data.get('user_message')
        skill_name = data.get('skill_name')
        mode = data.get('mode', 'agent')
        
        if not project_id:
            return jsonify({'error': '缺少 project_id'}), 400
        if not user_message:
            return jsonify({'error': '缺少 user_message'}), 400
        
        def generate():
            """生成 SSE 流"""
            claude_service = ClaudeCodeService()
            
            context = {
                'project_id': project_id
            }
            
            for chunk in claude_service.execute_with_skill(
                prompt=user_message,
                skill_name=skill_name,
                context=context,
                stream=True,
                mode=mode
            ):
                if chunk:
                    # SSE 格式
                    yield f"data: {chunk}\n\n"
            
            yield "data: [DONE]\n\n"
        
        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        )
        
    except Exception as e:
        logger.error(f"Claude stream chat 错误: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
