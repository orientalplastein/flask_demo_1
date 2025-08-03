import os
# 数据库配置
HOSTNAME = "127.0.0.1"
PORT = 3306
USERNAME = "root"
PASSWORD = "123456"
DATABASE = "flask_demo01"
SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{USERNAME}:{PASSWORD}@{HOSTNAME}/{DATABASE}?charset=utf8mb4"

# 邮箱配置
MAIL_SERVER = "smtp.163.com"
MAIL_USE_SSL = True
MAIL_PORT = 465
MAIL_USERNAME = "cg1334931062@163.com"
MAIL_PASSWORD = "NF2R8wfsB9Y9mL4H"
MAIL_DEFAULT_SENDER = "cg1334931062@163.com"

#cookie设置
SECRET_KEY = "dqdweasdzczxca"

#文件上传位置
UPLOAD_FOLDER = os.path.join('static', 'post_updateIMG')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# 允许的HTML标签，防止XSS攻击
ALLOWED_TAGS = ['br', 'p', 'em', 'strong']

#分页实现
POST_PER_PAGE = 10

#AI API相关
ARK_API_KEY = os.environ.get('ARK_API_KEY', '2dfb5434-6a04-450c-9f6b-5023bd4977b7')
API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'