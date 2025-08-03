/**
 * 使用jQuery实现的注册表单验证脚本
 * 功能：添加邮箱验证码一致性检验功能
 */
$(document).ready(function() {
    // 全局验证状态管理对象
    const duplicateValidation = {
        username: { valid: null, checking: false },
        email: { valid: null, checking: false },
        code: { valid: null, checking: false }
    };

    /**
     * 显示错误消息
     * @param {string} fieldId - 字段ID
     * @param {string} message - 错误消息
     * @param {boolean} isTemporary - 是否为临时消息
     */
    function showError(fieldId, message, isTemporary = false) {
        // const $errorElement = $(`#${fieldId}Error`);
        //
        // if ($errorElement.length && $errorElement.hasClass('error-message')) {
        //     $errorElement.text(message).show();
        //
        //     if (!isTemporary) {
        //         const $field = $(`#${fieldId}`);
        //         if ($field.length) {
        //             $field.addClass('is-invalid');
        //
        //             $field.off('input.clearError').on('input.clearError', function() {
        //                 $(this).removeClass('is-invalid');
        //                 $errorElement.text('').hide();
        //             });
        //         }
        //     }
        // } else {
        //     console.error(`未找到ID为${fieldId}Error的错误消息元素`);
        //     if (!isTemporary) alert(message);
        //     // if (!isTemporary) showError('email_verify_code', message)
        // }
        const $errorElement = $(`#${fieldId}Error`);

        // 检查元素是否存在
        if (!$errorElement.length) {
            console.error(`未找到ID为${fieldId}Error的错误消息元素，请检查HTML结构`);
            // 不进行递归调用，避免无限循环
            if (!isTemporary) {
                // 可以考虑创建临时错误元素或使用通用错误区域
                alert(`错误: ${message}`);
            }
            return;
        }

        if ($errorElement.hasClass('error-message')) {
            $errorElement.text(message).show();

            if (!isTemporary) {
                const $field = $(`#${fieldId}`);
                if ($field.length) {
                    $field.addClass('is-invalid');

                    $field.off('input.clearError').on('input.clearError', function() {
                        $(this).removeClass('is-invalid');
                        $errorElement.text('').hide();
                    });
                }
            }
        }
    }

    // 在user_register.js中添加CSRF令牌获取函数
    let csrfToken = '';

    // 获取CSRF令牌
    function getCsrfToken() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: 'api/csrf-token',
                type: 'GET',
                xhrFields: {
                    withCredentials: true  // 允许跨域请求携带Cookie
                },
                success: function(response) {
                    // 从Cookie中获取CSRF令牌
                    csrfToken = getCookie('csrf_token');
                    resolve();
                },
                error: function(error) {
                    console.error('获取CSRF令牌失败:', error);
                    reject('获取安全令牌失败，请刷新页面重试');
                }
            });
        });
    }

    // 辅助函数：从Cookie中获取值
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
    }

    /**
     * 发送验证码AJAX请求
     * @param {string} email - 电子邮箱地址
     * @returns {Promise} - jQuery Deferred Promise
     */
    function sendVerificationCode(email) {
        return $.Deferred(async function (defer) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                defer.reject('请输入有效的电子邮箱地址');
                return;
            }

            if (!csrfToken) {
                await getCsrfToken();
            }

            $.ajax({
                url: '/user/api/send-verification-code',
                method: 'POST',
                contentType: 'application/json',
                headers: {
                    'X-CSRFToken': csrfToken  // 添加CSRF令牌
                },
                data: JSON.stringify({email: email}),
                timeout: 30000
            })
                .done(function (response) {
                    if (response && response.success) {
                        defer.resolve(response.message || '验证码已发送至您的邮箱，请查收');
                    } else {
                        defer.reject(response ? response.message : '验证码发送失败');
                    }
                })
                .fail(function (xhr, status, error) {
                    if (status === 'timeout') {
                        defer.reject('请求超时，请检查网络连接');
                    } else if (xhr.status === 404) {
                        defer.reject('后端接口未找到，请检查URL是否正确');
                    } else if (xhr.status === 500) {
                        defer.reject('服务器错误，请稍后重试');
                    } else {
                        defer.reject(error || '发送请求失败，请稍后重试');
                    }
                });
        }).promise();
    }

    /**
     * 验证验证码一致性
     * @param {string} email - 电子邮箱地址
     * @param {string} code - 验证码
     * @returns {Promise} 验证结果Promise
     */
    function verifyCode(email, code) {
        return new Promise(function(resolve, reject) {
            // 基础验证
            if (!code) {
                reject('请输入验证码');
                return;
            }
            
            if (code.length !== 4 || !/^\d{4}$/.test(code)) {
                reject('验证码必须是4位数字');
                return;
            }

            duplicateValidation.code.checking = true;
            showError('email_verify_code', '验证验证码...', true);

            $.ajax({
                url: '/user/api/verify-code',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ 
                    email: email,
                    code: code 
                }),
                success: function(response) {
                    duplicateValidation.code = {
                        valid: response.valid,
                        checking: false
                    };
                    if (!response.valid) {
                        showError('email_verify_code', response.message || '验证码错误');
                        reject(response.message || '验证码错误');
                    } else {
                        $(`#email_verify_codeError`).text('').hide();
                        $('#email_verify_code').removeClass('is-invalid');
                        resolve(true);
                    }
                },
                error: function(xhr, status, error) {
                    duplicateValidation.code = {
                        valid: null,
                        checking: false
                    };
                    let errorMsg = '验证码验证失败';
                    if (xhr.status === 405) {
                        errorMsg += '（服务器不允许此请求方法）';
                    } else if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMsg = xhr.responseJSON.message;
                    } else {
                        errorMsg += '：' + error;
                    }
                    showError('email_verify_code', errorMsg);
                    reject(errorMsg);
                }
            });
        });
    }

    /**
     * 检查用户名重复性
     * @param {string} username - 用户名
     * @returns {Promise} 验证结果Promise
     */
    function checkUsernameDuplicate(username) {
        return new Promise(function(resolve, reject) {
            if (username.length < 2 || username.length > 8) {
                reject('用户名长度必须在2-8个字符之间');
                return;
            }

            duplicateValidation.username.checking = true;
            showError('username', '检查用户名可用性...', true);

            $.ajax({
                url: '/user/api/check_username',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ username: username }),
                success: function(response) {
                    duplicateValidation.username = {
                        valid: response.valid,
                        checking: false
                    };
                    if (!response.valid) {
                        showError('username', response.message || '用户名已被使用');
                        reject(response.message || '用户名已被使用');
                    } else {
                        $(`#usernameError`).text('').hide();
                        $('#username').removeClass('is-invalid');
                        resolve(true);
                    }
                },
                error: function(xhr, status, error) {
                    duplicateValidation.username = {
                        valid: null,
                        checking: false
                    };
                    let errorMsg = '用户名验证失败';
                    if (xhr.status === 405) {
                        errorMsg += '（服务器不允许此请求方法）';
                    } else if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMsg = xhr.responseJSON.message;
                    } else {
                        errorMsg += '：' + error;
                    }
                    showError('username', errorMsg);
                    reject(errorMsg);
                }
            });
        });
    }

    /**
     * 检查邮箱重复性
     * @param {string} email - 邮箱地址
     * @returns {Promise} 验证结果Promise
     */
    function checkEmailDuplicate(email) {
        return new Promise(function(resolve, reject) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                reject('请输入有效的电子邮箱地址');
                return;
            }

            duplicateValidation.email.checking = true;
            showError('email', '检查邮箱可用性...', true);

            $.ajax({
                url: '/user/api/check_email',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ email: email }),
                success: function(response) {
                    duplicateValidation.email = {
                        valid: response.valid,
                        checking: false
                    };
                    if (!response.valid) {
                        showError('email', response.message || '邮箱已被注册');
                        reject(response.message || '邮箱已被注册');
                    } else {
                        $(`#emailError`).text('').hide();
                        $('#email').removeClass('is-invalid');
                        resolve(true);
                    }
                },
                error: function(xhr, status, error) {
                    duplicateValidation.email = {
                        valid: null,
                        checking: false
                    };
                    let errorMsg = '邮箱验证失败';
                    if (xhr.status === 405) {
                        errorMsg += '（服务器不允许此请求方法）';
                    } else if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMsg = xhr.responseJSON.message;
                    } else {
                        errorMsg += '：' + error;
                    }
                    showError('email_verify_code', errorMsg);
                    reject(errorMsg);
                }
            });
        });
    }

    /**
     * 发送验证码按钮点击事件处理
     */
    $('#sendVerifyCodeBtn').on('click', function() {
        const $sendBtn = $(this);
        const $emailInput = $('#email');
        const email = $emailInput.val().trim();
        let countdownInterval = null;
        const countdownSeconds = 60;
        let remainingSeconds = countdownSeconds;

        // 清除之前的错误状态
        $emailInput.removeClass('is-invalid');
        $(`#emailError`).text('').hide();

        // 邮箱输入验证
        if (!email) {
            showError('email', '请输入电子邮箱');
            return;
        }

        // 邮箱格式验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError('email', '请输入有效的电子邮箱地址');
            return;
        }

        // 禁用按钮防止重复点击
        $sendBtn.prop('disabled', true).text('发送中...');

        // 发送验证码
        sendVerificationCode(email)
            .done(function(message) {
                if (countdownInterval) clearInterval(countdownInterval);
                
                remainingSeconds = countdownSeconds;
                $sendBtn.text(`${remainingSeconds}s后重发`);

                const $messageArea = $('#messageArea');
                if ($messageArea.length) {
                    $messageArea.html(`<div class="alert alert-info">${message}</div>`);
                } else {
                    alert(message);
                }

                countdownInterval = setInterval(function() {
                    remainingSeconds--;
                    
                    if (remainingSeconds > 0) {
                        $sendBtn.text(`${remainingSeconds}s后重发`);
                    } else {
                        clearInterval(countdownInterval);
                        $sendBtn.prop('disabled', false).text('发送验证码');
                    }
                }, 1000);
            })
            .fail(function(error) {
                $sendBtn.prop('disabled', false).text('发送验证码');
                showError('email', error);
                
                if (countdownInterval) clearInterval(countdownInterval);
            });
    });

    /**
     * 表单提交事件处理
     */
    $('#registerForm').on('submit', function(e) {
        e.preventDefault();
        const $form = $(this);
        let isValid = true;
        
        // 获取表单字段值
        const username = $('#username').val().trim();
        const email = $('#email').val().trim();
        const emailVerifyCode = $('#email_verify_code').val().trim();
        const password = $('#password').val();
        const confirmPassword = $('#confirm_password').val();
        
        // 重置所有错误消息
        $('.error-message').text('').hide();
        $('.form-control').removeClass('is-invalid');

        // 基础格式验证
        // 用户名验证
        if (username.length < 2 || username.length > 8) {
            isValid = false;
            showError('username', '用户名长度必须在2-8个字符之间');
        }
        
        // 邮箱格式验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            isValid = false;
            showError('email', '请输入有效的电子邮箱地址');
        }
        
        // 密码强度验证
        if (password.length < 8) {
            isValid = false;
            showError('password', '密码长度不能少于8个字符');
        }
        
        // 如果基础验证失败，显示错误
        if (!isValid) {
            const firstErrorField = $('.is-invalid').first();
            if (firstErrorField.length) {
                firstErrorField.focus();
                $('html, body').animate({
                    scrollTop: firstErrorField.offset().top - 100
                }, 300);
            }
            return;
        }

        // 基础验证通过，开始多步验证流程
        const $submitBtn = $form.find('button[type="submit"]');
        const originalBtnText = $submitBtn.text();
        $submitBtn.prop('disabled', true).text('验证中...');

        // 验证流程：验证码验证 → 用户名验证 → 邮箱验证
        verifyCode(email, emailVerifyCode)
            .then(() => {
                // 验证码验证通过，进行用户名验证
                return checkUsernameDuplicate(username);
            })
            .then(() => {
                // 用户名验证通过，进行邮箱验证
                return checkEmailDuplicate(email);
            })
            .then(() => {
                // 所有验证通过，提交表单
                $submitBtn.text('提交中...');
                $form.get(0).submit();
            })
            .catch(function(error) {
                // 验证失败，恢复按钮状态
                $submitBtn.prop('disabled', false).text(originalBtnText);
                
                // 滚动到第一个错误字段
                const firstErrorField = $('.is-invalid').first();
                if (firstErrorField.length) {
                    firstErrorField.focus();
                    $('html, body').animate({
                        scrollTop: firstErrorField.offset().top - 100
                    }, 300);
                }
            });
    });
});