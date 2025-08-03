import math
import os
import re
import uuid
import requests

from bleach import clean
from flask import Blueprint, render_template, request, url_for, redirect, jsonify, current_app, make_response, json
from flask_login import current_user
from flask_wtf.csrf import generate_csrf
from werkzeug.utils import secure_filename

import app
from config import UPLOAD_FOLDER, ALLOWED_TAGS, API_URL, ARK_API_KEY
from models import ForumPost, ForumPostComment
from exts import db
from blueprints.QA_blockForms import ForumPostForm


# 确保statics/post_updateIMG文件夹存在，如果不存在则创建
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # 添加exist_ok=True避免目录已存在时出错
    os.chmod(UPLOAD_FOLDER, 0o755)

def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

#AI API相关
ARK_API_KEY = os.getenv('ARK_API_KEY')
ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'

bp = Blueprint("QA", __name__, url_prefix="/QA")

@bp.route("/page")
def qa_index():
    page = request.args.get("page", 1, type=int)

    post_per_page = current_app.config["POST_PER_PAGE"]

    total_posts = ForumPost.query.count()
    total_pages = math.ceil(total_posts / post_per_page)

    if page <= 1:
        page = 1
    elif page > total_pages > 0:
        page = total_pages

    posts=ForumPost.query.order_by(ForumPost.create_time.desc()).paginate(page=page, per_page=post_per_page, error_out=False)
    return render_template("qa.html", posts=posts , page=page, total_pages=total_pages)

@bp.route("/posts/<int:post_id>")
def post_detail(post_id):
    post_select = ForumPost.query.get(post_id)
    qa_comments = ForumPostComment.query.filter_by(post_id=post_id).all()
    return render_template("qa_details.html", post=post_select, comments=qa_comments)

@bp.route("/post", methods=["POST","GET"])
def post():
    if not current_user.is_authenticated:
        return redirect(url_for('welcome'))
    if request.method == "GET":
        return render_template("qa_post.html")
    else:
        form = ForumPostForm(request.form)
        if form.validate():
            title = form.title.data
            content = form.content.data

            # 处理图片上传
            image_path = None
            if 'image' in request.files:
                file = request.files['image']
                # 如果用户没有选择文件，浏览器也会提交一个空的part
                if file.filename == '':
                    pass
                elif file and allowed_file(file.filename):
                    # 生成唯一文件名
                    filename = secure_filename(file.filename)
                    # 使用UUID确保文件名唯一
                    unique_filename = str(uuid.uuid4()) + '.' + filename.rsplit('.', 1)[1].lower()
                    # 修改：保存文件到statics/post_updateIMG目录
                    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
                    file.save(file_path)
                    # 修改：存储statics/post_updateIMG目录相对路径到数据库
                    image_path = 'post_updateIMG/' + unique_filename

            paragraphs = re.split(r'\n\s*\n', content)  # 按一个或多个空行分割段落
            formatted_paragraphs = []

            for para in paragraphs:
                if para.strip():  # 跳过空段落
                    # 处理段内换行
                    formatted_para = re.sub(r'\n', '<br>', para)
                    formatted_paragraphs.append(f'<p>{formatted_para}</p>')

            # 组合所有段落，得到最终HTML内容
            formatted_content = '\n'.join(formatted_paragraphs)

            # 安全过滤：只保留允许的HTML标签
            safe_content = clean(
                formatted_content,
                tags=ALLOWED_TAGS,
                strip=True  # 移除不允许的标签，而不是转义
            )

            # 创建帖子记录，包含图片路径
            forum_post = ForumPost(
                title=title,
                content=safe_content,
                author_id=current_user.id,
                image_path=image_path  # 假设模型有image_path字段
            )
            db.session.add(forum_post)
            db.session.commit()

            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({"status": "success", "message": "帖子发布成功"})
            else:
                return redirect(url_for('home'))
        else:
            print(form.errors)
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({"status": "error", "errors": form.errors}), 400
            else:
                return render_template("qa_post.html")

@bp.route("/api/add_comment", methods=["POST","GET"])
def add_comment():
    """创建新评论"""
    try:
        # 获取JSON数据
        data = request.get_json()
        content = data.get('content', '').strip()
        post_id = data.get('post_id')

        # 验证数据
        if not content:
            return jsonify({
                'success': False,
                'error': '评论内容不能为空'
            }), 400

        if not post_id:
            return jsonify({
                'success': False,
                'error': '文章ID不能为空'
            }), 400

        # 验证文章是否存在
        post = ForumPost.query.get(post_id)
        if not post:
            return jsonify({
                'success': False,
                'error': '指定文章不存在'
            }), 404

        # 处理换行符：将\n转换为<br>标签
        # 先按空行分割段落，再处理段内换行
        paragraphs = re.split(r'\n\s*\n', content)  # 按一个或多个空行分割段落
        formatted_paragraphs = []

        for para in paragraphs:
            if para.strip():  # 跳过空段落
                # 处理段内换行
                formatted_para = re.sub(r'\n', '<br>', para)
                formatted_paragraphs.append(f'<p>{formatted_para}</p>')

        # 组合所有段落，得到最终HTML内容
        formatted_content = '\n'.join(formatted_paragraphs)

        # 安全过滤：只保留允许的HTML标签
        safe_content = clean(
            formatted_content,
            tags=ALLOWED_TAGS,
            strip=True  # 移除不允许的标签，而不是转义
        )


        # 创建新评论
        new_comment = ForumPostComment(
            content=safe_content,
            post_id=post_id,
            user_id=current_user.id,
            # create_time=datetime.datetime.now()
        )

        # 保存到数据库
        db.session.add(new_comment)
        db.session.commit()

        # 构建返回数据
        return jsonify({
            'success': True,
            'comment': {
                'id': new_comment.id,
                'content': new_comment.content,
                'create_time': new_comment.create_time.strftime('%Y-%m-%d %H:%M'),
                'user_id': new_comment.user_id,
                'post_id': new_comment.post_id,
                'author': {
                    'id': current_user.id,
                    'username': current_user.username,
                    'avatar': current_user.avatar  # 假设User模型有avatar字段
                }
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"评论提交失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': '服务器错误，评论提交失败'
        }), 500

@bp.route("/api/search")
def search():
    page = request.args.get("page", 1, type=int)
    search_keyword = request.args.get("sp")
    post_per_page = current_app.config["POST_PER_PAGE"]

    searched_posts = ForumPost.query.filter( ForumPost.title.contains(search_keyword)).all()
    total_posts = len(searched_posts)

    total_pages = math.ceil(total_posts / post_per_page)

    if page <= 1:
        page = 1
    elif page > total_pages > 0:
        page = total_pages

    posts = ForumPost.query.filter(
        ForumPost.title.contains(search_keyword)
    ).paginate(page=page, per_page=post_per_page, error_out=False)

    return render_template("qa.html", posts=posts, page=page, total_pages=total_pages)

@bp.route("/api/ai-write", methods=["POST"])
def ai_write():
    try:
        # 获取前端发送的标题
        data = request.get_json()
        title = data.get('title', '').strip()

        # 验证输入
        if not title:
            return jsonify({'message': '请提供有效的标题'}), 400

        # 验证API密钥
        if not ARK_API_KEY:
            return jsonify({'message': 'API密钥未配置，请检查.env文件'}), 500

        # 构造API请求头
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {ARK_API_KEY}'
        }

        # 构造API请求体 - 简化版
        payload = {
            "model": "doubao-seed-1-6-flash-250715",
            "messages": [
                {
                    "role": "user",
                    "content": [{"type": "text", "text": f"根据标题内容进行相关创作，风格不做限定，字数限定为500子左右——{title}；生成的内容每个段落（包括首段）有首行缩进（1制表符），确保可读性和美观"}]
                }
            ]
        }

        # 发送请求到火山方舟API
        try:
            response = requests.post(ARK_API_URL, json=payload, headers=headers, timeout=30)
            response_text = response.text
            response.raise_for_status()  # 抛出HTTP错误状态码
        except Exception as e:
            return jsonify({
                'message': f'API请求失败: {str(e)}',
                'status_code': response.status_code if 'response' in locals() else None,
                'raw_response': response_text[:1000] if 'response_text' in locals() else None
            }), 503

        # 解析响应 - 适配字符串类型的content
        try:
            result = json.loads(response_text)

            # 验证基本结构
            if not isinstance(result, dict) or 'choices' not in result or not isinstance(result['choices'], list):
                return jsonify({
                    'message': 'AI服务返回格式错误: 缺少choices数组',
                    'raw_response': response_text[:1000]
                }), 500

            if len(result['choices']) == 0:
                return jsonify({'message': 'AI服务未返回结果'}), 500

            # 提取生成的内容（直接获取字符串类型的content）
            generated_content = result['choices'][0]['message'].get('content', '')
            if not generated_content:
                return jsonify({'message': 'AI服务返回空内容'}), 500

            # 直接返回字符串内容
            return jsonify({'content': generated_content})

        except json.JSONDecodeError:
            return jsonify({
                'message': 'AI服务返回无效的JSON',
                'raw_response': response_text[:1000]
            }), 500
        except Exception as e:
            return jsonify({
                'message': f'解析响应失败: {str(e)}',
                'error_type': type(e).__name__,
                'raw_response': response_text[:1000]
            }), 500

    except Exception as e:
        return jsonify({'message': f'服务器错误: {str(e)}'}), 500

@bp.route('/api/csrf-token', methods=['GET'])
def get_csrf_token():
    response = make_response(jsonify({"status": "success"}))
    response.set_cookie('csrf_token', generate_csrf(), secure=False, samesite='Lax')
    return response