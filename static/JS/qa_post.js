$(document).ready(function () {
    // 图片上传处理（保持不变）
    $('#imageUploadArea').off('click').on('click', function (e) {
        if ($(e.target).closest('#imageInput').length) return;
        const imageInput = document.getElementById('imageInput');
        if (imageInput) {
            imageInput.click();
        }
    });

    $('#imageInput').off('click').on('click', function (e) {
        e.stopPropagation();
    });

    $('#imageInput').on('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const validTypes = ['image/jpeg', 'image/png'];
            const maxSize = 5 * 1024 * 1024;

            if (!validTypes.includes(file.type)) {
                $('#imageError').text('仅支持JPG/PNG格式的图片').removeClass('hidden').show();
                return;
            }

            if (file.size > maxSize) {
                $('#imageError').text('图片大小不能超过5MB').removeClass('hidden').show();
                return;
            }

            $('#imageError').addClass('hidden').hide();

            const reader = new FileReader();
            reader.onload = function (e) {
                $('#previewImage').attr('src', e.target.result);
                $('#uploadPrompt').hide();
                $('#imagePreview').show();
            }
            reader.readAsDataURL(file);
        }
    });

    $('#removeImage').on('click', function (e) {
        e.stopPropagation();
        $('#imageInput').val('');
        $('#imagePreview').hide();
        $('#uploadPrompt').show();
    });

    $('#imageUploadArea').on('dragover', function (e) {
        e.preventDefault();
        $(this).css({
            'border-color': '#6366f1',
            'background-color': 'rgba(99, 102, 241, 0.05)'
        });
    });

    $('#imageUploadArea').on('dragleave', function (e) {
        e.preventDefault();
        $(this).css({
            'border-color': '#cbd5e1',
            'background-color': 'transparent'
        });
    });

    $('#imageUploadArea').on('drop', function (e) {
        e.preventDefault();
        $(this).css({
            'border-color': '#cbd5e1',
            'background-color': 'transparent'
        });

        const file = e.originalEvent.dataTransfer.files[0];
        if (file) {
            $('#imageInput')[0].files = e.originalEvent.dataTransfer.files;
            $('#imageInput').trigger('change');
        }
    });

    // AI帮写功能调试版
    const aiWriteBtn = $('#aiWriteBtn');
    const titleInput = $('#title');
    const contentTextarea = $('#content');

    // 首先获取CSRF令牌
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

    // 添加按钮点击事件
    aiWriteBtn.on('click', async function() {
        const title = titleInput.val().trim();

        // 输入验证
        if (!title) {
            alert('请先输入帖子标题');
            titleInput.focus();
            return;
        }

        try {
            // 确保已获取CSRF令牌
            if (!csrfToken) {
                await getCsrfToken();
            }

            // 显示加载状态
            aiWriteBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>&nbsp;生成中...');
            contentTextarea.prop('disabled', true).attr('placeholder', '正在生成内容，请稍候...');

            // 调用Flask后端API
            const response = await $.ajax({
                url: 'api/ai-write',
                type: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken  // 添加CSRF令牌到请求头
                },
                xhrFields: {
                    withCredentials: true  // 允许跨域请求携带Cookie
                },
                data: JSON.stringify({ title: title })
            });

            // 将生成的内容填充到textarea并移动光标到末尾
            if (response.content) {
                contentTextarea.val(response.content);
                contentTextarea.focus();
                const len = contentTextarea.val().length;
                contentTextarea[0].setSelectionRange(len, len);
            } else {
                alert('未能生成内容，请尝试修改标题后重试');
            }
        } catch (error) {
            console.error('AI帮写请求失败:', error);
            alert('生成内容时出错: ' + (error.responseJSON?.message || error.message || '网络错误，请稍后重试'));
        } finally {
            // 恢复按钮状态
            aiWriteBtn.prop('disabled', false).html('<i class="fas fa-hand-sparkles"></i> AI 帮写');
            contentTextarea.prop('disabled', false).attr('placeholder', '请输入帖子内容');
        }
    });

    // 防止表单提交影响
    aiWriteBtn.on('click', function(e) {
        e.preventDefault();
    });

    // 页面加载时获取CSRF令牌
    getCsrfToken().catch(error => {
        console.error(error);
    });


    // 表单验证和提交 - 修改为实际AJAX请求
    $('#postForm').on('submit', function (e) {
        e.preventDefault();
        let isValid = true;

        // 验证标题
        if ($('#title').val().trim() === '') {
            $('#titleError').show();
            isValid = false;
        } else {
            $('#titleError').hide();
        }

        // 验证内容
        if ($('#content').val().trim() === '') {
            $('#contentError').show();
            isValid = false;
        } else {
            $('#contentError').hide();
        }

        // 验证图片（可选）
        if ($('#imageInput')[0].files.length > 0) {
            const file = $('#imageInput')[0].files[0];
            const validTypes = ['image/jpeg', 'image/png'];
            const maxSize = 5 * 1024 * 1024;

            if (!validTypes.includes(file.type) || file.size > maxSize) {
                $('#imageError').text('请上传有效的图片文件').show();
                isValid = false;
            } else {
                $('#imageError').hide();
            }
        }

        if (isValid) {
            // 创建FormData对象
            const formData = new FormData(this);

            // 添加CSRF令牌（假设页面中有meta标签存储csrf_token）
            const csrfToken = $('meta[name="csrf-token"]').attr('content');
            if (csrfToken) {
                formData.append('csrf_token', csrfToken);
            }

            // 显示加载状态
            $('#submitButton').prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i>发布中...');

            // 实际AJAX请求
            $.ajax({
                url: '/QA/post',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    $('#submitFeedback')
                        .removeClass('error-feedback')
                        .addClass('success-feedback')
                        .html('<i class="fas fa-check-circle mr-2"></i>    帖子发布成功！    ')
                        .show();

                    // 重置表单
                    setTimeout(() => {
                        $('#postForm')[0].reset();
                        $('#imagePreview').hide();
                        $('#uploadPrompt').show();
                        $('#submitFeedback').hide();
                        $('#submitButton').prop('disabled', false).html('发布帖子');
                        window.location.href = '/'; // 跳转到首页
                    }, 2000);
                },
                error: function (xhr) {
                    let errorMsg = '发布失败，请稍后重试';
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.errors) {
                            // 显示表单验证错误
                            errorMsg = Object.values(response.errors).join('<br>');
                        }
                    } catch (e) {
                        // 非JSON响应
                    }

                    $('#submitFeedback')
                        .removeClass('success-feedback')
                        .addClass('error-feedback')
                        .html(`<i class="fas fa-exclamation-circle mr-2"></i>${errorMsg}`)
                        .show();

                    // 恢复提交按钮状态
                    $('#submitButton').prop('disabled', false).html('发布帖子');
                }
            });
        } else {
            $('#submitFeedback')
                .removeClass('success-feedback')
                .addClass('error-feedback')
                .html('<i class="fas fa-exclamation-circle mr-2"></i>请检查表单中的错误')
                .show();
        }
    });
});