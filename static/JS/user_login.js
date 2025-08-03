/**
 * 用户登录脚本
 * 功能：实现严格的用户名/密码验证，确保只有已注册用户才能登录
 * 版本：1.0.3（优化登录失败提示）
 */
$(document).ready(function() {
    // 初始化登录表单
    initLoginForm();
});

/**
 * 初始化登录表单
 */
function initLoginForm() {
    const form = $('#login-form');
    
    // 防止重复初始化
    if (form.data('initialized')) return;
    form.data('initialized', true);
    
    // 绑定表单提交事件
    form.on('submit', handleFormSubmit);
    
    // 绑定实时验证事件
    bindRealTimeValidation();
    
    // 加载记住的用户信息
    loadRememberedUser();
    
    console.log('登录表单初始化完成');
}

/**
 * 表单提交处理函数
 */
function handleFormSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // 前端表单验证
    if (!validateForm()) {
        console.log('表单验证失败');
        return;
    }
    
    // 获取表单数据
    const formData = {
        identifier: $('#identifier').val().trim(),
        password: $('#password').val(),
        remember: $('#remember-me').is(':checked'),
        csrf_token: $('meta[name="csrf-token"]').attr('content')
    };
    
    console.log('表单验证通过，发送登录请求:', formData.identifier);
    
    // 发送登录请求
    submitLoginRequest(formData)
        .then(response => {
            console.log('登录成功，准备跳转');
            handleLoginSuccess(response);
        })
        .catch(error => {
            console.error('登录请求错误:', error.message);
            showError('identifier', error.message);
        });
}

/**
 * 表单验证函数
 * @returns {boolean} 是否通过验证
 */
function validateForm() {
    let isValid = true;
    const identifier = $('#identifier').val().trim();
    const password = $('#password').val();
    
    // 清除所有错误消息
    $('.error-message').text('');
    
    // 验证用户名/邮箱
    if (!identifier) {
        showError('identifier', '请输入用户名或邮箱');
        isValid = false;
    } else if (!isValidIdentifier(identifier)) {
        showError('identifier', '用户名格式错误（3-20位，支持中文、字母、数字和下划线）');
        isValid = false;
    }
    
    // 验证密码
    if (!password) {
        showError('password', '请输入密码');
        isValid = false;
    } else if (password.length < 6 || password.length > 20) {
        showError('password', '密码长度必须在6-20个字符之间');
        isValid = false;
    }
    
    return isValid;
}

/**
 * 用户名/邮箱格式验证
 * @param {string} value - 输入值
 * @returns {boolean} 是否有效
 */
function isValidIdentifier(value) {
    // 邮箱格式正则
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // 先检查是否为邮箱格式
    if (emailRegex.test(value)) {
        return true;
    }
    
    // 不是邮箱格式则检查用户名格式
    return isValidUsername(value);
}

/**
 * 用户名格式验证（支持中文、字母、数字和下划线，3-20位）
 * @param {string} value - 用户名
 * @returns {boolean} 是否有效
 */
function isValidUsername(value) {
    // \p{L} 匹配任何语言的字母字符（包括中文）
    // \p{N} 匹配任何数字字符
    // _ 允许下划线
    const usernameRegex = /^[\p{L}\p{N}_]{3,20}$/u;
    return usernameRegex.test(value);
}

/**
 * 发送登录请求到服务器
 * @param {Object} data - 登录数据
 * @returns {Promise} 登录结果
 */
function submitLoginRequest(data) {
    return new Promise((resolve, reject) => {
        const submitBtn = $('#submit-btn');
        submitBtn.prop('disabled', true).text('登录中...');
        
        $.ajax({
            url: '/user/login',
            method: 'POST',
            data: data,
            dataType: 'json',  // 明确要求JSON响应
            timeout: 5000,
            success: function(response) {
                // 验证响应结构
                if (!response || typeof response !== 'object') {
                    throw new Error('无效的服务器响应格式');
                }
                
                if (response.success) {
                    resolve(response);
                } else {
                    // 从服务器错误消息中提取具体原因
                    const errorMsg = response.message || '登录失败';
                    // 统一显示"用户名或密码错误"，避免信息泄露
                    const userFriendlyMsg = '用户名或密码错误';
                    reject(new Error(userFriendlyMsg));
                }
            },
            error: function(xhr, status, error) {
                console.error('登录请求错误详情:', {
                    status: status,
                    error: error,
                    responseType: xhr.getResponseHeader('Content-Type'),
                    responsePreview: xhr.responseText.substring(0, 100)
                });
                
                // 详细错误分类处理
                let errorMessage = '登录失败，请稍后重试';
                
                if (status === 'parsererror') {
                    errorMessage = '服务器返回无效数据格式';
                } else if (status === 'timeout') {
                    errorMessage = '请求超时，请检查网络连接';
                } else if (xhr.status === 401 || xhr.status === 400) {
                    // 401未授权或400错误，统一显示用户名或密码错误
                    errorMessage = '用户名或密码错误';
                } else if (xhr.status === 500) {
                    errorMessage = '服务器内部错误';
                }
                
                reject(new Error(errorMessage));
            },
            complete: function() {
                // 恢复按钮状态
                submitBtn.prop('disabled', false).text('登录');
            }
        });
    });
}

/**
 * 处理登录成功
 * @param {Object} response - 服务器响应
 */
function handleLoginSuccess(response) {
    // 验证跳转URL
    if (!response.redirectUrl || typeof response.redirectUrl !== 'string') {
        showError('identifier', '无效的跳转地址');
        return;
    }
    
    // 处理记住我功能
    if (response.remember) {
        setCookie('remembered_user', response.identifier, 7);
    } else {
        deleteCookie('remembered_user');
    }
    
    // 显示成功消息并跳转
    showMessage('success', '登录成功！正在跳转...');
    
    // 延迟跳转，让用户看到成功消息
    setTimeout(() => {
        window.location.href = response.redirectUrl;
    }, 1500);
}

/**
 * 绑定实时验证事件
 */
function bindRealTimeValidation() {
    // 用户名/邮箱实时验证
    $('#identifier').on('input', function() {
        const value = $(this).val().trim();
        const errorEl = $('#identifier-error');
        
        if (!value) {
            errorEl.text('');
            return;
        }
        
        if (!isValidIdentifier(value)) {
            errorEl.text('用户名格式错误（3-20位，支持中文、字母、数字和下划线）');
        } else {
            errorEl.text('');
        }
    });
    
    // 密码实时验证
    $('#password').on('input', function() {
        const value = $(this).val();
        const errorEl = $('#password-error');
        
        if (!value) {
            errorEl.text('');
            return;
        }
        
        if (value.length < 6 || value.length > 20) {
            errorEl.text('密码长度必须在6-20个字符之间');
        } else {
            errorEl.text('');
        }
    });
}

/**
 * 加载记住的用户信息
 */
function loadRememberedUser() {
    const rememberedUser = getCookie('remembered_user');
    if (rememberedUser) {
        $('#identifier').val(rememberedUser);
        $('#remember-me').prop('checked', true);
        console.log('加载记住的用户:', rememberedUser);
    }
}

/**
 * 设置Cookie
 */
function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
}

/**
 * 获取Cookie
 */
function getCookie(name) {
    const nameEQ = `${name}=`;
    const cookies = document.cookie.split(';');
    
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        if (cookie.indexOf(nameEQ) === 0) {
            return decodeURIComponent(cookie.substring(nameEQ.length));
        }
    }
    return null;
}

/**
 * 删除Cookie
 */
function deleteCookie(name) {
    setCookie(name, '', -1);
}

/**
 * 显示错误消息
 */
function showError(field, message) {
    $(`#${field}-error`).text(message);
}

/**
 * 显示全局消息
 */
function showMessage(type, message) {
    const messageArea = $('#message-area');
    messageArea.removeClass('success error').addClass(type);
    messageArea.text(message).show();
    setTimeout(() => messageArea.fadeOut(1000), 3000);
}