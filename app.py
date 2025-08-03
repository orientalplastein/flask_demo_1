import os
from urllib import request

import requests
from flask import Flask, render_template, session, g, redirect, url_for, jsonify,request
from flask_login import current_user

from models import User
import config
from exts import db, mail, login_manager, csrf, cors
from blueprints.QA_block import bp as qa_bp
from blueprints.UserLoginRegistration import bp as user_bp
from flask_migrate import Migrate
from sqlalchemy import text
app = Flask(__name__)
app.register_blueprint(user_bp)
app.register_blueprint(qa_bp)

# 绑定配置文件
app.config.from_object(config)

#数据库相关
db.init_app(app)
migrate = Migrate(app, db)
with app.app_context():
    with db.engine.connect() as conn:
        rs=conn.execute(text("select 1"))
        print(rs.fetchone())

# 邮箱相关
mail.init_app(app)

#hook函数/登录相关
login_manager.init_app(app)
login_manager.login_view = 'user_login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

#CSRF相关
csrf.init_app(app)

#CORS相关
cors.init_app(app,resources={r"/api/*": {"origins": "*"}})

# #AI生成相关
# ARK_API_KEY = os.getenv('ARK_API_KEY')
# ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'

@app.route('/')
def welcome():  # put application's code here# 手动检查登录状态并跳转
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    return render_template('welcome.html')

@app.route('/home', methods=['GET', 'POST'])
def home():
    if not current_user.is_authenticated:
        return redirect(url_for('welcome'))
    return render_template('homepage.html')


@app.route('/test')
def test():
    return render_template("qa.html")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
