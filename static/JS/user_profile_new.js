// 等待DOM加载完成
$(document).ready(function() {
    console.log("DOM加载完成，开始初始化头像选择功能");
    // console.log("用户头像文件名:", userData.avatar);
    // console.log("头像完整URL:", "{{ url_for('static', filename='avatar/') }}" + userData.avatar);

    const currentAvatar = "{{ current_user.avatar }}";
    $(`.avatar-option[data-src*="${currentAvatar}"]`).addClass('selected');

    // 头像选择功能 - 使用事件委托确保动态元素也能绑定
    $(document).on('click', '.avatar-option', function() {
        console.log("头像选项被点击");
        
        // 移除其他头像的选中状态
        $('.avatar-option').removeClass('selected');
        // 添加当前头像的选中状态
        $(this).addClass('selected');
        
        // 关键修改：使用attr()获取原始data-src属性值，而非data()
        // 这对于动态生成的URL（如使用url_for生成的路径）非常重要
        var selectedAvatar = $(this).attr('data-src');
        console.log("从data-src属性获取的头像URL: " + selectedAvatar);
        
        // 验证URL是否存在
        if (!selectedAvatar) {
            console.error("未找到data-src属性或属性值为空");
            showMessage('头像URL无效，请检查data-src属性', 'error');
            return;
        }
        
        // 处理可能的相对路径问题
        if (!isAbsoluteUrl(selectedAvatar)) {
            console.log("检测到相对URL，将使用当前页面域名拼接");
            // 可以选择是否需要手动拼接域名，视后端框架配置而定
            // selectedAvatar = window.location.origin + selectedAvatar;
        }
        
        // 更新当前头像显示
        var currentAvatar = $('#currentAvatar');
        
        // 预加载图片以确保加载成功
        var img = new Image();
        img.src = selectedAvatar;
        
        img.onload = function() {
            console.log("头像图片加载成功");
            currentAvatar.attr('src', selectedAvatar);
            // 触发自定义事件，方便后续扩展
            currentAvatar.trigger('avatarUpdated', [selectedAvatar]);
        };
        
        img.onerror = function() {
            console.error("头像图片加载失败: " + selectedAvatar);
            showMessage('头像加载失败，请检查图片路径是否正确', 'error');
            // 显示默认错误头像
            currentAvatar.attr('src', getDefaultAvatarUrl());
        };
    });
    
    // 保存按钮点击事件
    $('#saveBtn').click(function() {
        // 1. 添加调试日志
        console.log("保存按钮被点击");

        // 2. 正确获取选中的头像文件名
        const avatarSrc = $('.avatar-option.selected').attr('data-src');
        const filenameMatch = avatarSrc.match(/default_avatar(\d+)\.(jpg|jpeg)/);
        if (!filenameMatch) {
            showMessage('请先选择一个头像', 'error');
            return;
        }
        const selectedAvatar = filenameMatch[0];
        const newSignature = $('#signatureInput').val();

        // 3. 验证参数
        console.log("提交数据:", {avatar: selectedAvatar, signature: newSignature});

        // 4. 发送AJAX请求
        $.ajax({
            url: '/user/update_profile',  // 确保与后端路由一致
            method: 'POST',
            headers: {
                'X-CSRFToken': $('meta[name="csrf-token"]').attr('content')  // 添加CSRF令牌
            },
            data: {
                avatar: selectedAvatar,
                signature: newSignature
            },
            success: function(response) {
                console.log("保存成功:", response);
                showMessage('保存成功！', 'success');
                // 更新成功，跳转到首页
                window.location.href = response.redirectUrl;
            },
            error: function(xhr) {
                console.log("保存失败详情:", xhr.responseText);  // 输出完整错误信息
                showMessage('保存失败: ' + (xhr.responseJSON?.error || '服务器错误'), 'error');
            }
        });
    });
    
    // 辅助函数：判断URL是否为绝对路径
    function isAbsoluteUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    // 辅助函数：获取默认错误头像URL
    function getDefaultAvatarUrl() {
        // 可以从data属性获取默认头像，或直接返回一个默认路径
        return $('#currentAvatar').data('default-avatar') || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJjNS41IDIwIDEyIDAgMTIgMTBzLTYuNSAxMC0xMiAxMC0xMi0xMC0xMi0xMHptMCAxOGMxLjEgMCAyLS45IDItMnMtLjktMi0yLTJjLTEuMSAwLTIgLjktMiAyczAuOSAyIDIgMnptNC02Yy0xLjcuNy0zIDEuMy0zIDJzMS4zIDIgMyAyIDIgMyAyIC0xLjMgMi0zcy0xLjMtMy0zLTN6Ii8+PC9zdmc+';
    }
    
    // 显示消息函数
    function showMessage(text, type) {
        var messageEl = $('#message');
        messageEl.text(text);
        messageEl.removeClass('success error');
        messageEl.addClass(type);
        
        // 3秒后自动隐藏消息
        setTimeout(function() {
            messageEl.fadeOut(500, function() {
                messageEl.text('').removeClass('success error').show();
            });
        }, 3000);
    }
    
    // 保存用户设置到localStorage
    function saveUserSettings(avatar, signature) {
        var userSettings = {
            avatar: avatar,
            signature: signature,
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem('userSettings', JSON.stringify(userSettings));
        console.log("用户设置已保存到localStorage");
    }
    
    // 从localStorage加载用户设置
    function loadUserSettings() {
        var savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
            try {
                var settings = JSON.parse(savedSettings);
                
                // 设置头像
                if (settings.avatar) {
                    console.log("从localStorage加载头像: " + settings.avatar);
                    $('#currentAvatar').attr('src', settings.avatar);
                    // 标记选中状态 - 使用attr()比较data-src属性
                    $('.avatar-option').each(function() {
                        if ($(this).attr('data-src') === settings.avatar) {
                            $(this).addClass('selected');
                        }
                    });
                }
                
                // 设置个性签名
                if (settings.signature) {
                    $('#signatureInput').val(settings.signature);
                }
            } catch (e) {
                console.error("解析localStorage数据失败: " + e.message);
                showMessage('加载保存的设置失败', 'error');
            }
        } else {
            console.log("没有找到保存的用户设置");
        }
    }
});