from flask_login import UserMixin
from exts import db,mail
from datetime import datetime

class User(UserMixin,db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True,autoincrement=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(50), unique=True, nullable=False)
    join_time = db.Column(db.DateTime, nullable=False,default=datetime.now)
    avatar = db.Column(db.String(255),default='avatar/default_avatar1.jpg')
    signature = db.Column(db.Text,default="这家伙很懒，什么都没留下")

class EmailCaptcha(db.Model):
    __tablename__ = 'email_captcha'
    id = db.Column(db.Integer, primary_key=True,autoincrement=True)
    email = db.Column(db.String(50) , nullable=False)
    captcha = db.Column(db.String(50), nullable=False)

class ForumPost(db.Model):
    __tablename__ = 'forum_post'

    id = db.Column(db.Integer, primary_key=True,autoincrement=True)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    image_path = db.Column(db.String(400), nullable=True)
    create_time = db.Column(db.DateTime, nullable=False,default=datetime.now)

    # 外键
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    author = db.relationship('User',backref='forum_post')

class ForumPostComment(db.Model):
    __tablename__ = 'forum_post_comment'

    id = db.Column(db.Integer, primary_key=True,autoincrement=True)
    content = db.Column(db.Text, nullable=False)
    create_time = db.Column(db.DateTime, nullable=False,default=datetime.now)

    # 外键
    post_id = db.Column(db.Integer, db.ForeignKey('forum_post.id'))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    # 关系
    post = db.relationship('ForumPost',backref=db.backref('forum_post_comment',order_by=create_time.desc()))
    author = db.relationship('User',backref='forum_post_comment')