import wtforms
from wtforms.validators import Email, Length, EqualTo, length, DataRequired
from models import User,EmailCaptcha
from exts import db

class UserRegisterForm(wtforms.Form):
    email = wtforms.StringField(validators=[Email(message="邮箱格式错误！")])
    email_verify_code = wtforms.StringField(validators=[Length(min=4 , max=4,message="验证码长度错误")]) #需和HTML中for、id、name名称一致
    username = wtforms.StringField(validators=[Length(min=3 , max=20,message="用户名格式错误")])
    password = wtforms.PasswordField(validators=[Length(min=6 , max=20,message="密码格式错误")])
    confirm_password = wtforms.PasswordField(validators=[EqualTo("password",message="两次密码输入不一致！")])  #需和HTML中for、id、name名称一致

    def validate_email(self,field):
        if User.query.filter_by(email=field.data).first():
            raise wtforms.ValidationError(message="该邮箱已被注册")

    def validate_captcha(self,field):
        email_verify_code = field.data
        email = self.email.data
        captcha_record = EmailCaptcha.query.filter_by(email=email,captcha=email_verify_code).order_by(EmailCaptcha.id.desc()).first()
        if not captcha_record:
            raise wtforms.ValidationError(message="验证码错误")
        else:
            db.session.delete(EmailCaptcha.query.filter_by(email=email,captcha=email_verify_code).first())
            db.session.commit()

class UserLoginForm(wtforms.Form):
    identifier = wtforms.StringField(validators=[DataRequired(message="请输入用户名或邮箱")])
    # email = wtforms.StringField(validators=[Email(message="邮箱格式错误！")])
    # username = wtforms.StringField(validators=[DataRequired(message="请输入用户名或邮箱")])
    password = wtforms.PasswordField(validators=[Length(min=6, max=20, message="密码格式错误")])