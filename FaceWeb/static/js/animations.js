/**
 * 现代化人脸识别系统 - 动画效果
 * 移植自FaceRecUI的动画模块
 */

// 初始化页面时添加动画效果
document.addEventListener('DOMContentLoaded', function() {
    // 页面加载动画
    applyFadeInAnimation();
    
    // 添加按钮悬停效果
    setupButtonAnimations();
    
    // 添加脉冲效果
    applyPulseEffect('.pulse-effect');
    
    // 添加图像加载动画
    setupImageLoadAnimations();
    
    // 添加科技感卡片效果
    applyCardHoverEffect();
    
    // 添加粒子背景效果（对于高性能设备）
    if (!isMobileDevice() && !isLowPerformanceDevice()) {
        initParticleBackground();
    }
    
    // 添加数据点动画样式
    addDataPointsAnimation();
    
    // 为视频显示区域创建浮动数据点
    const videoDisplays = document.querySelectorAll('.video-display');
    videoDisplays.forEach(display => {
        createFloatingDataPoints(display);
    });
    
    // 为识别按钮添加点击事件，显示识别动画
    const recognizeBtn = document.getElementById('btn-recognize');
    if (recognizeBtn) {
        // 保存原始的点击事件处理
        const originalClickHandler = recognizeBtn.onclick;
        
        recognizeBtn.onclick = function(e) {
            // 获取显示区域
            const displayArea = document.getElementById('recognition-display');
            
            if (displayArea) {
                // 显示动画
                showRecognitionAnimation(displayArea, function() {
                    // 动画完成后，调用原始的点击处理函数
                    if (typeof originalClickHandler === 'function') {
                        originalClickHandler.call(recognizeBtn, e);
                    }
                });
                
                // 阻止事件继续传播，避免在动画显示前就触发了原始函数
                e.preventDefault();
                e.stopPropagation();
            } else {
                // 如果没有找到显示区域，直接调用原始函数
                if (typeof originalClickHandler === 'function') {
                    originalClickHandler.call(recognizeBtn, e);
                }
            }
        };
    }
    
    // 周期性更新浮动数据点
    setInterval(() => {
        videoDisplays.forEach(display => {
            // 有50%的几率更新数据点
            if (Math.random() > 0.5) {
                createFloatingDataPoints(display);
            }
        });
    }, 10000); // 每10秒
});

/**
 * 检测是否为移动设备
 * @returns {boolean} - 是否为移动设备
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * 检测是否为低性能设备
 * @returns {boolean} - 是否为低性能设备
 */
function isLowPerformanceDevice() {
    // 简单性能检测：如果设备内存小于4GB，则视为低性能设备
    return navigator.deviceMemory !== undefined && navigator.deviceMemory < 4;
}

/**
 * 应用淡入动画到页面元素
 */
function applyFadeInAnimation() {
    // 为卡片添加淡入+上滑动画
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(15px)';
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 + index * 120); // 错开时间，产生连锁效果
    });
    
    // 为标题添加淡入动画
    const titles = document.querySelectorAll('.page-title, .section-title');
    titles.forEach((title, index) => {
        title.style.opacity = '0';
        setTimeout(() => {
            title.style.transition = 'opacity 0.6s ease';
            title.style.opacity = '1';
        }, 300 + index * 120);
    });
    
    // 为按钮添加淡入并滑入的动画
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach((button, index) => {
        button.style.opacity = '0';
        button.style.transform = 'translateX(-8px)';
        setTimeout(() => {
            button.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            button.style.opacity = '1';
            button.style.transform = 'translateX(0)';
        }, 500 + index * 80);
    });
    
    // 为导航栏链接添加动画
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    navLinks.forEach((link, index) => {
        link.style.opacity = '0';
        link.style.transform = 'translateY(-8px)';
        setTimeout(() => {
            link.style.transition = 'all 0.5s ease';
            link.style.opacity = '1';
            link.style.transform = 'translateY(0)';
        }, 200 + index * 80);
    });
}

/**
 * 设置按钮动画效果
 */
function setupButtonAnimations() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        // 保存原始样式
        const originalBackground = getComputedStyle(button).backgroundColor;
        const originalBoxShadow = getComputedStyle(button).boxShadow;
        const originalTransform = getComputedStyle(button).transform;
        
        // 鼠标悬停效果
        button.addEventListener('mouseenter', () => {
            button.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            button.style.transform = 'scale(1.03)';
            button.style.boxShadow = '0 0 12px rgba(0, 132, 255, 0.5)';
        });
        
        // 鼠标离开效果
        button.addEventListener('mouseleave', () => {
            button.style.transition = 'all 0.3s ease';
            button.style.transform = originalTransform;
            button.style.boxShadow = originalBoxShadow;
        });
        
        // 点击效果
        button.addEventListener('mousedown', () => {
            button.style.transition = 'all 0.1s ease';
            button.style.transform = 'scale(0.97)';
        });
        
        // 松开效果
        button.addEventListener('mouseup', () => {
            button.style.transition = 'all 0.2s ease';
            button.style.transform = 'scale(1.03)';
            setTimeout(() => {
                button.style.transform = originalTransform;
            }, 200);
        });
    });
}

/**
 * 为元素添加脉冲发光效果
 * @param {string} selector - 要添加效果的元素选择器
 */
function applyPulseEffect(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
        element.classList.add('pulse');
    });
}

/**
 * 为图像添加加载动画
 */
function setupImageLoadAnimations() {
    const images = document.querySelectorAll('.animated-image');
    
    images.forEach(img => {
        // 加载前隐藏
        img.style.opacity = '0';
        
        // 图片加载完成后淡入显示
        img.addEventListener('load', () => {
            img.style.transition = 'opacity 0.5s ease';
            img.style.opacity = '1';
        });
        
        // 如果图片已经缓存，立即显示
        if (img.complete) {
            img.style.opacity = '1';
        }
    });
}

/**
 * 为卡片添加悬停效果（替代3D效果）
 */
function applyCardHoverEffect() {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            // 增强阴影效果
            card.style.boxShadow = '0 8px 25px rgba(0, 132, 255, 0.2)';
            card.style.borderColor = 'rgba(0, 180, 255, 0.5)';
            
            // 轻微上移
            card.style.transform = 'translateY(-4px)';
        });
        
        card.addEventListener('mouseleave', function() {
            // 恢复原始样式
            card.style.boxShadow = '';
            card.style.borderColor = '';
            card.style.transform = '';
        });
    });
}

/**
 * 创建并显示加载动画
 * @param {HTMLElement} container - 显示加载动画的容器
 * @returns {HTMLElement} - 加载动画元素
 */
function showLoadingSpinner(container) {
    // 清除容器内容
    container.innerHTML = '';
    
    // 创建加载动画
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    container.appendChild(spinner);
    
    // 创建加载文本
    const loadingText = document.createElement('div');
    loadingText.textContent = '加载中...';
    loadingText.style.color = '#0084ff';
    loadingText.style.textAlign = 'center';
    loadingText.style.marginTop = '10px';
    container.appendChild(loadingText);
    
    return spinner;
}

/**
 * 显示人脸识别动画
 * @param {HTMLElement} container - 显示动画的容器
 * @param {Function} callback - 动画完成后的回调函数
 */
function showFaceRecognitionAnimation(container, callback) {
    // 清除容器内容
    container.innerHTML = '';
    
    // 添加扫描动画
    container.classList.add('scanning');
    
    // 创建动画图像
    const animationImg = document.createElement('img');
    animationImg.src = '/static/images/face_rec.gif';
    animationImg.style.width = '100%';
    animationImg.style.height = '100%';
    animationImg.style.objectFit = 'contain';
    container.appendChild(animationImg);
    
    // 创建扫描中标签
    const scanningLabel = document.createElement('div');
    scanningLabel.textContent = '正在扫描人脸...';
    scanningLabel.style.position = 'absolute';
    scanningLabel.style.bottom = '20px';
    scanningLabel.style.left = '50%';
    scanningLabel.style.transform = 'translateX(-50%)';
    scanningLabel.style.backgroundColor = 'rgba(10, 25, 50, 0.8)';
    scanningLabel.style.color = '#0084ff';
    scanningLabel.style.padding = '5px 15px';
    scanningLabel.style.borderRadius = '20px';
    scanningLabel.style.fontWeight = 'bold';
    scanningLabel.style.boxShadow = '0 0 15px rgba(0, 132, 255, 0.3)';
    scanningLabel.classList.add('pulse');
    container.appendChild(scanningLabel);
    
    // 添加科技感扫描线
    const scanLine = document.createElement('div');
    scanLine.style.position = 'absolute';
    scanLine.style.width = '100%';
    scanLine.style.height = '2px';
    scanLine.style.backgroundColor = 'rgba(0, 180, 255, 0.7)';
    scanLine.style.boxShadow = '0 0 10px rgba(0, 180, 255, 0.7)';
    scanLine.style.top = '0';
    scanLine.style.left = '0';
    scanLine.style.animation = 'scanLine 2s linear infinite';
    container.appendChild(scanLine);
    
    // 添加扫描线动画样式
    if (!document.getElementById('scan-line-style')) {
        const style = document.createElement('style');
        style.id = 'scan-line-style';
        style.textContent = `
            @keyframes scanLine {
                0% { top: 0; }
                100% { top: 100%; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // 设置动画持续时间
    if (callback) {
        setTimeout(() => {
            container.classList.remove('scanning');
            scanLine.remove();
            callback();
        }, 3000);
    }
}

/**
 * 显示人脸框和标签
 * @param {HTMLElement} container - 显示人脸框的容器
 * @param {Array} faces - 人脸数据数组
 */
function showFaceRects(container, faces) {
    // 清除现有人脸框
    const existingRects = container.querySelectorAll('.face-rect, .face-label');
    existingRects.forEach(rect => rect.remove());
    
    // 获取容器尺寸
    const containerRect = container.getBoundingClientRect();
    
    // 遍历人脸数据
    faces.forEach(face => {
        // 提取人脸坐标
        const [x1, y1, x2, y2] = face.rect;
        const width = x2 - x1;
        const height = y2 - y1;
        
        // 计算容器内的相对位置
        const relX = (x1 / 640) * containerRect.width;
        const relY = (y1 / 480) * containerRect.height;
        const relWidth = (width / 640) * containerRect.width;
        const relHeight = (height / 480) * containerRect.height;
        
        // 创建人脸框
        const rect = document.createElement('div');
        rect.className = 'face-rect';
        if (face.name === 'unknown') {
            rect.classList.add('unknown');
        }
        rect.style.left = `${relX}px`;
        rect.style.top = `${relY}px`;
        rect.style.width = `${relWidth}px`;
        rect.style.height = `${relHeight}px`;
        container.appendChild(rect);
        
        // 创建人脸标签
        const label = document.createElement('div');
        label.className = 'face-label';
        if (face.name === 'unknown') {
            label.classList.add('unknown');
        }
        label.textContent = `${face.name} (${Math.round((1 - face.distance) * 100)}%)`;
        label.style.left = `${relX}px`;
        label.style.top = `${relY - 5}px`;
        container.appendChild(label);
        
        // 添加科技感边角
        const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        corners.forEach(pos => {
            const corner = document.createElement('div');
            corner.className = `face-corner ${pos}`;
            corner.style.position = 'absolute';
            corner.style.width = '8px';
            corner.style.height = '8px';
            
            // 设置边角样式
            if (pos === 'top-left') {
                corner.style.top = '0';
                corner.style.left = '0';
                corner.style.borderTop = '2px solid ' + (face.name === 'unknown' ? '#ff4040' : '#0084ff');
                corner.style.borderLeft = '2px solid ' + (face.name === 'unknown' ? '#ff4040' : '#0084ff');
            } else if (pos === 'top-right') {
                corner.style.top = '0';
                corner.style.right = '0';
                corner.style.borderTop = '2px solid ' + (face.name === 'unknown' ? '#ff4040' : '#0084ff');
                corner.style.borderRight = '2px solid ' + (face.name === 'unknown' ? '#ff4040' : '#0084ff');
            } else if (pos === 'bottom-left') {
                corner.style.bottom = '0';
                corner.style.left = '0';
                corner.style.borderBottom = '2px solid ' + (face.name === 'unknown' ? '#ff4040' : '#0084ff');
                corner.style.borderLeft = '2px solid ' + (face.name === 'unknown' ? '#ff4040' : '#0084ff');
            } else if (pos === 'bottom-right') {
                corner.style.bottom = '0';
                corner.style.right = '0';
                corner.style.borderBottom = '2px solid ' + (face.name === 'unknown' ? '#ff4040' : '#0084ff');
                corner.style.borderRight = '2px solid ' + (face.name === 'unknown' ? '#ff4040' : '#0084ff');
            }
            
            rect.appendChild(corner);
        });
        
        // 添加动画效果
        rect.style.opacity = '0';
        label.style.opacity = '0';
        rect.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            rect.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            label.style.transition = 'opacity 0.5s ease';
            rect.style.opacity = '1';
            rect.style.transform = 'scale(1)';
            label.style.opacity = '1';
        }, 100);
    });
}

/**
 * 创建动态文本更新效果
 * @param {HTMLElement} element - 要更新的元素
 * @param {string} text - 新的文本内容
 */
function animateTextChange(element, text) {
    // 突出显示效果
    element.classList.add('highlight');
    
    // 淡出旧文本
    element.style.transition = 'opacity 0.2s ease';
    element.style.opacity = '0';
    
    // 更新文本并淡入
    setTimeout(() => {
        element.textContent = text;
        element.style.opacity = '1';
        
        // 移除突出显示效果
        setTimeout(() => {
            element.classList.remove('highlight');
        }, 700);
    }, 200);
}

/**
 * 页面切换动画
 * @param {string} fromSelector - 当前页面选择器
 * @param {string} toSelector - 目标页面选择器
 * @param {string} direction - 切换方向 ('left' 或 'right')
 */
function pageTransitionAnimation(fromSelector, toSelector, direction) {
    const fromPage = document.querySelector(fromSelector);
    const toPage = document.querySelector(toSelector);
    
    if (!fromPage || !toPage) return;
    
    // 初始化目标页面
    toPage.style.display = 'block';
    toPage.style.position = 'absolute';
    toPage.style.top = '0';
    toPage.style.width = '100%';
    toPage.style.opacity = '0';
    toPage.style.transform = direction === 'left' ? 'translateX(-30px)' : 'translateX(30px)';
    
    // 淡出当前页面
    fromPage.style.transition = 'all 0.4s ease';
    fromPage.style.opacity = '0';
    fromPage.style.transform = direction === 'left' ? 'translateX(30px)' : 'translateX(-30px)';
    
    // 淡入目标页面
    setTimeout(() => {
        toPage.style.transition = 'all 0.4s ease';
        toPage.style.opacity = '1';
        toPage.style.transform = 'translateX(0)';
        
        // 完成后重置样式
        setTimeout(() => {
            fromPage.style.display = 'none';
            fromPage.style.opacity = '';
            fromPage.style.transform = '';
            fromPage.style.position = '';
            
            toPage.style.position = '';
            toPage.style.top = '';
            toPage.style.width = '';
            toPage.style.opacity = '';
            toPage.style.transform = '';
            
            // 重新应用入场动画
            applyFadeInAnimation();
        }, 400);
    }, 200);
}

/**
 * 初始化粒子背景
 */
function initParticleBackground() {
    // 如果粒子背景已经存在，不再创建
    if (document.querySelector('.particles-container')) return;
    
    // 创建容器
    const container = document.createElement('div');
    container.className = 'particles-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '-1';
    container.style.overflow = 'hidden';
    container.style.pointerEvents = 'none';
    
    // 添加到文档
    document.body.appendChild(container);
    
    // 创建粒子
    const particleCount = Math.min(window.innerWidth / 15, 80); // 根据屏幕宽度调整粒子数量
    
    for (let i = 0; i < particleCount; i++) {
        createParticle(container);
    }
    
    // 添加连线效果
    window.requestAnimationFrame(() => drawLines(container));
}

/**
 * 创建单个粒子
 * @param {HTMLElement} container - 粒子容器
 */
function createParticle(container) {
    const particle = document.createElement('div');
    
    // 随机大小和位置
    const size = Math.random() * 2.5 + 1;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    
    // 随机速度
    const vx = (Math.random() - 0.5) * 0.08;
    const vy = (Math.random() - 0.5) * 0.08;
    
    // 设置样式
    particle.className = 'tech-particle';
    particle.style.position = 'absolute';
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.backgroundColor = 'rgba(0, 132, 255, 0.7)';
    particle.style.borderRadius = '50%';
    particle.style.boxShadow = '0 0 6px rgba(0, 132, 255, 0.5)';
    particle.style.left = `${x}%`;
    particle.style.top = `${y}%`;
    
    // 存储位置和速度信息
    particle.dataset.x = x;
    particle.dataset.y = y;
    particle.dataset.vx = vx;
    particle.dataset.vy = vy;
    
    // 添加到容器
    container.appendChild(particle);
    
    // 启动粒子动画
    moveParticle(particle);
}

/**
 * 移动粒子
 * @param {HTMLElement} particle - 要移动的粒子
 */
function moveParticle(particle) {
    let x = parseFloat(particle.dataset.x);
    let y = parseFloat(particle.dataset.y);
    let vx = parseFloat(particle.dataset.vx);
    let vy = parseFloat(particle.dataset.vy);
    
    // 更新位置
    x += vx;
    y += vy;
    
    // 边界检测
    if (x < 0 || x > 100) vx = -vx;
    if (y < 0 || y > 100) vy = -vy;
    
    // 更新数据和样式
    particle.dataset.x = x;
    particle.dataset.y = y;
    particle.dataset.vx = vx;
    particle.dataset.vy = vy;
    particle.style.left = `${x}%`;
    particle.style.top = `${y}%`;
    
    // 继续动画
    requestAnimationFrame(() => moveParticle(particle));
}

/**
 * 绘制粒子之间的连线
 * @param {HTMLElement} container - 粒子容器
 */
function drawLines(container) {
    // 获取所有粒子
    const particles = container.querySelectorAll('.tech-particle');
    
    // 移除所有旧的线
    const oldLines = container.querySelectorAll('.particle-line');
    oldLines.forEach(line => line.remove());
    
    // 遍历所有粒子对
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const particleA = particles[i];
            const particleB = particles[j];
            
            // 计算两个粒子之间的距离
            const x1 = parseFloat(particleA.dataset.x);
            const y1 = parseFloat(particleA.dataset.y);
            const x2 = parseFloat(particleB.dataset.x);
            const y2 = parseFloat(particleB.dataset.y);
            
            // 粒子位置转换为百分比
            const dx = (x2 - x1) * window.innerWidth / 100;
            const dy = (y2 - y1) * window.innerHeight / 100;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 只在粒子足够近的时候绘制线
            if (distance < 120) {
                // 透明度基于距离
                const opacity = 1 - distance / 120;
                
                drawLine(container, x1, y1, x2, y2, opacity);
            }
        }
    }
    
    // 循环动画
    window.requestAnimationFrame(() => drawLines(container));
}

/**
 * 绘制单条线
 * @param {HTMLElement} container - 粒子容器
 * @param {number} x1 - 起始点X坐标 (百分比)
 * @param {number} y1 - 起始点Y坐标 (百分比)
 * @param {number} x2 - 结束点X坐标 (百分比)
 * @param {number} y2 - 结束点Y坐标 (百分比)
 * @param {number} opacity - 线的透明度
 */
function drawLine(container, x1, y1, x2, y2, opacity) {
    const line = document.createElement('div');
    line.className = 'particle-line';
    
    // 计算线的长度和角度
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy) * Math.sqrt(window.innerWidth * window.innerHeight) / 100;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // 设置样式
    line.style.position = 'absolute';
    line.style.width = `${length}px`;
    line.style.height = '1px';
    line.style.backgroundColor = `rgba(0, 132, 255, ${opacity * 0.2})`;
    line.style.top = `${y1}%`;
    line.style.left = `${x1}%`;
    line.style.transformOrigin = '0 0';
    line.style.transform = `rotate(${angle}deg)`;
    
    // 添加到容器
    container.appendChild(line);
}

/**
 * 显示人脸识别过程中的模拟动画
 * @param {HTMLElement} targetElement - 显示动画的目标元素
 * @param {Function} callback - 动画完成后的回调函数
 */
function showRecognitionAnimation(targetElement, callback) {
    // 创建分析叠加层
    const overlay = document.createElement('div');
    overlay.className = 'recognition-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 20, 40, 0.4);
        z-index: 10;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(2px);
    `;
    
    // 创建分析文本
    const analysisText = document.createElement('div');
    analysisText.className = 'analysis-text';
    analysisText.style.cssText = `
        color: #00ccff;
        font-family: 'Consolas', monospace;
        font-size: 14px;
        margin-bottom: 15px;
        text-align: center;
    `;
    
    // 创建进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    progressContainer.style.cssText = `
        width: 80%;
        height: 6px;
        background-color: rgba(0, 100, 200, 0.2);
        border-radius: 3px;
        overflow: hidden;
        position: relative;
    `;
    
    // 创建进度条
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.cssText = `
        position: absolute;
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #0066ff, #00ccff);
        border-radius: 3px;
        box-shadow: 0 0 10px rgba(0, 200, 255, 0.5);
    `;
    
    // 组装元素
    progressContainer.appendChild(progressBar);
    overlay.appendChild(analysisText);
    overlay.appendChild(progressContainer);
    
    // 添加到目标元素
    targetElement.appendChild(overlay);
    
    // 分析步骤
    const steps = [
        '正在加载面部识别模型...',
        '正在分析图像...',
        '检测人脸特征点...',
        '提取生物特征...',
        '比对特征库...',
        '验证身份...',
        '完成识别'
    ];
    
    let currentStep = 0;
    const totalSteps = steps.length;
    
    // 开始动画
    const interval = setInterval(() => {
        if (currentStep >= totalSteps) {
            clearInterval(interval);
            
            // 完成后移除动画元素
            setTimeout(() => {
                if (overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                if (typeof callback === 'function') {
                    callback();
                }
            }, 500);
            return;
        }
        
        // 更新文本
        analysisText.textContent = steps[currentStep];
        
        // 更新进度条
        const progress = (currentStep + 1) / totalSteps * 100;
        progressBar.style.width = `${progress}%`;
        
        // 下一步
        currentStep++;
    }, 400);
}

/**
 * 创建浮动数据点
 * @param {HTMLElement} container - 容器元素
 */
function createFloatingDataPoints(container) {
    // 移除任何现有的数据点
    const existingPoints = container.querySelectorAll('.data-point');
    existingPoints.forEach(point => point.remove());
    
    // 创建随机数据点
    const numPoints = 10 + Math.floor(Math.random() * 15);
    
    for (let i = 0; i < numPoints; i++) {
        const point = document.createElement('div');
        point.className = 'data-point';
        
        // 随机位置
        const top = 5 + Math.random() * 90;
        const left = 5 + Math.random() * 90;
        
        // 随机大小
        const size = 3 + Math.random() * 3;
        
        // 随机颜色
        const colors = ['#00ccff', '#0084ff', '#00f9ff', '#6bc6ff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // 随机动画持续时间
        const duration = 10 + Math.random() * 20;
        
        point.style.cssText = `
            position: absolute;
            top: ${top}%;
            left: ${left}%;
            width: ${size}px;
            height: ${size}px;
            background-color: ${color};
            border-radius: 50%;
            opacity: 0.6;
            box-shadow: 0 0 5px ${color};
            animation: floatData ${duration}s infinite linear;
            z-index: 2;
        `;
        
        container.appendChild(point);
    }
}

// 创建悬浮数据点动画样式
function addDataPointsAnimation() {
    // 检查是否已存在样式
    if (!document.getElementById('dataPointsStyle')) {
        const style = document.createElement('style');
        style.id = 'dataPointsStyle';
        style.textContent = `
            @keyframes floatData {
                0% {
                    transform: translateY(0) translateX(0);
                    opacity: 0.2;
                }
                25% {
                    transform: translateY(-10px) translateX(5px);
                    opacity: 0.7;
                }
                50% {
                    transform: translateY(-15px) translateX(-5px);
                    opacity: 0.5;
                }
                75% {
                    transform: translateY(-5px) translateX(10px);
                    opacity: 0.7;
                }
                100% {
                    transform: translateY(0) translateX(0);
                    opacity: 0.2;
                }
            }
        `;
        document.head.appendChild(style);
    }
} 