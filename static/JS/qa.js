document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.post-excerpt').forEach(excerpt => {
    const style = getComputedStyle(excerpt);
    const lineHeight = parseInt(style.lineHeight);

    // 创建测试容器精确计算实际行数
    const testElement = document.createElement('div');
    testElement.style.cssText = `
      visibility:hidden;position:absolute;
      width:${excerpt.offsetWidth}px;
      font-size:${style.fontSize};
      line-height:${lineHeight}px;
      word-break:break-word;
      white-space:normal;
      font-family:${style.fontFamily};
    `;
    testElement.innerHTML = excerpt.innerHTML;
    document.body.appendChild(testElement);

    // 计算实际渲染行数（向上取整）
    const actualLineCount = Math.ceil(testElement.offsetHeight / lineHeight);
    document.body.removeChild(testElement);

    // 严格判断：仅当行数>6时才显示截断和按钮
    if (actualLineCount > 6) {
      const btn = document.createElement('button');
      btn.className = 'expand-btn';
      btn.textContent = '显示更多';
      btn.style.cssText = 'margin-top:8px;background:transparent;border:none;color:#3498db;cursor:pointer;';

      excerpt.style.display = '-webkit-box';
      excerpt.style.webkitLineClamp = '6';
      excerpt.style.webkitBoxOrient = 'vertical';
      excerpt.style.overflow = 'hidden';

      btn.addEventListener('click', function() {
        const isExpanded = excerpt.style.webkitLineClamp === 'none';
        excerpt.style.webkitLineClamp = isExpanded ? '6' : 'none';
        btn.textContent = isExpanded ? '显示更多' : '收起';
      });

      excerpt.parentNode.insertBefore(btn, excerpt.nextSibling);
    }
  });
});