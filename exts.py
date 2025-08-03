from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from flask_cors import CORS

# 数据库
db = SQLAlchemy()

# 邮箱
mail = Mail()

#登录/用户管理
login_manager = LoginManager()

#CSRF
csrf = CSRFProtect()

#CORS
cors = CORS()