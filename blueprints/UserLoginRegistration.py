from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session, make_response
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_wtf.csrf import generate_csrf
from sqlalchemy.sql.functions import user
from models import User,EmailCaptcha
import random,string,re
from exts import mail, db
from flask_mail import Message
from .UserForms import UserRegisterForm,UserLoginForm
from werkzeug.security import generate_password_hash,check_password_hash
from sqlalchemy import or_


bp = Blueprint("UserLoginRegistration", __name__, url_prefix="/user")

@bp.route("/register", methods=["POST","GET"])
def user_register():
    if request.method == "GET":
        return render_template("user_register.html")
    else:
        form = UserRegisterForm(request.form)
        if form.validate():
            username = form.username.data
            password = form.password.data
            email = form.email.data
            # noinspection PyArgumentList
            new_user = User(email=email,username=username,password=generate_password_hash(password))
            db.session.add(new_user)
            db.session.commit()
            return render_template("register_success.html")
        else:
            print(form.errors)
            return "false"


@bp.route("/login", methods=["POST","GET"])
def user_login():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    if request.method == "GET":
        return render_template("user_login.html")
    else:
        try:
            # 支持JSON和表单两种数据格式
            if request.is_json:
                data = request.get_json()
            else:
                data = request.form

            # 获取并验证参数
            identifier = data.get('identifier', '').strip()  # 用户名或邮箱
            password = data.get('password', '')

            # 参数验证
            if not identifier or not password:
                return jsonify({
                    "success": False,
                    "message": "用户名和密码不能为空"
                }), 400

            # 查询用户（支持用户名或邮箱登录）
            user = User.query.filter(
                or_(
                    User.username == identifier,
                    User.email == identifier
                )
            ).first()

            # 验证密码
            if user and check_password_hash(user.password, password):
                # 登录成功，设置session
                # session['user_id'] = user.id
                login_user(user)
                # 返回成功响应
                return jsonify({
                    "success": True,
                    "redirectUrl": "/home"  # 登录成功后跳转的URL
                })
            else:
                # 登录失败
                return jsonify({
                    "success": False,
                    "message": "用户名或密码错误"
                }), 401

        except Exception as e:
            # 捕获异常
            return jsonify({
                "success": False,
                "message": "服务器内部错误，请稍后重试"
            }), 500

@bp.route("/logout")
def user_logout():
    if current_user.is_authenticated:
        logout_user()
        print("用户已成功登出")  # 调试用
    else:
        print("用户未登录，无需登出")  # 避免非登录用户访问登出路由时报错

    return redirect(url_for('welcome'))

@bp.route("/profile", methods=["POST","GET"])
def user_profile():
    if not current_user.is_authenticated:
        return redirect(url_for('welcome'))
    return render_template("user_profile.html")

@bp.route("/update_profile", methods=["POST"])
def update_profile():
    selected_avatar = request.form.get('avatar')
    new_signature = request.form.get('signature', '').strip()
    # 打印完整请求信息
    print("\n===== 更新请求详情 =====")
    print("当前用户ID:", current_user.id)
    print("提交的所有参数:", request.form)  # 确认是否有数据
    print("头像参数:", request.form.get('avatar'))  # 单独检查头像
    print("签名参数:", request.form.get('signature'))  # 单独检查签名
    # ... 原有验证逻辑 ...
    # 更新前状态
    print("更新前 - 头像:", current_user.avatar, "签名:", current_user.signature)
    # 执行更新
    current_user.avatar = 'avatar/'+selected_avatar
    current_user.signature = new_signature
    # 更新后未提交状态
    print("更新后(未提交) - 头像:", current_user.avatar, "签名:", current_user.signature)
    # 提交事务
    try:
        db.session.commit()

        print("事务提交成功")
        # 提交后立即查询数据库验证
        updated_user = User.query.get(current_user.id)
        print("数据库实际存储 - 头像:", updated_user.avatar, "签名:", updated_user.signature)
    except Exception as e:
        db.session.rollback()
        print(f"事务提交失败: {str(e)}")  # 捕获提交异常
    return jsonify({"status": "success",
                    "redirectUrl": url_for('home')})


@bp.route("/api/send-verification-code", methods=["POST"])
def mail_get():
    email = request.json.get("email")
    # 验证邮箱格式是否符合要求
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return jsonify({
            "success": False,
            "message": "请输入有效的邮箱地址"
        }), 400

    # 生成验证码
    captcha = ''.join(random.sample(string.digits, 4))
    print(captcha)

    db.session.add(EmailCaptcha(email=email,captcha=captcha))
    db.session.commit()

    expires_minutes = "∞"
    support_email = "cg1334931062@163.com"
    message = Message(subject="忘书Echo账户注册", recipients=[email], body=f"你的验证码是 {captcha}",
                      html=render_template("email_send_to_user.html", captcha=captcha, expires_minutes=expires_minutes,
                                           support_email=support_email))
    try:
        mail.send(message)
        return jsonify({
            "success": True,
            "message": "验证码已发送至您的邮箱"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "邮件发送失败，请稍后重试"
        }), 500

@bp.route("/api/check_username", methods=["POST","GET"])
def check_username():
    username = request.json.get('username', '').strip()
    print(username)
    # 1. 基础验证（与前端保持一致）
    if len(username) < 2 or len(username) > 8:
        return jsonify({
            "valid": False,
            "message": "用户名长度必须在2-8个字符之间"
        })
    # 2. 数据库查询检查重复性
    exists = User.query.filter_by(username=username).first() is not None
    return jsonify({
        "valid": not exists,  # True表示可用，False表示已存在
        "message": "用户名可用" if not exists else "该用户名已被注册"
    })

@bp.route("/api/check_email", methods=["POST","GET"])
def check_email():
    email = request.json.get('email', '').strip()
    print(email)
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    # 基础验证（与前端保持一致）
    if not re.match(email_regex, email):
        return jsonify({
            "valid": False,
            "message": "请输入有效的电子邮箱地址"
        })
    # 2. 数据库查询检查重复性
    exists = User.query.filter_by(email=email).first() is not None
    return jsonify({
        "valid": not exists,  # True表示可用，False表示已存在
        "message": "邮箱可用" if not exists else "该邮箱已被注册"
    })

@bp.route("/api/verify-code", methods=["POST","GET"])
def verify_code():
    email = request.json.get('email', '').strip()
    user_code = request.json.get('code', '').strip()
    print(email)
    latest_captcha = EmailCaptcha.query.filter_by(email=email) \
        .order_by(EmailCaptcha.id.desc()) \
        .first()
    print(latest_captcha)
    if not latest_captcha:
        return jsonify({
            'success': False,
            'valid': False,
            'message': '未找到该邮箱的验证码记录，请先获取验证码'
        }), 400
    # 验证验证码
    if latest_captcha.captcha != user_code:
        return jsonify({
            'success': False,
            'valid': False,
            'message': '验证码错误'
        }), 400
    # 修复：添加验证成功的返回语句
    return jsonify({
        'success': True,
        'valid': True,
        'message': '验证码验证成功'
    }), 200

@bp.route('/api/csrf-token', methods=['GET'])
def get_csrf_token():
    response = make_response(jsonify({"status": "success"}))
    response.set_cookie('csrf_token', generate_csrf(), secure=False, samesite='Lax')
    return response