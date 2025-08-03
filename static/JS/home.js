document.addEventListener('DOMContentLoaded', function() {
    // 创建更多随机背景形状
    const bgShapes = document.querySelector('.bg-shapes');
    const shapeTypes = ['circle', 'triangle', 'square', 'pentagon'];
    const colors = ['#80deea', '#4fc3f7', '#ce93d8', '#a5d6a7', '#81c784', '#ffcc80', '#ffa726'];

    for (let i = 0; i < 10; i++) {
        const shape = document.createElement('div');
        shape.className = 'bg-shape ' + shapeTypes[Math.floor(Math.random() * shapeTypes.length)];

        const size = Math.random() * 100 + 50;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = Math.random() * 10 + 10;

        shape.style.width = size + 'px';
        if (shape.classList.contains('circle') || shape.classList.contains('square') || shape.classList.contains('pentagon')) {
            shape.style.height = size + 'px';
        }

        shape.style.top = posY + '%';
        shape.style.left = posX + '%';
        shape.style.animationDelay = delay + 's';
        shape.style.animationDuration = duration + 's';

        if (shape.classList.contains('circle')) {
            shape.style.background = `linear-gradient(45deg, ${colors[Math.floor(Math.random() * colors.length)]}, ${colors[Math.floor(Math.random() * colors.length)]})`;
        } else if (shape.classList.contains('square')) {
            shape.style.background = `linear-gradient(45deg, ${colors[Math.floor(Math.random() * colors.length)]}, ${colors[Math.floor(Math.random() * colors.length)]})`;
        } else if (shape.classList.contains('pentagon')) {
            shape.style.background = `linear-gradient(45deg, ${colors[Math.floor(Math.random() * colors.length)]}, ${colors[Math.floor(Math.random() * colors.length)]})`;
        }

        bgShapes.appendChild(shape);
    }

    // 按钮点击效果
    const btn = document.querySelector('.explore-btn');
    btn.addEventListener('click', function() {
        this.classList.add('clicked');
        setTimeout(() => {
            this.classList.remove('clicked');
        }, 300);
    });
});