/**
 * 使用jQuery实现的注册表单验证脚本
 * 功能：添加邮箱验证码一致性检验功能
 * 修复说明：解决CSRF令牌问题及验证码发送功能失效问题，2025-08-04
 */
$(document).ready(async function() {
    // CSRF令牌存储变量 - 确保在所有函数前声明
    let csrfToken = '';

    // 全局验证状态管理对象
    const duplicateValidation = {
        username: { valid: null, checking: false },
        email: { valid: null, checking: false },
        email_verify_code: { valid: null, checking: false }
    };

    // 页面加载时立即获取CSRF令牌
    try {
        await getCsrfToken();
        console.log('CSRF令牌已准备就绪');
        // 初始化表单提交监听
        initFormSubmitListener();
    } catch (error) {
        showError('global', error);
    }

    /**
     * 显示错误消息
     * @param {string} fieldId - 字段ID
     * @param {string} message - 错误消息
     * @param {boolean} isTemporary - 是否为临时消息
     */
    function showError(fieldId, message, isTemporary = false) {
        const $errorElement = $(`#${fieldId}Error`);

        if (!$errorElement.length) {
            console.error(`未找到ID为${fieldId}Error的错误消息元素，请检查HTML结构`);
            if (!isTemporary) {
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

    function showGlobalMessage(message, type = 'info') {
        const $message = $('<div class="global-message alert" style="position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:15px;z-index:10000;"></div>')
            .text(message)
            .addClass(type === 'error' ? 'alert-danger' : 'alert-success');

        $('body').append($message);

        setTimeout(() => {
            $message.fadeOut(500, () => $message.remove());
        }, 3000);
    }

    /**
     * 获取CSRF令牌
     */
    function getCsrfToken() {
        return new Promise((resolve, reject) => {
            // 尝试直接从Cookie获取（优先）
            csrfToken = getCookie('csrftoken') || getCookie('csrf_token');

            if (csrfToken) {
                console.log('从Cookie获取CSRF令牌成功');
                resolve();
                return;
            }

            // 若Cookie中无令牌，则通过API获取
            $.ajax({
                url: '/user/api/csrf-token',
                type: 'GET',
                xhrFields: {
                    withCredentials: true
                },
                success: function(response) {
                    csrfToken = response.csrf_token || getCookie('csrftoken') || getCookie('csrf_token');
                    if (csrfToken) {
                        console.log('从API获取CSRF令牌成功');
                        resolve();
                    } else {
                        reject('获取CSRF令牌失败：服务器未返回有效令牌');
                    }
                },
                error: function(xhr, status, error) {
                    console.error('获取CSRF令牌失败:', {
                        status: status,
                        error: error,
                        response: xhr.responseText
                    });
                    reject(`获取安全令牌失败(${status})，请刷新页面重试`);
                }
            });
        });
    }

    /**
     * 辅助函数：从Cookie中获取值
     */
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
    }

    /**
     * AJAX请求封装（统一处理CSRF令牌）
     */
    function ajaxWithCsrf(url, options = {}) {
        return new Promise(async (resolve, reject) => {
            // 确保CSRF令牌已准备就绪
            if (!csrfToken) {
                try {
                    await getCsrfToken();
                } catch (error) {
                    reject(error);
                    return;
                }
            }

            // 默认选项
            const defaultOptions = {
                method: 'GET',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                },
                xhrFields: {
                    withCredentials: true
                },
                timeout: 30000
            };

            // 合并选项
            const requestOptions = { ...defaultOptions, ...options };

            // 处理数据
            if (requestOptions.data && requestOptions.contentType !== 'multipart/form-data') {
                requestOptions.data = JSON.stringify(requestOptions.data);
            }

            console.log(`发送请求: ${requestOptions.method} ${url}`, {
                headers: requestOptions.headers,
                data: requestOptions.data
            });

            // 发送请求
            $.ajax(url, requestOptions)
                .done(response => {
                    console.log(`请求成功: ${url}`, response);
                    resolve(response);
                })
                .fail((xhr, status, error) => {
                    console.error(`请求失败: ${url}`, {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        response: xhr.responseJSON || xhr.responseText,
                        error: error
                    });

                    // 处理403 CSRF错误
                    if (xhr.status === 403 && xhr.responseJSON?.error === 'CSRF token missing or incorrect') {
                        csrfToken = '';
                        try {
                            getCsrfToken().then(() => {
                                requestOptions.headers['X-CSRFToken'] = csrfToken;
                                $.ajax(url, requestOptions).done(resolve).fail(reject);
                            }).catch(refreshError => {
                                reject('CSRF令牌验证失败，请刷新页面重试');
                            });
                        } catch (refreshError) {
                            reject('CSRF令牌验证失败，请刷新页面重试');
                        }
                    } else {
                        // 构建结构化错误信息
                        const errorInfo = {
                            status: xhr.status,
                            statusText: xhr.statusText,
                            message: xhr.responseJSON?.message || error || '未知错误'
                        };
                        reject(errorInfo);
                    }
                });
        });
    }

    /**
     * 发送验证码AJAX请求（修复：统一使用async/await，移除Deferred）
     * @param {string} email - 电子邮箱地址
     * @returns {Promise} - 返回验证码发送结果
     */
    async function sendVerificationCode(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('请输入有效的电子邮箱地址');
        }

        try {
            const response = await ajaxWithCsrf('/user/api/send-verification-code', {
                method: 'POST',
                data: { email: email }
            });

            if (response && response.success) {
                return response.message || '验证码已发送至您的邮箱，请查收';
            } else {
                throw new Error(response ? response.message : '验证码发送失败');
            }
        } catch (error) {
            // 错误信息结构化处理
            let errorMsg = '发送验证码失败';
            if (error.status) {
                errorMsg += ` (${error.status}): ${error.message}`;

                // 根据HTTP状态码提供更具体的错误提示
                switch(error.status) {
                    case 404:
                        errorMsg += '，请检查后端接口是否存在';
                        break;
                    case 500:
                        errorMsg += '，服务器内部错误，请稍后重试';
                        break;
                    case 400:
                        errorMsg += '，请求参数错误';
                        break;
                }
            } else {
                errorMsg = error.message || errorMsg;
            }

            throw new Error(errorMsg);
        }
    }

    /**
     * 验证验证码一致性
     * @param {string} email - 电子邮箱地址
     * @param {string} email_verify_code - 验证码
     * @returns {Promise} 验证结果Promise
     */
    async function verifyCode(email, email_verify_code) {
        // 基础验证
        if (!email_verify_code) {
            throw new Error('请输入验证码');
        }

        if (email_verify_code.length !== 4 || !/^\d{4}$/.test(email_verify_code)) {
            throw new Error('验证码必须是4位数字');
        }

        duplicateValidation.email_verify_code.checking = true;
        showError('email_verify_code', '验证验证码...', true);

        try {
            const response = await ajaxWithCsrf('/user/api/verify-code', {
                method: 'POST',
                data: { email: email, email_verify_code: email_verify_code }
            });

            duplicateValidation.email_verify_code = {
                valid: response.valid,
                checking: false
            };

            if (!response.valid) {
                showError('email_verify_code', response.message || '验证码错误');
                throw new Error(response.message || '验证码错误');
            } else {
                $(`#email_verify_codeError`).text('').hide();
                $('#email_verify_code').removeClass('is-invalid');
                return true;
            }
        } catch (error) {
            duplicateValidation.email_verify_code = {
                valid: null,
                checking: false
            };
            let errorMsg = '验证码验证失败';
            if (error.status) {
                errorMsg += ` (${error.status}): ${error.message}`;
            } else {
                errorMsg = error.message || errorMsg;
            }
            showError('email_verify_code', errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * 检查用户名重复性
     * @param {string} username - 用户名
     * @returns {Promise} 验证结果Promise
     */
    async function checkUsernameDuplicate(username) {
        if (username.length < 2 || username.length > 12) {
            showError('username', '用户名长度必须在2-12个字符之间', true);
        }

        duplicateValidation.username.checking = true;
        showError('username', '检查用户名可用性...', true);

        try {
            const response = await ajaxWithCsrf('/user/api/check_username', {
                method: 'POST',
                data: { username: username }
            });

            duplicateValidation.username = {
                valid: response.valid,
                checking: false
            };

            if (!response.valid) {
                showError('username', response.message || '用户名已被使用');
                throw new Error(response.message || '用户名已被使用');
            } else {
                $(`#usernameError`).text('').hide();
                $('#username').removeClass('is-invalid');
                return true;
            }
        } catch (error) {
            duplicateValidation.username = {
                valid: null,
                checking: false
            };
            let errorMsg = '用户名验证失败';
            if (error.status) {
                errorMsg += ` (${error.status}): ${error.message}`;
            } else {
                errorMsg = error.message || errorMsg;
            }
            showError('username', errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * 检查邮箱重复性
     * @param {string} email - 邮箱地址
     * @returns {Promise} 验证结果Promise
     */
    async function checkEmailDuplicate(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('请输入有效的电子邮箱地址');
        }

        duplicateValidation.email.checking = true;
        showError('email', '检查邮箱可用性...', true);

        try {
            const response = await ajaxWithCsrf('/user/api/check_email', {
                method: 'POST',
                data: { email: email }
            });

            duplicateValidation.email = {
                valid: response.valid,
                checking: false
            };

            if (!response.valid) {
                showError('email', response.message || '邮箱已被注册');
                throw new Error(response.message || '邮箱已被注册');
            } else {
                $(`#emailError`).text('').hide();
                $('#email').removeClass('is-invalid');
                return true;
            }
        } catch (error) {
            duplicateValidation.email = {
                valid: null,
                checking: false
            };
            let errorMsg = '邮箱验证失败';
            if (error.status) {
                errorMsg += ` (${error.status}): ${error.message}`;
            } else {
                errorMsg = error.message || errorMsg;
            }
            showError('email', errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * 初始化表单提交监听
     */
    function initFormSubmitListener() {
        $('#registerForm').submit(async function(e) {
            e.preventDefault();

            const formData = {
                username: $('#username').val(),
                email: $('#email').val(),
                password: $('#password').val(),
                confirm_password: $('#confirm_password').val(),
                email_verify_code: $('#email_verify_code').val()
            };

            if (formData.password !== formData.confirm_password) {
                showError('confirm_password', '两次密码输入不一致');
                return;
            }

            if (!duplicateValidation.username.valid || !duplicateValidation.email.valid || !duplicateValidation.email_verify_code.valid) {
                showError('global', '请完成所有必填项验证');
                return;
            }

            try {
    const response = await $.ajax({
        url: '/user/register',
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken },
        data: formData,
        dataType: 'json'  // 明确指定JSON类型
    });

    // 直接使用后端返回的状态和跳转URL
    if (response.status === 'success') {
        showGlobalMessage(response.message);
        window.location.href = response.redirect_url;
    } else {
        showError('global', response.message || '注册失败');
    }
    } catch (error) {
        showError('global', '网络请求失败，请稍后重试');
    }

            // try {
            //     const response = await $.ajax({
            //         url: '/user/register',
            //         method: 'POST',
            //         headers: {
            //             'X-CSRFToken': csrfToken  // 关键：添加CSRF令牌
            //         },
            //         data: formData,
            //         timeout: 30000
            //     });
            //
            //     if (response.success) {
            //         window.location.href = '/';
            //     } else {
            //         showError('global', response.message || '注册失败，请稍后重试');
            //     }
            // } catch (error) {
            //     let errorMsg = '注册请求失败';
            //     if (error.status) {
            //         errorMsg += ` (${error.status}): ${error.message}`;
            //     } else {
            //         errorMsg = error.message || errorMsg;
            //     }
            //     showError('global', errorMsg);
            // }
        });
    }

    // 绑定表单元素事件
    $('#username').on('blur', async function() {
        const username = $(this).val().trim();
        if (username) {
            try {
                await checkUsernameDuplicate(username);
            } catch (error) {
                console.error('用户名验证失败:', error);
            }
        }
    });

    $('#email').on('blur', async function() {
        const email = $(this).val().trim();
        if (email) {
            try {
                await checkEmailDuplicate(email);
            } catch (error) {
                console.error('邮箱验证失败:', error);
            }
        }
    });

    $('#email_verify_code').on('blur', async function() {
        const email = $('#email').val().trim();
        const email_verify_code = $(this).val().trim();
        if (email && email_verify_code) {
            try {
                await verifyCode(email, email_verify_code);
            } catch (error) {
                console.error('验证码验证失败:', error);
            }
        }
    });

    $('#sendVerifyCodeBtn').on('click', async function() {
        const $btn = $(this);
        const email = $('#email').val().trim();

        if (!email) {
            showError('email', '请先输入邮箱地址');
            return;
        }

        // 防止重复点击
        if ($btn.prop('disabled')) {
            return;
        }

        try {
            // 先检查邮箱是否可用
            await checkEmailDuplicate(email);

            // 邮箱可用，发送验证码
            const message = await sendVerificationCode(email);

            // // 显示成功消息并启动倒计时
            // showError('email_verify_code', message, true);
            const $messageArea = $('#messageArea');
            if ($messageArea.length) {
                $messageArea.html(`<div class="alert alert-info">${message}</div>`);
            } else {
                alert(message);
            }

            // 按钮倒计时逻辑
            $btn.prop('disabled', true);
            let countdown = 60;

            const timer = setInterval(() => {
                $btn.text(`重新发送(${countdown}s)`);
                countdown--;

                if (countdown < 0) {
                    clearInterval(timer);
                    $btn.text('发送验证码');
                    $btn.prop('disabled', false);
                }
            }, 1000);
        } catch (error) {
            showError('email', error.message);
        }
    });
});