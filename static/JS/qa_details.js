// $(document).ready(function () {
//     // 提交评论功能
//     $('#submit-comment').click(function () {
//         const commentText = $('.comment-input').val().trim();
//         const $errorMsg = $('.error-message');
//         const $submitBtn = $(this);
//
//         // 验证评论内容
//         if (!commentText) {
//             $errorMsg.show();
//             return;
//         }
//
//         $errorMsg.hide();
//
//         // 禁用按钮防止重复提交
//         $submitBtn.prop('disabled', true);
//         $submitBtn.html('<i class="fas fa-spinner fa-spin"></i> 提交中...');
//
//         // 模拟网络请求延迟
//         $.ajax({
//             url: '/api/comments',
//             type: 'POST',
//             contentType: 'application/json',
//             headers: {
//                 'X-CSRFToken': $('meta[name="csrf-token"]').attr('content')
//             },
//             data: JSON.stringify({
//                 content: comment-input,
//                 post_id: postId,
//                 // 如果有用户登录系统，可以获取当前用户名
//                 username:
//             }),
//             success: function (response) {
//                 if (response.success) {
//                     // 创建新评论元素
//                     const newComment = `
//                         <div class="comment-item" data-comment-id="${response.comment.id}">
//                             <div class="comment-header">
//                                 <div class="comment-avatar">
//                                     <i class="fas fa-user"></i>
//                                 </div>
//                                 <span class="comment-user">${response.comment.username}</span>
//                                 <span class="comment-time">${response.comment.created_at}</span>
//                             </div>
//                             <div class="comment-content">
//                                 ${response.comment.content}
//                             </div>
//                         </div>
//                     `;
//
//                     // 添加到评论列表
//                     $('.comment-list').append(newComment);
//
//                     // 清空输入框
//                     $('.comment-input').val('');
//
//                     // 滚动到新评论
//                     $('html, body').animate({
//                         scrollTop: $('.comment-list').children().last().offset().top - 100
//                     }, 500);
//
//                     $errorMsg.hide();
//                 } else {
//                     $errorMsg.text('提交失败: ' + response.error).show();
//                 }
//             },
//             error: function (xhr) {
//                 const errorMsg = xhr.responseJSON?.error || '服务器错误，请稍后重试';
//                 $errorMsg.text(errorMsg).show();
//             },
//             complete: function () {
//                 $submitBtn.prop('disabled', false).text('提交评论');
//             }
//         });
//     });
//
//     // 输入时隐藏错误提示
//     $('.comment-input').on('input', function () {
//         if ($(this).val().trim()) {
//             $('.error-message').hide();
//         }
//     });
// });
$(document).ready(function () {
    // 获取文章ID（从meta标签）
    const postId = $('meta[name="post-id"]').attr('content');
    const baseUrl = $('meta[name="base-url-comment"]').attr('content') || '';
    const apiUrl = `${baseUrl}`

    // 加载评论列表
    // loadComments();

    // 提交评论功能
    $('#submit-comment').click(function () {
        submitComment();
    });

    // 按Enter键提交评论
    $('.comment-input').keypress(function(e) {
        if (e.which === 13 && !e.shiftKey) {
            e.preventDefault();
            submitComment();
        }
    });

    // 输入时隐藏错误提示
    $('.comment-input').on('input', function () {
        if ($(this).val().trim()) {
            $('.error-message').hide();
        }
    });

    // 提交评论函数
    function submitComment() {
        const commentText = $('.comment-input').val().trim();
        const $errorMsg = $('.error-message');
        const $submitBtn = $('#submit-comment');

        // 验证评论内容
        if (!commentText) {
            $errorMsg.text('评论内容不能为空').show();
            return;
        }

        if (!postId) {
            $errorMsg.text('无法获取文章ID').show();
            return;
        }

        $errorMsg.hide();
        $submitBtn.prop('disabled', true);
        $submitBtn.html('<i class="fas fa-spinner fa-spin"></i> 提交中...');

        // 发送AJAX请求
        $.ajax({
            url: apiUrl,
            type: 'POST',
            contentType: 'application/json',
            headers: {
                'X-CSRFToken': $('meta[name="csrf-token"]').attr('content')
            },
            data: JSON.stringify({
                content: commentText,
                post_id: postId
            }),
            success: function (response) {
                if (response.success) {
                    // 评论提交成功，刷新页面
                    window.location.reload();
                } else {
                    $errorMsg.text('提交失败: ' + (response.error || '未知错误')).show();
                }
            },
            error: function (xhr) {
                const errorMsg = xhr.responseJSON?.error || '服务器错误，请稍后重试';
                $errorMsg.text(errorMsg).show();
            },
            complete: function () {
                $submitBtn.prop('disabled', false).text('提交评论');
            }
        });
    }

    // // 加载评论列表
    // function loadComments() {
    //     if (!postId) return;
    //
    //     $.ajax({
    //         url: `/api/forum/posts/${postId}/comments`,
    //         type: 'GET',
    //         success: function (response) {
    //             if (response.success && response.comments.length > 0) {
    //                 // 清空现有评论
    //                 $('.comment-list').empty();
    //
    //                 // 添加所有评论到DOM
    //                 response.comments.forEach(comment => {
    //                     addCommentToDOM(comment);
    //                 });
    //             } else if (response.comments.length === 0) {
    //                 $('.comment-list').html('<div class="no-comments">暂无评论，快来发表第一条评论吧！</div>');
    //             }
    //         },
    //         error: function () {
    //             $('.comment-list').html('<div class="comments-error">加载评论失败，请刷新页面重试</div>');
    //         }
    //     });
    // }

    // // 添加评论到DOM
    // function addCommentToDOM(comment) {
    //     const newComment = `
    //         <div class="comment-item" data-comment-id="${comment.id}">
    //             <div class="comment-header">
    //                 <div class="comment-avatar">
    //                     ${comment.author.avatar ?
    //                         `<img src="${comment.author.avatar}" alt="${comment.author.username}">` :
    //                         '<i class="fas fa-user"></i>'}
    //                 </div>
    //                 <span class="comment-user">${comment.author.username}</span>
    //                 <span class="comment-time">${comment.create_time}</span>
    //             </div>
    //             <div class="comment-content">
    //                 ${comment.content}
    //             </div>
    //         </div>
    //     `;
    //
    //     // 添加到评论列表
    //     $('.comment-list').prepend(newComment);
    //
    //     // 滚动到新评论
    //     $('html, body').animate({
    //         scrollTop: $(`.comment-item[data-comment-id="${comment.id}"]`).offset().top - 100
    //     }, 500);
    // }

    // 显示临时消息
    function showTempMessage(text, type = 'info') {
        // 创建临时消息元素
        const $message = $(`
            <div class="temp-message temp-message-${type}">
                ${text}
            </div>
        `);

        // 添加到页面
        $('body').append($message);

        // 设置样式并显示
        $message.css({
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '10px 20px',
            borderRadius: '4px',
            color: 'white',
            zIndex: '1000',
            opacity: '0',
            transition: 'opacity 0.3s'
        });

        // 根据类型设置背景色
        if (type === 'success') {
            $message.css('backgroundColor', '#4CAF50');
        } else if (type === 'error') {
            $message.css('backgroundColor', '#F44336');
        } else {
            $message.css('backgroundColor', '#2196F3');
        }

        // 显示并自动消失
        setTimeout(() => $message.css('opacity', '1'), 10);
        setTimeout(() => {
            $message.css('opacity', '0');
            setTimeout(() => $message.remove(), 300);
        }, 3000);
    }
});