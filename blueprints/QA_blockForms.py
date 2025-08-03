import wtforms
from flask_wtf import FlaskForm
from wtforms.validators import Email, Length, EqualTo, length, DataRequired
from models import ForumPost
from exts import db

class ForumPostForm(FlaskForm):
    title = wtforms.StringField(validators=[Length(min=1,max=100,message="标题格式错误"),DataRequired()])
    content = wtforms.TextAreaField(validators=[Length(min=1)])